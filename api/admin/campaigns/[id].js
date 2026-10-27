// ============================================================
// GET    /api/admin/campaigns/[id]
// PUT    /api/admin/campaigns/[id]
// DELETE /api/admin/campaigns/[id]
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { logAction } = require('../../../lib/audit');
const { cors, ok, err, parseBody } = require('../../../lib/helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;
  const id = parseInt(req.url.split('?')[0].split('/').pop(), 10);
  if (!id) return err(res, 'Campaign ID required', 400);

  if (req.method === 'GET') {
    const { rows } = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!rows[0]) return err(res, 'Campaign not found', 404);
    return ok(res, { campaign: rows[0] });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await parseBody(req);
    try {
      const { rows: ex } = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
      if (!ex[0]) return err(res, 'Campaign not found', 404);
      const old = ex[0];

      const { rows } = await sql`
        UPDATE campaigns SET
          name = ${body.name !== undefined ? body.name.trim() : old.name},
          description = ${body.description !== undefined ? body.description : old.description},
          status = ${body.status !== undefined ? body.status : old.status},
          preset = ${body.preset !== undefined ? body.preset : old.preset},
          banner_desktop = ${body.banner_desktop !== undefined ? body.banner_desktop : old.banner_desktop},
          banner_mobile = ${body.banner_mobile !== undefined ? body.banner_mobile : old.banner_mobile},
          announcement = ${body.announcement !== undefined ? body.announcement : old.announcement},
          primary_color = ${body.primary_color !== undefined ? body.primary_color : old.primary_color},
          secondary_color = ${body.secondary_color !== undefined ? body.secondary_color : old.secondary_color},
          cta_label = ${body.cta_label !== undefined ? body.cta_label : old.cta_label},
          cta_url = ${body.cta_url !== undefined ? body.cta_url : old.cta_url},
          featured_products = ${JSON.stringify(body.featured_products !== undefined ? body.featured_products : old.featured_products)},
          featured_collections = ${JSON.stringify(body.featured_collections !== undefined ? body.featured_collections : old.featured_collections)},
          page_sections = ${JSON.stringify(body.page_sections !== undefined ? body.page_sections : old.page_sections)},
          start_date = ${body.start_date !== undefined ? body.start_date : old.start_date},
          end_date = ${body.end_date !== undefined ? body.end_date : old.end_date},
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'update', entity: 'campaign', entityId: id, before: old, after: rows[0] });
      return ok(res, { campaign: rows[0] });
    } catch (e) {
      console.error('[campaign PUT]', e);
      return err(res, 'Failed to update campaign', 500);
    }
  }

  if (req.method === 'DELETE') {
    const { rows } = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!rows[0]) return err(res, 'Campaign not found', 404);
    await sql`DELETE FROM campaigns WHERE id = ${id}`;
    await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
      action: 'delete', entity: 'campaign', entityId: id, before: rows[0] });
    return ok(res, { message: 'Campaign deleted.' });
  }

  return err(res, 'Method not allowed', 405);
});
