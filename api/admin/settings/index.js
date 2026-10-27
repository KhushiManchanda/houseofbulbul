// ============================================================
// GET  /api/admin/settings          — fetch all settings
// POST /api/admin/settings          — bulk update settings
// ============================================================
// Settings are stored as key-value pairs in site_settings.
// Values are JSON-serialized strings.
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { logAction } = require('../../../lib/audit');
const { cors, ok, err, parseBody } = require('../../../lib/helpers');

// Default settings applied when the table is empty
const DEFAULT_SETTINGS = {
  // Store identity
  store_name:         'House of Bulbul',
  store_tagline:      'Handmade Wedding Favours & Festive Keepsakes',
  store_email:        'houseofbulbul@gmail.com',
  store_phone:        '+91 93548 11266',
  store_address:      'India',
  store_currency:     'INR',

  // WhatsApp
  whatsapp_number:    '919354811266',
  whatsapp_default_msg: 'Namaste House of Bulbul. I would like to enquire about your bespoke gifting collections.',
  whatsapp_product_msg: 'Namaste House of Bulbul.\n\nI would like to place a bespoke order for:\n*{product_name}*\nQuantity: {qty} pcs | Total: {total}\n\nPlease share dispatch timeline and bespoke packaging options. Thank you!',
  whatsapp_cart_msg:  'Namaste House of Bulbul.\n\nI would like to place a bespoke order for the following handcrafted items:\n\n{cart_items}\n━━━━━━━━━━━━━━━━━━━━\n*Grand Total: {total}*\n\nPlease confirm dispatch timeline and custom packaging. Thank you.',
  whatsapp_btn_product_label: 'ORDER VIA WHATSAPP CONCIERGE',
  whatsapp_btn_cart_label:    'Order on WhatsApp',
  whatsapp_float_visible: 'true',

  // Branding
  logo_url:           '',
  favicon_url:        '',
  og_image:           'https://houseofbulbul.com/hob-owl-logo.png',

  // Social
  instagram_url:      'https://instagram.com/houseofbulbul',
  twitter_url:        '',
  facebook_url:       '',
  pinterest_url:      '',

  // Appearance — CSS token overrides
  color_primary:      '#43348C',
  color_secondary:    '#5E4EA8',
  color_accent:       '#DFD9F4',
  color_bg_page:      '#FAF9FD',
  color_bg_card:      '#F5F4F9',
  color_text_main:    '#1D1733',
  color_text_muted:   '#5F5675',
  color_button_bg:    '#43348C',
  color_button_text:  '#FFFFFF',
  font_heading:       'Outfit',
  font_body:          'Plus Jakarta Sans',
  border_radius:      'rounded',   // rounded | sharp | pill

  // SEO defaults
  seo_title:          'House of Bulbul — Handmade Wedding Favours & Festive Keepsakes',
  seo_description:    'Discover 250+ handcrafted wedding favours, sacred ritual keepsakes, and heirloom festive hampers by House of Bulbul.',
  seo_keywords:       'House of Bulbul, wedding favours, handmade, India',

  // Announcement bar
  announcement_visible: 'false',
  announcement_text:  '',
  announcement_bg:    '#43348C',
  announcement_color: '#FFFFFF',
};

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  // ── GET: fetch all settings ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT key, value FROM site_settings`;
      const settings = { ...DEFAULT_SETTINGS };
      rows.forEach(r => { settings[r.key] = r.value; });
      return ok(res, { settings });
    } catch (e) {
      console.error('[settings GET]', e);
      return err(res, 'Failed to load settings', 500);
    }
  }

  // ── POST: update settings (bulk key-value map) ───────────────
  if (req.method === 'POST') {
    if (req.adminUser.role !== 'super_admin' && req.adminUser.role !== 'content_manager') {
      return err(res, 'Insufficient permissions', 403);
    }

    const body = await parseBody(req);
    if (!body || typeof body !== 'object') return err(res, 'Invalid payload', 400);

    try {
      for (const [key, value] of Object.entries(body)) {
        const strVal = typeof value === 'string' ? value : JSON.stringify(value);
        await sql`
          INSERT INTO site_settings (key, value, updated_at, updated_by)
          VALUES (${key}, ${strVal}, NOW(), ${req.adminUser.id})
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
        `;
      }

      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'update', entity: 'settings', entityId: 'bulk', after: body });

      return ok(res, { message: `${Object.keys(body).length} setting(s) saved.` });
    } catch (e) {
      console.error('[settings POST]', e);
      return err(res, 'Failed to save settings', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
