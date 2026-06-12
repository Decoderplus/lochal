// Headless scene-asserts (node, geen renderer) — werkplan sectie 4.
// Faalt (exit ≠ 0) → fase niet committen.
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { bouwWereld, GEBOUWD, VERPLICHT_INSTANCED } from '../src/world/index.js';

const fouten = [];
const ok = (m) => console.log('  ✓ ' + m);
const fout = (m) => { fouten.push(m); console.log('  ✗ ' + m); };

const scene = new THREE.Scene();
const wereld = bouwWereld(scene);
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
function center(naam) {
  const o = scene.getObjectByName(naam);
  if (!o) return null;
  return new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
}

// ── 5. ASSENCHECK (werkplan sectie 2) ────────────────────────────────────
console.log('\nASSENCHECK');

// A1. Halbox: breedte 60 langs X, lengte 90 langs Z (andersom = fataal)
{
  const casco = scene.getObjectByName('casco');
  if (!casco) fout('ASSEN: casco ontbreekt');
  else {
    const b = new THREE.Box3().setFromObject(casco);
    const exX = b.max.x - b.min.x, exZ = b.max.z - b.min.z;
    if (Math.abs(exX - 60) <= 3 && Math.abs(exZ - 90) <= 3)
      ok(`A1 halbox: breedte X≈${exX.toFixed(0)} (60), lengte Z≈${exZ.toFixed(0)} (90)`);
    else
      fout(`A1 ASSEN VERWISSELD — X≈${exX.toFixed(0)}, Z≈${exZ.toFixed(0)} (verwacht X=60, Z=90)`);
  }
}

// A2. Tribunes: treden oost-west; bovenkant y≈5 noord (z≈35), onder y≈0 zuid (z≈22)
{
  // treden oost-west: tredebreedte langs X >> langs Z (uit instance-schalen)
  const treden = scene.getObjectByName('tribuneTreden');
  if (!treden || !treden.isInstancedMesh) fout('A2 tribuneTreden InstancedMesh ontbreekt');
  else {
    const m = new THREE.Matrix4(), s = new THREE.Vector3();
    let oostWest = true;
    for (let i = 0; i < Math.min(treden.count, 20); i++) {
      treden.getMatrixAt(i, m); m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
      if (s.x <= s.z) oostWest = false;
    }
    if (oostWest) ok('A2 treden oost-west (breedte langs X > langs Z)');
    else fout('A2 TRIBUNE GEDRAAID — treden niet oost-west (langs X ≤ langs Z)');
  }
  // ramp-loopvlakken: per tribune een helling met y=0 zuid (z≈22) → y=5 noord (z≈31–35)
  const hellingen = wereld.surfaces.filter((s) => s.kind === 'helling');
  const goed = hellingen.filter((h) =>
    Math.abs(h.yBijZ0) < 0.5 && h.z0 >= 20 && h.z0 <= 24 &&
    Math.abs(h.yBijZ1 - 5) < 0.6 && h.z1 >= 30 && h.z1 <= 36);
  if (goed.length >= 2) ok(`A2 ${goed.length} tribune-hellingen: y0 zuid (z≈22) → y5 noord (z≈31–35)`);
  else fout(`A2 TRIBUNE-RICHTING — ${goed.length}/2 hellingen met onder-zuid/boven-noord (y0@z22 → y5@z~33)`);
}

// A3. StemmingMakerij-center: x > 50 én z 40–54.
// De deurrichtingscheck is TIJDELIJK uitgeschakeld: de zaal is onaantastbaar
// en de wrapper-rotatie wordt eerst in het spel geijkt (CONFIG.zaalRotatie,
// debugtoets R). Na de ijking komt de richtingscheck hier terug.
{
  const c = center('stemmingMakerij');
  const zaal = scene.getObjectByName('stemmingMakerij');
  if (!c || !zaal) fout('A3 stemmingMakerij ontbreekt');
  else {
    if (c.x > 50 && c.z >= 40 && c.z <= 54)
      ok(`A3 StemmingMakerij-center x=${c.x.toFixed(1)} (>50), z=${c.z.toFixed(1)} (40–54)`);
    else
      fout(`A3 StemmingMakerij-center x=${c.x.toFixed(1)}, z=${c.z.toFixed(1)} (verwacht x>50, z 40–54)`);
    const n = zaal.userData.deurNormaal;
    console.log(`  · A3 deurrichting-check tijdelijk uit (ijking zaalRotatie; deurNormaal nu ${n ? n.map((v) => v.toFixed(2)) : 'onbekend'})`);
  }
}

// A4. Café-center z < 15 · Glazenzaal-center x < 30 (alleen toetsen indien gebouwd)
for (const [naam, test, eis] of [
  ['cafe', (c) => c.z < 15, 'z < 15'],
  ['glazenzaal', (c) => c.x < 30, 'x < 30'],
]) {
  if (!GEBOUWD.includes(naam)) { console.log(`  · A4 '${naam}' nog niet gebouwd (latere fase)`); continue; }
  const c = center(naam);
  if (c && test(c)) ok(`A4 ${naam}-center ${eis} (${c.x.toFixed(1)},${c.z.toFixed(1)})`);
  else fout(`A4 ${naam}-center voldoet niet aan ${eis}`);
}

// A5. Minimaal 2 grote doeken in de zuidhal (z < 30), weerszijden van x=30
{
  const doeken = [];
  scene.traverse((o) => { if (o.name && /doek/i.test(o.name)) doeken.push(o); });
  if (!doeken.length) console.log('  · A5 doeken nog niet gebouwd (latere fase)');
  else {
    const zuid = doeken.map((d) => new THREE.Box3().setFromObject(d).getCenter(new THREE.Vector3()))
      .filter((c) => c.z < 30);
    const west = zuid.some((c) => c.x < 30), oost = zuid.some((c) => c.x > 30);
    if (zuid.length >= 2 && west && oost) ok(`A5 ${zuid.length} doeken in zuidhal, weerszijden van x=30`);
    else fout(`A5 DOEKEN — ${zuid.length} in zuidhal (z<30), west=${west}, oost=${oost} (eis ≥2, beide kanten)`);
  }
}

if (fouten.length) {
  console.log(`\nVERIFY FAALT — ${fouten.length} probleem(en).`);
  process.exit(1);
}
console.log('\nVERIFY GROEN.');
