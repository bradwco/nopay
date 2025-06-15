import { initializeApp } from "firebase/app";

const firebaseAppConfig = {
  apiKey: "AIzaSyASadY59RnIqm6r1VBmGmaqJZN0Sss91As",
  authDomain: "nopay-5d64d.firebaseapp.com",
  projectId: "nopay-5d64d",
  storageBucket: "nopay-5d64d.firebasestorage.app",
  messagingSenderId: "730195638353",
  appId: "1:730195638353:web:76e0fc301f9ebdcce12070",
  measurementId: "G-2CVKN5K9WR"
};

const app = initializeApp(firebaseAppConfig);

const HOME_PAGE_URL = "/screens/home.html";
const STARTUP_PAGE_URL = "/screens/startup.html";
const AUTH_PAGE_URL = "/screens/auth.html";

export { app, HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL }; 