async function renderRecipeList() {
  const container = document.getElementById("recipe-list");
  let recipes;
  try {
    recipes = await fetchRecipes();
  } catch (err) {
    container.innerHTML = `<p class="empty">Couldn't load recipes right now.</p>`;
    console.error(err);
    return;
  }

  if (!recipes.length) {
    container.innerHTML = `<p class="empty">No recipes yet — check back soon!</p>`;
    return;
  }

  const byCategory = new Map();
  for (const recipe of recipes) {
    const cat = recipe.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(recipe);
  }

  const sections = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => `
      <section class="category">
        <h2>${escapeHtml(category)}</h2>
        <ul class="recipe-cards">
          ${items
            .map(
              (r) => `
            <li>
              <a href="recipe.html?id=${encodeURIComponent(r.id)}">${escapeHtml(r.title)}</a>
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    )
    .join("");

  container.innerHTML = sections;
}

renderRecipeList();
