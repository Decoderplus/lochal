# LocHal v3.1 — Werkplan & technisch contract voor Claude Code

Dit document bevat twee delen: eerst het WERKPLAN (HOE er gebouwd wordt),
daarna de volledige BOUWSPECIFICATIE v3 (WAT er gebouwd wordt — de wereld-
beschrijving, na de scheidingslijn). Bij tegenspraak wint het werkplan.

## 0. Kernprincipe: autonomie

De mens test maximaal 3× (zie fasering). Daarbuiten werkt Claude Code volledig
zelfstandig. Daarom gelden deze regels ALTIJD:

1. **Nooit vragen, wel loggen.** Bij elke ambiguïteit: maak zelf de meest
   plausibele keuze, noteer die in `DECISIONS.md` (één regel: wat + waarom),
   en ga door.
2. **Geen externe afhankelijkheden voor assets.** Alle texturen worden
   procedureel gegenereerd (canvas/THREE.DataTexture). Geen downloads, geen
   verzoeken aan de gebruiker om bestanden.
3. **Geen refactors buiten de eigen fase.** Wijzig alleen bestanden die bij de
   huidige fase horen. Bestaande, werkende modules zijn bevroren.
4. **Verifieer vóór je commit.** Elke fase eindigt met: `npm run verify` groen
   → `npm run shot` → zelf de screenshots bekijken en beoordelen tegen de
   fasechecklist → pas dan `git commit -m "fase X: ..."`.
5. **De CONFIG is wet.** Alle maten en kleuren komen uit `src/config.js`.
   Nergens hardcoded getallen of hexwaarden in bouwmodules.
6. **De bestaande StemmingMakerij is onaantastbaar.** In géén enkele fase wordt
   de interne code of vormgeving van de bestaande zaal gewijzigd; alle
   positionering verloopt via de wrapper-Group (zie fase 0).

## 1. Bestandsstructuur

```
/index.html
/src/config.js        ← alle maten/kleuren (sectie 2, letterlijk overnemen)
/src/materials.js     ← alle THREE-materialen + procedurele texturen
/src/player.js        ← controller (hergebruik bestaande uit het project!)
/src/world/casco.js          (fase 1)
/src/world/constructie.js    (fase 1)
/src/world/verdiepingen.js   (fase 2)
/src/world/tribunes.js       (fase 2)
/src/world/zuidhal.js        (fase 3)
/src/world/interieur.js      (fase 3)
/src/world/doeken.js         (fase 4)
/src/world/licht.js          (fase 4)
/tools/verify.js      ← headless scene-asserts (node)
/tools/shot.js        ← puppeteer-screenshots vanaf vaste camera's
/shots/               ← output screenshots per fase
/DECISIONS.md
```

## 2. CONFIG (letterlijk overnemen als `src/config.js`)

```js
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
    stemmingMakerij: { x: [52, 60], z: [43, 51], floor: 'f1', door: 'west' },
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
```

ASSENCHECK (verplichte asserts in verify.js):

- LENGTE (90 m) loopt langs Z; BREEDTE (60 m) langs X. Halbox: x 0→60, z 0→90. Andersom = fataal.
- Tribunes (herijkt na MENSTEST 1): treden noord-zuid, looprichting oost-west; topplatforms (y=5) aan de buitenzijden tegen de vide-rand (x≈10–13 en 47–50), onderkant (y=0) richting het hal-midden (x≈22 en 38).
- StemmingMakerij-center: x > 50 én z 40–54; deur kijkt naar -x.
- Café-center: z < 15. Glazenzaal-center: x < 30.
- Minimaal 2 grote doeken in de zuidhal (z < 30), weerszijden van x=30.

Schattingen in deze CONFIG mogen NIET "verbeterd" worden op eigen initiatief;
alleen aanpassen als een fasechecklist of de mens daarom vraagt.

## 3. Procedurele texturen (in materials.js, canvas 512–1024 px)

- `patina`: basis steelOld + 30–60 onregelmatige vlekken in steelOldRust en
  steelOldGreen + horizontale rijen donkere stippen (klinknagels)
- `betonMarkeringen` (BG-vloer, 2048 px, repeat 1×): betonruis + witte lijnen,
  2 rode kruizen, geel-zwarte taperanden langs gangzones
- `mozaiek`: raster 10 cm tegels, willekeurig mosaicRed/mosaicBlack (70/30)
- `boekenstapel`: horizontale strepen 2–4 cm in gedempte willekeurige kleuren
- `dambord`: 50 cm vlakken in twee grijzen (TijdLab-vloer)
- `doekPatroon`: wit veld + 2–3 grote zwarte organische vlakken + 1 gele
  verticale bies van 8 cm
Alle overige materialen: effen kleuren met roughness/metalness, geen maps.

## 4. Verificatie (tools/)

**verify.js** (node, headless — bouwt de scene zonder renderer en assert):
- alle objecten uit CONFIG.objects bestaan als benoemde Group in de scene
- bounding box van elk object valt binnen de hal én binnen zijn CONFIG-vak (+1 m)
- totaal triangles ≤ maxTris; per categorie InstancedMesh waar voorgeschreven
  (kolommen, spanten, daklichten, tribuneblokken, kussens, bollampen, stoelen)
- aantal unieke materialen ≤ 25; geen materialen buiten materials.js
- exit code ≠ 0 bij falen → fase niet committen, eerst fixen

**shot.js** (puppeteer): start statische server, laadt index.html, rendert
**standaard alleen de camera's `spelerstart` en `vogelvlucht`** (de overige drie
— `plateau`, `zuidhal`, `tribune` — alleen op expliciet menselijk verzoek, bv.
`node tools/shot.js {N} all` of met expliciete cameranamen). Slaat op als
`shots/fase{N}_{naam}.png`. Claude Code BEKIJKT deze PNG's na elke fase en toetst
aan de fasechecklist. Bij afwijking: fixen en opnieuw schieten, max 3 iteraties
per fase, daarna beste resultaat committen en afwijking loggen in DECISIONS.md.

## 5. Fasering (autonoom, mens test 3×)

**Fase 0 — Inventarisatie & fundering.** Er wordt doorgewerkt in het bestaande
project. Scan het: welke schaal/units gebruikt de StemmingMakerij-scene, welke
controller, welke bestandsopzet? Rapporteer in DECISIONS.md.
**VERPLICHT: de bestaande StemmingMakerij-zaal blijft volledig intact en komt
ongewijzigd in de game.** Niet herbouwen, niet "opschonen", interne code niet
aanpassen. Integratietechniek: plaats de hele bestaande zaal in één wrapper-
Group (`stemmingMakerijGroup`), en schaal/roteer/verplaats uitsluitend die
Group naar de CONFIG-positie (oostgevel, vloer 1). Bepaal daarvoor de schaal-
factor naar meters. Enige toegestane ingreep aan de zaal zelf: een deuropening
van 1 × 2,1 m in de westwand als die nog niet bestaat (kleinst mogelijke edit,
gelogd in DECISIONS.md).
Zet bestandsstructuur, config.js, materials.js, renderer-instellingen, player
(hergebruik de bestaande controller als die werkt), verify.js, shot.js,
git init/commit op.
*Klaar wanneer:* `npm run verify` draait (mag nog leeg zijn), 5 shots genereren,
bestaande zaal laadt ongewijzigd.

**Fase 1 — Casco & constructie** (casco.js, constructie.js): vloer, gevels
(fijn raster), zadeldaken, piramide-daklichten, kolommen (oud/nieuw-paren),
middenkolommenrij, spanten, luchtkanalen.
*Checklist shots:* twee daken zichtbaar; oud staal beige-met-vlekken (NIET
zwart); glasraster fijn; vide 0→35 volledig open tot het dak.

**Fase 2 — Verdiepingen, StemmingMakerij, tribunes** (verdiepingen.js,
tribunes.js): vloeren 1/2/3 (alleen 1 speelbaar), balustrades, StemmingMakerij
op CONFIG-positie met werkende deur (toets E), beide tribunes (betontreden +
eiken blokken wisselende breedte + kussens), zijtrappen, loopbrug, donkere
onderruimtes, collision + ramp-colliders.
*Checklist shots:* vanaf camera `spelerstart` zie je de zuidhal; tribunes
beloopbaar; loopbrug verbindt beide tribunes.
→ **MENSTEST 1: route lopen van StemmingMakerij naar BG, beide tribunes + brug.**

**Fase 3 — Zuidhal & interieur** (zuidhal.js, interieur.js): café + mozaïekkap
+ LocHal-letterframe, stellage + plantenbakken (low-poly bollen), kroonluchter-
wolk, treintafels op rails, leestafels, expowanden, kolomtafels, TijdLab-
klokkenwand, Glazenzaal, boekenplint-meubels op het plateau.
*Checklist shots:* kroonluchter kleurig en zwevend; café-kap rood-zwart; stellage
loopt N-Z door de zuidhal; vloermarkeringen zichtbaar.

**Fase 4 — Doeken, licht, polish** (doeken.js, licht.js): 4 gordijntypen aan
gebogen rails, zon + hemisphere + 1 schaduw, kraan met spots (1–2 echt, rest
emissive), alle emissives (daklichten, LED-strips, bollen, lampen), fog.
*Checklist shots:* groot doek met zwarte vlakken + gele bies voor de zuidwest-
gevel; zuidhal licht, noorddeel BG donkerder; geen uitgebeten/zwarte beelden
(tone mapping!).
→ **MENSTEST 2: volledige route + sfeeroordeel.**

**Fase 5 — Performance & oplevering**: stats.js-meting op de 5 cameraposities,
draw calls ≤ 120, snoeiprotocol indien minFPS niet gehaald (volgorde: voiles →
stellageplanten versimpelen → fog dichterbij), lazy loading hal, productie-
build, README met startinstructie.
→ **MENSTEST 3: eindtest.**

## 6. Startprompt voor de mens (kopieer dit in Claude Code)

> Lees lochal_compleet.md volledig (werkplan + bouwspecificatie).
> Voer fase 0 t/m 2 zelfstandig uit volgens het werkplan. Vraag mij niets;
> log keuzes in DECISIONS.md. Meld je pas voor MENSTEST 1.

Daarna: "Voer fase 3 en 4 uit, meld je voor MENSTEST 2." en "Voer fase 5 uit."
-e 

---


# Bouwspecificatie LocHal v3 — Three.js sfeer-replica
## Gebaseerd op: officiële plattegrond + fotoanalyse (Saarberg-fotografie) + publicaties

Doel: low-poly, performante reconstructie van de LocHal (Tilburg) als game-omgeving.
Speler start in de StemmingMakerij (12 × 6 m, eerste verdieping, oostgevel), opent een
deur en kijkt uit over de grote zuidhal.

Legenda zekerheid:
- [FEIT] gedocumenteerd  ·  [PLATTEGROND] afgelezen van officiële plattegrond
- [FOTO] direct zichtbaar op foto's  ·  [AFGELEID] uit foto's gereconstrueerd, positie ± 5 m
- [SCHATTING] vrije aanname

---

## 1. Coördinaten en hoofdmaten

- X = breedte: 0 (west) → 60 m (oost) · Z = lengte: 0 (zuid) → 90 m (noord) · Y = hoogte
- Binnenhoogte hal 15 m [FEIT]; twee beuken van elk ~28–30 m (oost/west) met
  middenkolommenrij op x = 30 over de volle lengte [FEIT+PLATTEGROND]
- Hoofdentree zuidoost (x≈48, z=0); noordentree midden noordgevel; nachtentree
  oostgevel (z≈25) [PLATTEGROND]
- **Zuidhal z = 0 → 35: open over volle hoogte (de vide)** [PLATTEGROND]
- Noorddeel z = 35 → 90: drie ingebouwde verdiepingen: vloer 1 op y=5,0;
  vloer 2 op y≈9,0; vloer 3 op y≈12,5 [SCHATTING hoogtes]. Alleen BG en vloer 1
  speelbaar; 2 en 3 zijn decor.
- Stadsbalkon: glazen uitbouw 60 × 6 m, volle zuidgevel op niveau 3 [FEIT+PLATTEGROND]

## 2. Materiaalsysteem (cruciaal — drie staaltypen!) [FOTO]

| Materiaal | Gebruik | Kleur(en) |
|---|---|---|
| OUD_STAAL | originele geklonken vakwerkkolommen, kraanbaanliggers, stellage, loopbrug | basis grijsbeige #9a9484 met patinaplekken roestoranje #b35a2e en grijsgroen #6e7265 |
| NIEUW_STAAL | nieuwe kolommen, balustradeframes, boekenkasten, trapbomen | mat zwart #1a1a1a |
| DAK_STAAL | dakvakwerk + glasgevelraster | lichtgrijsgroen #aab0a0 |

- OUD_STAAL: één 1024-px "patina"-textuur (vlekken + klinknagelrijen), hergebruikt
  met willekeurige UV-rotatie per element. Dit oud/nieuw-contrast ís het gebouw.
- Vloer BG: warm beton #b9b0a2 mét **bewaarde werkvloermarkeringen**: witte lijnen,
  rode kruizen, geel-zwarte tapebanen [FOTO] — als decals of in de vloertextuur
- Vloer verdiepingen: lichter beton #c0bdb6; vloer TijdLab: dambordpatroon [FOTO]
- Onderkant verdiepingsvloeren: zwart met lineaire LED-strips [FOTO]
- Hout (tribuneblokken, tafels, handregels): eiken #b08d5a
- Tribunetreden: wit/lichtgrijs beton #d8d5cd [FOTO]
- Glas: transparant vlak, opacity 0.22, GEEN transmission
- Gekleurde leidingen (blauw #2e5e8c, rood #a33b2a) langs oude constructie [FOTO]

## 3. Casco: gevels en dak

- Onderbouw (y 0→4): beton/metselwerk warmgrijs #8f8a82 met vensterstroken [FEIT]
- Bovenbouw (y 4→15): glas rondom in **fijn raster** (DAK_STAAL-kleur, stijlen om
  de ~1,5 m, regels om de ~2 m — fijner dan v2!) [FOTO]
- Dak: twee zadeldaken (noklijnen N-Z op x≈15 en x≈45); dakvlak = grijze betonnen
  dakplaten op fijn lichtgrijsgroen vakwerk [FOTO]
- **Daklichten: piramidevormige koepels** [FOTO], in rijen langs de noklijnen,
  ~3 × 3 m, om de ~7,5 m — InstancedMesh, materiaal licht-emissief wit

## 4. Draagconstructie

- Middenkolommenrij x=30 (OUD_STAAL vakwerk, doorsnede ~0,8 m) + gevelkolommen
  west/oost, om de 7,5 m in Z → 13 assen [SCHATTING spantafstand]
- Direct naast diverse oude kolommen: slanke NIEUW_STAAL kolommen (Ø ~0,35 m) die
  de nieuwe verdiepingen dragen — bouw als paren oud+nieuw [FOTO]
- Vakwerkspanten overspannen elke beuk oost-west; onderrand ~11 m [SCHATTING]
- Zwarte luchtkanalen (cilinders Ø ~1 m) horizontaal onder het dak [FEIT]

## 5. Gele kraanbrug [FOTO]

- Okergele (#d8a017) kraanbrug, overspant de westbeuk (x 0→30) op y ≈ 11;
  kokerligger ~1,2 m hoog met X-kruisverbanden en bordes/ladder
- **Hergebruikt als lichtrek**: 8–10 theaterspots eraan (zwarte cilinders +
  emissive lens), gericht op de westtribune
- Parkeerpositie: boven de noordrand van de vide, z ≈ 33 [AFGELEID]

## 6. Zuidhal — begane grond (z 0→35)

- **Kraanbaanstellage** [FOTO, positie AFGELEID]: dubbele rij OUD_STAAL vakwerk-
  torens langs de middenas (x ≈ 26–34), van z≈5 tot z≈30, met twee liggerniveaus
  (y≈4,5 en y≈7,5). Op de liggers: donkere houten **plantenbakken** met low-poly
  planten; bovenop één boom. Rode buisleuningen langs de bovenste laag [FOTO]
- **Kroonluchter-wolk** [FOTO, positie AFGELEID]: ±60 bollampen Ø 25–40 cm in
  pastelkleuren (roze, blauw, oranje, groen, geel), hangend aan dunne kabels op
  y = 4→9, geclusterd boven x≈38, z≈18. Emissive bollen, InstancedMesh, kabels
  als dunne lijnen. Dé eyecatcher van de zuidhal.
- **StadsCafé** [FOTO+PLATTEGROND]: barvolume ~12 × 5 m vóór de zuidgevel
  (x≈30–42, z≈6–14). Grote kap bekleed met rood-zwart mozaïek (#a32a22 / #141414,
  tegels ~10 cm). Bovenop: "LocHal"-letterframe (wit, gebouwvormige omlijsting),
  gericht naar de zuidgevel. Lange houten bartafels met rode krukken, plantjes.
- **XXL-leestafels/treintafels** [FEIT+FOTO]: 3 tafels ~8 × 2 m op oude oost-west
  rails (donkere strips in de vloer, z≈15–25) + extra lange tafels met rode
  stoelen tussen stellage en café
- **Expositiewanden** [FOTO]: 4–6 witte vrijstaande wanden ~3 × 4 m, zuidwest
  (x≈5–15, z≈5–15) — plattegrond: Expositieruimte
- **Staande lampen met witte kap** (emissive) verspreid bij zithoekjes [FOTO]
- Hoofdentree zuidoost als dubbele glasdeur

## 7. Tribunes en loopbrug [FOTO+PLATTEGROND]

- **Twee parallelle tribunes**: west x≈10–22, oost x≈38–50; beide dalend van de
  verdiepingsrand (z≈35, y=5) naar BG (z≈22, y=0)
- Opbouw: **witte betontreden** (18/30 cm) waarop **eiken zitblokken van
  wisselende breedte (2–6 m, semi-willekeurig)** liggen [FOTO] — geen strak
  patroon! Losse kussens: rood #c23b2e, donkerblauw #2c3e66, oranje #d97b2e
  (platte boxen 60 × 60 × 8 cm, instanced). Hier en daar een eiken kubustafeltje.
- Rechte zijtrappen langs beide flanken: betontreden, glazen balustrade, eiken
  handregel op zwarte staanders [FOTO]
- **Loopbrug**: oude geklonken stalen brug (OUD_STAAL) met roostervloer, verbindt
  de twee tribunes/verdiepingsranden op y=5 over de opening x 22–38, z≈30 [FOTO]
  → speelbaar! Rooster = textuur met alpha of simpel donker vlak.
- **Donkere wereld onder beide tribunes** [FEIT]: open, donker, toegankelijk —
  sfeervolle contrastzone, bruikbaar voor gameplay
- Boven de westtribune: **gigantisch zwart gordijn** van dak tot tribune [FOTO]
- Tribune-cascade loopt als decor door van vloer 1 naar vloer 2 (noordelijker)

## 8. Eerste verdieping (z 35→90, y=5) [PLATTEGROND+FOTO]

- **StemmingMakerij**: oostgevel, z≈35–43 — bestaande projectzaal hier plaatsen,
  deur in westwand. Direct ten zuiden: gewone trap omlaag [PLATTEGROND]
- **KennisMakerij-plateau** (x≈15–45, z≈35–42): bovenaan beide tribunes.
  Platformmeubels: eiken blad + matraskussens op een **plint van opgestapelde
  boeken** [FOTO] (boekenstapel-textuur op boxgeometrie — zeer herkenbaar).
  Schermen op standaards; "Kennismakerij"-bordje op een eiken rand met boekenplint.
  Donkerblauw plooigordijn als achterwand [FOTO]
- **TijdLab**: westrand (x 0–8, z≈35–48): zwarte vakkenwand met ORANJE achtervlakken
  vol stationsklokken [FOTO]; dambordvloer. Op de rand van vloer 2 erboven: de
  limegroene historische textielmachine [FOTO, niveau AFGELEID]
- **Glazenzaal**: glazen volume ~12 × 8 × 4 m met licht gebogen westwand,
  x≈18–30, z≈55–70 [FEIT+PLATTEGROND, maat SCHATTING]
- **Seats2meet**: open vergaderplein oost van de Glazenzaal
- Balustrade langs de hele vide-rand: glas op zwarte stalen rand, enkele panelen
  met geschilderde tekst/illustraties; opschriften "KROONLUCHTERS" (groen) en
  "FOOD LAB" (wit) op de rand [FOTO] → vervang gerust door eigen game-teksten
- Verdiepingsranden vloer 2/3 (decor): zwarte boekenkast-silhouetten + werkplek-
  balustrade [PLATTEGROND]

## 9. Doeken en gordijnen — vier typen [FEIT+FOTO]

1. **Het grote kunstdoek**: witte/grijze plooibaan met reusachtige ZWARTE
   organische/diagonale vlakken en een dunne GELE bies (#e3c61f), hangend aan een
   **gebogen rail** vóór de zuidwest-glasgevel, vloer tot ~14 m [FOTO]
2. **Grijswitte voiles** (opacity 0.45, DoubleSide): langs oostgevel, bij het café
   en rond zones, aan gebogen plafondrails [FOTO]
3. **Donkerblauw zwaar plooigordijn** bij de KennisMakerij [FOTO]
4. **Zwart megagordijn** boven de westtribune [FOTO]
- Bouw: PlaneGeometry met verticale plooi (sinus in X), volg de gebogen rail met
  een CurvePath; max ~1k tris per doek. Totaal 6 grote doeken [FEIT]

## 10. Licht

- DirectionalLight (zon, warmwit, door de zuidgevel) + HemisphereLight + lage
  ambient; **max 1 echte schaduwwerper**
- Kraanspots: 1–2 echte SpotLights op de westtribune, rest nep (emissive lenzen)
- Kroonluchterbollen, daklichten, LED-strips onder vloeren, staande lampen en
  hanglampenrij: allemaal emissive materialen, géén lichtbronnen
- Noorddeel BG (onder de verdiepingen) merkbaar donkerder [FOTO]

## 11. Performance

- Budget: totaal < 200k tris (verhoogd t.o.v. v2 vanwege stellage + kroonluchter);
  casco < 40k, stellage < 15k, kroonluchter < 8k, tribunes < 12k, doeken < 6k
- InstancedMesh: kolommen(paren), spanten, gevelstijlen, daklichtpiramides,
  tribuneblokken, kussens, bollampen, stoelen, kastblokken, plantenbakken
- Max 7 texturen à 1024 px: patina-staal, beton+markeringen, eik, boekenstapels,
  mozaïek, doekpatroon (zwart/wit/geel), dambord. CC0: ambientCG.com / polyhaven.com
- THREE.Fog(#d8d6d0, near 60, far 150) — subtiel
- StemmingMakerij en hal in aparte groepen; hal activeren bij deur openen
- Collision: AABB's; ramp-colliders over tribunes; loopbrug als smal vlak

## 12. Spelersroute

1. Start StemmingMakerij (oostgevel vloer 1) → deur west
2. KennisMakerij-plateau: boekenplint-meubels, blauw gordijn, balustrade —
   uitzicht over de zuidhal: kroonluchter-wolk, stellage met planten, doeken — wow
3. Keuze: oosttribune af, óf de **loopbrug** over naar de westtribune
4. BG zuidhal: café, kroonluchter, stellage, treintafels, expositiewanden
5. Donkere wereld onder de tribunes (sfeer-/contrastmoment)
6. Optioneel: noordelijke boekenstraat (donker, kolomtafels) tot de noordentree

## 13. Bouwvolgorde voor Claude Code (één stap per prompt!)

1. Casco: vloer 60×90, gevels (fijn raster), twee zadeldaken + piramide-daklichten
2. Constructie: middenkolommen + gevelkolommen (oud/nieuw-paren), spanten, kanalen
3. Verdiepingsvloeren (1 speelbaar; 2+3 decor) + balustrades + StemmingMakerij + deur
4. Twee tribunes (betontreden + eiken blokken + kussens) + zijtrappen + loopbrug
5. Zuidhal: StadsCafé + LocHal-letters, stellage + plantenbakken, kroonluchter-wolk
6. Treintafels, leestafels, expositiewanden, kolomtafels, TijdLab-wand, Glazenzaal
7. Doeken en gordijnen (4 typen, 6 stuks)
8. Licht (zon, kraanspots, emissives) + fog + vloermarkeringen
9. Collision + spelersroute testen (incl. loopbrug en onder-tribunezones)
10. Performance-pass (stats.js: doel 60 fps, minimaal 30) + lazy loading
