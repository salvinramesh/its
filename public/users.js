// public/users.js - client-side pagination
async function api(path, opts) {
  const res = await fetch(path, opts);
  if(!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'API error');
  }
  return res.json();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

const backBtn = document.getElementById('backBtn');
if (backBtn) backBtn.addEventListener('click', () => location.href = '/');

// pagination state
let employees = [];       // full list
let currentPage = 1;
let pageSize = parseInt(document.getElementById('pageSizeSelect').value, 10);

const tbody = document.querySelector('#usersTable tbody');
const usersMsg = document.getElementById('usersMsg');
const pageInfo = document.getElementById('pageInfo');
const rangeInfo = document.getElementById('rangeInfo');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const pageSizeSelect = document.getElementById('pageSizeSelect');

async function loadAllEmployees() {
  usersMsg.textContent = 'Loading...';
  try {
    employees = await api('/api/employees');
    if (!Array.isArray(employees)) employees = [];
    currentPage = 1;
    renderPage();
  } catch (err) {
    usersMsg.textContent = 'Failed to load users: ' + (err.message || err);
    console.error(err);
  }
}

function totalPages() {
  if (!pageSize || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(employees.length / pageSize));
}

function renderPage() {
  tbody.innerHTML = '';
  usersMsg.textContent = '';

  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666">No users found</td></tr>';
    pageInfo.textContent = 'Page 0 / 0';
    rangeInfo.textContent = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const tp = totalPages();
  if (currentPage > tp) currentPage = tp;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(employees.length, startIdx + pageSize);

  const subset = employees.slice(startIdx, endIdx);
  subset.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(e.employee_id)}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn btn-edit edit-btn" data-id="${e.id}">Edit</button>
        <button class="btn btn-delete del-btn" data-id="${e.id}" style="margin-left:8px;">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // update pager UI
  pageInfo.textContent = `Page ${currentPage} / ${tp}`;
  rangeInfo.textContent = `Showing ${startIdx + 1}–${endIdx} of ${employees.length}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= tp;

  // wire buttons
  tbody.querySelectorAll('.edit-btn').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      if (!id) return;
      location.href = `/user.html?id=${encodeURIComponent(id)}`;
    });
  });

  tbody.querySelectorAll('.del-btn').forEach(b => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-id');
      if (!confirm('Delete this employee? This will unassign their assets.')) return;
      try {
        await api(`/api/employees/${id}`, { method: 'DELETE' });
        // remove from employees array and re-render page, keeping page index stable if possible
        const idx = employees.findIndex(x => String(x.id) === String(id));
        if (idx !== -1) employees.splice(idx, 1);
        // if current page now empty and not first page, step back a page
        if ((currentPage - 1) * pageSize >= employees.length && currentPage > 1) currentPage--;
        renderPage();
      } catch (err) {
        alert('Delete failed: ' + (err.message || err));
      }
    });
  });
}

// pager controls
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderPage(); }
});
nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages()) { currentPage++; renderPage(); }
});

// page size control
pageSizeSelect.addEventListener('change', () => {
  pageSize = parseInt(pageSizeSelect.value, 10) || 10;
  currentPage = 1;
  renderPage();
});

// initial load
window.addEventListener('load', loadAllEmployees);
