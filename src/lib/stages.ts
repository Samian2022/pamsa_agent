import type { Engagement, MethodologyProgress, SignOffState, StageId } from "./types";

export const STAGES: { id: StageId; name: string; short: string; gate: string }[] =
  [
    {
      id: 1,
      name: "Company Discovery",
      short: "Discover",
      gate: "User picks a company from the research table.",
    },
    {
      id: 2,
      name: "Disclosure Audit",
      short: "Audit",
      gate: "User confirms the snapshot, disclosure audit, baselines, methodology gaps, operations layer, and data-gap inventory.",
    },
    {
      id: 3,
      name: "Probing and DMA",
      short: "Probe",
      gate: "User probes risk hypotheses, then validates three-layer scores and the matrix.",
    },
    {
      id: 4,
      name: "DMA Sign-off",
      short: "Sign-off",
      gate: "User checks every sign-off item before pricing work starts.",
    },
    {
      id: 5,
      name: "Pricing Scope",
      short: "Scope",
      gate: "User chooses 2–4 issues, model types, and DIY vs agent build.",
    },
    {
      id: 6,
      name: "Pricing Methodology",
      short: "Teach",
      gate: "User walks the five model types and eight components before any numbers are locked.",
    },
    {
      id: 7,
      name: "Pricing Models",
      short: "Build",
      gate: "Scenario models with user-validated assumptions.",
    },
  ];

export const SIGN_OFF_ITEMS: { id: string; label: string; description: string }[] = [
  {
    id: "stakeholders",
    label: "Stakeholder map complete",
    description: "Investors, regulators, customers, communities, employees, suppliers, and NGOs are identified, with what they care about.",
  },
  {
    id: "disclosed-issues",
    label: "Issue selection locked",
    description: "A final set of 3 to 6 material issues is locked, mixing disclosed issues and undisclosed risks.",
  },
  {
    id: "undisclosed-issues",
    label: "Undisclosed risks investigated",
    description: "For each undisclosed risk, evidence quality and confidence were assessed, and you decided include or monitor.",
  },
  {
    id: "methodology",
    label: "Scoring methodology agreed",
    description: "You accept the 1 to 5 financial and impact scales, including dollar and EBITDA bands, and they were applied consistently.",
  },
  {
    id: "top-issues",
    label: "Final issues ranked",
    description: "Top-scored issues, including newly discovered ones, are ranked and locked in your assessment.",
  },
  {
    id: "data-gaps",
    label: "Data gaps documented",
    description: "For each issue you recorded what the company measures, what ESRS expects, and what exists externally. Gaps do not have to be closed yet.",
  },
  {
    id: "obscured",
    label: "Probing complete",
    description: "Major hypotheses were tested with you. Confidence levels are validated. The discovery and probing logs show your engagement.",
  },
  {
    id: "metrics",
    label: "Metrics selected and mapped",
    description: "Each material issue has an ESRS-aligned metric (or a justified custom metric) plus a data source: company report, filing, or external estimate.",
  },
  {
    id: "pnl-pathways",
    label: "Ready to model",
    description: "At least 2 to 4 issues have clear P&L pathways (cost, revenue, WACC, or capex) and enough baseline data to build scenarios.",
  },
];

export const JOURNEY_STAGES = [
  {
    key: "research",
    name: "Research",
    line: "Find what's hidden",
    active: (stage: number) => stage <= 1,
    done: (stage: number) => stage > 1,
  },
  {
    key: "profile",
    name: "Audit",
    line: "What they hide",
    active: (stage: number) => stage === 2,
    done: (stage: number) => stage > 2,
  },
  {
    key: "dma",
    name: "DMA Draft",
    line: "Probe, then score",
    active: (stage: number) => stage === 3,
    done: (stage: number) => stage > 3,
  },
  {
    key: "signoff",
    name: "Sign-Off",
    line: "Lock your assessment",
    active: (stage: number) => stage === 4,
    done: (stage: number) => stage > 4,
  },
  {
    key: "pricing",
    name: "Pricing Model",
    line: "Model the impact",
    active: (stage: number) => stage >= 5,
    done: (stage: number) => false,
  },
] as const;

export function emptySignOff(): SignOffState {
  return Object.fromEntries(
    SIGN_OFF_ITEMS.map((item) => [item.id, { agreed: false, notes: "" }]),
  );
}

export function emptyMethodology(): MethodologyProgress {
  return {
    typesWalked: false,
    anatomyWalked: false,
    exampleWalked: false,
    buildMode: "unset",
    selectedTypes: [],
  };
}

export function signOffComplete(signOff: SignOffState): boolean {
  return SIGN_OFF_ITEMS.every((item) => signOff[item.id]?.agreed);
}

export function methodologyReady(methodology: MethodologyProgress): boolean {
  return (
    methodology.typesWalked &&
    methodology.anatomyWalked &&
    methodology.buildMode !== "unset"
  );
}

export function canEnterStage(
  target: StageId,
  current: StageId,
  signOff: SignOffState,
  methodology: MethodologyProgress,
): boolean {
  if (target <= current) return true;
  if (target > current + 1) return false;
  if (target >= 5 && !signOffComplete(signOff)) return false;
  if (target >= 7 && !methodologyReady(methodology)) return false;
  return true;
}

export function buildContextSummary(engagement: Engagement): string {
  const stage = STAGES.find((item) => item.id === engagement.stage);
  const company = engagement.artifacts.selectedCompany || "no company yet";
  const accepted = engagement.discoveryLog.filter((item) => item.reaction === "accepted");
  const disputed = engagement.discoveryLog.filter((item) => item.reaction === "disputed");
  const flagged = engagement.discoveryLog.filter((item) => item.reaction === "deeper-investigation");
  const hypothesisCount =
    engagement.artifacts.discoveryCards?.length ||
    engagement.artifacts.reconciliation?.length ||
    engagement.discoveryLog.length;
  const next =
    engagement.stage <= 1
      ? "researching candidates"
      : engagement.stage === 2
        ? "finishing the disclosure audit"
        : engagement.stage === 3
          ? "probing hypotheses and scoring the DMA"
          : engagement.stage === 4
            ? "locking sign-off"
            : engagement.stage === 5
              ? "scoping pricing models"
              : engagement.stage === 6
                ? "teaching model methodology"
                : "building pricing models";

  const locked = [
    engagement.artifacts.selectedCompany ? `Company: ${company}` : null,
    accepted.length ? `Locked for DMA: ${accepted.map((item) => item.issue).join("; ")}` : null,
    disputed.length ? `Disputed: ${disputed.map((item) => item.issue).join("; ")}` : null,
    flagged.length ? `Monitor / deeper look: ${flagged.map((item) => item.issue).join("; ")}` : null,
    engagement.probeLog.length
      ? `Latest probe: ${engagement.probeLog[engagement.probeLog.length - 1]?.revisedClaim}`
      : null,
    engagement.methodology.buildMode !== "unset"
      ? `Pricing build mode: ${engagement.methodology.buildMode}`
      : null,
  ].filter(Boolean);

  const confidenceBits = accepted
    .slice(0, 4)
    .map((item) => `${item.issue} (${item.confidence})`);
  const auditBits = [
    engagement.artifacts.disclosureAudit?.length
      ? `${engagement.artifacts.disclosureAudit.length} disclosure channels`
      : null,
    engagement.artifacts.operationsNews?.length
      ? `${engagement.artifacts.operationsNews.length} operations/news signals`
      : null,
    hypothesisCount ? `${hypothesisCount} hypotheses surfaced` : null,
  ].filter(Boolean);

  return `Last time we profiled ${company}. We identified ${hypothesisCount || 0} material issues via ESG audit, recent operations, and probing${auditBits.length ? ` (${auditBits.join("; ")})` : ""}. We locked ${accepted.length} issues for DMA, flagged ${flagged.length + disputed.length} for later review. Today we are ${next} at Stage ${engagement.stage} (${stage?.name || "unknown"}). Confirmed so far: ${locked.length ? locked.join(". ") : "nothing locked yet"}${confidenceBits.length ? `. Confidence: ${confidenceBits.join("; ")}` : ""}. Any updates since last time, or shall we proceed?`;
}

export const OPENING_MESSAGE = `I am your research orchestrator for PAMSA, the double materiality assessment workspace. I am here to guide you through discovery, not to hand you a finished matrix.

Here is how we work: I will research the company's disclosures (ESG report, 10-K, earnings, regulatory filings), surface what they measure and what they do not, test my hypotheses against what you know from the inside, and then we will lock a DMA together. After that, we will build pricing models for the material issues that have real financial pathways.

Before we start, I have seven quick questions so I can research the right candidates:

1) Sector? (Any sector interest, or something specific: consumer, energy, materials, financials?)
2) Geography? (Global company? Specific emerging-market exposure?)
3) Company scale? (Revenue range, market cap, or just large cap?)
4) Any constraints? (Avoid certain companies? Only CSRD filers? Only listed on specific exchanges?)
5) Disclosure maturity preference? (Well-documented companies, or underdisclosed companies where we dig deeper?)
6) Prior DMA work? (Have you or your team done a materiality assessment on any company already?)
7) Pricing model preference? (Cost, revenue, WACC, capital intensity, any preference, or let's see what the issues suggest? I can build, you can build with coaching, or we can hybrid.)

Once you answer, I will research five to seven candidates and present a ranked table with data availability, disclosure clarity, and blind-spot estimates. You pick one, and we dig in.`;
