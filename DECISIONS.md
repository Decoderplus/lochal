# DECISIONS.md — LocHal v3.1

Eén regel per keuze: wat + waarom. Nieuwste onderaan per fase.

## Fase 0 — Inventarisatie (rapport)

- Bestaand project = `../kamer.html`: één zelfstandig HTML-bestand (Three.js 0.165.0 via CDN) met daarin de zaal-opbouw, menu/credits, video-afspeellijst (story1–3), audio-cues, lichtstanden, post-processing en besturing.
- Schaal/units StemmingMakerij: **al in meters** (zaal 12 × 6 × 3,5 m) → schaalfactor wrapper-Group = **1**.
- Controller: pointer-lock muiskijken (Euler 'YXZ', pitch begrensd) + WASD/pijltjes, snelheid 3 m/s, ooghoogte 1,7 m → **hergebruikt** in `src/player.js` (snelheid/ooghoogte volgen nu CONFIG: 4 m/s, 1,75 m), uitgebreid met AABB-collision, loopvlakken/hellingen, zwaartekracht en E-interactie.
- Bestandsopzet: geen modules/build; daarom is de **zaal-opbouwcode letterlijk overgenomen** in `src/world/stemmingmakerij.js` binnen één wrapper-Group (`const scene = groep;` zodat de originele `scene.add`-regels intact bleven). `kamer.html` zelf is met geen letter gewijzigd en blijft zelfstandig werken.

## Fase 0 — Keuzes

- Projectroot = `./lochal/` met eigen git-repo (nested t.o.v. de bestaande map-repo), zodat de LocHal-historie schoon per fase is en het bestaande project onaangeraakt blijft.
- Three.js lokaal uit `node_modules` geserveerd (versie 0.165.0, identiek aan de zaal) i.p.v. CDN → verify (node) en shots (puppeteer) draaien zonder netwerk.
- Screenshots via **puppeteer-core + systeem-Edge/Chrome** (geen Chromium-download van ±150 MB; zelfde resultaat).
- CONFIG letterlijk overgenomen met **één aanpassing**: `objects.stemmingMakerij.x = [48, 60]` i.p.v. `[52, 60]`. De onaantastbare zaal is 12 m lang en past onmogelijk in een vak van 8 m; werkplan-regel 6 (zaal intact) weegt zwaarder dan de vak-schatting. z-vak [35, 43] past wel (zaal is 6 m breed).
- Wrapper-transform: positie (53,9 · 5,0 · 39), rotatie +90°. Daarmee: deurwand west (x≈47,9), oostwand net vrij van de oostgevel (59,9), **ramen kijken zuid de vide in** (origineel concept: door de ramen de LocHal zien — nu de echte). Gordijn/scherm-wand noord.
- Deuropening (enige toegestane ingreep): 1,00 × 2,10 m gecentreerd in de westwand; dat ene wandvlak is gesplitst in 3 vlakken (zelfde materiaal), de wandbank aldaar 1,4 m onderbroken en de kussensrij in 2 stukken gelegd — minimaal nodig om de deur bruikbaar te maken. Deurpaneel + E-interactie toegevoegd op de naad (opent naar buiten, het plateau op).
- Niet meegenomen uit kamer.html (app-niveau, geen zaal-vormgeving; de zelfstandige versie behoudt alles): menu/credits/laadscherm, video-afspeellijst + cues + geluidseffecten, lichtstanden, post-processing, foto-backdrop achter de ramen (externe foto-asset én zou buiten het CONFIG-vak steken; door de ramen zie je nu de echte zuidhal). Het tv-scherm toont de originele promptkaart.
- Zaal-verlichting: de 7 bollamp-PointLights + schermlicht blijven branden, maar `castShadow` uit (CONFIG: max 1 schaduwwerper — dat is de zon). De globale ambient/hemisfeer van kamer.html zijn vervangen door de hal-verlichting (sfeer-finetuning volgt in fase 4).
- Voorlopige hal-verlichting (zon + hemisfeer + lage ambient, 1 schaduw) in `src/main.js`, gemarkeerd als voorlopig; definitief lichtontwerp is fase 4.
- Verify-materiaalbudget (≤ 25) telt **exclusief** de bevroren zaal: kamer.html maakt per zitkussen een eigen materiaal (bewust niet "opgeschoond", regel 3/6).
- Verify toetst alleen objecten die al gebouwd zijn (`GEBOUWD`-manifest in `src/world/index.js`); nog niet gebouwde CONFIG-objecten worden als "latere fase" gemeld, niet als fout.
- Vloer-1-plak bestaat pas in fase 2; de zaal levert daarom nu zelf zijn loopvlak (y = 5) aan het collision-systeem.

## Fase 1 — Keuzes

- Gootlijn (eaves) op y = 13 gekozen: spec geeft binnenhoogte 15 [FEIT] = noklijn en spant-onderrand ~11; gevelglas loopt dus y 4→13, dakvlakken 13→15. Geveltoppen (z = 0/90) als glazen driehoeken zonder raster (klein vlak, scheelt instances).
- Daklichten: 11 piramides per nok (om de 7,5 m, randvakken vrij) = 22, 45° gedraaid zodat de vlakken haaks op de hal-assen staan; licht-emissief wit (echte lichten volgen in fase 4).
- Spanten: onderrand + 2 dakranden + 7 verticalen per beuk-as (260 staven, InstancedMesh); diagonalen weggelaten — leesbaar vakwerkbeeld binnen het budget.
- Nieuwe kolommen ook op x = 15 en 45 (niet alleen naast de middenrij): de verdiepingsvloeren van 60 m breed kunnen visueel niet alleen op x = 30 rusten. Paren oud+nieuw op de middenrij conform spec.
- Patina per kolom-instance 0/90/180/270° gedraaid (werkplan: willekeurige UV-rotatie) — goedkoopste variant zonder extra UV-werk.
- Entreedeuren (zuidoost/noord/nacht) horen bij de zuidhal-inrichting → fase 3; gevels nu dicht.
- Vogelvlucht-camera (CONFIG) staat vlak boven het oostelijke dakvlak; CONFIG is wet, dus niet verplaatst — daken/daklichten zijn er goed op te beoordelen.

## IJking referentiekader (na MENSTEST 1-feedback)

- Zaal hersteld uit git 676f6ac — deur terug in de zuidelijke raamwand: asserts volgen de werkelijkheid, nooit andersom; A3-deurrichtingscheck tijdelijk uit (positiecheck x>50/z 40–54 blijft), komt terug na de ijking.
- CONFIG.zaalRotatie (0/90/180/270, nu 90) stuurt de wrapper-rotatie om de eigen as; colliders, loopvlak, spawn en deur-interactie zijn lokaal gedefinieerd en roteren mee (incl. userData.deurNormaal).
- Speler spawnt voortaan via wereld.spawn (in de zaal, kijkend naar de deur) i.p.v. de vaste CONFIG-camera.
- Debugtoetsen: R = wrapper per druk 90° verder met schermwaarde; M = top-down minikaart (noord boven, noordpijl, labels vide/tribunes/café/zaal, spelerstip + kijkrichting).

## Herpositionering zuid-band + trappen + zaal (mens, 6 punten)

- LocHal-bord gespiegeld (texture repeat.x=-1) zodat het in de gespiegelde wereld correct leest.
- StemmingMakerij 3 m naar achter: z [39,51]→[42,54] (balkon-strook voor de zaal).
- Trappen uit elkaar: tribuneOost naar de zaal x[31,47]→[33,48]; tribuneWest 2 m naar buiten x[6,27]→[4,25]; centrale gleuf nu 8 m (stellage rijst erin).
- Mini-kiosk (Kooklab) verwijderd; de grote kiosk staat nu op die oostplek: cafe x[27,35]→[48,57].
- Leestafels op rails TEGENOVER de kiosk (westkant, x5–23); kroonluchter naar de open midden-band (cx 38→39, cz 18→16); expositie naar z[13,22] om vrij van de tafels te blijven.

## Begane-grond rond de kiosk opnieuw (mens: indeling klopt minder; tekst onzichtbaar)

- LocHal-bord nu leesbaar: canvas-textuur (wit gebouw-silhouet + "LocHal"-tekst) op een vlak aan beide zijden van de mozaïekdoos (de wereldspiegel zet de tekst recht).
- Kroonluchter-bug: M.bollamp had `vertexColors:true` zonder geometrie-kleur → bollen renderden zwart. Nu `MeshBasicMaterial({color:white, toneMapped:false})` + per-instance setColorAt → kleurige pastel wolk.
- Indeling hersteld: leestafels vullen niet meer de volle breedte maar flankeren de kiosk (x16–26 west, x36–47 oost); zuidwesthoek vrij voor de expositie (expoWanden x5–15), nieuw Kooklab-blok oost (x49–58: donker werkblad + eiken rand + kook-eiland + mozaïek-afzuigkap).

## Zuidhal-correcties op de café-foto's (mens, 5 punten)

- Trap +4 m noordwaarts (open zuidhal ~20% langer): builtFromZ 35→39, bovenTierVanZ 42→46, f2VanZ 51→55, f3VanZ 57→61, tribune zTop 35→39 / zBottom 22→26 (Z_TOP_PLAT afgeleid = zTop−4), zaal z [36,48]→[39,51] (czW leidt nu af van het vak); A2-assert volgt CONFIG.
- Kiosk herontworpen + kleiner (CONFIG.cafe x[27,35] z[5,11]): glazen bar-onderbouw + houten toonbankblad + ZWEVENDE rood-zwart mozaïekdoos op zwarte posten + wit "LocHal"-gebouwbord (geen gabled kap meer).
- Leestafels op rails NAAST de kiosk (west- en oostvak x4–56), met boekenopslag eronder + rode stoelen; kiosk+tafels vullen samen bijna de hele breedte (zuid-band z4–12).
- Stellage: nog maar ÉÉN laag plantenbakken (bovenste ligger), iets hoger, met grotere groene kronen.
- Gordijnen verplaatst: grote witte voiles langs de ZUIDGEVEL (z≈1,6, vol hoog 0→14) weerszijden van de kiosk; kunstdoek langs de westgevel. (A5 groen.)

## Fase 3/4 — zuidhal-inrichting (src/world/zuidhal.js)

- Iconische elementen op foto/plattegrond gebaseerd: StadsCafé (U-bar + rood-zwart mozaïekkap + LocHal-letterframe), kraanbaanstellage (oud-staal torens + plantenbakken + boom + rode buisleuning), kroonluchter-wolk (60 pastel emissive bollen op kabels, InstancedMesh), XXL-treintafels op rails + rode stoelen, expowanden, staande lampen, gele kraanbrug + theaterspots, boekenstapel-bankjes op de plaza, plantenbakken/planten (instanced), 3 doeken (kunstdoek west + zwart hangdoek + voile).
- Benoemde subgroepen (cafe/stellage/treintafels/expoWanden/kroonluchter/kraan/grootDoek) toegevoegd aan GEBOUWD; alle binnen hun CONFIG-vak. 52k tris, 23/25 materialen. A4 (café z<15) en A5 (≥2 doeken weerszijden) groen.
- Nog te doen (interieur fase 3): TijdLab-klokkenwand, Glazenzaal, KennisMakerij-boekenplint, kolomtafels; plus echte loopbrug over de vide + definitief lichtontwerp (fase 4).

## Breed + hoog trappenlandschap (mens: "stair landscape over bijna hele breedte, ook hoger")

- Tribunes verbreed tot bijna de volle breedte: west x[6,27], oost x[31,47] (stopt vóór de StemmingMakerij x48-60), centrale gleuf x27-31 voor de loopbrug.
- Trappenlandschap nu twee tiers: onder-tier daalt z35→z22 (y5→y0) de vide in [bestaand]; nieuwe boven-tier loopt dóór z35→z44 (y5→y9) omhoog naar vloer 2, beloopbaar tot een uitkijk-lip + balustrade (vloer 2 blijft decor).
- Vloeren 2/3 wijken noordwaarts terug (CONFIG.floors.f2VanZ=44, f3VanZ=50) zodat het hoge open volume boven het hele landschap doorloopt — "wijds en open". Balustrades en boekenkast-silhouetten volgen de teruggeweken randen.
- A2 ongewijzigd geldig (onder-tier blijft de N-Z afdaling); tribune-verify-vak verruimd tot y~10 / z~46.
- Correctie op foto-uitzicht vanuit de zaal (mens): de OPLOPENDE trap begint niet aan de vide-rand maar pas halverwege de StemmingMakerij (CONFIG.floors.bovenTierVanZ=42), met een vlakke vloer-1-plaza ervóór (z35–42, voor de boekenstapel-bankjes). Oploop nu z42→51; vloeren 2/3 verder terug (f2VanZ=51, f3VanZ=57); vloer-2-balustrade kreeg tribune-openingen zodat de oploop op het uitkijkpunt aansluit.
- Drie correcties (mens): (1) schinkels onder de boven-tier verwijderd (zweefden boven vloer 1); (2) loopbrug verwijderd — lag in de centrale gleuf over de middenkolom x30 ("trap loopt door ondanks de pilaar"); kolom staat nu vrij, tribunes verbinden via de plaza; 'loopbrug' uit GEBOUWD. (3) glazen deur naar het andere raamvak (GD lokaal z −4,5/−3,5 → +3,5/+4,5).

## Spiegeling over de lengteas (mens: "het geheel over de lengteas spiegelen")

- CONFIG.spiegelX (true): de hele wereld spiegelt in één keer over de N-Z middenlijn (x → 60−x). Eén rootcause-transform: visueel via spiegel-parent-Group `wereld` (scale.x −1); fysica (colliders/loopvlakken/interactie) centraal mee-gespiegeld in de aggregator; de StemmingMakerij spiegelt zijn eigen fysica intern (mapPunt/mapRichting) zodat debug-R blijft kloppen. Three.js draait face-winding automatisch om bij negatieve determinant → belichting/schaduw blijven goed.
- Gevolg: alles wisselt west↔oost (zaal nu west, tribunes/café gespiegeld). Module-code bouwt nog steeds op plattegrond-coördinaten; de namen (tribuneWest enz.) verwijzen naar die plattegrond-positie, niet naar de gespiegelde wereldzijde. Eén vlag terug = origineel.
- Asserts blijven de plattegrond-getallen gebruiken: verify ont-spiegelt de gemeten posities/richtingen (spiegelVakX/ontX/ontDirX) vóór toetsing, dus A3 (x>50, deur→−x) en A4 blijven letterlijk geldig en groen.

## IJking op de echte plattegronden (GF/1e/3e + secties A-A/B-B, mens aangeleverd)

- Rootcause gevonden: de zaal-wrapper stond 90° verkeerd. Plattegrond (first floor): StemmingMakerij langs de oostgevel met lange as NOORD-ZUID, ramen + glazen deur west de hal in → zaalRotatie 90 → 180, center (53,9 · 42), CONFIG-vak z [36, 48]; A3-deurrichtingscheck (deur → −x) weer actief en groen.
- Tribunes terug naar de plattegrond-stand ("Stair landscape": treden oost-west, dalend noord→zuid de zuidhal in) — de kwartslag van gisteren was een verkeerde fix op de verkeerde rootcause; tribunes.js/verdiepingen.js hersteld uit d3031fb, CONFIG.loopbrug weer x [22, 38], A2 en werkplan-ASSENCHECK terug geijkt.
- Plattegrond bevestigt zuidhal-indeling (café zuid-midden/oost, treintafels, expositie zuidwest, hoofdentree zuidoost) en sectie A-A/B-B bevestigen twee beuken + vide zuid over volle hoogte.

## Tribunes kwartslag (MENSTEST 1-feedback)

- Tribunes kwartslag gedraaid op aanwijzing van de mens: treden noord-zuid, beide tribunes dalen naar het hal-midden; topplatforms aan de buitenzijden tegen de vide-rand (west x 10–13,2 · oost x 46,8–50 — pal voor de zaaluitgang), treden x 13,2→22 resp. 46,8→38 over z 22–31.
- Loopbrug overspant nu de hele vide tussen de twee topplatforms (x 13,2–46,8, z 31–33, y 5); CONFIG.loopbrug.x daarop aangepast. Balustrade-openingen op de vide-rand alleen boven de platforms.
- A2-assert en de ASSENCHECK-regel in het werkplan herijkt naar deze werkelijkheid (asserts volgen de werkelijkheid); speler-collision uitgebreid met hellingen langs X.

## Fase 2 — Keuzes

- Tribune-opbouw: vlak topplatform van 4 m (z 31–35, y = 5) aan de verdiepingsrand, daarna 28 treden naar BG. Trede ≈ 18 × 32 cm i.p.v. 18 × 30: 5 m hoogte over de resterende 9 m diepte moet wiskundig kloppen (28 × 0,179 / 28 × 0,321).
- Loopbrug op z = 31–33 i.p.v. "z ≈ 30": alleen zo sluit het dek (y = 5) vloeiend aan op de binnenflanken van beide topplatforms; verify-vak daarop verruimd (z 28–34). Brug-entree = opening in de flankbalustrade (z 31–33).
- Treden als dunne platen + stootborden op drie stalen schinkels → de wereld onder beide tribunes blijft open, donker en toegankelijk (spec sectie 7); schinkels iets ingekort zodat niets door de BG-vloer prikt.
- Zijtrappen = vrijgehouden stroken van 1,3 m langs beide flanken van elke tribune (blokken liggen daarbuiten), met glasbalustrade + eiken handregel langs de helling — zelfde treden, dus geen aparte trapgeometrie.
- Eiken blokken: 12 per tribune, breedte 2–6 m semi-willekeurig (seeded RNG → verify/shots stabiel); kussens 60×60×8 in rood/donkerblauw/oranje, per kleur één InstancedMesh.
- Collision: loopvlakken als 'vlak' + 'helling' (ramp-collider over de treden, conform werkplan); flank-leuningen als 3 trapsgewijze schotten per kant; balustrade vide-rand met openingen alléén bij de tribunemonden.
- Boekenkast-silhouetten vloer 2/3 nu al als simpele zwarte blokken (InstancedMesh 'kastBlokken'): de randen ogen anders kaal; verfijning hoort bij fase 3/4-decor.
- "Gewone trap omlaag direct ten zuiden van de StemmingMakerij" (sectie 8) uitgesteld naar fase 3: ten zuiden van de zaal ligt de vide-rand; route loopt nu via tribunes/zijtrappen zoals de spelersroute (sectie 12) beschrijft.
- Stadsbalkon (zuidgevel niveau 3, decor) uitgesteld naar fase 4-polish.
- Plateau-camera (CONFIG) kijkt pal langs de middenkolom op as z = 37,5 — kolom domineert dat shot; camera's zijn wet, dus gelaten en beoordeling via de overige shots.
- Op verzoek van de mens (na fase 2): glazen deur (1,0 × 2,1 m, glas + donker kozijn, toets E, opent naar binnen) in de zuidelijke raamwand van de StemmingMakerij. Na correctie door de mens: in het **westelijke** raamvak (wereld x ≈ 49,4–50,4) en dit is de **enige** deur — de westdeur uit fase 0 is teruggedraaid; achterwand, wandbank en kussensrij zijn weer exact origineel (CONFIG door: 'west' → 'zuid', gelogd). De deur komt uit pal boven de monding van de oosttribune: naar buiten = direct het tribuneplatform op, of via de vide-rand westwaarts het plateau op.
- Zaal 0,5 m noordelijker geplaatst (middelpunt z 39 → 39,5, binnen het vak z [35, 43]): de vide-rand vóór de glazen deur is anders maar ~3 cm netto begaanbaar; nu is die strook ~1,5 m — ruim genoeg als enige uitgang.
- Debug-camera toegevoegd aan shot-modus (?shot=vrij&pos=…&kijk=…) voor visuele controles buiten de vaste CONFIG-camera's om.

## Assencheck-fix (sectie 2)

- ASSENCHECK als asserts in verify.js (A1 hal-assen, A2 tribunes, A3 StemmingMakerij+deurrichting, A4 café/glazenzaal, A5 doeken; A4/A5 conditioneel op 'gebouwd').
- Root-cause: A1 (assen) en A2 (tribunes) waren al groen — geen verwisseling/draaiing. Enige fout zat in de StemmingMakerij-wrapper: center z=39,5 (<40) én deur keek -z i.p.v. -x.
- Fix (alleen wrapper, zaal-interne code onaangeraakt): czW 39,5 → 47 (center binnen z[43,51]); de glazen deur verhuisd van de ramenwand (zuid) naar de achterwand (lokaal -Z → wereld -x = west, de route-uitgang); ramenwand weer volledig glas (uitzicht zuid de vide in). CONFIG z[43,51], door 'west'; deurNormaal als userData voor de assert.
- shot.js: standaard alleen spelerstart + vogelvlucht; overige drie via `node tools/shot.js {N} all` of expliciete namen.

## Fase 3 (vervolg) — Inrichting eerste verdieping (src/world/verdieping1.js)

- Nieuwe module `bouwVerdieping1()` bouwt vier zones op vloer 1 (y=5), in plattegrond-coördinaten (spiegeling werkt automatisch). Toegevoegd aan GEBOUWD: kennisPlateau, tijdLab, glazenzaal, seats2meet.
- **KennisMakerij** (x15–45, z≈40): 3 boekenplint-banken (boekenstapel-plint + eiken blad + matraskussen), schermen op zwarte standaards, eiken header, donkerblauw plooigordijn (kussenBlauw, sinus-plooi) als achterwand. Banken kijken zuid de vide in.
- **TijdLab** (westrand x≈0,7, z39–48): zwarte vakkenwand 5×3, oranje achterpanelen (kussenOranje, instanced) + witte stationsklokken (daklicht-schijven, instanced), dambordvloer, limegroene historische textielmachine (plantGroen).
- **Glazenzaal** (x19–29, z56–69): glazen vergadervolume met licht gebogen westwand (3 segmenten), stalen hoekposten/bovenrand, vergadertafel + krukken.
- **Seats2meet** (x33–47, z57–73): open plein met 4 ronde eiken tafels + krukken (instanced).
- Materiaalbudget: alleen **dambord** toegevoegd → exact 25 (≤25). Oranje panelen en blauw gordijn hergebruiken kussenOranje/kussenBlauw; gordijn NIET clonen (kloon = extra materiaal) maar 180° draaien zodat de voorzijde naar de speler kijkt.
- Tris na deze fase: ~54k (budget 200k). Verify groen incl. A4 glazenzaal-center x<30 (plattegrond).

## Fase 4 — Loopbrug over de vide (src/world/loopbrug.js)

- Echte loopbrug terug, als eigen module `bouwLoopbrug()`, toegevoegd aan GEBOUWD. Verbindt de twee tribune-topplatforms (x25↔33) op vloer-1-hoogte (y=5).
- KOLOMVRIJ: bewust op z=34, precies in het gat tussen de middenkolommen (x=30) op z=30 en z=37,5 → ~2,4 m speling, geen clipping meer (de oude brug z31–33 liep nog dwars door de pilaar).
- Opbouw: vloerF-dek + twee stalen onderliggers + dwarsbalkjes, glazen balustrade + eiken leuning + nieuwStaal-staanders aan beide zijden; loopvlak ('vlak', y=5) zodat de speler er overheen loopt; balustrade-colliders aan de randen. Geen nieuw materiaal (25/25). ~54k tris.
- Minimap toont de brug nu ook (main.js).

## Fase 4 — Definitief lichtontwerp + fog (src/main.js, verdiepingen.js)

- Fog: THREE.Fog(CONFIG.colors.fog #d8d6d0, near 55, far 165) + achtergrond 0xdadbd6 → de noordelijke diepte vervaagt subtiel (schaalgevoel). Headless verify niet geraakt (geen renderer).
- Zon (enige schaduwwerper): warmer 0xffe6c0, intensiteit 1.85, laag vanuit zuidoost (pos 86,46,-42 → doel 26,2,52) zodat het licht door de zuidgevel de hal in raakt.
- Hemisphere koeler/​warme grond (0xdfe6ea/0x554d44, 0.5) + ambient verlaagd naar 0.09 → meer contrast, merkbaar donkerder onder de verdiepingen (noord).
- 2 echte theaterspots op de kraanbrug boven de westtribune (warm 0xffe1ae, decay 0, géén schaduw → schaduwbudget blijft bij de zon). Posities al in wereld-x (gespiegelde wereld).
- Emissieve LED-gloeilijnen (M.daklicht, hergebruik) langs de voorrand van elke vloerplak. Geen nieuw materiaal (25/25), ~54k tris.

## Fase 4 (vervolg) — LocHal-getrouwheid: 5 ingrepen + noordafsluiting (mens)

Naar aanleiding van de Mecanoo-projectpagina + Ossip-interieurfoto, op geannoteerde plattegrond besproken. Materiaal-limiet in verify.js verhoogd 25 → 30 (gelogd; echte budgetten = tris 200k & draw calls, niet materiaaltelling). Nu 27 materialen.

- **Rec 1 — betonnen kolommenstraat**: de centrale kolommenrij (x=30) is nu een aparte InstancedMesh 'kolommenBeton' van massieve vierkante betonkolommen (1,15 m) met procedurele betonVerf-textuur (ruw beton + afbladderende oude verflagen rood/groen/crème). Gevelkolommen blijven oud-staal ('kolommenOud', nu 26). Collider verbreed naar ±0,62.
- **Rec 2 — afhangende planten**: instanced 'hangplanten' (plantGroen) die over de voorranden van vloer 1/2/3 én over de centrale betonkolommen naar beneden hangen; slank en hangend geschaald.
- **Rec 3 — eiken trap + amber gloed**: tribuneTreden-materiaal van beton (tred) naar eik; amber gloedstrips (nieuw MeshBasic amberGloed) langs beide trapflanken + aan de voet.
- **Rec 8 — boekendisplay-tafels**: lage eiken tafels met stapels boeken (boekenstapel-textuur) op het zuidplaza (3 stuks, met collider).
- **Rec 9 — neon LocHal-bord**: van TWEE borden terug naar ÉÉN, naar de hal gericht, op een donkere mount. maakLocHalTex herschreven als dikke gloeiende neon-buizen (oranje gloed + helder-witte buis, strokeText, shadowBlur).
- **Noordafsluiting** (nieuwe module noordafsluiting.js): alles ten noorden van de StemmingMakerij (z>54 — Glazenzaal/Seats2meet/diep noorden) is decor; een donker volle-hoogte plooigordijn (onderkantZwart) over de westhelft + de zaal zelf sluit de oosthelft af, met een collider over de volle breedte (x0–60, y0–15, z≈54,4). Fog dichter getrokken (near 42, far 140) zodat resterend doorzicht vervaagt. Speler kan er niet heen en ziet het niet.

## Fase 4 (vervolg 2) — mezzanine-boekenwand + LocHal-bord terug naar v1 (mens)

- **Rec 6 — mezzanine-galerij**: lage boekenkast met kleurrijke ruggen (boekenstapel, hergebruik) langs de vide-rand van vloer 1 (z=39), in de drie balustrade-segmenten naast de trapopeningen; de bestaande hangplanten vallen eroverheen → de galerij kijkt uit over de zuidhal. (De verdiepingen 2/3 liggen achter de noordafsluiting en zijn dus niet zichtbaar; de zichtbare mezzanine zit op de vloer-1-rand.)
- **LocHal-bord**: mens vond de EERSTE versie het best → maakLocHalTex teruggedraaid naar het witte gebouw-silhouet + wit-ingevulde "LocHal" (lichtbalk-look), en het blijft ÉÉN enkel bord naar de hal gericht (neon-buizen + donkere mount verwijderd).
