var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/favorites', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;

    if (!recipe_id) {
      return res.status(400).json({ error: "Missing recipeId" });
    }
    
    // const apiData = (await recipe_utils.getRecipeInformation(recipe_id)).data;
    // await recipe_utils.saveExternalRecipeToDB(apiData);
    const exists = await recipe_utils.recipeExistsInDB(recipe_id);
    if (!exists) {
      const apiData = (await recipe_utils.getRecipeInformation(recipe_id)).data;
      await recipe_utils.saveExternalRecipeToDB(apiData);
    }

    // Add to user's favorite recipes
    await user_utils.markAsFavorite(user_id, recipe_id);
    

    res.status(200).send("The Recipe successfully saved as favorite");
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    let favorite_recipes = {};
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});

/**
 * Marks a recipe as viewed by the current user.
 * Saves it to the database instead of the session.
 */
router.post("/viewed", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;

    if (!recipe_id) {
      return res.status(400).json({ error: "Missing recipeId" });
    }

    const exists = await recipe_utils.recipeExistsInDB(recipe_id);
    if (!exists) {
      const apiData = (await recipe_utils.getRecipeInformation(recipe_id)).data;
      await recipe_utils.saveExternalRecipeToDB(apiData);
    }

    await user_utils.markAsViewed(user_id, recipe_id);

    res.status(200).json({
      recipeId: recipe_id,
      viewed: true
    });
  } catch (error) {
    next(error);
  }
});
router.get("/viewedIds", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const rows = await DButils.execQuery(`
      SELECT recipe_id
      FROM viewed_recipes
      WHERE user_id = '${user_id}'
    `);
    const ids = rows.map(r => r.recipe_id);
    res.status(200).json(ids);
  } catch (error) {
    next(error);
  }
});


/**
 * Returns the last 3 recipes viewed by the user during the session.
 * The data is stored in memory (session), not in the database.
 */
router.get("/lastWatched", async (req, res, next) => {
  try {

    // Fetch recipe previews for those IDs
    const user_id = req.session.user_id;
    const result = await user_utils.getLastWatchedRecipes(user_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});



router.get("/lastSearches", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const results = await user_utils.getLastSearches(user_id);
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});



router.get("/myRecipes", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const myRecipes = await user_utils.getMyRecipes(user_id);
    res.status(200).json(myRecipes);
  } catch (error) {
    next(error);
  }
});

router.get("/myFamily", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const results = await user_utils.getFamilyRecipes(user_id);
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});


/**
 * Creates a new recipe (regular or family) for the logged-in user
 */
router.post("/recipes", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;

    const {
      title,
      image,
      readyInMinutes,
      vegetarian,
      vegan,
      glutenFree,
      instructions,
      servings,
      ingredients,
      isFamily,
      family_owner,
      event
    } = req.body;

    // Basic validation
    if (!title || !instructions || !Array.isArray(ingredients)) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const recipeData = {
      title,
      image,
      readyInMinutes,
      vegetarian,
      vegan,
      glutenFree,
      instructions,
      servings,
      ingredients
    };

    const recipe_id = await user_utils.createUserRecipe(
      user_id,
      recipeData,
      isFamily,
      family_owner,
      event
    );

    res.status(201).send({ message: "Recipe created", recipe_id });
  } catch (error) {
    next(error);
  }
});


/**
 * Returns basic info about the currently logged-in user.
 * Used by the frontend to display "Hello Guest" or "Hello <username>".
 */
router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.user_id) {
      // User is not logged in
      return res.status(200).json({ isLoggedIn: false });
    }

    const result = await DButils.execQuery(`
      SELECT username FROM users WHERE user_id = '${req.session.user_id}'
    `);

    res.status(200).json({
      isLoggedIn: true,
      username: result[0].username
    });
  } catch (error) {
    next(error);
  }
});


/**
 * Returns the last search query stored in the session.
 * Returns null if not logged in or no search was made.
 */
router.get("/lastSearchQuery", (req, res) => {
  if (!req.session.user_id || !req.session.lastSearchQuery) {
    return res.status(200).json({ lastSearch: null });
  }

  res.status(200).json({ lastSearch: req.session.lastSearchQuery });
});

module.exports = router;
