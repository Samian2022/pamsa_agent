import { z } from "zod";
import { updateEngagement } from "../storage";
import type { IssueScore, ScoringFramework } from "../types";

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
