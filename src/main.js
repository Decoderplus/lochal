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

if (shotNaam && CONFIG.cameras[shotNaam]) {
  const [pos, kijk] = CONFIG.cameras[shotNaam];
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
  renderer.setAnimationLoop(() => {
    const dt = Math.min(klok.getDelta(), 0.05);
    wereld.update(dt);
    speler.update(dt);
    const h = speler.hintTekst();
    hint.textContent = h;
    hint.style.display = h ? 'block' : 'none';
    renderer.render(scene, camera);
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
