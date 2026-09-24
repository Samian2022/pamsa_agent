import ExcelJS from "exceljs";
import {
  buildDmaContext,
  esrsIndicatorRows,
  introductionSections,
  methodologySections,
  referenceRows,
  type DmaContext,
} from "./dma-pack";
import { SIGN_OFF_ITEMS } from "./stages";
import type { Engagement } from "./types";

const FOREST = "FF2C4A3E";
const CREAM = "FFF3EEE4";
const INK = "FF14201B";
const SAGE = "FFE8F0E9";

function paintBanner(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastCol: string) {
  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: CREAM }, name: "Calibri" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOREST } };
  sheet.getCell("A1").alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 32;
  sheet.mergeCells(`A2:${lastCol}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { italic: true, size: 11, color: { argb: INK } };
  sheet.getCell("A2").alignment = { wrapText: true, vertical: "middle" };
  sheet.getRow(2).height = 36;
  sheet.views = [{ state: "frozen", ySplit: 3 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: CREAM }, name: "Calibri", size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOREST } };
  row.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  row.height = 36;
}

function addEssay(sheet: ExcelJS.Worksheet, lastCol: string, title: string, body: string) {
  const heading = sheet.addRow([title]);
  sheet.mergeCells(`A${heading.number}:${lastCol}${heading.number}`);
  heading.font = { bold: true, size: 14, color: { argb: FOREST }, name: "Calibri" };
  heading.height = 22;
  const para = sheet.addRow([body]);
  sheet.mergeCells(`A${para.number}:${lastCol}${para.number}`);
  para.alignment = { wrapText: true, vertical: "top" };
  para.font = { size: 11, name: "Calibri", color: { argb: INK } };
  para.height = Math.max(90, Math.min(220, Math.ceil(body.length / 110) * 16));
  sheet.addRow([]);
}

function groupBar(sheet: ExcelJS.Worksheet, values: (string | number)[], fill = FOREST) {
  const row = sheet.addRow(values);
  row.font = { bold: true, color: { argb: CREAM }, size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  row.alignment = { wrapText: true, vertical: "middle" };
  row.height = 22;
  return row;
}

function writeIroRow(sheet: ExcelJS.Worksheet, values: (string | number)[]) {
  const row = sheet.addRow(values);
  row.alignment = { wrapText: true, vertical: "top" };
  row.font = { size: 10, name: "Calibri" };
  row.height = Math.max(96, Math.min(180, Math.ceil(String(values[7] || values[6] || "").length / 80) * 14));
  return row;
}

function keyBlock(
  sheet: ExcelJS.Worksheet,
  rationale: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const head = sheet.addRow(["Rationale >>", title]);
  head.font = { bold: true, color: { argb: FOREST } };
  sheet.addRow([]);
  const noteRow = sheet.lastRow!.number;
  sheet.mergeCells(`A${noteRow}:A${noteRow + Math.max(rows.length + 1, 4)}`);
  sheet.getCell(`A${noteRow}`).value = rationale;
  sheet.getCell(`A${noteRow}`).alignment = { wrapText: true, vertical: "top" };
  sheet.getCell(`A${noteRow}`).font = { size: 10, name: "Calibri" };
  const header = sheet.addRow(["", ...headers]);
  header.font = { bold: true, color: { argb: CREAM } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOREST } };
  header.alignment = { wrapText: true };
  for (const row of rows) {
    const added = sheet.addRow(["", ...row]);
    added.alignment = { wrapText: true, vertical: "top" };
    added.height = 28;
  }
  sheet.addRow([]);
  sheet.addRow([]);
}

function writeCover(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Cover");
  sheet.properties.tabColor = { argb: FOREST };
  paintBanner(
    sheet,
    `Assessment: ${ctx.company} Double Materiality Assessment`,
    "PAMSA / Holistic DMA pack. This file is the assessment. Pricing models are not included.",
    "D",
  );
  sheet.addRow([]);
  const meta = [
    ["Company", ctx.company],
    ["Prepared by", ctx.preparedBy],
    ["Date", ctx.date],
    ["Status", ctx.stageLabel],
    ["Required mix", "3 environmental topics including climate (E1) and 3 social topics, then extras. Score IROs, not topic labels."],
    ["Material on impact", `${ctx.materialImpact.length} IRO row(s): ${ctx.materialImpact.map((row) => row.title).join("; ") || "none yet"}`],
    ["Material on financial", `${ctx.materialFinancial.length} IRO row(s): ${ctx.materialFinancial.map((row) => row.title).join("; ") || "none yet"}`],
    ["IRO rows in this pack", String(ctx.iros.length)],
  ];
  for (const [label, value] of meta) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: FOREST } };
    row.getCell(2).alignment = { wrapText: true };
    row.height = 28;
    sheet.mergeCells(`B${row.number}:D${row.number}`);
  }
  sheet.addRow([]);
  const contents = sheet.addRow(["Contents"]);
  contents.font = { bold: true, size: 13, color: { argb: FOREST } };
  const items: [string, string][] = [
    ["Introduction", "Business overview, why DMA, reporting landscape, CSRD / ESRS alignment."],
    ["Methodology", "Criteria, value chain, evidence rules, 1-5 scale, thresholds, metric mapping."],
    ["Double Materiality Chart", "Impact (Y) against financial (X), with the working IRO table."],
    ["Impact Metrics", "Inside-out IRO scoring: scale, scope, remediability, likelihood, combined, metrics."],
    ["Impact Metrics - Scoring Key", "Full band language and the rationale for every criterion."],
    ["Financial Metrics", "Outside-in IRO scoring: magnitude, likelihood, vulnerability, velocity, metrics."],
    ["Financial Metrics - Scoring Key", "Full band language for cash, costs, assets, and readiness."],
    ["ESRS Indicators", "Disclosure-requirement catalog mapped to each IRO, with internal and external narrative."],
    ["References", "Method sources, ESRS, and engagement documents."],
    ["Sign-off", "DMA gate before pricing scope."],
    ["Review Findings", "Analyst calls that fed the IRO list."],
  ];
  const head = sheet.addRow(["Sheet", "What it contains"]);
  styleHeaderRow(sheet, head.number);
  for (const [name, detail] of items) {
    const row = sheet.addRow([name, detail]);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 28;
    sheet.mergeCells(`B${row.number}:D${row.number}`);
  }
  sheet.columns = [{ width: 36 }, { width: 42 }, { width: 24 }, { width: 24 }];
}

function writeEssays(workbook: ExcelJS.Workbook, name: string, title: string, subtitle: string, sections: { title: string; body: string }[]) {
  const sheet = workbook.addWorksheet(name);
  paintBanner(sheet, title, subtitle, "G");
  sheet.addRow([]);
  for (const section of sections) addEssay(sheet, "G", section.title, section.body);
  sheet.columns = [{ width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
}

function writeChart(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Double Materiality Chart");
  paintBanner(
    sheet,
    `${ctx.company} Double Materiality Assessment`,
    "Plot financial materiality (X, outside-in) against impact materiality (Y, inside-out). Material if either axis is 3 or higher, or if climate (E1) remains presumed material. Shaded cells are the material zone.",
    "F",
  );
  sheet.addRow([]);
  sheet.addRow(["Impact (Y) \\ Financial (X)", "1 Low", "2", "3 Threshold", "4", "5 High"]);
  styleHeaderRow(sheet, 4);
  const matrix: string[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
  for (const row of ctx.iros) {
    const x = Math.min(5, Math.max(1, Math.round(row.financialScore)));
    const y = Math.min(5, Math.max(1, Math.round(row.impactScore)));
    const cell = matrix[5 - y][x - 1];
    matrix[5 - y][x - 1] = cell ? `${cell}\n${row.esrs} ${row.title}` : `${row.esrs} ${row.title}`;
  }
  for (let y = 0; y < 5; y += 1) {
    const excelRow = sheet.addRow([String(5 - y), ...matrix[y]]);
    excelRow.alignment = { wrapText: true, vertical: "top" };
    excelRow.height = 48;
    excelRow.getCell(1).font = { bold: true, color: { argb: FOREST } };
    for (let x = 1; x <= 5; x += 1) {
      const cell = excelRow.getCell(x + 1);
      if (5 - y >= 3 || x >= 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAGE } };
      }
    }
  }
  sheet.addRow([]);
  const note = sheet.addRow([
    `Reading the chart: IROs in the shaded zone are material on at least one axis. ${ctx.materialImpact.length} row(s) meet the impact test and ${ctx.materialFinancial.length} meet the financial test. Climate (E1) stays in the working set unless disproved. Combined impact on the table uses severity x likelihood probability, as in the scoring key.`,
  ]);
  sheet.mergeCells(`A${note.number}:F${note.number}`);
  note.alignment = { wrapText: true };
  note.height = 48;
  sheet.addRow([]);
  const tableAt = sheet.addRow([
    "#",
    "X-Axis: Financial Materiality (Outside-In)",
    "Y-Axis: Impact Materiality (Inside-Out)",
    "IRO",
    "Recommended metrics",
    "Material?",
  ]);
  styleHeaderRow(sheet, tableAt.number);
  for (const row of ctx.iros) {
    const added = sheet.addRow([
      row.index,
      row.financialScore,
      row.impactScore,
      `${row.esrs} ${row.title}`,
      row.metrics.replace(/\n/g, "; "),
      row.materialImpact === "Yes" || row.materialFinancial === "Yes" ? "Yes" : "No",
    ]);
    added.alignment = { wrapText: true, vertical: "top" };
    added.height = 42;
  }
  sheet.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 40 }, { width: 48 }, { width: 14 }];
}

function writeImpactMetrics(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Impact Metrics");
  paintBanner(
    sheet,
    "Impact Materiality Scoring (Inside-Out)",
    "Score IROs, not topic labels. Rationale must use the scoring-key band language. Combined = severity (average of scale, scope, remediability) x likelihood probability.",
    "AF",
  );
  groupBar(sheet, ["ESRS", "", "", "", "", "", "Impacts, Risks, and Opportunities Assessment", "", "", "", "", "", "", "", "", "", "IRO Scoring", "", "", "", "", "", "", "", "", "", "Impact materiality determination"]);
  groupBar(sheet, ["", "", "", "", "", "", "", "", "", "", "", "Value chain", "", "", "", "", "Severity assessment", "", "", "", "", "", "Likelihood assessment", "", "", "Final score"], "FF3D5C4C");
  const headers = [
    "#", "ESRS", "Topic", "Sub-Topic", "ESRS Indicator", "DR", "Topic Title", "IRO Description",
    "Impact Type", "Actual vs Potential", "Negative vs Positive", "Upstream", "Own Operations", "Downstream",
    "Time Horizon", "Risk vs Opportunity", "Scale", "Rationale", "Scope", "Rationale", "Remediability", "Rationale",
    "Severity Score", "Likelihood", "Likelihood %", "Rationale", "Severity", "Likelihood %", "Combined", "Material",
    "Comments", "Recommended Metrics",
  ];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(sheet, headerRow.number);
  for (const row of ctx.iros) {
    writeIroRow(sheet, [
      row.index, row.esrs, row.topic, row.subTopic, row.indicator, row.dr, row.title, row.impactDescription,
      row.impactType, row.actualVsPotential, row.polarity, row.upstream, row.ownOps, row.downstream,
      row.timeHorizon, row.riskVsOpp, row.scale, row.scaleWhy, row.scope, row.scopeWhy, row.remediability, row.remediabilityWhy,
      row.severity, row.likelihood, row.likelihoodPct, row.likelihoodWhy, row.severity, row.likelihoodPct, row.combinedImpact,
      row.materialImpact, row.comments, row.metrics,
    ]);
  }
  sheet.columns = headers.map((header, index) => ({
    width: [7, 17, 19, 21, 25, 30, 31].includes(index) ? 42 : header.length > 16 ? 18 : 12,
  }));
}

function writeFinancialMetrics(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Financial Metrics");
  paintBanner(
    sheet,
    "Financial Materiality Scoring (Outside-In)",
    "Probability and magnitude on cash flow, costs, revenue, or assets, plus a readiness read (vulnerability of controls and velocity of cash impact). PAMSA keeps a 1-5 financial score for the chart.",
    "AD",
  );
  groupBar(sheet, ["ESRS", "", "", "", "", "", "Impacts, Risks, and Opportunities Assessment", "", "", "", "", "", "", "", "", "", "IRO Scoring", "", "", "", "Readiness assessment", "", "", "", "", "Final score"]);
  const headers = [
    "#", "ESRS", "Topic", "Sub-Topic", "ESRS Indicator", "DR", "Topic Title", "IRO Description",
    "Financial effect type", "Actual vs Potential", "Negative vs Positive", "Upstream", "Own Operations", "Downstream",
    "Time Horizon", "Risk vs Opportunity", "Magnitude", "Rationale", "Likelihood", "Rationale", "Severity",
    "Vulnerability", "Rationale", "Velocity", "Rationale", "Readiness", "Financial score (1-5)", "Material",
    "Recommended Metrics", "Disclosed",
  ];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(sheet, headerRow.number);
  for (const row of ctx.iros) {
    writeIroRow(sheet, [
      row.index, row.esrs, row.topic, row.subTopic, row.indicator, row.dr, row.title, row.financialDescription,
      row.financialImpactType, row.actualVsPotential, row.polarity, row.upstream, row.ownOps, row.downstream,
      row.financialTimeHorizon, row.riskVsOpp, row.magnitude, row.magnitudeWhy, row.finLikelihood, row.finLikelihoodWhy,
      row.finSeverity, row.vulnerability, row.vulnerabilityWhy, row.velocity, row.velocityWhy, row.readiness,
      row.financialScore, row.materialFinancial, row.metrics, row.disclosed,
    ]);
  }
  sheet.columns = headers.map((header, index) => ({
    width: [7, 17, 19, 22, 24, 28].includes(index) ? 42 : header.length > 16 ? 18 : 12,
  }));
}

function writeImpactKey(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Impact Metrics - Scoring Key");
  paintBanner(
    sheet,
    "Impact Materiality Scoring (Inside-Out)",
    "Every IRO is scored against this key. A number of tonnes is not a 4. The rationale must use the band language below.",
    "D",
  );
  keyBlock(
    sheet,
    `This aligns with ESRS 1: impacts and risks are assessed across the full value chain. For ${ctx.company} that means:\n• Upstream: sourced commodities, contractors, and supplier labour and environmental practices.\n• Own operations: facilities, operated assets, and employees the company controls.\n• Downstream: product use, customer operations, end-of-life, and host-community outcomes.\n3 is the primary location, 2 secondary, 1 tertiary, N/A if the IRO does not sit in that slice.`,
    "Relevance in the Value Chain (Upstream / Own Operation / Downstream)",
    ["Rating", "Description"],
    [
      ["3 : Primary location of impact", "Primary location where this impact occurs, where the company has highest operational control or major exposure."],
      ["2 : Secondary location of impact", "Secondary location where this impact occurs, where the company has influence but not full control."],
      ["1 : Tertiary / limited materialization", "Impact may materialise here, but to a smaller extent, and ability to influence is more limited."],
      ["N/A", "The IRO does not sit in that slice of the value chain."],
    ],
  );
  keyBlock(
    sheet,
    ctx.framework?.impactTimeHorizonRationale ||
      "Aligned to ESRS short, medium, and long horizons. Impact can already be occurring (safety, spills, community) while climate and just-transition harms sit on a longer clock. Both must be scored. Do not copy the financial year into the impact cell.",
    "Time Horizon - the time period over which the impacts will manifest",
    ["Score", "Description"],
    [
      ["1 : Short-term", "Up to 12 months"],
      ["2 : Medium-term", "12 months to 5 years"],
      ["3 : Long-term", "More than 5 years"],
    ],
  );
  keyBlock(
    sheet,
    ctx.framework?.impactBands ||
      `Scale is how grave the negative impact is, or how beneficial the positive impact is, for people or the environment. Bands are grounded in ESRS plus ${ctx.framework?.socialNormsUsed || "IPCC, ILO, OHCHR, and planetary boundaries where relevant"}. Peer DMA language is a check, not the definition of harm.`,
    "Scale of Impact - how grave the negative impact is or how beneficial the positive impact is",
    ["Score", "Description"],
    [
      ["1 - Minimal", "Very minor, short-term effect; negligible impact on wellbeing, safety, or the environment."],
      ["2 - Low", "Noticeable but contained effect; moderate influence on health, safety, environmental conditions, or operational performance."],
      ["3 - Medium", "Significant effect on wellbeing, health, ecosystems, or operational outcomes within the affected area(s), covering operations or the value chain."],
      ["4 - High", "Severe effect on human health, ecosystems, or operational performance; consequences are long-lasting and substantial across operations and the value chain."],
      ["5 - Absolute", "Maximum possible effect; critical or transformative impact, such as widespread fatalities, ecosystem collapse, or major operational disruption."],
    ],
  );
  keyBlock(
    sheet,
    "Scope is how widespread the impact is. A local fatality can still be high on scale and remediability. Scope asks how many people, sites, and geographies are in the blast radius, including the value chain.",
    "Scope of impact - How widespread is the impact?",
    ["Score", "Description"],
    [
      ["1 - Limited", "Causes little to no harm to employees, suppliers, or customers, or the environment, beyond a single site or a minimal portion of the value chain."],
      ["2 - Concentrated", "Causes some employees, suppliers, or customers inconvenience; limited environmental impact to a single geographic region or country."],
      ["3 - Medium", "Impacts a moderate number of employees, suppliers, or customers and has wider regional environmental or social consequences."],
      ["4 - Widespread", "Impacts a larger number of employees, suppliers, or customers and affects multiple environmental or social regions."],
      ["5 - Global / Total", "Impacts an exceptional number of employees, suppliers, customers, and geographies around the globe."],
    ],
  );
  keyBlock(
    sheet,
    "Remediability asks whether and to what extent negative impacts could be restored to their prior state. GHG already in the atmosphere, fatalities, and some ecosystem losses sit at the top of the scale. A closed-loop water upgrade that can be built in 12-24 months sits lower.",
    "Remediability / reversibility of impact",
    ["Score", "Description"],
    [
      ["1 - Relatively easy to remedy short-term", "Minor effect; recoverable with minimal mitigation."],
      ["2 - Remediable with effort (time and cost)", "Moderate effect; may persist for years; requires mitigation."],
      ["3 - Difficult to remedy or mid-term", "Significant, long-term effect; difficult to reverse."],
      ["4 - Very difficult to remedy or long-term", "Severe or long-lasting effect; negative impacts are hard to remediate, or positive effects require substantial effort to embed."],
      ["5 - Non remediable / irreversible", "Permanent negative impact that cannot be remedied, or transformative opportunity delivering lasting, self-sustaining benefits."],
    ],
  );
  keyBlock(
    sheet,
    "According to ESRS 1, Appendix A, likelihood is the probability of occurrence of a potential negative or positive impact. Actual impacts are scored at 1.0. The numeric probabilities below keep the team consistent when the impact is still potential.",
    "Likelihood",
    ["Score", "Probability", "Description"],
    [
      ["1 - Unlikely", 0.2, "May occur in the next 10 to 25 years."],
      ["2 - Possible", 0.4, "May occur during the next 5 to 10 years."],
      ["3 - Likely", 0.6, "Expected to occur in the next 2 to 4 years."],
      ["4 - Very likely", 0.8, "Highly probable or already emerging. Expected within the next 12 to 24 months."],
      ["5 - Actual (occurring)", 1.0, "Impact has already materialised or will materialise in the near term."],
    ],
  );
  keyBlock(
    sheet,
    [
      ctx.framework?.thresholdRationale || "A combined threshold of 3.0 was selected because it is the first band where operations or value-chain harm is evidenced.",
      ctx.framework?.thresholdRule || "Material if combined impact is 3.0 or higher, or the locked impact score is 3 or higher.",
      "Reasons, in PAMSA order: (1) matches the 1-5 key the team locked; (2) climate (E1) stays in unless disproved, which is the precautionary read ESRS expects in year one; (3) the scoring should show two clusters, not a flat list; (4) stakeholder and sector evidence can pull a 2.8 up if the harm is irreversible.",
      `IRO rows currently at or above the impact test:\n${ctx.materialImpact.map((row) => `${row.esrs} ${row.title}: ${row.combinedImpact}`).join("\n") || "none yet"}`,
      "The number above is not final and does not by itself dictate the disclosure list. Sign-off can still change scores or the threshold.",
    ].join("\n\n"),
    "Impact Materiality Determination",
    ["Item", "Value"],
    [
      ["Impact materiality threshold", ctx.framework?.thresholdRule || "Combined >= 3.0, or locked impact score >= 3, climate presumed material"],
      ["Number of material IRO rows (impact)", String(ctx.materialImpact.length)],
    ],
  );
  sheet.columns = [{ width: 78 }, { width: 42 }, { width: 28 }, { width: 72 }];
}

function writeFinancialKey(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("Financial Metrics - Scoring Key");
  paintBanner(
    sheet,
    "Financial Materiality Scoring (Outside-In)",
    "Cash flow, costs, revenue, and assets. If you cannot get inside a % band, say you lack the data, why it is not a 1-2, why it is not a 4-5, and why 3 is the honest middle.",
    "D",
  );
  keyBlock(
    sheet,
    `Same value-chain rule as the impact key, applied to where the cash lands for ${ctx.company}. A downstream water curtailment at a customer can hit aftermarket revenue even when own-site water use is modest.`,
    "Relevance in the Value Chain",
    ["Rating", "Description"],
    [
      ["3 : Primary", "The risk or opportunity is directly material at the point of occurrence, where the company has highest operational control or major financial exposure."],
      ["2 : Secondary", "The effect occurs in adjacent parts of the value chain, where the company has influence but not full control."],
      ["1 : Tertiary", "Peripheral, with low frequency or magnitude, and limited ability to influence."],
    ],
  );
  keyBlock(
    sheet,
    ctx.framework?.financialTimeHorizonRationale ||
      "Financial timing follows how the company already talks about material risk in the annual report. It may be shorter than impact timing for climate. ESRS still requires a short / medium / long read.",
    "Time Horizon",
    ["Score", "Description"],
    [
      ["1 : Short-term", "Up to 12 months"],
      ["2 : Medium-term", "12 months to 5 years"],
      ["3 : Long-term", "More than 5 years"],
    ],
  );
  keyBlock(
    sheet,
    ctx.framework?.financialBands ||
      ctx.framework?.alignedToCompanyFinancials ||
      `Magnitude is the estimated effect on ${ctx.company}'s revenue, operating costs, or assets. Bands are set in % of EBITDA or equivalent cash, then checked against the company's own risk language so we do not invent a percentage the filings do not support.`,
    "Magnitude of Financial Effect (estimated impact on revenue, costs, or assets)",
    ["Score", "Description"],
    [
      ["1 - Minor", "Under about 0.1% of EBITDA, or clearly immaterial to cash."],
      ["2 - Low", "About 0.1-0.5%."],
      ["3 - Medium", "About 0.5-2%, or a known cost / revenue pathway already in the risk report."],
      ["4 - High", "About 2-10%, or asset-impairment risk, carbon-cost exposure, or material downtime."],
      ["5 - Critical", "Over 10%, or a business-model threat (license, structural demand, exclusion from capital)."],
    ],
  );
  keyBlock(
    sheet,
    "Likelihood of the financial effect is not the same as likelihood of the environmental or social impact. A chronic climate impact can be actual while the cash hit is still only likely, if carbon prices or customer capex have not yet moved.",
    "Likelihood of Financial Effect",
    ["Score", "Probability", "Description"],
    [
      ["1 - Unlikely", "<20%", "Outcome not expected; no recorded incidents or only weak anecdotal evidence."],
      ["2 - Possible", "20-50%", "Outcome might occur at some time in the risk horizon."],
      ["3 - Likely", "50-80%", "Outcome likely to occur or recur occasionally in the horizon."],
      ["4 - Almost certain", ">80%", "Outcome will occur often, with a high level of recorded incidents or strong evidence."],
      ["5 - Certain / in force", "In force now", "Already hitting cash, or a rule already in force (tax, ETS, permit, litigation)."],
    ],
  );
  keyBlock(
    sheet,
    "Readiness is a second lens, used in peer DMA packs, so a 3 on magnitude is not treated as fully controlled. Vulnerability is the robustness of systems and controls. Velocity is how quickly the cash impact shows up.",
    "Readiness assessment (vulnerability and velocity)",
    ["Rating", "Vulnerability", "Velocity"],
    [
      ["1 - Minor", "Systems and controls respond effectively. Clear process and owners.", "Impact manifests over 6 months or longer."],
      ["2 - Moderate", "Processes exist but are not uniform across sites or business units.", "Impact manifests within 4 to 6 months."],
      ["3 - Major", "Limited or informal controls. Need enhancement.", "Impact manifests within 2 to 4 months."],
      ["4 - Critical", "No effective controls where the company is poorly positioned to act.", "Impact manifests within 21 days to 2 months."],
    ],
  );
  keyBlock(
    sheet,
    [
      ctx.framework?.thresholdRule || "Material if the locked financial score is 3 or higher.",
      ctx.framework?.alignedToCompanyFinancials || `Aligned to ${ctx.company}'s own description of material financial risk.`,
      `IRO rows currently at or above the financial test:\n${ctx.materialFinancial.map((row) => `${row.esrs} ${row.title}: ${row.financialScore}`).join("\n") || "none yet"}`,
      "This pack does not convert scores into a 0-50 product. The 1-5 key is the one the team locked. Pricing models, if any, start only after DMA sign-off.",
    ].join("\n\n"),
    "Financial Materiality Determination",
    ["Item", "Value"],
    [
      ["Financial materiality threshold", ctx.framework?.thresholdRule || "Financial score >= 3, climate presumed material"],
      ["Number of material IRO rows (financial)", String(ctx.materialFinancial.length)],
    ],
  );
  sheet.columns = [{ width: 78 }, { width: 42 }, { width: 36 }, { width: 72 }];
}

function writeEsrs(workbook: ExcelJS.Workbook, ctx: DmaContext) {
  const sheet = workbook.addWorksheet("ESRS Indicators");
  paintBanner(
    sheet,
    "ESRS Indicators",
    "Map each IRO to the ESRS topic, disclosure requirement, paragraph, and the metric that measures why it scored high. Internal = enterprise value. External = people and environment.",
    "I",
  );
  sheet.addRow([]);
  const header = sheet.addRow([
    "ESRS", "DR", "Paragraph", "Name", "ESRS Topic Title (team topic)", "IRO",
    "Internal (enterprise value)", "External (people and environment)", "Recommended metric",
  ]);
  styleHeaderRow(sheet, header.number);
  for (const row of esrsIndicatorRows(ctx)) {
    const added = sheet.addRow([
      row.esrs, row.dr, row.paragraph, row.name, row.topic, row.iro, row.internal, row.external, row.metric,
    ]);
    added.alignment = { wrapText: true, vertical: "top" };
    added.height = row.internal || row.external ? 90 : 28;
  }
  sheet.columns = [
    { width: 10 }, { width: 14 }, { width: 18 }, { width: 46 }, { width: 36 },
    { width: 28 }, { width: 48 }, { width: 48 }, { width: 40 },
  ];
}

function writeRefs(workbook: ExcelJS.Workbook, engagement: Engagement) {
  const sheet = workbook.addWorksheet("References");
  paintBanner(sheet, "References", "Method sources first, then company documents and engagement citations. Every IRO rationale should be traceable here.", "E");
  sheet.addRow([]);
  const header = sheet.addRow(["Reference Number", "Author / Organisation", "Year", "Title of webpage / document", "Sources"]);
  styleHeaderRow(sheet, header.number);
  referenceRows(engagement).forEach((row, index) => {
    const added = sheet.addRow([index + 1, row.org, row.year, row.title, row.url]);
    added.alignment = { wrapText: true, vertical: "top" };
    added.height = 28;
  });
  sheet.columns = [{ width: 18 }, { width: 28 }, { width: 10 }, { width: 70 }, { width: 56 }];
}

function writeSignOff(workbook: ExcelJS.Workbook, engagement: Engagement) {
  const sheet = workbook.addWorksheet("Sign-off");
  paintBanner(sheet, "DMA sign-off", "Complete before pricing scope. This pack does not start models.", "D");
  sheet.addRow([]);
  const header = sheet.addRow(["Item", "What it means", "Agreed", "Notes"]);
  styleHeaderRow(sheet, header.number);
  for (const item of SIGN_OFF_ITEMS) {
    const state = engagement.signOff[item.id];
    const row = sheet.addRow([item.label, item.description, state?.agreed ? "Yes" : "No", state?.notes || ""]);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 48;
  }
  sheet.columns = [{ width: 36 }, { width: 70 }, { width: 12 }, { width: 36 }];
}

function writeFindings(workbook: ExcelJS.Workbook, engagement: Engagement) {
  const sheet = workbook.addWorksheet("Review Findings");
  paintBanner(
    sheet,
    "Review findings",
    "Analyst calls that fed the DMA. Each accepted card should appear as one or more IRO rows on Impact Metrics and Financial Metrics.",
    "K",
  );
  sheet.addRow([]);
  const header = sheet.addRow([
    "Pillar", "ESRS", "Issue", "Definition", "Evidence", "Why the company is exposed",
    "Company disclosure", "Impact materiality (working)", "Financial materiality (working)", "Call", "Confidence",
  ]);
  styleHeaderRow(sheet, header.number);
  for (const card of engagement.artifacts.discoveryCards || []) {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction || "pending";
    const row = sheet.addRow([
      card.pillar || "", card.esrs || "", card.issue, card.definition, card.evidence,
      card.whyExposure || "", card.companyDisclosure || "", card.impactMateriality || "",
      card.financialMateriality || "", reaction, card.confidence,
    ]);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 72;
  }
  sheet.columns = [
    { width: 14 }, { width: 10 }, { width: 28 }, { width: 36 }, { width: 36 },
    { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 16 }, { width: 12 },
  ];
}

export async function buildEngagementWorkbook(engagement: Engagement) {
  const ctx = buildDmaContext(engagement);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PAMSA";
  workbook.created = new Date();
  workbook.company = ctx.company;
  workbook.description = `${ctx.company} double materiality assessment (DMA pack, before pricing)`;
  writeCover(workbook, ctx);
  writeEssays(workbook, "Introduction", "Introduction", `Company context, why DMA, and ESRS alignment for ${ctx.company}`, introductionSections(ctx));
  writeEssays(
    workbook,
    "Methodology",
    "Methodology",
    "How impact and financial materiality are scored, why these criteria, and how metrics are mapped.",
    methodologySections(ctx),
  );
  writeChart(workbook, ctx);
  writeImpactMetrics(workbook, ctx);
  writeImpactKey(workbook, ctx);
  writeFinancialMetrics(workbook, ctx);
  writeFinancialKey(workbook, ctx);
  writeEsrs(workbook, ctx);
  writeRefs(workbook, engagement);
  writeSignOff(workbook, engagement);
  writeFindings(workbook, engagement);
  return workbook.xlsx.writeBuffer();
}
