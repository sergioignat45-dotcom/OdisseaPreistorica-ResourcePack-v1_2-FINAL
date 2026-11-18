// Modalità demo: risposte "finte" ma nel formato vero, per provare faccia, voce e lavagna
// anche senza chiave API. Si attiva da sola se manca la chiave, oppure con `npm run demo`.

function ultimoTesto(messages) {
  const last = messages[messages.length - 1];
  const t = last.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
  return { testo: t.toLowerCase(), conFoto: last.content.some((b) => b.type === 'image') };
}

export function demoReply(messages) {
  const { testo, conFoto } = ultimoTesto(messages);

  if (conFoto) {
    return 'Ho ricevuto la tua foto! In modalità demo non posso leggerla davvero, ma con la chiave API riuscirei a leggere l’esercizio e a correggerlo insieme a te, un passaggio alla volta. Che cosa ti piacerebbe provare adesso?';
  }
  if (/matematica|equazion|calcol|algebra|geometria/.test(testo)) {
    return `Facciamo un esempio insieme: risolviamo due x più tre uguale undici.
<lavagna>
2x + 3 = 11
2x = 11 - 3
2x = 8
x = 8 / 2
x = 4
</lavagna>
Guarda la lavagna: prima portiamo il tre dall'altra parte cambiando segno, poi dividiamo per due. Ora tocca a te: quanto vale x se tre x meno uno è uguale a otto?`;
  }
  if (/ingles|english|francese|spagnolo|lingua/.test(testo)) {
    return `Certo! Per salutare in inglese si dice <en>Hello, how are you?</en> e vuol dire ciao, come stai. E per rispondere: <en>I'm fine, thank you!</en> Provi a ripeterlo ad alta voce?
<lavagna>
Hello, how are you?
I'm fine, thank you!
</lavagna>`;
  }
  if (/ciao|salve|buongiorno|buonasera/.test(testo)) {
    return 'Ciao! Che bello sentirti. In questo momento sono in modalità demo, quindi ti rispondo con frasi di prova. Scrivi o di’ matematica oppure inglese, e ti faccio vedere come lavoro con la lavagna e con le lingue.';
  }
  return 'Questa è la modalità demo: non sto usando davvero l’intelligenza artificiale, ma puoi già provare la faccia, la voce e la lavagna. Chi ha installato l’app può aggiungere la chiave API, e allora potrò rispondere a qualsiasi domanda di scuola. Intanto prova a dire matematica o inglese!';
}

// Spezzetta il testo come farebbe uno streaming vero.
export async function* demoStream(text, signal) {
  for (let i = 0; i < text.length; i += 6) {
    if (signal?.aborted) return;
    yield text.slice(i, i + 6);
    await new Promise((r) => setTimeout(r, 18));
  }
}
