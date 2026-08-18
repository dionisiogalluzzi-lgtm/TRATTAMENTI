# AGENTS.md

Istruzioni operative per gli agenti che lavorano su questo repository.

## Lingua e UX

- Interfaccia utente in italiano.
- Terminologia agricola chiara e operativa.
- Preferire flussi semplici per operatori non tecnici, soprattutto su smartphone/tablet.
- Evitare campi tecnici visibili quando possono essere derivati automaticamente.

## Architettura

- Next.js App Router + TypeScript.
- Supabase come database, autenticazione e storage.
- Vercel come ambiente di deploy.
- Mantenere il dominio separato dalla UI: logica di fabbisogni, giacenze, dosi e costi deve essere testabile.

## Regole di dominio non negoziabili

1. Il sistema gestisce più aziende agricole nello stesso database.
2. Il magazzino è fisicamente unico ma la proprietà della merce è sempre attribuita a un'azienda.
3. Un trasferimento interaziendale non modifica magicamente la proprietà: deve produrre movimenti tracciabili di uscita dall'azienda cedente e ingresso nell'azienda ricevente.
4. Gli appezzamenti hanno superficie anagrafica fissa; la superficie trattata può derivare dalla modalità tutte le file / file alternate.
5. Il fabbisogno di prodotto va calcolato prima dell'esecuzione e confrontato con la giacenza dell'azienda corretta.
6. Una pianificazione può richiedere acquisti; il sistema deve conservare fabbisogno, disponibile e quantità da acquistare.
7. L'esecuzione deve conservare quantità effettive e non sovrascrivere i valori pianificati.
8. I dati di etichetta dei fitofarmaci devono essere storicizzabili: non assumere che un'etichetta aggiornata possa sostituire retroattivamente quella valida al momento del trattamento.

## Sicurezza Supabase

- Abilitare RLS su ogni tabella in schema esposto.
- Non usare `user_metadata` per decisioni di autorizzazione.
- Preferire `app_metadata` o tabelle applicative protette per ruoli e aziende accessibili.
- Le policy UPDATE devono avere sia `USING` sia `WITH CHECK` quando applicabile.
- Non usare `SECURITY DEFINER` per aggirare problemi di permessi.
- Non esporre mai `service_role` o secret key nel browser.
- Le variabili `NEXT_PUBLIC_*` devono contenere soltanto valori sicuri per il client.

## Database e migrazioni

- Le modifiche allo schema devono essere versionate.
- Prima di introdurre una nuova entità verificare se il concetto è già rappresentato nel modello.
- Usare UUID come chiavi applicative salvo motivo documentato contrario.
- Aggiungere `created_at` e, quando serve, `updated_at` ai dati operativi.
- Non cancellare dati storici necessari a registro trattamenti, magazzino o costi: preferire stato/annullamento con audit.

## Qualità

Prima di considerare completato un task:

- eseguire typecheck/build;
- verificare il flusso interessato;
- per modifiche database controllare RLS e advisor di sicurezza;
- non committare `.env.local`, token o chiavi;
- aggiornare README o documentazione di dominio se cambia una regola funzionale.

## Priorità iniziale

1. Fondazione applicazione + Supabase + Vercel.
2. Auth e modello utenti/ruoli/aziende.
3. Anagrafiche aziende, appezzamenti, colture, prodotti, operatori, attrezzature.
4. Magazzino per proprietà aziendale.
5. Pianificazione e calcolo fabbisogni.
6. Acquisti e trasferimenti.
7. Esecuzione e registro trattamenti.
8. Costi e reportistica.
