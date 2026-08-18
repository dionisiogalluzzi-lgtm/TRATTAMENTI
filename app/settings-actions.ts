"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

function value(fd:FormData,key:string){const v=fd.get(key);return typeof v==="string"?v.trim():""}
function go(kind:"ok"|"error",message:string):never{redirect(`/impostazioni?${kind}=${encodeURIComponent(message)}`)}

export async function createSupplierAction(fd:FormData){
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("suppliers").insert({company_id:value(fd,"company_id")||null,name:value(fd,"name"),vat_number:value(fd,"vat_number")||null,email:value(fd,"email")||null,phone:value(fd,"phone")||null,notes:value(fd,"notes")||null});
  if(error)go("error",error.message); revalidatePath("/impostazioni");go("ok","Fornitore aggiunto");
}

export async function createCropAction(fd:FormData){
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("crops").insert({name:value(fd,"name"),eppo_code:value(fd,"eppo_code")||null,kind:value(fd,"kind")||"ANNUALE"});
  if(error)go("error",error.message);revalidatePath("/impostazioni");revalidatePath("/appezzamenti");go("ok","Coltura aggiunta");
}
