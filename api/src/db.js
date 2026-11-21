import pg from 'pg';

// Los NUMERIC de PostgreSQL llegan como texto; los convertimos a número.
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// Las columnas DATE se regresan tal cual (AAAA-MM-DD) para evitar corrimientos por zona horaria.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'devconecta',
  password: process.env.DB_PASSWORD || 'devconecta',
  database: process.env.DB_NAME || 'devconecta',
  max: 10
});

export const q = (text, params) => pool.query(text, params);
export const one = async (text, params) => (await pool.query(text, params)).rows[0] || null;
export const many = async (text, params) => (await pool.query(text, params)).rows;

export async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try { await pool.query('SELECT 1'); return; } catch (e) {
      console.log(`Esperando a PostgreSQL... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('No se pudo conectar a PostgreSQL');
}
