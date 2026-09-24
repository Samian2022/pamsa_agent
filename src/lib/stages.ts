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
      gate: "User probes hypotheses, locks a scoring key, then validates IRO scores against that key.",
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
    description: "Three environmental topics including climate (E1), three social topics, and the IROs under them are locked, mixing disclosed issues and undisclosed risks.",
  },
  {
    id: "undisclosed-issues",
    label: "Undisclosed risks investigated",
    description: "For each undisclosed risk, evidence quality and confidence were assessed, and you decided include or monitor.",
  },
  {
    id: "methodology",
    label: "Scoring methodology agreed",
    description: "You accept the scoring key: why 1 to 5, impact tests that cover operations and the value chain, financial tests on cash flow, costs, revenue, and assets, time horizons, and the materiality threshold. Scores must match those band definitions.",
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
    description: "Each material IRO has metrics that measure why it scored high on impact and on financial axes, not only the metrics the company already reports.",
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

export function workspaceNavLabel(stage: number) {
  if (stage <= 1) return "Candidates";
  if (stage === 2) return "Company audit";
  if (stage <= 4) return "Issue list";
  return "Pricing workspace";
}

export function composerPlaceholder(stage: number) {
  if (stage <= 1) return "Answer the research questions, name a company, or attach a filing.";
  if (stage === 2) return "Challenge the snapshot, paste a filing URL, or ask for the next audit slice.";
  if (stage === 3) return "Agree, disagree, or ask to probe an issue.";
  if (stage === 4) return "Confirm sign-off items, or tell the agent what still feels unfinished.";
  if (stage === 5) return "Name 2 to 4 issues to model, or say which P&L path is clearest.";
  if (stage === 6) return "Ask for the next teaching step, or confirm a build mode.";
  return "Challenge an assumption, or ask to run the next scenario.";
}

export function pendingFindingCount(engagement: Engagement) {
  const cards = engagement.artifacts.discoveryCards || [];
  return cards.filter((card) => {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
    return !reaction || reaction === "pending";
  }).length;
}

export function findingsReadyToScore(engagement: Engagement) {
  const cards = engagement.artifacts.discoveryCards || [];
  if (!cards.length) return false;
  const decided = cards.every((card) => {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
    return Boolean(reaction) && reaction !== "pending";
  });
  const accepted = cards.some(
    (card) => engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction === "accepted",
  );
  return decided && accepted;
}

export function scoringReadyToSignOff(engagement: Engagement) {
  const scores = engagement.artifacts.issueScores || [];
  if (!engagement.artifacts.scoringFramework || scores.length === 0) return false;
  const accepted = engagement.discoveryLog.filter((item) => item.reaction === "accepted").length;
  const needed = accepted > 0 ? accepted : Math.max(1, engagement.artifacts.discoveryCards?.length || 1);
  return scores.length >= needed;
}

export function scopeReadyToTeach(engagement: Engagement) {
  return (engagement.artifacts.pricingScope?.issues.length || 0) >= 2;
}

export function applyStageGates(engagement: Engagement): Engagement {
  let stage = engagement.stage;
  const signOff = engagement.signOff || emptySignOff();
  const methodology = engagement.methodology || emptyMethodology();
  const ready: [StageId, boolean][] = [
    [2, Boolean(engagement.artifacts.selectedCompany)],
    [3, findingsReadyToScore(engagement)],
    [4, scoringReadyToSignOff(engagement)],
    [5, signOffComplete(signOff)],
    [6, scopeReadyToTeach(engagement)],
    [7, methodologyReady(methodology)],
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const [target, ok] of ready) {
      if (stage === target - 1 && ok && canEnterStage(target, stage, signOff, methodology)) {
        stage = target;
        changed = true;
        break;
      }
    }
  }

  return { ...engagement, stage, signOff, methodology };
}

export function nextAction(engagement: Engagement): string {
  const pending = pendingFindingCount(engagement);
  if (pending > 0) {
    return `${pending} finding${pending === 1 ? "" : "s"} still need your call. On each card, press This is material, Not material, or Need more evidence. The agent waits for you.`;
  }
  const company = engagement.artifacts.selectedCompany;
  if (engagement.stage <= 1) {
    if (engagement.artifacts.researchCandidates?.length) {
      return "Press Select on a company to start the disclosure audit.";
    }
    return "Fill the brief below or reply in chat with sector, geography, scale, and any constraints. The agent will rank candidates.";
  }
  if (engagement.stage === 2) {
    if (!engagement.artifacts.discoveryCards?.length) {
      return company
        ? `Upload a filing or ask the agent to extract findings for ${company}. Cards should appear under Review findings in about 15 seconds.`
        : "A company should be locked before the audit. Select one from Candidates or name it in chat.";
    }
    if (findingsReadyToScore(engagement)) {
      return "Findings are locked. DMA scoring is next. Ask the agent to save the scoring key if it is not on screen yet.";
    }
    return company
      ? `Work through the ${company} disclosure audit in chat. Confirm the snapshot when the layers look right.`
      : "A company should be locked before the audit. Select one from Candidates or name it in chat.";
  }
  if (engagement.stage === 3) {
    if (!engagement.artifacts.scoringFramework) {
      return "Ask the agent to lock the scoring key first: climate (E1) plus two more environmental topics and three social, with rationale. Then score IROs, not topic labels.";
    }
    if (scoringReadyToSignOff(engagement)) {
      return "Scores are locked. Continue to sign-off, or press Lock these scores if the checklist is not open yet.";
    }
    return "Score each IRO against the scoring key, then press Lock these scores and continue to sign-off. The rationale must use the band language.";
  }
  if (engagement.stage === 4) {
    return signOffComplete(engagement.signOff)
      ? "Sign-off is complete. Continue to pricing scope."
      : "Open the sign-off checklist and confirm each item you actually own.";
  }
  if (engagement.stage === 5) {
    const count = engagement.artifacts.pricingScope?.issues.length || 0;
    return count >= 2
      ? "Scope is set. Continue to methodology teaching."
      : "Pick 2 to 4 material issues with a clear P&L path.";
  }
  if (engagement.stage === 6) {
    return methodologyReady(engagement.methodology)
      ? "Methodology is unlocked. Start the model build."
      : "Walk the five model types and eight components in chat, then tick them here and choose a build mode.";
  }
  return "Review assumptions and scenarios. Challenge any number that is not sourced.";
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
    engagement.documents?.length
      ? `Source documents uploaded: ${engagement.documents.length}`
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

Once you answer, I will research five to seven candidates and present a ranked table with data availability, disclosure clarity, and blind-spot estimates. You pick one, and we dig in. You can also upload filings, ESG reports, or spreadsheets from Documents (or Attach in the composer). I will treat those as primary sources.`;
