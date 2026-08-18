"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function text(fd: FormData, key: string) { const v=fd.get(key); return typeof v === "string" ? v.trim() : ""; }
function nullable(fd: FormData, key: string) { return text(fd,key) || null; }
function go(kind:"ok"|"error", message:string):never { redirect(`/appezzamenti?${kind}=${encodeURIComponent(message)}`); }

export async function createFieldAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const area = Number(text(fd,"area_ha"));
  if (!Number.isFinite(area) || area <= 0) go("error","Superficie non valida");
  const { data: field, error } = await supabase.from("fields").insert({
    company_id: text(fd,"company_id"), code: text(fd,"code"), name: text(fd,"name"), area_ha: area,
    municipality: nullable(fd,"municipality"), province: nullable(fd,"province"), cadastral_refs: nullable(fd,"cadastral_refs"),
    geospatial_aid_unit: nullable(fd,"geospatial_aid_unit"), notes: nullable(fd,"notes"),
  }).select("id").single();
  if (error || !field) go("error", error?.message ?? "Errore appezzamento");
  const cropId=text(fd,"crop_id");
  if (cropId) {
    const { error: cycleError } = await supabase.from("crop_cycles").insert({
      field_id: field.id, crop_id: cropId, variety: nullable(fd,"variety"),
      start_date: text(fd,"start_date") || new Date().toISOString().slice(0,10),
      cultivation_method: text(fd,"cultivation_method") || "CONVENZIONALE", current_bbch: nullable(fd,"current_bbch"),
    });
    if (cycleError) go("error",`Appezzamento creato, ciclo colturale non creato: ${cycleError.message}`);
  }
  revalidatePath("/appezzamenti"); revalidatePath("/dashboard");
  go("ok","Appezzamento creato");
}
