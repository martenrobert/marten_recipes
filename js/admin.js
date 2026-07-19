import { app } from "./firebase-init.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { fetchRecipes, escapeHtml } from "./data.js";

const ADMIN_UID = "G4LdXD4fUAOjTlRoV4agWMjPjVA3";

const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const adminPanel = document.getElementById("admin-panel");
const trackingList = document.getElementById("tracking-list");
const signOutBtn = document.getElementById("sign-out");

onAuthStateChanged(auth, (user) => {
  if (user && user.uid === ADMIN_UID) {
    loginForm.hidden = true;
    adminPanel.hidden = false;
    renderTrackingList();
  } else {
    loginForm.hidden = false;
    adminPanel.hidden = true;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (err) {
    loginError.textContent = "Sign-in failed — check email and password.";
    console.error(err);
  }
});

signOutBtn.addEventListener("click", () => signOut(auth));

async function renderTrackingList() {
  trackingList.innerHTML = "Loading recipes…";
  let recipes;
  try {
    recipes = await fetchRecipes();
  } catch (err) {
    trackingList.innerHTML = `<p class="empty">Couldn't load recipes.</p>`;
    console.error(err);
    return;
  }

  if (!recipes.length) {
    trackingList.innerHTML = `<p class="empty">No recipes published yet.</p>`;
    return;
  }

  trackingList.innerHTML = recipes
    .map(
      (r) => `
    <div class="tracking-card" data-id="${escapeHtml(r.id)}">
      <h3>${escapeHtml(r.title)}</h3>
      <label class="tried-label">
        <input type="checkbox" class="tried-input">
        Tried
      </label>
      <label>
        Rating
        <select class="rating-input">
          <option value="">—</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </label>
      <label>
        Notes
        <textarea class="notes-input" rows="3"></textarea>
      </label>
      <button type="button" class="save-btn">Save</button>
      <span class="save-status"></span>
    </div>`
    )
    .join("");

  for (const recipe of recipes) {
    loadTrackingDoc(recipe.id);
    wireSaveButton(recipe.id);
  }
}

async function loadTrackingDoc(recipeId) {
  const card = document.querySelector(`.tracking-card[data-id="${CSS.escape(recipeId)}"]`);
  if (!card) return;
  try {
    const snap = await getDoc(doc(db, "tracking", recipeId));
    if (snap.exists()) {
      const data = snap.data();
      card.querySelector(".tried-input").checked = !!data.tried;
      card.querySelector(".rating-input").value = data.rating ? String(data.rating) : "";
      card.querySelector(".notes-input").value = data.notes || "";
    }
  } catch (err) {
    console.error("Couldn't load tracking for", recipeId, err);
  }
}

function wireSaveButton(recipeId) {
  const card = document.querySelector(`.tracking-card[data-id="${CSS.escape(recipeId)}"]`);
  if (!card) return;
  const btn = card.querySelector(".save-btn");
  const status = card.querySelector(".save-status");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.textContent = "Saving…";
    const tried = card.querySelector(".tried-input").checked;
    const ratingValue = card.querySelector(".rating-input").value;
    const notes = card.querySelector(".notes-input").value;
    try {
      await setDoc(doc(db, "tracking", recipeId), {
        tried,
        rating: ratingValue ? Number(ratingValue) : null,
        notes,
      });
      status.textContent = "Saved";
      setTimeout(() => (status.textContent = ""), 2000);
    } catch (err) {
      console.error(err);
      status.textContent = "Save failed";
    } finally {
      btn.disabled = false;
    }
  });
}
