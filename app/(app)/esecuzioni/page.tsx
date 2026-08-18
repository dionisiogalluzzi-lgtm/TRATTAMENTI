import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, statusClass } from "@/lib/utils";

export default async function ExecutionsPage() {
  const { supabase } = await requireProfile();
  const { data } = await supabase.from("treatment_executions").select("id,execution_date,status,started_at,completed_at,treatment_plans(title,target_or_adversity),profiles(full_name),equipment(name)").order("execution_date", { ascending:false }).limit(100);
  const rows = data ?? [];
  return <>
    <PageHeader eyebrow="OPERATIVITÀ" title="Esecuzioni" description="La scheda operatore conserva quantità reali, orari, fase BBCH, meteo e note. Alla chiusura scarica automaticamente il magazzino e alimenta il quaderno digitale." />
    {rows.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Trattamento</th><th>Operatore</th><th>Attrezzatura</th><th>Stato</th></tr></thead><tbody>{rows.map((e:any)=><tr key={e.id}><td>{fmtDate(e.execution_date)}</td><td><Link href={`/esecuzioni/${e.id}`}><strong>{e.treatment_plans?.title}</strong><span className="muted">{e.treatment_plans?.target_or_adversity??"—"}</span></Link></td><td>{e.profiles?.full_name??"—"}</td><td>{e.equipment?.name??"—"}</td><td><span className={statusClass(e.status)}>{e.status.replaceAll("_"," ")}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Nessuna esecuzione" text="Un'esecuzione viene creata quando un piano pronto viene avviato." />}
  </>;
}
