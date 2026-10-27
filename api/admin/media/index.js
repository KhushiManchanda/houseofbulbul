// ============================================================
// GET  /api/admin/media              — list media library
// POST /api/admin/media/upload       — upload image to Cloudinary
// ============================================================
// Image uploads go to Cloudinary (free tier: 25GB storage).
// The Cloudinary URL is stored in the `media` table.
// Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
//                    CLOUDINARY_API_SECRET
// ============================================================
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sql } = require('../../../lib/db');
const { withAuth } = require('../../../lib/auth');
const { cors, ok, err } = require('../../../lib/helpers');

/**
 * Upload a base64 image to Cloudinary using the unsigned REST API.
 * This avoids the need for the cloudinary SDK (no npm install needed).
 */
async function uploadToCloudinary(base64Data, mimeType, folder = 'houseofbulbul') {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Vercel environment variables.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
  const dataUri  = `data:${mimeType};base64,${base64Data}`;

  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"',
    '',
    dataUri,
    `--${boundary}`,
    'Content-Disposition: form-data; name="folder"',
    '',
    folder,
    `--${boundary}`,
    'Content-Disposition: form-data; name="timestamp"',
    '',
    timestamp,
    `--${boundary}`,
    'Content-Disposition: form-data; name="api_key"',
    '',
    apiKey,
    `--${boundary}`,
    'Content-Disposition: form-data; name="signature"',
    '',
    signature,
    `--${boundary}--`,
  ].join('\r\n');

  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body, 'utf8');
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buf.length,
      }
    };
    const httpReq = https.request(options, httpRes => {
      let data = '';
      httpRes.on('data', c => (data += c));
      httpRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json);
        } catch { reject(new Error('Invalid Cloudinary response')); }
      });
    });
    httpReq.on('error', reject);
    httpReq.write(buf);
    httpReq.end();
  });
}

module.exports = withAuth(async (req, res) => {
  if (cors(req, res)) return;

  // ── GET: list media ──────────────────────────────────────────
  if (req.method === 'GET') {
    const q = req.query || {};
    const folder = q.folder || null;
    const search = q.search ? `%${q.search}%` : null;
    const page   = Math.max(1, parseInt(q.page || '1', 10));
    const limit  = Math.min(100, parseInt(q.limit || '40', 10));
    const offset = (page - 1) * limit;

    try {
      let rows, countRows;
      if (folder && search) {
        ({ rows } = await sql`
          SELECT * FROM media WHERE folder = ${folder} AND (filename ILIKE ${search} OR alt_text ILIKE ${search})
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        ({ rows: countRows } = await sql`
          SELECT COUNT(*) FROM media WHERE folder = ${folder} AND (filename ILIKE ${search} OR alt_text ILIKE ${search})`);
      } else if (folder) {
        ({ rows } = await sql`SELECT * FROM media WHERE folder = ${folder} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        ({ rows: countRows } = await sql`SELECT COUNT(*) FROM media WHERE folder = ${folder}`);
      } else if (search) {
        ({ rows } = await sql`SELECT * FROM media WHERE filename ILIKE ${search} OR alt_text ILIKE ${search} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        ({ rows: countRows } = await sql`SELECT COUNT(*) FROM media WHERE filename ILIKE ${search} OR alt_text ILIKE ${search}`);
      } else {
        ({ rows } = await sql`SELECT * FROM media ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        ({ rows: countRows } = await sql`SELECT COUNT(*) FROM media`);
      }

      return ok(res, {
        media: rows,
        pagination: { page, limit, total: parseInt(countRows[0].count, 10) }
      });
    } catch (e) {
      return err(res, 'Failed to load media', 500);
    }
  }

  // ── POST: upload image ────────────────────────────────────────
  if (req.method === 'POST') {
    // Expect JSON body: { file: "data:image/jpeg;base64,...", alt_text, folder }
    const body = await new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({}); }
      });
      req.on('error', reject);
    });

    if (!body.file) return err(res, 'No file provided.');

    // Parse data URI
    const match = body.file.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return err(res, 'Invalid file format. Provide a base64 data URI.');

    const mimeType  = match[1];
    const base64    = match[2];
    const folder    = body.folder || 'general';
    const altText   = body.alt_text || '';

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(mimeType)) return err(res, 'File type not allowed. Use JPEG, PNG, WebP, GIF, or SVG.');

    // Validate size (max 10 MB base64 ≈ 7.5 MB file)
    if (base64.length > 14_000_000) return err(res, 'File too large. Maximum 10 MB.');

    try {
      let fileUrl, filename, sizeBytes, width = null, height = null;

      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        const result = await uploadToCloudinary(base64, mimeType, `houseofbulbul/${folder}`);
        filename = result.public_id.split('/').pop() + '.' + result.format;
        fileUrl = result.secure_url;
        sizeBytes = result.bytes || 0;
        width = result.width || null;
        height = result.height || null;
      } else {
        // Local upload fallback: save to uploads/ directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const extMap = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg'
        };
        const ext = extMap[mimeType] || 'png';
        filename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(filePath, buffer);

        fileUrl = `/uploads/${filename}`;
        sizeBytes = buffer.length;
      }

      const { rows } = await sql`
        INSERT INTO media (filename, original_name, url, mime_type, size_bytes, width, height, alt_text, folder, uploaded_by)
        VALUES (${filename}, ${body.original_name || filename}, ${fileUrl},
                ${mimeType}, ${sizeBytes}, ${width}, ${height},
                ${altText}, ${folder}, ${req.adminUser.id})
        RETURNING *
      `;
      return ok(res, { media: rows[0] }, 201);
    } catch (e) {
      console.error('[media upload]', e);
      return err(res, e.message || 'Upload failed', 500);
    }
  }

  return err(res, 'Method not allowed', 405);
});
