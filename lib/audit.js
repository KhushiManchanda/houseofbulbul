// ============================================================
// HOUSE OF BULBUL — AUDIT LOG UTILITY
// Records important admin actions to the audit_log table
// ============================================================

const { sql } = require('./db');

/**
 * Write an audit log entry.
 *
 * @param {object} params
 * @param {number|null} params.userId
 * @param {string} params.username
 * @param {string} params.action   - e.g. 'create' | 'update' | 'delete' | 'publish'
 * @param {string} params.entity   - e.g. 'product' | 'collection' | 'campaign' | 'setting'
 * @param {string} params.entityId
 * @param {object|null} params.before
 * @param {object|null} params.after
 * @param {string|null} params.ip
 */
async function logAction({ userId, username, action, entity, entityId, before = null, after = null, ip = null }) {
  try {
    await sql`
      INSERT INTO audit_log
        (user_id, username, action, entity, entity_id, before_data, after_data, ip_address)
      VALUES
        (${userId || null}, ${username || 'system'}, ${action}, ${entity},
         ${String(entityId || '')},
         ${before ? JSON.stringify(before) : null},
         ${after  ? JSON.stringify(after)  : null},
         ${ip || null})
    `;
  } catch (e) {
    // Audit failures must never break the main operation
    console.error('[audit] Failed to write log:', e.message);
  }
}

module.exports = { logAction };
