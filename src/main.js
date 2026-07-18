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

// ── Mobiel-detectie: primaire aanwijzer is grof + geen hover = telefoon/
//    tablet-achtig touchscreen (sluit laptops met touchscreen + trackpad uit).
const MOBIEL = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

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
  const speler = new Speler(camera, renderer.domElement, wereld, { mobiel: MOBIEL });
  if (typeof window !== 'undefined') window.__speler = speler;
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
  // (eerste klik/tik) — ruim op tijd vóór ze in de sequentie nodig zijn (TV
  // ~3 s later, hologram pas na deur+trap). Zo blijft de eerste paginalading
  // klein en snel. Op desktop triggert pointer-lock dit; op mobiel de
  // starttik-overlay (verderop, waar de touch-besturing wordt opgezet).
  let luiGeladen = false;
  function startLuiLaden() {
    if (luiGeladen) return;
    luiGeladen = true;
    hologram.preload();
    if (wereld.preloadTV) wereld.preloadTV();
  }
  if (!MOBIEL) {
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === renderer.domElement) startLuiLaden();
    });
  }

  // ── Touch-besturing (telefoon/tablet) ─────────────────────────────────────
  // Vervangt pointer-lock + WASD volledig: een starttik-overlay, een virtuele
  // joystick linksonder (lopen), een aparte kijk-zone die de rest van het
  // scherm beslaat (vegen = rondkijken) en een ronde knop rechtsonder
  // (E = interactie). De kijk-zone is een eigen <div> die ONDER de joystick/
  // interactieknop in z-index zit — de browser routeert een aanraking dus
  // vanzelf (native hit-testing, geen handmatige elementFromPoint-trucs) naar
  // de bovenste laag die daar zit: joystick/knop pakken hun eigen gebied, de
  // rest van het scherm valt door naar de kijk-zone.
  if (MOBIEL) {
    document.body.classList.add('mobiel-besturing');   // blokkeert scroll/zoom-gebaren tijdens het spelen
    document.getElementById('startuitleg').textContent = 'Tik om te starten';

    const startOverlay = document.createElement('div');
    startOverlay.style.cssText = 'position:fixed;inset:0;z-index:150;display:flex;' +
      'align-items:center;justify-content:center;background:rgba(6,6,10,0.35);';
    startOverlay.innerHTML = '<div style="color:#f0e9dd;background:rgba(20,16,12,0.85);' +
      'border:1px solid rgba(255,230,189,0.35);border-radius:10px;padding:16px 26px;' +
      'font:18px Georgia,serif;">Tik om te beginnen</div>';
    document.body.appendChild(startOverlay);

    // kijk-zone: vult het hele scherm, laagste laag van de besturing (z-index
    // 60) — vangt élke aanraking op die niet al door joystick/knop (70) is
    // ingepikt. Zelf onzichtbaar (geen achtergrond), alleen voor het vegen.
    const kijkZone = document.createElement('div');
    kijkZone.id = 'kijkZone';
    kijkZone.style.cssText = 'display:none;position:fixed;inset:0;z-index:60;';
    document.body.appendChild(kijkZone);

    // joystick (linksonder): basis + knop, sleep om te lopen
    const joyBasis = document.createElement('div');
    joyBasis.id = 'joyBasis';
    joyBasis.style.cssText = 'display:none;position:fixed;left:26px;bottom:26px;z-index:70;' +
      'width:116px;height:116px;border-radius:50%;background:rgba(20,16,12,0.35);' +
      'border:2px solid rgba(255,230,189,0.35);';
    const joyKnop = document.createElement('div');
    joyKnop.style.cssText = 'position:absolute;left:38px;top:38px;width:40px;height:40px;' +
      'border-radius:50%;background:rgba(255,230,189,0.55);pointer-events:none;';
    joyBasis.appendChild(joyKnop);
    document.body.appendChild(joyBasis);

    // interactieknop (rechtsonder)
    const interactKnop = document.createElement('div');
    interactKnop.id = 'interactKnop';
    interactKnop.textContent = 'E';
    interactKnop.style.cssText = 'display:none;position:fixed;right:30px;bottom:36px;z-index:70;' +
      'width:74px;height:74px;border-radius:50%;background:rgba(20,16,12,0.55);' +
      'border:2px solid rgba(255,230,189,0.45);color:#ffe6bd;font:bold 22px Georgia,serif;' +
      'align-items:center;justify-content:center;user-select:none;';
    document.body.appendChild(interactKnop);

    function toonTouchBesturing() {
      kijkZone.style.display = 'block';
      joyBasis.style.display = 'block';
      interactKnop.style.display = 'flex';
    }

    startOverlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startOverlay.remove();
      speler.begin();
      startLuiLaden();
      toonTouchBesturing();
    }, { passive: false });

    // joystick-aansturing: eigen aanraking (touch-id), start alléén op de basis
    let joyId = null, joyCX = 0, joyCY = 0;
    const JOY_STRAAL = 58;
    joyBasis.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (joyId !== null) return;   // al een vinger op de joystick
      const t = e.changedTouches[0];
      joyId = t.identifier;
      const r = joyBasis.getBoundingClientRect();
      joyCX = r.left + r.width / 2; joyCY = r.top + r.height / 2;
      joyUpdate(t);
    }, { passive: false });
    joyBasis.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === joyId) joyUpdate(t);
    }, { passive: false });
    joyBasis.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === joyId) joyLos();
    }, { passive: true });
    joyBasis.addEventListener('touchcancel', (e) => {
      for (const t of e.changedTouches) if (t.identifier === joyId) joyLos();
    }, { passive: true });

    function joyUpdate(t) {
      let dx = t.clientX - joyCX, dy = t.clientY - joyCY;
      const len = Math.hypot(dx, dy);
      if (len > JOY_STRAAL) { dx = dx / len * JOY_STRAAL; dy = dy / len * JOY_STRAAL; }
      joyKnop.style.left = 38 + dx + 'px'; joyKnop.style.top = 38 + dy + 'px';
      speler.zetBeweging(dx / JOY_STRAAL, -dy / JOY_STRAAL);
    }
    function joyLos() {
      joyId = null;
      joyKnop.style.left = '38px'; joyKnop.style.top = '38px';
      speler.zetBeweging(0, 0);
    }

    // kijken: elke aanraking die op de kijk-zone zelf start (dus niet al
    // ingepikt door de joystick/interactieknop, die er via z-index bovenop
    // liggen — geen handmatige uitsluitingslogica nodig).
    let kijkId = null, kijkX = 0, kijkY = 0;
    kijkZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (kijkId !== null) return;
      const t = e.changedTouches[0];
      kijkId = t.identifier; kijkX = t.clientX; kijkY = t.clientY;
    }, { passive: false });
    kijkZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== kijkId) continue;
        speler.kijkDelta(t.clientX - kijkX, t.clientY - kijkY);
        kijkX = t.clientX; kijkY = t.clientY;
      }
    }, { passive: false });
    kijkZone.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === kijkId) kijkId = null;
    }, { passive: true });
    kijkZone.addEventListener('touchcancel', (e) => {
      for (const t of e.changedTouches) if (t.identifier === kijkId) kijkId = null;
    }, { passive: true });

    interactKnop.addEventListener('touchstart', (e) => { e.preventDefault(); speler.interactie(); }, { passive: false });
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
  tvInputEl.setAttribute('enterkeyhint', 'send');   // mobiel toetsenbord toont 'Verzenden' i.p.v. 'Enter'
  tvInputEl.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
  document.body.appendChild(tvInputEl);
  function _tvVerzenden() {
    if (!tvInputEl.value.trim()) return;
    audioKlaar();
    bevestigTV();
    if (tvMobielUI) tvMobielUI.style.display = 'none';
    setTimeout(() => window.open(INSTELLINGEN.bordLink, '_blank', 'noopener'), 700);
  }
  tvInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { _tvVerzenden(); }
    else if (!e.ctrlKey && !e.metaKey && !e.altKey) { audioKlik(); }
  });
  tvInputEl.addEventListener('input', () => updateTVTekst(tvInputEl.value));

  // ── Mobiel: 'tik om te typen' + zichtbare verzendknop ─────────────────────
  // iOS/Android openen het schermtoetsenbord alleen als .focus() rechtstreeks
  // vanuit een tik-handler komt (niet vanuit een setTimeout ná een animatie),
  // dus op mobiel tonen we een knop die de speler zelf moet aantikken. Ook de
  // 'Enter'-toets van sommige mobiele toetsenborden is onbetrouwbaar, vandaar
  // een expliciete Verzenden-knop.
  let tvMobielUI = null;
  if (MOBIEL) {
    tvMobielUI = document.createElement('div');
    tvMobielUI.style.cssText = 'display:none;position:fixed;bottom:14%;left:50%;transform:translateX(-50%);' +
      'z-index:85;flex-direction:column;gap:10px;align-items:center;';
    const tikKnop = document.createElement('button');
    tikKnop.textContent = 'Tik om te typen';
    tikKnop.style.cssText = 'background:rgba(14,31,69,0.92);color:#dfeaff;border:1px solid rgba(58,160,255,0.5);' +
      'border-radius:8px;padding:12px 22px;font:16px Georgia,serif;';
    tikKnop.addEventListener('click', () => { tvInputEl.focus(); tikKnop.style.display = 'none'; });
    const verzendKnop = document.createElement('button');
    verzendKnop.textContent = 'Verzenden →';
    verzendKnop.style.cssText = 'background:rgba(14,31,69,0.92);color:#dfeaff;border:1px solid rgba(58,160,255,0.5);' +
      'border-radius:8px;padding:12px 22px;font:16px Georgia,serif;';
    verzendKnop.addEventListener('click', _tvVerzenden);
    tvMobielUI.appendChild(tikKnop);
    tvMobielUI.appendChild(verzendKnop);
    document.body.appendChild(tvMobielUI);
    tvInputEl._tikKnop = tikKnop;   // om 'm opnieuw te tonen bij de volgende aanmelding
  }

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
        if (MOBIEL) {
          // schermtoetsenbord vereist een echte tik — toon de knoppen i.p.v. auto-focus
          tvInputEl._tikKnop.style.display = 'block';
          tvMobielUI.style.display = 'flex';
        } else {
          setTimeout(() => tvInputEl.focus(), 100);
        }
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
