import { fetchRecipes, escapeHtml } from "./data.js";
import { loadVoteState, setVote } from "./votes.js";

function heartButtonHtml(id) {
  return `
    <button class="heart-btn" data-id="${escapeHtml(id)}" aria-label="Love this recipe">
      <span class="heart-icon">&#9825;</span>
      <span class="heart-count">&nbsp;</span>
    </button>`;
}

function updateHeartButton(btn, count, loved) {
  btn.classList.toggle("loved", loved);
  btn.querySelector(".heart-icon").innerHTML = loved ? "&#9829;" : "&#9825;";
  btn.querySelector(".heart-count").textContent = count;
}

async function wireVoting(recipes) {
  let state;
  try {
    state = await loadVoteState();
  } catch (err) {
    console.error("Couldn't load votes", err);
    return;
  }
  const { counts, myVotes } = state;

  for (const recipe of recipes) {
    const btn = document.querySelector(`.heart-btn[data-id="${CSS.escape(recipe.id)}"]`);
    if (!btn) continue;
    updateHeartButton(btn, counts[recipe.id] || 0, myVotes.has(recipe.id));

    btn.addEventListener("click", async () => {
      const wasLoved = btn.classList.contains("loved");
      btn.disabled = true;
      try {
        await setVote(recipe.id, !wasLoved);
        counts[recipe.id] = (counts[recipe.id] || 0) + (wasLoved ? -1 : 1);
        updateHeartButton(btn, counts[recipe.id], !wasLoved);
      } catch (err) {
        console.error("Vote failed", err);
      } finally {
        btn.disabled = false;
      }
    });
  }
}

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
              ${heartButtonHtml(r.id)}
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    )
    .join("");

  container.innerHTML = sections;
  wireVoting(recipes);
}

renderRecipeList();
