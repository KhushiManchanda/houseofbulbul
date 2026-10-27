// ============================================================
// GET /api/admin/analytics  — dashboard statistics
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { cors, ok, err } = require('../../../lib/helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return err(res, 'Method not allowed', 405);

  try {
    const [
      productStats, collectionStats, eventStats, topProducts, recentEnquiries, recentAudit
    ] = await Promise.all([
      // Product counts by status
      sql`SELECT status, COUNT(*)::int AS count FROM products GROUP BY status`,
      // Collection count
      sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_visible) ::int AS visible FROM collections`,
      // Event counts last 30 days
      sql`
        SELECT event_type, COUNT(*)::int AS count
        FROM analytics_events
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY event_type
      `,
      // Top 10 viewed products
      sql`
        SELECT p.id, p.name, p.primary_image, COUNT(e.id)::int AS views
        FROM analytics_events e
        JOIN products p ON p.id::text = e.entity_id
        WHERE e.event_type = 'product_view' AND e.created_at > NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.name, p.primary_image
        ORDER BY views DESC LIMIT 10
      `,
      // Recent enquiries
      sql`SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5`,
      // Recent audit entries
      sql`SELECT username, action, entity, entity_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10`
    ]);

    const events = {};
    (eventStats.rows || []).forEach(r => { events[r.event_type] = r.count; });

    const productCounts = {};
    (productStats.rows || []).forEach(r => { productCounts[r.status] = r.count; });
    productCounts.total = Object.values(productCounts).reduce((a, b) => a + b, 0);

    return ok(res, {
      products: productCounts,
      collections: collectionStats.rows[0] || { total: 0, visible: 0 },
      events,
      topProducts: topProducts.rows || [],
      recentEnquiries: recentEnquiries.rows || [],
      recentAudit: recentAudit.rows || []
    });
  } catch (e) {
    console.error('[analytics]', e);
    return err(res, 'Failed to load analytics', 500);
  }
});
