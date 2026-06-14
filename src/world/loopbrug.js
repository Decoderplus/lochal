// Fase 4 — loopbrug over de vide tussen de twee tribune-topplatforms.
// Bewust op z=34: dat valt in het GAT tussen de middenkolommen (x=30) op
// z=30 en z=37,5 (elk Ø~0,55 m), dus de brug blijft vrij van de pilaar — de
// eerdere brug (z31–33) liep er nog dwars doorheen.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen } from '../materials.js';

export function bouwLoopbrug() {
  const M = maakMaterialen();
  const L = CONFIG.objects.loopbrug;            // { x:[25,33], z:34, y:5, breedte:2 }
  const Y = L.y;
  const [x0, x1] = L.x, zc = L.z, b = L.breedte;
  const zA = zc - b / 2, zB = zc + b / 2;       // z33 … z35
  const cx = (x0 + x1) / 2, len = x1 - x0;
  const groep = new THREE.Group();
  groep.name = 'loopbrug';
  const add = (m) => { groep.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const colliders = [];

  // dek
  const dek = add(box(len, 0.16, b, M.vloerF));
  dek.position.set(cx, Y - 0.08, zc);
  dek.castShadow = true; dek.receiveShadow = true;

  // onderbalken (twee stalen liggers) + dwarsbalkjes
  for (const z of [zA + 0.25, zB - 0.25]) {
    const ligger = add(box(len, 0.28, 0.16, M.nieuwStaal));
    ligger.position.set(cx, Y - 0.32, z);
  }
  for (let x = x0 + 1; x < x1; x += 2) {
    const dwars = add(box(0.14, 0.18, b, M.nieuwStaal));
    dwars.position.set(x, Y - 0.32, zc);
  }

  // glazen balustrade + eiken leuning + staanders aan beide lange zijden
  for (const z of [zA, zB]) {
    const glas = add(new THREE.Mesh(new THREE.PlaneGeometry(len, 1.0), M.glas));
    glas.position.set(cx, Y + 0.5, z);
    const leuning = add(box(len, 0.07, 0.09, M.eik));
    leuning.position.set(cx, Y + 1.02, z);
    for (let x = x0 + 0.3; x <= x1 - 0.2; x += 1.4) {
      const st = add(box(0.05, 1.0, 0.05, M.nieuwStaal));
      st.position.set(x, Y + 0.5, z);
    }
    colliders.push({ x0, x1, y0: Y, y1: Y + 1.1, z0: z - 0.06, z1: z + 0.06 });
  }

  // loopvlak op brughoogte
  const surfaces = [{ kind: 'vlak', x0, x1, z0: zA, z1: zB, y: Y }];
  return { groep, colliders, surfaces, interactables: [] };
}
