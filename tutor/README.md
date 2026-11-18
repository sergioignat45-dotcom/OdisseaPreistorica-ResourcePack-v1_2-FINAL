# Studiamo insieme — un tutor con cui parlare

Un'app web per aiutare una ragazza di terza media a studiare: lei **parla** al microfono, il tutor **risponde a voce** con una **faccia animata**, scrive formule e schemi su una **lavagna**, può **guardare una foto** del quaderno o del libro e, se lei vuole, **vederla dalla webcam** mentre lavora. Dietro c'è Claude (l'intelligenza artificiale di Anthropic), istruito per comportarsi da insegnante di ripetizioni.

Cosa sa fare: **aiutare con i compiti** (guidando, senza dare la soluzione), **studiare un argomento** a piccoli passi, **prepararsi a una verifica** (piano di ripasso in base ai giorni che restano e quiz di difficoltà crescente), **interrogazione orale** simulata, **quiz veloci**, **aiuto per temi e riassunti**, preparazione all'**esame** e alle prove **INVALSI**. A fine lezione fa un **riepilogo** e lo scrive in un **diario** che usa la volta dopo per ripartire da dove eravate.

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
- **Cosa facciamo?** (riga arancione): *Compiti*, *Studio*, *Verifica*, *Interrogazione*, *Quiz*, *Scrivere*. Ogni bottone cambia il metodo di lavoro del tutor. Si combinano con la **materia** (riga sotto). Per una verifica il tutor chiede materia, argomenti e data e costruisce il piano; sa che giorno è oggi.
- **Quaderno**: sul telefono apre la fotocamera; sul computer la webcam. Vede la foto solo quando la scatti e la confermi, e la usa nel messaggio successivo.
- **Occhio** (in alto): fa vedere lei al tutor, vedi sotto. Si accende dalla schermata iniziale o da qui, si spegne con la ✕ nel cerchietto.
- **Spunta verde** (in alto): *Finiamo qui*. Il tutor le dice due frasi di chiusura e lascia una nota nel **diario** (icona 💬 → *Diario delle lezioni*): argomenti, punti forti e deboli, cosa ripassare, verifiche nominate. Il diario sta nel browser di quel dispositivo; la lezione dopo il tutor lo legge per ricordarsi.
- **Scrivi**: se il microfono non c'è o c'è rumore.
- **Tocca a me**: interrompe il tutor mentre parla.
- **Ripeti**: rilegge l'ultima risposta.
- I bottoncini in alto scelgono la materia (italiano, matematica, … INVALSI).

## 5. Privacy e sicurezza (è una ragazzina: leggi questa parte)

- **Il riconoscimento vocale lo fa il browser**: in Chrome l'audio va ai server di Google, in Safari ad Apple. Il server di questa app e Claude ricevono **solo il testo** e le **foto che lei decide di scattare**.
- **Webcam «Mi vede»**: è **spenta di default** e la accende lei (o chi è con lei) dalla schermata iniziale. Quando è accesa si vede nel cerchietto con la scritta *Mi vede*, e si spegne con un tocco. Il video **non viene registrato né inviato in continuazione**: a Claude arriva **una sola foto piccola** (max 768 px) ogni volta che manda un messaggio, e solo l'ultima viene considerata; il server non la salva. Per togliere del tutto l'opzione metti `FACE_CAMERA=off` nel `.env`.
- **Il tutor non legge le emozioni dal viso.** È una scelta voluta: le regole d'uso di Anthropic vietano di inferire le emozioni delle persone dalle immagini, e comunque l'espressione è un indizio inaffidabile. La webcam serve per dare presenza e contesto pratico (c'è? sta scrivendo su un foglio? sta mostrando qualcosa?). Se vuole sapere come sta, glielo chiede a voce. Il tutor non commenta l'aspetto e non riconosce nessuno.
- La fotocamera del **Quaderno** si accende solo quando preme il bottone.
- Il server **non salva le conversazioni**: nei log ci sono solo numeri di consumo. La conversazione resta nel browser finché chiude la scheda (si cancella dalle impostazioni).
- Il tutor è istruito (vedi `prompt.js`) a: parlare solo di cose adatte all'età, non chiedere mai dati personali, non fare i compiti al posto suo, dire quando non è sicuro di un fatto e, se lei sembra stare male o essere in pericolo, ascoltarla, rimandarla a un adulto di fiducia e ricordare **Telefono Azzurro 19696** e il **112**.
- **Regole di Anthropic sui minori.** Le regole d'uso di Anthropic prevedono linee guida aggiuntive per i prodotti con cui i minorenni interagiscono direttamente, e l'account API deve essere di un adulto. Questo progetto è pensato come **strumento privato di famiglia, usato con la supervisione di un adulto**: non diffonderlo pubblicamente (usa `ACCESS_CODE`) e leggi le regole: <https://www.anthropic.com/legal/aup>. Non è una consulenza legale.
- Nessun sistema è perfetto: finché è piccola è bene che un adulto sappia come funziona e dia ogni tanto un'occhiata alla cronologia (icona 💬). Un tutor virtuale non sostituisce la scuola, i professori o i genitori.

## 6. Personalizzare

| Cosa | Dove |
|---|---|
| Nome del tutor, codice di accesso, limiti, modello, webcam on/off | `.env` (vedi `.env.example`) |
| Cosa sa di lei: programma, argomenti difficili, verifiche vicine | copia `profilo.example.txt` in **`profilo.txt`** (letto a ogni messaggio, non serve riavviare) |
| Carattere e metodo di insegnamento, uno per uno i bottoni «Cosa facciamo?» | `prompt.js` |
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
 webcam (se accesa) ─► 1 foto piccola per messaggio ──────┘ (come la foto del quaderno)
          <en>…</en> <fr>…</fr> ─► pronuncia nella lingua giusta
```

La risposta arriva in streaming e la voce parte dopo la prima frase, così la conversazione è naturale. Il server usa l'SDK ufficiale `@anthropic-ai/sdk`, mette in cache la conversazione (costa circa 10 volte meno rileggerla) e abilita il "paracadute" lato server di Anthropic (se i filtri di sicurezza rifiutano una risposta, la richiesta viene riprovata automaticamente su un modello sostitutivo).

## 8. Limiti attuali e idee per dopo

- Il tutor **non vede un video**: vede foto singole (quaderno, e se vuole webcam a ogni messaggio). Non può seguire in tempo reale mentre scrive; per correggere un esercizio sul foglio, lei scatta con *Quaderno*.
- Il **diario** sta nel browser: cambiando dispositivo o cancellando i dati si perde. Si può spostare sul server (con un piccolo database) se serve condividerlo tra più dispositivi o con i genitori.

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
