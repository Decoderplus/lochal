// LocHal — CLIMAX-effectketen (zelfstandige module). Hergebruikt de bestaande
// renderer + bloom (via initClimax-parameters); leest geen andere modules in.
//
// Keten: faseLampen() → faseZonsondergang() → faseDeeltjes() → bord.
// Elke fase is los aanroepbaar maar ketent standaard automatisch door.
// startClimax() start de hele keten. updateClimax(dt) draait per frame.
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
// ALLE regelbare waarden — pas hier aan.
// ─────────────────────────────────────────────────────────────────────────
export const INSTELLINGEN = {
  // ── Lampen (spiraal-golf) ──────────────────────────────────────────────
  lampDuur: 3.0,                 // seconden waarover alle bollen sequentieel ontsteken
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
  goudUurMoment: 0.6,            // moment (0–1) in de overgang waarop het goud het sterkst is
  dagNachtDuur: 12.0,            // seconden voor de hele zonsondergang-overgang
  nachtExposure: 0.45,           // renderer-exposure aan het eind (nacht)
  nachtFogKleur: 0x0e1422,       // fog-kleur 's nachts
  schaduwMeebewegen: true,       // true = schaduwkaart elk frame updaten tijdens de overgang; false = bevriezen

  // ── Deeltjes (dans naar het bord) ──────────────────────────────────────
  deeltjesAantal: 3000,          // aantal deeltjes (< 4000, één draw call)
  deeltjesKleur: 0xffd27a,       // kleur van de deeltjes
  deeltjesDuur: 6.0,             // seconden voor de vlucht van de lampen naar het bord
  padBochtigheid: 6.0,           // hoe sterk het pad buigt via het controlepunt (meters)
  deeltjesSpreiding: 3.0,        // spreiding van de zwerm (meters, via aRuis)

  // ── Bord ───────────────────────────────────────────────────────────────
  bordFlitsKracht: 6.0,          // emissive-piek bij de landing
  bordGloed: 1.2,                // emissive-niveau waarop het bord daarna blijft gloeien
  bordTekst: 'DOE MEE',          // korte tekst op het bord
  bordLink: 'https://www.lochal.nl/', // URL die het bord opent (nieuw tabblad)

  // ── Posities (wereld-coördinaten) ──────────────────────────────────────
  lampPositie: new THREE.Vector3(21, 9, 16),  // centrum van de kroonluchterlampen — deeltjes-start
  bordPositie: new THREE.Vector3(34, 6, 9),   // positie van het bord — deeltjes-eind
};

// ─────────────────────────────────────────────────────────────────────────
// Interne staat
// ─────────────────────────────────────────────────────────────────────────
let D = null;                    // dependencies (scene, camera, renderer, zon, bloomPass, kroon, getSpelerPositie)
let lampen = null;               // { volgorde:[{i, tijd}], origineel:[Color] }
let deeltjes = null;             // THREE.Points
let bord = null;                 // { mesh, mat }
let bloomBasis = 0;              // basis bloom-strength (om naar terug te keren)

// animatie-toestanden (null = inactief)
const A = { lamp: null, zon: null, deeltjes: null, bord: null };

// zon/sfeer-uitgangswaarden (om vanaf te animeren)
let dagExposure = 1.0, dagZonIntensiteit = 1.85;
const dagFogKleur = new THREE.Color(0xd8d6d0);

// trap-trigger
let inZoneSinds = -1, ketenGestart = false;

// ─────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────
export function initClimax(deps) {
  D = deps;
  dagExposure = D.renderer.toneMappingExposure;
  if (D.zon) dagZonIntensiteit = D.zon.intensity;
  if (D.scene.fog) dagFogKleur.copy(D.scene.fog.color);
  bloomBasis = D.bloomPass ? D.bloomPass.strength : 0;

  bouwBord();
  bouwDeeltjes();
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
export function startClimax() {
  ketenGestart = true;
  faseLampen();
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 1 — Lampen: spiraal-golf van laag/buiten naar hoog/binnen.
// ─────────────────────────────────────────────────────────────────────────
export function faseLampen() {
  const kroon = D.kroon;
  if (!kroon || !kroon.isInstancedMesh) { faseZonsondergang(); return; }
  const n = kroon.count;
  const m = new THREE.Matrix4(), p = new THREE.Vector3();

  // centroïde van de bollen (lokaal; spiegeling doet er voor de volgorde niet toe)
  const centrum = new THREE.Vector3();
  const pos = [];
  for (let i = 0; i < n; i++) {
    kroon.getMatrixAt(i, m); p.setFromMatrixPosition(m); pos.push(p.clone()); centrum.add(p);
  }
  centrum.multiplyScalar(1 / Math.max(n, 1));

  // sorteersleutel: laag (kleine y) + buiten (grote afstand) eerst → hoog/binnen laatst,
  // met een hoekterm zodat het licht naar binnen/omhoog kríngelt (spiraal).
  let yMin = Infinity, yMax = -Infinity, dMax = 0;
  const ruw = pos.map((q) => {
    const dx = q.x - centrum.x, dz = q.z - centrum.z;
    const d = Math.hypot(dx, dz), hoek = Math.atan2(dz, dx);
    yMin = Math.min(yMin, q.y); yMax = Math.max(yMax, q.y); dMax = Math.max(dMax, d);
    return { d, hoek, y: q.y };
  });
  const volgorde = pos.map((_, i) => i).sort((a, b) => {
    const A1 = sleutel(ruw[a]), B1 = sleutel(ruw[b]); return A1 - B1;
  });
  function sleutel(r) {
    const hN = (r.y - yMin) / Math.max(yMax - yMin, 0.001);   // 0 laag … 1 hoog
    const dN = r.d / Math.max(dMax, 0.001);                   // 0 binnen … 1 buiten
    const aN = (r.hoek + Math.PI) / (2 * Math.PI);            // spiraal-veeg
    return (hN - dN) + aN * 0.15;                             // laag+buiten eerst
  }

  // bewaar originele kleuren
  const origineel = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (kroon.instanceColor) kroon.getColorAt(i, c); else c.set(0xffffff);
    origineel.push(c.clone());
  }
  lampen = {
    origineel,
    tijd: volgorde.map((idx, rang) => ({ i: idx, t: (rang / Math.max(n - 1, 1)) * INSTELLINGEN.lampDuur })),
  };
  A.lamp = { t: 0 };
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 2 — Zonsondergang: één bewegende zonhoogte stuurt boog + kleur + sfeer.
// ─────────────────────────────────────────────────────────────────────────
export function faseZonsondergang() {
  A.zon = { t: 0 };
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
  // ── TIJDELIJKE START — later vervangen door hologram/video-trigger ──────
  if (!ketenGestart && D.getSpelerPositie) {
    const p = D.getSpelerPositie();
    const z = INSTELLINGEN.trapZone;
    const inZone = p && p.x >= z.x[0] && p.x <= z.x[1] && p.z >= z.z[0] && p.z <= z.z[1]
      && p.y >= z.y[0] && p.y <= z.y[1];
    if (inZone) {
      if (inZoneSinds < 0) inZoneSinds = 0; else inZoneSinds += dt;
      if (inZoneSinds >= INSTELLINGEN.startVertraging) startClimax();
    } else { inZoneSinds = -1; }
  }

  if (A.lamp) updateLampen(dt);
  if (A.zon) updateZon(dt);
  if (A.deeltjes) updateDeeltjes(dt);
  if (A.bord) updateBord(dt);
}

function updateLampen(dt) {
  A.lamp.t += dt;
  const kroon = D.kroon, c = new THREE.Color(), doel = new THREE.Color(INSTELLINGEN.lampKleur);
  for (const { i, t } of lampen.tijd) {
    const f = THREE.MathUtils.clamp((A.lamp.t - t) / 0.5, 0, 1);   // 0,5 s fade-in per bol
    if (f <= 0) continue;
    c.copy(lampen.origineel[i]).lerp(doel, f * 0.85).multiplyScalar(1 + f * 1.6); // oplichten (bloom)
    kroon.setColorAt(i, c);
  }
  if (kroon.instanceColor) kroon.instanceColor.needsUpdate = true;
  if (A.lamp.t >= INSTELLINGEN.lampDuur + 0.5) { A.lamp = null; faseZonsondergang(); }
}

function updateZon(dt) {
  A.zon.t += dt;
  const t01 = THREE.MathUtils.clamp(A.zon.t / INSTELLINGEN.dagNachtDuur, 0, 1);
  const I = INSTELLINGEN;

  // (één waarde) zonhoogte
  const hoogte = THREE.MathUtils.lerp(I.zonHoogteStart, I.zonHoogteEind, t01);

  // (a) directional light langs een boog (hoogte + azimut) → schaduwen verlengen/draaien
  if (D.zon) {
    const el = hoogte * Math.PI * 0.45;          // elevatiehoek
    const dir = new THREE.Vector3(
      Math.cos(el) * Math.cos(I.zonAzimut), Math.sin(el), Math.cos(el) * Math.sin(I.zonAzimut));
    const doel = new THREE.Vector3(30, 1, 45);
    D.zon.position.copy(doel).addScaledVector(dir, 95);
    D.zon.target.position.copy(doel); D.zon.target.updateMatrixWorld();
    // (b) lichtkleur dag → goud → nacht (dip door het goud)
    D.zon.color.copy(zonKleurOp(t01));
    D.zon.intensity = THREE.MathUtils.lerp(dagZonIntensiteit, 0.12, smooth(t01)) *
      (1 + 0.5 * Math.exp(-Math.pow((t01 - I.goudUurMoment) / 0.16, 2)));   // gouden opflakkering
    // schaduw mee laten bewegen of bevriezen
    D.zon.shadow.autoUpdate = (I.schaduwMeebewegen && t01 < 1);
    if (I.schaduwMeebewegen) D.zon.shadow.needsUpdate = true;
  }

  // (c) exposure + fog naar nacht
  D.renderer.toneMappingExposure = THREE.MathUtils.lerp(dagExposure, I.nachtExposure, smooth(t01));
  if (D.scene.fog) {
    D.scene.fog.color.copy(dagFogKleur).lerp(new THREE.Color(I.nachtFogKleur), smooth(t01));
    if (D.scene.background && D.scene.background.isColor) D.scene.background.copy(D.scene.fog.color);
  }

  if (t01 >= 1) { A.zon = null; faseDeeltjes(); }
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
  const tex = bordTextuur(INSTELLINGEN.bordTekst);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.04,
    transparent: true, roughness: 0.5, metalness: 0.0,
  });
  const breed = 5.6, hoog = breed * 0.42;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(breed, hoog), mat);
  mesh.position.copy(INSTELLINGEN.bordPositie);   // wereld-coördinaten (climax hangt niet onder de spiegel)
  mesh.name = 'climaxBord';
  D.scene.add(mesh);
  bord = { mesh, mat, actief: false };
}

function bordTextuur(tekst) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 460;
  const x = c.getContext('2d');
  x.fillStyle = '#4a230c'; x.fillRect(0, 0, c.width, c.height);   // warm, gloeit mee
  x.strokeStyle = '#ffc480'; x.lineWidth = 16; x.strokeRect(24, 24, c.width - 48, c.height - 48);
  x.fillStyle = '#fff3df'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 150px Georgia, serif';
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
    aEind[i * 3] = B.x + (Math.random() - 0.5) * 2.6;
    aEind[i * 3 + 1] = B.y + (Math.random() - 0.5) * 1.2;
    aEind[i * 3 + 2] = B.z + (Math.random() - 0.5) * 0.6;
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

  // controlepunt-richting (buiging): omhoog + zijwaarts t.o.v. de lijn lamp→bord
  const dir = B.clone().sub(L).normalize();
  const zij = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const bend = new THREE.Vector3(0, 1, 0).multiplyScalar(INSTELLINGEN.padBochtigheid)
    .addScaledVector(zij, INSTELLINGEN.padBochtigheid * 0.35);

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
      uBend: { value: bend },
      uSize: { value: 38.0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
      uColor: { value: new THREE.Color(INSTELLINGEN.deeltjesKleur) },
    },
    vertexShader: `
      uniform float uProgress; uniform vec3 uBend; uniform float uSize; uniform float uPixelRatio;
      attribute vec3 aStart; attribute vec3 aEind; attribute float aVertraging; attribute vec3 aRuis;
      varying float vA;
      void main(){
        float t = smoothstep(0.0, 1.0, clamp(uProgress - aVertraging, 0.0, 1.0));
        vec3 ctrl = mix(aStart, aEind, 0.5) + uBend;              // gebogen pad via controlepunt
        vec3 a = mix(aStart, ctrl, t);
        vec3 b = mix(ctrl, aEind, t);
        vec3 p = mix(a, b, t);
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
// Hulp
// ─────────────────────────────────────────────────────────────────────────
function smooth(t) { return t * t * (3 - 2 * t); }
function zonKleurOp(t01) {
  const I = INSTELLINGEN, g = I.goudUurMoment, c = new THREE.Color();
  if (t01 <= g) c.set(I.zonKleurDag).lerp(new THREE.Color(I.zonKleurGoud), smooth(t01 / Math.max(g, 0.001)));
  else c.set(I.zonKleurGoud).lerp(new THREE.Color(I.zonKleurNacht), smooth((t01 - g) / Math.max(1 - g, 0.001)));
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
