import { fetchRecipes, escapeHtml } from "./data.js";
import { loadVoteState } from "./votes.js";

async function renderLeaderboard() {
  const container = document.getElementById("leaderboard");

  let recipes, voteState;
  try {
    [recipes, voteState] = await Promise.all([fetchRecipes(), loadVoteState()]);
  } catch (err) {
    container.innerHTML = `<p class="empty">Couldn't load favorites right now.</p>`;
    console.error(err);
    return;
  }

  if (!recipes.length) {
    container.innerHTML = `<p class="empty">No recipes yet — check back soon!</p>`;
    return;
  }

  const { counts } = voteState;
  const ranked = recipes
    .map((r) => ({ ...r, count: counts[r.id] || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!ranked.length) {
    container.innerHTML = `<p class="empty">No votes yet — be the first to love a recipe!</p>`;
    return;
  }

  container.innerHTML = `
    <ol class="leaderboard-list">
      ${ranked
        .map(
          (r) => `
        <li>
          <a href="recipe.html?id=${encodeURIComponent(r.id)}">${escapeHtml(r.title)}</a>
          <span class="heart-count">&#9829; ${r.count}</span>
        </li>`
        )
        .join("")}
    </ol>
  `;
}

renderLeaderboard();
