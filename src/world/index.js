// Wereld-aggregator: bouwt alle modules van de huidige fase en verzamelt
// colliders / loopvlakken / interactables / per-frame-updates.
// Wordt zowel door de browser-app (src/main.js) als headless door
// tools/verify.js gebruikt.
import * as THREE from 'three';
import { bouwStemmingMakerij } from './stemmingmakerij.js';

// Welke CONFIG.objects er op dit moment gebouwd zijn (verify toetst deze).
export const GEBOUWD = ['stemmingMakerij'];

// InstancedMesh-namen die verify moet aantreffen (groeit per fase).
export const VERPLICHT_INSTANCED = [];

export function bouwWereld(scene) {
  const colliders = [];
  const surfaces = [
    // Begane grond als basis-loopvlak (visuele vloer volgt in fase 1)
    { kind: 'vlak', x0: 0, x1: 60, z0: 0, z1: 90, y: 0 },
  ];
  const interactables = [];
  const updates = [];

  const delen = [
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
