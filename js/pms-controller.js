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
    featuredFilter: "all",
    audioFilter: "all",
    healthFilter: "all",
    detailsFilter: "all",
    recencyFilter: "all",
    sort: "sort_order",
    selection: {},
    health: {},
    templates: [],
    mediaCount: 0,
    mediaKind: "all",
    mediaSearch: "",
    mediaPick: null,
    mediaCache: [],
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
      <div class="pms-shell">

        <div class="pms-page-head">
          <div class="pms-page-head-top" style="display:flex; align-items:center; gap:14px;">
            <button type="button" class="pms-btn" onclick="typeof switchAccountTab==='function'?switchAccountTab('details'):(window.location.href='account.html#details')" title="Back to Main Profile" aria-label="Back to Main Profile" style="padding:10px 14px; font-size:1rem; border-radius:10px; flex-shrink:0;">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="pms-page-head-text">
              <h1 class="pms-page-title">Product Management</h1>
              <p class="pms-page-sub">Manage your entire catalog from one workspace.</p>
            </div>
            <div class="pms-page-head-actions" style="margin-left:auto;">
              <button type="button" class="pms-btn" onclick="PMSController.importJSON()"><i class="fa-solid fa-file-import"></i> Import</button>
              <button type="button" class="pms-btn" onclick="PMSController.exportCSV()"><i class="fa-solid fa-file-arrow-down"></i> Export</button>
              <button type="button" class="pms-btn pms-btn-primary" onclick="PMSController.openAdd()"><i class="fa-solid fa-plus"></i> New Product</button>
            </div>
          </div>
          <div class="pms-chips" id="pms-chips"></div>
        </div>

        <div class="pms-search-wrap pms-search-lg">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="pms-input pms-search-input" id="pms-search" placeholder="Search by name, collection, slug or badge…" oninput="PMSController.onSearch(this.value)">
          <span class="pms-search-kbd" title="Focus search">/</span>
        </div>

        <div class="pms-toolbar">
          <div class="pms-filterbar">
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
            <select class="pms-select" id="pms-featured-filter" onchange="PMSController.onFilter()">
              <option value="all">All Featured</option>
              <option value="featured">Featured</option>
              <option value="not">Not Featured</option>
            </select>
            <select class="pms-select" id="pms-audio-filter" onchange="PMSController.onFilter()">
              <option value="all">All Audio</option>
              <option value="with">Has Audio</option>
              <option value="without">No Audio</option>
            </select>
            <select class="pms-select" id="pms-health-filter" onchange="PMSController.onFilter()">
              <option value="all">All Health</option>
              <option value="good">Good (100%)</option>
              <option value="warn">Needs Attention</option>
            </select>
            <select class="pms-select" id="pms-recency-filter" onchange="PMSController.onFilter()">
              <option value="all">Any Time</option>
              <option value="updated7">Updated (7d)</option>
              <option value="created7">Created (7d)</option>
            </select>
            <select class="pms-select" id="pms-sort" onchange="PMSController.onSort(this.value)">
              <option value="sort_order">Sort: Default</option>
              <option value="name">Sort: Name</option>
              <option value="price_asc">Sort: Price Low-High</option>
              <option value="price_desc">Sort: Price High-Low</option>
              <option value="created_at">Sort: Newest</option>
            </select>
            <button type="button" class="pms-btn pms-btn-filter-toggle" id="pms-advanced-toggle" onclick="PMSController.toggleAdvancedFilters()" aria-expanded="false" aria-controls="pms-advanced">
              <i class="fa-solid fa-sliders"></i> Advanced <i class="fa-solid fa-chevron-down pms-toggle-caret"></i>
            </button>
          </div>

          <div class="pms-advanced" id="pms-advanced" hidden>
            <span class="pms-advanced-label">More filters</span>
            <select class="pms-select" id="pms-details-filter" onchange="PMSController.onFilter()">
              <option value="all">All Details</option>
              <option value="with">Has Details Page</option>
              <option value="without">No Details Page</option>
            </select>
          </div>

          <div class="pms-actionbar">
            <button type="button" class="pms-btn" onclick="PMSController.showMediaLibrary()"><i class="fa-solid fa-photo-film"></i> Media Library</button>
            <button type="button" class="pms-btn" onclick="PMSController.showCollections()"><i class="fa-solid fa-layer-group"></i> Collections</button>
            <button type="button" class="pms-btn" onclick="PMSController.showTemplates()"><i class="fa-solid fa-clone"></i> Templates</button>
            <button type="button" class="pms-btn" onclick="PMSController.showRestorePoints()"><i class="fa-solid fa-clock-rotate-left"></i> Restore</button>
            <button type="button" class="pms-btn" onclick="PMSController.openReorderFeatured()"><i class="fa-solid fa-arrow-up-1-9"></i> Reorder</button>
            <button type="button" class="pms-btn" onclick="PMSController.exportJSON()"><i class="fa-solid fa-file-code"></i> JSON</button>
            <button type="button" class="pms-btn" onclick="PMSController.openSettings()"><i class="fa-solid fa-gear"></i> Settings</button>
          </div>
        </div>

        <div class="pms-table-wrap">
          <table class="pms-table">
            <thead>
              <tr>
                <th class="pms-th-drag"></th>
                <th class="pms-th-check"><input type="checkbox" class="pms-check" id="pms-select-all" onclick="PMSController.toggleSelectAll(this)" title="Select all" aria-label="Select all products"></th>
                <th>Product</th>
                <th>Collection</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Health</th>
                <th>Updated</th>
                <th class="pms-th-actions"></th>
              </tr>
            </thead>
            <tbody id="pms-tbody"></tbody>
          </table>
        </div>

        <div class="pms-footer">
          <div class="pms-bulkbar" id="pms-bulk-actions">
            <span class="pms-tag pms-tag-primary" id="pms-selected-count">0 selected</span>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('active')"><i class="fa-solid fa-eye"></i> Publish</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('inactive')"><i class="fa-solid fa-eye-slash"></i> Hide</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkStatus('archived')"><i class="fa-solid fa-box-archive"></i> Archive</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkCollection()"><i class="fa-solid fa-layer-group"></i> Move to Collection</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkRemoveCollection()"><i class="fa-solid fa-layer-minus"></i> Remove Collection</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkBadge()"><i class="fa-solid fa-tag"></i> Set Badge</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkRemoveBadge()"><i class="fa-solid fa-tag"></i> Remove Badge</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkAudio(true)"><i class="fa-solid fa-music"></i> Enable Audio</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkAudio(false)"><i class="fa-solid fa-music"></i> Disable Audio</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkDuplicate()"><i class="fa-solid fa-copy"></i> Duplicate</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.exportCSV()"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
            <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.bulkDelete()"><i class="fa-solid fa-trash-can"></i> Delete</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.bulkRestore()"><i class="fa-solid fa-rotate-left"></i> Restore</button>
          </div>
          <span class="pms-tag" id="pms-total-count"></span>
        </div>
      </div>

      <div class="pms-preview-overlay" id="pms-preview-overlay"></div>
      <aside class="pms-preview" id="pms-preview" aria-label="Product quick preview" aria-hidden="true">
        <div class="pms-preview-head">
          <span class="pms-preview-title"><i class="fa-solid fa-eye"></i> Quick View</span>
          <button type="button" class="pms-icon-btn" onclick="PMSController.closePreview()" aria-label="Close preview"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="pms-preview-body" id="pms-preview-body"></div>
      </aside>
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
    if ($('pms-chips')) $('pms-chips').innerHTML = '<span class="pms-skeleton" style="height:38px;width:140px;display:inline-block;"></span><span class="pms-skeleton" style="height:38px;width:120px;display:inline-block;"></span><span class="pms-skeleton" style="height:38px;width:120px;display:inline-block;"></span>';

    try {
      var res = await window.PMSService.listProducts();
      state.products = res.products || [];
      state.collections = res.collections || [];

      var collSel = $('pms-collection-filter');
      if (collSel) {
        var opts = '<option value="all">All Collections</option>';
        state.collections.filter(function (c) { return !c.archived_at; }).forEach(function (c) {
          opts += `<option value="${esc(c.slug)}">${esc(c.name_en)}</option>`;
        });
        collSel.innerHTML = opts;
      }

      applyFilters();
      renderKpis();

      // Non-blocking: load templates + media count for the dashboard.
      window.PMSService.listTemplates().then(function (t) {
        state.templates = (t && t.templates) || [];
      }).catch(function () { state.templates = []; });
      window.PMSService.mediaUsageCount().then(function (m) {
        state.mediaCount = (m && m.count) || 0;
        renderKpis();
      }).catch(function () { state.mediaCount = 0; });
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
          <td></td>
          <td><div class="pms-skeleton" style="height:44px;width:220px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:60px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:90px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:70px;"></div></td>
          <td><div class="pms-skeleton" style="height:22px;width:90px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:40px;"></div></td>
          <td><div class="pms-skeleton" style="height:18px;width:110px;"></div></td>
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
        <td colspan="11">
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
    var chips = $('pms-chips');
    if (!chips) return;
    var all = state.products;
    var live = all.filter(function (p) { return p.status === 'active' && !p.deleted_at; }).length;
    var draft = all.filter(function (p) { return p.status === 'draft' && !p.deleted_at; }).length;
    var featured = all.filter(function (p) { return p.featured && !p.deleted_at; }).length;
    var collCount = state.collections.filter(function (c) { return !c.archived_at; }).length;
    var withAudio = all.filter(function (p) { return p.audio_enabled && !p.deleted_at; }).length;
    var activeCount = all.filter(function (p) { return !p.deleted_at; }).length;
    var unhealthy = 0;
    all.forEach(function (p) {
      if (p.deleted_at) return;
      if ((state.health[p.id] || []).length > 0) unhealthy++;
    });
    var healthPct = activeCount > 0 ? Math.max(0, Math.round(((activeCount - unhealthy) / activeCount) * 100)) : 100;
    var healthCls = healthPct >= 95 ? 'pms-chip-live' : (healthPct >= 75 ? 'pms-chip-warn' : 'pms-chip-danger');

    var items = [
      { icon: 'fa-boxes-stacked', value: all.length, label: 'Products', cls: '' },
      { icon: 'fa-eye', value: live, label: 'Live', cls: 'pms-chip-live' },
      { icon: 'fa-pen', value: draft, label: 'Drafts', cls: '' },
      { icon: 'fa-star', value: featured, label: 'Featured', cls: 'pms-chip-gold' },
      { icon: 'fa-layer-group', value: collCount, label: 'Collections', cls: 'pms-chip-accent' },
      { icon: 'fa-music', value: withAudio, label: 'With Audio', cls: 'pms-chip-accent' },
      { icon: 'fa-heart-pulse', value: healthPct, label: 'Health', suffix: '%', cls: healthCls }
    ];

    chips.innerHTML = items.map(function (it) {
      return `<span class="pms-chip ${it.cls}">
        <i class="fa-solid ${it.icon}"></i>
        <span class="pms-chip-value" data-count="${it.value}">0</span>
        <span class="pms-chip-label">${it.label}${it.suffix || ''}</span>
      </span>`;
    }).join('');

    chips.querySelectorAll('.pms-chip-value[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var start = null;
      var dur = 650;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  }

  // --------------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------------
  function computeHealth(p) {
    var issues = [];
    if (!p.deleted_at) {
      if (p.image_count === 0) issues.push('No image');
      else if (!p.cover_path) issues.push('No cover image');
      if (!p.category) issues.push('No collection');
      if (p.price == null || Number(p.price) <= 0) issues.push('No price');
      if (!p.slug) issues.push('No slug');
      if (!p.details_link) issues.push('No details page');
      if (!p.meta_title) issues.push('No meta title');
      if (!p.meta_description) issues.push('No meta description');
      if (!p.audio_enabled && !p.audio_url) issues.push('No audio (optional)');
    }
    return issues;
  }

  function applyFilters() {
    var q = state.search.toLowerCase().trim();
    var sf = state.statusFilter;
    var cf = state.collectionFilter;
    var ff = state.featuredFilter;
    var af = state.audioFilter;
    var hf = state.healthFilter;
    var df = state.detailsFilter;
    var rf = state.recencyFilter;
    var now = Date.now();
    var week = 7 * 24 * 60 * 60 * 1000;

    // Health map used by rows + dashboard (computed before filtering so the
    // health filter can rely on it).
    state.health = {};
    state.products.forEach(function (p) { state.health[p.id] = computeHealth(p); });

    var list = state.products.filter(function (p) {
      if (sf === 'deleted') {
        if (!p.deleted_at) return false;
      } else {
        if (p.deleted_at) return false;
        if (sf !== 'all' && p.status !== sf) return false;
      }
      if (cf !== 'all' && p.category !== cf) return false;
      if (ff === 'featured' && !p.featured) return false;
      if (ff === 'not' && p.featured) return false;
      if (af === 'with' && !p.audio_enabled) return false;
      if (af === 'without' && p.audio_enabled) return false;
      if (df === 'with' && !p.details_link) return false;
      if (df === 'without' && p.details_link) return false;
      if (hf === 'good' && (state.health[p.id] || []).length > 0) return false;
      if (hf === 'warn' && (state.health[p.id] || []).length === 0) return false;
      if (rf === 'updated7' && (!p.updated_at || (now - new Date(p.updated_at).getTime()) >= week)) return false;
      if (rf === 'created7' && (!p.created_at || (now - new Date(p.created_at).getTime()) >= week)) return false;
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
      if (key === 'created_at') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
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

  function renderRows() {
    var tbody = $('pms-tbody');
    if (!tbody) return;

    var countEl = $('pms-total-count');
    if (countEl) countEl.textContent = state.filtered.length + ' of ' + state.products.length + ' products';

    if (state.filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
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
        <tr data-id="${esc(p.id)}" class="${checked ? 'pms-row-selected' : ''}">
          <td><button type="button" class="pms-drag-handle" onclick="PMSController.openReorderFeatured()" title="Reorder featured products" aria-label="Reorder featured products"><i class="fa-solid fa-grip-vertical"></i></button></td>
          <td><input type="checkbox" class="pms-check" ${checked} onclick="PMSController.toggleSelect('${esc(p.id)}', this)"></td>
          <td data-label="Product">
            <div class="pms-prod-cell" onclick="PMSController.openPreview('${esc(p.id)}')" title="Quick view">
              <img src="${esc(p.cover)}" alt="" class="pms-prod-thumb" onerror="this.style.display='none'">
              <div>
                <div class="pms-prod-name">${esc(p.name)}</div>
                <div class="pms-prod-slug">/${esc(p.slug || '')}</div>
              </div>
            </div>
          </td>
          <td data-label="Collection">${esc(p.collectionName || p.category || '—')}</td>
          <td data-label="Price"><span class="pms-price">${esc(formatPrice(p))}</span></td>
          <td data-label="Stock">${stockCell(p)}</td>
          <td data-label="Status">${statusBadge(p)}</td>
          <td data-label="Featured">${featuredCell(p)}</td>
          <td data-label="Health">${healthCell(p)}</td>
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

  function stockCell(p) {
    if (p.deleted_at) return '<span class="pms-stock pms-stock-none">—</span>';
    var s = Number(p.stock) || 0;
    var cls = s <= 0 ? 'none' : (s <= 5 ? 'low' : 'ok');
    var label = s <= 0 ? 'Out' : (s <= 5 ? 'Low' : 'In stock');
    return `<span class="pms-stock-bar"><span class="pms-stock-dot ${cls}"></span><span class="pms-stock ${cls}">${label} · ${s}</span></span>`;
  }

  function featuredCell(p) {
    return `<span class="pms-featured-star${p.featured ? ' on' : ''}" title="${p.featured ? 'Featured' : 'Not featured'}"><i class="fa-solid fa-star"></i></span>`;
  }

  function healthCell(p) {
    if (p.deleted_at) return '<span class="pms-tag">—</span>';
    var issues = state.health[p.id] || [];
    var pct = Math.max(8, 100 - issues.length * 15);
    var cls = issues.length === 0 ? 'pms-hp-good' : (issues.length <= 2 ? 'pms-hp-warn' : 'pms-hp-bad');
    var tip = issues.length === 0 ? 'All good' : esc(issues.join(' • '));
    return `<div class="pms-health-cell" title="${tip}">
      <div class="pms-health-bar"><span class="${cls}" style="width:${pct}%"></span></div>
      <span class="pms-health-num ${cls}">${pct}%</span>
    </div>`;
  }

  function formatNum(n) {
    n = Number(n) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var PMS_CURRENCY_SYMBOLS = { USD: '$', ETB: 'ETB ', EUR: '\u20ac' };

  function formatPrice(p) {
    var sym = PMS_CURRENCY_SYMBOLS[String(p.currency || 'USD').toUpperCase()] || (p.currency ? p.currency + ' ' : '$');
    return sym + formatNum(p.price);
  }

  function updateSelectedCount() {
    var n = Object.keys(state.selection).filter(function (k) { return state.selection[k]; }).length;
    var el = $('pms-selected-count');
    if (el) el.textContent = n + ' selected';
  }

  // --------------------------------------------------------------------------
  // Public filter/sort handlers
  // --------------------------------------------------------------------------
  function onSearch(v) { state.search = v || ''; debouncedApplyFilters(); }

  var debouncedApplyFilters = debounce(function () { applyFilters(); }, 300);
  function onFilter() {
    state.statusFilter = $('pms-status-filter') ? $('pms-status-filter').value : 'all';
    state.collectionFilter = $('pms-collection-filter') ? $('pms-collection-filter').value : 'all';
    state.featuredFilter = $('pms-featured-filter') ? $('pms-featured-filter').value : 'all';
    state.audioFilter = $('pms-audio-filter') ? $('pms-audio-filter').value : 'all';
    state.healthFilter = $('pms-health-filter') ? $('pms-health-filter').value : 'all';
    state.detailsFilter = $('pms-details-filter') ? $('pms-details-filter').value : 'all';
    state.recencyFilter = $('pms-recency-filter') ? $('pms-recency-filter').value : 'all';
    applyFilters();
  }
  function onSort(v) { state.sort = v || 'sort_order'; applyFilters(); }

  function toggleAdvancedFilters() {
    var panel = $('pms-advanced');
    var btn = $('pms-advanced-toggle');
    if (!panel) return;
    var open = panel.hidden;
    panel.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // --------------------------------------------------------------------------
  // Quick preview panel (right-hand drawer)
  // --------------------------------------------------------------------------
  function openPreview(id) {
    var p = null;
    state.products.forEach(function (x) { if (x.id === id) p = x; });
    var body = $('pms-preview-body');
    if (!p || !body) return;
    var issues = state.health[p.id] || [];
    var dateStr = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    body.innerHTML = `
      <div class="pms-pv-hero">
        <img class="pms-pv-img" src="${esc(p.cover)}" alt="" onerror="this.style.display='none'">
        <div>
          <h3 class="pms-pv-name">${esc(p.name)}</h3>
          <div class="pms-pv-slug">/${esc(p.slug || '')}</div>
        </div>
      </div>
      <div class="pms-pv-grid">
        <div class="pms-pv-field"><label>Collection</label><span>${esc(p.collectionName || p.category || '—')}</span></div>
        <div class="pms-pv-field"><label>Price</label><span>${esc(formatPrice(p))}</span></div>
        <div class="pms-pv-field"><label>Stock</label><span>${esc(String(p.stock != null ? p.stock : 0))}</span></div>
        <div class="pms-pv-field"><label>Status</label><span>${statusBadge(p)}</span></div>
        <div class="pms-pv-field"><label>Featured</label><span>${p.featured ? 'Yes' : 'No'}</span></div>
        <div class="pms-pv-field"><label>Updated</label><span>${dateStr}</span></div>
        <div class="pms-pv-field"><label>Health</label><span>${issues.length === 0 ? 'OK' : issues.length + ' issue' + (issues.length > 1 ? 's' : '')}</span></div>
        <div class="pms-pv-field"><label>Slug</label><span>/${esc(p.slug || '—')}</span></div>
      </div>
      <div class="pms-pv-actions">
        <button type="button" class="pms-btn pms-btn-primary" onclick="PMSController.closePreview(); PMSController.openEdit('${esc(p.id)}')"><i class="fa-solid fa-pen"></i> Edit Product</button>
        <button type="button" class="pms-btn" onclick="PMSController.closePreview()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    `;

    var panel = $('pms-preview');
    var overlay = $('pms-preview-overlay');
    if (panel) { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
    if (overlay) { overlay.onclick = closePreview; overlay.classList.add('open'); }
  }

  function closePreview() {
    var panel = $('pms-preview');
    var overlay = $('pms-preview-overlay');
    if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
    if (overlay) overlay.classList.remove('open');
  }

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
      await window.PMSService.bulkChangeCollection(ids, slug.value);
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

  async function bulkRemoveCollection() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var ok = await confirmModal('Remove Collection', 'Remove the collection assignment from <strong>' + ids.length + '</strong> product(s)? They will become uncategorized.');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { category: '' });
      clearSelection();
      toast('Collection assignment removed.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to remove collection.', 'error');
    }
  }

  async function bulkBadge() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var res = await promptModal('Set Badge', 'Assign a badge/label to <strong>' + ids.length + '</strong> product(s).',
      `<div class="pms-field" style="margin:0;"><label>Badge text</label><input type="text" class="pms-input" id="pms-bulk-badge" placeholder="e.g. NEW, በገና" style="width:100%;"></div>`, 'Apply');
    if (!res || !res.values) return;
    var badge = (res.values['pms-bulk-badge'] || '').trim();
    if (!badge) return toast('Enter a badge text.', 'warning');
    try {
      await window.PMSService.bulkUpdate(ids, { badge: badge });
      clearSelection();
      toast('Badge applied.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to set badge.', 'error');
    }
  }

  async function bulkRemoveBadge() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var ok = await confirmModal('Remove Badge', 'Remove the badge from <strong>' + ids.length + '</strong> product(s)?');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { badge: '' });
      clearSelection();
      toast('Badges removed.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to remove badges.', 'error');
    }
  }

  async function bulkAudio(enable) {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var label = enable ? 'enable' : 'disable';
    var ok = await confirmModal((enable ? 'Enable' : 'Disable') + ' Audio', (enable ? 'Enable' : 'Disable') + ' the audio preview on <strong>' + ids.length + '</strong> product(s)?');
    if (!ok) return;
    try {
      await window.PMSService.bulkUpdate(ids, { audio_enabled: !!enable });
      clearSelection();
      toast('Audio ' + (enable ? 'enabled' : 'disabled') + ' for the selection.', 'success');
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to update audio settings.', 'error');
    }
  }

  async function bulkDuplicate() {
    var ids = selectedIds();
    if (ids.length === 0) return toast('Select at least one product first.', 'warning');
    var ok = await confirmModal('Duplicate Products', 'Create a draft copy of <strong>' + ids.length + '</strong> product(s)? Images, pricing and settings are copied.');
    if (!ok) return;
    var done = 0, failed = 0;
    for (var i = 0; i < ids.length; i++) {
      try {
        await window.PMSService.duplicateProduct(ids[i]);
        done++;
      } catch (e) {
        failed++;
        console.error('[PMS] Duplicate failed:', e);
      }
    }
    clearSelection();
    toast(done + ' product(s) duplicated' + (failed ? ' (' + failed + ' failed).' : '.'), done > 0 ? 'success' : 'error');
    await loadData();
  }

  // --------------------------------------------------------------------------
  // Export (CSV / JSON)
  // --------------------------------------------------------------------------
  function exportFields(p) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      collection: p.collectionName || '',
      price: p.price,
      currency: p.currency || 'USD',
      stock: p.stock,
      status: p.deleted_at ? 'deleted' : p.status,
      featured: p.featured ? 'yes' : 'no',
      badge: p.badge || '',
      sort_order: p.sort_order,
      short_description: p.short_description || '',
      description: p.description || '',
      details_link: p.details_link || '',
      audio_enabled: p.audio_enabled ? 'yes' : 'no',
      audio_url: p.audio_url || '',
      meta_title: p.meta_title || '',
      meta_description: p.meta_description || '',
      cover_path: p.cover_path || '',
      image_count: p.image_count || 0,
      image_paths: (p.images || []).map(function (i) { return i.storage_path; }).join(' | '),
      created_at: p.created_at || '',
      updated_at: p.updated_at || '',
      deleted_at: p.deleted_at || ''
    };
  }

  function exportData(rows, format) {
    if (!rows || rows.length === 0) return toast('No products to export.', 'warning');
    var data = rows.map(exportFields);
    var filename = 'products-export-' + new Date().toISOString().slice(0, 10);
    var blob, mime;
    if (format === 'csv') {
      var headers = Object.keys(data[0]);
      var lines = [headers.join(',')];
      data.forEach(function (row) {
        lines.push(headers.map(function (h) {
          var v = row[h];
          v = (v == null ? '' : String(v));
          if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
          return v;
        }).join(','));
      });
      blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      filename += '.csv';
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
      filename += '.json';
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
    toast('Exported ' + data.length + ' product(s).', 'success');
  }

  function exportSelected() {
    var sel = selectedIds();
    if (sel.length === 0) return null;
    return state.products.filter(function (p) { return sel.indexOf(p.id) !== -1; });
  }

  function exportCSV() {
    var sel = exportSelected();
    var rows = sel || state.filtered;
    if (sel && sel.length === 0) return toast('No products selected; exporting filtered list.', 'info');
    exportData(rows, 'csv');
  }

  function exportJSON() {
    var sel = exportSelected();
    var rows = sel || state.filtered;
    if (sel && sel.length === 0) return toast('No products selected; exporting filtered list.', 'info');
    exportData(rows, 'json');
  }

  function importJSON() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var list = Array.isArray(data) ? data : (data.products || []);
          if (!list.length) { toast('No products found in that file.', 'warning'); return; }
          importProducts(list);
        } catch (e) {
          toast('Could not parse that JSON file.', 'error');
        }
      };
      reader.readAsText(f);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  async function importProducts(list) {
    var ok = await confirmModal('Import Products', 'Import <strong>' + list.length + '</strong> product(s)? Existing slugs are updated; new ones are created as <strong>draft</strong>.');
    if (!ok) return;
    var done = 0, failed = 0;
    for (var i = 0; i < list.length; i++) {
      var src = list[i];
      var product = {
        name: src.name || '',
        slug: src.slug || '',
        category: src.category || src.collectionName || '',
        short_description: src.short_description || '',
        description: src.description || '',
        price: src.price != null ? Number(src.price) : 0,
        currency: src.currency || 'USD',
        stock: src.stock != null ? Number(src.stock) : 0,
        featured: !!src.featured,
        status: 'draft',
        badge: src.badge || '',
        sort_order: src.sort_order != null ? Number(src.sort_order) : 0,
        meta_title: src.meta_title || '',
        meta_description: src.meta_description || '',
        details_link: src.details_link || '',
        audio_enabled: !!src.audio_enabled
      };
      try {
        await window.PMSService.upsertProduct(product, []);
        done++;
      } catch (e) {
        failed++;
        console.error('[PMS] Import row failed:', src.name, e);
      }
    }
    toast(done + ' product(s) imported' + (failed ? ', ' + failed + ' failed' : '') + '.', failed ? 'warning' : 'success');
    await loadData();
  }

  function openSettings() {
    var live = state.products.filter(function (p) { return p.status === 'active' && !p.deleted_at; }).length;
    var drafts = state.products.filter(function (p) { return p.status === 'draft' && !p.deleted_at; }).length;
    var colls = state.collections.filter(function (c) { return !c.archived_at; }).length;
    var unhealthy = 0;
    var activeCount = 0;
    state.products.forEach(function (p) {
      if (p.deleted_at) return;
      activeCount++;
      if ((state.health[p.id] || []).length > 0) unhealthy++;
    });
    var healthPct = activeCount > 0 ? Math.max(0, Math.round(((activeCount - unhealthy) / activeCount) * 100)) : 100;

    var overlay = document.createElement('div');
    overlay.className = 'pms-modal-overlay active';
    overlay.id = 'pms-settings-modal';
    overlay.innerHTML = `
      <div class="pms-modal" style="max-width:520px;">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-gear"></i> Workspace Settings</h3>
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))" aria-label="Close">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div class="pms-pv-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
            <div class="pms-pv-field"><label>Products</label><span>${state.products.length}</span></div>
            <div class="pms-pv-field"><label>Live</label><span>${live}</span></div>
            <div class="pms-pv-field"><label>Drafts</label><span>${drafts}</span></div>
            <div class="pms-pv-field"><label>Collections</label><span>${colls}</span></div>
            <div class="pms-pv-field"><label>Media Assets</label><span>${state.mediaCount || 0}</span></div>
            <div class="pms-pv-field"><label>Catalog Health</label><span>${healthPct}%</span></div>
          </div>
          <p style="margin:16px 0 0 0; color:var(--pms-muted); font-size:0.85rem; line-height:1.55;">The product management workspace manages the storefront catalog, collections, audio previews, media library and restore points. All data lives in your Supabase project.</p>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Close</button>
          <button type="button" class="pms-btn pms-btn-primary" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay')); PMSController.showRestorePoints()"><i class="fa-solid fa-clock-rotate-left"></i> Restore Points</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setupModalA11y(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay(overlay);
    });
  }

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
  // Modals: generic + accessibility (role=dialog, focus trap, Escape, focus return)
  // --------------------------------------------------------------------------
  var _modalFocusReturn = null;

  function setupModalA11y(overlay) {
    if (!overlay) return;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    var titleEl = overlay.querySelector('.pms-modal-header h3');
    if (titleEl) {
      if (!titleEl.id) titleEl.id = 'pms-modal-title-' + Math.random().toString(36).slice(2, 8);
      overlay.setAttribute('aria-labelledby', titleEl.id);
    }
    var bodyEl = overlay.querySelector('.pms-modal-body');
    if (bodyEl) {
      if (!bodyEl.id) bodyEl.id = 'pms-modal-body-' + Math.random().toString(36).slice(2, 8);
      overlay.setAttribute('aria-describedby', bodyEl.id);
    }
    _modalFocusReturn = document.activeElement;
    setTimeout(function () {
      var f = overlay.querySelector('input, select, textarea') ||
              overlay.querySelector('button, [href], [tabindex]:not([tabindex="-1"])');
      if (f && typeof f.focus === 'function') f.focus();
    }, 30);
  }

  function closeOverlay(overlay) {
    if (!overlay) return;
    overlay.remove();
    if (document.querySelectorAll('.pms-modal-overlay.active').length === 0) {
      document.body.style.overflow = '';
    }
    if (_modalFocusReturn && _modalFocusReturn.focus && document.body.contains(_modalFocusReturn)) {
      try { _modalFocusReturn.focus(); } catch (e) { /* ignore */ }
    }
    _modalFocusReturn = null;
  }

  function closeModal() {
    document.querySelectorAll('.pms-modal-overlay.active').forEach(function (m) {
      closeOverlay(m);
    });
  }

  // Escape closes the active modal; Tab is trapped inside it while open.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var preview = $('pms-preview');
      if (preview && preview.classList.contains('open')) {
        e.preventDefault();
        closePreview();
        return;
      }
    }
    var overlay = document.querySelector('.pms-modal-overlay.active');
    if (!overlay) return;
    if (e.key === 'Escape') {
      var confirmBackdrop = document.getElementById('custom-modal-backdrop');
      if (confirmBackdrop && confirmBackdrop.classList.contains('show')) return;
      e.preventDefault();
      closeOverlay(overlay);
      return;
    }
    if (e.key === 'Tab') {
      var focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

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
            <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">&times;</button>
          </div>
          <div class="pms-modal-body">
            ${desc ? `<p style="margin:0 0 14px 0; color:var(--pms-muted); font-size:0.9rem; line-height:1.5;">${desc}</p>` : ''}
            ${fieldHTML}
          </div>
          <div class="pms-modal-footer">
            <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Cancel</button>
            <button type="button" class="pms-btn pms-btn-gold" id="pms-prompt-confirm">${esc(confirmText || 'Confirm')}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      setupModalA11y(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeOverlay(overlay);
      });
      $('pms-prompt-confirm').addEventListener('click', function () {
        var selEl = overlay.querySelector('#pms-coll-move-sel');
        var val = selEl ? selEl.value : null;
        var collected = {};
        overlay.querySelectorAll('input, select, textarea').forEach(function (el) {
          if (el.id) collected[el.id] = el.value.trim ? el.value.trim() : el.value;
          if (el.type === 'checkbox') collected[el.id] = el.checked;
        });
        overlay.querySelectorAll('input[type="radio"]:checked').forEach(function (el) {
          if (el.name) collected[el.name] = el.value;
        });
        var result = { value: val, values: collected };
        closeOverlay(overlay);
        resolve(result);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Product form (add / edit)
  // --------------------------------------------------------------------------
  async function openAdd() {
    state.form = { id: null, images: [], audioPath: null, audioUrl: "", audioEnabled: false, pendingDeletions: [] };
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
        audioEnabled: !!p.audio_enabled,
        pendingDeletions: []
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
              <label>Price <span class="pms-required">*</span></label>
              <input type="number" min="0" step="0.01" class="pms-input" id="pf-price" value="${p.price != null ? p.price : ''}" placeholder="0.00">
              <p class="pms-field-hint">Enter the price in the selected currency (no conversion is applied).</p>
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
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;">
                <label class="pms-image-upload" style="margin:0; max-width:150px;">
                  <i class="fa-solid fa-upload"></i>
                  <span>Upload images</span>
                  <input type="file" accept="image/*" multiple style="display:none;" id="pf-image-file" onchange="PMSController.addImageFiles(this)">
                </label>
                <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.pickLibraryImages()"><i class="fa-solid fa-photo-film"></i> Browse Library</button>
              </div>
              <span class="pms-hint">First image is the cover by default. Use ⭐ to change cover, arrows to reorder.</span>
            </div>

            <div class="pms-field pms-field-full">
              <div class="pms-section-divider"><span>Audio Preview</span></div>
              <div class="pms-audio-manager" id="pf-audio-manager"></div>
              <div style="margin-top:8px;">
                <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.pickLibraryAudio()"><i class="fa-solid fa-photo-film"></i> Browse Library Audio</button>
              </div>
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
          <button type="button" class="pms-btn" onclick="PMSController.saveAsTemplate()"><i class="fa-solid fa-clone"></i> Save as Template</button>
          <button type="button" class="pms-btn pms-btn-gold" id="pf-save-btn" onclick="PMSController.saveProduct()"><i class="fa-solid fa-floppy-disk"></i> Save Product</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) PMSController.closeProductForm();
    });
    document.body.style.overflow = 'hidden';

    renderFormImages();
    renderAudioManager();
    checkSlug();
  }

  function closeProductForm() {
    closeOverlay($('pms-product-modal'));
  }

  // ----- Slug auto-gen + validation -----
  var slugDebounceTimer = null;
  function debounceSlug(fn) {
    if (slugDebounceTimer) clearTimeout(slugDebounceTimer);
    slugDebounceTimer = setTimeout(fn, 300);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 300);
    };
  }

  function autoSlug() {
    var nameEl = $('pf-name');
    var slugEl = $('pf-slug');
    if (!nameEl || !slugEl) return;
    var name = nameEl.value.trim();
    if (!name) return;
    // Only auto-fill if slug is empty or was previously auto-generated
    var current = slugEl.value.trim();
    if (current) return;
    debounceSlug(function () {
      window.PMSService.slugify(nameEl.value.trim()).then(function (slug) {
        if (slugEl.value.trim()) return;
        slugEl.value = slug || '';
        checkSlug();
      }).catch(function () { /* ignore */ });
    });
  }

  function checkSlug() {
    debounceSlug(runSlugCheck);
  }

  async function runSlugCheck() {
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
      state.form.pendingDeletions.push({ kind: 'image', path: img.storage_path });
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
      // queue the old file for deletion only after a successful save (replacing)
      if (state.form.audioPath) {
        state.form.pendingDeletions.push({ kind: 'audio', path: state.form.audioPath });
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
      state.form.pendingDeletions.push({ kind: 'audio', path: state.form.audioPath });
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
      var deletions = (state.form.pendingDeletions || []).slice();
      closeProductForm();
      toast(state.form.id ? 'Product updated successfully.' : 'Product created successfully.', 'success');
      flushPendingDeletions(deletions);
      await loadData();
    } catch (e) {
      console.error('[PMS] Save failed:', e);
      toast(e.message || 'Failed to save product.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Product'; }
    }
  }

  // Delete storage files that were removed in the form, but ONLY after the
  // save has succeeded. If the user cancels the form, nothing is deleted.
  function flushPendingDeletions(deletions) {
    if (!deletions || deletions.length === 0) return;
    deletions.forEach(function (d) {
      if (!d || !d.path) return;
      if (d.kind === 'audio') {
        window.PMSService.deleteAudioFile(d.path);
      } else {
        window.PMSService.deleteImageFile(d.path);
      }
    });
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
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">&times;</button>
        </div>
        <div class="pms-modal-body" id="pms-history-body">
          <div style="text-align:center;padding:40px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeOverlay(modal);
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
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div class="pms-field" style="margin-bottom:20px;">
            <label>Create a Restore Point</label>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input type="text" class="pms-input" id="rp-name" placeholder="e.g. Before Spring Sale" style="flex:1; min-width:180px;">
              <input type="text" class="pms-input" id="rp-desc" placeholder="Optional description" style="flex:1; min-width:180px;">
              <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.createRestorePoint()"><i class="fa-solid fa-camera-retro"></i> Snapshot Now</button>
            </div>
            <span class="pms-hint">Creates a snapshot of all active products (including images). You can roll back to it later. Restoring does not recreate products that were permanently deleted, and does not touch products created after the snapshot.</span>
          </div>
          <div class="pms-section-divider"><span>Saved Snapshots</span></div>
          <div id="rp-list" style="margin-top:14px;"><div style="text-align:center;padding:30px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeOverlay(modal);
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
    var ok = await confirmModal('Apply Restore Point', 'Roll back ALL products to the snapshot <strong>' + esc(name) + '</strong>? Current state will be overwritten.<br><br><small style="color:var(--pms-muted);">Note: products permanently deleted after this snapshot are not recreated, and products added after the snapshot are left as-is.</small>', true, 'Apply Snapshot');
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
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">&times;</button>
        </div>
        <div class="pms-modal-body">
          <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.openCollectionForm()" style="margin-bottom:18px;"><i class="fa-solid fa-plus"></i> New Collection</button>
          <div class="pms-collections-grid" id="pms-coll-grid"></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeOverlay(modal);
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
      var swatch = c.color ? `<span class="pms-coll-swatch" style="background:${esc(c.color)};"></span>` : '';
      var statusLine = [];
      if (c.archived_at) statusLine.push('archived');
      if (c.is_active === false) statusLine.push('inactive');
      return `
        <div class="pms-collection-card">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="pms-coll-icon">${esc(c.icon || '📦')}</span>
            <div>
              <div class="pms-coll-name">${esc(c.name_en)}</div>
              <div class="pms-coll-meta">${esc(c.name_am || '')} • ${count} products</div>
            </div>
          </div>
          <div class="pms-coll-meta">/${esc(c.slug)} ${swatch} ${statusLine.length ? '• ' + statusLine.join(', ') : ''}</div>
          <div class="pms-coll-actions">
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.openCollectionForm('${esc(c.id)}')"><i class="fa-solid fa-pen"></i> Edit</button>
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.toggleCollectionActive('${esc(c.id)}', ${c.is_active !== false})">${c.is_active === false ? '<i class="fa-solid fa-eye"></i> Enable' : '<i class="fa-solid fa-eye-slash"></i> Disable'}</button>
            ${c.archived_at
              ? `<button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.restoreCollectionAction('${esc(c.id)}')"><i class="fa-solid fa-rotate-left"></i> Restore</button>`
              : `<button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.archiveCollectionAction('${esc(c.id)}', '${esc(c.name_en.replace(/'/g, ''))}')"><i class="fa-solid fa-box-archive"></i> Archive</button>`}
            <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.deleteCollection('${esc(c.id)}', '${esc(c.name_en.replace(/'/g, ''))}')"><i class="fa-solid fa-trash-can"></i> Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function archiveCollectionAction(id, name) {
    var ok = await confirmModal('Archive Collection', 'Archive collection <strong>' + esc(name) + '</strong>? Its products are kept and the collection can be restored later.');
    if (!ok) return;
    try {
      await window.PMSService.archiveCollection(id);
      toast('Collection archived.', 'success');
      await loadData();
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to archive collection.', 'error');
    }
  }

  async function restoreCollectionAction(id) {
    try {
      await window.PMSService.restoreCollection(id);
      toast('Collection restored.', 'success');
      await loadData();
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to restore collection.', 'error');
    }
  }

  async function toggleCollectionActive(id, isActive) {
    try {
      await window.PMSService.toggleCollectionActive(id, !isActive);
      toast(isActive ? 'Collection disabled.' : 'Collection enabled.', 'success');
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to update collection.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Reorder Featured (Phase 5.1)
  // Manual drag-and-drop ordering of the homepage featured products.
  // Only featured products' sort_order is written (via the RLS-protected
  // client update pathway in PMSService.reorderFeatured). Non-featured
  // products are never touched.
  // --------------------------------------------------------------------------
  function openReorderFeatured() {
    var featured = state.products
      .filter(function (p) { return p.featured && !p.deleted_at; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });

    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-reorder-modal';
    modal.innerHTML = `
      <div class="pms-modal" style="max-width:620px;">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-arrow-up-1-9"></i> Reorder Featured</h3>
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))" aria-label="Close">&times;</button>
        </div>
        <div class="pms-modal-body">
          <p style="margin:0 0 16px 0; color:var(--pms-muted); font-size:0.9rem; line-height:1.5;">Drag rows to set the order featured products appear on the homepage. Changes are applied only when you click <strong>Save Order</strong>.</p>
          <div class="pms-reorder-list" id="pms-reorder-list" role="list" aria-label="Featured products"></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Cancel</button>
          <button type="button" class="pms-btn pms-btn-gold" id="pms-reorder-save"><i class="fa-solid fa-floppy-disk"></i> Save Order</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeOverlay(modal);
    });
    document.body.style.overflow = 'hidden';

    var list = $('pms-reorder-list');
    var saveBtn = $('pms-reorder-save');
    if (!list || !saveBtn) return;

    if (featured.length < 2) {
      list.innerHTML = `
        <div class="pms-empty" style="padding:40px 24px;">
          <i class="fa-solid fa-star"></i>
          <h4>Not enough featured products</h4>
          <p>At least two featured products are required.</p>
        </div>
      `;
      saveBtn.disabled = true;
      saveBtn.title = 'At least two featured products are required.';
      return;
    }

    list.innerHTML = featured.map(function (p, i) {
      return `
        <div class="pms-reorder-row" draggable="true" data-id="${esc(p.id)}" role="listitem" aria-label="${esc(p.name)}">
          <button type="button" class="pms-reorder-handle" aria-label="Reorder ${esc(p.name)}. Use Arrow Up or Arrow Down to move." title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></button>
          <img src="${esc(p.cover)}" alt="" class="pms-reorder-thumb" onerror="this.style.visibility='hidden'">
          <div class="pms-reorder-info">
            <div class="pms-reorder-name">${esc(p.name)}</div>
            <div class="pms-reorder-slug">${esc(p.slug || '')}${p.status !== 'active' ? ' • ' + esc(p.status) : ''}</div>
          </div>
          <span class="pms-reorder-order" aria-label="Order ${i + 1}">${i + 1}</span>
        </div>
      `;
    }).join('');

    var rows = list.querySelectorAll('.pms-reorder-row');
    var draggedId = null;
    var draggedEl = null;

    rows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        draggedEl = row;
        draggedId = row.getAttribute('data-id');
        row.classList.add('pms-reorder-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', draggedId); } catch (err) { /* ignore */ }
        }
      });
      row.addEventListener('dragend', function () {
        rows.forEach(function (r) { r.classList.remove('pms-reorder-dragging', 'pms-reorder-over'); });
        draggedEl = null;
        draggedId = null;
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        row.classList.add('pms-reorder-over');
      });
      row.addEventListener('dragleave', function () {
        row.classList.remove('pms-reorder-over');
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('pms-reorder-over');
        if (!draggedEl || draggedEl === row) return;
        var rect = row.getBoundingClientRect();
        var before = e.clientY < rect.top + rect.height / 2;
        if (before) row.parentNode.insertBefore(draggedEl, row);
        else row.parentNode.insertBefore(draggedEl, row.nextElementSibling);
        refreshReorderOrder(list);
      });

      var handle = row.querySelector('.pms-reorder-handle');
      if (handle) {
        handle.addEventListener('keydown', function (e) {
          var idx = Array.prototype.indexOf.call(list.querySelectorAll('.pms-reorder-row'), row);
          if (e.key === 'ArrowUp' && idx > 0) {
            e.preventDefault();
            list.insertBefore(row, row.previousElementSibling);
            refreshReorderOrder(list);
            handle.focus();
          } else if (e.key === 'ArrowDown' && idx < list.querySelectorAll('.pms-reorder-row').length - 1) {
            e.preventDefault();
            list.insertBefore(row.nextElementSibling, row);
            refreshReorderOrder(list);
            handle.focus();
          }
        });
      }
    });

    saveBtn.addEventListener('click', function () { saveReorderOrder(list, saveBtn); });
  }

  function refreshReorderOrder(list) {
    var rows = list.querySelectorAll('.pms-reorder-row');
    rows.forEach(function (row, i) {
      var num = row.querySelector('.pms-reorder-order');
      if (num) {
        num.textContent = i + 1;
        num.setAttribute('aria-label', 'Order ' + (i + 1));
      }
    });
  }

  async function saveReorderOrder(list, saveBtn) {
    var rows = Array.prototype.slice.call(list.querySelectorAll('.pms-reorder-row'));
    var orderedIds = rows.map(function (row) { return row.getAttribute('data-id'); });
    if (orderedIds.length < 2) {
      toast('At least two featured products are required.', 'warning');
      return;
    }
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await window.PMSService.reorderFeatured(orderedIds);
      closeOverlay($('pms-reorder-modal'));
      toast('Featured order saved. The homepage reflects the new order.', 'success');
      await loadData();
    } catch (e) {
      console.error('[PMS] Reorder featured failed:', e);
      toast(e.message || 'Failed to save order.', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Order';
    }
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
          <div class="pms-field"><label>Color</label><input type="color" class="pms-input" id="pf-cc-color" value="${esc(coll ? (coll.color || '#8B5A2B') : '#8B5A2B')}" style="height:38px;padding:2px;width:80px;"></div>
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
    var color = v['pf-cc-color'] || '';
    var order = Number(v['pf-cc-order']) || 0;
    var desc = v['pf-cc-desc'] || '';
    var active = v['pf-cc-active'] !== false;

    if (!nameEn || !collSlug) return toast('Collection name and slug are required.', 'warning');
    if (!/^[a-z0-9-]+$/.test(collSlug)) return toast('Slug may only contain lowercase letters, numbers and dashes.', 'warning');

    // The storefront category tabs are hard-coded to these slugs. Changing one
    // reassigns products to the new slug but does NOT rename the storefront tab.
    if (coll && coll.slug !== collSlug && ['strings', 'percussion', 'accessories', 'books', 'bags'].indexOf(coll.slug) !== -1) {
      var warnOk = await confirmModal('Storefront Impact',
        'The storefront tab for <strong>' + esc(coll.slug) + '</strong> is hard-coded. Its products will move to the new slug <strong>' + esc(collSlug) + '</strong>, but the storefront tab keeps the old slug and may appear empty. Continue?', true, 'Continue Anyway');
      if (!warnOk) return;
    }

    try {
      await window.PMSService.upsertCollection({
        id: coll ? coll.id : undefined,
        slug: collSlug,
        name_en: nameEn,
        name_am: nameAm,
        icon: icon,
        color: color,
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
    var coll = state.collections.find(function (c) { return c.id === id; }) || {};
    var count = state.products.filter(function (p) { return p.category === coll.slug && !p.deleted_at; }).length;
    var otherOptions = state.collections.filter(function (c) { return c.id !== id && !c.archived_at; }).map(function (c) {
      return `<option value="${esc(c.slug)}">${esc(c.name_en)}</option>`;
    }).join('');

    var ok = await confirmModal('Delete Collection',
      'Delete collection <strong>' + esc(name) + '</strong>?<br><br>' +
      (count > 0
        ? 'There are <strong>' + count + '</strong> product(s) in this collection. <strong>No products will be deleted.</strong>'
        : 'This collection is empty.'),
      true, 'Continue');

    if (!ok) return;

    var res = await promptModal('Handle its Products',
      (count > 0 ? 'Choose what happens to the <strong>' + count + '</strong> product(s) currently in <strong>' + esc(name) + '</strong>.' : ''),
      `
        <div style="display:grid;gap:12px;">
          <label class="pms-check-field" style="align-items:flex-start;">
            <input type="radio" name="pms-coll-delete-mode" value="move" ${count > 0 && otherOptions ? 'checked' : 'disabled'}>
            <span>Move products to another collection</span>
          </label>
          <select class="pms-select" id="pms-coll-move-sel" style="width:100%;" ${count > 0 && otherOptions ? '' : 'disabled'}>
            ${otherOptions || '<option value="">No other collections</option>'}
          </select>
          <label class="pms-check-field" style="align-items:flex-start;">
            <input type="radio" name="pms-coll-delete-mode" value="uncat" ${!(count > 0 && otherOptions) ? 'checked' : ''}>
            <span>Leave products uncategorized</span>
          </label>
        </div>
      `, 'Delete Collection');

    if (!res) return;
    var mode = res.values ? res.values['pms-coll-delete-mode'] : 'uncat';
    var moveTo = (mode === 'move') ? res.value : null;

    try {
      await window.PMSService.deleteCollectionWithProducts(id, moveTo);
      toast('Collection deleted. ' + (count > 0 ? 'Products were ' + (moveTo ? 'moved.' : 'left uncategorized.') : ''), 'success');
      await loadData();
      renderCollectionsGrid();
    } catch (e) {
      toast(e.message || 'Failed to delete collection.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Media Library
  // --------------------------------------------------------------------------
  function showMediaLibrary(pick) {
    state.mediaKind = 'all';
    state.mediaSearch = '';
    state.mediaPick = pick || null;
    state.mediaCache = [];
    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-media-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-xl">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-photo-film"></i> Media Library</h3>
          <button type="button" class="pms-modal-close" onclick="PMSController.closeMediaLibrary()">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
            <select class="pms-select" id="pms-media-kind" onchange="PMSController.mediaKind(this.value)">
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="audio">Audio</option>
            </select>
            <input type="text" class="pms-input" id="pms-media-search" placeholder="Search media..." style="flex:1;min-width:160px;" oninput="PMSController.mediaSearch(this.value)">
            <label class="pms-btn pms-btn-sm" style="cursor:pointer;">
              <i class="fa-solid fa-image"></i> Upload Image
              <input type="file" accept="image/*" style="display:none;" onchange="PMSController.uploadLibraryImage(this)">
            </label>
            <label class="pms-btn pms-btn-sm" style="cursor:pointer;">
              <i class="fa-solid fa-music"></i> Upload Audio
              <input type="file" accept="audio/mpeg,audio/mp3,audio/*" style="display:none;" onchange="PMSController.uploadLibraryAudio(this)">
            </label>
          </div>
          <div id="pms-media-grid"><div style="text-align:center;padding:30px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn" onclick="PMSController.closeMediaLibrary()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) PMSController.closeMediaLibrary();
    });
    document.body.style.overflow = 'hidden';
    renderMediaLibrary();
  }

  function closeMediaLibrary() {
    closeOverlay($('pms-media-modal'));
    state.mediaPick = null;
  }

  function mediaKind(kind) { state.mediaKind = kind || 'all'; renderMediaLibrary(); }
  function mediaSearch(v) {
    state.mediaSearch = (v || '').trim();
    debouncedMediaRender();
  }

  var debouncedMediaRender = debounce(function () { renderMediaLibrary(); }, 300);

  function formatBytes(n) {
    if (n == null) return '';
    n = Number(n);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function renderMediaLibrary() {
    var grid = $('pms-media-grid');
    if (!grid) return;
    try {
      var res = await window.PMSService.listMedia(state.mediaKind, state.mediaSearch);
      var media = (res && res.media) || [];
      state.mediaCache = media;
      if (media.length === 0) {
        grid.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-photo-film"></i><h4>No media found</h4><p>Upload an image or audio file to get started.</p></div>`;
        return;
      }
      grid.innerHTML = media.map(function (m) {
        var dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        var selectable = state.mediaPick === 'images' && m.kind === 'image' || state.mediaPick === 'audio' && m.kind === 'audio';
        var preview = m.kind === 'image'
          ? `<img src="${esc(m.url)}" alt="" loading="lazy">`
          : `<div class="pms-media-audio-preview"><i class="fa-solid fa-music"></i><audio controls src="${esc(m.url)}"></audio></div>`;
        return `
          <div class="pms-media-card">
            <div class="pms-media-thumb">${preview}</div>
            <div class="pms-media-name" title="${esc(m.storage_path)}">${esc(m.file_name)}</div>
            <div class="pms-media-meta">${dateStr} • ${formatBytes(m.size_bytes)}</div>
            <div class="pms-media-meta">By ${esc(m.uploaded_by_name || '—')} • Used in <strong>${m.usage_count}</strong> product${m.usage_count === 1 ? '' : 's'}</div>
            <div class="pms-media-actions">
              ${selectable ? `<button type="button" class="pms-btn pms-btn-sm pms-btn-gold" onclick="PMSController.selectLibraryMedia('${esc(m.id)}')"><i class="fa-solid fa-check"></i> Use This</button>` : ''}
              <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.deleteLibraryAsset('${esc(m.id)}', ${m.usage_count})"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      grid.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-triangle-exclamation"></i><h4>Failed to load media</h4><p>${esc(e.message || '')}</p></div>`;
    }
  }

  async function uploadLibraryImage(input) {
    var file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.type && file.type.indexOf('image') === -1) return toast('Only image files are allowed.', 'warning');
    if (file.size > 8 * 1024 * 1024) return toast('Each image must be under 8MB.', 'warning');
    try {
      await window.PMSService.uploadImage(file);
      toast('Image uploaded to the library.', 'success');
      renderMediaLibrary();
    } catch (e) {
      toast('Failed to upload image: ' + (e.message || ''), 'error');
    }
  }

  async function uploadLibraryAudio(input) {
    var file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return toast('Audio file must be under 25MB.', 'warning');
    try {
      await window.PMSService.uploadAudio(file);
      toast('Audio uploaded to the library.', 'success');
      renderMediaLibrary();
    } catch (e) {
      toast('Failed to upload audio: ' + (e.message || ''), 'error');
    }
  }

  async function deleteLibraryAsset(id, usage) {
    var msg = usage > 0
      ? 'This media file is used by <strong>' + usage + '</strong> product(s). Deleting it will break those products. Delete anyway?'
      : 'Delete this unused media file? This removes it from storage permanently.';
    var ok = await confirmModal('Delete Media', msg, true, 'Delete');
    if (!ok) return;
    try {
      var res = await window.PMSService.deleteMediaAsset(id, usage > 0);
      toast((res.data && res.data.deleted) ? 'Media deleted.' : 'Media removed.', 'success');
      renderMediaLibrary();
    } catch (e) {
      toast(e.message || 'Failed to delete media.', 'error');
    }
  }

  // -- Picking existing media for the product form -------------------------
  function openMediaPicker(kind) {
    var existing = $('pms-media-modal');
    if (existing) existing.remove();
    showMediaLibrary(kind);
  }

  function pickLibraryImages() { openMediaPicker('images'); }
  function pickLibraryAudio() { openMediaPicker('audio'); }

  async function selectLibraryMedia(id) {
    var asset = (state.mediaCache || []).find(function (m) { return m.id === id; });
    if (!asset) return toast('Media not found. Try reopening the library.', 'error');
    if (asset.kind === 'image') {
      var hadCover = state.form.images.some(function (i) { return i.is_cover; });
      state.form.images.push({
        storage_path: asset.storage_path,
        display_order: state.form.images.length,
        is_cover: !hadCover,
        alt_text: asset.alt_text || ''
      });
      renderFormImages();
      toast('Image added to the product.', 'success');
    } else {
      state.form.audioPath = asset.storage_path;
      state.form.audioUrl = asset.url;
      state.form.audioEnabled = true;
      renderAudioManager();
      toast('Audio attached to the product.', 'success');
    }
    closeMediaLibrary();
  }

  // --------------------------------------------------------------------------
  // Product Templates
  // --------------------------------------------------------------------------
  function showTemplates() {
    var modal = document.createElement('div');
    modal.className = 'pms-modal-overlay active';
    modal.id = 'pms-templates-modal';
    modal.innerHTML = `
      <div class="pms-modal pms-modal-lg">
        <div class="pms-modal-header">
          <h3><i class="fa-solid fa-clone"></i> Product Templates</h3>
          <button type="button" class="pms-modal-close" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">&times;</button>
        </div>
        <div class="pms-modal-body">
          <div class="pms-hint" style="margin-bottom:14px;">Templates store default images, audio, description, badge, category and metadata. Create a product from a template to start with a minimal edit.</div>
          <div id="pms-templates-list"><div style="text-align:center;padding:30px;color:var(--pms-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>
        </div>
        <div class="pms-modal-footer">
          <button type="button" class="pms-btn pms-btn-gold" onclick="PMSController.newFromTemplate()"><i class="fa-solid fa-plus"></i> New Blank Product</button>
          <button type="button" class="pms-btn" onclick="PMSController.closeOverlay(this.closest('.pms-modal-overlay'))">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupModalA11y(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeOverlay(modal);
    });
    document.body.style.overflow = 'hidden';
    renderTemplates();
  }

  async function renderTemplates() {
    var list = $('pms-templates-list');
    if (!list) return;
    try {
      var res = await window.PMSService.listTemplates();
      state.templates = (res && res.templates) || [];
    } catch (e) { state.templates = []; }
    if (state.templates.length === 0) {
      list.innerHTML = `<div class="pms-empty"><i class="fa-solid fa-clone"></i><h4>No templates yet</h4><p>Open a product form and use "Save as Template" to create one.</p></div>`;
      return;
    }
    list.innerHTML = state.templates.map(function (t) {
      var data = t.template_data || {};
      var meta = [];
      if (t.category) meta.push(t.category);
      if (data.price) meta.push('$' + data.price);
      if (data.badge) meta.push(data.badge);
      if ((data.images || []).length) meta.push((data.images).length + ' image(s)');
      if (data.audio_url || data.audio_enabled) meta.push('audio');
      return `
        <div class="pms-restore-card">
          <div class="pms-restore-name"><i class="fa-solid fa-clone"></i> ${esc(t.name)}</div>
          <div class="pms-restore-meta">${esc(meta.join(' • ')) || '—'}</div>
          <div class="pms-restore-actions">
            <button type="button" class="pms-btn pms-btn-sm" onclick="PMSController.newFromTemplate('${esc(t.id)}')"><i class="fa-solid fa-plus"></i> New Product</button>
            <button type="button" class="pms-btn pms-btn-sm pms-btn-danger" onclick="PMSController.deleteTemplateAction('${esc(t.id)}', '${esc(t.name.replace(/'/g, ''))}')"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function deleteTemplateAction(id, name) {
    var ok = await confirmModal('Delete Template', 'Delete template <strong>' + esc(name) + '</strong>?', true);
    if (!ok) return;
    try {
      await window.PMSService.deleteTemplate(id);
      toast('Template deleted.', 'success');
      renderTemplates();
    } catch (e) {
      toast(e.message || 'Failed to delete template.', 'error');
    }
  }

  function currentFormData() {
    var nameEl = $('pf-name');
    if (!nameEl) return null;
    var audioEnabledEl = $('pf-audio-enabled');
    return {
      name: nameEl.value.trim(),
      slug: $('pf-slug') ? $('pf-slug').value.trim() : '',
      category: $('pf-category') ? $('pf-category').value : '',
      short_description: $('pf-short') ? $('pf-short').value.trim() : '',
      description: $('pf-desc') ? $('pf-desc').value.trim() : '',
      price: $('pf-price') ? $('pf-price').value : '',
      currency: $('pf-currency') ? $('pf-currency').value : 'USD',
      stock: $('pf-stock') ? $('pf-stock').value : 0,
      featured: $('pf-featured') ? $('pf-featured').checked : false,
      status: $('pf-status') ? $('pf-status').value : 'draft',
      badge: $('pf-badge') ? $('pf-badge').value.trim() : '',
      sort_order: $('pf-sort') ? $('pf-sort').value : 0,
      details_link: $('pf-details-link') ? $('pf-details-link').value.trim() : '',
      audio_url: state.form.audioPath || '',
      audio_enabled: audioEnabledEl ? audioEnabledEl.checked : state.form.audioEnabled,
      meta_title: $('pf-meta-title') ? $('pf-meta-title').value.trim() : '',
      meta_description: $('pf-meta-desc') ? $('pf-meta-desc').value.trim() : '',
      images: (state.form.images || []).map(function (img, idx) {
        return { storage_path: img.storage_path, display_order: idx, is_cover: !!img.is_cover, alt_text: img.alt_text || '' };
      })
    };
  }

  async function saveAsTemplate() {
    var data = currentFormData();
    if (!data) return toast('Open a product form first.', 'warning');
    if (!data.name) return toast('Enter a product name before saving a template.', 'warning');
    var res = await promptModal('Save as Template',
      'Save the current form (images, audio, description, badge, metadata) as a reusable template.',
      `<div class="pms-field" style="margin:0;"><label>Template name</label><input type="text" class="pms-input" id="pms-tpl-name" value="${esc(data.name + ' Template')}" style="width:100%;"></div>`,
      'Save Template');
    if (!res || !res.values) return;
    var tplName = (res.values['pms-tpl-name'] || '').trim();
    if (!tplName) return toast('Enter a template name.', 'warning');
    try {
      await window.PMSService.saveTemplate({
        name: tplName,
        category: data.category || null,
        template_data: data,
        is_active: true
      });
      toast('Template saved.', 'success');
    } catch (e) {
      toast(e.message || 'Failed to save template.', 'error');
    }
  }

  async function newFromTemplate(id) {
    // Close the templates modal if open.
    var tplModal = $('pms-templates-modal');
    if (tplModal) tplModal.remove();
    if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';

    if (!id) {
      // New blank product
      PMSController.openAdd();
      return;
    }
    try {
      var res = await window.PMSService.listTemplates();
      var tpl = ((res && res.templates) || []).find(function (t) { return t.id === id; });
      if (!tpl) return toast('Template not found.', 'error');
      var d = tpl.template_data || {};
      var images = (d.images || []).map(function (img, idx) {
        return {
          storage_path: img.storage_path,
          display_order: idx,
          is_cover: !!img.is_cover,
          alt_text: img.alt_text || ''
        };
      });
      state.form = {
        id: null,
        images: images,
        audioPath: d.audio_url || null,
        audioUrl: d.audio_url ? (window.PMSService.publicAudioUrl ? window.PMSService.publicAudioUrl(d.audio_url) : d.audio_url) : "",
        audioEnabled: !!d.audio_enabled,
        pendingDeletions: []
      };
      openProductForm({
        name: d.name || '',
        slug: '',
        category: d.category || tpl.category || '',
        short_description: d.short_description || '',
        description: d.description || '',
        price: d.price != null ? d.price : '',
        currency: d.currency || 'USD',
        stock: d.stock != null ? d.stock : 0,
        featured: !!d.featured,
        status: 'draft',
        badge: d.badge || '',
        sort_order: d.sort_order != null ? d.sort_order : 0,
        meta_title: d.meta_title || '',
        meta_description: d.meta_description || '',
        details_link: d.details_link || ''
      });
    } catch (e) {
      toast(e.message || 'Failed to load template.', 'error');
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
    toggleAdvancedFilters: toggleAdvancedFilters,
    openPreview: openPreview,
    closePreview: closePreview,
    importJSON: importJSON,
    openSettings: openSettings,
    toggleSelect: toggleSelect,
    toggleSelectAll: toggleSelectAll,
    bulkStatus: bulkStatus,
    bulkCollection: bulkCollection,
    bulkRemoveCollection: bulkRemoveCollection,
    bulkBadge: bulkBadge,
    bulkRemoveBadge: bulkRemoveBadge,
    bulkAudio: bulkAudio,
    bulkDuplicate: bulkDuplicate,
    bulkDelete: bulkDelete,
    bulkRestore: bulkRestore,
    exportCSV: exportCSV,
    exportJSON: exportJSON,
    publishOne: publishOne,
    hideOne: hideOne,
    deleteOne: deleteOne,
    restoreOne: restoreOne,
    permaDelete: permaDelete,
    duplicate: duplicate,
    openAdd: openAdd,
    openEdit: openEdit,
    closeProductForm: closeProductForm,
    closeOverlay: closeOverlay,
    autoSlug: autoSlug,
    checkSlug: checkSlug,
    addImageFiles: addImageFiles,
    setFormCover: setFormCover,
    moveFormImage: moveFormImage,
    removeFormImage: removeFormImage,
    addAudioFile: addAudioFile,
    removeAudioFile: removeAudioFile,
    saveProduct: saveProduct,
    saveAsTemplate: saveAsTemplate,
    newFromTemplate: newFromTemplate,
    deleteTemplateAction: deleteTemplateAction,
    showTemplates: showTemplates,
    showMediaLibrary: showMediaLibrary,
    closeMediaLibrary: closeMediaLibrary,
    mediaKind: mediaKind,
    mediaSearch: mediaSearch,
    uploadLibraryImage: uploadLibraryImage,
    uploadLibraryAudio: uploadLibraryAudio,
    deleteLibraryAsset: deleteLibraryAsset,
    pickLibraryImages: pickLibraryImages,
    pickLibraryAudio: pickLibraryAudio,
    selectLibraryMedia: selectLibraryMedia,
    showHistory: showHistory,
    showRestorePoints: showRestorePoints,
    createRestorePoint: createRestorePoint,
    applyRestorePoint: applyRestorePoint,
    showCollections: showCollections,
    openCollectionForm: openCollectionForm,
    openReorderFeatured: openReorderFeatured,
    deleteCollection: deleteCollection,
    archiveCollectionAction: archiveCollectionAction,
    restoreCollectionAction: restoreCollectionAction,
    toggleCollectionActive: toggleCollectionActive
  };

  // Auto-init after auth is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
}();
