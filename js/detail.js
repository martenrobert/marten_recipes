async function renderRecipeDetail() {
  const container = document.getElementById("recipe-detail");
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    container.innerHTML = `<p class="empty">No recipe specified.</p>`;
    return;
  }

  let recipes;
  try {
    recipes = await fetchRecipes();
  } catch (err) {
    container.innerHTML = `<p class="empty">Couldn't load this recipe right now.</p>`;
    console.error(err);
    return;
  }

  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) {
    container.innerHTML = `<p class="empty">Recipe not found.</p>`;
    return;
  }

  document.title = `${recipe.title} — Marten Family Recipes`;

  container.innerHTML = `
    <p class="category">${escapeHtml(recipe.category || "")}</p>
    <h1>${escapeHtml(recipe.title)}</h1>
    <h2>Ingredients</h2>
    <ul class="ingredients">
      ${recipe.ingredients
        .map(
          (ing) => `<li>${escapeHtml(ing.amount ? `${ing.amount} ${ing.item}` : ing.item)}</li>`
        )
        .join("")}
    </ul>
  `;
}

renderRecipeDetail();
