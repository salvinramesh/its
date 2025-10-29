// public/assets.js - manage assets (with client-side pagination)
async function api(path, opts) {
  const res = await fetch(path, opts);
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || res.statusText);
  try { return JSON.parse(txt); } catch { return txt; }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

const backBtn = document.getElementById('backBtn');
backBtn && backBtn.addEventListener('click', () => location.href = '/');

const assetsTableBody = document.querySelector('#assetsTable tbody');
const assetsMsg = document.getElementById('assetsMsg');
const searchInput = document.getElementById('search_q');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const pageSizeSelect = document.getElementById('pageSize');
const paginationRow = document.getElementById('paginationRow');
const pagerInfo = document.getElementById('pagerInfo');

let allAssets = [];         // current dataset (either search results or full list)
let currentPage = 1;
let pageSize = parseInt(pageSizeSelect.value, 10);

// Load all assets initially (we will paginate client side)
async function loadAllAssets() {
  assetsMsg.textContent = 'Loading…';
  assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:18px">Loading…</td></tr>';
  try {
    const rows = await api('/api/assets');
    allAssets = rows || [];
    currentPage = 1;
    renderPage();
    assetsMsg.textContent = '';
  } catch (err) {
    console.error(err);
    assetsMsg.textContent = 'Failed to load assets: ' + (err.message || err);
    assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">Failed to load</td></tr>';
  }
}

// Run a search (server-side search API used)
async function runSearch(q) {
  assetsMsg.textContent = 'Searching…';
  assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:18px">Searching…</td></tr>';
  try {
    const rows = await api(`/api/search?q=${encodeURIComponent(q)}`);
    allAssets = rows || [];
    currentPage = 1;
    renderPage();
    assetsMsg.textContent = '';
  } catch (err) {
    console.error(err);
    assetsMsg.textContent = 'Search failed: ' + (err.message || err);
    assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">Search failed</td></tr>';
  }
}

// render current page slice
function renderPage() {
  pageSize = parseInt(pageSizeSelect.value, 10) || 10;
  const total = allAssets.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(total, startIndex + pageSize);
  const slice = allAssets.slice(startIndex, endIndex);

  // table body
  assetsTableBody.innerHTML = '';
  if (!slice.length) {
    assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">No assets found</td></tr>';
  } else {
    slice.forEach(r => {
      const tr = document.createElement('tr');

      const tdA = document.createElement('td'); tdA.textContent = r.asset_number; tr.appendChild(tdA);
      const tdS = document.createElement('td'); tdS.textContent = r.serial_number || ''; tr.appendChild(tdS);
      const tdT = document.createElement('td'); tdT.textContent = r.type || ''; tr.appendChild(tdT);
      const tdE = document.createElement('td'); tdE.textContent = r.assigned_name ? `${r.assigned_name} (${r.assigned_employee_id})` : ''; tr.appendChild(tdE);

      const tdAct = document.createElement('td');
      tdAct.style.textAlign = 'right';
      tdAct.style.whiteSpace = 'nowrap';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.style.marginRight = '8px';
      editBtn.addEventListener('click', () => openEditModal(r));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        if (!confirm('Delete this asset?')) return;
        try {
          await api(`/api/assets/${r.id}`, { method: 'DELETE' });
          // remove from client list and re-render
          allAssets = allAssets.filter(a => a.id !== r.id);
          // if current page now empty, move back a page
          const newTotalPages = Math.max(1, Math.ceil(allAssets.length / pageSize));
          if (currentPage > newTotalPages) currentPage = newTotalPages;
          renderPage();
        } catch (err) {
          alert('Delete failed: ' + (err.message || err));
        }
      });

      tdAct.appendChild(editBtn);
      tdAct.appendChild(delBtn);
      tr.appendChild(tdAct);

      assetsTableBody.appendChild(tr);
    });
  }

  // pager info and buttons
  pagerInfo.textContent = total === 0 ? 'Showing 0–0 of 0' : `Showing ${startIndex + 1}–${endIndex} of ${total}`;

  renderPaginationControls(total, totalPages);
}

// render pagination controls (Prev, numbered pages, Next)
function renderPaginationControls(total, totalPages) {
  // clear existing pager buttons (keep pagerInfo)
  // paginationRow children: pagerInfo (first) + buttons - we'll remove all except pagerInfo
  while (paginationRow.children.length > 1) paginationRow.removeChild(paginationRow.lastChild);

  // helper to create page button
  function makePageBtn(label, page, cls = '') {
    const b = document.createElement('button');
    b.className = 'pager-btn ' + (cls || '');
    b.textContent = label;
    b.addEventListener('click', () => {
      if (page === currentPage) return;
      currentPage = page;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return b;
  }

  // prev
  const prev = document.createElement('button');
  prev.className = 'pager-btn';
  prev.textContent = 'Prev';
  prev.disabled = currentPage <= 1;
  prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); }});
  paginationRow.appendChild(prev);

  // show numbered pages - sliding window logic
  const maxButtons = 7; // number of numeric page buttons to show
  let start = 1;
  let end = totalPages;
  if (totalPages > maxButtons) {
    const half = Math.floor(maxButtons / 2);
    if (currentPage - half <= 1) {
      start = 1; end = maxButtons;
    } else if (currentPage + half >= totalPages) {
      start = totalPages - maxButtons + 1;
      end = totalPages;
    } else {
      start = currentPage - half;
      end = currentPage + half;
    }
  }

  if (start > 1) {
    // show first and ellipsis
    paginationRow.appendChild(makePageBtn('1', 1));
    if (start > 2) {
      const ell = document.createElement('span'); ell.textContent = '…'; ell.style.padding = '8px 6px'; paginationRow.appendChild(ell);
    }
  }

  for (let p = start; p <= end; p++) {
    const cls = (p === currentPage) ? 'active' : '';
    paginationRow.appendChild(makePageBtn(p, p, cls));
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const ell = document.createElement('span'); ell.textContent = '…'; ell.style.padding = '8px 6px'; paginationRow.appendChild(ell);
    }
    paginationRow.appendChild(makePageBtn(totalPages, totalPages));
  }

  // next
  const next = document.createElement('button');
  next.className = 'pager-btn';
  next.textContent = 'Next';
  next.disabled = currentPage >= totalPages;
  next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderPage(); }});
  paginationRow.appendChild(next);
}

/* ---------- Edit modal (same UX as other pages) ---------- */
async function openEditModal(asset) {
  // fetch current employees for assignment dropdown
  let emps = [];
  try { emps = await api('/api/employees'); } catch (e) { emps = []; }

  // remove existing modal
  const existing = document.querySelector('._modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = '_modal-overlay';

  const modal = document.createElement('div');
  modal.className = '_modal';

  modal.innerHTML = `
    <h3>Edit Asset</h3>
    <div class="row">
      <div class="col">
        <label>Asset Number</label>
        <input id="edit_asset_number" value="${escapeHtml(asset.asset_number || '')}" />
      </div>
      <div class="col">
        <label>Serial Number</label>
        <input id="edit_serial" value="${escapeHtml(asset.serial_number || '')}" />
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="row">
      <div class="col">
        <label>Category</label>
        <select id="edit_category">
          <option> Laptop </option>
          <option> Desktop </option>
          <option> Keyboard </option>
          <option> Mouse </option>
          <option> Monitor </option>
          <option> Others </option>
        </select>
      </div>
      <div class="col" id="edit_other_col" style="display:none;">
        <label>Other category (specify)</label>
        <input id="edit_other" />
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="row">
      <div class="col">
        <label>Assign to (employee)</label>
        <select id="edit_assigned"><option value="">-- none --</option></select>
      </div>
      <div class="col" style="display:flex;align-items:flex-end;justify-content:flex-end">
        <div class="actions" style="display:flex;gap:8px">
          <button id="editCancel" class="btn-edit">Cancel</button>
          <button id="editSave" class="btn-submit">Save</button>
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // populate employees dropdown
  const editAssigned = modal.querySelector('#edit_assigned');
  emps.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.name} (${e.employee_id})`;
    editAssigned.appendChild(opt);
  });

  // set current values
  const editCategory = modal.querySelector('#edit_category');
  const currentType = (asset.type || '').trim();
  let matched = false;
  Array.from(editCategory.options).forEach(o => {
    if (o.value.trim().toLowerCase() === currentType.toLowerCase()) {
      editCategory.value = o.value;
      matched = true;
    }
  });
  const editOtherCol = modal.querySelector('#edit_other_col');
  const editOther = modal.querySelector('#edit_other');
  if (!matched) {
    editCategory.value = 'Others';
    editOtherCol.style.display = 'block';
    editOther.value = currentType;
  } else {
    editOtherCol.style.display = 'none';
    editOther.value = '';
  }

  // set assigned id
  modal.querySelector('#edit_assigned').value = asset.assigned_to || '';

  editCategory.addEventListener('change', () => {
    if (editCategory.value === 'Others') editOtherCol.style.display = 'block';
    else { editOtherCol.style.display = 'none'; editOther.value = ''; }
  });

  modal.querySelector('#editCancel').addEventListener('click', () => overlay.remove());

  modal.querySelector('#editSave').addEventListener('click', async () => {
    const newAssetNumber = modal.querySelector('#edit_asset_number').value.trim();
    const newSerial = modal.querySelector('#edit_serial').value.trim();
    const categoryVal = modal.querySelector('#edit_category').value;
    const otherVal = modal.querySelector('#edit_other').value.trim();
    const assignedVal = modal.querySelector('#edit_assigned').value || null;

    let finalType = categoryVal;
    if (categoryVal === 'Others') {
      if (!otherVal) { alert('Please specify other category'); return; }
      finalType = otherVal;
    }

    if (!newAssetNumber || !finalType) { alert('Asset number and category required'); return; }

    try {
      await api(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_number: newAssetNumber,
          serial_number: newSerial,
          type: finalType,
          assigned_to: assignedVal
        })
      });
      overlay.remove();
      // update client-side list item
      const idx = allAssets.findIndex(a => a.id === asset.id);
      if (idx !== -1) {
        allAssets[idx] = { ...allAssets[idx], asset_number: newAssetNumber, serial_number: newSerial, type: finalType, assigned_to: assignedVal };
      }
      renderPage();
    } catch (err) {
      alert('Save failed: ' + (err.message || err));
    }
  });
}

/* ---------- Search / Reset / Page size wiring ---------- */
searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q) {
    loadAllAssets();
  } else {
    runSearch(q);
  }
});
resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  loadAllAssets();
});
pageSizeSelect.addEventListener('change', () => {
  pageSize = parseInt(pageSizeSelect.value, 10) || 10;
  currentPage = 1;
  renderPage();
});

// initial load
loadAllAssets();
