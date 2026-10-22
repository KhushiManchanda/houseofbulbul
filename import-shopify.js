/**
 * House of Bulbul - Automatic Shopify Product & Collection Sync
 * Fetches all products and collections from houseofbulbul.com and updates data.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STORE_DOMAIN = 'houseofbulbul.com';
const WHATSAPP_NUMBER = '919354811266';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function syncShopifyData() {
  console.log(`Connecting to https://${STORE_DOMAIN}...`);
  
  // 1. Fetch All Products (Handling pagination)
  let allProducts = [];
  let page = 1;
  while (true) {
    console.log(`Fetching products page ${page}...`);
    try {
      const json = await fetchJson(`https://${STORE_DOMAIN}/products.json?limit=250&page=${page}`);
      const list = json.products || [];
      if (list.length === 0) break;
      allProducts.push(...list);
      console.log(`Retrieved ${list.length} products on page ${page}. Total so far: ${allProducts.length}`);
      if (list.length < 250) break;
      page++;
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }

  // 2. Fetch All Collections
  console.log(`Fetching collections...`);
  let allCollections = [];
  try {
    const colJson = await fetchJson(`https://${STORE_DOMAIN}/collections.json?limit=250`);
    allCollections = colJson.collections || [];
    console.log(`Retrieved ${allCollections.length} collections.`);
  } catch (err) {
    console.error('Error fetching collections:', err.message);
  }

  // 3. Transform Products for House of Bulbul Catalogue
  const productsObj = {};
  const allProductIds = [];

  allProducts.forEach(p => {
    const id = p.id;
    allProductIds.push(id);
    const primaryImg = (p.images && p.images[0]) ? p.images[0].src : '';
    const variant = (p.variants && p.variants[0]) ? p.variants[0] : {};
    const price = variant.price ? Math.round(parseFloat(variant.price)) : 0;
    const compareAt = variant.compare_at_price ? Math.round(parseFloat(variant.compare_at_price)) : null;

    productsObj[id] = {
      id: id,
      name: p.title,
      handle: p.handle,
      price: price,
      compareAt: compareAt,
      img: primaryImg,
      tags: p.tags || [],
      description: p.body_html || ''
    };
  });

  // 4. Group Products into Curated Collections
  const collectionsObj = {
    'all': {
      name: 'All Products',
      productIds: allProductIds
    }
  };

  // Build thematic collections based on title keywords & tags
  const thematicCategories = [
    { handle: 'wedding-favours', name: 'Wedding Favours', test: /wedding|favour|phera|varmala|dulha|dulhan|bride|groom|platter|satka|shagun|cone|gajra|bachelor|bachelorette/i },
    { 
      handle: 'sacred-gifting', 
      name: 'Sacred Gifting', 
      test: /\b(sacred|pooja|puja|bell|bells|shukrana|nariyal|kalash|thali|ganesh|swastik|diya|sindoor|laddu gopal|kanha ji|mandir|temple)\b/i,
      exclude: /earring|hoop|choker|headband|hairband|necklace|scrunchie|parandi/i
    },
    { handle: 'kanjak-navratri', name: 'Kanjak & Navratri Gifting', test: /kanjak|navratri|devi|kanya|bangles|mata/i },
    { handle: 'diwali-gifting', name: 'Diwali Gifting', test: /diwali|deepawali|patakha|rangoli|urli|shubh labh|toran|candle/i },
    { handle: 'lohri-sankranti', name: 'Lohri & Makar Sankranti', test: /lohri|sankranti|bonfire|harvest|dhol|popcorn|mukhwas/i }
  ];

  thematicCategories.forEach(cat => {
    const matchingIds = allProductIds.filter(id => {
      const p = productsObj[id];
      const text = `${p.name} ${(p.tags || []).join(' ')} ${p.handle}`.toLowerCase();
      if (cat.exclude && cat.exclude.test(text)) return false;
      return cat.test.test(text);
    });
    collectionsObj[cat.handle] = {
      name: cat.name,
      productIds: matchingIds
    };
  });

  // Also add native Shopify collections
  for (const col of allCollections) {
    if (!collectionsObj[col.handle]) {
      try {
        const colProdJson = await fetchJson(`https://${STORE_DOMAIN}/collections/${col.handle}/products.json?limit=250`);
        const colProds = (colProdJson.products || []).map(cp => cp.id);
        if (colProds.length > 0) {
          collectionsObj[col.handle] = {
            name: col.title,
            productIds: colProds
          };
        }
      } catch (e) {
        // continue
      }
    }
  }

  // 5. Read existing data.js to preserve BENTO_COLLAGE
  let existingContent = '';
  const dataPath = path.join(__dirname, 'data.js');
  if (fs.existsSync(dataPath)) {
    existingContent = fs.readFileSync(dataPath, 'utf8');
  }

  let bentoSection = '';
  const bentoMatch = existingContent.match(/\/\/ ============================================[\r\n]+\/\/ ASYMMETRICAL BENTO COLLAGE DATA[\s\S]*$/);
  if (bentoMatch) {
    bentoSection = bentoMatch[0];
  } else {
    const fallbackMatch = existingContent.match(/const BENTO_COLLAGE =[\s\S]*$/);
    if (fallbackMatch) bentoSection = fallbackMatch[0];
  }

  // 6. Generate New data.js Content
  const newCode = `// ============================================
// PRODUCT & COLLECTION DATA (Synced live from ${STORE_DOMAIN})
// Last Synced: ${new Date().toISOString()}
// Total Products: ${allProductIds.length}
// ============================================

const WHATSAPP_NUMBER = "${WHATSAPP_NUMBER}"; // WhatsApp: 9354811266

const PRODUCTS = ${JSON.stringify(productsObj, null, 2)};

const COLLECTIONS = ${JSON.stringify(collectionsObj, null, 2)};

${bentoSection}
`;

  fs.writeFileSync(dataPath, newCode, 'utf8');
  console.log(`SUCCESS! Synced ${allProductIds.length} products and ${Object.keys(collectionsObj).length} collections into data.js!`);
}

syncShopifyData().catch(err => {
  console.error('Sync failed:', err);
});
