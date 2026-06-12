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

(volgt)

## Fase 2 — Keuzes

(volgt)
