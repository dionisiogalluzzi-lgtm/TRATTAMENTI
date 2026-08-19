# AGENTS.md

Istruzioni operative per gli agenti che lavorano su questo repository.

## Lingua e UX

- Interfaccia utente in italiano.
- Terminologia agricola chiara e operativa.
- Preferire flussi semplici per operatori non tecnici, soprattutto su smartphone/tablet.
- Evitare campi tecnici visibili quando possono essere derivati automaticamente.
- La schermata operatore deve privilegiare poche azioni, pulsanti grandi e consuntivo rapido.

## Architettura

- Next.js App Router + TypeScript.
- Supabase come database, autenticazione e storage.
- Vercel come ambiente di deploy.
- Mantenere il dominio separato dalla UI: logica di fabbisogni, giacenze, dosi, conformità e costi deve vivere nel database o in funzioni testabili, non essere duplicata nelle pagine.

## Regole di dominio non negoziabili

1. Il sistema gestisce più aziende agricole nello stesso database.
2. Il magazzino è fisicamente unico ma la proprietà della merce è sempre attribuita a un'azienda.
3. Un trasferimento interaziendale deve produrre movimenti tracciabili di uscita dall'azienda cedente e ingresso nell'azienda ricevente.
4. Gli appezzamenti hanno superficie anagrafica fissa; la superficie trattata può derivare dalla modalità tutte le file / file alternate.
5. Il fabbisogno di prodotto va calcolato prima dell'esecuzione e confrontato con la giacenza dell'azienda corretta.
6. Una pianificazione può richiedere acquisti; conservare fabbisogno, disponibile e quantità da acquistare.
7. L'esecuzione conserva quantità effettive e non sovrascrive i valori pianificati.
8. Le etichette dei fitofarmaci sono versionate. Non modificare retroattivamente lo storico di un trattamento completato.
9. Prima dell'esecuzione ricalcolare `refresh_plan_compliance`; un controllo `BLOCKING` impedisce l'avvio salvo forzatura esplicita di un ADMIN. La forzatura deve avere motivazione, firma logica dei controlli correnti e snapshot delle anomalie nell'esecuzione; non rende il trattamento conforme all'etichetta.
10. Se un'etichetta non è censita, l'app può segnalare `WARNING`, mai inventare dose o autorizzazione.
11. Alla chiusura di un trattamento vengono creati scarichi di magazzino e record QDCA da snapshot storici.
12. Non cancellare registrazioni di quaderno/magazzino per correggere un errore: usare annullamenti/rettifiche tracciate.
13. Le viste filtrate che mostrano solo righe conformi sono strumenti interni e non devono essere presentate come sostitutive del registro integrale degli impieghi realmente effettuati.

## QDCA / interoperabilità

- Mantenere in forma strutturata almeno: azienda/CUAA, data e orari, localizzazione/appezzamento, superficie trattata, coltura/EPPO, fase BBCH, prodotto, numero autorizzazione, dose, quantità, operatore, attrezzatura, meteo e intervallo di sicurezza quando disponibile.
- `v_qdca_records` è la vista di export del registro trattamenti e deve includere anche gli impieghi forzati/non conformi, con stato, anomalie e motivazione.
- Non dichiarare conformità/certificazione SIAN né inventare endpoint. Implementare un connettore soltanto su specifiche ufficiali del canale di cooperazione applicativa.

## Sicurezza Supabase

- RLS su ogni tabella in schema esposto.
- Non usare `user_metadata` per decisioni di autorizzazione.
- Ruoli e accessi aziendali sono in `profiles` e `company_users`, protetti da RLS.
- Le policy UPDATE devono avere `USING` e `WITH CHECK`.
- Non esporre `service_role`, secret key o password database nel browser/repository.
- Le variabili `NEXT_PUBLIC_*` devono contenere solo valori pubblicabili.
- Le RPC `SECURITY DEFINER` sono ammesse esclusivamente per transazioni atomiche di dominio che devono scrivere più tabelle protette. Devono avere `search_path` fissato, verifica esplicita di ruolo/utente, `EXECUTE` revocato a `anon`/`public` e grant esplicito solo al ruolo necessario.
- Le viste esposte devono usare `security_invoker = true`.
- Il bucket documenti resta privato; accesso in base all'azienda e URL firmati brevi.

## Database e migrazioni

- Le modifiche allo schema devono essere migrazioni Supabase versionate e applicate al progetto `TRATTAMENTI`.
- Prima di introdurre una nuova entità verificare se il concetto è già rappresentato.
- UUID come chiavi applicative salvo eccezione documentata.
- Aggiungere indici alle foreign key usate nei flussi operativi.
- `created_at` e, quando utile, `updated_at` sui dati operativi.
- Conservare snapshot sui record legali/storici invece di affidarsi solo a join verso anagrafiche mutabili.

## Qualità

Prima di considerare completato un task:

- eseguire typecheck/build;
- verificare il flusso interessato end-to-end;
- per DDL/RLS eseguire Security Advisor e Performance Advisor;
- non committare `.env.local`, token o chiavi;
- aggiornare README/documentazione se cambia una regola di dominio;
- verificare il deployment Vercel dopo il push su `main`.

## Priorità evolutive

1. Stabilità operativa e qualità del QDCA.
2. Catalogo etichette e controlli agronomico-normativi affidabili.
3. Import/export e cooperazione con servizi istituzionali quando sono disponibili specifiche ufficiali.
4. Mappe/geojson, meteo e DSS come supporto, non come sostituti della decisione dell'operatore.
5. Costi, indicatori per appezzamento/coltura/azienda e confronti stagionali.
