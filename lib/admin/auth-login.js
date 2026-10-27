// ============================================================
// POST /api/admin/auth/login
// ============================================================
const { sql } = require('../db');
const { signToken, comparePassword } = require('../auth');
const { cors, ok, err, parseBody } = require('../helpers');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return err(res, 'Method not allowed', 405);

  const { username, password } = await parseBody(req);
  if (!username || !password) return err(res, 'Username and password are required.');

  try {
    const { rows } = await sql`
      SELECT id, username, email, password_hash, role, is_active
      FROM admin_users
      WHERE (username = ${username.trim()} OR email = ${username.trim().toLowerCase()})
      LIMIT 1
    `;

    const user = rows[0];
    if (!user || !user.is_active) {
      return err(res, 'Invalid credentials.', 401);
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return err(res, 'Invalid credentials.', 401);

    // Update last login
    await sql`UPDATE admin_users SET last_login = NOW() WHERE id = ${user.id}`;

    const token = signToken({ id: user.id, username: user.username, role: user.role });

    return ok(res, {
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error('[login]', e);
    return err(res, 'Login failed. Please try again.', 500);
  }
};
