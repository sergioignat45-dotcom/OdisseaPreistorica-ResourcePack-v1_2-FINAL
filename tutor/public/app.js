// Il "direttore d'orchestra": collega microfono, voce, faccia, lavagna, fotocamera e server.
import { Avatar } from './avatar.js';
import { Speaker, Listener } from './voice.js';
import { TagParser, SentenceChunker, cleanForSpeech } from './stream.js';

const $ = (id) => document.getElementById(id);

const SUBJECTS = [
  ['libero', 'Libero'],
  ['italiano', 'Italiano'],
  ['matematica', 'Matematica'],
  ['storia', 'Storia'],
  ['geografia', 'Geografia'],
  ['scienze', 'Scienze'],
  ['inglese', 'Inglese'],
  ['seconda_lingua', '2ª lingua'],
  ['tecnologia', 'Tecnologia'],
  ['arte', 'Arte e musica'],
  ['esame', 'Esame di 3ª media'],
  ['invalsi', 'INVALSI'],
];
const SUBJECT_PHRASE = {
  italiano: 'Oggi vorrei studiare italiano.',
  matematica: 'Oggi vorrei studiare matematica.',
  storia: 'Oggi vorrei studiare storia.',
  geografia: 'Oggi vorrei studiare geografia.',
  scienze: 'Oggi vorrei studiare scienze.',
  inglese: 'Oggi vorrei studiare inglese.',
  seconda_lingua: 'Oggi vorrei studiare la seconda lingua straniera.',
  tecnologia: 'Oggi vorrei studiare tecnologia.',
  arte: 'Oggi vorrei studiare arte e musica.',
  esame: "Vorrei prepararmi per l'esame di terza media.",
  invalsi: 'Vorrei esercitarmi per le prove INVALSI.',
};

// ---------- memoria sul dispositivo (mai inviata a nessuno tranne il server di questa app) ----------
const store = {
  get(area, key, fallback) {
    try {
      const v = window[area].getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(area, key, value) {
    try {
      window[area].setItem(key, JSON.stringify(value));
    } catch {
      /* spazio finito o modalità privata: non è grave */
    }
  },
};

const S = {
  cfg: { tutorName: 'Prof', needsCode: false, demo: false },
  settings: { name: '', rate: 1, voiceURI: '', autoListen: true, captions: true, code: '', ...store.get('localStorage', 'tutor.settings', {}) },
  subject: store.get('sessionStorage', 'tutor.subject', 'libero'),
  messages: store.get('sessionStorage', 'tutor.msgs', []), // {role, text, local?, image?, hadImage?}
  phase: 'idle',
  pendingImage: null,
  started: false,
};
let turn = null;
let turnSeq = 0;

const saveSettings = () => store.set('localStorage', 'tutor.settings', S.settings);
const saveMessages = () =>
  store.set(
    'sessionStorage',
    'tutor.msgs',
    S.messages.slice(-60).map(({ image, ...m }) => ({ ...m, hadImage: Boolean(image) || m.hadImage })),
  );

// ---------- piccoli aiuti ----------
let toastTimer;
function toast(msg, ms = 5000) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// ---------- faccia, voce, orecchie ----------
const avatar = new Avatar($('avatar'));
const startAvatar = new Avatar($('start-avatar'));
startAvatar.setState('happy');

const speaker = new Speaker({
  onVoices: fillVoices,
  onStart(item) {
    if (S.settings.captions) $('caption').textContent = item.text;
    avatar.startTalking(item.text, speaker.rate);
  },
  onBoundary: (i) => avatar.boundary(i),
  onEnd: () => avatar.stopTalking(false),
  onIdle() {
    avatar.stopTalking();
    if (turn && turn.streamDone) completeTurn(turn);
  },
});
const listener = new Listener();

// ---------- fasi della conversazione ----------
const PHASE_TEXT = {
  idle: 'Tocca il microfono e parla!',
  listening: 'Ti ascolto…',
  thinking: 'Ci sto pensando…',
  speaking: 'Parlo io…',
};
const MIC = {
  idle: ['i-mic', 'Parla'],
  listening: ['i-send', 'Ho finito'],
  thinking: ['i-x', 'Annulla'],
  speaking: ['i-mic', 'Tocca a me'],
};
function setPhase(p) {
  S.phase = p;
  $('status').dataset.phase = p;
  $('status').textContent = PHASE_TEXT[p];
  const mic = $('btn-mic');
  mic.dataset.phase = p;
  $('mic-icon').firstElementChild.setAttribute('href', `#${MIC[p][0]}`);
  $('mic-label').textContent = MIC[p][1];
  mic.setAttribute('aria-label', MIC[p][1]);
  if (p !== 'speaking') avatar.setState(p === 'idle' ? 'idle' : p);
}

// ---------- lavagna ----------
function renderBoard(text) {
  const wrap = $('board-wrap');
  const t = text.replace(/^\n+/, '').replace(/\s+$/, '');
  if (!t) return;
  $('board').innerHTML = esc(t).replace(/\^(\{[^}]+\}|-?[\p{L}\p{N}]+)/gu, (_, e) => `<sup>${e.replace(/^\{|\}$/g, '')}</sup>`);
  wrap.dataset.empty = 'false';
  $('board').scrollTop = $('board').scrollHeight;
}
$('btn-board-close').onclick = () => ($('board-wrap').dataset.empty = 'true');

// ---------- dal testo di Claude alla voce ----------
// Prende il testo (anche a pezzetti), manda il parlato alla voce e la lavagna sullo schermo.
function makePipeline() {
  const chunker = new SentenceChunker((text, lang) => {
    speaker.say(text, lang);
    if (S.phase === 'thinking' || S.phase === 'idle') setPhase('speaking');
  });
  const parser = new TagParser({
    onSay: (text, lang) => chunker.push(text, lang),
    onBoard: (text) => renderBoard(text),
  });
  return {
    feed: (t) => parser.feed(t),
    end() {
      parser.end();
      chunker.flush();
    },
  };
}

function completeTurn(t) {
  if (t !== turn) return;
  turn = null;
  if (!t.local && t.raw.trim()) {
    S.messages.push({ role: 'assistant', text: t.raw });
    saveMessages();
  }
  setPhase('idle');
  if (S.settings.autoListen && listener.supported && $('typebar').hidden) {
    setTimeout(() => {
      if (S.phase === 'idle' && !turn) startListening();
    }, 450);
  }
}

// Il tutor dice una frase "sua" (saluti, errori) senza chiamare l'intelligenza artificiale.
function tutorSays(text) {
  const t = { id: ++turnSeq, local: true, streamDone: true, raw: text, ctrl: new AbortController() };
  turn = t;
  S.messages.push({ role: 'assistant', text, local: true });
  saveMessages();
  const p = makePipeline();
  p.feed(text);
  p.end();
  if (!speaker.speaking) completeTurn(t);
}

function interrupt({ listenAfter = false } = {}) {
  listener.stop();
  if (turn) {
    turn.ctrl.abort();
    if (!turn.local && turn.raw.trim()) {
      S.messages.push({ role: 'assistant', text: turn.raw });
      saveMessages();
    }
    turn = null;
  }
  speaker.cancel();
  avatar.stopTalking();
  setPhase('idle');
  $('heard').textContent = '';
  if (listenAfter) startListening();
}

// ---------- invio di un messaggio e risposta in streaming ----------
function buildPayload() {
  const recent = S.messages.filter((m) => !m.local).slice(-30);
  const withImg = recent.map((m, i) => (m.image ? i : -1)).filter((i) => i >= 0).slice(-2); // solo le ultime 2 foto
  return recent.map((m, i) => {
    if (m.role === 'assistant') return { role: 'assistant', content: m.text };
    const blocks = [];
    if (m.image && withImg.includes(i)) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: m.image.split(',')[1] } });
    }
    blocks.push({ type: 'text', text: m.text });
    return { role: 'user', content: blocks };
  });
}

function sendUser(text) {
  text = (text || '').trim();
  if (!text && !S.pendingImage) return;
  interrupt();
  const image = S.pendingImage;
  clearAttachment();
  S.messages.push({ role: 'user', text: text || 'Guarda questa foto, per favore.', image });
  saveMessages();
  $('heard').textContent = text;
  runTurn();
}

async function runTurn() {
  const t = { id: ++turnSeq, raw: '', streamDone: false, ctrl: new AbortController() };
  turn = t;
  setPhase('thinking');
  const pipe = makePipeline();
  let failed = null;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (S.settings.code) headers['x-access-code'] = S.settings.code;
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers,
      signal: t.ctrl.signal,
      body: JSON.stringify({ messages: buildPayload(), subject: S.subject, studentName: S.settings.name }),
    });
    if (!resp.ok) {
      const info = await resp.json().catch(() => ({}));
      if (info.code === 'access') {
        S.settings.code = '';
        saveSettings();
        showStart('Il codice di accesso non è giusto: riprova.');
      }
      throw Object.assign(new Error(info.error || 'Errore'), { friendly: info.error });
    }
    await readEvents(resp, (ev) => {
      if (t !== turn) return;
      if (ev.type === 'text') {
        t.raw += ev.text;
        pipe.feed(ev.text);
      } else if (ev.type === 'error') {
        failed = ev.kind;
      } else if (ev.type === 'done' && ev.stop === 'refusal' && !t.raw.trim()) {
        t.raw = 'Su questo non posso aiutarti, ma se vuoi proviamo con un altro argomento di studio.';
        pipe.feed(t.raw);
      }
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    failed = err.friendly ? 'testo:' + err.friendly : 'rete';
  }

  if (t !== turn) return; // nel frattempo l'utente ha interrotto
  pipe.end();
  if (failed && !t.raw.trim()) {
    turn = null;
    return handleFailure(failed);
  }
  t.streamDone = true;
  if (!speaker.speaking) completeTurn(t);
}

function handleFailure(kind) {
  setPhase('idle');
  const adults = {
    chiave: "C'è un problema con la chiave API del tutor: deve controllare chi ha installato l'app.",
    limite: 'Troppe richieste in poco tempo. Riprova tra un minuto.',
    rete: 'Non riesco a collegarmi al server. Controlla la connessione.',
  };
  if (kind.startsWith('testo:')) {
    const msg = kind.slice(6);
    toast(msg);
    tutorSays(msg);
    return;
  }
  toast(adults[kind] || 'Qualcosa è andato storto. Riprova.');
  tutorSays('Scusa, adesso non riesco a risponderti. Riproviamo tra un attimo?');
}

async function readEvents(resp, onEvent) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          /* riga incompleta: ignorata */
        }
      }
    }
  }
}

// ---------- ascolto ----------
function startListening() {
  if (!listener.supported) {
    openTyping(true);
    toast('Su questo dispositivo non riesco ad ascoltarti: scrivimi!');
    return;
  }
  speaker.cancel();
  avatar.stopTalking();
  $('heard').textContent = '';
  setPhase('listening');
  listener.start({
    onInterim(text) {
      $('heard').textContent = text;
      avatar.nod();
    },
    onFinal: (text) => sendUser(text),
    onEnd() {
      if (S.phase === 'listening') {
        setPhase('idle');
        $('heard').textContent = '';
      }
    },
    onError(code) {
      setPhase('idle');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        toast('Il microfono è bloccato. Consentilo dalle impostazioni del browser, oppure scrivimi.');
        openTyping(true);
      } else if (code === 'network') {
        toast('Per capire la voce serve internet. Riprova tra poco, oppure scrivimi.');
      } else if (code !== 'aborted') {
        toast('Non ho sentito bene. Riprova!');
      }
    },
  });
}

$('btn-mic').onclick = () => {
  if (!S.started) return;
  if (S.phase === 'idle') startListening();
  else if (S.phase === 'listening') listener.finishNow();
  else if (S.phase === 'thinking') interrupt();
  else interrupt({ listenAfter: true });
};
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !S.started) return;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
  if (document.querySelector('dialog[open]') || !$('cam').hidden) return;
  e.preventDefault();
  $('btn-mic').onclick();
});
$('avatar').addEventListener('click', () => {
  if (S.phase === 'speaking') interrupt({ listenAfter: true });
});

// ---------- scrivere ----------
function openTyping(open) {
  $('typebar').hidden = !open;
  if (open) $('type-input').focus();
}
$('btn-type').onclick = () => openTyping($('typebar').hidden);
$('typebar').onsubmit = (e) => {
  e.preventDefault();
  const v = $('type-input').value;
  $('type-input').value = '';
  sendUser(v);
};

// ---------- ripeti ----------
$('btn-repeat').onclick = () => {
  const last = [...S.messages].reverse().find((m) => m.role === 'assistant');
  if (!last) return;
  interrupt();
  const t = { id: ++turnSeq, local: true, streamDone: true, raw: last.text, ctrl: new AbortController() };
  turn = t;
  const p = makePipeline();
  p.feed(last.text);
  p.end();
  if (!speaker.speaking) completeTurn(t);
};

// ---------- foto ----------
function setAttachment(dataUrl) {
  S.pendingImage = dataUrl;
  $('attach-img').src = dataUrl;
  $('attach').hidden = false;
}
function clearAttachment() {
  S.pendingImage = null;
  $('attach').hidden = true;
  $('attach-img').removeAttribute('src');
}
$('attach-remove').onclick = clearAttachment;

function toJpeg(source, w, h) {
  const k = Math.min(1, 1568 / Math.max(w, h)); // oltre 1568 px Claude ridimensiona comunque: inutile mandare di più
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

async function fileToJpeg(file) {
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const url = toJpeg(bmp, bmp.width, bmp.height);
      bmp.close?.();
      return url;
    } catch {
      /* si prova con il metodo classico */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    return toJpeg(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function photoReady() {
  interrupt();
  tutorSays('Perfetto, ho la foto! Dimmi cosa vuoi che guardiamo.');
}

$('file-input').onchange = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    setAttachment(await fileToJpeg(file));
    photoReady();
  } catch {
    toast('Non riesco ad aprire questa foto. Riprova.');
  }
};

let camStream = null;
let camFacing = 'environment';
const coarse = matchMedia('(pointer: coarse)').matches;

async function openCamera() {
  // Sul telefono è meglio la fotocamera vera (messa a fuoco, alta qualità): la apre il file-input.
  if (coarse || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return $('file-input').click();
  try {
    await startCam();
    $('cam').hidden = false;
    camReset();
  } catch {
    stopCam();
    toast('Non riesco ad accendere la fotocamera: scegli una foto dal dispositivo.');
    $('file-input').removeAttribute('capture');
    $('file-input').click();
  }
}
async function startCam() {
  stopCam();
  camStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: camFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  const v = $('cam-video');
  v.srcObject = camStream;
  await v.play();
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  $('cam-flip').hidden = devs.length < 2;
}
function stopCam() {
  camStream?.getTracks().forEach((t) => t.stop());
  camStream = null;
}
function camReset() {
  $('cam-video').hidden = false;
  $('cam-still').hidden = true;
  $('cam-shot').hidden = false;
  $('cam-close').hidden = false;
  $('cam-use').hidden = true;
  $('cam-retake').hidden = true;
  $('cam-hint').hidden = false;
}
$('btn-cam').onclick = () => {
  if (!S.started) return;
  openCamera();
};
$('cam-close').onclick = () => {
  stopCam();
  $('cam').hidden = true;
};
$('cam-flip').onclick = async () => {
  camFacing = camFacing === 'environment' ? 'user' : 'environment';
  try {
    await startCam();
  } catch {
    toast('Non riesco a cambiare fotocamera.');
  }
};
$('cam-shot').onclick = () => {
  const v = $('cam-video');
  if (!v.videoWidth) return;
  $('cam-still').src = toJpeg(v, v.videoWidth, v.videoHeight);
  $('cam-video').hidden = true;
  $('cam-still').hidden = false;
  $('cam-shot').hidden = $('cam-close').hidden = $('cam-flip').hidden = $('cam-hint').hidden = true;
  $('cam-use').hidden = $('cam-retake').hidden = false;
};
$('cam-retake').onclick = camReset;
$('cam-use').onclick = () => {
  setAttachment($('cam-still').src);
  stopCam();
  $('cam').hidden = true;
  photoReady();
};

// ---------- materie ----------
function renderChips() {
  const nav = $('subjects');
  nav.innerHTML = '';
  for (const [id, label] of SUBJECTS) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(S.subject === id));
    b.onclick = () => {
      S.subject = id;
      store.set('sessionStorage', 'tutor.subject', id);
      renderChips();
      if (S.started && SUBJECT_PHRASE[id]) sendUser(SUBJECT_PHRASE[id]);
    };
    nav.appendChild(b);
  }
}

// ---------- cronologia ----------
function plainFromRaw(raw) {
  let say = '';
  let board = '';
  const p = new TagParser({ onSay: (t) => (say += t), onBoard: (t, done) => done && (board = t) });
  p.feed(raw);
  p.end();
  return { say: cleanForSpeech(say), board: board.trim() };
}
$('btn-history').onclick = () => {
  const list = $('history-list');
  list.innerHTML = '';
  if (!S.messages.length) list.innerHTML = '<p class="muted">Non abbiamo ancora parlato.</p>';
  for (const m of S.messages) {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.role === 'user' ? 'user' : 'tutor');
    if (m.role === 'user') {
      if (m.image) {
        const img = document.createElement('img');
        img.src = m.image;
        img.alt = 'Foto inviata';
        div.appendChild(img);
      } else if (m.hadImage) div.append('📷 ');
      div.append(m.text);
    } else {
      const { say, board } = plainFromRaw(m.text);
      div.append(say);
      if (board) {
        const b = document.createElement('code');
        b.className = 'lav';
        b.textContent = board;
        div.appendChild(b);
      }
    }
    list.appendChild(div);
  }
  $('dlg-history').showModal();
  list.scrollTop = list.scrollHeight;
};

// ---------- impostazioni ----------
function fillVoices(voices) {
  const sel = $('set-voice');
  const keep = S.settings.voiceURI;
  sel.length = 1;
  for (const v of voices.filter((x) => x.lang.toLowerCase().startsWith('it'))) {
    sel.add(new Option(`${v.name}${v.localService ? '' : ' (online)'}`, v.voiceURI));
  }
  sel.value = keep;
}
function openSettings() {
  $('set-name').value = S.settings.name;
  $('set-rate').value = S.settings.rate;
  $('set-rate-out').textContent = `${Number(S.settings.rate).toFixed(2).replace(/0$/, '')}×`;
  $('set-auto').checked = S.settings.autoListen;
  $('set-captions').checked = S.settings.captions;
  $('set-voice').value = S.settings.voiceURI;
  $('dlg-settings').showModal();
}
$('btn-settings').onclick = openSettings;
$('set-rate').oninput = (e) => ($('set-rate-out').textContent = `${Number(e.target.value).toFixed(2).replace(/0$/, '')}×`);
$('dlg-settings').addEventListener('close', () => {
  S.settings.name = $('set-name').value.replace(/[^\p{L}\s'’-]/gu, '').trim().slice(0, 30);
  S.settings.rate = Number($('set-rate').value);
  S.settings.voiceURI = $('set-voice').value;
  S.settings.autoListen = $('set-auto').checked;
  S.settings.captions = $('set-captions').checked;
  applySettings();
  saveSettings();
});
$('set-wipe').onclick = () => {
  if (!confirm('Cancellare nome, impostazioni e conversazione da questo dispositivo?')) return;
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* niente */
  }
  location.reload();
};
function applySettings() {
  speaker.rate = S.settings.rate;
  speaker.voiceURI = S.settings.voiceURI;
  $('caption').hidden = !S.settings.captions;
}

// ---------- nuova lezione ----------
$('btn-new').onclick = () => {
  if (S.messages.length && !confirm('Iniziare una nuova lezione? La conversazione attuale verrà chiusa.')) return;
  interrupt();
  S.messages = [];
  saveMessages();
  clearAttachment();
  $('caption').textContent = '';
  $('board').innerHTML = '';
  $('board-wrap').dataset.empty = 'true';
  beginLesson();
};

// ---------- inizio ----------
function beginLesson() {
  const n = S.settings.name;
  const resumed = S.messages.some((m) => !m.local);
  tutorSays(
    resumed
      ? `Rieccoci${n ? ', ' + n : ''}! Riprendiamo da dove eravamo, oppure cambiamo argomento?`
      : `Ciao${n ? ' ' + n : ''}! Io sono ${S.cfg.tutorName}. Su cosa lavoriamo oggi? Puoi parlarmi, scrivermi, oppure mostrarmi una pagina del quaderno con la fotocamera.`,
  );
}

function showStart(warning) {
  $('start').hidden = false;
  $('code-row').hidden = !S.cfg.needsCode || (Boolean(S.settings.code) && !warning);
  const w = $('compat-note');
  const notes = [];
  if (warning) notes.push(warning);
  if (!window.isSecureContext) notes.push('Questa pagina non è su una connessione sicura (https): microfono e fotocamera potrebbero non funzionare.');
  if (!listener.supported) notes.push('Questo browser non può ascoltarti: puoi scrivermi. Per parlare usa Chrome, Edge o Safari.');
  if (!('speechSynthesis' in window)) notes.push('Questo browser non può parlare a voce: leggerai i sottotitoli.');
  w.textContent = notes.join(' ');
  w.hidden = !notes.length;
}

$('start-form').onsubmit = (e) => {
  e.preventDefault();
  const name = $('start-name').value.replace(/[^\p{L}\s'’-]/gu, '').trim().slice(0, 30);
  if (name) S.settings.name = name;
  if (S.cfg.needsCode) {
    const code = $('start-code').value.trim();
    if (code) S.settings.code = code;
    if (!S.settings.code) return ($('compat-note').textContent = 'Serve il codice di accesso.'), ($('compat-note').hidden = false);
  }
  saveSettings();
  S.started = true;
  $('start').hidden = true;
  // Il saluto parte subito, dentro il tocco dell'utente: così il browser concede l'audio.
  beginLesson();
};

async function boot() {
  try {
    S.cfg = { ...S.cfg, ...(await (await fetch('/api/config')).json()) };
  } catch {
    /* si va avanti con i valori predefiniti */
  }
  $('tutor-name').textContent = S.cfg.tutorName;
  $('demo-badge').hidden = !S.cfg.demo;
  document.title = `Studiamo con ${S.cfg.tutorName}`;
  $('start-name').value = S.settings.name;
  renderChips();
  applySettings();
  setPhase('idle');
  $('caption').hidden = !S.settings.captions;
  showStart();
}

if ('serviceWorker' in navigator) {
  /* nessun service worker: l'app ha bisogno del server per parlare con il tutor */
}
boot();
