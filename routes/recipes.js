var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

router.get("/", async (req, res, next) => {
  try {
    const { query, limit, cuisine, diet, intolerances } = req.query;

    if (!query) {
      return res.status(400).send({ message: "Missing search query" });
    }

    const searchParams = {
      query,
      limit: parseInt(limit) || 5,
      cuisine,
      diet,
      intolerances
    };

    const results = await recipes_utils.searchRecipes(searchParams);

    // Save to search history if logged in
    if (req.session?.user_id) {
      await DButils.execQuery(`INSERT INTO search_history (user_id, query, search_date)
        VALUES (${req.session.user_id}, '${query.replace(/'/g, "''")}', NOW())`);
    }

    res.send(results);
  } catch (error) {
    next(error);
  }
});


/**
 * GET /recipes/random
 * Returns a list of random recipes from Spoonacular API
 */
router.get("/random", async (req, res, next) => {
  try {
    const count =  3; 
    const recipes = await recipes_utils.getRandomRecipes(count);
    res.status(200).send(recipes);
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

/**
 * This path returns a preview of a recipe by its id
 */
router.get("/:recipeId/preview", async (req, res, next) => {
  try {
    const preview = await recipes_utils.getRecipePreview(req.params.recipeId);
    res.send(preview);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /recipes/:recipeId/like
 * Increases the like count of a recipe (from DB or API if needed)
 */
router.put("/:recipeId/like", async (req, res, next) => {
  try {
    const newLikeCount = await recipes_utils.likeRecipe(req.params.recipeId);
    res.status(200).send({
      recipeId: req.params.recipeId,
      liked: true,
      popularity: newLikeCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Performs a search for recipes based on query and filters
 * Optional filters: cuisine, diet, intolerances, limit
 */
router.get("/", async (req, res, next) => {
  try {
    const { query, limit, cuisine, diet, intolerances } = req.query;

    if (!query) {
      return res.status(400).send({ message: "Missing search query" });
    }

    const searchParams = {
      query,
      limit: parseInt(limit) || 5,
      cuisine,
      diet,
      intolerances
    };

    const results = await recipes_utils.searchRecipes(searchParams);

    // Save the search if user is logged in
    if (req.session?.user_id) {
      await DButils.execQuery(`
        INSERT INTO search_history (user_id, query, search_date)
        VALUES (${req.session.user_id}, '${query.replace(/'/g, "''")}', NOW())
      `);
    }

    res.send(results);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
