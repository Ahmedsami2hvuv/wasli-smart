/**
 * تطبيق جدول الروابط الترويجية على قاعدة سوبابيس.
 * التشغيل: npx -p pg node --env-file=.env.local scripts/apply-promo-links-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '03_promo_links.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

function parseConnectionString(cs) {
  // نحلل يدوياً لأن كلمة السر قد تحتوي أقواس مربعة غير مرمّزة في URL
  const match = cs.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error('صيغة رابط قاعدة البيانات غير صالحة');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5],
    ssl: { rejectUnauthorized: false },
  };
}

const candidates = [process.env.DIRECT_URL, process.env.DATABASE_URL].filter(Boolean);

if (candidates.length === 0) {
  console.error('لم يتم العثور على DATABASE_URL أو DIRECT_URL في البيئة.');
  process.exit(1);
}

let lastError = null;
for (const connectionString of candidates) {
  try {
    const cfg = parseConnectionString(connectionString);
    console.log(`محاولة الاتصال بـ ${cfg.host}:${cfg.port} ...`);
    const client = new pg.Client(cfg);
    await client.connect();
    await client.query(sql);
    console.log('تم تطبيق جدول promo_links بنجاح.');
    await client.end();
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.error('فشلت المحاولة:', err.message);
  }
}

console.error('تعذر تطبيق الترحيل:', lastError?.message || lastError);
process.exit(1);
