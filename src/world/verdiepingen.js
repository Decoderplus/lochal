// Fase 2 — verdiepingsvloeren: vloer 1 (speelbaar, y = 5) en vloeren 2/3
// (decor) over het noorddeel (z ≥ 35), zwarte onderkanten, glazen balustrades
// langs de vide-rand (met openingen waar de tribunes aansluiten) en zwarte
// boekenkast-silhouetten op de randen van vloer 2/3.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen } from '../materials.js';

export function bouwVerdiepingen() {
  const M = maakMaterialen();
  const { width: W, length: D } = CONFIG.hall;
  const F = CONFIG.floors;
  const groep = new THREE.Group();
  groep.name = 'verdiepingen';
  const dummy = new THREE.Object3D();

  // ── Vloerplakken 1/2/3 + zwarte onderkant ───────────────────────────────
  // Vloer 1 vanaf z35; vloeren 2/3 wijken noordwaarts terug (z44/z50) zodat
  // het hoge open volume boven het trappenlandschap doorloopt.
  for (const [topY, vanZ] of [[F.f1, F.f1VanZ], [F.f2, F.f2VanZ], [F.f3, F.f3VanZ]]) {
    const diepte = D - vanZ, midZ = vanZ + diepte / 2;
    const plak = new THREE.Mesh(new THREE.BoxGeometry(W, F.slabT, diepte), M.vloerF);
    plak.position.set(W / 2, topY - F.slabT / 2, midZ);
    plak.receiveShadow = true;
    groep.add(plak);

    const onderkant = new THREE.Mesh(
      new THREE.PlaneGeometry(W, diepte), M.onderkantZwart);
    onderkant.rotation.x = Math.PI / 2;          // kijkt omlaag
    onderkant.position.set(W / 2, topY - F.slabT - 0.02, midZ);
    groep.add(onderkant);
  }

  // ── Balustrades langs de vide-rand (glas + eiken regel + staanders) ─────
  const colliders = [];
  const staanderPlekken = [];
  function balustrade(x0, x1, y, randZ, metCollider) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const glas = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.05), M.glas);
    glas.position.set(cx, y + 0.55, randZ + 0.06);
    groep.add(glas);
    const regel = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.09), M.eik);
    regel.position.set(cx, y + 1.1, randZ + 0.06);
    groep.add(regel);
    for (let x = x0 + 0.4; x <= x1 - 0.2; x += 1.5) {
      staanderPlekken.push([x, y + 0.55, randZ + 0.06]);
    }
    if (metCollider) {
      colliders.push({ x0, x1, y0: y, y1: y + 1.2, z0: randZ - 0.08, z1: randZ + 0.18 });
    }
  }
  // vloer 1: openingen bij de tribunes (de boven-tier rijst daar op)
  const tw = CONFIG.objects.tribuneWest.x, to = CONFIG.objects.tribuneOost.x;
  balustrade(0, tw[0], F.f1, F.f1VanZ, true);
  balustrade(tw[1], to[0], F.f1, F.f1VanZ, true);
  balustrade(to[1], W, F.f1, F.f1VanZ, true);
  // vloeren 2/3: doorlopend langs hun eigen (teruggeweken) vide-rand (decor)
  balustrade(0, W, F.f2, F.f2VanZ, false);
  balustrade(0, W, F.f3, F.f3VanZ, false);

  const staanders = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.05, 1.05, 0.05), M.nieuwStaal, staanderPlekken.length);
  staanders.name = 'balustradeStaanders';
  staanderPlekken.forEach((p, i) => {
    dummy.position.set(...p);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    staanders.setMatrixAt(i, dummy.matrix);
  });
  groep.add(staanders);

  // ── Zwarte boekenkast-silhouetten op de randen van vloer 2/3 (decor) ────
  const kastPlekken = [];
  for (let x = 4; x <= W - 6; x += 7) kastPlekken.push([x + 2, F.f2 + 1.1, F.f2VanZ + 1.9]);
  for (let x = 7.5; x <= W - 6; x += 7) kastPlekken.push([x + 2, F.f3 + 1.1, F.f3VanZ + 1.9]);
  const kasten = new THREE.InstancedMesh(
    new THREE.BoxGeometry(4, 2.2, 0.4), M.onderkantZwart, kastPlekken.length);
  kasten.name = 'kastBlokken';
  kastPlekken.forEach((p, i) => {
    dummy.position.set(...p);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    kasten.setMatrixAt(i, dummy.matrix);
  });
  groep.add(kasten);

  // Vloer 1 is het speelbare loopvlak van het noorddeel
  const surfaces = [
    { kind: 'vlak', x0: 0, x1: W, z0: F.builtFromZ, z1: D, y: F.f1 },
  ];

  return { groep, colliders, surfaces, interactables: [] };
}
