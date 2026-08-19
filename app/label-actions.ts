"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullable(fd: FormData, key: string) {
  const value = text(fd, key);
  return value || null;
}
function num(fd: FormData, key: string) {
  const n = Number(text(fd, key));
  return Number.isFinite(n) ? n : 0;
}
function go(kind: "ok" | "error", message: string): never {
  redirect(`/prodotti?${kind}=${encodeURIComponent(message)}`);
}

export async function createVerifiedLabelRuleAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const productId = text(fd, "product_id");
  const { data: label, error } = await supabase.from("product_labels").insert({
    product_id: productId,
    version_name: nullable(fd, "version_name") || `Etichetta ${new Date().toISOString().slice(0,10)}`,
    valid_from: nullable(fd, "valid_from"),
    source_url: nullable(fd, "source_url"),
    notes: nullable(fd, "label_notes"),
  }).select("id").single();
  if (error || !label) go("error", error?.message ?? "Etichetta non creata");

  const cropId = text(fd, "crop_id");
  if (cropId) {
    const numberOrNull = (key: string) => text(fd, key) ? num(fd, key) : null;
    const scope = text(fd, "max_applications_scope") === "CALENDAR_YEAR" ? "CALENDAR_YEAR" : "CROP_CYCLE";
    const { error: ruleError } = await supabase.from("product_crop_rules").insert({
      product_label_id: label.id,
      crop_id: cropId,
      adversity: nullable(fd, "adversity"),
      dose_min_per_ha: numberOrNull("dose_min_per_ha"),
      dose_max_per_ha: numberOrNull("dose_max_per_ha"),
      dose_min_per_hl: numberOrNull("dose_min_per_hl"),
      dose_max_per_hl: numberOrNull("dose_max_per_hl"),
      dose_unit: nullable(fd, "dose_unit"),
      max_applications: numberOrNull("max_applications"),
      max_applications_scope: scope,
      min_interval_days: numberOrNull("min_interval_days"),
      preharvest_interval_days: numberOrNull("preharvest_interval_days"),
      reentry_interval_hours: numberOrNull("reentry_interval_hours"),
      restrictions: nullable(fd, "restrictions"),
    });
    if (ruleError) go("error", `Etichetta creata, regola non creata: ${ruleError.message}`);
  }

  revalidatePath("/prodotti");
  go("ok", "Etichetta/regola verificata registrata");
}
