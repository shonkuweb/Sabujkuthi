import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { uploadToR2, uploadDataUrlToR2, getR2Config } from '../lib/r2.mjs';

const config = getR2Config();
console.log('R2 Configured:', config.isConfigured, 'Bucket:', config.bucket, 'Public URL:', config.publicUrl);

if (!config.isConfigured) {
  console.error('R2 credentials missing in environment.');
  process.exit(1);
}

async function run() {
  console.log('\n--- 1. Uploading static brand assets to R2 ---');
  const staticAssets = [
    { local: 'public/images/sabujkuthi-logo.png', key: 'SabujKuthi/assets/sabujkuthi-logo.png', type: 'image/png' },
    { local: 'public/images/sabujkuthi-footer-logo.png', key: 'SabujKuthi/assets/sabujkuthi-footer-logo.png', type: 'image/png' },
    { local: 'public/images/category-leaves.png', key: 'SabujKuthi/assets/category-leaves.png', type: 'image/png' },
  ];

  for (const asset of staticAssets) {
    if (fs.existsSync(asset.local)) {
      const buffer = fs.readFileSync(asset.local);
      const url = await uploadToR2(buffer, asset.key, asset.type);
      console.log(`Uploaded ${asset.local} -> ${url}`);
    } else {
      console.warn(`File not found: ${asset.local}`);
    }
  }

  console.log('\n--- 2. Fetching & Uploading Hero Banner to R2 ---');
  try {
    const heroSourceUrl = 'https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev/Malatinursury/4c4556bc-0920-4575-97e6-94ba6de15e6f.png';
    const resp = await fetch(heroSourceUrl);
    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer();
      const heroUrl = await uploadToR2(Buffer.from(arrayBuffer), 'SabujKuthi/assets/hero-banner.png', 'image/png');
      console.log(`Hero banner uploaded -> ${heroUrl}`);
    } else {
      console.warn(`Could not fetch original hero image (HTTP ${resp.status})`);
    }
  } catch (err) {
    console.warn('Could not mirror hero image:', err.message);
  }

  console.log('\n--- 3. Migrating base64 images in dev.db to R2 ---');
  const db = new Database('dev.db');
  
  // Categories
  const categories = db.prepare('SELECT id, slug, name, image FROM Category').all();
  const updateCat = db.prepare('UPDATE Category SET image = ? WHERE id = ?');
  for (const cat of categories) {
    if (cat.image && cat.image.startsWith('data:image/')) {
      console.log(`Migrating Category: ${cat.name} (${cat.slug})...`);
      const r2Url = await uploadDataUrlToR2(cat.image, 'SabujKuthi/categories', cat.slug);
      updateCat.run(r2Url, cat.id);
      console.log(`  -> ${r2Url}`);
    } else if (cat.image) {
      console.log(`Category ${cat.name} already has URL: ${cat.image}`);
    }
  }

  // Products
  const products = db.prepare('SELECT id, slug, title, image FROM Product').all();
  const updateProd = db.prepare('UPDATE Product SET image = ? WHERE id = ?');
  for (const prod of products) {
    if (prod.image && prod.image.startsWith('data:image/')) {
      console.log(`Migrating Product: ${prod.title} (${prod.slug})...`);
      const r2Url = await uploadDataUrlToR2(prod.image, 'SabujKuthi/products', prod.slug);
      updateProd.run(r2Url, prod.id);
      console.log(`  -> ${r2Url}`);
    } else if (prod.image) {
      console.log(`Product ${prod.title} already has URL: ${prod.image}`);
    }
  }

  db.close();
  console.log('\nMigration complete! All images are uploaded to Cloudflare R2 and synced with database.');
}

run().catch(err => {
  console.error('Error during R2 migration:', err);
  process.exit(1);
});
