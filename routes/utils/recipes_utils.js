const axios = require("axios");
const DButils = require("./DButils");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;



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

async function getRecipesPreview(recipeIdArray) {
  if (!recipeIdArray || recipeIdArray.length === 0) return [];
  console.log("API Key:", api_key);

  // get all local recipes
  const idListString = recipeIdArray.join(",");
  const query =`SELECT recipe_id AS id, title, image_url AS image, ready_in_minutes AS readyInMinutes,likes AS popularity, vegetarian, vegan, gluten_free AS glutenFree
    FROM recipes WHERE recipe_id IN (${idListString})`;

  const localRecipes = await DButils.execQuery(query);
  const localIds = localRecipes.map(r => r.id);  

  const localRecipesFormatted = localRecipes.map(recipe => ({
    ...recipe,
    vegetarian: recipe.vegetarian ? "true" : "false",
    vegan: recipe.vegan ? "true" : "false",
    glutenFree: recipe.glutenFree ? "true" : "false"
  }));

  // find recipes from Spoonacular
  const externalIds = recipeIdArray.filter(id => !localIds.includes(id));


  // get all recipes from the DB
  const updatedIds = recipeIdArray.join(",");
  const updatedQuery = `SELECT recipe_id AS id, title, image_url AS image, ready_in_minutes AS readyInMinutes,
                        likes AS popularity, vegetarian, vegan, gluten_free AS glutenFree
                        FROM recipes WHERE recipe_id IN (${updatedIds})`;

  const allRecipes = await DButils.execQuery(updatedQuery);

  return allRecipes.map(recipe => ({
    ...recipe,
    vegetarian: recipe.vegetarian ? "true" : "false",
    vegan: recipe.vegan ? "true" : "false",
    glutenFree: recipe.glutenFree ? "true" : "false"
  }));
}

async function saveExternalRecipeToDB(recipe_id) {
  // check if the recipe already exists
  const existing = await DButils.execQuery(`
    SELECT recipe_id FROM recipes WHERE recipe_id = ${recipe_id}
  `);
  if (existing.length > 0) return; // already exists

  // fetch from Spoonacular
  const response = await axios.get(`${api_domain}/${recipe_id}/information`, {
    params: {
      apiKey: process.env.spoonacular_apiKey
    }
  });

  const data = response.data;

  // insert into recipes table
  const insertRecipeQuery = `
    INSERT INTO recipes (
      recipe_id, title, image_url, ready_in_minutes,
      vegetarian, vegan, gluten_free, likes, instructions, servings, user_id
    ) VALUES (
      ${data.id}, '${data.title.replace(/'/g, "''")}', '${data.image}',
      ${data.readyInMinutes || 0}, ${data.vegetarian ? 1 : 0}, ${data.vegan ? 1 : 0}, ${data.glutenFree ? 1 : 0},
      ${data.aggregateLikes || 0}, '${(data.instructions || '').replace(/'/g, "''")}', ${data.servings || 1}, NULL
    );
  `;
  await DButils.execQuery(insertRecipeQuery);

  // insert ingredients
  const ingredients = data.extendedIngredients || [];
  for (const ing of ingredients) {
    await DButils.execQuery(`
      INSERT INTO ingredients (recipe_id, name, quantity, unit)
      VALUES (${data.id}, '${ing.name.replace(/'/g, "''")}', '${ing.amount}', '${ing.unit}')
    `);
  }
}

// async function searchRecipes(query, cuisine, diet, intolerances, limit) {
//   const response = await axios.get(`${api_domain}/complexSearch`, {
//     params: {
//       apiKey: process.env.spoonacular_apiKey,
//       query,
//       cuisine,
//       diet,
//       intolerances,
//       number: limit || 5
//     }
//   });
//   // get full info for each recipe from result
//   const recipeResults = response.data.results;
//   const detailed = await Promise.all(
//     recipeResults.map(r => getRecipeDetails(r.id))
//   );

//   return detailed;
// }


exports.getRandomRecipes = getRandomRecipes;
exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.saveExternalRecipeToDB = saveExternalRecipeToDB;
//exports.searchRecipes = searchRecipes;





