// Server del tutor. Fa tre cose:
//  1. serve l'app (cartella public/)
//  2. tiene al sicuro la chiave API (il browser non la vede mai)
//  3. inoltra la conversazione a Claude e rimanda la risposta "a pezzetti" (streaming)
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildRecapPrompt, leggiProfilo, MATERIE_VALIDE, ATTIVITA_VALIDE } from './prompt.js';
import { sanitizeMessages, transcript, BadRequest } from './validate.js';
import { demoReply, demoStream, demoRecap } from './demo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');

// --- .env (senza librerie) ---------------------------------------------------------------
try {
  for (const line of fs.readFileSync(path.join(here, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {
  /* nessun .env: va bene */
}

// --- Impostazioni -----------------------------------------------------------------------
const cfg = {
  port: Number(process.env.PORT) || 3000,
  // In locale ascolta solo su questo computer; su un servizio online (che imposta PORT) su tutte le interfacce.
  host: process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1'),
  model: process.env.MODEL || 'claude-opus-5-5',
  // low = risposte rapide (consigliato per una conversazione a voce); medium/high = più ragionamento, più attesa.
  effort: process.env.EFFORT === undefined ? 'low' : process.env.EFFORT,
  maxTokens: Number(process.env.MAX_TOKENS) || 4096,
  tutorName: process.env.TUTOR_NAME || 'Prof Claude',
  accessCode: process.env.ACCESS_CODE || '',
  // FACE_CAMERA=off nasconde del tutto l'opzione "il tutor può vedermi" (webcam).
  faceCamera: (process.env.FACE_CAMERA || '').toLowerCase() !== 'off',
  dailyLimit: Number(process.env.DAILY_LIMIT) || 300,
  demo:
    process.argv.includes('--demo') ||
    process.env.DEMO === '1' ||
    !(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
};

// Modelli che supportano il "paracadute" lato server (se una risposta viene rifiutata dai filtri di sicurezza,
// la stessa richiesta viene riprovata automaticamente su un modello sostitutivo).
const SUPPORTS_FALLBACK = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-fable-5-1']);
const SUPPORTS_EFFORT = (m) => /^claude-(opus|sonnet|fable|mythos|haiku)-5/.test(m);

const client = cfg.demo ? null : new Anthropic();

// --- Limiti anti-spreco -----------------------------------------------------------------
const hits = new Map(); // ip -> [timestamp...]
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20; // max 20 richieste al minuto
}
let giorno = new Date().toDateString();
let contatore = 0;
function superatoLimiteGiornaliero() {
  const oggi = new Date().toDateString();
  if (oggi !== giorno) {
    giorno = oggi;
    contatore = 0;
  }
  return ++contatore > cfg.dailyLimit;
}

const eguali = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// --- Utilità HTTP -----------------------------------------------------------------------
function securityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new BadRequest('Richiesta troppo grande'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function serveStatic(pathname, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return json(res, 400, { error: 'Percorso non valido' });
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return json(res, 403, { error: 'Vietato' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: 'Non trovato' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// --- /api/chat e /api/recap ---------------------------------------------------------------
function messaggioDiErrore(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'chiave';
  if (err instanceof Anthropic.RateLimitError) return 'limite';
  if (err instanceof Anthropic.APIConnectionError) return 'rete';
  return 'generico';
}

// Parametri comuni delle richieste a Claude.
function claudeParams(extra) {
  const params = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    cache_control: { type: 'ephemeral' }, // la conversazione cresce: il già-letto costa 10 volte meno
    ...extra,
  };
  if (cfg.effort && SUPPORTS_EFFORT(cfg.model)) params.output_config = { effort: cfg.effort };
  if (SUPPORTS_FALLBACK.has(cfg.model)) return { beta: true, params: { ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } };
  return { beta: false, params };
}

// Controlli comuni: troppe richieste, codice di accesso, limite giornaliero. Restituisce true se si può procedere.
function guard(req, res) {
  const ip = req.socket.remoteAddress || '?';
  if (rateLimited(ip)) return json(res, 429, { error: 'Troppe richieste ravvicinate: aspetta qualche secondo.' }), false;
  if (cfg.accessCode && !eguali(req.headers['x-access-code'] || '', cfg.accessCode)) {
    return json(res, 401, { error: 'Codice di accesso mancante o sbagliato.', code: 'access' }), false;
  }
  if (superatoLimiteGiornaliero()) {
    return json(res, 429, { error: 'Per oggi abbiamo studiato tanto! Riprendiamo domani.', code: 'daily' }), false;
  }
  return true;
}

async function handleChat(req, res) {
  if (!guard(req, res)) return;

  let messages, subject, activity, studentName, diary;
  try {
    const body = JSON.parse(await readBody(req, 14 * 1024 * 1024));
    messages = sanitizeMessages(body.messages);
    subject = MATERIE_VALIDE.includes(body.subject) ? body.subject : 'libero';
    activity = ATTIVITA_VALIDE.includes(body.activity) ? body.activity : null;
    studentName = body.studentName;
    diary = body.diary;
  } catch (e) {
    return json(res, 400, { error: e instanceof BadRequest ? e.message : 'Richiesta non valida' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  const ac = new AbortController();
  res.on('close', () => {
    clearInterval(ping);
    ac.abort();
  });

  try {
    if (cfg.demo) {
      for await (const piece of demoStream(demoReply(messages), ac.signal)) send({ type: 'text', text: piece });
      send({ type: 'done', stop: 'end_turn' });
      return res.end();
    }

    const system = buildSystemPrompt({
      tutorName: cfg.tutorName,
      studentName,
      subject,
      activity,
      diary,
      profile: leggiProfilo(import.meta.url),
    });
    const { beta, params } = claudeParams({ system, messages });
    const stream = beta ? client.beta.messages.stream(params, { signal: ac.signal }) : client.messages.stream(params, { signal: ac.signal });
    stream.on('text', (text) => send({ type: 'text', text }));

    const final = await stream.finalMessage();
    // Solo numeri di consumo nei log: mai il contenuto delle conversazioni.
    console.log(`[chat] in=${final.usage.input_tokens} cache_read=${final.usage.cache_read_input_tokens ?? 0} out=${final.usage.output_tokens} stop=${final.stop_reason}`);
    send({ type: 'done', stop: final.stop_reason });
  } catch (err) {
    if (ac.signal.aborted) return res.end();
    console.error('[chat] errore:', err?.status || '', err?.message || err);
    send({ type: 'error', kind: messaggioDiErrore(err) });
  }
  res.end();
}

// Riepilogo di fine lezione: una risposta breve, senza streaming. Le foto non vengono inviate.
function parseRecap(text) {
  const m = /PER LEI:\s*([\s\S]*?)\s*PER IL DIARIO:\s*([\s\S]*)$/i.exec(text);
  const her = m ? m[1] : text.split(/\n{2,}/)[0];
  const diary = m ? m[2] : text;
  return { her: her.trim().slice(0, 600), diary: diary.trim().slice(0, 900) };
}

async function handleRecap(req, res) {
  if (!guard(req, res)) return;
  let messages, studentName;
  try {
    const body = JSON.parse(await readBody(req, 14 * 1024 * 1024));
    messages = sanitizeMessages(body.messages, { requireLastUser: false }); // la lezione finisce di solito con il tutor
    studentName = body.studentName;
  } catch (e) {
    return json(res, 400, { error: e instanceof BadRequest ? e.message : 'Richiesta non valida' });
  }
  try {
    if (cfg.demo) return json(res, 200, demoRecap());
    const text = transcript(messages, cfg.tutorName);
    if (!text) return json(res, 400, { error: 'Non c’è ancora niente da riassumere.' });
    const { beta, params } = claudeParams({
      max_tokens: 2000,
      system: buildRecapPrompt({ tutorName: cfg.tutorName, studentName }),
      messages: [{ role: 'user', content: `<lezione>\n${text}\n</lezione>` }],
    });
    const msg = beta ? await client.beta.messages.create(params) : await client.messages.create(params);
    console.log(`[recap] in=${msg.usage.input_tokens} out=${msg.usage.output_tokens} stop=${msg.stop_reason}`);
    const out = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!out.trim()) return json(res, 502, { error: 'Riepilogo non disponibile', kind: 'generico' });
    return json(res, 200, parseRecap(out));
  } catch (err) {
    console.error('[recap] errore:', err?.status || '', err?.message || err);
    return json(res, 502, { error: 'Riepilogo non disponibile', kind: messaggioDiErrore(err) });
  }
}

// --- Avvio ------------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/config') {
      return json(res, 200, {
        tutorName: cfg.tutorName,
        needsCode: Boolean(cfg.accessCode),
        demo: cfg.demo,
        faceCamera: cfg.faceCamera,
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') return await handleChat(req, res);
    if (req.method === 'POST' && url.pathname === '/api/recap') return await handleRecap(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(url.pathname, req, res);
    json(res, 405, { error: 'Metodo non consentito' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Errore interno' });
    else res.end();
  }
});

server.listen(cfg.port, cfg.host, () => {
  console.log(`\n  ${cfg.tutorName} è pronto → http://localhost:${cfg.port}\n`);
  if (cfg.demo) console.log('  MODALITÀ DEMO: nessuna chiave API trovata, le risposte sono di prova.\n  (Vedi README.md per aggiungere la chiave.)\n');
  else console.log(`  Modello: ${cfg.model} · ragionamento: ${cfg.effort || 'predefinito'} · limite giornaliero: ${cfg.dailyLimit} messaggi`);
  if (cfg.host === '0.0.0.0' && !cfg.accessCode && !cfg.demo) {
    console.log('  ATTENZIONE: il server è raggiungibile da altri e non ha ACCESS_CODE: chiunque conosca il link userebbe la tua chiave API.');
  }
});
