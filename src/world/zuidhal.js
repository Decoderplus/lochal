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

  // ── Kiosk (StadsCafé), naar de foto: glazen bar-onderbouw met houten
  //    toonbankblad, een ZWEVENDE rood-zwart-oranje mozaïekdoos op zwarte
  //    posten, en daarbovenop het witte "LocHal"-gebouwbord. Compact. ──────
  function bouwCafe() {
    beginSub('cafe');
    const [x0, x1] = O.cafe.x, [z0, z1] = O.cafe.z;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, bw = x1 - x0, bd = z1 - z0;
    const barH = 1.15;
    // glazen wanden van de bar-onderbouw + donkere hoekstijlen
    for (const [gx, gz, gw, gd] of [
      [cx, z0, bw, 0.04], [cx, z1, bw, 0.04], [x0, cz, 0.04, bd], [x1, cz, 0.04, bd],
    ]) { const g = add(box(gw, barH, gd, M.glas)); g.position.set(gx, barH / 2, gz); }
    for (const px of [x0, x1]) for (const pz of [z0, z1]) {
      const p = add(box(0.1, barH + 0.2, 0.1, M.onderkantZwart));
      p.position.set(px, (barH + 0.2) / 2, pz);
    }
    // houten toonbankblad (steekt over)
    const blad = add(box(bw + 0.7, 0.16, bd + 0.7, M.eik));
    blad.position.set(cx, barH + 0.08, cz); blad.castShadow = true;
    colliders.push({ x0: x0 - 0.4, x1: x1 + 0.4, y0: 0, y1: barH + 0.16, z0: z0 - 0.4, z1: z1 + 0.4 });
    // zwevende mozaïekdoos op 4 zwarte posten boven de bar
    const postH = O.cafe.kapH, doosBodem = barH + postH, doosH = 1.5;
    for (const px of [x0 + 0.4, x1 - 0.4]) for (const pz of [z0 + 0.4, z1 - 0.4]) {
      const post = add(box(0.1, postH, 0.1, M.onderkantZwart));
      post.position.set(px, barH + postH / 2, pz);
    }
    const doos = add(box(bw + 0.5, doosH, bd + 0.5, M.mozaiek));
    doos.position.set(cx, doosBodem + doosH / 2, cz); doos.castShadow = true;
    // "LocHal"-bord bovenop: leesbare witte tekst in een gebouw-silhouet,
    // naar de hal gericht (de wereldspiegel zet de tekst recht).
    const bordTex = maakLocHalTex();
    if (bordTex) {   // horizontaal spiegelen zodat de tekst in de gespiegelde wereld goed leest
      bordTex.wrapS = THREE.RepeatWrapping; bordTex.repeat.x = -1; bordTex.offset.x = 1;
    }
    const bordMat = bordTex
      ? new THREE.MeshBasicMaterial({ map: bordTex, transparent: true, side: THREE.DoubleSide })
      : new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
    const bordW = bw + 1.2, bordH = bordW * 420 / 1024;
    for (const [bz, ry] of [[z0 - 0.06, Math.PI], [z1 + 0.06, 0]]) {
      const bord = add(new THREE.Mesh(new THREE.PlaneGeometry(bordW, bordH), bordMat));
      bord.position.set(cx, doosBodem + doosH + bordH / 2 - 0.15, bz);
      bord.rotation.y = ry;
    }
    eindeSub();
  }

  // canvas-textuur: LocHal-logo (gebouw-silhouet + leesbare tekst)
  function maakLocHalTex() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 1024; c.height = 420;
    const x = c.getContext('2d');
    x.strokeStyle = '#f4f1ea'; x.lineWidth = 16; x.lineJoin = 'round';
    x.beginPath();                                   // hal-silhouet (getrapt geveltopje)
    x.moveTo(34, 388); x.lineTo(34, 150); x.lineTo(600, 150);
    x.lineTo(600, 78); x.lineTo(812, 28); x.lineTo(990, 78);
    x.lineTo(990, 388); x.closePath(); x.stroke();
    x.fillStyle = '#f4f1ea';
    x.font = 'italic 700 210px Georgia, "Times New Roman", serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('LocHal', 512, 280);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  // ── Kraanbaanstellage: oud-staal torens, 2 liggerniveaus, planten, boom ──
  function bouwStellage() {
    beginSub('stellage');
    const [x0, x1] = O.stellage.x, [z0, z1] = O.stellage.z;
    const [lo, hi] = O.stellage.liggerY;
    const torenX = [x0 + 1, x1 - 1];
    // ÉÉN slanke kolom per plek (was een dikke cluster van 4 stijlen): de
    // grote en kleine pilaren zijn nu één smalle constructie.
    for (const tx of torenX) {
      for (let z = z0 + 1; z <= z1 - 1; z += 5) {
        const kol = add(box(0.2, hi + 0.6, 0.2, M.oudStaal));
        kol.position.set(tx, (hi + 0.6) / 2, z);
        kol.castShadow = true;
        colliders.push({ x0: tx - 0.18, x1: tx + 0.18, y0: 0, y1: hi, z0: z - 0.18, z1: z + 0.18 });
      }
      // liggers op twee niveaus (constructie)
      for (const ly of [lo, hi]) {
        const lig = add(box(0.18, 0.3, z1 - z0, M.oudStaal));
        lig.position.set(tx, ly, (z0 + z1) / 2);
        lig.castShadow = true;
      }
      // rode buisleuning + ÉÉN laag plantenbakken op de bovenste ligger,
      // iets hoger geplaatst met grotere groene kronen
      const buis = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, z1 - z0, 8), M.leidingRood));
      buis.rotation.x = Math.PI / 2;
      buis.position.set(tx, hi + 0.95, (z0 + z1) / 2);
      for (let z = z0 + 2; z <= z1 - 2; z += 4) {
        bakPlekken.push([tx, hi + 0.55, z]);
        plantPlekken.push([tx, hi + 1.25, z, 1.2 + rng() * 0.6]);
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

  // ── Lange leestafels op rails — NAAST de kiosk (west- en oostvak), met
  //    boekenopslag eronder en rode stoelen. Kiosk + tafels vullen samen
  //    bijna de hele breedte van de hal (de zuid-band). ─────────────────────
  function bouwTreintafels() {
    beginSub('treintafels');
    const [, d, h] = O.treintafels.maat;
    const [z0, z1] = O.treintafels.z;
    const tz = (z0 + z1) / 2;
    // de kiosk staat aan de oostkant → de leestafels komen TEGENOVER, aan de
    // westkant (ten westen van de centrale stellage). Lange tafels op rails.
    const vakken = [[5, 23]];
    for (const [vx0, vx1] of vakken) {
      const len = vx1 - vx0, tx = (vx0 + vx1) / 2;
      // donkere rails (oost-west strips in de vloer)
      for (const rz of [tz - d / 2 + 0.2, tz + d / 2 - 0.2]) {
        const rail = add(box(len, 0.03, 0.1, M.onderkantZwart));
        rail.position.set(tx, 0.015, rz);
      }
      // tafelblad + zware treinonderstel-poten
      const blad = add(box(len, 0.1, d, M.eik));
      blad.position.set(tx, h, tz); blad.castShadow = true;
      for (let x = vx0 + 1; x <= vx1 - 1; x += 3.5) {
        const poot = add(box(0.45, h, 0.45, M.onderkantZwart));
        poot.position.set(x, h / 2, tz);
      }
      colliders.push({ x0: vx0, x1: vx1, y0: 0, y1: h, z0: tz - d / 2, z1: tz + d / 2 });
      // boekenopslag onder de tafel (boekenstapel-plint)
      const boeken = add(box(len - 1, 0.55, d - 0.4, M.boekenstapel));
      boeken.position.set(tx, 0.28, tz);
      // rode stoelen langs beide lange zijden
      for (let x = vx0 + 1.2; x <= vx1 - 1; x += 1.9) for (const sz of [tz - d / 2 - 0.45, tz + d / 2 + 0.45]) {
        const stoel = add(box(0.42, 0.5, 0.42, M.kussenRood));
        stoel.position.set(x, 0.45, sz);
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
      // vloer-1-plaza (y5) — voorgrond zoals de foto
      [16, 5, 41, 1.6], [21, 5, 43, 1.2], [36, 5, 41.5, 1.4], [41, 5, 43, 1.0],
      // begane grond, open vloer tussen tafels en trap
      [30, 0, 18, 1.6], [24, 0, 20, 1.2],
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
    // Grote witte voile-gordijnen langs de ZUIDGEVEL, vol hoog (vloer→dak),
    // weerszijden van de kiosk — zoals op de foto.
    plooiDoek('doekZuidwest', M.voile, 12, 1.6, 14, 14, false);
    plooiDoek('doekZuidoost', M.voile, 49, 1.6, 14, 14, false);
    // kunstdoek met patroon langs de westgevel (decor), x<30, z<30
    plooiDoek('grootDoek', M.doek, 1.8, 16, O.grootDoek.breedte * 0.5, O.grootDoek.hoogte, true);
  }

  // ── Kooklab: kook-eiland met donker werkblad + houten randen en een
  //    mozaïek-afzuigkap, ten oosten van de kiosk (plattegrond). ────────────
  function bouwKooklab() {
    beginSub('kooklab');
    const x0 = 49, x1 = 58, z0 = 5, z1 = 11, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // L-vormig werkblad langs de oost- en zuidkant
    const b1 = add(box(x1 - x0, 0.92, 1.0, M.onderkantZwart)); b1.position.set(cx, 0.46, z0 + 0.5);
    const b2 = add(box(1.0, 0.92, z1 - z0, M.onderkantZwart)); b2.position.set(x1 - 0.5, 0.46, cz);
    add(box(x1 - x0 + 0.1, 0.08, 1.1, M.eik)).position.set(cx, 0.96, z0 + 0.5);
    add(box(1.1, 0.08, z1 - z0 + 0.1, M.eik)).position.set(x1 - 0.5, 0.96, cz);
    colliders.push({ x0, x1, y0: 0, y1: 1, z0, z1: z0 + 1 });
    colliders.push({ x0: x1 - 1, x1, y0: 0, y1: 1, z0, z1 });
    // kook-eiland in het midden + krukken
    const eiland = add(box(2.6, 0.92, 1.1, M.eik)); eiland.position.set(cx - 1.4, 0.46, cz);
    for (let s = 0; s < 3; s++) {
      const kruk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8), M.kussenRood));
      kruk.position.set(cx - 2.4 + s * 1.0, 0.25, cz + 1.0);
    }
    // mozaïek-afzuigkap op zwarte posten boven het eiland
    const kap = add(box(3.0, 0.8, 1.6, M.mozaiek)); kap.position.set(cx - 1.4, 2.9, cz);
    for (const px of [cx - 2.6, cx - 0.2]) for (const pz of [cz - 0.7, cz + 0.7]) {
      add(box(0.08, 2.4, 0.08, M.onderkantZwart)).position.set(px, 1.4, pz);
    }
    eindeSub();
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
