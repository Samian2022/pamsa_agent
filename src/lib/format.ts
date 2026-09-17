export function formatRelative(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (Number.isNaN(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const SCORE_LABELS = ["", "Negligible", "Minor", "Moderate", "Significant", "Critical"] as const;

export const FINANCIAL_BANDS = [
  "",
  "Could barely move the needle (<0.1% of EBITDA)",
  "about 0.1% to 0.5% of EBITDA at risk",
  "about 0.5% to 1.5% of EBITDA at risk",
  "about 1.5% to 5% of EBITDA at risk",
  "Could reshape the business (>5% of EBITDA, or existential)",
] as const;

export const IMPACT_BANDS = [
  "",
  "Affects few, briefly",
  "Limited stakeholder harm, mostly reversible",
  "Material for a defined group",
  "Serious harm for many stakeholders",
  "Affects many, deeply",
] as const;

export function confidencePercent(value: string) {
  if (value === "high") return 86;
  if (value === "medium") return 64;
  return 42;
}
