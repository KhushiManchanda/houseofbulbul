// ============================================================
// GET    /api/admin/collections/[handle]
// PUT    /api/admin/collections/[handle]
// DELETE /api/admin/collections/[handle]
// ============================================================
const { sql } = require('../db');
const { withAuth } = require('../auth');
const { logAction } = require('../audit');
const { cors, ok, err, parseBody, toSlug } = require('../helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  const pathParts = req.url.split('?')[0].split('/');
  const handle = req.query?.handle || pathParts[pathParts.length - 1];
  if (!handle) return err(res, 'Collection handle required', 400);

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM collections WHERE handle = ${handle}`;
      if (!rows[0]) return err(res, 'Collection not found', 404);

      const { rows: products } = await sql`
        SELECT p.id, p.name, p.handle, p.price, p.primary_image, p.status, cp.display_order
        FROM products p
        JOIN collection_products cp ON cp.product_id = p.id
        WHERE cp.collection_handle = ${handle}
        ORDER BY cp.display_order ASC, p.name ASC
      `;
      return ok(res, { collection: rows[0], products });
    } catch (e) {
      return err(res, 'Failed to load collection', 500);
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await parseBody(req);
    try {
      const { rows: ex } = await sql`SELECT * FROM collections WHERE handle = ${handle}`;
      if (!ex[0]) return err(res, 'Collection not found', 404);
      const old = ex[0];

      const { rows } = await sql`
        UPDATE collections SET
          name = ${body.name !== undefined ? body.name.trim() : old.name},
          description = ${body.description !== undefined ? body.description : old.description},
          image_url = ${body.image_url !== undefined ? body.image_url : old.image_url},
          banner_url = ${body.banner_url !== undefined ? body.banner_url : old.banner_url},
          seo_title = ${body.seo_title !== undefined ? body.seo_title : old.seo_title},
          seo_description = ${body.seo_description !== undefined ? body.seo_description : old.seo_description},
          is_visible = ${body.is_visible !== undefined ? !!body.is_visible : old.is_visible},
          is_featured = ${body.is_featured !== undefined ? !!body.is_featured : old.is_featured},
          display_order = ${body.display_order !== undefined ? parseInt(body.display_order,10) : old.display_order},
          template = ${body.template !== undefined ? body.template : old.template},
          folder_color = ${body.folder_color !== undefined ? body.folder_color : old.folder_color},
          folder_doodle = ${body.folder_doodle !== undefined ? body.folder_doodle : old.folder_doodle},
          updated_at = NOW()
        WHERE handle = ${handle}
        RETURNING *
      `;

      // Update product membership if provided
      if (body.product_ids !== undefined && Array.isArray(body.product_ids)) {
        await sql`DELETE FROM collection_products WHERE collection_handle = ${handle}`;
        for (let i = 0; i < body.product_ids.length; i++) {
          await sql`
            INSERT INTO collection_products (collection_handle, product_id, display_order)
            VALUES (${handle}, ${body.product_ids[i]}, ${i}) ON CONFLICT DO NOTHING
          `;
        }
      }

      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'update', entity: 'collection', entityId: handle, before: old, after: rows[0] });
      return ok(res, { collection: rows[0] });
    } catch (e) {
      console.error('[collection PUT]', e);
      return err(res, 'Failed to update collection', 500);
    }
  }

  if (req.method === 'DELETE') {
    if (req.adminUser.role !== 'super_admin') return err(res, 'Only Super Admin can delete collections', 403);
    try {
      const { rows } = await sql`SELECT * FROM collections WHERE handle = ${handle}`;
      if (!rows[0]) return err(res, 'Collection not found', 404);

      await sql`DELETE FROM collections WHERE handle = ${handle}`;
      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'delete', entity: 'collection', entityId: handle, before: rows[0] });
      return ok(res, { message: 'Collection deleted.' });
    } catch (e) {
      return err(res, 'Failed to delete collection', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
