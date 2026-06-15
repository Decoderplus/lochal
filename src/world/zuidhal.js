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

  // warme tafellamp (emissieve kap op een dun stammetje) — overal op tafels
  function tafelLamp(x, y, z) {
    const stam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 6), M.onderkantZwart));
    stam.position.set(x, y + 0.16, z);
    const kap = add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 12, 1, true), M.daklicht));
    kap.position.set(x, y + 0.4, z);
  }

  // ── Kiosk (StadsCafé), naar de foto: glazen bar-onderbouw met houten
  //    toonbankblad, een ZWEVENDE rood-zwart-oranje mozaïekdoos op zwarte
  //    posten, en daarbovenop het witte "LocHal"-gebouwbord. Compact. ──────
  function bouwCafe() {
    beginSub('cafe');
    const [x0, x1] = O.cafe.x, [z0, z1] = O.cafe.z;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, bw = x1 - x0, bd = z1 - z0;
    const barH = 1.15;
    // ── Werkend mozaïek-bar-blok (hol): getegelde voorkant naar de hal (noord)
    //    + zijwanden; achterkant (zuid) open voor het personeel. Drankjes
    //    worden hierin gemaakt (achterbar met flessen + tap). ──
    const bx0 = x0 + 1, bx1 = x1 - 1, bz0 = z0 + 0.5, bz1 = z1 - 3.5;   // blok-footprint
    const bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2, bbw = bx1 - bx0, bbd = bz1 - bz0;
    for (const [mx, mz, mw, md] of [
      [bcx, bz1, bbw, 0.5],                       // front naar de hal (noord)
      [bx0, bcz, 0.5, bbd], [bx1, bcz, 0.5, bbd], // zijwanden
    ]) {
      const wand = add(box(mw, barH, md, M.mozaiek));
      wand.position.set(mx, barH / 2, mz);
      const top = add(box(mw + 0.12, 0.1, md + 0.12, M.eik));
      top.position.set(mx, barH + 0.05, mz); top.castShadow = true;
    }
    add(box(bbw - 0.6, 0.9, 0.4, M.eik)).position.set(bcx, 0.45, bz0 + 0.3);   // achterbar
    const flesKleur = [M.kussenRood, M.kussenOranje, M.kussenBlauw, M.plantGroen];
    for (let i = 0; i < 10; i++) {
      const fles = add(box(0.09, 0.26 + (i % 3) * 0.05, 0.09, flesKleur[i % 4]));
      fles.position.set(bcx - bbw / 2 + 0.7 + i * (bbw - 1.4) / 9, 1.05, bz0 + 0.3);
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), M.nieuwStaal))
      .position.set(bcx, 1.1, bcz);
    colliders.push({ x0: bx0, x1: bx1, y0: 0, y1: barH, z0: bz0 - 0.3, z1: bz1 + 0.1 });

    // ── Oude 'dakje': zwevende mozaïekdoos op 4 zwarte posten + LocHal-lichtbalk ──
    const postH = O.cafe.kapH, doosBodem = barH + postH, doosH = 1.1;
    for (const px of [bx0 + 0.3, bx1 - 0.3]) for (const pz of [bz0 + 0.3, bz1 - 0.3]) {
      add(box(0.1, postH, 0.1, M.onderkantZwart)).position.set(px, barH + postH / 2, pz);
    }
    const doos = add(box(bbw + 0.5, doosH, bbd + 0.5, M.mozaiek));
    doos.position.set(bcx, doosBodem + doosH / 2, bcz); doos.castShadow = true;
    const bordTex = maakLocHalTex();
    if (bordTex) { bordTex.wrapS = THREE.RepeatWrapping; bordTex.repeat.x = -1; bordTex.offset.x = 1; }
    const bordMat = bordTex
      ? new THREE.MeshBasicMaterial({ map: bordTex, transparent: true, side: THREE.DoubleSide })
      : new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
    const bordW = bbw + 0.6, bordH = bordW * 420 / 1024;
    const bord = add(new THREE.Mesh(new THREE.PlaneGeometry(bordW, bordH), bordMat));
    bord.position.set(bcx, doosBodem + doosH + bordH / 2 - 0.15, bz1 + 0.3);

    // ── Apart barretje aan de voorkant (hal-zijde): los toonbankje + krukken ──
    const fz = z1 - 1.2;
    add(box(bbw, 1.05, 0.5, M.eik)).position.set(bcx, 0.5, fz);
    add(box(bbw + 0.15, 0.08, 0.55, M.eik)).position.set(bcx, 1.07, fz);   // eiken blad
    colliders.push({ x0: bx0, x1: bx1, y0: 0, y1: 1.1, z0: fz - 0.25, z1: fz + 0.25 });
    for (let x = bx0 + 0.6; x <= bx1 - 0.4; x += 1.5) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), M.kussenRood))
        .position.set(x, 0.78, fz + 0.8);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.78, 6), M.nieuwStaal))
        .position.set(x, 0.39, fz + 0.8);
    }
    tafelLamp(bx0 + 1.2, 1.1, fz);
    tafelLamp(bx1 - 1.2, 1.1, fz);
    eindeSub();
  }

  // canvas-textuur: LocHal-lichtbalk (eerste versie — gebouw-silhouet + helder
  // wit-ingevulde tekst; leest als een verlichte lichtbak)
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

  // ── Kroonluchter-wolk: emissive bollampen aan kabels. Naar het midden, meer
  //    bollen, iets donkerder; in het hart hangen ze hóger én dichter opeen,
  //    en ze geven (als lampen) een minimale hoeveelheid warm licht. ─────────
  function bouwKroonluchter() {
    const K = O.kroonluchter;
    // iets donkerder/gedempter kleuren
    const tinten = [0xc76a92, 0x5f87b4, 0xc77a36, 0x6fa055, 0xc7a838, 0xb8ad9a];
    const kabelPlekken = [];
    for (let i = 0; i < K.count; i++) {
      const a = rng() * Math.PI * 2;
      const t = Math.pow(rng(), 1.7);            // bias naar het midden → dichter
      const r = t * K.spreid;
      const x = K.cx + Math.cos(a) * r, z = K.cz + Math.sin(a) * r * 0.8;
      // in het hart (kleine r) hóger; naar buiten lager
      const y = K.yMax - (r / K.spreid) * (K.yMax - K.yMin) + (rng() - 0.5) * 0.8;
      const rad = 0.12 + rng() * 0.08;
      bolPlekken.push({ p: [x, y, z], s: rad, c: tinten[Math.floor(rng() * tinten.length)] });
      kabelPlekken.push([x, y, z, rad]);
    }
    // de bollen ZIJN lampen → een paar zwakke warme puntlichten (geen schaduw)
    for (const [lx, ly, lz] of [[K.cx, K.yMax - 0.5, K.cz],
                                 [K.cx - 2.5, K.yMax - 2, K.cz + 2],
                                 [K.cx + 2.5, K.yMax - 2, K.cz - 2]]) {
      const lamp = new THREE.PointLight(0xffdca8, 2.2, 16, 2.0);
      lamp.position.set(lx, ly, lz);
      add(lamp);
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
    // twee XXL-leestafels op ECHTE treinbogies (wielen, assen, bladveren)
    const vakken = [[5, 13], [15, 23]];
    const railZ = [tz - d / 2 + 0.25, tz + d / 2 - 0.25];
    for (const [vx0, vx1] of vakken) {
      const len = vx1 - vx0, tx = (vx0 + vx1) / 2;
      // doorlopende rails in de betonvloer
      for (const rz of railZ) {
        const rail = add(box(len + 1.6, 0.04, 0.12, M.nieuwStaal));
        rail.position.set(tx, 0.02, rz);
      }
      // dik eiken tafelblad op bar-hoogte
      const blad = add(box(len, 0.14, d, M.eik));
      blad.position.set(tx, h, tz); blad.castShadow = true;
      // twee bogies onder het blad: frame + assen + wielen + bladveer-suggestie
      for (const bx of [vx0 + 1.6, vx1 - 1.6]) {
        const frame = add(box(2.0, 0.32, d - 0.2, M.onderkantZwart));
        frame.position.set(bx, h - 0.45, tz);
        for (const ax of [bx - 0.65, bx + 0.65]) {
          const as = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d - 0.1, 8), M.oudStaal));
          as.rotation.x = Math.PI / 2; as.position.set(ax, 0.42, tz);
          for (const rz of railZ) {
            const wiel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16), M.oudStaal));
            wiel.rotation.x = Math.PI / 2; wiel.position.set(ax, 0.42, rz);
            wiel.castShadow = true;
            add(box(0.12, 0.3, 0.18, M.nieuwStaal)).position.set(ax, 0.75, rz);
          }
        }
      }
      colliders.push({ x0: vx0 - 0.3, x1: vx1 + 0.3, y0: 0, y1: h, z0: tz - d / 2, z1: tz + d / 2 });
      // rode barkrukken langs beide lange zijden
      for (let x = vx0 + 1; x <= vx1 - 0.5; x += 1.7) for (const sz of [tz - d / 2 - 0.55, tz + d / 2 + 0.55]) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), M.kussenRood))
          .position.set(x, 0.82, sz);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.82, 6), M.nieuwStaal))
          .position.set(x, 0.41, sz);
      }
      // warme tafellampjes op het blad
      tafelLamp(tx - len / 4, h + 0.07, tz);
      tafelLamp(tx + len / 4, h + 0.07, tz);
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

  // ── Boekendisplay-tafels: lage tafels vol kleurrijke boeken (de "magazine
  //    tables" op de foto), verrijdbaar ogend op het plaza. ─────────────────
  function bouwBoekentafels() {
    beginSub('boekentafels');
    for (const [tx, tz, tw] of [[37, 9, 2.2], [41, 19, 1.8], [21, 20, 2.0]]) {
      const td = 1.1, h = 0.42;
      const blad = add(box(tw, 0.08, td, M.eik));
      blad.position.set(tx, h, tz); blad.castShadow = true;
      for (const dx of [-tw / 2 + 0.2, tw / 2 - 0.2]) for (const dz of [-td / 2 + 0.2, td / 2 - 0.2]) {
        const poot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), M.nieuwStaal));
        poot.position.set(tx + dx, h / 2, tz + dz);
      }
      // stapels boeken bovenop (boekenstapel-textuur = kleurrijke ruggen)
      for (const [bx, bz, bw, bh] of [[tx - tw / 4, tz, tw / 2.6, 0.22], [tx + tw / 4, tz - 0.1, tw / 3, 0.16]]) {
        const stapel = add(box(bw, bh, td * 0.7, M.boekenstapel));
        stapel.position.set(bx, h + 0.04 + bh / 2, bz); stapel.castShadow = true;
      }
      colliders.push({ x0: tx - tw / 2, x1: tx + tw / 2, y0: 0, y1: h, z0: tz - td / 2, z1: tz + td / 2 });
    }
    eindeSub();
  }

  bouwCafe();
  bouwBoekentafels();
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
