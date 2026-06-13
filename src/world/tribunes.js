// Fase 2 — beide tribunes + loopbrug.
// Opbouw per tribune: vlak topplatform (z 31–35, y 5) aan de verdiepingsrand,
// daarna 28 witte betontreden (stijging ~18 cm, diepte ~32 cm — zie
// DECISIONS.md) omlaag naar BG (z 31 → 22). Op de treden eiken zitblokken van
// wisselende breedte (semi-willekeurig, seeded) met losse kussens in rood/
// donkerblauw/oranje. Dunne tredeplaten op stalen schinkels → de wereld
// ónder de tribune blijft open en donker. Zijtrappen = vrijgehouden stroken
// langs beide flanken met glasbalustrade + eiken handregel.
// De loopbrug (OUD_STAAL, geklonken look) verbindt de twee topplatforms.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen, maakRng } from '../materials.js';

const N_TREDEN = 28;
const Z_TOP_PLAT = 31;   // zuidrand topplatform; treden dalen 31 → 22

export function bouwTribunes() {
  const M = maakMaterialen();
  const groep = new THREE.Group();
  groep.name = 'tribunesEnBrug';
  const dummy = new THREE.Object3D();

  const colliders = [];
  const surfaces = [];

  const yTop = CONFIG.objects.tribuneWest.yTop;          // 5
  const zBottom = CONFIG.objects.tribuneWest.zBottom;    // 22
  const zTop = CONFIG.objects.tribuneWest.zTop;          // 35
  const stijg = yTop / N_TREDEN;                         // ≈ 0,179
  const diep = (Z_TOP_PLAT - zBottom) / N_TREDEN;        // ≈ 0,321

  const tredePlekken = [];
  const blokPlekken = [];
  const kussenPlekken = { rood: [], blauw: [], oranje: [] };

  function bouwTribune(naam, xVak, seed) {
    const sub = new THREE.Group();
    sub.name = naam;
    const [x0, x1] = xVak;
    const xc = (x0 + x1) / 2, breed = x1 - x0;
    const rng = maakRng(seed);

    // Topplatform (verdiepingsrand → z 31), betonkleur, op slanke poten
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(breed, 0.4, zTop - Z_TOP_PLAT), M.tred);
    plat.position.set(xc, yTop - 0.2, (zTop + Z_TOP_PLAT) / 2);
    plat.receiveShadow = true;
    sub.add(plat);
    for (const px of [x0 + 0.8, x1 - 0.8]) {
      for (const pz of [Z_TOP_PLAT + 0.7, zTop - 0.7]) {
        const poot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, yTop - 0.4, 8), M.nieuwStaal);
        poot.position.set(px, (yTop - 0.4) / 2, pz);
        sub.add(poot);
      }
    }

    // Treden (instanced, verzameld over beide tribunes)
    for (let i = 1; i <= N_TREDEN; i++) {
      const topY = yTop - i * stijg;
      const zMid = Z_TOP_PLAT - (i - 0.5) * diep;
      tredePlekken.push({ p: [xc, topY - 0.045, zMid], s: [breed, 0.09, diep + 0.06] });
      tredePlekken.push({                                     // stootbord
        p: [xc, yTop - (i - 0.5) * stijg, Z_TOP_PLAT - (i - 1) * diep - 0.02],
        s: [breed, stijg + 0.02, 0.05],
      });
    }

    // Stalen schinkels onder de treden (open, donkere onderwereld)
    const helLen = Math.hypot(Z_TOP_PLAT - zBottom, yTop);
    for (const sx of [x0 + 0.9, xc, x1 - 0.9]) {
      const schinkel = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.35, helLen - 0.9), M.nieuwStaal);
      schinkel.rotation.x = -Math.atan2(yTop, Z_TOP_PLAT - zBottom);
      schinkel.position.set(sx, yTop / 2 - 0.18, (Z_TOP_PLAT + zBottom) / 2);
      sub.add(schinkel);
    }

    // Eiken zitblokken van wisselende breedte + kussens (zijtrap-stroken
    // van 1,3 m langs beide flanken blijven vrij)
    const kleuren = ['rood', 'blauw', 'oranje'];
    for (let b = 0; b < 12; b++) {
      const i = 2 + Math.floor(rng() * (N_TREDEN - 4));
      const w = 2 + rng() * 4;
      const xMin = x0 + 1.3 + w / 2, xMax = x1 - 1.3 - w / 2;
      if (xMax <= xMin) continue;
      const bx = xMin + rng() * (xMax - xMin);
      const topY = yTop - i * stijg;
      const zMid = Z_TOP_PLAT - (i - 0.5) * diep;
      blokPlekken.push({ p: [bx, topY + 0.21, zMid], s: [w, 0.42, 0.62] });
      const nK = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < nK; k++) {
        const kx = bx - w / 2 + 0.5 + rng() * Math.max(w - 1, 0.1);
        kussenPlekken[kleuren[Math.floor(rng() * 3)]].push([kx, topY + 0.46, zMid]);
      }
    }
    // een paar losse kussens en eiken kubustafeltjes op de treden zelf
    for (let k = 0; k < 6; k++) {
      const i = 3 + Math.floor(rng() * (N_TREDEN - 6));
      const topY = yTop - i * stijg;
      const zMid = Z_TOP_PLAT - (i - 0.5) * diep;
      const kx = x0 + 1.6 + rng() * (breed - 3.2);
      kussenPlekken[kleuren[Math.floor(rng() * 3)]].push([kx, topY + 0.04, zMid]);
    }
    for (let t = 0; t < 2; t++) {
      const i = 4 + Math.floor(rng() * (N_TREDEN - 8));
      const tafel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.eik);
      tafel.position.set(x0 + 2 + rng() * (breed - 4), yTop - i * stijg + 0.25,
                         Z_TOP_PLAT - (i - 0.5) * diep);
      tafel.castShadow = true;
      sub.add(tafel);
    }

    // Zijtrap-balustrades langs beide flanken (glas + eiken handregel)
    const hoek = -Math.atan2(yTop, Z_TOP_PLAT - zBottom);
    for (const fx of [x0 + 0.03, x1 - 0.03]) {
      const glas = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, helLen), M.glas);
      glas.rotation.x = hoek;
      glas.position.set(fx, yTop / 2 + 0.62, (Z_TOP_PLAT + zBottom) / 2);
      sub.add(glas);
      const regel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, helLen + 0.3), M.eik);
      regel.rotation.x = hoek;
      regel.position.set(fx, yTop / 2 + 1.12, (Z_TOP_PLAT + zBottom) / 2);
      sub.add(regel);
    }

    // Colliders: flank-leuningen als 3 trapsgewijze schotten per kant,
    // plus platformranden (met brug-opening aan de binnenflank, z 31–33)
    const yOp = (z) => yTop * (z - zBottom) / (Z_TOP_PLAT - zBottom);
    for (const fx of [x0, x1]) {
      for (const [za, zb] of [[zBottom, 25], [25, 28], [28, Z_TOP_PLAT]]) {
        colliders.push({
          x0: fx - 0.08, x1: fx + 0.08,
          y0: Math.max(yOp(za) - 0.4, 0), y1: yOp(zb) + 1.1, z0: za, z1: zb,
        });
      }
    }
    const buitenX = naam === 'tribuneWest' ? x0 : x1;   // hal-zijde
    const binnenX = naam === 'tribuneWest' ? x1 : x0;   // brug-zijde
    colliders.push({ x0: buitenX - 0.08, x1: buitenX + 0.08, y0: yTop, y1: yTop + 1.15, z0: Z_TOP_PLAT, z1: zTop });
    colliders.push({ x0: binnenX - 0.08, x1: binnenX + 0.08, y0: yTop, y1: yTop + 1.15, z0: 33, z1: zTop });
    // platformrand-balustrade (visueel)
    for (const [bx, bz0, bz1] of [[buitenX, Z_TOP_PLAT, zTop], [binnenX, 33, zTop]]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, bz1 - bz0), M.glas);
      g.position.set(bx, yTop + 0.5, (bz0 + bz1) / 2);
      sub.add(g);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, bz1 - bz0), M.eik);
      r.position.set(bx, yTop + 1.02, (bz0 + bz1) / 2);
      sub.add(r);
    }

    // Loopvlakken: platform + helling over de treden (ramp-collider)
    surfaces.push({ kind: 'vlak', x0, x1, z0: Z_TOP_PLAT, z1: zTop, y: yTop });
    surfaces.push({ kind: 'helling', x0, x1, z0: zBottom, z1: Z_TOP_PLAT, yBijZ0: 0, yBijZ1: yTop });

    // ── Boven-tier: het trappenlandschap loopt dóór van vloer 1 (y5) naar
    //    vloer 2 (y9), noordwaarts — dat maakt het volume hoog én wijd.
    //    Beloopbaar tot een uitkijk-lip aan de top; daarachter een balustrade
    //    (vloer 2 zelf is decor). ──
    const zB0 = CONFIG.floors.bovenTierVanZ, zB1 = CONFIG.floors.f2VanZ;  // 42 → 51
    const yB0 = yTop, yB1 = CONFIG.floors.f2;              // 5 → 9
    const nB = 24;
    const stijgB = (yB1 - yB0) / nB, diepB = (zB1 - zB0) / nB;
    for (let i = 1; i <= nB; i++) {
      const yb = yB0 + i * stijgB;
      const zb = zB0 + (i - 0.5) * diepB;
      tredePlekken.push({ p: [xc, yb - 0.045, zb], s: [breed, 0.09, diepB + 0.06] });
      tredePlekken.push({                                   // stootbord
        p: [xc, yB0 + (i - 0.5) * stijgB, zB0 + (i - 1) * diepB + 0.02],
        s: [breed, stijgB + 0.02, 0.05] });
    }
    // zitblokken + kussens op de boven-tier
    for (let b = 0; b < 7; b++) {
      const i = 2 + Math.floor(rng() * (nB - 4));
      const w = 2 + rng() * 3;
      const xMin = x0 + 1.3 + w / 2, xMax = x1 - 1.3 - w / 2;
      if (xMax <= xMin) continue;
      const bx = xMin + rng() * (xMax - xMin);
      const yb = yB0 + i * stijgB, zb = zB0 + (i - 0.5) * diepB;
      blokPlekken.push({ p: [bx, yb + 0.21, zb], s: [w, 0.42, 0.62] });
      kussenPlekken[kleuren[Math.floor(rng() * 3)]].push([bx, yb + 0.46, zb]);
    }
    // schinkels onder de boven-tier
    const helLenB = Math.hypot(zB1 - zB0, yB1 - yB0);
    for (const sx of [x0 + 0.9, xc, x1 - 0.9]) {
      const sch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, helLenB - 0.9), M.nieuwStaal);
      sch.rotation.x = Math.atan2(yB1 - yB0, zB1 - zB0);
      sch.position.set(sx, (yB0 + yB1) / 2 - 0.45, (zB0 + zB1) / 2);
      sub.add(sch);
    }
    // beloopbaar: helling omhoog + uitkijk-lip; balustrade sluit vloer-2-decor af
    surfaces.push({ kind: 'helling', x0, x1, z0: zB0, z1: zB1, yBijZ0: yB0, yBijZ1: yB1 });
    surfaces.push({ kind: 'vlak', x0, x1, z0: zB1, z1: zB1 + 1.6, y: yB1 });
    colliders.push({ x0, x1, y0: yB1, y1: yB1 + 1.15, z0: zB1 + 1.6, z1: zB1 + 1.78 });
    const balus = new THREE.Mesh(new THREE.BoxGeometry(breed, 1.0, 0.05), M.glas);
    balus.position.set(xc, yB1 + 0.5, zB1 + 1.68);
    sub.add(balus);
    const balusR = new THREE.Mesh(new THREE.BoxGeometry(breed, 0.07, 0.07), M.eik);
    balusR.position.set(xc, yB1 + 1.02, zB1 + 1.68);
    sub.add(balusR);

    groep.add(sub);
    return sub;
  }

  bouwTribune('tribuneWest', CONFIG.objects.tribuneWest.x, 7);
  bouwTribune('tribuneOost', CONFIG.objects.tribuneOost.x, 8);

  // ── Instanced geometrie over beide tribunes heen ────────────────────────
  const treden = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.tred, tredePlekken.length);
  treden.name = 'tribuneTreden';
  treden.receiveShadow = true;
  tredePlekken.forEach((t, i) => {
    dummy.position.set(...t.p); dummy.scale.set(...t.s);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    treden.setMatrixAt(i, dummy.matrix);
  });
  groep.add(treden);

  const blokken = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.eik, blokPlekken.length);
  blokken.name = 'tribuneBlokken';
  blokken.castShadow = true;
  blokPlekken.forEach((b, i) => {
    dummy.position.set(...b.p); dummy.scale.set(...b.s);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    blokken.setMatrixAt(i, dummy.matrix);
  });
  groep.add(blokken);

  const kussenMats = { rood: M.kussenRood, blauw: M.kussenBlauw, oranje: M.kussenOranje };
  const kussenNamen = { rood: 'kussensRood', blauw: 'kussensBlauw', oranje: 'kussensOranje' };
  for (const kleur of Object.keys(kussenPlekken)) {
    const lijst = kussenPlekken[kleur];
    if (!lijst.length) continue;
    const im = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.6), kussenMats[kleur], lijst.length);
    im.name = kussenNamen[kleur];
    lijst.forEach((p, i) => {
      dummy.position.set(...p); dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    groep.add(im);
  }

  // ── Loopbrug: oude geklonken brug tussen de twee topplatforms ───────────
  const brug = new THREE.Group();
  brug.name = 'loopbrug';
  const bx0 = CONFIG.objects.tribuneWest.x[1];   // 22
  const bx1 = CONFIG.objects.tribuneOost.x[0];   // 38
  const bLen = bx1 - bx0 + 0.4, bMidX = (bx0 + bx1) / 2;
  const bz0 = 31, bz1 = 33, bMidZ = 32, bY = CONFIG.objects.loopbrug.y;

  const dek = new THREE.Mesh(new THREE.BoxGeometry(bLen, 0.12, bz1 - bz0), M.onderkantZwart);
  dek.position.set(bMidX, bY - 0.06, bMidZ);
  dek.receiveShadow = true;
  brug.add(dek);
  for (const bz of [bz0 + 0.07, bz1 - 0.07]) {
    const ligger = new THREE.Mesh(new THREE.BoxGeometry(bLen, 1.15, 0.14), M.oudStaal);
    ligger.position.set(bMidX, bY - 0.02, bz);
    ligger.castShadow = true;
    brug.add(ligger);
    const nKruis = Math.max(1, Math.floor(bLen / 2.6));
    for (let k = 0; k < nKruis; k++) {
      const kruis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.09, 0.05), M.oudStaal);
      kruis.position.set(bx0 + 1.3 + k * 2.6, bY - 0.02, bz);
      kruis.rotation.z = (k % 2 === 0 ? 1 : -1) * 0.46;
      brug.add(kruis);
    }
    const regel = new THREE.Mesh(new THREE.BoxGeometry(bLen, 0.06, 0.06), M.eik);
    regel.position.set(bMidX, bY + 1.05, bz);
    brug.add(regel);
    for (let x = bx0 + 0.6; x < bx1; x += 2.6) {
      const staander = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), M.nieuwStaal);
      staander.position.set(x, bY + 0.52, bz);
      brug.add(staander);
    }
  }
  groep.add(brug);

  colliders.push(
    { x0: bx0 - 0.2, x1: bx1 + 0.2, y0: bY, y1: bY + 1.15, z0: bz0 - 0.1, z1: bz0 + 0.16 },
    { x0: bx0 - 0.2, x1: bx1 + 0.2, y0: bY, y1: bY + 1.15, z0: bz1 - 0.16, z1: bz1 + 0.1 },
  );
  surfaces.push({ kind: 'vlak', x0: bx0 - 0.2, x1: bx1 + 0.2, z0: bz0, z1: bz1, y: bY });

  return { groep, colliders, surfaces, interactables: [] };
}
