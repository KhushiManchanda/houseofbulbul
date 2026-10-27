// ============================================================
// HOUSE OF BULBUL — CORS & RESPONSE HELPERS
// Shared utilities for all Vercel API routes
// ============================================================

/**
 * Apply CORS headers and handle preflight OPTIONS requests.
 * Returns true if the request was a preflight (caller should return).
 */
function cors(req, res) {
  const allowed = process.env.ADMIN_ORIGIN || 'https://houseofbulbul.com';
  const origin = req.headers['origin'] || '';

  // Allow the configured production origin, localhost for dev
  const isAllowed =
    origin === allowed ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.endsWith('.vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // caller should stop and return
  }
  return false;
}

/** Standard success response */
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

/** Standard error response */
function err(res, message, status = 400, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

/** Parse JSON body safely */
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/** Sanitize a string to a URL slug */
function toSlug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

module.exports = { cors, ok, err, parseBody, toSlug };
