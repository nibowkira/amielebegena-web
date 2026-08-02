!function () {
  "use strict";

  // ==========================================================================
  // PMS Dashboard Controller (Phase 2)
  // Loaded only on account.html. All UI for product management lives here.
  // ==========================================================================

  var esc = function (v) {
    return window.AmieleSanitize ? window.AmieleSanitize.escapeHtml(v) : (v == null ? "" : String(v));
  };

  var state = {
    initialized: false,
    isAdmin: false,
    currentUser: null,
    products: [],
    collections: [],
    filtered: [],
    search: "",
    statusFilter: "all",
    collectionFilter: "all",
    sort: "sort_order",
    selection: {},
    form: {
      id: null,
      images: [],
      audioPath: null,
      audioUrl: "",
      audioEnabled: false
    }
  };

  var $ = function (id) { return document.getElementById(id); };

  // --------------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------------
  async function init() {
    if (state.initialized) return;
    state.initialized = true;

    try {
      state.currentUser = await window.getCurrentUser();
    } catch (e) {
      state.currentUser = null;
    }

    if (!state.currentUser || state.currentUser.role !== 'admin') {
      var nav = $('nav-pms-tab');
      if (nav) nav.style.display = 'none';
      return;
    }

    state.isAdmin = true;
    var nav = $('nav-pms-tab');
    if (nav) nav.style.display = 'flex';

    renderShell();
    await loadData();
  }

  function renderShell() {
    var container = $('pms-container');
    if (!container) return;
    if (container.dataset.rendered) return;
    container.dataset.rendered = "1";

    container.innerHTML = `
      <div class="pms-toolbar">
        <div class="pms-toolbar-left">
          <div class="pms-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" class="pms-input pms-search-input" id="pms-search" placeholder="Search products..." oninput="PMSController.onSearch(this.value)">
          </div>
          <select class="pms-select" id="pms-status-filter" onchange="PMSController.onFilter()">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted (Trash)</option>
          </select>
          <select class="pms-select" id="pms-collection-filter" onchange="PMSController.onFilter()"></select>
          <select class="pms-select" id="pms-sort" onchange="PMSController.onSort(this.value)">
            <option value="sort_order">Sort: Default</option>
            <option value="name">Sort: Name</option>
            <option value="price_asc">Sort: Price Low-High</option>
            <option value="price_desc">Sort: Price High-Low</option>
            <option value="created_at">Sort: Newest</option>
          </select>
        </div>
        <div class="pms-toolbar-right">
          <button type="button" class="pms-btn" onclick="PMSController.showRestorePoints()"><i class="fa-solid fa-clock-rotate-left"></i> Restore Points</button>
          <button type="button" class="pms-btn" onclick="PMSController.showCollections()"><i class="fa-solid fa-layer-group"></i> Collections</button>
          <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.openAdd()"><i class="fa-solid fa-plus"></i> Add Product</button>
        </div>
      </div>

      <div class="pms-kpi-grid" id="pms-kpi-grid"></div>

      <div class="pms-table-wrap">
        <table class="pms-table">
          <thead>
            <tr>
              <th style="width:36px;"><input type="checkbox" class="pms-check" id="pms-select-all" onclick="PMSController.toggleSelectAll(this)" title="Select all"></th>
              <th>Product</th>
              <th>Collection</th>
              <th>Price</th>
              <th>Status</th>
              <th>Media</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="pms-tbody"></tbody>
        </table>
      </div>

      <div class="pms-footer">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;" id="pms-bulk-actions">
          <span class="pms-tag" id="pms-selected-count">0 selected</span>
          <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('active')"><i class="fa-solid fa-eye"></i> Publish</button>
          <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('inactive')"><i class="fa-solid fa-eye-slash"></i> Hide</button>
          <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('archived')"><i class="fa-solid fa-box-archive"></i> Archive</button>
          <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkCollection()"><i class="fa-solid fa-layer-group"></i> Move to Collection</button>
          <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.bulkDelete()"><i class="fa-solid fa-trash-can"></i> Delete</button>
          <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkRestore()"><i class="fa-solid fa-rotate-left"></i> Restore</button>
        </div>
        <span class="pms-tag" id="pms-total-count"></span>
      </div>
    `;

    // collection filter options
    var collSel = $('pms-collection-filter');
    if (collSel) {
      var opts = '<option value="all">All Collections</option>';
      state.collections.forEach(function (c) {
        opts += `<option value="${esc(c.slug)}">${esc(c.name_en)}</option>`;
      });
      collSel.innerHTML = opts;
    }
  }

  // --------------------------------------------------------------------------
  // Data loading
  // --------------------------------------------------------------------------
  async function loadData() {
    var tbody = $('pms-tbody');
    if (tbody) tbody.innerHTML = skeletonRows(6);
    if ($('pms-kpi-grid')) $('pms-kpi-grid').innerHTML = '<div class="pms-skeleton" style="height:90px;"></div>';

    try {
      var res = await window.PMSService.listProducts();
      state.products = res.products || [];
      state.collections = res.collections || [];

      var collSel = $('pms-collection-filter');
      if (collSel) {
        var opts = '<option value="all">All Collections</option>';
        state.collections.forEach(function (c) {
          opts += `<option value="${esc(c.slug)}">${esc(c.name_en)}</option>`;
        });
        collSel.innerHTML = opts;
      }

      applyFilters();
      renderKpis();
    } catch (err) {
      console.error('[PMS] Failed to load products:', err);
      if (tbody) tbody.innerHTML = errorRow('Failed to load products. ' + (err.message || ''));
    }
  }

  function skeletonRows(n) {
    var rows = '';
    for (var i = 0; i < n; i++) {
      rows += `
        <tr>
          <td></td>
          <td><div class="pms-skeleton" style="height:44px;width:220px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:90px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:70px;"></div></td>
          <td><div class="pms-skeleton" style="height:22px;width:90px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:80px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:80px;"></div></td>
          <td></td>
        </tr>
      `;
    }
    return rows;
  }

  function errorRow(msg) {
    return `
      <tr>
        <td colspan="8">
          <div class="pms-empty">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h4>We couldn't load products</h4>
            <p>${esc(msg)}</p>
            <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.reload()"><i class="fa-solid fa-rotate-right"></i> Retry</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderKpis() {
    var grid = $('pms-kpi-grid');
    if (!grid) return;
    var live = state.products.filter(function (p) { return p.status === 'active' && !p.deleted_at; }).length;
    var draft = state.products.filter(function (p) { return p.status === 'draft' && !p.deleted_at; }).length;
    var archived = state.products.filter(function (p) { return p.status === 'archived' && !p.deleted_at; }).length;
    var trash = state.products.filter(function (p) { return p.deleted_at; }).length;
    var audio = state.products.filter(function (p) { return p.audio_enabled; }).length;

    grid.innerHTML = `
      <div class="pms-kpi-card"><div class="pms-kpi-label">Total Products</div><div class="pms-kpi-value">${state.products.length}</div></div>
      <div class="pms-kpi-card"><div class="pms-kpi-label">Live on Store</div><div class="pms-kpi-value" style="color:var(--pms-green);">${live}</div></div>
      <div class="pms-kpi-card"><div class="pms-kpi-label">Drafts</div><div class="pms-kpi-value">${draft}</div></div>
      <div class="pms-kpi-card"><div class="pms-kpi-label">Archived</div><div class="pms-kpi-value">${archived}</div></div>
      <div class="pms-kpi-card"><div class="pms-kpi-label">Audio Ready</div><div class="pms-kpi-value">${audio}</div></div>
      <div class="pms-kpi-card"><div class="pms-kpi-label">In Trash</div><div class="pms-kpi-value">${trash}</div></div>
    `;
  }

  // --------------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------------
  function applyFilters() {
    var q = state.search.toLowerCase().trim();
    var sf = state.statusFilter;
    var cf = state.collectionFilter;

    var list = state.products.filter(function (p) {
      if (sf === 'deleted') {
        if (!p.deleted_at) return false;
      } else {
        if (p.deleted_at) return false;
        if (sf !== 'all' && p.status !== sf) return false;
      }
      if (cf !== 'all' && p.category !== cf) return false;
      if (q) {
        var hay = (p.name + ' ' + (p.slug || '') + ' ' + (p.badge || '') + ' ' + (p.collectionName || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var key = state.sort;
    list.sort(function (a, b) {
      if (key === 'name') return a.name.localeCompare(b.name);
      if (key === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (key === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (key === 'created_at') return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      return (a.sort_order || 0) - (b.sort_order || 0) || new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });

    state.filtered = list;
    renderRows();
  }

  function statusBadge(p) {
    if (p.deleted_at) {
      return `<span class="pms-badge pms-badge-deleted"><i class="fa-solid fa-trash-can"></i> Deleted</span>`;
    }
    var map = {
      draft: { cls: 'pms-badge-draft', icon: 'fa-pen' },
      active: { cls: 'pms-badge-active', icon: 'fa-eye' },
      inactive: { cls: 'pms-badge-inactive', icon: 'fa-eye-slash' },
      out_of_stock: { cls: 'pms-badge-out_of_stock', icon: 'fa-circle-exclamation' },
      archived: { cls: 'pms-badge-archived', icon: 'fa-box-archive' }
    };
    var m = map[p.status] || map.draft;
    return `<span class="pms-badge ${m.cls}"><i class="fa-solid ${m.icon}"></i> ${esc(p.status || 'draft')}</span>`;
  }

  function mediaTags(p) {
    var tags = '';
    tags += `<span class="pms-tag">${p.image_count || 0} img</span>`;
    if (p.audio_enabled) tags += `<span class="pms-tag pms-tag-gold"><i class="fa-solid fa-music"></i> audio</span>`;
    if (p.details_link) tags += `<span class="pms-tag pms-tag-gold"><i class="fa-solid fa-link"></i></span>`;
    if (p.featured) tags += `<span class="pms-tag pms-tag-gold"><i class="fa-solid fa-star"></i></span>`;
    return tags || '<span class="pms-tag">none</span>';
  }

  function renderRows() {
    var tbody = $('pms-tbody');
    if (!tbody) return;

    var countEl = $('pms-total-count');
    if (countEl) countEl.textContent = state.filtered.length + ' of ' + state.products.length + ' products';

    if (state.filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="pms-empty">
              <i class="fa-solid fa-box-open"></i>
              <h4>No products found</h4>
              <p>Try adjusting your search or filters, or add a new product.</p>
              <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.openAdd()"><i class="fa-solid fa-plus"></i> Add Product</button>
            </div>
          </td>
        </tr>
      `;
      updateSelectedCount();
      return;
    }

    tbody.innerHTML = state.filtered.map(function (p) {
      var dateStr = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      var checked = state.selection[p.id] ? 'checked' : '';

      return `
        <tr data-id="${esc(p.id)}">
          <td data-label="Select"><input type="checkbox" class="pms-check" ${checked} onclick="PMSController.toggleSelect('${esc(p.id)}', this)"></td>
          <td data-label="Product">
            <div class="pms-prod-cell">
              <img src="${esc(p.cover)}" alt="" class="pms-prod-thumb" onerror="this.style.display='none'">
              <div>
                <div class="pms-prod-name">${esc(p.name)}</div>
                <div class="pms-prod-slug">/${esc(p.slug || '')}</div>
              </div>
            </div>
          </td>
          <td data-label="Collection">${esc(p.collectionName || p.category || '—')}</td>
          <td data-label="Price"><span class="pms-price">$${esc(formatNum(p.price))}</span></td>
          <td data-label="Status">${statusBadge(p)}</td>
          <td data-label="Media">${mediaTags(p)}</td>
          <td data-label="Updated">${dateStr}</td>
          <td data-label="Actions">
            <div class="pms-row-actions">
              <button type="button" class="pms-btn" onclick="PMSController.openEdit('${esc(p.id)}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="pms-btn" onclick="PMSController.duplicate('${esc(p.id)}')" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
              <button type="button" class="pms-btn" onclick="PMSController.showHistory('${esc(p.id)}')" title="History"><i class="fa-solid fa-clock-rotate-left"></i></button>
              ${p.deleted_at
                ? `<button type="button" class="pms-btn" onclick="PMSController.restoreOne('${esc(p.id)}')" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>`
                : p.status === 'active'
                  ? `<button type="button" class="pms-btn" onclick="PMSController.hideOne('${esc(p.id)}')" title="Hide"><i class="fa-solid fa-eye-slash"></i></button>`
                  : `<button type="button" class="pms-btn" onclick="PMSController.publishOne('${esc(p.id)}')" title="Publish"><i class="fa-solid fa-eye"></i></button>`}
              ${p.deleted_at
                ? `<button type="button" class="pms-btn pms-btn-danger" onclick="PMSController.permaDelete('${esc(p.id)}')" title="Delete forever"><i class="fa-solid fa-trash-can"></i></button>`
                : `<button type="button" class="pms-btn pms-btn-danger" onclick="PMSController.deleteOne('${esc(p.id)}')" title="Move to trash"><i class="fa-solid fa-trash-can"></i></button>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSelectedCount();
  }

  function formatNum(n) {
    n = Number(n) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updateSelectedCount() {
    var n = Object.keys(state.selection).filter(function (k) { return state.selection[k]; }).length;
    var el = $('pms-selected-count');
    if (el) el.textContent = n + ' selected';
  }

  // --------------------------------------------------------------------------
  // Public filter/sort handlers
  // --------------------------------------------------------------------------
  function onSearch(v) { state.search = v || ''; applyFilters(); }
  function onFilter() {
    state.statusFilter = $('pms-status-filter') ? $('pms-status-filter').value : 'all';
    state.collectionFilter = $('pms-collection-filter') ? $('pms-collection-filter').value : 'all';
    applyFilters();
  }
  function onSort(v) { state.sort = v || 'sort_order'; applyFilters(); }

  // --------------------------------------------------------------------------
  // Selection + bulk
  // --------------------------------------------------------------------------
  function toggleSelect(id, el) { state.selection[id] = !!el.checked; updateSelectedCount(); }
  function toggleSelectAll(el) {
    state.filtered.forEach(function (p) { state.selection[p.id] = !!el.checked; });
    renderRows();
  }

  function selectedIds() {
    return state.filtered.filter(function (p) { return state.selection[p.id]; }).map(function (p) { return p.id; });
  }

  async function bulkStatus(status) {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var label = status === 'active' ? 'publish' : (status === 'archived' ? 'archive' : 'hide');
    var ok = await confirmModal('Confirm ' + label, 'Update status to <strong>' + esc(status) + '</strong> for <strong>' + ids.length + '</strong> product(s)?');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { status: status });
      clearSelection();
      toast('Status updated to "' + status + '".', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to update status.', 'error');
    }
  }

  async function bulkCollection() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    if (state.collections.length === 0) return toast('No collections exist yet.', 'warning');
    var options = state.collections.map(function (c) {
      return `<option value="${esc(c.slug)}">${esc(c.name_en)}</option>`;
    }).join('');
    var slug = await promptModal('Move to Collection', 'Choose the destination collection for <strong>' + ids.length + '</strong> product(s).',
      `<select class="pms-select" style="width:100%;" id="pms-coll-move-sel">${options}</select>`, 'Move');
    if (!slug || !slug.value) return;
    try {
      await window.PMSService.bulkChangeCollection(ids, slug);
      clearSelection();
      toast('Products moved to the selected collection.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to move products.', 'error');
    }
  }

  async function bulkDelete() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var ok = await confirmModal('Move to Trash', 'Move <strong>' + ids.length + '</strong> product(s) to the trash? They can be restored later.', true, 'Move to Trash');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { deleted_at: new Date().toISOString(), status: 'inactive' });
      clearSelection();
      toast('Products moved to trash.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to delete products.', 'error');
    }
  }

  async function bulkRestore() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var ok = await confirmModal('Restore Products', 'Restore <strong>' + ids.length + '</strong> product(s) from trash? They will return to <strong>draft</strong> status.');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { deleted_at: null, status: 'draft' });
      clearSelection();
      toast('Products restored.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to restore products.', 'error');
    }
  }

  function clearSelection() { state.selection = {}; }

  // Single product actions
  async function publishOne(id) {
    try { await window.PMSService.bulkUpdate([id], { status: 'active' }); toast('Product published.', 'success'); await loadData(); }
    catch (e) { toast(e.message || 'Failed.', 'error'); }
  }
  async function hideOne(id) {
    try { await window.PMSService.bulkUpdate([id], { status: 'inactive' }); toast('Product hidden.', 'success'); await loadData(); }
    catch (e) { toast(e.message || 'Failed.', 'error'); }
  }
  async function deleteOne(id) {
    var ok = await confirmModal('Move to Trash', 'Move this product to the trash? It can be restored later.', true, 'Move to Trash');
    if (!ok) return;
    try { await window.PMSService.bulkUpdate([id], { deleted_at: new Date().toISOString(), status: 'inactive' }); toast('Product moved to trash.', 'success'); await loadData(); }
    catch (e) { toast(e.message || 'Failed.', 'error'); }
  }
  async function restoreOne(id) {
    var ok = await confirmModal('Restore Product', 'Restore this product from trash? It will return to <strong>draft</strong> status.');
    if (!ok) return;
    try { await window.PMSService.bulkUpdate([id], { deleted_at: null, status: 'draft' }); toast('Product restored.', 'success'); await loadData(); }
    catch (e) { toast(e.message || 'Failed.', 'error'); }
  }
  async function permaDelete(id) {
    var ok = await confirmModal('Delete Forever', 'This permanently deletes the product and its image records. <strong>This cannot be undone.</strong>', true, 'Delete Forever');
    if (!ok) return;
    try {
      await window.PMSService.deleteProduct(id);
      toast('Product permanently deleted.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to delete.', 'error');
    }
  }

  async function duplicate(id) {
    var ok = await confirmModal('Duplicate Product', 'Create a copy of this product? Copies pricing, images and settings. It will be created as a <strong>draft</strong>.');
    if (!ok) return;
    try {
      await window.PMSService.duplicateProduct(id);
      toast('Product duplicated as draft.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to duplicate.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Modals: generic
  // --------------------------------------------------------------------------
  function openModal(modalId) {
    var m = $(modalId);
    if (m) m.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    document.querySelectorAll('.pms-modal-overlay.active').forEach(function (m) {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  function toast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type || 'success');
    else alert(msg);
  }

  function confirmModal(title, html, danger, confirmText, cancelText) {
    if (typeof window.showConfirmModal === 'function') {
      return window.showConfirmModal(title, html, !!danger, confirmText || 'Confirm', cancelText || 'Cancel');
    }
    return Promise.resolve(window.confirm(html));
  }

  function promptModal(title, desc, fieldHTML, confirmText) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'pms-modal-overlay active';
      overlay.id = 'pms-prompt-overlay';
      overlay.innerHTML = `
        <div class="pms-modal" style="max-width:460px;">
          <div class="pms-modal-header">
            <h3><i class="fa-solid fa-gears"></i> ${esc(title)}</h3>
            <button type="button" class="pms-modal-close" onclick="document.getElementById('pms-prompt-overlay').remove(); document.body.style.overflow='';">&times;</button>
          </div>
          <div class="pms-modal-body">
            ${desc ? `<p style="margin:0 0 14px 0; color:var(--pms-muted); font-size:0.9rem; line-height:1.5;">${desc}</p>` : ''}
            ${fieldHTML}
          </div>
          <div class="pms-modal-footer">
            <button type="button" class="pms-btn" onclick="document.getElementById('pms-prompt-overlay').remove(); document.body.style.overflow='';">Cancel</button>
            <button type="button" class="pms-btn pms-btn-gold" id="pms-prompt-confirm">${esc(confirmText || 'Confirm')}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; }
      });
      $('pms-prompt-confirm').addEventListener('click', function () {
        var selEl = overlay.querySelector('#pms-coll-move-sel');
        var val = selEl ? selEl.value : null;
        var collected = {};
        overlay.querySelectorAll('input, select, textarea').forEach(function (el) {
          if (el.id) collected[el.id] = el.value.trim ? el.value.trim() : el.value;
          if (el.type === 'checkbox') collected[el.id] = el.checked;
        });
        var result = { value: val, values: collected };
        overlay.remove();
        document.body.style.overflow = '';
        resolve(result);
      });
      setTimeout(function () {
        var inp = overlay.querySelector('input, select');
        if (inp) inp.focus();
      }, 50);
    });
  }

  // --------------------------------------------------------------------------
  // Product form (add / edit)
  // --------------------------------------------------------------------------
  async function openAdd() {
    state.form = { id: null, images: [], audioPath: null, audioUrl: "", audioEnabled: false };
    openProductForm({ name: '', slug: '', category: '', short_description: '', description: '', price: '', currency: 'USD', stock: '', featured: false, status: 'draft', badge: '', sort_order: 0, meta_title: '', meta_description: '', details_link: '' });
  }

  async function openEdit(id) {
    try {
      var res = await window.PMSService.getProduct(id);
      var p = res.product;
      var images = (p.images || []).map(function (img) {
        return {
          id: img.id,
          storage_path: img.storage_path,
          display_order: img.display_order,
          is_cover: img.is_cover,
          alt_text: img.alt_text || ''
        };
      });
      state.form = {
        id: p.id,
        images: images,
        audioPath: p.audio_url || null,
        audioUrl: p.audio_url ? window.PMSService.publicAudioUrl ? window.PMSService.publicAudioUrl(p.audio_url) : p.audio_url : "",
        audioEnabled: !!p.audio_enabled
      };
      openProductForm(p);
    } catch (e) {
      toast(e.message || 'Failed to load product.', 'error');
    }
  }

  function openProductForm(p) {
    var title = state.form.id ? 'Edit Product' : 'Add New Product';

    var collOptions = '<option value="">— Select Collection —</option>' + state.collections.map(function (c) {
      return `<option value="${esc(c.slug)}" ${c.slug === p.category ? 'selected' : ''}>${esc(c.name_en)}${esc(c.name_am ? ' (' + c.name_am + ')' : '')}</option>`;
    }).join('');

    var statusOptions = ['draft', 'active', 'inactive', 'out_of_stock', 'archived'].map(function (s) {
      return `<option value="${s}" ${s === p.status ? 'selected' : ''}>${esc(s.replace(/_/g, ' '))}</option>`;
    }).join('');

    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-product-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-lg">
        <div class="pms-modal-header">
          <h3><i class="fa-solid ${state.form.id ? 'fa-pen' : 'fa-plus'}"></i> ${title}</h3>
          <button type="button" class="pms-modal-close" onclick="PMSController.closeProductForm()">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div class="pms-form-grid">

            <div class="pms-field">
              <label>Product Name <span class="pms-required">*</span></label>
              <input type="text" class="pms-input" id="pf-name" value="${esc(p.name || '')}" oninput="PMSController.autoSlug()" placeholder="e.g. Begena (በገና)">
            </div>

            <div class="pms-field">
              <label>Slug <span class="pms-required">*</span></label>
              <input type="text" class="pms-input" id="pf-slug" value="${esc(p.slug || '')}" oninput="PMSController.checkSlug()">
              <span class="pms-hint">URL path, e.g. <code>/begena</code> — auto-generated from name.</span>
              <div class="pms-slug-status" id="pf-slug-status"></div>
            </div>

            <div class="pms-field">
              <label>Collection <span class="pms-required">*</span></label>
              <select class="pms-select" id="pf-category">${collOptions}</select>
            </div>

            <div class="pms-field">
              <label>Status</label>
              <select class="pms-select" id="pf-status">${statusOptions}</select>
            </div>

            <div class="pms-field pms-field-full">
              <label>Short Description</label>
              <textarea class="pms-input pms-textarea" id="pf-short" rows="2" placeholder="One-line summary shown on product cards">${esc(p.short_description || '')}</textarea>
            </div>

            <div class="pms-field pms-field-full">
              <label>Full Description</label>
              <textarea class="pms-input pms-textarea" id="pf-desc" rows="4" placeholder="Detailed description (supports plain text)">${esc(p.description || '')}</textarea>
            </div>

            <div class="pms-field">
              <label>Price (USD base) <span class="pms-required">*</span></label>
              <input type="number" min="0" step="0.01" class="pms-input" id="pf-price" value="${p.price != null ? p.price : ''}" placeholder="0.00">
            </div>

            <div class="pms-field">
              <label>Currency</label>
              <select class="pms-select" id="pf-currency">
                <option value="USD" ${p.currency === 'USD' ? 'selected' : ''}>USD — US Dollar</option>
                <option value="ETB" ${p.currency === 'ETB' ? 'selected' : ''}>ETB — Ethiopian Birr</option>
                <option value="EUR" ${p.currency === 'EUR' ? 'selected' : ''}>EUR — Euro</option>
              </select>
            </div>

            <div class="pms-field">
              <label>Stock</label>
              <input type="number" min="0" step="1" class="pms-input" id="pf-stock" value="${p.stock != null ? p.stock : 0}">
            </div>

            <div class="pms-field">
              <label>Badge / Label</label>
              <input type="text" class="pms-input" id="pf-badge" value="${esc(p.badge || '')}" placeholder="e.g. NEW, በገና">
              <span class="pms-hint">Small label shown on the product card (optional).</span>
            </div>

            <div class="pms-field">
              <label>Sort Order</label>
              <input type="number" step="1" class="pms-input" id="pf-sort" value="${p.sort_order != null ? p.sort_order : 0}">
              <span class="pms-hint">Lower numbers appear first on the store.</span>
            </div>

            <div class="pms-field pms-check-field">
              <input type="checkbox" id="pf-featured" ${p.featured ? 'checked' : ''}>
              <label for="pf-featured">Feature this product</label>
            </div>

            <div class="pms-field pms-field-full">
              <div class="pms-section-divider"><span>Images</span></div>
              <div class="pms-images-grid" id="pf-images"></div>
              <label class="pms-image-upload" style="margin-top:12px; max-width:140px;">
                <i class="fa-solid fa-upload"></i>
                <span>Upload images</span>
                <input type="file" accept="image/*" multiple style="display:none;" id="pf-image-file" onchange="PMSController.addImageFiles(this)">
              </label>
              <span class="pms-hint">First image is the cover by default. Use ⭐ to change cover, arrows to reorder.</span>
            </div>

            <div class="pms-field pms-field-full">
              <div class="pms-section-divider"><span>Audio Preview</span></div>
              <div class="pms-audio-manager" id="pf-audio-manager"></div>
            </div>

            <div class="pms-field pms-field-full">
              <div class="pms-section-divider"><span>Details Page Link</span></div>
              <div class="pms-field">
                <input type="text" class="pms-input" id="pf-details-link" value="${esc(p.details_link || '')}" placeholder="e.g. about.html#begena">
                <span class="pms-hint">When set, the storefront Details button opens this page. Leave empty to use the default about page.</span>
              </div>
            </div>

            <div class="pms-field pms-field-full">
              <div class="pms-section-divider"><span>SEO &amp; Meta</span></div>
            </div>

            <div class="pms-field">
              <label>Meta Title</label>
              <input type="text" class="pms-input" id="pf-meta-title" value="${esc(p.meta_title || '')}">
            </div>

            <div class="pms-field">
              <label>Meta Description</label>
              <input type="text" class="pms-input" id="pf-meta-desc" value="${esc(p.meta_description || '')}">
            </div>

          </div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeProductForm()">Cancel</button>
          <button type="button" class="pms-btn pms-btn-gold" id="pf-save-btn" onclick="PMSController.saveProduct()"><i class="fa-solid fa-floppy-disk"></i> Save Product</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) PMSController.closeProductForm();
    });
    document.body.style.overflow = 'hidden';

    renderFormImages();
    renderAudioManager();
    checkSlug();
  }

  function closeProductForm() {
    var m = $('pms-product-modal');
    if (m) m.remove();
    document.body.style.overflow = '';
  }

  // ----- Slug auto-gen + validation -----
  function autoSlug() {
    var nameEl = $('pf-name');
    var slugEl = $('pf-slug');
    if (!nameEl || !slugEl) return;
    var name = nameEl.value.trim();
    if (!name) return;
    // Only auto-fill if slug is empty or was previously auto-generated
    var current = slugEl.value.trim();
    if (current) return;
    window.PMSService.slugify(name).then(function (slug) {
      if (slugEl.value.trim()) return;
      slugEl.value = slug || '';
      checkSlug();
    }).catch(function () { /* ignore */ });
  }

  async function checkSlug() {
    var slugEl = $('pf-slug');
    var statusEl = $('pf-slug-status');
    if (!slugEl || !statusEl) return;
    var slug = slugEl.value.trim();
    if (!slug) {
      statusEl.className = 'pms-slug-status bad';
      statusEl.textContent = 'Slug is required.';
      return;
    }
    var exclude = state.form.id || null;
    try {
      var avail = await window.PMSService.slugAvailable(slug, exclude);
      if (avail) {
        statusEl.className = 'pms-slug-status ok';
        statusEl.textContent = 'Slug is available.';
      } else {
        statusEl.className = 'pms-slug-status bad';
        statusEl.textContent = 'Slug is already in use.';
      }
    } catch (e) {
      statusEl.className = 'pms-slug-status bad';
      statusEl.textContent = 'Could not validate slug.';
    }
  }

  // ----- Images -----
  function renderFormImages() {
    var grid = $('pf-images');
    if (!grid) return;
    var imgs = state.form.images;
    if (imgs.length === 0) {
      grid.innerHTML = '<span class="pms-hint" style="grid-column:1/-1;">No images yet. Upload one or more images below.</span>';
      return;
    }
    var coverIdx = imgs.findIndex(function (i) { return i.is_cover; });
    if (coverIdx === -1 && imgs.length > 0) { imgs[0].is_cover = true; coverIdx = 0; }

    grid.innerHTML = imgs.map(function (img, idx) {
      var url = img.storage_path;
      if (url && url.indexOf('http') !== 0 && url.indexOf('/') === -1) {
        url = window.PMSService.uploadedUrl ? window.PMSService.uploadedUrl('product-images', url) : url;
      }
      var isCover = !!img.is_cover;
      return `
        <div class="pms-image-card ${isCover ? 'cover' : ''}">
          ${isCover ? '<span class="pms-img-cover-tag">COVER</span>' : ''}
          <img src="${esc(url)}" alt="">
          <div class="pms-img-actions">
            <button type="button" onclick="PMSController.setFormCover(${idx})" title="Set as cover">⭐</button>
            <button type="button" onclick="PMSController.moveFormImage(${idx}, -1)" title="Move up">▲</button>
            <button type="button" onclick="PMSController.moveFormImage(${idx}, 1)" title="Move down">▼</button>
            <button type="button" class="pms-img-del" onclick="PMSController.removeFormImage(${idx})" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function addImageFiles(input) {
    var files = input.files;
    if (!files || files.length === 0) return;
    var fileArr = Array.prototype.slice.call(files);
    var hadImages = state.form.images.length > 0;

    for (var i = 0; i < fileArr.length; i++) {
      var file = fileArr[i];
      if (!file.type || file.type.indexOf('image') === -1) {
        toast('Only image files are allowed.', 'warning');
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast('Each image must be under 8MB.', 'warning');
        continue;
      }
      try {
        var res = await window.PMSService.uploadImage(file);
        var isCover = (!hadImages && state.form.images.length === 0) || (state.form.images.length === 0);
        state.form.images.push({
          storage_path: res.path,
          display_order: state.form.images.length,
          is_cover: isCover && state.form.images.filter(function (x) { return x.is_cover; }).length === 0,
          alt_text: ''
        });
      } catch (e) {
        toast('Failed to upload "' + file.name + '": ' + (e.message || ''), 'error');
      }
    }
    input.value = '';
    renderFormImages();
  }

  function setFormCover(idx) {
    state.form.images.forEach(function (i) { i.is_cover = false; });
    if (state.form.images[idx]) state.form.images[idx].is_cover = true;
    renderFormImages();
  }

  function moveFormImage(idx, dir) {
    var arr = state.form.images;
    var target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    var tmp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = tmp;
    renderFormImages();
  }

  function removeFormImage(idx) {
    var img = state.form.images[idx];
    if (img && img.storage_path) {
      window.PMSService.deleteImageFile(img.storage_path).then(function () {});
    }
    state.form.images.splice(idx, 1);
    renderFormImages();
  }

  // ----- Audio -----
  function renderAudioManager() {
    var mgr = $('pf-audio-manager');
    if (!mgr) return;
    if (state.form.audioPath) {
      mgr.innerHTML = `
        <div class="pms-audio-file">
          <i class="fa-solid fa-file-audio" style="color:var(--pms-gold); font-size:1.4rem;"></i>
          <audio controls src="${esc(state.form.audioUrl)}"></audio>
          <div class="pms-audio-meta">Audio preview attached</div>
        </div>
        <div class="pms-check-field">
          <input type="checkbox" id="pf-audio-enabled" ${state.form.audioEnabled ? 'checked' : ''}>
          <label for="pf-audio-enabled">Enable audio preview on the storefront</label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label class="pms-btn pms-btn-sm" style="cursor:pointer;">
            <i class="fa-solid fa-upload"></i> Replace Audio
            <input type="file" accept="audio/*" style="display:none;" onchange="PMSController.addAudioFile(this)">
          </label>
          <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.removeAudioFile()"><i class="fa-solid fa-trash-can"></i> Remove Audio</button>
        </div>
      `;
    } else {
      mgr.innerHTML = `
        <div class="pms-audio-empty"><i class="fa-solid fa-music"></i> No audio preview attached.</div>
        <label class="pms-btn pms-btn-sm" style="cursor:pointer; align-self:flex-start;">
          <i class="fa-solid fa-upload"></i> Upload MP3 Preview
          <input type="file" accept="audio/mpeg,audio/mp3,audio/*" style="display:none;" onchange="PMSController.addAudioFile(this)">
        </label>
        <div class="pms-check-field">
          <input type="checkbox" id="pf-audio-enabled" ${state.form.audioEnabled ? 'checked' : ''}>
          <label for="pf-audio-enabled">Enable audio preview on the storefront</label>
        </div>
      `;
    }
  }

  async function addAudioFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast('Audio file must be under 25MB.', 'warning');
      input.value = '';
      return;
    }
    try {
      var res = await window.PMSService.uploadAudio(file);
      // remove old file if replacing
      if (state.form.audioPath) {
        window.PMSService.deleteAudioFile(state.form.audioPath).then(function () {});
      }
      state.form.audioPath = res.path;
      state.form.audioUrl = res.url;
      state.form.audioEnabled = true;
      toast('Audio preview uploaded.', 'success');
    } catch (e) {
      toast('Failed to upload audio: ' + (e.message || ''), 'error');
    }
    input.value = '';
    renderAudioManager();
  }

  function removeAudioFile() {
    if (state.form.audioPath) {
      window.PMSService.deleteAudioFile(state.form.audioPath).then(function () {});
    }
    state.form.audioPath = null;
    state.form.audioUrl = "";
    state.form.audioEnabled = false;
    renderAudioManager();
  }

  // ----- Save -----
  async function saveProduct() {
    var name = $('pf-name').value.trim();
    var slug = $('pf-slug').value.trim();
    var category = $('pf-category').value;
    var price = $('pf-price').value;

    if (!name) return toast('Product name is required.', 'warning');
    if (!slug) return toast('Slug is required.', 'warning');
    if (!category) return toast('Please select a collection.', 'warning');
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) return toast('Enter a valid price (0 or more).', 'warning');

    // slug availability final check
    var exclude = state.form.id || null;
    try {
      var avail = await window.PMSService.slugAvailable(slug, exclude);
      if (!avail) return toast('That slug is already in use. Choose another.', 'warning');
    } catch (e) { /* fall through */ }

    var audioEnabledEl = $('pf-audio-enabled');
    var audioEnabled = audioEnabledEl ? audioEnabledEl.checked : state.form.audioEnabled;

    var product = {
      id: state.form.id || undefined,
      name: name,
      slug: slug,
      category: category,
      short_description: $('pf-short').value.trim(),
      description: $('pf-desc').value.trim(),
      price: Number(price),
      currency: $('pf-currency').value,
      stock: Number($('pf-stock').value) || 0,
      featured: $('pf-featured').checked,
      status: $('pf-status').value,
      badge: $('pf-badge').value.trim(),
      sort_order: Number($('pf-sort').value) || 0,
      details_link: $('pf-details-link').value.trim() || "",
      audio_url: state.form.audioPath || "",
      audio_enabled: audioEnabled,
      meta_title: $('pf-meta-title').value.trim(),
      meta_description: $('pf-meta-desc').value.trim()
    };

    var images = state.form.images.map(function (img, idx) {
      return {
        storage_path: img.storage_path,
        display_order: idx,
        is_cover: !!img.is_cover,
        alt_text: img.alt_text || ""
      };
    });

    var btn = $('pf-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

    try {
      await window.PMSService.upsertProduct(product, images);
      closeProductForm();
      toast(state.form.id ? 'Product updated successfully.' : 'Product created successfully.', 'success');
      await loadData();
    } catch (e) {
      console.error('[PMS] Save failed:', e);
      toast(e.message || 'Failed to save product.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Product'; }
    }
  }

  // --------------------------------------------------------------------------
  // History
  // --------------------------------------------------------------------------
  async function showHistory(productId) {
    var p = state.products.find(function (x) { return x.id === productId; });
    var name = p ? p.name : 'Product';

    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-history-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-lg">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-clock-rotate-left"></i> History — ${esc(name)}</h3>
          <button type="button" class="pms-modal-close" onclick="document.getElementById('pms-history-modal').remove(); document.body.style.overflow='';">&times;</button>
        </div>
        <div class="pms-modal-body" id="pms-history-body">
          <div style="text-align:center;padding:40px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="document.getElementById('pms-history-modal').remove(); document.body.style.overflow='';">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
    document.body.style.overflow = 'hidden';

    try {
      var res = await window.PMSService.getHistory(productId);
      var body = $('pms-history-body');
      if (!res.history || res.history.length === 0) {
        body.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-clock-rotate-left"></i><h4>No history yet</h4><p>Changes to this product will appear here.</p></div>`;
        return;
      }
      body.innerHTML = res.history.map(function (h) {
        var timeStr = h.created_at ? new Date(h.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
        var actionLabel = h.action ? h.action.replace(/_/g, ' ') : 'update';
        var changes = h.field_changes || {};
        var keys = Object.keys(changes);
        var chips = '';
        if (keys.length) {
          chips = '<div class="pms-changes">' + keys.map(function (k) {
            var c = changes[k] || {};
            var from = (c.from != null && c.from !== '') ? String(c.from) : '(empty)';
            var to = (c.to != null && c.to !== '') ? String(c.to) : '(empty)';
            return `<span class="pms-change-chip"><strong>${esc(k)}</strong>: ${esc(from)} → ${esc(to)}</span>`;
          }).join('') + '</div>';
        }
        return `
          <div class="pms-history-item">
            <div class="pms-history-head">
              <span class="pms-history-action">${esc(actionLabel)}</span>
              <span class="pms-history-time">${timeStr}</span>
            </div>
            ${chips || '<div style="color:var(--pms-muted);font-size:0.85rem;">No field-level changes recorded.</div>'}
          </div>
        `;
      }).join('');
    } catch (e) {
      var bodyEl = $('pms-history-body');
      if (bodyEl) bodyEl.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-triangle-exclamation"></i><h4>Failed to load history</h4><p>${esc(e.message || '')}</p></div>`;
    }
  }

  // --------------------------------------------------------------------------
  // Restore Points
  // --------------------------------------------------------------------------
  async function showRestorePoints() {
    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-restore-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-lg">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-clock-rotate-left"></i> Restore Points</h3>
          <button type="button" class="pms-modal-close" onclick="document.getElementById('pms-restore-modal').remove(); document.body.style.overflow='';">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div class="pms-field" style="margin-bottom:20px;">
            <label>Create a Restore Point</label>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input type="text" class="pms-input" id="rp-name" placeholder="e.g. Before Spring Sale" style="flex:1; min-width:180px;">
              <input type="text" class="pms-input" id="rp-desc" placeholder="Optional description" style="flex:1; min-width:180px;">
              <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.createRestorePoint()"><i class="fa-solid fa-camera-retro"></i> Snapshot Now</button>
            </div>
            <span class="pms-hint">Creates a snapshot of all active products. You can roll back to it later.</span>
          </div>
          <div class="pms-section-divider"><span>Saved Snapshots</span></div>
          <div id="rp-list" style="margin-top:14px;"><div style="text-align:center;padding:30px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="document.getElementById('pms-restore-modal').remove(); document.body.style.overflow='';">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
    document.body.style.overflow = 'hidden';
    renderRestoreList();
  }

  async function renderRestoreList() {
    var list = $('rp-list');
    try {
      var res = await window.PMSService.listRestorePoints();
      var points = res.restorePoints || [];
      if (points.length === 0) {
        list.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-camera-retro"></i><h4>No restore points yet</h4><p>Create a snapshot above to protect your catalog.</p></div>`;
        return;
      }
      list.innerHTML = points.map(function (rp) {
        var timeStr = rp.created_at ? new Date(rp.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
        var count = rp.snapshot && Array.isArray(rp.snapshot) ? rp.snapshot.length : '?';
        return `
          <div class="pms-restore-card">
            <div class="pms-restore-name"><i class="fa-solid fa-camera"></i> ${esc(rp.name)}</div>
            <div class="pms-restore-meta">${timeStr} • ${count} products snapshotted${rp.description ? ' • ' + esc(rp.description) : ''}</div>
            <div class="pms-restore-actions">
              <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.applyRestorePoint('${esc(rp.id)}', '${esc(rp.name.replace(/'/g, ""))}')"><i class="fa-solid fa-rotate-left"></i> Apply Snapshot</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-triangle-exclamation"></i><h4>Failed to load restore points</h4><p>${esc(e.message || '')}</p></div>`;
    }
  }

  async function createRestorePoint() {
    var name = $('rp-name').value.trim();
    var desc = $('rp-desc').value.trim();
    if (!name) return toast('Give the restore point a name.', 'warning');
    try {
      var res = await window.PMSService.createRestorePoint(name, desc);
      toast('Restore point created (' + (res.data ? res.data.products_snapshotted : '') + ' products).', 'success');
      $('rp-name').value = '';
      $('rp-desc').value = '';
      renderRestoreList();
    } catch (e) {
      toast(e.message || 'Failed to create restore point.', 'error');
    }
  }

  async function applyRestorePoint(id, name) {
    var ok = await confirmModal('Apply Restore Point', 'Roll back ALL products to the snapshot <strong>' + esc(name) + '</strong>? Current state will be overwritten.', true, 'Apply Snapshot');
    if (!ok) return;
    try {
      var res = await window.PMSService.applyRestorePoint(id);
      toast('Restore point applied.', 'success');
      closeModal();
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to apply restore point.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Collections
  // --------------------------------------------------------------------------
  async function showCollections() {
    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-collections-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-lg">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-layer-group"></i> Collections</h3>
          <button type="button" class="pms-modal-close" onclick="document.getElementById('pms-collections-modal').remove(); document.body.style.overflow='';">&times;</button>
        </div>
        <div class="pms-modal-body">
          <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.openCollectionForm()" style="margin-bottom:18px;"><i class="fa-solid fa-plus"></i> New Collection</button>
          <div class="pms-collections-grid" id="pms-coll-grid"></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="document.getElementById('pms-collections-modal').remove(); document.body.style.overflow='';">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
    document.body.style.overflow = 'hidden';
    renderCollectionsGrid();
  }

  async function renderCollectionsGrid() {
    var grid = $('pms-coll-grid');
    if (!grid) return;
    try {
      var res = await window.PMSService.listCollections();
      state.collections = res.collections || [];
    } catch (e) { /* ignore */ }
    if (state.collections.length === 0) {
      grid.innerHTML = `<div class="pms-empty" style="grid-column:1/-1;"><i class="fa-solid fa-layer-group"></i><h4>No collections</h4><p>Create your first collection to organize products.</p></div>`;
      return;
    }
    grid.innerHTML = state.collections.map(function (c) {
      var count = state.products.filter(function (p) { return p.category === c.slug && !p.deleted_at; }).length;
      return `
        <div class="pms-collection-card">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="pms-coll-icon">${esc(c.icon || '📦')}</span>
            <div>
              <div class="pms-coll-name">${esc(c.name_en)}</div>
              <div class="pms-coll-meta">${esc(c.name_am || '')} • ${count} products</div>
            </div>
          </div>
          <div class="pms-coll-meta">/${esc(c.slug)} ${c.is_active === false ? '• inactive' : ''}</div>
          <div class="pms-coll-actions">
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.openCollectionForm('${esc(c.id)}')"><i class="fa-solid fa-pen"></i> Edit</button>
            <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.deleteCollection('${esc(c.id)}', '${esc(c.name_en.replace(/'/g, ""))}')"><i class="fa-solid fa-trash-can"></i> Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function openCollectionForm(id) {
    var coll = id ? state.collections.find(function (c) { return c.id === id; }) : null;
    var isNew = !coll;
    var result = await promptModal(
      isNew ? 'New Collection' : 'Edit Collection',
      isNew ? 'Create a new collection. The slug must be lowercase letters, numbers and dashes.' : 'Update collection details.',
      `
        <div style="display:grid;gap:12px;">
          <div class="pms-field"><label>Name (English)</label><input type="text" class="pms-input" id="pf-cc-name-en" value="${esc(coll ? coll.name_en : '')}" placeholder="e.g. Strings"></div>
          <div class="pms-field"><label>Name (Amharic)</label><input type="text" class="pms-input" id="pf-cc-name-am" value="${esc(coll ? (coll.name_am || '') : '')}" placeholder="e.g. ገመድ መሳሪያዎች"></div>
          <div class="pms-field"><label>Slug</label><input type="text" class="pms-input" id="pf-cc-slug" value="${esc(coll ? coll.slug : '')}" placeholder="e.g. strings"></div>
          <div class="pms-field"><label>Icon</label><input type="text" class="pms-input" id="pf-cc-icon" value="${esc(coll ? (coll.icon || '') : '')}" placeholder="e.g. 🪕"></div>
          <div class="pms-field"><label>Display Order</label><input type="number" class="pms-input" id="pf-cc-order" value="${coll ? (coll.display_order || 0) : 0}"></div>
          <div class="pms-field"><label>Description</label><input type="text" class="pms-input" id="pf-cc-desc" value="${esc(coll ? (coll.description || '') : '')}"></div>
          <div class="pms-check-field">
            <input type="checkbox" id="pf-cc-active" ${(!coll || coll.is_active !== false) ? 'checked' : ''}>
            <label for="pf-cc-active">Active collection</label>
          </div>
        </div>
      `,
      isNew ? 'Create' : 'Save'
    );

    if (result === null) return; // cancelled
    var v = result.values || {};

    var nameEn = v['pf-cc-name-en'] || '';
    var nameAm = v['pf-cc-name-am'] || '';
    var collSlug = v['pf-cc-slug'] || '';
    var icon = v['pf-cc-icon'] || '';
    var order = Number(v['pf-cc-order']) || 0;
    var desc = v['pf-cc-desc'] || '';
    var active = v['pf-cc-active'] !== false;

    if (!nameEn || !collSlug) return toast('Collection name and slug are required.', 'warning');
    if (!/^[a-z0-9-]+$/.test(collSlug)) return toast('Slug may only contain lowercase letters, numbers and dashes.', 'warning');

    try {
      await window.PMSService.upsertCollection({
        id: coll ? coll.id : undefined,
        slug: collSlug,
        name_en: nameEn,
        name_am: nameAm,
        icon: icon,
        description: desc,
        display_order: order,
        is_active: active
      });
      toast(isNew ? 'Collection created.' : 'Collection updated.', 'success');
      await loadData();
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to save collection.', 'error');
    }
  }

  async function deleteCollection(id, name) {
    var count = state.products.filter(function (p) { return p.category === (state.collections.find(function (c) { return c.id === id; }) || {}).slug; }).length;
    var msg = 'Delete collection <strong>' + esc(name) + '</strong>?';
    if (count > 0) msg += ' <strong>' + count + '</strong> product(s) currently reference it and will keep their category slug.';
    var ok = await confirmModal('Delete Collection', msg, true, 'Delete');
    if (!ok) return;
    try {
      await window.PMSService.deleteCollection(id);
      toast('Collection deleted.', 'success');
      await loadData();
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to delete collection.', 'error');
    }
  }

  function reload() { loadData(); }

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------
  window.PMSController = {
    init: init,
    reload: reload,
    onSearch: onSearch,
    onFilter: onFilter,
    onSort: onSort,
    toggleSelect: toggleSelect,
    toggleSelectAll: toggleSelectAll,
    bulkStatus: bulkStatus,
    bulkCollection: bulkCollection,
    bulkDelete: bulkDelete,
    bulkRestore: bulkRestore,
    publishOne: publishOne,
    hideOne: hideOne,
    deleteOne: deleteOne,
    restoreOne: restoreOne,
    permaDelete: permaDelete,
    duplicate: duplicate,
    openAdd: openAdd,
    openEdit: openEdit,
    closeProductForm: closeProductForm,
    autoSlug: autoSlug,
    checkSlug: checkSlug,
    addImageFiles: addImageFiles,
    setFormCover: setFormCover,
    moveFormImage: moveFormImage,
    removeFormImage: removeFormImage,
    addAudioFile: addAudioFile,
    removeAudioFile: removeAudioFile,
    saveProduct: saveProduct,
    showHistory: showHistory,
    showRestorePoints: showRestorePoints,
    createRestorePoint: createRestorePoint,
    applyRestorePoint: applyRestorePoint,
    showCollections: showCollections,
    openCollectionForm: openCollectionForm,
    deleteCollection: deleteCollection
  };

  // Auto-init after auth is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
}();
