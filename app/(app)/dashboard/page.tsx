import Link from "next/link";
import { PageHeader, Feedback, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, statusClass } from "@/lib/utils";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile, userId } = await requireProfile();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0,10);
  const [companies, fields, products, plans, tasks, executions, stock] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("fields").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("treatment_plans").select("id,title,planned_date,status,assigned_operator_id").gte("planned_date", today).neq("status", "ANNULLATO").order("planned_date").limit(6),
    supabase.from("tasks").select("id,title,due_at,status").neq("status", "COMPLETATA").order("due_at", { ascending: true, nullsFirst: false }).limit(6),
    supabase.from("treatment_executions").select("id", { count: "exact", head: true }).eq("status", "IN_CORSO"),
    supabase.from("v_stock_balance_total").select("quantity").lte("quantity", 0),
  ]);
  const planRows = (plans.data ?? []).filter((p:any) => profile.role === "ADMIN" || !p.assigned_operator_id || p.assigned_operator_id === userId);
  const taskRows = tasks.data ?? [];
  return <>
    <PageHeader eyebrow="CENTRO OPERATIVO" title={`Buon lavoro${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Pianificazione, operatività, scorte e quaderno digitale in un'unica vista." actions={<Link href={profile.role === "ADMIN" ? "/trattamenti/nuovo" : "/esecuzioni"} className="btn primary">{profile.role === "ADMIN" ? "+ Pianifica trattamento" : "Vai alle esecuzioni"}</Link>} />
    <Feedback ok={params.ok} error={params.error} />
    {profile.role !== "ADMIN" && <div className="alert info">Se stai configurando l'app per la prima volta, <Link href="/setup"><strong>attiva qui il profilo ADMIN</strong></Link> con il codice iniziale. In caso contrario vedrai solo le aziende e le attività assegnate.</div>}
    <div className="stat-grid">
      <div className="stat-card"><span>Aziende visibili</span><strong>{companies.count ?? 0}</strong><small>gestione multiazienda</small></div>
      <div className="stat-card"><span>Appezzamenti attivi</span><strong>{fields.count ?? 0}</strong><small>superfici operative</small></div>
      <div className="stat-card"><span>Prodotti censiti</span><strong>{products.count ?? 0}</strong><small>catalogo fitosanitari</small></div>
      <div className="stat-card"><span>Esecuzioni in corso</span><strong>{executions.count ?? 0}</strong><small>{stock.data?.length ?? 0} scorte a zero/negative</small></div>
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">PROSSIMI INTERVENTI</p><h2>Piani di trattamento</h2></div><Link href="/trattamenti" className="btn small">Tutti</Link></div>
        {planRows.length ? <div className="list">{planRows.map((p:any)=><Link className="list-item" href={`/trattamenti/${p.id}`} key={p.id}><div><strong>{p.title}</strong><p>{fmtDate(p.planned_date)}</p></div><span className={statusClass(p.status)}>{p.status.replaceAll("_"," ")}</span></Link>)}</div> : <EmptyState title="Nessun trattamento pianificato" text={profile.role === "ADMIN" ? "Crea il primo piano, seleziona appezzamenti e prodotti: il fabbisogno verrà calcolato automaticamente." : "Non ci sono interventi assegnati."} action={profile.role === "ADMIN" ? <Link className="btn primary" href="/trattamenti/nuovo">Pianifica</Link> : undefined} />}
      </section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">DA FARE</p><h2>Attività e scadenze</h2></div></div>
        {taskRows.length ? <div className="list">{taskRows.map((t:any)=><div className="list-item" key={t.id}><div><strong>{t.title}</strong><p>{t.due_at ? new Date(t.due_at).toLocaleString("it-IT") : "Senza scadenza"}</p></div><span className={statusClass(t.status)}>{t.status.replaceAll("_"," ")}</span></div>)}</div> : <EmptyState title="Tutto sotto controllo" text="Nessuna attività aperta o scadenza assegnata." />}
      </section>
    </div>
  </>;
}
