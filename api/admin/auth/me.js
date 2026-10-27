// ============================================================
// GET /api/admin/auth/me
// Returns the currently authenticated admin user's profile
// ============================================================
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { cors, ok, err } = require('../../../lib/helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return err(res, 'Method not allowed', 405);

  try {
    const { rows } = await sql`
      SELECT id, username, email, role, created_at, last_login
      FROM admin_users WHERE id = ${req.adminUser.id}
    `;
    if (!rows[0]) return err(res, 'User not found', 404);
    return ok(res, { user: rows[0] });
  } catch (e) {
    return err(res, 'Could not fetch user', 500);
  }
});
