// Fase 3 (vervolg) — inrichting EERSTE VERDIEPING (vloer 1, y = 5), volgens
// werkplan sectie 8 + plattegrond/foto's:
//  • KennisMakerij-plateau: boekenplint-banken (opgestapelde boeken + eiken
//    blad + matraskussens), schermen op standaards, donkerblauw plooigordijn
//  • TijdLab (westrand): zwarte vakkenwand met oranje achterpanelen vol
//    stationsklokken, dambordvloer, limegroene historische textielmachine
//  • Glazenzaal: glazen vergadervolume met licht gebogen westwand
//  • Seats2meet: open vergaderplein (tafels + krukken) oost van de Glazenzaal
// Alles in plattegrond-coördinaten; de wereld-spiegeling werkt automatisch.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen, maakRng } from '../materials.js';

export function bouwVerdieping1() {
  const M = maakMaterialen();
  const O = CONFIG.objects;
  const Y = CONFIG.floors.f1;                 // vloer-1-niveau (= 5)
  const groep = new THREE.Group();
  groep.name = 'verdieping1';
  const dummy = new THREE.Object3D();
  const colliders = [];
  const rng = maakRng(2024);

  let doel = groep;
  const add = (mesh) => { doel.add(mesh); return mesh; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const beginSub = (naam) => { const s = new THREE.Group(); s.name = naam; groep.add(s); doel = s; };
  const eindeSub = () => { doel = groep; };

  // instanced verzamelaars
  const panelen = [];      // oranje TijdLab-achterpanelen
  const klokken = [];      // witte klokschijven
  const krukken = [];      // krukken (Seats2meet + Glazenzaal)

  // ── KennisMakerij-plateau (x15–45, z35–42): bovenaan de tribunes ─────────
  // Boekenplint-banken kijken zuid de vide in; schermen + blauw gordijn erachter.
  function bouwKennisMakerij() {
    beginSub('kennisPlateau');
    for (const bx of [19, 27, 35]) {
      const bz = 40.3;
      // plint van opgestapelde boeken
      const plint = add(box(2.4, 0.5, 1.0, M.boekenstapel));
      plint.position.set(bx, Y + 0.25, bz); plint.castShadow = true;
      // eiken zitblad
      const blad = add(box(2.5, 0.12, 1.1, M.eik));
      blad.position.set(bx, Y + 0.56, bz);
      // matraskussen (afwisselend rood/oranje)
      const kus = add(box(2.3, 0.18, 0.95, bx === 27 ? M.kussenOranje : M.kussenRood));
      kus.position.set(bx, Y + 0.71, bz);
      colliders.push({ x0: bx - 1.25, x1: bx + 1.25, y0: Y, y1: Y + 0.6, z0: bz - 0.55, z1: bz + 0.55 });
      // scherm op standaard, erachter (noord)
      const paal = add(box(0.08, 1.5, 0.08, M.nieuwStaal));
      paal.position.set(bx, Y + 0.75, bz + 0.9);
      const scherm = add(box(1.4, 0.85, 0.06, M.onderkantZwart));
      scherm.position.set(bx, Y + 1.65, bz + 0.9);
    }
    // "KennisMakerij"-eiken header op twee posten
    for (const px of [16.5, 37.5]) {
      const post = add(box(0.1, 1.0, 0.1, M.nieuwStaal));
      post.position.set(px, Y + 0.5, 41.6);
    }
    const header = add(box(22, 0.5, 0.12, M.eik));
    header.position.set(27, Y + 1.2, 41.6); header.castShadow = true;
    eindeSub();
  }

  // geplooid gordijn: PlaneGeometry met sinus-plooi in X (max ~1k tris)
  function bouwGordijn(x0, x1, z, yLo, yHi, mat, amp) {
    const len = x1 - x0, segX = 48, geo = new THREE.PlaneGeometry(len, yHi - yLo, segX, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i);
      p.setZ(i, Math.sin((lx / len) * Math.PI * 12) * amp);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);          // gedeeld materiaal (geen kloon)
    m.position.set((x0 + x1) / 2, (yLo + yHi) / 2, z);
    m.rotation.y = Math.PI;                       // voorzijde kijkt zuid (naar de speler)
    add(m);
    return m;
  }

  // ── TijdLab (westrand x0–8, z39–48): zwarte vakkenwand vol klokken ───────
  function bouwTijdLab() {
    beginSub('tijdLab');
    const wx = 0.7;                       // wand tegen de westgevel
    const z0 = 39.5, z1 = 47.5, yLo = Y, yHi = Y + 4;
    const nz = 5, ny = 3;                 // 5 vakken in z, 3 in y
    // zwart raamwerk: verticale + horizontale staven
    for (let i = 0; i <= nz; i++) {
      const z = z0 + (z1 - z0) * i / nz;
      const stijl = add(box(0.5, yHi - yLo, 0.12, M.onderkantZwart));
      stijl.position.set(wx, (yLo + yHi) / 2, z);
    }
    for (let j = 0; j <= ny; j++) {
      const y = yLo + (yHi - yLo) * j / ny;
      const regel = add(box(0.5, 0.12, z1 - z0, M.onderkantZwart));
      regel.position.set(wx, y, (z0 + z1) / 2);
    }
    // per vak: oranje achterpaneel + witte klok
    for (let i = 0; i < nz; i++) for (let j = 0; j < ny; j++) {
      const z = z0 + (z1 - z0) * (i + 0.5) / nz;
      const y = yLo + (yHi - yLo) * (j + 0.5) / ny;
      panelen.push([wx - 0.04, y, z, (z1 - z0) / nz - 0.18, (yHi - yLo) / ny - 0.18]);
      klokken.push([wx + 0.16, y, z]);
    }
    colliders.push({ x0: 0, x1: wx + 0.3, y0: yLo, y1: yHi, z0: z0 - 0.3, z1: z1 + 0.3 });
    // dambordvloer ervóór
    const vt = M.dambord;
    if (vt.map) { vt.map.repeat.set(11, 16); vt.map.needsUpdate = true; }
    const vloer = add(new THREE.Mesh(new THREE.PlaneGeometry(5.5, 8), vt));
    vloer.rotation.x = -Math.PI / 2;
    vloer.position.set(wx + 3.0, Y + 0.02, (z0 + z1) / 2);
    vloer.receiveShadow = true;
    // limegroene historische textielmachine (op de dambordvloer)
    bouwMachine(3.6, 45.0);
    eindeSub();
  }

  function bouwMachine(mx, mz) {
    const groen = M.plantGroen;
    const basis = add(box(2.2, 1.0, 1.4, groen)); basis.position.set(mx, Y + 0.5, mz);
    basis.castShadow = true;
    const kop = add(box(1.0, 0.9, 1.2, groen)); kop.position.set(mx - 0.4, Y + 1.45, mz);
    // grote roller + vliegwiel
    const roller = add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.5, 12), M.nieuwStaal));
    roller.rotation.x = Math.PI / 2; roller.position.set(mx + 0.9, Y + 1.2, mz);
    const wiel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 16), groen));
    wiel.rotation.z = Math.PI / 2; wiel.position.set(mx + 1.15, Y + 0.6, mz);
    colliders.push({ x0: mx - 1.2, x1: mx + 1.3, y0: Y, y1: Y + 1.9, z0: mz - 0.8, z1: mz + 0.8 });
  }

  // ── Glazenzaal (x18–30, z55–70): glazen vergadervolume, gebogen westwand ─
  function bouwGlazenzaal() {
    beginSub('glazenzaal');
    const xw = 19.5, xe = 29, zs = 56, zn = 69, h = 3.6;
    // gebogen westwand (3 segmenten die naar buiten bollen)
    const boog = [[zs, xw + 0.0], [(zs + zn) / 2, xw - 0.9], [zn, xw + 0.0]];
    for (let i = 0; i < boog.length - 1; i++) {
      const [za, xa] = boog[i], [zb, xb] = boog[i + 1];
      const len = Math.hypot(zb - za, xb - xa);
      const seg = add(box(0.05, h, len, M.glas));
      seg.position.set((xa + xb) / 2, Y + h / 2, (za + zb) / 2);
      seg.rotation.y = Math.atan2(xb - xa, zb - za);
    }
    // noordwand + zuidwand met deuropening in het midden
    glasWand(xw, xe, zn, h);
    for (const seg of [[xw, xw + 3.2], [xe - 3.2, xe]]) glasWand(seg[0], seg[1], zs, h);
    // glazen oost-lange-zijde (twee vlakken)
    glasZijde(xe, zs, zs + 5, h); glasZijde(xe, zn - 5, zn, h);
    // stalen hoekposten + bovenrand
    for (const [px, pz] of [[xw, zs], [xe, zs], [xw, zn], [xe, zn]]) {
      const post = add(box(0.1, h, 0.1, M.nieuwStaal));
      post.position.set(px, Y + h / 2, pz);
    }
    const rand = add(box(xe - xw, 0.1, 0.1, M.nieuwStaal));
    rand.position.set((xw + xe) / 2, Y + h, zn);
    // vergadertafel + krukken binnen
    const tafel = add(box(3.0, 0.12, 1.2, M.eik));
    tafel.position.set((xw + xe) / 2, Y + 0.75, (zs + zn) / 2); tafel.castShadow = true;
    add(box(0.1, 0.75, 0.1, M.nieuwStaal)).position.set((xw + xe) / 2, Y + 0.37, (zs + zn) / 2);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      krukken.push([(xw + xe) / 2 + Math.cos(a) * 1.9, Y, (zs + zn) / 2 + Math.sin(a) * 1.0]);
    }
    // colliders: west(boog), noord, oost-flanken
    colliders.push({ x0: xw - 1.0, x1: xw - 0.6, y0: Y, y1: Y + h, z0: zs, z1: zn });
    colliders.push({ x0: xw, x1: xe, y0: Y, y1: Y + h, z0: zn - 0.1, z1: zn + 0.1 });
    eindeSub();

    function glasWand(a, b, z, hh, isZuid) {
      const m = add(box(b - a, hh, 0.05, M.glas));
      m.position.set((a + b) / 2, Y + hh / 2, z);
      return m;
    }
    function glasZijde(x, za, zb, hh) {
      const m = add(box(0.05, hh, zb - za, M.glas));
      m.position.set(x, Y + hh / 2, (za + zb) / 2);
      return m;
    }
  }

  // ── Seats2meet (x32–48, z55–75): open vergaderplein ──────────────────────
  function bouwSeats2meet() {
    beginSub('seats2meet');
    for (const [tx, tz] of [[36, 60], [44, 60], [36, 69], [44, 69]]) {
      const tafel = add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16), M.eik));
      tafel.position.set(tx, Y + 0.74, tz); tafel.castShadow = true;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.74, 8), M.nieuwStaal))
        .position.set(tx, Y + 0.37, tz);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        krukken.push([tx + Math.cos(a) * 1.7, Y, tz + Math.sin(a) * 1.7]);
      }
      colliders.push({ x0: tx - 1.1, x1: tx + 1.1, y0: Y, y1: Y + 0.8, z0: tz - 1.1, z1: tz + 1.1 });
    }
    eindeSub();
  }

  bouwKennisMakerij();
  bouwTijdLab();
  bouwGlazenzaal();
  bouwSeats2meet();

  // ── instanced families afronden ─────────────────────────────────────────
  if (panelen.length) {
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1, 1), M.kussenOranje, panelen.length);
    pm.name = 'tijdlabPanelen';
    panelen.forEach(([x, y, z, ph, pv], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(1, pv, ph);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      pm.setMatrixAt(i, dummy.matrix);
    });
    add(pm);
  }
  if (klokken.length) {
    const km = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16), M.daklicht, klokken.length);
    km.name = 'tijdlabKlokken';
    klokken.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, Math.PI / 2); dummy.updateMatrix();   // schijf kijkt langs +x
      km.setMatrixAt(i, dummy.matrix);
    });
    add(km);
  }
  if (krukken.length) {
    const sm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), M.kussenRood, krukken.length);
    sm.name = 'vergaderStoelen';
    krukken.forEach(([x, y, z], i) => {
      dummy.position.set(x, y + 0.25, z); dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
    });
    add(sm);
  }

  return { groep, colliders, surfaces: [], interactables: [] };
}
