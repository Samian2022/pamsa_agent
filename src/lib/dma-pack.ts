import type {
  DiscoveryCard,
  Engagement,
  IssueScore,
  ScoringFramework,
} from "./types";

export type DmaIro = {
  index: number;
  esrs: string;
  topic: string;
  subTopic: string;
  indicator: string;
  dr: string;
  title: string;
  impactDescription: string;
  financialDescription: string;
  impactType: string;
  financialImpactType: string;
  actualVsPotential: string;
  polarity: string;
  upstream: string;
  ownOps: string;
  downstream: string;
  timeHorizon: string;
  financialTimeHorizon: string;
  riskVsOpp: string;
  scale: number;
  scaleWhy: string;
  scope: number;
  scopeWhy: string;
  remediability: number;
  remediabilityWhy: string;
  severity: number;
  likelihood: number;
  likelihoodPct: number;
  likelihoodWhy: string;
  combinedImpact: number;
  materialImpact: string;
  comments: string;
  metrics: string;
  magnitude: number;
  magnitudeWhy: string;
  finLikelihood: number;
  finLikelihoodWhy: string;
  finSeverity: number;
  vulnerability: number;
  vulnerabilityWhy: string;
  velocity: number;
  velocityWhy: string;
  readiness: number;
  combinedFinancial: number;
  materialFinancial: string;
  financialScore: number;
  impactScore: number;
  disclosed: string;
  evidence: string;
};

export type DmaContext = {
  company: string;
  preparedBy: string;
  date: string;
  stageLabel: string;
  accepted: string[];
  framework?: ScoringFramework;
  snapshotBits: string[];
  documents: string[];
  stakeholders: string;
  peers: string;
  disclosure: string;
  business: string;
  supply: string;
  finance: string;
  regulation: string;
  risks: string;
  iros: DmaIro[];
  materialImpact: DmaIro[];
  materialFinancial: DmaIro[];
};

const TOPIC: Record<string, string> = {
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

const SUBTOPIC: Record<string, string> = {
  E1: "Climate change mitigation and energy",
  E2: "Pollution to air, water, and soil",
  E3: "Water consumption and withdrawal",
  E4: "Ecosystems and land use",
  E5: "Resource inflows, outflows, and waste",
  S1: "Working conditions: health, safety, and just transition",
  S2: "Working conditions and other work-related rights",
  S3: "Communities' economic, social, and cultural rights",
  S4: "Information-related and personal safety of consumers",
  G1: "Corporate culture, corruption, and tax",
};

const FINANCIAL_TYPE: Record<string, string> = {
  E1: "Profitability and cash flow; access to capital; reputation and access to markets",
  E2: "Profitability; compliance and litigation; license to operate",
  E3: "Profitability; operational continuity; permit risk",
  E4: "License to operate; access to capital; project delay",
  E5: "Profitability; regulation; product-market access",
  S1: "Operational efficiency; access to employees; claims and insurance",
  S2: "Supply continuity; litigation; reputation",
  S3: "License to operate; project delay; reputation",
  S4: "Revenue; recalls and litigation; brand",
  G1: "Fines; access to capital; contract eligibility",
};

const METRICS: Record<string, string> = {
  E1: [
    "Scope 1, 2, and 3 GHG emissions (absolute and intensity, tCO2e and tCO2e / revenue)",
    "Share of renewable energy in own operations (%)",
    "Energy intensity (MWh / unit of output)",
    "Share of revenue from low-carbon products or services",
    "Internal carbon price applied ($ / tCO2e) and coverage of gross emissions",
    "Avoided emissions enabled for customers, where the business model supports it",
  ].join("\n"),
  E2: [
    "Significant air, water, and soil pollutants released (tonnes), by substance",
    "Number and volume of hydrocarbon or chemical spills (above the company's reporting threshold)",
    "Methane intensity where oil, gas, or livestock methane is in scope",
    "Share of sites with pollution-prevention controls aligned to BAT or equivalent",
    "Fines, provisions, and remediation spend linked to pollution events",
  ].join("\n"),
  E3: [
    "Total water withdrawal, consumption, and discharge (m3), split by water-stressed basins",
    "Share of sites and key suppliers in high or extremely high baseline water stress",
    "Share of water recycled or reused (%)",
    "Water intensity (m3 / revenue or / unit of output)",
    "Number of sites with revised withdrawal permits or tariff shocks in the year",
  ].join("\n"),
  E4: [
    "Sites in or near biodiversity-sensitive areas, with mitigation status",
    "Land disturbed, restored, and net change (hectares)",
    "Share of sourcing from deforestation- or conversion-free commodities",
    "Number of grievances related to land, FPIC, or ecosystem services",
  ].join("\n"),
  E5: [
    "Resource inflows by weight (technical and biological), including recycled content (%)",
    "Waste generated, diverted from disposal, and directed to disposal (tonnes)",
    "Hazardous waste directed to disposal",
    "Share of products designed for reuse, repair, or recycling",
    "Revenue from circular or waste-reduction offerings",
  ].join("\n"),
  S1: [
    "Work-related fatalities and Total Recordable Incident Rate (own workforce and contractors on site)",
    "Lost-time injury frequency rate and days lost",
    "Share of workforce covered by an ISO 45001 or equivalent H&S system",
    "Just-transition metrics: reskilling hours, internal fills into low-carbon roles, planned reductions",
    "Gender pay gap, eNPS or engagement score, and training hours per FTE",
  ].join("\n"),
  S2: [
    "Share of procurement spend covered by human-rights and H&S due diligence",
    "Number of high-risk suppliers audited and CAP closure within 90 days (%)",
    "Value-chain fatalities or recordable incidents linked to the company's products or contractors",
    "Wage non-compliance, child labour, and forced-labour findings, with workers remediated",
    "Living-wage coverage at high-risk suppliers (%)",
  ].join("\n"),
  S3: [
    "Community grievances opened, resolved, and median days to close",
    "Number of sites with FPIC or equivalent community-consent processes",
    "Community investment and local hiring in host communities",
    "Significant disputes over land, water, health, or livelihoods, including litigation",
  ].join("\n"),
  S4: [
    "Recalls, illnesses, and deaths linked to products",
    "Customer complaints on product safety or integrity",
    "Share of products meeting applicable safety or nutrition standards",
  ].join("\n"),
  G1: [
    "Confirmed incidents of corruption and fines",
    "Country-by-country tax and payments to governments",
    "Whistleblower cases opened and substantiated",
    "Share of suppliers selected using social and environmental criteria",
  ].join("\n"),
};

const DRS: Record<string, { dr: string; paragraph: string; name: string }[]> = {
  E1: [
    { dr: "E1.IRO-1", paragraph: "20a, AR 9-10", name: "Description of process in relation to impacts on climate change" },
    { dr: "E1.IRO-1", paragraph: "20b, AR 13-14", name: "Process in relation to climate-related physical risks in own operations and along the value chain" },
    { dr: "E1-1", paragraph: "MDR-P", name: "Transition plan for climate change mitigation" },
    { dr: "E1-5", paragraph: "37, AR 33-35", name: "Energy consumption and mix" },
    { dr: "E1-6", paragraph: "44-52", name: "Gross Scopes 1, 2, 3 and total GHG emissions" },
    { dr: "E1-8", paragraph: "63", name: "Internal carbon pricing" },
    { dr: "E1-9", paragraph: "66a, AR 70", name: "Assets at material physical risk before considering adaptation actions" },
  ],
  E2: [
    { dr: "E2.IRO-1", paragraph: "11", name: "Description of processes to identify pollution-related IROs" },
    { dr: "E2-4", paragraph: "28", name: "Pollution of air, water and soil" },
    { dr: "E2-5", paragraph: "34", name: "Substances of concern and substances of very high concern" },
  ],
  E3: [
    { dr: "E3.IRO-1", paragraph: "8", name: "Description of processes to identify water and marine IROs" },
    { dr: "E3-4", paragraph: "28", name: "Water consumption" },
    { dr: "E3-1", paragraph: "11", name: "Policies related to water and marine resources" },
  ],
  E4: [
    { dr: "E4.IRO-1", paragraph: "17, AR 4-9", name: "Process to identify biodiversity and ecosystem IROs" },
    { dr: "SBM-3", paragraph: "16", name: "Material impacts on biodiversity-sensitive areas and land degradation" },
  ],
  E5: [
    { dr: "E5.IRO-1", paragraph: "11", name: "Description of processes to identify resource-use and circular-economy IROs" },
    { dr: "E5-4", paragraph: "30", name: "Resource inflows" },
    { dr: "E5-5", paragraph: "36-37", name: "Resource outflows and waste" },
  ],
  S1: [
    { dr: "S1.IRO-1", paragraph: "ESRS 2", name: "Assessing impacts, risks and opportunities on own workforce" },
    { dr: "S1-14", paragraph: "88", name: "Health and safety metrics" },
    { dr: "S1-13", paragraph: "83", name: "Training and skills development" },
    { dr: "S1-16", paragraph: "97", name: "Remuneration metrics (pay gap and total remuneration)" },
  ],
  S2: [
    { dr: "S2.IRO-1", paragraph: "ESRS 2", name: "Assessing IROs related to value-chain workers" },
    { dr: "S2-1", paragraph: "17a", name: "Policies related to value-chain workers, including human rights" },
    { dr: "S2-4", paragraph: "32d, AR 33-35", name: "Tracking effectiveness of actions for value-chain workers" },
    { dr: "SBM-3", paragraph: "11b", name: "Geographies or commodities with significant risk of child or forced labour" },
  ],
  S3: [
    { dr: "S3.IRO-1", paragraph: "ESRS 2", name: "Assessing IROs related to affected communities" },
    { dr: "S3-1", paragraph: "15", name: "Policies for preventing and addressing impacts on indigenous peoples" },
    { dr: "S3-4", paragraph: "32", name: "Taking action on material impacts on affected communities" },
  ],
  S4: [
    { dr: "S4.IRO-1", paragraph: "ESRS 2", name: "Assessing IROs related to consumers and end-users" },
    { dr: "S4-4", paragraph: "31", name: "Taking action on material impacts on consumers and end-users" },
  ],
  G1: [
    { dr: "G1-1", paragraph: "7-10", name: "Corporate culture and business-conduct policies" },
    { dr: "G1-2", paragraph: "15b", name: "Management of relationships with suppliers" },
    { dr: "G1-4", paragraph: "24", name: "Incidents of corruption or bribery" },
  ],
};

const DEFAULT_BANDS: Record<string, { scale: number; scope: number; rem: number; like: number; mag: number; finLike: number; vuln: number; vel: number }> = {
  E1: { scale: 5, scope: 4, rem: 5, like: 5, mag: 4, finLike: 4, vuln: 3, vel: 2 },
  E2: { scale: 4, scope: 3, rem: 4, like: 4, mag: 3, finLike: 3, vuln: 3, vel: 3 },
  E3: { scale: 4, scope: 4, rem: 3, like: 4, mag: 3, finLike: 3, vuln: 3, vel: 3 },
  E4: { scale: 4, scope: 3, rem: 5, like: 3, mag: 3, finLike: 2, vuln: 3, vel: 2 },
  E5: { scale: 4, scope: 3, rem: 4, like: 4, mag: 3, finLike: 3, vuln: 3, vel: 2 },
  S1: { scale: 4, scope: 4, rem: 4, like: 5, mag: 3, finLike: 4, vuln: 2, vel: 3 },
  S2: { scale: 4, scope: 3, rem: 3, like: 3, mag: 3, finLike: 3, vuln: 3, vel: 3 },
  S3: { scale: 4, scope: 3, rem: 4, like: 3, mag: 3, finLike: 3, vuln: 3, vel: 3 },
  S4: { scale: 4, scope: 3, rem: 4, like: 3, mag: 3, finLike: 3, vuln: 2, vel: 3 },
  G1: { scale: 3, scope: 3, rem: 2, like: 3, mag: 3, finLike: 3, vuln: 2, vel: 2 },
};

function esrsCode(raw?: string) {
  const key = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
  return TOPIC[key] ? key : "";
}

function join(parts: (string | undefined | false)[]) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

function clamp(n: number, min = 1, max = 5) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function likePct(score: number) {
  return [0, 0.2, 0.4, 0.6, 0.8, 1][clamp(score)] ?? 0.6;
}

function avg(nums: number[]) {
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

function location(esrs: string, valueChain?: string) {
  const text = (valueChain || "").toLowerCase();
  const up = /up/.test(text);
  const own = /own|ops|operation/.test(text);
  const down = /down/.test(text);
  if (up || own || down) {
    return {
      upstream: up ? "3" : "N/A",
      ownOps: own ? "3" : "2",
      downstream: down ? "3" : "N/A",
    };
  }
  const map: Record<string, { upstream: string; ownOps: string; downstream: string }> = {
    E1: { upstream: "2", ownOps: "3", downstream: "3" },
    E2: { upstream: "2", ownOps: "3", downstream: "2" },
    E3: { upstream: "3", ownOps: "3", downstream: "2" },
    E4: { upstream: "3", ownOps: "2", downstream: "2" },
    E5: { upstream: "2", ownOps: "2", downstream: "3" },
    S1: { upstream: "N/A", ownOps: "3", downstream: "N/A" },
    S2: { upstream: "3", ownOps: "2", downstream: "2" },
    S3: { upstream: "2", ownOps: "3", downstream: "2" },
    S4: { upstream: "1", ownOps: "2", downstream: "3" },
    G1: { upstream: "2", ownOps: "3", downstream: "1" },
  };
  return map[esrs] || { upstream: "2", ownOps: "3", downstream: "2" };
}

function scaleWhy(company: string, issue: string, score: number, evidence: string) {
  const band: Record<number, string> = {
    1: "This sits in the minimal band: a very minor, short-term effect with negligible impact on wellbeing, safety, or the environment.",
    2: "This sits in the low band: a noticeable but contained effect with moderate influence on health, safety, environmental conditions, or operational performance.",
    3: "This sits in the medium band: a significant effect on wellbeing, health, ecosystems, or operational outcomes within the affected area, covering operations and the value chain.",
    4: "This sits in the high band: a severe effect on human health, ecosystems, or operational performance, with consequences that are long-lasting and substantial across operations and the value chain.",
    5: "This sits in the absolute band: a critical or transformative impact, such as widespread harm, ecosystem collapse, or major operational disruption, already locked into the business model.",
  };
  return join([
    `${company}: ${issue}. ${band[score]}`,
    evidence ? `Evidence used: ${evidence}` : "Evidence is drawn from the accepted finding, uploaded filings, and public record. Where a precise volume is missing, the band is set by severity of harm, not by inventing a tonne figure.",
  ]);
}

function scopeWhy(company: string, score: number, evidence: string) {
  const band: Record<number, string> = {
    1: "Limited stakeholder exposure: little harm to employees, suppliers, customers, or the environment, confined to a narrow slice of the value chain.",
    2: "Concentrated: some employees, suppliers, or customers are affected, with environmental impact largely in a single geography.",
    3: "Medium: a moderate number of employees, suppliers, or customers, with wider regional environmental or social consequences.",
    4: "Widespread: a larger number of employees, suppliers, customers, and communities, affecting multiple regions where the company operates or sources.",
    5: "Global or total: an exceptional number of stakeholders and geographies around the company's operations and value chain.",
  };
  return join([`${company} scope rating. ${band[score]}`, evidence]);
}

function remWhy(score: number, evidence: string) {
  const band: Record<number, string> = {
    1: "Relatively easy to remedy in the short term: minor effect, recoverable with minimal mitigation.",
    2: "Remediable with effort (time and cost): moderate effect that may persist for years and requires a mitigation programme.",
    3: "Difficult to remedy in the mid term: significant, long-term effect that is hard to reverse without structural change.",
    4: "Very difficult to remedy or long-term: severe or long-lasting effect; negative impacts are hard to remediate, or positive effects require substantial effort to embed.",
    5: "Non-remediable or irreversible: permanent negative impact that cannot be restored to the prior state, or a transformative opportunity that delivers lasting, self-sustaining benefits.",
  };
  return join([band[score], evidence]);
}

function likeWhy(score: number, actual: string, evidence: string) {
  const band: Record<number, string> = {
    1: "Unlikely (about 0.2): may occur in the next 10 to 25 years. Few recorded incidents.",
    2: "Possible (about 0.4): may occur during the next 5 to 10 years.",
    3: "Likely (about 0.6): expected to occur in the next 2 to 4 years, or to recur occasionally in the horizon.",
    4: "Very likely (about 0.8): highly probable or already emerging. Expected within 12 to 24 months.",
    5: "Actual / occurring (1.0): the impact has already materialised or will materialise in the near term. ESRS treats likelihood as 1 when the impact is actual.",
  };
  return join([
    actual === "Actual" ? "Classed as actual, so likelihood is scored at the top of the key unless the residual risk is clearly forward-looking." : "Classed as potential.",
    band[score],
    evidence,
  ]);
}

function magWhy(company: string, score: number, evidence: string) {
  const band: Record<number, string> = {
    1: "Minor financial effect: under about 0.1% of EBITDA, or clearly immaterial to cash, costs, or assets.",
    2: "Low: about 0.1-0.5%, or a contained cost / revenue pathway that does not yet move enterprise value.",
    3: "Medium: about 0.5-2%, or a known cost, revenue, or asset pathway already recognised in the annual-report risk language.",
    4: "High: about 2-10%, or asset-impairment, carbon-cost, or downtime risk that would influence investor or lender decisions.",
    5: "Critical: over 10%, or a business-model threat (loss of license, structural demand destruction, or exclusion from capital).",
  };
  return join([
    `${company} financial magnitude. ${band[score]}`,
    "Where a precise % of revenue is not disclosed, the band is set from the company's own risk language, peer DMA practice, and whether a cash pathway is already evidenced. Precision is not invented.",
    evidence,
  ]);
}

function impactNarrative(company: string, card: DiscoveryCard | undefined, score: IssueScore | undefined, esrs: string, title: string, kind: "impact" | "opportunity") {
  const loc = location(esrs, score?.valueChainLocation);
  const def = score?.iroDescription || score?.definition || card?.definition || `${title} is in the accepted finding set for ${company}.`;
  const ev = score?.impactEvidence || card?.evidence || card?.operationsSignal || "";
  const disc = card?.companyDisclosure || score?.disclosureStatus || "";
  const why = card?.whyExposure || "";
  const impact = card?.impactMateriality || "";
  const next = card?.nextInvestigation || "";
  if (kind === "opportunity") {
    return join([
      `${title} is scored as a positive inside-out opportunity under ESRS ${esrs} (${TOPIC[esrs]}). The same topic that creates harm can create a benefit if ${company} changes how it operates, what it sells, and how it contracts.`,
      `Own operations: energy mix, process design, abatement, training, or operating standards are the levers the company controls. Adoption of those levers reduces the scale and remediability burden of the related negative IRO, and is the slice ESRS still requires even when most of the footprint sits downstream.`,
      `Downstream and upstream: customers, suppliers, and host communities are the other locations where a positive impact can land. ESRS does not allow the assessment to stop at owned sites. ${why}`,
      def,
      ev ? `Evidence used for this row: ${ev}` : "",
      disc ? `What the company already says: ${disc}` : "Disclosure on the opportunity is typically thinner than on the related negative IRO. The metric column therefore emphasises outcome metrics (avoided emissions, water saved, incidents avoided), not only spend.",
      next ? `Still to lock: ${next}` : "",
    ]);
  }
  return join([
    `${title} is scored as an inside-out ${kind} under ESRS ${esrs} (${TOPIC[esrs]}). The test is harm or benefit to people and the environment, across operations and the value chain, not whether the company already reports a KPI.`,
    `Own operations (${loc.ownOps === "3" ? "primary location" : loc.ownOps === "N/A" ? "not the primary slice" : "secondary location"}): ${def}`,
    loc.upstream !== "N/A"
      ? `Upstream (${loc.upstream === "3" ? "primary" : "secondary"}): suppliers, feedstocks, contractors, joint ventures, and sourced commodities transmit this impact into ${company}'s value chain. ${why || "ESRS requires this slice even when the company reports mainly on the operated boundary. Non-operated and contractor coverage is often the disclosure gap that keeps confidence below high."}`
      : "Upstream is marked N/A on this row because the IRO does not sit in sourcing or contractor activity. That is a location call, not a claim that the supply chain is clean.",
    loc.downstream !== "N/A"
      ? `Downstream (${loc.downstream === "3" ? "primary" : "secondary"}): product use, customer operations, end-of-life, and host-community outcomes sit here. ${impact || "If most of the footprint is in product use or customer sites, own-ops metrics alone will understate scale and scope."}`
      : "Downstream is marked N/A on this row because the IRO does not sit in product use or customer operations.",
    ev ? `Evidence: ${ev}` : "Evidence is taken from the accepted finding, uploaded filings, operations signals, and the public record. Where a precise volume is missing, the band is set by severity of harm, not by inventing a tonne figure.",
    disc ? `Disclosure status: ${disc}` : "Disclosure is partial or silent on at least one ESRS data point that would measure why this IRO scored high.",
    next ? `Investigation still open: ${next}` : "",
    "Time horizon is set independently of the financial axis. Chronic climate and just-transition harms can be long-term on impact while the cash hit is nearer term.",
  ]);
}

function financialNarrative(company: string, card: DiscoveryCard | undefined, score: IssueScore | undefined, esrs: string, title: string, kind: "risk" | "opportunity") {
  const fin = score?.financialEvidence || card?.financialMateriality || "";
  const why = card?.whyExposure || "";
  const disc = card?.companyDisclosure || score?.disclosureStatus || "";
  if (kind === "opportunity") {
    return join([
      `${title} is also an outside-in opportunity for ${company}. Credible mitigation, product redesign, or due diligence can protect access to capital, win tenders that now screen on ESG, and open product lines that customers will pay for.`,
      "Financial channels: (1) revenue from solutions that reduce the customer's impact; (2) lower cost of debt or equity when disclosure and performance are credible; (3) avoided carbon, water, waste, incident, or permit costs; (4) capex that is recovered through efficiency or through customer willingness to pay.",
      fin || why,
      disc ? `How this currently shows up in reporting: ${disc}` : "",
      "This is scored on probability of hitting cash, magnitude on revenue / costs / assets, and time horizon. It is not a copy of the impact score. A strong inside-out opportunity can still be a modest financial 3 if the revenue line is not yet material to the group.",
    ]);
  }
  return join([
    `${title} transmits into ${company}'s enterprise value through ${FINANCIAL_TYPE[esrs] || "costs, cash flow, and access to capital"}.`,
    "Outside-in channels typically include: operating cost (energy, water, waste, incidents, permits); downtime and lost production or aftermarket; provisions, fines, and litigation; higher WACC or lost tenders when disclosure or performance lags; capex brought forward for abatement that cannot be recovered in price.",
    fin || why || "The annual-report risk language, peer DMA practice, and operations evidence are used where a modelled dollar figure is not yet locked. Precision is not invented.",
    disc ? `Disclosure status of the financial pathway: ${disc}` : "The company may describe this as a principal risk without quantifying EBITDA sensitivity. That is enough to support a mid band. It is not enough to support a 5.",
    "Time horizon on the financial axis follows how the company already talks about material risk. It may be shorter than the impact horizon. If they differ, that is stated on the row rather than copied across.",
    "Readiness (vulnerability of controls and velocity of cash impact) sits in the adjacent columns so a 3 on magnitude is not treated as fully controlled.",
  ]);
}

function buildOneIro(options: {
  company: string;
  index: number;
  card?: DiscoveryCard;
  score?: IssueScore;
  esrs: string;
  title: string;
  subTopic: string;
  kind: "impact" | "opportunity";
  polarity: "Negative" | "Positive";
  riskVsOpp: "Impact" | "Risk" | "Opportunity";
}): DmaIro {
  const { company, card, score, esrs } = options;
  const bands = DEFAULT_BANDS[esrs] || DEFAULT_BANDS.E1;
  const scale = score?.impactScale?.score ?? bands.scale;
  const scope = score?.impactScope?.score ?? bands.scope;
  const rem = score?.impactRemediability?.score ?? bands.rem;
  const like = score?.impactLikelihood?.score ?? (score?.actualVsPotential === "potential" ? Math.max(3, bands.like - 1) : bands.like);
  const mag = score?.financialMagnitude?.score ?? bands.mag;
  const finLike = score?.financialProbability?.score ?? bands.finLike;
  const severity = avg([scale, scope, rem]);
  const pct = likePct(like);
  const combinedImpact = Number((severity * pct).toFixed(2));
  const impactScore = score?.impactScore ?? clamp(severity);
  const financialScore = score?.financialScore ?? clamp((mag + finLike) / 2);
  const loc = location(esrs, score?.valueChainLocation);
  const evidence = score?.impactEvidence || card?.evidence || "";
  const finEvidence = score?.financialEvidence || card?.financialMateriality || "";
  const thresholdHitImpact = combinedImpact >= 3 || impactScore >= 3;
  const thresholdHitFin = financialScore >= 3;
  const materialForced = esrs === "E1";
  const metrics =
    (score?.recommendedMetrics || []).map((item) => `• ${item.metric}${item.whyLinkedToCriteria ? ` (${item.whyLinkedToCriteria})` : ""}`).join("\n") ||
    score?.recommendedMetric ||
    card?.esrsExpectation ||
    METRICS[esrs] ||
    "";
  const vuln = bands.vuln;
  const vel = bands.vel;
  const readiness = vuln + vel;
  return {
    index: options.index,
    esrs,
    topic: TOPIC[esrs] || options.title,
    subTopic: options.subTopic,
    indicator: "Assessing impacts, risks and opportunities",
    dr: `${esrs}.IRO-1`,
    title: options.title,
    impactDescription: impactNarrative(company, card, score, esrs, options.title, options.kind),
    financialDescription: financialNarrative(company, card, score, esrs, options.title, options.kind === "opportunity" ? "opportunity" : "risk"),
    impactType: card?.pillar === "social" ? "Social" : card?.pillar === "governance" ? "Governance" : "Environmental",
    financialImpactType: FINANCIAL_TYPE[esrs] || "Profitability and cash flow",
    actualVsPotential: score?.actualVsPotential === "potential" ? "Potential" : "Actual",
    polarity: options.polarity,
    upstream: loc.upstream,
    ownOps: loc.ownOps,
    downstream: loc.downstream,
    timeHorizon: score?.impactTimeHorizon || (esrs === "E1" ? "Long-term" : esrs === "S1" ? "Short-term" : "Medium-term"),
    financialTimeHorizon: score?.financialTimeHorizon || score?.impactTimeHorizon || "Medium-term",
    riskVsOpp: options.riskVsOpp,
    scale,
    scaleWhy: score?.impactScale?.rationale || scaleWhy(company, options.title, scale, evidence),
    scope,
    scopeWhy: score?.impactScope?.rationale || scopeWhy(company, scope, evidence),
    remediability: rem,
    remediabilityWhy: score?.impactRemediability?.rationale || remWhy(rem, evidence),
    severity,
    likelihood: like,
    likelihoodPct: pct,
    likelihoodWhy: score?.impactLikelihood?.rationale || likeWhy(like, score?.actualVsPotential === "potential" ? "Potential" : "Actual", evidence),
    combinedImpact,
    materialImpact: materialForced || score?.material || thresholdHitImpact ? "Yes" : "No",
    comments: join([
      score?.companyJudgment,
      score?.materialRationale,
      card?.nextInvestigation,
      esrs === "E1" ? "Climate (E1) is presumed material unless the analyst proves it is not." : "",
      "Scores use the PAMSA 1-5 key. Rationale uses the band language from Impact Metrics - Scoring Key.",
    ]),
    metrics,
    magnitude: mag,
    magnitudeWhy: score?.financialMagnitude?.rationale || magWhy(company, mag, finEvidence),
    finLikelihood: finLike,
    finLikelihoodWhy: score?.financialProbability?.rationale || likeWhy(finLike, "Potential", finEvidence),
    finSeverity: Number((mag * (finLike / 5) * 5).toFixed(2)),
    vulnerability: vuln,
    vulnerabilityWhy: join([
      vuln <= 2
        ? "Systems and controls exist (policies, KPIs, audits) but are not uniform across sites or the value chain. Residual exposure remains."
        : "Controls are incomplete on this IRO. The company has influence, not full control, especially beyond the operated boundary.",
      finEvidence,
    ]),
    velocity: vel,
    velocityWhy:
      vel >= 3
        ? "Financial effects can accrue inside one to two quarters (incidents, permit shocks, customer curtailment, carbon-cost invoices)."
        : "Financial effects typically accrue over a longer planning cycle (capex, customer conversion, regulation with consultation).",
    readiness,
    combinedFinancial: Number((financialScore * 1).toFixed(2)),
    materialFinancial: materialForced || score?.material || thresholdHitFin ? "Yes" : "No",
    financialScore,
    impactScore,
    disclosed: score?.disclosed ? "Yes, at least in part" : card?.companyDisclosure ? "Partial" : "No / not at ESRS grain",
    evidence,
  };
}

export function buildDmaContext(engagement: Engagement): DmaContext {
  const company = engagement.artifacts.selectedCompany || engagement.title;
  const snap = engagement.artifacts.snapshot;
  const cards = engagement.artifacts.discoveryCards || [];
  const scores = engagement.artifacts.issueScores || [];
  const acceptedNames = engagement.discoveryLog.filter((item) => item.reaction === "accepted").map((item) => item.issue);
  const acceptedSet = new Set(acceptedNames.map((name) => name.toLowerCase()));
  const names = (scores.length ? scores.map((item) => item.issue) : cards.map((card) => card.issue)).filter(
    (name, index, all) => all.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index,
  );
  const usable = names.filter((name) => !acceptedSet.size || acceptedSet.has(name.toLowerCase()) || names.length <= 8);
  const sourceNames = usable.length ? usable : names;
  const iros: DmaIro[] = [];
  let index = 1;
  for (const name of sourceNames) {
    const score = scores.find((item) => item.issue.toLowerCase() === name.toLowerCase());
    const card = cards.find((item) => item.issue.toLowerCase() === name.toLowerCase());
    const esrs =
      esrsCode(score?.esrsTopic || score?.esrs || card?.esrs) ||
      (card?.pillar === "social" ? "S1" : card?.pillar === "governance" ? "G1" : "E1");
    const sub = score?.topicArea || SUBTOPIC[esrs] || name;
    iros.push(
      buildOneIro({
        company,
        index,
        card,
        score,
        esrs,
        title: name,
        subTopic: sub,
        kind: score?.polarity === "positive" || score?.iroKind === "opportunity" ? "opportunity" : "impact",
        polarity: score?.polarity === "positive" ? "Positive" : "Negative",
        riskVsOpp: score?.iroKind === "opportunity" ? "Opportunity" : score?.iroKind === "impact" ? "Impact" : "Risk",
      }),
    );
    index += 1;
    const splits: { title: string; subTopic: string; kind: "impact" | "opportunity"; polarity: "Negative" | "Positive"; riskVsOpp: "Impact" | "Risk" | "Opportunity" }[] = [];
    if (esrs === "E1" && !/mitigat|renewable|transition/i.test(name)) {
      splits.push({
        title: `${name} - mitigation opportunity`,
        subTopic: "Climate change mitigation",
        kind: "opportunity",
        polarity: "Positive",
        riskVsOpp: "Opportunity",
      });
    }
    if (esrs === "E3" && !/withdraw|downstream|customer/i.test(name)) {
      splits.push({
        title: `${name} - customer and basin curtailment`,
        subTopic: "Water consumption (downstream)",
        kind: "impact",
        polarity: "Negative",
        riskVsOpp: "Risk",
      });
    }
    if (esrs === "S1" && /workforce|just transition|safety/i.test(name) && !/dei|diversity|equal/i.test(name)) {
      splits.push({
        title: `${name} - skills, reskilling, and equal treatment`,
        subTopic: "Equal treatment and opportunities / just transition",
        kind: "opportunity",
        polarity: "Positive",
        riskVsOpp: "Opportunity",
      });
    }
    if (esrs === "S2" && !/wage|slavery|human rights/i.test(name)) {
      splits.push({
        title: `${name} - fair pay, modern slavery, and human rights`,
        subTopic: "Adequate wages and other work-related rights",
        kind: "impact",
        polarity: "Negative",
        riskVsOpp: "Risk",
      });
    }
    for (const extra of splits) {
      iros.push(
        buildOneIro({
          company,
          index,
          card,
          score: score
            ? {
                ...score,
                iroKind: extra.riskVsOpp === "Opportunity" ? "opportunity" : "risk",
                polarity: extra.polarity === "Positive" ? "positive" : "negative",
                valueChainLocation: extra.subTopic.includes("downstream") ? "downstream; own operations" : score.valueChainLocation,
              }
            : score,
          esrs,
          title: extra.title,
          subTopic: extra.subTopic,
          kind: extra.kind,
          polarity: extra.polarity,
          riskVsOpp: extra.riskVsOpp,
        }),
      );
      index += 1;
    }
  }

  const stakeholders = (engagement.artifacts.stakeholders || [])
    .map((item) => `${item.group}: ${item.whatKeepsThemUp}${item.unspokenWorries ? ` (unspoken: ${item.unspokenWorries})` : ""}`)
    .join("; ");

  return {
    company,
    preparedBy: `${engagement.createdBy.name} <${engagement.createdBy.email}>`,
    date: new Date(engagement.updatedAt).toISOString().slice(0, 10),
    stageLabel: engagement.stage >= 4 ? "DMA ready for sign-off. Pricing is not in this file." : "DMA in progress. This pack is the working assessment, not a pricing model.",
    accepted: acceptedNames,
    framework: engagement.artifacts.scoringFramework,
    snapshotBits: [snap?.businessModel, snap?.supplyChain, snap?.financialProfile, snap?.knownRiskAreas].filter(Boolean) as string[],
    documents: (engagement.documents || []).map((doc) => doc.name),
    stakeholders: stakeholders || "Investors, regulators, customers, host communities, employees, suppliers, and civil society.",
    peers: snap?.peerSet || "Peer DMA practice in the sector is used as a secondary check, not as the definition of harm.",
    disclosure: snap?.currentEsgDisclosure || "Use the uploaded filings, sustainability report, and public record. Map each material IRO to an ESRS metric that measures why it scored high.",
    business: snap?.businessModel || `${company} is the selected company for this PAMSA double materiality assessment.`,
    supply: snap?.supplyChain || "The value chain is in scope: upstream sourcing and contractors, own operations, and downstream product use and host-community outcomes.",
    finance: snap?.financialProfile || "Financial materiality is scored on cash flow, operating costs, assets, and access to capital, using the company's own risk language where a modelled percentage is not yet locked.",
    regulation: snap?.regulatoryExposure || "CSRD / ESRS, ISSB, and any sector rules that already bind the company are in the frame, even if the company is not yet an EU reporting entity.",
    risks: snap?.knownRiskAreas || "Accepted Review findings set the IRO list. Climate (E1) is presumed material.",
    iros,
    materialImpact: iros.filter((row) => row.materialImpact === "Yes"),
    materialFinancial: iros.filter((row) => row.materialFinancial === "Yes"),
  };
}

export function introductionSections(ctx: DmaContext) {
  const topics = ctx.iros
    .map((row) => `${row.esrs} ${row.topic}`)
    .filter((item, index, all) => all.indexOf(item) === index)
    .join("; ");
  return [
    {
      title: "Business Overview",
      body: join([
        ctx.business,
        ctx.supply,
        ctx.finance,
        ctx.documents.length
          ? `Primary documents loaded into this engagement: ${ctx.documents.join("; ")}.`
          : "Where a filing has not yet been locked, the assessment uses the public record, the accepted findings, and sector evidence. Lock a filing to deepen locators.",
        `This workbook is the double materiality assessment for ${ctx.company}. It is prepared before any pricing-model work. Pricing scope, model types, and scenarios are out of this file on purpose.`,
      ]),
    },
    {
      title: "Double Materiality Context",
      body: join([
        `Double materiality, as used in ESRS 1, has two complementary tests. Impact materiality (inside-out) asks how ${ctx.company}'s activities affect people and the environment, including the value chain. Financial materiality (outside-in) asks how sustainability matters affect ${ctx.company}'s cash flows, operating costs, assets, access to capital, and enterprise value. A matter is material if it meets either test, or both.`,
        ctx.risks,
        `The required topic mix for this PAMSA assessment is three environmental topics including climate (E1) and three social topics, then extras the analyst accepted. Topics only organise rows. What is scored is the IRO (impact, risk, or opportunity), not the ESRS label. Climate is presumed material unless the analyst proves otherwise.`,
        `Accepted findings feeding this pack: ${ctx.accepted.join("; ") || "the discovery cards currently on the engagement"}. ESRS topics in the working set: ${topics || "to be locked with the scoring key"}.`,
        `Stakeholders in view: ${ctx.stakeholders}`,
      ]),
    },
    {
      title: "Sustainability Reporting Compliance",
      body: join([
        ctx.disclosure,
        `${ctx.company} may already report under TCFD, ISSB, GRI, SASB, CDP, or a local code. Those channels are evidence. They are not a substitute for ESRS IRO scoring. A KPI the company already publishes is used only if it measures why the IRO scored high on scale, scope, remediability, likelihood, probability, or magnitude.`,
        ctx.peers,
        "Gaps versus ESRS (boundary, value chain, assurance, missing metrics) stay visible on the Review Findings, Impact Metrics, and ESRS Indicators sheets. They are not closed in this file. They are documented so sign-off is honest.",
      ]),
    },
    {
      title: "CSRD and ESRS Alignment",
      body: join([
        "The Corporate Sustainability Reporting Directive (CSRD) is the EU framework that replaced the Non-Financial Reporting Directive for in-scope companies. Under the CSRD, sustainability information is disclosed in line with the European Sustainability Reporting Standards (ESRS), adopted by the European Commission in July 2023 and published in the Official Journal in December 2023 (Commission Delegated Regulation (EU) 2023/2772). ESRS 1 sets the double-materiality principle, time horizons, and value-chain coverage. ESRS 2 sets general disclosures. Topical standards E1 to E5, S1 to S4, and G1 supply the menu of metrics.",
        ctx.regulation,
        "This assessment is prepared to be mappable to ESRS even if the company is not yet a CSRD reporter. Each material IRO is linked to a disclosure requirement on the ESRS Indicators sheet. Recommended metrics are taken from that menu, from the company's own KPIs, and from sector practice, and are written so they measure the criterion that drove the score.",
        "EFRAG implementation guidance, AFM waypoints for CSRD, and practitioner guides (KPMG, PwC SRG Chapter 4) are used as method sources. They do not replace company evidence on the IRO row.",
      ]),
    },
  ];
}

export function methodologySections(ctx: DmaContext) {
  const fw = ctx.framework;
  return [
    {
      title: "Principles that guided the criteria selection",
      body: join([
        "The double materiality assessment follows the ESRS / CSRD framework and evaluates materiality from two complementary perspectives:",
        `Impact materiality (inside-out): how ${ctx.company}'s activities affect people and the environment, across own operations and the value chain.`,
        `Financial materiality (outside-in): how sustainability matters affect ${ctx.company}'s enterprise value and performance.`,
        "Each sustainability topic can therefore be scored on both axes and treated as material if it meets either perspective. This is why the Impact Metrics and Financial Metrics sheets carry the same IRO list with different descriptions and tests.",
      ]),
    },
    {
      title: "Alignment to strategy and reported priorities",
      body: join([
        fw?.topicSelectionRationale ||
          `Criteria were selected so the DMA output can be used by management, not only filed. The working set follows the required mix for ${ctx.company}: 3 environmental including climate (E1) and 3 social, then extras the analyst accepted. Climate is presumed material.`,
        ctx.risks,
        "Selecting criteria that match stated strategy (for example climate transition, workforce safety, community impact, circularity) keeps the scores actionable for disclosure planning and, later, for pricing-model scope. Pricing is not started from this pack.",
      ]),
    },
    {
      title: "Practical, ESRS-aligned criteria (what we score and why)",
      body: join([
        fw?.impactDimensions ||
          "Impact (inside-out) criteria, because ESRS requires actual and potential impacts across the value chain and stakeholders: scale of impact (footprint across operations and value chain); scope (how widespread); remediability / irreversibility; stakeholder sensitivity; time horizon.",
        fw?.socialNormsUsed ||
          "Where possible, 1-5 bands are grounded in social or environmental norms (ESRS, IPCC / climate science for E1, ILO and OHCHR for workforce and communities, planetary boundaries for pollution and water), not only in peer DMA language.",
        fw?.financialDimensions ||
          "Financial (outside-in) criteria, because ESRS requires assessment of financial effects on enterprise value: probability of a risk or event hitting cash flows or costs; magnitude on revenue, costs, or assets; time horizon; plus a readiness read (vulnerability of controls and velocity of cash impact) so the score is not a single opaque number.",
        fw?.scaleChoiceRationale ||
          "A 1 to 5 scale is used. Yes / no hides clusters. 1-100 implies false precision the evidence does not support. Peer DMA practice and ESRS qualitative scoring both sit comfortably on 1-5.",
      ]),
    },
    {
      title: "Evidence and stakeholder input",
      body: join([
        "ESRS and EFRAG guidance recommend combining quantitative evidence (emissions, incident rates, water volumes, revenue exposure) with qualitative stakeholder input. Each IRO row therefore carries: the finding definition, operations or filing evidence, disclosure status, and a rationale that uses the band language from the scoring key.",
        `Stakeholder groups held in view: ${ctx.stakeholders}`,
        ctx.documents.length ? `Document trail in this engagement: ${ctx.documents.join("; ")}.` : "When a filing locator is missing, the row says so. Numbers are not invented to fill a cell.",
        "A tonne figure is not itself a 4. The rationale must link the evidence to the words of the band (for example 'severe, long-lasting effects on human health, ecosystems, or operations and the value chain').",
      ]),
    },
    {
      title: "Value-chain and scope considerations",
      body: join([
        fw?.impactIncludesValueChain
          ? "The scoring key states that impact tests cover operations and the value chain."
          : "ESRS explicitly requires impacts and risks across the value chain.",
        "Each IRO is located upstream, in own operations, and / or downstream. 3 is the primary location, 2 secondary, 1 tertiary, N/A if the IRO does not sit in that slice. This is why supply-chain labour, product-use emissions, and host-community water are not dropped just because they are outside the operated boundary.",
        ctx.supply,
      ]),
    },
    {
      title: "Scoring scale and thresholds",
      body: join([
        fw?.thresholdRule || "Material if the impact score is 3 or higher, or the financial score is 3 or higher, or the pair clusters with accepted peer DMA issues.",
        fw?.thresholdRationale ||
          "A 3 is the first band where operations or value-chain harm, or a real cash pathway, is already evidenced. Climate (E1) stays in the set even if a single IRO is below 3 until the user proves it is not material.",
        fw?.alignedToCompanyFinancials ||
          `Financial thresholds are aligned to how ${ctx.company} already talks about material risk, rather than an invented percentage the filings do not support.`,
        fw?.timeHorizonVsImpact ||
          "Impact time horizon can be longer than financial. If they differ, the IRO row says why. The impact year is not copied into the financial cell.",
        `On the impact axis, combined score = severity (average of scale, scope, remediability) x likelihood probability (0.2 to 1.0). Material if combined is at least 3.0, or the analyst's locked impact score is at least 3. Currently ${ctx.materialImpact.length} IRO row(s) meet the impact test: ${ctx.materialImpact.map((row) => `${row.esrs} ${row.title} (${row.combinedImpact})`).join("; ") || "none yet"}.`,
        `On the financial axis, PAMSA keeps a 1-5 score (not a 0-50 product) so the chart is comparable with the scoring key the team locked. Currently ${ctx.materialFinancial.length} IRO row(s) meet the financial test: ${ctx.materialFinancial.map((row) => `${row.esrs} ${row.title} (${row.financialScore})`).join("; ") || "none yet"}.`,
        "The count above is not the final disclosure list. Sign-off can still change scores or the threshold. Climate remains in unless disproved.",
      ]),
    },
    {
      title: "Mapping to ESRS metrics",
      body: join([
        "For each IRO scored as material, recommended metrics are chosen from the ESRS menu of metrics (for example Scope 1 / 2 / 3 for E1, LTIFR and fatalities for S1, supplier audits for S2, water in stressed basins for E3), from the company's own KPIs, and from sector practice.",
        "The metric must measure why the IRO scored high on the criterion, not only what the company already reports. Mapping lives on the ESRS Indicators sheet and in the Recommended Metrics column of Impact Metrics and Financial Metrics.",
      ]),
    },
  ];
}

export function esrsIndicatorRows(ctx: DmaContext) {
  const rows: { esrs: string; dr: string; paragraph: string; name: string; topic: string; iro: string; internal: string; external: string; metric: string }[] = [];
  for (const iro of ctx.iros) {
    const catalog = DRS[iro.esrs] || [{ dr: iro.dr, paragraph: "", name: iro.indicator }];
    catalog.forEach((item, idx) => {
      rows.push({
        esrs: iro.esrs,
        dr: item.dr,
        paragraph: item.paragraph,
        name: item.name,
        topic: `${iro.topic} (${iro.title})`,
        iro: iro.title,
        internal: idx === 0 ? `Internal / own operations and enterprise value:\n${iro.financialDescription}` : "",
        external: idx === 0 ? `External / people and environment:\n${iro.impactDescription}` : idx === 1 ? iro.evidence : "",
        metric: iro.metrics,
      });
    });
  }
  return rows;
}

export function referenceRows(engagement: Engagement) {
  const company = engagement.artifacts.selectedCompany || engagement.title;
  const base = [
    { org: "EFRAG", year: "2023", title: "European Sustainability Reporting Standards, Set 1 (sector-agnostic)", url: "https://www.efrag.org/en/sustainability-reporting/esrs" },
    { org: "European Commission", year: "2023", title: "Commission Delegated Regulation (EU) 2023/2772 as regards sustainability reporting standards", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2772" },
    { org: "European Commission", year: "2024", title: "Corporate sustainability reporting (CSRD overview)", url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en" },
    { org: "AFM", year: "2024", title: "10 waypoints for CSRD: double materiality", url: "https://www.afm.nl/en/sector/actueel/2024/november/csrd-waypoints" },
    { org: "EFRAG", year: "2024", title: "Implementation guidance: materiality assessment (IG 1)", url: "https://www.efrag.org" },
    { org: "IPCC", year: "2023", title: "AR6 Synthesis Report", url: "https://www.ipcc.ch/report/ar6/syr/" },
    { org: "ILO", year: "2023", title: "Occupational safety and health and labour standards relevant to S1 / S2", url: "https://www.ilo.org" },
    { org: "OHCHR", year: "2011", title: "UN Guiding Principles on Business and Human Rights", url: "https://www.ohchr.org/en/publications/reference-publications/guiding-principles-business-and-human-rights" },
    { org: "KPMG", year: "2023", title: "ESRS implementation: illustrative double materiality assessment and guidance", url: "https://kpmg.com" },
    { org: "PwC", year: "2023", title: "Sustainability reporting guide, Chapter 4: Materiality", url: "https://www.pwc.com" },
    { org: "GRI", year: "2021", title: "GRI 3: Material Topics 2021", url: "https://www.globalreporting.org" },
    { org: "ISSB", year: "2023", title: "IFRS S1 and IFRS S2", url: "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/" },
    { org: "OECD", year: "2023", title: "OECD Guidelines for Multinational Enterprises on Responsible Business Conduct", url: "https://www.oecd.org/en/publications/2023/06/oecd-guidelines-for-multinational-enterprises-on-responsible-business-conduct_a0b499d3.html" },
    { org: "World Resources Institute", year: "2025", title: "Aqueduct Water Risk Atlas", url: "https://www.wri.org/aqueduct" },
    { org: company, year: new Date(engagement.updatedAt).getFullYear().toString(), title: "Company filings, sustainability report, and documents loaded in this PAMSA engagement", url: "" },
  ];
  const extra = engagement.citations.map((row) => ({
    org: row.source,
    year: (row.date || "").slice(0, 4) || "",
    title: row.claim,
    url: row.url || "",
  }));
  const docs = (engagement.documents || []).map((doc) => ({
    org: company,
    year: doc.uploadedAt.slice(0, 4),
    title: doc.name,
    url: "",
  }));
  return [...base, ...extra, ...docs];
}
