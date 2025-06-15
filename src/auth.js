import { createAuth0Client } from '@auth0/auth0-spa-js';

window.addEventListener('DOMContentLoaded', async () => {
  const auth0 = await createAuth0Client({
    domain: 'dev-l1v78w520owu4c6m.us.auth0.com',
    client_id: '4VYJ37NVfrQwNKdaPOTADzUlvenCQfb1',
    authorizationParams: {
        client_id: '4VYJ37NVfrQwNKdaPOTADzUlvenCQfb1', 
        redirect_uri: 'http://localhost:5500/screens/home.html',
        scope: 'openid profile email'
    }
  });

  // ✅ Handle login redirect only if code + state are in URL
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    try {
      await auth0.handleRedirectCallback();
      window.history.replaceState({}, document.title, '/screens/home.html');
    } catch (err) {
      console.error('Redirect callback error:', err);
    }
  }

  // ✅ Check authentication status
  const isAuthenticated = await auth0.isAuthenticated();
  console.log("Authenticated:", isAuthenticated);

  // 🔐 Login button logic (on startup page)
  if (!isAuthenticated && window.location.pathname.endsWith('startup.html')) {
    const loginBtn = document.getElementById('getStarted');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        auth0.loginWithRedirect();
      });
    }
  }

  // 🏠 Authenticated on home page
  if (isAuthenticated && window.location.pathname.endsWith('home.html')) {
    const user = await auth0.getUser();
    console.log('User:', user);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth0.logout({ returnTo: 'http://127.0.0.1:5500/screens/startup.html' });
      });
    }
  }
});
