// public/app.js
async function api(path, opts) {
  const res = await fetch(path, opts);
  if(!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'API error');
  }
  return res.json();
}

/* ---------- Employees: populate assign_select only ---------- */
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
}

/* ---------- Add Employee ---------- */
const addEmpBtn = document.getElementById('addEmpBtn');
if (addEmpBtn) {
  addEmpBtn.addEventListener('click', async () => {
    try {
      const employee_id = document.getElementById('emp_id').value.trim();
      const name = document.getElementById('emp_name').value.trim();
      const email = document.getElementById('emp_email').value.trim();
      if(!employee_id || !name) { alert('employee id and name required'); return; }
      await api('/api/employees', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ employee_id, name, email })});
      document.getElementById('emp_id').value='';document.getElementById('emp_name').value='';document.getElementById('emp_email').value='';
      await refreshEmployees();
      alert('Employee added');
    } catch(e) {
      alert('Error: '+ (e.message || e));
      console.error(e);
    }
  });
}

/* ---------- Asset handlers ---------- */
const addAssetBtn = document.getElementById('addAssetBtn');
if (addAssetBtn) {
  addAssetBtn.addEventListener('click', async () => {
    try {
      const asset_number = document.getElementById('asset_number').value.trim();
      const serial_number = document.getElementById('serial_number').value.trim();
      const category = document.getElementById('asset_category').value;
      const asset_other = document.getElementById('asset_other') ? document.getElementById('asset_other').value.trim() : '';
      const assigned_to = document.getElementById('assign_select').value || null;

      let type;
      if (category === 'Others') {
        if (!asset_other) { alert('Please specify the other category'); return; }
        type = asset_other;
      } else {
        type = category;
      }

      if(!asset_number || !type) { alert('asset number and category required'); return; }

      await api('/api/assets', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ asset_number, serial_number, type, assigned_to })});

      document.getElementById('asset_number').value='';
      document.getElementById('serial_number').value='';
      document.getElementById('asset_category').value='Laptop';
      if (document.getElementById('asset_other')) document.getElementById('asset_other').value='';
      document.getElementById('assign_select').value='';

      const otherWrap = document.getElementById('asset_other_wrap');
      if (otherWrap) otherWrap.style.display = 'none';

      alert('Asset added');
      loadAll();
    } catch(e) { alert('Error: '+e.message); }
  });
}

/* ---------- Asset Edit modal & Table rendering ---------- */

async function openEditModal(asset) {
  const emps = await api('/api/employees');

  let overlay = document.querySelector('._modal-overlay-asset');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.className = '_modal-overlay-asset';

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
          <button id="editCancel" class="btn-small">Cancel</button>
          <button id="editSave" class="btn-small primary">Save</button>
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
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asset_number: newAssetNumber,
          serial_number: newSerial,
          type: finalType,
          assigned_to: assignedVal
        })
      });
      overlay.remove();
      loadAll();
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------- Table rendering with Edit/Delete buttons (assets) ---------- */

async function renderTable(rows) {
  const div = document.getElementById('results');
  if(!rows.length) { div.innerHTML = '<p class="small">No results</p>'; return; }

  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Asset #</th><th>Serial</th><th>Category</th><th>Assigned To</th><th>Actions</th></tr></thead>';
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
    btn.addEventListener('click', async (e) => {
      if(!confirm('Delete asset?')) return;
      const id = btn.getAttribute('data-id');
      try {
        await api('/api/assets/'+id, { method:'DELETE' });
        loadAll();
      } catch(err) {
        alert('Delete failed: ' + err.message);
      }
    });
  });
}

async function loadAll() {
  const rows = await api('/api/assets');
  renderTable(rows);
}

/* ---------- Search & other handlers ---------- */

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', async () => {
    const q = document.getElementById('search_q').value.trim();
    if(!q) { loadAll(); return; }
    const rows = await api('/api/search?q='+encodeURIComponent(q));
    renderTable(rows);
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    document.getElementById('search_q').value='';
    loadAll();
  });
}

window.addEventListener('load', async () => {
  const cat = document.getElementById('asset_category');
  const otherWrap = document.getElementById('asset_other_wrap');
  if (cat && otherWrap) {
    if (cat.value === 'Others') otherWrap.style.display = 'block';
    else otherWrap.style.display = 'none';

    cat.addEventListener('change', () => {
      otherWrap.style.display = cat.value === 'Others' ? 'block' : 'none';
    });
  }

  await refreshEmployees();
  await loadAll();
});
