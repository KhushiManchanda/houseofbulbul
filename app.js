// ============================================
// HOUSE OF BULBUL — APPLICATION LOGIC
// Header Navigation, Cart Drawer, WhatsApp Checkout & Curated Cards
// ============================================

const cart = {};
let currentCollectionHandle = "all";
let scrollObserver = null;

// #region agent log
function __dbgProductsLayout(screen, hypothesisId) {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const folders = document.getElementById("categoryFoldersGrid");
    const folderItem = document.querySelector(".pure-folder-item");
    const folderRoot = document.querySelector(".folder-root");
    const folderMount = document.querySelector(".pure-folder-mount");
    const collection = document.getElementById("collectionPageSection");
    const grid = document.getElementById("productsGrid");
    const card = document.querySelector("#productsGrid .product-card");
    const tabs = document.querySelector(".filter-tabs");
    const search = document.querySelector(".product-search-box");
    const header = document.querySelector(".collection-page-header");
    const container = document.querySelector(".products-page-container");
    const payload = {
      sessionId: "d2bd2c",
      runId: "pre-fix",
      hypothesisId: hypothesisId || "ALL",
      location: "app.js:__dbgProductsLayout",
      message: "products-page-layout",
      timestamp: Date.now(),
      data: {
        screen,
        vw,
        vh,
        docScrollW: document.documentElement.scrollWidth,
        bodyOverflow: document.documentElement.scrollWidth > vw + 2,
        containerW: container ? Math.round(container.getBoundingClientRect().width) : null,
        foldersDisplay: folders ? getComputedStyle(folders.parentElement).display : null,
        foldersScrollW: folders ? Math.round(folders.scrollWidth) : null,
        foldersClientW: folders ? Math.round(folders.clientWidth) : null,
        folderItemW: folderItem ? Math.round(folderItem.getBoundingClientRect().width) : null,
        folderMountW: folderMount ? Math.round(folderMount.getBoundingClientRect().width) : null,
        folderRootW: folderRoot ? Math.round(folderRoot.getBoundingClientRect().width) : null,
        collectionDisplay: collection ? collection.style.display : null,
        gridW: grid ? Math.round(grid.getBoundingClientRect().width) : null,
        gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
        cardW: card ? Math.round(card.getBoundingClientRect().width) : null,
        cardCount: grid ? grid.querySelectorAll(".product-card").length : 0,
        tabsScrollW: tabs ? Math.round(tabs.scrollWidth) : null,
        tabsClientW: tabs ? Math.round(tabs.clientWidth) : null,
        searchW: search ? Math.round(search.getBoundingClientRect().width) : null,
        headerW: header ? Math.round(header.getBoundingClientRect().width) : null
      }
    };
    fetch("http://127.0.0.1:7668/ingest/81f8ce72-3fd9-4563-b490-c128f7ebeff8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d2bd2c" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
}
// #endregion

// ---------- SCROLL ANIMATION OBSERVER ----------
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.08
  });

  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
    scrollObserver.observe(el);
  });
}

// ---------- MOBILE MENU CONTROLS ----------
function toggleMenu() {
  const menu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("navOverlay");
  const btn = document.getElementById("hamburgerBtn");
  const isOpen = menu?.classList.toggle("open");
  overlay?.classList.toggle("open", !!isOpen);
  btn?.classList.toggle("open", !!isOpen);
}

function closeMenu() {
  document.getElementById("mobileMenu")?.classList.remove("open");
  document.getElementById("navOverlay")?.classList.remove("open");
  document.getElementById("hamburgerBtn")?.classList.remove("open");
}

// ---------- VIEW SWITCHING & HISTORY ROUTING ----------
function showView(view, push = true) {
  closeMenu();
  const homeView = document.getElementById("view-home");
  const catalogueView = document.getElementById("view-catalogue") || document.getElementById("view-products");

  // Nav link active state
  document.getElementById("nav-link-home")?.classList.remove("active");
  document.getElementById("nav-link-catalogue")?.classList.remove("active");
  document.getElementById("nav-link-products")?.classList.remove("active");
  document.getElementById("nav-link-story")?.classList.remove("active");
  document.getElementById("nav-link-contact")?.classList.remove("active");

  if (view === "home") {
    catalogueView?.classList.remove("active");
    homeView?.classList.add("active");
    document.getElementById("nav-link-home")?.classList.add("active");
    if (push) history.pushState({ view: "home" }, "", "#home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(initScrollAnimations, 60);
  } else if (view === "catalogue" || view === "products") {
    homeView?.classList.remove("active");
    catalogueView?.classList.add("active");
    document.getElementById("nav-link-catalogue")?.classList.add("active");
    document.getElementById("nav-link-products")?.classList.add("active");
    
    initCategoryFolders();
    showCategoryFoldersView(push);
  }
}

// ---------- SECTION SMOOTH SCROLLING ----------
function scrollToSection(id) {
  closeMenu();
  const homeView = document.getElementById("view-home");
  const catalogueView = document.getElementById("view-catalogue") || document.getElementById("view-products");

  catalogueView?.classList.remove("active");
  homeView?.classList.add("active");

  document.getElementById("nav-link-home")?.classList.remove("active");
  document.getElementById("nav-link-catalogue")?.classList.remove("active");
  document.getElementById("nav-link-products")?.classList.remove("active");
  document.getElementById("nav-link-story")?.classList.remove("active");
  document.getElementById("nav-link-contact")?.classList.remove("active");

  if (id === "about") {
    document.getElementById("nav-link-story")?.classList.add("active");
  } else if (id === "contact") {
    document.getElementById("nav-link-contact")?.classList.add("active");
  }

  setTimeout(initScrollAnimations, 60);

  setTimeout(() => {
    let targetId = "services-section";
    if (id === "about") targetId = "about-section";
    if (id === "contact") targetId = "contact-section";
    const el = document.getElementById(targetId);
    if (el) {
      el.querySelectorAll('.reveal').forEach(r => r.classList.add('is-visible'));
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, 100);
}

// ---------- MOBILE DRAWER ----------
function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
  document.getElementById("navOverlay").classList.toggle("show");
}

function closeMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
  document.getElementById("navOverlay").classList.remove("show");
}

// ---------- CART DRAWER ----------
function toggleCartDrawer(open) {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartDrawerOverlay");
  const shouldOpen = open !== undefined ? open : !drawer.classList.contains("open");

  if (shouldOpen) {
    drawer.classList.add("open");
    overlay.classList.add("open");
  } else {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }
}

// ---------- FORMAT INR ----------
function formatINR(n) {
  return "₹" + n.toLocaleString("en-IN");
}

// ---------- RENDER HOME COLLECTIONS (PRODUCT CARDS GRID — same as Products Page) ----------
let homeCurrentFilter = 'all';

function renderHomeCollections() {
  renderHomeFilterTabs();
  renderHomeProductsGrid('all');
}

function renderHomeFilterTabs() {
  const tabsContainer = document.getElementById("homeFilterTabs");
  if (!tabsContainer) return;

  const handles = ['all', 'wedding-favours', 'sacred-gifting', 'kanjak-navratri', 'diwali-gifting', 'lohri-sankranti'];
  
  tabsContainer.innerHTML = handles.map(handle => {
    const c = COLLECTIONS[handle];
    if (!c) return '';
    return `<button class="tab-pill ${handle === homeCurrentFilter ? 'active' : ''}" onclick="filterHomeCollection('${handle}')">${c.name}</button>`;
  }).join('');
}

function filterHomeCollection(handle) {
  homeCurrentFilter = handle;

  // Update tab active states
  const tabs = document.querySelectorAll('#homeFilterTabs .tab-pill');
  tabs.forEach(btn => {
    const fnStr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', fnStr.includes(`'${handle}'`));
  });

  renderHomeProductsGrid(handle);
}

function renderHomeProductsGrid(handle) {
  const grid = document.getElementById("homeProductsGrid");
  if (!grid) return;

  const c = COLLECTIONS[handle] || COLLECTIONS['all'];
  if (!c) return;

  // Show up to 8 products on home page for a clean preview
  const items = c.productIds.slice(0, 8).map(id => PRODUCTS[id]).filter(Boolean);

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="no-items-state">
        <strong>No products in this collection yet.</strong>
      </div>`;
    return;
  }

  grid.innerHTML = items.map((p, idx) => {
    const qty = cart[p.id] ? cart[p.id].qty : 0;
    const parsed = parseProductTitle(p.name);
    const isSale = !!p.compareAt;
    const compareHtml = p.compareAt ? `<span class="card-compare-price">${formatINR(p.compareAt)}</span>` : "";

    return `
    <div class="product-card reveal delay-${(idx % 4) + 1}" onclick="openProductFromHome(${p.id})">
      <div class="card-image-wrap">
        <img src="${p.img}" alt="${parsed.mainTitle}" loading="lazy"
             onerror="this.outerHTML='<div style=\\'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#F5F4F9;color:#5E4EA8;\\'><img src=\\'hob-bird-clean.png\\' alt=\\'House of Bulbul\\' style=\\'width:36px;opacity:0.4;\\'></div>'">
        ${isSale ? `<span class="card-corner-badge">SALE</span>` : ''}
        <button class="card-quick-bag-btn ${qty > 0 ? 'in-bag' : ''}" onclick="event.stopPropagation(); quickAddToCart(${p.id})" title="${qty > 0 ? 'In your bag' : 'Add to bag'}" aria-label="Add to bag">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          ${qty > 0 ? `<span class="bag-qty-dot">${qty}</span>` : ''}
        </button>
      </div>
      <div class="card-details">
        <div class="card-sub-category">${parsed.subDesc}</div>
        <h3 class="card-product-name">${parsed.mainTitle}</h3>
        <div class="card-price-row">
          <span class="card-price">${formatINR(p.price)}</span>
          ${compareHtml}
        </div>
      </div>
    </div>`;
  }).join("");

  initScrollAnimations();
}

function openProductFromHome(id) {
  showView("products");
  setTimeout(() => {
    openProductPage(id);
  }, 100);
}

function openCollectionFromHome(handle) {
  showView("products");
  openCollectionPage(handle);
}

// ============================================
// ARCHIVAL CATEGORY FOLDERS (React Bits 3D Folder)
// Pure folders with clean paper inside, no tacky cards, no clumsy spilling images
// ============================================
const CATEGORY_FOLDERS_CONFIG = [
  {
    handle: 'all',
    label: 'All Products',
    color: '#2B124C', // Deep Atelier Royal Violet
    doodle: 'all',
    mode: 'flap',
    productIds: [8660202094804, 8593144676564, 8937520201940]
  },
  {
    handle: 'wedding-favours',
    label: 'Wedding Favours',
    color: '#4A2068', // Royal Amethyst
    doodle: 'wedding',
    mode: 'flap',
    productIds: [8660202094804, 8917166162132, 9043107872980]
  },
  {
    handle: 'sacred-gifting',
    label: 'Sacred Gifting',
    color: '#6B1728', // Sacred Vermilion
    doodle: 'sacred',
    mode: 'flap',
    productIds: [9101532266708, 9043113148628, 8917238513876]
  },
  {
    handle: 'kanjak-navratri',
    label: 'Kanjak & Navratri',
    color: '#7A1B4E', // Festive Rani Pink
    doodle: 'kanjak',
    mode: 'flap',
    productIds: [9102691041492, 9101533085908, 9104557736148]
  },
  {
    handle: 'diwali-gifting',
    label: 'Diwali Gifting',
    color: '#1B4D3E', // Forest Emerald
    doodle: 'diwali',
    mode: 'flap',
    productIds: [8937520201940, 9203442417876, 8955692941524]
  },
  {
    handle: 'lohri-sankranti',
    label: 'Lohri & Sankranti',
    color: '#753612', // Warm Terracotta
    doodle: 'lohri',
    mode: 'flap',
    productIds: [9024483164372, 9024334889172, 9023342870740]
  }
];

let categoryFolderInstances = {};
let categoryFoldersInitialized = false;

function initCategoryFolders() {
  const container = document.getElementById("categoryFoldersGrid");
  if (!container || typeof Folder === "undefined") return;

  if (categoryFoldersInitialized) {
    Object.values(categoryFolderInstances).forEach(inst => {
      inst?.setOpen(false);
      inst?.wake?.();
    });
    return;
  }

  container.innerHTML = "";
  categoryFolderInstances = {};

  CATEGORY_FOLDERS_CONFIG.forEach(cfg => {
    const col = COLLECTIONS[cfg.handle] || COLLECTIONS['all'] || {};
    const colProductIds = col.productIds || [];
    const count = colProductIds.length;

    // High-resolution product photos inside folder (pops and peeks on hover!)
    // Automatically pick top 3 available products with valid images
    const availableProducts = colProductIds
      .map(id => PRODUCTS[id])
      .filter(p => p && p.img && p.img.length > 5);

    const items = (availableProducts.length > 0 ? availableProducts : Object.values(PRODUCTS).slice(0, 3))
      .slice(0, 3)
      .map(p => ({
        image: p.img,
        title: p.name
      }));

    // Pure folder item wrapper (no tacky cards, no badges)
    const folderItemEl = document.createElement("div");
    folderItemEl.className = "pure-folder-item";
    folderItemEl.dataset.category = cfg.handle;

    folderItemEl.innerHTML = `
      <div class="pure-folder-mount" id="folderMount-${cfg.handle}"></div>
      <div class="pure-folder-meta" onclick="onFolderMetaClick('${cfg.handle}')" role="button" tabindex="0" aria-label="Open ${cfg.label} Collection">
        <span class="pure-folder-title">${cfg.label}</span>
        <span class="pure-folder-count">${count} Products</span>
      </div>
    `;

    container.appendChild(folderItemEl);

    const mountEl = folderItemEl.querySelector(`#folderMount-${cfg.handle}`);
    if (mountEl) {
      const folderInstance = new Folder(mountEl, {
        label: cfg.label,
        items: items,
        color: cfg.color,
        doodle: cfg.doodle || 'wedding',
        mode: cfg.mode || 'flap',
        size: 0.98,
        tilt: 0.55,
        bounce: 0.5,
        speed: 1,
        openOn: 'click',
        peek: true,
        draggable: false,
        zoomOnClick: false,
        defaultOpen: false,
        onClick: (event, isOpen) => {
          // Play 3D flap drop open animation before transitioning to collection page
          setTimeout(() => {
            openCollectionPage(cfg.handle);
          }, 480);
        }
      });

      categoryFolderInstances[cfg.handle] = folderInstance;
    }
  });

  categoryFoldersInitialized = true;
}

function onFolderMetaClick(handle) {
  const inst = categoryFolderInstances[handle];
  if (inst) {
    inst.setOpen(true);
    setTimeout(() => {
      openCollectionPage(handle);
    }, 480);
  } else {
    openCollectionPage(handle);
  }
}

// Open collection as a full page
function openCollectionPage(handle, push = true) {
  currentCollectionHandle = handle;

  const foldersSection = document.getElementById("categoryFoldersSection");
  const collectionSection = document.getElementById("collectionPageSection");
  const pdpSection = document.getElementById("productDetailPageSection");
  const titleEl = document.getElementById("currentCollectionTitle");
  const countEl = document.getElementById("currentCollectionCount");
  const tagEl = document.getElementById("currentCollectionTag");

  if (foldersSection) foldersSection.style.display = "none";
  if (pdpSection) pdpSection.style.display = "none";
  if (collectionSection) collectionSection.style.display = "block";

  const c = COLLECTIONS[handle] || COLLECTIONS["all"];
  if (titleEl) titleEl.textContent = c.name || "All Products";
  if (countEl) countEl.textContent = `[ ${(c.productIds || []).length} ITEMS ]`;
  if (tagEl) tagEl.textContent = (c.name || "COLLECTIONS").toUpperCase();

  filterByCollection(handle);

  if (push) {
    history.pushState({ view: "collection", handle: handle }, "", `/collections/${handle}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  // #region agent log
  setTimeout(() => __dbgProductsLayout("collection:" + handle, "B,C,D,E"), 250);
  // #endregion
}

// Show category folders view
function showCategoryFoldersView(push = true) {
  const foldersSection = document.getElementById("categoryFoldersSection");
  const collectionSection = document.getElementById("collectionPageSection");
  const pdpSection = document.getElementById("productDetailPageSection");

  if (pdpSection) pdpSection.style.display = "none";
  if (collectionSection) collectionSection.style.display = "none";
  if (foldersSection) foldersSection.style.display = "block";

  if (push) {
    history.pushState({ view: "products" }, "", "/products");
  }

  // Re-awaken 3D folders and reset open state so they are ready to hover/click again
  Object.values(categoryFolderInstances).forEach(inst => {
    inst?.setOpen(false);
    inst?.wake?.();
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
  // #region agent log
  setTimeout(() => __dbgProductsLayout("folders", "A"), 250);
  // #endregion
}

// ---------- FILTER & RENDER PRODUCTS ----------
function filterByCollection(handle) {
  currentCollectionHandle = handle;

  // Update tabs active state
  document.querySelectorAll(".tab-pill").forEach(btn => {
    const fnStr = btn.getAttribute("onclick") || "";
    btn.classList.toggle("active", fnStr.includes(`'${handle}'`));
  });

  const c = COLLECTIONS[handle] || COLLECTIONS["all"];
  const titleEl = document.getElementById("currentCollectionTitle");
  const colCountEl = document.getElementById("currentCollectionCount");
  if (titleEl) titleEl.textContent = c.name || "All Products";
  if (colCountEl) colCountEl.textContent = `${(c.productIds || []).length} Products`;

  const searchInput = document.getElementById("productSearchInput");
  const query = (searchInput ? searchInput.value : "").trim().toLowerCase();

  let items = c.productIds.map(id => PRODUCTS[id]).filter(Boolean);

  if (query) {
    items = items.filter(p => p.name.toLowerCase().includes(query));
  }

  renderProductsGrid(items);
  // #region agent log
  setTimeout(() => __dbgProductsLayout("grid:" + handle, "B,C"), 80);
  // #endregion
}

function handleProductSearch() {
  filterByCollection(currentCollectionHandle);
}

// Smart Title & Category parser
// Extracts clean main product name and formats secondary keywords into subtle sub-descriptions
function parseProductTitle(raw) {
  if (!raw) return { mainTitle: "Handcrafted Keepsake", subDesc: "House of Bulbul • Bespoke" };

  let clean = raw
    .replace(/\s*\|\s*House of Bulbul/gi, '')
    .replace(/\s*by House of Bulbul/gi, '')
    .trim();

  // Split by pipe | or en-dash – or em-dash —
  const parts = clean.split(/\s*[|–—]\s*/);
  const mainTitle = (parts[0] || clean).trim();
  const subDesc = parts.slice(1).join(" • ").trim();

  return {
    mainTitle: mainTitle,
    subDesc: subDesc || "Handcrafted Ceremonial Keepsake"
  };
}

// Render product cards strictly matching Image 3 Reference:
// Borderless, frameless, editorial photography hero, clean title and category sub-description
function renderProductsGrid(items) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="no-items-state">
        <svg style="margin-bottom:12px; opacity:0.5;" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <strong>No products matched your search.</strong>
        <p style="margin-top:8px; font-size:14px;">Try searching for another keyword or select All Products.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map((p, idx) => {
    const qty = cart[p.id] ? cart[p.id].qty : 0;
    const parsed = parseProductTitle(p.name);
    const isSale = !!p.compareAt;
    const compareHtml = p.compareAt ? `<span class="card-compare-price">${formatINR(p.compareAt)}</span>` : "";

    return `
    <div class="product-card reveal delay-${(idx % 4) + 1}" onclick="openProductPage(${p.id})">
      <!-- Media Wrap (No card-in-card, frameless editorial style) -->
      <div class="card-image-wrap">
        <img src="${p.img}" alt="${parsed.mainTitle}" loading="lazy"
             onerror="this.outerHTML='<div style=\\'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#F5F4F9;color:#5E4EA8;\\'><img src=\\'hob-bird-clean.png\\' alt=\\'House of Bulbul\\' style=\\'width:36px;opacity:0.4;\\'></div>'">
        ${isSale ? `<span class="card-corner-badge">SALE</span>` : ''}
        <button class="card-quick-bag-btn ${qty > 0 ? 'in-bag' : ''}" onclick="event.stopPropagation(); quickAddToCart(${p.id})" title="${qty > 0 ? 'In your bag' : 'Add to bag'}" aria-label="Add to bag">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          ${qty > 0 ? `<span class="bag-qty-dot">${qty}</span>` : ''}
        </button>
      </div>

      <!-- Details (Directly below image, left aligned, editorial aesthetic) -->
      <div class="card-details">
        <div class="card-sub-category">${parsed.subDesc}</div>
        <h3 class="card-product-name">${parsed.mainTitle}</h3>
        <div class="card-price-row">
          <span class="card-price">${formatINR(p.price)}</span>
          ${compareHtml}
        </div>
      </div>
    </div>`;
  }).join("");

  initScrollAnimations();
}

// ---------- CART OPERATIONS ----------
function quickAddToCart(id) {
  const product = PRODUCTS[id];
  if (!product) return;

  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { product, qty: 1 };
  }

  updateCartUI();
  toggleCartDrawer(true);

  // Re-render grid to reflect updated stepper
  const catView = document.getElementById("view-catalogue") || document.getElementById("view-products");
  if (catView && catView.classList.contains("active")) {
    filterByCollection(currentCollectionHandle);
  }
}

function changeQty(id, delta) {
  if (!cart[id]) {
    if (delta > 0 && PRODUCTS[id]) {
      cart[id] = { product: PRODUCTS[id], qty: delta };
    }
  } else {
    cart[id].qty += delta;
    if (cart[id].qty <= 0) {
      delete cart[id];
    }
  }

  updateCartUI();

  // Re-render product grid if visible
  const catView = document.getElementById("view-catalogue") || document.getElementById("view-products");
  if (catView && catView.classList.contains("active")) {
    filterByCollection(currentCollectionHandle);
  }
}

function removeItemFromCart(id) {
  if (cart[id]) {
    delete cart[id];
    updateCartUI();
    const catView = document.getElementById("view-catalogue") || document.getElementById("view-products");
    if (catView && catView.classList.contains("active")) {
      filterByCollection(currentCollectionHandle);
    }
  }
}

function updateCartUI() {
  const items = Object.values(cart).filter(i => i.qty > 0);
  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.product.price), 0);

  // Header Nav Cart pill dot indicator
  const navCountEl = document.getElementById("navCartCount");
  if (navCountEl) {
    navCountEl.style.display = totalCount > 0 ? "inline-block" : "none";
  }

  // Drawer Badge & Subtotal
  const drawerBadge = document.getElementById("drawerBadge");
  if (drawerBadge) {
    drawerBadge.textContent = totalCount === 0 ? "[ 0 ITEMS ]" : `[ ${totalCount} ${totalCount === 1 ? 'ITEM' : 'ITEMS'} ]`;
  }

  const drawerSubtotal = document.getElementById("drawerSubtotal");
  if (drawerSubtotal) {
    drawerSubtotal.textContent = formatINR(subtotal);
  }

  // Drawer Items
  const drawerBody = document.getElementById("drawerItems");
  if (!drawerBody) return;

  if (items.length === 0) {
    drawerBody.innerHTML = `
      <div class="drawer-empty-state">
        <div class="empty-icon-box" style="margin: 0 auto 14px; width:54px; height:54px; border-radius:50%; background:var(--accent-soft-tint); color:var(--accent-purple); display:flex; align-items:center; justify-content:center;">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
        <strong style="font-family:'Outfit', sans-serif; font-size:16px;">Your bag is currently empty</strong>
        <p style="font-size:13px; margin-top:6px; color:var(--text-muted); line-height:1.5;">Explore our curated ceremonial keepsakes and festive collections.</p>
        <button class="btn-solid" style="margin-top:20px; font-size:12px; padding:11px 26px;" onclick="toggleCartDrawer(false); showView('products');">Explore Products</button>
      </div>`;
    return;
  }

  drawerBody.innerHTML = items.map(item => {
    const itemParsed = parseProductTitle(item.product.name);
    return `
    <div class="drawer-item">
      <img src="${item.product.img}" alt="${itemParsed.mainTitle}" onerror="this.src='hob-bird-clean.png'">
      <div class="drawer-item-info">
        <div class="drawer-item-top">
          <div class="drawer-item-title">${itemParsed.mainTitle}</div>
          <div class="drawer-item-price">${formatINR(item.product.price * item.qty)}</div>
        </div>
        <div class="drawer-item-sub">${itemParsed.subDesc}</div>
        <div class="drawer-item-actions">
          <div class="drawer-item-stepper">
            <button class="drawer-stepper-btn" onclick="changeQty(${item.product.id}, -1)" aria-label="Decrease quantity">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span>${item.qty}</span>
            <button class="drawer-stepper-btn" onclick="changeQty(${item.product.id}, 1)" aria-label="Increase quantity">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <button class="drawer-item-remove" onclick="removeItemFromCart(${item.product.id})" aria-label="Remove item">REMOVE</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ---------- WHATSAPP ORDER CHECKOUT ----------
function checkout() {
  const items = Object.values(cart).filter(i => i.qty > 0);
  if (items.length === 0) return;

  let message = "Namaste House of Bulbul.\n\nI would like to place a bespoke order for the following handcrafted items:\n\n";
  let total = 0;

  items.forEach((i, idx) => {
    const lineTotal = i.product.price * i.qty;
    total += lineTotal;
    message += `${idx + 1}. *${i.product.name}*\n   Qty: ${i.qty} pcs | Total: ${formatINR(lineTotal)}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*Grand Total: ${formatINR(total)}*\n\n`;
  message += `Please confirm dispatch timeline and custom packaging. Thank you.`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ---------- HEADER SCROLL LISTENER (TOP NOTCH -> FLOATING CAPSULE MORPH) ----------
function initHeaderScroll() {
  const header = document.querySelector('.header-wrapper');
  if (!header) return;
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 50) {
          header.classList.add('floating');
        } else {
          header.classList.remove('floating');
        }
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================
// BENTO CELEBRATION TAPESTRY (VIDEOS & STORIES)
// Dynamic rendering, scroll reveal physics,
// infinite scroll auto-expansion, and reel lightbox modal
// ============================================

let currentRenderedStoryIndex = 0;
const BENTO_BATCH_SIZE = 8;
let bentoVideoObserver = null;
let bentoScrollObserver = null;

function renderBentoItemHTML(item, idx) {
  const rot = ((idx % 5) - 2) * 1.1;
  const hoverRot = (rot * -0.8).toFixed(1);
  const stickerRot = ((idx % 4) - 1.5) * 2;
  const styleVars = `--entry-rot: ${rot.toFixed(1)}deg; --hover-rot: ${hoverRot}deg; --sticker-rot: ${stickerRot.toFixed(1)}deg;`;

  if (item.type === "video") {
    return `
      <div class="bento-card bento-card-video ratio-${item.ratio || '16-9'} reveal" 
           style="${styleVars}"
           onclick="openReelModal('${item.id}')"
           role="button"
           aria-label="Play ${item.title}">
        
        <video class="bento-video-player" 
               src="${item.videoSrc}" 
               poster="${item.poster || ''}" 
               muted 
               loop 
               playsinline 
               preload="metadata"></video>
        
        <div class="bento-video-scrim-top"></div>
        <div class="bento-video-scrim-bot"></div>

        <div class="bento-video-top-bar">
          <span class="bento-video-badge">${item.badge || 'Event Reel'}</span>
          <button class="bento-sound-btn" onclick="toggleBentoSound(this, event)" title="Toggle Sound" aria-label="Toggle sound">
            <svg class="sound-off-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <svg class="sound-on-icon" style="display:none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
        </div>

        <div class="bento-video-play-hint">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>

        <div class="bento-video-bottom-bar">
          <div class="bento-video-info">
            ${item.tagNote ? `<div class="bento-video-tag-note">${item.tagNote}</div>` : ''}
            <h3 class="bento-video-title">${item.title}</h3>
            <p class="bento-video-subtitle">${item.subtitle}</p>
          </div>
          <span class="bento-btn-open-reel">
            <span>Watch Reel</span>
            <span>&nearr;</span>
          </span>
        </div>
      </div>
    `;
  }

  if (item.type === "subgrid-pair") {
    const pairHtml = item.items.map((subItem, sIdx) => renderBentoItemHTML(subItem, idx * 2 + sIdx)).join("");
    return `<div class="bento-subgrid-pair">${pairHtml}</div>`;
  }

  if (item.type === "image-card") {
    return `
      <a class="bento-card bento-card-image card-square reveal" 
         style="${styleVars}" 
         href="${item.actionUrl || '#'}" 
         target="_blank">
        <img class="bento-square-img" src="${item.img}" alt="${item.title}">
        <div class="bento-square-overlay"></div>
        <div class="bento-square-top">
          <span class="bento-sticker-badge">${item.stickerText || 'Artisanal Keepsake'}</span>
        </div>
        <div class="bento-square-content">
          <div class="bento-square-sub">${item.tag || 'RITUALS'}</div>
          <div class="bento-square-title">${item.title}</div>
        </div>
      </a>
    `;
  }

  if (item.type === "emblem-card") {
    return `
      <a class="bento-card bento-card-emblem card-square reveal" 
         style="${styleVars}" 
         href="${item.actionUrl || '#'}" 
         target="_blank">
        <div class="bento-3d-emblem-wrap"><img src="hob-bird-clean.png" alt="House of Bulbul" style="width: 32px; height: 32px; object-fit: contain;"></div>
        <span class="bento-sticker-badge">${item.stickerText || 'Karigari Heritage'}</span>
        <div class="bento-emblem-title">${item.title}</div>
        <div class="bento-emblem-sub">${item.desc}</div>
      </a>
    `;
  }

  if (item.type === "story-wide") {
    return `
      <div class="bento-card bento-card-story-wide bento-theme-${item.theme || 'cream'} reveal" 
           style="${styleVars}">
        <div>
          <span class="bento-card-tag">${item.tag || 'SACRED TRADITIONS'}</span>
          <div class="bento-typography-specimen">${item.specimen || 'Bulbul Karigari'}</div>
          <h3 class="bento-card-title">${item.title}</h3>
          <p class="bento-card-desc">${item.desc}</p>
        </div>
        <div>
          <a class="bento-card-action" 
             href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(item.whatsappMsg || 'Namaste House of Bulbul.')}" 
             target="_blank">
            <span>${item.actionText || 'Consult Atelier'}</span>
            <span class="arrow">&rarr;</span>
          </a>
        </div>
      </div>
    `;
  }

  if (item.type === "story") {
    return `
      <div class="bento-card bento-theme-${item.theme || 'blush'} reveal" 
           style="${styleVars}">
        <div>
          ${item.stickerText ? `<div class="bento-sticker-badge">${item.stickerText}</div>` : ''}
          <span class="bento-card-tag">${item.tag || 'HEIRLOOM FAVOURS'}</span>
          <h3 class="bento-card-title">${item.title}</h3>
          <p class="bento-card-desc">${item.desc}</p>
        </div>
        <div>
          <a class="bento-card-action" 
             href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(item.whatsappMsg || 'Namaste House of Bulbul.')}" 
             target="_blank">
            <span>${item.actionText || 'Explore Favours'}</span>
            <span class="arrow">&rarr;</span>
          </a>
        </div>
      </div>
    `;
  }

  if (item.type === "swatch") {
    const swatchesHtml = (item.swatches || []).map(s => `
      <div class="bento-swatch-item">
        <div class="bento-swatch-color" style="background: ${s.hex};"></div>
        <span class="bento-swatch-name">${s.name}</span>
      </div>
    `).join('');

    return `
      <div class="bento-card card-compact bento-theme-${item.theme || 'cream'} reveal" 
           style="${styleVars}">
        <div>
          <div class="bento-sticker-badge">Celebration Palette</div>
          <span class="bento-card-tag">${item.subtitle || 'COLOR HARMONY'}</span>
          <h3 class="bento-card-title" style="font-size: 20px; margin-bottom: 8px;">${item.title}</h3>
          <div class="bento-palette-list">
            ${swatchesHtml}
          </div>
        </div>
        <p class="bento-palette-note">${item.note || ''}</p>
      </div>
    `;
  }

  if (item.type === "stickers") {
    const badgesHtml = (item.badges || []).map(b => `
      <div class="bento-cluster-pill">${b}</div>
    `).join('');

    return `
      <div class="bento-card bento-theme-${item.theme || 'sage'} reveal" 
           style="${styleVars}">
        <div>
          <span class="bento-card-tag">${item.tag || 'SACRED CRAFT'}</span>
          <h3 class="bento-card-title" style="font-size: 22px;">${item.title}</h3>
          <div class="bento-badges-cluster">
            ${badgesHtml}
          </div>
        </div>
        <div>
          <a class="bento-card-action" href="${item.instagramUrl || 'https://instagram.com/houseofbulbul'}" target="_blank">
            <span>${item.ctaText || 'View Instagram'}</span>
            <span class="arrow">&rarr;</span>
          </a>
        </div>
      </div>
    `;
  }

  return "";
}

function renderBentoCollage() {
  const collage = document.getElementById("bentoCollage");
  if (!collage || typeof BENTO_COLLAGE === "undefined") return;

  const col1Html = BENTO_COLLAGE.col1.map((item, idx) => renderBentoItemHTML(item, idx)).join("");
  const col2Html = BENTO_COLLAGE.col2.map((item, idx) => renderBentoItemHTML(item, idx + 10)).join("");
  const col3Html = BENTO_COLLAGE.col3.map((item, idx) => renderBentoItemHTML(item, idx + 20)).join("");

  collage.innerHTML = `
    <div class="bento-col bento-col-1">${col1Html}</div>
    <div class="bento-col bento-col-2">${col2Html}</div>
    <div class="bento-col bento-col-3">${col3Html}</div>
  `;

  initBentoVideoObserver();
  initScrollAnimations();
}

// In-view silent video autoplay with zero GPU waste
function initBentoVideoObserver() {
  if (!('IntersectionObserver' in window)) return;

  if (bentoVideoObserver) bentoVideoObserver.disconnect();

  bentoVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target;
      if (entry.isIntersecting) {
        vid.muted = true;
        const p = vid.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, { threshold: 0.25 });

  document.querySelectorAll(".bento-video-player").forEach(v => bentoVideoObserver.observe(v));
}

// In-card Sound Toggle
function toggleBentoSound(btn, event) {
  event.stopPropagation();
  const card = btn.closest(".bento-card-video");
  if (!card) return;
  const vid = card.querySelector(".bento-video-player");
  if (!vid) return;

  const offIcon = btn.querySelector(".sound-off-icon");
  const onIcon = btn.querySelector(".sound-on-icon");

  if (vid.muted) {
    vid.muted = false;
    if (offIcon) offIcon.style.display = "none";
    if (onIcon) onIcon.style.display = "block";
  } else {
    vid.muted = true;
    if (offIcon) offIcon.style.display = "block";
    if (onIcon) onIcon.style.display = "none";
  }
}

// ---------- REEL LIGHTBOX MODAL ----------
function openReelModal(storyId) {
  let story = null;

  // Search in BENTO_COLLAGE
  if (typeof BENTO_COLLAGE !== "undefined") {
    const all = [...BENTO_COLLAGE.col1, ...BENTO_COLLAGE.col2, ...BENTO_COLLAGE.col3];
    story = all.find(s => s && s.id === storyId);
  }

  if (!story || story.type !== "video") return;

  const modal = document.getElementById("reelModal");
  const modalVideo = document.getElementById("reelModalVideo");
  const modalTitle = document.getElementById("reelModalTitle");
  const modalSubtitle = document.getElementById("reelModalSubtitle");
  const modalBadge = document.getElementById("reelModalBadge");
  const whatsappBtn = document.getElementById("reelModalWhatsappBtn");
  const instaBtn = document.getElementById("reelModalInstaBtn");

  if (!modal || !modalVideo) return;

  modalVideo.src = story.videoSrc;
  modalVideo.poster = story.poster || "";
  modalVideo.muted = false;

  if (modalTitle) modalTitle.textContent = story.title;
  if (modalSubtitle) modalSubtitle.textContent = story.subtitle;
  if (modalBadge) modalBadge.textContent = story.badge || "Celebration Story";

  const msg = story.whatsappMsg || `Namaste House of Bulbul. I would like to enquire about ${story.title}.`;
  if (whatsappBtn) {
    whatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
  if (instaBtn) {
    instaBtn.href = story.instagramUrl || "https://instagram.com/houseofbulbul";
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  const p = modalVideo.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function closeReelModal(event) {
  const modal = document.getElementById("reelModal");
  const modalVideo = document.getElementById("reelModalVideo");
  if (!modal) return;

  if (modalVideo) {
    modalVideo.pause();
    modalVideo.src = "";
  }

  modal.classList.remove("open");
  document.body.style.overflow = "";
}

// ============================================
// ============================================
// DEDICATED FULL PRODUCT DETAIL PAGE (Professional E-Commerce Page)
// ============================================
let currentPdpProductId = null;
let currentPdpQty = 1;

function openProductPage(id, push = true) {
  const p = PRODUCTS[id];
  if (!p) return;

  currentPdpProductId = id;
  currentPdpQty = 1;

  // Ensure products view is active
  const homeView = document.getElementById("view-home");
  const catalogueView = document.getElementById("view-catalogue") || document.getElementById("view-products");
  homeView?.classList.remove("active");
  catalogueView?.classList.add("active");
  document.getElementById("nav-link-products")?.classList.add("active");
  document.getElementById("nav-link-home")?.classList.remove("active");

  const foldersSection = document.getElementById("categoryFoldersSection");
  const collectionSection = document.getElementById("collectionPageSection");
  const pdpSection = document.getElementById("productDetailPageSection");

  if (foldersSection) foldersSection.style.display = "none";
  if (collectionSection) collectionSection.style.display = "none";
  if (pdpSection) pdpSection.style.display = "block";

  renderProductDetailPage(id);

  if (push) {
    const slug = p.handle || id;
    history.pushState({ view: "product", id: id }, "", `/products/${slug}`);
  }

  const parsed = parseProductTitle(p.name);
  document.title = `${parsed.mainTitle} — House of Bulbul`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeProductPage(push = true) {
  const foldersSection = document.getElementById("categoryFoldersSection");
  const collectionSection = document.getElementById("collectionPageSection");
  const pdpSection = document.getElementById("productDetailPageSection");

  if (pdpSection) pdpSection.style.display = "none";

  if (currentCollectionHandle) {
    if (collectionSection) collectionSection.style.display = "block";
    filterByCollection(currentCollectionHandle);
    if (push) history.pushState({ view: "collection", handle: currentCollectionHandle }, "", `/collections/${currentCollectionHandle}`);
  } else {
    if (foldersSection) foldersSection.style.display = "block";
    showCategoryFoldersView(push);
    if (push) history.pushState({ view: "products" }, "", `/products`);
  }

  document.title = "House of Bulbul — Handmade Wedding Favours & Festive Keepsakes";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- NATURAL NAVIGATION BACK (Browser Back / Gesture / Button) ----------
function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    const pdpSection = document.getElementById("productDetailPageSection");
    const collectionSection = document.getElementById("collectionPageSection");
    if (pdpSection && pdpSection.style.display !== "none") {
      closeProductPage();
    } else if (collectionSection && collectionSection.style.display !== "none") {
      showCategoryFoldersView();
    } else {
      showView("home");
    }
  }
}

// URL & Hash History Synchronizer (Full SPA SEO & Shopify URL Migration)
function handleRoute() {
  const pathname = window.location.pathname.replace(/\/$/, "");
  const hash = window.location.hash || "";

  // 1. Product Route: /products/:slug, /product/:slug or #product/:id
  if (pathname.startsWith("/products/") || pathname.startsWith("/product/") || hash.startsWith("#product/") || hash.startsWith("#product-")) {
    let raw = "";
    if (pathname.startsWith("/products/")) raw = pathname.replace("/products/", "");
    else if (pathname.startsWith("/product/")) raw = pathname.replace("/product/", "");
    else if (hash.startsWith("#product/")) raw = hash.replace("#product/", "");
    else if (hash.startsWith("#product-")) raw = hash.replace("#product-", "");

    const slug = decodeURIComponent(raw).trim().toLowerCase();

    // Match by handle, numeric id, or title slug
    const found = Object.values(PRODUCTS).find(p => {
      if (p.handle && p.handle.toLowerCase() === slug) return true;
      if (String(p.id) === slug) return true;
      const nameSlug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return nameSlug === slug;
    });

    if (found) {
      openProductPage(found.id, false);
      return;
    } else {
      // Archived / discontinued Shopify product link clicked from Google
      showView("products", false);
      openCollectionPage("all", false);
      showArchivedNotice(slug);
      return;
    }
  }

  // 2. Collection Route: /collections/:handle or #collection/:handle
  if (pathname.startsWith("/collections/") || pathname.startsWith("/collection/") || hash.startsWith("#collection/")) {
    let raw = "";
    if (pathname.startsWith("/collections/")) raw = pathname.replace("/collections/", "");
    else if (pathname.startsWith("/collection/")) raw = pathname.replace("/collection/", "");
    else if (hash.startsWith("#collection/")) raw = hash.replace("#collection/", "");

    const handle = decodeURIComponent(raw).trim().toLowerCase();
    showView("products", false);
    openCollectionPage(handle || "all", false);
    return;
  }

  // 3. Products Catalogue root
  if (pathname === "/products" || pathname === "/catalogue" || hash === "#products" || hash === "#catalogue") {
    showView("products", false);
    showCategoryFoldersView(false);
    return;
  }

  // 4. Default Home
  if (pathname === "" || pathname === "/" || hash === "#home" || hash === "") {
    showView("home", false);
    document.title = "House of Bulbul — Handmade Wedding Favours & Festive Keepsakes";
    return;
  }
}

function showArchivedNotice(slug) {
  const cleanName = slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  let banner = document.getElementById("archivedProductBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "archivedProductBanner";
    banner.className = "archived-product-banner";
    const header = document.querySelector("#collectionPageSection .collection-page-header");
    if (header) {
      header.parentNode.insertBefore(banner, header);
    }
  }

  const waMsg = `Namaste House of Bulbul. I was searching for "${cleanName}". Is this piece available for bespoke made-to-order?`;

  banner.innerHTML = `
    <div class="archived-banner-content">
      <div class="archived-banner-badge">BESPOKE ARCHIVE</div>
      <h3 class="archived-banner-title">Looking for <em>"${cleanName}"</em>?</h3>
      <p class="archived-banner-desc">
        This design was part of our limited celebratory edition or is crafted exclusively upon custom request. 
        Explore our curated collection below or request this exact piece via our artisan concierge.
      </p>
      <div class="archived-banner-actions">
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}" target="_blank" class="archived-banner-wa-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.38a9.9 9.9 0 0 0 4.6 1.11h.01c5.46 0 9.9-4.45 9.9-9.9C22 6.45 17.5 2 12.04 2zm5.92 14.07c-.25.7-1.45 1.34-2 1.42-.53.08-1.19.11-1.92-.12-.44-.14-1.02-.33-1.75-.65-3.08-1.33-5.09-4.42-5.24-4.62-.15-.2-1.26-1.68-1.26-3.2 0-1.53.8-2.28 1.08-2.6.28-.31.62-.39.83-.39.21 0 .42 0 .6.01.19.01.45-.07.7.54.25.61.86 2.1.94 2.25.08.15.13.33.02.53-.11.2-.16.33-.32.5-.16.18-.34.4-.48.54-.16.15-.33.32-.14.63.19.31.85 1.4 1.82 2.27 1.25 1.12 2.31 1.47 2.62 1.63.31.16.49.14.67-.08.18-.22.77-.9.98-1.21.21-.31.42-.26.7-.15.28.1 1.76.83 2.06.98.3.15.5.22.57.35.08.13.08.75-.17 1.44z"/>
          </svg>
          <span>Enquire on WhatsApp Concierge &rarr;</span>
        </a>
        <button class="archived-banner-close" onclick="document.getElementById('archivedProductBanner')?.remove()">Dismiss</button>
      </div>
    </div>
  `;
}

window.addEventListener("popstate", handleRoute);
window.addEventListener("hashchange", handleRoute);

function renderProductDetailPage(id) {
  const p = PRODUCTS[id];
  if (!p) return;

  const parsed = parseProductTitle(p.name);
  const col = COLLECTIONS[currentCollectionHandle] || COLLECTIONS['all'] || {};
  const collectionName = col.name || "Celebratory Keepsakes";

  const compareHtml = p.compareAt ? `
    <span class="pdp-compare-price">${formatINR(p.compareAt)}</span>
    <span class="pdp-discount-badge">${Math.round(((p.compareAt - p.price) / p.compareAt) * 100)}% OFF</span>
  ` : "";

  const layoutEl = document.getElementById("productDetailLayout");
  if (!layoutEl) return;

  layoutEl.innerHTML = `
    <!-- Left Column: Immersive Imagery -->
    <div class="pdp-media-column">
      <div class="pdp-main-image-wrap">
        <img src="${p.img}" alt="${parsed.mainTitle}" id="pdpMainImg">
        ${p.compareAt ? `<span class="pdp-corner-sale">FESTIVE SALE</span>` : `<span class="pdp-corner-badge">HANDCRAFTED</span>`}
      </div>
    </div>

    <!-- Right Column: Product Details & Actions -->
    <div class="pdp-info-column">
      <div class="pdp-kicker-line">
        <span class="pdp-category-kicker">[ ${collectionName.toUpperCase()} ]</span>
        <span class="pdp-stock-status">● IN STOCK</span>
      </div>

      <h1 class="pdp-title">${parsed.mainTitle}</h1>
      <div class="pdp-subdesc-pill">${parsed.subDesc}</div>

      <div class="pdp-price-wrap">
        <span class="pdp-price">${formatINR(p.price)}</span>
        ${compareHtml}
      </div>

      <!-- Quantity Stepper -->
      <div class="pdp-qty-section">
        <span class="pdp-qty-label">QUANTITY:</span>
        <div class="pdp-stepper">
          <button class="pdp-stepper-btn" onclick="changePdpQty(-1)" aria-label="Decrease quantity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <span id="pdpQtyVal">1</span>
          <button class="pdp-stepper-btn" onclick="changePdpQty(1)" aria-label="Increase quantity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pdp-actions">
        <button class="pdp-add-btn" onclick="addPdpProductToCart(${p.id})">
          <span>[ ADD TO BAG ]</span>
        </button>
        <a class="pdp-whatsapp-btn" id="pdpWhatsappLink" href="#" target="_blank">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.38a9.9 9.9 0 0 0 4.6 1.11h.01c5.46 0 9.9-4.45 9.9-9.9C22 6.45 17.5 2 12.04 2zm5.92 14.07c-.25.7-1.45 1.34-2 1.42-.53.08-1.19.11-1.92-.12-.44-.14-1.02-.33-1.75-.65-3.08-1.33-5.09-4.42-5.24-4.62-.15-.2-1.26-1.68-1.26-3.2 0-1.53.8-2.28 1.08-2.6.28-.31.62-.39.83-.39.21 0 .42 0 .6.01.19.01.45-.07.7.54.25.61.86 2.1.94 2.25.08.15.13.33.02.53-.11.2-.16.33-.32.5-.16.18-.34.4-.48.54-.16.15-.33.32-.14.63.19.31.85 1.4 1.82 2.27 1.25 1.12 2.31 1.47 2.62 1.63.31.16.49.14.67-.08.18-.22.77-.9.98-1.21.21-.31.42-.26.7-.15.28.1 1.76.83 2.06.98.3.15.5.22.57.35.08.13.08.75-.17 1.44z"/>
          </svg>
          <span>ORDER VIA WHATSAPP CONCIERGE</span>
        </a>
      </div>

      <!-- Numbered Editorial Accordions -->
      <div class="pdp-accordions">
        <details class="pdp-acc" open>
          <summary class="pdp-acc-summary">
            <span>01. DETAILS</span>
            <span class="pdp-acc-icon">+</span>
          </summary>
          <div class="pdp-acc-body">
            ${p.description || '<p>Artisanal keepsake handcrafted by master generational artisans with authentic devotion.</p>'}
          </div>
        </details>

        <details class="pdp-acc">
          <summary class="pdp-acc-summary">
            <span>02. BESPOKE PACKAGING &amp; CALLIGRAPHY</span>
            <span class="pdp-acc-icon">+</span>
          </summary>
          <div class="pdp-acc-body">
            <p>Each keepsake arrives nestled in signature protective packaging with hand-tied satin ribbons. Complimentary personalized handwritten calligraphy name tags are available upon request for wedding and ceremonial guests.</p>
          </div>
        </details>

        <details class="pdp-acc">
          <summary class="pdp-acc-summary">
            <span>03. CARE &amp; DISPATCH TIMELINES</span>
            <span class="pdp-acc-icon">+</span>
          </summary>
          <div class="pdp-acc-body">
            <p>Handcrafted pieces are dispatched securely across India via premium courier partners. For urgent wedding or festive dates, express timelines can be coordinated through our concierge.</p>
          </div>
        </details>
      </div>
    </div>
  `;

  // Update Breadcrumbs
  const bCollection = document.getElementById("productBreadcrumbCollection");
  const bCurrent = document.getElementById("productBreadcrumbCurrent");
  const bBackText = document.getElementById("productPageBackText");

  if (bCollection) bCollection.textContent = collectionName;
  if (bCurrent) bCurrent.textContent = parsed.mainTitle;
  if (bBackText) bBackText.textContent = `Back to ${collectionName}`;

  updatePdpWhatsappLink(p);
  renderRelatedProducts(p);
}

function changePdpQty(delta) {
  currentPdpQty = Math.max(1, currentPdpQty + delta);
  const qtyEl = document.getElementById("pdpQtyVal");
  if (qtyEl) qtyEl.textContent = String(currentPdpQty);
  updatePdpWhatsappLink();
}

function updatePdpWhatsappLink(product) {
  const p = product || PRODUCTS[currentPdpProductId];
  if (!p) return;
  const btn = document.getElementById("pdpWhatsappLink");
  if (!btn) return;

  const total = p.price * currentPdpQty;
  const msg = `Namaste House of Bulbul.\n\nI would like to place a bespoke order for:\n*${p.name}*\nQuantity: ${currentPdpQty} pcs | Total: ${formatINR(total)}\n\nPlease share dispatch timeline and bespoke packaging options. Thank you!`;
  btn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function addPdpProductToCart(id) {
  const p = PRODUCTS[id] || PRODUCTS[currentPdpProductId];
  if (!p) return;

  if (cart[p.id]) {
    cart[p.id].qty += currentPdpQty;
  } else {
    cart[p.id] = { product: p, qty: currentPdpQty };
  }

  updateCartUI();
  toggleCartDrawer(true);

  // Reset qty stepper on PDP
  const qtyEl = document.getElementById("pdpQtyVal");
  if (qtyEl) qtyEl.textContent = "1";
  currentPdpQty = 1;
}

function renderRelatedProducts(p) {
  const grid = document.getElementById("relatedProductsGrid");
  if (!grid) return;

  const col = COLLECTIONS[currentCollectionHandle] || COLLECTIONS['all'] || {};
  const allIds = col.productIds || [];
  
  // Pick 4 related products excluding current product
  const relatedIds = allIds.filter(id => id !== p.id).slice(0, 4);
  const relatedItems = relatedIds.map(id => PRODUCTS[id]).filter(Boolean);

  if (relatedItems.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = relatedItems.map((rp, idx) => {
    const qty = cart[rp.id] ? cart[rp.id].qty : 0;
    const parsed = parseProductTitle(rp.name);
    const isSale = !!rp.compareAt;
    const compareHtml = rp.compareAt ? `<span class="card-compare-price">${formatINR(rp.compareAt)}</span>` : "";

    return `
    <div class="product-card reveal delay-${(idx % 4) + 1}" onclick="openProductPage(${rp.id})">
      <div class="card-image-wrap">
        <img src="${rp.img}" alt="${parsed.mainTitle}" loading="lazy"
             onerror="this.outerHTML='<div style=\\'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#F5F4F9;color:#5E4EA8;\\'><img src=\\'hob-bird-clean.png\\' alt=\\'House of Bulbul\\' style=\\'width:36px;opacity:0.4;\\'></div>'">
        ${isSale ? `<span class="card-corner-badge">SALE</span>` : ''}
        <button class="card-quick-bag-btn ${qty > 0 ? 'in-bag' : ''}" onclick="event.stopPropagation(); quickAddToCart(${rp.id})" title="${qty > 0 ? 'In your bag' : 'Add to bag'}" aria-label="Add to bag">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          ${qty > 0 ? `<span class="bag-qty-dot">${qty}</span>` : ''}
        </button>
      </div>
      <div class="card-details">
        <div class="card-sub-category">${parsed.subDesc}</div>
        <h3 class="card-product-name">${parsed.mainTitle}</h3>
        <div class="card-price-row">
          <span class="card-price">${formatINR(rp.price)}</span>
          ${compareHtml}
        </div>
      </div>
    </div>`;
  }).join("");

  initScrollAnimations();
}

// Backwards compatibility alias
function openProductModal(id) {
  openProductPage(id);
}

function closeProductModal() {
  closeProductPage();
}

// Close modals on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeReelModal();
    closeProductModal();
  }
});

function handleHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith("#product-")) {
    const prodId = parseInt(hash.replace("#product-", ""), 10);
    if (PRODUCTS[prodId]) {
      openProductPage(prodId);
    }
  }
}

// ---------- INITIALIZE ----------
function initApp() {
  renderHomeCollections();
  renderBentoCollage();
  initScrollAnimations();
  initHeaderScroll();
  handleRoute();
}

document.addEventListener("DOMContentLoaded", initApp);

if (document.readyState === "complete" || document.readyState === "interactive") {
  initApp();
}


