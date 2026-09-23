export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

export const SCORE_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Critical"] as const;

export const FINANCIAL_BANDS = [
  "",
  "Negligible: $0-5M, under 0.1% of EBITDA",
  "Minor: $5-50M, about 0.1-0.5% of EBITDA",
  "Moderate: $50-200M, about 0.5-2% of EBITDA",
  "Major: $200M-1B, about 2-10% of EBITDA",
  "Critical: over $1B, over 10% of EBITDA, or business-model risk",
] as const;

export const IMPACT_BANDS = [
  "",
  "Low: niche interest, no regulatory trend",
  "Emerging: growing NGO attention, some regulatory signals",
  "Moderate: investor pressure, regulation in 3-5 years",
  "High: major investor focus, regulation in 1-3 years",
  "Critical: regulation in force, business-model pressure",
] as const;

export function rationaleMatchesBand(rationale: string, bandText: string) {
  if (!rationale || !bandText) return true;
  const tokens = bandText
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter((token) => token.length > 4);
  if (tokens.length < 3) return true;
  const haystack = rationale.toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits >= 2;
}

export function confidencePercent(value: string) {
  if (value === "high") return 86;
  if (value === "medium") return 64;
  return 42;
}
