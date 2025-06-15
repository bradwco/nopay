import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASadY59RnIqm6r1VBmGmaqJZN0Sss91As",
  authDomain: "nopay-5d64d.firebaseapp.com",
  projectId: "nopay-5d64d",
  storageBucket: "nopay-5d64d.firebasestorage.app",
  messagingSenderId: "730195638353",
  appId: "1:730195638353:web:76e0fc301f9ebdcce12070",
  measurementId: "G-2CVKN5K9WR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("correctly bundling");