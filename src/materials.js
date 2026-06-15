// LocHal — alle THREE-materialen + procedurele texturen (werkplan sectie 3).
// Geen externe assets: alles canvas-gegenereerd. In headless modus (node,
// tools/verify.js) zijn er geen canvassen; dan vallen alle materialen terug
// op effen kleuren, zodat de scene-opbouw identiek blijft.
import * as THREE from 'three';
import { CONFIG } from './config.js';

const C = CONFIG.colors;

function hex(kleur) { return '#' + kleur.toString(16).padStart(6, '0'); }

// Deterministische RNG zodat texturen en verify stabiel zijn.
export function maakRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEADLESS = typeof document === 'undefined';

function canvasTex(maker, opties = {}) {
  if (HEADLESS) return null;
  const c = document.createElement('canvas');
  c.width = opties.w ?? 1024; c.height = opties.h ?? 1024;
  maker(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// ── patina: oud staal — beige basis + roest/groen-vlekken + klinknagelrijen ──
export function maakPatinaTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1917);
    ctx.fillStyle = hex(C.steelOld); ctx.fillRect(0, 0, w, h);
    // onregelmatige patinavlekken
    for (let i = 0; i < 52; i++) {
      const kleur = rng() < 0.55 ? C.steelOldRust : C.steelOldGreen;
      ctx.fillStyle = hex(kleur);
      ctx.globalAlpha = 0.10 + rng() * 0.28;
      const x = rng() * w, y = rng() * h, r = 18 + rng() * 110;
      ctx.beginPath();
      // organische blob: 8 punten rond een cirkel
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = r * (0.6 + rng() * 0.6);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // horizontale rijen klinknagels (donkere stippen)
    ctx.fillStyle = 'rgba(40,36,30,0.8)';
    for (let y = 64; y < h; y += 128) {
      for (let x = 24; x < w; x += 48) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // lichte slijtage-ruis
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 400; i++) {
      const rx = rng() * w, ry = rng() * h;
      ctx.fillRect(rx, ry, 2 + rng() * 6, 1 + rng() * 2);
    }
  });
}

// ── betonMarkeringen: BG-vloer 2048 px, repeat 1× over 60×90 m ──────────────
// betonruis + witte lijnen, 2 rode kruizen, geel-zwarte taperanden.
export function maakBetonMarkeringenTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1932);
    // canvas-X = hal-X (0..60 m), canvas-Y = hal-Z (0..90 m); v loopt om,
    // maar voor markeringen maakt spiegeling in Z niets uit.
    const mx = w / 60, mz = h / 90;
    ctx.fillStyle = hex(C.floorGF); ctx.fillRect(0, 0, w, h);
    // betonruis + plaatnaden
    for (let i = 0; i < 2600; i++) {
      const g = 140 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgba(${g},${g - 6},${g - 14},0.10)`;
      ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 14, 2 + rng() * 14);
    }
    ctx.strokeStyle = 'rgba(80,74,66,0.35)'; ctx.lineWidth = 2;
    for (let x = 0; x <= 60; x += 7.5) {
      ctx.beginPath(); ctx.moveTo(x * mx, 0); ctx.lineTo(x * mx, h); ctx.stroke();
    }
    for (let z = 0; z <= 90; z += 7.5) {
      ctx.beginPath(); ctx.moveTo(0, z * mz); ctx.lineTo(w, z * mz); ctx.stroke();
    }
    // bewaarde witte werkvloerlijnen (gangzones noord-zuid)
    ctx.strokeStyle = 'rgba(238,234,226,0.85)'; ctx.lineWidth = 6;
    for (const x of [11, 13, 47, 49]) {
      ctx.beginPath(); ctx.moveTo(x * mx, 2 * mz); ctx.lineTo(x * mx, 88 * mz); ctx.stroke();
    }
    // dwarslijnen in de zuidhal
    ctx.lineWidth = 5;
    for (const z of [12, 28]) {
      ctx.beginPath(); ctx.moveTo(4 * mx, z * mz); ctx.lineTo(56 * mx, z * mz); ctx.stroke();
    }
    // 2 rode kruizen
    ctx.strokeStyle = hex(0xb03326); ctx.lineWidth = 10;
    for (const [kx, kz] of [[24, 20], [44, 30]]) {
      ctx.beginPath();
      ctx.moveTo((kx - 1.2) * mx, (kz - 1.2) * mz); ctx.lineTo((kx + 1.2) * mx, (kz + 1.2) * mz);
      ctx.moveTo((kx + 1.2) * mx, (kz - 1.2) * mz); ctx.lineTo((kx - 1.2) * mx, (kz + 1.2) * mz);
      ctx.stroke();
    }
    // geel-zwarte taperanden langs de gangzones
    function tapeBand(x0, z0, z1) {
      const bw = 0.5 * mx; // 0,5 m breed
      const stap = 24;
      for (let y = z0 * mz; y < z1 * mz; y += stap) {
        ctx.fillStyle = (Math.floor(y / stap) % 2 === 0) ? '#d8b21a' : '#16140f';
        ctx.save();
        ctx.translate(x0 * mx, y + stap / 2);
        ctx.rotate(-0.5);
        ctx.fillRect(-bw / 2, -stap, bw, stap * 2);
        ctx.restore();
      }
    }
    tapeBand(19.5, 2, 34); tapeBand(40.5, 2, 34);
  }, { w: 2048, h: 2048 });
}

// ── mozaiek: 10 cm tegels, willekeurig rood/zwart 70/30 (fase 3) ────────────
export function maakMozaiekTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1956);
    const n = 32, s = w / n;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      ctx.fillStyle = hex(rng() < 0.7 ? C.mosaicRed : C.mosaicBlack);
      ctx.fillRect(k * s + 1, r * s + 1, s - 2, s - 2);
    }
  }, { w: 512, h: 512 });
}

// ── boekenstapel: horizontale strepen 2–4 cm in gedempte kleuren (fase 3) ───
export function maakBoekenstapelTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1968);
    const palet = ['#8c4a3a', '#3e5a6e', '#a08c5a', '#5a6e4a', '#7a6a8c',
                   '#b09a7a', '#4a4a52', '#96606a', '#6e7a86', '#c0b090'];
    let y = 0;
    while (y < h) {
      const dik = 8 + Math.floor(rng() * 12); // ~2–4 cm bij 1 m per 512 px
      ctx.fillStyle = palet[Math.floor(rng() * palet.length)];
      ctx.fillRect(0, y, w, dik);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, y + dik - 2, w, 2);
      // lichte rugvariatie
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(rng() * w * 0.5, y + 2, w * (0.3 + rng() * 0.5), 2);
      y += dik;
    }
  }, { w: 512, h: 512 });
}

// ── betonVerf: industriekolom — ruw beton met oude, afbladderende verflagen ──
export function maakBetonVerfTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1923);
    // ruwe betonbasis
    ctx.fillStyle = '#b8b3aa'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const g = 150 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgba(${g},${g - 4},${g - 12},0.12)`;
      ctx.fillRect(rng() * w, rng() * h, 3 + rng() * 16, 3 + rng() * 16);
    }
    // oude verflagen die deels zijn afgebladderd (cremewit, dofrood, dofgroen)
    const lagen = ['#d8d2c2', '#9a4032', '#5f6e55', '#c9c2af'];
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = lagen[Math.floor(rng() * lagen.length)];
      ctx.globalAlpha = 0.5 + rng() * 0.4;
      const x = rng() * w, y = rng() * h, rw = 60 + rng() * 260, rh = 60 + rng() * 360;
      ctx.beginPath();                              // grillige verfvlek
      for (let k = 0; k <= 9; k++) {
        const a = (k / 9) * Math.PI * 2, rr = 0.5 + rng() * 0.6;
        const px = x + Math.cos(a) * rw * rr, py = y + Math.sin(a) * rh * rr;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // verticale uitloog-/regenstrepen
    ctx.fillStyle = 'rgba(60,54,46,0.18)';
    for (let i = 0; i < 50; i++) {
      const x = rng() * w;
      ctx.fillRect(x, rng() * h * 0.4, 2 + rng() * 4, h * (0.3 + rng() * 0.6));
    }
  }, { w: 512, h: 1024 });
}

// ── dambord: 50 cm vlakken in twee grijzen (TijdLab, fase 3) ────────────────
export function maakDambordTex() {
  return canvasTex((ctx, w, h) => {
    const n = 8, s = w / n;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      ctx.fillStyle = (r + k) % 2 === 0 ? '#c8c4bc' : '#76726a';
      ctx.fillRect(k * s, r * s, s, s);
    }
  }, { w: 512, h: 512 });
}

// ── doekPatroon: wit veld + zwarte organische vlakken + gele bies (fase 4) ──
export function maakDoekPatroonTex() {
  return canvasTex((ctx, w, h) => {
    const rng = maakRng(1989);
    ctx.fillStyle = hex(C.curtainWhite); ctx.fillRect(0, 0, w, h);
    // zachte plooischaduw
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = `rgba(120,116,110,${0.06 + 0.05 * Math.sin(x * 0.05)})`;
      ctx.fillRect(x, 0, 16, h);
    }
    // 3 grote zwarte organische vlakken
    ctx.fillStyle = hex(C.curtainBlack);
    const vlekken = [[0.28, 0.30, 0.30], [0.66, 0.62, 0.34], [0.18, 0.78, 0.20]];
    for (const [fx, fy, fr] of vlekken) {
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const rr = fr * w * (0.55 + rng() * 0.5);
        const px = fx * w + Math.cos(a) * rr, py = fy * h + Math.sin(a) * rr * 1.25;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    // 1 gele verticale bies (8 cm op 14 m hoogte ≈ smal)
    ctx.fillStyle = hex(C.curtainYellowEdge);
    ctx.fillRect(w * 0.88, 0, w * 0.012, h);
  });
}

// ── materialenset ───────────────────────────────────────────────────────────
let _cache = null;
export function maakMaterialen() {
  if (_cache) return _cache;
  const patina = maakPatinaTex();
  const beton = maakBetonMarkeringenTex();

  const M = {
    oudStaal: new THREE.MeshStandardMaterial({
      color: 0xffffff, map: patina, roughness: 0.85, metalness: 0.25,
      ...(patina ? {} : { color: C.steelOld }),
    }),
    nieuwStaal: new THREE.MeshStandardMaterial({ color: C.steelNew, roughness: 0.6, metalness: 0.5 }),
    dakStaal: new THREE.MeshStandardMaterial({ color: C.steelRoof, roughness: 0.7, metalness: 0.4 }),
    dakPlaat: new THREE.MeshStandardMaterial({ color: 0x8e948a, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide }),
    glas: new THREE.MeshBasicMaterial({
      color: 0xc8dde6, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    }),
    vloerBG: new THREE.MeshStandardMaterial({
      color: 0xffffff, map: beton, roughness: 0.95, metalness: 0.0,
      ...(beton ? {} : { color: C.floorGF }),
    }),
    vloerF: new THREE.MeshStandardMaterial({ color: C.floorF1, roughness: 0.95 }),
    tred: new THREE.MeshStandardMaterial({ color: C.treadConcrete, roughness: 0.9 }),
    eik: new THREE.MeshStandardMaterial({ color: C.oak, roughness: 0.7 }),
    sokkel: new THREE.MeshStandardMaterial({ color: C.baseWall, roughness: 0.95 }),
    onderkantZwart: new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 1.0 }),
    kussenRood: new THREE.MeshLambertMaterial({ color: C.cushionRed }),
    kussenBlauw: new THREE.MeshLambertMaterial({ color: C.cushionBlue }),
    kussenOranje: new THREE.MeshLambertMaterial({ color: C.cushionOrange }),
    daklicht: new THREE.MeshStandardMaterial({
      color: 0xf2f0ea, emissive: 0xfff6e0, emissiveIntensity: 0.65, roughness: 0.6,
    }),

    // ── Fase 3/4 — zuidhal-inrichting & iconische elementen ──────────────
    mozaiek: maakMozaiekTex()
      ? new THREE.MeshStandardMaterial({ map: maakMozaiekTex(), roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: C.mosaicRed, roughness: 0.85 }),
    boekenstapel: maakBoekenstapelTex()
      ? new THREE.MeshStandardMaterial({ map: maakBoekenstapelTex(), roughness: 0.9 })
      : new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }),
    dambord: maakDambordTex()
      ? new THREE.MeshStandardMaterial({ map: maakDambordTex(), roughness: 0.95 })
      : new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.95 }),
    betonVerf: maakBetonVerfTex()
      ? new THREE.MeshStandardMaterial({ map: maakBetonVerfTex(), roughness: 0.95, metalness: 0.0 })
      : new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.95 }),
    // amberkleurige gloed onder de eiken traptreden
    amberGloed: new THREE.MeshBasicMaterial({ color: 0xff8a2a, toneMapped: false }),
    doek: maakDoekPatroonTex()
      ? new THREE.MeshStandardMaterial({ map: maakDoekPatroonTex(), roughness: 1.0, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: C.curtainWhite, roughness: 1.0, side: THREE.DoubleSide }),
    voile: new THREE.MeshLambertMaterial({
      color: C.voile, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    plantGroen: new THREE.MeshLambertMaterial({ color: 0x4f7a3a }),
    kraanGeel: new THREE.MeshStandardMaterial({ color: C.crane, roughness: 0.55, metalness: 0.45 }),
    // emissive look; de per-instance kleur (setColorAt) tint dit witte basis.
    bollamp: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    klokOranje: new THREE.MeshStandardMaterial({
      color: C.tijdlabOrange, emissive: C.tijdlabOrange, emissiveIntensity: 0.25, roughness: 0.8 }),
    leidingRood: new THREE.MeshStandardMaterial({ color: C.pipeRed, roughness: 0.6, metalness: 0.3 }),
    leidingBlauw: new THREE.MeshStandardMaterial({ color: C.pipeBlue, roughness: 0.6, metalness: 0.3 }),
  };
  _cache = M;
  return M;
}
