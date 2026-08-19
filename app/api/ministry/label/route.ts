export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SEARCH_PATH = "/fitosanitariwsWeb_new/FitosanitariServlet";
const LABEL_PATH = "/fitosanitariwsWeb_new/EtichettaServlet";
const OFFICIAL_BASES = [
  "https://www.fitosanitari.salute.gov.it",
  "https://fitosanitari.salute.gov.it",
  "https://www.salute.gov.it",
];

const USER_AGENT = "AGRIGAL/1.0 (+official Ministry label resolver)";

type CookieJar = Map<string, string>;

function normalizeRegistration(value: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || digits.length > 8) return null;
  return digits.padStart(6, "0");
}

function mergeCookies(jar: CookieJar, response: Response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return;
  const matches = raw.matchAll(/(?:^|,\s*)([^=;,\s]+)=([^;,\s]*)/g);
  for (const match of matches) {
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

async function fetchWithJar(url: string, jar: CookieJar, init: RequestInit = {}) {
  let current = url;
  for (let redirectCount = 0; redirectCount < 6; redirectCount += 1) {
    const headers = new Headers(init.headers);
    headers.set("User-Agent", USER_AGENT);
    headers.set("Accept", headers.get("Accept") || "text/html,application/pdf,application/octet-stream;q=0.9,*/*;q=0.8");
    const cookies = cookieHeader(jar);
    if (cookies) headers.set("Cookie", cookies);

    const response = await fetch(current, { ...init, headers, redirect: "manual", cache: "no-store" });
    mergeCookies(jar, response);

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current).toString();
  }
  throw new Error("Troppi redirect dal servizio ministeriale");
}

function extractLabelId(html: string) {
  const decoded = html.replaceAll("&amp;", "&");
  const direct = decoded.match(/EtichettaServlet\?id=(\d+)/i);
  return direct?.[1] ?? null;
}

async function resolveFromBase(base: string, registration: string) {
  const jar: CookieJar = new Map();

  // La banca dati storicamente richiede una sessione inizializzata prima della ricerca diretta.
  const landing = await fetchWithJar(`${base}${SEARCH_PATH}`, jar, { method: "GET" });
  if (!landing.ok && landing.status !== 404) {
    throw new Error(`Pagina iniziale Ministero HTTP ${landing.status}`);
  }

  const search = new URL(`${base}${SEARCH_PATH}`);
  search.searchParams.set("ACTION", "cercaProdotti");
  search.searchParams.set("FROM", "0");
  search.searchParams.set("TO", "49");
  search.searchParams.set("PROVENIENZA", "RICERCA");
  search.searchParams.set("NUMERO_REGISTRAZIONE", registration);

  const result = await fetchWithJar(search.toString(), jar, { method: "GET" });
  if (!result.ok) throw new Error(`Ricerca Ministero HTTP ${result.status}`);
  const html = await result.text();
  const labelId = extractLabelId(html);
  if (!labelId) return null;

  const labelUrl = new URL(`${base}${LABEL_PATH}`);
  labelUrl.searchParams.set("id", labelId);
  const pdfResponse = await fetchWithJar(labelUrl.toString(), jar, { method: "GET" });
  if (!pdfResponse.ok) throw new Error(`Etichetta Ministero HTTP ${pdfResponse.status}`);

  const bytes = await pdfResponse.arrayBuffer();
  const first = new Uint8Array(bytes.slice(0, 5));
  const signature = String.fromCharCode(...first);
  const contentType = pdfResponse.headers.get("content-type") || "";
  const looksPdf = signature === "%PDF-" || contentType.toLowerCase().includes("pdf");
  if (!looksPdf) return null;

  return { bytes, labelId, sourceUrl: labelUrl.toString() };
}

function fallbackHtml(registration: string) {
  const search = new URL(`https://www.fitosanitari.salute.gov.it${SEARCH_PATH}`);
  search.searchParams.set("ACTION", "cercaProdotti");
  search.searchParams.set("FROM", "0");
  search.searchParams.set("TO", "49");
  search.searchParams.set("PROVENIENZA", "RICERCA");
  search.searchParams.set("NUMERO_REGISTRAZIONE", registration);
  const safeUrl = search.toString().replaceAll("&", "&amp;");
  return `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etichetta Ministero</title><body style="font-family:Arial,sans-serif;max-width:720px;margin:60px auto;padding:0 20px;color:#172019"><h1>Etichetta non recuperata automaticamente</h1><p>AGRIGAL non è riuscito a leggere il PDF dalla banca dati del Ministero in questo momento.</p><p><strong>Registrazione ${registration}</strong></p><p><a href="${safeUrl}" target="_blank" rel="noreferrer">Apri la ricerca ufficiale del Ministero della Salute</a></p><p>Il prodotto non viene considerato privo di etichetta: riprova più tardi o consulta direttamente la fonte ufficiale.</p></body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const registration = normalizeRegistration(url.searchParams.get("registration"));
  if (!registration) return new Response("Numero di registrazione non valido", { status: 400 });

  const errors: string[] = [];
  for (const base of OFFICIAL_BASES) {
    try {
      const resolved = await resolveFromBase(base, registration);
      if (!resolved) continue;
      return new Response(resolved.bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="Etichetta-Ministero-${registration}.pdf"`,
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "X-AGRIGAL-Official-Source": "Ministero-della-Salute",
          "X-AGRIGAL-Label-Id": resolved.labelId,
        },
      });
    } catch (error) {
      errors.push(`${base}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.warn("Ministerial label resolver failed", { registration, errors });
  return new Response(fallbackHtml(registration), {
    status: 502,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
