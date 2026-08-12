import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDir = new URL('../dist/assets/', import.meta.url);
if (!existsSync(assetsDir)) throw new Error('No existe dist/assets. Ejecuta npm run build primero.');

const files = readdirSync(assetsDir).map((name) => {
  const path = join(assetsDir.pathname, name);
  const bytes = statSync(path).size;
  const gzip = gzipSync(readFileSync(path), { level: 9 }).byteLength;
  return { name: basename(path), bytes, gzip };
});

const js = files.filter((file) => file.name.endsWith('.js'));
const css = files.filter((file) => file.name.endsWith('.css'));
const main = js.find((file) => /^index-.*\.js$/.test(file.name));
const violations = [];

for (const file of js) if (file.gzip > 140 * 1024) violations.push(`${file.name}: JavaScript gzip supera 140 KiB`);
for (const file of css) if (file.gzip > 30 * 1024) violations.push(`${file.name}: CSS gzip supera 30 KiB`);
if (!main) violations.push('No se encontró el archivo principal index-*.js.');
else if (main.gzip > 90 * 1024) violations.push(`${main.name}: entrada principal gzip supera 90 KiB`);

const largest = [...files].sort((a, b) => b.gzip - a.gzip).slice(0, 8)
  .map((file) => ({ file: file.name, raw_kib: Number((file.bytes / 1024).toFixed(2)), gzip_kib: Number((file.gzip / 1024).toFixed(2)) }));

console.log(JSON.stringify({
  ok: violations.length === 0,
  budgets_kib_gzip: { main_js: 90, any_js: 140, any_css: 30 },
  asset_count: files.length,
  largest,
  violations,
}, null, 2));

if (violations.length) process.exitCode = 1;
