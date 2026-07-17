// LocHal — audio-laag voor de climax-keten.
// Eén AudioContext, aangemaakt op de E-druk op de StemmingMakerij-deur (dat is
// de eerste gebruikersinteractie). Alle .mp3-bestanden staan in de projecthoofdmap (/).
//
// Exports: initAudio, onDeurGeopend, speelGeluid,
//          audioChimes, audioNacht, audioKlik, audioKlaar

// ── GELUIDEN-configuratie ────────────────────────────────────────────────────
const GELUIDEN = {
  achtergrond: { pad: 'Achtergrond.mp3', volume: 1.1  }, // sfeerloop, loopt de hele ervaring
  chimes:      { pad: 'Chimes.mp3',      volume: 0.65 }, // sprankels bij de start van de lampenspiraal
  nacht:       { pad: 'nacht.mp3',       volume: 0.72 }, // omslaggeluid bij het begin van de dag→nacht-overgang
  klik:        { pad: 'klik.mp3',        volume: 0.42 }, // toetsaanslag in het bordinvoerveld (per aanslag nieuw)
  klaar:       { pad: 'klaar.mp3',       volume: 0.80 }, // bevestigingsgeluid bij het verzenden via het bord
};

// ── Interne staat ─────────────────────────────────────────────────────────────
let ctx = null;                  // AudioContext (aangemaakt bij onDeurGeopend)
const buffers = {};              // naam → AudioBuffer (voorgeladen)
let gemut = false;               // globale mute-staat
let achtergrondBron = null;      // { bron, gain } van de lopende achtergrondlus
let achtergrondGestart = false;  // nooit herstarten, ook niet bij herbezoek deur
let laadBelofte = null;          // Promise die resolves als alle bestanden geladen zijn

// per-doorloop eenmalig-vlaggen
let chimesGespeeld = false;
let nachtGespeeld = false;

// ── Init ──────────────────────────────────────────────────────────────────────
// Maakt de mute-knop aan. Aanroepen zodra de DOM beschikbaar is.
export function initAudio() {
  if (typeof document === 'undefined') return;
  _maakMuteKnop();
}

// ── Deur geopend = eerste gebruikersinteractie ────────────────────────────────
// Ontgrendelt de AudioContext en start de achtergrondlus (eenmalig).
export async function onDeurGeopend() {
  if (achtergrondGestart) return;
  achtergrondGestart = true;

  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  // laad alle bestanden parallel (na aanmaken van de context)
  await _laadAlles();
  _startAchtergrond();
}

// ── Speelhulper ───────────────────────────────────────────────────────────────
// Elke aanroep maakt een nieuwe AudioBufferSourceNode → snel typen hapert niet.
export function speelGeluid(naam, { volume } = {}) {
  if (!ctx || !buffers[naam] || gemut) return null;
  const cfg = GELUIDEN[naam];
  const bron = ctx.createBufferSource();
  bron.buffer = buffers[naam];
  const gain = ctx.createGain();
  gain.gain.value = volume ?? cfg.volume ?? 0.5;
  bron.connect(gain).connect(ctx.destination);
  bron.start();
  return { bron, gain };
}

// ── Moment-triggers (met eenmalig-guard) ─────────────────────────────────────
export function audioChimes() {
  if (chimesGespeeld) return;
  chimesGespeeld = true;
  speelGeluid('chimes');
}

export function audioNacht() {
  if (nachtGespeeld) return;
  nachtGespeeld = true;
  speelGeluid('nacht');
}

// Zachte nacht-variant (2e dag/nacht-overgang, terug naar dag): 30% zachter
export function audioNachtZacht() {
  speelGeluid('nacht', { volume: GELUIDEN.nacht.volume * 0.7 });
}

// Klik: per toetsaanslag (geen guard — snel typen moet werken)
export function audioKlik() {
  speelGeluid('klik');
}

// Klaar: bij verzenden bord
export function audioKlaar() {
  speelGeluid('klaar');
}

// Deur-klik: gebruikt new Audio() zodat het meteen speelt zonder preloading
export function audioDeurKlik() {
  try {
    const a = new Audio('klik.mp3');
    a.volume = Math.min(GELUIDEN.klik.volume, 1.0);
    a.play().catch(() => {});
  } catch (_) {}
}

// ── Mute-knop ─────────────────────────────────────────────────────────────────
function _maakMuteKnop() {
  if (document.getElementById('audioMute')) return;
  const btn = document.createElement('button');
  btn.id = 'audioMute';
  btn.textContent = '🔊';
  btn.title = 'Geluid aan/uit';
  btn.style.cssText =
    'position:fixed;top:14px;left:14px;z-index:70;' +
    'background:rgba(20,16,12,0.82);color:#ffe6bd;' +
    'border:1px solid #6a5a3a;border-radius:5px;' +
    'padding:5px 10px;cursor:pointer;font:16px system-ui,sans-serif;line-height:1;';
  btn.addEventListener('click', _wisselMute);
  document.body.appendChild(btn);
}

function _wisselMute() {
  gemut = !gemut;
  const btn = document.getElementById('audioMute');
  if (btn) btn.textContent = gemut ? '🔇' : '🔊';
  if (achtergrondBron && ctx) {
    // zachte fade zodat het niet hakt
    achtergrondBron.gain.gain.setTargetAtTime(
      gemut ? 0 : GELUIDEN.achtergrond.volume, ctx.currentTime, 0.08);
  }
}

// ── Achtergrond-lus ───────────────────────────────────────────────────────────
function _startAchtergrond() {
  if (!buffers.achtergrond) return;
  const bron = ctx.createBufferSource();
  bron.buffer = buffers.achtergrond;
  bron.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = gemut ? 0 : GELUIDEN.achtergrond.volume;
  bron.connect(gain).connect(ctx.destination);
  bron.start();
  achtergrondBron = { bron, gain };
}

// ── Voorladen (één keer, na aanmaken van de AudioContext) ─────────────────────
async function _laadAlles() {
  if (laadBelofte) return laadBelofte;
  laadBelofte = Promise.all(
    Object.entries(GELUIDEN).map(async ([naam, cfg]) => {
      try {
        const resp = await fetch(cfg.pad);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.arrayBuffer();
        buffers[naam] = await ctx.decodeAudioData(data);
      } catch (e) {
        console.warn(`[audio] Kon ${cfg.pad} niet laden:`, e);
      }
    })
  );
  return laadBelofte;
}
