"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FINANCIAL_BANDS, IMPACT_BANDS, SCORE_LABELS, confidencePercent, rationaleMatchesBand } from "@/lib/format";
import { methodologyReady, SIGN_OFF_ITEMS } from "@/lib/stages";
import type {
  Engagement,
  IssueScore,
  MethodologyProgress,
  PricingBuildMode,
  PricingModelType,
  ScoredDimension,
  ScoringFramework,
  UserReaction,
} from "@/lib/types";
import { MaterialityMatrix } from "./materiality-matrix";

export { ResearchCards } from "./candidate-research";

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="section-kicker text-[16px] md:text-[20px]">{title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink-soft">{subtitle}</p>
    </div>
  );
}

export function LockedPricing({
  engagement,
  onOpenSignOff,
}: {
  engagement: Engagement;
  onOpenSignOff: () => void;
}) {
  const signed = SIGN_OFF_ITEMS.filter((item) => engagement.signOff[item.id]?.agreed).length;
  return (
    <div>
      <PanelHeader
        title="Pricing Model"
        subtitle="Teach pricing before any model is locked. DMA sign-off comes first."
      />
      <p className="text-sm text-ink-soft">
        Sign-off is {signed}/{SIGN_OFF_ITEMS.length}. Finish the checklist, then pick 2 to 4 issues with a
        cost, revenue, capex, or WACC path.
      </p>
      <button
        type="button"
        onClick={onOpenSignOff}
        className="btn-primary mt-4 rounded-full px-4 py-2 text-sm"
      >
        Open sign-off
      </button>
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

export function HypothesisCards({
  engagement,
  onSelect,
  onDecide,
  busy = false,
}: {
  engagement: Engagement;
  onSelect: (issue: string) => void;
  onDecide?: (issue: string, reaction: UserReaction) => void;
  busy?: boolean;
}) {
  const cards = engagement.artifacts.discoveryCards || [];
  const pending = cards.filter((card) => {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
    return !reaction || reaction === "pending";
  }).length;
  if (!cards.length) {
    return (
      <div>
        <PanelHeader
          title="Review findings"
          subtitle="The agent proposes. You decide. Nothing enters the DMA until you press a button on a card."
        />
        <p className="text-sm text-ink-soft">
          {busy
            ? "The agent is extracting findings from the filing. Cards should appear here in about 15 seconds."
            : "Upload a filing or ask the agent to extract findings. At least 6 cards will land here so you can accept, reject, or flag each one."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <PanelHeader
        title="Review findings"
        subtitle={`${pending} still need your call. This is material puts it in the DMA. Not material keeps it out. Need more evidence sends the agent back to dig.`}
      />
      {cards.map((card, index) => {
        const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
        const pendingCard = !reaction || reaction === "pending";
        const tag =
          reaction === "disputed"
            ? "You said this is not material"
            : reaction === "accepted"
              ? "You said this is material"
              : reaction === "deeper-investigation"
                ? "You asked for more evidence"
                : "Waiting for your call";
        const bar =
          reaction === "accepted" ? "border-sage" : reaction === "disputed" ? "border-amber" : "border-rust";
        return (
          <article
            key={card.issue}
            className={`lift animate-slide-left rounded-xl border-l-[2px] ${bar} bg-white p-4 shadow-sm`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <button type="button" onClick={() => onSelect(card.issue)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="serif text-[16px] text-forest">{card.issue}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-soft">{card.definition}</p>
                  {card.evidence ? (
                    <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">Evidence: {card.evidence}</p>
                  ) : null}
                  <span className="mt-2 inline-block text-[11px] uppercase tracking-wide text-rust">{tag}</span>
                </div>
                <ConfidenceBadge value={card.confidence} />
              </div>
            </button>
            {onDecide && pendingCard ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-sage px-3 py-1.5 text-[12px] font-medium text-white"
                  onClick={() => onDecide(card.issue, "accepted")}
                >
                  This is material
                </button>
                <button
                  type="button"
                  className="rounded-full bg-rust px-3 py-1.5 text-[12px] font-medium text-white"
                  onClick={() => onDecide(card.issue, "disputed")}
                >
                  Not material
                </button>
                <button
                  type="button"
                  className="rounded-full bg-amber px-3 py-1.5 text-[12px] font-medium text-forest"
                  onClick={() => onDecide(card.issue, "deeper-investigation")}
                >
                  Need more evidence
                </button>
              </div>
            ) : onDecide ? (
              <button
                type="button"
                className="mt-3 text-[12px] text-sage"
                onClick={() => onSelect(card.issue)}
              >
                Open detail or change your call
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function ProfileView({ engagement }: { engagement: Engagement }) {
  const snap = engagement.artifacts.snapshot;
  const gaps = engagement.artifacts.dataGaps;
  const audit = engagement.artifacts.disclosureAudit || [];
  const baselines = engagement.artifacts.baselineMetrics || [];
  const methodGaps = engagement.artifacts.methodologyGaps || [];
  const ops = engagement.artifacts.operationsNews || [];
  const recon = engagement.artifacts.reconciliation || [];
  const [open, setOpen] = useState("disclosed");
  if (!snap && !gaps && !audit.length && !baselines.length) {
    return (
      <div>
        <PanelHeader title="Audit the company" subtitle="Lock the snapshot. Document what they disclose, how they measure it, and what the last 12 months show they should be monitoring." />
        <p className="text-sm text-ink-soft">
          Snapshot, baselines, and gaps lock here after you review findings. They are a later slice, not the first thing the agent saves.
        </p>
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
              ["Financial snapshot", snap.financialProfile],
              ["Peer set", snap.peerSet],
              ["Stakeholders", snap.keyStakeholders],
              ["Known risk areas", snap.knownRiskAreas],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-taupe">{label}</dt>
                <dd className="mt-1 text-ink-soft">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {audit.length ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-forest">Disclosure audit</p>
          {audit.map((item) => (
            <div key={item.channel} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-[13px] font-medium text-forest">{item.channel}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{item.findings}</p>
              <p className="mt-1 text-[12px] text-rust">Gaps: {item.gaps}</p>
            </div>
          ))}
        </div>
      ) : null}
      {baselines.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
          <p className="px-4 pt-3 text-[10px] uppercase tracking-[0.14em] text-forest">Baseline metrics</p>
          <table className="mt-2 min-w-full text-left text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-taupe">
                <th className="px-4 py-2">Issue</th>
                <th className="px-2 py-2">Metric</th>
                <th className="px-2 py-2">Baseline</th>
                <th className="px-2 py-2">ESRS</th>
                <th className="px-4 py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {baselines.map((row) => (
                <tr key={row.issue} className="border-t border-[var(--line)]">
                  <td className="px-4 py-2 text-forest">{row.issue}</td>
                  <td className="px-2 py-2 text-ink-soft">{row.companyMetric}</td>
                  <td className="px-2 py-2 text-ink-soft">{row.baseline}</td>
                  <td className="px-2 py-2 font-mono text-[11px]">{row.esrsMetric}</td>
                  <td className="px-4 py-2 text-ink-soft">{row.dataQualityFlag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {methodGaps.length ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-forest">Methodology gaps</p>
          {methodGaps.map((item) => (
            <div key={item.issue} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[13px]">
              <p className="font-medium text-forest">
                {item.issue} <span className="ml-2 text-[11px] text-taupe">gap {item.gapScore}/5</span>
              </p>
              <p className="mt-1 text-ink-soft">Scope: {item.scopeGap}</p>
              <p className="text-ink-soft">Measurement: {item.measurementGap}</p>
            </div>
          ))}
        </div>
      ) : null}
      {ops.length ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-forest">12-month operations and news</p>
          {ops.map((item, index) => (
            <div key={`${item.theme}-${index}`} className="rounded-xl border-l-[2px] border-amber bg-white px-4 py-3 text-[13px]">
              <p className="text-[11px] uppercase tracking-wide text-taupe">
                {item.theme}
                {item.date ? ` · ${item.date}` : ""}
              </p>
              <p className="mt-1 font-medium text-forest">{item.event}</p>
              <p className="mt-1 text-ink-soft">{item.gapSignal}</p>
            </div>
          ))}
        </div>
      ) : null}
      {recon.length ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-forest">Why is this undisclosed?</p>
          {recon.map((item) => (
            <div key={item.issue} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[13px]">
              <p className="font-medium text-forest">{item.issue}</p>
              <p className="mt-1 text-ink-soft">{item.likelyReason}</p>
              <p className="mt-1 text-[12px] text-taupe">
                {item.disclosureStatus} · {item.confidence}
                {item.flagForProbing ? " · Flag for probing" : ""}
              </p>
            </div>
          ))}
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
              ["env", "Environmental", gaps.environmental],
              ["soc", "Social", gaps.social],
              ["gov", "Governance", gaps.governance],
            ] as const
          )
            .filter(([, , value]) => value)
            .map(([id, label, value]) => (
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

function DimensionNote({
  label,
  dimension,
  bandHint,
}: {
  label: string;
  dimension?: ScoredDimension;
  bandHint: string;
}) {
  if (!dimension) return null;
  const aligned = rationaleMatchesBand(dimension.rationale, bandHint);
  return (
    <div className="rounded-lg bg-cloud px-3 py-2">
      <p className="flex justify-between text-[11px] uppercase tracking-[0.12em] text-taupe">
        <span>{label}</span>
        <span className="font-mono text-forest">
          {dimension.score} · {SCORE_LABELS[dimension.score]}
        </span>
      </p>
      <p className="mt-1 text-[12px] leading-5 text-ink-soft">{dimension.rationale}</p>
      {dimension.citation ? (
        <p className="mt-1 text-[11px] text-ink-soft">
          {dimension.citation}
          {dimension.citationLocator ? ` · ${dimension.citationLocator}` : ""}
        </p>
      ) : null}
      {aligned ? null : (
        <p className="mt-1 text-[12px] text-rust">
          This rationale does not use the scoring-key language for that band.
        </p>
      )}
    </div>
  );
}

function ScoringKey({ framework }: { framework: ScoringFramework }) {
  const environmental = framework.topics.filter((item) => item.pillar === "environmental");
  const social = framework.topics.filter((item) => item.pillar === "social");
  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
      <PanelHeader
        title="Scoring key"
        subtitle="Every IRO is scored against this key. The executive team will ask why each choice."
      />
      <p className="text-[13px] leading-6 text-ink">{framework.topicSelectionRationale}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">Environmental</p>
          <ul className="mt-1 space-y-1 text-[13px] text-ink">
            {environmental.map((topic) => (
              <li key={topic.esrs}>
                {topic.esrs} {topic.name}. {topic.rationale}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">Social</p>
          <ul className="mt-1 space-y-1 text-[13px] text-ink">
            {social.map((topic) => (
              <li key={topic.esrs}>
                {topic.esrs} {topic.name}. {topic.rationale}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-[12px] leading-5 text-ink-soft">
        Scale: {framework.scaleChoiceRationale} Threshold: {framework.thresholdRule}.{" "}
        {framework.thresholdRationale} Impact tests: {framework.impactDimensions}
        {framework.impactIncludesValueChain ? ", covering operations and the value chain" : ", value chain is not yet in the criteria language"}.
        Financial tests: {framework.financialDimensions} on {framework.financialMagnitudeOn}. Time horizons:
        impact {framework.impactTimeHorizons}; financial {framework.financialTimeHorizons}.{" "}
        {framework.timeHorizonVsImpact}
      </p>
      {framework.impactIncludesValueChain ? null : (
        <p className="text-[12px] text-rust">
          Add operations and value chain to the impact criteria so supply-chain IROs get scored.
        </p>
      )}
    </div>
  );
}

export function ScoringPanel({
  engagement,
  selected,
  onSelect,
  onScores,
  onLock,
}: {
  engagement: Engagement;
  selected: string | null;
  onSelect: (issue: string) => void;
  onScores: (issues: IssueScore[]) => void;
  onLock?: (issues: IssueScore[]) => void;
}) {
  const issues = engagement.artifacts.issueScores;
  const framework = engagement.artifacts.scoringFramework;
  const originals = useRef(
    new Map((issues || []).map((item) => [item.issue, { f: item.financialScore, i: item.impactScore }])),
  );
  const [draft, setDraft] = useState(issues || []);

  useEffect(() => {
    setDraft(issues || []);
  }, [issues]);

  if (!framework && !issues?.length) {
    return (
      <div>
        <PanelHeader
          title="Score each IRO"
          subtitle="Lock the scoring key first. Then score impacts, risks, and opportunities against that key, not topic labels."
        />
        <p className="text-sm text-ink-soft">
          Ask the agent to save the scoring key: climate change (E1) plus two more environmental topics and
          three social, with rationale and evidence. Then score 1 to 3 IROs at a time. Climate is presumed
          material unless you prove otherwise.
        </p>
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
        title="Score each IRO"
        subtitle="Move the sliders. The rationale must match the scoring-key band. Metrics must measure why it scored high."
      />
      {framework ? <ScoringKey framework={framework} /> : null}
      {draft.length ? (
        <MaterialityMatrix
          issues={draft}
          discoveryLog={engagement.discoveryLog}
          selected={selected}
          onSelect={onSelect}
        />
      ) : (
        <p className="text-sm text-ink-soft">
          The key is saved. Ask the agent to score the first IRO under E1 climate change.
        </p>
      )}
      {draft.length ? (
        <p className="text-[12px] text-ink-soft">
          Solid sage: disclosed by the company. Rust: the company is silent on this. Amber: you are
          investigating this. Teal: upside opportunity. Your data overrides ours. The matrix is only part of
          the threshold if the scoring key says clusters define material.
        </p>
      ) : null}
      <div className="space-y-4">
        {draft.map((issue) => {
          const original = originals.current.get(issue.issue);
          const jumped =
            original &&
            (Math.abs(original.f - issue.financialScore) >= 2 || Math.abs(original.i - issue.impactScore) >= 2);
          const impactAligned = rationaleMatchesBand(
            issue.impactEvidence,
            framework?.impactBands || IMPACT_BANDS[issue.impactScore],
          );
          const financialAligned = rationaleMatchesBand(
            issue.financialEvidence,
            framework?.financialBands || FINANCIAL_BANDS[issue.financialScore],
          );
          return (
            <div
              key={issue.issue}
              className={`space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 ${
                selected === issue.issue ? "ring-1 ring-sage" : ""
              }`}
            >
              <div className="grid gap-4 md:grid-cols-[2fr_1.5fr_1.5fr]">
                <div>
                  <button type="button" onClick={() => onSelect(issue.issue)} className="text-left">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">
                      {[issue.esrsTopic || issue.esrs, issue.iroKind, issue.actualVsPotential, issue.polarity]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <h3 className="serif text-[16px] text-forest">{issue.issue}</h3>
                  </button>
                  <p className="mt-1 text-[12px] text-ink-soft">{issue.iroDescription || issue.definition}</p>
                  {issue.valueChainLocation ? (
                    <p className="mt-1 text-[12px] text-ink-soft">Where: {issue.valueChainLocation}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ConfidenceBadge value={issue.confidence} />
                    {typeof issue.material === "boolean" ? (
                      <span className={`text-[11px] uppercase tracking-wide ${issue.material ? "text-sage" : "text-taupe"}`}>
                        {issue.material ? "Material under the key" : "Below the threshold"}
                      </span>
                    ) : null}
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
                        <span className="font-mono">
                          {issue[key]} · {SCORE_LABELS[issue[key]]}
                        </span>
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
                        <span className="text-[11px] text-ink-soft">
                          {framework?.financialBands || FINANCIAL_BANDS[issue.financialScore]}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-soft">
                          {framework?.impactBands || IMPACT_BANDS[issue.impactScore]}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">Why this score</p>
                  <p className="mt-1 text-[12px] text-ink-soft">{issue.financialEvidence}</p>
                  <p className="mt-1 text-[12px] text-ink-soft">{issue.impactEvidence}</p>
                  {financialAligned && impactAligned ? null : (
                    <p className="mt-2 text-[12px] text-rust">
                      Link the rationale to the scoring-key definition of this band, not only a raw number.
                    </p>
                  )}
                  {issue.materialRationale ? (
                    <p className="mt-2 text-[12px] text-ink-soft">{issue.materialRationale}</p>
                  ) : null}
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
              {issue.impactScale || issue.financialMagnitude ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <DimensionNote
                    label="Impact scale"
                    dimension={issue.impactScale}
                    bandHint={framework?.impactBands || IMPACT_BANDS[issue.impactScore]}
                  />
                  <DimensionNote
                    label="Impact scope"
                    dimension={issue.impactScope}
                    bandHint={framework?.impactBands || IMPACT_BANDS[issue.impactScore]}
                  />
                  <DimensionNote
                    label="Remediability"
                    dimension={issue.impactRemediability}
                    bandHint={framework?.impactBands || IMPACT_BANDS[issue.impactScore]}
                  />
                  <DimensionNote
                    label="Likelihood"
                    dimension={issue.impactLikelihood}
                    bandHint={framework?.impactBands || IMPACT_BANDS[issue.impactScore]}
                  />
                  <DimensionNote
                    label="Financial magnitude"
                    dimension={issue.financialMagnitude}
                    bandHint={framework?.financialBands || FINANCIAL_BANDS[issue.financialScore]}
                  />
                  <DimensionNote
                    label="Financial probability"
                    dimension={issue.financialProbability}
                    bandHint={framework?.financialBands || FINANCIAL_BANDS[issue.financialScore]}
                  />
                </div>
              ) : null}
              {issue.recommendedMetrics?.length ? (
                <ul className="space-y-1 text-[12px] text-ink-soft">
                  {issue.recommendedMetrics.map((metric) => (
                    <li key={`${metric.axis}-${metric.metric}`}>
                      <span className="font-mono text-forest">{metric.metric}</span>
                      {" · "}
                      {metric.axis} · {metric.whyLinkedToCriteria}
                      {metric.alreadyReported ? " (already reported)" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-mono text-[11px] text-forest">{issue.recommendedMetric}</p>
              )}
            </div>
          );
        })}
      </div>
      {draft.length && onLock ? (
        <button
          type="button"
          onClick={() => onLock(draft)}
          className="btn-primary rounded-full px-4 py-2 text-sm"
        >
          Lock these scores and continue to sign-off
        </button>
      ) : null}
    </div>
  );
}

export function MetricsGrid({ engagement }: { engagement: Engagement }) {
  const rows = engagement.artifacts.esrsMapping || [];
  const scores = engagement.artifacts.issueScores || [];
  const fromIros = scores.flatMap((item) =>
    (item.recommendedMetrics || []).map((metric) => ({
      issue: item.issue,
      metric: metric.metric,
      rationale: `${metric.axis}: ${metric.whyLinkedToCriteria}`,
    })),
  );
  const fallback = scores.map((item) => ({
    issue: item.issue,
    metric: item.recommendedMetric,
    rationale: item.esrs || item.materialRationale || "",
  }));
  const display = fromIros.length ? fromIros : rows.length ? rows : fallback;
  if (!display.length) return null;
  return (
    <div>
      <PanelHeader
        title="Measure what matters"
        subtitle="Metrics must measure why the IRO scored high. Company-reported metrics are fine only when they also speak to that why."
      />
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-taupe">
          <tr>
            <th className="px-3 py-2">IRO</th>
            <th className="px-3 py-2">Metric</th>
            <th className="px-3 py-2">Why this metric</th>
          </tr>
        </thead>
        <tbody>
          {display.map((row) => (
            <tr key={`${row.issue}-${row.metric}`} className="border-t border-[var(--line)] hover:bg-sage/10">
              <td className="px-3 py-2">{row.issue}</td>
              <td className="px-3 py-2 font-mono text-[12px]">{row.metric}</td>
              <td className="px-3 py-2 text-ink-soft">{row.rationale || "Not disclosed"}</td>
            </tr>
          ))}
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
          <p className="text-[11px] uppercase tracking-wide text-taupe" suppressHydrationWarning>
            {new Date(event.at).toLocaleString()}
          </p>
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
          ? "Methodology is unlocked. The workspace will move you into the model build."
          : "The model build stays locked until you have walked the types, walked the anatomy, and chosen a build mode."}
      </p>
    </div>
  );
}

export function ScopePicker({
  engagement,
  onScope,
}: {
  engagement: Engagement;
  onScope: (issues: string[]) => void;
}) {
  const options = engagement.artifacts.issueScores?.length
    ? engagement.artifacts.issueScores.map((item) => item.issue)
    : engagement.artifacts.discoveryCards?.length
      ? engagement.artifacts.discoveryCards.map((item) => item.issue)
      : engagement.discoveryLog.filter((item) => item.reaction === "accepted").map((item) => item.issue);
  const locked = engagement.artifacts.pricingScope?.issues || [];
  const [picked, setPicked] = useState<string[]>(locked);

  if (!options.length) {
    return (
      <div>
        <PanelHeader
          title="Choose issues to model"
          subtitle="Pricing needs 2 to 4 material issues with a real P&L path."
        />
        <p className="text-sm text-ink-soft">
          No scored issues yet. Finish DMA scoring, or name issues in chat and ask the agent to save them.
        </p>
      </div>
    );
  }

  function toggle(issue: string) {
    setPicked((current) => {
      if (current.includes(issue)) return current.filter((item) => item !== issue);
      if (current.length >= 4) return current;
      return [...current, issue];
    });
  }

  return (
    <div>
      <PanelHeader
        title="Choose issues to model"
        subtitle="Pick 2 to 4. Prefer issues with a cost, revenue, capex, or WACC path you can source."
      />
      <ul className="space-y-2">
        {options.map((issue) => {
          const on = picked.includes(issue);
          return (
            <li key={issue}>
              <button
                type="button"
                onClick={() => toggle(issue)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-[14px] ${
                  on ? "border-sage bg-sage/10 text-forest" : "border-[var(--line)] bg-white text-ink"
                }`}
              >
                {on ? "Selected · " : ""}
                {issue}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={picked.length < 2}
        onClick={() => onScope(picked)}
        className="btn-primary mt-4 rounded-full px-4 py-2 text-sm disabled:opacity-50"
      >
        {picked.length < 2 ? "Pick at least 2 issues" : "Lock scope and teach methodology"}
      </button>
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
