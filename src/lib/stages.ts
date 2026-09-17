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
      name: "Company Profiling",
      short: "Profile",
      gate: "User confirms the snapshot and data-gap inventory.",
    },
    {
      id: 3,
      name: "DMA Discovery",
      short: "DMA",
      gate: "User validates scoring, discovery cards, and the matrix.",
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
    description: "All material stakeholders identified and their concerns mapped.",
  },
  {
    id: "disclosed-issues",
    label: "Issues identified and prioritized",
    description: "Material issues scored and ranked, including disclosed issues and undisclosed risks.",
  },
  {
    id: "undisclosed-issues",
    label: "Undisclosed risks investigated",
    description: "Every blind spot from peer benchmark and regulatory scan has been researched and probed.",
  },
  {
    id: "methodology",
    label: "Scoring methodology agreed",
    description: "You understand and accept the 1 to 5 scales for financial and impact materiality.",
  },
  {
    id: "top-issues",
    label: "Top issues ranked",
    description: "Top-scored issues, including newly discovered ones, are locked in your assessment.",
  },
  {
    id: "data-gaps",
    label: "Data gaps documented",
    description: "Remaining gaps are listed with source, impact on the assessment, and a plan to fill them. They do not have to be closed yet.",
  },
  {
    id: "obscured",
    label: "Probing complete",
    description: "You have challenged or confirmed every hypothesis. The discovery log shows your engagement, and no known obscured issue is left unflagged.",
  },
  {
    id: "metrics",
    label: "Metrics selected and mapped",
    description: "Each material issue has a recommended metric (ESRS or custom). You have agreed on the measurement approach.",
  },
  {
    id: "pnl-pathways",
    label: "Ready to model",
    description: "You are confident enough to model financial impacts for 2 to 4 top issues.",
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
    name: "Profile",
    line: "Map the company",
    active: (stage: number) => stage === 2,
    done: (stage: number) => stage > 2,
  },
  {
    key: "dma",
    name: "DMA Draft",
    line: "Score the issues",
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
  const locked = [
    engagement.artifacts.selectedCompany
      ? `Company: ${engagement.artifacts.selectedCompany}`
      : null,
    engagement.discoveryLog.filter((item) => item.reaction === "accepted").length
      ? `Accepted issues: ${engagement.discoveryLog
          .filter((item) => item.reaction === "accepted")
          .map((item) => item.issue)
          .join("; ")}`
      : null,
    engagement.discoveryLog.filter((item) => item.reaction === "disputed").length
      ? `Disputed: ${engagement.discoveryLog
          .filter((item) => item.reaction === "disputed")
          .map((item) => item.issue)
          .join("; ")}`
      : null,
    engagement.discoveryLog.filter((item) => item.reaction === "deeper-investigation").length
      ? `Flagged for deeper look: ${engagement.discoveryLog
          .filter((item) => item.reaction === "deeper-investigation")
          .map((item) => item.issue)
          .join("; ")}`
      : null,
    engagement.probeLog.length
      ? `Latest probe: ${engagement.probeLog[engagement.probeLog.length - 1]?.revisedClaim}`
      : null,
    engagement.methodology.buildMode !== "unset"
      ? `Pricing build mode: ${engagement.methodology.buildMode}`
      : null,
  ].filter(Boolean);

  const lastDiscovery = engagement.discoveryLog.at(-1);
  const lastProbe = engagement.probeLog.at(-1);
  const lastBits = [
    lastDiscovery ? `surfaced "${lastDiscovery.issue}"` : null,
    lastProbe ? `revised a claim after challenge` : null,
    engagement.dataGapLog.some((item) => item.status === "open")
      ? `left open data gaps`
      : null,
  ].filter(Boolean);

  return `Last time we ${lastBits.length ? lastBits.join(", and ") : "had not yet locked findings"}. Today we are continuing at Stage ${engagement.stage} (${stage?.name || "unknown"}). Locked in so far: ${locked.length ? locked.join(". ") : "nothing locked yet"}. Questions or changes to previous findings before we move forward?`;
}

export const OPENING_MESSAGE = `Hi, I am your Double Materiality and Pricing Model Agent. I will help you research companies, build a DMA you can defend, and find materiality issues companies are not disclosing. You can probe and challenge every finding. I will also teach you how to build pricing models so you understand the mechanics rather than receiving a black box. I keep a full history of this investigation so we build on what we already discovered together.

Start by telling me your search criteria. Answer as many of these as you can, even in rough form:

1) Industry or sector? (for example sustainability-driven consumer, mining, African fintech, apparel, food and agri)
2) Geographic focus? (global, a region such as Sub-Saharan Africa or Southeast Asia, or a specific country)
3) Scale? (public large cap, private, family-office portfolio, SME)
4) Any constraints? (sectors to avoid, CSRD filers only, B2B only, no commodities)
5) Blind spot interest? (hunt hard for undisclosed and emerging issues, or stay closer to what the company already reports)
6) Prior DMA work? (starting fresh, or refining an assessment you already have)
7) Pricing model preference? (I build the models and explain every line; you build them while I coach; or a hybrid where I draft and we walk through it together)

Once I understand what you want, I will research five to seven candidates, including what they are not disclosing, and you pick. Then we build the DMA together. You probe and validate every issue I surface. When we reach pricing models, we either build them step by step or I build them and teach the framework first, based on the preference you set above.`;
