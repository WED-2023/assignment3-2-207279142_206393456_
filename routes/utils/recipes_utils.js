const axios = require("axios");
const DButils = require("./DButils");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;

/**
 * Fetch full recipe information from Spoonacular by ID.
 * Does not include nutrition data to reduce payload size.
 */
async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {includeNutrition: false,apiKey: process.env.spooncular_apiKey}
    });
}



/**
 * Returns full recipe details by ID.
 * First checks local DB, otherwise fetches from API and saves.
 */
async function getRecipeDetails(recipe_id) {
  const exists = await recipeExistsInDB(recipe_id);

  if (exists) {
    const recipe = (await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id}`))[0];
    const ingredients = await DButils.execQuery(`SELECT name, quantity, unit FROM ingredients WHERE recipe_id = ${recipe_id}`);

    return {
      id: recipe.recipe_id,
      title: recipe.title,
      readyInMinutes: recipe.ready_in_minutes,
      image: recipe.image_url,
      popularity: recipe.likes,
      vegan: !!recipe.vegan,
      vegetarian: !!recipe.vegetarian,
      glutenFree: !!recipe.gluten_free,
      servings: recipe.servings,
      instructions: recipe.instructions?.split(".").filter(s => s.trim()),
      ingredients: ingredients.map(i => ({
        name: i.name,
        quantity: `${i.quantity} ${i.unit}`.trim()
      }))
    };
  }

  // Fetch + save + return
  const response = await getRecipeInformation(recipe_id);
  const data = response.data;
  await saveExternalRecipeToDB(data);
  return {
    id: data.id,
    title: data.title,
    readyInMinutes: data.readyInMinutes,
    image: data.image,
    popularity: data.aggregateLikes,
    vegan: data.vegan,
    vegetarian: data.vegetarian,
    glutenFree: data.glutenFree,
    servings: data.servings,
    instructions: data.instructions?.split(".").filter(s => s.trim()),
    ingredients: (data.extendedIngredients || []).map(i => ({
      name: i.name,
      quantity: `${i.amount} ${i.unit}`.trim()
    }))
  };
}

/**
 * Returns a short preview of a recipe by ID.
 * First checks local DB, otherwise fetches from Spoonacular and saves.
 */

async function getRecipePreview(recipe_id) {
  const exists = await recipeExistsInDB(recipe_id);

  if (exists) {
    const recipe = (await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id}`))[0];
    return {
      id: recipe.recipe_id,
      title: recipe.title,
      image: recipe.image_url,
      readyInMinutes: recipe.ready_in_minutes,
      popularity: recipe.likes,
      vegetarian: !!recipe.vegetarian,
      vegan: !!recipe.vegan,
      glutenFree: !!recipe.gluten_free
    };
  }

  const response = await getRecipeInformation(recipe_id);
  const data = response.data;
  await saveExternalRecipeToDB(data);

  return {
    id: data.id,
    title: data.title,
    image: data.image,
    readyInMinutes: data.readyInMinutes,
    popularity: data.aggregateLikes,
    vegetarian: data.vegetarian,
    vegan: data.vegan,
    glutenFree: data.glutenFree
  };
}


/**
 * Returns an array of previews for multiple recipe IDs.
 */
async function getRecipesPreview(recipeIds) {
  const previews = [];

  for (const id of recipeIds) {
    try {
      const preview = await getRecipePreview(id);
      previews.push(preview);
    } catch (error) {
      console.error(`Failed to fetch preview for recipe ${id}:`, error.message);
    }
  }

  return previews;
}
/**
  const localRecipesFormatted = localRecipes.map(recipe => ({
    ...recipe,
    vegetarian: recipe.vegetarian ? "true" : "false",
    vegan: recipe.vegan ? "true" : "false",
    glutenFree: recipe.glutenFree ? "true" : "false"
  }));
*/


/**
 * Get random recipes from Spoonacular API
 * @param {number} count - number of recipes to retrieve
 * @returns {Promise<Array>} - list of recipe previews
 */
async function getRandomRecipes(count) {
  try {
    
    const response = await axios.get(`${api_domain}/random`, {
      params: {number: count,apiKey: process.env.spooncular_apiKey}
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



/**
 * Increases the like count of a recipe.
 * If recipe not in DB, fetches it, saves, then updates likes.
 */
async function likeRecipe(recipe_id) {
  // Check if the recipe exists locally
  const exists = await recipeExistsInDB(recipe_id);
  if (!exists) {
    const response = await getRecipeInformation(recipe_id);
    await saveExternalRecipeToDB(response.data);
  }

  // Increase the like count
  await DButils.execQuery(`
    UPDATE recipes
    SET likes = likes + 1
    WHERE recipe_id = ${recipe_id}`);

}


/**
 * Searches recipes on Spoonacular using a search query and optional filters.
 * Returns an array of preview objects (short version).
 */
async function searchRecipes({ query, limit = 5, cuisine, diet, intolerances }) {
  try {
    const response = await axios.get(`${api_domain}/complexSearch`, {
      params: {
        query,
        number: limit,
        apiKey: process.env.spooncular_apiKey,
        cuisine,
        diet,
        intolerances
      }
    });

    const recipeIds = response.data.results.map(r => r.id);
    const previews = await getRecipesPreview(recipeIds);
    return previews;

  } catch (error) {
    console.error("Failed to search recipes:", error.message);
    throw error;
  }
}

////// helper functions //////////

/**
 * Saves a recipe from Spoonacular API to the local DB only if it doesn't already exist.
 * Includes ingredients and main recipe info.
 * @param {object} data - Recipe object from Spoonacular
 */
async function saveExternalRecipeToDB(data) {
  try {
    const exists = await recipeExistsInDB(data.id);
    if (exists) {
      return; // Recipe already exists, no need to insert again
    }

    await DButils.execQuery(`
      INSERT INTO recipes (
        recipe_id, title, image_url, ready_in_minutes,
        vegetarian, vegan, gluten_free, likes, instructions, servings, user_id
      ) VALUES (
        ${data.id}, '${data.title.replace(/'/g, "''")}', '${data.image}',
        ${data.readyInMinutes || 0}, ${data.vegetarian ? 1 : 0}, ${data.vegan ? 1 : 0}, ${data.glutenFree ? 1 : 0},
        ${data.aggregateLikes || 0}, '${(data.instructions || '').replace(/'/g, "''")}', ${data.servings || 1}, NULL
      );
    `);

    const ingredients = data.extendedIngredients || [];
    for (const ing of ingredients) {
      await DButils.execQuery(`
        INSERT INTO ingredients (recipe_id, name, quantity, unit)
        VALUES (
          ${data.id},
          '${ing.name.replace(/'/g, "''")}',
          '${ing.amount}',
          '${ing.unit}'
        )
      `);
    }

    console.log(`Recipe ${data.id} saved to DB`);
  } catch (error) {
    console.error(`Failed to save recipe ${data.id} to DB:`, error.message);
    throw error;
  }
}


/**
 * Checks whether a recipe with the given ID exists in the DB.
 * @param {number} recipe_id 
 * @returns {Promise<boolean>}
 */
async function recipeExistsInDB(recipe_id) {
  const result = await DButils.execQuery(`
    SELECT 1 FROM recipes WHERE recipe_id = ${recipe_id} LIMIT 1
  `);
  return result.length > 0;
}


exports.getRecipeInformation = getRecipeInformation;
exports.getRandomRecipes = getRandomRecipes;
exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.getRecipePreview = getRecipePreview;
exports.saveExternalRecipeToDB = saveExternalRecipeToDB;
exports.likeRecipe = likeRecipe;
exports.searchRecipes = searchRecipes;
exports.recipeExistsInDB = recipeExistsInDB;

