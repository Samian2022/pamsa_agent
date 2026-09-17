import type { UIMessage } from "ai";

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Confidence = "high" | "medium" | "low";
export type DataQuality = "certain" | "assumption" | "gap";
export type UserReaction = "accepted" | "disputed" | "deeper-investigation" | "pending";
export type PricingBuildMode = "agent" | "diy" | "hybrid" | "unset";
export type PricingModelType = "cost" | "revenue" | "capex" | "wacc" | "hybrid";

export type SessionUser = {
  name: string;
  email: string;
};

export type ResearchCandidate = {
  rank: number;
  company: string;
  sector: string;
  geography: string;
  dataAvailability: number;
  materialityClarity: number;
  modelLeverage: number;
  disclosureMaturity: number;
  differentiation: number;
  keyMaterialAngles: string;
  likelyBlindSpots: string;
  notes: string;
  sources: string[];
};

export type CompanySnapshot = {
  businessModel: string;
  supplyChain: string;
  regulatoryExposure: string;
  currentEsgDisclosure: string;
  financialProfile: string;
  peerSet: string;
  knownRiskAreas: string;
  keyStakeholders?: string;
};

export type DisclosureChannel = {
  channel: string;
  findings: string;
  gaps: string;
};

export type BaselineMetric = {
  issue: string;
  companyMetric: string;
  baseline: string;
  methodology: string;
  trend3yr: string;
  peerComparison: string;
  esrsMetric: string;
  dataQualityFlag: string;
};

export type MethodologyGap = {
  issue: string;
  scopeGap: string;
  measurementGap: string;
  transparencyGap: string;
  timelinessGap: string;
  gapScore: number;
};

export type OperationsItem = {
  theme: string;
  event: string;
  companySaid: string;
  thirdParty: string;
  gapSignal: string;
  date?: string;
};

export type ReconciliationRow = {
  issue: string;
  disclosureStatus: string;
  likelyReason: string;
  evidence: string;
  confidence: Confidence;
  flagForProbing: boolean;
};

export type DataGapInventory = {
  disclosedVsHidden: string;
  inferredFromBenchmarks: string;
  explicitUndisclosures: string;
  peerDisclosurePatterns: string;
  regulatoryVacuum: string;
  environmental?: string;
  social?: string;
  governance?: string;
};

export type Stakeholder = {
  group: string;
  whatKeepsThemUp: string;
  unspokenWorries: string;
};

export type DiscoveryCard = {
  issue: string;
  definition: string;
  whyExposure: string;
  evidence: string;
  whyNotDisclosed: string;
  financialMateriality: string;
  impactMateriality: string;
  confidence: Confidence;
  companyDisclosure?: string;
  esrsExpectation?: string;
  operationsSignal?: string;
  nextInvestigation?: string;
};

export type IssueScore = {
  issue: string;
  definition: string;
  disclosed: boolean;
  emerging: boolean;
  financialScore: number;
  impactScore: number;
  financialEvidence: string;
  impactEvidence: string;
  disclosureStatus: string;
  confidence: Confidence;
  recommendedMetric: string;
  dataQuality: DataQuality;
  esrs?: string;
  methodologyGapScore?: number;
  companyJudgment?: string;
  layer?: "disclosed" | "peer-gap" | "probed";
};

export type Assumption = {
  id: string;
  statement: string;
  why: string;
  confidence: Confidence;
  relatedIssue?: string;
};

export type Citation = {
  id: string;
  claim: string;
  source: string;
  url?: string;
  date?: string;
};

export type SignOffState = Record<string, { agreed: boolean; notes: string }>;

export type DiscoveryLogEntry = {
  id: string;
  issue: string;
  raisedAt: string;
  source: string;
  confidence: Confidence;
  reaction: UserReaction;
  notes?: string;
  dmaStatus?: string;
  evidenceFromUser?: string;
};

export type ProbeEntry = {
  id: string;
  raisedAt: string;
  originalClaim: string;
  userChallenge: string;
  newEvidence: string;
  revisedClaim: string;
  reasoning: string;
  hypothesis?: string;
  confidenceBefore?: Confidence;
  confidenceAfter?: Confidence;
};

export type DataGapEntry = {
  id: string;
  gap: string;
  followUp: string;
  status: "open" | "closed";
};

export type AssumptionCheckpoint = {
  id: string;
  statement: string;
  reasoning: string;
  evidence: string;
  confidence: Confidence;
  sensitivity: string;
  userDecision: "agreed" | "adjusted" | "pending";
  userNotes?: string;
};

export type MethodologyProgress = {
  typesWalked: boolean;
  anatomyWalked: boolean;
  exampleWalked: boolean;
  buildMode: PricingBuildMode;
  selectedTypes: PricingModelType[];
};

export type PricingScope = {
  issues: string[];
  horizonYears: 5 | 10;
  scenarios: "base" | "base-stress-upside";
  publicDataOnly: boolean;
  includeUndisclosed: boolean;
  modelTypes: PricingModelType[];
  buildMode: PricingBuildMode;
  notes: string;
};

export type FinancialModel = {
  issue: string;
  disclosed: boolean;
  modelType: PricingModelType;
  mechanism: string;
  catalyst?: string;
  baseline: string;
  assumptions: { name: string; value: string; source: string; userValidated?: boolean }[];
  years: number[];
  baseCase: number[];
  stressCase: number[];
  upsideCase: number[];
  unit: string;
  valuationNotes: string;
};

export type Artifacts = {
  searchCriteria?: string;
  researchCandidates?: ResearchCandidate[];
  selectedCompany?: string;
  snapshot?: CompanySnapshot;
  dataGaps?: DataGapInventory;
  disclosureAudit?: DisclosureChannel[];
  baselineMetrics?: BaselineMetric[];
  methodologyGaps?: MethodologyGap[];
  operationsNews?: OperationsItem[];
  reconciliation?: ReconciliationRow[];
  stakeholders?: Stakeholder[];
  discoveryCards?: DiscoveryCard[];
  issueScores?: IssueScore[];
  scoringFrameworkNotes?: string;
  blindSpotSummary?: string;
  esrsMapping?: { issue: string; metric: string; rationale: string }[];
  pricingScope?: PricingScope;
  financialModels?: FinancialModel[];
};

export type Engagement = {
  id: string;
  title: string;
  createdBy: SessionUser;
  createdAt: string;
  updatedAt: string;
  stage: StageId;
  artifacts: Artifacts;
  assumptions: Assumption[];
  citations: Citation[];
  signOff: SignOffState;
  discoveryLog: DiscoveryLogEntry[];
  probeLog: ProbeEntry[];
  dataGapLog: DataGapEntry[];
  assumptionCheckpoints: AssumptionCheckpoint[];
  methodology: MethodologyProgress;
  messages: UIMessage[];
};
