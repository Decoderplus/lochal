// Het deel ten noorden van de StemmingMakerij (Glazenzaal/Seats2meet/diep
// noorden) is decor en niet bedoeld om te betreden. We sluiten het af met een
// donker, volle-hoogte textielgordijn net achter de zaal (z≈54) over de hele
// breedte — het onttrekt het noorden aan het zicht — plus een collider die de
// speler tegenhoudt. De fog (main.js) verzacht wat er toch doorheen schemert.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen } from '../materials.js';

export function bouwNoordafsluiting() {
  const M = maakMaterialen();
  const groep = new THREE.Group();
  groep.name = 'noordafsluiting';
  const zMuur = 54.4;                       // net noordelijk van de zaal (z42–54)

  // Donker plooigordijn over de open westhelft (x0–48); de zaal (x48–60) sluit
  // de oosthelft zelf af. In de gespiegelde wereld dekt dit x12–60.
  const x0 = 0, x1 = 48, yLo = 0.2, yHi = 13;
  const len = x1 - x0, geo = new THREE.PlaneGeometry(len, yHi - yLo, 60, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, Math.sin((p.getX(i) / len) * Math.PI * 18) * 0.4);   // verticale plooi
  }
  geo.computeVertexNormals();
  const gordijn = new THREE.Mesh(geo, M.onderkantZwart);
  gordijn.position.set((x0 + x1) / 2, (yLo + yHi) / 2, zMuur);
  gordijn.rotation.y = Math.PI;             // voorzijde naar de speler (zuid)
  groep.add(gordijn);

  // Collider over de VOLLE breedte (ook achter de zaal), van vloer tot dak.
  const colliders = [{ x0: 0, x1: 60, y0: 0, y1: 15, z0: zMuur - 0.25, z1: zMuur + 0.25 }];
  return { groep, colliders, surfaces: [], interactables: [] };
}
