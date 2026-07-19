import { fetchRecipes, escapeHtml } from "./data.js";
import { loadVoteState, setVote } from "./votes.js";

function updateHeartButton(btn, count, loved) {
  btn.classList.toggle("loved", loved);
  btn.querySelector(".heart-icon").innerHTML = loved ? "&#9829;" : "&#9825;";
  btn.querySelector(".heart-count").textContent = `${count} ${count === 1 ? "love" : "loves"}`;
}

async function wireVoting(recipeId) {
  const btn = document.getElementById("heart-btn");
  if (!btn) return;
  let state;
  try {
    state = await loadVoteState();
  } catch (err) {
    console.error("Couldn't load votes", err);
    return;
  }
  let count = state.counts[recipeId] || 0;
  let loved = state.myVotes.has(recipeId);
  updateHeartButton(btn, count, loved);

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await setVote(recipeId, !loved);
      loved = !loved;
      count += loved ? 1 : -1;
      updateHeartButton(btn, count, loved);
    } catch (err) {
      console.error("Vote failed", err);
    } finally {
      btn.disabled = false;
    }
  });
}

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
    <button id="heart-btn" class="heart-btn heart-btn-large" aria-label="Love this recipe">
      <span class="heart-icon">&#9825;</span>
      <span class="heart-count">&nbsp;</span>
    </button>
    <h2>Ingredients</h2>
    <ul class="ingredients">
      ${recipe.ingredients
        .map(
          (ing) => `<li>${escapeHtml(ing.amount ? `${ing.amount} ${ing.item}` : ing.item)}</li>`
        )
        .join("")}
    </ul>
  `;

  wireVoting(recipe.id);
}

renderRecipeDetail();
