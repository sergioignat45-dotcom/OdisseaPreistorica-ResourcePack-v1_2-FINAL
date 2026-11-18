// Trasforma il testo che arriva "a pezzetti" da Claude in:
//   - frasi da dire a voce (con la lingua giusta: it, en, fr, es, de)
//   - contenuto della lavagna (non viene letto ad alta voce)
// Funziona anche quando un'etichetta come <lavagna> arriva spezzata a metà tra due pezzetti.

const LANGS = ['en', 'fr', 'es', 'de'];
const TAG_RE = new RegExp(`^<(/?)(lavagna|${LANGS.join('|')})>`);
const ALL_TAGS = ['<lavagna>', '</lavagna>', ...LANGS.flatMap((l) => [`<${l}>`, `</${l}>`])];
const BOARD_CLOSE = '</lavagna>';

// Quanti caratteri alla fine di `buf` coincidono con l'inizio di `tag`?
function partialSuffix(buf, tag) {
  for (let k = Math.min(tag.length - 1, buf.length); k > 0; k--) {
    if (buf.endsWith(tag.slice(0, k))) return k;
  }
  return 0;
}

export class TagParser {
  constructor({ onSay, onBoard }) {
    this.onSay = onSay; // (testo, lingua)
    this.onBoard = onBoard; // (testoCompleto, finito)
    this.buf = '';
    this.lang = 'it';
    this.inBoard = false;
    this.board = '';
  }

  feed(chunk) {
    this.buf += chunk;
    for (;;) {
      if (this.inBoard) {
        const i = this.buf.indexOf(BOARD_CLOSE);
        if (i >= 0) {
          this.board += this.buf.slice(0, i);
          this.buf = this.buf.slice(i + BOARD_CLOSE.length);
          this.inBoard = false;
          this.onBoard(this.board, true);
          continue;
        }
        const keep = partialSuffix(this.buf, BOARD_CLOSE);
        const take = this.buf.length - keep;
        if (take > 0) {
          this.board += this.buf.slice(0, take);
          this.buf = this.buf.slice(take);
          this.onBoard(this.board, false);
        }
        return;
      }

      const lt = this.buf.indexOf('<');
      if (lt < 0) {
        if (this.buf) this.onSay(this.buf, this.lang);
        this.buf = '';
        return;
      }
      if (lt > 0) {
        this.onSay(this.buf.slice(0, lt), this.lang);
        this.buf = this.buf.slice(lt);
      }
      const m = TAG_RE.exec(this.buf);
      if (m) {
        const [whole, closing, name] = m;
        this.buf = this.buf.slice(whole.length);
        if (name === 'lavagna') {
          if (!closing) {
            this.inBoard = true;
            this.board = '';
            this.onBoard('', false);
          }
        } else {
          this.lang = closing ? 'it' : name;
        }
        continue;
      }
      // Potrebbe essere l'inizio di un'etichetta non ancora arrivata per intero: aspetta.
      if (ALL_TAGS.some((t) => t.startsWith(this.buf))) return;
      // Altrimenti è un normale "<" nel testo.
      this.onSay('<', this.lang);
      this.buf = this.buf.slice(1);
    }
  }

  end() {
    if (this.inBoard) {
      this.board += this.buf;
      this.buf = '';
      this.inBoard = false;
      this.onBoard(this.board, true);
    } else if (this.buf) {
      this.onSay(this.buf, this.lang);
      this.buf = '';
    }
  }
}

// Toglie ciò che la sintesi vocale leggerebbe male: markdown, emoji, link.
export function cleanForSpeech(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/[*_`~#>]+/g, '')
    .replace(/\s*(->|→|=>)\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Spezza il parlato in frasi, così la voce parte dopo la prima frase invece che alla fine.
export class SentenceChunker {
  constructor(onChunk) {
    this.onChunk = onChunk; // (frase, lingua)
    this.buf = '';
    this.lang = 'it';
  }

  push(text, lang) {
    if (lang !== this.lang) {
      this.flush();
      this.lang = lang;
    }
    this.buf += text;
    this.drain(false);
  }

  flush() {
    this.drain(true);
  }

  drain(all) {
    const re = /[.!?…]+["'»”)]*\s+|\n+/g;
    let cut = 0;
    let m;
    while ((m = re.exec(this.buf))) {
      const piece = this.buf.slice(cut, m.index + m[0].length);
      // frasi cortissime (es. "Ok.") si attaccano alla successiva
      if (piece.trim().length >= 28) {
        this.emit(piece);
        cut = m.index + m[0].length;
      }
    }
    this.buf = this.buf.slice(cut);

    // frase molto lunga senza punteggiatura forte: taglia a una virgola/due punti
    if (!all && this.buf.length > 220) {
      const idx = Math.max(this.buf.lastIndexOf(', '), this.buf.lastIndexOf('; '), this.buf.lastIndexOf(': '));
      if (idx > 60) {
        this.emit(this.buf.slice(0, idx + 2));
        this.buf = this.buf.slice(idx + 2);
      }
    }
    if (all) {
      this.emit(this.buf);
      this.buf = '';
    }
  }

  emit(piece) {
    const clean = cleanForSpeech(piece);
    if (clean && /[\p{L}\p{N}]/u.test(clean)) this.onChunk(clean, this.lang);
  }
}
