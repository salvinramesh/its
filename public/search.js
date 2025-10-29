// public/search.js (fixed - click row shows read-only asset+user details modal)
function qs(param) {
  const u = new URL(window.location.href);
  return u.searchParams.get(param) || '';
}

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

/* ---------- Edit modal (existing) ---------- */
async function openEditModalFromSearch(asset) {
  // this is the edit modal you previously used; unchanged
  // fetch employees
  const emps = await api('/api/employees');

  let overlay = document.querySelector('._modal-overlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
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
          <button id="editCancel" class="btn-submit plain">Cancel</button>
          <button id="editSave" class="btn-submit">Save</button>
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const editAssigned = modal.querySelector('#edit_assigned');
  emps.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.name} (${e.employee_id})`;
    editAssigned.appendChild(opt);
  });

  // set category / other
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
  if (asset.assigned_to) editAssigned.value = asset.assigned_to;
  else editAssigned.value = '';

  editCategory.addEventListener('change', () => {
    editOtherCol.style.display = editCategory.value === 'Others' ? 'block' : 'none';
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
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asset_number: newAssetNumber,
          serial_number: newSerial,
          type: finalType,
          assigned_to: assignedVal
        })
      });
      overlay.remove();
      runSearch();
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });
}

/* ---------- Read-only details modal ---------- */
async function openDetailsModal(asset) {
  // Fetch assigned employee details if any
  let employee = null;
  if (asset.assigned_to) {
    try {
      employee = await api(`/api/employees/${asset.assigned_to}`);
    } catch (e) {
      employee = null;
    }
  }

  // build modal
  const overlay = document.createElement('div');
  overlay.className = '_modal-overlay';

  const modal = document.createElement('div');
  modal.className = '_modal';

  modal.innerHTML = `
    <h3>Asset Details</h3>

    <div class="detail-item"><span class="detail-label">Asset Number</span><span class="detail-value">${escapeHtml(asset.asset_number)}</span></div>
    <div class="detail-item"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(asset.type || '—')}</span></div>
    <div class="detail-item"><span class="detail-label">Serial Number</span><span class="detail-value">${escapeHtml(asset.serial_number || '—')}</span></div>

    ${employee ? `
      <hr style="margin:14px 0;border:0;border-top:1px solid #eee;">
      <h3>Assigned User</h3>
      <div class="detail-item"><span class="detail-label">Employee ID</span><span class="detail-value">${escapeHtml(employee.employee_id || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">Name</span><span class="detail-value">${escapeHtml(employee.name || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(employee.email || '—')}</span></div>
    ` : `<div class="detail-item" style="margin-top:8px;color:#666">Not assigned to any employee.</div>`}

    <div style="text-align:right;margin-top:16px;">
      <button id="closeModalBtn" class="btn-submit plain">Close</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector('#closeModalBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
}

/* ---------- Render table ---------- */
function renderTable(rows) {
  const div = document.getElementById('results');
  const msg = document.getElementById('msg');
  msg.textContent = '';
  if (!rows || rows.length === 0) {
    div.innerHTML = '<p class="small">No results found</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Asset #</th><th>Serial</th><th>Category</th><th>Assigned To</th><th style="text-align:right">Actions</th></tr></thead>';
  const tbody = document.createElement('tbody');

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'asset-row';

    // clicking row opens details (but we will ignore clicks on buttons)
    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return; // ignore when clicking action buttons
      openDetailsModal(r);
    });

    const tdAsset = document.createElement('td'); tdAsset.textContent = r.asset_number; tr.appendChild(tdAsset);
    const tdSerial = document.createElement('td'); tdSerial.textContent = r.serial_number || ''; tr.appendChild(tdSerial);
    const tdType = document.createElement('td'); tdType.textContent = r.type || ''; tr.appendChild(tdType);
    const tdAssigned = document.createElement('td'); tdAssigned.textContent = r.assigned_name ? `${r.assigned_name} (${r.assigned_employee_id})` : ''; tr.appendChild(tdAssigned);

    const tdActions = document.createElement('td');
    tdActions.style.textAlign = 'right';
    tdActions.style.whiteSpace = 'nowrap';
    tdActions.style.display = 'flex';
    tdActions.style.gap = '8px';
    tdActions.style.justifyContent = 'flex-end';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openEditModalFromSearch(r);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (!confirm('Delete asset?')) return;
      try {
        await api('/api/assets/' + r.id, { method: 'DELETE' });
        runSearch();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  div.innerHTML = '';
  div.appendChild(table);
}

/* ---------- Run search ---------- */
async function runSearch() {
  const q = qs('q').trim();
  const info = document.getElementById('searchInfo');
  const msg = document.getElementById('msg');
  info.textContent = q ? `Results for: "${q}"` : 'Showing all assets';
  msg.textContent = 'Loading…';
  try {
    const rows = q ? await api('/api/search?q=' + encodeURIComponent(q)) : await api('/api/assets');
    renderTable(rows);
    msg.textContent = rows && rows.length ? '' : 'No results';
  } catch (err) {
    msg.textContent = 'Search failed: ' + (err.message || err);
  }
}

/* ---------- page controls ---------- */
document.getElementById('backBtn').addEventListener('click', () => window.history.back());

document.getElementById('goSearchBtn').addEventListener('click', () => {
  const q = document.getElementById('search_q_top').value.trim();
  const newUrl = window.location.pathname + (q ? `?q=${encodeURIComponent(q)}` : '');
  window.location.href = newUrl;
});
document.getElementById('search_q_top').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('goSearchBtn').click(); });

document.addEventListener('DOMContentLoaded', () => {
  const q = qs('q');
  document.getElementById('search_q_top').value = q;
  runSearch();
});
