// LocHal — CLIMAX-effectketen (zelfstandige module). Hergebruikt de bestaande
// renderer + bloom (via initClimax-parameters); leest geen andere modules in.
//
// Keten: faseLampen() → faseZonsondergang() → faseDeeltjes() → bord.
// Elke fase is los aanroepbaar maar ketent standaard automatisch door.
// startClimax() start de hele keten. updateClimax(dt) draait per frame.
import * as THREE from 'three';
import { audioChimes, audioNacht, audioNachtZacht } from './audio.js';

// ─────────────────────────────────────────────────────────────────────────
// ALLE regelbare waarden — pas hier aan.
// ─────────────────────────────────────────────────────────────────────────
export const INSTELLINGEN = {
  // ── Lampen (spiraal-golf, herhaalt 3 rondes, elke ronde sneller) ───────
  lampDuur: 3.0,                 // duur van de EERSTE spiraalronde (s)
  lampPulsDuur: 1.0,             // hoe lang één bol oplicht: fade in + fade uit (s)
  lampRondes: 3,                 // aantal spiraalrondes
  lampVersnelling: 2,            // elke volgende ronde dit keer sneller (2 = dubbel zo snel)
  lampSpiraalSlagen: 2.5,        // aantal slagen van de spiraal naar het midden
  lampKleur: 0xffe6b0,           // kleur waarmee elke kroonluchterbol oplicht (warm)

  // ── Start van de keten ─────────────────────────────────────────────────
  startVertraging: 5,            // seconden nadat de speler in trapZone staat → keten begint
  trapZone: { x: [12, 56], z: [24, 40], y: [-1, 9] }, // gebied op de trappen (wereld-coördinaten)

  // ── Zon / dag-nacht ────────────────────────────────────────────────────
  zonHoogteStart: 1.0,           // genormaliseerde zonhoogte begin (1 = hoog, dag)
  zonHoogteEind: -0.18,          // genormaliseerde zonhoogte eind (<0 = onder de horizon, nacht)
  zonAzimut: 2.35,               // horizontale hoek (radialen) waarlangs de zon zakt
  zonKleurDag: 0xffe6c0,         // lichtkleur overdag
  zonKleurGoud: 0xff6a1c,        // lichtkleur tijdens het gouden uur
  zonKleurNacht: 0x223a5e,       // lichtkleur 's nachts (koel donkerblauw)
  goudUurMoment: 0.45,           // zonhoogte (0–1) waarop het goud het sterkst is
  dagNachtDuur: 13.0,            // seconden voor de hele cyclus
  zonVersnelling: 1.8,           // >1 = merkbare versnelling (het eind gaat sneller dan het begin)
  zonZwaaien: 3,                 // halve dag-nacht-slagen; ONEVEN = eindigt 's nachts (start vanaf de
                                 //   HUIDIGE dag-stand → dag→nacht→dag→nacht, vloeiend, geen sprong)
  nachtExposure: 0.45,           // renderer-exposure aan het eind (nacht)
  nachtFogKleur: 0x0e1422,       // fog-kleur 's nachts
  schaduwMeebewegen: true,       // true = schaduwkaart elk frame updaten tijdens de overgang; false = bevriezen
  kroonGloedKracht: 2.6,         // 's nachts: warme gloed die de kroonluchter op de directe omgeving werpt

  // ── Deeltjes (dans naar het bord) ──────────────────────────────────────
  deeltjesAantal: 3000,          // aantal deeltjes (< 4000, één draw call)
  deeltjesKleur: 0xffd27a,       // kleur van de deeltjes
  deeltjesDuur: 6.0,             // seconden voor de vlucht van de lampen naar het bord
  padBochtigheid: 6.0,           // hoe sterk het pad buigt via het controlepunt (meters)
  deeltjesSpreiding: 3.0,        // spreiding van de zwerm (meters, via aRuis)
  deeltjesKronkel: 1.6,          // amplitude van de kleine slingerende omweg (meters)

  // ── Bord ───────────────────────────────────────────────────────────────
  bordFlitsKracht: 6.0,          // emissive-piek bij de landing
  bordGloed: 1.2,                // emissive-niveau waarop het bord daarna blijft gloeien
  bordTekst: 'Meld je aan',       // korte tekst op het bord
  bordLink: 'https://www.lochal.nl/', // URL die het bord opent (nieuw tabblad)

  // ── Posities (wereld-coördinaten) ──────────────────────────────────────
  lampPositie: new THREE.Vector3(21, 9, 16),  // centrum van de kroonluchterlampen — deeltjes-start
  bordPositie: new THREE.Vector3(0.7, 1.9, 18), // westmuur, links van de uitgang, op ooghoogte (deeltjes-eind)
  bordRotatieY: Math.PI / 2,     // draaiing zodat het bord PLAT op de muur hangt (π/2 = westmuur, naar de hal)
};

// ─────────────────────────────────────────────────────────────────────────
// Interne staat
// ─────────────────────────────────────────────────────────────────────────
let D = null;                    // dependencies (scene, camera, renderer, zon, bloomPass, kroon, getSpelerPositie)
let lampen = null;               // { volgorde:[{i, tijd}], origineel:[Color] }
let deeltjes = null;             // THREE.Points
let bord = null;                 // { mesh, mat }
let sterren = null;              // THREE.Points sterrenhemel, zichtbaar tijdens nacht
let kroonGloed = null;           // warme PointLight: gloed van de kroonluchter 's nachts
let bloomBasis = 0;              // basis bloom-strength (om naar terug te keren)

// ── TV-aanmeld staat ──────────────────────────────────────────────────────
let tvModus = false;             // true = speler typt op het bord
let tvTekst = '';                // huidige invoertekst (gespiegeld op TV-canvas)
let tvCursorAan = true;          // knipperende cursor
let tvCursorTimer = 0;           // timer voor cursor-blink (0.5 s interval)
let aanmeldCanvas = null;        // live canvas voor TV-tekstupdates
let aanmeldTex = null;           // bijbehorende CanvasTexture

// ── Camera-pan naar lampen ─────────────────────────────────────────────────
let camLampenGedaan = false;     // eenmalig per sessie

// animatie-toestanden (null = inactief)
const A = { lamp: null, zon: null, deeltjes: null, bord: null, camLampen: null };

// zon/sfeer-uitgangswaarden (om vloeiend vanaf de HUIDIGE stand te animeren)
let dagExposure = 1.0, dagZonIntensiteit = 1.85;
const dagFogKleur = new THREE.Color(0xd8d6d0);
let dagZon = null;               // { el, az, afstand, doel } — de zon zoals hij al stond

// trap-trigger
let inZoneSinds = -1, ketenGestart = false;

// ─────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────
export function initClimax(deps) {
  D = deps;
  dagExposure = D.renderer.toneMappingExposure;
  if (D.zon) {
    dagZonIntensiteit = D.zon.intensity;
    const dir = D.zon.position.clone().sub(D.zon.target.position).normalize();
    dagZon = {
      el: Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)),
      az: Math.atan2(dir.z, dir.x),
      afstand: D.zon.position.distanceTo(D.zon.target.position),
      doel: D.zon.target.position.clone(),
    };
  }
  if (D.scene.fog) dagFogKleur.copy(D.scene.fog.color);
  bloomBasis = D.bloomPass ? D.bloomPass.strength : 0;

  bouwBord();
  bouwDeeltjes();
  bouwSterren();
  // warme gloed van de kroonluchter (uit overdag, fade-in 's nachts)
  kroonGloed = new THREE.PointLight(0xffdca8, 0, 34, 2);
  kroonGloed.position.copy(INSTELLINGEN.lampPositie);
  kroonGloed.castShadow = false;
  D.scene.add(kroonGloed);
  // kloon daklichten-materiaal zodat we het 's nachts apart kunnen aanpassen
  { const dl = D.scene.getObjectByName('daklichten'); if (dl) dl.material = dl.material.clone(); }
  bouwTestknoppen();

  // klik op het bord → open de link (na de flits)
  if (typeof window !== 'undefined') {
    const ray = new THREE.Raycaster();
    D.renderer.domElement.addEventListener('click', (e) => {
      if (!bord || !bord.actief) return;
      const r = D.renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, D.camera);
      if (ray.intersectObject(bord.mesh, false).length) {
        window.open(INSTELLINGEN.bordLink, '_blank', 'noopener');
      }
    });
  }

  const api = {
    startClimax, faseLampen, faseZonsondergang, faseDeeltjes, updateClimax, INSTELLINGEN,
    _debug: () => ({
      zon: A.zon ? +A.zon.t.toFixed(2) : null,
      deeltjes: A.deeltjes ? +A.deeltjes.t.toFixed(2) : null,
      exp: +D.renderer.toneMappingExposure.toFixed(3),
      bord: bord ? bord.actief : null,
    }),
  };
  if (typeof window !== 'undefined') window.__climax = api;
  return api;
}

// ─────────────────────────────────────────────────────────────────────────
// Overkoepelende start
// ─────────────────────────────────────────────────────────────────────────
export function bordIsActief() { return !!(bord && bord.actief); }

export function startClimax() {
  ketenGestart = true;
  faseLampen();
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 1 — Lampen: spiraal-golf van laag/buiten naar hoog/binnen.
// ─────────────────────────────────────────────────────────────────────────
export function faseLampen() {
  audioChimes();                           // sprankels bij start lampenspiraal (eenmalig)

  // cinematische camerabeweging: eenmalig, pan naar de lampen + 1 sec vasthouden
  if (D.spelerEuler && !camLampenGedaan) {
    camLampenGedaan = true;
    const cam = D.camera.position;
    const dx = INSTELLINGEN.lampPositie.x - cam.x;
    const dz = INSTELLINGEN.lampPositie.z - cam.z;
    A.camLampen = { t: 0, panDuur: 2.4, holdDuur: 1.0,
      startY: D.spelerEuler.y,
      doelY: Math.atan2(-dx, -dz),
    };
  }

  const kroon = D.kroon;
  if (!kroon || !kroon.isInstancedMesh) { faseZonsondergang(); return; }
  const n = kroon.count;
  const m = new THREE.Matrix4(), p = new THREE.Vector3();

  // centroïde (xz) van de bollen
  const centrum = new THREE.Vector3();
  const pos = [];
  for (let i = 0; i < n; i++) {
    kroon.getMatrixAt(i, m); p.setFromMatrixPosition(m); pos.push(p.clone()); centrum.add(p);
  }
  centrum.multiplyScalar(1 / Math.max(n, 1));

  // spiraal NAAR HET MIDDEN: buiten → binnen, roterend (afstand + hoek)
  let dMax = 0;
  const info = pos.map((q) => {
    const dx = q.x - centrum.x, dz = q.z - centrum.z;
    const d = Math.hypot(dx, dz); dMax = Math.max(dMax, d);
    return { d, hoek: Math.atan2(dz, dx) };
  });
  const spiraal = (r) => (1 - r.d / Math.max(dMax, 0.001)) * Math.PI * 2 * INSTELLINGEN.lampSpiraalSlagen + r.hoek;
  const volgorde = pos.map((_, i) => i).sort((a, b) => spiraal(info[a]) - spiraal(info[b]));
  const rang = new Array(n);
  volgorde.forEach((bol, plek) => { rang[bol] = plek; });

  // bewaar originele kleuren (om elke puls vanaf te animeren en aan het eind te herstellen)
  const origineel = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (kroon.instanceColor) kroon.getColorAt(i, c); else c.set(0xffffff);
    origineel.push(c.clone());
  }
  // totale duur = som van alle (steeds snellere) rondes
  let totaal = 0;
  for (let r = 0; r < INSTELLINGEN.lampRondes; r++) totaal += INSTELLINGEN.lampDuur / Math.pow(INSTELLINGEN.lampVersnelling, r);

  lampen = { origineel, rang, n, totaal };
  A.lamp = { t: 0 };
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 2 — Zonsondergang: één bewegende zonhoogte stuurt boog + kleur + sfeer.
// ─────────────────────────────────────────────────────────────────────────
export function faseZonsondergang(opties = {}) {
  const naarDag = opties.naarDag === true;   // true = 2e overgang: eindigt op DAG, zachtere audio
  if (naarDag) audioNachtZacht();            // 30% zachter
  else audioNacht();                         // omslaggeluid bij dag→nacht (eenmalig)
  A.zon = { t: 0, naarDag };
  if (D.zon) D.zon.shadow.mapSize.set(1024, 1024);   // één schaduwwerper, kaart 1024
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 3 — Deeltjes: gebogen, gespreide zwerm van de lampen naar het bord.
// ─────────────────────────────────────────────────────────────────────────
export function faseDeeltjes() {
  if (deeltjes) deeltjes.visible = true;
  if (deeltjes) deeltjes.material.uniforms.uOpacity.value = 1;
  A.deeltjes = { t: 0, geland: false };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-frame update
// ─────────────────────────────────────────────────────────────────────────
export function updateClimax(dt) {
  // De fasen worden aangestuurd door de sequentie-orkestratie in main.js
  // (deur verlaten → lampen; trap af → hologram; en getimede fasen daarna).
  if (A.camLampen) updateCamLampen(dt);
  if (A.lamp) updateLampen(dt);
  if (A.zon) updateZon(dt);
  if (A.deeltjes) updateDeeltjes(dt);
  if (A.bord) updateBord(dt);
  if (tvModus) _updateTVCursor(dt);
}

function updateLampen(dt) {
  A.lamp.t += dt;
  const I = INSTELLINGEN, n = lampen.n, kroon = D.kroon;
  const c = new THREE.Color(), fel = new THREE.Color(I.lampKleur);

  // huidige (steeds snellere) ronde + lokale tijd + puls-/sweepduur
  let start = 0, sweep = I.lampDuur, puls = I.lampPulsDuur, lokaal = A.lamp.t;
  for (let r = 0; r < I.lampRondes; r++) {
    const dur = I.lampDuur / Math.pow(I.lampVersnelling, r);
    if (A.lamp.t < start + dur || r === I.lampRondes - 1) {
      sweep = dur; puls = I.lampPulsDuur / Math.pow(I.lampVersnelling, r); lokaal = A.lamp.t - start; break;
    }
    start += dur;
  }

  // elke bol pulst (sin = fade in + fade uit) op zijn spiraal-ontsteektijd
  for (let i = 0; i < n; i++) {
    const ontsteek = (lampen.rang[i] / Math.max(n - 1, 1)) * Math.max(sweep - puls, 0.001);
    const tau = lokaal - ontsteek;
    const f = (tau >= 0 && tau <= puls) ? Math.sin(Math.PI * (tau / puls)) : 0;
    c.copy(lampen.origineel[i]).lerp(fel, f * 0.9).multiplyScalar(1 + f * 1.8);
    kroon.setColorAt(i, c);
  }
  if (kroon.instanceColor) kroon.instanceColor.needsUpdate = true;

  if (A.lamp.t >= lampen.totaal) {                 // alle rondes klaar → herstel (geen auto-keten)
    for (let i = 0; i < n; i++) kroon.setColorAt(i, lampen.origineel[i]);
    if (kroon.instanceColor) kroon.instanceColor.needsUpdate = true;
    A.lamp = null;
  }
}

function updateZon(dt) {
  A.zon.t += dt;
  const I = INSTELLINGEN;
  const raw = THREE.MathUtils.clamp(A.zon.t / I.dagNachtDuur, 0, 1);
  const warp = Math.pow(raw, I.zonVersnelling);        // merkbare versnelling (eind sneller)
  // h01: 1 = dag, 0 = nacht.
  //  • normaal: start op 1 (huidige dag-stand) → eindigt op 0 (nacht), via
  //    dag→nacht→dag→nacht (zonZwaaien oneven).
  //  • naarDag (2e overgang): start op 0 (nacht) → eindigt op 1 (DAG), zonsopkomst.
  const h01 = A.zon.naarDag
    ? 0.5 - 0.5 * Math.cos(Math.PI * warp)
    : 0.5 + 0.5 * Math.cos(Math.PI * warp * I.zonZwaaien);
  const nacht = smooth(1 - h01);                       // 1 's nachts, 0 overdag

  // (a) directional light: vertrekt vanaf de huidige stand (dagZon) en draait/
  //     zakt mee → schaduwen verlengen en bewegen.
  if (D.zon && dagZon) {
    const el = THREE.MathUtils.lerp(I.zonHoogteEind * 0.45 * Math.PI, dagZon.el, h01); // dag-elevatie ↔ nacht (onder horizon)
    const az = dagZon.az + warp * I.zonAzimut;          // de zon draait gestaag weg
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    D.zon.position.copy(dagZon.doel).addScaledVector(dir, dagZon.afstand);
    D.zon.target.position.copy(dagZon.doel); D.zon.target.updateMatrixWorld();
    // (b) lichtkleur op zonhoogte: dag → goud → nacht (en terug)
    D.zon.color.copy(zonKleurOpHoogte(h01));
    D.zon.intensity = THREE.MathUtils.lerp(0.12, dagZonIntensiteit, smooth(h01)) *
      (1 + 0.4 * Math.exp(-Math.pow((h01 - I.goudUurMoment) / 0.14, 2)));   // gouden opflakkering
    D.zon.shadow.autoUpdate = (I.schaduwMeebewegen && raw < 1);
    if (I.schaduwMeebewegen) D.zon.shadow.needsUpdate = true;
  }

  // (c) exposure + fog: dag ↔ nacht
  D.renderer.toneMappingExposure = THREE.MathUtils.lerp(dagExposure, I.nachtExposure, nacht);
  if (D.scene.fog) {
    D.scene.fog.color.copy(dagFogKleur).lerp(new THREE.Color(I.nachtFogKleur), nacht);
    if (D.scene.background && D.scene.background.isColor) D.scene.background.copy(D.scene.fog.color);
  }

  // sterren: fade in zodra het donker wordt
  if (sterren) sterren.material.opacity = THREE.MathUtils.clamp((nacht - 0.25) / 0.5, 0, 1);
  // kroonluchter-gloed: warme gloed op de directe omgeving, sterker naarmate het donkerder is
  if (kroonGloed) kroonGloed.intensity = nacht * I.kroonGloedKracht;
  // daklichten: transparant bij nacht zodat sterren er doorheen zichtbaar zijn
  { const dl = D.scene.getObjectByName('daklichten');
    if (dl) {
      dl.material.transparent = true;
      dl.material.opacity = THREE.MathUtils.clamp(1 - nacht * 0.88, 0.12, 1);
      dl.material.emissiveIntensity = THREE.MathUtils.lerp(0.65, 0.0, nacht);
    }
  }

  if (raw >= 1) { A.zon = null; }                  // klaar (geen auto-keten naar deeltjes)
}

function updateDeeltjes(dt) {
  A.deeltjes.t += dt;
  const u = deeltjes.material.uniforms;
  const p = THREE.MathUtils.clamp(A.deeltjes.t / INSTELLINGEN.deeltjesDuur, 0, 1);
  u.uProgress.value = p;

  if (p >= 1 && !A.deeltjes.geland) {
    A.deeltjes.geland = true;
    A.deeltjes.fade = 0;
    faseBordFlits();                              // bord licht op bij de landing
  }
  if (A.deeltjes.geland) {                        // ophopen + vervagen
    A.deeltjes.fade += dt;
    u.uOpacity.value = THREE.MathUtils.clamp(1 - A.deeltjes.fade / 1.6, 0, 1);
    if (A.deeltjes.fade > 1.7) { deeltjes.visible = false; A.deeltjes = null; }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Bord
// ─────────────────────────────────────────────────────────────────────────
function faseBordFlits() {
  if (!bord) return;
  bord.actief = true;
  A.bord = { t: 0 };
}
function updateBord(dt) {
  A.bord.t += dt;
  const I = INSTELLINGEN;
  // flits-piek → terug naar zachte gloed
  const piek = I.bordFlitsKracht * Math.exp(-A.bord.t / 0.8);   // langere nagloei
  bord.mat.emissiveIntensity = Math.max(I.bordGloed, piek);
  if (D.bloomPass) D.bloomPass.strength = bloomBasis + Math.max(0, (piek - I.bordGloed)) * 0.15;
  if (A.bord.t > 2.5) { bord.mat.emissiveIntensity = I.bordGloed; if (D.bloomPass) D.bloomPass.strength = bloomBasis; A.bord = null; }
}

function bouwBord() {
  // Zelfde verschijning als de TV in de StemmingMakerij: donker kader + glanzend
  // scherm met gloeiende tekst — PLAT op de muur.
  const P = INSTELLINGEN.bordPositie, ry = INSTELLINGEN.bordRotatieY;
  const normaal = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));   // schermrichting
  const breed = 2.6, hoog = 1.55;

  const kader = new THREE.Mesh(
    new THREE.BoxGeometry(breed + 0.18, hoog + 0.18, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.7 }));
  kader.position.copy(P); kader.rotation.y = ry;
  D.scene.add(kader);

  const tex = bordTextuur(INSTELLINGEN.bordTekst);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06,
    roughness: 0.4, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(breed, hoog), mat);
  mesh.position.copy(P).addScaledVector(normaal, 0.07);   // net vóór het kader
  mesh.rotation.y = ry;                                    // plat op de muur
  mesh.name = 'climaxBord';
  D.scene.add(mesh);
  bord = { mesh, mat, actief: false };
}

function bordTextuur(tekst) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 600;
  const x = c.getContext('2d');
  x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, c.width, c.height);       // donker scherm (zoals de TV)
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#dfeaff'; x.shadowColor = '#3aa0ff'; x.shadowBlur = 26;
  x.font = 'bold 150px sans-serif';
  x.fillText(tekst, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ─────────────────────────────────────────────────────────────────────────
// Deeltjes (één THREE.Points, GPU, alleen uProgress per frame)
// ─────────────────────────────────────────────────────────────────────────
function bouwDeeltjes() {
  const N = Math.min(INSTELLINGEN.deeltjesAantal, 3999);
  const geo = new THREE.BufferGeometry();
  const aStart = new Float32Array(N * 3), aEind = new Float32Array(N * 3);
  const aVertraging = new Float32Array(N), aRuis = new Float32Array(N * 3);
  const L = INSTELLINGEN.lampPositie, B = INSTELLINGEN.bordPositie, sp = INSTELLINGEN.deeltjesSpreiding;
  for (let i = 0; i < N; i++) {
    aStart[i * 3] = L.x + (Math.random() - 0.5) * 3.0;
    aStart[i * 3 + 1] = L.y + (Math.random() - 0.5) * 2.5;
    aStart[i * 3 + 2] = L.z + (Math.random() - 0.5) * 3.0;
    aEind[i * 3] = B.x + (Math.random() - 0.5) * 0.8;       // tegen de muur → smal in x
    aEind[i * 3 + 1] = B.y + (Math.random() - 0.5) * 1.0;
    aEind[i * 3 + 2] = B.z + (Math.random() - 0.5) * 2.4;   // langs de bordbreedte
    aVertraging[i] = Math.random();
    aRuis[i * 3] = (Math.random() - 0.5) * 2 * sp;
    aRuis[i * 3 + 1] = (Math.random() - 0.5) * 2 * sp;
    aRuis[i * 3 + 2] = (Math.random() - 0.5) * 2 * sp;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(aStart.slice(), 3)); // dummy (shader rekent zelf)
  geo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3));
  geo.setAttribute('aEind', new THREE.BufferAttribute(aEind, 3));
  geo.setAttribute('aVertraging', new THREE.BufferAttribute(aVertraging, 1));
  geo.setAttribute('aRuis', new THREE.BufferAttribute(aRuis, 3));

  // controlepunt-richting (buiging) + loodrechte assen voor de slinger-omweg
  const dir = B.clone().sub(L).normalize();
  const zij = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const opVec = new THREE.Vector3().crossVectors(zij, dir).normalize();
  const bend = new THREE.Vector3(0, 1, 0).multiplyScalar(INSTELLINGEN.padBochtigheid)
    .addScaledVector(zij, INSTELLINGEN.padBochtigheid * 0.35);

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
      uBend: { value: bend },
      uZij: { value: zij },
      uOp: { value: opVec },
      uKronkel: { value: INSTELLINGEN.deeltjesKronkel },
      uSize: { value: 38.0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
      uColor: { value: new THREE.Color(INSTELLINGEN.deeltjesKleur) },
    },
    vertexShader: `
      uniform float uProgress; uniform vec3 uBend; uniform vec3 uZij; uniform vec3 uOp;
      uniform float uKronkel; uniform float uSize; uniform float uPixelRatio;
      attribute vec3 aStart; attribute vec3 aEind; attribute float aVertraging; attribute vec3 aRuis;
      varying float vA;
      void main(){
        float t = smoothstep(0.0, 1.0, clamp(uProgress - aVertraging, 0.0, 1.0));
        vec3 ctrl = mix(aStart, aEind, 0.5) + uBend;              // gebogen pad via controlepunt
        vec3 a = mix(aStart, ctrl, t);
        vec3 b = mix(ctrl, aEind, t);
        vec3 p = mix(a, b, t);
        // kleine slingerende omweg, dovend aan begin/eind zodat ze tóch op het bord landen
        float w = sin(3.14159 * t);
        float fase = aVertraging * 6.2831;
        p += uZij * sin(t * 9.0 + fase) * uKronkel * w;
        p += uOp  * cos(t * 6.0 + fase) * uKronkel * 0.55 * w;
        p += aRuis * (1.0 - t);                                   // spreiding, dovend naar de landing
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPixelRatio / max(-mv.z, 0.1);
        vA = 0.2 + 0.8 * t;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if(r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r);                        // zachte ronde punt
        gl_FragColor = vec4(uColor, a * vA * uOpacity);
      }`,
  });
  deeltjes = new THREE.Points(geo, mat);
  deeltjes.frustumCulled = false;
  deeltjes.visible = false;
  deeltjes.name = 'climaxDeeltjes';
  D.scene.add(deeltjes);
}

// ─────────────────────────────────────────────────────────────────────────
// Sterrenhemel (zichtbaar door de dakramen tijdens de nachtfase)
// ─────────────────────────────────────────────────────────────────────────
function bouwSterren() {
  const N = 900;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 220;
    pos[i * 3 + 1] = 28 + Math.random() * 50;     // boven de hal (y 28–78)
    pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf0f4ff, size: 0.28, transparent: true, opacity: 0,
    depthWrite: false, sizeAttenuation: true,
  });
  sterren = new THREE.Points(geo, mat);
  sterren.frustumCulled = false;
  D.scene.add(sterren);
}

// ─────────────────────────────────────────────────────────────────────────
// Cinematische camera-pan naar de lampen
// ─────────────────────────────────────────────────────────────────────────
function updateCamLampen(dt) {
  if (!D.spelerEuler) { A.camLampen = null; return; }
  const c = A.camLampen;
  c.t += dt;
  if (c.t <= c.panDuur) {
    // pan-fase: soepele draai naar de lampen
    const alpha = smooth(c.t / c.panDuur);
    D.spelerEuler.y = c.startY + (c.doelY - c.startY) * alpha;
  }
  // camera wordt op de lampen gericht (pan + hold), zodat de speler het ziet
  if (D.camera) D.camera.quaternion.setFromEuler(D.spelerEuler);
  // hold-fase: euler.y blijft op doelY (niets aanpassen), gewoon wachten
  if (c.t >= c.panDuur + c.holdDuur) A.camLampen = null;
}

// ─────────────────────────────────────────────────────────────────────────
// TV-aanmeld systeem: canvas-textuur op het bord met live invoer + cursor
// ─────────────────────────────────────────────────────────────────────────
export function activeerTVAanmeld() {
  if (!bord || typeof document === 'undefined') return;
  tvModus = true; tvTekst = ''; tvCursorAan = true; tvCursorTimer = 0;
  aanmeldCanvas = document.createElement('canvas');
  aanmeldCanvas.width = 1024; aanmeldCanvas.height = 600;
  _tekenAanmeld();
  aanmeldTex = new THREE.CanvasTexture(aanmeldCanvas);
  aanmeldTex.colorSpace = THREE.SRGBColorSpace;
  bord.mat.map = aanmeldTex; bord.mat.emissiveMap = aanmeldTex;
  bord.mat.emissiveIntensity = 0.5; bord.mat.needsUpdate = true;
}

export function updateTVTekst(tekst) {
  tvTekst = tekst;
  if (!tvModus || !aanmeldCanvas) return;
  _tekenAanmeld();
  if (aanmeldTex) aanmeldTex.needsUpdate = true;
}

export function bevestigTV() {
  // sla aanmelding op in localStorage
  try {
    const lijst = JSON.parse(localStorage.getItem('lochal_aanmeldingen') || '[]');
    lijst.push({ tekst: tvTekst, tijd: new Date().toISOString() });
    localStorage.setItem('lochal_aanmeldingen', JSON.stringify(lijst));
  } catch (_) {}

  tvModus = false;
  if (!aanmeldCanvas) return;
  const ctx = aanmeldCanvas.getContext('2d');
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 1024, 600);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a0d8ff'; ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 30;
  ctx.font = 'bold 96px sans-serif'; ctx.fillText('✓', 512, 220);
  ctx.shadowBlur = 10; ctx.font = '40px Georgia, serif';
  ctx.fillStyle = '#dfeaff'; ctx.fillText('Bedankt!', 512, 360);
  if (aanmeldTex) aanmeldTex.needsUpdate = true;
}

// ── Export: alle lokaal opgeslagen aanmeldingen als CSV-bestand downloaden ──
// (offline opslag = localStorage, hierboven; dit is de "online"-route: de
// beheerder downloadt het bestand en zet het zelf ergens online — mail,
// Drive, Sheets, enz. Geen extra account/server nodig.)
export function exporteerAanmeldingen() {
  if (typeof document === 'undefined') return;
  let lijst = [];
  try { lijst = JSON.parse(localStorage.getItem('lochal_aanmeldingen') || '[]'); } catch (_) {}
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const regels = ['tekst,tijd', ...lijst.map((a) => `${escapeCsv(a.tekst)},${escapeCsv(a.tijd)}`)];
  const csv = '﻿' + regels.join('\r\n');   // BOM: accenten (é, ë) tonen correct in Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lochal-aanmeldingen-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  return lijst.length;
}

function _tekenAanmeld() {
  const ctx = aanmeldCanvas.getContext('2d');
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 1024, 600);

  // koptekst
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dfeaff'; ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 22;
  ctx.font = 'bold 58px sans-serif'; ctx.fillText('MELD JE AAN', 512, 110);

  // invoerveld
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,18,36,0.82)'; ctx.fillRect(60, 195, 904, 88);
  ctx.strokeStyle = '#3aa0ff55'; ctx.lineWidth = 1.5; ctx.strokeRect(60, 195, 904, 88);

  // getypte tekst + cursor
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dfeaff'; ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 6;
  ctx.font = '44px Georgia, serif';
  ctx.fillText((tvTekst || '') + (tvCursorAan ? '|' : ''), 84, 239);

  // verstuur-knop (prominent, blauw, gloed)
  ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#0e2d5e'; ctx.fillRect(60, 332, 904, 96);
  ctx.strokeStyle = '#60b0ff'; ctx.lineWidth = 2.5; ctx.strokeRect(60, 332, 904, 96);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText('VERSTUUR  →', 512, 380);

  ctx.shadowBlur = 0;
}

function _updateTVCursor(dt) {
  tvCursorTimer += dt;
  if (tvCursorTimer >= 0.5) {
    tvCursorTimer = 0; tvCursorAan = !tvCursorAan;
    if (aanmeldCanvas) { _tekenAanmeld(); if (aanmeldTex) aanmeldTex.needsUpdate = true; }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Hulp
// ─────────────────────────────────────────────────────────────────────────
function smooth(t) { return t * t * (3 - 2 * t); }
// kleur op zonhoogte h01 (0 nacht … 1 dag): nacht → goud (rond goudUurMoment) → dag
function zonKleurOpHoogte(h01) {
  const I = INSTELLINGEN, g = I.goudUurMoment, c = new THREE.Color();
  if (h01 <= g) c.set(I.zonKleurNacht).lerp(new THREE.Color(I.zonKleurGoud), smooth(h01 / Math.max(g, 0.001)));
  else c.set(I.zonKleurGoud).lerp(new THREE.Color(I.zonKleurDag), smooth((h01 - g) / Math.max(1 - g, 0.001)));
  return c;
}

// ─────────────────────────────────────────────────────────────────────────
// Testknoppen (hele keten + elke fase los)
// ─────────────────────────────────────────────────────────────────────────
function bouwTestknoppen() {
  if (typeof document === 'undefined') return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:60;display:flex;gap:6px;' +
    'font:12px system-ui,sans-serif;';
  const knop = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:rgba(20,16,12,0.8);color:#ffe6bd;border:1px solid #6a5a3a;' +
      'border-radius:5px;padding:5px 9px;cursor:pointer;';
    b.onclick = (e) => { e.stopPropagation(); fn(); };
    wrap.appendChild(b);
  };
  knop('▶ Climax', startClimax);
  knop('Lampen', faseLampen);
  knop('Zon', faseZonsondergang);
  knop('Deeltjes', faseDeeltjes);
  document.body.appendChild(wrap);
}
