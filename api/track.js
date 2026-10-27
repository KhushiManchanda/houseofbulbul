// ============================================================
// POST /api/track
// Lightweight storefront event tracker (no cookies, no PII)
// ============================================================
const { sql } = require('../lib/db');
const { cors } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = await new Promise(resolve => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });

    const { event_type, entity_id, session_id } = body;
    const allowed = ['page_view','product_view','collection_view','whatsapp_click','cart_add','cart_checkout'];
    if (!event_type || !allowed.includes(event_type)) return res.status(400).end();

    // Fire and forget — don't await, just respond quickly
    sql`
      INSERT INTO analytics_events (event_type, entity_id, session_id, referrer, user_agent)
      VALUES (${event_type}, ${entity_id || null}, ${session_id || null},
              ${req.headers['referer'] || null}, ${req.headers['user-agent'] || null})
    `.catch(() => {});

    res.status(204).end();
  } catch {
    res.status(500).end();
  }
};
