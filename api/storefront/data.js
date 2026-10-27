// ============================================================
// GET /api/storefront/data
// Public endpoint that returns all published products and
// collections for the storefront — replaces static data.js
// Called by index.html <script> to hydrate PRODUCTS & COLLECTIONS
// ============================================================
const { sql } = require('../../lib/db');
const { cors } = require('../../lib/helpers');

// Cache in memory for 60 seconds to reduce DB load on Vercel serverless
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Serve cache if fresh (production only, or bypass with nocache)
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (!isDev && cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).send(cache);
  }

  try {
    // Fetch published products (featured products first, then by display order and newest)
    const { rows: productRows } = await sql`
      SELECT id, name, handle, price, compare_at, primary_image AS img,
             description, tags, badge, featured, images
      FROM products
      WHERE status = 'published'
      ORDER BY featured DESC, display_order ASC, created_at DESC, name ASC
    `;

    // Fetch visible collections with their product IDs
    const { rows: collRows } = await sql`
      SELECT c.handle, c.name, c.description, c.image_url,
             c.is_featured, c.display_order, c.folder_color, c.folder_doodle,
             COALESCE(
               (SELECT array_agg(cp.product_id ORDER BY cp.display_order ASC)
                FROM collection_products cp WHERE cp.collection_handle = c.handle),
               '{}'
             ) AS product_ids
      FROM collections c
      WHERE c.is_visible = true
      ORDER BY c.display_order ASC
    `;

    // Fetch active settings
    const { rows: settingsRows } = await sql`SELECT key, value FROM site_settings`;
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    // Fetch active campaign (if any)
    const { rows: campaignRows } = await sql`
      SELECT id, name, slug, banner_desktop, banner_mobile, announcement,
             primary_color, secondary_color, cta_label, cta_url,
             featured_products, featured_collections, start_date, end_date
      FROM campaigns
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY start_date DESC NULLS LAST
      LIMIT 1
    `;

    // Build PRODUCTS object (same shape as original data.js)
    const PRODUCTS = {};
    productRows.forEach(p => {
      PRODUCTS[String(p.id)] = {
        id: p.id,
        name: p.name,
        handle: p.handle,
        price: p.price,
        compareAt: p.compare_at || null,
        img: p.img || '',
        description: p.description || '',
        tags: p.tags || [],
        badge: p.badge || null,
        featured: p.featured || false,
        images: p.images || []
      };
    });

    // Build COLLECTIONS object
    const COLLECTIONS = {};
    COLLECTIONS['all'] = {
      name: 'All Products',
      productIds: productRows.map(p => p.id)
    };
    collRows.forEach(c => {
      COLLECTIONS[c.handle] = {
        name: c.name,
        productIds: c.product_ids || [],
        description: c.description || '',
        imageUrl: c.image_url || '',
        isFeatured: c.is_featured,
        folderColor: c.folder_color || null,
        folderDoodle: c.folder_doodle || null,
      };
    });

    const payload = JSON.stringify({
      PRODUCTS,
      COLLECTIONS,
      WHATSAPP_NUMBER: settings.whatsapp_number || '919354811266',
      SETTINGS: {
        store_name: settings.store_name || 'House of Bulbul',
        announcement_visible: settings.announcement_visible === 'true',
        announcement_text: settings.announcement_text || '',
        announcement_bg: settings.announcement_bg || '#43348C',
        announcement_color: settings.announcement_color || '#FFFFFF',
        whatsapp_product_msg: settings.whatsapp_product_msg || '',
        whatsapp_cart_msg: settings.whatsapp_cart_msg || '',
        whatsapp_btn_product_label: settings.whatsapp_btn_product_label || 'ORDER VIA WHATSAPP CONCIERGE',
        whatsapp_btn_cart_label: settings.whatsapp_btn_cart_label || 'Order on WhatsApp',
        color_primary: settings.color_primary || '#43348C',
        color_secondary: settings.color_secondary || '#5E4EA8',
        color_accent: settings.color_accent || '#DFD9F4',
        color_bg_page: settings.color_bg_page || '#FAF9FD',
        color_text_main: settings.color_text_main || '#1D1733',
      },
      ACTIVE_CAMPAIGN: campaignRows[0] || null
    });

    cache = payload;
    cacheTime = Date.now();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).send(payload);
  } catch (e) {
    console.error('[storefront/data]', e);
    return res.status(500).json({ error: 'Failed to load storefront data' });
  }
};
