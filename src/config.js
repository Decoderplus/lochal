// LocHal v3.1 — CONFIG (sectie 2 van het werkplan, letterlijk overgenomen).
// Eén gelogde afwijking (zie DECISIONS.md): objects.stemmingMakerij.x is
// [48, 60] i.p.v. [52, 60], omdat de bestaande (onaantastbare) zaal 12 m lang
// is en anders nooit in het vak past.
export const CONFIG = {
  units: 'meters', // x: 0 west → 60 oost | z: 0 zuid → 90 noord | y: hoogte
  hall: { width: 60, length: 90, height: 15, ridgeX: [15, 45],
          baseWallH: 4, glassGridX: 1.5, glassGridY: 2.0 },
  floors: { f1: 5.0, f2: 9.0, f3: 12.5, slabT: 0.4, builtFromZ: 35 },
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
    stemmingMakerij: { x: [48, 60], z: [43, 51], floor: 'f1', door: 'west' }, // deur kijkt naar -x (ASSENCHECK); x[48,60] amendment (zaal 12 m)
    glazenzaal:      { x: [18, 30], z: [55, 70], h: 4 },
    seats2meet:      { x: [32, 48], z: [55, 75] },
    kennisPlateau:   { x: [15, 45], z: [35, 42] },
    tijdLab:         { x: [0, 8],   z: [35, 48] },
    tribuneWest:     { x: [10, 22], zTop: 35, zBottom: 22, yTop: 5 },
    tribuneOost:     { x: [38, 50], zTop: 35, zBottom: 22, yTop: 5 },
    loopbrug:        { x: [22, 38], z: 30, y: 5, breedte: 2 },
    cafe:            { x: [30, 42], z: [6, 14], kapH: 3.5 },
    kroonluchter:    { cx: 38, cz: 18, count: 60, yMin: 4, yMax: 9, spreid: 5 },
    stellage:        { x: [26, 34], z: [5, 30], liggerY: [4.5, 7.5] },
    treintafels:     { count: 3, maat: [8, 2, 1.1], z: [15, 25] },
    expoWanden:      { x: [5, 15], z: [5, 15], count: 5, maat: [3, 4] },
    kraan:           { spanX: [0, 30], y: 11, parkZ: 33, spots: 9 },
    grootDoek:       { gevel: 'zuidwest', breedte: 28, hoogte: 14 },
  },
  player: { hoogte: 1.75, loopsnelheid: 4 },
  // Rotatie van de StemmingMakerij-wrapper om zijn eigen as (0/90/180/270).
  // IJkbaar in het spel met debugtoets R; M toont de minikaart.
  zaalRotatie: 90,
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
