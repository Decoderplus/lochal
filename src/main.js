// LocHal — app-schil: renderer (CONFIG is wet), wereld, speler, shot-modus.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { bouwWereld, MIRROR } from './world/index.js';
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
  const S = 2.4, PAD = 20;                      // px per meter; rand voor kompas
  kaart.width = 60 * S + PAD * 2;
  kaart.height = 90 * S + PAD * 2;
  kaart.style.cssText = 'position:fixed;right:14px;top:14px;z-index:50;display:block;' +
    'border-radius:8px;pointer-events:none;box-shadow:0 2px 12px rgba(0,0,0,0.45);';
  document.body.appendChild(kaart);
  let kaartAan = true;
  const px = (x) => PAD + x * S;
  const py = (z) => PAD + (90 - z) * S;        // noord (z=90) boven
  const RX = (x) => MIRROR ? 60 - x : x;       // plattegrond-x → (gespiegelde) wereld-x
  // teken een zone uit plattegrond-coördinaten (spiegelt mee)
  function zone(a, b, z0, z1, fill) {
    const xl = Math.min(RX(a), RX(b)), xr = Math.max(RX(a), RX(b));
    ctx.fillStyle = fill;
    ctx.fillRect(px(xl), py(z1), (xr - xl) * S, (z1 - z0) * S);
  }
  // tekst gecentreerd op een plattegrond-punt (spiegelt mee)
  function label(tekst, x, z, kleur) {
    ctx.fillStyle = kleur;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tekst, px(RX(x)), py(z));
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  const O = CONFIG.objects;
  let ctx;
  function tekenKaart() {
    ctx = kaart.getContext('2d');
    ctx.clearRect(0, 0, kaart.width, kaart.height);
    ctx.fillStyle = 'rgba(14,12,10,0.85)';
    ctx.fillRect(0, 0, kaart.width, kaart.height);
    ctx.font = '10px Georgia,serif';
    // hal-omtrek
    ctx.strokeStyle = '#cfc8ba'; ctx.lineWidth = 1.5;
    ctx.strokeRect(px(0), py(90), 60 * S, 90 * S);
    // vide (zuidhal, z < 35)
    zone(0, 60, 0, 35, 'rgba(255,255,255,0.06)');
    label('vide', 30, 30, '#8d8575');
    // tribunes (uit CONFIG; spiegelen mee)
    for (const t of [O.tribuneWest, O.tribuneOost]) {
      zone(t.x[0], t.x[1], t.zBottom, t.zTop, 'rgba(216,213,205,0.40)');
      label('trap', (t.x[0] + t.x[1]) / 2, (t.zBottom + t.zTop) / 2, '#e8e2d4');
    }
    // loopbrug tussen de tribune-platforms
    zone(O.loopbrug.x[0], O.loopbrug.x[1], O.loopbrug.z - O.loopbrug.breedte / 2,
         O.loopbrug.z + O.loopbrug.breedte / 2, 'rgba(176,141,90,0.7)');
    // plantenstellage
    zone(O.stellage.x[0], O.stellage.x[1], O.stellage.z[0], O.stellage.z[1],
         'rgba(110,140,90,0.35)');
    // leestafels op rails (westkant)
    zone(5, 23, O.treintafels.z[0], O.treintafels.z[1], 'rgba(176,141,90,0.45)');
    label('tafels', 14, (O.treintafels.z[0] + O.treintafels.z[1]) / 2, '#d8c4a0');
    // kiosk / café
    zone(O.cafe.x[0], O.cafe.x[1], O.cafe.z[0], O.cafe.z[1], 'rgba(163,42,34,0.55)');
    label('kiosk', (O.cafe.x[0] + O.cafe.x[1]) / 2, (O.cafe.z[0] + O.cafe.z[1]) / 2, '#f0c0b6');
    // StemmingMakerij (huidige wrapper-rotatie, echte box uit de wereld)
    const zb = wereld.zaalBox();
    ctx.fillStyle = 'rgba(204,36,31,0.55)';
    ctx.fillRect(px(zb.x0), py(zb.z1), (zb.x1 - zb.x0) * S, (zb.z1 - zb.z0) * S);
    label('zaal', (zb.x0 + zb.x1) / 2, (zb.z0 + zb.z1) / 2, '#ffd9d4');
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
    // kompas N (boven) · Z (onder) · O (links) · W (rechts)
    // de wereld is over de lengteas gespiegeld, dus oost = links, west = rechts
    ctx.fillStyle = '#ffe6bd';
    ctx.font = 'bold 13px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cx = kaart.width / 2, cy = kaart.height / 2;
    ctx.fillText('N', cx, 10);
    ctx.fillText('Z', cx, kaart.height - 10);
    ctx.fillText('O', 10, cy);
    ctx.fillText('W', kaart.width - 10, cy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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
