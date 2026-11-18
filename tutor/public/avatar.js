// La faccia del tutor: un personaggio SVG animato (occhi che sbattono, sopracciglia, bocca che segue le parole).
// Non usa immagini né librerie: si può ridisegnare cambiando i colori qui sotto.

const C = {
  skin: '#ffd3b0',
  skinShade: '#f2b88f',
  hair: '#3b2a3f',
  shirt: '#4f7cf0',
  shirtDark: '#3a62cf',
  collar: '#ffffff',
  tie: '#ff7a59',
  glasses: '#2b3a67',
  mouth: '#6b1f2b',
  tongue: '#ff8f8f',
};

const SVG = `
<svg viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Il tutor">
  <defs>
    <radialGradient id="halo" cx="50%" cy="48%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity=".35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipEyeL"><ellipse cx="150" cy="192" rx="25" ry="28"/></clipPath>
    <clipPath id="clipEyeR"><ellipse cx="250" cy="192" rx="25" ry="28"/></clipPath>
    <clipPath id="clipMouth"><path id="mouthClip" d=""/></clipPath>
  </defs>

  <circle class="halo" cx="200" cy="215" r="196" fill="url(#halo)"/>
  <circle class="ring" cx="200" cy="215" r="186" fill="none" stroke-width="5"/>

  <!-- corpo -->
  <path d="M34 440 C34 356 100 326 200 326 C300 326 366 356 366 440 Z" fill="${C.shirt}"/>
  <path d="M163 322 L200 376 L237 322 Z" fill="${C.collar}"/>
  <path d="M142 330 L172 322 L200 376 Z" fill="${C.collar}" opacity=".92"/>
  <path d="M258 330 L228 322 L200 376 Z" fill="${C.collar}" opacity=".92"/>
  <!-- collo -->
  <path d="M172 286 h56 v44 q-28 26 -56 0 z" fill="${C.skinShade}"/>
  <!-- cravattino -->
  <g transform="translate(200 366)">
    <path d="M0 0 L-24 -12 L-24 12 Z M0 0 L24 -12 L24 12 Z" fill="${C.tie}"/>
    <circle r="6" fill="#e5603f"/>
  </g>

  <g id="head">
    <!-- orecchie -->
    <ellipse cx="93" cy="205" rx="16" ry="22" fill="${C.skin}"/>
    <ellipse cx="307" cy="205" rx="16" ry="22" fill="${C.skin}"/>
    <ellipse cx="95" cy="207" rx="7" ry="11" fill="${C.skinShade}" opacity=".7"/>
    <ellipse cx="305" cy="207" rx="7" ry="11" fill="${C.skinShade}" opacity=".7"/>
    <!-- testa -->
    <ellipse cx="200" cy="196" rx="108" ry="122" fill="${C.skin}"/>
    <!-- capelli -->
    <path d="M88 186 C70 96 140 50 204 54 C272 56 332 100 312 188 C300 146 262 122 214 124 C176 118 138 136 120 164 C108 174 98 182 88 186 Z" fill="${C.hair}"/>
    <path d="M168 62 C160 40 190 28 206 40 C196 44 190 52 192 62 Z" fill="${C.hair}"/>
    <!-- guance -->
    <ellipse cx="128" cy="244" rx="20" ry="12" fill="#ff8f8f" opacity=".38"/>
    <ellipse cx="272" cy="244" rx="20" ry="12" fill="#ff8f8f" opacity=".38"/>

    <!-- occhi -->
    <g id="eyeL">
      <g clip-path="url(#clipEyeL)">
        <ellipse cx="150" cy="192" rx="25" ry="28" fill="#fff"/>
        <g class="pupil"><circle cx="150" cy="192" r="14" fill="#3b2a20"/><circle cx="154" cy="187" r="4.5" fill="#fff"/></g>
        <rect class="lid" x="120" y="160" width="60" height="0" fill="${C.skin}"/>
      </g>
    </g>
    <g id="eyeR">
      <g clip-path="url(#clipEyeR)">
        <ellipse cx="250" cy="192" rx="25" ry="28" fill="#fff"/>
        <g class="pupil"><circle cx="250" cy="192" r="14" fill="#3b2a20"/><circle cx="254" cy="187" r="4.5" fill="#fff"/></g>
        <rect class="lid" x="220" y="160" width="60" height="0" fill="${C.skin}"/>
      </g>
    </g>

    <!-- occhiali -->
    <g fill="#bfe3ff" fill-opacity=".14" stroke="${C.glasses}" stroke-width="5">
      <circle cx="150" cy="192" r="37"/><circle cx="250" cy="192" r="37"/>
    </g>
    <path d="M186 188 Q200 178 214 188" fill="none" stroke="${C.glasses}" stroke-width="5" stroke-linecap="round"/>
    <path d="M113 190 L99 192 M287 190 L301 192" stroke="${C.glasses}" stroke-width="5" stroke-linecap="round"/>

    <!-- sopracciglia -->
    <g id="browL" transform="translate(150 138)"><path d="M-24 3 Q0 -9 24 3" fill="none" stroke="${C.hair}" stroke-width="7" stroke-linecap="round"/></g>
    <g id="browR" transform="translate(250 138)"><path d="M-24 3 Q0 -9 24 3" fill="none" stroke="${C.hair}" stroke-width="7" stroke-linecap="round"/></g>

    <!-- naso -->
    <path d="M196 216 Q187 238 199 243 Q209 244 212 237" fill="none" stroke="#d99a7b" stroke-width="4" stroke-linecap="round"/>

    <!-- bocca -->
    <path id="mouth" d="" fill="${C.mouth}" stroke="${C.mouth}" stroke-width="5" stroke-linejoin="round"/>
    <g clip-path="url(#clipMouth)">
      <rect id="teeth" x="170" y="262" width="60" height="9" rx="3" fill="#fff"/>
      <ellipse id="tongue" cx="200" cy="290" rx="20" ry="8" fill="${C.tongue}"/>
    </g>

    <!-- nuvoletta "sto pensando" -->
    <g class="thinkdots" fill="#8a97c9">
      <circle cx="312" cy="78" r="6"/><circle cx="332" cy="58" r="8"/><circle cx="358" cy="36" r="10"/>
    </g>
  </g>
</svg>`;

// Forma della bocca per ogni lettera: [apertura 0..1, "rotondità" 0..1]
const VOWELS = { a: [1, 0], e: [0.62, 0], i: [0.32, 0], o: [0.85, 1], u: [0.5, 1], à: [1, 0], è: [0.7, 0], é: [0.55, 0], ì: [0.32, 0], ò: [0.85, 1], ù: [0.5, 1] };
function visemeFor(ch) {
  const c = ch.toLowerCase();
  if (VOWELS[c]) return VOWELS[c];
  if ('bmp'.includes(c)) return [0, 0];
  if ('fv'.includes(c)) return [0.12, 0];
  if (c === ' ') return [0.08, 0];
  if (/[.,;:!?…]/.test(c)) return [0, 0];
  if (/[a-z0-9]/.test(c)) return [0.22, 0.2];
  return [0.1, 0];
}

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export class Avatar {
  constructor(container) {
    container.innerHTML = SVG;
    this.root = container;
    const $ = (s) => container.querySelector(s);
    this.el = {
      head: $('#head'),
      mouth: $('#mouth'),
      mouthClip: $('#mouthClip'),
      teeth: $('#teeth'),
      tongue: $('#tongue'),
      browL: $('#browL'),
      browR: $('#browR'),
      pupils: container.querySelectorAll('.pupil'),
      lids: container.querySelectorAll('.lid'),
    };
    // valori correnti (si muovono dolcemente verso i valori "target")
    this.v = { open: 0, round: 0, smile: 0.5, browL: 0, browR: 0, tilt: 0, gx: 0, gy: 0, blink: 0, hx: 0, hy: 0, hr: 0 };
    this.t = { smile: 0.5, browL: 0, browR: 0, tilt: 0, gx: 0, gy: 0 };
    this.state = 'idle';
    this.talking = false;
    this.visemes = [];
    this.pos = 0;
    this.cps = 14;
    this.lastBoundary = null;
    this.nextBlink = performance.now() + 2000;
    this.blinkStart = -1;
    this.nextSaccade = 0;
    this.nodUntil = 0;
    this.last = performance.now();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setState('idle');
    requestAnimationFrame((t) => this.frame(t));
  }

  setState(s) {
    this.state = s;
    this.root.dataset.state = s;
    const T = this.t;
    switch (s) {
      case 'listening':
        Object.assign(T, { smile: 0.4, browL: -5, browR: -5, tilt: 3, gx: 0, gy: 0 });
        break;
      case 'thinking':
        Object.assign(T, { smile: 0.1, browL: -9, browR: 2, tilt: -4, gx: 0.75, gy: -0.8 });
        break;
      case 'speaking':
        Object.assign(T, { smile: 0.4, browL: -1, browR: -1, tilt: 0, gx: 0, gy: 0 });
        break;
      case 'happy':
        Object.assign(T, { smile: 1, browL: -7, browR: -7, tilt: 2, gx: 0, gy: 0 });
        break;
      case 'sad':
        Object.assign(T, { smile: -0.4, browL: 4, browR: 4, tilt: -2, gx: 0, gy: 0.5 });
        break;
      default:
        Object.assign(T, { smile: 0.55, browL: 0, browR: 0, tilt: 0, gx: 0, gy: 0 });
    }
  }

  // Inizia a muovere la bocca seguendo il testo che viene pronunciato.
  startTalking(text, rate = 1) {
    this.visemes = [...text].map(visemeFor);
    this.pos = 0;
    this.cps = 14 * rate;
    this.lastBoundary = null;
    this.talking = true;
    this.setState('speaking');
  }

  // Quando la voce segnala "sono arrivata alla parola X", riallineiamo la bocca.
  boundary(charIndex) {
    const now = performance.now();
    if (this.lastBoundary && charIndex > this.lastBoundary.i) {
      const speed = ((charIndex - this.lastBoundary.i) / (now - this.lastBoundary.t)) * 1000;
      if (speed > 4 && speed < 30) this.cps = lerp(this.cps, speed, 0.4);
    }
    this.lastBoundary = { i: charIndex, t: now };
    this.pos = charIndex;
    this.nodUntil = now + 220;
  }

  // resetState=false: la voce ha solo finito una frase, ma ne arrivano altre.
  stopTalking(resetState = true) {
    this.talking = false;
    if (resetState && this.state === 'speaking') this.setState('idle');
  }

  nod() {
    this.nodUntil = performance.now() + 260;
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // Schermata nascosta (es. la schermata iniziale dopo l'avvio): non sprechiamo batteria.
    if (this.root.offsetParent === null) return requestAnimationFrame((t) => this.frame(t));
    const v = this.v;
    const T = this.t;
    const s = now / 1000;

    // --- bocca ---
    let tOpen = 0;
    let tRound = 0;
    if (this.talking) {
      this.pos += this.cps * dt;
      const i = Math.floor(this.pos);
      if (i < this.visemes.length) {
        [tOpen, tRound] = this.visemes[i];
        tOpen *= 0.85 + 0.15 * Math.sin(i * 12.9898);
      }
    } else if (this.state === 'thinking') {
      tOpen = 0.04;
      tRound = 0.6;
    }
    const km = 1 - Math.exp(-dt * 26);
    v.open = lerp(v.open, tOpen, km);
    v.round = lerp(v.round, tRound, km);

    // --- espressione (più lenta) ---
    const ke = 1 - Math.exp(-dt * 7);
    v.smile = lerp(v.smile, T.smile + (this.talking ? 0.1 * Math.sin(s * 3) : 0), ke);
    v.browL = lerp(v.browL, T.browL - (this.talking ? v.open * 3 : 0), ke);
    v.browR = lerp(v.browR, T.browR - (this.talking ? v.open * 3 : 0), ke);
    v.tilt = lerp(v.tilt, T.tilt, ke);

    // --- sguardo: ogni tanto si sposta un po' ---
    if (now > this.nextSaccade && (this.state === 'idle' || this.state === 'listening' || this.state === 'speaking')) {
      this.sx = (Math.random() - 0.5) * 0.4;
      this.sy = (Math.random() - 0.5) * 0.3;
      this.nextSaccade = now + 1800 + Math.random() * 2600;
    }
    const gx = T.gx + (this.state === 'thinking' ? 0 : this.sx || 0);
    const gy = T.gy + (this.state === 'thinking' ? 0 : this.sy || 0);
    v.gx = lerp(v.gx, gx, 1 - Math.exp(-dt * 10));
    v.gy = lerp(v.gy, gy, 1 - Math.exp(-dt * 10));

    // --- battito di ciglia ---
    if (this.blinkStart < 0 && now > this.nextBlink) this.blinkStart = now;
    if (this.blinkStart >= 0) {
      const p = (now - this.blinkStart) / 170;
      if (p >= 1) {
        this.blinkStart = -1;
        v.blink = 0;
        this.nextBlink = now + 2200 + Math.random() * 3800;
      } else v.blink = Math.sin(Math.PI * p);
    }

    // --- movimento della testa ---
    const m = this.reduced ? 0 : 1;
    const nod = now < this.nodUntil ? Math.sin(((this.nodUntil - now) / 260) * Math.PI) : 0;
    v.hr = Math.sin(s * 0.9) * 1.1 * m + v.tilt + (this.talking ? Math.sin(s * 2.3) * 1.6 * m : 0);
    v.hy = Math.sin(s * 1.6) * 2 * m + nod * 4 * m + v.open * 2.2 * m;
    v.hx = Math.sin(s * 0.7) * 1.5 * m;

    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  render() {
    const v = this.v;
    const e = this.el;

    // bocca: due curve che partono dagli angoli (labbro alto e labbro basso)
    const half = 33 + v.open * 6 - v.round * 11;
    const cy = 272 - clamp(v.smile, -1, 1) * 8;
    const upper = 2 + clamp(v.smile, -1, 1) * 6 - v.open * 2;
    const lower = upper + 3 + v.open * (34 + v.round * 5);
    const x0 = 200 - half;
    const x1 = 200 + half;
    const d = `M${x0} ${cy} Q200 ${cy + 2 * upper} ${x1} ${cy} Q200 ${cy + 2 * lower} ${x0} ${cy}Z`;
    e.mouth.setAttribute('d', d);
    e.mouthClip.setAttribute('d', d);
    e.teeth.setAttribute('x', 200 - half * 0.62);
    e.teeth.setAttribute('width', half * 1.24);
    e.teeth.setAttribute('y', cy + upper - 2);
    e.tongue.setAttribute('cy', cy + lower * 1.05);
    e.tongue.setAttribute('rx', 8 + half * 0.35);
    e.tongue.setAttribute('ry', 3 + v.open * 8);

    // sopracciglia
    e.browL.setAttribute('transform', `translate(150 ${138 + v.browL}) rotate(${v.browL * 0.9})`);
    e.browR.setAttribute('transform', `translate(250 ${138 + v.browR}) rotate(${-v.browR * 0.9})`);

    // occhi
    const px = v.gx * 9;
    const py = v.gy * 8;
    e.pupils.forEach((p) => p.setAttribute('transform', `translate(${px.toFixed(2)} ${py.toFixed(2)})`));
    const squint = clamp(v.smile, 0, 1) * 5; // quando sorride gli occhi si stringono un po'
    const lidH = (v.blink * 60 + squint).toFixed(2);
    e.lids.forEach((l) => l.setAttribute('height', lidH));

    // testa
    e.head.setAttribute('transform', `translate(${v.hx.toFixed(2)} ${v.hy.toFixed(2)}) rotate(${v.hr.toFixed(2)} 200 330)`);
  }
}
