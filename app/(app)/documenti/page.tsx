import { DocumentUploader } from "@/components/document-uploader";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate } from "@/lib/utils";

export default async function DocumentsPage(){
  const {supabase,userId}=await requireProfile();
  const [{data:companies},{data:docs}]=await Promise.all([
    supabase.from("companies").select("id,name").eq("active",true).order("name"),
    supabase.from("documents").select("id,category,file_name,storage_path,document_date,notes,created_at,companies(name),profiles(full_name)").order("created_at",{ascending:false}).limit(100),
  ]);
  const rows=await Promise.all((docs??[]).map(async(d:any)=>{const {data}=await supabase.storage.from("farm-documents").createSignedUrl(d.storage_path,3600);return {...d,url:data?.signedUrl??null}}));
  return <>
    <PageHeader eyebrow="ARCHIVIO" title="Documenti" description="Ricette, etichette, DDT, analisi, certificazioni e foto sono archiviati in uno spazio privato e accessibili solo agli utenti autorizzati per azienda." />
    <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">ARCHIVIO PRIVATO</p><h2>Documenti recenti</h2></div></div>{rows.length?<div className="list">{rows.map((d:any)=><div className="list-item" key={d.id}><div><strong>{d.file_name}</strong><p>{d.category.replaceAll("_"," ")} · {d.companies?.name??"—"} · {fmtDate(d.document_date??d.created_at.slice(0,10))}</p><p>{d.notes??""}</p></div>{d.url?<a href={d.url} target="_blank" rel="noreferrer" className="btn small">Apri</a>:<span className="badge">Protetto</span>}</div>)}</div>:<EmptyState title="Archivio vuoto" text="Carica il primo documento aziendale. I file non sono pubblici." />}</section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">NUOVO FILE</p><h2>Carica documento</h2></div></div>{companies?.length?<DocumentUploader companies={companies as any} userId={userId}/>:<div className="alert info">Non hai aziende disponibili.</div>}</section>
    </div>
  </>;
}
