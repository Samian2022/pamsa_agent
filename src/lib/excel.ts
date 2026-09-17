import ExcelJS from "exceljs";
import { SIGN_OFF_ITEMS, STAGES } from "./stages";
import type { Engagement } from "./types";

function addHeader(sheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF14201B" } };
  if (subtitle) {
    sheet.mergeCells("A2:H2");
    sheet.getCell("A2").value = subtitle;
  }
  sheet.views = [{ state: "frozen", ySplit: 4 }];
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFF3EEE4" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2C4A3E" },
  };
}

export async function buildEngagementWorkbook(engagement: Engagement) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PAMSA";
  workbook.created = new Date();

  const cover = workbook.addWorksheet("Cover");
  addHeader(cover, engagement.artifacts.selectedCompany || engagement.title, "Double Materiality & Pricing Pack");
  cover.addRow([]);
  cover.addRow(["Company", engagement.artifacts.selectedCompany || "Not selected"]);
  cover.addRow(["Engagement", engagement.title]);
  cover.addRow(["Stage", STAGES.find((item) => item.id === engagement.stage)?.name || engagement.stage]);
  cover.addRow(["Created by", `${engagement.createdBy.name} <${engagement.createdBy.email}>`]);
  cover.addRow(["Created", engagement.createdAt]);
  cover.addRow(["Updated", engagement.updatedAt]);
  cover.columns = [{ width: 22 }, { width: 80 }];

  const intro = workbook.addWorksheet("Introduction");
  addHeader(intro, "Introduction", "Company context, approach, and gaps discovered");
  intro.addRow([]);
  intro.addRow(["Selected company", engagement.artifacts.selectedCompany || "Not selected"]);
  intro.addRow(["Search criteria", engagement.artifacts.searchCriteria || "See chat transcript"]);
  intro.addRow(["Blind-spot emphasis", engagement.artifacts.blindSpotSummary || "See Blind Spot Analysis sheet"]);
  intro.columns = [{ width: 24 }, { width: 100 }];

  const method = workbook.addWorksheet("Methodology");
  addHeader(method, "Methodology", "Scoring framework, stakeholders, sources, gap analysis");
  method.addRow([]);
  method.addRow(["Impact 1-5", "Low (niche) → Critical (regulation in force / business-model pressure)"]);
  method.addRow(["Financial 1-5", "Negligible under 0.1% EBITDA → Critical over 10% EBITDA or business-model threat"]);
  method.addRow(["Methodology gap 1-5", "1 ESRS-aligned and verified → 5 not disclosed or unknown"]);
  method.addRow(["Disclosed vs undisclosed", "Sage disclosed; rust undisclosed material; amber disputed/partial; teal upside"]);
  method.addRow(["Confidence", "High = documented; Medium = peer/sector inference; Low = assumption"]);
  method.columns = [{ width: 28 }, { width: 90 }];

  const research = workbook.addWorksheet("Research Candidates");
  addHeader(research, "Stage 1 research table");
  const researchHeaders = [
    "Rank",
    "Company",
    "Sector",
    "Geography",
    "Data Availability",
    "Materiality Clarity",
    "Model Leverage",
    "Disclosure Maturity",
    "Differentiation",
    "Key Material Angles",
    "Likely Blind Spots",
    "Notes",
    "Sources",
  ];
  research.addRow([]);
  research.addRow(researchHeaders);
  styleHeaderRow(research, 4);
  for (const row of engagement.artifacts.researchCandidates || []) {
    research.addRow([
      row.rank,
      row.company,
      row.sector,
      row.geography,
      row.dataAvailability,
      row.materialityClarity,
      row.modelLeverage,
      row.disclosureMaturity,
      row.differentiation,
      row.keyMaterialAngles,
      row.likelyBlindSpots,
      row.notes,
      row.sources.join("; "),
    ]);
  }
  research.columns = researchHeaders.map(() => ({ width: 22 }));

  const snapshot = workbook.addWorksheet("Company Snapshot");
  addHeader(snapshot, "Company snapshot");
  snapshot.addRow([]);
  const snap = engagement.artifacts.snapshot;
  snapshot.addRow(["Business model", snap?.businessModel || ""]);
  snapshot.addRow(["Supply chain", snap?.supplyChain || ""]);
  snapshot.addRow(["Regulatory exposure", snap?.regulatoryExposure || ""]);
  snapshot.addRow(["Current ESG disclosure", snap?.currentEsgDisclosure || ""]);
  snapshot.addRow(["Financial profile", snap?.financialProfile || ""]);
  snapshot.addRow(["Peer set", snap?.peerSet || ""]);
  snapshot.addRow(["Known risk areas", snap?.knownRiskAreas || ""]);
  snapshot.addRow(["Key stakeholders", snap?.keyStakeholders || ""]);
  snapshot.columns = [{ width: 28 }, { width: 100 }];

  const gaps = workbook.addWorksheet("Data Gaps");
  addHeader(gaps, "Data gap inventory");
  gaps.addRow([]);
  const dg = engagement.artifacts.dataGaps;
  gaps.addRow(["Disclosed vs hidden", dg?.disclosedVsHidden || ""]);
  gaps.addRow(["Inferred from benchmarks", dg?.inferredFromBenchmarks || ""]);
  gaps.addRow(["Explicit undisclosures", dg?.explicitUndisclosures || ""]);
  gaps.addRow(["Peer disclosure patterns", dg?.peerDisclosurePatterns || ""]);
  gaps.addRow(["Regulatory vacuum", dg?.regulatoryVacuum || ""]);
  gaps.addRow(["Environmental rollup", dg?.environmental || ""]);
  gaps.addRow(["Social rollup", dg?.social || ""]);
  gaps.addRow(["Governance rollup", dg?.governance || ""]);
  gaps.columns = [{ width: 28 }, { width: 100 }];

  const audit = workbook.addWorksheet("Disclosure Audit");
  addHeader(audit, "Stage 2B disclosure audit");
  audit.addRow([]);
  audit.addRow(["Channel", "Findings", "Gaps"]);
  styleHeaderRow(audit, 4);
  for (const row of engagement.artifacts.disclosureAudit || []) {
    audit.addRow([row.channel, row.findings, row.gaps]);
  }
  audit.columns = [{ width: 28 }, { width: 70 }, { width: 70 }];

  const baselines = workbook.addWorksheet("Baseline Metrics");
  addHeader(baselines, "Stage 2C baseline metrics");
  baselines.addRow([]);
  baselines.addRow([
    "Issue",
    "Company metric",
    "Baseline",
    "Methodology / scope",
    "3-yr trend",
    "Peer comparison",
    "ESRS metric",
    "Data quality",
  ]);
  styleHeaderRow(baselines, 4);
  for (const row of engagement.artifacts.baselineMetrics || []) {
    baselines.addRow([
      row.issue,
      row.companyMetric,
      row.baseline,
      row.methodology,
      row.trend3yr,
      row.peerComparison,
      row.esrsMetric,
      row.dataQualityFlag,
    ]);
  }
  baselines.columns = Array.from({ length: 8 }, () => ({ width: 22 }));

  const methodGaps = workbook.addWorksheet("Methodology Gaps");
  addHeader(methodGaps, "Stage 2D methodology gaps vs ESRS");
  methodGaps.addRow([]);
  methodGaps.addRow(["Issue", "Scope", "Measurement", "Transparency", "Timeliness", "Gap score"]);
  styleHeaderRow(methodGaps, 4);
  for (const row of engagement.artifacts.methodologyGaps || []) {
    methodGaps.addRow([
      row.issue,
      row.scopeGap,
      row.measurementGap,
      row.transparencyGap,
      row.timelinessGap,
      row.gapScore,
    ]);
  }
  methodGaps.columns = Array.from({ length: 6 }, () => ({ width: 28 }));

  const ops = workbook.addWorksheet("Operations News");
  addHeader(ops, "Stage 2E 12-month operations and news");
  ops.addRow([]);
  ops.addRow(["Date", "Theme", "Event", "Company said", "Third party", "Gap signal"]);
  styleHeaderRow(ops, 4);
  for (const row of engagement.artifacts.operationsNews || []) {
    ops.addRow([row.date || "", row.theme, row.event, row.companySaid, row.thirdParty, row.gapSignal]);
  }
  ops.columns = Array.from({ length: 6 }, () => ({ width: 28 }));

  const recon = workbook.addWorksheet("Reconciliation");
  addHeader(recon, "Stage 2F why is this undisclosed");
  recon.addRow([]);
  recon.addRow(["Issue", "Disclosure status", "Likely reason", "Evidence", "Confidence", "Flag for probing"]);
  styleHeaderRow(recon, 4);
  for (const row of engagement.artifacts.reconciliation || []) {
    recon.addRow([
      row.issue,
      row.disclosureStatus,
      row.likelyReason,
      row.evidence,
      row.confidence,
      row.flagForProbing ? "Yes" : "No",
    ]);
  }
  recon.columns = Array.from({ length: 6 }, () => ({ width: 28 }));

  const stakeholders = workbook.addWorksheet("Stakeholders");
  addHeader(stakeholders, "Stakeholder map");
  stakeholders.addRow([]);
  stakeholders.addRow(["Group", "What keeps them awake", "What the company is not talking about"]);
  styleHeaderRow(stakeholders, 4);
  for (const row of engagement.artifacts.stakeholders || []) {
    stakeholders.addRow([row.group, row.whatKeepsThemUp, row.unspokenWorries]);
  }
  stakeholders.columns = [{ width: 24 }, { width: 50 }, { width: 50 }];

  const matrix = workbook.addWorksheet("DMA Matrix");
  addHeader(matrix, "Double materiality scores", "Disclosed vs undisclosed / emerging");
  matrix.addRow([]);
  matrix.addRow([
    "Issue",
    "Definition",
    "Disclosed",
    "Emerging",
    "Financial (X)",
    "Impact (Y)",
    "Financial evidence",
    "Impact evidence",
    "Disclosure status",
    "Confidence",
    "Metric",
    "Data quality",
    "ESRS",
    "Method gap",
    "Company judgment",
    "Layer",
  ]);
  styleHeaderRow(matrix, 4);
  for (const row of engagement.artifacts.issueScores || []) {
    matrix.addRow([
      row.issue,
      row.definition,
      row.disclosed ? "Yes" : "No",
      row.emerging ? "Yes" : "No",
      row.financialScore,
      row.impactScore,
      row.financialEvidence,
      row.impactEvidence,
      row.disclosureStatus,
      row.confidence,
      row.recommendedMetric,
      row.dataQuality,
      row.esrs || "",
      row.methodologyGapScore ?? "",
      row.companyJudgment || "",
      row.layer || "",
    ]);
  }
  matrix.columns = Array.from({ length: 16 }, () => ({ width: 22 }));

  const disclosed = workbook.addWorksheet("Disclosed Issues");
  addHeader(disclosed, "Disclosed issues");
  disclosed.addRow([]);
  disclosed.addRow(["Issue", "Financial", "Impact", "Evidence", "Metric"]);
  styleHeaderRow(disclosed, 4);
  for (const row of (engagement.artifacts.issueScores || []).filter((item) => item.disclosed)) {
    disclosed.addRow([
      row.issue,
      row.financialScore,
      row.impactScore,
      `${row.financialEvidence} | ${row.impactEvidence}`,
      row.recommendedMetric,
    ]);
  }
  disclosed.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 70 }, { width: 28 }];

  const undisclosed = workbook.addWorksheet("Undisclosed Issues");
  addHeader(undisclosed, "Undisclosed / emerging issues");
  undisclosed.addRow([]);
  undisclosed.addRow([
    "Issue",
    "Definition",
    "Why exposure",
    "Evidence",
    "Why silent",
    "Financial path",
    "Impact path",
    "Confidence",
    "What they disclose",
    "ESRS expectation",
    "Operations signal",
  ]);
  styleHeaderRow(undisclosed, 4);
  for (const row of engagement.artifacts.discoveryCards || []) {
    undisclosed.addRow([
      row.issue,
      row.definition,
      row.whyExposure,
      row.evidence,
      row.whyNotDisclosed,
      row.financialMateriality,
      row.impactMateriality,
      row.confidence,
      row.companyDisclosure || "",
      row.esrsExpectation || "",
      row.operationsSignal || "",
    ]);
  }
  undisclosed.columns = Array.from({ length: 11 }, () => ({ width: 28 }));

  const esrs = workbook.addWorksheet("Metrics ESRS");
  addHeader(esrs, "Metrics & ESRS alignment");
  esrs.addRow([]);
  esrs.addRow(["Issue", "Metric", "Rationale"]);
  styleHeaderRow(esrs, 4);
  for (const row of engagement.artifacts.esrsMapping || []) {
    esrs.addRow([row.issue, row.metric, row.rationale]);
  }
  esrs.columns = [{ width: 28 }, { width: 32 }, { width: 70 }];

  const blinds = workbook.addWorksheet("Blind Spot Analysis");
  addHeader(blinds, "Blind spot analysis");
  blinds.addRow([]);
  blinds.addRow([engagement.artifacts.blindSpotSummary || ""]);
  blinds.columns = [{ width: 120 }];

  const refs = workbook.addWorksheet("References");
  addHeader(refs, "References & citations");
  refs.addRow([]);
  refs.addRow(["ID", "Claim", "Source", "URL", "Date"]);
  styleHeaderRow(refs, 4);
  for (const row of engagement.citations) {
    refs.addRow([row.id, row.claim, row.source, row.url || "", row.date || ""]);
  }
  refs.columns = [{ width: 16 }, { width: 40 }, { width: 30 }, { width: 40 }, { width: 16 }];

  const assumptions = workbook.addWorksheet("Assumptions Log");
  addHeader(assumptions, "Assumptions log");
  assumptions.addRow([]);
  assumptions.addRow(["ID", "Statement", "Why", "Confidence", "Related issue"]);
  styleHeaderRow(assumptions, 4);
  for (const row of engagement.assumptions) {
    assumptions.addRow([row.id, row.statement, row.why, row.confidence, row.relatedIssue || ""]);
  }
  assumptions.columns = [{ width: 16 }, { width: 40 }, { width: 40 }, { width: 14 }, { width: 24 }];

  const sign = workbook.addWorksheet("Sign-off");
  addHeader(sign, "User sign-off");
  sign.addRow([]);
  sign.addRow(["Item", "Agreed", "Notes"]);
  styleHeaderRow(sign, 4);
  for (const item of SIGN_OFF_ITEMS) {
    const state = engagement.signOff[item.id];
    sign.addRow([item.label, state?.agreed ? "Yes" : "No", state?.notes || ""]);
  }
  sign.columns = [{ width: 70 }, { width: 12 }, { width: 40 }];

  const scope = workbook.addWorksheet("Pricing Scope");
  addHeader(scope, "Pricing model scope");
  scope.addRow([]);
  const ps = engagement.artifacts.pricingScope;
  scope.addRow(["Issues", (ps?.issues || []).join("; ")]);
  scope.addRow(["Horizon (years)", ps?.horizonYears || ""]);
  scope.addRow(["Scenarios", ps?.scenarios || ""]);
  scope.addRow(["Public data only", ps ? String(ps.publicDataOnly) : ""]);
  scope.addRow(["Include undisclosed", ps ? String(ps.includeUndisclosed) : ""]);
  scope.addRow(["Model types", (ps?.modelTypes || []).join("; ")]);
  scope.addRow(["Build mode", ps?.buildMode || engagement.methodology.buildMode]);
  scope.addRow(["Notes", ps?.notes || ""]);
  scope.columns = [{ width: 24 }, { width: 90 }];

  const models = workbook.addWorksheet("Pricing Models");
  addHeader(models, "Scenario models");
  models.addRow([]);
  for (const model of engagement.artifacts.financialModels || []) {
    models.addRow([model.issue, model.disclosed ? "Disclosed" : "Undisclosed", model.modelType]);
    models.addRow(["Mechanism", model.mechanism]);
    models.addRow(["Catalyst", model.catalyst || ""]);
    models.addRow(["Baseline", model.baseline]);
    models.addRow(["Unit", model.unit]);
    models.addRow(["Years", ...model.years]);
    models.addRow(["Base", ...model.baseCase]);
    models.addRow(["Stress", ...model.stressCase]);
    models.addRow(["Upside", ...model.upsideCase]);
    models.addRow(["Valuation notes", model.valuationNotes]);
    models.addRow([]);
    for (const assumption of model.assumptions) {
      models.addRow(["Assumption", assumption.name, assumption.value, assumption.source]);
    }
    models.addRow([]);
  }
  models.columns = [{ width: 24 }, { width: 28 }, { width: 28 }, { width: 40 }];

  const discovery = workbook.addWorksheet("Discovery Log");
  addHeader(discovery, "Materiality discovery log");
  discovery.addRow([]);
  discovery.addRow(["Issue", "Raised", "Source", "Confidence", "Reaction", "Notes"]);
  styleHeaderRow(discovery, 4);
  for (const row of engagement.discoveryLog) {
    discovery.addRow([
      row.issue,
      row.raisedAt,
      row.source,
      row.confidence,
      row.reaction,
      row.notes || "",
    ]);
  }
  discovery.columns = [{ width: 28 }, { width: 22 }, { width: 36 }, { width: 14 }, { width: 22 }, { width: 40 }];

  const probes = workbook.addWorksheet("Probing Log");
  addHeader(probes, "User challenges and revisions");
  probes.addRow([]);
  probes.addRow(["When", "Original claim", "User challenge", "New evidence", "Revised claim", "Reasoning"]);
  styleHeaderRow(probes, 4);
  for (const row of engagement.probeLog) {
    probes.addRow([
      row.raisedAt,
      row.originalClaim,
      row.userChallenge,
      row.newEvidence,
      row.revisedClaim,
      row.reasoning,
    ]);
  }
  probes.columns = Array.from({ length: 6 }, () => ({ width: 28 }));

  const checks = workbook.addWorksheet("Assumption Checkpoints");
  addHeader(checks, "User-validated pricing assumptions");
  checks.addRow([]);
  checks.addRow([
    "Assumption",
    "Reasoning",
    "Evidence",
    "Confidence",
    "Sensitivity",
    "User decision",
    "User notes",
  ]);
  styleHeaderRow(checks, 4);
  for (const row of engagement.assumptionCheckpoints) {
    checks.addRow([
      row.statement,
      row.reasoning,
      row.evidence,
      row.confidence,
      row.sensitivity,
      row.userDecision,
      row.userNotes || "",
    ]);
  }
  checks.columns = Array.from({ length: 7 }, () => ({ width: 26 }));

  const teaching = workbook.addWorksheet("Methodology Teaching");
  addHeader(teaching, "Pricing methodology progress");
  teaching.addRow([]);
  teaching.addRow(["Types walked", String(engagement.methodology.typesWalked)]);
  teaching.addRow(["Anatomy walked", String(engagement.methodology.anatomyWalked)]);
  teaching.addRow(["Example walked", String(engagement.methodology.exampleWalked)]);
  teaching.addRow(["Build mode", engagement.methodology.buildMode]);
  teaching.addRow(["Selected types", engagement.methodology.selectedTypes.join("; ")]);
  teaching.columns = [{ width: 24 }, { width: 80 }];

  return workbook.xlsx.writeBuffer();
}
