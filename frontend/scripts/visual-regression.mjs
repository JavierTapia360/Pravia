import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const email = process.env.PRAVIA_E2E_EMAIL;
const password = process.env.PRAVIA_E2E_PASSWORD;
if (!email || !password) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'Faltan PRAVIA_E2E_EMAIL/PRAVIA_E2E_PASSWORD; no se generaron capturas simuladas.' }, null, 2));
  process.exit(0);
}
const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const chromeCandidates = [process.env.E2E_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const executablePath = chromeCandidates.find(existsSync);
if (!executablePath) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'No se encontró Chrome real; no se generaron capturas simuladas.' }, null, 2));
  process.exit(0);
}

const sizes = [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }, { width: 1024, height: 850 }, { width: 768, height: 900 }, { width: 390, height: 844 }];
const routes = ['/mi-dia', '/prospectos', '/cotizaciones', '/expedientes', '/comparecientes', '/notarias', '/agenda', '/finanzas', '/reportes', '/inteligencia', '/riesgos'];
const outputRoot = process.env.E2E_VISUAL_OUTPUT || '/tmp/pravia-visual-regression';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: sizes[0] });
try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/^Contraseña$/i).fill(password);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  if (page.url().includes('/cambiar-contrasena')) throw new Error('La cuenta E2E existente requiere cambio de contraseña; no se modificó la cuenta.');
  const captures = [];
  for (const size of sizes) {
    await page.setViewportSize(size);
    const folder = `${outputRoot}/${size.width}x${size.height}`;
    await mkdir(folder, { recursive: true });
    for (const route of routes) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      if (!response || response.status() >= 400 || page.url().includes('/login')) throw new Error(`No se pudo capturar la ruta autenticada ${route}.`);
      const file = `${folder}/${route.slice(1).replace(/\//g, '-')}.png`;
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
      captures.push(file);
    }
    await page.goto(`${baseURL}/mi-dia`, { waitUntil: 'networkidle' });
    const launcher = page.getByRole('button', { name: /Abrir PRAVIA IA/i });
    await launcher.click();
    await page.locator('#pravia-ai-panel').waitFor({ state: 'visible' });
    const openFile = `${folder}/pravia-ia-open.png`;
    await page.screenshot({ path: openFile, fullPage: true, animations: 'disabled' });
    captures.push(openFile);
    await page.getByRole('button', { name: /Cerrar PRAVIA IA/i }).first().click();
    await page.goto(`${baseURL}/expedientes`, { waitUntil: 'networkidle' });
    const firstDetail = page.locator('a[href^="/expedientes/"]').first();
    if (await firstDetail.count()) {
      await firstDetail.click();
      await page.waitForLoadState('networkidle');
      const suggestion = page.locator('.pravia-ai-suggestion');
      if (await suggestion.isVisible().catch(() => false)) {
        const suggestionFile = `${folder}/pravia-ia-suggestion.png`;
        await page.screenshot({ path: suggestionFile, fullPage: true, animations: 'disabled' });
        captures.push(suggestionFile);
      }
    }
  }
  console.log(JSON.stringify({ ok: true, authenticated: true, captures: captures.length, output: outputRoot }, null, 2));
} finally { await browser.close(); }
