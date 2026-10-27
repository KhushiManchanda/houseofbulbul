#!/usr/bin/env node
// ============================================================
// HOUSE OF BULBUL — DATABASE SEED SCRIPT
// Seeds the Vercel Postgres database from the existing data.js
// and creates the first admin user.
//
// Usage:
//   node scripts/seed-database.js
//
// Required environment variables (.env.local or shell):
//   POSTGRES_URL           - Vercel Postgres connection string
//   ADMIN_USERNAME         - First admin username (default: admin)
//   ADMIN_EMAIL            - First admin email
//   ADMIN_PASSWORD         - First admin password (min 8 chars)
// ============================================================

require('dotenv').config({ path: '.env.local' });

const path = require('path');
const { sql, initDatabase } = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const { CREATE_TABLES_SQL } = require('../lib/schema');

// Load existing data.js to extract current products and collections
async function loadExistingData() {
  try {
    const dataPath = path.join(__dirname, '..', 'data.js');
    const fs = require('fs');
    const code = fs.readFileSync(dataPath, 'utf8');
    // Execute in isolated scope to get the globals
    const fn = new Function(code + '\nreturn { PRODUCTS: typeof PRODUCTS !== "undefined" ? PRODUCTS : {}, COLLECTIONS: typeof COLLECTIONS !== "undefined" ? COLLECTIONS : {}, WHATSAPP_NUMBER: typeof WHATSAPP_NUMBER !== "undefined" ? WHATSAPP_NUMBER : "919354811266" };');
    return fn();
  } catch (e) {
    console.warn('[seed] Could not load data.js:', e.message);
    return { PRODUCTS: {}, COLLECTIONS: {}, WHATSAPP_NUMBER: '919354811266' };
  }
}

async function seed() {
  console.log('\n🌱 House of Bulbul — Database Seed\n');

  // 1. Initialize tables
  console.log('📋 Creating database tables...');
  await initDatabase();
  console.log('   ✓ Tables ready.\n');

  // 2. Check if already seeded
  const { rows: existingProducts } = await sql`SELECT COUNT(*)::int AS count FROM products`;
  if (existingProducts[0].count > 0) {
    console.log(`⚠️  Database already has ${existingProducts[0].count} products. Skipping product seed.`);
    console.log('   Run with --force to re-seed (WARNING: this will delete existing data).\n');
    if (!process.argv.includes('--force')) {
      await seedAdmin();
      return;
    }
    console.log('   --force detected. Clearing and re-seeding...');
    await sql`TRUNCATE products, collection_products, collections CASCADE`;
  }

  // 3. Load existing data.js
  console.log('📦 Loading products from existing data.js...');
  const { PRODUCTS, COLLECTIONS, WHATSAPP_NUMBER } = await loadExistingData();
  const productIds = Object.keys(PRODUCTS);
  console.log(`   Found ${productIds.length} products and ${Object.keys(COLLECTIONS).length} collections.\n`);

  // 4. Seed default collections (excluding 'all' which is virtual)
  console.log('📁 Seeding collections...');
  const collectionOrder = { 'wedding-favours': 1, 'sacred-gifting': 2, 'kanjak-navratri': 3, 'diwali-gifting': 4, 'lohri-sankranti': 5 };
  const folderColors = {
    'wedding-favours':  '#4A2068',
    'sacred-gifting':   '#6B1728',
    'kanjak-navratri':  '#7A1B4E',
    'diwali-gifting':   '#1B4D3E',
    'lohri-sankranti':  '#753612',
  };
  const folderDoodles = {
    'wedding-favours': 'wedding', 'sacred-gifting': 'sacred',
    'kanjak-navratri': 'kanjak', 'diwali-gifting': 'diwali', 'lohri-sankranti': 'lohri'
  };

  let collSeeded = 0;
  for (const [handle, col] of Object.entries(COLLECTIONS)) {
    if (handle === 'all') continue;
    try {
      await sql`
        INSERT INTO collections (handle, name, display_order, folder_color, folder_doodle, is_visible)
        VALUES (${handle}, ${col.name}, ${collectionOrder[handle] || 99},
                ${folderColors[handle] || '#43348C'}, ${folderDoodles[handle] || 'wedding'}, true)
        ON CONFLICT (handle) DO NOTHING
      `;
      collSeeded++;
    } catch (e) {
      console.warn(`   ⚠ Could not seed collection "${handle}":`, e.message);
    }
  }
  console.log(`   ✓ ${collSeeded} collections seeded.\n`);

  // 5. Seed products in batches
  console.log('🛒 Seeding products...');
  let prodSeeded = 0, prodFailed = 0;
  const batchSize = 20;

  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    for (const idStr of batch) {
      const p = PRODUCTS[idStr];
      if (!p) continue;
      try {
        const images = p.img ? JSON.stringify([{ url: p.img, alt: p.name, order: 0 }]) : '[]';
        await sql`
          INSERT INTO products
            (id, name, handle, description, price, compare_at, primary_image, images,
             tags, status, display_order, created_at, updated_at)
          VALUES
            (${p.id}, ${p.name || ''}, ${p.handle || String(p.id)},
             ${p.description || null}, ${p.price || 0},
             ${p.compareAt || null}, ${p.img || null}, ${images},
             ${JSON.stringify(p.tags || [])}, 'published', 0, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        prodSeeded++;
      } catch (e) {
        prodFailed++;
        if (prodFailed <= 3) console.warn(`   ⚠ Failed product ${p.id}:`, e.message.slice(0, 80));
      }
    }
    process.stdout.write(`\r   Seeded ${Math.min(i + batchSize, productIds.length)} / ${productIds.length}...`);
  }
  console.log(`\n   ✓ ${prodSeeded} products seeded. ${prodFailed} failed.\n`);

  // 6. Seed collection-product memberships
  console.log('🔗 Linking products to collections...');
  let linkCount = 0;
  for (const [handle, col] of Object.entries(COLLECTIONS)) {
    if (handle === 'all') continue;
    const ids = col.productIds || [];
    for (let i = 0; i < ids.length; i++) {
      try {
        await sql`
          INSERT INTO collection_products (collection_handle, product_id, display_order)
          VALUES (${handle}, ${ids[i]}, ${i}) ON CONFLICT DO NOTHING
        `;
        linkCount++;
      } catch { /* skip missing products */ }
    }
  }
  console.log(`   ✓ ${linkCount} product-collection links created.\n`);

  // 7. Seed default settings
  console.log('⚙️  Seeding default site settings...');
  const defaults = {
    whatsapp_number: WHATSAPP_NUMBER || '919354811266',
    store_name: 'House of Bulbul',
    store_tagline: 'Handmade Wedding Favours & Festive Keepsakes',
    store_email: 'houseofbulbul@gmail.com',
    store_phone: '+91 93548 11266',
    instagram_url: 'https://instagram.com/houseofbulbul',
    seo_title: 'House of Bulbul — Handmade Wedding Favours & Festive Keepsakes',
    seo_description: 'Discover 250+ handcrafted wedding favours, sacred ritual keepsakes, and heirloom festive hampers.',
    color_primary: '#43348C',
    color_secondary: '#5E4EA8',
    announcement_visible: 'false',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await sql`
      INSERT INTO site_settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO NOTHING
    `;
  }
  console.log('   ✓ Default settings seeded.\n');

  await seedAdmin();
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email    = process.env.ADMIN_EMAIL    || 'admin@houseofbulbul.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.log('⚠️  ADMIN_PASSWORD not set. Skipping admin user creation.');
    console.log('   Set ADMIN_PASSWORD in .env.local and run again.\n');
    return;
  }

  const { rows: existing } = await sql`SELECT id FROM admin_users WHERE username = ${username} LIMIT 1`;
  if (existing.length) {
    console.log(`   ✓ Admin user "${username}" already exists. Skipping.\n`);
    return;
  }

  const hash = await hashPassword(password);
  await sql`
    INSERT INTO admin_users (username, email, password_hash, role)
    VALUES (${username}, ${email}, ${hash}, 'super_admin')
  `;
  console.log(`\n🔐 Admin user created:`);
  console.log(`   Username : ${username}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Role     : super_admin`);
  console.log(`   URL      : /admin\n`);
}

seed()
  .then(() => {
    console.log('✅ Seed complete!\n');
    process.exit(0);
  })
  .catch(e => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  });
