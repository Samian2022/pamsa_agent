import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getModel } from "../model";
import { getEngagement, updateEngagement } from "../storage";
import type { Engagement, IssueScore, ScoringFramework, ScoringTopic } from "../types";

const score = z.number().int().min(1).max(5);
const confidence = z.enum(["high", "medium", "low"]);

const scoredDimension = z.object({
  score,
  rationale: z.string().min(12).max(480),
  citation: z.string().max(160).optional(),
  citationLocator: z.string().max(80).optional(),
});

const recommendedMetric = z.object({
  metric: z.string().min(3).max(160),
  axis: z.enum(["impact", "financial"]),
  whyLinkedToCriteria: z.string().min(12).max(320),
  alreadyReported: z.boolean().optional(),
});

const topicFields = z.object({
  esrs: z.string().min(2).max(12),
  name: z.string().min(3).max(80),
  rationale: z.string().min(12).max(320),
  evidence: z.string().min(12).max(320),
});

export const scoringFrameworkSchema = z.object({
  scaleChoiceRationale: z.string().min(20).max(600),
  topicSelectionRationale: z.string().min(20).max(800),
  environmentalTopics: z.array(topicFields).min(3).max(3),
  socialTopics: z.array(topicFields).min(3).max(3),
  additionalTopics: z
    .array(
      topicFields.extend({
        pillar: z.enum(["governance", "environmental", "social"]).optional(),
      }),
    )
    .max(3)
    .optional(),
  impactDimensions: z.string().min(12).max(240),
  impactIncludesValueChain: z.boolean(),
  socialNormsUsed: z.string().min(8).max(400),
  impactTimeHorizons: z.string().min(8).max(240),
  impactTimeHorizonRationale: z.string().min(12).max(400),
  impactBands: z.string().min(20).max(1200),
  financialDimensions: z.string().min(12).max(240),
  financialMagnitudeOn: z.string().min(8).max(160),
  financialTimeHorizons: z.string().min(8).max(240),
  financialTimeHorizonRationale: z.string().min(12).max(400),
  timeHorizonVsImpact: z.string().min(12).max(400),
  financialBands: z.string().min(20).max(1200),
  thresholdRule: z.string().min(8).max(240),
  thresholdRationale: z.string().min(20).max(800),
  alignedToCompanyFinancials: z.string().min(12).max(400),
});

export function flattenScoringFramework(input: z.infer<typeof scoringFrameworkSchema>): ScoringFramework {
  const { environmentalTopics, socialTopics, additionalTopics, ...rest } = input;
  return {
    ...rest,
    topics: [
      ...environmentalTopics.map((topic, index) => ({
        ...topic,
        pillar: "environmental" as const,
        esrs: topic.esrs || (index === 0 ? "E1" : topic.esrs),
      })),
      ...socialTopics.map((topic) => ({
        ...topic,
        pillar: "social" as const,
      })),
      ...(additionalTopics || []).map((topic) => ({
        ...topic,
        pillar: topic.pillar || "governance",
      })),
    ],
  };
}

export const issueScoreSchema = z.object({
  issue: z.string().min(3).max(90),
  definition: z.string().min(8).max(400),
  disclosed: z.boolean(),
  emerging: z.boolean(),
  financialScore: score,
  impactScore: score,
  financialEvidence: z.string().min(12).max(600),
  impactEvidence: z.string().min(12).max(600),
  disclosureStatus: z.string().min(3).max(200),
  confidence,
  recommendedMetric: z.string().min(3).max(200),
  dataQuality: z.enum(["certain", "assumption", "gap"]),
  esrs: z.string().max(40).optional(),
  methodologyGapScore: score.optional(),
  companyJudgment: z.string().max(240).optional(),
  layer: z.enum(["disclosed", "peer-gap", "probed"]).optional(),
  topicArea: z.string().max(80).optional(),
  esrsTopic: z.string().max(12).optional(),
  iroKind: z.enum(["impact", "risk", "opportunity"]).optional(),
  iroDescription: z.string().max(400).optional(),
  actualVsPotential: z.enum(["actual", "potential"]).optional(),
  polarity: z.enum(["positive", "negative"]).optional(),
  valueChainLocation: z.string().max(160).optional(),
  impactScale: scoredDimension.optional(),
  impactScope: scoredDimension.optional(),
  impactRemediability: scoredDimension.optional(),
  impactLikelihood: scoredDimension.optional(),
  impactTimeHorizon: z.string().max(80).optional(),
  financialMagnitude: scoredDimension.optional(),
  financialProbability: scoredDimension.optional(),
  financialTimeHorizon: z.string().max(80).optional(),
  material: z.boolean().optional(),
  materialRationale: z.string().max(400).optional(),
  recommendedMetrics: z.array(recommendedMetric).max(4).optional(),
});

export async function persistScoringFramework(engagementId: string, framework: ScoringFramework) {
  await updateEngagement(engagementId, (current) => ({
    ...current,
    artifacts: { ...current.artifacts, scoringFramework: framework },
  }));
  return framework;
}

function topicFromCard(
  card: { issue: string; definition: string; evidence: string; esrs?: string; pillar?: ScoringTopic["pillar"] },
  pillar: ScoringTopic["pillar"],
  esrs: string,
): ScoringTopic {
  return {
    esrs,
    name: card.issue,
    pillar,
    rationale: (card.definition || `${card.issue} is in the accepted finding set for this DMA.`).slice(0, 320),
    evidence: (card.evidence || "Accepted on Review findings from public disclosure and probe notes.").slice(0, 320),
  };
}

export function scoringKeyFromFindings(engagement: Engagement): ScoringFramework {
  const company = engagement.artifacts.selectedCompany || "this company";
  const cards = engagement.artifacts.discoveryCards || [];
  const accepted = new Set(
    engagement.discoveryLog.filter((item) => item.reaction === "accepted").map((item) => item.issue.toLowerCase()),
  );
  const chosen = cards.filter((card) => accepted.has(card.issue.toLowerCase()));
  const pool = chosen.length ? chosen : cards;
  const environmental = pool.filter((card) => card.pillar === "environmental");
  const social = pool.filter((card) => card.pillar === "social");
  const extra = pool.filter((card) => card.pillar && card.pillar !== "environmental" && card.pillar !== "social");
  const envTopics = (environmental.length ? environmental : pool.slice(0, 3)).slice(0, 3).map((card, index) =>
    topicFromCard(card, "environmental", card.esrs || (index === 0 ? "E1" : `E${index + 1}`)),
  );
  const socialTopics = (social.length ? social : pool.slice(0, 3)).slice(0, 3).map((card, index) =>
    topicFromCard(card, "social", card.esrs || `S${index + 1}`),
  );
  const additionalTopics = extra.slice(0, 2).map((card) =>
    topicFromCard(card, card.pillar || "governance", card.esrs || "G1"),
  );
  while (envTopics.length < 3 && pool[envTopics.length]) {
    envTopics.push(topicFromCard(pool[envTopics.length], "environmental", `E${envTopics.length + 1}`));
  }
  while (socialTopics.length < 3 && pool[socialTopics.length]) {
    socialTopics.push(topicFromCard(pool[socialTopics.length], "social", `S${socialTopics.length + 1}`));
  }
  return {
    scaleChoiceRationale:
      "A 1 to 5 scale matches peer DMA practice, ESRS qualitative scoring, and the clusters already visible in the accepted findings. Yes/no hides those clusters. 1-100 implies false precision.",
    topicSelectionRationale: `The set follows the required mix for ${company}: 3 environmental including climate (E1) and 3 social, then extras the analyst accepted. Climate is presumed material unless the user proves otherwise. Topics come from accepted Review findings, not from an unused indicator list.`,
    topics: [...envTopics, ...socialTopics, ...additionalTopics],
    impactDimensions: "Scale, scope, remediability, stakeholder sensitivity, and time horizon across operations and the value chain",
    impactIncludesValueChain: true,
    socialNormsUsed: "ESRS, IPCC/climate science for E1, ILO and OHCHR for workforce and communities, planetary boundaries for pollution and water.",
    impactTimeHorizons: "Short 0-3 years, medium 3-10 years, long beyond 10 years",
    impactTimeHorizonRationale:
      "Impact can already be occurring (safety, spills, community) while climate and just-transition harms sit on a longer clock. Both must be scored.",
    impactBands:
      "1 niche or reversible local effect. 2 emerging NGO or regulatory signal with limited scale. 3 material harm or benefit across operations or value chain within 3-5 years. 4 severe, hard-to-remediate effects on people, ecosystems, or operations and value chain. 5 systemic or irreversible harm, or regulation already in force.",
    financialDimensions: "Probability of hitting cash flow or costs, magnitude on revenue, costs or assets, and time horizon",
    financialMagnitudeOn: "Revenue, operating costs, and asset carrying values",
    financialTimeHorizons: "Short 0-3 years, medium 3-10 years, long beyond 10 years",
    financialTimeHorizonRationale:
      "Financial timing follows how the company already talks about material risk in the annual report. It may be shorter than impact timing for climate.",
    timeHorizonVsImpact:
      "Impact time horizon can be longer than financial. If they differ, say why in the IRO rationale. Do not copy the impact year into the financial cell.",
    financialBands:
      "1 under 0.1% of EBITDA or clearly immaterial to cash. 2 about 0.1-0.5%. 3 about 0.5-2% or a known cost/revenue pathway. 4 about 2-10% or asset-impairment risk. 5 over 10% or a business-model threat.",
    thresholdRule: "Material if impact or financial score is 3 or higher, or if the pair clusters with accepted peer DMA issues",
    thresholdRationale:
      "A 3 is the first band where operations or value-chain harm, or a real cash pathway, is already evidenced. Climate (E1) stays in the set even if a single IRO is below 3 until the user proves it is not material.",
    alignedToCompanyFinancials:
      `${company} already flags climate, litigation, and operational risk in its annual report. The financial threshold uses that language rather than an invented percentage the filings do not support.`,
  };
}

export async function hydrateMissingScoringKey(engagement: Engagement) {
  if (engagement.artifacts.scoringFramework) return engagement;
  const accepted = engagement.discoveryLog.filter((item) => item.reaction === "accepted").length;
  if (engagement.stage < 3 && accepted < 3) return engagement;
  await persistScoringFramework(engagement.id, scoringKeyFromFindings(engagement));
  return (await getEngagement(engagement.id)) || engagement;
}

export async function extractScoringKeyResponse(options: {
  engagement: Engagement;
  engagementId: string;
  messages: UIMessage[];
  userText: string;
}) {
  let text: string;
  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: scoringFrameworkSchema,
      schemaName: "scoring_key",
      schemaDescription: "Scoring key with 3 environmental including E1 and 3 social, then extras.",
      abortSignal: AbortSignal.timeout(30_000),
      maxOutputTokens: 1800,
      system: `You write a PAMSA scoring key. Short sentences. No em dashes.
3 environmental topics including climate E1, 3 social, then extras if the user accepted them.
Climate is presumed material. Impact tests must cover operations and the value chain.`,
      prompt: [
        `Company: ${options.engagement.artifacts.selectedCompany || "the company"}`,
        `Accepted findings: ${options.engagement.discoveryLog
          .filter((item) => item.reaction === "accepted")
          .map((item) => item.issue)
          .join("; ")}`,
        `User request: ${options.userText}`,
      ].join("\n\n"),
    });
    const saved = flattenScoringFramework(object);
    await persistScoringFramework(options.engagementId, saved);
    text = `Saved the scoring key: ${saved.topics.map((topic) => `${topic.esrs} ${topic.name}`).join("; ")}. Threshold: ${saved.thresholdRule} You can now score IROs against this key.`;
  } catch (error) {
    console.error("extract scoring key failed", error);
    const saved = await persistScoringFramework(options.engagementId, scoringKeyFromFindings(options.engagement));
    text = `Saved the scoring key from the accepted findings: ${saved.topics.map((topic) => `${topic.esrs} ${topic.name}`).join("; ")}. Threshold: ${saved.thresholdRule} You can now score IROs against this key.`;
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

export async function persistIssueScores(engagementId: string, issues: IssueScore[]) {
  await updateEngagement(engagementId, (current) => {
    const previous = current.artifacts.issueScores || [];
    const byIssue = new Map(previous.map((item) => [item.issue.toLowerCase(), item]));
    for (const issue of issues) {
      byIssue.set(issue.issue.toLowerCase(), issue);
    }
    return {
      ...current,
      artifacts: { ...current.artifacts, issueScores: Array.from(byIssue.values()) },
    };
  });
  return issues;
}
