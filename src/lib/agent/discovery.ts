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
import type { DiscoveryCard, Engagement } from "../types";

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const discoveryCardInputSchema = z.object({
  issue: z.string().min(3).max(90),
  definition: z.string().min(8).max(240),
  evidence: z.string().min(8).max(320),
  confidence: confidenceSchema,
});

export const discoveryCardsSchema = z.object({
  cards: z.array(discoveryCardInputSchema).min(6).max(8),
});

export type DiscoveryCardInput = z.infer<typeof discoveryCardInputSchema>;

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export async function persistDiscoveryCards(engagementId: string, cards: DiscoveryCardInput[]) {
  const normalized: DiscoveryCard[] = cards.map((card) => ({
    issue: card.issue.trim(),
    definition: card.definition.trim(),
    evidence: card.evidence.trim(),
    confidence: card.confidence,
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
  const lines = cards.map((card, index) => `${index + 1}. ${card.issue}. ${card.evidence}`);
  return [
    `Saved ${cards.length} findings under Review findings. Nothing enters the DMA until you press a button on a card.`,
    "",
    ...lines,
    "",
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
      schemaDescription: "Six to eight short materiality findings for analyst review.",
      abortSignal: AbortSignal.timeout(45_000),
      maxOutputTokens: 1800,
      system: `You extract DMA findings for PAMSA. Return 6 to 8 cards, never fewer than 6.
Each field is one short sentence. No essays.
issue: short title.
definition: what the issue is for ${company}.
evidence: one concrete fact, plus the filename if a filing is loaded.
confidence: high if in the filing, medium if inferred from known facts, low if assumed.
If the filing slice is truncated, still produce 6 cards using the slice plus well known public facts.`,
      prompt: [
        `Company: ${company}`,
        snapshotBlock,
        options.documentBodies
          ? `Filing text already loaded:\n${options.documentBodies}`
          : "No filing text loaded. Use well known public facts and mark confidence medium or low.",
        `User request: ${options.userText}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const saved = await persistDiscoveryCards(options.engagementId, object.cards);
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
