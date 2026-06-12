// Wereld-aggregator: bouwt alle modules van de huidige fase en verzamelt
// colliders / loopvlakken / interactables / per-frame-updates.
// Wordt zowel door de browser-app (src/main.js) als headless door
// tools/verify.js gebruikt.
import * as THREE from 'three';
import { bouwStemmingMakerij } from './stemmingmakerij.js';
import { bouwCasco } from './casco.js';
import { bouwConstructie } from './constructie.js';

// Welke benoemde groepen er op dit moment gebouwd zijn (verify toetst deze;
// casco/constructie hebben geen CONFIG-vak en worden alleen op hal-omvang getoetst).
export const GEBOUWD = ['stemmingMakerij', 'casco', 'constructie'];

// InstancedMesh-namen die verify moet aantreffen (groeit per fase).
export const VERPLICHT_INSTANCED = [
  'gevelRaster', 'daklichten', 'kolommenOud', 'kolommenNieuw', 'spantStaven',
];

export function bouwWereld(scene) {
  const colliders = [];
  const surfaces = [
    // Begane grond als basis-loopvlak (visuele vloer volgt in fase 1)
    { kind: 'vlak', x0: 0, x1: 60, z0: 0, z1: 90, y: 0 },
  ];
  const interactables = [];
  const updates = [];

  const delen = [
    bouwCasco(),
    bouwConstructie(),
    bouwStemmingMakerij(),
  ];
  for (const d of delen) {
    scene.add(d.groep);
    if (d.colliders) colliders.push(...d.colliders);
    if (d.surfaces) surfaces.push(...d.surfaces);
    if (d.interactables) interactables.push(...d.interactables);
    if (d.update) updates.push(d.update);
  }

  return {
    colliders, surfaces, interactables,
    update(dt) { for (const u of updates) u(dt); },
  };
}
