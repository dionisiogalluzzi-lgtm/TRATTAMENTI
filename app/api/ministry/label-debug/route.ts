export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function attrs(tag: string) {
  const out: Record<string,string> = {};
  for (const m of tag.matchAll(/([\w.:-]+)=["']([^"']*)["']/g)) out[m[1]] = m[2];
  return out;
}

export async function GET() {
  const url = "https://www.sian.it/mimfFitoPub/ricercaInizialeFito.get";
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AGRIGAL/1.0" }, cache: "no-store", redirect: "follow" });
    const html = await r.text();
    const formTag = html.match(/<form[^>]*>/i)?.[0] ?? "";
    const inputs = [...html.matchAll(/<input[^>]*>/gi)].map((m) => attrs(m[0])).filter((a) => a.name || a.id);
    const selects = [...html.matchAll(/<select[^>]*>/gi)].map((m) => attrs(m[0])).filter((a) => a.name || a.id);
    const buttons = [...html.matchAll(/<(?:button|input)[^>]*(?:submit|button)[^>]*>/gi)].map((m) => attrs(m[0]));
    const scripts = [...html.matchAll(/(?:onclick|href)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((v) => /ricerc|submit|fito|prodot|scheda|dettag/i.test(v)).slice(0, 100);
    return Response.json({status:r.status,finalUrl:r.url,form:attrs(formTag),inputs,selects,buttons,scripts}, { headers: { "Cache-Control":"no-store" } });
  } catch (e) {
    return Response.json({error:e instanceof Error ? `${e.name}: ${e.message}; cause=${String((e as any).cause ?? "")}` : String(e)}, {status:500});
  }
}
