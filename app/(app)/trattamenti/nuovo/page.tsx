import Link from "next/link";
import { PlanWizard } from "@/components/plan-wizard";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function NewTreatmentPage() {
  const { supabase, userId } = await requireAdmin();
  const fieldResult = await supabase.from("fields").select("id,code,name,area_ha,companies(name),crop_cycles(id,active,crops(name))").eq("active", true).order("name");
  const productResult = await supabase.from("products").select("id,commercial_name,base_unit").eq("active", true).order("commercial_name");
  const operatorResult = await supabase.from("profiles").select("id,full_name,role").eq("active", true).order("full_name");
  const equipmentResult = await supabase.from("equipment").select("id,name,capacity_l").eq("active", true).order("name");

  const fields = (fieldResult.data ?? []).map((f: any) => {
    const cycle = (f.crop_cycles ?? []).find((c: any) => c.active);
    return { id: f.id, code: f.code, name: f.name, area_ha: Number(f.area_ha), companyName: f.companies?.name ?? "Azienda", cropCycleId: cycle?.id ?? null, cropName: cycle?.crops?.name ?? null };
  });
  const products = (productResult.data ?? []).map((p: any) => ({ id: p.id, name: p.commercial_name, unit: p.base_unit }));
  const operators = (operatorResult.data ?? []).map((p: any) => ({ id: p.id, name: p.full_name ?? p.role }));
  const equipment = (equipmentResult.data ?? []).map((e: any) => ({ id: e.id, name: e.name, capacity: e.capacity_l ? Number(e.capacity_l) : null }));

  if (!fields.length || !products.length) {
    return <><PageHeader eyebrow="NUOVO TRATTAMENTO" title="Prima completa le anagrafiche" description="Per creare una ricetta servono almeno un appezzamento e un prodotto." /><EmptyState title="Dati insufficienti" text="Crea aziende e appezzamenti, poi censisci almeno un prodotto fitosanitario." action={<div className="actions-row"><Link className="btn" href="/appezzamenti">Appezzamenti</Link><Link className="btn primary" href="/prodotti">Prodotti</Link></div>} /></>;
  }
  return <><PageHeader eyebrow="NUOVO TRATTAMENTO" title="Pianifica intervento" description="Seleziona più appezzamenti e prodotti. Per le file alternate la superficie trattata viene dimezzata automaticamente; le dosi possono essere per ettaro o per 100 litri." /><PlanWizard fields={fields} products={products} operators={operators} equipment={equipment} userId={userId} /></>;
}
