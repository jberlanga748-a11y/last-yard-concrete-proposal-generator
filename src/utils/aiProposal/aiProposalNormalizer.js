import { parseSmartPasteNotes } from "../smartPaste/smartPasteParser.js";

export function normalizeAiProposalResult(result = {}) {
  const mode = result.mode === "review" ? "review" : "extract";
  const extraction = normalizeAiExtraction(result.extraction || {});
  const review = normalizeAiReview(result.review || {});

  return {
    mode,
    extraction,
    review,
  };
}

export function buildSmartPasteNotesFromAiResult(result = {}) {
  const normalized = normalizeAiProposalResult(result);
  const extraction = normalized.extraction;
  const lines = [];

  pushLabel(lines, "Project", extraction.project.name);
  pushLabel(lines, "Location", extraction.project.location);
  pushLabel(lines, "Project Address", extraction.project.address);
  pushLabel(lines, "Prepared for", extraction.client.companyName);
  pushLabel(lines, "Contact", extraction.client.contactName);
  pushLabel(lines, "Email", extraction.client.email);
  pushLabel(lines, "Phone", extraction.client.phone);
  pushLabel(lines, "Proposal Type", extraction.proposalType);
  pushLabel(lines, "Scope Summary", extraction.project.description);
  pushLabel(lines, "Schedule", extraction.project.schedule);
  pushLabel(lines, "Schedule Assumptions", extraction.scheduleAssumptions);

  if (extraction.isSubcontractor) {
    lines.push("Concrete / site package subcontractor proposal");
    lines.push("Not full GC/prime");
  }

  pushBlock(lines, "Scope", extraction.scope);
  pushBlock(lines, "Assumptions", extraction.assumptions);
  pushBlock(lines, "Exclusions", extraction.exclusions);

  if (extraction.lineItems.length > 0) {
    lines.push("");
    lines.push("Line items:");
    extraction.lineItems.forEach((item) => {
      lines.push(
        [
          item.description,
          item.quantity || 1,
          item.unit || "LS",
          formatAiAmount(item.unitPrice ?? item.amount),
        ]
          .map((value) => String(value || "").trim())
          .join(" | "),
      );
    });
  }

  extraction.alternatesAllowances.forEach((section) => {
    const amount = toNumber(section.amount);

    if (amount <= 0 || isNoAlternateLabel(section)) {
      return;
    }

    const prefix = getPricingSectionLabelPrefix(section);
    pushLabel(lines, section.label || prefix, [section.description, formatAiAmount(amount)].filter(hasTextValue).join(" | "));
  });

  if (extraction.pricingSummary.length > 0) {
    lines.push("");
    lines.push("Pricing Summary:");
    extraction.pricingSummary.forEach((row) => {
      lines.push([row.label, formatAiAmount(row.amount), row.note].filter(hasTextValue).join(" | "));
    });
  }

  if (extraction.scheduleOfValues.length > 0) {
    lines.push("");
    lines.push("Schedule of Values:");
    extraction.scheduleOfValues.forEach((row) => {
      lines.push([row.item, row.description, row.pricingBasis, formatAiAmount(row.amount)].filter(hasTextValue).join(" | "));
    });
  }

  if (extraction.takeoffQuantities.length > 0) {
    lines.push("");
    lines.push("Takeoff Quantities:");
    extraction.takeoffQuantities.forEach((row) => {
      lines.push([row.item, row.quantity, row.detailSize, row.netCy, row.cyWithTenPercent, row.priceStatus].filter(hasTextValue).join(" | "));
    });
  }

  const scopeControlRows = buildScopeControlRows(extraction.scopeControl);

  if (scopeControlRows.length > 0) {
    lines.push("");
    lines.push("Scope Control Summary:");
    lines.push(...scopeControlRows);
  }

  pushBlock(lines, "RFIs / Clarifications", extraction.rfiClarifications);
  pushBlock(lines, "Addenda Acknowledged", extraction.addenda);

  Object.entries(extraction.legalTerms).forEach(([key, value]) => {
    pushLabel(lines, toDisplayLabel(key), value);
  });

  pushLabel(lines, "Proposal Notes", extraction.proposalNotes);

  return lines
    .map((line) => String(line || "").trim())
    .filter((line, index, allLines) => line || allLines[index - 1])
    .join("\n")
    .trim();
}

export function applyAiProposalResultToProposal(result = {}, currentProposal = {}) {
  const normalized = normalizeAiProposalResult(result);
  const notes = buildSmartPasteNotesFromAiResult(normalized);
  const parsed = parseSmartPasteNotes(notes, currentProposal);

  return {
    proposal: parsed.proposal,
    normalized,
    generatedSmartPasteNotes: notes,
    summary: {
      ...parsed.summary,
      aiWarnings: normalized.extraction.warnings,
      aiMissingInfo: normalized.extraction.missingInfo,
      aiReviewNotes: normalized.extraction.reviewNotes,
      aiFieldsFound: getAiFieldsFound(normalized.extraction),
    },
  };
}

export function summarizeAiProposalResult(result = {}) {
  const normalized = normalizeAiProposalResult(result);

  if (normalized.mode === "review") {
    return {
      mode: "review",
      fieldsFound: [],
      pricingFound: [],
      warnings: normalized.review.warnings,
      missingInfo: normalized.review.missingInfo,
      reviewNotes: normalized.review.findings.map((finding) => finding.message).filter(Boolean),
      recommendation: normalized.review.recommendation,
    };
  }

  return {
    mode: "extract",
    fieldsFound: getAiFieldsFound(normalized.extraction),
    pricingFound: [
      ...normalized.extraction.lineItems.map((item) => item.description).filter(Boolean),
      ...normalized.extraction.alternatesAllowances.map((item) => item.label).filter(Boolean),
      ...normalized.extraction.pricingSummary.map((item) => item.label).filter(Boolean),
    ],
    warnings: normalized.extraction.warnings,
    missingInfo: normalized.extraction.missingInfo,
    reviewNotes: normalized.extraction.reviewNotes,
    recommendation: normalized.review.recommendation,
  };
}

function normalizeAiExtraction(extraction = {}) {
  return {
    project: {
      name: text(extraction.project?.name),
      location: text(extraction.project?.location),
      address: text(extraction.project?.address),
      description: text(extraction.project?.description),
      schedule: text(extraction.project?.schedule),
    },
    client: {
      companyName: text(extraction.client?.companyName),
      contactName: text(extraction.client?.contactName),
      email: text(extraction.client?.email),
      phone: text(extraction.client?.phone),
    },
    proposalType: text(extraction.proposalType),
    packetMode: text(extraction.packetMode),
    isSubcontractor: extraction.isSubcontractor === true,
    scope: textArray(extraction.scope),
    concreteSpecs: extraction.concreteSpecs && typeof extraction.concreteSpecs === "object" ? extraction.concreteSpecs : {},
    lineItems: objectArray(extraction.lineItems).map(normalizeAiLineItem),
    alternatesAllowances: objectArray(extraction.alternatesAllowances).map(normalizeAiPricingSection),
    pricingSummary: objectArray(extraction.pricingSummary).map(normalizeAiPricingSummaryRow),
    scheduleOfValues: objectArray(extraction.scheduleOfValues).map(normalizeAiSovRow),
    takeoffQuantities: objectArray(extraction.takeoffQuantities),
    assumptions: textArray(extraction.assumptions),
    exclusions: textArray(extraction.exclusions),
    rfiClarifications: textArray(extraction.rfiClarifications),
    addenda: textArray(extraction.addenda),
    scopeControl: extraction.scopeControl && typeof extraction.scopeControl === "object" ? extraction.scopeControl : {},
    legalTerms: extraction.legalTerms && typeof extraction.legalTerms === "object" ? extraction.legalTerms : {},
    proposalNotes: text(extraction.proposalNotes),
    scheduleAssumptions: text(extraction.scheduleAssumptions),
    warnings: textArray(extraction.warnings),
    missingInfo: textArray(extraction.missingInfo),
    reviewNotes: textArray(extraction.reviewNotes),
  };
}

function normalizeAiReview(review = {}) {
  return {
    recommendation: text(review.recommendation),
    readyStatus: text(review.readyStatus),
    findings: objectArray(review.findings).map((finding) => ({
      severity: text(finding.severity),
      category: text(finding.category),
      message: text(finding.message),
      recommendation: text(finding.recommendation),
    })),
    warnings: textArray(review.warnings),
    missingInfo: textArray(review.missingInfo),
  };
}

function normalizeAiLineItem(item = {}) {
  return {
    description: text(item.description || item.label),
    quantity: toNumber(item.quantity) || 1,
    unit: text(item.unit || "LS").toUpperCase(),
    unitPrice: toNumber(item.unitPrice ?? item.amount),
    taxable: item.taxable !== false,
  };
}

function normalizeAiPricingSection(section = {}) {
  return {
    type: text(section.type || "add_alternate"),
    label: text(section.label || section.description),
    description: text(section.description),
    amount: toNumber(section.amount),
    included: section.included === true,
  };
}

function normalizeAiPricingSummaryRow(row = {}) {
  return {
    label: text(row.label || row.description),
    amount: toNumber(row.amount),
    note: text(row.note),
  };
}

function normalizeAiSovRow(row = {}) {
  return {
    item: text(row.item),
    description: text(row.description),
    pricingBasis: text(row.pricingBasis),
    amount: toNumber(row.amount),
  };
}

function buildScopeControlRows(scopeControl = {}) {
  const rows = [
    ["Included Scope", scopeControl.includedScope],
    ["Exclusions", scopeControl.exclusions],
    ["Clarifications", scopeControl.clarifications],
    ["Accepted Alternates", scopeControl.acceptedAlternates],
    ["Allowances", scopeControl.allowances],
    ["Owner / GC By Others", scopeControl.ownerGcByOthers],
    ["Hidden / Unshown Conditions", scopeControl.hiddenUnshownConditionsNote || scopeControl.hiddenConditions],
  ];

  return rows.filter(([, value]) => hasTextValue(value)).map(([label, value]) => `${label} | ${value}`);
}

function getPricingSectionLabelPrefix(section = {}) {
  const type = text(section.type).toLowerCase();

  if (type.includes("allowance")) {
    return "Allowance";
  }

  if (type.includes("deduct")) {
    return "Deduct Alternate";
  }

  if (type.includes("unit")) {
    return "Unit Price";
  }

  if (type.includes("optional")) {
    return "Optional Support Scope";
  }

  return "Add Alternate";
}

function isNoAlternateLabel(section = {}) {
  const labelText = `${section.type || ""} ${section.label || ""} ${section.description || ""}`.toLowerCase();
  return /\b(no add alternates?|none currently|no alternate|not applicable)\b/.test(labelText);
}

function getAiFieldsFound(extraction = {}) {
  const fields = [];

  if (extraction.project.name) fields.push("Project");
  if (extraction.project.location || extraction.project.address) fields.push("Location");
  if (extraction.client.companyName) fields.push("Client");
  if (extraction.client.contactName || extraction.client.email || extraction.client.phone) fields.push("Contact");
  if (extraction.project.description || extraction.scope.length > 0) fields.push("Scope");
  if (extraction.project.schedule || extraction.scheduleAssumptions) fields.push("Schedule");
  if (extraction.lineItems.length > 0) fields.push("Line Items");
  if (extraction.alternatesAllowances.length > 0) fields.push("Alternates / Allowances");
  if (extraction.scheduleOfValues.length > 0) fields.push("Schedule of Values");
  if (extraction.takeoffQuantities.length > 0) fields.push("Takeoff Quantities");
  if (Object.keys(extraction.scopeControl).length > 0) fields.push("Scope Control");
  if (extraction.rfiClarifications.length > 0) fields.push("RFIs / Clarifications");
  if (extraction.addenda.length > 0) fields.push("Addenda");

  return fields;
}

function pushLabel(lines, label, value) {
  if (!hasTextValue(value)) {
    return;
  }

  lines.push("");
  lines.push(`${label}: ${value}`);
}

function pushBlock(lines, label, values) {
  const items = Array.isArray(values) ? values.map(text).filter(Boolean) : [];

  if (items.length === 0) {
    return;
  }

  lines.push("");
  lines.push(`${label}:`);
  items.forEach((item) => lines.push(item));
}

function toDisplayLabel(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function textArray(value) {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }

  return text(value)
    .split(/\r?\n/)
    .map(text)
    .filter(Boolean);
}

function objectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function hasTextValue(value) {
  return text(value) !== "";
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseFloat(String(value || "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAiAmount(value) {
  const amount = toNumber(value);
  return amount > 0 ? String(amount) : "";
}
