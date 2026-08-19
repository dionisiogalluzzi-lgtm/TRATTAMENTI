"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function go(planId: string, kind: "ok" | "error", message: string): never {
  redirect(`/trattamenti/${planId}?${kind}=${encodeURIComponent(message)}`);
}

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function refreshPlanFullAction(planId: string) {
  const { supabase } = await requireAdmin();
  const { error: requirementsError } = await supabase.rpc("refresh_plan_requirements", { p_plan_id: planId });
  if (requirementsError) go(planId, "error", requirementsError.message);
  const { data: checks, error: complianceError } = await supabase.rpc("refresh_plan_compliance", { p_plan_id: planId });
  if (complianceError) go(planId, "error", complianceError.message);
  revalidatePath(`/trattamenti/${planId}`);
  revalidatePath("/trattamenti");
  const blocking = Array.isArray(checks) ? checks.filter((c: any) => c.severity === "BLOCKING").length : 0;
  const warnings = Array.isArray(checks) ? checks.filter((c: any) => c.severity === "WARNING").length : 0;
  go(planId, "ok", `Verifica aggiornata: ${blocking} bloccanti, ${warnings} avvisi`);
}

export async function forcePlanComplianceAction(planId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const reason = text(fd, "reason");
  if (reason.length < 10) go(planId, "error", "Indica una motivazione esplicita di almeno 10 caratteri");
  const { data, error } = await supabase.rpc("set_plan_compliance_override", {
    p_plan_id: planId,
    p_reason: reason,
  });
  if (error) go(planId, "error", error.message);
  revalidatePath(`/trattamenti/${planId}`);
  revalidatePath("/trattamenti");
  go(planId, "ok", `Forzatura registrata su ${data ?? 0} controllo/i bloccante/i. L'esecuzione sarà marcata NON CONFORME.`);
}

export async function clearPlanComplianceOverrideAction(planId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("clear_plan_compliance_override", { p_plan_id: planId });
  if (error) go(planId, "error", error.message);
  revalidatePath(`/trattamenti/${planId}`);
  go(planId, "ok", "Forzatura rimossa");
}
