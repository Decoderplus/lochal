// Wereld-aggregator: bouwt alle modules van de huidige fase en verzamelt
// colliders / loopvlakken / interactables / per-frame-updates.
// Wordt zowel door de browser-app (src/main.js) als headless door
// tools/verify.js gebruikt.
//
// SPIEGELING (CONFIG.spiegelX): de hele wereld kan in één keer over de
// lengteas (de N-Z middenlijn op x = W/2) gespiegeld worden — x → W − x.
// Visueel via een spiegel-parent-Group (scale.x = −1); de fysica
// (colliders/loopvlakken/interactie) wordt centraal mee-gespiegeld. De
// StemmingMakerij spiegelt zichzelf intern (zodat zijn debug-rotatie R
// blijft kloppen) en wordt hier dus niet nogmaals gespiegeld.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { bouwStemmingMakerij } from './stemmingmakerij.js';
import { bouwCasco } from './casco.js';
import { bouwConstructie } from './constructie.js';
import { bouwVerdiepingen } from './verdiepingen.js';
import { bouwTribunes } from './tribunes.js';
import { bouwZuidhal } from './zuidhal.js';
import { bouwVerdieping1 } from './verdieping1.js';

// Welke benoemde groepen er op dit moment gebouwd zijn (verify toetst deze;
// casco/constructie/verdiepingen hebben geen CONFIG-vak en worden alleen op
// hal-omvang getoetst).
export const GEBOUWD = [
  'stemmingMakerij', 'casco', 'constructie', 'verdiepingen',
  'tribuneWest', 'tribuneOost',
  'cafe', 'stellage', 'treintafels', 'expoWanden', 'kroonluchter', 'kraan', 'grootDoek',
  'kennisPlateau', 'tijdLab', 'glazenzaal', 'seats2meet',
];

// InstancedMesh-namen die verify moet aantreffen (groeit per fase).
export const VERPLICHT_INSTANCED = [
  'gevelRaster', 'daklichten', 'kolommenOud', 'kolommenNieuw', 'spantStaven',
  'balustradeStaanders', 'kastBlokken',
  'tribuneTreden', 'tribuneBlokken', 'kussensRood', 'kussensBlauw', 'kussensOranje',
];

export const MIRROR = CONFIG.spiegelX === true;
const HW = CONFIG.hall.width;

// x-spiegel-helpers (W − x). Alleen toepassen op niet-zaal-modules.
function spiegelBox(b) {
  if (!MIRROR) return b;
  const n = { ...b, x0: HW - b.x1, x1: HW - b.x0 };
  if (b.kind === 'hellingX') { n.yBijX0 = b.yBijX1; n.yBijX1 = b.yBijX0; }
  return n;
}
function spiegelInteract(it) {
  return MIRROR ? { ...it, x: HW - it.x } : it;
}

export function bouwWereld(scene) {
  const colliders = [];
  const surfaces = [
    // Begane grond als basis-loopvlak (visuele vloer volgt in fase 1)
    { kind: 'vlak', x0: 0, x1: 60, z0: 0, z1: 90, y: 0 },
  ];
  const interactables = [];
  const updates = [];

  // Spiegel-parent: alle visuele groepen hangen hieronder.
  const wereldGroep = new THREE.Group();
  wereldGroep.name = 'wereld';
  if (MIRROR) { wereldGroep.scale.x = -1; wereldGroep.position.x = HW; }
  scene.add(wereldGroep);

  const zaal = bouwStemmingMakerij();   // spiegelt zichzelf intern
  const delen = [
    bouwCasco(),
    bouwConstructie(),
    bouwVerdiepingen(),
    bouwTribunes(),
    bouwZuidhal(),
    bouwVerdieping1(),
    zaal,
  ];
  for (const d of delen) {
    wereldGroep.add(d.groep);
    const eigenSpiegel = d === zaal;   // zaal heeft zijn fysica al gespiegeld
    if (d.colliders) for (const c of d.colliders) colliders.push(eigenSpiegel ? c : spiegelBox(c));
    if (d.surfaces) for (const s of d.surfaces) surfaces.push(eigenSpiegel ? s : spiegelBox(s));
    if (d.interactables) for (const it of d.interactables) interactables.push(eigenSpiegel ? it : spiegelInteract(it));
    if (d.update) updates.push(d.update);
  }

  return {
    colliders, surfaces, interactables,
    update(dt) { for (const u of updates) u(dt); },
    // ijking StemmingMakerij-referentiekader (debugtoetsen R/M)
    spawn: zaal.spawn,
    zetZaalRotatie: zaal.zetRotatie,
    zaalRotatie: zaal.rotatie,
    zaalBox: zaal.zaalBox,
  };
}
