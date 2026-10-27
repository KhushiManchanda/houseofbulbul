// ============================================================
// GET    /api/admin/products/[id]  — fetch single product
// PUT    /api/admin/products/[id]  — update product
// DELETE /api/admin/products/[id]  — delete product
// ============================================================
const { sql } = require('../db');
const { withAuth } = require('../auth');
const { logAction } = require('../audit');
const { cors, ok, err, parseBody, toSlug } = require('../helpers');

const EDIT_ROLES   = ['super_admin', 'product_manager'];
const DELETE_ROLES = ['super_admin'];

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  // Extract id from URL or query
  const pathParts = req.url.split('?')[0].split('/');
  const rawId = req.query?.id || pathParts[pathParts.length - 1];
  const productId = parseInt(rawId, 10);

  if (!productId || isNaN(productId)) return err(res, 'Invalid product ID', 400);

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT p.*,
          COALESCE(
            (SELECT json_agg(row_to_json(v))
             FROM product_variants v WHERE v.product_id = p.id),
            '[]'
          ) AS variants,
          COALESCE(
            (SELECT array_agg(cp.collection_handle)
             FROM collection_products cp WHERE cp.product_id = p.id),
            '{}'
          ) AS collections
        FROM products p
        WHERE p.id = ${productId}
      `;
      if (!rows[0]) return err(res, 'Product not found', 404);
      return ok(res, { product: rows[0] });
    } catch (e) {
      console.error('[product GET]', e);
      return err(res, 'Failed to load product', 500);
    }
  }

  // ── PUT: update ──────────────────────────────────────────────
  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (!EDIT_ROLES.includes(req.adminUser.role)) return err(res, 'Insufficient permissions', 403);

    const body = await parseBody(req);

    try {
      const { rows: existing } = await sql`SELECT * FROM products WHERE id = ${productId}`;
      if (!existing[0]) return err(res, 'Product not found', 404);
      const old = existing[0];

      // Build update fields
      const name        = body.name       !== undefined ? body.name.trim()       : old.name;
      const handle      = body.handle     !== undefined ? toSlug(body.handle)    : old.handle;
      const short_desc  = body.short_desc !== undefined ? body.short_desc        : old.short_desc;
      const description = body.description !== undefined ? body.description      : old.description;
      const sku         = body.sku        !== undefined ? body.sku               : old.sku;
      const price       = body.price      !== undefined ? parseInt(body.price,10): old.price;
      const compare_at  = body.compare_at !== undefined ? (body.compare_at ? parseInt(body.compare_at,10) : null) : old.compare_at;
      const cost_price  = body.cost_price !== undefined ? (body.cost_price ? parseInt(body.cost_price,10) : null) : old.cost_price;
      const status      = body.status     !== undefined ? body.status            : old.status;
      const featured    = body.featured   !== undefined ? !!body.featured        : old.featured;
      const display_order = body.display_order !== undefined ? parseInt(body.display_order,10) : old.display_order;
      const badge       = body.badge      !== undefined ? body.badge             : old.badge;
      const images      = body.images     !== undefined ? body.images            : old.images;
      const primary_image = body.primary_image !== undefined ? body.primary_image : old.primary_image;
      const tags        = body.tags       !== undefined ? body.tags              : old.tags;
      const seo_title   = body.seo_title  !== undefined ? body.seo_title         : old.seo_title;
      const seo_desc    = body.seo_description !== undefined ? body.seo_description : old.seo_description;

      const { rows: updated } = await sql`
        UPDATE products SET
          name = ${name}, handle = ${handle}, short_desc = ${short_desc},
          description = ${description}, sku = ${sku}, price = ${price},
          compare_at = ${compare_at}, cost_price = ${cost_price},
          status = ${status}, featured = ${featured},
          display_order = ${display_order}, badge = ${badge},
          primary_image = ${primary_image},
          images = ${JSON.stringify(Array.isArray(images) ? images : [])},
          tags = ${JSON.stringify(Array.isArray(tags) ? tags : [])},
          seo_title = ${seo_title}, seo_description = ${seo_desc},
          updated_at = NOW()
        WHERE id = ${productId}
        RETURNING *
      `;

      // Update collection memberships if provided
      if (body.collections !== undefined && Array.isArray(body.collections)) {
        await sql`DELETE FROM collection_products WHERE product_id = ${productId}`;
        for (const ch of body.collections) {
          try {
            await sql`
              INSERT INTO collection_products (collection_handle, product_id, display_order)
              VALUES (${ch}, ${productId}, 0) ON CONFLICT DO NOTHING
            `;
          } catch { /* ignore bad handles */ }
        }
      }

      // Update variants if provided
      if (body.variants !== undefined && Array.isArray(body.variants)) {
        await sql`DELETE FROM product_variants WHERE product_id = ${productId}`;
        for (let vi = 0; vi < body.variants.length; vi++) {
          const v = body.variants[vi];
          await sql`
            INSERT INTO product_variants
              (product_id, option_name, option_value, sku, price, compare_at,
               stock, is_available, image_url, display_order)
            VALUES
              (${productId}, ${v.option_name || 'Option'}, ${v.option_value || ''},
               ${v.sku || null}, ${v.price ? parseInt(v.price,10) : null},
               ${v.compare_at ? parseInt(v.compare_at,10) : null},
               ${parseInt(v.stock || 0, 10)}, ${v.is_available !== false},
               ${v.image_url || null}, ${vi})
          `;
        }
      }

      await logAction({
        userId: req.adminUser.id, username: req.adminUser.username,
        action: 'update', entity: 'product', entityId: productId,
        before: old, after: updated[0]
      });

      return ok(res, { product: updated[0] });
    } catch (e) {
      console.error('[product PUT]', e);
      return err(res, 'Failed to update product', 500);
    }
  }

  // ── DELETE ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!DELETE_ROLES.includes(req.adminUser.role)) return err(res, 'Only Super Admin can delete products', 403);

    try {
      const { rows } = await sql`SELECT * FROM products WHERE id = ${productId}`;
      if (!rows[0]) return err(res, 'Product not found', 404);

      await sql`DELETE FROM products WHERE id = ${productId}`;

      await logAction({
        userId: req.adminUser.id, username: req.adminUser.username,
        action: 'delete', entity: 'product', entityId: productId,
        before: rows[0]
      });

      return ok(res, { message: 'Product deleted successfully.' });
    } catch (e) {
      console.error('[product DELETE]', e);
      return err(res, 'Failed to delete product', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
