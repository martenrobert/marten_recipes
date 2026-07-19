async function fetchRecipes() {
  const res = await fetch("data/recipes.json");
  if (!res.ok) throw new Error(`Failed to load recipes: ${res.status}`);
  return res.json();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
