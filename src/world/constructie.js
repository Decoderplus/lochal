// Fase 1 — draagconstructie: middenkolommenrij (x = 30) + gevelkolommen in
// OUD_STAAL (patina), slanke NIEUW_STAAL-kolommen die de verdiepingen dragen
// (paren oud+nieuw, alleen onder het noorddeel z ≥ 35), vakwerkspanten per
// beuk per as en zwarte luchtkanalen onder het dak. Alles InstancedMesh.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen } from '../materials.js';

const EAVE_Y = 13, SPANT_ONDER = 11;

export function bouwConstructie() {
  const M = maakMaterialen();
  const { width: W, length: D, height: NOK_Y, ridgeX } = CONFIG.hall;
  const stap = CONFIG.grid.baySpacing;
  const groep = new THREE.Group();
  groep.name = 'constructie';
  const dummy = new THREE.Object3D();

  // ── Oude vakwerk-kolommen (patina): middenrij + gevelrijen, 13 assen ────
  const oudPlekken = [];
  for (let z = 0; z <= D + 0.01; z += stap) {
    const zc = Math.min(Math.max(z, 0.6), D - 0.6);
    oudPlekken.push({ p: [CONFIG.grid.centerColX, SPANT_ONDER / 2, zc], s: [0.8, SPANT_ONDER, 0.8] });
    oudPlekken.push({ p: [0.5, EAVE_Y / 2, zc], s: [0.5, EAVE_Y, 0.5] });
    oudPlekken.push({ p: [W - 0.5, EAVE_Y / 2, zc], s: [0.5, EAVE_Y, 0.5] });
  }
  const kolOud = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.oudStaal, oudPlekken.length);
  kolOud.name = 'kolommenOud';
  kolOud.castShadow = true;
  oudPlekken.forEach((k, i) => {
    dummy.position.set(...k.p);
    dummy.scale.set(...k.s);
    dummy.rotation.set(0, (i % 4) * Math.PI / 2, 0);  // patina willekeurig gedraaid
    dummy.updateMatrix();
    kolOud.setMatrixAt(i, dummy.matrix);
  });
  groep.add(kolOud);

  // ── Nieuwe slanke kolommen (Ø 0,35, mat zwart) onder de verdiepingen ────
  const nieuwPlekken = [];
  const f3 = CONFIG.floors.f3 - CONFIG.floors.slabT;
  for (let z = CONFIG.floors.builtFromZ + 2.5; z <= D - 2; z += stap) {
    nieuwPlekken.push([CONFIG.grid.centerColX - 0.65, z]); // paar naast oud
    nieuwPlekken.push([CONFIG.grid.centerColX + 0.65, z]);
    nieuwPlekken.push([15, z]);                            // dragers middenvelden
    nieuwPlekken.push([45, z]);
  }
  const kolNieuw = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.175, 0.175, 1, 10), M.nieuwStaal, nieuwPlekken.length);
  kolNieuw.name = 'kolommenNieuw';
  kolNieuw.castShadow = true;
  nieuwPlekken.forEach(([x, z], i) => {
    dummy.position.set(x, f3 / 2, z);
    dummy.scale.set(1, f3, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    kolNieuw.setMatrixAt(i, dummy.matrix);
  });
  groep.add(kolNieuw);

  // ── Vakwerkspanten (DAK_STAAL) per beuk per as ──────────────────────────
  const staven = [];
  const beuken = [{ c: 15 }, { c: 45 }];   // beukcentra = noklijnen
  const topHoek = Math.atan2(NOK_Y - EAVE_Y, 15);
  const topLen = Math.hypot(15, NOK_Y - EAVE_Y);
  for (let z = 0; z <= D + 0.01; z += stap) {
    const zc = Math.min(Math.max(z, 0.4), D - 0.4);
    for (const { c } of beuken) {
      // onderrand
      staven.push({ p: [c, SPANT_ONDER, zc], s: [30, 0.3, 0.2], r: 0 });
      // twee bovenranden langs het dakvlak
      staven.push({ p: [c - 7.5, (EAVE_Y + NOK_Y) / 2, zc], s: [topLen, 0.22, 0.18], r: topHoek });
      staven.push({ p: [c + 7.5, (EAVE_Y + NOK_Y) / 2, zc], s: [topLen, 0.22, 0.18], r: -topHoek });
      // verticalen tussen onderrand en dakvlak
      for (const dx of [-11.25, -7.5, -3.75, 0, 3.75, 7.5, 11.25]) {
        const dakY = NOK_Y - (Math.abs(dx) * (NOK_Y - EAVE_Y)) / 15;
        const h = dakY - SPANT_ONDER;
        staven.push({ p: [c + dx, SPANT_ONDER + h / 2, zc], s: [0.14, h, 0.14], r: 0 });
      }
    }
  }
  const spanten = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.dakStaal, staven.length);
  spanten.name = 'spantStaven';
  staven.forEach((st, i) => {
    dummy.position.set(...st.p);
    dummy.scale.set(...st.s);
    dummy.rotation.set(0, 0, st.r);
    dummy.updateMatrix();
    spanten.setMatrixAt(i, dummy.matrix);
  });
  groep.add(spanten);

  // ── Zwarte luchtkanalen (Ø ~1 m) horizontaal onder het dak ──────────────
  for (const x of [7.5, 22.5, 37.5, 52.5]) {
    const kanaal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, D - 4, 10), M.onderkantZwart);
    kanaal.rotation.x = Math.PI / 2;
    kanaal.position.set(x, SPANT_ONDER + 0.7, D / 2);
    groep.add(kanaal);
  }

  // Kolom-colliders (middenrij staat in de loopzone)
  const colliders = [];
  for (let z = 0; z <= D + 0.01; z += stap) {
    const zc = Math.min(Math.max(z, 0.6), D - 0.6);
    colliders.push({
      x0: CONFIG.grid.centerColX - 0.55, x1: CONFIG.grid.centerColX + 0.55,
      y0: 0, y1: SPANT_ONDER, z0: zc - 0.55, z1: zc + 0.55,
    });
  }

  return { groep, colliders, surfaces: [], interactables: [] };
}
