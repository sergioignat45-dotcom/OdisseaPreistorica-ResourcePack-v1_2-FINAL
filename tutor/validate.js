// Controlli sui dati che arrivano dal browser: il server non si fida mai di ciò che riceve.
// Dal browser passano SOLO testo e foto; modello, istruzioni e limiti li decide il server.

export class BadRequest extends Error {}

const MEDIA_OK = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGES = 40;
const MAX_TEXT = 4000; // caratteri per messaggio
const MAX_IMAGES = 4; // es. 2 foto del quaderno + 1 webcam
const MAX_IMAGE_B64 = 6_000_000; // ~4,5 MB di foto
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// requireLastUser: per rispondere serve che l'ultimo messaggio sia dell'utente; per il riepilogo no.
export function sanitizeMessages(raw, { requireLastUser = true } = {}) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    throw new BadRequest('Conversazione non valida');
  }
  let images = 0;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) throw new BadRequest('Messaggio non valido');
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    if (!Array.isArray(blocks)) throw new BadRequest('Messaggio non valido');

    // L'ordine dei blocchi si conserva: una riga di testo ("Foto del quaderno") precede la sua immagine.
    const content = [];
    for (const b of blocks) {
      if (b && b.type === 'text' && typeof b.text === 'string') {
        const t = b.text.slice(0, MAX_TEXT);
        if (t.trim()) content.push({ type: 'text', text: t });
      } else if (
        b &&
        b.type === 'image' &&
        m.role === 'user' &&
        b.source &&
        b.source.type === 'base64' &&
        MEDIA_OK.has(b.source.media_type) &&
        typeof b.source.data === 'string' &&
        b.source.data.length < MAX_IMAGE_B64 &&
        B64.test(b.source.data)
      ) {
        if (++images > MAX_IMAGES) throw new BadRequest('Troppe foto');
        content.push({ type: 'image', source: { type: 'base64', media_type: b.source.media_type, data: b.source.data } });
      } else {
        throw new BadRequest('Contenuto non valido');
      }
    }
    if (content.length) out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || (requireLastUser && out[out.length - 1].role !== 'user')) throw new BadRequest('Manca il messaggio dell’utente');
  return out;
}

// Per il riepilogo basta il testo: le immagini non vengono nemmeno inviate.
export function transcript(messages, tutorLabel = 'Tutor', studentLabel = 'Studentessa', maxChars = 14000) {
  const lines = messages.map((m) => {
    const who = m.role === 'user' ? studentLabel : tutorLabel;
    const text = m.content
      .map((b) => (b.type === 'text' ? b.text : '[foto]'))
      .filter((t) => !/^\[(Foto del quaderno|Webcam)/.test(t) && t !== '[foto]')
      .join(' ')
      .replace(/<\/?lavagna>/g, ' ')
      .replace(/<\/?(en|fr|es|de)>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? `${who}: ${text}` : '';
  });
  const all = lines.filter(Boolean).join('\n');
  return all.length > maxChars ? '…' + all.slice(all.length - maxChars) : all;
}
