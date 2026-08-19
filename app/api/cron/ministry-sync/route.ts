export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATASET_PAGE = "https://www.dati.salute.gov.it/it/dataset/fitosanitari/";
const EDGE_FUNCTION = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-ministry-fitosanitari`;
const BATCH_SIZE = 650;

function findRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    const objects = value.filter((v) => v && typeof v === "object" && !Array.isArray(v)) as Record<string, unknown>[];
    if (objects.some((v) => "num_registrazione" in v || "denominazione_prodotto" in v)) return objects;
    for (const item of value) {
      const nested = findRows(item);
      if (nested.length) return nested;
    }
    return objects;
  }
  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = findRows(nestedValue);
      if (nested.length) return nested;
    }
  }
  return [];
}

function discoverJsonUrl(html: string) {
  const hrefs = [...html.matchAll(/href=["']([^"']+\.json(?:\?[^"']*)?)["']/gi)].map((m) => m[1]);
  const preferred = hrefs.find((h) => /PROD_FTS_6_/i.test(h)) || hrefs.find((h) => /fitosanit/i.test(h)) || hrefs[0];
  if (!preferred) throw new Error("Link JSON ufficiale non trovato nella pagina Open Data");
  return new URL(preferred, DATASET_PAGE).toString();
}

function datasetDateFromUrl(url: string) {
  const match = url.match(/(20\d{6})\.json/i);
  if (!match) return null;
  const d = match[1];
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function registration(raw: Record<string, unknown>) {
  return String(raw.num_registrazione ?? "").trim();
}

function mergeOfficialText(a: unknown, b: unknown) {
  const values = [a, b]
    .flatMap((value) => String(value ?? "").split(/\s*[|;]\s*/))
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [...new Set(values)];
  return unique.length ? unique.join("; ") : null;
}

function mergeOfficialRows(current: Record<string, unknown>, incoming: Record<string, unknown>) {
  const sourceRows = Array.isArray(current.__source_rows)
    ? [...current.__source_rows as unknown[], incoming]
    : [current, incoming];
  return {
    ...current,
    sostanze_attive: mergeOfficialText(current.sostanze_attive, incoming.sostanze_attive),
    contenuto_per_100g_di_prodotto: mergeOfficialText(current.contenuto_per_100g_di_prodotto, incoming.contenuto_per_100g_di_prodotto),
    __source_rows: sourceRows,
  };
}

async function edge(secret: string, body: Record<string, unknown>) {
  const response = await fetch(EDGE_FUNCTION, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sync-secret": secret },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error || `Supabase Edge HTTP ${response.status}`));
  return payload;
}

export async function GET(request: Request) {
  const secret = request.headers.get("x-sync-secret") || "";
  if (!secret) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let runId: string | null = null;
  try {
    await edge(secret, { checkOnly: true });

    const page = await fetch(DATASET_PAGE, {
      headers: { "User-Agent": "AGRIGAL/1.0 official-open-data-sync", Accept: "text/html" },
      cache: "no-store",
    });
    if (!page.ok) throw new Error(`Pagina Open Data HTTP ${page.status}`);
    const sourceUrl = discoverJsonUrl(await page.text());
    const datasetDate = datasetDateFromUrl(sourceUrl);

    const dataset = await fetch(sourceUrl, {
      headers: { "User-Agent": "AGRIGAL/1.0 official-open-data-sync", Accept: "application/json,text/plain,*/*" },
      cache: "no-store",
    });
    if (!dataset.ok) throw new Error(`Dataset JSON HTTP ${dataset.status}`);
    const parsed = JSON.parse((await dataset.text()).replace(/^\uFEFF/, ""));
    const rawRows = findRows(parsed);
    if (!rawRows.length) throw new Error("Il dataset ufficiale non contiene righe riconoscibili");

    const dedup = new Map<string, Record<string, unknown>>();
    for (const row of rawRows) {
      const reg = registration(row);
      if (!reg) continue;
      const current = dedup.get(reg);
      dedup.set(reg, current ? mergeOfficialRows(current, row) : row);
    }
    const rows = [...dedup.values()];

    const start = await edge(secret, {
      action: "start",
      sourceUrl,
      datasetDate,
      rowsReceived: rawRows.length,
    });
    runId = start.runId;
    const seenAt = start.seenAt;
    let upserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const result = await edge(secret, {
        action: "batch",
        runId,
        seenAt,
        sourceUrl,
        datasetDate,
        rows: rows.slice(i, i + BATCH_SIZE),
      });
      upserted += Number(result.upserted || 0);
    }

    const finish = await edge(secret, {
      action: "finish",
      runId,
      seenAt,
      rowsUpserted: upserted,
      uniqueProducts: rows.length,
    });

    return Response.json({
      ok: true,
      sourceUrl,
      datasetDate,
      rowsReceived: rawRows.length,
      uniqueProducts: rows.length,
      upserted,
      selectedProductsRefreshed: finish.selectedProductsRefreshed || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) {
      try { await edge(secret, { action: "fail", runId, error: message }); } catch { /* best effort */ }
    }
    console.error("Ministry catalog sync failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
