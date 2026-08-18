# Modello dati iniziale

Questo documento descrive il modello funzionale da trasformare in migrazioni Supabase. Non sostituisce le migrazioni SQL.

## Identità e accesso

### profiles
Profilo applicativo collegato a `auth.users`.

Campi principali:
- `id` UUID = auth user id
- `nome`
- `cognome`
- `attivo`
- `created_at`

### roles
Ruoli applicativi, inizialmente almeno:
- ADMIN
- TECNICO
- OPERATORE

### user_roles
Associazione utenti/ruoli.

### user_aziende
Aziende che un utente è autorizzato a vedere o gestire.

## Anagrafiche agricole

### aziende
- ragione sociale / nome breve
- dati fiscali essenziali
- attiva

### colture
Catalogo colture.

### appezzamenti
- azienda
- codice/nome
- superficie ha
- coltura corrente
- tipo coltura: ANNUALE / PLURIENNALE
- eventuali note
- attivo

La superficie anagrafica è fissa salvo variazione esplicita dell'anagrafica.

### operatori
Operatori che eseguono i trattamenti.

### attrezzature
Atomizzatori, irroratrici, trattori o altre attrezzature rilevanti.

## Prodotti fitosanitari

### prodotti
Anagrafica commerciale del prodotto.

Campi indicativi:
- nome commerciale
- numero registrazione
- formulazione
- unità di misura base
- produttore
- attivo

### principi_attivi
Catalogo principi attivi.

### prodotto_principi_attivi
Composizione del prodotto con concentrazione/tenore.

### etichette_prodotto
Versioni storiche delle etichette.

Campi indicativi:
- prodotto
- versione/data validità
- documento sorgente
- valida_dal
- valida_al
- note

### etichetta_colture
Vincoli per coltura riferiti a una specifica versione di etichetta:
- coltura
- dose minima/massima
- unità dose
- numero massimo trattamenti
- intervallo
- tempo di carenza
- note/limitazioni

I trattamenti eseguiti devono mantenere il riferimento alla versione di etichetta rilevante per evitare riscritture retroattive della storia.

## Magazzino

Il magazzino è fisicamente unico, ma ogni quantità appartiene sempre a una specifica azienda.

### lotti_magazzino
- azienda proprietaria
- prodotto
- lotto
- scadenza
- quantità iniziale / metadati lotto

### movimenti_magazzino
Registro append-only dei movimenti.

Tipi indicativi:
- ACQUISTO
- SCARICO_TRATTAMENTO
- TRASFERIMENTO_USCITA
- TRASFERIMENTO_ENTRATA
- RETTIFICA_POSITIVA
- RETTIFICA_NEGATIVA
- ANNULLAMENTO

Campi:
- azienda
- prodotto
- lotto opzionale
- quantità con segno coerente o tipo+quantità
- unità di misura
- data/ora
- riferimento origine
- costo unitario quando applicabile
- causale

La giacenza è derivata dalla somma dei movimenti e non memorizzata come valore modificabile manualmente.

### trasferimenti
Testata del trasferimento interaziendale. La conferma genera almeno due movimenti correlati: uscita azienda cedente e ingresso azienda ricevente.

## Pianificazione trattamenti

### trattamenti
Testata della pianificazione/esecuzione.

Stati indicativi:
- BOZZA
- PIANIFICATO
- DA_ACQUISTARE
- PRONTO
- IN_ESECUZIONE
- ESEGUITO
- ANNULLATO

Campi principali:
- data prevista
- stato
- tecnico/creatore
- operatore assegnato
- attrezzatura
- note

### trattamento_appezzamenti
Appezzamenti inclusi nella pianificazione.

Campi:
- trattamento
- appezzamento
- modalità file: TUTTE / ALTERNATE
- superficie anagrafica snapshot
- coefficiente superficie trattata
- superficie trattata calcolata

Per file alternate il coefficiente iniziale atteso è 0,5, ma la regola dovrà essere esplicita e storicizzata.

### trattamento_prodotti
Prodotti previsti.

Campi:
- trattamento
- prodotto
- etichetta/versione applicata
- dose
- unità dose
- fabbisogno calcolato
- quantità disponibile al momento del calcolo
- quantità da acquistare
- quantità effettivamente utilizzata

### trattamento_acqua
Può essere modellata sulla testata o per appezzamento a seconda del flusso finale:
- modalità PREIMPOSTATA / VARIABILE
- litri/ha
- litri totali calcolati

## Acquisti

### acquisti
Testata acquisto per azienda e fornitore.

### acquisto_righe
- prodotto
- quantità
- unità
- prezzo unitario
- IVA se necessaria
- lotto/scadenza quando disponibili

La conferma dell'acquisto genera i movimenti di magazzino.

## Costi

I costi devono essere ricostruibili da dati sorgente e non soltanto da totali manuali.

Fonti iniziali:
- prodotti consumati
- acquisti/prezzi
- eventuali costi operatore
- eventuali costi attrezzatura
- altri costi imputabili

Report previsti:
- per trattamento
- per appezzamento
- per coltura
- per azienda
- per mese/anno/intervallo

## Principi database

- UUID per chiavi applicative.
- Timestamp UTC nel database, visualizzazione locale nell'app.
- RLS su ogni tabella esposta.
- Storico operativo non eliminato fisicamente salvo dati di prova o casi amministrativi controllati.
- Audit dei cambi di stato e degli annullamenti per operazioni di magazzino/trattamento economicamente rilevanti.
