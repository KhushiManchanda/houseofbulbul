const fs = require('fs');
const path = require('path');

const dataCode = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');

// Evaluate in function scope
const fn = new Function(dataCode + '\nreturn { PRODUCTS, COLLECTIONS, WHATSAPP_NUMBER };');
const { PRODUCTS, COLLECTIONS } = fn();

const products = PRODUCTS || {};
const collections = COLLECTIONS || {};

const BASE_URL = 'https://houseofbulbul.com';
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Products & Catalogue View -->
  <url>
    <loc>${BASE_URL}/products</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
`;

// Add Category Collections
for (const [handle, coll] of Object.entries(collections)) {
  xml += `  <url>
    <loc>${BASE_URL}/collections/${handle}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
}

// Add All Products with Image Metadata for Google Images SEO
for (const [id, prod] of Object.entries(products)) {
  const cleanTitle = (prod.name || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const imgUrl = (prod.img || '').replace(/&/g, '&amp;');
  const prodSlug = prod.handle || id;
  
  xml += `  <url>
    <loc>${BASE_URL}/products/${prodSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    ${imgUrl ? `<image:image>
      <image:loc>${imgUrl}</image:loc>
      <image:title>${cleanTitle}</image:title>
    </image:image>` : ''}
  </url>
`;
}

xml += `</urlset>\n`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8');
console.log(`Successfully generated sitemap.xml with ${Object.keys(products).length} products and ${Object.keys(collections).length} collections.`);
