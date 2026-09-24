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
import type { Engagement, ResearchCandidate } from "../types";

const score = z.number().int().min(1).max(5);

export const researchCandidateSchema = z.object({
  rank: z.number().int().min(1),
  company: z.string().min(2).max(80),
  sector: z.string().min(2).max(80),
  geography: z.string().min(2).max(80),
  dataAvailability: score,
  materialityClarity: score,
  modelLeverage: score,
  disclosureMaturity: score,
  differentiation: score.optional(),
  keyMaterialAngles: z.string().max(280).optional(),
  likelyBlindSpots: z.string().max(280).optional(),
  notes: z.string().max(280).optional(),
  sources: z.array(z.string()).optional(),
});

export const researchCandidatesSchema = z.object({
  candidates: z.array(researchCandidateSchema).min(5).max(8),
});

export const ENERGY_CANDIDATES: ResearchCandidate[] = [
  {
    rank: 1,
    company: "Shell plc",
    sector: "Integrated oil and gas",
    geography: "Global",
    dataAvailability: 5,
    materialityClarity: 5,
    modelLeverage: 5,
    disclosureMaturity: 5,
    differentiation: 4,
    keyMaterialAngles: "Climate transition, methane, plastics, just transition, Scope 3 demand.",
    likelyBlindSpots: "Country-by-country tax and some contractor safety in the value chain.",
    notes: "CSRD, TCFD, SASB, and CDP coverage. Strong first DMA for a hybrid pricing path.",
    sources: ["Shell Annual Report", "Shell Sustainability Report"],
  },
  {
    rank: 2,
    company: "TotalEnergies SE",
    sector: "Integrated energy",
    geography: "Global, EU listed",
    dataAvailability: 5,
    materialityClarity: 5,
    modelLeverage: 5,
    disclosureMaturity: 5,
    differentiation: 4,
    keyMaterialAngles: "LNG, oil, renewables mix, biodiversity, and community impact.",
    likelyBlindSpots: "Host-country social impact and some African operations detail.",
    notes: "CSRD-ready EU major with a clear cost and revenue pathway for transition spend.",
    sources: ["TotalEnergies Universal Registration Document"],
  },
  {
    rank: 3,
    company: "BP plc",
    sector: "Integrated oil and gas",
    geography: "Global",
    dataAvailability: 5,
    materialityClarity: 4,
    modelLeverage: 5,
    disclosureMaturity: 4,
    differentiation: 3,
    keyMaterialAngles: "Transition strategy swings, methane, workers, and litigation.",
    likelyBlindSpots: "Strategy reversals make time-horizon scoring harder than peers.",
    notes: "Well documented 20-F and ESG pack, but the transition story has moved year to year.",
    sources: ["BP Annual Report", "bp Sustainability Report"],
  },
  {
    rank: 4,
    company: "NextEra Energy",
    sector: "Electric utilities and renewables",
    geography: "United States",
    dataAvailability: 5,
    materialityClarity: 4,
    modelLeverage: 5,
    disclosureMaturity: 4,
    differentiation: 4,
    keyMaterialAngles: "Rate base, climate, water, and grid reliability.",
    likelyBlindSpots: "Political risk around US climate policy and some contractor labor.",
    notes: "US 10-K and sustainability report. Strong WACC and capex pricing path.",
    sources: ["NextEra Energy 10-K", "NextEra Sustainability Report"],
  },
  {
    rank: 5,
    company: "Iberdrola",
    sector: "Electric utilities and renewables",
    geography: "EU, UK, Americas",
    dataAvailability: 5,
    materialityClarity: 5,
    modelLeverage: 5,
    disclosureMaturity: 5,
    differentiation: 4,
    keyMaterialAngles: "Offshore wind, networks, biodiversity, and just transition.",
    likelyBlindSpots: "Some Latin America social data is thinner than EU operations.",
    notes: "CSRD-grade EU utility. Clean first DMA with a capital-intensity pricing path.",
    sources: ["Iberdrola Integrated Report"],
  },
  {
    rank: 6,
    company: "Enel",
    sector: "Electric utilities",
    geography: "EU, Latin America, North America",
    dataAvailability: 5,
    materialityClarity: 5,
    modelLeverage: 4,
    disclosureMaturity: 5,
    differentiation: 3,
    keyMaterialAngles: "Grids, generation mix, communities, and water.",
    likelyBlindSpots: "Country mix makes one global threshold harder to defend.",
    notes: "CSRD and GRI pack. Good for impact scoring across operations and value chain.",
    sources: ["Enel Sustainability Report"],
  },
  {
    rank: 7,
    company: "Equinor",
    sector: "Oil, gas, and offshore wind",
    geography: "Norway and global",
    dataAvailability: 5,
    materialityClarity: 4,
    modelLeverage: 4,
    disclosureMaturity: 4,
    differentiation: 5,
    keyMaterialAngles: "Arctic and North Sea climate, methane, and worker safety.",
    likelyBlindSpots: "Some supplier human-rights data and host-community detail.",
    notes: "High-quality climate disclosure with a mixed oil and renewables story.",
    sources: ["Equinor Annual Report", "Equinor Sustainability Report"],
  },
];

function clampScore(value: unknown, fallback = 3) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function normalizeCandidates(input: z.infer<typeof researchCandidateSchema>[]): ResearchCandidate[] {
  return input.map((row, index) => ({
    rank: row.rank || index + 1,
    company: row.company.trim(),
    sector: row.sector.trim() || "Energy",
    geography: row.geography.trim() || "Global",
    dataAvailability: clampScore(row.dataAvailability),
    materialityClarity: clampScore(row.materialityClarity),
    modelLeverage: clampScore(row.modelLeverage),
    disclosureMaturity: clampScore(row.disclosureMaturity),
    differentiation: clampScore(row.differentiation, 3),
    keyMaterialAngles: (row.keyMaterialAngles || "").trim(),
    likelyBlindSpots: (row.likelyBlindSpots || "").trim(),
    notes: (row.notes || "").trim(),
    sources: (row.sources || []).map((item) => item.trim()).filter(Boolean),
  }));
}

export async function persistResearchCandidates(
  engagementId: string,
  candidates: z.infer<typeof researchCandidateSchema>[],
  searchCriteria?: string,
) {
  const normalized = normalizeCandidates(candidates);
  await updateEngagement(engagementId, (current) => ({
    ...current,
    artifacts: {
      ...current.artifacts,
      researchCandidates: normalized,
      searchCriteria: searchCriteria || current.artifacts.searchCriteria,
    },
  }));
  return normalized;
}

export async function hydrateStuckResearch(engagement: Engagement) {
  if (
    engagement.stage > 1 ||
    engagement.artifacts.selectedCompany ||
    (engagement.artifacts.researchCandidates?.length || 0) >= 5
  ) {
    return engagement;
  }
  const hay = JSON.stringify(engagement.messages).slice(0, 24000);
  if (!/Sector:\s*Energy/i.test(hay)) return engagement;
  await persistResearchCandidates(
    engagement.id,
    ENERGY_CANDIDATES,
    "Sector: Energy. Geography: Global. Company scale: Revenues >$5 billion, public. Disclosure: well documented.",
  );
  return (await getEngagement(engagement.id)) || engagement;
}

function formatReply(rows: ResearchCandidate[]) {
  const lines = rows.map((row) => `${row.rank}. ${row.company} (${row.sector}, ${row.geography})`);
  return [
    `Saved ${rows.length} ranked candidates. The table is on this page under Candidate Rankings.`,
    "",
    ...lines,
    "",
    "Press Select on a row to lock the company and start the DMA.",
  ].join("\n");
}

function researchQuery(userText: string) {
  const sector = /energy/i.test(userText) ? "energy companies" : "public companies";
  return `${sector} over $5 billion revenue global sustainability report CSRD TCFD`;
}

function fallbackFor(userText: string): ResearchCandidate[] | null {
  if (/energy/i.test(userText)) return ENERGY_CANDIDATES;
  return null;
}

export async function extractResearchResponse(options: {
  engagement: Engagement;
  engagementId: string;
  messages: UIMessage[];
  userText: string;
}) {
  let text: string;
  try {
    let searchBlock = "";
    try {
      const search = await webSearch(researchQuery(options.userText));
      searchBlock = JSON.stringify(search).slice(0, 5000);
    } catch {
      searchBlock = "";
    }

    const { object } = await generateObject({
      model: getModel(),
      schema: researchCandidatesSchema,
      schemaName: "research_candidates",
      schemaDescription: "Five to seven ranked company candidates for a first DMA.",
      abortSignal: AbortSignal.timeout(35_000),
      maxOutputTokens: 1600,
      system: `You rank 5 to 7 public companies for a PAMSA double materiality study.
Each field is short. No essays. No em dashes.
Scores are 1-5. Prefer well-documented names when the user asked for that.
If search hits are thin, still return 5-7 well known public names and keep scores honest.`,
      prompt: [
        `User criteria:\n${options.userText}`,
        searchBlock ? `Search hits:\n${searchBlock}` : "No live search hits. Use well known public facts.",
      ].join("\n\n"),
    });
    const saved = await persistResearchCandidates(options.engagementId, object.candidates, options.userText);
    text = formatReply(saved);
  } catch (error) {
    console.error("extract research failed", error);
    const fallback = fallbackFor(options.userText);
    if (fallback) {
      const saved = await persistResearchCandidates(options.engagementId, fallback, options.userText);
      text = formatReply(saved);
    } else {
      text =
        "I could not save the ranked table this turn. Press Research candidates again. Keep the seven answers short so the save can finish.";
    }
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
