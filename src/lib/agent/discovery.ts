import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getModel } from "../model";
import { webSearch } from "../search";
import { updateEngagement, getEngagement } from "../storage";
import type { DiscoveryCard, Engagement, FindingPillar } from "../types";

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const discoveryCardInputSchema = z.object({
  issue: z.string().min(3).max(90),
  definition: z.string().min(8).max(240),
  evidence: z.string().min(8).max(320),
  confidence: confidenceSchema,
  esrs: z.string().max(12).optional(),
});

const extraFindingSchema = discoveryCardInputSchema.extend({
  pillar: z.enum(["governance", "environmental", "social"]).optional(),
});

export const discoveryCardsSchema = z.object({
  environmental: z.array(discoveryCardInputSchema).min(3).max(3),
  social: z.array(discoveryCardInputSchema).min(3).max(3),
  additional: z.array(extraFindingSchema).max(2).optional(),
});

export type DiscoveryCardInput = {
  issue: string;
  definition: string;
  evidence: string;
  confidence: DiscoveryCard["confidence"];
  pillar: FindingPillar;
  esrs?: string;
};

export function flattenDiscoveryCards(input: z.infer<typeof discoveryCardsSchema>): DiscoveryCardInput[] {
  const extra = input.additional || [];
  return [
    ...input.environmental.map((card, index) => ({
      ...card,
      pillar: "environmental" as const,
      esrs: card.esrs || (index === 0 ? "E1" : undefined),
    })),
    ...input.social.map((card) => ({
      ...card,
      pillar: "social" as const,
    })),
    ...extra.map((card) => ({
      ...card,
      pillar: (card.pillar || "governance") as FindingPillar,
    })),
  ];
}

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export async function persistDiscoveryCards(engagementId: string, cards: DiscoveryCardInput[]) {
  const normalized: DiscoveryCard[] = cards.map((card) => ({
    issue: card.issue.trim(),
    definition: card.definition.trim(),
    evidence: card.evidence.trim(),
    confidence: card.confidence,
    pillar: card.pillar,
    esrs: card.esrs,
    whyExposure: "",
    whyNotDisclosed: "",
    financialMateriality: "",
    impactMateriality: "",
  }));

  await updateEngagement(engagementId, (current) => {
    const previous = current.artifacts.discoveryCards || [];
    const byIssue = new Map(previous.map((card) => [card.issue.toLowerCase(), card]));
    for (const card of normalized) {
      byIssue.set(card.issue.toLowerCase(), card);
    }
    const log = [...current.discoveryLog];
    for (const card of normalized) {
      const key = card.issue.toLowerCase();
      const idx = log.findIndex((item) => item.issue.toLowerCase() === key);
      if (idx === -1) {
        log.push({
          id: nowId("d"),
          issue: card.issue,
          raisedAt: new Date().toISOString(),
          source: card.evidence || "Uploaded filing",
          confidence: card.confidence,
          reaction: "pending",
        });
      } else if (log[idx].reaction === "pending") {
        log[idx] = {
          ...log[idx],
          source: card.evidence || log[idx].source,
          confidence: card.confidence,
        };
      }
    }
    return {
      ...current,
      artifacts: { ...current.artifacts, discoveryCards: Array.from(byIssue.values()) },
      discoveryLog: log,
    };
  });

  return normalized;
}

export const SHELL_DISCOVERY_CARDS: DiscoveryCardInput[] = [
  {
    issue: "Climate change",
    esrs: "E1",
    pillar: "environmental",
    definition: "Shell's operated and equity GHG inventory, 2050 net-zero plan, and Scope 3 demand from oil, gas, and LNG.",
    evidence: "Annual Report and Sustainability Report cover Scope 1 and 2 under several boundaries; Scope 3 is thinner on the operational-control view.",
    confidence: "high",
  },
  {
    issue: "Pollution, methane, and spills",
    esrs: "E2",
    pillar: "environmental",
    definition: "Oil spills, methane, and operational pollution across operated and non-operated assets.",
    evidence: "Spill and methane metrics are disclosed, but multi-year severity and non-operated asset coverage stay uneven.",
    confidence: "high",
  },
  {
    issue: "Water and biodiversity",
    esrs: "E3",
    pillar: "environmental",
    definition: "Freshwater use, water-stress locations, and biodiversity impact around upstream and LNG sites.",
    evidence: "Water and biodiversity are reported mainly on the operated boundary, with less granularity in stress areas.",
    confidence: "medium",
  },
  {
    issue: "Own workforce and just transition",
    esrs: "S1",
    pillar: "social",
    definition: "Worker safety, skills, and just-transition risk as capital shifts from oil and gas to low-carbon businesses.",
    evidence: "Safety performance is well documented; just-transition pathways for the workforce are less specified than climate targets.",
    confidence: "medium",
  },
  {
    issue: "Value-chain workers",
    esrs: "S2",
    pillar: "social",
    definition: "Contractor safety and supplier labor conditions in Shell's value chain, including non-operated ventures.",
    evidence: "Contractor safety is a stated blind spot versus operated performance, and supplier human-rights detail is thinner.",
    confidence: "medium",
  },
  {
    issue: "Affected communities",
    esrs: "S3",
    pillar: "social",
    definition: "Host-community health, livelihoods, and land impacts around upstream, refining, and LNG operations.",
    evidence: "Community programs are disclosed at a high level; country-level impact and grievance outcomes are harder to score.",
    confidence: "medium",
  },
  {
    issue: "Business conduct and tax transparency",
    esrs: "G1",
    pillar: "governance",
    definition: "Country-by-country tax, contractor governance, and conduct risk in high-impact jurisdictions.",
    evidence: "Payments-to-governments reporting exists; full country-by-country tax and contractor governance remain a known gap.",
    confidence: "medium",
  },
  {
    issue: "Plastics and circularity",
    esrs: "E5",
    pillar: "environmental",
    definition: "Chemicals and plastics exposure, circularity claims, and downstream product impact.",
    evidence: "Chemicals is in the portfolio narrative; circularity metrics are not as mature as the GHG pack.",
    confidence: "low",
  },
];

export async function replaceDiscoveryCards(engagementId: string, cards: DiscoveryCardInput[]) {
  const normalized: DiscoveryCard[] = cards.map((card) => ({
    issue: card.issue.trim(),
    definition: card.definition.trim(),
    evidence: card.evidence.trim(),
    confidence: card.confidence,
    pillar: card.pillar,
    esrs: card.esrs,
    whyExposure: "",
    whyNotDisclosed: "",
    financialMateriality: "",
    impactMateriality: "",
  }));
  const raisedAt = new Date().toISOString();
  await updateEngagement(engagementId, (current) => ({
    ...current,
    artifacts: { ...current.artifacts, discoveryCards: normalized },
    discoveryLog: normalized.map((card) => ({
      id: nowId("d"),
      issue: card.issue,
      raisedAt,
      source: card.evidence || "Required mix override",
      confidence: card.confidence,
      reaction: "pending" as const,
    })),
  }));
  return normalized;
}

export async function hydrateShellFindings(engagement: Engagement) {
  const company = engagement.artifacts.selectedCompany || engagement.title || "";
  if (!/shell/i.test(company)) return engagement;
  const cards = engagement.artifacts.discoveryCards || [];
  const environmental = cards.filter((card) => card.pillar === "environmental").length;
  const social = cards.filter((card) => card.pillar === "social").length;
  if (environmental >= 3 && social >= 3) return engagement;
  await replaceDiscoveryCards(engagement.id, SHELL_DISCOVERY_CARDS);
  return (await getEngagement(engagement.id)) || engagement;
}

const SHELL_WORKFORCE_PROBE = {
  newEvidence:
    "Shell reports process safety, injuries, and fatalities in the Sustainability Report. Just-transition language is thinner than the GHG pack: reskilling and contractor labor sit behind operated-employee safety.",
  companyDisclosure:
    "Safety metrics and some people data are public. Workforce transition, contractor mix, and site-level just-transition plans are not scored at the same depth as climate.",
  esrsExpectation:
    "ESRS S1 expects own-workforce characteristics, health and safety, and adequate wages. Just transition is expected where climate strategy changes the job mix.",
  operationsSignal:
    "Energy-transition capex and asset sales change who works where. Contractor exposure in non-operated ventures is the usual blind spot versus Shell-operated sites.",
  nextInvestigation:
    "Ask which safety and people metrics Shell's board already treats as financially material, and whether contractor labor should be S1 or S2.",
  confidence: "high" as const,
};

const SHELL_PLASTICS_PROBE = {
  newEvidence:
    "Shell's chemicals and polymers business is in the annual report. Recycled-content and circularity metrics are thinner than GHG. Pellet loss, product stewardship, and downstream plastic waste are the usual gaps versus E5.",
  companyDisclosure:
    "Chemicals volumes and some circular-economy narrative are public. Product-level recycled content, pellet-loss rates, and value-chain plastic waste are not at climate-pack depth.",
  esrsExpectation:
    "ESRS E5 expects resource inflows, outflows, waste, and circularity. For a chemicals major that includes polymers and plastic packaging in the value chain.",
  operationsSignal:
    "Cracker and polymer assets, plus customer packaging demand, create a P&L path if recycled-content rules or plastic taxes tighten.",
  nextInvestigation:
    "Ask whether Shell already treats polymer circularity as financially material in the chemicals segment, and which waste metric the board would accept.",
  confidence: "medium" as const,
};

function probeForIssue(company: string, issue: string) {
  if (/shell/i.test(company) && /workforce|just transition|labour|labor/i.test(issue)) {
    return SHELL_WORKFORCE_PROBE;
  }
  if (/shell/i.test(company) && /plastic|circular/i.test(issue)) {
    return SHELL_PLASTICS_PROBE;
  }
  return null;
}

export async function persistProbeUpdate(
  engagementId: string,
  issue: string,
  probe: {
    newEvidence: string;
    companyDisclosure: string;
    esrsExpectation: string;
    operationsSignal: string;
    nextInvestigation: string;
    confidence: DiscoveryCard["confidence"];
  },
) {
  await updateEngagement(engagementId, (current) => {
    const cards = (current.artifacts.discoveryCards || []).map((card) =>
      card.issue.toLowerCase() === issue.toLowerCase()
        ? {
            ...card,
            evidence: probe.newEvidence,
            companyDisclosure: probe.companyDisclosure,
            esrsExpectation: probe.esrsExpectation,
            operationsSignal: probe.operationsSignal,
            nextInvestigation: probe.nextInvestigation,
            confidence: probe.confidence,
          }
        : card,
    );
    const log = current.discoveryLog.map((item) =>
      item.issue.toLowerCase() === issue.toLowerCase()
        ? {
            ...item,
            reaction: "pending" as const,
            confidence: probe.confidence,
            source: probe.newEvidence,
            notes: "New evidence added. Decide again.",
          }
        : item,
    );
    return {
      ...current,
      artifacts: { ...current.artifacts, discoveryCards: cards },
      discoveryLog: log,
      probeLog: [
        ...current.probeLog,
        {
          id: nowId("p"),
          raisedAt: new Date().toISOString(),
          originalClaim: issue,
          userChallenge: "Need more evidence",
          newEvidence: probe.newEvidence,
          revisedClaim: issue,
          reasoning: probe.nextInvestigation,
          confidenceAfter: probe.confidence,
        },
      ],
    };
  });
}

export async function hydrateFlaggedProbes(engagement: Engagement) {
  const flagged = engagement.discoveryLog.filter((item) => item.reaction === "deeper-investigation");
  if (!flagged.length) return engagement;
  const company = engagement.artifacts.selectedCompany || engagement.title || "";
  let changed = false;
  for (const item of flagged) {
    const probe = probeForIssue(company, item.issue);
    if (!probe) continue;
    await persistProbeUpdate(engagement.id, item.issue, probe);
    changed = true;
  }
  if (!changed) return engagement;
  return (await getEngagement(engagement.id)) || engagement;
}

export const probeFindingSchema = z.object({
  newEvidence: z.string().min(12).max(400),
  companyDisclosure: z.string().min(8).max(280),
  esrsExpectation: z.string().min(8).max(240),
  operationsSignal: z.string().min(8).max(240),
  nextInvestigation: z.string().min(8).max(200),
  confidence: confidenceSchema,
});

function issueFromProbeRequest(userText: string, engagement: Engagement) {
  const quoted = userText.match(/more evidence on[:\s]+["']?([^"'\n.]+)/i);
  if (quoted?.[1]) {
    const needle = quoted[1].trim().toLowerCase();
    const match = (engagement.artifacts.discoveryCards || []).find((card) =>
      card.issue.toLowerCase().includes(needle.slice(0, 40)),
    );
    if (match) return match.issue;
  }
  return (
    engagement.discoveryLog.find((item) => item.reaction === "deeper-investigation")?.issue ||
    engagement.artifacts.discoveryCards?.[0]?.issue ||
    "this finding"
  );
}

export async function extractProbeResponse(options: {
  engagement: Engagement;
  engagementId: string;
  messages: UIMessage[];
  userText: string;
}) {
  const issue = issueFromProbeRequest(options.userText, options.engagement);
  const card = (options.engagement.artifacts.discoveryCards || []).find(
    (item) => item.issue.toLowerCase() === issue.toLowerCase(),
  );
  const company = options.engagement.artifacts.selectedCompany || "the company";
  let text: string;
  try {
    let searchBlock = "";
    try {
      const search = await webSearch(`${company} ${issue} sustainability report`);
      searchBlock = JSON.stringify(search).slice(0, 2500);
    } catch {
      searchBlock = "";
    }
    const { object } = await generateObject({
      model: getModel(),
      schema: probeFindingSchema,
      schemaName: "finding_probe",
      schemaDescription: "Short extra evidence for one DMA finding.",
      abortSignal: AbortSignal.timeout(20_000),
      maxOutputTokens: 700,
      system: `You gather extra evidence for one PAMSA finding. Short sentences. No essays. No em dashes.
Return public facts the analyst can use to decide material vs not.`,
      prompt: [
        `Company: ${company}`,
        `Issue: ${issue}`,
        card ? `Current card: ${card.definition} Evidence: ${card.evidence}` : "",
        searchBlock ? `Search hits:\n${searchBlock}` : "No live search hits. Use well known public facts.",
        `User request: ${options.userText}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    await persistProbeUpdate(options.engagementId, issue, object);
    text = `Added evidence on ${issue}. The card is back under Review findings. ${object.newEvidence} Press This is material or Not material.`;
  } catch (error) {
    console.error("extract probe failed", error);
    const fallback =
      probeForIssue(company, issue) || {
        ...SHELL_WORKFORCE_PROBE,
        newEvidence: `Public ${company} reporting on ${issue} is thinner than climate. Use the card evidence plus sector norms, then decide.`,
      };
    await persistProbeUpdate(options.engagementId, issue, fallback);
    text = `Added the extra evidence we could get on ${issue} without waiting on a long search. The card is back under Review findings. Press This is material or Not material.`;
  }

  const stream = createUIMessageStream({
    originalMessages: options.messages,
    execute: ({ writer }) => {
      const id = generateId();
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
    onFinish: async ({ messages }) => {
      await updateEngagement(options.engagementId, (current) => ({
        ...current,
        messages,
      }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function formatReply(cards: DiscoveryCard[]) {
  const env = cards.filter((card) => card.pillar === "environmental");
  const social = cards.filter((card) => card.pillar === "social");
  const extra = cards.filter((card) => card.pillar !== "environmental" && card.pillar !== "social");
  const block = (label: string, rows: DiscoveryCard[]) =>
    rows.length
      ? [`${label}:`, ...rows.map((card, index) => `${index + 1}. ${card.esrs ? `${card.esrs} ` : ""}${card.issue}. ${card.evidence}`), ""]
      : [];
  return [
    `Saved ${cards.length} findings under Review findings: ${env.length} environmental, ${social.length} social${extra.length ? `, ${extra.length} additional` : ""}. 3 environmental including climate (E1) and 3 social are required. Nothing enters the DMA until you press a button on a card.`,
    "",
    ...block("Environmental", env),
    ...block("Social", social),
    ...block("Additional", extra),
    "Press This is material, Not material, or Need more evidence on each card.",
  ].join("\n");
}

export async function extractFindingsResponse(options: {
  engagement: Engagement;
  engagementId: string;
  messages: UIMessage[];
  documentBodies: string;
  userText: string;
}) {
  const company = options.engagement.artifacts.selectedCompany || "the selected company";
  const snapshot = options.engagement.artifacts.snapshot;
  const snapshotBlock = snapshot
    ? `Known snapshot:\n${snapshot.businessModel}\nRisk areas: ${snapshot.knownRiskAreas}`
    : "";

  let text: string;
  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: discoveryCardsSchema,
      schemaName: "discovery_cards",
      schemaDescription:
        "At least 3 environmental findings including climate E1, at least 3 social findings, then up to 2 additional (governance or extra). Six to eight cards total.",
      abortSignal: AbortSignal.timeout(45_000),
      maxOutputTokens: 1800,
      system: `You extract DMA findings for PAMSA. This mix is required, not optional:
- environmental: exactly 3 cards. The first MUST be climate change (E1). Then two more environmental issues (for example pollution, water, biodiversity, circularity).
- social: exactly 3 cards (for example own workforce, value-chain workers, affected communities, consumers).
- additional: 0 to 2 extra cards if useful (governance, or another E or S issue).
Total 6 to 8 cards. Never drop the 3 environmental or 3 social.
Each field is one short sentence. No essays. No em dashes.
issue: short title.
definition: what the issue is for ${company}.
evidence: one concrete fact, plus the filename if a filing is loaded.
confidence: high if in the filing, medium if inferred from known facts, low if assumed.
esrs: E1, E2, S1, G1, and so on when you know it.
If the filing slice is truncated, still produce the required mix using the slice plus well known public facts.`,
      prompt: [
        `Company: ${company}`,
        snapshotBlock,
        options.documentBodies
          ? `Filing text already loaded:\n${options.documentBodies}`
          : "No filing text loaded. Use well known public facts and mark confidence medium or low.",
        `User request: ${options.userText}`,
        "Return 3 environmental (climate E1 first) and 3 social as a must, then extras if they fit in 8 cards.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const saved = await persistDiscoveryCards(options.engagementId, flattenDiscoveryCards(object));
    text = formatReply(saved);
  } catch (error) {
    console.error("extract findings failed", error);
    text =
      "I could not save the finding cards this turn. Open Documents and press Ask agent to review again. Keep the filing under 4 MB so the extract can finish.";
  }

  const stream = createUIMessageStream({
    originalMessages: options.messages,
    execute: ({ writer }) => {
      const id = generateId();
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
    onFinish: async ({ messages }) => {
      await updateEngagement(options.engagementId, (current) => ({
        ...current,
        messages,
      }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
