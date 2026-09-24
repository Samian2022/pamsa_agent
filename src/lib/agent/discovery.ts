import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getModel } from "../model";
import { updateEngagement } from "../storage";
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
