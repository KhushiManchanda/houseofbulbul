// ============================================================
// HOUSE OF BULBUL — DATABASE CONNECTION UTILITY
// Uses @neondatabase/serverless (Vercel Postgres / Neon)
// ============================================================

const { neon } = require('@neondatabase/serverless');
const { CREATE_TABLES_SQL } = require('./schema');

// Lazy-initialise sql so we don't crash at require-time if env vars are missing
let _sql = null;
function getSql() {
  if (!_sql) {
    const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connStr) throw new Error('Neither DATABASE_URL nor POSTGRES_URL environment variable is set.');
    _sql = neon(connStr);
  }
  return _sql;
}

// Helper to ensure compatibility with code expecting { rows: [...] }
function wrapResult(res) {
  if (Array.isArray(res)) {
    if (!('rows' in res)) {
      res.rows = res;
    }
    if (!('rowCount' in res)) {
      res.rowCount = res.length;
    }
  }
  return res;
}

// Proxy so callers can do: const { sql } = require('./db');  sql`...`
const sql = new Proxy(function(){}, {
  apply: async (_, __, args) => {
    const s = getSql();
    const res = await s(...args);
    return wrapResult(res);
  },
  get: (_, prop) => {
    const s = getSql();
    if (prop === 'query') {
      return async (text, params) => {
        const res = s.query ? await s.query(text, params) : await s(text, ...(params || []));
        return wrapResult(res);
      };
    }
    return s[prop];
  }
});

/**
 * Initialize all tables. Called by the seed script and optionally
 * on first API invocation to ensure tables exist.
 */
async function initDatabase() {
  // Split on semicolons to run each statement individually
  const statements = CREATE_TABLES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10);

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
    } catch (err) {
      // Log but don't crash — table may already exist
      console.error('Schema init warning:', err.message.slice(0, 120));
    }
  }
}

/**
 * Thin wrapper around @vercel/postgres sql template literal.
 * Re-exported so all route files only need to import from lib/db.
 */
module.exports = { sql, initDatabase };
