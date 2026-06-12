// ─────────────────────────────────────────────────────────────────────────────
// StemmingMakerij — BESTAANDE zaal, ONGEWIJZIGD overgenomen uit ../kamer.html.
//
// Integratieregels (werkplan fase 0):
//  • De volledige opbouwcode van de zaal is hieronder LETTERLIJK overgenomen
//    (zelfde geometrie, maten, kleuren, materialen, procedurele texturen).
//    `const scene = groep;` zorgt dat de originele regels (scene.add) intact
//    konden blijven. kamer.html zelf is niet aangeraakt.
//  • Alle positionering loopt uitsluitend via de wrapper-Group
//    (stemmingMakerijGroup): positie (53.9, 5, 39), rotatie +90°, schaal 1
//    (de zaal was al in meters). Ramen kijken zuid de vide in, deur west.
//  • ENIGE ingreep (op verzoek van de mens, na MENSTEST-feedback): een glazen
//    deur van 1 × 2,1 m in de zuidelijke raamwand, westelijke raamvak — dit is
//    de enige deur van de zaal. De eerdere westdeur is teruggedraaid; de
//    achterwand, wandbank en kussensrij zijn weer exact origineel.
//    Zie DECISIONS.md.
//  • App-systemen van kamer.html (menu, video-afspeellijst, audio-cues,
//    lichtstanden, post-processing, besturing, foto-backdrop) zijn app-niveau
//    en geen zaal-vormgeving; die draaien alleen in de zelfstandige
//    StemmingMakerij. Het tv-scherm toont hier de originele promptkaart.
//  • PointLights van de zaal blijven branden; alleen castShadow staat uit
//    (CONFIG.renderer.maxShadowLights = 1, die zit op de zon).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const HEADLESS = typeof document === 'undefined';

export function bouwStemmingMakerij() {
  const groep = new THREE.Group();
  groep.name = 'stemmingMakerij';
  const scene = groep; // alias: originele code gebruikt scene.add(...)

  // ── Afmetingen kamer: 12 m lang (Z), 6 m breed (X), 3.5 m hoog (Y) ────
  const L = 12, B = 6, H = 3.5;

  // ── Procedurele textuur: visgraat-parket (licht hout) ──────────────────
  function maakVisgraatTextuur() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');

    // Achtergrond (voegkleur)
    ctx.fillStyle = '#b89b6e';
    ctx.fillRect(0, 0, 512, 512);

    // Lichte houttinten, willekeurig per plank
    const tinten = ['#d8b483', '#e0bd8c', '#cfa874', '#dcb789', '#d3ad7a'];
    const plankL = 96;   // lengte plank
    const plankB = 32;   // breedte plank
    let teller = 0;

    for (let y = -plankL; y < 512 + plankL; y += plankB * 2) {
      for (let x = -plankL; x < 512 + plankL; x += plankL) {
        const kleur = tinten[teller % tinten.length];
        teller++;
        tekenPlank(ctx, x, y, plankL, plankB, kleur, Math.PI / 4);
        tekenPlank(ctx, x + plankL * 0.5, y + plankB, plankL, plankB,
                   tinten[(teller + 2) % tinten.length], -Math.PI / 4);
      }
    }

    function tekenPlank(ctx, cx, cy, len, br, kleur, hoek) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(hoek);
      ctx.fillStyle = kleur;
      ctx.fillRect(-len / 2, -br / 2, len, br);
      ctx.strokeStyle = 'rgba(90,60,30,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-len / 2, -br / 2, len, br);
      ctx.strokeStyle = 'rgba(120,85,45,0.25)';
      ctx.lineWidth = 1;
      for (let i = -len / 2 + 6; i < len / 2; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, -br / 2 + 2);
        ctx.lineTo(i, br / 2 - 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(B / 2, L / 2);
    tex.anisotropy = 8;
    return tex;
  }

  // ── Procedurele textuur: zwart-wit diamant (harlekijn) voor tapijt ─────
  function maakDiamantTextuur() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const n = 4;
    const s = 256 / n;
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#101010';
    for (let r = 0; r < n; r++) {
      for (let k = 0; k < n; k++) {
        if ((r + k) % 2 === 0) continue;
        const cx = (k + 0.5) * s;
        const cy = (r + 0.5) * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s / 2);
        ctx.lineTo(cx + s / 2, cy);
        ctx.lineTo(cx, cy + s / 2);
        ctx.lineTo(cx - s / 2, cy);
        ctx.closePath();
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.anisotropy = 8;
    return tex;
  }

  // Materialen
  const matVloer   = new THREE.MeshLambertMaterial(
    HEADLESS ? { color: 0xd8b483 } : { map: maakVisgraatTextuur() }); // visgraat-parket
  const matPlafond = new THREE.MeshLambertMaterial({ color: 0x141414 }); // bijna zwart (industrieel)

  function maakVlak(breedte, hoogte, materiaal, x, y, z, rx, ry) {
    const geo  = new THREE.PlaneGeometry(breedte, hoogte);
    const mesh = new THREE.Mesh(geo, materiaal);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx ?? 0;
    mesh.rotation.y = ry ?? 0;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Vloer
  maakVlak(B, L, matVloer,   0,       0,    0,    -Math.PI/2, 0);

  // Rond tapijt in het midden (diameter ~4 m) met zwart-wit diamantmotief
  const matTapijt = new THREE.MeshLambertMaterial(
    HEADLESS ? { color: 0xf2f2f0 } : { map: maakDiamantTextuur() });
  const tapijt = new THREE.Mesh(new THREE.CircleGeometry(2, 64), matTapijt);
  tapijt.rotation.x = -Math.PI / 2;
  tapijt.position.set(0, 0.01, 0);
  tapijt.receiveShadow = true;
  scene.add(tapijt);
  // Plafond
  maakVlak(B, L, matPlafond, 0,       H,    0,     Math.PI/2, 0);
  // Korte wanden: mat zwart
  const matZwarteWand = new THREE.MeshLambertMaterial({ color: 0x121212 });
  // Achterwand (z = -L/2) — origineel dicht vlak (westdeur vervallen op
  // verzoek van de mens: de zuidelijke glazen deur is de enige deur)
  maakVlak(B, H, matZwarteWand, 0, H/2, -L/2, 0, 0);
  // Voorwand    (z = +L/2)
  maakVlak(B, H, matZwarteWand, 0,  H/2,  L/2,  0,   Math.PI);
  // Linkerwand  (x = -B/2) — donkere achtergrond achter het touwtjesgordijn
  const matDonkereWand = new THREE.MeshLambertMaterial({ color: 0x1a1512 });
  maakVlak(L, H, matDonkereWand, -B/2, H/2, 0,   0,    Math.PI/2);
  // ── Rechterwand (x = +B/2): 3 grote ramen + frame ─────────────────────
  const matFrame = new THREE.MeshLambertMaterial({ color: 0x2b2b2b }); // donker metaal
  const matGlas  = new THREE.MeshPhongMaterial({
    color: 0xaaccdd, transparent: true, opacity: 0.12,
    shininess: 90, side: THREE.DoubleSide, depthWrite: false
  });

  const raamWand = new THREE.Group();
  const frameDik = 0.10;
  const xWand    = B/2 - 0.02;

  // TWEEDE INGREEP (op verzoek van de mens, zie DECISIONS.md): glazen deur in
  // het linker raamvak gezien vanaf de vide (= lokaal −z, wereld-WESTzijde van
  // de zuidwand). Opening 1,0 × 2,1 m op lokaal z −4,5 … −3,5.
  const GD0 = -4.5, GD1 = -3.5, GDH = 2.1;  // glazen-deuropening

  function glasVlak(lenZ, lenY, z, y) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(lenZ, lenY), matGlas);
    g.position.set(xWand, y, z);
    g.rotation.y = -Math.PI/2;
    raamWand.add(g);
  }
  // glas in drie delen om de deuropening heen (origineel: één vlak L × H)
  glasVlak(GD0 + L/2, H, (GD0 - L/2) / 2, H/2);          // z −6 … 3,5
  glasVlak(L/2 - GD1, H, (GD1 + L/2) / 2, H/2);          // z 4,5 … 6
  glasVlak(GD1 - GD0, H - GDH, (GD0 + GD1) / 2, GDH + (H - GDH) / 2); // boven de deur

  function frameBalk(lenZ, lenY, z, y) {
    const g = new THREE.BoxGeometry(0.06, lenY, lenZ);
    const m = new THREE.Mesh(g, matFrame);
    m.position.set(xWand, y, z);
    raamWand.add(m);
  }
  frameBalk(L, frameDik, 0, H - frameDik/2);
  // onderregel in twee delen om de deuropening heen
  frameBalk(GD0 + L/2, frameDik, (GD0 - L/2) / 2, frameDik/2);
  frameBalk(L/2 - GD1, frameDik, (GD1 + L/2) / 2, frameDik/2);
  for (const z of [-L/2, -L/6, L/6, L/2]) {
    const g = new THREE.BoxGeometry(0.06, H, frameDik);
    const m = new THREE.Mesh(g, matFrame);
    m.position.set(xWand, H/2, z);
    raamWand.add(m);
  }
  // deurkozijn: twee stijlen + bovendorpel
  for (const z of [GD0, GD1]) {
    const stijl = new THREE.Mesh(new THREE.BoxGeometry(0.06, GDH + 0.12, 0.08), matFrame);
    stijl.position.set(xWand, (GDH + 0.12) / 2, z);
    raamWand.add(stijl);
  }
  const dorpel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, GD1 - GD0), matFrame);
  dorpel.position.set(xWand, GDH + 0.05, (GD0 + GD1) / 2);
  raamWand.add(dorpel);

  // de glazen deur zelf: glaspaneel met smal donker randwerk, scharnier op z = 3,5
  const glasDeurPivot = new THREE.Group();
  glasDeurPivot.position.set(xWand, 0, GD0);
  const gdPaneel = new THREE.Group();
  const gdGlas = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 2.02), matGlas);
  gdGlas.rotation.y = -Math.PI/2;
  gdGlas.position.set(0, 1.06, 0.48);
  gdPaneel.add(gdGlas);
  for (const dz of [0.04, 0.92]) {
    const rand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.08, 0.05), matFrame);
    rand.position.set(0, 1.07, dz);
    gdPaneel.add(rand);
  }
  for (const dy of [0.05, 2.08]) {
    const rand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.94), matFrame);
    rand.position.set(0, dy, 0.48);
    gdPaneel.add(rand);
  }
  const klink = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.16), matFrame);
  klink.position.set(0, 1.05, 0.82);
  gdPaneel.add(klink);
  glasDeurPivot.add(gdPaneel);
  scene.add(glasDeurPivot);

  scene.add(raamWand);

  // (Foto-backdrop achter de ramen is app-decor van de zelfstandige versie en
  //  vervalt hier: door de ramen kijk je nu de echte LocHal-zuidhal in.)

  // ── Industriële plafond-elementen (buizen + luchtkanalen) ──────────────
  const matBuis   = new THREE.MeshLambertMaterial({ color: 0x3a3a3a }); // donkergrijs
  const matKanaal = new THREE.MeshLambertMaterial({ color: 0x1c1c1c }); // bijna zwart

  const buisData = [
    { x: -2.2, y: H - 0.25, r: 0.10 },
    { x: -1.0, y: H - 0.20, r: 0.07 },
    { x:  0.4, y: H - 0.30, r: 0.13 },
    { x:  1.6, y: H - 0.22, r: 0.08 },
    { x:  2.4, y: H - 0.28, r: 0.11 },
  ];
  for (const b of buisData) {
    const geo = new THREE.CylinderGeometry(b.r, b.r, L, 16);
    const buis = new THREE.Mesh(geo, matBuis);
    buis.rotation.x = Math.PI / 2;
    buis.position.set(b.x, b.y, 0);
    buis.castShadow = true;
    scene.add(buis);
  }

  const kanaalData = [
    { z: -3.5, y: H - 0.30 },
    { z:  2.8, y: H - 0.30 },
  ];
  for (const k of kanaalData) {
    const geo = new THREE.BoxGeometry(B, 0.45, 0.55);
    const kanaal = new THREE.Mesh(geo, matKanaal);
    kanaal.position.set(0, k.y, k.z);
    kanaal.castShadow = true;
    scene.add(kanaal);
  }

  // ── Touwtjesgordijn linkerwand (x = -B/2) via InstancedMesh ────────────
  const draadPalet = [0xcc1f1f, 0xff6a00, 0xffc20a, 0x7a0d0d];
  const aantalDraden = 700;
  const draadGeo = new THREE.CylinderGeometry(0.011, 0.011, H, 5);
  const draadMat = new THREE.MeshLambertMaterial();
  const gordijn = new THREE.InstancedMesh(draadGeo, draadMat, aantalDraden);
  gordijn.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const dummy  = new THREE.Object3D();
  const tint   = new THREE.Color();
  for (let i = 0; i < aantalDraden; i++) {
    const z = -L/2 + ((i + 0.5) / aantalDraden) * L + (Math.random() - 0.5) * 0.012;
    const x = -B/2 + 0.06 + Math.random() * 0.04;
    dummy.position.set(x, H/2, z);
    dummy.updateMatrix();
    gordijn.setMatrixAt(i, dummy.matrix);
    tint.setHex(draadPalet[Math.floor(Math.random() * draadPalet.length)]);
    gordijn.setColorAt(i, tint);
  }
  gordijn.instanceMatrix.needsUpdate = true;
  scene.add(gordijn);

  // ── Groot beeldscherm tegen de draadwand (links, x = -B/2) ────────────
  const schermB = 3.0, schermH = 1.7;
  const schermY = 1.7;
  const schermZ = -2.2;
  const schermX = -B/2 + 0.12;

  const kader = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, schermH + 0.16, schermB + 0.16),
    new THREE.MeshLambertMaterial({ color: 0x080808 })
  );
  kader.position.set(schermX - 0.02, schermY, schermZ);
  scene.add(kader);

  // Prompt die op het scherm staat (origineel scherm-startbeeld).
  function maakSchermPrompt(regel1, regel2) {
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#dfeaff'; ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 24;
    ctx.font = 'bold 78px sans-serif';
    ctx.fillText(regel1, c.width / 2, c.height / 2 - 45);
    ctx.font = '44px sans-serif';
    ctx.fillText(regel2, c.width / 2, c.height / 2 + 55);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const matScherm = HEADLESS
    ? new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
    : new THREE.MeshBasicMaterial({ map: maakSchermPrompt('Druk spatiebalk', 'om de tv aan te zetten') });
  const schermVlak = new THREE.Mesh(
    new THREE.PlaneGeometry(schermB, schermH), matScherm
  );
  schermVlak.rotation.y = Math.PI / 2;
  schermVlak.position.set(schermX + 0.04, schermY, schermZ);
  scene.add(schermVlak);

  // Zacht schijnsel van het scherm de kamer in
  const schermLicht = new THREE.PointLight(0x9fc6ff, 1.2, 8);
  schermLicht.position.set(schermX + 0.6, schermY, schermZ);
  scene.add(schermLicht);

  // ── Lichtgevende cursieve tekst 'Stemmingmakerij' ─────────────────────
  function maakTekstVlak(tekst) {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = 'italic 700 200px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eaf6ff';
    ctx.shadowColor = '#46c8ff';
    for (const blur of [40, 28, 16, 8]) {
      ctx.shadowBlur = blur;
      ctx.fillText(tekst, c.width / 2, c.height / 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  const tekstVlak = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.5),
    HEADLESS
      ? new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.0 })
      : new THREE.MeshBasicMaterial({ map: maakTekstVlak('Stemmingmakerij'), transparent: true })
  );
  tekstVlak.rotation.y = Math.PI / 2;
  tekstVlak.position.set(-B/2 + 0.10, 2.0, 2.2);
  scene.add(tekstVlak);

  // ── Doorlopende U-bank: linkerwand + beide korte (brede) kanten ───────
  const bankDiepte = 0.6;
  const bankHoog   = 0.40;
  const matHout = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });

  const bankLinks = new THREE.Mesh(
    new THREE.BoxGeometry(bankDiepte, bankHoog, L), matHout);
  bankLinks.position.set(-B/2 + bankDiepte/2, bankHoog/2, 0);
  scene.add(bankLinks);
  // Achterwand (z = -L/2, langs X, volle breedte) — origineel
  const bankAchter = new THREE.Mesh(
    new THREE.BoxGeometry(B, bankHoog, bankDiepte), matHout);
  bankAchter.position.set(0, bankHoog/2, -L/2 + bankDiepte/2);
  scene.add(bankAchter);
  // Voorwand (z = +L/2, langs X, volle breedte)
  const bankVoor = new THREE.Mesh(
    new THREE.BoxGeometry(B, bankHoog, bankDiepte), matHout);
  bankVoor.position.set(0, bankHoog/2, L/2 - bankDiepte/2);
  scene.add(bankVoor);

  // Losse vierkante zitkussens, afwisselend rood/wit/zwart/oranje
  const kussenPalet = [0xcc2222, 0xf2f2f2, 0x111111, 0xff6a00];
  const kussenMaat = 0.5, kussenDik = 0.14, kussenStap = 0.55;
  let kIndex = 0;
  function legKussens(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / kussenStap));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const kussen = new THREE.Mesh(
        new THREE.BoxGeometry(kussenMaat, kussenDik, kussenMaat),
        new THREE.MeshLambertMaterial({ color: kussenPalet[kIndex % kussenPalet.length] })
      );
      kussen.position.set(x0 + dx * t, bankHoog + kussenDik/2, z0 + dz * t);
      kussen.castShadow = true;
      scene.add(kussen);
      kIndex++;
    }
  }
  const cx = -B/2 + bankDiepte/2 + 0.02;
  const cz1 = -L/2 + bankDiepte/2 + 0.02;
  const cz2 =  L/2 - bankDiepte/2 - 0.02;
  legKussens(cx, -L/2 + 0.4, cx, L/2 - 0.4);   // linkerwand
  legKussens(-B/2 + 0.6, cz1, B/2 - 0.4, cz1); // achterwand
  legKussens(-B/2 + 0.6, cz2, B/2 - 0.4, cz2); // voorwand

  // ── Cirkelbank op het tapijt (open aan de tv-kant, -X) ────────────────
  const cbInner  = 1.67, cbOuter = 2.10;
  const cbLegH   = 0.30,  cbSeatDik = 0.15;
  const matRoodZit = new THREE.MeshLambertMaterial({ color: 0xc0241f });
  const matPoot    = new THREE.MeshLambertMaterial({ color: 0xc9a36a });
  const openHalf = 0.60;
  const aStart = Math.PI + openHalf;
  const aEnd   = 3 * Math.PI - openHalf;
  const nSeg   = 8;
  const segTot = (aEnd - aStart) / nSeg;
  const tussen = 0.12;

  const cbMap = (r, a) => [r * Math.cos(a), -r * Math.sin(a)];

  for (let i = 0; i < nSeg; i++) {
    const a0 = aStart + i * segTot + tussen / 2;
    const a1 = aStart + (i + 1) * segTot - tussen / 2;

    const shape = new THREE.Shape();
    shape.absarc(0, 0, cbOuter, a0, a1, false);
    shape.absarc(0, 0, cbInner, a1, a0, true);
    const geo = new THREE.ExtrudeGeometry(shape,
      { depth: cbSeatDik, bevelEnabled: false, curveSegments: 24 });
    const zit = new THREE.Mesh(geo, matRoodZit);
    zit.rotation.x = -Math.PI / 2;
    zit.position.y = cbLegH;
    zit.castShadow = true;
    scene.add(zit);

    for (const a of [a0 + 0.06, (a0 + a1) / 2, a1 - 0.06]) {
      for (const r of [cbInner + 0.12, cbOuter - 0.12]) {
        const [px, pz] = cbMap(r, a);
        const poot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, cbLegH, 10), matPoot);
        poot.position.set(px, cbLegH / 2, pz);
        poot.castShadow = true;
        scene.add(poot);
      }
    }
  }

  // ── Cluster bolvormige hanglampen boven het midden ───────────────────
  const matKabel = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const matBol   = new THREE.MeshBasicMaterial({ color: 0xfff1d8 });

  const lampen = [
    { x:  0.00, z:  0.00, y: 2.05, r: 0.16 },
    { x: -0.45, z:  0.20, y: 2.45, r: 0.12 },
    { x:  0.40, z: -0.25, y: 2.30, r: 0.13 },
    { x:  0.25, z:  0.45, y: 2.60, r: 0.11 },
    { x: -0.30, z: -0.40, y: 2.20, r: 0.14 },
    { x:  0.55, z:  0.15, y: 2.50, r: 0.10 },
    { x: -0.55, z: -0.05, y: 2.35, r: 0.12 },
  ];

  for (const L0 of lampen) {
    const kabelLen = H - (L0.y + L0.r);
    const kabel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, kabelLen, 6), matKabel);
    kabel.position.set(L0.x, L0.y + L0.r + kabelLen/2, L0.z);
    scene.add(kabel);

    const bol = new THREE.Mesh(new THREE.SphereGeometry(L0.r, 20, 16), matBol);
    bol.position.set(L0.x, L0.y, L0.z);
    scene.add(bol);

    // Warme lichtbron in de bol — castShadow uit (zon is dé schaduwwerper)
    const lamp = new THREE.PointLight(0xffd9a0, 0.5, 9, 2);
    lamp.position.set(L0.x, L0.y, L0.z);
    scene.add(lamp);
  }

  // ── Wrapper-transform naar de CONFIG-positie (oostgevel, vloer 1) ───────
  // 0,5 m noordelijker binnen het vak, zodat de vide-rand vóór de glazen
  // deur (de enige uitgang) een begaanbare strook van ~1,5 m is.
  const vak = CONFIG.objects.stemmingMakerij;
  const y0 = CONFIG.floors[vak.floor];
  const cxW = 53.9, czW = 39.5;        // middelpunt (oost net vrij van de gevel)
  groep.position.set(cxW, y0, czW);
  groep.rotation.y = Math.PI / 2;      // ramen → zuid (vide)
  // schaalfactor 1: de zaal is al in meters gebouwd

  // ── Wereld-colliders (lokaal → wereld: X = cx + lz, Z = cz − lx) ────────
  const dikte = 0.18;
  const xWest = cxW - L / 2, xOost = cxW + L / 2;
  const zZuid = czW - B / 2, zNoord = czW + B / 2;
  const yB = y0, yT = y0 + H;
  // glazen deur (zuidwand): lokaal z −4,5…−3,5 → wereld x = cxW + lokaal z
  const gdX0 = cxW + GD0, gdX1 = cxW + GD1;
  const glasDeurCollider = { x0: gdX0 - 0.15, x1: gdX1 + 0.15, y0: yB, y1: yT, z0: zZuid - dikte, z1: zZuid + dikte, actief: true };
  const colliders = [
    { x0: xWest - dikte, x1: xWest + dikte, y0: yB, y1: yT, z0: zZuid, z1: zNoord }, // west (dicht)
    { x0: xOost - dikte, x1: xOost + dikte, y0: yB, y1: yT, z0: zZuid, z1: zNoord },  // oost
    { x0: xWest, x1: xOost, y0: yB, y1: yT, z0: zNoord - dikte, z1: zNoord + dikte }, // noord (gordijnwand)
    // zuid (ramen) in 2 stukken rond de glazen deur
    { x0: xWest, x1: gdX0, y0: yB, y1: yT, z0: zZuid - dikte, z1: zZuid + dikte },
    { x0: gdX1, x1: xOost, y0: yB, y1: yT, z0: zZuid - dikte, z1: zZuid + dikte },
    glasDeurCollider,
  ];

  // Loopvlak van de zaal zelf (vloer-1-plak komt pas in fase 2)
  const surfaces = [
    { kind: 'vlak', x0: xWest, x1: xOost, z0: zZuid, z1: zNoord, y: y0 },
  ];

  // ── Deurlogica: alleen de zuidelijke glazen deur (de enige deur) ────────
  const glasDeur = { open: false, t: 0 };
  const GLAS_OPEN_HOEK = -1.85;  // naar binnen (de kamer in)
  function update(dt) {
    const doel = glasDeur.open ? 1 : 0;
    if (glasDeur.t === doel) return;
    glasDeur.t += Math.sign(doel - glasDeur.t) * dt * 1.8;
    glasDeur.t = Math.max(0, Math.min(1, glasDeur.t));
    const e = glasDeur.t * glasDeur.t * (3 - 2 * glasDeur.t);
    glasDeurPivot.rotation.y = GLAS_OPEN_HOEK * e;
    glasDeurCollider.actief = glasDeur.t < 0.35;
  }

  const interactables = [{
    x: (gdX0 + gdX1) / 2, y: y0 + 1.2, z: zZuid, radius: 2.2,
    label: () => glasDeur.open ? 'E — glazen deur sluiten' : 'E — glazen deur openen',
    onInteract: () => { glasDeur.open = !glasDeur.open; },
  }];

  return { groep, colliders, surfaces, interactables, update };
}
