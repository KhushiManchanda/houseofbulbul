// ============================================================
// GET  /api/admin/campaigns         — list all campaigns
// POST /api/admin/campaigns         — create campaign
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { logAction } = require('../../../lib/audit');
const { cors, ok, err, parseBody, toSlug } = require('../../../lib/helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, name, slug, description, status, preset,
               banner_desktop, announcement, primary_color,
               start_date, end_date, created_at, updated_at
        FROM campaigns ORDER BY updated_at DESC
      `;
      return ok(res, { campaigns: rows });
    } catch (e) {
      return err(res, 'Failed to load campaigns', 500);
    }
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.name || body.name.trim().length < 2) return err(res, 'Campaign name is required.');

    const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
    try {
      const { rows: ex } = await sql`SELECT id FROM campaigns WHERE slug = ${slug} LIMIT 1`;
      if (ex.length) return err(res, `Campaign slug "${slug}" already exists.`);

      const { rows } = await sql`
        INSERT INTO campaigns
          (name, slug, description, status, preset,
           banner_desktop, banner_mobile, announcement,
           primary_color, secondary_color, cta_label, cta_url,
           featured_products, featured_collections, page_sections,
           start_date, end_date, created_by)
        VALUES
          (${body.name.trim()}, ${slug}, ${body.description || null},
           ${body.status || 'draft'}, ${body.preset || null},
           ${body.banner_desktop || null}, ${body.banner_mobile || null},
           ${body.announcement || null},
           ${body.primary_color || null}, ${body.secondary_color || null},
           ${body.cta_label || null}, ${body.cta_url || null},
           ${JSON.stringify(body.featured_products || [])},
           ${JSON.stringify(body.featured_collections || [])},
           ${JSON.stringify(body.page_sections || [])},
           ${body.start_date || null}, ${body.end_date || null},
           ${req.adminUser.id})
        RETURNING *
      `;
      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'create', entity: 'campaign', entityId: rows[0].id, after: rows[0] });
      return ok(res, { campaign: rows[0] }, 201);
    } catch (e) {
      console.error('[campaigns POST]', e);
      return err(res, 'Failed to create campaign', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
