const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";



/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRecipeDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        
    }
}

/**
 * Get random recipes from Spoonacular API
 * @param {number} count - number of recipes to retrieve
 * @returns {Promise<Array>} - list of recipe previews
 */
async function getRandomRecipes(count) {
  try {
    console.log(" Fetching random recipes from:", `${api_domain}/random`);
    console.log(" Number of recipes to fetch:", count);
    console.log(" API Key present:", !!process.env.spooncular_apiKey);

    const response = await axios.get(`${api_domain}/random`, {
      params: {
        number: count,
        apiKey: process.env.spooncular_apiKey
      }
    });

    const recipes = response.data.recipes;
    // map the results to a preview format
    return recipes.map((recipe) => {
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        popularity: recipe.aggregateLikes,
        vegetarian: recipe.vegetarian,
        vegan: recipe.vegan,
        glutenFree: recipe.glutenFree,
        is_favorite: false  // return to this later //
      };
    });
  } catch (error) {
    console.error("Failed to fetch random recipes:", error.message);
    throw error;
  }
}

exports.getRandomRecipes = getRandomRecipes;
exports.getRecipeDetails = getRecipeDetails;



