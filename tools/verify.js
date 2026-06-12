// Headless scene-asserts (node, geen renderer) — werkplan sectie 4.
// Faalt (exit ≠ 0) → fase niet committen.
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { bouwWereld, GEBOUWD, VERPLICHT_INSTANCED } from '../src/world/index.js';

const fouten = [];
const ok = (m) => console.log('  ✓ ' + m);
const fout = (m) => { fouten.push(m); console.log('  ✗ ' + m); };

const scene = new THREE.Scene();
bouwWereld(scene);
scene.updateMatrixWorld(true);

// ── 1. Benoemde groepen + bounding box binnen hal én CONFIG-vak (+1 m) ────
// Verwachte vakken per object (CONFIG-vak; bij bijzondere vormen afgeleid).
const O = CONFIG.objects;
const vakken = {
  stemmingMakerij: { x: O.stemmingMakerij.x, y: [4.0, 9.6], z: O.stemmingMakerij.z },
  glazenzaal: { x: O.glazenzaal.x, z: O.glazenzaal.z },
  seats2meet: { x: O.seats2meet.x, z: O.seats2meet.z },
  kennisPlateau: { x: O.kennisPlateau.x, z: O.kennisPlateau.z },
  tijdLab: { x: O.tijdLab.x, z: O.tijdLab.z },
  tribuneWest: { x: O.tribuneWest.x, z: [O.tribuneWest.zBottom, O.tribuneWest.zTop], y: [-0.2, 7.5] },
  tribuneOost: { x: O.tribuneOost.x, z: [O.tribuneOost.zBottom, O.tribuneOost.zTop], y: [-0.2, 7.5] },
  // brug verbindt de tribune-topplatforms; vak verruimd gelogd in DECISIONS.md
  loopbrug: { x: O.loopbrug.x, z: [O.loopbrug.z - 2, O.loopbrug.z + 4], y: [3, 8.5] },
  cafe: { x: O.cafe.x, z: O.cafe.z },
  kroonluchter: { x: [O.kroonluchter.cx - O.kroonluchter.spreid - 1, O.kroonluchter.cx + O.kroonluchter.spreid + 1],
                  z: [O.kroonluchter.cz - O.kroonluchter.spreid - 1, O.kroonluchter.cz + O.kroonluchter.spreid + 1],
                  y: [O.kroonluchter.yMin - 2, O.kroonluchter.yMax + 7] },
  stellage: { x: O.stellage.x, z: O.stellage.z },
  treintafels: { z: O.treintafels.z },
  expoWanden: { x: O.expoWanden.x, z: O.expoWanden.z },
  kraan: { x: O.kraan.spanX, z: [O.kraan.parkZ - 4, O.kraan.parkZ + 4] },
  grootDoek: {},
};
const TOL = 1.0;
const hal = new THREE.Box3(
  new THREE.Vector3(-1.5, -0.3, -1.5),
  new THREE.Vector3(61.5, 16.5, 91.5));

console.log('\nVERIFY — gebouwde objecten (' + GEBOUWD.join(', ') + ')');
for (const naam of GEBOUWD) {
  const obj = scene.getObjectByName(naam);
  if (!obj) { fout(`object '${naam}' ontbreekt in de scene`); continue; }
  const box = new THREE.Box3().setFromObject(obj);
  if (!hal.containsBox(box)) {
    fout(`'${naam}' valt buiten de hal: ${boxStr(box)}`);
    continue;
  }
  const vak = vakken[naam] ?? {};
  let binnen = true;
  if (vak.x && (box.min.x < vak.x[0] - TOL || box.max.x > vak.x[1] + TOL)) binnen = false;
  if (vak.z && (box.min.z < vak.z[0] - TOL || box.max.z > vak.z[1] + TOL)) binnen = false;
  if (vak.y && (box.min.y < vak.y[0] - TOL || box.max.y > vak.y[1] + TOL)) binnen = false;
  if (!binnen) fout(`'${naam}' buiten zijn CONFIG-vak (+1 m): ${boxStr(box)}`);
  else ok(`'${naam}' aanwezig en binnen zijn vak ${boxStr(box)}`);
}
for (const naam of Object.keys(CONFIG.objects)) {
  if (!GEBOUWD.includes(naam)) console.log(`  · '${naam}' nog niet gebouwd (latere fase)`);
}

// ── 2. Triangle-budget ────────────────────────────────────────────────────
let tris = 0;
scene.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry;
  const n = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
  tris += n * (o.isInstancedMesh ? o.count : 1);
});
tris = Math.round(tris);
if (tris > CONFIG.performance.maxTris) fout(`triangles ${tris} > budget ${CONFIG.performance.maxTris}`);
else ok(`triangles: ${tris} (budget ${CONFIG.performance.maxTris})`);

// ── 3. Voorgeschreven InstancedMesh-categorieën ──────────────────────────
for (const naam of VERPLICHT_INSTANCED) {
  let gevonden = null;
  scene.traverse((o) => { if (o.name === naam) gevonden = o; });
  if (!gevonden) fout(`InstancedMesh '${naam}' ontbreekt`);
  else if (!gevonden.isInstancedMesh) fout(`'${naam}' is geen InstancedMesh`);
  else ok(`InstancedMesh '${naam}' (${gevonden.count} instances)`);
}

// ── 4. Materiaalbudget (≤ 25, exclusief de bevroren StemmingMakerij) ─────
const zaal = scene.getObjectByName('stemmingMakerij');
const inZaal = new Set();
if (zaal) zaal.traverse((o) => inZaal.add(o));
const mats = new Set();
scene.traverse((o) => {
  if (!o.isMesh || inZaal.has(o)) return;
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m);
});
if (mats.size > 25) fout(`unieke materialen buiten de zaal: ${mats.size} > 25`);
else ok(`unieke materialen buiten de zaal: ${mats.size} (≤ 25)`);

function boxStr(b) {
  const f = (v) => v.toFixed(1);
  return `[x ${f(b.min.x)}…${f(b.max.x)}, y ${f(b.min.y)}…${f(b.max.y)}, z ${f(b.min.z)}…${f(b.max.z)}]`;
}

if (fouten.length) {
  console.log(`\nVERIFY FAALT — ${fouten.length} probleem(en).`);
  process.exit(1);
}
console.log('\nVERIFY GROEN.');
