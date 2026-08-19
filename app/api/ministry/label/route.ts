export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SIAN_BASE = "https://www.sian.it/mimfFitoPub";
const SEARCH_PAGE = `${SIAN_BASE}/ricercaProdottoFito.get`;
const SEARCH_ACTION = `${SIAN_BASE}/gestioneRicercaProdottiFito.do`;
const USER_AGENT = "AGRIGAL/1.0 official-label-resolver";

type CookieJar = Map<string, string>;

function normalizeRegistration(value: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || digits.length > 8) return null;
  return digits.padStart(6, "0");
}

function mergeCookies(jar: CookieJar, response: Response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return;
  for (const match of raw.matchAll(/(?:^|,\s*)([^=;,\s]+)=([^;,\s]*)/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value && !["expires", "path", "domain", "samesite", "max-age"].includes(name.toLowerCase())) {
      jar.set(name, value);
    }
  }
}

function cookieHeader(jar: CookieJar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function officialFetch(url: string, jar: CookieJar, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", USER_AGENT);
  headers.set("Accept", headers.get("Accept") || "text/html,application/pdf,application/octet-stream;q=0.9,*/*;q=0.8");
  const cookies = cookieHeader(jar);
  if (cookies) headers.set("Cookie", cookies);

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: "follow",
    cache: "no-store",
  });
  mergeCookies(jar, response);
  return response;
}

function searchParams(registration: string) {
  const params = new URLSearchParams();
  params.set("ricerca.tipoRicerca", "1");
  params.set("ricerca.descTipologia", "Prodotti Registrati");
  params.set("ricerca.numRegistro", registration);
  params.set("ricercPerProdotto", "Cerca");
  return params;
}

function labelParams(registration: string, nreg: string) {
  const params = new URLSearchParams();
  params.set("ricerca.tipoRicerca", "1");
  params.set("ricerca.descTipologia", "Prodotti Registrati");
  params.set("ricerca.numRegistro", registration);
  params.set("nreg", nreg);
  params.set("scaricaEtichetta0", "");
  return params;
}

function extractNreg(html: string) {
  return html.match(/name=["']nreg["'][^>]*value=["'](\d+)["']/i)?.[1]
    ?? html.match(/value=["'](\d+)["'][^>]*name=["']nreg["']/i)?.[1]
    ?? null;
}

function isPdf(bytes: ArrayBuffer, contentType: string) {
  const first = new Uint8Array(bytes.slice(0, 5));
  return String.fromCharCode(...first) === "%PDF-" || contentType.toLowerCase().includes("pdf");
}

async function resolveSianLabel(registration: string) {
  const jar: CookieJar = new Map();

  const landing = await officialFetch(SEARCH_PAGE, jar, { method: "GET" });
  if (!landing.ok) throw new Error(`SIAN pagina ricerca HTTP ${landing.status}`);
  await landing.text();

  const search = new URL(SEARCH_ACTION);
  for (const [key, value] of searchParams(registration)) search.searchParams.set(key, value);
  const result = await officialFetch(search.toString(), jar, { method: "POST" });
  if (!result.ok) throw new Error(`SIAN ricerca HTTP ${result.status}`);
  const html = await result.text();
  const nreg = extractNreg(html);
  if (!nreg) throw new Error(`Registrazione ${registration} non trovata nella banca dati SIAN`);

  const label = new URL(SEARCH_ACTION);
  for (const [key, value] of labelParams(registration, nreg)) label.searchParams.set(key, value);
  const pdf = await officialFetch(label.toString(), jar, { method: "POST" });
  if (!pdf.ok) throw new Error(`SIAN etichetta HTTP ${pdf.status}`);

  const bytes = await pdf.arrayBuffer();
  const contentType = pdf.headers.get("content-type") || "";
  if (!isPdf(bytes, contentType)) throw new Error("La risposta SIAN non contiene un PDF");

  return { bytes, nreg };
}

function fallbackHtml(registration: string) {
  const safeSearch = SEARCH_PAGE.replaceAll("&", "&amp;");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etichetta ufficiale</title></head><body style="font-family:Arial,sans-serif;max-width:720px;margin:60px auto;padding:0 20px;color:#172019"><h1>Etichetta non recuperata automaticamente</h1><p>La banca dati ufficiale SIAN non ha restituito il PDF in questo momento.</p><p><strong>Registrazione ${registration}</strong></p><p><a href="${safeSearch}" target="_blank" rel="noreferrer">Apri la Banca Dati Prodotti Fitosanitari SIAN</a></p><p>Nel portale ufficiale cerca il numero di registrazione indicato. AGRIGAL non interpreta l'assenza temporanea del PDF come revoca o mancanza di autorizzazione.</p></body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const registration = normalizeRegistration(url.searchParams.get("registration"));
  if (!registration) return new Response("Numero di registrazione non valido", { status: 400 });

  try {
    const resolved = await resolveSianLabel(registration);
    return new Response(resolved.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Etichetta-ufficiale-${registration}.pdf"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-AGRIGAL-Official-Source": "SIAN-MASAF-CREA",
        "X-AGRIGAL-Registration": registration,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Official SIAN label resolver failed", { registration, message });
    return new Response(fallbackHtml(registration), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
