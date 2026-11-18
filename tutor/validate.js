// Controlli sui dati che arrivano dal browser: il server non si fida mai di ciò che riceve.
// Dal browser passano SOLO testo e foto; modello, istruzioni e limiti li decide il server.

export class BadRequest extends Error {}

const MEDIA_OK = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGES = 40;
const MAX_TEXT = 4000; // caratteri per messaggio
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 6_000_000; // ~4,5 MB di foto
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    throw new BadRequest('Conversazione non valida');
  }
  let images = 0;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) throw new BadRequest('Messaggio non valido');
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    if (!Array.isArray(blocks)) throw new BadRequest('Messaggio non valido');

    const imgs = [];
    const texts = [];
    for (const b of blocks) {
      if (b && b.type === 'text' && typeof b.text === 'string') {
        const t = b.text.slice(0, MAX_TEXT);
        if (t.trim()) texts.push({ type: 'text', text: t });
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
        imgs.push({ type: 'image', source: { type: 'base64', media_type: b.source.media_type, data: b.source.data } });
      } else {
        throw new BadRequest('Contenuto non valido');
      }
    }
    const content = [...imgs, ...texts]; // le foto prima del testo
    if (content.length) out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') throw new BadRequest('Manca il messaggio dell’utente');
  return out;
}
