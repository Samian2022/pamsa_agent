"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FINANCIAL_BANDS, IMPACT_BANDS, SCORE_LABELS, confidencePercent } from "@/lib/format";
import { methodologyReady } from "@/lib/stages";
import type {
  Engagement,
  IssueScore,
  MethodologyProgress,
  PricingBuildMode,
  PricingModelType,
} from "@/lib/types";
import { MaterialityMatrix } from "./materiality-matrix";

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="section-kicker text-[16px] md:text-[20px]">{title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink-soft">{subtitle}</p>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: string }) {
  const pct = confidencePercent(value);
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-forest text-[9px] font-medium text-white">
      {pct}
    </span>
  );
}

function StatusDots({
  researched,
  validated,
  included,
}: {
  researched: boolean;
  validated: boolean;
  included: boolean;
}) {
  return (
    <div className="flex gap-1" aria-hidden>
      <span className={`h-2 w-2 rounded-full ${researched ? "bg-sage" : "bg-taupe/40"}`} />
      <span className={`h-2 w-2 rounded-full ${validated ? "bg-teal" : "bg-taupe/40"}`} />
      <span className={`h-2 w-2 rounded-full ${included ? "bg-forest" : "bg-taupe/40"}`} />
    </div>
  );
}

export function ResearchCards({
  engagement,
  onSelect,
}: {
  engagement: Engagement;
  onSelect: (issue: string) => void;
}) {
  const rows = engagement.artifacts.researchCandidates || [];
  if (!rows.length) {
    return (
      <div>
        <PanelHeader
          title="Your discovery"
          subtitle="Search companies. Surface risks. Let's begin."
        />
        <p className="text-sm text-ink-soft">
          The research table appears here after the agent scores five to seven companies.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <PanelHeader
        title="Your discovery"
        subtitle="Find what's hidden. Pick the company whose silence is most material."
      />
      {engagement.artifacts.selectedCompany ? (
        <p className="rounded-xl bg-sage/15 px-3 py-2 text-sm text-sage">
          Selected: {engagement.artifacts.selectedCompany}
        </p>
      ) : null}
      {rows.map((row, index) => (
        <button
          key={row.company}
          type="button"
          onClick={() => onSelect(row.company)}
          className="lift animate-slide-left w-full rounded-xl border-l-[2px] border-sage bg-white p-4 text-left shadow-sm"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="serif text-[16px] text-forest">
                {row.rank}. {row.company}
              </h3>
              <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">
                {row.keyMaterialAngles}. Blind spots: {row.likelyBlindSpots}
              </p>
              <span className="mt-2 inline-block rounded-full bg-cloud-2 px-2 py-0.5 text-[11px] uppercase tracking-wide text-rust">
                Undisclosed risk scan
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ConfidenceBadge value={row.disclosureMaturity >= 4 ? "high" : row.disclosureMaturity >= 3 ? "medium" : "low"} />
              <StatusDots researched included={false} validated={engagement.artifacts.selectedCompany === row.company} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function HypothesisCards({
  engagement,
  onSelect,
}: {
  engagement: Engagement;
  onSelect: (issue: string) => void;
}) {
  const cards = engagement.artifacts.discoveryCards || [];
  if (!cards.length) {
    return (
      <div>
        <PanelHeader
          title="Potential material issues"
          subtitle="These risks are either undisclosed by the company, emerging from regulation, or flagged by peers. Your job: confirm or dispute each one."
        />
        <p className="text-sm text-ink-soft">Pick an issue above. Move the sliders. Build your assessment.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <PanelHeader
        title="Potential material issues"
        subtitle="These risks are either undisclosed by the company, emerging from regulation, or flagged by peers. Your job: confirm or dispute each one."
      />
      {cards.map((card, index) => {
        const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
        const tag =
          reaction === "disputed"
            ? "Under investigation by you"
            : reaction === "accepted"
              ? "Included in your DMA"
              : "Undisclosed by company";
        const bar =
          reaction === "accepted" ? "border-sage" : reaction === "disputed" ? "border-amber" : "border-rust";
        return (
          <button
            key={card.issue}
            type="button"
            onClick={() => onSelect(card.issue)}
            className={`lift animate-slide-left group w-full rounded-xl border-l-[2px] ${bar} bg-white p-4 text-left shadow-sm`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="serif text-[16px] text-forest">{card.issue}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-soft">{card.definition}</p>
                <span className="mt-2 inline-block text-[11px] uppercase tracking-wide text-rust">{tag}</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ConfidenceBadge value={card.confidence} />
                <StatusDots
                  researched
                  validated={reaction === "accepted"}
                  included={Boolean(engagement.artifacts.issueScores?.some((item) => item.issue === card.issue))}
                />
                <span className="hidden text-[11px] text-sage group-hover:inline">View detail</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProfileView({ engagement }: { engagement: Engagement }) {
  const snap = engagement.artifacts.snapshot;
  const gaps = engagement.artifacts.dataGaps;
  const [open, setOpen] = useState("disclosed");
  if (!snap && !gaps) {
    return (
      <div>
        <PanelHeader title="Map the company" subtitle="Lock the snapshot. Document what the company will not name." />
        <p className="text-sm text-ink-soft">After you pick a company, the snapshot and data-gap inventory lock here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {snap ? (
        <div className="rounded-xl border border-sage/30 bg-white p-4">
          <p className="text-[12px] font-medium text-sage">Snapshot confirmed. This is your map of the company.</p>
          <dl className="mt-3 grid gap-3 text-[13px] md:grid-cols-2">
            {[
              ["Business model", snap.businessModel],
              ["Supply chain", snap.supplyChain],
              ["Regulatory exposure", snap.regulatoryExposure],
              ["ESG disclosure", snap.currentEsgDisclosure],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-taupe">{label}</dt>
                <dd className="mt-1 text-ink-soft">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {gaps ? (
        <div className="space-y-2">
          {(
            [
              ["disclosed", "Disclosed vs hidden", gaps.disclosedVsHidden],
              ["inferred", "Inferred from benchmarks", gaps.inferredFromBenchmarks],
              ["undisclosed", "Explicit undisclosures", gaps.explicitUndisclosures],
              ["peer", "Peer disclosure patterns", gaps.peerDisclosurePatterns],
              ["reg", "Regulatory vacuum", gaps.regulatoryVacuum],
            ] as const
          ).map(([id, label, value]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOpen(open === id ? "" : id)}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left"
            >
              <span className="text-[12px] uppercase tracking-[0.14em] text-forest">{label}</span>
              {open === id ? <p className="mt-2 text-[13px] text-ink-soft">{value}</p> : null}
            </button>
          ))}
        </div>
      ) : null}
      {engagement.artifacts.blindSpotSummary ? (
        <p className="whitespace-pre-wrap rounded-xl bg-amber/15 p-4 text-[13px] text-forest">
          {engagement.artifacts.blindSpotSummary}
        </p>
      ) : null}
    </div>
  );
}

export function ScoringPanel({
  engagement,
  selected,
  onSelect,
  onScores,
}: {
  engagement: Engagement;
  selected: string | null;
  onSelect: (issue: string) => void;
  onScores: (issues: IssueScore[]) => void;
}) {
  const issues = engagement.artifacts.issueScores;
  const originals = useRef(
    new Map((issues || []).map((item) => [item.issue, { f: item.financialScore, i: item.impactScore }])),
  );
  const [draft, setDraft] = useState(issues || []);

  useEffect(() => {
    setDraft(issues || []);
  }, [issues]);

  if (!issues?.length) {
    return (
      <div>
        <PanelHeader
          title="Score each material issue"
          subtitle="Move the sliders. Read the implications. Challenge the agent. Lock your assessment."
        />
        <p className="text-sm text-ink-soft">Pick an issue above. Move the sliders. Build your assessment.</p>
      </div>
    );
  }

  function update(issue: string, key: "financialScore" | "impactScore", value: number) {
    const next = draft.map((item) => (item.issue === issue ? { ...item, [key]: value } : item));
    setDraft(next);
  }

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Score each material issue"
        subtitle="Move the sliders. Read the implications. Challenge the agent. Lock your assessment."
      />
      <MaterialityMatrix
        issues={draft}
        discoveryLog={engagement.discoveryLog}
        selected={selected}
        onSelect={onSelect}
      />
      <p className="text-[12px] text-ink-soft">
        Solid sage: disclosed by the company. Rust: the company is silent on this. Amber: you are
        investigating this. Teal: upside opportunity. Your data overrides ours.
      </p>
      <div className="space-y-4">
        {draft.map((issue) => {
          const original = originals.current.get(issue.issue);
          const jumped =
            original &&
            (Math.abs(original.f - issue.financialScore) >= 2 || Math.abs(original.i - issue.impactScore) >= 2);
          return (
            <div
              key={issue.issue}
              className={`grid gap-4 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-[2fr_1.5fr_1.5fr] ${
                selected === issue.issue ? "ring-1 ring-sage" : ""
              }`}
            >
              <div>
                <button type="button" onClick={() => onSelect(issue.issue)} className="text-left">
                  <h3 className="serif text-[16px] text-forest">{issue.issue}</h3>
                </button>
                <p className="mt-1 text-[12px] text-ink-soft">{issue.definition}</p>
                <div className="mt-2">
                  <ConfidenceBadge value={issue.confidence} />
                </div>
              </div>
              <div className="space-y-3">
                {(
                  [
                    ["financialScore", "Financial materiality"],
                    ["impactScore", "Impact materiality"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-[12px]">
                    <span className="flex justify-between text-forest">
                      {label}
                      <span className="font-mono">{issue[key]} · {SCORE_LABELS[issue[key]]}</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={issue[key]}
                      onChange={(event) => update(issue.issue, key, Number(event.target.value))}
                      className="mt-1 w-full accent-sage"
                    />
                    {key === "financialScore" ? (
                      <span className="text-[11px] text-ink-soft">{FINANCIAL_BANDS[issue.financialScore]}</span>
                    ) : (
                      <span className="text-[11px] text-ink-soft">{IMPACT_BANDS[issue.impactScore]}</span>
                    )}
                  </label>
                ))}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">Why did you score it here?</p>
                <p className="mt-1 text-[12px] text-ink-soft">{issue.financialEvidence}</p>
                <p className="mt-2 font-mono text-[11px] text-forest">{issue.recommendedMetric}</p>
                {jumped ? (
                  <p className="mt-2 text-[12px] text-rust">
                    Heads up: you have rescored this significantly from the agent proposal. Clear data?
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => onScores(draft)}
                  className="btn-primary mt-3 rounded-full px-3 py-1.5 text-[12px]"
                >
                  Save score
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(issue.issue)}
                  className="ml-2 mt-3 rounded-full border border-rust/40 px-3 py-1.5 text-[12px] text-rust"
                >
                  Challenge agent's proposal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MetricsGrid({ engagement }: { engagement: Engagement }) {
  const rows = engagement.artifacts.esrsMapping || [];
  const scores = engagement.artifacts.issueScores || [];
  if (!rows.length && !scores.length) return null;
  return (
    <div>
      <PanelHeader
        title="Measure what matters"
        subtitle="Each material issue has a metric. Some are ESRS standards. Some are custom to your analysis. All are defensible."
      />
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-taupe">
          <tr>
            <th className="px-3 py-2">Material issue</th>
            <th className="px-3 py-2">ESRS / metric</th>
            <th className="px-3 py-2">Baseline</th>
          </tr>
        </thead>
        <tbody>
          {(rows.length ? rows : scores.map((item) => ({ issue: item.issue, metric: item.recommendedMetric, rationale: item.esrs || "" }))).map(
            (row) => (
              <tr key={row.issue} className="border-t border-[var(--line)] hover:bg-sage/10">
                <td className="px-3 py-2">{row.issue}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{row.metric}</td>
                <td className="px-3 py-2 text-ink-soft">{row.rationale || "Not disclosed"}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function TimelineLog({
  engagement,
  mode,
}: {
  engagement: Engagement;
  mode: "discovery" | "probing" | "assumptions";
}) {
  const events =
    mode === "discovery"
      ? engagement.discoveryLog.map((item) => ({
          id: item.id,
          at: item.raisedAt,
          tone: item.reaction === "disputed" ? "rust" : item.reaction === "deeper-investigation" ? "amber" : "forest",
          title: item.issue,
          body: `${item.reaction} · ${item.confidence} · ${item.source}`,
        }))
      : mode === "probing"
        ? engagement.probeLog.map((item) => ({
            id: item.id,
            at: item.raisedAt,
            tone: "rust",
            title: item.userChallenge,
            body: `Original: ${item.originalClaim}. Revised: ${item.revisedClaim}`,
          }))
        : [
            ...engagement.assumptions.map((item) => ({
              id: item.id,
              at: engagement.updatedAt,
              tone: "amber",
              title: item.statement,
              body: item.why,
            })),
            ...engagement.assumptionCheckpoints.map((item) => ({
              id: item.id,
              at: engagement.updatedAt,
              tone: item.userDecision === "agreed" ? "forest" : "amber",
              title: item.statement,
              body: `${item.userDecision} · ${item.confidence} · sensitivity ${item.sensitivity}`,
            })),
          ];

  if (!events.length) {
    return (
      <div>
        <PanelHeader
          title="Your investigation history"
          subtitle="Every finding logged. Every challenge documented. Every revision reasoned. This is your defense."
        />
        <p className="text-sm text-ink-soft">
          {mode === "discovery"
            ? "Findings you surface will collect here, with whether you agreed, disagreed, or asked for a deeper look."
            : mode === "probing"
              ? "If a finding does not make sense, disagree. The original claim, your challenge, and the revised conclusion appear here."
              : "Assumption checkpoints land here as you validate model inputs. Every assumption needs evidence."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title="Your investigation history"
        subtitle="This log is your integrity. Every entry is timestamped. Every challenge is logged. Every revision is reasoned."
      />
      <ol className="relative ml-3 border-l border-sage pl-6">
      {events.map((event, index) => (
        <li
          key={event.id}
          className="relative mb-5 animate-fade-up"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <span
            className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-cloud ${
              event.tone === "rust" ? "bg-rust" : event.tone === "amber" ? "bg-amber" : "bg-forest"
            }`}
          />
          <p className="text-[11px] uppercase tracking-wide text-taupe">{new Date(event.at).toLocaleString()}</p>
          <p className="mt-1 text-[14px] font-medium text-forest">{event.title}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{event.body}</p>
        </li>
      ))}
      </ol>
    </div>
  );
}

export function TeachForm({
  engagement,
  onMethodology,
}: {
  engagement: Engagement;
  onMethodology: (methodology: MethodologyProgress) => Promise<void>;
}) {
  const [methodology, setMethodology] = useState(engagement.methodology);
  const ready = methodologyReady(methodology);
  const types: PricingModelType[] = ["cost", "revenue", "capex", "wacc", "hybrid"];
  const modes: { id: PricingBuildMode; label: string }[] = [
    { id: "agent", label: "A. The agent builds. You review and challenge every assumption." },
    { id: "diy", label: "B. You build. The agent coaches and catches errors. You'll own this model." },
    { id: "hybrid", label: "C. Hybrid. The agent drafts, then you walk each component." },
  ];

  function patch(next: MethodologyProgress) {
    setMethodology(next);
    void onMethodology(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-6 text-ink-soft">
        Learn as you build. Tick these only after the agent has walked the framework in chat. You will own this model.
      </p>
      {(
        [
          ["typesWalked", "I walked the five model types: cost, revenue, capex, WACC, and hybrid."],
          ["anatomyWalked", "I walked the eight components, from baseline through sensitivity."],
          ["exampleWalked", "I walked a real numbered example on one of our material issues."],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-white p-3">
          <input
            type="checkbox"
            checked={Boolean(methodology[key])}
            onChange={() => patch({ ...methodology, [key]: !methodology[key] })}
            className="mt-1 accent-sage"
          />
          <span className="text-[14px]">{label}</span>
        </label>
      ))}
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-forest">Build mode</p>
      {modes.map((mode) => (
        <label key={mode.id} className="flex items-start gap-2 text-[14px]">
          <input
            type="radio"
            name="build-mode"
            checked={methodology.buildMode === mode.id}
            onChange={() => patch({ ...methodology, buildMode: mode.id })}
            className="accent-sage"
          />
          {mode.label}
        </label>
      ))}
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const on = methodology.selectedTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                patch({
                  ...methodology,
                  selectedTypes: on
                    ? methodology.selectedTypes.filter((item) => item !== type)
                    : [...methodology.selectedTypes, type],
                })
              }
              className={`rounded-full px-3 py-1 text-[12px] ${on ? "bg-sage text-white" : "bg-cloud-2 text-forest"}`}
            >
              {type}
            </button>
          );
        })}
      </div>
      <p className={`text-[13px] font-medium ${ready ? "text-sage" : "text-rust"}`}>
        {ready
          ? "Methodology is unlocked. You can start the model build."
          : "The model build stays locked until you have walked the types, walked the anatomy, and chosen a build mode."}
      </p>
    </div>
  );
}

const MODEL_TABS = ["Issue selection", "Base case", "Stress case", "Upside case", "Sensitivity", "Summary"] as const;

export function ModelBuilder({ engagement }: { engagement: Engagement }) {
  const [tab, setTab] = useState<(typeof MODEL_TABS)[number]>("Issue selection");
  const models = engagement.artifacts.financialModels || [];
  const scope = engagement.artifacts.pricingScope;
  const maxAbs = useMemo(() => {
    const values = models.flatMap((model) => [...model.baseCase, ...model.stressCase, ...model.upsideCase]);
    return Math.max(1, ...values.map((value) => Math.abs(value)));
  }, [models]);

  if (!models.length && !scope) {
    return (
      <div>
        <PanelHeader
          title="Build your pricing model"
          subtitle="Learn as you build. Every assumption sourced. Every calculation transparent. You'll own this model."
        />
        <p className="text-sm text-ink-soft">
          Select 2 to 4 material issues from your DMA. Ready to model?
        </p>
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title="Build your pricing model"
        subtitle="Learn as you build. Every assumption sourced. Every calculation transparent. You'll own this model."
      />
      <div className="flex gap-4 overflow-x-auto border-b border-[var(--line)]">
        {MODEL_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`pb-2 text-[13px] ${
              tab === item ? "border-b-2 border-sage text-forest" : "text-ink-soft"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-fade-up mt-4 space-y-4">
        {tab === "Issue selection" ? (
          <div>
            <p className="mb-3 text-[13px] text-ink-soft">
              Pick 2 to 4 material issues from your DMA to model financially. Which has the clearest P&L pathway?
            </p>
            <ul className="space-y-2 text-[14px]">
            {(scope?.issues || models.map((item) => item.issue)).map((issue) => (
              <li key={issue} className="rounded-lg bg-white px-3 py-2">
                {issue}
              </li>
            ))}
            </ul>
          </div>
        ) : null}
        {tab === "Base case" ? (
          <p className="text-[13px] text-ink-soft">
            Current trajectory. Policy evolves as expected. Company adapts partially. Year 1 to 5 projections.
          </p>
        ) : null}
        {tab === "Stress case" ? (
          <p className="text-[13px] text-ink-soft">
            Company fails to adapt. Policy accelerates. Physical risks materialize faster. What's your downside?
          </p>
        ) : null}
        {tab === "Upside case" ? (
          <p className="text-[13px] text-ink-soft">
            Company invests early. First-mover advantage. Market gains share. What's your upside?
          </p>
        ) : null}
        {tab === "Sensitivity" ? (
          <p className="text-[13px] text-ink-soft">
            Change one assumption at a time. See how valuation moves. Which assumptions are critical?
          </p>
        ) : null}
        {tab === "Summary" ? (
          <p className="text-[13px] text-ink-soft">
            Here's what you modeled. Base case, stress case, upside case. Include this summary in your assignment.
          </p>
        ) : null}
        {tab === "Summary" || tab === "Sensitivity" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {(["baseCase", "stressCase", "upsideCase"] as const).map((key, index) => (
              <div key={key} className="rounded-xl bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">{key.replace("Case", "")}</p>
                <div className="mt-3 flex h-32 items-end gap-1">
                  {(models[0]?.[key] || [0, 0, 0, 0, 0]).map((value, bar) => (
                    <div
                      key={bar}
                      className="origin-bottom flex-1 rounded-t bg-sage/80"
                      style={{
                        height: `${Math.max(6, (Math.abs(value) / maxAbs) * 100)}%`,
                        animation: `bar-grow 0.8s ease-out ${index * 0.12 + bar * 0.08}s both`,
                        background: key === "stressCase" ? "var(--rust)" : key === "upsideCase" ? "var(--teal)" : "var(--sage)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {models.map((model) => (
          <div key={model.issue} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <h3 className="serif text-[16px] text-forest">{model.issue}</h3>
            <p className="mt-1 text-[12px] text-ink-soft">{model.mechanism}</p>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="text-left text-taupe">
                  <th className="py-1">Assumption</th>
                  <th className="py-1">Value</th>
                  <th className="py-1">Source</th>
                </tr>
              </thead>
              <tbody>
                {model.assumptions.map((item) => (
                  <tr key={item.name} className="odd:bg-sage/5">
                    <td className="py-1">{item.name}</td>
                    <td className="font-mono">{item.value}</td>
                    <td className="text-ink-soft">
                      {item.source}
                      {item.userValidated ? null : (
                        <span className="ml-2 text-rust" title="Missing source. Every assumption needs evidence.">
                          needs source
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="mt-3 w-full font-mono text-[12px]">
              <thead>
                <tr>
                  <th className="py-1 text-left font-sans text-[10px] uppercase tracking-[0.12em] text-taupe">Year</th>
                  {model.years.map((year) => (
                    <th key={year} className="py-1 font-sans font-normal">
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="odd:bg-cloud">
                  <td>FCF {tab === "Stress case" ? "stress" : tab === "Upside case" ? "upside" : "base"}</td>
                  {(tab === "Stress case"
                    ? model.stressCase
                    : tab === "Upside case"
                      ? model.upsideCase
                      : model.baseCase
                  ).map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-ink-soft">{model.valuationNotes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
