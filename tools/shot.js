// Screenshots vanaf de vaste CONFIG-camera's — werkplan sectie 4.
// Gebruik: node tools/shot.js <fasenummer>   → shots/fase{N}_{naam}.png
// Gebruikt puppeteer-core met de op het systeem aanwezige Edge/Chrome
// (geen extra download; gelogd in DECISIONS.md).
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.js';
import { CONFIG } from '../src/config.js';

const fase = process.argv[2] ?? '0';
const PORT = 8127;
const SHOTS = fileURLToPath(new URL('../shots', import.meta.url));

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) { console.error('Geen Edge/Chrome gevonden voor screenshots.'); process.exit(1); }

mkdirSync(SHOTS, { recursive: true });
const server = startServer(PORT);

try {
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    userDataDir: `${SHOTS}/.browser-profiel`,
    args: ['--no-sandbox', '--no-first-run', '--disable-sync',
           '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--hide-scrollbars', '--mute-audio'],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('  pagina-fout:', e.message));

  for (const naam of Object.keys(CONFIG.cameras)) {
    await page.goto(`http://localhost:${PORT}/index.html?shot=${naam}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__shotReady === true', { timeout: 45000 });
    const pad = `${SHOTS}/fase${fase}_${naam}.png`;
    await page.screenshot({ path: pad });
    console.log('  → ' + pad);
  }
  await browser.close();
  console.log('SHOTS KLAAR.');
} finally {
  server.close();
}
