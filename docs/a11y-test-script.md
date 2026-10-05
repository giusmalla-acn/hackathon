# Specifica di interazione e script di test a11y — Registrazione guidata

Riferimenti: WCAG 2.2 AA · NVDA (ultima stabile) + Chrome/Firefox · Web Speech API (`speechSynthesis`).
Flusso: Welcome → Passo 1 Nome → Passo 2 Email → Passo 3 Password → Riepilogo → Conferma finale.

---

## 1. Regole di interazione

1. **Un campo per passo.** Ogni passo mostra un solo campo, un titolo (`h1`, `tabindex="-1"`) con la dicitura "Passo {n} di {totale}" e un'istruzione collegata al campo con `aria-describedby`.
2. **Validazione solo su "Avanti".** Mentre si scrive e quando si esce dal campo non compaiono né vengono annunciati errori.
3. **Ordine fisso dei pulsanti**, sia nel DOM sia a schermo: Ripeti · Spiega in altro modo · Esempio · Rileggi cosa ho scritto · Indietro · Avanti. Sono tutti `<button>` nativi con testo visibile uguale al nome accessibile.
4. **Nessuna scorciatoia a lettera singola** (WCAG 2.1.4). Funzionano solo Tab, Maiusc+Tab, Invio, Spazio ed Esc (Esc ferma la voce integrata).
5. **Due modalità che si escludono**, scelte nella Welcome con un gruppo di radio:
   - *Screen reader*: gli annunci passano da regioni `aria-live` (polite e assertive) e la voce integrata è spenta.
   - *Voce integrata*: gli annunci passano da TTS, le regioni live restano vuote e non si sente mai una doppia voce.
   Il clic su "Inizia" conta come gesto utente: sblocca `speechSynthesis` e conferma la modalità. Per cambiare modalità si torna alla Welcome (Indietro dal Passo 1).
6. **Focus sul titolo all'ingresso di ogni passo**, anche dopo Indietro e Modifica. L'istruzione si annuncia subito dopo il titolo.
7. **In caso di errore** il focus va sul campo, che riceve `aria-invalid="true"`. Il messaggio è visibile e collegato al campo con `aria-describedby`. L'annuncio è *assertive* (oppure TTS con `cancel()` della frase in corso) e include sempre il nome del campo. Se gli errori sono più di uno, l'annuncio inizia con `{n} errori trovati.` e legge solo il primo; il messaggio visibile li elenca tutti. Il colore non è l'unico indicatore.
8. **La password non viene mai letta senza conferma.** "Rileggi cosa ho scritto" chiede prima di procedere. Il riepilogo indica solo il numero di caratteri.
9. **Privacy.** Nessun valore dei campi viene inviato all'AI: l'AI riceve solo `{campo, tentativo, codiceErrore?}`. Nessun valore finisce in localStorage, sessionStorage, IndexedDB, cookie, URL o console. Se il backend AI non risponde entro 3 s, si usano le spiegazioni locali senza mostrare errori tecnici.
10. **Ogni nuovo comando interrompe la voce in corso**: un pulsante, la digitazione o Esc. Indietro e Modifica conservano i valori. Dopo una Modifica, "Avanti" riporta al Riepilogo.

---

## 2. Testi esatti degli annunci

Segnaposto: `{n}` numero del passo, `{totale}` = 3, `{etichetta}` (Nome, Email, Password), `{nome}`, `{email}`, `{lunghezza}` numero di caratteri, `{k}` indice della spiegazione, `{testo}`, `{esempio}`, `{valore}`, `{spelling}`.
In modalità Screen reader il titolo viene letto dal focus e il resto dalla regione polite. In modalità Voce integrata il TTS legge tutto il testo.

### 2.1 Ingresso nel passo

| Passo | Titolo (riceve il focus) | Istruzione |
|---|---|---|
| 1 | `Passo 1 di 3: Nome` | `Scrivi il tuo nome, poi premi Avanti.` |
| 2 | `Passo 2 di 3: Email` | `Scrivi il tuo indirizzo email, poi premi Avanti.` |
| 3 | `Passo 3 di 3: Password` | `Scegli una password di almeno 8 caratteri, con almeno una lettera e un numero. Non verrà letta ad alta voce senza la tua conferma. Poi premi Avanti.` |

- **Ripeti**: rilegge titolo e istruzione e, se c'è un errore attivo, anche l'errore.
- **Spiega in altro modo**: `Spiegazione {k} di 3: {testo}`. Dopo la terza: `Non ho altre spiegazioni. Premi Esempio per sentirne uno, oppure Ripeti.`
- **Esempio**: `Esempio: {esempio}. È solo un esempio, il campo non è stato modificato.`
- **Rileggi cosa ho scritto** (Nome, Email): `Hai scritto: {valore}. Lettera per lettera: {spelling}.` Se il campo è vuoto: `Il campo {etichetta} è vuoto.`
  - Regole di spelling: i caratteri sono separati da virgola; `@` si legge "chiocciola", `.` "punto", `-` "trattino", `_` "trattino basso"; le maiuscole si leggono "{lettera} maiuscola"; lo spazio si legge "spazio".
- **Rileggi cosa ho scritto** (Password):
  1. Il focus va alla domanda: `Stai per sentire la password ad alta voce. Assicurati che nessuno possa ascoltare. Vuoi continuare?`, con i pulsanti `Sì, leggi la password` e `No, torna al campo`.
  2. Con Sì: `La password è: {spelling}.`, poi il focus torna al campo. Con No: il focus torna al campo e non si sente nulla.

### 2.2 Errori (formato: `Errore nel campo {etichetta}: {messaggio}`)

| Codice | Messaggio |
|---|---|
| `NAME_REQUIRED` | `il nome è vuoto. Scrivi il tuo nome, poi premi Avanti.` |
| `NAME_TOO_SHORT` | `il nome deve avere almeno 2 lettere.` |
| `EMAIL_REQUIRED` | `l'email è vuota. Scrivi il tuo indirizzo email, poi premi Avanti.` |
| `EMAIL_MISSING_AT` | `manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.` |
| `EMAIL_INVALID` | `l'email non è completa. Dopo la chiocciola serve un dominio con un punto, per esempio esempio punto it.` |
| `PASSWORD_REQUIRED` | `la password è vuota. Scegli una password di almeno 8 caratteri.` |
| `PASSWORD_TOO_SHORT` | `la password è troppo corta: hai scritto {lunghezza} caratteri, ne servono almeno 8.` |
| `PASSWORD_WEAK` | `la password è debole: aggiungi {mancanti}.` (`{mancanti}` = "una lettera" / "un numero" / "una lettera e un numero") |

Quando l'errore viene corretto e si preme Avanti, il passo successivo si annuncia normalmente, senza annunciare "errore risolto".

### 2.3 Cambio modalità (alla pressione di "Inizia")

- Screen reader: `Modalità screen reader attiva. Gli annunci saranno letti dal tuo screen reader.`
- Voce integrata: `Modalità voce integrata attiva. Se usi uno screen reader, mettilo in pausa per evitare voci sovrapposte. Premi Esc per fermare la voce in qualsiasi momento.`

### 2.4 Riepilogo

Titolo (riceve il focus): `Riepilogo dei dati`
Annuncio: `Controlla i tuoi dati. Nome: {nome}. Email: {email}. Password: inserita, {lunghezza} caratteri, non letta. Per correggere un dato premi Modifica accanto al dato. Per completare premi Conferma registrazione.`
Pulsanti: `Modifica nome`, `Modifica email`, `Modifica password`, `Indietro`, `Conferma registrazione`.

### 2.5 Conferma finale

Titolo (riceve il focus): `Registrazione completata`
Annuncio: `Registrazione completata, {nome}. Il tuo account è stato creato.`

---

## 3. Checklist E2E

Setup comune: NVDA ultima stabile, Chrome o Firefox aggiornato, DevTools aperti sulle schede Network e Application, storage svuotato prima di ogni scenario. Dove non indicato, la modalità è Screen reader.

| ID | Scenario | Passi | Risultato atteso | Esito |
|---|---|---|---|---|
| E2-1 | Percorso felice con NVDA | 1. Apri l'app, scegli "Screen reader", premi Inizia. 2. Compila Nome, Email e una password valida usando solo la tastiera e premendo Avanti dopo ogni campo. 3. Nel Riepilogo premi Conferma registrazione. | Si sente l'annuncio di modalità (2.3). A ogni passo il focus è sul titolo e si sentono titolo e istruzione (2.1), una sola volta e senza sovrapposizioni. Il Riepilogo e la conferma usano i testi 2.4 e 2.5. Non serve il mouse e non ci sono trappole del focus. | ☐ |
| E2-2 | Email senza @ | Al Passo 2 scrivi `anna.rossi.esempio.it` e premi Avanti. | Il focus è sul campo e il campo ha `aria-invalid="true"`. Si sente subito, intero e assertive: "Errore nel campo Email: manca la chiocciola…". Il messaggio è visibile e non è affidato solo al colore. Non si passa al passo successivo. | ☐ |
| E2-3 | Password debole | Al Passo 3: (a) scrivi `abc` e premi Avanti; (b) scrivi `abcdefgh` e premi Avanti. | (a) "2 errori trovati. Errore nel campo Password: la password è troppo corta: hai scritto 3 caratteri, ne servono almeno 8." (`PASSWORD_TOO_SHORT` + `PASSWORD_MISSING_DIGIT`; a schermo l'elenco di entrambi). (b) `PASSWORD_WEAK` con "aggiungi un numero". In entrambi i casi il focus è sul campo e la password non viene mai letta. | ☐ |
| E2-4 | "Spiega in altro modo" ×3, anche a backend spento | 1. Con backend attivo, premi il pulsante 3 volte e poi una quarta. 2. Ferma il backend AI e ripeti. | Si sentono "Spiegazione 1 di 3", "2 di 3" e "3 di 3", ogni volta con un testo diverso. Alla quarta pressione si sente il messaggio "Non ho altre spiegazioni…". A backend spento arrivano le spiegazioni locali entro 3 s, senza errori tecnici, e il focus resta sul pulsante. | ☐ |
| E2-5 | Interruzione della voce | Modalità Voce integrata. 1. Premi "Spiega in altro modo" e, mentre parla, premi Esc. 2. Premi Ripeti e, mentre parla, scrivi un carattere nel campo. 3. Premi Esempio e, mentre parla, premi Avanti. | In tutti e tre i casi la voce si ferma subito (entro 0,5 s) e la frase interrotta non riprende. Nel caso 3 si sente solo il nuovo annuncio. Le regioni live restano vuote. | ☐ |
| E2-6 | Rilettura lettera per lettera | 1. Al Passo 2 scrivi `Anna_R-1@esempio.it` e premi Rileggi. 2. Al Passo 3 premi Rileggi, poi No. 3. Premi di nuovo Rileggi, poi Sì. | 1. Si sente "A maiuscola, n, n, a, trattino basso, R maiuscola, trattino, 1, chiocciola, …, punto, i, t". 2. Il focus torna al campo e non si sente nulla della password. 3. Si sente la password lettera per lettera, poi il focus torna al campo. | ☐ |
| E2-7 | Payload e storage privi di valori | Completa E2-1 e E2-4 con valori riconoscibili (es. `ZZTEST`). Cerca `ZZTEST`, l'email e la password in: Network (body e URL delle chiamate AI), Application (localStorage, sessionStorage, IndexedDB, cookie), Console. | Nessuna occorrenza. Le chiamate AI contengono solo `campo`, `tentativo` ed eventualmente `codiceErrore`. I valori compaiono solo nella richiesta di registrazione finale. | ☐ |
| E2-8 | Indietro e Modifica | 1. Al Passo 3 premi Indietro due volte. 2. Torna avanti fino al Riepilogo. 3. Premi Modifica email, cambia il valore e premi Avanti. | 1. I valori sono conservati e a ogni passo il focus è sul titolo. 3. Il focus va sul titolo del Passo 2; dopo Avanti torni direttamente al Riepilogo, che annuncia la nuova email. | ☐ |
| E2-9 | axe, zoom 200%, forced-colors | 1. Esegui axe DevTools su Welcome, su ogni passo (anche in stato di errore), su Riepilogo e su Conferma. 2. Imposta lo zoom del browser al 200% e prova anche una finestra larga 320 px CSS. 3. Attiva un tema a contrasto di Windows (forced-colors). | 1. Nessuna violazione. 2. Nessuna perdita di contenuto o funzione e nessuno scroll orizzontale. Il focus non è coperto (2.4.11) e i bersagli misurano almeno 24×24 px (2.5.8). 3. Pulsanti, campi, focus visibile ed errori restano distinguibili e l'icona di errore resta visibile. | ☐ |

Chiusura: tutti gli scenari ☑. Ogni anomalia va registrata con ID scenario, browser, versione di NVDA e modalità.
