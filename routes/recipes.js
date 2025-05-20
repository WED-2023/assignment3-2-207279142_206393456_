var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

router.get("/", (req, res) => res.send("im here"));
// router.get("/", async (req, res, next) => {
//   try {
//     const { query, cuisine, diet, intolerances, limit } = req.query;

//     // Fetch recipes from Spoonacular (מתכון מלא עם IDs)
//     const results = await recipes_utils.searchRecipes(query, cuisine, diet, intolerances, limit || 5);

//     // Save each result into DB (if not exists)
//     await Promise.all(results.map(recipe => recipes_utils.saveExternalRecipeToDB(recipe.id)));

//     // Return results to client
//     res.status(200).send(results);
//   } catch (error) {
//     next(error);
//   }
// });


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



module.exports = router;
