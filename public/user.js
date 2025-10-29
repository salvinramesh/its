// public/user.js
(async () => {
  // helpers
  function qs(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name);
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

  const id = parseInt(qs('id'), 10);
  if (Number.isNaN(id)) {
    alert('Missing employee id');
    location.href = '/';
    return;
  }

  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', () => { location.href = '/'; });

  const employeeIdInput = document.getElementById('u_employee_id');
  const nameInput = document.getElementById('u_name');
  const emailInput = document.getElementById('u_email');
  const saveBtn = document.getElementById('saveUserBtn');
  const delBtn = document.getElementById('delUserBtn');
  const userMsg = document.getElementById('userMsg');

  const assignedTableBody = document.querySelector('#assignedTable tbody');
  const assignedCount = document.getElementById('assignedCount');
  const unassignedSelect = document.getElementById('unassignedSelect');
  const assignBtn = document.getElementById('assignBtn');
  const assignMsg = document.getElementById('assignMsg');
  const refreshBtn = document.getElementById('refreshUnassigned');

  async function loadUser() {
    try {
      const u = await api(`/api/employees/${id}`);
      document.getElementById('pageTitle').textContent = `User — ${u.name || u.employee_id || id}`;
      employeeIdInput.value = u.employee_id || '';
      nameInput.value = u.name || '';
      emailInput.value = u.email || '';
    } catch (err) {
      console.error(err);
      alert('Failed to load employee: ' + (err.message||err));
      location.href = '/';
    }
  }

  async function loadAssigned() {
    try {
      const rows = await api(`/api/employees/${id}/assets`);
      assignedTableBody.innerHTML = '';
      if (!rows.length) {
        assignedTableBody.innerHTML = '<tr><td colspan="4" class="muted">No assets assigned</td></tr>';
      } else {
        rows.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(r.asset_number)}</td>
            <td>${escapeHtml(r.serial_number||'')}</td>
            <td>${escapeHtml(r.type||'')}</td>
            <td style="text-align:right">
              <button data-id="${r.id}" class="btn-edit unassignBtn">Unassign</button>
            </td>
          `;
          assignedTableBody.appendChild(tr);
        });
      }
      assignedCount.textContent = `${rows.length} assigned asset(s)`;

      // wire unassign
      assignedTableBody.querySelectorAll('.unassignBtn').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('Unassign this asset from the user?')) return;
          const assetId = b.getAttribute('data-id');
          try {
            // fetch single asset to preserve fields (or use assets list)
            const all = await api('/api/assets');
            const asset = all.find(a => String(a.id) === String(assetId));
            if (!asset) throw new Error('asset not found');

            await api(`/api/assets/${assetId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                asset_number: asset.asset_number,
                serial_number: asset.serial_number,
                type: asset.type,
                assigned_to: null
              })
            });

            await loadAssigned();
            await loadUnassigned();
          } catch (err) {
            alert('Unassign failed: ' + (err.message || err));
          }
        });
      });
    } catch (err) {
      console.error(err);
      assignedTableBody.innerHTML = '<tr><td colspan="4" class="muted">Failed to load</td></tr>';
    }
  }

  async function loadUnassigned() {
    try {
      const all = await api('/api/assets');
      const free = all.filter(a => !a.assigned_to);
      unassignedSelect.innerHTML = '<option value="">-- select asset --</option>';
      free.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.asset_number} — ${a.type || a.serial_number || ''}`;
        unassignedSelect.appendChild(opt);
      });
      if (!free.length) {
        unassignedSelect.innerHTML = '<option value="">-- no unassigned assets --</option>';
      }
    } catch (err) {
      console.error(err);
      unassignedSelect.innerHTML = '<option value="">-- failed to load --</option>';
    }
  }

  // Save user details (primary)
  saveBtn.addEventListener('click', async () => {
    const employee_id = employeeIdInput.value.trim();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim() || null;
    if (!employee_id || !name) { userMsg.textContent = 'employee_id and name required'; return; }
    saveBtn.disabled = true;
    userMsg.textContent = 'Saving…';
    try {
      await api(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, name, email })
      });
      userMsg.textContent = 'Saved';
      await loadUser();
    } catch (err) {
      userMsg.textContent = 'Save failed: ' + (err.message || err);
    } finally {
      saveBtn.disabled = false;
      setTimeout(() => { userMsg.textContent = ''; }, 2500);
    }
  });

  // Delete user (destructive, red)
  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this employee? This will unassign all their assets.')) return;
    try {
      await api(`/api/employees/${id}`, { method: 'DELETE' });
      location.href = '/';
    } catch (err) {
      alert('Delete failed: ' + (err.message || err));
    }
  });

  // Assign asset to user (primary)
  assignBtn.addEventListener('click', async () => {
    const aid = unassignedSelect.value;
    if (!aid) { assignMsg.textContent = 'Select an asset to assign'; return; }
    assignBtn.disabled = true;
    assignMsg.textContent = 'Assigning…';
    try {
      const all = await api('/api/assets');
      const asset = all.find(a => String(a.id) === String(aid));
      if (!asset) throw new Error('asset not found');

      await api(`/api/assets/${aid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_number: asset.asset_number,
          serial_number: asset.serial_number,
          type: asset.type,
          assigned_to: id
        })
      });

      assignMsg.textContent = 'Assigned';
      await loadAssigned();
      await loadUnassigned();
    } catch (err) {
      assignMsg.textContent = 'Assign failed: ' + (err.message || err);
    } finally {
      assignBtn.disabled = false;
      setTimeout(() => { assignMsg.textContent = ''; }, 2000);
    }
  });

  refreshBtn.addEventListener('click', loadUnassigned);

  // initial load
  await loadUser();
  await loadAssigned();
  await loadUnassigned();
})();
