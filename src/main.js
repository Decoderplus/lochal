// LocHal — app-schil: renderer (CONFIG is wet), wereld, speler, shot-modus.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { bouwWereld, MIRROR } from './world/index.js';
import { Speler } from './player.js';
import { initClimax, updateClimax, INSTELLINGEN, bordIsActief,
         activeerTVAanmeld, updateTVTekst, bevestigTV,
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
    // (4) 12 s → 7 s pauze, daarna hervatten
    if (!seq.pauzeGedaan && seq.tVideo >= 12) { hologram.pauzeer(); seq.pauzeGedaan = true; }
    if (seq.pauzeGedaan && !seq.hervatGedaan && seq.tVideo >= 19) { hologram.hervat(); seq.hervatGedaan = true; }
    // (5) 2 s voor het einde van de video → deeltjes (robuust t.o.v. de pauze)
    if (!seq.deeltjesGedaan && seq.hervatGedaan) {
      const duur = hologram.duur();
      if (duur > 0 && hologram.tijd() >= duur - 2) { faseDeeltjes(); seq.deeltjesGedaan = true; }
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
    if (kaartAan) tekenKaart();
    renderFrame();
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});
