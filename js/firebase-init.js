import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

const firebaseConfig = {
  projectId: "marten-family-recipes",
  appId: "1:739549988886:web:32166baa94e12571a84d37",
  storageBucket: "marten-family-recipes.firebasestorage.app",
  apiKey: "AIzaSyDt3MeL9rB8TeIjHo-nnfkbGLP9y-229SQ",
  authDomain: "marten-family-recipes.firebaseapp.com",
  messagingSenderId: "739549988886",
};

export const app = initializeApp(firebaseConfig);
