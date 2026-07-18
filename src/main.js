// LocHal — app-schil: renderer (CONFIG is wet), wereld, speler, shot-modus.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { bouwWereld } from './world/index.js';
import { Speler } from './player.js';
import { initClimax, updateClimax, INSTELLINGEN, bordIsActief,
         activeerTVAanmeld, updateTVTekst, bevestigTV, exporteerAanmeldingen,
         faseLampen, faseZonsondergang, faseDeeltjes } from './world/climax.js';
import { initAudio, onDeurGeopend, audioDeurKlik, audioKlik, audioKlaar } from './world/audio.js';
import { bouwHologram } from './world/hologram.js';

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
// Fase 4 — lucht + subtiele fog: de noordelijke diepte vervaagt, geeft schaal.
scene.background = new THREE.Color(0xdadbd6);
scene.fog = new THREE.Fog(CONFIG.colors.fog, 42, 140);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 300);
if (typeof window !== 'undefined') { window.__scene = scene; window.__camera = camera; }

// ── Post-processing: EffectComposer + bloom (door de climax hergebruikt) ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const renderFrame = () => composer.render();

// ── Laadscherm: verdwijnt zodra het eerste frame gerenderd is ────────────
let laadschermWeg = false;
function verbergLaadscherm() {
  if (laadschermWeg) return;
  laadschermWeg = true;
  const el = document.getElementById('laadscherm');
  if (el) { el.classList.add('verborgen'); setTimeout(() => el.remove(), 700); }
}

// ── Definitief lichtontwerp (fase 4) ─────────────────────────────────────
// Eén echte schaduwwerper (CONFIG.renderer.maxShadowLights = 1): de warme zon
// die laag door de zuidgevel de hal in raakt.
const zon = new THREE.DirectionalLight(0xffe6c0, 1.85);
zon.position.set(86, 46, -42);
zon.target.position.set(26, 2, 52);
zon.castShadow = true;
zon.shadow.mapSize.set(CONFIG.renderer.shadowMapSize, CONFIG.renderer.shadowMapSize);
zon.shadow.camera.left = -55; zon.shadow.camera.right = 55;
zon.shadow.camera.top = 60; zon.shadow.camera.bottom = -60;
zon.shadow.camera.near = 10; zon.shadow.camera.far = 220;
zon.shadow.bias = -0.0015;
scene.add(zon, zon.target);
// Koele hemel-/warme grondvulling + lage ambient → meer contrast, donkerder
// onder de verdiepingen (noord).
scene.add(new THREE.HemisphereLight(0xdfe6ea, 0x554d44, 0.5));
scene.add(new THREE.AmbientLight(0xffffff, 0.09));

// Twee echte theaterspots op de kraanbrug boven de westtribune (warm, géén
// schaduw zodat het schaduwbudget bij de zon blijft). De wereld is gespiegeld
// (x→60−x); deze posities staan al in wereld-x boven de tribune.
for (const [pos, doel] of [
  [[44, 10.6, 33], [44, 4, 27]],
  [[51, 10.6, 31], [53, 3, 19]],
]) {
  const spot = new THREE.SpotLight(0xffe1ae, 2.4, 0, 0.6, 0.5, 0);
  spot.position.set(...pos);
  spot.target.position.set(...doel);
  spot.castShadow = false;
  scene.add(spot, spot.target);
}

// ── Wereld ────────────────────────────────────────────────────────────────
const wereld = bouwWereld(scene);
if (typeof window !== 'undefined') window.__wereld = wereld;

// ── Hologram-karakter (billboard, draait mee met de speler) ──────────────
// Hangt direct aan de scene (buiten de gespiegelde wereld-Group) in echte
// wereld-coördinaten; in elke render-lus updaten met de camera.
const hologram = bouwHologram(scene);
if (typeof window !== 'undefined') window.__hologram = hologram;

// ── Shot-modus: ?shot=<cameranaam> → vaste camera, geen besturing ────────
const params = new URLSearchParams(location.search);
const shotNaam = params.get('shot');

const klok = new THREE.Clock();

// 'vrij' = losse debug-camera: ?shot=vrij&pos=x,y,z&kijk=x,y,z
const vrij = shotNaam === 'vrij' && params.get('pos') && params.get('kijk')
  ? [params.get('pos').split(',').map(Number), params.get('kijk').split(',').map(Number)]
  : null;

if (params.get('climax')) {
  // ── Climax-test/-screenshotmodus: vrije camera, doorlopende lus, fasen via
  //    window.__climax (knoppen + handmatig). Geen speler/pointer-lock. ──────
  const cPos = params.get('pos') ? params.get('pos').split(',').map(Number) : [44, 8, 4];
  const cKijk = params.get('kijk') ? params.get('kijk').split(',').map(Number) : [24, 7, 18];
  camera.position.set(...cPos);
  camera.lookAt(...cKijk);
  document.getElementById('hint').style.display = 'none';
  document.getElementById('startuitleg').style.display = 'none';
  verbergLaadscherm();
  initClimax({
    scene, camera, renderer, zon, bloomPass,
    kroon: scene.getObjectByName('kroonluchter'),
    getSpelerPositie: () => ({ x: -99, y: 0, z: -99 }),   // buiten trapZone → handmatig sturen
  });
  renderer.setAnimationLoop(() => {
    const dt = Math.min(klok.getDelta(), 0.5);   // ruime cap: climax-test draait op echte tijd, ook bij trage (software-)rendering
    wereld.update(dt);
    hologram.update(camera, dt);
    updateClimax(dt);
    renderFrame();
  });
} else if (vrij || (shotNaam && CONFIG.cameras[shotNaam])) {
  const [pos, kijk] = vrij ?? CONFIG.cameras[shotNaam];
  camera.position.set(...pos);
  camera.lookAt(...kijk);
  document.getElementById('hint').style.display = 'none';
  document.getElementById('startuitleg').style.display = 'none';
  verbergLaadscherm();
  let frames = 0;
  renderer.setAnimationLoop(() => {
    const dt = klok.getDelta();
    wereld.update(dt);
    hologram.update(camera, dt);
    renderFrame();
    if (++frames >= 8) { window.__shotReady = true; renderer.setAnimationLoop(null); }
  });
} else {
  const speler = new Speler(camera, renderer.domElement, wereld);
  // ── Climax-effectketen: aansluiten met de speler als trapZone-trigger ────
  initClimax({
    scene, camera, renderer, zon, bloomPass,
    kroon: scene.getObjectByName('kroonluchter'),
    getSpelerPositie: () => speler.voeten,
    spelerEuler: speler.euler,
  });

  // ── Audio-laag: ontgrendelen + achtergrond starten via E-druk op de deur ──
  initAudio();
  const deurIt = wereld.interactables.find(
    (it) => typeof it.label === 'function' && it.label().includes('deur'));
  if (deurIt) {
    const origInteract = deurIt.onInteract;
    deurIt.onInteract = () => { origInteract(); audioDeurKlik(); onDeurGeopend(); };
  }

  // ── Lui laden: TV- en hologramvideo pas downloaden zodra de speler start ──
  // (eerste klik = pointer lock) — ruim op tijd vóór ze in de sequentie nodig
  // zijn (TV ~3 s later, hologram pas na deur+trap). Zo blijft de eerste
  // paginalading klein en snel.
  let luiGeladen = false;
  document.addEventListener('pointerlockchange', () => {
    if (luiGeladen || document.pointerLockElement !== renderer.domElement) return;
    luiGeladen = true;
    hologram.preload();
    if (wereld.preloadTV) wereld.preloadTV();
  });

  // ── Climax-sequentie ─────────────────────────────────────────────────────
  // 1) speler verlaat de zaal → na 1 s: lampenanimatie (camera richt erop);
  // 2) speler loopt de trap af → hologram start met afspelen (t = 0);
  // 3) 11 s na videostart → dag-nachtovergang;
  // 4) 12 s na videostart → hologram pauzeert 7 s (met wobbel), hervat daarna;
  // 5) 2 s voor het einde van de video → deeltjes vliegen naar de TV;
  // 6) na afloop keert het hologram terug naar de pauzestand (speelt niet opnieuw).
  const zaalBox = wereld.zaalBox();
  const TRAP_AF_Y = 4.0;         // voethoogte waaronder de speler 'de trap af' is (zaal ligt op f1 ≈ 5)
  const seq = {
    deurUit: false, lampTimer: 0, lampenGedaan: false,
    videoGestart: false, tVideo: 0,
    zonGedaan: false, pauzeGedaan: false, hervatGedaan: false, deeltjesGedaan: false,
    tweedeZonGedaan: false,
  };
  function buitenZaal(p) {
    return p.x < zaalBox.x0 - 0.3 || p.x > zaalBox.x1 + 0.3 ||
           p.z < zaalBox.z0 - 0.3 || p.z > zaalBox.z1 + 0.3;
  }
  function updateSequentie(dt) {
    const p = speler.voeten;
    // (1) zaal verlaten
    if (!seq.deurUit && buitenZaal(p)) seq.deurUit = true;
    // (1b) 1 s na verlaten → lampen
    if (seq.deurUit && !seq.lampenGedaan) {
      seq.lampTimer += dt;
      if (seq.lampTimer >= 1) { faseLampen(); seq.lampenGedaan = true; }
    }
    // (2) trap af → hologram afspelen (t = 0 voor de rest van de sequentie)
    if (seq.deurUit && !seq.videoGestart && p.y < TRAP_AF_Y) {
      if (wereld.stopTV) wereld.stopTV();      // nooit tegelijk met de TV
      hologram.speelAf(); seq.videoGestart = true;
    }
    if (!seq.videoGestart) return;
    seq.tVideo += dt;
    // (3) 11 s → dag-nacht
    if (!seq.zonGedaan && seq.tVideo >= 11) { faseZonsondergang(); seq.zonGedaan = true; }
    // (4) 12 s → 9 s pauze (2 s langer), daarna hervatten
    if (!seq.pauzeGedaan && seq.tVideo >= 12) { hologram.pauzeer(); seq.pauzeGedaan = true; }
    if (seq.pauzeGedaan && !seq.hervatGedaan && seq.tVideo >= 21) { hologram.hervat(); seq.hervatGedaan = true; }
    // (5) 7 s voor het einde van de video → deeltjes (robuust t.o.v. de pauze)
    if (!seq.deeltjesGedaan && seq.hervatGedaan) {
      const duur = hologram.duur();
      if (duur > 0 && hologram.tijd() >= duur - 7) { faseDeeltjes(); seq.deeltjesGedaan = true; }
    }
    // (6) hologram gestopt → 2e dag/nacht, nu eindigend op DAG (30% zachtere audio)
    if (seq.deeltjesGedaan && !seq.tweedeZonGedaan && hologram.isKlaar()) {
      faseZonsondergang({ naarDag: true }); seq.tweedeZonGedaan = true;
    }
  }

  // ── Bord: E trekt speler cinematisch naar de TV + invoerveld verschijnt ──
  const sm = (t) => t * t * (3 - 2 * t);
  const bordN = new THREE.Vector3(
    Math.sin(INSTELLINGEN.bordRotatieY), 0, Math.cos(INSTELLINGEN.bordRotatieY));
  const bordVoorPos = INSTELLINGEN.bordPositie.clone().addScaledVector(bordN, 2.5);
  bordVoorPos.y = 0;
  const bordEulerY = Math.atan2(bordN.x, bordN.z); // kijkrichting: recht op het bord

  // Verborgen input: vangt toetsaanslagen op terwijl de TV-invoer actief is.
  // Zichtbaar alleen op het TV-canvas zelf (via activeerTVAanmeld/updateTVTekst).
  const tvInputEl = document.createElement('input');
  tvInputEl.type = 'text'; tvInputEl.autocomplete = 'off';
  tvInputEl.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
  document.body.appendChild(tvInputEl);
  tvInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!tvInputEl.value.trim()) return;
      audioKlaar();
      bevestigTV();
      setTimeout(() => window.open(INSTELLINGEN.bordLink, '_blank', 'noopener'), 700);
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      audioKlik();
    }
  });
  tvInputEl.addEventListener('input', () => updateTVTekst(tvInputEl.value));

  let trekNaarTV = null;
  wereld.interactables.push({
    x: INSTELLINGEN.bordPositie.x + bordN.x * 3,
    z: INSTELLINGEN.bordPositie.z + bordN.z * 3,
    radius: 7,
    label: () => bordIsActief() ? 'E — meld je aan' : '',
    onInteract: () => {
      if (trekNaarTV || !bordIsActief()) return;
      if (document.exitPointerLock) document.exitPointerLock();
      trekNaarTV = { t: 0, duur: 1.6, startVoeten: speler.voeten.clone(), startEulerY: speler.euler.y };
    },
  });

  // ── TV in de StemmingMakerij: start 3 s na binnenkomst óf op spatie ──────
  // Nooit tegelijk met het hologram: als het hologram speelt, geen TV.
  const magTVStarten = () => wereld.startTV && !hologram.speeltAf();
  setTimeout(() => { if (magTVStarten()) wereld.startTV(); }, 3000);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && magTVStarten()) wereld.startTV();
  });

  const hint = document.getElementById('hint');

  // ── Debugtoets (ijking StemmingMakerij-referentiekader) ─────────────────
  // R = wrapper 90° verder draaien (waarde op het scherm)
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

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      const nieuw = wereld.zetZaalRotatie((wereld.zaalRotatie() + 90) % 360);
      toonHud(`Zaalrotatie: ${nieuw}°  (CONFIG.zaalRotatie)`);
    }
    // Beheerders-snelkoppeling (niet zichtbaar voor bezoekers): download alle
    // aanmeldingen als CSV. Combinatie zodat spelers 'm niet per ongeluk raken.
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
      const n = exporteerAanmeldingen();
      toonHud(n ? `${n} aanmelding(en) geëxporteerd als CSV` : 'Geen aanmeldingen om te exporteren');
    }
  });

  renderer.setAnimationLoop(() => {
    const dt = Math.min(klok.getDelta(), 0.05);
    if (trekNaarTV) {
      trekNaarTV.t += dt;
      const alpha = sm(Math.min(trekNaarTV.t / trekNaarTV.duur, 1));
      speler.voeten.lerpVectors(trekNaarTV.startVoeten, bordVoorPos, alpha);
      speler.euler.y = trekNaarTV.startEulerY + (bordEulerY - trekNaarTV.startEulerY) * alpha;
      camera.quaternion.setFromEuler(speler.euler);
      if (trekNaarTV.t >= trekNaarTV.duur) {
        trekNaarTV = null;
        activeerTVAanmeld();
        tvInputEl.value = '';
        setTimeout(() => tvInputEl.focus(), 100);
      }
    }
    wereld.update(dt);
    speler.update(dt);
    updateSequentie(dt);
    hologram.update(camera, dt);
    if (wereld.updateTVGeluid) wereld.updateTVGeluid(camera.position);
    updateClimax(dt);
    const h = speler.hintTekst();
    hint.textContent = h;
    hint.style.display = h ? 'block' : 'none';
    renderFrame();
    verbergLaadscherm();
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});
