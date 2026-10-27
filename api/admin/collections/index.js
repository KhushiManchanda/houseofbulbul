// ============================================================
// GET  /api/admin/collections       — list all collections
// POST /api/admin/collections       — create new collection
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
        SELECT c.*,
          (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_handle = c.handle)::int AS product_count
        FROM collections c
        ORDER BY c.display_order ASC, c.name ASC
      `;
      return ok(res, { collections: rows });
    } catch (e) {
      return err(res, 'Failed to load collections', 500);
    }
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.name || body.name.trim().length < 2) return err(res, 'Collection name is required.');

    const handle = body.handle ? toSlug(body.handle) : toSlug(body.name);
    try {
      const { rows: ex } = await sql`SELECT handle FROM collections WHERE handle = ${handle} LIMIT 1`;
      if (ex.length) return err(res, `Collection "${handle}" already exists.`);

      const { rows } = await sql`
        INSERT INTO collections
          (handle, name, description, image_url, banner_url, seo_title, seo_description,
           is_visible, is_featured, display_order, template, folder_color, folder_doodle)
        VALUES
          (${handle}, ${body.name.trim()}, ${body.description || null},
           ${body.image_url || null}, ${body.banner_url || null},
           ${body.seo_title || null}, ${body.seo_description || null},
           ${body.is_visible !== false}, ${!!body.is_featured},
           ${parseInt(body.display_order || 0, 10)},
           ${body.template || 'standard-grid'},
           ${body.folder_color || null}, ${body.folder_doodle || null})
        RETURNING *
      `;
      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'create', entity: 'collection', entityId: handle, after: rows[0] });
      return ok(res, { collection: rows[0] }, 201);
    } catch (e) {
      console.error('[collections POST]', e);
      return err(res, 'Failed to create collection', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
