import { app } from "./firebase-init.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

let signedInUser = null;
const signedInPromise = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      signedInUser = user;
      resolve(user);
    } else {
      signInAnonymously(auth).catch((err) => console.error("Anonymous sign-in failed", err));
    }
  });
});

export async function ensureSignedIn() {
  if (signedInUser) return signedInUser;
  return signedInPromise;
}

// Fetches every vote doc once and reduces it into per-recipe counts plus
// the set of recipe ids the current guest has already loved.
export async function loadVoteState() {
  const user = await ensureSignedIn();
  const snap = await getDocs(collection(db, "votes"));
  const counts = {};
  const myVotes = new Set();
  snap.forEach((d) => {
    const data = d.data();
    counts[data.recipeId] = (counts[data.recipeId] || 0) + 1;
    if (data.uid === user.uid) myVotes.add(data.recipeId);
  });
  return { counts, myVotes };
}

export async function setVote(recipeId, loved) {
  const user = await ensureSignedIn();
  const ref = doc(db, "votes", `${recipeId}_${user.uid}`);
  if (loved) {
    await setDoc(ref, { recipeId, uid: user.uid, createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref);
  }
}
