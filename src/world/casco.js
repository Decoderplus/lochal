// Fase 1 — casco: BG-vloer met werkvloermarkeringen, onderbouw (y 0–4) met
// vensterstroken, glazen bovenbouw in fijn raster (stijlen ~1,5 m, regels
// ~2 m), twee zadeldaken (nokken x = 15 en 45) en piramide-daklichten.
// Alle maten/kleuren uit CONFIG; raster en daklichten als InstancedMesh.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen } from '../materials.js';

const EAVE_Y = 17;   // gootlijn (gevelglas tot hier; nok op hall.height = 19) — dak 1 verdieping hoger

export function bouwCasco() {
  const M = maakMaterialen();
  const { width: W, length: D, height: NOK_Y, ridgeX, baseWallH } = CONFIG.hall;
  const groep = new THREE.Group();
  groep.name = 'casco';

  // ── BG-vloer (60 × 90) met betonmarkeringen-textuur (repeat 1×) ─────────
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.vloerBG);
  vloer.rotation.x = -Math.PI / 2;
  vloer.position.set(W / 2, 0, D / 2);
  vloer.receiveShadow = true;
  groep.add(vloer);

  // ── Onderbouw y 0–4: sokkel + vensterstrook (y 2,2–3,2) ─────────────────
  const DIKTE = 0.3;
  function sokkelWand(cx, cz, lx, lz) {
    for (const [y0, y1] of [[0, 2.2], [3.2, baseWallH]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(lx, y1 - y0, lz), M.sokkel);
      m.position.set(cx, (y0 + y1) / 2, cz);
      m.castShadow = m.receiveShadow = true;
      groep.add(m);
    }
    const glasStrook = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(lx, 0.04), 1.0, Math.max(lz, 0.04)), M.glas);
    glasStrook.position.set(cx, 2.7, cz);
    groep.add(glasStrook);
  }
  // zuid: opening (x 54–59) voor de gefogde uitgang-schuifdeur (zie zuidhal)
  sokkelWand(27, DIKTE / 2, 54, DIKTE);            // zuid, links van de uitgang
  sokkelWand(59.5, DIKTE / 2, 1, DIKTE);           // zuid, rechts van de uitgang
  sokkelWand(W / 2, D - DIKTE / 2, W, DIKTE);      // noord
  sokkelWand(DIKTE / 2, D / 2, DIKTE, D);          // west
  sokkelWand(W - DIKTE / 2, D / 2, DIKTE, D);      // oost

  // ── Glazen bovenbouw y 4–13 (vlakken) + geveltop-driehoeken ─────────────
  function glasVlak(w, h, x, y, z, rotY = 0) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glas);
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    groep.add(g);
  }
  const glasH = EAVE_Y - baseWallH;
  glasVlak(W, glasH, W / 2, baseWallH + glasH / 2, 0);                 // zuid
  glasVlak(W, glasH, W / 2, baseWallH + glasH / 2, D);                 // noord
  glasVlak(D, glasH, 0, baseWallH + glasH / 2, D / 2, Math.PI / 2);    // west
  glasVlak(D, glasH, W, baseWallH + glasH / 2, D / 2, Math.PI / 2);    // oost

  // geveltoppen: glazen driehoeken onder de twee daken (z = 0 en z = 90)
  function driehoek(p1, p2, p3) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      ...p1, ...p2, ...p3], 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.glas);
    groep.add(m);
  }
  for (const z of [0, D]) {
    driehoek([0, EAVE_Y, z], [ridgeX[0], NOK_Y, z], [W / 2, EAVE_Y, z]);
    driehoek([W / 2, EAVE_Y, z], [ridgeX[1], NOK_Y, z], [W, EAVE_Y, z]);
  }

  // ── Fijn gevelraster (InstancedMesh): stijlen 1,5 m / regels 2 m ────────
  const rasterPlekken = [];
  const gx = CONFIG.hall.glassGridX;
  for (let x = 0; x <= W + 0.01; x += gx) {                    // zuid + noord
    rasterPlekken.push({ p: [x, baseWallH + glasH / 2, 0.10], s: [0.10, glasH, 0.16] });
    rasterPlekken.push({ p: [x, baseWallH + glasH / 2, D - 0.10], s: [0.10, glasH, 0.16] });
  }
  for (let z = 0; z <= D + 0.01; z += gx) {                    // west + oost
    rasterPlekken.push({ p: [0.10, baseWallH + glasH / 2, z], s: [0.16, glasH, 0.10] });
    rasterPlekken.push({ p: [W - 0.10, baseWallH + glasH / 2, z], s: [0.16, glasH, 0.10] });
  }
  for (let y = baseWallH + CONFIG.hall.glassGridY; y < EAVE_Y; y += CONFIG.hall.glassGridY) {
    rasterPlekken.push({ p: [W / 2, y, 0.10], s: [W, 0.10, 0.14] });
    rasterPlekken.push({ p: [W / 2, y, D - 0.10], s: [W, 0.10, 0.14] });
    rasterPlekken.push({ p: [0.10, y, D / 2], s: [0.14, 0.10, D] });
    rasterPlekken.push({ p: [W - 0.10, y, D / 2], s: [0.14, 0.10, D] });
  }
  // gootbalken op de gootlijn
  rasterPlekken.push({ p: [W / 2, EAVE_Y, 0.12], s: [W, 0.35, 0.28] });
  rasterPlekken.push({ p: [W / 2, EAVE_Y, D - 0.12], s: [W, 0.35, 0.28] });
  rasterPlekken.push({ p: [0.12, EAVE_Y, D / 2], s: [0.28, 0.35, D] });
  rasterPlekken.push({ p: [W - 0.12, EAVE_Y, D / 2], s: [0.28, 0.35, D] });

  const raster = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.dakStaal, rasterPlekken.length);
  raster.name = 'gevelRaster';
  const dummy = new THREE.Object3D();
  rasterPlekken.forEach((r, i) => {
    dummy.position.set(...r.p);
    dummy.scale.set(...r.s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    raster.setMatrixAt(i, dummy.matrix);
  });
  groep.add(raster);

  // ── Twee zadeldaken: grijze dakplaten op de gootlijn ────────────────────
  function dakVlak(x0, y0, x1, y1) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      x0, y0, 0,  x1, y1, 0,  x1, y1, D,
      x0, y0, 0,  x1, y1, D,  x0, y0, D,
    ], 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.dakPlaat);
    m.receiveShadow = true;
    groep.add(m);
  }
  dakVlak(0, EAVE_Y, ridgeX[0], NOK_Y);          // west-beuk, westhelling
  dakVlak(ridgeX[0], NOK_Y, W / 2, EAVE_Y);      // west-beuk, oosthelling
  dakVlak(W / 2, EAVE_Y, ridgeX[1], NOK_Y);      // oost-beuk, westhelling
  dakVlak(ridgeX[1], NOK_Y, W, EAVE_Y);          // oost-beuk, oosthelling

  // ── Daklichten: doorlopende glazende daklicht-banen in de dakvlakken
  //    (industriële north-light/zaagtand-look i.p.v. piramides) — heldere
  //    emissieve stroken die over de hele lengte daglicht in de hal brengen. ─
  const dlPlekken = [];
  const dakHellingen = [
    [0, EAVE_Y, ridgeX[0], NOK_Y], [ridgeX[0], NOK_Y, W / 2, EAVE_Y],
    [W / 2, EAVE_Y, ridgeX[1], NOK_Y], [ridgeX[1], NOK_Y, W, EAVE_Y],
  ];
  for (const [xa, ya, xb, yb] of dakHellingen) {
    const dx = xb - xa, dy = yb - ya, theta = Math.atan2(dy, dx);
    for (const u of [0.28, 0.55, 0.82]) {            // 3 banen per dakhelling
      const x = xa + u * dx, y = ya + u * dy - 0.18;  // net ónder het dakvlak (zichtbaar van binnen)
      dlPlekken.push({ p: [x, y, D / 2], s: [1.8, 0.12, D - 3], rz: theta });
    }
  }
  const daklichten = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), M.daklicht, dlPlekken.length);
  daklichten.name = 'daklichten';
  dlPlekken.forEach((d, i) => {
    dummy.position.set(...d.p);
    dummy.scale.set(...d.s);
    dummy.rotation.set(0, 0, d.rz);
    dummy.updateMatrix();
    daklichten.setMatrixAt(i, dummy.matrix);
  });
  groep.add(daklichten);

  // ── Colliders: de vier gevels ────────────────────────────────────────────
  const colliders = [
    { x0: -0.5, x1: W + 0.5, y0: 0, y1: NOK_Y, z0: -0.5, z1: 0.35 },   // zuid
    { x0: -0.5, x1: W + 0.5, y0: 0, y1: NOK_Y, z0: D - 0.35, z1: D + 0.5 }, // noord
    { x0: -0.5, x1: 0.35, y0: 0, y1: NOK_Y, z0: -0.5, z1: D + 0.5 },   // west
    { x0: W - 0.35, x1: W + 0.5, y0: 0, y1: NOK_Y, z0: -0.5, z1: D + 0.5 }, // oost
  ];

  return { groep, colliders, surfaces: [], interactables: [] };
}
