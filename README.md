# AGRIGAL · TRATTAMENTI

Applicazione web multiazienda per gestione agricola, pianificazione trattamenti, magazzino fitosanitari, acquisti, attività di campo e quaderno di campagna digitale.

## Stack

- Next.js 16 + React 19 + TypeScript
- Supabase Postgres, Auth, Row Level Security e Storage
- Vercel per deploy automatico dal branch `main`

## Principi funzionali

- più aziende agricole nello stesso ambiente;
- un magazzino fisico condiviso, con proprietà delle scorte distinta per azienda;
- trasferimenti interaziendali registrati come movimenti doppi e tracciabili;
- appezzamenti con superficie anagrafica fissa e cicli colturali storicizzati;
- trattamenti multi-appezzamento e multi-prodotto;
- vigneto/impianti gestibili su tutte le file o file alternate;
- dosi per ettaro o per 100 L e volume acqua in L/ha;
- fabbisogno automatico per azienda e confronto con giacenze;
- generazione degli acquisti mancanti e carico a magazzino alla ricezione;
- scheda operatore per quantità reali, orari, BBCH, meteo e note;
- scarico automatico delle scorte alla chiusura dell'intervento;
- snapshot storici di prodotto, autorizzazione, coltura e intervallo di carenza;
- controlli di conformità sulle regole di etichetta censite;
- archivio documentale privato per ricette, etichette, DDT, analisi e certificazioni;
- audit log delle operazioni sensibili;
- export CSV del quaderno digitale.

## Ruoli

### ADMIN
Può configurare aziende, appezzamenti, colture, prodotti/etichette, attrezzature e fornitori; gestisce scorte, trasferimenti, acquisti, utenti, ruoli e accessi aziendali; crea piani e genera fabbisogni.

### OPERATOR
Vede esclusivamente aziende/piani autorizzati, svolge le esecuzioni assegnate, inserisce consuntivi, attività di campo e documenti per le aziende abilitate.

Gli account nuovi nascono sempre come `OPERATOR`. Il primo ADMIN viene attivato con un codice monouso conservato solo come hash nel database; il codice non è versionato nel repository.

## Flusso trattamento

1. ADMIN crea il piano, seleziona appezzamenti, modalità file, acqua, prodotti, dosi, operatore e attrezzatura.
2. Il database calcola i fabbisogni per azienda.
3. Le giacenze vengono confrontate automaticamente con il fabbisogno.
4. Il motore di conformità verifica le regole di etichetta censite: coltura, dose, numero applicazioni, intervallo minimo e intervallo di sicurezza.
5. Se mancano prodotti, l'ADMIN può generare ordini proposti per azienda.
6. Alla ricezione degli ordini vengono creati lotti e movimenti di magazzino.
7. Un piano senza carenze e senza controlli `BLOCKING` può essere avviato.
8. L'operatore registra consuntivo, quantità reali, orari, BBCH e meteo.
9. Alla chiusura vengono creati gli scarichi di magazzino e la registrazione entra nel quaderno digitale.

## Quaderno di campagna digitale

La vista `v_qdca_records` espone dati strutturati per ogni intervento completato: data e orari, azienda, appezzamento/localizzazione, superficie trattata, coltura, EPPO, BBCH, prodotto e numero di autorizzazione, dose e base dose, quantità, operatore, attrezzatura, meteo e intervallo di carenza.

L'app include un export CSV macchina-leggibile. L'eventuale interscambio diretto con SIAN/servizi istituzionali dovrà usare le specifiche ufficiali disponibili per il canale di cooperazione applicativa; non viene simulata una certificazione o un endpoint non ufficiale.

## Sicurezza

- RLS attiva su tutte le tabelle esposte;
- nessuna `service_role` nel frontend o nel repository;
- viste con `security_invoker`;
- RPC privilegiate non eseguibili da `anon` e con controlli interni di ruolo/assegnazione;
- bucket `farm-documents` privato;
- audit trail sui flussi sensibili.

## Variabili ambiente

Copia `.env.example` in `.env.local` in locale e valorizza:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Le stesse variabili sono configurate nel progetto Vercel. Non aggiungere mai password database, secret key o `service_role` a variabili `NEXT_PUBLIC_*`.

## Sviluppo

```bash
npm install
npm run typecheck
npm run dev
```

Build produzione:

```bash
npm run build
```

## Database

Il database di riferimento è il progetto Supabase `TRATTAMENTI`. Le modifiche DDL vengono applicate come migrazioni Supabase e verificate con Security/Performance Advisors. Per lavoro futuro, mantenere schema, RLS e funzioni sincronizzati con le migrazioni del progetto.

## Regole per agenti

Leggere `AGENTS.md` prima di modificare codice, schema o autorizzazioni. Evitare scorciatoie che aggirano RLS o usano chiavi privilegiate nel client.
