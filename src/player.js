// Speler-controller — hergebruikt de bestaande StemmingMakerij-besturing
// (pointer-lock muiskijken + WASD/pijltjes, Euler 'YXZ' met pitch-begrenzing),
// uitgebreid met een collision-laag: AABB-muren, loopvlakken (vlak + helling),
// traptreden via opstaphoogte, zwaartekracht en E-interactie.
import * as THREE from 'three';
import { CONFIG } from './config.js';

const OPSTAP = 0.55;      // maximale traptrede/opstap (m)
const ZWAARTEKRACHT = 18; // m/s²
const RADIUS = 0.32;      // botscirkel van de speler (m)

export class Speler {
  constructor(camera, dom, wereld, opties = {}) {
    this.camera = camera;
    this.wereld = wereld;           // { colliders, surfaces, interactables }
    this.hoogte = CONFIG.player.hoogte;
    this.snelheid = CONFIG.player.loopsnelheid;
    this.mobiel = !!opties.mobiel;  // true = touch-besturing (geen pointer-lock/toetsenbord)
    this.mobielBeweging = { x: 0, z: 0 };  // genormaliseerd (-1..1): x=zijwaarts, z=voorwaarts (van de virtuele joystick)

    // Spawn: uit de wereld (StemmingMakerij, roteert mee met zaalRotatie);
    // anders terugvallen op de CONFIG-camera.
    const [pos, kijk] = CONFIG.cameras.spelerstart;
    this.voeten = wereld.spawn
      ? new THREE.Vector3(wereld.spawn.pos[0], 0, wereld.spawn.pos[2])
      : new THREE.Vector3(pos[0], 0, pos[2]);
    this.voeten.y = this._grondHoogte(this.voeten.x, this.voeten.z, 99);
    this.vy = 0;

    // Kijkrichting bijhouden via Euler (origineel uit de StemmingMakerij)
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    if (wereld.spawn) {
      this.euler.y = wereld.spawn.yaw;
    } else {
      const dx = kijk[0] - pos[0], dz = kijk[2] - pos[2];
      this.euler.y = Math.atan2(-dx, -dz);
    }
    camera.quaternion.setFromEuler(this.euler);

    this.vergrendeld = false;
    this.toetsen = {};
    this._richting = new THREE.Vector3();
    this._zijwaarts = new THREE.Vector3();

    if (this.mobiel) {
      // Geen pointer-lock/toetsenbord op een telefoon — main.js roept begin()
      // aan zodra de speler op de starttik-overlay tikt, en voedt kijken/
      // bewegen via kijkDelta()/zetBeweging() vanuit de touch-besturing.
      return;
    }

    dom.addEventListener('click', () => dom.requestPointerLock());
    document.addEventListener('pointerlockchange', () => {
      this.vergrendeld = document.pointerLockElement === dom;
      document.body.classList.toggle('spelend', this.vergrendeld);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.vergrendeld) return;
      const gevoeligheid = 0.002;
      this.euler.y -= e.movementX * gevoeligheid;
      this.euler.x -= e.movementY * gevoeligheid;
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
      camera.quaternion.setFromEuler(this.euler);
    });
    document.addEventListener('keydown', (e) => {
      this.toetsen[e.code] = true;
      if (e.code === 'KeyE' && this.vergrendeld) this._interactie();
    });
    document.addEventListener('keyup', (e) => { this.toetsen[e.code] = false; });
  }

  // ── Touch-besturing (aangeroepen vanuit main.js) ─────────────────────────
  begin() {                          // start de besturing (na de starttik-overlay)
    this.vergrendeld = true;
    document.body.classList.add('spelend');
  }
  kijkDelta(dx, dy) {                // swipe-gebaseerd kijken (equivalent van mousemove)
    const gevoeligheid = 0.0034;     // iets gevoeliger dan de muis: schermswipes zijn kleiner
    this.euler.y -= dx * gevoeligheid;
    this.euler.x -= dy * gevoeligheid;
    this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }
  zetBeweging(x, z) {                // joystick-vector (-1..1), x=zijwaarts, z=voorwaarts
    this.mobielBeweging.x = x;
    this.mobielBeweging.z = z;
  }
  interactie() { this._interactie(); }   // publieke ingang voor de touch-interactieknop

  _interactie() {
    for (const it of this.wereld.interactables) {
      const d = Math.hypot(it.x - this.voeten.x, it.z - this.voeten.z);
      if (d <= it.radius) { it.onInteract(); return; }
    }
  }

  hintTekst() {
    if (!this.vergrendeld) return '';
    for (const it of this.wereld.interactables) {
      const d = Math.hypot(it.x - this.voeten.x, it.z - this.voeten.z);
      if (d <= it.radius) return typeof it.label === 'function' ? it.label() : it.label;
    }
    return '';
  }

  // Hoogte van een loopvlak op (x, z); 'vlak', 'helling' (lineair in z)
  // of 'hellingX' (lineair in x).
  _vlakHoogte(s, x, z) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return -Infinity;
    if (s.kind === 'helling') {
      const t = (z - s.z0) / (s.z1 - s.z0);
      return s.yBijZ0 + (s.yBijZ1 - s.yBijZ0) * t;
    }
    if (s.kind === 'hellingX') {
      const t = (x - s.x0) / (s.x1 - s.x0);
      return s.yBijX0 + (s.yBijX1 - s.yBijX0) * t;
    }
    return s.y;
  }

  // Hoogste loopvlak dat vanaf voethoogte 'voetY' bereikbaar is (opstap-regel).
  _grondHoogte(x, z, voetY) {
    let beste = -Infinity;
    for (const s of this.wereld.surfaces) {
      const h = this._vlakHoogte(s, x, z);
      if (h > beste && h <= voetY + OPSTAP) beste = h;
    }
    return beste === -Infinity ? 0 : beste;
  }

  _botsHorizontaal(p) {
    for (let pas = 0; pas < 3; pas++) {
      let geduwd = false;
      for (const c of this.wereld.colliders) {
        if (c.actief === false) continue;
        if (p.x < c.x0 - RADIUS || p.x > c.x1 + RADIUS) continue;
        if (p.z < c.z0 - RADIUS || p.z > c.z1 + RADIUS) continue;
        // verticale overlap: muur telt als hij tussen knie en hoofd zit
        if (p.y + this.hoogte <= c.y0 + 0.25 || p.y + OPSTAP >= c.y1) continue;
        const duwLinks = (c.x0 - RADIUS) - p.x;   // negatief
        const duwRechts = (c.x1 + RADIUS) - p.x;  // positief
        const duwZuid = (c.z0 - RADIUS) - p.z;
        const duwNoord = (c.z1 + RADIUS) - p.z;
        const dx = Math.abs(duwLinks) < Math.abs(duwRechts) ? duwLinks : duwRechts;
        const dz = Math.abs(duwZuid) < Math.abs(duwNoord) ? duwZuid : duwNoord;
        if (Math.abs(dx) < Math.abs(dz)) p.x += dx; else p.z += dz;
        geduwd = true;
      }
      if (!geduwd) break;
    }
  }

  update(dt) {
    if (this.vergrendeld) {
      // Voorwaartse richting (horizontaal) — origineel bewegingsmodel
      this.camera.getWorldDirection(this._richting);
      this._richting.y = 0;
      this._richting.normalize();
      this._zijwaarts.crossVectors(this._richting, this.camera.up).normalize();

      const beweging = new THREE.Vector3();
      if (this.mobiel) {
        const m = this.mobielBeweging;
        beweging.addScaledVector(this._richting, m.z * this.snelheid * dt);
        beweging.addScaledVector(this._zijwaarts, m.x * this.snelheid * dt);
      } else {
        const t = this.toetsen;
        if (t['KeyW'] || t['ArrowUp'])    beweging.addScaledVector(this._richting,  this.snelheid * dt);
        if (t['KeyS'] || t['ArrowDown'])  beweging.addScaledVector(this._richting, -this.snelheid * dt);
        if (t['KeyA'] || t['ArrowLeft'])  beweging.addScaledVector(this._zijwaarts, -this.snelheid * dt);
        if (t['KeyD'] || t['ArrowRight']) beweging.addScaledVector(this._zijwaarts,  this.snelheid * dt);
      }

      this.voeten.x += beweging.x;
      this.voeten.z += beweging.z;
      // binnen de hal blijven
      this.voeten.x = Math.max(0.4, Math.min(59.6, this.voeten.x));
      this.voeten.z = Math.max(0.4, Math.min(89.6, this.voeten.z));
      this._botsHorizontaal(this.voeten);
    }

    // Zwaartekracht + grond volgen (treden tot OPSTAP stap je direct op)
    const grond = this._grondHoogte(this.voeten.x, this.voeten.z, this.voeten.y);
    if (this.voeten.y <= grond + 0.02) {
      this.voeten.y = grond;
      this.vy = 0;
    } else {
      this.vy -= ZWAARTEKRACHT * dt;
      this.voeten.y = Math.max(grond, this.voeten.y + this.vy * dt);
    }

    this.camera.position.set(this.voeten.x, this.voeten.y + this.hoogte, this.voeten.z);
  }
}
