// ============================================================
// HOUSE OF BULBUL — AUTH UTILITIES
// JWT + bcrypt helpers for admin authentication
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '8h';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production.');
}

// ─── Token helpers ───────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET || 'dev-secret-change-me', { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET || 'dev-secret-change-me');
  } catch {
    return null;
  }
}

// ─── Password helpers ────────────────────────────────────────

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ─── Middleware factory ──────────────────────────────────────

/**
 * Returns a Vercel serverless function middleware that:
 * 1. Reads the Authorization header (Bearer <token>)
 * 2. Verifies the JWT
 * 3. Attaches req.adminUser = { id, username, role }
 * 4. If allowedRoles is provided, checks the user's role
 *
 * Usage in an API route:
 *   const { withAuth } = require('../../lib/auth');
 *   module.exports = withAuth(handler, ['super_admin', 'product_manager']);
 */
function withAuth(handler, allowedRoles = null) {
  return async (req, res) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    req.adminUser = payload;
    return handler(req, res);
  };
}

// ─── Role constants ──────────────────────────────────────────

const ROLES = {
  SUPER_ADMIN:      'super_admin',
  PRODUCT_MANAGER:  'product_manager',
  CONTENT_MANAGER:  'content_manager',
  ENQUIRY_MANAGER:  'enquiry_manager',
};

// Which roles can do what
const PERMISSIONS = {
  manageProducts:    [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER],
  manageCollections: [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER, ROLES.CONTENT_MANAGER],
  manageContent:     [ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER],
  manageCampaigns:   [ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER],
  manageSettings:    [ROLES.SUPER_ADMIN],
  manageUsers:       [ROLES.SUPER_ADMIN],
  viewEnquiries:     [ROLES.SUPER_ADMIN, ROLES.ENQUIRY_MANAGER, ROLES.PRODUCT_MANAGER],
  manageEnquiries:   [ROLES.SUPER_ADMIN, ROLES.ENQUIRY_MANAGER],
  viewAnalytics:     [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER, ROLES.CONTENT_MANAGER],
};

module.exports = { signToken, verifyToken, hashPassword, comparePassword, withAuth, ROLES, PERMISSIONS };
