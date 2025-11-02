// public/search.js (updated - offline inline icons + laptop_details shown)
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

/* ---------- small inline SVG icon set (same as assets page) ---------- */
function getIconSvg(name) {
  switch ((name || '').toLowerCase()) {
    case 'laptop':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="11" rx="1"/><path d="M2 18h20"/></svg>`;
    case 'monitor':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;
    case 'keyboard':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="10" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01"/></svg>`;
    case 'mouse':
    case 'mouse-pointer':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l14 7-6 3 3 9-11-19z"/></svg>`;
    case 'package':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7L12 3 4 6.3A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7L12 21l8-3.3A2 2 0 0 0 21 16z"/><path d="M12 3v18"/></svg>`;
    case 'box':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7L12 3 4 6.3A2 2 0 0 0 3 8v8"/><path d="M21 16l-9 4-9-4"/></svg>`;
    case 'cpu':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>`;
    case 'printer':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><rect x="6" y="13" width="12" height="7" rx="2"/><path d="M6 18h12"/></svg>`;
    case 'smartphone':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>`;
    case 'wifi':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8 15.5a4 4 0 0 1 8 0"/><path d="M12 19.5h.01"/></svg>`;
    default:
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }
}

const categoryToIcon = {
  laptop: 'laptop',
  desktop: 'monitor',
  keyboard: 'keyboard',
  mouse: 'mouse',
  monitor: 'monitor',
  others: 'package',
  package: 'package',
  box: 'box',
  printer: 'printer',
  phone: 'smartphone',
  router: 'wifi'
};

function chooseIconName(categoryText) {
  if (!categoryText) return 'box';
  const k = categoryText.trim().toLowerCase();
  if (categoryToIcon[k]) return categoryToIcon[k];
  if (k.includes('lap')) return 'laptop';
  if (k.includes('desk')) return 'monitor';
  if (k.includes('key')) return 'keyboard';
  if (k.includes('mouse')) return 'mouse';
  if (k.includes('monitor')) return 'monitor';
  if (k.includes('phone')) return 'smartphone';
  return 'package';
}

/* ---------- Edit modal (existing) ---------- */
async function openEditModalFromSearch(asset) {
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

/* ---------- Read-only details modal (updated to show laptop_details) ---------- */
async function openDetailsModal(asset) {
  let employee = null;
  if (asset.assigned_to) {
    try {
      employee = await api(`/api/employees/${asset.assigned_to}`);
    } catch (e) {
      employee = null;
    }
  }

  let laptopHtml = '';
  if (asset.laptop_details && typeof asset.laptop_details === 'object') {
    const ld = asset.laptop_details;
    const parts = [];
    if (ld.cpu) parts.push(`<div class="detail-item"><span class="detail-label">CPU</span><span class="detail-value">${escapeHtml(ld.cpu)}</span></div>`);
    if (ld.ram) parts.push(`<div class="detail-item"><span class="detail-label">RAM</span><span class="detail-value">${escapeHtml(ld.ram)}</span></div>`);
    if (ld.storage) parts.push(`<div class="detail-item"><span class="detail-label">Storage</span><span class="detail-value">${escapeHtml(ld.storage)}</span></div>`);
    if (ld.other_short) parts.push(`<div class="detail-item"><span class="detail-label">Other (short)</span><span class="detail-value">${escapeHtml(ld.other_short)}</span></div>`);
    if (ld.other) parts.push(`<div class="detail-item"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(ld.other)}</span></div>`);
    if (parts.length) {
      laptopHtml = `
        <hr style="margin:14px 0;border:0;border-top:1px solid #eee;">
        <h3>Laptop / Desktop details</h3>
        ${parts.join('')}
      `;
    }
  }

  const overlay = document.createElement('div');
  overlay.className = '_modal-overlay';

  const modal = document.createElement('div');
  modal.className = '_modal';

  modal.innerHTML = `
    <h3>Asset Details</h3>

    <div class="detail-item"><span class="detail-label">Asset Number</span><span class="detail-value">${escapeHtml(asset.asset_number)}</span></div>
    <div class="detail-item"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(asset.type || '—')}</span></div>
    <div class="detail-item"><span class="detail-label">Serial Number</span><span class="detail-value">${escapeHtml(asset.serial_number || '—')}</span></div>

    ${laptopHtml}

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

/* ---------- Render table (now with icons) ---------- */
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

    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      openDetailsModal(r);
    });

    // Asset cell with icon
    const tdAsset = document.createElement('td');
    const iconName = chooseIconName(r.type || '');
    const iconHtml = getIconSvg(iconName);
    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = iconHtml;

    const assetText = document.createElement('span');
    assetText.className = 'asset-num';
    assetText.textContent = r.asset_number || '';

    tdAsset.appendChild(iconWrap);
    tdAsset.appendChild(assetText);

    // if laptop_details exist, add small cpu icon
    if (r.laptop_details) {
      const cpuWrap = document.createElement('span');
      cpuWrap.style.marginLeft = '6px';
      cpuWrap.innerHTML = getIconSvg('cpu');
      tdAsset.appendChild(cpuWrap);
    }

    const tdSerial = document.createElement('td'); tdSerial.textContent = r.serial_number || '';
    const tdType = document.createElement('td'); tdType.textContent = r.type || '';
    const tdAssigned = document.createElement('td'); tdAssigned.textContent = r.assigned_name ? `${r.assigned_name} (${r.assigned_employee_id})` : '';

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

    tr.appendChild(tdAsset);
    tr.appendChild(tdSerial);
    tr.appendChild(tdType);
    tr.appendChild(tdAssigned);
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
