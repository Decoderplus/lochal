// Fase 2 — beide tribunes + loopbrug. KWARTSLAG GEDRAAID na MENSTEST 1:
// treden lopen noord-zuid, de looprichting is oost-west en beide tribunes
// dalen naar het MIDDEN van de hal. Topplatforms liggen aan de buitenzijden
// tegen de vide-rand: oost (x 46,8–50) pal voor de StemmingMakerij-uitgang,
// west (x 10–13,2) gespiegeld. Vanaf het platform daal je af met uitzicht
// over de zuidhal. De loopbrug overspant de vide tussen de twee platforms
// (z 31–33, y 5). Treden beslaan z 22–31; dunne platen op schinkels, dus de
// wereld eronder blijft open en donker. Zijtrappen = vrijgehouden stroken
// langs de noord- en zuidflank van de treden, met leuning.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen, maakRng } from '../materials.js';

const N_TREDEN = 28;
const PLAT_D = 3.2;          // diepte topplatform (langs X)
const TRED_Z0 = 22, TRED_Z1 = 31;   // tredenzone (langs Z); z 31–35 = brugzone
const PLAT_Z0 = 22, PLAT_Z1 = 35;   // platforms lopen door tot de vloerrand

// Platform-stroken (ook gebruikt door verdiepingen.js voor balustrade-gaten)
export const PLATFORM_WEST = [CONFIG.objects.tribuneWest.x[0], CONFIG.objects.tribuneWest.x[0] + PLAT_D];
export const PLATFORM_OOST = [CONFIG.objects.tribuneOost.x[1] - PLAT_D, CONFIG.objects.tribuneOost.x[1]];

export function bouwTribunes() {
  const M = maakMaterialen();
  const groep = new THREE.Group();
  groep.name = 'tribunesEnBrug';
  const dummy = new THREE.Object3D();

  const colliders = [];
  const surfaces = [];

  const yTop = CONFIG.objects.tribuneWest.yTop;          // 5
  const stijg = yTop / N_TREDEN;                         // ≈ 0,179
  const trapLen = (CONFIG.objects.tribuneWest.x[1] - CONFIG.objects.tribuneWest.x[0]) - PLAT_D; // 8,8
  const diep = trapLen / N_TREDEN;                       // ≈ 0,314
  const tredB = TRED_Z1 - TRED_Z0;                       // 9 m brede treden

  const tredePlekken = [];
  const blokPlekken = [];
  const kussenPlekken = { rood: [], blauw: [], oranje: [] };

  function bouwTribune(naam, xVak, seed) {
    const sub = new THREE.Group();
    sub.name = naam;
    const [x0, x1] = xVak;
    const rng = maakRng(seed);
    // west-tribune: platform west, daalt oostwaarts (naar het midden);
    // oost-tribune: platform oost, daalt westwaarts.
    const teken = naam === 'tribuneWest' ? 1 : -1;
    const platX = naam === 'tribuneWest' ? [x0, x0 + PLAT_D] : [x1 - PLAT_D, x1];
    const trapVan = naam === 'tribuneWest' ? x0 + PLAT_D : x1 - PLAT_D;  // y = 5-kant
    const trapTot = naam === 'tribuneWest' ? x1 : x0;                    // y = 0-kant (midden)
    const buitenX = naam === 'tribuneWest' ? x0 : x1;                    // halgevel-zijde

    // Topplatform (betonkleur) op slanke poten, tegen de vide-rand (z 35)
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(PLAT_D, 0.4, PLAT_Z1 - PLAT_Z0), M.tred);
    plat.position.set((platX[0] + platX[1]) / 2, yTop - 0.2, (PLAT_Z0 + PLAT_Z1) / 2);
    plat.receiveShadow = true;
    sub.add(plat);
    for (const pz of [PLAT_Z0 + 0.7, (PLAT_Z0 + PLAT_Z1) / 2, PLAT_Z1 - 0.7]) {
      for (const fx of [platX[0] + 0.6, platX[1] - 0.6]) {
        const poot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, yTop - 0.4, 8), M.nieuwStaal);
        poot.position.set(fx, (yTop - 0.4) / 2, pz);
        sub.add(poot);
      }
    }

    // Treden (instanced, verzameld over beide tribunes): dalen naar het midden
    const zMid = (TRED_Z0 + TRED_Z1) / 2;
    for (let i = 1; i <= N_TREDEN; i++) {
      const topY = yTop - i * stijg;
      const xMid = trapVan + teken * (i - 0.5) * diep;
      tredePlekken.push({ p: [xMid, topY - 0.045, zMid], s: [diep + 0.06, 0.09, tredB] });
      tredePlekken.push({                                     // stootbord
        p: [trapVan + teken * ((i - 1) * diep + 0.02), yTop - (i - 0.5) * stijg, zMid],
        s: [0.05, stijg + 0.02, tredB],
      });
    }

    // Stalen schinkels onder de treden (open, donkere onderwereld)
    const helLen = Math.hypot(trapLen, yTop);
    const helHoek = -teken * Math.atan2(yTop, trapLen);   // daalt richting trapTot
    for (const sz of [TRED_Z0 + 0.9, zMid, TRED_Z1 - 0.9]) {
      const schinkel = new THREE.Mesh(
        new THREE.BoxGeometry(helLen - 0.9, 0.35, 0.22), M.nieuwStaal);
      schinkel.rotation.z = helHoek;
      schinkel.position.set((trapVan + trapTot) / 2, yTop / 2 - 0.18, sz);
      sub.add(schinkel);
    }

    // Eiken zitblokken (lengte 2–6 m langs Z, seeded) + kussens; stroken van
    // 1,3 m langs beide flanken (z-kanten) blijven vrij als zijtrap
    const kleuren = ['rood', 'blauw', 'oranje'];
    for (let b = 0; b < 12; b++) {
      const i = 2 + Math.floor(rng() * (N_TREDEN - 4));
      const w = 2 + rng() * 4;
      const zMin = TRED_Z0 + 1.3 + w / 2, zMax = TRED_Z1 - 1.3 - w / 2;
      if (zMax <= zMin) continue;
      const bz = zMin + rng() * (zMax - zMin);
      const topY = yTop - i * stijg;
      const xMid = trapVan + teken * (i - 0.5) * diep;
      blokPlekken.push({ p: [xMid, topY + 0.21, bz], s: [0.62, 0.42, w] });
      const nK = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < nK; k++) {
        const kz = bz - w / 2 + 0.5 + rng() * Math.max(w - 1, 0.1);
        kussenPlekken[kleuren[Math.floor(rng() * 3)]].push([xMid, topY + 0.46, kz]);
      }
    }
    for (let k = 0; k < 6; k++) {
      const i = 3 + Math.floor(rng() * (N_TREDEN - 6));
      const topY = yTop - i * stijg;
      const xMid = trapVan + teken * (i - 0.5) * diep;
      kussenPlekken[kleuren[Math.floor(rng() * 3)]].push(
        [xMid, topY + 0.04, TRED_Z0 + 1.6 + rng() * (tredB - 3.2)]);
    }
    for (let t = 0; t < 2; t++) {
      const i = 4 + Math.floor(rng() * (N_TREDEN - 8));
      const tafel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.eik);
      tafel.position.set(trapVan + teken * (i - 0.5) * diep, yTop - i * stijg + 0.25,
                         TRED_Z0 + 2 + rng() * (tredB - 4));
      tafel.castShadow = true;
      sub.add(tafel);
    }

    // Zijtrap-leuningen langs de noord- en zuidflank van de treden
    for (const fz of [TRED_Z0 + 0.03, TRED_Z1 - 0.03]) {
      const glas = new THREE.Mesh(new THREE.BoxGeometry(helLen, 1.0, 0.04), M.glas);
      glas.rotation.z = helHoek;
      glas.position.set((trapVan + trapTot) / 2, yTop / 2 + 0.62, fz);
      sub.add(glas);
      const regel = new THREE.Mesh(new THREE.BoxGeometry(helLen + 0.3, 0.07, 0.07), M.eik);
      regel.rotation.z = helHoek;
      regel.position.set((trapVan + trapTot) / 2, yTop / 2 + 1.12, fz);
      sub.add(regel);
    }

    // Colliders: flank-leuningen als 3 trapsgewijze schotten per z-kant,
    // platform-randen (buitenzijde + zuidkant), brugzone-rand langs z=31
    const yOp = (x) => {
      const t = (x - trapTot) / (trapVan - trapTot);
      return yTop * Math.min(Math.max(t, 0), 1);
    };
    const xa = Math.min(trapVan, trapTot), xb = Math.max(trapVan, trapTot);
    for (const fz of [TRED_Z0, TRED_Z1]) {
      const stap = (xb - xa) / 3;
      for (let s = 0; s < 3; s++) {
        const sx0 = xa + s * stap, sx1 = sx0 + stap;
        colliders.push({
          x0: sx0, x1: sx1, z0: fz - 0.08, z1: fz + 0.08,
          y0: Math.max(Math.min(yOp(sx0), yOp(sx1)) - 0.4, 0),
          y1: Math.max(yOp(sx0), yOp(sx1)) + 1.1,
        });
      }
    }
    // platform: buitenrand (halgevel-zijde) + zuidrand; noordrand sluit op vloer 1
    colliders.push({ x0: buitenX - 0.08, x1: buitenX + 0.08, y0: yTop, y1: yTop + 1.15, z0: PLAT_Z0, z1: PLAT_Z1 });
    colliders.push({ x0: platX[0], x1: platX[1], y0: yTop, y1: yTop + 1.15, z0: PLAT_Z0 - 0.08, z1: PLAT_Z0 + 0.08 });
    for (const [bx0, bx1, bz0, bz1] of [
      [buitenX - 0.02, buitenX + 0.02, PLAT_Z0, PLAT_Z1],
      [platX[0], platX[1], PLAT_Z0 - 0.02, PLAT_Z0 + 0.02],
    ]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(Math.max(bx1 - bx0, 0.04), 1.0, Math.max(bz1 - bz0, 0.04)), M.glas);
      g.position.set((bx0 + bx1) / 2, yTop + 0.5, (bz0 + bz1) / 2);
      sub.add(g);
      const r = new THREE.Mesh(new THREE.BoxGeometry(Math.max(bx1 - bx0, 0.07), 0.07, Math.max(bz1 - bz0, 0.07)), M.eik);
      r.position.set((bx0 + bx1) / 2, yTop + 1.02, (bz0 + bz1) / 2);
      sub.add(r);
    }

    // Loopvlakken: platform + helling (langs X) over de treden
    surfaces.push({ kind: 'vlak', x0: platX[0], x1: platX[1], z0: PLAT_Z0, z1: PLAT_Z1, y: yTop });
    surfaces.push({
      kind: 'hellingX', x0: xa, x1: xb, z0: TRED_Z0, z1: TRED_Z1,
      yBijX0: yOp(xa), yBijX1: yOp(xb),
    });

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

  // ── Loopbrug: oude geklonken brug, overspant de vide tussen de platforms ─
  const brug = new THREE.Group();
  brug.name = 'loopbrug';
  const bx0 = PLATFORM_WEST[1];   // 13,2
  const bx1 = PLATFORM_OOST[0];   // 46,8
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
    const nKruis = Math.floor(bLen / 2.6);
    for (let k = 0; k < nKruis; k++) {
      const kruis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.09, 0.05), M.oudStaal);
      kruis.position.set(bx0 + 1.4 + k * 2.6, bY - 0.02, bz);
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
