var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

router.get("/", (req, res) => res.send("im here"));



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
