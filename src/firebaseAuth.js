import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { app, HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL } from "./firebaseConfig";

const auth = getAuth(app);

// Firebase Login Function
async function loginEmailPassword(loginEmail, loginPassword) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    const user = userCredential.user;

    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await signOut(auth);
      return;
    }

    console.log("User logged in:", user);
    // Redirection is handled by onAuthStateChanged listener
  } catch (error) {
    console.error("Error logging in:", error.message);
    alert("Login failed. Please check your email and password.");
  }
}

// Firebase Create Account Function
async function createAccount(signupEmail, signupPassword) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword);
    const user = userCredential.user;

    console.log("User Created:", user);
    await sendEmailVerification(user);
    alert("Verification email sent! Please check your inbox before logging in.");
    await signOut(auth);
    // Redirection after signup is now to AUTH_PAGE_URL to allow login after verification
    window.location.href = AUTH_PAGE_URL;
  } catch (error) {
    console.error("Error Creating User:", error.message);
    alert("Signup failed. " + error.message);
  }
}

// Setup authentication listeners and button handlers for auth/startup pages
function setupFirebaseAuthListenersAndHandlers() {
  const loginButton = document.getElementById("loginSubmit");
  const signupButton = document.getElementById("signupSubmit");
  // No longer need a direct reference to logoutButton here for auth.html, as it's on profile.

  // Login form submission logic (from auth.html)
  if (loginButton) {
    loginButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPass").value;
      await loginEmailPassword(email, password);
    });
  }

  // Signup form submission logic (from auth.html)
  if (signupButton) {
    signupButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPass").value;
      await createAccount(email, password);
    });
  }

  // Authentication state observer (handles redirects for auth/startup -> home)
  onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname;
    if (user && user.emailVerified) {
      console.log("User is authenticated:", user.uid);
      // Dispatch custom event for authenticated user immediately
      const event = new CustomEvent('userAuthenticated', { detail: { uid: user.uid, email: user.email } });
      document.dispatchEvent(event);

      // Redirect to home if on startup or auth page
      if (currentPath.endsWith(STARTUP_PAGE_URL) || currentPath.endsWith(AUTH_PAGE_URL)) {
        window.location.href = HOME_PAGE_URL;
        alert("Login Success!");
      }
    } else {
      console.log("User is NOT authenticated.");
      // If not authenticated and on home page, redirect to startup
      if (currentPath.endsWith(HOME_PAGE_URL)) {
        window.location.href = STARTUP_PAGE_URL;
      }
    }
  });
}

// Setup logout button specifically for the profile page (called after content is rendered)
function setupProfilePageLogoutButton() {
  const logoutButtonProfile = document.getElementById("logoutBtn");
  if (logoutButtonProfile) {
    logoutButtonProfile.addEventListener("click", async () => {
      console.log("Logout button clicked from Profile page (handled by firebaseAuth).");
      await signOut(auth);
      window.location.href = STARTUP_PAGE_URL;
      alert("Logout Success!");
    });
  }
}

export { auth, setupFirebaseAuthListenersAndHandlers, loginEmailPassword, createAccount, signOut, setupProfilePageLogoutButton }; 