// LocHal — HOLOGRAM-karakter. Een (Star-Wars-achtige) videohologram van een
// pratend persoon, als billboard in de hal. De video staat in de projecthoofdmap
// (hologram.mp4). Een .mp4 draagt in de browser GEEN alpha-kanaal, dus de donkere
// achtergrond van de clip wordt in de shader weg-gekeyd (luma-key): donkere pixels
// worden doorzichtig, de rest krijgt de holografische look (cyaan, scanlines,
// flikker, transparant).
//
// Het vlak draait elk frame mee met de speler (billboard, alleen om de Y-as),
// zodat je altijd 100% de voorkant ziet. Het staat naast de climax-TV bij de bar.
//
// LET OP: dit object hoort NIET onder de gespiegelde wereld-Group; het wordt
// direct aan de scene gehangen en in echte wereld-coördinaten geplaatst, zodat de
// billboard-wiskunde klopt.
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
// Regelbare waarden
// ─────────────────────────────────────────────────────────────────────────
export const HOLO = {
  bestand: 'hologram4.mp4',                      // videopad (projecthoofdmap)
  positie: new THREE.Vector3(10.0, 0.0, 15.0),   // wereld-coördinaten, op de vloer naast de bar/TV (verder van de zuil/gevel af dan voorheen)
  hoogte: 19.25,                                 // hoogte van de figuur (m); breedte volgt uit de video-aspect (iets kleiner: blijft onder de dakspanten)
  zweef: 0.12,                                   // hoe ver de figuur boven de voet zweeft (m)
  verschuifY: -6.4,                              // extra verticale verschuiving van het vlak (m); negatief = omlaag (persoon zit hoog in dit videokader)
  kleur: 0x6fd2ff,                               // holografische tint (cyaan-blauw)
  tintKracht: 0.42,                              // 0 = originele kleuren, 1 = volledig getint
  keyLaag: 0.08,                                 // luma waaronder pixels volledig doorzichtig zijn (achtergrond weg)
  keyHoog: 0.20,                                 // luma waarboven pixels volledig zichtbaar zijn
  scanDichtheid: 620.0,                          // aantal scanlijnen over de hoogte
  scanSnelheid: 5.0,                             // hoe snel de scanlijnen omhoog rollen
  flikker: 0.10,                                 // sterkte van de subtiele helderheidsflikker (0–1)
  wobbelBasis: 0.0016,                           // horizontale hologram-wobbel tijdens afspelen
  wobbelPauze: 0.006,                            // extra wobbel wanneer gepauzeerd (gepauzeerd star-wars-hologram)
  opaciteit: 0.92,                               // algehele doorzichtigheid van de figuur
  voetStraal: 0.55,                              // straal van de gloeiende projectorvoet (m)
  lichtKracht: 1.4,                              // intensiteit van het cyaan sfeerlicht aan de voet
  geluid: true,                                  // true = de stem van het hologram hoorbaar
  geluidNabij: 5.0,                              // volle stem binnen deze afstand (m)
  geluidVer: 40.0,                               // stem onhoorbaar vanaf deze afstand (m)
  geluidVersterking: 2.4,                        // WebAudio-gain (>1 = luider dan normaal, ook dichtbij)
};

// ─────────────────────────────────────────────────────────────────────────
// Opbouw
// ─────────────────────────────────────────────────────────────────────────
export function bouwHologram(scene) {
  if (typeof document === 'undefined') return {
    groep: new THREE.Group(), update() {}, speelAf() {}, pauzeer() {}, hervat() {},
    terugNaarPauze() {}, preload() {}, tijd: () => 0, duur: () => 0, speeltAf: () => false, isKlaar: () => false,
    _debug: () => ({}),
  };

  const groep = new THREE.Group();
  groep.name = 'hologram';
  groep.position.copy(HOLO.positie);
  scene.add(groep);

  // ── Video-element + textuur ──────────────────────────────────────────────
  // LUI LADEN: geen .src bij opbouw, dus geen netwerkverzoek totdat preload()
  // wordt aangeroepen (main.js doet dit zodra de speler start — er is dan nog
  // volop tijd tot het hologram in de sequentie nodig is). Start uiteindelijk
  // GEPAUZEERD (op frame 0); de sequentie in main.js bepaalt afspelen/pauzeren.
  // De shader blijft altijd shimmeren (scanlijnen, flikker, wobbel) zodat een
  // gepauzeerd hologram tóch leeft.
  const video = document.createElement('video');
  video.loop = false;            // niet loopen; na afloop terug naar de pauzestand
  video.muted = true;            // muted = autoplay/decoderen toegestaan
  video.playsInline = true;
  video.preload = 'none';        // pas laden na expliciete preload()-aanroep
  video.setAttribute('playsinline', '');
  let geladen = false;
  function preload() {
    if (geladen) return;
    geladen = true;
    video.preload = 'auto';
    video.src = HOLO.bestand;
    video.load();
    // audiograaf hier opzetten (i.p.v. pas bij speelAf(), veel later, zonder
    // directe gebruikersactie) — preload() wordt vlak bij een echte klik/tik
    // aangeroepen, wat de AudioContext betrouwbaar laat starten.
    _zetVersterking();
    _hervatAudioCtx();
  }

  let staat = 'laden';           // 'laden' | 'pauze' | 'speelt'
  let klaar = false;             // true zodra de video één keer helemaal is afgespeeld
  // decodeer één frame en pauzeer meteen → een zichtbare gepauzeerde figuur
  let eersteFrame = false;
  function pauzeerOpEersteFrame() {
    if (eersteFrame) return; eersteFrame = true;
    video.pause(); staat = 'pauze';        // currentTime blijft ~0 (frame 0 zichtbaar)
  }
  video.addEventListener('loadeddata', () => {
    video.play().then(() => {
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(() => pauzeerOpEersteFrame());
      else setTimeout(pauzeerOpEersteFrame, 60);
    }).catch(() => { staat = 'pauze'; });
  });
  // na afloop: NIET opnieuw spelen, terug naar de pauzestand vóór het begin
  video.addEventListener('ended', () => {
    video.pause(); try { video.currentTime = 0; } catch (_) {}
    staat = 'pauze'; klaar = true;
  });

  // WebAudio-versterking: routeer de videostem door een GainNode (>1 = luider).
  // LET OP: zodra createMediaElementSource() draait, heeft video.volume géén
  // effect meer op wat je hoort — het afstandsvolume moet daarna via
  // gainNode.gain lopen (zie update() hieronder), niet via video.volume.
  let audioCtx = null, gainNode = null, mediaBron = null;
  function _zetVersterking() {
    if (mediaBron || !HOLO.geluid) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      mediaBron = audioCtx.createMediaElementSource(video);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;   // update() zet de echte waarde (versterking × afstand)
      mediaBron.connect(gainNode).connect(audioCtx.destination);
    } catch (_) { audioCtx = null; }
  }
  function _hervatAudioCtx() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }
  // vangnet: als de AudioContext bij het opzetten toch 'suspended' bleef
  // (afhankelijk van browser/host), probeer het bij de eerstvolgende
  // gebruikersactie opnieuw.
  if (typeof window !== 'undefined') {
    const retryHervat = () => _hervatAudioCtx();
    window.addEventListener('click', retryHervat);
    window.addEventListener('touchstart', retryHervat, { passive: true });
    window.addEventListener('keydown', retryHervat);
  }

  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // ── Holografisch vlak (billboard) ────────────────────────────────────────
  const breedteRaming = HOLO.hoogte * 0.56;   // voorlopige aspect (portret); klopt zich bij na laden
  const geo = new THREE.PlaneGeometry(breedteRaming, HOLO.hoogte);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTex: { value: tex },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(HOLO.kleur) },
      uTint: { value: HOLO.tintKracht },
      uKeyLo: { value: HOLO.keyLaag },
      uKeyHi: { value: HOLO.keyHoog },
      uScanD: { value: HOLO.scanDichtheid },
      uScanS: { value: HOLO.scanSnelheid },
      uFlik: { value: HOLO.flikker },
      uOpacity: { value: HOLO.opaciteit },
      uWobbel: { value: HOLO.wobbelBasis },   // huidige horizontale wobbel (main.js/staat past aan)
      uPauze: { value: 1.0 },                 // 1 = gepauzeerd (extra flikker), 0 = speelt
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform float uTime;
      uniform vec3 uColor; uniform float uTint;
      uniform float uKeyLo; uniform float uKeyHi;
      uniform float uScanD; uniform float uScanS; uniform float uFlik; uniform float uOpacity;
      uniform float uWobbel; uniform float uPauze;
      varying vec2 vUv;
      void main(){
        // horizontale hologram-wobbel (sterker in pauze) — verschuift de bemonstering
        vec2 uv = vUv;
        uv.x += sin(vUv.y * 26.0 + uTime * 3.0) * uWobbel
              + sin(vUv.y * 90.0 - uTime * 7.0) * uWobbel * 0.4;
        vec4 t = texture2D(uTex, uv);
        float luma = dot(t.rgb, vec3(0.299, 0.587, 0.114));
        // luma-key: donkere achtergrond → doorzichtig
        float a = smoothstep(uKeyLo, uKeyHi, luma);
        if (a < 0.02) discard;
        // holografische tint over de originele kleuren
        vec3 col = mix(t.rgb, uColor * (0.5 + luma), uTint);
        // scanlijnen die omhoog rollen
        float scan = 0.5 + 0.5 * sin(vUv.y * uScanD - uTime * uScanS);
        col *= 0.78 + 0.22 * scan;
        // subtiele helderheidsflikker (extra tijdens pauze)
        col *= 1.0 - (uFlik + uPauze * 0.10) * (0.5 + 0.5 * sin(uTime * 38.0) * sin(uTime * 11.0));
        // brede interferentieband die langzaam over de figuur trekt
        float band = 1.0 - smoothstep(0.0, 0.05, abs(fract(vUv.y * 2.0 - uTime * 0.25) - 0.5));
        col += uColor * 0.12 * band;
        gl_FragColor = vec4(col, a * uOpacity);
      }`,
  });
  const vlak = new THREE.Mesh(geo, mat);
  vlak.position.y = HOLO.zweef + HOLO.hoogte / 2 + HOLO.verschuifY;
  vlak.frustumCulled = false;
  vlak.name = 'hologramVlak';
  groep.add(vlak);

  // aspect bijstellen zodra de echte videoafmetingen bekend zijn
  video.addEventListener('loadedmetadata', () => {
    if (video.videoWidth && video.videoHeight) {
      const breedte = HOLO.hoogte * (video.videoWidth / video.videoHeight);
      vlak.geometry.dispose();
      vlak.geometry = new THREE.PlaneGeometry(breedte, HOLO.hoogte);
      vlak.position.y = HOLO.zweef + HOLO.hoogte / 2 + HOLO.verschuifY;
    }
  });

  // ── Projectorvoet: gloeiende cyaan schijf + ringen op de vloer ───────────
  const voetMat = new THREE.MeshBasicMaterial({
    color: HOLO.kleur, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const voet = new THREE.Mesh(new THREE.CircleGeometry(HOLO.voetStraal, 32), voetMat);
  voet.rotation.x = -Math.PI / 2;
  voet.position.y = 0.02;
  groep.add(voet);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(HOLO.voetStraal * 1.15, HOLO.voetStraal * 1.3, 40),
    new THREE.MeshBasicMaterial({ color: HOLO.kleur, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  groep.add(ring);

  // zacht cyaan sfeerlicht aan de voet (geen schaduw — schaduwbudget zit op de zon)
  const licht = new THREE.PointLight(HOLO.kleur, HOLO.lichtKracht, 6, 2);
  licht.position.set(0, 0.6, 0);
  licht.castShadow = false;
  groep.add(licht);

  // ── Afspeel-API (aangestuurd door de sequentie in main.js) ───────────────
  function speelAf() {                          // start van frame 0 met (versterkt) geluid
    preload();                                  // vangnet: zorg dat er iets te spelen valt (zet ook de audiograaf op)
    try { video.currentTime = 0; } catch (_) {}
    video.muted = !HOLO.geluid;
    klaar = false; staat = 'speelt';
    _hervatAudioCtx();                          // extra vangnet, mocht 'suspended' nog niet opgelost zijn
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
  }
  function pauzeer() { video.pause(); staat = 'pauze'; }   // vriezen (shader blijft shimmeren)
  function hervat() { staat = 'speelt'; video.play().catch(() => {}); }
  function terugNaarPauze() { video.pause(); try { video.currentTime = 0; } catch (_) {} staat = 'pauze'; }
  const tijdVan = () => video.currentTime || 0;
  const duurVan = () => (isFinite(video.duration) ? video.duration : 0);
  const speeltAf = () => staat === 'speelt' && !video.paused;
  const isKlaar = () => klaar;

  // ── Per-frame: billboard (alleen yaw) + shaderklok + ringpuls ────────────
  let tijd = 0;
  function update(camera, dt = 0) {
    tijd += dt;
    mat.uniforms.uTime.value = tijd;
    // wobbel + flikker sterker wanneer gepauzeerd
    const gepauzeerd = staat !== 'speelt';
    mat.uniforms.uPauze.value = gepauzeerd ? 1.0 : 0.0;
    mat.uniforms.uWobbel.value = gepauzeerd ? HOLO.wobbelPauze : HOLO.wobbelBasis;
    if (camera) {
      const dx = camera.position.x - groep.position.x;
      const dz = camera.position.z - groep.position.z;
      vlak.rotation.y = Math.atan2(dx, dz);     // vlak (+z) wijst naar de speler
      // stem-volume zakt met de afstand tot het hologram; loopt via de
      // gain-node zodra die bestaat (video.volume heeft dan geen effect meer)
      const dy = camera.position.y - groep.position.y;
      const dist = Math.hypot(dx, dy, dz);
      const afstandsfactor = Math.max(0, Math.min(1, 1 - (dist - HOLO.geluidNabij) / (HOLO.geluidVer - HOLO.geluidNabij)));
      if (gainNode) gainNode.gain.value = HOLO.geluidVersterking * afstandsfactor;
      else video.volume = afstandsfactor;   // vangnet: geen WebAudio beschikbaar
    }
    // lichte pulsatie in de voetgloed
    const puls = 0.5 + 0.18 * Math.sin(tijd * 2.2);
    voetMat.opacity = 0.42 + 0.18 * puls;
    licht.intensity = HOLO.lichtKracht * (0.85 + 0.15 * Math.sin(tijd * 2.2));
  }

  return { groep, update, speelAf, pauzeer, hervat, terugNaarPauze, preload,
           tijd: tijdVan, duur: duurVan, speeltAf, isKlaar,
           _debug: () => ({ audioStaat: audioCtx ? audioCtx.state : 'geen audioCtx',
                             gainWaarde: gainNode ? +gainNode.gain.value.toFixed(2) : null,
                             videoMuted: video.muted, videoVolume: +video.volume.toFixed(2) }) };
}
