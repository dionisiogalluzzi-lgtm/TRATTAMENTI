# TRATTAMENTI

Gestionale agricolo web per pianificare, autorizzare, eseguire e consuntivare trattamenti fitosanitari su più aziende agricole, con controllo del magazzino e dei costi.

## Obiettivo

La piattaforma deve supportare quattro aziende agricole nello stesso sistema mantenendo separata la proprietà delle scorte, pur con un magazzino fisicamente unico.

Flusso operativo principale:

1. Selezione azienda e appezzamenti.
2. Pianificazione trattamento con prodotti, dosi, acqua e modalità di distribuzione.
3. Calcolo automatico del fabbisogno per azienda.
4. Verifica giacenze disponibili.
5. Calcolo quantità da acquistare.
6. Registrazione acquisti e movimenti di magazzino.
7. Esecuzione del trattamento da parte dell'operatore.
8. Registro trattamenti, costi e reportistica storica.

## Regole di dominio essenziali

- Quattro aziende agricole gestite nello stesso database.
- Appezzamenti con superficie fissa e colture annuali o pluriennali.
- Magazzino fisico unico, proprietà delle scorte distinta per azienda.
- Trasferimenti interaziendali tracciati come movimenti contrapposti.
- Trattamenti su tutte le file oppure su file alternate.
- Acqua preimpostata oppure variabile in litri/ha.
- Prodotti fitosanitari con dati di etichetta, principi attivi, colture autorizzate, limiti e tempi di carenza.
- Calcolo del fabbisogno, disponibilità e quantità da acquistare prima dell'esecuzione.
- Tracciabilità di operatori, attrezzature, acquisti, costi e trattamenti eseguiti.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase (Postgres, Auth, Storage)
- Vercel

## Ambienti

Progetto Supabase: `TRATTAMENTI`

Project ref: `axjxyqjmjgotrzhgdrej`

Le credenziali non devono essere salvate nel repository. Copiare `.env.example` in `.env.local` soltanto in locale oppure configurare le stesse variabili in Vercel.

## Roadmap iniziale

### Fase 0 — Fondazione
- repository e applicazione base
- collegamento Supabase
- collegamento Vercel
- autenticazione e ruoli
- schema dati iniziale e RLS

### Fase 1 — Anagrafiche
- aziende
- appezzamenti
- colture
- operatori
- attrezzature
- prodotti fitosanitari e dati di etichetta

### Fase 2 — Magazzino
- giacenze per azienda/prodotto/lotto
- acquisti
- movimenti
- trasferimenti interaziendali

### Fase 3 — Pianificazione trattamenti
- appezzamenti inclusi
- prodotti e dosi
- acqua
- tutte le file / file alternate
- calcolo fabbisogno e quantità da acquistare

### Fase 4 — Esecuzione e registro
- presa in carico operatore
- quantità effettive
- consuntivo
- scarico magazzino
- registro trattamenti

### Fase 5 — Costi e report
- costo per trattamento
- costo per appezzamento/coltura/azienda
- storico e analisi periodiche

## Sicurezza

Tutte le tabelle esposte tramite Data API dovranno avere Row Level Security. I ruoli applicativi e i permessi dovranno essere basati su dati non modificabili dall'utente. Una chiave `service_role` o altra secret key non deve mai essere esposta nel client browser.
