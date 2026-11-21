import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { q, one } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(fs.readFileSync(path.join(here, '../../shared/seed.json'), 'utf8'));

// Carga los datos de ejemplo solo si la base está vacía.
export async function seedIfEmpty() {
  const has = await one('SELECT COUNT(*)::int AS n FROM packages');
  if (has.n > 0) return false;
  console.log('Cargando datos de ejemplo...');
  const catIds = {};
  const subIds = {};
  for (const [i, c] of seed.categories.entries()) {
    const row = await one('INSERT INTO categories (slug,name,description,icon,sort) VALUES ($1,$2,$3,$4,$5) RETURNING id', [c.slug, c.name, c.description, c.icon, i]);
    catIds[c.slug] = row.id;
    for (const s of c.subcategories) {
      const sr = await one('INSERT INTO subcategories (category_id,slug,name) VALUES ($1,$2,$3) RETURNING id', [row.id, s.slug, s.name]);
      subIds[c.slug + '/' + s.slug] = sr.id;
    }
  }
  const pkgIds = {};
  for (const p of seed.packages) {
    const row = await one(
      `INSERT INTO packages (slug,name,category_id,subcategory_id,kind,short,description,base_price,offer_pct,unit,techs,features,plans,specs,slots_total,sold,featured,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [p.slug, p.name, catIds[p.category], subIds[p.category + '/' + p.sub], p.kind, p.short, p.description, p.base_price, p.offer_pct || 0, p.unit || null,
        p.techs, p.features, JSON.stringify(p.plans), JSON.stringify(p.specs), p.slots_total, p.sold, !!p.featured, p.created]);
    pkgIds[p.slug] = row.id;
  }
  for (const r of seed.reviews) {
    await q('INSERT INTO reviews (package_id,author,company,rating,title,body,verified,featured,created_at) VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8)',
      [pkgIds[r.pkg], r.author, r.company, r.rating, r.title, r.body, !!r.featured, r.date]);
  }
  for (const c of seed.coupons) {
    await q('INSERT INTO coupons (code,type,value,min_subtotal,description) VALUES ($1,$2,$3,$4,$5)', [c.code, c.type, c.value, c.min_subtotal, c.description]);
  }
  for (const [i, f] of seed.faq.entries()) {
    await q('INSERT INTO faq (category,question,answer,sort) VALUES ($1,$2,$3,$4)', [f.category, f.q, f.a, i]);
  }
  const adminHash = await bcrypt.hash('Admin123!', 10);
  await q("INSERT INTO users (name,email,password_hash,role) VALUES ('Administrador','admin@devconecta.mx',$1,'admin')", [adminHash]);
  const demoHash = await bcrypt.hash('Cliente123!', 10);
  await q(`INSERT INTO users (name,email,password_hash,phone,company,rfc) VALUES ('Cliente Demo','cliente@demo.mx',$1,'9930000000','Comercializadora Demo','CDE260101AB1')`, [demoHash]);
  console.log('Datos de ejemplo cargados.');
  return true;
}
