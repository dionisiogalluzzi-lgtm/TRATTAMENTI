"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function go(planId: string, kind: "ok" | "error", message: string): never {
  redirect(`/trattamenti/${planId}?${kind}=${encodeURIComponent(message)}`);
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
