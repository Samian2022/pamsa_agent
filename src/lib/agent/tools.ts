import { tool } from "ai";
import { z } from "zod";
import { fetchUrl, webSearch } from "../search";
import { canEnterStage, methodologyReady, signOffComplete } from "../stages";
import { getEngagement, updateEngagement } from "../storage";
import { readExtractedText } from "../documents";
import { discoveryCardsSchema, persistDiscoveryCards } from "./discovery";
import { persistResearchCandidates, researchCandidatesSchema } from "./research";
import { issueScoreSchema, persistIssueScores, persistScoringFramework, scoringFrameworkSchema } from "./scoring";
import type {
  Assumption,
  AssumptionCheckpoint,
  BaselineMetric,
  Citation,
  DataGapEntry,
  DisclosureChannel,
  DiscoveryLogEntry,
  FinancialModel,
  IssueScore,
  MethodologyGap,
  MethodologyProgress,
  OperationsItem,
  ProbeEntry,
  ReconciliationRow,
  StageId,
} from "../types";

const score = z.number().int().min(1).max(5);
const confidence = z.enum(["high", "medium", "low"]);
const reaction = z.enum(["accepted", "disputed", "deeper-investigation", "pending"]);
const modelType = z.enum(["cost", "revenue", "capex", "wacc", "hybrid"]);
const buildMode = z.enum(["agent", "diy", "hybrid", "unset"]);

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function createAgentTools(engagementId: string) {
  return {
    web_search: tool({
      description:
        "Search the public web for company filings, sustainability reports, news, peers, and regulation. Always available. Call this on Stage 1 before saving candidates.",
      inputSchema: z.object({
        query: z.string().min(3),
      }),
      execute: async ({ query }) => webSearch(query),
    }),

    fetch_url: tool({
      description: "Fetch and extract readable text from a specific URL (filing, report, news page).",
      inputSchema: z.object({
        url: z.string().url(),
      }),
      execute: async ({ url }) => fetchUrl(url),
    }),

    read_uploaded_document: tool({
      description:
        "Read more of a user-uploaded filing or report. Use the document id from the Uploaded source documents list.",
      inputSchema: z.object({
        documentId: z.string(),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(200).max(12000).optional(),
      }),
      execute: async ({ documentId, offset = 0, limit = 8000 }) => {
        const current = await getEngagement(engagementId);
        const doc = current?.documents.find((item) => item.id === documentId);
        if (!doc) {
          return { ok: false, error: "Document not found." };
        }
        const text = await readExtractedText(engagementId, documentId);
        if (!text) {
          return {
            ok: false,
            name: doc.name,
            status: doc.extractStatus,
            error: doc.notes || "No extracted text is available for this file.",
          };
        }
        const slice = text.slice(offset, offset + limit);
        return {
          ok: true,
          name: doc.name,
          offset,
          length: slice.length,
          total: text.length,
          hasMore: offset + slice.length < text.length,
          text: slice,
        };
      },
    }),

    save_research_candidates: tool({
      description: "Save the Stage 1 research summary table (5–7 companies).",
      inputSchema: researchCandidatesSchema,
      execute: async ({ candidates }) => {
        const saved = await persistResearchCandidates(engagementId, candidates);
        return { saved: saved.length };
      },
    }),

    set_selected_company: tool({
      description:
        "Record the company the user chose, rename the engagement, and move Stage 1 into the Stage 2 disclosure audit.",
      inputSchema: z.object({
        company: z.string(),
        title: z.string().optional(),
      }),
      execute: async ({ company, title }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          title: title || `${company} Materiality Study`,
          stage: current.stage === 1 ? 2 : current.stage,
          artifacts: { ...current.artifacts, selectedCompany: company },
        }));
        return { company, stage: 2 };
      },
    }),

    save_company_snapshot: tool({
      description:
        "Save the Stage 2A one-page snapshot: business model, supply chain, regulation, stakeholders, financials, peers, and known risk areas.",
      inputSchema: z.object({
        businessModel: z.string(),
        supplyChain: z.string(),
        regulatoryExposure: z.string(),
        currentEsgDisclosure: z.string(),
        financialProfile: z.string(),
        peerSet: z.string(),
        knownRiskAreas: z.string(),
        keyStakeholders: z.string().optional(),
      }),
      execute: async (snapshot) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, snapshot },
        }));
        return { saved: true };
      },
    }),

    save_data_gaps: tool({
      description:
        "Save the Stage 2G data-gap inventory. Include E/S/G rollups when possible. If they do not report a metric, mark it Not disclosed / Unknown.",
      inputSchema: z.object({
        disclosedVsHidden: z.string(),
        inferredFromBenchmarks: z.string(),
        explicitUndisclosures: z.string(),
        peerDisclosurePatterns: z.string(),
        regulatoryVacuum: z.string(),
        environmental: z.string().optional(),
        social: z.string().optional(),
        governance: z.string().optional(),
      }),
      execute: async (dataGaps) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, dataGaps },
        }));
        return { saved: true };
      },
    }),

    save_disclosure_audit: tool({
      description:
        "Save the Stage 2B disclosure audit. Cover ESG/sustainability report, 10-K or equivalent, last 2-3 earnings calls, regulatory filings, and governance/policy documents.",
      inputSchema: z.object({
        channels: z.array(
          z.object({
            channel: z.string(),
            findings: z.string(),
            gaps: z.string(),
          }),
        ),
      }),
      execute: async ({ channels }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, disclosureAudit: channels as DisclosureChannel[] },
        }));
        return { saved: channels.length };
      },
    }),

    save_baseline_metrics: tool({
      description:
        "Save the Stage 2C baseline metrics inventory. If a metric is not reported, set baseline to Not disclosed and dataQualityFlag to Unknown/Absent.",
      inputSchema: z.object({
        metrics: z.array(
          z.object({
            issue: z.string(),
            companyMetric: z.string(),
            baseline: z.string(),
            methodology: z.string(),
            trend3yr: z.string(),
            peerComparison: z.string(),
            esrsMetric: z.string(),
            dataQualityFlag: z.string(),
          }),
        ),
      }),
      execute: async ({ metrics }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, baselineMetrics: metrics as BaselineMetric[] },
        }));
        return { saved: metrics.length };
      },
    }),

    save_methodology_gaps: tool({
      description:
        "Save Stage 2D methodology gap analysis vs ESRS/best practice. gapScore 1 is ESRS-aligned and verified; 5 is not disclosed or unknown.",
      inputSchema: z.object({
        gaps: z.array(
          z.object({
            issue: z.string(),
            scopeGap: z.string(),
            measurementGap: z.string(),
            transparencyGap: z.string(),
            timelinessGap: z.string(),
            gapScore: score,
          }),
        ),
      }),
      execute: async ({ gaps }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, methodologyGaps: gaps as MethodologyGap[] },
        }));
        return { saved: gaps.length };
      },
    }),

    save_operations_news: tool({
      description:
        "Save the Stage 2E 12-month operations and news layer: enforcement, incidents, earnings signals, NGO/litigation, peer and sector trends.",
      inputSchema: z.object({
        items: z.array(
          z.object({
            theme: z.string(),
            event: z.string(),
            companySaid: z.string(),
            thirdParty: z.string(),
            gapSignal: z.string(),
            date: z.string().optional(),
          }),
        ),
      }),
      execute: async ({ items }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, operationsNews: items as OperationsItem[] },
        }));
        return { saved: items.length };
      },
    }),

    save_reconciliation: tool({
      description:
        "Save the Stage 2F reconciliation matrix: why each likely-material gap is undisclosed, with evidence, confidence, and a probing flag.",
      inputSchema: z.object({
        rows: z.array(
          z.object({
            issue: z.string(),
            disclosureStatus: z.string(),
            likelyReason: z.string(),
            evidence: z.string(),
            confidence,
            flagForProbing: z.boolean(),
          }),
        ),
      }),
      execute: async ({ rows }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, reconciliation: rows as ReconciliationRow[] },
        }));
        return { saved: rows.length };
      },
    }),

    save_stakeholder_map: tool({
      description: "Save stakeholder mapping for the DMA.",
      inputSchema: z.object({
        stakeholders: z.array(
          z.object({
            group: z.string(),
            whatKeepsThemUp: z.string(),
            unspokenWorries: z.string(),
          }),
        ),
      }),
      execute: async ({ stakeholders }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, stakeholders },
        }));
        return { saved: stakeholders.length };
      },
    }),

    save_discovery_cards: tool({
      description:
        "Save 6 to 8 short discovery cards and add each new issue to the discovery log as pending. Always send at least 6 distinct issues. Keep every field to one sentence.",
      inputSchema: discoveryCardsSchema,
      execute: async ({ cards }) => {
        const normalized = await persistDiscoveryCards(engagementId, cards);
        return { saved: normalized.length, mode: "merged", alsoLogged: true, issues: normalized.map((card) => card.issue) };
      },
    }),

    save_scoring_framework: tool({
      description:
        "Save the scoring key before scoring IROs. Lock topic selection (climate E1 plus two more environmental and three social), why you use a 1 to 5 scale, impact and financial criteria, time horizons, and the materiality threshold.",
      inputSchema: scoringFrameworkSchema,
      execute: async (framework) => {
        await persistScoringFramework(engagementId, framework);
        return {
          saved: true,
          topics: framework.topics.map((topic) => `${topic.esrs} ${topic.name}`),
          threshold: framework.thresholdRule,
        };
      },
    }),

    save_issue_scores: tool({
      description:
        "Save 1 to 3 scored IROs (not topic labels). Merge into the matrix. Every score needs a rationale that uses the scoring-key language for that band, plus a citation with page or section for long filings. Recommended metrics must measure why the IRO scored high.",
      inputSchema: z.object({
        issues: z.array(issueScoreSchema).min(1).max(3),
      }),
      execute: async ({ issues }) => {
        const saved = await persistIssueScores(engagementId, issues as IssueScore[]);
        return { saved: saved.length, issues: saved.map((item) => item.issue) };
      },
    }),

    save_blind_spot_summary: tool({
      description: "Save the one-page blind-spot summary.",
      inputSchema: z.object({
        summary: z.string(),
      }),
      execute: async ({ summary }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, blindSpotSummary: summary },
        }));
        return { saved: true };
      },
    }),

    save_esrs_mapping: tool({
      description: "Map scored issues to ESRS (or justified custom) metrics.",
      inputSchema: z.object({
        mapping: z.array(
          z.object({
            issue: z.string(),
            metric: z.string(),
            rationale: z.string(),
          }),
        ),
      }),
      execute: async ({ mapping }) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          artifacts: { ...current.artifacts, esrsMapping: mapping },
        }));
        return { saved: mapping.length };
      },
    }),

    save_assumption: tool({
      description: "Log an assumption with confidence. Use whenever a number is not directly sourced.",
      inputSchema: z.object({
        statement: z.string(),
        why: z.string(),
        confidence,
        relatedIssue: z.string().optional(),
      }),
      execute: async (input) => {
        const assumption: Assumption = { id: nowId("a"), ...input };
        await updateEngagement(engagementId, (current) => ({
          ...current,
          assumptions: [...current.assumptions, assumption],
        }));
        return assumption;
      },
    }),

    log_discovery: tool({
      description:
        "Add or update an issue in the Materiality Discovery Log (source, confidence, user reaction).",
      inputSchema: z.object({
        issue: z.string(),
        source: z.string(),
        confidence,
        reaction,
        notes: z.string().optional(),
        dmaStatus: z.string().optional(),
        evidenceFromUser: z.string().optional(),
      }),
      execute: async (input) => {
        const entry: DiscoveryLogEntry = {
          id: nowId("d"),
          raisedAt: new Date().toISOString(),
          ...input,
        };
        await updateEngagement(engagementId, (current) => {
          const existing = current.discoveryLog.filter(
            (item) => item.issue.toLowerCase() !== input.issue.toLowerCase(),
          );
          return { ...current, discoveryLog: [...existing, entry] };
        });
        return entry;
      },
    }),

    log_probe: tool({
      description:
        "Record a user challenge and the revised claim. Required whenever the user disputes or probes a finding.",
      inputSchema: z.object({
        originalClaim: z.string(),
        userChallenge: z.string(),
        newEvidence: z.string(),
        revisedClaim: z.string(),
        reasoning: z.string(),
        hypothesis: z.string().optional(),
        confidenceBefore: confidence.optional(),
        confidenceAfter: confidence.optional(),
      }),
      execute: async (input) => {
        const entry: ProbeEntry = {
          id: nowId("p"),
          raisedAt: new Date().toISOString(),
          ...input,
        };
        await updateEngagement(engagementId, (current) => ({
          ...current,
          probeLog: [...current.probeLog, entry],
        }));
        return entry;
      },
    }),

    log_data_gap: tool({
      description: "Track a data gap for follow-up.",
      inputSchema: z.object({
        gap: z.string(),
        followUp: z.string(),
        status: z.enum(["open", "closed"]),
      }),
      execute: async (input) => {
        const entry: DataGapEntry = { id: nowId("g"), ...input };
        await updateEngagement(engagementId, (current) => {
          const existing = current.dataGapLog.filter((item) => item.gap !== input.gap);
          return { ...current, dataGapLog: [...existing, entry] };
        });
        return entry;
      },
    }),

    save_assumption_checkpoint: tool({
      description:
        "User-validation checkpoint for a critical pricing assumption. Do not bake the number into a model until userDecision is agreed or adjusted.",
      inputSchema: z.object({
        statement: z.string(),
        reasoning: z.string(),
        evidence: z.string(),
        confidence,
        sensitivity: z.string(),
        userDecision: z.enum(["agreed", "adjusted", "pending"]),
        userNotes: z.string().optional(),
      }),
      execute: async (input) => {
        const checkpoint: AssumptionCheckpoint = { id: nowId("k"), ...input };
        await updateEngagement(engagementId, (current) => {
          const existing = current.assumptionCheckpoints.filter(
            (item) => item.statement !== input.statement,
          );
          return {
            ...current,
            assumptionCheckpoints: [...existing, checkpoint],
          };
        });
        return checkpoint;
      },
    }),

    save_methodology: tool({
      description:
        "Record Stage 6 teaching progress: types walked, anatomy walked, worked example, build mode, selected model types.",
      inputSchema: z.object({
        typesWalked: z.boolean(),
        anatomyWalked: z.boolean(),
        exampleWalked: z.boolean(),
        buildMode,
        selectedTypes: z.array(modelType),
      }),
      execute: async (methodology: MethodologyProgress) => {
        await updateEngagement(engagementId, (current) => ({
          ...current,
          methodology,
        }));
        return { saved: true, ready: methodologyReady(methodology) };
      },
    }),

    save_citation: tool({
      description: "Log a citation so a claim can be traced.",
      inputSchema: z.object({
        claim: z.string(),
        source: z.string(),
        url: z.string().optional(),
        date: z.string().optional(),
      }),
      execute: async (input) => {
        const citation: Citation = { id: nowId("c"), ...input };
        await updateEngagement(engagementId, (current) => ({
          ...current,
          citations: [...current.citations, citation],
        }));
        return citation;
      },
    }),

    update_stage: tool({
      description:
        "Advance or confirm the workflow stage after the current gate. Cannot skip. Pricing scope requires DMA sign-off. Model build (stage 7) requires methodology teaching complete.",
      inputSchema: z.object({
        stage: z.number().int().min(1).max(7),
        reason: z.string(),
      }),
      execute: async ({ stage, reason }) => {
        const next = await updateEngagement(engagementId, (current) => {
          const target = stage as StageId;
          if (!canEnterStage(target, current.stage, current.signOff, current.methodology)) {
            return current;
          }
          return { ...current, stage: target };
        });

        if (next.stage !== stage) {
          let blocked = "Cannot skip stages. Complete the current gate with the user first.";
          if (!signOffComplete(next.signOff) && stage >= 5) {
            blocked = "Stage 4 sign-off is incomplete. Pricing work is locked.";
          } else if (!methodologyReady(next.methodology) && stage >= 7) {
            blocked =
              "Stage 6 methodology is incomplete. Walk model types and anatomy, and lock a build mode, before executing models.";
          }
          return { ok: false, stage: next.stage, reason: blocked };
        }
        return { ok: true, stage: next.stage, reason };
      },
    }),

    save_pricing_scope: tool({
      description: "Save agreed Stage 5 pricing-model scope.",
      inputSchema: z.object({
        issues: z.array(z.string()).min(1).max(4),
        horizonYears: z.union([z.literal(5), z.literal(10)]),
        scenarios: z.enum(["base", "base-stress-upside"]),
        publicDataOnly: z.boolean(),
        includeUndisclosed: z.boolean(),
        modelTypes: z.array(modelType).min(1),
        buildMode,
        notes: z.string(),
      }),
      execute: async (pricingScope) => {
        const result = await updateEngagement(engagementId, (current) => {
          if (!signOffComplete(current.signOff)) {
            return current;
          }
          return {
            ...current,
            methodology: {
              ...current.methodology,
              buildMode: pricingScope.buildMode,
              selectedTypes: pricingScope.modelTypes,
            },
            artifacts: { ...current.artifacts, pricingScope },
          };
        });
        if (!result.artifacts.pricingScope) {
          return { ok: false, error: "Sign-off is not complete." };
        }
        return { ok: true };
      },
    }),

    save_financial_model: tool({
      description: "Save a scenario cash-flow / P&L impact model for one issue.",
      inputSchema: z.object({
        issue: z.string(),
        disclosed: z.boolean(),
        modelType,
        mechanism: z.string(),
        catalyst: z.string().optional(),
        baseline: z.string(),
        assumptions: z.array(
          z.object({
            name: z.string(),
            value: z.string(),
            source: z.string(),
            userValidated: z.boolean().optional(),
          }),
        ),
        years: z.array(z.number().int()),
        baseCase: z.array(z.number()),
        stressCase: z.array(z.number()),
        upsideCase: z.array(z.number()),
        unit: z.string(),
        valuationNotes: z.string(),
      }),
      execute: async (model) => {
        const current = await getEngagement(engagementId);
        if (!current || !methodologyReady(current.methodology)) {
          return {
            ok: false,
            error:
              "Methodology teaching is not complete. Walk types and anatomy, then lock a build mode before saving models.",
          };
        }
        await updateEngagement(engagementId, (existing) => {
          const models = existing.artifacts.financialModels || [];
          const nextModels = [
            ...models.filter((item) => item.issue !== model.issue),
            model as FinancialModel,
          ];
          return {
            ...existing,
            artifacts: { ...existing.artifacts, financialModels: nextModels },
          };
        });
        return { saved: model.issue };
      },
    }),
  };
}
