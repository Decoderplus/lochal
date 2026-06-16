// LocHal v3.1 — CONFIG (sectie 2 van het werkplan, letterlijk overgenomen).
// Eén gelogde afwijking (zie DECISIONS.md): objects.stemmingMakerij.x is
// [48, 60] i.p.v. [52, 60], omdat de bestaande (onaantastbare) zaal 12 m lang
// is en anders nooit in het vak past.
export const CONFIG = {
  units: 'meters', // x: 0 west → 60 oost | z: 0 zuid → 90 noord | y: hoogte
  hall: { width: 60, length: 90, height: 19, ridgeX: [15, 45],
          baseWallH: 4, glassGridX: 1.5, glassGridY: 2.0 },
  // f*VanZ = vanaf welke z de vloerplak ligt; 2 en 3 wijken terug zodat het
  // hoge open volume boven het trappenlandschap doorloopt (mens: wijds & hoog).
  // bovenTierVanZ = waar de OPLOPENDE trap (vloer 1 → 2) begint: pas
  // halverwege de StemmingMakerij (z36–48 → z42), met een vlakke vloer-1-plaza
  // ervóór (z35–42) — zoals op de foto vanuit de zaal.
  floors: { f1: 5.0, f2: 9.0, f3: 12.5, slabT: 0.4, builtFromZ: 39,
            f1VanZ: 39, bovenTierVanZ: 46, f2VanZ: 55, f3VanZ: 61 },
  grid: { baySpacing: 7.5, bays: 13, centerColX: 30 },
  colors: {
    steelOld: 0x9a9484, steelOldRust: 0xb35a2e, steelOldGreen: 0x6e7265,
    steelNew: 0x1a1a1a, steelRoof: 0xaab0a0,
    floorGF: 0xb9b0a2, floorF1: 0xc0bdb6, treadConcrete: 0xd8d5cd,
    oak: 0xb08d5a, baseWall: 0x8f8a82,
    cushionRed: 0xc23b2e, cushionBlue: 0x2c3e66, cushionOrange: 0xd97b2e,
    crane: 0xd8a017, mosaicRed: 0xa32a22, mosaicBlack: 0x141414,
    curtainWhite: 0xe8e6e0, curtainBlack: 0x111111, curtainYellowEdge: 0xe3c61f,
    curtainBlueHeavy: 0x28324e, voile: 0xd9d6d0,
    pipeBlue: 0x2e5e8c, pipeRed: 0xa33b2a,
    tijdlabOrange: 0xd45500, machineGreen: 0x9acd32,
    fog: 0xd8d6d0,
  },
  objects: {
    // Plattegrond (first floor): zaal langs de oostgevel, lange as noord-zuid,
    // ramen west de hal in, glazen deur (enige deur) noordelijk in de westwand.
    stemmingMakerij: { x: [48, 60], z: [42, 54], floor: 'f1', door: 'west' }, // 3 m naar achter (mens)
    glazenzaal:      { x: [18, 30], z: [55, 70], h: 4 },
    seats2meet:      { x: [32, 48], z: [55, 75] },
    kennisPlateau:   { x: [15, 45], z: [35, 42] },
    tijdLab:         { x: [0, 8],   z: [35, 48] },
    // Breed trappenlandschap (bijna volle breedte), centrale gleuf voor de
    // loopbrug/kernen; oost stopt vóór de StemmingMakerij (x 48–60).
    // trappen uit elkaar: oost naar de StemmingMakerij, west 2 m naar buiten
    tribuneWest:     { x: [4, 25],  zTop: 39, zBottom: 26, yTop: 5 },
    tribuneOost:     { x: [33, 48], zTop: 39, zBottom: 26, yTop: 5 },
    loopbrug:        { x: [25, 33], z: 34, y: 5, breedte: 2 },
    // kiosk: glazen bar + zwevende mozaïekdoos + LocHal-bord; 4 m richting het
    // midden (weg van de StemmingMakerij)
    cafe:            { x: [44, 53], z: [4, 11], kapH: 2.4 },
    kroonluchter:    { cx: 39, cz: 16, count: 95, yMin: 6, yMax: 12.5, spreid: 4.5 },
    stellage:        { x: [25, 33], z: [4, 23], liggerY: [4.5, 7.5] },
    // lange leestafels op rails, TEGENOVER de kiosk (westkant)
    treintafels:     { count: 3, maat: [11, 1.6, 1.05], z: [4, 11] },
    expoWanden:      { x: [5, 16], z: [13, 22], count: 5, maat: [3, 4] },
    kraan:           { spanX: [0, 30], y: 15, parkZ: 33, spots: 9 },
    grootDoek:       { gevel: 'zuidwest', breedte: 28, hoogte: 14 },
  },
  player: { hoogte: 1.75, loopsnelheid: 4 },
  // Rotatie van de StemmingMakerij-wrapper om zijn eigen as (0/90/180/270).
  // 180 = geijkt op de plattegrond: lange as noord-zuid, ramen west, deur
  // noordelijk in de westwand. (Debugtoets R draait verder; M = minikaart.)
  zaalRotatie: 180,
  // De hele wereld over de lengteas (de N-Z middenlijn op x = W/2) spiegelen:
  // x → W − x. Visueel + fysica + asserts volgen deze vlag. (Mens: spiegelen.)
  spiegelX: true,
  renderer: { toneMapping: 'ACESFilmic', exposure: 1.0,
              outputColorSpace: 'srgb', shadowMapSize: 1024, maxShadowLights: 1 },
  performance: { maxTris: 200000, maxDrawCalls: 120, minFPS: 30 },
  cameras: { // vaste posities voor tools/shot.js — [pos], [lookAt]
    spelerstart:  [[56, 6.7, 39], [30, 4, 20]],
    plateau:      [[30, 7, 40],  [35, 3, 10]],
    zuidhal:      [[10, 2, 5],   [40, 6, 25]],
    tribune:      [[30, 1.7, 18],[20, 6, 34]],
    vogelvlucht:  [[55, 14, 8],  [15, 0, 60]],
  },
};
