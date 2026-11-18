# Studiamo insieme — un tutor con cui parlare

Un'app web per aiutare una ragazza di terza media a studiare: lei **parla** al microfono, il tutor **risponde a voce** con una **faccia animata**, scrive formule e schemi su una **lavagna** e, se serve, può **guardare una foto** del quaderno o del libro. Dietro c'è Claude (l'intelligenza artificiale di Anthropic), istruito per comportarsi da insegnante di ripetizioni: guida passo passo, non fa i compiti al posto suo, fa quiz e interrogazioni, prepara all'esame e alle prove INVALSI.

> La faccia è un personaggio disegnato (non una persona vera), così non ci sono problemi di "uncanny valley" e non costa nulla. Si può ridisegnare in `public/avatar.js`.

---

## 1. Provala subito (2 minuti, gratis)

Serve [Node.js](https://nodejs.org) (versione 20 o più nuova). Da terminale, in questa cartella:

```bash
npm install
npm run demo
```

Apri **http://localhost:3000** in Chrome, Edge o Safari. In modalità demo le risposte sono finte (frasi di prova), ma puoi già vedere la faccia, la voce, la lavagna e la fotocamera. Prova a scrivere "matematica" o "inglese".

## 2. Farla funzionare davvero

1. Crea un account su <https://console.anthropic.com>, aggiungi un po' di credito e crea una **chiave API** (sezione *API keys*). L'account e il metodo di pagamento devono essere di **un adulto**.
2. Nella console imposta un **limite di spesa mensile** (per esempio 10 €): è la protezione più sicura contro sorprese.
3. Copia `.env.example` in `.env` e incolla la chiave dopo `ANTHROPIC_API_KEY=`.
4. `npm start` e apri <http://localhost:3000>.

Il file `.env` resta sul tuo computer: **non caricarlo mai su GitHub** (è già escluso da `.gitignore`).

### Quanto costa?
Il modello predefinito è `claude-opus-5-5` (il più capace). Stima indicativa, **non misurata**: da qualche decina di centesimi a circa un euro per una lezione di 20 minuti. Per spendere meno cambia `MODEL` nel `.env`:

| Modello | Quando conviene |
|---|---|
| `claude-opus-5-5` | Massima qualità nelle spiegazioni (predefinito) |
| `claude-sonnet-5-5` | Più veloce, circa metà prezzo: ottimo per la maggior parte delle lezioni |
| `claude-haiku-5-5` | Velocissimo ed economico (pochi centesimi a lezione), un po' meno profondo |

Il server mostra nel terminale quanti token usa ogni risposta (mai il contenuto delle conversazioni) e blocca tutto dopo `DAILY_LIMIT` messaggi al giorno (predefinito 300).

## 3. Usarla dal telefono o dal tablet

Microfono e riconoscimento vocale funzionano **solo su connessioni sicure (https)**, oppure su `localhost` (cioè sullo stesso computer dove gira il server). Un indirizzo tipo `http://192.168.1.20:3000` dalla rete di casa **non basta**. Due strade:

- **Prova veloce da telefono:** un tunnel https temporaneo, per esempio `cloudflared tunnel --url http://localhost:3000` (dà un link `https://….trycloudflare.com`).
- **Uso quotidiano:** mettere l'app online su un servizio che esegue Node.js (per esempio Render o Railway): *Root directory* `tutor`, *Build* `npm install`, *Start* `npm start`, e come variabili d'ambiente `ANTHROPIC_API_KEY` e `ACCESS_CODE`.

> **Se l'app è online, imposta sempre `ACCESS_CODE`.** Senza, chiunque conosca il link userebbe la tua chiave a tue spese. Lei scrive il codice una volta sola sul suo dispositivo.

Sul telefono si può poi "Aggiungere alla schermata Home" e si apre come una vera app.

## 4. Come si usa

- **Tocca il microfono**, parla, e smetti: dopo un attimo di silenzio il tutor capisce che hai finito (oppure premi *Ho finito*). Dopo la risposta il microfono si riapre da solo (si può disattivare nelle impostazioni).
- **Quaderno**: sul telefono apre la fotocamera; sul computer la webcam. Vede la foto solo quando la scatti e la confermi, e la usa nel messaggio successivo.
- **Scrivi**: se il microfono non c'è o c'è rumore.
- **Tocca a me**: interrompe il tutor mentre parla.
- **Ripeti**: rilegge l'ultima risposta.
- I bottoncini in alto scelgono la materia (italiano, matematica, … INVALSI).

## 5. Privacy e sicurezza (è una ragazzina: leggi questa parte)

- **Il riconoscimento vocale lo fa il browser**: in Chrome l'audio va ai server di Google, in Safari ad Apple. Il server di questa app e Claude ricevono **solo il testo** e le **foto che lei decide di scattare**.
- La fotocamera non è mai accesa di nascosto: si accende solo quando preme *Quaderno*.
- Il server **non salva le conversazioni**: nei log ci sono solo numeri di consumo. La conversazione resta nel browser finché chiude la scheda (si cancella dalle impostazioni).
- Il tutor è istruito (vedi `prompt.js`) a: parlare solo di cose adatte all'età, non chiedere mai dati personali, non fare i compiti al posto suo, dire quando non è sicuro di un fatto e, se lei sembra stare male o essere in pericolo, ascoltarla, rimandarla a un adulto di fiducia e ricordare **Telefono Azzurro 19696** e il **112**.
- Nessun sistema è perfetto: finché è piccola è bene che un adulto sappia come funziona e dia ogni tanto un'occhiata alla cronologia (icona 💬). Un tutor virtuale non sostituisce la scuola, i professori o i genitori.

## 6. Personalizzare

| Cosa | Dove |
|---|---|
| Nome del tutor, codice di accesso, limiti, modello | `.env` (vedi `.env.example`) |
| Cosa sa di lei: programma, argomenti difficili, verifiche vicine | copia `profilo.example.txt` in **`profilo.txt`** (letto a ogni messaggio, non serve riavviare) |
| Carattere e metodo di insegnamento | `prompt.js` |
| Aspetto e colori della faccia | `public/avatar.js` (in cima) |
| Colori e grafica dell'app | `public/style.css` |

Suggerimento: nel `profilo.txt` scrivi la seconda lingua che studia, gli argomenti su cui fa fatica e le date delle verifiche. Può anche mostrare al tutor le pagine del libro con la fotocamera: è il modo migliore per fargli seguire il **programma esatto** della sua classe.

## 7. Come funziona (in breve)

```
 microfono ─► riconoscimento vocale del browser ─► testo ─┐
 fotocamera ─► foto ridimensionata (solo se la scatta) ───┤
                                                          ▼
                                     server Node (tiene la chiave API)
                                                          ▼
                                         Claude (API Anthropic, streaming)
                                                          ▼
          frasi ─► voce del browser + bocca animata ◄── testo a pezzetti
          <lavagna>…</lavagna> ─► lavagna sullo schermo (non viene letta)
          <en>…</en> <fr>…</fr> ─► pronuncia nella lingua giusta
```

La risposta arriva in streaming e la voce parte dopo la prima frase, così la conversazione è naturale. Il server usa l'SDK ufficiale `@anthropic-ai/sdk`, mette in cache la conversazione (costa circa 10 volte meno rileggerla) e abilita il "paracadute" lato server di Anthropic (se i filtri di sicurezza rifiutano una risposta, la richiesta viene riprovata automaticamente su un modello sostitutivo).

## 8. Limiti attuali e idee per dopo

- La **qualità della voce** dipende dal dispositivo (Edge, Chrome e iPhone hanno buone voci italiane; si sceglie in *Impostazioni*). Si può sostituire con una voce a pagamento molto più naturale (es. ElevenLabs o OpenAI TTS) cambiando solo `public/voice.js` e aggiungendo un endpoint nel server.
- Il **riconoscimento vocale** del browser a volte sbaglia con i nomi propri e le parole difficili: il tutor è istruito a chiedere conferma quando qualcosa non torna. Alternativa: servizi di trascrizione dedicati.
- La **faccia** è un cartone animato. Un volto realistico con labiale è possibile con servizi esterni a pagamento di "avatar parlanti", ma costano molto di più e mandano video/voce a terzi.
- Idee: riepilogo a fine lezione per i genitori, "quaderno degli errori" da ripassare, quiz a ripetizione dilazionata, più utenti, esercizi con punteggio.

## Sviluppo

```bash
npm test      # test del parser delle risposte e della validazione
npm run demo  # senza chiave API
```

File principali: `server.js` (server e API), `prompt.js` (carattere del tutor), `validate.js` (controlli sui dati in arrivo), `public/` (app: `app.js`, `avatar.js`, `voice.js`, `stream.js`).
