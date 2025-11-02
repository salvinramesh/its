// public/assets.js - offline icons version
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

// small inline SVG icon set (simplified shapes). keys = icon names used in mappings
function getIconSvg(name) {
  // return small SVG string (width/height 18). Keep stroke/currentColor for theming.
  switch ((name || '').toLowerCase()) {
    case 'laptop':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="11" rx="1"/><path d="M2 18h20"/></svg>`;
    case 'monitor':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;
    case 'keyboard':
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="10" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01"/></svg>`;
    case 'mouse-pointer':
    case 'mouse':
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
      // fallback small box
      return `<svg class="asset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
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

  if (!assetsTableBody) console.warn('assets.js: missing #assetsTable tbody element');
  if (!paginationRow) console.warn('assets.js: missing #paginationRow element; pagination UI will be disabled');

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

  let allAssets = [];
  let currentPage = 1;
  let pageSize = parseInt((pageSizeSelect && pageSizeSelect.value) || '10', 10);

  async function loadAllAssets() {
    if (assetsMsg) assetsMsg.textContent = 'Loading…';
    if (assetsTableBody) assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:18px">Loading…</td></tr>';
    try {
      const rows = await api('/api/assets');
      allAssets = rows || [];
      currentPage = 1;
      renderPage();
      if (assetsMsg) assetsMsg.textContent = '';
    } catch (err) {
      console.error(err);
      if (assetsMsg) assetsMsg.textContent = 'Failed to load assets: ' + (err.message || err);
      if (assetsTableBody) assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">Failed to load</td></tr>';
    }
  }

  async function runSearch(q) {
    if (assetsMsg) assetsMsg.textContent = 'Searching…';
    if (assetsTableBody) assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:18px">Searching…</td></tr>';
    try {
      const rows = await api(`/api/search?q=${encodeURIComponent(q)}`);
      allAssets = rows || [];
      currentPage = 1;
      renderPage();
      if (assetsMsg) assetsMsg.textContent = '';
    } catch (err) {
      console.error(err);
      if (assetsMsg) assetsMsg.textContent = 'Search failed: ' + (err.message || err);
      if (assetsTableBody) assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">Search failed</td></tr>';
    }
  }

  function renderPage() {
    pageSize = parseInt((pageSizeSelect && pageSizeSelect.value) || '10', 10);
    const total = allAssets.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(total, startIndex + pageSize);
    const slice = allAssets.slice(startIndex, endIndex);

    if (!assetsTableBody) return;
    assetsTableBody.innerHTML = '';
    if (!slice.length) {
      assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:18px">No assets found</td></tr>';
    } else {
      slice.forEach(r => {
        const tr = document.createElement('tr');

        // Asset number cell (icon + text)
        const tdA = document.createElement('td');
        tdA.className = 'asset-num-cell';
        const iconName = chooseIconName(r.type || '');
        const iconHtml = getIconSvg(iconName);
        const iconWrapper = document.createElement('span');
        iconWrapper.innerHTML = iconHtml;

        const text = document.createElement('span');
        text.className = 'asset-num';
        text.textContent = String(r.asset_number || '');

        tdA.appendChild(iconWrapper);
        tdA.appendChild(text);
        tr.appendChild(tdA);

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
            allAssets = allAssets.filter(a => a.id !== r.id);
            const newTotalPages = Math.max(1, Math.ceil(allAssets.length / pageSize));
            if (currentPage > newTotalPages) currentPage = newTotalPages;
            renderPage();
          } catch (err) {
            alert('Delete failed: ' + (err.message || err));
          }
        });

        // laptop_details indicator: append small CPU SVG next to asset number
        if (r.laptop_details) {
          const cpuWrap = document.createElement('span');
          cpuWrap.style.marginLeft = '6px';
          cpuWrap.innerHTML = getIconSvg('cpu');
          tdA.appendChild(cpuWrap);
        }

        tdAct.appendChild(editBtn);
        tdAct.appendChild(delBtn);
        tr.appendChild(tdAct);

        assetsTableBody.appendChild(tr);
      });
    }

    if (pagerInfo) {
      pagerInfo.textContent = total === 0 ? 'Showing 0–0 of 0' : `Showing ${startIndex + 1}–${endIndex} of ${total}`;
    }

    renderPaginationControls(total, totalPages);
  }

  function renderPaginationControls(total, totalPages) {
    if (!paginationRow) return;

    while (paginationRow.children.length > 0) paginationRow.removeChild(paginationRow.lastChild);

    const left = document.createElement('div');
    left.className = 'pagination-left';
    const rowsPerPage = document.createElement('div');
    rowsPerPage.className = 'rows-per-page';
    const lbl = document.createElement('label');
    lbl.htmlFor = 'pageSize';
    lbl.textContent = 'Rows per page';
    const sel = document.createElement('select');
    sel.id = 'pageSize';
    sel.innerHTML = '<option value="5">5</option><option value="10" selected>10</option><option value="25">25</option><option value="50">50</option>';
    sel.value = pageSize.toString();
    sel.addEventListener('change', () => {
      pageSize = parseInt(sel.value, 10) || 10;
      currentPage = 1;
      renderPage();
    });
    rowsPerPage.appendChild(lbl);
    rowsPerPage.appendChild(sel);

    const pagerInfoEl = document.createElement('div');
    pagerInfoEl.className = 'pager-info';
    pagerInfoEl.id = 'pagerInfo';
    pagerInfoEl.textContent = total === 0 ? 'Showing 0–0 of 0' : `Showing ${Math.min(total, (currentPage - 1) * pageSize + 1)}–${Math.min(total, currentPage * pageSize)} of ${total}`;

    left.appendChild(rowsPerPage);
    left.appendChild(pagerInfoEl);

    paginationRow.appendChild(left);

    const right = document.createElement('div');
    right.className = 'pagination-right';

    const prev = document.createElement('button');
    prev.className = 'pager-btn';
    prev.textContent = 'Prev';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });

    const pageIndicator = document.createElement('div');
    pageIndicator.className = 'pager-info';
    pageIndicator.textContent = `Page ${currentPage} / ${Math.max(1, Math.ceil(total / pageSize))}`;

    const next = document.createElement('button');
    next.className = 'pager-btn primary';
    next.textContent = 'Next';
    next.disabled = currentPage >= Math.max(1, Math.ceil(total / pageSize));
    next.addEventListener('click', () => { if (currentPage < Math.ceil(total / pageSize)) { currentPage++; renderPage(); } });

    right.appendChild(prev);
    right.appendChild(pageIndicator);
    right.appendChild(next);

    paginationRow.appendChild(right);
  }

  /* ---------- Edit modal (with laptop details inline) ---------- */
  async function openEditModal(asset) {
    try {
      const fresh = await api(`/api/assets/${asset.id}`);
      if (fresh && typeof fresh === 'object') asset = fresh;
    } catch (err) {
      console.warn('Could not fetch fresh asset:', err && err.message ? err.message : err);
    }

    let emps = [];
    try { emps = await api('/api/employees'); } catch (e) { emps = []; }

    const existing = document.querySelector('._modal-overlay');
    if (existing) existing.remove();

    let editLaptopDetails = (asset && asset.laptop_details) ? JSON.parse(JSON.stringify(asset.laptop_details)) : null;

    const overlay = document.createElement('div');
    overlay.className = '_modal-overlay';

    const modal = document.createElement('div');
    modal.className = '_modal';

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

      <div id="laptopDetailsWrap" style="display:none;margin-top:10px;">
        <h4 style="margin-bottom:6px;">Laptop / Desktop Details</h4>

        <div class="row" style="margin-bottom:8px;">
          <div class="col">
            <label>CPU</label>
            <input id="lap_cpu" placeholder="e.g. Intel i7-1165G7" value="${escapeHtml(details.cpu || '')}" />
          </div>
          <div class="col">
            <label>RAM</label>
            <input id="lap_ram" placeholder="e.g. 16GB" value="${escapeHtml(details.ram || '')}" />
          </div>
        </div>

        <div class="row" style="margin-bottom:8px;">
          <div class="col">
            <label>Storage (SSD/HDD)</label>
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
            <button id="editCancel" class="btn-edit">Cancel</button>
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

    updateLaptopVisibility();

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        overlay.remove();
        const idx = allAssets.findIndex(a => a.id === asset.id);
        if (idx !== -1) {
          allAssets[idx] = {
            ...allAssets[idx],
            asset_number: newAssetNumber,
            serial_number: newSerial,
            type: finalType,
            assigned_to: assignedVal,
            laptop_details: payload.laptop_details
          };
        }
        renderPage();
      } catch (err) {
        alert('Save failed: ' + (err.message || err));
      }
    });

    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) overlay.remove();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput ? searchInput.value.trim() : '';
      if (!q) loadAllAssets();
      else runSearch(q);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      loadAllAssets();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      pageSize = parseInt(pageSizeSelect.value, 10) || 10;
      currentPage = 1;
      renderPage();
    });
  }

  // initial load
  loadAllAssets();
});
