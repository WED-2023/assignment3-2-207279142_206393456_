const DButils = require("./DButils");
const recipe_utils = require("./recipes_utils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`
  INSERT INTO favorites (user_id, recipe_id)
  VALUES ('${user_id}', ${recipe_id})
`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from favorites where user_id='${user_id}'`);
    return recipes_id;
}

async function markAsViewed(user_id, recipe_id) {
  const existing = await DButils.execQuery(`SELECT * FROM viewed_recipes WHERE user_id='${user_id}' AND recipe_id=${recipe_id}`);
  if (existing.length > 0) {
    await DButils.execQuery(`UPDATE viewed_recipes SET viewed_at = CURRENT_TIMESTAMP WHERE user_id='${user_id}' AND recipe_id=${recipe_id}`);
    } 
  else {
    await DButils.execQuery(
      `INSERT INTO viewed_recipes (user_id, recipe_id) VALUES ('${user_id}', ${recipe_id})`
    );
  }
}
  

async function getLastSearches(user_id) {
  const rows = await DButils.execQuery(`
    SELECT query
    FROM search_history
    WHERE user_id='${user_id}'
    ORDER BY timestamp DESC
    LIMIT 3
  `);
  return rows.map(r => r.query);
}
async function getLastWatchedRecipes(user_id) {
  const rows = await DButils.execQuery(`
    SELECT recipe_id
    FROM viewed_recipes
    WHERE user_id = '${user_id}'
    ORDER BY viewed_at DESC
    LIMIT 3
  `);

  const recipeIds = rows.map(r => r.recipe_id);
  const previews = await recipe_utils.getRecipesPreview(recipeIds);
  return previews;
}


async function getMyRecipes(user_id) {
  // Select recipes that belong to the user and are not in the family_recipes table
  const rows = await DButils.execQuery(`
    SELECT recipe_id
    FROM recipes
    WHERE user_id = '${user_id}'
    AND recipe_id NOT IN (
      SELECT recipe_id FROM family_recipes
    )
  `);

  const ids = rows.map(r => r.recipe_id);
  const previews = await recipe_utils.getRecipesPreview(ids);
  return previews;
}

async function getFamilyRecipes(user_id) {
  const recipes = await DButils.execQuery(`
    SELECT 
      R.recipe_id, 
      R.title, 
      R.image_url AS image, 
      R.ready_in_minutes, 
      R.likes AS popularity, 
      R.vegetarian, 
      R.vegan, 
      R.gluten_free, 
      R.instructions,
      F.family_owner, 
      F.event AS family_event
    FROM recipes R
    JOIN family_recipes F ON R.recipe_id = F.recipe_id
    WHERE R.user_id = ${user_id}
  `);

  for (let recipe of recipes) {
    const ingredients = await DButils.execQuery(`
      SELECT name, quantity, unit
      FROM ingredients
      WHERE recipe_id = ${recipe.recipe_id}
    `);
    recipe.ingredients = ingredients.map(i => `${i.name} - ${i.quantity} ${i.unit}`.trim());
    recipe.readyInMinutes = recipe.ready_in_minutes ?? 0;

    // recipe.instructions = recipe.instructions?.split('\n') ?? [];
  }
    return recipes;
  }
  


    
/**
 * Creates a new user recipe (regular or family) and saves to the DB.
 * @param {number} user_id - ID of the user creating the recipe
 * @param {object} recipeData - The full recipe object from frontend
 * @param {boolean} isFamily - Whether it's a family recipe
 * @param {string} [family_owner] - Name of the family recipe's owner (e.g., "Grandma")
 * @param {string} [event] - Event associated with family recipe (e.g., "Passover")
 */
async function createUserRecipe(user_id, recipeData, isFamily = false, family_owner = null, event = null) {
  try {
    // Insert the recipe
    const insertRecipeQuery = `
      INSERT INTO recipes (
        title, image_url, ready_in_minutes,
        vegetarian, vegan, gluten_free, likes,
        instructions, servings, user_id
      ) VALUES (
        '${recipeData.title.replace(/'/g, "''")}', '${recipeData.image}',
        ${recipeData.readyInMinutes || 0}, ${recipeData.vegetarian ? 1 : 0}, ${recipeData.vegan ? 1 : 0}, ${recipeData.glutenFree ? 1 : 0}, 0,
        '${(recipeData.instructions || '').replace(/'/g, "''")}', ${recipeData.servings || 1}, ${user_id}
      );
    `;
    await DButils.execQuery(insertRecipeQuery);

    // Get the new recipe_id
    const result = await DButils.execQuery(`SELECT LAST_INSERT_ID() as recipe_id`);
    const recipe_id = result[0].recipe_id;

    // Insert ingredients
    const ingredients = recipeData.ingredients || [];
    for (const ing of ingredients) {
      await DButils.execQuery(`
        INSERT INTO ingredients (recipe_id, name, quantity, unit)
        VALUES (
          ${recipe_id}, 
          '${ing.name.replace(/'/g, "''")}', 
          '${ing.quantity}', 
          '${ing.unit}'
        );
      `);
    }

    // If it's a family recipe – insert to family_recipes
    if (isFamily && family_owner && event) {
      await DButils.execQuery(`
        INSERT INTO family_recipes (user_id, recipe_id, family_owner, event)
        VALUES (${user_id}, ${recipe_id}, '${family_owner}', '${event}');
      `);
    }

    return recipe_id;
  } catch (error) {
    console.error("Failed to create user recipe:", error.message);
    throw error;
  }
}



exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.markAsViewed = markAsViewed;
exports.getLastSearches = getLastSearches;
exports.getLastWatchedRecipes = getLastWatchedRecipes;
exports.getMyRecipes = getMyRecipes;
exports.getFamilyRecipes = getFamilyRecipes;
exports.createUserRecipe = createUserRecipe;


