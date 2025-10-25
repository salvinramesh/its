// public/app.js - updated to use Category select + Others textbox
async function api(path, opts) {
  const res = await fetch(path, opts);
  if(!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'API error');
  }
  return res.json();
}

async function refreshEmployees() {
  const sel = document.getElementById('assign_select');
  sel.innerHTML = '<option value="">-- none --</option>';
  const emps = await api('/api/employees');
  emps.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.name} (${e.employee_id})`;
    sel.appendChild(opt);
  });
}

document.getElementById('addEmpBtn').addEventListener('click', async () => {
  try {
    const employee_id = document.getElementById('emp_id').value.trim();
    const name = document.getElementById('emp_name').value.trim();
    const email = document.getElementById('emp_email').value.trim();
    if(!employee_id || !name) { alert('employee id and name required'); return; }
    await api('/api/employees', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ employee_id, name, email })});
    document.getElementById('emp_id').value='';document.getElementById('emp_name').value='';document.getElementById('emp_email').value='';
    await refreshEmployees();
    alert('Employee added');
  } catch(e) { alert('Error: '+e.message); }
});

document.getElementById('addAssetBtn').addEventListener('click', async () => {
  try {
    const asset_number = document.getElementById('asset_number').value.trim();
    const serial_number = document.getElementById('serial_number').value.trim();
    const category = document.getElementById('asset_category').value;
    const asset_other = document.getElementById('asset_other') ? document.getElementById('asset_other').value.trim() : '';
    const assigned_to = document.getElementById('assign_select').value || null;

    // determine final type value to send
    let type;
    if (category === 'Others') {
      if (!asset_other) { alert('Please specify the other category'); return; }
      type = asset_other;
    } else {
      type = category;
    }

    if(!asset_number || !type) { alert('asset number and category required'); return; }

    await api('/api/assets', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ asset_number, serial_number, type, assigned_to })});

    // clear form
    document.getElementById('asset_number').value='';
    document.getElementById('serial_number').value='';
    document.getElementById('asset_category').value='Laptop';
    if (document.getElementById('asset_other')) document.getElementById('asset_other').value='';
    document.getElementById('assign_select').value='';

    // hide other input after reset (if shown)
    const otherWrap = document.getElementById('asset_other_wrap');
    if (otherWrap) otherWrap.style.display = 'none';

    alert('Asset added');
    loadAll();
  } catch(e) { alert('Error: '+e.message); }
});

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

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete small';
    delBtn.setAttribute('data-id', r.id);
    delBtn.textContent = 'Delete';
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

  // delete handlers
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

document.getElementById('searchBtn').addEventListener('click', async () => {
  const q = document.getElementById('search_q').value.trim();
  if(!q) { loadAll(); return; }
  const rows = await api('/api/search?q='+encodeURIComponent(q));
  renderTable(rows);
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  document.getElementById('search_q').value='';
  loadAll();
});

window.addEventListener('load', async () => {
  // ensure asset_other visibility matches current select on load
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
