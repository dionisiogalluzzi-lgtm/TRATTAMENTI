export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const urls = [
    "https://www.sian.it/mimfFitoPub/home.get",
    "https://www.sian.it/mimfFitoPub/ricercaInizialeFito.get",
  ];
  const out: any[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AGRIGAL/1.0" }, cache: "no-store", redirect: "follow" });
      const html = await r.text();
      const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)].map((m) => m[0].slice(0, 12000));
      const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]).filter((v) => /fito|prod|etic|ricerc|sched/i.test(v)).slice(0, 100);
      out.push({ url, status: r.status, finalUrl: r.url, forms, links, prefix: html.slice(0, 3000) });
    } catch (e) {
      out.push({ url, error: e instanceof Error ? `${e.name}: ${e.message}; cause=${String((e as any).cause ?? "")}` : String(e) });
    }
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
