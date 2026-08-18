export function fmtNumber(value: number | string | null | undefined, digits = 2) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: digits }).format(n);
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function statusClass(status: string) {
  const positive = ["PRONTO", "ESEGUITO", "COMPLETATA", "RICEVUTO", "CONFERMATO"];
  const warning = ["DA_ACQUISTARE", "PIANIFICATO", "PROPOSTO", "ORDINATO", "IN_ESECUZIONE", "IN_CORSO"];
  const negative = ["ANNULLATO", "ANNULLATA"];
  if (positive.includes(status)) return "badge success";
  if (warning.includes(status)) return "badge warning";
  if (negative.includes(status)) return "badge danger";
  return "badge";
}
