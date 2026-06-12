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
