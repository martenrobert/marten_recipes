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
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { fetchRecipes, escapeHtml } from "./data.js";
import { compressImageToDataUrl } from "./image-utils.js";

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

function cardEl(recipeId) {
  return document.querySelector(`.tracking-card[data-id="${CSS.escape(recipeId)}"]`);
}

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

  const today = new Date().toISOString().slice(0, 10);

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

      <div class="cook-log">
        <h4>Cook log</h4>
        <div class="cook-log-entries">Loading…</div>
        <form class="cook-log-form">
          <div class="field">
            <label>Date</label>
            <input type="date" class="cook-log-date" value="${today}" required>
          </div>
          <div class="field">
            <label>Note</label>
            <textarea class="cook-log-note" rows="2" placeholder="What changed, what worked…"></textarea>
          </div>
          <div class="field">
            <label>Photo (optional)</label>
            <input type="file" class="cook-log-photo" accept="image/*">
          </div>
          <button type="submit" class="cook-log-add-btn">Add entry</button>
          <span class="cook-log-status"></span>
        </form>
      </div>
    </div>`
    )
    .join("");

  for (const recipe of recipes) {
    loadTrackingDoc(recipe.id);
    wireSaveButton(recipe.id);
    loadCookLog(recipe.id);
    wireCookLogForm(recipe.id);
  }
}

async function loadTrackingDoc(recipeId) {
  const card = cardEl(recipeId);
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
  const card = cardEl(recipeId);
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

function cookLogCollection(recipeId) {
  return collection(db, "tracking", recipeId, "cookLog");
}

async function loadCookLog(recipeId) {
  const card = cardEl(recipeId);
  if (!card) return;
  const container = card.querySelector(".cook-log-entries");
  try {
    const snap = await getDocs(query(cookLogCollection(recipeId), orderBy("date", "desc")));
    if (snap.empty) {
      container.innerHTML = `<p class="empty">No entries yet.</p>`;
      return;
    }
    container.innerHTML = snap.docs
      .map((d) => {
        const entry = d.data();
        return `
        <div class="cook-log-entry" data-entry-id="${escapeHtml(d.id)}">
          <div class="cook-log-entry-header">
            <strong>${escapeHtml(entry.date)}</strong>
            <button type="button" class="cook-log-delete-btn" data-entry-id="${escapeHtml(d.id)}">Delete</button>
          </div>
          ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
          ${entry.imageData ? `<img class="cook-log-photo-preview" src="${entry.imageData}" alt="Cook log photo from ${escapeHtml(entry.date)}">` : ""}
        </div>`;
      })
      .join("");

    container.querySelectorAll(".cook-log-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await deleteDoc(doc(db, "tracking", recipeId, "cookLog", btn.dataset.entryId));
          loadCookLog(recipeId);
        } catch (err) {
          console.error(err);
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    console.error("Couldn't load cook log for", recipeId, err);
    container.innerHTML = `<p class="empty">Couldn't load cook log.</p>`;
  }
}

function wireCookLogForm(recipeId) {
  const card = cardEl(recipeId);
  if (!card) return;
  const form = card.querySelector(".cook-log-form");
  const status = card.querySelector(".cook-log-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateInput = form.querySelector(".cook-log-date");
    const noteInput = form.querySelector(".cook-log-note");
    const photoInput = form.querySelector(".cook-log-photo");
    const addBtn = form.querySelector(".cook-log-add-btn");

    addBtn.disabled = true;
    status.textContent = "Saving…";

    try {
      let imageData = null;
      const file = photoInput.files[0];
      if (file) {
        status.textContent = "Compressing photo…";
        imageData = await compressImageToDataUrl(file);
        if (!imageData) {
          status.textContent = "Photo too large even after compression — saved without it.";
        }
      }

      await addDoc(cookLogCollection(recipeId), {
        date: dateInput.value,
        note: noteInput.value,
        imageData: imageData || null,
        createdAt: serverTimestamp(),
      });

      form.reset();
      dateInput.value = new Date().toISOString().slice(0, 10);
      if (!status.textContent.startsWith("Photo too large")) status.textContent = "Added";
      setTimeout(() => (status.textContent = ""), 2500);
      loadCookLog(recipeId);
    } catch (err) {
      console.error(err);
      status.textContent = "Couldn't save entry";
    } finally {
      addBtn.disabled = false;
    }
  });
}
