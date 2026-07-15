import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBfCjg9GLLj1U47M_i8L5vyfW-TjWYuupI",
  authDomain: "band-planner-dogwai.firebaseapp.com",
  projectId: "band-planner-dogwai",
  storageBucket: "band-planner-dogwai.firebasestorage.app",
  messagingSenderId: "465574280383",
  appId: "1:465574280383:web:ac498f42084adbdcecda0a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
