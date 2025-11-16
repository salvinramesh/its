// public/init.js
// Defensive initialization for index.html interactive buttons and small helpers.
// Also fixes modal overlay placement: moves overlays to document.body so fixed positioning works,
// and injects defensive CSS to ensure modal is centered and above other content.

(function () {
  const ISP_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1eTAyiWmdVjah4vgm_7C7_ULCBUeTh-Lh63LrSKrxMUE/edit?gid=0';

  function safeGet(id) { return document.getElementById(id) || null; }

  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Inject defensive CSS to ensure overlay/modal behave as fixed, centered, and on top.
  function injectModalFixCss() {
    if (document.getElementById('init-modal-fix-css')) return;
    const css = `
/* init.js modal fixes: ensure overlays are fixed, centered, and above everything */
._modal-overlay-laptop,
._modal-overlay-asset,
._modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 99999 !important; /* ensure it floats above everything */
  background: rgba(10,12,16,0.45) !important;
  padding: 16px !important; /* small padding so modal doesn't touch screen edges */
  box-sizing: border-box !important;
}

._modal {
  position: relative !important;
  z-index: 100000 !important;
  max-height: 92vh !important;
  overflow-y: auto !important;
  margin: 0 auto !important;
}

/* fallback: if someone inserted overlay inside a positioned ancestor, body-move will fix it */
/* ensure very long modal content doesn't overflow window */
._modal > * { box-sizing: border-box; }
`;
    const style = document.createElement('style');
    style.id = 'init-modal-fix-css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // Move overlay element(s) to document.body so position:fixed centers to viewport.
  function moveOverlayToBody(overlay) {
    try {
      if (!overlay || !overlay.parentNode) return;
      if (overlay.parentNode === document.body) return;
      document.body.appendChild(overlay);
      // ensure overlay is visible and uses correct attributes
      overlay.style.display = overlay.style.display || 'flex';
    } catch (err) {
      console.warn('moveOverlayToBody error', err);
    }
  }

  // Find any existing overlays and move them.
  function relocateExistingOverlays() {
    const overlays = document.querySelectorAll('._modal-overlay, ._modal-overlay-laptop, ._modal-overlay-asset');
    overlays.forEach(moveOverlayToBody);
  }

  // Watch for newly added overlays and move them to body immediately.
  function watchForOverlays() {
    const mo = new MutationObserver(muts => {
      for (const mut of muts) {
        if (!mut.addedNodes) continue;
        for (const node of mut.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          // If the newly added node *is* an overlay
          if (node.matches && (node.matches('._modal-overlay') || node.matches('._modal-overlay-laptop') || node.matches('._modal-overlay-asset'))) {
            moveOverlayToBody(node);
            continue;
          }

          // Or if it contains an overlay deeper
          const inner = node.querySelector && node.querySelector('._modal-overlay, ._modal-overlay-laptop, ._modal-overlay-asset');
          if (inner) moveOverlayToBody(inner);
        }
      }
    });

    mo.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });

    // keep reference on window so it won't be GC'd accidentally if debugging needed
    window.__init_modal_overlay_observer = mo;
  }

  // Small helper: close overlay if someone clicks the background (delegated)
  function installOverlayBackgroundClose() {
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!t || !t.classList) return;
      if (t.classList.contains('_modal-overlay') || t.classList.contains('_modal-overlay-laptop') || t.classList.contains('_modal-overlay-asset')) {
        try { t.remove(); } catch (e) { /* ignore */ }
      }
    });
  }

  // ======================
  // Initialization
  // ======================
  onReady(() => {
    try {
      injectModalFixCss();
      relocateExistingOverlays();
      watchForOverlays();
      installOverlayBackgroundClose();

      // header search
      const searchBtn = safeGet('searchBtnHeader');
      const searchInput = safeGet('search_q_header');
      if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
          const q = (searchInput.value || '').trim();
          if (!q) return;
          window.location.href = '/search.html?q=' + encodeURIComponent(q);
        });
      }

      // hero action scroll/focus
      const heroAction = safeGet('heroAction');
      const empInput = safeGet('emp_id');
      if (heroAction && empInput) {
        heroAction.addEventListener('click', (e) => {
          e.preventDefault();
          empInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { try { empInput.focus(); } catch (e) {} }, 250);
        });
      }

      // nav buttons
      const manageUsersBtn = safeGet('manageUsersBtn');
      if (manageUsersBtn) manageUsersBtn.addEventListener('click', () => { window.location.href = '/users.html'; });

      const manageAssetsBtn = safeGet('manageAssetsBtn');
      if (manageAssetsBtn) manageAssetsBtn.addEventListener('click', () => { window.location.href = '/assets.html'; });

      // ISP button: open external sheet
      const manageIspBtn = safeGet('manageIspBtn');
      if (manageIspBtn) {
        manageIspBtn.addEventListener('click', () => {
          window.open(ISP_SHEET_URL, '_blank', 'noopener,noreferrer');
        });
      }

      // Set current year
      const yearEl = safeGet('year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();

      // Logout handler (works even if not logged in)
      const logoutBtn = safeGet('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch('/auth/logout', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Accept': 'application/json' }
            });
          } catch (err) {
            console.warn('logout request failed', err);
          } finally {
            window.location.href = '/login.html';
          }
        });
      }

      // initial auth state refresh (shows username/logout if logged in)
      async function refreshAuthState() {
        const usernameEl = safeGet('usernameDisplay');
        const logoutBtnEl = safeGet('logoutBtn');
        if (!usernameEl || !logoutBtnEl) return;

        try {
          const resp = await fetch('/auth/me', { method: 'GET', credentials: 'same-origin', headers: { 'Accept': 'application/json' }});
          if (!resp.ok) {
            usernameEl.style.display = 'none';
            usernameEl.setAttribute('aria-hidden', 'true');
            logoutBtnEl.style.display = 'none';
            logoutBtnEl.setAttribute('aria-hidden', 'true');
            return;
          }
          const json = await resp.json().catch(()=>null);
          if (json && json.loggedIn && json.user && json.user.username) {
            usernameEl.textContent = json.user.username;
            usernameEl.style.display = 'inline-block';
            usernameEl.setAttribute('aria-hidden', 'false');
            logoutBtnEl.style.display = 'inline-block';
            logoutBtnEl.setAttribute('aria-hidden', 'false');
          } else {
            usernameEl.style.display = 'none';
            usernameEl.setAttribute('aria-hidden', 'true');
            logoutBtnEl.style.display = 'none';
            logoutBtnEl.setAttribute('aria-hidden', 'true');
          }
        } catch (err) {
          usernameEl.style.display = 'none';
          usernameEl.setAttribute('aria-hidden', 'true');
          logoutBtnEl.style.display = 'none';
          logoutBtnEl.setAttribute('aria-hidden', 'true');
          console.warn('refreshAuthState error', err);
        }
      }
      refreshAuthState();

    } catch (err) {
      console.error('init.js initialization error', err);
    }
  });
})();
