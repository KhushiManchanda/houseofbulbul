// ============================================================
// GET  /api/admin/users    — list admin users (super_admin only)
// POST /api/admin/users    — create admin user (super_admin only)
// ============================================================
const { sql } = require('../db');
const { withAuth, hashPassword, ROLES } = require('../auth');
const { logAction } = require('../audit');
const { cors, ok, err, parseBody } = require('../helpers');

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;
  if (req.adminUser.role !== 'super_admin') return err(res, 'Super Admin only', 403);

  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT id, username, email, role, is_active, created_at, last_login
      FROM admin_users ORDER BY created_at ASC
    `;
    return ok(res, { users: rows });
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { username, email, password, role } = body;
    if (!username || !email || !password) return err(res, 'Username, email, and password are required.');
    if (password.length < 8) return err(res, 'Password must be at least 8 characters.');
    if (!Object.values(ROLES).includes(role)) return err(res, 'Invalid role.');

    try {
      const hash = await hashPassword(password);
      const { rows } = await sql`
        INSERT INTO admin_users (username, email, password_hash, role)
        VALUES (${username.trim()}, ${email.trim().toLowerCase()}, ${hash}, ${role})
        RETURNING id, username, email, role, is_active, created_at
      `;
      await logAction({ userId: req.adminUser.id, username: req.adminUser.username,
        action: 'create', entity: 'admin_user', entityId: rows[0].id,
        after: { username: rows[0].username, role: rows[0].role } });
      return ok(res, { user: rows[0] }, 201);
    } catch (e) {
      if (e.code === '23505') return err(res, 'Username or email already exists.');
      return err(res, 'Failed to create user', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
}, ['super_admin']);
