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
  positie: new THREE.Vector3(4.0, 0.0, 15.0),    // wereld-coördinaten, op de vloer naast de bar/TV
  hoogte: 11.0,                                  // hoogte van de figuur (m); breedte volgt uit de video-aspect
  zweef: 0.12,                                   // hoe ver de figuur boven de voet zweeft (m)
  verschuifY: -4.2,                              // extra verticale verschuiving van het vlak (m); negatief = omlaag (persoon zit hoog in dit videokader)
  kleur: 0x6fd2ff,                               // holografische tint (cyaan-blauw)
  tintKracht: 0.42,                              // 0 = originele kleuren, 1 = volledig getint
  keyLaag: 0.08,                                 // luma waaronder pixels volledig doorzichtig zijn (achtergrond weg)
  keyHoog: 0.20,                                 // luma waarboven pixels volledig zichtbaar zijn
  scanDichtheid: 620.0,                          // aantal scanlijnen over de hoogte
  scanSnelheid: 5.0,                             // hoe snel de scanlijnen omhoog rollen
  flikker: 0.10,                                 // sterkte van de subtiele helderheidsflikker (0–1)
  opaciteit: 0.92,                               // algehele doorzichtigheid van de figuur
  voetStraal: 0.55,                              // straal van de gloeiende projectorvoet (m)
  lichtKracht: 1.4,                              // intensiteit van het cyaan sfeerlicht aan de voet
  geluid: true,                                  // true = de stem van het hologram hoorbaar (ontgrendelt bij eerste klik)
};

// ─────────────────────────────────────────────────────────────────────────
// Opbouw
// ─────────────────────────────────────────────────────────────────────────
export function bouwHologram(scene) {
  if (typeof document === 'undefined') return { groep: new THREE.Group(), update() {} };

  const groep = new THREE.Group();
  groep.name = 'hologram';
  groep.position.copy(HOLO.positie);
  scene.add(groep);

  // ── Video-element + textuur ──────────────────────────────────────────────
  const video = document.createElement('video');
  video.src = HOLO.bestand;
  video.loop = true;
  video.muted = true;            // muted = autoplay is toegestaan door de browser
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.setAttribute('playsinline', '');
  video.play().catch(() => {});  // negeer autoplay-afwijzing; we proberen het opnieuw bij interactie

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
      varying vec2 vUv;
      void main(){
        vec4 t = texture2D(uTex, vUv);
        float luma = dot(t.rgb, vec3(0.299, 0.587, 0.114));
        // luma-key: donkere achtergrond → doorzichtig
        float a = smoothstep(uKeyLo, uKeyHi, luma);
        if (a < 0.02) discard;
        // holografische tint over de originele kleuren
        vec3 col = mix(t.rgb, uColor * (0.5 + luma), uTint);
        // scanlijnen die omhoog rollen
        float scan = 0.5 + 0.5 * sin(vUv.y * uScanD - uTime * uScanS);
        col *= 0.78 + 0.22 * scan;
        // subtiele helderheidsflikker
        col *= 1.0 - uFlik * (0.5 + 0.5 * sin(uTime * 38.0) * sin(uTime * 11.0));
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

  // ── Geluid ontgrendelen bij de eerste gebruikersinteractie ───────────────
  function ontgrendel() {
    if (HOLO.geluid) video.muted = false;
    video.play().catch(() => {});
    window.removeEventListener('click', ontgrendel);
    window.removeEventListener('keydown', ontgrendel);
  }
  window.addEventListener('click', ontgrendel);
  window.addEventListener('keydown', ontgrendel);

  // ── Per-frame: billboard (alleen yaw) + shaderklok + ringpuls ────────────
  let tijd = 0;
  function update(camera, dt = 0) {
    tijd += dt;
    mat.uniforms.uTime.value = tijd;
    if (camera) {
      const dx = camera.position.x - groep.position.x;
      const dz = camera.position.z - groep.position.z;
      vlak.rotation.y = Math.atan2(dx, dz);     // vlak (+z) wijst naar de speler
    }
    // lichte pulsatie in de voetgloed
    const puls = 0.5 + 0.18 * Math.sin(tijd * 2.2);
    voetMat.opacity = 0.42 + 0.18 * puls;
    licht.intensity = HOLO.lichtKracht * (0.85 + 0.15 * Math.sin(tijd * 2.2));
  }

  return { groep, update };
}
