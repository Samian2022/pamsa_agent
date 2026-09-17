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

export const SIGN_OFF_ITEMS: { id: string; label: string }[] = [
  {
    id: "stakeholders",
    label: "Stakeholder map and gaps identified",
  },
  {
    id: "disclosed-issues",
    label: "Disclosed issue selection and scoring",
  },
  {
    id: "undisclosed-issues",
    label: "Undisclosed / emerging issue identification",
  },
  {
    id: "methodology",
    label: "Scoring methodology (1–5 scales)",
  },
  {
    id: "top-issues",
    label: "Top-scored issues, including newly discovered ones",
  },
  {
    id: "metrics",
    label: "Metrics selected, including new metrics for undisclosed issues",
  },
  {
    id: "data-gaps",
    label: "Data gaps reviewed; primary research needs noted",
  },
  {
    id: "obscured",
    label: "No known deliberately obscured issues left unflagged",
  },
  {
    id: "pnl-pathways",
    label: "Clearest P&L pathways identified for pricing models",
  },
];

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
