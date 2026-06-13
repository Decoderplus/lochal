// Fase 3/4 — zuidhal-inrichting & iconische LocHal-elementen, gebaseerd op de
// foto vanuit de StemmingMakerij + de plattegrond:
//  • boekenstapel-bankjes op de vloer-1-plaza (lage banken van opgestapelde
//    boeken met rood/oranje kussens)
//  • plantenbakken met groen op de geklonken liggers langs de vide-randen
//  • kraanbaanstellage (oud-staal torens) met plantenbakken + boom + rode buis
//  • kroonluchter-wolk (±60 pastel emissive bollen aan kabels)
//  • StadsCafé: barvolume + rood-zwart mozaïekkap + "LocHal"-letterframe
//  • XXL-treintafels op rails met rode stoelen
//  • expositiewanden, staande lampen
//  • gele kraanbrug met theaterspots
//  • grote doeken: kunstdoek (zuidwest) + zwart hangdoek in de vide
// Alles in plattegrond-coördinaten; de wereld-spiegeling werkt automatisch.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { maakMaterialen, maakRng } from '../materials.js';

export function bouwZuidhal() {
  const M = maakMaterialen();
  const O = CONFIG.objects;
  const F = CONFIG.floors;
  const groep = new THREE.Group();
  groep.name = 'zuidhal';
  const dummy = new THREE.Object3D();
  const colliders = [];
  const rng = maakRng(2018);

  let doel = groep;                       // huidige (sub)groep waar add() in plaatst
  const add = (mesh) => { doel.add(mesh); return mesh; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const beginSub = (naam) => { const s = new THREE.Group(); s.name = naam; groep.add(s); doel = s; };
  const eindeSub = () => { doel = groep; };

  // verzamelaars voor instanced families
  const bolPlekken = [];      // kroonluchter + staande-lamp-bollen
  const bakPlekken = [];      // plantenbakken (eik)
  const plantPlekken = [];    // groene plant-blobs

  // ── StadsCafé: barvolume + mozaïekkap + LocHal-letterframe ─────────────
  function bouwCafe() {
    beginSub('cafe');
    const [x0, x1] = O.cafe.x, [z0, z1] = O.cafe.z;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, bw = x1 - x0, bd = z1 - z0;
    // U-vormige bar (drie balken rond een werkkern)
    const barH = 1.1;
    for (const [bx, bz, w, d] of [
      [cx, z0 + 0.4, bw - 1.6, 0.8], [x0 + 0.4, cz, 0.8, bd - 0.4], [x1 - 0.4, cz, 0.8, bd - 0.4],
    ]) {
      const bar = add(box(w, barH, d, M.eik));
      bar.position.set(bx, barH / 2, bz);
      bar.castShadow = true;
    }
    colliders.push({ x0, x1, y0: 0, y1: barH, z0, z1 });
    // kapposten + mozaïekkap (gabled) erboven
    const kapY = O.cafe.kapH, kapTop = kapY + 1.6;
    for (const px of [x0 + 0.3, x1 - 0.3]) for (const pz of [z0 + 0.3, z1 - 0.3]) {
      const post = add(box(0.18, kapY, 0.18, M.nieuwStaal));
      post.position.set(px, kapY / 2, pz);
    }
    // twee hellende mozaïekvlakken (nok N-Z over het midden)
    const helHoek = Math.atan2(kapTop - kapY, bw / 2);
    const helLen = Math.hypot(bw / 2, kapTop - kapY);
    for (const kant of [-1, 1]) {
      const vlak = add(box(helLen, 0.12, bd + 0.6, M.mozaiek));
      vlak.position.set(cx + kant * bw / 4, (kapY + kapTop) / 2, cz);
      vlak.rotation.z = -kant * helHoek;
      vlak.castShadow = true;
    }
    // geveltop-driehoekjes (dicht) + nokbalk
    const nok = add(box(0.12, 0.12, bd + 0.6, M.onderkantZwart));
    nok.position.set(cx, kapTop, cz);
    // "LocHal"-letterframe: gebouwvormige witte omlijsting op de nok, naar zuid
    const frame = new THREE.Group();
    const fw = 4.2, fh = 1.6;
    for (const [lx, ly, lw, lh] of [
      [0, 0, fw, 0.12], [0, fh, fw, 0.12], [-fw / 2, fh / 2, 0.12, fh], [fw / 2, fh / 2, 0.12, fh],
      [0, fh + 0.45, 0.12, 0.9], [-1, fh + 0.7, 2.2, 0.12], [1, fh + 0.7, 2.2, 0.12], // geveltopje
    ]) {
      const bar = box(lw, lh, 0.1, M.tred);
      bar.position.set(lx, ly, 0);
      frame.add(bar);
    }
    frame.position.set(cx, kapTop + 0.3, z0 - 0.2);
    add(frame);
    // bartafels met rode krukken + plantjes ervoor
    for (let t = 0; t < 2; t++) {
      const tx = x0 + 2 + t * (bw - 4);
      const tafel = add(box(0.9, 0.05, bd - 2, M.eik));
      tafel.position.set(tx, 1.05, cz);
      for (const pz of [z0 + 1.2, cz, z1 - 1.2]) {
        const poot = add(box(0.06, 1.0, 0.06, M.nieuwStaal));
        poot.position.set(tx, 0.5, pz);
        bolPlekken.length; // (noop) houd structuur
      }
      for (let s = 0; s < 3; s++) {
        const kruk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10), M.kussenRood));
        kruk.position.set(tx + (t === 0 ? 0.7 : -0.7), 0.25, z0 + 1.5 + s * (bd - 3) / 2);
      }
      bakPlekken.push([tx, 1.18, z0 + 0.6]); plantPlekken.push([tx, 1.45, z0 + 0.6, 0.5]);
    }
    eindeSub();
  }

  // ── Kraanbaanstellage: oud-staal torens, 2 liggerniveaus, planten, boom ──
  function bouwStellage() {
    beginSub('stellage');
    const [x0, x1] = O.stellage.x, [z0, z1] = O.stellage.z;
    const [lo, hi] = O.stellage.liggerY;
    const torenX = [x0 + 1, x1 - 1];
    // verticale vakwerktorens om de ~5 m
    for (const tx of torenX) {
      for (let z = z0 + 1; z <= z1 - 1; z += 5) {
        for (const dx of [-0.5, 0.5]) for (const dz of [-0.4, 0.4]) {
          const stijl = add(box(0.12, hi + 0.6, 0.12, M.oudStaal));
          stijl.position.set(tx + dx, (hi + 0.6) / 2, z + dz);
        }
        colliders.push({ x0: tx - 0.6, x1: tx + 0.6, y0: 0, y1: hi, z0: z - 0.5, z1: z + 0.5 });
      }
      // liggers op twee niveaus
      for (const ly of [lo, hi]) {
        const lig = add(box(0.18, 0.3, z1 - z0, M.oudStaal));
        lig.position.set(tx, ly, (z0 + z1) / 2);
        lig.castShadow = true;
        // rode buisleuning langs de bovenste laag
        if (ly === hi) {
          const buis = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, z1 - z0, 8), M.leidingRood));
          buis.rotation.x = Math.PI / 2;
          buis.position.set(tx, ly + 0.9, (z0 + z1) / 2);
        }
        // plantenbakken op de liggers
        for (let z = z0 + 2; z <= z1 - 2; z += 4.5) {
          bakPlekken.push([tx, ly + 0.35, z]);
          plantPlekken.push([tx, ly + 0.75, z, 0.6 + rng() * 0.4]);
        }
      }
    }
    // dwarsliggers tussen de torens
    for (let z = z0 + 2; z <= z1 - 1; z += 6) {
      for (const ly of [lo, hi]) {
        const dl = add(box(x1 - x0, 0.16, 0.16, M.oudStaal));
        dl.position.set((x0 + x1) / 2, ly, z);
      }
    }
    // boom bovenop (stam + bladkroon)
    const stam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 8), M.eik));
    stam.position.set((x0 + x1) / 2, hi + 1.2, z0 + 6);
    for (let b = 0; b < 5; b++) {
      plantPlekken.push([(x0 + x1) / 2 + (rng() - 0.5) * 2, hi + 2.4 + rng() * 1.2, z0 + 6 + (rng() - 0.5) * 2, 1.1 + rng() * 0.5]);
    }
    eindeSub();
  }

  // ── Kroonluchter-wolk: pastel emissive bollen aan kabels ────────────────
  function bouwKroonluchter() {
    const K = O.kroonluchter;
    const pastel = [0xf2a0c0, 0x8fb8e0, 0xf0a860, 0x9fd08a, 0xf0d878, 0xe8e0d0];
    const kabelPlekken = [];
    for (let i = 0; i < K.count; i++) {
      const a = rng() * Math.PI * 2, r = rng() * K.spreid;
      const x = K.cx + Math.cos(a) * r, z = K.cz + Math.sin(a) * r * 0.8;
      const y = K.yMin + rng() * (K.yMax - K.yMin);
      const rad = 0.12 + rng() * 0.08;
      bolPlekken.push({ p: [x, y, z], s: rad, c: pastel[Math.floor(rng() * pastel.length)] });
      kabelPlekken.push([x, y, z, rad]);
    }
    // kabels als dunne instanced cilinders van de constructie (y≈11) omlaag
    const kabels = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.006, 0.006, 1, 5), M.onderkantZwart, kabelPlekken.length);
    kabelPlekken.forEach(([x, y, z, rad], i) => {
      const len = 11 - (y + rad);
      dummy.position.set(x, (y + rad) + len / 2, z);
      dummy.scale.set(1, Math.max(len, 0.1), 1);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      kabels.setMatrixAt(i, dummy.matrix);
    });
    add(kabels);
  }

  // ── XXL-treintafels op rails + rode stoelen ─────────────────────────────
  function bouwTreintafels() {
    beginSub('treintafels');
    const [w, d, h] = O.treintafels.maat;
    const [z0, z1] = O.treintafels.z;
    for (let t = 0; t < O.treintafels.count; t++) {
      const tz = z0 + (t + 0.5) * (z1 - z0) / O.treintafels.count;
      const tx = 34 + (t % 2) * 8;     // oost-centraal, tussen stellage en café
      // donkere rails (oost-west strips in de vloer)
      for (const rz of [tz - d / 2 + 0.2, tz + d / 2 - 0.2]) {
        const rail = add(box(w + 2, 0.03, 0.12, M.onderkantZwart));
        rail.position.set(tx, 0.015, rz);
      }
      // tafelblad + zware poten (treinonderstel-look)
      const blad = add(box(w, 0.12, d, M.eik));
      blad.position.set(tx, h, tz);
      blad.castShadow = true;
      for (const px of [tx - w / 2 + 0.6, tx, tx + w / 2 - 0.6]) {
        const poot = add(box(0.5, h, 0.5, M.onderkantZwart));
        poot.position.set(px, h / 2, tz);
      }
      colliders.push({ x0: tx - w / 2, x1: tx + w / 2, y0: 0, y1: h, z0: tz - d / 2, z1: tz + d / 2 });
      // rode stoelen rondom
      for (let s = 0; s < 6; s++) {
        const sx = tx - w / 2 + 0.8 + s * (w - 1.6) / 5;
        for (const sz of [tz - d / 2 - 0.5, tz + d / 2 + 0.5]) {
          const stoel = add(box(0.45, 0.5, 0.45, M.kussenRood));
          stoel.position.set(sx, 0.45, sz);
        }
      }
    }
    eindeSub();
  }

  // ── Expositiewanden: witte vrijstaande wanden, zuidwest ─────────────────
  function bouwExpowanden() {
    beginSub('expoWanden');
    const [x0, x1] = O.expoWanden.x, [z0, z1] = O.expoWanden.z;
    const [w, h] = O.expoWanden.maat;
    for (let i = 0; i < O.expoWanden.count; i++) {
      const wx = x0 + 1 + rng() * (x1 - x0 - 2);
      const wz = z0 + 1 + rng() * (z1 - z0 - 2);
      const hoek = rng() < 0.5 ? 0 : Math.PI / 2;
      const wand = add(box(w, h, 0.18, M.tred));
      wand.position.set(wx, h / 2, wz);
      wand.rotation.y = hoek;
      wand.castShadow = true;
      const dx = hoek === 0 ? w / 2 : 0.1, dz = hoek === 0 ? 0.1 : w / 2;
      colliders.push({ x0: wx - dx, x1: wx + dx, y0: 0, y1: h, z0: wz - dz, z1: wz + dz });
    }
    eindeSub();
  }

  // ── Staande lampen met witte kap (emissief) ─────────────────────────────
  function bouwStaandeLampen() {
    for (const [lx, lz] of [[20, 10], [44, 20], [12, 24], [50, 8]]) {
      const paal = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), M.nieuwStaal));
      paal.position.set(lx, 0.8, lz);
      const kap = add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.4, 12, 1, true), M.daklicht));
      kap.position.set(lx, 1.7, lz);
    }
  }

  // ── Boekenstapel-bankjes op de vloer-1-plaza (+ enkele op BG) ───────────
  function bouwBoekenbankjes() {
    const banken = [
      // plaza (y5) — voorgrond foto
      [16, 5, 38, 1.6], [22, 5, 40, 1.2], [38, 5, 38.5, 1.4], [42, 5, 40.5, 1.0],
      // begane grond bij de leeszone
      [40, 0, 12, 1.6], [46, 0, 18, 1.2],
    ];
    for (const [bx, by, bz, bl] of banken) {
      const plint = add(box(bl, 0.42, 0.7, M.boekenstapel));
      plint.position.set(bx, by + 0.21, bz);
      plint.castShadow = true;
      const blad = add(box(bl - 0.1, 0.06, 0.66, M.eik));
      blad.position.set(bx, by + 0.45, bz);
      const kussen = add(box(bl - 0.3, 0.1, 0.5, rng() < 0.5 ? M.kussenRood : M.kussenOranje));
      kussen.position.set(bx, by + 0.53, bz);
    }
  }

  // ── Gele kraanbrug met theaterspots ─────────────────────────────────────
  function bouwKraan() {
    const K = O.kraan, [sx0, sx1] = K.spanX, len = sx1 - sx0, cx = (sx0 + sx1) / 2;
    const brug = new THREE.Group(); brug.name = 'kraan';
    const koker = box(len, 1.2, 0.7, M.kraanGeel);
    koker.position.set(cx, K.y, K.parkZ);
    koker.castShadow = true; brug.add(koker);
    // X-kruisverbanden langs de koker
    for (let x = sx0 + 2; x < sx1; x += 3) {
      for (const s of [1, -1]) {
        const kr = box(3.4, 0.12, 0.08, M.kraanGeel);
        kr.position.set(x, K.y, K.parkZ + 0.4);
        kr.rotation.z = s * 0.6; brug.add(kr);
      }
    }
    // 9 theaterspots eraan (zwarte cilinder + emissive lens), gericht omlaag
    for (let i = 0; i < K.spots; i++) {
      const sx = sx0 + 2 + i * (len - 4) / (K.spots - 1);
      const beugel = box(0.06, 0.5, 0.06, M.onderkantZwart);
      beugel.position.set(sx, K.y - 0.6, K.parkZ); brug.add(beugel);
      const huis = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 10), M.onderkantZwart);
      huis.position.set(sx, K.y - 0.95, K.parkZ); huis.rotation.x = 0.3; brug.add(huis);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.daklicht);
      lens.position.set(sx, K.y - 1.12, K.parkZ + 0.05); brug.add(lens);
    }
    groep.add(brug);
  }

  // ── Grote doeken: kunstdoek (zuidwest) + zwart hangdoek in de vide ──────
  function plooiDoek(naam, mat, bx, bz, breedte, hoogte, langsZ) {
    const seg = 24, geo = new THREE.PlaneGeometry(breedte, hoogte, seg, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      pos.setZ(i, Math.sin(u * 1.6) * 0.35);   // verticale plooi
    }
    geo.computeVertexNormals();
    const doek = new THREE.Mesh(geo, mat);
    doek.name = naam;
    if (langsZ) doek.rotation.y = Math.PI / 2;
    doek.position.set(bx, hoogte / 2, bz);
    add(doek);
  }
  function bouwDoeken() {
    // kunstdoek vóór de zuidwest-glasgevel (langs de westgevel), x<30
    plooiDoek('grootDoek', M.doek, 2.6, 11, O.grootDoek.breedte * 0.5, O.grootDoek.hoogte, true);
    // zwart megagordijn dat in de vide hangt (oostkant, x>30, z<30)
    plooiDoek('zwartDoek', M.onderkantZwart, 41, 24, 8, 12, true);
    // grijswitte voile bij het café
    plooiDoek('voileDoek', M.voile, 44, 8, 10, 9, false);
  }

  bouwCafe();
  bouwStellage();
  bouwKroonluchter();
  bouwTreintafels();
  bouwExpowanden();
  bouwStaandeLampen();
  bouwBoekenbankjes();
  bouwKraan();
  bouwDoeken();

  // ── Instanced families afronden ─────────────────────────────────────────
  // emissive bollen (kroonluchter + spots + lamp-bollen) met kleur per stuk
  const bollen = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 8), M.bollamp, bolPlekken.length);
  bollen.name = 'kroonluchter';
  const kl = new THREE.Color();
  bolPlekken.forEach((b, i) => {
    dummy.position.set(...b.p); dummy.scale.setScalar(b.s);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    bollen.setMatrixAt(i, dummy.matrix);
    bollen.setColorAt(i, kl.setHex(b.c));
  });
  add(bollen);

  // plantenbakken (eik) + groene plant-blobs (low-poly bollen)
  const bakken = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), M.eik, bakPlekken.length);
  bakken.name = 'plantenbakken';
  bakPlekken.forEach((p, i) => {
    dummy.position.set(...p); dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    bakken.setMatrixAt(i, dummy.matrix);
  });
  add(bakken);
  const planten = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.plantGroen, plantPlekken.length);
  planten.name = 'planten';
  plantPlekken.forEach(([x, y, z, s], i) => {
    dummy.position.set(x, y, z); dummy.scale.set(s, s * 0.8, s);
    dummy.rotation.set(rng(), rng(), rng()); dummy.updateMatrix();
    planten.setMatrixAt(i, dummy.matrix);
  });
  add(planten);

  return { groep, colliders, surfaces: [], interactables: [] };
}
