const modules = [
  {
    title: "Pianifica trattamento",
    description: "Appezzamenti, prodotti, dosi, acqua e modalità di distribuzione.",
  },
  {
    title: "Fabbisogni",
    description: "Calcolo automatico per azienda e confronto con le giacenze.",
  },
  {
    title: "Magazzino",
    description: "Scorte per azienda, acquisti, lotti e trasferimenti interaziendali.",
  },
  {
    title: "Registro trattamenti",
    description: "Esecuzioni, operatori, attrezzature, quantità effettive e storico.",
  },
  {
    title: "Prodotti fitosanitari",
    description: "Etichette, principi attivi, colture autorizzate, limiti e carenze.",
  },
  {
    title: "Costi e report",
    description: "Analisi per azienda, appezzamento, coltura e periodo.",
  },
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">GESTIONE AGRIGAL</p>
          <h1>TRATTAMENTI</h1>
          <p className="lead">
            Gestionale agricolo per pianificazione trattamenti, fabbisogni,
            magazzino, registro e costi.
          </p>
        </div>
        <div className="status">
          <span className="status-dot" aria-hidden="true" />
          Fondazione applicazione attiva
        </div>
      </section>

      <section className="grid" aria-label="Moduli previsti">
        {modules.map((module) => (
          <article className="card" key={module.title}>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
          </article>
        ))}
      </section>

      <section className="next-step">
        <p className="eyebrow">PROSSIMO STEP</p>
        <h2>Autenticazione, aziende e schema dati iniziale</h2>
        <p>
          Il repository è pronto per essere collegato a Supabase e Vercel. La
          prima implementazione dati partirà da utenti, ruoli, aziende e
          appezzamenti, con Row Level Security fin dall'inizio.
        </p>
      </section>
    </main>
  );
}
