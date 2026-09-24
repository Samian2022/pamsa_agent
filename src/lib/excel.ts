import ExcelJS from "exceljs";
import { SIGN_OFF_ITEMS } from "./stages";
import type { Engagement, ScoringFramework } from "./types";

const FOREST = "FF2C4A3E";
const CREAM = "FFF3EEE4";
const INK = "FF14201B";

function paintTitle(sheet: ExcelJS.Worksheet, title: string, subtitle?: string, lastCol = "H") {
  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: INK } };
  if (subtitle) {
    sheet.mergeCells(`A2:${lastCol}2`);
    sheet.getCell("A2").value = subtitle;
    sheet.getCell("A2").alignment = { wrapText: true };
  }
  sheet.views = [{ state: "frozen", ySplit: 5 }];
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: CREAM } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOREST } };
  row.alignment = { wrapText: true, vertical: "middle" };
  row.height = 28;
}

function addPair(sheet: ExcelJS.Worksheet, label: string, value: string) {
  const row = sheet.addRow([label, value || ""]);
  row.getCell(1).font = { bold: true, color: { argb: FOREST } };
  row.getCell(2).alignment = { wrapText: true };
  row.height = Math.max(18, Math.min(90, Math.ceil((value || "").length / 90) * 16));
}

function esrsTopicName(code: string) {
  const key = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
  const map: Record<string, string> = {
    E1: "Climate Change",
    E2: "Pollution",
    E3: "Water and Marine Resources",
    E4: "Biodiversity and Ecosystems",
    E5: "Resource Use and Circular Economy",
    S1: "Own Workforce",
    S2: "Workers in the Value Chain",
    S3: "Affected Communities",
    S4: "Consumers and End-users",
    G1: "Business Conduct",
  };
  return map[key] || code || "";
}

type DmaRow = {
  index: number;
  esrs: string;
  topic: string;
  subTopic: string;
  indicator: string;
  dr: string;
  title: string;
  description: string;
  impactType: string;
  actualVsPotential: string;
  polarity: string;
  upstream: string;
  ownOps: string;
  downstream: string;
  timeHorizon: string;
  riskVsOpp: string;
  scale: number | "";
  scaleWhy: string;
  scope: number | "";
  scopeWhy: string;
  remediability: number | "";
  remediabilityWhy: string;
  severity: number | "";
  likelihood: number | "";
  likelihoodWhy: string;
  combinedImpact: number | "";
  materialImpact: string;
  comments: string;
  metrics: string;
  magnitude: number | "";
  magnitudeWhy: string;
  finLikelihood: number | "";
  finLikelihoodWhy: string;
  finSeverity: number | "";
  combinedFinancial: number | "";
  materialFinancial: string;
  financialScore: number | "";
  impactScore: number | "";
  disclosed: string;
};

function dim(score?: { score: number; rationale: string }) {
  return {
    score: score?.score ?? ("" as const),
    why: score?.rationale || "",
  };
}

function buildDmaRows(engagement: Engagement): DmaRow[] {
  const cards = engagement.artifacts.discoveryCards || [];
  const scores = engagement.artifacts.issueScores || [];
  const accepted = new Set(
    engagement.discoveryLog.filter((item) => item.reaction === "accepted").map((item) => item.issue.toLowerCase()),
  );
  const byIssue = new Map(cards.map((card) => [card.issue.toLowerCase(), card]));
  const names = scores.length
    ? scores.map((item) => item.issue)
    : cards.filter((card) => accepted.has(card.issue.toLowerCase()) || !accepted.size).map((card) => card.issue);

  return names.map((name, index) => {
    const score = scores.find((item) => item.issue.toLowerCase() === name.toLowerCase());
    const card = byIssue.get(name.toLowerCase());
    const esrs = score?.esrsTopic || score?.esrs || card?.esrs || "";
    const scale = dim(score?.impactScale);
    const scope = dim(score?.impactScope);
    const rem = dim(score?.impactRemediability);
    const like = dim(score?.impactLikelihood);
    const mag = dim(score?.financialMagnitude);
    const finLike = dim(score?.financialProbability);
    const impactScore = score?.impactScore ?? "";
    const financialScore = score?.financialScore ?? "";
    const severity =
      typeof scale.score === "number" && typeof scope.score === "number" && typeof rem.score === "number"
        ? Math.round((scale.score + scope.score + rem.score) / 3)
        : impactScore;
    const combinedImpact =
      typeof severity === "number" && typeof like.score === "number" ? Number((severity * (like.score / 5)).toFixed(2)) : impactScore;
    const finSeverity =
      typeof mag.score === "number" && typeof finLike.score === "number"
        ? mag.score * finLike.score
        : financialScore;
    return {
      index: index + 1,
      esrs,
      topic: esrsTopicName(esrs),
      subTopic: score?.topicArea || card?.issue || name,
      indicator: "Assessing impacts, risks and opportunities",
      dr: esrs ? `${esrs}.IRO-1` : "",
      title: name,
      description: score?.iroDescription || score?.definition || card?.definition || "",
      impactType: card?.pillar === "social" ? "Social" : card?.pillar === "governance" ? "Governance" : "Environmental",
      actualVsPotential: score?.actualVsPotential === "potential" ? "Potential" : "Actual",
      polarity: score?.polarity === "positive" ? "Positive" : "Negative",
      upstream: /up/i.test(score?.valueChainLocation || "") ? "3" : "N/A",
      ownOps: /own|ops|operation/i.test(score?.valueChainLocation || "own") ? "3" : "2",
      downstream: /down/i.test(score?.valueChainLocation || "") ? "3" : "N/A",
      timeHorizon: score?.impactTimeHorizon || score?.financialTimeHorizon || "Medium-term",
      riskVsOpp: score?.iroKind === "opportunity" ? "Opportunity" : score?.iroKind === "impact" ? "Impact" : "Risk",
      scale: scale.score,
      scaleWhy: scale.why || score?.impactEvidence || card?.evidence || "",
      scope: scope.score,
      scopeWhy: scope.why,
      remediability: rem.score,
      remediabilityWhy: rem.why,
      severity,
      likelihood: like.score,
      likelihoodWhy: like.why,
      combinedImpact,
      materialImpact: score?.material === undefined ? (typeof impactScore === "number" && impactScore >= 3 ? "Yes" : "") : score.material ? "Yes" : "No",
      comments: score?.companyJudgment || card?.nextInvestigation || "",
      metrics:
        (score?.recommendedMetrics || []).map((item) => item.metric).join("; ") ||
        score?.recommendedMetric ||
        card?.esrsExpectation ||
        "",
      magnitude: mag.score,
      magnitudeWhy: mag.why || score?.financialEvidence || "",
      finLikelihood: finLike.score,
      finLikelihoodWhy: finLike.why,
      finSeverity,
      combinedFinancial: finSeverity,
      materialFinancial:
        score?.material === undefined
          ? typeof financialScore === "number" && financialScore >= 3
            ? "Yes"
            : ""
          : score.material
            ? "Yes"
            : "No",
      financialScore,
      impactScore,
      disclosed: score?.disclosed ? "Yes" : card?.companyDisclosure ? "Partial" : "No",
    };
  });
}

function writeScoringKeyTable(
  sheet: ExcelJS.Worksheet,
  heading: string,
  blocks: { title: string; rationale: string; rows: [string, string][] }[],
) {
  paintTitle(sheet, heading, "Every IRO is scored against this key. Rationale must use the band language.");
  sheet.addRow([]);
  sheet.addRow(["Criterion", "Score / rating", "Description"]);
  styleHeaderRow(sheet, 4);
  for (const block of blocks) {
    sheet.addRow([block.title, "", ""]);
    sheet.lastRow!.font = { bold: true, color: { argb: FOREST } };
    sheet.addRow(["Rationale", block.rationale, ""]);
    sheet.lastRow!.alignment = { wrapText: true };
    for (const [rating, description] of block.rows) {
      sheet.addRow(["", rating, description]);
      sheet.lastRow!.alignment = { wrapText: true };
    }
    sheet.addRow([]);
  }
  sheet.columns = [{ width: 36 }, { width: 28 }, { width: 88 }];
}

export async function buildEngagementWorkbook(engagement: Engagement) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PAMSA";
  workbook.created = new Date();
  const company = engagement.artifacts.selectedCompany || engagement.title;
  const snap = engagement.artifacts.snapshot;
  const framework: ScoringFramework | undefined = engagement.artifacts.scoringFramework;
  const rows = buildDmaRows(engagement);
  const accepted = engagement.discoveryLog.filter((item) => item.reaction === "accepted").map((item) => item.issue);

  const cover = workbook.addWorksheet("Cover");
  paintTitle(
    cover,
    `Assessment: ${company} Double Materiality Assessment`,
    "PAMSA Holistic DMA pack. This file stops at DMA sign-off. Pricing models are not included.",
  );
  cover.addRow([]);
  addPair(cover, "Company", company);
  addPair(cover, "Prepared by", `${engagement.createdBy.name} <${engagement.createdBy.email}>`);
  addPair(cover, "Date", new Date(engagement.updatedAt).toISOString().slice(0, 10));
  addPair(cover, "Stage", `DMA ${engagement.stage >= 4 ? "ready for sign-off" : "in progress"}`);
  addPair(
    cover,
    "Required mix",
    "3 environmental topics including climate (E1) and 3 social topics, then extras. Score IROs, not topic labels.",
  );
  cover.addRow([]);
  cover.addRow(["Contents"]);
  cover.lastRow!.font = { bold: true };
  for (const item of [
    "Introduction",
    "Methodology",
    "Double Materiality Chart",
    "Impact Metrics",
    "Impact Metrics - Scoring Key",
    "Financial Metrics",
    "Financial Metrics - Scoring Key",
    "ESRS Indicators",
    "References",
    "Sign-off",
    "Review Findings",
  ]) {
    cover.addRow(["", item]);
  }
  cover.columns = [{ width: 22 }, { width: 88 }];

  const intro = workbook.addWorksheet("Introduction");
  paintTitle(intro, "Introduction", "Company context, why DMA, and ESRS alignment");
  intro.addRow([]);
  addPair(
    intro,
    "Business Overview",
    snap?.businessModel ||
      `${company} is the selected Stage 1 company for this PAMSA double materiality assessment. Lock a filing to deepen the snapshot.`,
  );
  addPair(
    intro,
    "Double Materiality Context",
    snap?.knownRiskAreas ||
      "This DMA tests inside-out impacts on people and the environment and outside-in financial effects on cash flow, costs, and assets. Climate (E1) is presumed material unless the analyst proves otherwise.",
  );
  addPair(
    intro,
    "Sustainability Reporting",
    snap?.currentEsgDisclosure ||
      "Use the uploaded filings and public sustainability report. Map each material IRO to an ESRS metric that measures why it scored high.",
  );
  addPair(
    intro,
    "Required topic mix",
    `3 environmental topics including climate (E1) and 3 social topics are required, then extras. Accepted findings: ${accepted.join("; ") || "none yet"}.`,
  );
  intro.columns = [{ width: 28 }, { width: 110 }];

  const method = workbook.addWorksheet("Methodology");
  paintTitle(method, "Methodology", "How impact and financial materiality are scored");
  method.addRow([]);
  addPair(
    method,
    "Two axes",
    "Impact materiality (inside-out): how the company affects people and the environment across operations and the value chain. Financial materiality (outside-in): how sustainability matters affect revenue, costs, assets, and enterprise value.",
  );
  addPair(
    method,
    "Scale",
    framework?.scaleChoiceRationale ||
      "A 1 to 5 scale matches peer DMA practice and ESRS qualitative scoring. Yes/no hides clusters. 1-100 implies false precision.",
  );
  addPair(
    method,
    "Impact tests",
    framework?.impactDimensions ||
      "Scale, scope, remediability, stakeholder sensitivity, and time horizon, covering operations and the value chain.",
  );
  addPair(method, "Harm norms", framework?.socialNormsUsed || "ESRS, IPCC, ILO, OHCHR, and planetary boundaries where relevant.");
  addPair(
    method,
    "Financial tests",
    framework?.financialDimensions ||
      "Probability of hitting cash flow or costs, magnitude on revenue, costs or assets, and time horizon.",
  );
  addPair(method, "Threshold", `${framework?.thresholdRule || "Material if impact or financial score is 3 or higher."} ${framework?.thresholdRationale || ""}`.trim());
  addPair(
    method,
    "Value chain",
    "Each IRO is located upstream, in own operations, and/or downstream. 3 is the primary location, 2 secondary, 1 tertiary, N/A if not in that slice.",
  );
  addPair(
    method,
    "Metrics",
    "Recommended metrics measure why the IRO scored high, not only what the company already reports. Map them to ESRS disclosure requirements where possible.",
  );
  method.columns = [{ width: 28 }, { width: 110 }];

  const chart = workbook.addWorksheet("Double Materiality Chart");
  paintTitle(
    chart,
    `${company} Double Materiality Assessment`,
    "Plot Financial (X) against Impact (Y). Material if either axis is 3 or higher, unless the scoring key says otherwise.",
  );
  chart.addRow([]);
  chart.addRow(["Impact (Y) \\ Financial (X)", "1", "2", "3", "4", "5"]);
  styleHeaderRow(chart, 4);
  const matrix: string[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
  for (const row of rows) {
    const x = typeof row.financialScore === "number" ? Math.min(5, Math.max(1, Math.round(row.financialScore))) : 3;
    const y = typeof row.impactScore === "number" ? Math.min(5, Math.max(1, Math.round(row.impactScore))) : 3;
    const cell = matrix[5 - y][x - 1];
    matrix[5 - y][x - 1] = cell ? `${cell}; ${row.title}` : row.title;
  }
  for (let y = 0; y < 5; y += 1) {
    const excelRow = chart.addRow([String(5 - y), ...matrix[y]]);
    excelRow.alignment = { wrapText: true, vertical: "top" };
    excelRow.height = 36;
    excelRow.getCell(1).font = { bold: true, color: { argb: FOREST } };
    for (let x = 1; x <= 5; x += 1) {
      const cell = excelRow.getCell(x + 1);
      if (5 - y >= 3 || x >= 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0E9" } };
      }
    }
  }
  chart.addRow([]);
  chart.addRow(["#", "X-Axis: Financial Materiality (Outside-In)", "Y-Axis: Impact Materiality (Inside-Out)", "IRO", "Recommended metrics", "Material?"]);
  styleHeaderRow(chart, 11);
  for (const row of rows) {
    chart.addRow([
      row.index,
      row.financialScore,
      row.impactScore,
      row.title,
      row.metrics,
      row.materialImpact === "Yes" || row.materialFinancial === "Yes" ? "Yes" : row.materialImpact || row.materialFinancial,
    ]);
  }
  chart.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 36 }, { width: 40 }, { width: 14 }];

  const impact = workbook.addWorksheet("Impact Metrics");
  paintTitle(impact, "Impact Materiality Scoring (Inside-Out)", "Score IROs, not topic labels. Rationale must use the scoring-key band language.");
  impact.addRow([]);
  const impactHeaders = [
    "#",
    "ESRS",
    "Topic",
    "Sub-Topic",
    "ESRS Indicator",
    "DR",
    "Topic Title",
    "IRO Description",
    "Impact Type",
    "Actual vs Potential",
    "Negative vs Positive",
    "Upstream",
    "Own Operations",
    "Downstream",
    "Time Horizon",
    "Risk vs Opportunity",
    "Scale",
    "Rationale",
    "Scope",
    "Rationale",
    "Remediability",
    "Rationale",
    "Severity Score",
    "Likelihood",
    "Rationale",
    "Combined",
    "Material",
    "Comments",
    "Recommended Metrics",
  ];
  impact.addRow(impactHeaders);
  styleHeaderRow(impact, 4);
  for (const row of rows) {
    impact.addRow([
      row.index,
      row.esrs,
      row.topic,
      row.subTopic,
      row.indicator,
      row.dr,
      row.title,
      row.description,
      row.impactType,
      row.actualVsPotential,
      row.polarity,
      row.upstream,
      row.ownOps,
      row.downstream,
      row.timeHorizon,
      row.riskVsOpp,
      row.scale,
      row.scaleWhy,
      row.scope,
      row.scopeWhy,
      row.remediability,
      row.remediabilityWhy,
      row.severity,
      row.likelihood,
      row.likelihoodWhy,
      row.combinedImpact,
      row.materialImpact,
      row.comments,
      row.metrics,
    ]);
  }
  impact.columns = impactHeaders.map((header) => ({ width: header.length > 18 ? 28 : 16 }));
  impact.eachRow((row, number) => {
    if (number > 4) row.alignment = { wrapText: true, vertical: "top" };
  });

  writeScoringKeyTable(workbook.addWorksheet("Impact Metrics - Scoring Key"), "Impact Materiality Scoring (Inside-Out)", [
    {
      title: "Relevance in the value chain (upstream / own operations / downstream)",
      rationale:
        "ESRS requires impacts across the value chain. 3 is the primary location, 2 secondary, 1 tertiary. N/A if the IRO does not sit in that slice.",
      rows: [
        ["3 Primary", "Primary location where this impact occurs"],
        ["2 Secondary", "Secondary location where this impact occurs"],
        ["1 Tertiary", "Impact may materialize here, but to a smaller extent"],
      ],
    },
    {
      title: "Time horizon",
      rationale: framework?.impactTimeHorizonRationale || "Aligned to ESRS short, medium, and long horizons.",
      rows: [
        ["1 Short-term", "Up to 12 months"],
        ["2 Medium-term", "1 to 5 years"],
        ["3 Long-term", "More than 5 years"],
      ],
    },
    {
      title: "Scale, scope, remediability (1 to 5)",
      rationale: framework?.impactBands || "1 niche. 3 material across operations or value chain. 5 systemic or irreversible.",
      rows: [
        ["1", "Niche or reversible local effect"],
        ["2", "Emerging NGO or regulatory signal with limited scale"],
        ["3", "Material harm or benefit across operations or value chain"],
        ["4", "Severe, hard-to-remediate effects on people, ecosystems, or operations and value chain"],
        ["5", "Systemic or irreversible harm, or regulation already in force"],
      ],
    },
    {
      title: "Materiality threshold",
      rationale: framework?.thresholdRationale || "A 3 is the first band where operations or value-chain harm is evidenced.",
      rows: [[framework?.thresholdRule || "Material if impact score is 3 or higher", "Climate (E1) stays in the set unless the analyst proves it is not material"]],
    },
  ]);

  const financial = workbook.addWorksheet("Financial Metrics");
  paintTitle(financial, "Financial Materiality Scoring (Outside-In)", "Probability and magnitude on cash flow, costs, revenue, or assets.");
  financial.addRow([]);
  const finHeaders = [
    "#",
    "ESRS",
    "Topic",
    "Sub-Topic",
    "ESRS Indicator",
    "DR",
    "Topic Title",
    "IRO Description",
    "Impact Type",
    "Actual vs Potential",
    "Negative vs Positive",
    "Upstream",
    "Own Operations",
    "Downstream",
    "Time Horizon",
    "Risk vs Opportunity",
    "Magnitude",
    "Rationale",
    "Likelihood",
    "Rationale",
    "Severity",
    "Combined",
    "Material",
    "Recommended Metrics",
    "Disclosed",
  ];
  financial.addRow(finHeaders);
  styleHeaderRow(financial, 4);
  for (const row of rows) {
    financial.addRow([
      row.index,
      row.esrs,
      row.topic,
      row.subTopic,
      row.indicator,
      row.dr,
      row.title,
      row.description,
      row.impactType,
      row.actualVsPotential,
      row.polarity,
      row.upstream,
      row.ownOps,
      row.downstream,
      row.timeHorizon,
      row.riskVsOpp,
      row.magnitude,
      row.magnitudeWhy,
      row.finLikelihood,
      row.finLikelihoodWhy,
      row.finSeverity,
      row.combinedFinancial,
      row.materialFinancial,
      row.metrics,
      row.disclosed,
    ]);
  }
  financial.columns = finHeaders.map((header) => ({ width: header.length > 16 ? 28 : 16 }));
  financial.eachRow((row, number) => {
    if (number > 4) row.alignment = { wrapText: true, vertical: "top" };
  });

  writeScoringKeyTable(workbook.addWorksheet("Financial Metrics - Scoring Key"), "Financial Materiality Scoring (Outside-In)", [
    {
      title: "Magnitude on revenue, costs, or assets",
      rationale: framework?.financialBands || "Default PAMSA bands until the scoring key is edited.",
      rows: [
        ["1", "Under 0.1% of EBITDA, or clearly immaterial to cash"],
        ["2", "About 0.1-0.5%"],
        ["3", "About 0.5-2%, or a known cost/revenue pathway"],
        ["4", "About 2-10%, or asset-impairment risk"],
        ["5", "Over 10%, or a business-model threat"],
      ],
    },
    {
      title: "Likelihood of financial effect",
      rationale: framework?.financialTimeHorizonRationale || "Use recorded incidents, regulation already in force, and the annual-report risk language.",
      rows: [
        ["1 Unlikely", "Outcome not expected in the horizon"],
        ["2 Possible", "Might occur in the horizon"],
        ["3 Likely", "Likely to occur or recur"],
        ["4 Almost certain", "Already occurring or very likely"],
        ["5 Certain", "In force now, or already hitting cash"],
      ],
    },
    {
      title: "Materiality threshold",
      rationale: framework?.alignedToCompanyFinancials || "Align the threshold to how the company already talks about material financial risk.",
      rows: [[framework?.thresholdRule || "Material if financial score is 3 or higher", "If impact and financial time horizons differ, say why on the IRO row"]],
    },
  ]);

  const esrs = workbook.addWorksheet("ESRS Indicators");
  paintTitle(esrs, "ESRS Indicators", "Map each IRO to the ESRS topic, DR, and the metric that measures why it scored high.");
  esrs.addRow([]);
  esrs.addRow(["ESRS", "DR", "Name", "ESRS Topic Title", "IRO", "IRO Description", "Metric", "Why this metric", "Source"]);
  styleHeaderRow(esrs, 4);
  const mapped = engagement.artifacts.esrsMapping || [];
  if (mapped.length) {
    for (const item of mapped) {
      const row = rows.find((entry) => entry.title.toLowerCase() === item.issue.toLowerCase());
      esrs.addRow([
        row?.esrs || "",
        row?.dr || "",
        "Assessing impacts, risks and opportunities",
        row?.topic || "",
        item.issue,
        row?.description || "",
        item.metric,
        item.rationale,
        "",
      ]);
    }
  } else {
    for (const row of rows) {
      esrs.addRow([
        row.esrs,
        row.dr,
        "Assessing impacts, risks and opportunities",
        row.topic,
        row.title,
        row.description,
        row.metrics,
        "Measures why this IRO scored high",
        "",
      ]);
    }
  }
  esrs.columns = [
    { width: 10 },
    { width: 14 },
    { width: 42 },
    { width: 28 },
    { width: 28 },
    { width: 48 },
    { width: 32 },
    { width: 40 },
    { width: 24 },
  ];

  const refs = workbook.addWorksheet("References");
  paintTitle(refs, "References", "Sources used for scores, metrics, and narrative.");
  refs.addRow([]);
  refs.addRow(["Reference Number", "Author/Organisation", "Year", "Title of webpage/document", "Sources"]);
  styleHeaderRow(refs, 4);
  const citations = engagement.citations.length
    ? engagement.citations
    : (engagement.documents || []).map((doc) => ({
        id: doc.id,
        claim: "Uploaded filing",
        source: doc.name,
        url: "",
        date: doc.uploadedAt.slice(0, 10),
      }));
  citations.forEach((row, index) => {
    refs.addRow([index + 1, row.source, (row.date || "").slice(0, 4), row.claim, row.url || ""]);
  });
  refs.columns = [{ width: 18 }, { width: 36 }, { width: 12 }, { width: 48 }, { width: 48 }];

  const sign = workbook.addWorksheet("Sign-off");
  paintTitle(sign, "DMA sign-off", "Complete before pricing scope.");
  sign.addRow([]);
  sign.addRow(["Item", "Agreed", "Notes"]);
  styleHeaderRow(sign, 4);
  for (const item of SIGN_OFF_ITEMS) {
    const state = engagement.signOff[item.id];
    sign.addRow([item.label, state?.agreed ? "Yes" : "No", state?.notes || ""]);
  }
  sign.columns = [{ width: 70 }, { width: 12 }, { width: 40 }];

  const findings = workbook.addWorksheet("Review Findings");
  paintTitle(findings, "Review findings", "Analyst calls that fed the DMA. Pricing is not started from this pack.");
  findings.addRow([]);
  findings.addRow(["Pillar", "ESRS", "Issue", "Definition", "Evidence", "Call", "Confidence"]);
  styleHeaderRow(findings, 4);
  for (const card of engagement.artifacts.discoveryCards || []) {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction || "pending";
    findings.addRow([card.pillar || "", card.esrs || "", card.issue, card.definition, card.evidence, reaction, card.confidence]);
  }
  findings.columns = [{ width: 16 }, { width: 10 }, { width: 32 }, { width: 40 }, { width: 44 }, { width: 18 }, { width: 12 }];

  return workbook.xlsx.writeBuffer();
}
