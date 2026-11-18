// Voce (il tutor parla) e orecchie (il tutor ascolta), usando le funzioni già presenti nel browser.
// Costo: zero. Qualità: dipende dal dispositivo (le voci di Edge/Chrome/iPhone in italiano sono buone).

const LANG_CODE = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };

// ---------------------------------------------------------------------------------------
export class Speaker {
  constructor(hooks = {}) {
    this.hooks = hooks; // onStart(item) onBoundary(i) onEnd(item) onIdle()
    this.queue = [];
    this.speaking = false;
    this.rate = 1;
    this.voiceURI = ''; // voce italiana scelta dall'utente ('' = automatica)
    this.voices = [];
    this.token = 0;
    this.timers = new Set();
    this.synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (this.synth) {
      this.loadVoices();
      this.synth.addEventListener?.('voiceschanged', () => this.loadVoices());
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    this.hooks.onVoices?.(this.voices);
  }

  italianVoices() {
    return this.voices.filter((v) => v.lang.toLowerCase().startsWith('it'));
  }

  voiceFor(lang) {
    if (lang === 'it' && this.voiceURI) {
      const chosen = this.voices.find((v) => v.voiceURI === this.voiceURI);
      if (chosen) return chosen;
    }
    const target = LANG_CODE[lang] || 'it-IT';
    const prefix = target.slice(0, 2);
    let best = null;
    let bestScore = -1;
    for (const v of this.voices) {
      const l = v.lang.replace('_', '-').toLowerCase();
      if (!l.startsWith(prefix)) continue;
      let score = 1;
      if (l === target.toLowerCase()) score += 4;
      if (/natural|neural|online/i.test(v.name)) score += 6; // voci di Edge: molto naturali
      if (/google/i.test(v.name)) score += 3;
      if (/premium|enhanced|siri/i.test(v.name)) score += 3;
      if (/compact/i.test(v.name)) score -= 2;
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    return best;
  }

  say(text, lang = 'it') {
    this.queue.push({ text, lang });
    if (!this.speaking) this.next();
  }

  next() {
    const item = this.queue.shift();
    if (!item) {
      this.speaking = false;
      this.hooks.onIdle?.();
      return;
    }
    this.speaking = true;
    const myToken = this.token;
    let finished = false;
    const finish = () => {
      if (finished || myToken !== this.token) return;
      finished = true;
      this.hooks.onEnd?.(item);
      this.next();
    };

    // Se il dispositivo non ha voci (o la sintesi non parte), facciamo finta di parlare:
    // la faccia si muove e il testo resta leggibile. Così l'app non si blocca mai.
    const fakeSpeech = () => {
      if (finished || myToken !== this.token) return;
      this.hooks.onStart?.(item);
      const ms = Math.max(900, (item.text.length / (14 * this.rate)) * 1000);
      this.later(finish, ms);
    };
    if (!this.synth) return fakeSpeech();

    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = LANG_CODE[item.lang] || 'it-IT';
    const voice = this.voiceFor(item.lang);
    if (voice) u.voice = voice;
    u.rate = clampRate(this.rate * (item.lang === 'it' ? 1 : 0.92));
    u.pitch = 1.05;

    let started = false;
    u.onstart = () => {
      started = true;
      this.hooks.onStart?.(item);
    };
    u.onboundary = (e) => {
      if (myToken === this.token) this.hooks.onBoundary?.(e.charIndex, item);
    };
    u.onend = finish;
    u.onerror = (e) => {
      if (myToken !== this.token) return;
      if (!started) return fakeSpeech();
      finish();
    };
    this.current = u; // riferimento da tenere: Chrome a volte "dimentica" l'oggetto e non chiama onend
    if (this.synth.paused) this.synth.resume();
    this.synth.speak(u);
    // Se dopo 2,5 secondi non è partito nulla, la sintesi non funziona su questo dispositivo.
    this.later(() => {
      if (!started && !finished && myToken === this.token) {
        this.synth.cancel();
        fakeSpeech();
      }
    }, 2500);
  }

  later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  cancel() {
    this.token++;
    this.queue = [];
    this.speaking = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.synth?.cancel();
  }
}

const clampRate = (r) => Math.min(1.6, Math.max(0.5, r));

// ---------------------------------------------------------------------------------------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export class Listener {
  constructor() {
    this.supported = Boolean(SR);
    this.rec = null;
    this.silenceMs = 1700; // quanto silenzio aspettare prima di considerare finita la frase
  }

  // handlers: onInterim(text) onFinal(text) onEnd(hadText) onError(code)
  start(handlers) {
    this.stop(true);
    const rec = new SR();
    this.rec = rec;
    rec.lang = 'it-IT';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let text = '';
    let done = false;
    let silenceTimer = null;
    let noSpeechTimer = null;

    const conclude = (send) => {
      if (done) return;
      done = true;
      clearTimeout(silenceTimer);
      clearTimeout(noSpeechTimer);
      if (this.rec === rec) this.rec = null;
      try {
        rec.stop();
      } catch {
        /* già fermo */
      }
      const t = text.trim();
      if (send && t) handlers.onFinal?.(t);
      else handlers.onEnd?.(Boolean(t));
    };
    this._conclude = conclude;

    rec.onresult = (e) => {
      // Ricostruiamo sempre il testo da tutti i risultati: così non ci sono doppioni.
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      text = t;
      handlers.onInterim?.(text.trim());
      clearTimeout(noSpeechTimer);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => conclude(true), this.silenceMs);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // gestiti da onend
      handlers.onError?.(e.error);
      done = true;
      clearTimeout(silenceTimer);
      clearTimeout(noSpeechTimer);
    };
    rec.onend = () => {
      // Il browser a volte chiude da solo (silenzio lungo): se c'era testo, lo mandiamo.
      if (!done) conclude(true);
    };

    try {
      rec.start();
      // Se non parla per 9 secondi, smettiamo di ascoltare.
      noSpeechTimer = setTimeout(() => conclude(false), 9000);
    } catch (err) {
      handlers.onError?.('start-failed');
    }
  }

  // "Ho finito": manda subito quello che è stato capito.
  finishNow() {
    this._conclude?.(true);
  }

  stop(silent = false) {
    if (!this.rec) return;
    const rec = this.rec;
    this.rec = null;
    rec.onresult = rec.onend = rec.onerror = null;
    try {
      rec.abort();
    } catch {
      /* niente */
    }
    this._conclude = null;
    void silent;
  }
}
