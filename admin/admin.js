/* ============================================================
   HOUSE OF BULBUL — ADMIN PANEL SPA
   Complete client-side logic for all admin sections
   ============================================================ */

'use strict';

// ── API Base URL ─────────────────────────────────────────────
const API = '/api/admin';

// ── State ────────────────────────────────────────────────────
let currentPage   = null;
let currentUser   = null;
let authToken     = localStorage.getItem('hob_admin_token') || null;
let productPage   = 1;
let productSearch = '';
let productStatus = '';
let mediaPickerCallback = null;
let allMediaCache = [];

// ════════════════════════════════════════════════════════════
// BOOTSTRAP
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  if (authToken) {
    const ok = await verifyToken();
    if (ok) {
      showShell();
      navigate('dashboard');
    } else {
      showLogin();
    }
  } else {
    showLogin();
  }
});

async function verifyToken() {
  try {
    const r = await apiGet('/auth/me');
    if (r.user) { currentUser = r.user; return true; }
    return false;
  } catch { return false; }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = '';
  document.getElementById('adminShell').style.display = 'none';
  authToken = null;
}

function showShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display  = 'flex';
  // Populate sidebar user info
  if (currentUser) {
    document.getElementById('sidebarUsername').textContent = currentUser.username;
    document.getElementById('sidebarUserRole').textContent = formatRole(currentUser.role);
    document.getElementById('sidebarAvatar').textContent   = currentUser.username[0].toUpperCase();
    document.getElementById('sidebarRole').textContent     = formatRole(currentUser.role);
    if (currentUser.role === 'super_admin') {
      document.getElementById('navUsers').style.display = '';
    }
  }
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');
  const btnText  = document.getElementById('loginBtnText');
  const spinner  = document.getElementById('loginSpinner');

  errEl.style.display = 'none';
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = '';

  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('hob_admin_token', authToken);
      showShell();
      navigate('dashboard');
    } else {
      errEl.textContent = data.error || 'Login failed. Check your credentials.';
      errEl.style.display = '';
    }
  } catch {
    errEl.textContent = 'Could not reach server. Check your connection.';
    errEl.style.display = '';
  } finally {
    btn.disabled = false;
    btnText.style.display = '';
    spinner.style.display = 'none';
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('hob_admin_token');
  showLogin();
}

function togglePw() {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════
function navigate(page) {
  currentPage = page;
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Breadcrumb
  const labels = {
    dashboard:'Dashboard', products:'Products', collections:'Collections',
    media:'Media Library', customizer:'Visual Customizer', homepage:'Homepage Builder',
    navigation:'Navigation', campaigns:'Campaigns', whatsapp:'WhatsApp Settings',
    seo:'SEO Settings', analytics:'Analytics', enquiries:'Enquiries',
    auditlog:'Audit Log', settings:'Store Settings', users:'Admin Users'
  };
  setBreadcrumb([labels[page] || page]);

  // Show/hide topbar search
  document.getElementById('topbarSearch').style.display = page === 'products' ? '' : 'none';
  const pb = document.getElementById('topbarPrimaryBtn');
  pb.style.display = 'none';

  // Route to page renderer
  const renderers = {
    dashboard,  products,  collections, media,
    customizer, homepage,  navigation:navPage,
    campaigns,  whatsapp,  seo,
    analytics,  enquiries, auditlog, settings, users
  };
  const fn = renderers[page];
  if (fn) fn();
}

function setBreadcrumb(parts) {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = parts.map((p, i) =>
    i < parts.length - 1
      ? `<span onclick="navigate('${p.toLowerCase()}')" style="cursor:pointer;opacity:.7">${p}</span><span class="breadcrumb-sep">›</span>`
      : `<span>${p}</span>`
  ).join('');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ════════════════════════════════════════════════════════════
// API HELPERS
// ════════════════════════════════════════════════════════════
function authHeaders() {
  return { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };
}

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (r.status === 401) { logout(); throw new Error('Session expired'); }
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (r.status === 401) { logout(); throw new Error('Session expired'); }
  return r.json();
}

async function apiPut(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (r.status === 401) { logout(); throw new Error('Session expired'); }
  return r.json();
}

async function apiDelete(path) {
  const r = await fetch(`${API}${path}`, { method: 'DELETE', headers: authHeaders() });
  if (r.status === 401) { logout(); throw new Error('Session expired'); }
  return r.json();
}

// ════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ════════════════════════════════════════════════════════════
function toast(type, title, msg = '', duration = 4000) {
  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`,
    error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>`
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type]||icons.info}
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <span class="toast-dismiss" onclick="this.parentElement.remove()">×</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { el.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, duration);
}

// ════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ════════════════════════════════════════════════════════════
let _confirmResolve = null;
function confirm(title, msg, btnLabel = 'Delete') {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  document.getElementById('confirmOkBtn').textContent = btnLabel;
  document.getElementById('confirmOverlay').style.display = 'flex';
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmOkBtn').onclick = () => { cancelConfirm(); resolve(true); };
  });
}
function cancelConfirm() {
  document.getElementById('confirmOverlay').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
}

// ════════════════════════════════════════════════════════════
// PAGE CONTENT HELPERS
// ════════════════════════════════════════════════════════════
function setContent(html) {
  document.getElementById('pageContent').innerHTML = html;
}
function setLoading() {
  setContent('<div class="page-loader"><div class="spinner"></div><p>Loading…</p></div>');
}
function fmtPrice(p) {
  return p !== null && p !== undefined ? `₹${Number(p).toLocaleString('en-IN')}` : '—';
}
function formatRole(r) {
  return { super_admin:'Super Admin', product_manager:'Product Manager',
           content_manager:'Content Manager', enquiry_manager:'Enquiry Manager' }[r] || r;
}
function timeAgo(dateStr) {
  const s = (Date.now() - new Date(dateStr)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
async function dashboard() {
  setLoading();
  try {
    const data = await apiGet('/analytics');
    const p = data.products || {};
    const events = data.events || {};
    const top = data.topProducts || [];
    const audit = data.recentAudit || [];

    const total   = p.total || 0;
    const pub     = p.published || 0;
    const draft   = p.draft || 0;
    const wpClicks = events.whatsapp_click || 0;
    const views   = events.product_view || 0;

    setContent(`
      <div class="page-header">
        <div class="page-header-text">
          <h2>Welcome back, ${currentUser?.username || 'Admin'} 👋</h2>
          <p>Here's what's happening with your store today.</p>
        </div>
        <div class="page-header-actions">
          <a class="btn btn-outline btn-sm" href="/" target="_blank">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Store
          </a>
          <button class="btn btn-primary btn-sm" onclick="navigate('products')">+ Add Product</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/></svg></div>
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Products</div>
          <span class="stat-change up">↑ ${pub} live</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h6l2 3h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/></svg></div>
          <div class="stat-value">${data.collections?.total || 0}</div>
          <div class="stat-label">Collections</div>
          <span class="stat-change up">↑ ${data.collections?.visible || 0} visible</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.38A9.9 9.9 0 0 0 12.04 22c5.46 0 9.9-4.45 9.9-9.9S17.5 2 12.04 2z"/></svg></div>
          <div class="stat-value">${wpClicks}</div>
          <div class="stat-label">WhatsApp Clicks (30d)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div class="stat-value">${views}</div>
          <div class="stat-label">Product Views (30d)</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Top Viewed Products</div>
              <div class="card-subtitle">Last 30 days</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="navigate('analytics')">Full Report</button>
          </div>
          ${top.length ? `
            <div class="data-table-wrap">
              <table class="data-table">
                <thead><tr><th>Product</th><th>Views</th><th></th></tr></thead>
                <tbody>
                  ${top.map(p => `<tr>
                    <td><div class="table-product-cell">
                      <img class="table-product-img" src="${p.primary_image||''}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2244%22 height=%2244%22%3E%3Crect fill=%22%232A2548%22 width=%2244%22 height=%2244%22/%3E%3C/svg%3E'" alt="">
                      <div><div class="table-product-name">${p.name}</div></div>
                    </div></td>
                    <td><span class="badge published">${p.views}</span></td>
                    <td><button class="btn btn-ghost btn-sm" onclick="editProduct(${p.id})">Edit</button></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><p>No view data yet. Analytics will appear once customers visit your store.</p></div>'}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header"><div class="card-title">Recent Activity</div></div>
            <div>
              ${audit.length ? audit.map(a => `
                <div class="audit-item">
                  <div class="audit-avatar">${(a.username||'?')[0].toUpperCase()}</div>
                  <div>
                    <div class="audit-action"><strong>${a.username}</strong> <span class="audit-badge ${a.action}">${a.action}</span> ${a.entity} <strong>#${a.entity_id}</strong></div>
                    <div class="audit-meta">${timeAgo(a.created_at)}</div>
                  </div>
                </div>`).join('')
              : '<div class="empty-state" style="padding:20px"><p>No recent activity.</p></div>'}
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Quick Actions</div></div>
            <div style="display:grid;gap:8px">
              <button class="btn btn-outline" onclick="navigate('products');setTimeout(()=>showProductForm(),300)">+ Add New Product</button>
              <button class="btn btn-outline" onclick="navigate('campaigns')">🎉 New Campaign</button>
              <button class="btn btn-outline" onclick="navigate('settings')">⚙️ WhatsApp Settings</button>
              <button class="btn btn-outline" onclick="navigate('media')">📸 Upload Images</button>
            </div>
          </div>
        </div>
      </div>
    `);
  } catch(e) {
    setContent(`<div class="empty-state"><h3>Could not load dashboard</h3><p>${e.message}</p></div>`);
  }
}

// ════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════
async function products(page = 1, search = productSearch, status = productStatus) {
  productPage   = page;
  productSearch = search;
  productStatus = status;
  setLoading();

  const pb = document.getElementById('topbarPrimaryBtn');
  pb.textContent = '+ Add Product';
  pb.style.display = '';
  pb.onclick = () => showProductForm();
  setBreadcrumb(['Products']);

  try {
    const qs = new URLSearchParams({ page, limit: 25, ...(search && {search}), ...(status && {status}) });
    const data = await apiGet(`/products?${qs}`);
    const prods = data.products || [];
    const pg    = data.pagination || {};

    setContent(`
      <div class="page-header">
        <div class="page-header-text">
          <h2>Products</h2>
          <p>${pg.total || 0} total products in your catalogue</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline btn-sm" onclick="syncFromShopify()">↻ Sync from Shopify</button>
          <button class="btn btn-primary" onclick="showProductForm()">+ Add Product</button>
        </div>
      </div>

      <div class="card">
        <div class="table-toolbar">
          <div class="table-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search products…" value="${search}" oninput="debounce(()=>products(1,this.value,productStatus),350)()">
          </div>
          <select class="form-input form-select" style="width:auto" onchange="products(1,productSearch,this.value)">
            <option value="">All statuses</option>
            <option value="published" ${status==='published'?'selected':''}>Published</option>
            <option value="draft"     ${status==='draft'?'selected':''}>Draft</option>
            <option value="archived"  ${status==='archived'?'selected':''}>Archived</option>
          </select>
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Status</th>
                <th>Collections</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${prods.length ? prods.map(p => `
                <tr>
                  <td>
                    <div class="table-product-cell">
                      <img class="table-product-img"
                           src="${p.primary_image||''}"
                           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2244%22 height=%2244%22%3E%3Crect fill=%22%232A2548%22 width=%2244%22 height=%2244%22/%3E%3C/svg%3E'" alt="">
                      <div>
                        <div class="table-product-name">${p.name}</div>
                        <div class="table-product-handle">${p.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td style="white-space:nowrap">
                    <strong>${fmtPrice(p.price)}</strong>
                    ${p.compare_at ? `<br><small style="color:var(--text-3);text-decoration:line-through">${fmtPrice(p.compare_at)}</small>` : ''}
                  </td>
                  <td><span class="badge ${p.status}"><span class="badge-dot"></span>${p.status}</span></td>
                  <td style="font-size:11px;color:var(--text-3)">${(p.collections||[]).slice(0,2).join(', ')||'—'}</td>
                  <td style="font-size:11px;color:var(--text-3)">${timeAgo(p.updated_at)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="editProduct(${p.id})" title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateProduct(${p.id})" title="Duplicate">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\\'")}')" title="Delete" style="color:var(--danger)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="6">
                  <div class="empty-state">
                    <div class="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/></svg></div>
                    <h3>No products found</h3>
                    <p>${search ? 'Try a different search term.' : 'Get started by adding your first product.'}</p>
                    <button class="btn btn-primary" onclick="showProductForm()">+ Add Product</button>
                  </div>
                </td></tr>
              `}
            </tbody>
          </table>
        </div>

        ${pg.pages > 1 ? `
          <div class="pagination">
            <div class="pagination-info">Showing ${((pg.page-1)*pg.limit)+1}–${Math.min(pg.page*pg.limit,pg.total)} of ${pg.total}</div>
            <div class="pagination-btns">
              <button class="page-btn" onclick="products(${pg.page-1})" ${pg.page<=1?'disabled':''}>‹</button>
              ${Array.from({length:Math.min(pg.pages,7)}, (_,i) => {
                const n = pg.pages <= 7 ? i+1 : i < 3 ? i+1 : pg.pages-2+i-4;
                return `<button class="page-btn${n===pg.page?' active':''}" onclick="products(${n})">${n}</button>`;
              }).join('')}
              <button class="page-btn" onclick="products(${pg.page+1})" ${pg.page>=pg.pages?'disabled':''}>›</button>
            </div>
          </div>
        ` : ''}
      </div>
    `);
  } catch(e) {
    setContent(`<div class="empty-state"><h3>Failed to load products</h3><p>${e.message}</p></div>`);
  }
}

async function showProductForm(productData = null) {
  const isEdit = !!productData;
  let p = productData;
  if (!p) p = { status:'draft', price:0, images:[], tags:[], collections:[] };

  setBreadcrumb(['Products', isEdit ? 'Edit Product' : 'New Product']);
  document.getElementById('topbarPrimaryBtn').style.display = 'none';

  setContent(`
    <div class="page-header">
      <div class="page-header-text">
        <h2>${isEdit ? 'Edit Product' : 'Add New Product'}</h2>
        <p>${isEdit ? `Editing: ${p.name}` : 'Fill in product details below.'}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" onclick="products()">← Back</button>
        ${isEdit ? `<button class="btn btn-outline" onclick="toggleProductStatus(${p.id},'${p.status}')">
          ${p.status === 'published' ? '📦 Unpublish' : '🚀 Publish'}
        </button>` : ''}
        <button class="btn btn-primary" onclick="saveProduct(${isEdit ? p.id : 'null'})">
          ${isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </div>

    <div class="product-form-layout">
      <!-- LEFT: Main fields -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="form-group">
            <label class="form-label">Product Name *</label>
            <input class="form-input" id="pName" type="text" placeholder="e.g. Personalised Sweet Cone" value="${escHtml(p.name||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Short Description</label>
            <input class="form-input" id="pShortDesc" type="text" placeholder="One-line summary for cards" value="${escHtml(p.short_desc||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Full Description</label>
            <textarea class="form-input form-textarea" id="pDesc" rows="6" placeholder="Detailed product description (supports HTML)">${escHtml(p.description||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">URL Handle</label>
            <input class="form-input" id="pHandle" type="text" placeholder="auto-generated-from-name" value="${escHtml(p.handle||'')}">
            <p class="form-hint">Leave blank to auto-generate from product name.</p>
          </div>
        </div>

        <div class="card">
          <div class="form-section-title">Pricing</div>
          <div class="price-field-group">
            <div class="form-group">
              <label class="form-label">Price (₹) *</label>
              <div class="price-input-wrap">
                <span class="price-currency">₹</span>
                <input class="form-input" id="pPrice" type="number" min="0" value="${p.price||0}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Compare-at Price</label>
              <div class="price-input-wrap">
                <span class="price-currency">₹</span>
                <input class="form-input" id="pCompareAt" type="number" min="0" value="${p.compare_at||''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cost Price</label>
              <div class="price-input-wrap">
                <span class="price-currency">₹</span>
                <input class="form-input" id="pCostPrice" type="number" min="0" value="${p.cost_price||''}">
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="form-section-title">Variants / Options</div>
          <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">Add size, colour, or material variants for this product.</p>
          <div id="variantList">
            ${(p.variants||[]).map((v,i) => variantRow(v,i)).join('')}
          </div>
          <button class="variant-add-btn" onclick="addVariantRow()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Add Variant
          </button>
        </div>

        <div class="card">
          <div class="form-section-title">SEO</div>
          <div class="form-group">
            <label class="form-label">SEO Title</label>
            <input class="form-input" id="pSeoTitle" placeholder="Leave blank to use product name" value="${escHtml(p.seo_title||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">SEO Description</label>
            <textarea class="form-input" id="pSeoDesc" rows="3" placeholder="Brief description for search engines">${escHtml(p.seo_description||'')}</textarea>
          </div>
        </div>
      </div>

      <!-- RIGHT: Sidebar fields -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="form-section-title">Status</div>
          <div class="form-group">
            <select class="form-input form-select" id="pStatus">
              <option value="draft"     ${(p.status||'draft')==='draft'?'selected':''}>Draft</option>
              <option value="published" ${p.status==='published'?'selected':''}>Published</option>
              <option value="archived"  ${p.status==='archived'?'selected':''}>Archived</option>
            </select>
          </div>
          <label class="toggle-wrap">
            <input class="toggle-input" type="checkbox" id="pFeatured" ${p.featured?'checked':''}>
            <span class="toggle-track"></span>
            <span class="toggle-label">Featured Product</span>
          </label>
        </div>

        <div class="card">
          <div class="form-section-title">Images</div>
          <div class="image-drop-zone" id="imgDropZone"
               onclick="openMediaPicker(url => addProductImage(url))"
               ondragover="event.preventDefault();this.classList.add('drag-over')"
               ondragleave="this.classList.remove('drag-over')"
               ondrop="handleImageDrop(event)">
            <div class="image-drop-zone-icon">📷</div>
            <p>Click to select from library</p>
            <small>or drag & drop an image here</small>
          </div>
          <div class="image-thumbs" id="imgThumbs">
            ${(p.images||[]).map((img,i) => imageThumbnail(img.url||img, i===0)).join('')}
          </div>
          <input type="hidden" id="pImagesData" value='${JSON.stringify(p.images||[])}'>
        </div>

        <div class="card">
          <div class="form-section-title">Organisation</div>
          <div class="form-group">
            <label class="form-label">SKU</label>
            <input class="form-input" id="pSku" placeholder="HOB-001" value="${escHtml(p.sku||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Badge</label>
            <select class="form-input form-select" id="pBadge">
              <option value="">None</option>
              <option value="New" ${p.badge==='New'?'selected':''}>New</option>
              <option value="Bestseller" ${p.badge==='Bestseller'?'selected':''}>Bestseller</option>
              <option value="Limited Edition" ${p.badge==='Limited Edition'?'selected':''}>Limited Edition</option>
              <option value="Sale" ${p.badge==='Sale'?'selected':''}>Sale</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tags</label>
            <div class="tag-input-wrap" id="tagWrap" onclick="document.getElementById('tagInput').focus()">
              ${(p.tags||[]).map(t => `<span class="tag-chip">${t}<span class="tag-chip-remove" onclick="removeTag('${t}')">×</span></span>`).join('')}
              <input class="tag-input" id="tagInput" placeholder="Type tag, press Enter" onkeydown="handleTagKey(event)">
            </div>
          </div>
        </div>

        <div class="card" id="collectionPickerCard">
          <div class="form-section-title">Collections</div>
          <div id="collectionCheckboxes"><div class="spinner" style="width:20px;height:20px;margin:8px auto"></div></div>
        </div>
      </div>
    </div>
  `);

  // Load collections for checkboxes
  loadCollectionCheckboxes(p.collections || []);
}

async function editProduct(id) {
  setLoading();
  try {
    const data = await apiGet(`/products/${id}`);
    if (data.product) {
      await showProductForm(data.product);
    } else {
      toast('error', 'Product not found');
      products();
    }
  } catch(e) {
    toast('error', 'Failed to load product', e.message);
    products();
  }
}

async function saveProduct(id) {
  const isEdit = id !== null;
  const name = document.getElementById('pName').value.trim();
  const price = document.getElementById('pPrice').value;
  if (!name) { toast('error', 'Product name is required'); return; }
  if (!price) { toast('error', 'Price is required'); return; }

  const tags = Array.from(document.querySelectorAll('#tagWrap .tag-chip'))
    .map(el => el.textContent.trim().replace('×','').trim()).filter(Boolean);

  const collections = Array.from(document.querySelectorAll('#collectionCheckboxes input[type=checkbox]:checked'))
    .map(el => el.value);

  const variants = Array.from(document.querySelectorAll('.variant-row')).map(row => ({
    option_name:  row.querySelector('[data-f="option_name"]').value,
    option_value: row.querySelector('[data-f="option_value"]').value,
    price:        row.querySelector('[data-f="price"]').value || null,
    stock:        row.querySelector('[data-f="stock"]').value || 0,
  })).filter(v => v.option_value);

  let images = [];
  try { images = JSON.parse(document.getElementById('pImagesData').value || '[]'); } catch {}

  const body = {
    name, price: parseInt(price,10),
    handle:       document.getElementById('pHandle').value.trim() || undefined,
    short_desc:   document.getElementById('pShortDesc').value,
    description:  document.getElementById('pDesc').value,
    compare_at:   document.getElementById('pCompareAt').value || null,
    cost_price:   document.getElementById('pCostPrice').value || null,
    sku:          document.getElementById('pSku').value,
    badge:        document.getElementById('pBadge').value || null,
    status:       document.getElementById('pStatus').value,
    featured:     document.getElementById('pFeatured').checked,
    seo_title:    document.getElementById('pSeoTitle').value || null,
    seo_description: document.getElementById('pSeoDesc').value || null,
    primary_image: images[0]?.url || images[0] || null,
    images, tags, collections, variants
  };

  try {
    let data;
    if (isEdit) {
      data = await apiPut(`/products/${id}`, body);
    } else {
      data = await apiPost('/products', body);
    }
    if (data.success) {
      toast('success', isEdit ? 'Product updated!' : 'Product created!');
      products();
    } else {
      toast('error', data.error || 'Save failed');
    }
  } catch(e) {
    toast('error', 'Failed to save', e.message);
  }
}

async function deleteProduct(id, name) {
  const ok = await confirm('Delete Product', `"${name}" will be permanently removed from your store.`, 'Delete');
  if (!ok) return;
  try {
    const data = await apiDelete(`/products/${id}`);
    if (data.success) { toast('success', 'Product deleted'); products(); }
    else toast('error', data.error || 'Delete failed');
  } catch(e) { toast('error', 'Delete failed', e.message); }
}

async function duplicateProduct(id) {
  try {
    const data = await apiGet(`/products/${id}`);
    const p = data.product;
    if (!p) return;
    const body = { ...p, name: p.name + ' (Copy)', handle: p.handle + '-copy', status: 'draft', id: Date.now() };
    delete body.variants;
    const res = await apiPost('/products', body);
    if (res.success) { toast('success', 'Product duplicated!'); products(); }
    else toast('error', res.error);
  } catch(e) { toast('error', 'Duplicate failed', e.message); }
}

async function toggleProductStatus(id, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';
  try {
    const data = await apiPut(`/products/${id}`, { status: newStatus });
    if (data.success) { toast('success', `Product ${newStatus}`); products(); }
    else toast('error', data.error);
  } catch(e) { toast('error', 'Failed', e.message); }
}

async function loadCollectionCheckboxes(selected = []) {
  try {
    const data = await apiGet('/collections');
    const colls = data.collections || [];
    document.getElementById('collectionCheckboxes').innerHTML = colls.length
      ? colls.map(c => `
        <label class="product-check-item" style="padding:6px 4px">
          <input type="checkbox" value="${c.handle}" ${selected.includes(c.handle)?'checked':''} style="accent-color:var(--primary)">
          <span style="font-size:13px">${c.name}</span>
          <small style="color:var(--text-3);margin-left:auto">${c.product_count||0}</small>
        </label>`).join('')
      : '<p style="color:var(--text-3);font-size:12px">No collections yet.</p>';
  } catch {
    document.getElementById('collectionCheckboxes').innerHTML = '<p style="color:var(--danger);font-size:12px">Could not load collections.</p>';
  }
}

// ── Variant rows ─────────────────────────────────────────────
let variantIdx = 0;
function variantRow(v = {}, idx) {
  return `<div class="variant-row" id="vr-${idx}">
    <input class="form-input" data-f="option_name" placeholder="Option (e.g. Size)" value="${escHtml(v.option_name||'')}">
    <input class="form-input" data-f="option_value" placeholder="Value (e.g. Large)" value="${escHtml(v.option_value||'')}">
    <input class="form-input" data-f="price" type="number" placeholder="Price" value="${v.price||''}">
    <input class="form-input" data-f="stock" type="number" placeholder="Stock" value="${v.stock||0}">
    <button class="btn btn-ghost btn-sm btn-icon" onclick="this.closest('.variant-row').remove()" style="color:var(--danger)">×</button>
  </div>`;
}
function addVariantRow() {
  document.getElementById('variantList').insertAdjacentHTML('beforeend', variantRow({}, ++variantIdx));
}

// ── Tag input ────────────────────────────────────────────────
function handleTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(',','');
    if (!val) return;
    addTag(val);
    e.target.value = '';
  }
}
function addTag(val) {
  const wrap = document.getElementById('tagWrap');
  const inp  = document.getElementById('tagInput');
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.innerHTML = `${escHtml(val)}<span class="tag-chip-remove" onclick="this.parentElement.remove()">×</span>`;
  wrap.insertBefore(chip, inp);
}
function removeTag(t) { /* handled via onclick */ }

// ── Image handling ───────────────────────────────────────────
function imageThumbnail(url, isPrimary = false) {
  return `<div class="image-thumb-wrap ${isPrimary ? 'primary' : ''}">
    <img src="${url}" alt="" onerror="this.style.opacity=0.3">
    <div class="image-thumb-remove" onclick="removeProductImage('${url}')">×</div>
  </div>`;
}
function addProductImage(url) {
  if (!url) return;
  let imgs = [];
  try { imgs = JSON.parse(document.getElementById('pImagesData').value || '[]'); } catch {}
  const entry = { url, alt: '', order: imgs.length };
  imgs.push(entry);
  document.getElementById('pImagesData').value = JSON.stringify(imgs);
  document.getElementById('imgThumbs').insertAdjacentHTML('beforeend', imageThumbnail(url, imgs.length===1));
}
function removeProductImage(url) {
  let imgs = [];
  try { imgs = JSON.parse(document.getElementById('pImagesData').value || '[]'); } catch {}
  imgs = imgs.filter(i => (i.url||i) !== url);
  document.getElementById('pImagesData').value = JSON.stringify(imgs);
  document.getElementById('imgThumbs').innerHTML = imgs.map((img,i) => imageThumbnail(img.url||img, i===0)).join('');
}
function handleImageDrop(e) {
  e.preventDefault();
  document.getElementById('imgDropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) uploadFileToMedia(file, addProductImage);
}

// ════════════════════════════════════════════════════════════
// COLLECTIONS
// ════════════════════════════════════════════════════════════
async function collections() {
  setLoading();
  setBreadcrumb(['Collections']);
  const pb = document.getElementById('topbarPrimaryBtn');
  pb.textContent = '+ New Collection';
  pb.style.display = '';
  pb.onclick = () => showCollectionForm();

  try {
    const data = await apiGet('/collections');
    const colls = data.collections || [];
    setContent(`
      <div class="page-header">
        <div class="page-header-text">
          <h2>Collections</h2>
          <p>${colls.length} collection${colls.length!==1?'s':''} — groupings that appear as category folders</p>
        </div>
        <button class="btn btn-primary" onclick="showCollectionForm()">+ New Collection</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${colls.map(c => `
          <div class="card" style="cursor:pointer" onclick="editCollection('${c.handle}')">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div style="width:42px;height:42px;border-radius:var(--radius-md);background:${c.folder_color||'var(--primary)'};opacity:0.8;display:flex;align-items:center;justify-content:center;font-size:18px">📁</div>
              <div>
                <div style="font-weight:700;color:var(--text-1)">${c.name}</div>
                <div style="font-size:12px;color:var(--text-3)">${c.handle}</div>
              </div>
              <span class="badge ${c.is_visible?'published':'archived'}" style="margin-left:auto">${c.is_visible?'visible':'hidden'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-3)">
              <span>${c.product_count} products</span>
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editCollection('${c.handle}')">Edit</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();deleteCollection('${c.handle}','${c.name}')">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
        <div class="card" style="border-style:dashed;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;min-height:120px;color:var(--text-3)" onclick="showCollectionForm()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          New Collection
        </div>
      </div>
    `);
  } catch(e) {
    setContent(`<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`);
  }
}

function showCollectionForm(c = null) {
  const isEdit = !!c;
  const colors = ['#4A2068','#6B1728','#7A1B4E','#1B4D3E','#753612','#2E4A6B','#43348C'];
  setBreadcrumb(['Collections', isEdit ? 'Edit' : 'New Collection']);
  setContent(`
    <div class="page-header">
      <div class="page-header-text"><h2>${isEdit?'Edit Collection':'New Collection'}</h2></div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" onclick="collections()">← Back</button>
        <button class="btn btn-primary" onclick="saveCollection(${isEdit?`'${c.handle}'`:'null'})">Save</button>
      </div>
    </div>
    <div style="max-width:640px;display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="form-group"><label class="form-label">Name *</label>
          <input class="form-input" id="cName" value="${escHtml(c?.name||'')}"></div>
        <div class="form-group"><label class="form-label">URL Handle</label>
          <input class="form-input" id="cHandle" value="${escHtml(c?.handle||'')}" ${isEdit?'readonly':''}></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea class="form-input form-textarea" id="cDesc">${escHtml(c?.description||'')}</textarea></div>
        <label class="toggle-wrap" style="margin-top:8px">
          <input class="toggle-input" type="checkbox" id="cVisible" ${!c||c.is_visible?'checked':''}>
          <span class="toggle-track"></span>
          <span class="toggle-label">Visible on storefront</span>
        </label>
        <label class="toggle-wrap" style="margin-top:10px">
          <input class="toggle-input" type="checkbox" id="cFeatured" ${c?.is_featured?'checked':''}>
          <span class="toggle-track"></span>
          <span class="toggle-label">Featured collection</span>
        </label>
      </div>
      <div class="card">
        <div class="form-section-title">Folder Appearance</div>
        <div class="form-group"><label class="form-label">Folder Colour</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${colors.map(col=>`<div onclick="selectFolderColor('${col}')" id="fc-${col.slice(1)}"
              style="width:32px;height:32px;border-radius:6px;background:${col};cursor:pointer;border:2px solid ${c?.folder_color===col?'white':'transparent'};transition:border-color .2s"></div>`).join('')}
          </div>
          <input type="hidden" id="cFolderColor" value="${c?.folder_color||colors[0]}">
        </div>
      </div>
    </div>
  `);
}

function selectFolderColor(col) {
  document.querySelectorAll('[id^="fc-"]').forEach(el => el.style.borderColor = 'transparent');
  const el = document.getElementById(`fc-${col.slice(1)}`);
  if (el) el.style.borderColor = 'white';
  document.getElementById('cFolderColor').value = col;
}

async function editCollection(handle) {
  setLoading();
  try {
    const data = await apiGet(`/collections/${handle}`);
    if (data.collection) showCollectionForm(data.collection);
    else { toast('error','Collection not found'); collections(); }
  } catch(e) { toast('error','Failed',e.message); collections(); }
}

async function saveCollection(handle) {
  const body = {
    name:         document.getElementById('cName').value.trim(),
    description:  document.getElementById('cDesc').value,
    is_visible:   document.getElementById('cVisible').checked,
    is_featured:  document.getElementById('cFeatured').checked,
    folder_color: document.getElementById('cFolderColor').value,
    handle:       document.getElementById('cHandle').value.trim() || undefined,
  };
  if (!body.name) { toast('error','Name required'); return; }
  try {
    const data = handle ? await apiPut(`/collections/${handle}`, body) : await apiPost('/collections', body);
    if (data.success) { toast('success', handle?'Collection updated!':'Collection created!'); collections(); }
    else toast('error', data.error||'Save failed');
  } catch(e) { toast('error','Failed',e.message); }
}

async function deleteCollection(handle, name) {
  const ok = await confirm('Delete Collection', `"${name}" will be removed. Products will not be deleted.`);
  if (!ok) return;
  try {
    const data = await apiDelete(`/collections/${handle}`);
    if (data.success) { toast('success','Collection deleted'); collections(); }
    else toast('error', data.error||'Failed');
  } catch(e) { toast('error','Failed',e.message); }
}

// ════════════════════════════════════════════════════════════
// MEDIA LIBRARY
// ════════════════════════════════════════════════════════════
async function media() {
  setLoading();
  setBreadcrumb(['Media Library']);
  const pb = document.getElementById('topbarPrimaryBtn');
  pb.innerHTML = '↑ Upload Image';
  pb.style.display = '';
  pb.onclick = () => document.getElementById('mediaFileInput').click();

  try {
    const data = await apiGet('/media');
    const items = data.media || [];
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Media Library</h2><p>${items.length} image${items.length!==1?'s':''}</p></div>
        <div class="page-header-actions">
          <label class="btn btn-primary">
            ↑ Upload Images
            <input type="file" accept="image/*" multiple id="mediaFileInput" style="display:none" onchange="handleMediaUpload(this)">
          </label>
        </div>
      </div>
      <div class="card">
        <div class="table-toolbar" style="margin-bottom:20px">
          <div class="table-search-wrap" style="max-width:280px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search images…" oninput="filterMedia(this.value)">
          </div>
        </div>
        <div class="media-grid" id="mediaGrid">
          ${items.map(m => mediaCard(m)).join('')}
          ${!items.length ? '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📸</div><h3>No images yet</h3><p>Upload your first product image to get started.</p></div>' : ''}
        </div>
      </div>
    `);
    allMediaCache = items;
  } catch(e) {
    setContent(`<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`);
  }
}

function mediaCard(m) {
  return `<div class="media-item" data-url="${m.url}" data-name="${escHtml(m.filename)}">
    <img src="${m.url}" alt="${escHtml(m.alt_text||m.filename)}" loading="lazy">
    <div class="media-item-overlay"><div class="media-item-name">${m.filename}</div></div>
    <div class="media-item-actions">
      <div class="media-action-btn" onclick="copyUrl('${m.url}')" title="Copy URL">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </div>
    </div>
  </div>`;
}

function filterMedia(query) {
  const q = query.toLowerCase();
  const items = allMediaCache.filter(m => !q || m.filename.toLowerCase().includes(q) || (m.alt_text||'').toLowerCase().includes(q));
  document.getElementById('mediaGrid').innerHTML = items.map(m => mediaCard(m)).join('') || '<div class="empty-state" style="grid-column:1/-1"><p>No results.</p></div>';
}

async function handleMediaUpload(input) {
  const files = Array.from(input.files);
  for (const file of files) {
    await uploadFileToMedia(file);
  }
  media(); // refresh
}

async function uploadFileToMedia(file, callback) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async e => {
      const dataUri = e.target.result;
      toast('info', `Uploading ${file.name}…`, '', 6000);
      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ file: dataUri, original_name: file.name })
        });
        const data = await res.json();
        if (data.success && data.media) {
          toast('success', 'Uploaded!', file.name);
          if (callback) callback(data.media.url);
        } else {
          toast('error', 'Upload failed', data.error || '');
        }
      } catch(err) {
        toast('error', 'Upload failed', err.message);
      }
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => toast('success', 'URL copied!'));
}

// Media picker modal
function openMediaPicker(cb) {
  mediaPickerCallback = cb;
  document.getElementById('mediaPickerOverlay').style.display = 'flex';
  loadMediaPickerGrid();
}
function closeMediaPicker() {
  document.getElementById('mediaPickerOverlay').style.display = 'none';
  mediaPickerCallback = null;
}
async function loadMediaPickerGrid() {
  document.getElementById('mediaPickerGrid').innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const data = await apiGet('/media');
    const items = data.media || [];
    document.getElementById('mediaPickerGrid').innerHTML = items.map(m => `
      <div class="media-item" onclick="selectFromPicker('${m.url}')">
        <img src="${m.url}" alt="${escHtml(m.alt_text||m.filename)}" loading="lazy">
        <div class="media-item-overlay"><div class="media-item-name">${m.filename}</div></div>
      </div>
    `).join('') || '<div class="empty-state" style="grid-column:1/-1"><p>No images yet.</p></div>';
  } catch {
    document.getElementById('mediaPickerGrid').innerHTML = '<div class="empty-state"><p>Failed to load.</p></div>';
  }
}
function selectFromPicker(url) {
  if (mediaPickerCallback) { mediaPickerCallback(url); mediaPickerCallback = null; }
  closeMediaPicker();
}
function filterMediaPicker(q) {
  document.querySelectorAll('#mediaPickerGrid .media-item').forEach(el => {
    el.style.display = el.dataset.name?.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}
async function uploadFromPicker(input) {
  const file = input.files[0];
  if (!file) return;
  await uploadFileToMedia(file, url => { if (mediaPickerCallback) { mediaPickerCallback(url); closeMediaPicker(); } });
  loadMediaPickerGrid();
}

// ════════════════════════════════════════════════════════════
// CAMPAIGNS
// ════════════════════════════════════════════════════════════
const CAMPAIGN_PRESETS = [
  { key:'diwali',      emoji:'🪔', name:'Diwali',      color:'#FF6B2B' },
  { key:'navratri',    emoji:'🌺', name:'Navratri',     color:'#E91E8C' },
  { key:'holi',        emoji:'🎨', name:'Holi',         color:'#FF4081' },
  { key:'lohri',       emoji:'🔥', name:'Lohri',        color:'#FF8C00' },
  { key:'christmas',   emoji:'🎄', name:'Christmas',    color:'#2E7D32' },
  { key:'valentine',   emoji:'💝', name:'Valentine\'s', color:'#C62828' },
  { key:'eid',         emoji:'🌙', name:'Eid',          color:'#1565C0' },
  { key:'summer-sale', emoji:'☀️', name:'Summer Sale',  color:'#F57F17' },
  { key:'wedding',     emoji:'💍', name:'Wedding Season',color:'#6A1B9A' },
  { key:'custom',      emoji:'✨', name:'Custom',        color:'#43348C' },
];

async function campaigns() {
  setLoading();
  setBreadcrumb(['Campaigns']);
  const pb = document.getElementById('topbarPrimaryBtn');
  pb.textContent = '+ New Campaign';
  pb.style.display = '';
  pb.onclick = () => showCampaignForm();

  try {
    const data = await apiGet('/campaigns');
    const camps = data.campaigns || [];
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Campaigns & Seasonal Events</h2><p>Activate festive promotions with one click.</p></div>
        <button class="btn btn-primary" onclick="showCampaignForm()">+ New Campaign</button>
      </div>
      <div class="campaign-grid" id="campaignGrid">
        ${camps.map(c => `
          <div class="campaign-card" onclick="editCampaign(${c.id})">
            <div class="campaign-card-banner" style="${c.primary_color?`background:linear-gradient(135deg,${c.primary_color},${c.primary_color}99)`:''}">
              <span style="font-size:32px">${CAMPAIGN_PRESETS.find(p=>p.key===c.preset)?.emoji||'✨'}</span>
            </div>
            <div class="campaign-card-body">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div class="campaign-card-title">${c.name}</div>
                <span class="badge ${c.status}">${c.status}</span>
              </div>
              <div class="campaign-card-meta">
                ${c.start_date ? new Date(c.start_date).toLocaleDateString('en-IN') : 'No start date'}
                ${c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString('en-IN')}` : ''}
              </div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();toggleCampaignStatus(${c.id},'${c.status}')">
                  ${c.status==='active'?'⏸ Deactivate':'▶ Activate'}
                </button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();deleteCampaign(${c.id},'${c.name}')">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
        <div class="campaign-card" style="cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:200px;border-style:dashed" onclick="showCampaignForm()">
          <div style="text-align:center;color:var(--text-3)">
            <div style="font-size:32px;margin-bottom:8px">+</div>
            <div style="font-size:13px;font-weight:600">New Campaign</div>
          </div>
        </div>
      </div>
    `);
  } catch(e) {
    setContent(`<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`);
  }
}

function showCampaignForm(c = null) {
  const isEdit = !!c;
  setBreadcrumb(['Campaigns', isEdit ? c.name : 'New Campaign']);
  setContent(`
    <div class="page-header">
      <div class="page-header-text"><h2>${isEdit?'Edit Campaign':'New Campaign'}</h2></div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" onclick="campaigns()">← Back</button>
        <button class="btn btn-primary" onclick="saveCampaign(${isEdit?c.id:'null'})">Save Campaign</button>
      </div>
    </div>
    <div style="max-width:720px;display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="form-section-title">Choose a Preset</div>
        <div class="preset-grid" id="presetGrid">
          ${CAMPAIGN_PRESETS.map(p => `
            <div class="preset-card ${c?.preset===p.key?'selected':''}" onclick="selectPreset('${p.key}','${p.color}')" id="preset-${p.key}">
              <span class="preset-emoji">${p.emoji}</span>
              <div class="preset-name">${p.name}</div>
            </div>`).join('')}
        </div>
        <input type="hidden" id="cPreset" value="${c?.preset||'custom'}">
      </div>
      <div class="card">
        <div class="form-group"><label class="form-label">Campaign Name *</label>
          <input class="form-input" id="cCampName" value="${escHtml(c?.name||'')}"></div>
        <div class="form-group"><label class="form-label">Announcement Bar Text</label>
          <input class="form-input" id="cAnnouncement" placeholder="🪔 Diwali Sale — 20% off all orders above ₹999!" value="${escHtml(c?.announcement||'')}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Primary Colour</label>
            <div class="color-field">
              <input type="color" class="color-preview" id="cColorPrev" value="${c?.primary_color||'#43348C'}" oninput="document.getElementById('cPrimaryColor').value=this.value">
              <input class="form-input" id="cPrimaryColor" value="${c?.primary_color||'#43348C'}" oninput="document.getElementById('cColorPrev').value=this.value">
            </div>
          </div>
          <div class="form-group"><label class="form-label">CTA Button Label</label>
            <input class="form-input" id="cCtaLabel" placeholder="Shop Diwali Gifts" value="${escHtml(c?.cta_label||'')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Start Date</label>
            <input class="form-input" type="datetime-local" id="cStartDate" value="${c?.start_date?new Date(c.start_date).toISOString().slice(0,16):''}"></div>
          <div class="form-group"><label class="form-label">End Date</label>
            <input class="form-input" type="datetime-local" id="cEndDate" value="${c?.end_date?new Date(c.end_date).toISOString().slice(0,16):''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-input form-select" id="cCampStatus">
            <option value="draft" ${!c||c.status==='draft'?'selected':''}>Draft</option>
            <option value="scheduled" ${c?.status==='scheduled'?'selected':''}>Scheduled</option>
            <option value="active" ${c?.status==='active'?'selected':''}>Active Now</option>
            <option value="ended" ${c?.status==='ended'?'selected':''}>Ended</option>
          </select>
        </div>
      </div>
    </div>
  `);
}

function selectPreset(key, color) {
  document.querySelectorAll('.preset-card').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById(`preset-${key}`);
  if (el) el.classList.add('selected');
  document.getElementById('cPreset').value = key;
  if (color) {
    document.getElementById('cPrimaryColor').value = color;
    document.getElementById('cColorPrev').value    = color;
  }
}

async function saveCampaign(id) {
  const body = {
    name:          document.getElementById('cCampName').value.trim(),
    announcement:  document.getElementById('cAnnouncement').value,
    preset:        document.getElementById('cPreset').value,
    primary_color: document.getElementById('cPrimaryColor').value,
    cta_label:     document.getElementById('cCtaLabel').value,
    status:        document.getElementById('cCampStatus').value,
    start_date:    document.getElementById('cStartDate').value || null,
    end_date:      document.getElementById('cEndDate').value   || null,
  };
  if (!body.name) { toast('error','Campaign name required'); return; }
  try {
    const data = id ? await apiPut(`/campaigns/${id}`, body) : await apiPost('/campaigns', body);
    if (data.success) { toast('success', id?'Campaign saved!':'Campaign created!'); campaigns(); }
    else toast('error', data.error||'Save failed');
  } catch(e) { toast('error','Failed',e.message); }
}

async function toggleCampaignStatus(id, status) {
  const newStatus = status === 'active' ? 'draft' : 'active';
  try {
    const data = await apiPut(`/campaigns/${id}`, { status: newStatus });
    if (data.success) { toast('success', newStatus==='active'?'Campaign activated!':'Campaign deactivated'); campaigns(); }
    else toast('error', data.error);
  } catch(e) { toast('error','Failed',e.message); }
}

async function editCampaign(id) {
  setLoading();
  try {
    const data = await apiGet(`/campaigns/${id}`);
    if (data.campaign) showCampaignForm(data.campaign);
    else { toast('error','Not found'); campaigns(); }
  } catch(e) { toast('error','Failed',e.message); campaigns(); }
}

async function deleteCampaign(id, name) {
  const ok = await confirm('Delete Campaign', `Remove "${name}"?`);
  if (!ok) return;
  try {
    const data = await apiDelete(`/campaigns/${id}`);
    if (data.success) { toast('success','Deleted'); campaigns(); }
    else toast('error',data.error);
  } catch(e) { toast('error','Failed',e.message); }
}

// ════════════════════════════════════════════════════════════
// WHATSAPP SETTINGS
// ════════════════════════════════════════════════════════════
async function whatsapp() {
  setLoading();
  setBreadcrumb(['WhatsApp Settings']);
  try {
    const data = await apiGet('/settings');
    const s = data.settings || {};
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>WhatsApp Settings</h2><p>Configure the WhatsApp ordering experience for your customers.</p></div>
        <button class="btn btn-primary" onclick="saveWhatsapp()">Save Settings</button>
      </div>
      <div style="max-width:680px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="form-section-title">Contact Number</div>
          <div class="form-group"><label class="form-label">WhatsApp Number *</label>
            <input class="form-input" id="waNumber" placeholder="919354811266" value="${escHtml(s.whatsapp_number||'')}">
            <p class="form-hint">Include country code without +. E.g. 919354811266 for India (+91).</p>
          </div>
          <div style="margin-top:12px;padding:14px;background:var(--admin-surface-2);border-radius:var(--radius-md);font-size:12px;color:var(--text-3)">
            💬 Test link: <a href="https://wa.me/${s.whatsapp_number||''}" target="_blank" style="color:var(--primary)">https://wa.me/${s.whatsapp_number||''}</a>
          </div>
        </div>
        <div class="card">
          <div class="form-section-title">Button Labels</div>
          <div class="form-group"><label class="form-label">Product Page Button</label>
            <input class="form-input" id="waBtnProduct" value="${escHtml(s.whatsapp_btn_product_label||'ORDER VIA WHATSAPP CONCIERGE')}"></div>
          <div class="form-group"><label class="form-label">Cart Checkout Button</label>
            <input class="form-input" id="waBtnCart" value="${escHtml(s.whatsapp_btn_cart_label||'Order on WhatsApp')}"></div>
        </div>
        <div class="card">
          <div class="form-section-title">Message Templates</div>
          <div class="form-group"><label class="form-label">Default Enquiry Message</label>
            <textarea class="form-input form-textarea" id="waDefaultMsg" rows="3">${escHtml(s.whatsapp_default_msg||'')}</textarea></div>
          <div class="form-group"><label class="form-label">Product Order Message</label>
            <textarea class="form-input form-textarea" id="waProductMsg" rows="4">${escHtml(s.whatsapp_product_msg||'')}</textarea>
            <p class="form-hint">Variables: {product_name}, {qty}, {total}</p>
          </div>
          <div class="form-group"><label class="form-label">Cart Checkout Message</label>
            <textarea class="form-input form-textarea" id="waCartMsg" rows="5">${escHtml(s.whatsapp_cart_msg||'')}</textarea>
            <p class="form-hint">Variables: {cart_items}, {total}</p>
          </div>
        </div>
        <div class="card">
          <label class="toggle-wrap">
            <input class="toggle-input" type="checkbox" id="waFloatVisible" ${s.whatsapp_float_visible!=='false'?'checked':''}>
            <span class="toggle-track"></span>
            <span class="toggle-label">Show floating WhatsApp button on storefront</span>
          </label>
        </div>
        <button class="btn btn-primary btn-lg" onclick="saveWhatsapp()">💾 Save WhatsApp Settings</button>
      </div>
    `);
  } catch(e) { setContent(`<div class="empty-state"><h3>Failed</h3><p>${e.message}</p></div>`); }
}

async function saveWhatsapp() {
  const body = {
    whatsapp_number:          document.getElementById('waNumber').value.trim(),
    whatsapp_btn_product_label: document.getElementById('waBtnProduct').value,
    whatsapp_btn_cart_label:  document.getElementById('waBtnCart').value,
    whatsapp_default_msg:     document.getElementById('waDefaultMsg').value,
    whatsapp_product_msg:     document.getElementById('waProductMsg').value,
    whatsapp_cart_msg:        document.getElementById('waCartMsg').value,
    whatsapp_float_visible:   document.getElementById('waFloatVisible').checked ? 'true' : 'false',
  };
  try {
    const data = await apiPost('/settings', body);
    if (data.success) toast('success','WhatsApp settings saved!');
    else toast('error', data.error||'Save failed');
  } catch(e) { toast('error','Failed',e.message); }
}

// ════════════════════════════════════════════════════════════
// STORE SETTINGS
// ════════════════════════════════════════════════════════════
async function settings() {
  setLoading();
  setBreadcrumb(['Store Settings']);
  try {
    const data = await apiGet('/settings');
    const s = data.settings || {};
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Store Settings</h2><p>Manage your store's identity and basic information.</p></div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
      </div>
      <div style="max-width:680px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="form-section-title">Store Identity</div>
          <div class="form-group"><label class="form-label">Store Name</label>
            <input class="form-input" id="sName" value="${escHtml(s.store_name||'House of Bulbul')}"></div>
          <div class="form-group"><label class="form-label">Store Tagline</label>
            <input class="form-input" id="sTagline" value="${escHtml(s.store_tagline||'')}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label>
              <input class="form-input" type="email" id="sEmail" value="${escHtml(s.store_email||'')}"></div>
            <div class="form-group"><label class="form-label">Phone</label>
              <input class="form-input" id="sPhone" value="${escHtml(s.store_phone||'')}"></div>
          </div>
        </div>
        <div class="card">
          <div class="form-section-title">Social Media</div>
          <div class="form-group"><label class="form-label">Instagram</label>
            <input class="form-input" id="sInsta" placeholder="https://instagram.com/houseofbulbul" value="${escHtml(s.instagram_url||'')}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Twitter / X</label>
              <input class="form-input" id="sTwitter" value="${escHtml(s.twitter_url||'')}"></div>
            <div class="form-group"><label class="form-label">Facebook</label>
              <input class="form-input" id="sFacebook" value="${escHtml(s.facebook_url||'')}"></div>
          </div>
        </div>
        <div class="card">
          <div class="form-section-title">Announcement Bar</div>
          <label class="toggle-wrap" style="margin-bottom:14px">
            <input class="toggle-input" type="checkbox" id="sAnnounceVisible" ${s.announcement_visible==='true'?'checked':''}>
            <span class="toggle-track"></span>
            <span class="toggle-label">Show announcement bar on storefront</span>
          </label>
          <div class="form-group"><label class="form-label">Announcement Text</label>
            <input class="form-input" id="sAnnounceText" placeholder="🎉 Free delivery on orders above ₹999!" value="${escHtml(s.announcement_text||'')}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Background</label>
              <div class="color-field">
                <input type="color" class="color-preview" value="${s.announcement_bg||'#43348C'}" oninput="document.getElementById('sAnnounceBg').value=this.value">
                <input class="form-input" id="sAnnounceBg" value="${s.announcement_bg||'#43348C'}">
              </div>
            </div>
            <div class="form-group"><label class="form-label">Text Colour</label>
              <div class="color-field">
                <input type="color" class="color-preview" value="${s.announcement_color||'#FFFFFF'}" oninput="document.getElementById('sAnnounceColor').value=this.value">
                <input class="form-input" id="sAnnounceColor" value="${s.announcement_color||'#FFFFFF'}">
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="saveSettings()">💾 Save All Settings</button>
      </div>
    `);
  } catch(e) { setContent(`<div class="empty-state"><h3>Failed</h3><p>${e.message}</p></div>`); }
}

async function saveSettings() {
  const body = {
    store_name:           document.getElementById('sName').value,
    store_tagline:        document.getElementById('sTagline').value,
    store_email:          document.getElementById('sEmail').value,
    store_phone:          document.getElementById('sPhone').value,
    instagram_url:        document.getElementById('sInsta').value,
    twitter_url:          document.getElementById('sTwitter').value,
    facebook_url:         document.getElementById('sFacebook').value,
    announcement_visible: document.getElementById('sAnnounceVisible').checked ? 'true' : 'false',
    announcement_text:    document.getElementById('sAnnounceText').value,
    announcement_bg:      document.getElementById('sAnnounceBg').value,
    announcement_color:   document.getElementById('sAnnounceColor').value,
  };
  try {
    const data = await apiPost('/settings', body);
    if (data.success) toast('success','Settings saved!');
    else toast('error', data.error||'Failed');
  } catch(e) { toast('error','Failed',e.message); }
}

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════
async function analytics() {
  setLoading();
  setBreadcrumb(['Analytics']);
  try {
    const data = await apiGet('/analytics');
    const events = data.events || {};
    const top    = data.topProducts || [];
    const maxViews = Math.max(...top.map(p=>p.views), 1);
    const eventOrder = ['product_view','collection_view','cart_add','whatsapp_click','cart_checkout','page_view'];
    const eventLabels = { product_view:'Product Views', collection_view:'Collection Views',
      cart_add:'Add to Cart', whatsapp_click:'WhatsApp Clicks', cart_checkout:'Checkout Starts', page_view:'Page Views' };
    const maxEvent = Math.max(...Object.values(events), 1);

    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Analytics</h2><p>Last 30 days · Self-hosted, no external tracking.</p></div>
      </div>
      <div class="analytics-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">Event Breakdown</div></div>
          <div class="event-bars">
            ${eventOrder.map(k => `
              <div class="event-bar-item">
                <div class="event-bar-label">${eventLabels[k]}</div>
                <div class="event-bar-track"><div class="event-bar-fill" style="width:${Math.round(((events[k]||0)/maxEvent)*100)}%"></div></div>
                <div class="event-bar-count">${events[k]||0}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top Viewed Products</div></div>
          ${top.length ? top.map((p,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="font-size:16px;font-weight:800;color:var(--text-4);width:24px">${i+1}</div>
              <img style="width:36px;height:36px;border-radius:6px;object-fit:cover;background:var(--admin-surface-3)" src="${p.primary_image||''}" alt="">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                <div style="width:${Math.round((p.views/maxViews)*100)}%;height:3px;background:var(--primary);border-radius:99px;margin-top:4px"></div>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--primary)">${p.views} views</div>
            </div>`).join('')
          : '<div class="empty-state" style="padding:20px"><p>No view data yet.</p></div>'}
        </div>
      </div>
    `);
  } catch(e) { setContent(`<div class="empty-state"><h3>Failed</h3><p>${e.message}</p></div>`); }
}

// ════════════════════════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════════════════════════
async function auditlog() {
  setLoading();
  setBreadcrumb(['Audit Log']);
  try {
    // Use analytics endpoint which includes recentAudit
    const data = await apiGet('/analytics');
    const logs = data.recentAudit || [];
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Audit Log</h2><p>Complete record of admin actions.</p></div>
      </div>
      <div class="card">
        ${logs.length ? logs.map(a => `
          <div class="audit-item">
            <div class="audit-avatar">${(a.username||'?')[0].toUpperCase()}</div>
            <div style="flex:1">
              <div class="audit-action">
                <strong>${a.username}</strong>
                <span class="audit-badge ${a.action}" style="margin:0 6px">${a.action}</span>
                <strong>${a.entity}</strong>
                ${a.entity_id ? `<span style="color:var(--text-3)"> #${a.entity_id}</span>` : ''}
              </div>
              <div class="audit-meta">${new Date(a.created_at).toLocaleString('en-IN')}</div>
            </div>
          </div>`).join('')
        : '<div class="empty-state"><p>No activity logged yet.</p></div>'}
      </div>
    `);
  } catch(e) { setContent(`<div class="empty-state"><h3>Failed</h3><p>${e.message}</p></div>`); }
}

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════
async function users() {
  setLoading();
  setBreadcrumb(['Admin Users']);
  try {
    const data = await apiGet('/users');
    const us = data.users || [];
    setContent(`
      <div class="page-header">
        <div class="page-header-text"><h2>Admin Users</h2><p>Manage who can access this admin panel.</p></div>
        <button class="btn btn-primary" onclick="showAddUserForm()">+ Add User</button>
      </div>
      <div class="card">
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${us.map(u => `<tr>
                <td><strong>${u.username}</strong>${u.id===currentUser?.id?' <span style="color:var(--primary);font-size:11px">(you)</span>':''}</td>
                <td style="color:var(--text-3)">${u.email}</td>
                <td><span class="badge info">${formatRole(u.role)}</span></td>
                <td style="font-size:12px;color:var(--text-3)">${u.last_login?timeAgo(u.last_login):'Never'}</td>
                <td><span class="badge ${u.is_active?'published':'archived'}">${u.is_active?'Active':'Inactive'}</span></td>
                <td><div class="table-actions">
                  ${u.id !== currentUser?.id ? `<button class="btn btn-ghost btn-sm btn-icon" style="color:var(--danger)" onclick="deleteUser(${u.id},'${u.username}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>` : ''}
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" id="addUserCard" style="display:none;max-width:480px;margin-top:16px">
        <div class="form-section-title">New Admin User</div>
        <div class="form-group"><label class="form-label">Username *</label><input class="form-input" id="uUsername"></div>
        <div class="form-group"><label class="form-label">Email *</label><input class="form-input" type="email" id="uEmail"></div>
        <div class="form-group"><label class="form-label">Password *</label><input class="form-input" type="password" id="uPassword" placeholder="Min 8 characters"></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-input form-select" id="uRole">
            <option value="product_manager">Product Manager</option>
            <option value="content_manager">Content Manager</option>
            <option value="enquiry_manager">Enquiry Manager</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn btn-ghost" onclick="document.getElementById('addUserCard').style.display='none'">Cancel</button>
          <button class="btn btn-primary" onclick="createUser()">Create User</button>
        </div>
      </div>
    `);
  } catch(e) { setContent(`<div class="empty-state"><h3>Failed</h3><p>${e.message}</p></div>`); }
}

function showAddUserForm() { document.getElementById('addUserCard').style.display = ''; }

async function createUser() {
  const body = {
    username: document.getElementById('uUsername').value.trim(),
    email:    document.getElementById('uEmail').value.trim(),
    password: document.getElementById('uPassword').value,
    role:     document.getElementById('uRole').value,
  };
  if (!body.username || !body.email || !body.password) { toast('error','All fields required'); return; }
  try {
    const data = await apiPost('/users', body);
    if (data.success) { toast('success','User created!'); users(); }
    else toast('error', data.error||'Failed');
  } catch(e) { toast('error','Failed',e.message); }
}

async function deleteUser(id, name) {
  const ok = await confirm('Remove User', `Remove admin access for "${name}"?`, 'Remove');
  if (!ok) return;
  toast('info', 'Not yet implemented in this build');
}

// ════════════════════════════════════════════════════════════
// STUB PAGES (visual placeholders for remaining sections)
// ════════════════════════════════════════════════════════════
function customizer() {
  setBreadcrumb(['Visual Customizer']);
  setContent(`
    <div class="page-header">
      <div class="page-header-text"><h2>Visual Customizer</h2><p>Adjust your storefront's colours, typography, and appearance tokens.</p></div>
      <button class="btn btn-primary" onclick="saveCustomizer()">Apply & Publish</button>
    </div>
    <div class="customizer-layout">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="form-section-title">Brand Colours</div>
          ${[
            ['color_primary','Primary (buttons, links)','#43348C'],
            ['color_secondary','Secondary','#5E4EA8'],
            ['color_accent','Accent (lavender tint)','#DFD9F4'],
            ['color_bg_page','Page Background','#FAF9FD'],
            ['color_text_main','Main Text','#1D1733'],
          ].map(([id,label,def]) => `
            <div class="form-group"><label class="form-label">${label}</label>
              <div class="color-field">
                <input type="color" class="color-preview" id="${id}_swatch" value="${def}" oninput="document.getElementById('${id}').value=this.value;previewColor('${id}',this.value)">
                <input class="form-input" id="${id}" value="${def}" oninput="document.getElementById('${id}_swatch').value=this.value">
              </div>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="form-section-title">Typography</div>
          <div class="form-group"><label class="form-label">Heading Font</label>
            <select class="form-input form-select" id="font_heading">
              <option>Outfit</option><option>Plus Jakarta Sans</option><option>Inter</option>
              <option>Playfair Display</option><option>Cormorant Garamond</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Body Font</label>
            <select class="form-input form-select" id="font_body">
              <option>Plus Jakarta Sans</option><option>Inter</option><option>Outfit</option>
            </select>
          </div>
        </div>
      </div>
      <div class="customizer-preview">
        <div class="preview-frame-bar">
          <div class="preview-dot red"></div>
          <div class="preview-dot yellow"></div>
          <div class="preview-dot green"></div>
          <div class="preview-url">houseofbulbul.com</div>
        </div>
        <iframe src="/" id="previewFrame" style="width:100%;height:500px;border:none;pointer-events:none;transform:scale(0.6);transform-origin:top center;height:830px;margin-bottom:-332px"></iframe>
      </div>
    </div>
  `);
}

async function saveCustomizer() {
  const body = {};
  ['color_primary','color_secondary','color_accent','color_bg_page','color_text_main','font_heading','font_body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) body[id] = el.value;
  });
  try {
    const data = await apiPost('/settings', body);
    if (data.success) toast('success','Appearance saved!');
    else toast('error', data.error||'Failed');
  } catch(e) { toast('error','Failed',e.message); }
}

function homepage()   { stubPage('Homepage Builder', 'Drag-and-drop section editor — coming in next release.'); }
function navPage()    { stubPage('Navigation Manager', 'Menu editor — coming in next release.'); }
function seo()        { stubPage('SEO Settings', 'Global SEO defaults and per-collection meta — coming in next release.'); }
function enquiries()  { stubPage('Enquiries', 'WhatsApp order tracking dashboard — coming in next release.'); }

function stubPage(title, msg) {
  setContent(`
    <div class="page-header"><div class="page-header-text"><h2>${title}</h2></div></div>
    <div class="empty-state" style="min-height:300px">
      <div class="empty-state-icon">🚧</div>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>
  `);
}

async function syncFromShopify() {
  toast('info','Shopify sync', 'Run: node import-shopify.js from your project root to re-sync.');
}

// ════════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ════════════════════════════════════════════════════════════
function handleGlobalSearch() {
  const q = document.getElementById('globalSearch').value;
  productSearch = q;
  debounce(() => products(1, q, productStatus), 350)();
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const _debounceMap = {};
function debounce(fn, ms) {
  const key = fn.toString().slice(0,40);
  return (...args) => {
    clearTimeout(_debounceMap[key]);
    _debounceMap[key] = setTimeout(() => fn(...args), ms);
  };
}

// Expose to inline handlers
window.navigate         = navigate;
window.logout           = logout;
window.toggleSidebar    = toggleSidebar;
window.togglePw         = togglePw;
window.cancelConfirm    = cancelConfirm;
window.closeMediaPicker = closeMediaPicker;
window.filterMediaPicker= filterMediaPicker;
window.uploadFromPicker = uploadFromPicker;
window.selectFromPicker = selectFromPicker;

window.editProduct      = editProduct;
window.saveProduct      = saveProduct;
window.deleteProduct    = deleteProduct;
window.duplicateProduct = duplicateProduct;
window.toggleProductStatus = toggleProductStatus;
window.showProductForm  = showProductForm;
window.addVariantRow    = addVariantRow;
window.handleTagKey     = handleTagKey;
window.removeTag        = removeTag;
window.handleImageDrop  = handleImageDrop;
window.removeProductImage = removeProductImage;
window.openMediaPicker  = openMediaPicker;

window.editCollection   = editCollection;
window.saveCollection   = saveCollection;
window.deleteCollection = deleteCollection;
window.showCollectionForm = showCollectionForm;
window.selectFolderColor = selectFolderColor;

window.handleMediaUpload = handleMediaUpload;
window.filterMedia      = filterMedia;
window.copyUrl          = copyUrl;

window.editCampaign     = editCampaign;
window.saveCampaign     = saveCampaign;
window.deleteCampaign   = deleteCampaign;
window.showCampaignForm = showCampaignForm;
window.toggleCampaignStatus = toggleCampaignStatus;
window.selectPreset     = selectPreset;

window.saveWhatsapp     = saveWhatsapp;
window.saveSettings     = saveSettings;
window.saveCustomizer   = saveCustomizer;
window.syncFromShopify  = syncFromShopify;
window.showAddUserForm  = showAddUserForm;
window.createUser       = createUser;
window.deleteUser       = deleteUser;
window.debounce         = debounce;
