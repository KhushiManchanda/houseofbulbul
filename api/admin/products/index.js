// ============================================================
// GET  /api/admin/products        — list with filter/sort/pagination
// POST /api/admin/products        — create new product
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { logAction } = require('../../../lib/audit');
const { cors, ok, err, parseBody, toSlug } = require('../../../lib/helpers');

const ALLOWED_ROLES = ['super_admin', 'product_manager'];

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  // ── GET: list products ──────────────────────────────────────
  if (req.method === 'GET') {
    const q = req.query || {};
    const page     = Math.max(1, parseInt(q.page  || '1', 10));
    const limit    = Math.min(100, parseInt(q.limit || '30', 10));
    const offset   = (page - 1) * limit;
    const search   = q.search ? `%${q.search}%` : null;
    const status   = q.status  || null;   // 'draft'|'published'|'archived'
    const featured = q.featured === 'true' ? true : q.featured === 'false' ? false : null;

    try {
      // Build dynamic WHERE conditions
      const conditions = [];
      const params = [];
      let i = 1;

      if (search) {
        conditions.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i} OR p.handle ILIKE $${i})`);
        params.push(search); i++;
      }
      if (status) {
        conditions.push(`p.status = $${i}`);
        params.push(status); i++;
      }
      if (featured !== null) {
        conditions.push(`p.featured = $${i}`);
        params.push(featured); i++;
      }
      if (q.collection) {
        conditions.push(`EXISTS (SELECT 1 FROM collection_products cp WHERE cp.product_id = p.id AND cp.collection_handle = $${i})`);
        params.push(q.collection); i++;
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const sort  = q.sort === 'price_asc'  ? 'p.price ASC' :
                    q.sort === 'price_desc' ? 'p.price DESC' :
                    q.sort === 'name_asc'   ? 'p.name ASC' :
                    q.sort === 'name_desc'  ? 'p.name DESC' :
                    'p.updated_at DESC';

      const countQuery = `SELECT COUNT(*) FROM products p ${where}`;
      const dataQuery  = `
        SELECT p.id, p.name, p.handle, p.sku, p.price, p.compare_at,
               p.status, p.featured, p.badge, p.primary_image,
               p.display_order, p.updated_at, p.created_at,
               COALESCE(
                 (SELECT array_agg(cp.collection_handle)
                  FROM collection_products cp WHERE cp.product_id = p.id),
                 '{}'
               ) AS collections
        FROM products p ${where}
        ORDER BY ${sort}
        LIMIT $${i} OFFSET $${i + 1}
      `;

      params.push(limit, offset);

      // Use sql.query for dynamic queries
      const [countRes, dataRes] = await Promise.all([
        sql.query(countQuery, params.slice(0, -2)),
        sql.query(dataQuery, params)
      ]);

      const total = parseInt(countRes.rows[0].count, 10);
      return ok(res, {
        products: dataRes.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (e) {
      console.error('[products GET]', e);
      return err(res, 'Failed to load products', 500);
    }
  }

  // ── POST: create product ─────────────────────────────────────
  if (req.method === 'POST') {
    if (!ALLOWED_ROLES.includes(req.adminUser.role)) {
      return err(res, 'Insufficient permissions', 403);
    }

    const body = await parseBody(req);
    const { name, price, status = 'draft' } = body;

    if (!name || name.trim().length < 2) return err(res, 'Product name is required.');
    if (price === undefined || isNaN(parseInt(price, 10))) return err(res, 'A valid price is required.');

    const handle = body.handle ? toSlug(body.handle) : toSlug(name);

    try {
      const { rows: existing } = await sql`SELECT id FROM products WHERE handle = ${handle} LIMIT 1`;
      if (existing.length) return err(res, `A product with handle "${handle}" already exists.`);

      const images = Array.isArray(body.images) ? body.images : [];
      const primaryImage = body.primary_image || (images[0]?.url || null);
      const tags = Array.isArray(body.tags) ? body.tags : [];

      const { rows } = await sql`
        INSERT INTO products
          (id, name, handle, short_desc, description, sku, price, compare_at, cost_price,
           currency, status, featured, display_order, badge, primary_image, images, tags,
           seo_title, seo_description, created_at, updated_at)
        VALUES
          (${body.id || Date.now()}, ${name.trim()}, ${handle},
           ${body.short_desc || null}, ${body.description || null},
           ${body.sku || null}, ${parseInt(price, 10)},
           ${body.compare_at ? parseInt(body.compare_at, 10) : null},
           ${body.cost_price ? parseInt(body.cost_price, 10) : null},
           ${'INR'}, ${status}, ${!!body.featured},
           ${parseInt(body.display_order || 0, 10)},
           ${body.badge || null}, ${primaryImage},
           ${JSON.stringify(images)}, ${JSON.stringify(tags)},
           ${body.seo_title || null}, ${body.seo_description || null},
           NOW(), NOW())
        RETURNING *
      `;

      const product = rows[0];

      // Assign to collections if provided
      if (body.collections && Array.isArray(body.collections)) {
        for (const handle of body.collections) {
          try {
            await sql`
              INSERT INTO collection_products (collection_handle, product_id, display_order)
              VALUES (${handle}, ${product.id}, 0)
              ON CONFLICT DO NOTHING
            `;
          } catch { /* skip invalid handles */ }
        }
      }

      await logAction({
        userId: req.adminUser.id, username: req.adminUser.username,
        action: 'create', entity: 'product', entityId: product.id,
        after: product
      });

      return ok(res, { product }, 201);
    } catch (e) {
      console.error('[products POST]', e);
      return err(res, 'Failed to create product', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
