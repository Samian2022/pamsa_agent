"use client";

import type { Engagement, ResearchCandidate } from "@/lib/types";

const ACCENTS = ["#2d5a4a", "#6ba5a0", "#c85a38"] as const;

function scoreTone(value: number) {
  if (value >= 4) return { background: "#5dcaa5", color: "#ffffff" };
  if (value === 3) return { background: "#fac775", color: "#3a3a3a" };
  return { background: "#e9956a", color: "#ffffff" };
}

function ScoreBadge({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <span
      className="inline-flex min-w-[22px] justify-center rounded-[4px] px-1.5 py-0.5 font-mono text-[12px] font-medium"
      style={tone}
    >
      {value}
    </span>
  );
}

function pickRecommended(rows: ResearchCandidate[]) {
  const ranked = [...rows].sort((a, b) => a.rank - b.rank);
  const first = ranked[0];
  if (!first) return [];
  const rest = ranked.filter((row) => row.company !== first.company);
  const clean = [...rest].sort(
    (a, b) => b.modelLeverage + b.materialityClarity - (a.modelLeverage + a.materialityClarity),
  )[0];
  const deepest = [...rest]
    .filter((row) => row.company !== clean?.company)
    .sort((a, b) => a.disclosureMaturity - b.disclosureMaturity || a.rank - b.rank)[0];
  return [first, clean, deepest].filter(Boolean) as ResearchCandidate[];
}

function whyCopy(row: ResearchCandidate) {
  const text = [row.notes, row.keyMaterialAngles].filter(Boolean).join(" ");
  return text || `${row.company} is a ${row.sector} candidate in ${row.geography} with usable public data for a first DMA.`;
}

function blindSpots(row: ResearchCandidate) {
  return (row.likelyBlindSpots || "Undisclosed issues not yet scoped")
    .replace(/[|,]/g, ";")
    .replace(/\s*;\s*/g, "; ");
}

function summaryCopy(picks: ResearchCandidate[]) {
  if (picks.length < 2) {
    return `My recommendation: Start with ${picks[0]?.company || "the top-ranked company"} and lock Stage 2 from there.`;
  }
  const [lead, second, third] = picks;
  const deep = third || second;
  return `My recommendation: ${lead.company} and ${second.company} are the strongest first DMA picks in this set (${lead.sector}; ${second.sector}), with enough disclosure to score issues without guessing. ${deep.company} is the deepest dive: disclosure maturity is thinner, so the blind spots are larger and the undisclosed-risk scan will do more work. Select one card, or name a different company from the table if you want to override.`;
}

export function ResearchCards({
  engagement,
  onSelect,
}: {
  engagement: Engagement;
  onSelect: (company: string) => void;
}) {
  const rows = [...(engagement.artifacts.researchCandidates || [])].sort((a, b) => a.rank - b.rank);
  const selected = engagement.artifacts.selectedCompany;
  const recommended = pickRecommended(rows);

  if (!rows.length) {
    return (
      <div>
        <h2 className="flex items-center gap-2 text-[16px] font-medium text-forest" style={{ fontFamily: "Georgia, serif" }}>
          <ListIcon />
          Candidate Rankings
        </h2>
        <p className="mt-2 text-[13px] leading-[1.5] text-charcoal">
          The ranked table and three recommendation cards appear here after the agent scores five to seven companies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {selected ? (
        <p className="rounded-[8px] border border-[#2d5a4a] bg-white px-3 py-2 text-[13px] text-forest">
          Selected: {selected}
        </p>
      ) : null}

      <section>
        <h2 className="flex items-center gap-2 text-[16px] font-medium text-forest" style={{ fontFamily: "Georgia, serif" }}>
          <ListIcon />
          Candidate Rankings
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-left text-[13px] text-charcoal">
            <thead>
              <tr className="text-[12px] font-medium text-[#5c5a54]">
                {["Rank", "Company", "Sector", "Data", "Clarity", "Leverage", "Maturity"].map((label) => (
                  <th key={label} className="border-b border-[#1a3a2e]/25 px-3 py-2.5 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isSelected = selected === row.company;
                return (
                  <tr
                    key={row.company}
                    className={isSelected ? "bg-white" : index % 2 === 1 ? "bg-[#f9f8f6]" : "bg-white"}
                  >
                    <td className="border-b border-[#e8dfd5] px-3 py-3 font-mono text-[12px] font-medium">{row.rank}</td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3 font-medium text-forest">{row.company}</td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3">{row.sector}</td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3">
                      <ScoreBadge value={row.dataAvailability} />
                    </td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3">
                      <ScoreBadge value={row.materialityClarity} />
                    </td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3">
                      <ScoreBadge value={row.modelLeverage} />
                    </td>
                    <td className="border-b border-[#e8dfd5] px-3 py-3">
                      <ScoreBadge value={row.disclosureMaturity} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-[16px] font-medium text-forest" style={{ fontFamily: "Georgia, serif" }}>
          <StarIcon />
          Top Recommendations
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recommended.map((row, index) => {
            const accent = ACCENTS[index % ACCENTS.length];
            const isSelected = selected === row.company;
            return (
              <article
                key={row.company}
                className="rounded-xl bg-[#f5f3f0] p-6 transition-[opacity,border-color] duration-200 ease-linear hover:opacity-95"
                style={{ border: `${isSelected ? 1 : 0.5}px solid ${accent}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="rounded px-2 py-1 text-[13px] font-medium uppercase tracking-wide text-white"
                        style={{ background: accent }}
                      >
                        Rank {row.rank}
                      </span>
                      <h3 className="text-[16px] font-medium text-forest">{row.company}</h3>
                    </div>
                    <p className="mt-1 text-[12px] text-taupe">
                      {row.sector}
                      {row.geography ? `, ${row.geography}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(row.company)}
                    className="shrink-0 rounded-md px-4 py-2 text-[13px] font-medium text-white transition-opacity duration-200 hover:opacity-90"
                    style={{ background: accent }}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>
                <div className="mt-4 border-t border-[#e8dfd5] pt-4">
                  <p className="mb-1.5 text-[12px] font-medium text-[#5c5a54]">Why this company</p>
                  <p className="text-[13px] leading-[1.5] text-charcoal">{whyCopy(row)}</p>
                  <p className="mb-1.5 mt-3 text-[12px] font-medium text-[#5c5a54]">Key blind spots</p>
                  <p className="text-[13px] leading-[1.5] text-rust">{blindSpots(row)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="rounded-lg border-l-[3px] border-sage bg-[#f5f3f0] p-4 text-[13px] leading-[1.6] text-forest">
        <strong>My recommendation:</strong> {summaryCopy(recommended).replace(/^My recommendation:\s*/, "")}
      </aside>
    </div>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-sage" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 7.5 6.2 8.7 8.2 5.8M5 13.5 6.2 14.7 8.2 11.8M5 19.5 6.2 20.7 8.2 17.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-rust" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.6 14.2 9l5.8.5-4.4 3.8 1.4 5.7L12 16.8 6.9 19l1.4-5.7L4 9.5 9.8 9 12 3.6Z" />
    </svg>
  );
}
