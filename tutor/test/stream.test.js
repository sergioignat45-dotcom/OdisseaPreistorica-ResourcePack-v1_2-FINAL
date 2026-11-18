import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TagParser, SentenceChunker, cleanForSpeech } from '../public/stream.js';

function run(chunks) {
  const say = [];
  const boards = [];
  const p = new TagParser({
    onSay: (t, lang) => say.push([lang, t]),
    onBoard: (t, done) => boards.push([t, done]),
  });
  for (const c of chunks) p.feed(c);
  p.end();
  // unisce i pezzetti consecutivi con la stessa lingua
  const merged = [];
  for (const [lang, t] of say) {
    if (merged.length && merged.at(-1)[0] === lang) merged.at(-1)[1] += t;
    else merged.push([lang, t]);
  }
  return { say: merged, boards };
}

test('testo semplice', () => {
  const r = run(['Ciao, ', 'come stai?']);
  assert.deepEqual(r.say, [['it', 'Ciao, come stai?']]);
});

test('lavagna: non viene detta a voce', () => {
  const r = run(['Guarda: <lavagna>2x + 3 = 11\nx = 4</lavagna> chiaro?']);
  assert.deepEqual(r.say, [['it', 'Guarda:  chiaro?']]);
  assert.equal(r.boards.at(-1)[0], '2x + 3 = 11\nx = 4');
  assert.equal(r.boards.at(-1)[1], true);
});

test('etichetta spezzata ovunque tra i pezzetti', () => {
  const text = 'Prima <lavagna>a^2 + b^2</lavagna> poi <en>hello</en> fine.';
  for (let cut = 1; cut < text.length; cut++) {
    const r = run([text.slice(0, cut), text.slice(cut)]);
    assert.deepEqual(r.say, [['it', 'Prima  poi '], ['en', 'hello'], ['it', ' fine.']], `taglio a ${cut}`);
    assert.equal(r.boards.at(-1)[0], 'a^2 + b^2', `taglio a ${cut}`);
  }
});

test('un pezzetto alla volta (carattere per carattere)', () => {
  const text = 'Dì <fr>bonjour</fr>, ok. <lavagna>x<y</lavagna>';
  const r = run([...text]);
  assert.deepEqual(r.say, [['it', 'Dì '], ['fr', 'bonjour'], ['it', ', ok. ']]);
  assert.equal(r.boards.at(-1)[0], 'x<y');
});

test('il segno < normale nel testo non viene perso', () => {
  const r = run(['se 3 < 5 allora ', 'va bene']);
  assert.equal(r.say.map((s) => s[1]).join(''), 'se 3 < 5 allora va bene');
});

test('lavagna lasciata aperta viene chiusa a fine risposta', () => {
  const r = run(['Ecco <lavagna>riga 1\nriga 2']);
  assert.equal(r.boards.at(-1)[0], 'riga 1\nriga 2');
  assert.equal(r.boards.at(-1)[1], true);
});

test('cleanForSpeech toglie markdown, emoji e link', () => {
  assert.equal(cleanForSpeech('**Bravissima!** 🎉 Vedi https://example.com ora'), 'Bravissima! Vedi ora');
  assert.equal(cleanForSpeech('- uno\n- due'), 'uno due');
});

test('SentenceChunker: spezza in frasi e attacca quelle cortissime', () => {
  const out = [];
  const c = new SentenceChunker((t, l) => out.push([l, t]));
  c.push('Ok. Adesso vediamo insieme come si risolve questa equazione. ', 'it');
  c.push('Poi proviamo con un altro esempio più difficile', 'it');
  c.push(' Hello there my friend, how are you doing today?', 'en');
  c.flush();
  assert.deepEqual(out, [
    ['it', 'Ok. Adesso vediamo insieme come si risolve questa equazione.'],
    ['it', 'Poi proviamo con un altro esempio più difficile'],
    ['en', 'Hello there my friend, how are you doing today?'],
  ]);
});

test('SentenceChunker: i decimali non spezzano la frase', () => {
  const out = [];
  const c = new SentenceChunker((t) => out.push(t));
  c.push('Il risultato è 3.5 e quindi la risposta cambia completamente rispetto a prima. ', 'it');
  c.flush();
  assert.equal(out.length, 1);
});
