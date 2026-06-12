// LocHal — app-schil: renderer (CONFIG is wet), wereld, speler, shot-modus.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { bouwWereld } from './world/index.js';
import { Speler } from './player.js';

// ── Renderer volgens CONFIG.renderer ─────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.renderer.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9ced2); // voorlopige lucht (fase 4: fog/licht)

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 300);

// ── Voorlopige verlichting (definitief lichtontwerp = fase 4) ────────────
// Eén echte schaduwwerper (CONFIG.renderer.maxShadowLights = 1): de zon.
const zon = new THREE.DirectionalLight(0xfff0da, 1.6);
zon.position.set(95, 55, -35);
zon.target.position.set(25, 0, 45);
zon.castShadow = true;
zon.shadow.mapSize.set(CONFIG.renderer.shadowMapSize, CONFIG.renderer.shadowMapSize);
zon.shadow.camera.left = -55; zon.shadow.camera.right = 55;
zon.shadow.camera.top = 60; zon.shadow.camera.bottom = -60;
zon.shadow.camera.near = 10; zon.shadow.camera.far = 220;
zon.shadow.bias = -0.0015;
scene.add(zon, zon.target);
scene.add(new THREE.HemisphereLight(0xd8dde2, 0x6b6157, 0.65));
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

// ── Wereld ────────────────────────────────────────────────────────────────
const wereld = bouwWereld(scene);

// ── Shot-modus: ?shot=<cameranaam> → vaste camera, geen besturing ────────
const params = new URLSearchParams(location.search);
const shotNaam = params.get('shot');

const klok = new THREE.Clock();

// 'vrij' = losse debug-camera: ?shot=vrij&pos=x,y,z&kijk=x,y,z
const vrij = shotNaam === 'vrij' && params.get('pos') && params.get('kijk')
  ? [params.get('pos').split(',').map(Number), params.get('kijk').split(',').map(Number)]
  : null;

if (vrij || (shotNaam && CONFIG.cameras[shotNaam])) {
  const [pos, kijk] = vrij ?? CONFIG.cameras[shotNaam];
  camera.position.set(...pos);
  camera.lookAt(...kijk);
  document.getElementById('hint').style.display = 'none';
  document.getElementById('startuitleg').style.display = 'none';
  let frames = 0;
  renderer.setAnimationLoop(() => {
    wereld.update(klok.getDelta());
    renderer.render(scene, camera);
    if (++frames >= 8) { window.__shotReady = true; renderer.setAnimationLoop(null); }
  });
} else {
  const speler = new Speler(camera, renderer.domElement, wereld);
  const hint = document.getElementById('hint');

  // ── Debugtoetsen (ijking StemmingMakerij-referentiekader) ───────────────
  // R = wrapper 90° verder draaien (waarde op het scherm) · M = minikaart
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:50;display:none;' +
    'color:#ffe6bd;background:rgba(20,16,12,0.75);padding:8px 14px;border-radius:6px;' +
    'font:15px Georgia,serif;pointer-events:none;';
  document.body.appendChild(hud);
  let hudTimer = null;
  function toonHud(tekst) {
    hud.textContent = tekst;
    hud.style.display = 'block';
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => { hud.style.display = 'none'; }, 4000);
  }

  const kaart = document.createElement('canvas');
  const S = 3, PAD = 16;                       // 3 px per meter, noord boven
  kaart.width = 60 * S + PAD * 2;
  kaart.height = 90 * S + PAD * 2;
  kaart.style.cssText = 'position:fixed;right:14px;top:14px;z-index:50;display:none;' +
    'border-radius:8px;pointer-events:none;';
  document.body.appendChild(kaart);
  let kaartAan = false;
  const px = (x) => PAD + x * S;
  const py = (z) => PAD + (90 - z) * S;        // noord (z=90) boven
  function tekenKaart() {
    const ctx = kaart.getContext('2d');
    ctx.clearRect(0, 0, kaart.width, kaart.height);
    ctx.fillStyle = 'rgba(14,12,10,0.85)';
    ctx.fillRect(0, 0, kaart.width, kaart.height);
    ctx.font = '11px Georgia,serif';
    // hal-omtrek
    ctx.strokeStyle = '#cfc8ba'; ctx.lineWidth = 1.5;
    ctx.strokeRect(px(0), py(90), 60 * S, 90 * S);
    // vide (zuidhal, z < 35)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(px(0), py(35), 60 * S, 35 * S);
    ctx.fillStyle = '#b8ac96';
    ctx.fillText('vide', px(27.5), py(15));
    // tribunes
    ctx.fillStyle = 'rgba(216,213,205,0.45)';
    ctx.fillRect(px(10), py(35), 12 * S, 13 * S);
    ctx.fillRect(px(38), py(35), 12 * S, 13 * S);
    ctx.fillStyle = '#e8e2d4';
    ctx.fillText('tribune W', px(10.5), py(27.5));
    ctx.fillText('tribune O', px(38.5), py(27.5));
    // loopbrug
    ctx.fillStyle = 'rgba(154,148,132,0.8)';
    ctx.fillRect(px(22), py(33), 16 * S, 2 * S);
    // café (CONFIG-zone, fase 3) — gestippeld
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#a3786a';
    ctx.strokeRect(px(30), py(14), 12 * S, 8 * S);
    ctx.setLineDash([]);
    ctx.fillStyle = '#c9a092';
    ctx.fillText('café', px(33), py(9));
    // StemmingMakerij (huidige wrapper-rotatie)
    const zb = wereld.zaalBox();
    ctx.fillStyle = 'rgba(204,36,31,0.55)';
    ctx.fillRect(px(zb.x0), py(zb.z1), (zb.x1 - zb.x0) * S, (zb.z1 - zb.z0) * S);
    ctx.fillStyle = '#ffd9d4';
    ctx.fillText('zaal', px(zb.x0 + 1), py(zb.z0 + 1.5));
    // speler (stip + kijkrichting)
    const sp = speler.voeten;
    ctx.fillStyle = '#ffce8a';
    ctx.beginPath(); ctx.arc(px(sp.x), py(sp.z), 4, 0, Math.PI * 2); ctx.fill();
    const yaw = speler.euler.y;
    ctx.strokeStyle = '#ffce8a'; ctx.lineWidth = 2;
    // camera kijkt in wereld naar (−sin yaw, −cos yaw); schermtekening is noord-boven
    ctx.beginPath();
    ctx.moveTo(px(sp.x), py(sp.z));
    ctx.lineTo(px(sp.x) - Math.sin(yaw) * 12, py(sp.z) + Math.cos(yaw) * 12);
    ctx.stroke();
    // noordpijl
    const nx = kaart.width - 18, ny = 30;
    ctx.strokeStyle = '#ffe6bd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx, ny - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx - 4, ny - 10); ctx.lineTo(nx, ny - 16); ctx.lineTo(nx + 4, ny - 10); ctx.stroke();
    ctx.fillStyle = '#ffe6bd';
    ctx.fillText('N', nx - 4, ny + 12);
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      const nieuw = wereld.zetZaalRotatie((wereld.zaalRotatie() + 90) % 360);
      toonHud(`Zaalrotatie: ${nieuw}°  (CONFIG.zaalRotatie)`);
    }
    if (e.code === 'KeyM') {
      kaartAan = !kaartAan;
      kaart.style.display = kaartAan ? 'block' : 'none';
    }
  });

  renderer.setAnimationLoop(() => {
    const dt = Math.min(klok.getDelta(), 0.05);
    wereld.update(dt);
    speler.update(dt);
    const h = speler.hintTekst();
    hint.textContent = h;
    hint.style.display = h ? 'block' : 'none';
    if (kaartAan) tekenKaart();
    renderer.render(scene, camera);
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
