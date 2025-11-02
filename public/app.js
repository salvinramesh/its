// public/app.js
// Single-file client for ITS Actionfi — Edit modal now supports laptop_details

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'API error');
  }
  return res.json();
}

/* ---------- Employees: populate assign_select and employees list ---------- */
async function refreshEmployees() {
  const sel = document.getElementById('assign_select');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- none --</option>';
  const emps = await api('/api/employees');

  emps.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.name} (${e.employee_id})`;
    sel.appendChild(opt);
  });

  // restore last selected employee if saved
  const last = localStorage.getItem('lastAssignedEmployee');
  if (last && sel.querySelector(`option[value="${last}"]`)) {
    sel.value = last;
  }

  const listWrap = document.getElementById('employees_list');
  if (!listWrap) return;
  if (!emps.length) {
    listWrap.innerHTML = '<p class="small">No employees yet.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML =
    '<thead><tr><th>Employee ID</th><th>Name</th><th>Email</th><th style="text-align:right">Actions</th></tr></thead>';
  const tbody = document.createElement('tbody');

  emps.forEach(e => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = e.employee_id;

    const tdName = document.createElement('td');
    tdName.textContent = e.name;

    const tdEmail = document.createElement('td');
    tdEmail.textContent = e.email || '';

    const tdActions = document.createElement('td');
    tdActions.style.textAlign = 'right';

    const editLink = document.createElement('a');
    editLink.href = `/user.html?id=${e.id}`;
    editLink.className = 'btn-small primary';
    editLink.style.marginRight = '8px';
    editLink.textContent = 'Edit';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small danger';
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('data-id', e.id);

    tdActions.appendChild(editLink);
    tdActions.appendChild(delBtn);
    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listWrap.innerHTML = '';
  listWrap.appendChild(table);

  listWrap.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Delete this employee? This will unassign assets assigned to them.')) return;
      try {
        await api(`/api/employees/${id}`, { method: 'DELETE' });
        await refreshEmployees();
        await loadAll();
      } catch (err) {
        alert('Delete failed: ' + (err.message || err));
      }
    });
  });
}

/* ---------- Add Employee ---------- */
const addEmpBtn = document.getElementById('addEmpBtn');
if (addEmpBtn) {
  addEmpBtn.addEventListener('click', async () => {
    try {
      const employee_id = document.getElementById('emp_id').value.trim();
      const name = document.getElementById('emp_name').value.trim();
      const email = document.getElementById('emp_email').value.trim();
      if (!employee_id || !name) {
        alert('employee id and name required');
        return;
      }
      await api('/api/employees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ employee_id, name, email })
      });
      document.getElementById('emp_id').value = '';
      document.getElementById('emp_name').value = '';
      document.getElementById('emp_email').value = '';
      await refreshEmployees();
      alert('Employee added');
    } catch (e) {
      alert('Error: ' + (e.message || e));
      console.error(e);
    }
  });
}

/* ---------- Laptop details modal state ---------- */
// stored in-memory until asset is added (or page reload)
let currentLaptopDetails = null;

/* Create and open laptop details modal. Prefills fields if currentLaptopDetails exists. */
function openLaptopDetailsModal() {
  let overlay = document.querySelector('._modal-overlay-laptop');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.className = '_modal-overlay-laptop';

  const modal = document.createElement('div');
  modal.className = '_modal';
  modal.innerHTML = `
    <h3>Laptop / Desktop details</h3>

    <div class="row" style="margin-bottom:10px;">
      <div class="col">
        <label for="lap_cpu">CPU</label>
        <input id="lap_cpu" placeholder="e.g. Intel i7-1165G7" />
      </div>
      <div class="col">
        <label for="lap_ram">RAM</label>
        <input id="lap_ram" placeholder="e.g. 16GB" />
      </div>
    </div>

    <div class="row" style="margin-bottom:10px;">
      <div class="col">
        <label for="lap_storage">Storage (SSD/HDD)</label>
        <input id="lap_storage" placeholder="e.g. 512GB SSD" />
      </div>
      <div class="col">
        <label for="lap_other_short">Other (short)</label>
        <input id="lap_other_short" placeholder="e.g. 14-inch, integrated GPU" />
      </div>
    </div>

    <div style="margin-bottom:8px;">
      <label for="lap_other">Other details (notes)</label>
      <textarea id="lap_other" placeholder="Additional details..."></textarea>
    </div>

    <div class="actions">
      <button id="lapCancel" class="btn-small plain">Cancel</button>
      <button id="lapSave" class="btn-small primary">Save</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Prefill if data exists
  if (currentLaptopDetails) {
    modal.querySelector('#lap_cpu').value = currentLaptopDetails.cpu || '';
    modal.querySelector('#lap_ram').value = currentLaptopDetails.ram || '';
    modal.querySelector('#lap_storage').value = currentLaptopDetails.storage || '';
    modal.querySelector('#lap_other_short').value = currentLaptopDetails.other_short || '';
    modal.querySelector('#lap_other').value = currentLaptopDetails.other || '';
  }

  modal.querySelector('#lapCancel').addEventListener('click', () => {
    overlay.remove();
  });

  modal.querySelector('#lapSave').addEventListener('click', () => {
    const cpu = modal.querySelector('#lap_cpu').value.trim();
    const ram = modal.querySelector('#lap_ram').value.trim();
    const storage = modal.querySelector('#lap_storage').value.trim();
    const other_short = modal.querySelector('#lap_other_short').value.trim();
    const other = modal.querySelector('#lap_other').value.trim();

    if (!cpu && !ram && !storage && !other && !other_short) {
      if (!confirm('No details entered. Do you want to save empty details?')) return;
    }

    currentLaptopDetails = { cpu, ram, storage, other_short, other };
    updateLaptopButtonUI();
    overlay.remove();
  });
}

/* Helper: update button text / state */
function updateLaptopButtonUI() {
  const btn = document.getElementById('addLaptopDetailsBtn');
  if (!btn) return;
  if (currentLaptopDetails && (currentLaptopDetails.cpu || currentLaptopDetails.ram || currentLaptopDetails.storage || currentLaptopDetails.other || currentLaptopDetails.other_short)) {
    btn.textContent = 'Edit Item Details ✓';
  } else {
    btn.textContent = 'Add Item Details';
  }
}

/* ---------- Asset handlers (modified to include laptop_details) ---------- */
const addAssetBtn = document.getElementById('addAssetBtn');
if (addAssetBtn) {
  addAssetBtn.addEventListener('click', async () => {
    try {
      const asset_number = document.getElementById('asset_number').value.trim();
      const serial_number = document.getElementById('serial_number').value.trim();
      const category = document.getElementById('asset_category').value;
      const asset_other = document.getElementById('asset_other') ? document.getElementById('asset_other').value.trim() : '';
      const assignSelect = document.getElementById('assign_select');
      const assigned_to = assignSelect.value || null;

      let type;
      if (category === 'Others') {
        if (!asset_other) {
          alert('Please specify the other category');
          return;
        }
        type = asset_other;
      } else {
        type = category;
      }

      if (!asset_number || !type) {
        alert('asset number and category required');
        return;
      }

      // If category is Laptop or Desktop, include laptop details (if any)
      let laptop_details_to_send = null;
      if (category === 'Laptop' || category === 'Desktop') {
        laptop_details_to_send = currentLaptopDetails || null;
      }

      // Save current assigned employee selection before add
      if (assigned_to) {
        localStorage.setItem('lastAssignedEmployee', assigned_to);
      } else {
        localStorage.removeItem('lastAssignedEmployee');
      }

      const payload = { asset_number, serial_number, type, assigned_to };
      if (laptop_details_to_send) payload.laptop_details = laptop_details_to_send;

      await api('/api/assets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // clear form but keep the employee selection locked
      document.getElementById('asset_number').value = '';
      document.getElementById('serial_number').value = '';
      document.getElementById('asset_category').value = '';
      if (document.getElementById('asset_other')) document.getElementById('asset_other').value = '';

      // clear saved laptop details when category cleared
      currentLaptopDetails = null;
      updateLaptopButtonUI();

      const last = localStorage.getItem('lastAssignedEmployee');
      if (last && assignSelect.querySelector(`option[value="${last}"]`)) {
        assignSelect.value = last;
      }

      const otherWrap = document.getElementById('asset_other_wrap');
      if (otherWrap) otherWrap.style.display = 'none';

      alert('Asset added');
      loadAll();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });
}

/* ---------- Edit modal & table rendering (enhanced to show/edit laptop_details) ---------- */
async function openEditModal(asset) {
  // fetch fresh asset to get laptop_details if server persisted it
  try {
    const fresh = await api(`/api/assets/${asset.id}`);
    if (fresh && typeof fresh === 'object') asset = fresh;
  } catch (err) {
    console.warn('Could not fetch fresh asset:', err && err.message ? err.message : err);
  }

  const emps = await api('/api/employees').catch(() => []);

  // remove existing modal overlay if present
  let overlay = document.querySelector('._modal-overlay-asset');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.className = '_modal-overlay-asset';

  const modal = document.createElement('div');
  modal.className = '_modal';

  // local copy of laptop details for edit session
  let editLaptopDetails = (asset && asset.laptop_details) ? JSON.parse(JSON.stringify(asset.laptop_details)) : null;
  const details = editLaptopDetails || {};

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

    <!-- Laptop Details Inline (shown when Laptop/Desktop selected) -->
    <div id="laptopDetailsWrap" style="display:none;margin-top:10px;">
      <h4 style="margin-bottom:6px;">Laptop / Desktop Details</h4>

      <div class="row" style="margin-bottom:8px;">
        <div class="col">
          <label>CPU</label>
          <input id="lap_cpu" placeholder="e.g. Intel i7-1165G7" value="${escapeHtml(details.cpu || '')}" />
        </div>
        <div class="col">
          <label>RAM (GB)</label>
          <input id="lap_ram" placeholder="e.g. 16GB" value="${escapeHtml(details.ram || '')}" />
        </div>
      </div>

      <div class="row" style="margin-bottom:8px;">
        <div class="col">
          <label>Storage (GB)</label>
          <input id="lap_storage" placeholder="e.g. 512GB SSD" value="${escapeHtml(details.storage || '')}" />
        </div>
        <div class="col">
          <label>Other (short)</label>
          <input id="lap_other_short" placeholder="e.g. 14-inch, integrated GPU" value="${escapeHtml(details.other_short || '')}" />
        </div>
      </div>

      <div style="margin-bottom:8px;">
        <label>Other details (notes)</label>
        <textarea id="lap_other" placeholder="Additional details...">${escapeHtml(details.other || '')}</textarea>
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
          <button id="editCancel" class="btn-small">Cancel</button>
          <button id="editSave" class="btn-small primary">Save</button>
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
    if (currentType) {
      editCategory.value = 'Others';
      editOtherCol.style.display = 'block';
      editOther.value = currentType;
    } else {
      editOtherCol.style.display = 'none';
      editOther.value = '';
    }
  } else {
    editOtherCol.style.display = 'none';
    editOther.value = '';
  }

  modal.querySelector('#edit_assigned').value = asset.assigned_to || '';

  const laptopWrap = modal.querySelector('#laptopDetailsWrap');

  function updateLaptopVisibility() {
    const catVal = (editCategory.value || '').trim().toLowerCase();
    if (catVal === 'laptop' || catVal === 'desktop') {
      laptopWrap.style.display = 'block';
    } else {
      laptopWrap.style.display = 'none';
    }
    if (!(catVal === 'laptop' || catVal === 'desktop')) {
      editLaptopDetails = null;
    }
  }

  // initialize visibility
  updateLaptopVisibility();

  // wire change events
  editCategory.addEventListener('change', () => {
    if (editCategory.value === 'Others') editOtherCol.style.display = 'block';
    else { editOtherCol.style.display = 'none'; editOther.value = ''; }
    updateLaptopVisibility();
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

    const payload = {
      asset_number: newAssetNumber,
      serial_number: newSerial,
      type: finalType,
      assigned_to: assignedVal
    };

    const cv = (categoryVal || '').trim().toLowerCase();
    if (cv === 'laptop' || cv === 'desktop') {
      // read inline fields into laptop_details
      const cpu = modal.querySelector('#lap_cpu').value.trim();
      const ram = modal.querySelector('#lap_ram').value.trim();
      const storage = modal.querySelector('#lap_storage').value.trim();
      const other_short = modal.querySelector('#lap_other_short').value.trim();
      const other = modal.querySelector('#lap_other').value.trim();

      if (!cpu && !ram && !storage && !other_short && !other) {
        payload.laptop_details = null;
      } else {
        payload.laptop_details = { cpu, ram, storage, other_short, other };
      }
    } else {
      payload.laptop_details = null;
    }

    try {
      await api(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      overlay.remove();
      loadAll();
    } catch (err) {
      alert('Save failed: ' + (err.message || err));
    }
  });

  // close when clicking outside modal
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

/* ---------- Table rendering ---------- */
async function renderTable(rows) {
  const div = document.getElementById('results');
  if (!rows.length) {
    div.innerHTML = '<p class="small">No results</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML =
    '<thead><tr><th>Asset #</th><th>Serial</th><th>Category</th><th>Assigned To</th><th>Actions</th></tr></thead>';
  const tbody = document.createElement('tbody');

  rows.forEach(r => {
    const tr = document.createElement('tr');

    const tdAsset = document.createElement('td');
    tdAsset.textContent = r.asset_number;

    const tdSerial = document.createElement('td');
    tdSerial.textContent = r.serial_number || '';

    const tdType = document.createElement('td');
    tdType.textContent = r.type || '';

    const tdAssigned = document.createElement('td');
    tdAssigned.textContent = r.assigned_name ? `${r.assigned_name} (${r.assigned_employee_id})` : '';

    const tdActions = document.createElement('td');
    tdActions.style.whiteSpace = 'nowrap';
    tdActions.style.display = 'flex';
    tdActions.style.gap = '8px';
    tdActions.style.alignItems = 'center';
    tdActions.style.justifyContent = 'flex-end';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEditModal(r));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete small';
    delBtn.setAttribute('data-id', r.id);
    delBtn.textContent = 'Delete';

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

  div.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete asset?')) return;
      const id = btn.getAttribute('data-id');
      try {
        await api('/api/assets/' + id, { method: 'DELETE' });
        loadAll();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    });
  });
}

async function loadAll() {
  const rows = await api('/api/assets');
  renderTable(rows);
}

/* ---------- Search handlers ---------- */
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', async () => {
    const q = document.getElementById('search_q').value.trim();
    if (!q) {
      loadAll();
      return;
    }
    const rows = await api('/api/search?q=' + encodeURIComponent(q));
    renderTable(rows);
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    document.getElementById('search_q').value = '';
    loadAll();
  });
}

/* ---------- Setup on load: category visibility, laptop button handlers ---------- */
window.addEventListener('load', async () => {
  const cat = document.getElementById('asset_category');
  const otherWrap = document.getElementById('asset_other_wrap');
  const laptopRow = document.getElementById('laptopDetailsRow');
  const laptopBtn = document.getElementById('addLaptopDetailsBtn');

  if (cat && otherWrap) {
    // initial visibility
    otherWrap.style.display = cat.value === 'Others' ? 'block' : 'none';
    cat.addEventListener('change', () => {
      otherWrap.style.display = cat.value === 'Others' ? 'block' : 'none';

      // laptop button visibility & clearing details if not laptop/desktop
      if (cat.value === 'Laptop' || cat.value === 'Desktop') {
        if (laptopRow) laptopRow.style.display = 'flex';
      } else {
        if (laptopRow) laptopRow.style.display = 'none';
        currentLaptopDetails = null;
        updateLaptopButtonUI();
      }
    });

    // set initial laptop button visibility
    if (cat.value === 'Laptop' || cat.value === 'Desktop') {
      if (laptopRow) laptopRow.style.display = 'flex';
    } else {
      if (laptopRow) laptopRow.style.display = 'none';
    }
  }

  if (laptopBtn) {
    laptopBtn.addEventListener('click', () => {
      openLaptopDetailsModal();
    });
    updateLaptopButtonUI();
  }

  await refreshEmployees();
  await loadAll();
});
