import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fromDist = (path) => resolve(root, 'dist', path);
const manifest = JSON.parse(await readFile(fromDist('manifest.webmanifest'), 'utf8'));

if (manifest.display !== 'standalone' || manifest.start_url !== '/' || manifest.scope !== '/') {
  throw new Error('El manifest no tiene el modo standalone o alcance esperado.');
}

const requiredIcons = new Map([
  ['icons/pravia-192.png', [192, 192]],
  ['icons/pravia-512.png', [512, 512]],
  ['icons/pravia-maskable-512.png', [512, 512]],
]);

for (const [path, expected] of requiredIcons) {
  const bytes = await readFile(fromDist(path));
  const signature = bytes.subarray(1, 4).toString('ascii');
  const dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (signature !== 'PNG' || dimensions[0] !== expected[0] || dimensions[1] !== expected[1]) {
    throw new Error(`Icono inválido: ${path}`);
  }
}

const [worker, offline, index] = await Promise.all([
  readFile(fromDist('sw.js'), 'utf8'),
  readFile(fromDist('offline.html'), 'utf8'),
  readFile(fromDist('index.html'), 'utf8'),
]);

if (!worker.includes("url.pathname.startsWith('/api/')") || !worker.includes("request.method !== 'GET'")) {
  throw new Error('El service worker no protege explícitamente las operaciones/API.');
}
if (worker.includes("['/', '/index.html'") || !worker.includes("cache: 'no-store'") || !worker.includes("url.pathname.startsWith('/assets/')")) {
  throw new Error('El service worker puede mezclar HTML y bundles de despliegues distintos.');
}
if (!offline.includes('Sin conexión al servidor')) throw new Error('Falta el shell sin conexión.');
if (!index.includes('manifest.webmanifest')) throw new Error('El HTML no enlaza el manifest.');
await stat(fromDist('icons/pravia-mark.svg'));

console.log('PWA verificada: manifest, shell, service worker e iconos correctos.');
