const DButils = require("./DButils");
const recipe_utils = require("./recipes_utils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into FavoriteRecipes values ('${user_id}',${recipe_id})`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from FavoriteRecipes where user_id='${user_id}'`);
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
  const rows = await DButils.execQuery(`
    SELECT recipe_id, family_owner, event
    FROM family_recipes
    WHERE user_id = '${user_id}'
  `);

  const recipe_ids = rows.map(r => r.recipe_id);
  const previews = await recipe_utils.getRecipesPreview(recipe_ids);

  // add family info to each recipe
  const previewWithFamily = previews.map(preview => {
    const extra = rows.find(r => r.recipe_id === preview.id);
    return {
      ...preview,
      family_owner: extra.family_owner,
      family_event: extra.event
    };
  });

  return previewWithFamily;
}
    

async function saveSearchQuery(user_id, query) {
  await DButils.execQuery(`
    INSERT INTO search_history (user_id, query)
    VALUES ('${user_id}', '${query.replace(/'/g, "''")}')
  `);
}
    

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.markAsViewed = markAsViewed;
exports.getLastSearches = getLastSearches;
exports.getLastWatchedRecipes = getLastWatchedRecipes;
exports.getMyRecipes = getMyRecipes;
exports.getFamilyRecipes = getFamilyRecipes;
exports.saveSearchQuery = saveSearchQuery;


