import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const requireAuth = process.env.E2E_REQUIRE_AUTH === 'true';
const chromeCandidates = [
  process.env.E2E_CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = chromeCandidates.find(existsSync);
if (!executablePath) throw new Error('No se encontró Chrome. Define E2E_CHROME_PATH.');
if (requireAuth && (!email || !password)) throw new Error('E2E_EMAIL y E2E_PASSWORD son obligatorios cuando E2E_REQUIRE_AUTH=true.');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
const failures = [];
page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console:${message.text().slice(0, 180)}`);
});
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 500) failures.push(`api:${response.status()}:${response.url()}`);
});

const result = { public: false, authenticated: false, routes: [] };
try {
  await page.goto(`${baseURL}/expedientes`, { waitUntil: 'networkidle' });
  if (!page.url().includes('/login')) throw new Error('Una ruta privada no redirigió al acceso.');
  await page.getByRole('heading', { name: /PRAVIA/i }).waitFor();
  await page.goto(`${baseURL}/recuperar-acceso`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Correo de la cuenta/i).waitFor();
  result.public = true;

  if (email && password) {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel(/Correo electrónico/i).fill(email);
    await page.getByLabel(/^Contraseña$/i).fill(password);
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    if (page.url().includes('/cambiar-contrasena')) throw new Error('La cuenta E2E requiere cambiar su contraseña; prepara una cuenta de prueba definitiva.');

    for (const route of ['/mi-dia', '/prospectos', '/cotizaciones', '/expedientes', '/comparecientes', '/agenda', '/reportes']) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      if (!response || response.status() >= 400 || page.url().includes('/login')) throw new Error(`Falló la ruta autenticada ${route}.`);
      result.routes.push(route);
    }
    result.authenticated = true;
  }

  if (failures.length) throw new Error(`Errores detectados: ${failures.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, base_url: baseURL, ...result }, null, 2));
} finally {
  await browser.close();
}
