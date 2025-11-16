// public/login.js
(() => {
  const form = document.getElementById('loginForm');
  const err = document.getElementById('err');

  function showError(msg) {
    err.textContent = msg;
    err.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.style.display = 'none';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const resp = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',   // critical: allow browser to accept Set-Cookie
        body: JSON.stringify({ username, password })
      });

      // Try parse JSON safely
      let j = {};
      try { j = await resp.json(); } catch (parseErr) { /* ignore */ }

      if (!resp.ok) {
        showError(j.error || `Login failed (${resp.status})`);
        return;
      }

      // success -> redirect to app root
      window.location.href = '/';
    } catch (e) {
      console.error('Login fetch error', e);
      showError('Network error — try again');
    }
  });
})();
