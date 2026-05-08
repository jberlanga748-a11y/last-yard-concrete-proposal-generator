import { LINE_ITEM_UNITS } from "../../proposalData.js";

import { PACKET_BUILDER_SECTIONS } from "../../proposalData.js";
import {
  extractSmartPasteCoverFieldsFromNotes,
  isLikelySmartPasteStreetAddress,
  mergeSmartPasteCoverValues,
} from "./smartPasteCoverFields.js";
import { isSmartPasteJsonImportNotes, normalizeSmartPasteNotes } from "./smartPasteNormalizer.js";
import {
  countResidentialOptionImagePlaceholders,
  normalizeResidentialOptionImages,
  normalizeResidentialScheduleOfValues,
} from "../proposalPacket/residentialPricing.js";
import { normalizeResidentialLegalPapers } from "../proposalPacket/residentialLegalPapers.js";
import {
  DEFAULT_PROPOSAL_MODE,
  getPacketModeForProposalMode,
  getProposalModeLabel,
  getProposalTypeForMode,
  isGcPrimePacketMode,
  isResidentialProposalMode,
  normalizeProposalMode,
} from "../proposals/proposalModes.js";

const PLAN_SHEET_PAGE_TYPES = ["plan_takeoff_sheet", "detail_notes", "shade_footing_estimate", "general_backup"];

const defaultPlanSheets = [
  {
    matchKey: "l102",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L102 Materials Plan West",
    subtitle: "L102 Materials Plan West",
    imageSrc: "",
    calculationTitle: "L102 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l103",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L103 Materials Plan East",
    subtitle: "L103 Materials Plan East",
    imageSrc: "",
    calculationTitle: "L103 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l104",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L104 Materials Play Area Enlargement",
    subtitle: "L104 Materials Play Area Enlargement",
    imageSrc: "",
    calculationTitle: "L104 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "sport-courts-l203",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - Sport Courts / L203",
    subtitle: "Sport Courts / L203",
    imageSrc: "",
    calculationTitle: "Sport Court Alternate",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l601",
    enabled: false,
    pageType: "detail_notes",
    title: "L601 Detail Notes",
    subtitle: "Construction Detail Notes",
    imageSrc: "",
    calculationTitle: "Detail Notes",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l602",
    enabled: false,
    pageType: "detail_notes",
    title: "L602 Fence / Site Furnishing Notes",
    subtitle: "Fence / Site Furnishing Notes",
    imageSrc: "",
    calculationTitle: "Detail Notes",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "shade-footing-estimate",
    enabled: false,
    pageType: "shade_footing_estimate",
    title: "Shade Footing Estimate",
    subtitle: "Concrete Footing Backup",
    imageSrc: "",
    calculationTitle: "Estimate Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
];

const defaultGcPacketTables = {
  pricingSummary: {
    enabled: false,
    presentationNotes: "",
    rows: [],
  },
  scheduleOfValues: {
    enabled: false,
    rows: [],
  },
  takeoffQuantities: {
    enabled: false,
    rows: [],
  },
  shadeFootingEstimate: {
    enabled: false,
    rows: [],
  },
  proposalNotes: {
    enabled: false,
    proposalBasis: "",
    contractScopeControl: "",
    acceptanceSummary: "",
    gcPrimeReviewer: "",
  },
};

const gcPacketTableLabels = {
  pricingSummary: "Pricing Summary",
  proposalNotes: "Proposal Notes / Acceptance Summary",
  scheduleOfValues: "Schedule of Values",
  shadeFootingEstimate: "Shade Footing Estimate",
  takeoffQuantities: "Takeoff Quantities",
};

const gcPacketRowFields = {
  scheduleOfValues: [
    ["item", "Item"],
    ["description", "Description"],
    ["pricingBasis", "Pricing Basis"],
    ["amount", "Amount"],
  ],
  takeoffQuantities: [
    ["item", "Item"],
    ["quantity", "Quantity"],
    ["detailSize", "Detail / Size"],
    ["netCy", "Net CY"],
    ["cyWithTenPercent", "CY with 10%"],
    ["priceStatus", "Price / Status"],
  ],
  shadeFootingEstimate: [
    ["column", "Column"],
    ["columnSize", "Column Size"],
    ["estimatedSpreadFooting", "Estimated Spread Footing"],
    ["netCy", "Net CY"],
    ["estimatedSubtotal", "Estimated Subtotal"],
    ["estimatedCyWithTenPercent", "Estimated CY with 10%"],
    ["allowanceAmount", "Allowance Amount"],
    ["allowanceNote", "Allowance Note"],
  ],
};

export function parseSmartPasteNotes(notes, currentProposal = {}) {
  const parsedNotes = parseProjectNotes(notes);

  if (parsedNotes.jsonImportInvalid) {
    return {
      proposal: cloneObject(currentProposal),
      parsedNotes,
      summary: createSmartPasteSummary(parsedNotes),
    };
  }

  const proposal = applyParsedNotesToProposal(currentProposal, parsedNotes);
  const lineItemCount = parsedNotes.lineItems.length + (parsedNotes.values.baseBidLineItem ? 1 : 0);
  parsedNotes.warnings = [
    ...new Set([...(parsedNotes.warnings || []), ...getSmartPasteReviewWarnings(proposal, parsedNotes)]),
  ];

  return {
    proposal,
    parsedNotes,
    summary: createSmartPasteSummary(parsedNotes, lineItemCount),
  };
}

function createSmartPasteSummary(parsedNotes = {}, explicitLineItemCount) {
  const values = parsedNotes.values || {};
  const lineItemCount = explicitLineItemCount ?? (parsedNotes.lineItems?.length || 0) + (values.baseBidLineItem ? 1 : 0);
  const optionScheduleOfValuesCount = getSmartPastePricingOptionSovRowCount(values.pricingOptions);

  return {
    fields: parsedNotes.fields || [],
    lineItemCount,
    pricingSectionCount: parsedNotes.pricingSectionCount || 0,
    proposalMode: values.proposalMode || "",
    proposalModeLabel: values.proposalMode ? getProposalModeLabel(values.proposalMode) : "",
    pricingMode: values.pricingMode || "",
    pricingOptions: values.pricingOptions || [],
    optionalAddOns: values.optionalAddOns || [],
    hideTotalIfAllAccepted: values.pricingMode === "choose_one_option",
    planSheetCount: parsedNotes.planSheetCount || 0,
    gcPacketTableCount: parsedNotes.gcPacketTableCount || 0,
    sectionsCaptured: parsedNotes.sectionsCaptured || [],
    cleanupActions: parsedNotes.cleanupActions || [],
    coverFieldsUpdated: parsedNotes.coverFieldsUpdated || [],
    defaultsCleared: parsedNotes.defaultsCleared || 0,
    defaultRowsRemoved: parsedNotes.defaultRowsRemoved || [],
    packetSectionsCreated: parsedNotes.packetSectionsCreated || values.packetSectionsPrepared || 0,
    pricingRowsReplaced: parsedNotes.pricingRowsReplaced || 0,
    scheduleOfValuesCount: (values.gcPacketTables?.scheduleOfValues?.rows?.length || 0) + optionScheduleOfValuesCount,
    takeoffQuantityCount: values.gcPacketTables?.takeoffQuantities?.rows?.length || 0,
    rfiCount: values.rfiRegister?.length || 0,
    scopeSectionCount: values.scopeSections?.length || 0,
    concreteSpecCount: values.concreteSpecs ? Object.values(values.concreteSpecs).filter(hasTextValue).length : 0,
    packetPrintOrderCount: values.packetBuilder?.length || 0,
    applyTargets: getSmartPasteApplyTargets(values),
    jsonImportMode: parsedNotes.jsonImportMode || false,
    invalidJsonImport: parsedNotes.jsonImportInvalid || false,
    warnings: parsedNotes.warnings || [],
  };
}

function getSmartPasteApplyTargets(values = {}) {
  const targets = [];

  if (values.proposalMode) {
    targets.push("Proposal Mode");
  }

  if ([values.projectName, values.projectLocation, values.clientCompany, values.contactName, values.clientEmail, values.clientPhone].some(hasTextValue)) {
    targets.push("Project Name", "Project Location", "Client / Contact");
  }

  if (values.baseBidLineItem || values.pricingTotalRows?.length > 0 || values.pricingSections || values.pricingOptions?.length > 0) {
    targets.push("Pricing");
  }

  if (values.pricingOptions?.length > 0) {
    targets.push("Pricing Options");
  }

  if (values.normalizedSmartPaste?.pricing?.lineItems?.length > 0) {
    targets.push("Line Items");
  }

  if (values.gcPacketTables?.scheduleOfValues?.rows?.length > 0 || getSmartPastePricingOptionSovRowCount(values.pricingOptions) > 0) {
    targets.push("Schedule of Values");
  }

  if (values.scopeSections?.length > 0 || values.scopeItems?.length > 0) {
    targets.push("Scope Sections");
  }

  if (values.concreteSpecs && Object.values(values.concreteSpecs).some(hasTextValue)) {
    targets.push("Concrete Specifications");
  }

  if (values.gcPacketTables?.takeoffQuantities?.rows?.length > 0) {
    targets.push("Takeoff Quantities");
  }

  if (values.planSheets?.length > 0) {
    targets.push("Plan Sheets");
  }

  if (values.rfiRegister?.length > 0) {
    targets.push("RFI Register");
  }

  if (values.scopeControlSummary && Object.values(values.scopeControlSummary).some(hasTextValue)) {
    targets.push("Scope Control Summary");
  }

  if (
    [
      values.paymentTerms,
      values.proposalExpiration,
      values.changeOrderLanguage,
      values.siteReadiness,
      values.hiddenConditions,
      values.warrantyLimitation,
      values.gcScopeControl,
    ].some(hasTextValue)
  ) {
    targets.push("Legal Terms");
  }

  if (values.residentialLegalPapers) {
    targets.push("Residential Legal Papers");
  }

  if (values.packetBuilder?.length > 0 || hasTextValue(values.packetPrintOrder)) {
    targets.push("Packet Print Order");
  }

  return [...new Set(targets)];
}

export { parseProjectNotes, applyParsedNotesToProposal };

function getSmartPasteReviewWarnings(proposal = {}, parsedNotes = {}) {
  const warnings = [];
  const project = proposal.project || {};
  const client = proposal.client || {};
  const values = parsedNotes.values || {};
  const totalRows = values.pricingTotalRows || [];
  const lineItemTotal = getSmartPasteLineItemTotal(proposal.lineItems || []);
  const optionalScopeDetected = getSmartPasteOptionalScopeDetected(values);
  const chooseOnePricing = values.pricingMode === "choose_one_option" || proposal.pricingMode === "choose_one_option";

  if (!hasTextValue(project.name)) {
    warnings.push("Smart Paste did not find a project name.");
  }

  if (!hasTextValue(client.companyName) && !hasTextValue(client.contactName)) {
    warnings.push("Smart Paste did not find a client, GC, or contact.");
  }

  if (!hasTextValue(project.location) && !hasTextValue(project.address) && !hasTextValue(client.projectAddress)) {
    warnings.push("Smart Paste did not find a project location or address.");
  }

  if (chooseOnePricing) {
    warnings.push("Residential pricing options detected. Confirm which option the customer accepted before sending.");
  } else if (optionalScopeDetected) {
    warnings.push("Optional scope detected. Confirm whether it is excluded from the base bid before sending.");
  }

  if (countResidentialOptionImagePlaceholders(proposal) > 0) {
    warnings.push("Image placeholders detected for pricing options. Upload photos after applying.");
  }

  totalRows.forEach((row) => {
    const label = String(row?.label || "").trim();
    const normalizedLabel = label.toLowerCase();
    const amount = toEditableNumber(row?.amount);

    if (!isProposalGrandTotalLabel(normalizedLabel) || amount <= 0) {
      return;
    }

    if (lineItemTotal <= 0) {
      warnings.push(`Pricing total "${label}" was found, but no supporting base line item was parsed.`);
      return;
    }

    if (Math.abs(lineItemTotal - amount) > 1 && !hasParsedOptionalOrAlternatePricing(values) && !chooseOnePricing) {
      warnings.push(`Pricing total "${label}" does not match parsed base line items. Review pricing before sending.`);
    }
  });

  return warnings;
}

function getSmartPasteLineItemTotal(lineItems = []) {
  return lineItems.reduce(
    (sum, item) => sum + toEditableNumber(item.quantity || 1) * toEditableNumber(item.unitPrice),
    0,
  );
}

function getSmartPasteOptionalScopeDetected(values = {}) {
  if ((values.optionalAddOns || []).length > 0) {
    return true;
  }

  if ((values.pricingSections || []).some((section) => /optional|support scope/i.test(`${section.label} ${section.description}`))) {
    return true;
  }

  return /optional support|optional scope|optional alternate|not included unless accepted/i.test(JSON.stringify(values));
}

function hasParsedOptionalOrAlternatePricing(values = {}) {
  if (values.pricingMode === "choose_one_option" || (values.pricingOptions || []).length > 0 || (values.optionalAddOns || []).length > 0) {
    return true;
  }

  return (values.pricingSections || []).some((section) => section?.type !== "allowance");
}

function isProposalGrandTotalLabel(label) {
  return /^(total proposal|grand total)$/.test(String(label || "").trim().toLowerCase());
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function createProposalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasTextValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeSmartPasteFingerprint(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9$%\s]/g, "")
    .trim();
}

function dedupeSmartPasteTextList(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const textValue = String(item || "").trim();
    const fingerprint = normalizeSmartPasteFingerprint(textValue);

    if (!textValue || !fingerprint || seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function dedupeSmartPasteTextBlock(value) {
  return dedupeSmartPasteTextList(
    String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  ).join("\n");
}

function toEditableNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

function getImageAssetSource(asset = {}) {
  if (hasTextValue(asset.dataUrl)) {
    return asset.dataUrl;
  }

  if (hasTextValue(asset.src)) {
    return asset.src;
  }

  if (hasTextValue(asset.imageSrc)) {
    return asset.imageSrc;
  }

  if (hasTextValue(asset.publicUrl)) {
    return asset.publicUrl;
  }

  if (hasTextValue(asset.signedUrl)) {
    return asset.signedUrl;
  }

  return "";
}

function parseEditorList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function normalizePlanSheetNotes(notes = []) {
  if (Array.isArray(notes)) {
    return notes.map((note) => String(note || "").trim()).filter(Boolean);
  }

  return parseEditorList(notes);
}

function createPlanSheetMatchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPlanSheetMatchKey(sheet = {}) {
  return sheet.matchKey || createPlanSheetMatchKey(sheet.title || sheet.subtitle);
}

function getPlanSheetDataUrl(sheet = {}) {
  const rawSource = sheet.imageSrc ?? sheet.image ?? sheet.dataUrl ?? "";
  return hasTextValue(sheet.dataUrl) ? sheet.dataUrl : isDataUrl(rawSource) ? rawSource : "";
}

function getPlanSheetPublicUrl(sheet = {}) {
  return hasTextValue(sheet.publicUrl) ? sheet.publicUrl : "";
}

function getPlanSheetImageSource(sheet = {}) {
  const rawSource = sheet.imageSrc ?? sheet.image ?? sheet.src ?? "";
  return isDataUrl(rawSource) ? rawSource : rawSource || sheet.publicUrl || sheet.signedUrl || "";
}

function normalizePlanSheet(sheet = {}, index = 0) {
  const fallback = defaultPlanSheets[index] || {};
  const pageType = PLAN_SHEET_PAGE_TYPES.includes(sheet.pageType) ? sheet.pageType : fallback.pageType || "general_backup";

  return {
    id: sheet.id || fallback.id || createProposalId(),
    matchKey: sheet.matchKey || fallback.matchKey || createPlanSheetMatchKey(sheet.title || fallback.title || `plan-sheet-${index + 1}`),
    enabled: Boolean(sheet.enabled),
    pageType,
    title: sheet.title ?? fallback.title ?? `Plan Sheet ${index + 1}`,
    subtitle: sheet.subtitle ?? fallback.subtitle ?? "",
    dataUrl: getPlanSheetDataUrl(sheet),
    fileName: sheet.fileName || "",
    fileType: sheet.fileType || "",
    imageSrc: getPlanSheetImageSource(sheet),
    publicUrl: getPlanSheetPublicUrl(sheet),
    signedUrl: sheet.signedUrl || "",
    storagePath: sheet.storagePath || "",
    uploadedAt: sheet.uploadedAt || "",
    calculationTitle: sheet.calculationTitle ?? fallback.calculationTitle ?? "Calculation Notes",
    calculationNotes: normalizePlanSheetNotes(sheet.calculationNotes ?? sheet.notes ?? fallback.calculationNotes),
    clarificationNotes: normalizePlanSheetNotes(sheet.clarificationNotes ?? fallback.clarificationNotes),
  };
}

function normalizePlanSheets(planSheets = []) {
  const sourceSheets = Array.isArray(planSheets) ? planSheets : [];
  const normalizedExisting = sourceSheets.map((sheet, index) => normalizePlanSheet(sheet, index));
  const normalizedDefaults = defaultPlanSheets.map((sheet, index) => normalizePlanSheet(sheet, index));
  const mergedSheets = [...normalizedExisting];

  normalizedDefaults.forEach((defaultSheet) => {
    const hasSheet = mergedSheets.some((sheet) => getPlanSheetMatchKey(sheet) === getPlanSheetMatchKey(defaultSheet));

    if (!hasSheet) {
      mergedSheets.push(defaultSheet);
    }
  });

  return mergedSheets;
}

function preserveExistingImageAsset(existingAsset = {}, incomingAsset = {}) {
  if (getImageAssetSource(incomingAsset)) {
    return incomingAsset;
  }

  return {
    dataUrl: existingAsset.dataUrl || "",
    fileName: existingAsset.fileName || "",
    fileType: existingAsset.fileType || "",
    imageSrc: existingAsset.imageSrc || existingAsset.src || "",
    publicUrl: existingAsset.publicUrl || "",
    signedUrl: existingAsset.signedUrl || "",
    src: existingAsset.src || existingAsset.imageSrc || "",
    storagePath: existingAsset.storagePath || "",
    uploadedAt: existingAsset.uploadedAt || "",
  };
}

function normalizeGcPacketTables(gcPacketTables = {}) {
  return {
    pricingSummary: {
      ...defaultGcPacketTables.pricingSummary,
      ...(gcPacketTables.pricingSummary || {}),
      rows: normalizeGcPacketRows("pricingSummary", gcPacketTables.pricingSummary?.rows),
    },
    scheduleOfValues: {
      ...defaultGcPacketTables.scheduleOfValues,
      ...(gcPacketTables.scheduleOfValues || {}),
      rows: normalizeGcPacketRows("scheduleOfValues", gcPacketTables.scheduleOfValues?.rows),
    },
    takeoffQuantities: {
      ...defaultGcPacketTables.takeoffQuantities,
      ...(gcPacketTables.takeoffQuantities || {}),
      rows: normalizeGcPacketRows("takeoffQuantities", gcPacketTables.takeoffQuantities?.rows),
    },
    shadeFootingEstimate: {
      ...defaultGcPacketTables.shadeFootingEstimate,
      ...(gcPacketTables.shadeFootingEstimate || {}),
      rows: normalizeGcPacketRows("shadeFootingEstimate", gcPacketTables.shadeFootingEstimate?.rows),
    },
    proposalNotes: {
      ...defaultGcPacketTables.proposalNotes,
      ...(gcPacketTables.proposalNotes || {}),
    },
  };
}

function normalizeGcPacketRows(sectionKey, rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  if (sectionKey === "pricingSummary") {
    return rows.map((row) => ({
      id: row?.id || createProposalId(),
      label: row?.label ?? "",
      amount: row?.amount ?? "",
      note: row?.note ?? "",
    }));
  }

  const fields = gcPacketRowFields[sectionKey] || [];

  return rows.map((row) => ({
    id: row?.id || createProposalId(),
    ...fields.reduce(
      (normalizedRow, [field]) => ({
        ...normalizedRow,
        [field]: row?.[field] ?? "",
      }),
      {},
    ),
  }));
}

function createEmptyAddendumRecord() {
  return {
    id: createProposalId(),
    addendumNumber: "",
    addendumDate: "",
    titleDescription: "",
    acknowledged: true,
    notes: "",
    includedInPacket: true,
  };
}

function normalizeAddendaRegister(addenda = []) {
  if (!Array.isArray(addenda)) {
    return [];
  }

  return addenda.map((addendum) => ({
    ...createEmptyAddendumRecord(),
    ...addendum,
    id: addendum?.id || createProposalId(),
    acknowledged: addendum?.acknowledged !== false,
    includedInPacket: addendum?.includedInPacket !== false,
  }));
}

function createEmptyRfiRecord() {
  return {
    id: createProposalId(),
    rfiNumber: "",
    dateAsked: "",
    dateAnswered: "",
    source: "",
    question: "",
    answerTreatment: "",
    priceImpact: "",
    scopeImpact: "",
    includedInPacket: true,
  };
}

function normalizeRfiRegister(rfis = []) {
  if (!Array.isArray(rfis)) {
    return [];
  }

  return rfis.map((rfi) => ({
    ...createEmptyRfiRecord(),
    ...rfi,
    id: rfi?.id || createProposalId(),
    includedInPacket: rfi?.includedInPacket !== false,
  }));
}

function getDefaultScopeControlSummary() {
  return {
    includedScope: "",
    exclusions: "",
    clarifications: "",
    acceptedAlternates: "",
    allowances: "",
    ownerGcByOthers: "",
    hiddenUnshownConditionsNote: "",
  };
}

function normalizeScopeControlSummary(summary = {}) {
  return {
    ...getDefaultScopeControlSummary(),
    ...(summary || {}),
  };
}

function hasAddendumRowData(row = {}) {
  return ["addendumNumber", "addendumDate", "titleDescription", "notes"].some((field) => hasTextValue(row[field]));
}

function hasRfiRowData(row = {}) {
  return [
    "rfiNumber",
    "dateAsked",
    "dateAnswered",
    "source",
    "question",
    "answerTreatment",
    "priceImpact",
    "scopeImpact",
  ].some((field) => hasTextValue(row[field]));
}
function parseProjectNotes(notes) {
  const normalizedSmartPaste = normalizeSmartPasteNotes(notes);

  if (isSmartPasteJsonImportNotes(notes)) {
    return parseNormalizedSmartPasteImport(normalizedSmartPaste);
  }

  const sections = collectSmartPasteSections(notes);
  const values = {};
  const fields = [];
  const warnings = [];

  function setTextValue(key, sectionKey, label) {
    const value = getSectionText(sections, sectionKey);

    if (!hasTextValue(value)) {
      return;
    }

    values[key] = value;
    fields.push(label);
  }

  setTextValue("projectName", "projectName", "project name");
  setTextValue("projectLocation", "projectLocation", "project location");
  setTextValue("clientCompany", "clientCompany", "client/company");
  setTextValue("gcCompany", "gcCompany", "GC / Prime");
  setTextValue("contactName", "contactName", "contact name");
  setTextValue("clientPhone", "clientPhone", "client phone");
  setTextValue("clientEmail", "clientEmail", "client email");
  setTextValue("billingAddress", "billingAddress", "billing address");
  setTextValue("projectAddress", "projectAddress", "project address");
  setTextValue("projectOwner", "projectOwner", "owner");
  setTextValue("description", "description", "project description");
  setTextValue("baseBidIncludes", "baseBidIncludes", "base bid includes");
  setTextValue("schedule", "schedule", "schedule");
  setTextValue("scheduleAssumptions", "scheduleAssumptions", "schedule assumptions");
  setTextValue("terms", "terms", "terms");
  setTextValue("proposalExpiration", "proposalExpiration", "proposal expiration");
  setTextValue("paymentTerms", "paymentTerms", "payment terms");
  setTextValue("depositText", "depositTerms", "deposit terms");
  setTextValue("progressBilling", "progressBilling", "progress billing");
  setTextValue("finalPayment", "finalPayment", "final payment");
  setTextValue("latePayment", "latePayment", "late payment");
  setTextValue("changeOrderLanguage", "changeOrders", "change orders");
  setTextValue("siteReadiness", "siteReadiness", "site readiness");
  setTextValue("weatherDelay", "weatherDelays", "weather delays");
  setTextValue("weatherSiteReadiness", "weatherSiteReadiness", "weather / site readiness");
  setTextValue("utilityResponsibility", "utilityResponsibility", "utility responsibility");
  setTextValue("hiddenConditions", "hiddenConditions", "hidden conditions");
  setTextValue("concreteCrackingDisclaimer", "concreteCracking", "concrete cracking");
  setTextValue("colorFinishVariationDisclaimer", "colorFinishVariation", "color / finish variation");
  setTextValue("warrantyLimitation", "warranty", "warranty");
  setTextValue("warrantyLimitation", "warrantyLimitation", "warranty limitation");
  setTextValue("gcScopeControl", "gcScopeControl", "GC / Prime scope control");
  setTextValue("ownerGcByOthers", "ownerGcByOthers", "Owner / GC by others");
  setTextValue("rfiClarificationNotes", "rfiClarifications", "RFIs / Clarifications");
  setTextValue("addendaAcknowledged", "addendaAcknowledged", "addenda acknowledged");
  setTextValue("proposalNotes", "proposalNotes", "proposal notes");
  setTextValue("proposalStatus", "proposalStatus", "proposal status");
  setTextValue("packetPrintOrder", "packetPrintOrder", "packet print order");
  setTextValue("gcPrimeNotes", "gcPrimeNotes", "GC / Prime notes");
  setTextValue("concreteSpecNotes", "concreteSpecs", "concrete specs");

  mergeDirectSmartPasteCoverValues(notes, values, fields);

  if (values.proposalNotes) {
    values.proposalNotes = sanitizeSmartPasteProposalNotes(values.proposalNotes);

    if (!hasTextValue(values.proposalNotes)) {
      delete values.proposalNotes;
    }
  }

  ["rfiClarificationNotes", "addendaAcknowledged", "gcPrimeNotes", "concreteSpecNotes"].forEach((key) => {
    if (values[key]) {
      values[key] = dedupeSmartPasteTextBlock(values[key]);
    }
  });

  if (!values.clientCompany && values.gcCompany) {
    values.clientCompany = values.gcCompany;
    fields.push("client/company");
  }

  const proposalType = normalizeSmartProposalType(getSectionText(sections, "proposalType"));

  if (proposalType) {
    values.proposalType = proposalType;
    fields.push("proposal type");
  }

  const scopeItems = splitSmartPasteList(getSectionText(sections, "scope"));

  if (scopeItems.length > 0) {
    values.scopeItems = scopeItems;
    fields.push("scope");
  }

  const exclusions = splitSmartPasteList(getSectionText(sections, "exclusions"));

  if (exclusions.length > 0) {
    values.exclusions = exclusions;
    fields.push("exclusions");
  }

  const assumptions = splitSmartPasteList(getSectionText(sections, "assumptions"));

  if (assumptions.length > 0) {
    values.assumptions = assumptions;
    fields.push("assumptions");
  }

  const scopeControlSummary = parseSmartPasteScopeControlSummary(getSectionText(sections, "scopeControlSummary"));

  if (Object.keys(scopeControlSummary).length > 0) {
    values.scopeControlSummary = scopeControlSummary;
    fields.push("scope control summary");
  }

  const loosePricingLines = getLooseSmartPastePricingLines(notes);

  if (loosePricingLines.length > 0) {
    sections.pricingSections = [...(sections.pricingSections || []), ...loosePricingLines].filter(
      (line, index, list) => list.indexOf(line) === index,
    );
    recordSmartPasteSection(sections, "pricingSections");
  }

  let lineItems = parseSmartPasteLineItems(sections.lineItems || [], warnings);
  const pricingParse = parseSmartPastePricingSections(sections.pricingSections || [], warnings);
  let planSheetParse = normalizeSmartPastePlanSheets(sections.planSheets || []);
  let gcPacketTableParse = parseSmartPasteGcPacketTables(sections, warnings);
  const addendaRegister = parseSmartPasteAddendaRegister(notes);
  const rfiRegister = parseSmartPasteRfiRegister(notes);
  const subcontractorPacketDetected = isSubcontractorPacketNotes(notes);

  if (subcontractorPacketDetected) {
    values.subcontractorPacketDetected = true;
    fields.push("subcontractor packet mode");
  }

  if (addendaRegister.length > 0) {
    values.addendaRegister = addendaRegister;
    fields.push("structured addenda");
    recordSmartPasteSection(sections, "addendaRegister");
  }

  if (rfiRegister.length > 0) {
    values.rfiRegister = rfiRegister;
    fields.push("structured RFI / clarification register");
    recordSmartPasteSection(sections, "rfiRegister");
  }

  if (pricingParse.baseBidLineItem) {
    values.baseBidLineItem = pricingParse.baseBidLineItem;
    fields.push("base bid");
  }

  if (pricingParse.sections.length > 0) {
    values.pricingSections = pricingParse.sections;
    fields.push("alternates / allowances");
  }

  if (pricingParse.totalIfAllAccepted !== undefined) {
    values.totalIfAllAccepted = pricingParse.totalIfAllAccepted;
    fields.push("total if all accepted");
  }

  if (pricingParse.totalRows.length > 0) {
    values.pricingTotalRows = pricingParse.totalRows;
  }

  if (pricingParse.summaryRows.length > 0 && !values.gcPacketTables?.pricingSummary?.enabled) {
    values.gcPacketTables = {
      ...normalizeGcPacketTables(values.gcPacketTables),
      pricingSummary: {
        ...defaultGcPacketTables.pricingSummary,
        enabled: true,
        rows: pricingParse.summaryRows,
        presentationNotes: "",
      },
    };
    fields.push("pricing summary");
  }

  if (planSheetParse.length > 0) {
    values.planSheets = planSheetParse;
    fields.push("plan sheets / takeoff pages");
  }

  if (gcPacketTableParse.count > 0) {
    values.gcPacketTables = mergeGcPacketTables(values.gcPacketTables, gcPacketTableParse.tables);
    fields.push("structured GC packet tables");
  }

  const normalizedMerge = mergeNormalizedSmartPasteIntoParseState(normalizedSmartPaste, {
    fields,
    lineItems,
    planSheetParse,
    sections,
    values,
    warnings,
  });
  lineItems = normalizedMerge.lineItems;
  planSheetParse = normalizedMerge.planSheetParse;
  gcPacketTableParse = {
    ...gcPacketTableParse,
    count: countEnabledSmartPasteGcPacketTables(values.gcPacketTables),
  };

  if ((sections.__capturedKeys || []).includes("scheduleOfValues") && !values.gcPacketTables?.scheduleOfValues?.rows?.length) {
    warnings.push("Schedule of Values section was found, but no complete SOV rows were parsed.");
  }

  if ((sections.lineItems || []).length > 0 && lineItems.length === 0) {
    warnings.push("Line items were found, but none matched Description | Quantity | Unit | Unit Price.");
  }

  if (fields.length === 0 && lineItems.length === 0 && hasTextValue(notes)) {
    warnings.push("Use clear labels like Project:, Prepared for:, Scope:, or Line items: for best results.");
  }

  values.packetSectionsPrepared = getSmartPastePreparedPacketSectionCount(values);

  return {
    fields: [...new Set(fields)],
    lineItems,
    pricingSectionCount: values.pricingSections?.length ?? pricingParse.sections.length,
    planSheetCount: planSheetParse.length,
    gcPacketTableCount: gcPacketTableParse.count || countEnabledSmartPasteGcPacketTables(values.gcPacketTables),
    sectionsCaptured: getCapturedSmartPasteLabels(sections),
    values,
    warnings: [...new Set(warnings)],
    normalizedSmartPaste,
  };
}

function parseNormalizedSmartPasteImport(normalizedSmartPaste = {}) {
  if (normalizedSmartPaste.invalid) {
    return {
      fields: [],
      lineItems: [],
      pricingSectionCount: 0,
      planSheetCount: 0,
      gcPacketTableCount: 0,
      sectionsCaptured: [],
      values: {},
      warnings: normalizedSmartPaste.warnings || ["Smart Paste JSON import is invalid."],
      jsonImportMode: true,
      jsonImportInvalid: true,
      normalizedSmartPaste,
    };
  }

  const state = {
    fields: [],
    lineItems: [],
    planSheetParse: [],
    sections: {},
    values: {},
    warnings: [],
  };
  const normalizedMerge = mergeNormalizedSmartPasteIntoParseState(normalizedSmartPaste, state);
  const values = state.values;
  values.packetSectionsPrepared = getSmartPastePreparedPacketSectionCount(values);

  return {
    fields: [...new Set(state.fields)],
    lineItems: normalizedMerge.lineItems,
    pricingSectionCount: values.pricingSections?.length || 0,
    planSheetCount: normalizedMerge.planSheetParse.length,
    gcPacketTableCount: countEnabledSmartPasteGcPacketTables(values.gcPacketTables),
    sectionsCaptured: getCapturedSmartPasteLabels(state.sections),
    values,
    warnings: [...new Set(state.warnings)],
    jsonImportMode: true,
    normalizedSmartPaste,
  };
}

function mergeNormalizedSmartPasteIntoParseState(normalized = {}, state = {}) {
  const values = state.values || {};
  const fields = state.fields || [];
  const warnings = state.warnings || [];
  const sections = state.sections || {};
  let lineItems = state.lineItems || [];
  let planSheetParse = state.planSheetParse || [];

  if (!normalized || !normalized.cover) {
    return { lineItems, planSheetParse };
  }

  const cover = normalized.cover || {};
  const pricing = normalized.pricing || {};
  const scope = normalized.scope || {};
  const packet = normalized.packet || {};
  const proposalMode =
    getProposalModeFromParsedProposalType(values.proposalType) ||
    normalizeProposalMode(normalized.proposalMode || cover.proposalMode) ||
    DEFAULT_PROPOSAL_MODE;

  values.proposalMode = proposalMode;
  values.proposalType = getProposalTypeForMode(proposalMode);
  values.packetMode = getPacketModeForProposalMode(proposalMode);
  fields.push("proposal mode");

  setNormalizedTextValue(values, fields, "projectName", cover.projectName, "project name");
  setNormalizedTextValue(values, fields, "projectLocation", cover.projectLocation, "project location");
  setNormalizedTextValue(values, fields, "projectAddress", cover.projectAddress, "project address");
  setNormalizedTextValue(values, fields, "projectOwner", cover.owner, "owner");
  setNormalizedTextValue(values, fields, "clientCompany", cover.clientName, "client/company");
  setNormalizedTextValue(values, fields, "contactName", cover.contactName, "contact name");
  setNormalizedTextValue(values, fields, "clientPhone", cover.phone, "client phone");
  setNormalizedTextValue(values, fields, "clientEmail", cover.email, "client email");
  setNormalizedTextValue(values, fields, "proposalStatus", cover.proposalStatus, "proposal status");
  setNormalizedTextValue(values, fields, "bidPackageNumber", cover.bidPackageNumber, "bid package number");
  setNormalizedTextValue(values, fields, "specSections", cover.specSections, "spec sections");
  setNormalizedTextValue(values, fields, "drawingReferences", cover.drawingReferences, "drawing references");
  setNormalizedTextValue(values, fields, "duration", cover.duration, "duration");
  setNormalizedTextValue(values, fields, "scheduleRestrictions", cover.scheduleRestrictions, "schedule restrictions");
  setNormalizedTextValue(values, fields, "specialRequirements", cover.specialRequirements, "special requirements");

  if (pricing.pricingMode) {
    values.pricingMode = pricing.pricingMode;
    fields.push(pricing.pricingMode === "choose_one_option" ? "pricing options" : "pricing mode");
  }

  if (pricing.pricingOptions?.length > 0) {
    const hasExplicitSelectedOption = pricing.pricingOptions.some((option) => option.included === true || option.selected === true);
    values.pricingOptions = pricing.pricingOptions.map((option, index) => ({
      id: option.id || createProposalId(),
      name: option.name || `Option ${index + 1}`,
      description: option.description || "",
      finishType: option.finishType || "",
      scopeSummary: option.scopeSummary || "",
      includedScope: Array.isArray(option.includedScope) ? option.includedScope : [],
      excludedScope: Array.isArray(option.excludedScope) ? option.excludedScope : [],
      lineItems: Array.isArray(option.lineItems) ? option.lineItems : [],
      notes: Array.isArray(option.notes) ? option.notes : [],
      price: toEditableNumber(option.price),
      downPayment: toEditableNumber(option.downPayment) || toEditableNumber(option.price) / 2,
      finalPayment: toEditableNumber(option.finalPayment) || toEditableNumber(option.price) / 2,
      included: option.included === true || option.selected === true || (!hasExplicitSelectedOption && index === 0),
      selected: option.selected === true || option.included === true || (!hasExplicitSelectedOption && index === 0),
      images: normalizeResidentialOptionImages(option.images),
      scheduleOfValues: normalizeResidentialScheduleOfValues(option.scheduleOfValues),
    }));
    fields.push("pricing options");
  }

  if (pricing.optionalAddOns?.length > 0) {
    values.optionalAddOns = pricing.optionalAddOns.map((addOn) => ({
      id: addOn.id || createProposalId(),
      name: addOn.name || "Optional Add-On",
      description: addOn.description || "",
      amount: toEditableNumber(addOn.amount),
      appliesTo: Array.isArray(addOn.appliesTo) ? addOn.appliesTo : [],
      optionTotals: Array.isArray(addOn.optionTotals) ? addOn.optionTotals : [],
      notes: Array.isArray(addOn.notes) ? addOn.notes : [],
      included: addOn.included === true || addOn.selected === true,
      selected: addOn.selected === true || addOn.included === true,
      images: normalizeResidentialOptionImages(addOn.images),
    })).filter((addOn) => addOn.amount > 0);
    fields.push("optional add-ons");
  }

  if (pricing.lineItems?.length > 0) {
    lineItems = pricing.lineItems.map((item, index) => ({
      itemNumber: String(item.itemNumber || index + 1),
      description: item.description || `Line Item ${index + 1}`,
      quantity: toEditableNumber(item.quantity || 1) || 1,
      unit: item.unit || "LS",
      unitPrice: toEditableNumber(item.unitPrice || item.amount),
      taxable: item.taxable === true,
    }));
    delete values.baseBidLineItem;
    fields.push("line items");
    recordSmartPasteSection(sections, "lineItems");
  } else if (pricing.pricingMode === "choose_one_option" && values.pricingOptions?.length > 0 && !values.baseBidLineItem) {
    const selectedOption = getSelectedSmartPastePricingOption(values.pricingOptions);
    values.baseBidLineItem = {
      itemNumber: "1",
      description: selectedOption?.name || "Selected Pricing Option",
      quantity: 1,
      unit: "LS",
      unitPrice: toEditableNumber(selectedOption?.price || pricing.baseBid),
      taxable: false,
    };
    fields.push("base option");
  } else if (pricing.baseBid > 0 && !values.baseBidLineItem) {
    values.baseBidLineItem = {
      itemNumber: "1",
      description: "Base Bid",
      quantity: 1,
      unit: "LS",
      unitPrice: pricing.baseBid,
      taxable: false,
    };
    fields.push("base bid");
  }

  const normalizedPricingSections = [
    ...(pricing.allowances || []).map((row) => ({
      id: createProposalId(),
      type: "allowance",
      label: row.label || row.description || "Allowance",
      description: row.description || "",
      amount: toEditableNumber(row.amount),
      included: true,
    })),
    ...(pricing.alternates || []).map((row) => ({
      id: createProposalId(),
      type: "add_alternate",
      label: row.label || row.description || "Alternate",
      description: row.description || "",
      amount: toEditableNumber(row.amount),
      included: false,
    })),
    ...(values.optionalAddOns || []).map((row) => ({
      id: row.id || createProposalId(),
      type: "add_alternate",
      label: row.name || "Optional Add-On",
      description: row.description || "",
      amount: toEditableNumber(row.amount),
      included: row.included === true || row.selected === true,
      optionalAddOn: true,
    })),
  ].filter((row) => row.amount > 0);

  if (normalizedPricingSections.length > 0 || pricing.acceptedAlternatesNone) {
    values.pricingSections = normalizedPricingSections;
    fields.push("alternates / allowances");
  }

  if (pricing.totalProposal > 0) {
    values.totalIfAllAccepted = pricing.totalProposal;
    values.pricingTotalRows = [
      ...(values.pricingTotalRows || []),
      { label: "Total Proposal", amount: pricing.totalProposal, kind: "total_presentation" },
    ];
    fields.push("total proposal");
  }

  const normalizedTables = buildNormalizedSmartPasteGcPacketTables(normalized);

  if (countEnabledSmartPasteGcPacketTables(normalizedTables) > 0) {
    values.gcPacketTables = mergeGcPacketTables(values.gcPacketTables, normalizedTables);
    fields.push("structured GC packet tables");
  }

  if (scope.projectDescription) {
    values.description = scope.projectDescription;
    fields.push("project description");
  }

  if (scope.scopeSections?.length > 0) {
    values.scopeSections = scope.scopeSections.map((section) => ({
      title: section.title,
      items: section.bullets || [],
    }));
    fields.push("scope");
    recordSmartPasteSection(sections, "scope");
  }

  if (scope.includedScope?.length > 0 && !values.scopeItems) {
    values.scopeItems = scope.includedScope;
    fields.push("included scope");
  }

  if (scope.exclusions?.length > 0) {
    values.exclusions = scope.exclusions;
    fields.push("exclusions");
  }

  if (scope.assumptions?.length > 0) {
    values.assumptions = scope.assumptions;
    fields.push("assumptions");
  }

  if (Object.keys(scope.concreteSpecifications || {}).length > 0) {
    values.concreteSpecs = scope.concreteSpecifications;
    fields.push("concrete specs");
  }

  if (packet.planSheets?.length > 0) {
    values.planSheets = packet.planSheets.map(mapNormalizedSmartPastePlanSheet);
    planSheetParse = normalizeSmartPastePlanSheets(values.planSheets);
    fields.push("plan sheets / takeoff pages");
    recordSmartPasteSection(sections, "planSheets");
  }

  if (packet.rfiRegister?.length > 0) {
    values.rfiRegister = packet.rfiRegister.map((row) => ({
      ...createEmptyRfiRecord(),
      rfiNumber: row.number || "",
      dateAsked: row.asked || "",
      dateAnswered: row.answered || "",
      source: row.source || "",
      question: row.question || "",
      answerTreatment: row.treatment || "",
      priceImpact: row.priceImpact || "",
      scopeImpact: row.scopeImpact || "",
      includedInPacket: true,
    }));
    fields.push("structured RFI / clarification register");
    recordSmartPasteSection(sections, "rfiRegister");
  }

  if (packet.addendaAcknowledgement?.length > 0) {
    values.addendaRegister = packet.addendaAcknowledgement.map((row) => ({
      ...createEmptyAddendumRecord(),
      addendumNumber: row.number || "",
      addendumDate: row.date || "",
      titleDescription: row.titleDescription || "",
      acknowledged: row.acknowledged !== false,
      notes: row.notes || "",
      includedInPacket: row.includedInPacket !== false,
    }));
    fields.push("structured addenda");
    recordSmartPasteSection(sections, "addendaRegister");
  }

  if (Object.keys(packet.scopeControlSummary || {}).length > 0) {
    values.scopeControlSummary = {
      ...(values.scopeControlSummary || {}),
      ...packet.scopeControlSummary,
    };
    fields.push("scope control summary");
    recordSmartPasteSection(sections, "scopeControlSummary");
  }

  mergeNormalizedLegalTerms(values, fields, packet.legalTerms || {});

  if (normalized.residentialLegalPapers) {
    values.residentialLegalPapers = normalizeResidentialLegalPapers(normalized.residentialLegalPapers);
    fields.push("residential legal papers");
    recordSmartPasteSection(sections, "residentialLegalPapers");
  }

  if (packet.finalPacketPrintOrder?.length > 0) {
    values.packetPrintOrder = packet.finalPacketPrintOrder.map((row) => `${row.order} - ${row.label} - ${row.status}`).join("\n");
    values.packetBuilder = mapNormalizedPacketPrintOrder(packet.finalPacketPrintOrder);
    fields.push("packet print order");
    recordSmartPasteSection(sections, "packetPrintOrder");
  }

  (normalized.sectionsCaptured || []).forEach((sectionKey) => recordSmartPasteSection(sections, sectionKey));
  warnings.push(...(normalized.warnings || []));
  values.normalizedSmartPaste = normalized;
  values.packetSectionsPrepared = getSmartPastePreparedPacketSectionCount(values);

  return { lineItems, planSheetParse };
}

function setNormalizedTextValue(values, fields, key, value, label) {
  if (!hasTextValue(value)) {
    return;
  }

  values[key] = value;
  fields.push(label);
}

function getSelectedSmartPastePricingOption(options = []) {
  return options.find((option) => option.selected || option.included) || options[0] || null;
}

function getSmartPastePricingOptionSovRowCount(pricingOptions = []) {
  return (Array.isArray(pricingOptions) ? pricingOptions : []).reduce(
    (sum, option) => sum + normalizeResidentialScheduleOfValues(option?.scheduleOfValues).length,
    0,
  );
}

function buildNormalizedSmartPasteGcPacketTables(normalized = {}) {
  const pricing = normalized.pricing || {};
  const packet = normalized.packet || {};
  const tables = normalizeGcPacketTables();
  const pricingRows = [];

  (pricing.lineItems || []).forEach((item) => {
    pricingRows.push(createPricingSummaryRow(item.description || "Base Bid", item.amount || item.unitPrice, ""));
  });

  (pricing.allowances || []).forEach((row) => pricingRows.push(createPricingSummaryRow(row.label || "Allowance", row.amount, row.description || "")));
  (pricing.alternates || []).forEach((row) => pricingRows.push(createPricingSummaryRow(row.label || "Alternate", row.amount, row.description || "")));

  if (pricing.totalRows?.length > 0) {
    pricing.totalRows.forEach((row) => {
      pricingRows.push(createPricingSummaryRow(row.label || "Total Proposal", row.amount, pricing.pricingSummaryNotes || ""));
    });
  } else if (pricing.totalProposal > 0) {
    pricingRows.push(createPricingSummaryRow("Total Proposal", pricing.totalProposal, pricing.pricingSummaryNotes || ""));
  }

  if (pricingRows.length > 0 || hasTextValue(pricing.pricingSummaryNotes)) {
    tables.pricingSummary = {
      ...tables.pricingSummary,
      enabled: true,
      rows: pricingRows,
      presentationNotes: pricing.pricingSummaryNotes || "",
    };
  }

  if (packet.scheduleOfValues?.length > 0) {
    tables.scheduleOfValues = {
      ...tables.scheduleOfValues,
      enabled: true,
      rows: packet.scheduleOfValues.map((row) => ({
        id: createProposalId(),
        item: row.item || "",
        description: row.description || "",
        pricingBasis: row.pricingBasis || "",
        amount: row.amount || "",
      })),
    };
  }

  if (packet.takeoffQuantities?.length > 0) {
    tables.takeoffQuantities = {
      ...tables.takeoffQuantities,
      enabled: true,
      rows: packet.takeoffQuantities.map((row) => ({
        id: createProposalId(),
        item: row.item || "",
        quantity: row.quantity || "",
        detailSize: row.detailSize || "",
        netCy: row.netCy || "",
        cyWithTenPercent: row.cyWithWaste || row.cyWithTenPercent || "",
        priceStatus: row.priceStatus || "",
      })),
    };
  }

  const proposalNotes = packet.proposalNotes || {};

  if ([proposalNotes.proposalBasis, proposalNotes.contractScopeControl, proposalNotes.acceptanceSummary, proposalNotes.notes].some(hasTextValue)) {
    tables.proposalNotes = {
      ...tables.proposalNotes,
      enabled: true,
      proposalBasis: proposalNotes.proposalBasis || proposalNotes.notes || "",
      contractScopeControl: proposalNotes.contractScopeControl || "",
      acceptanceSummary: proposalNotes.acceptanceSummary || "",
    };
  }

  return tables;
}

function mapNormalizedSmartPastePlanSheet(sheet = {}) {
  const title = sheet.title || sheet.sheetId || "Plan Takeoff Sheet";

  return {
    id: createProposalId(),
    matchKey: createPlanSheetMatchKey(sheet.sheetId || title),
    enabled: true,
    pageType: "plan_takeoff_sheet",
    title,
    subtitle: sheet.subtitle || "",
    imageSrc: "",
    calculationTitle: sheet.calculationBoxTitle || "Calculation Notes",
    calculationNotes: sheet.calculationNotes || [],
    clarificationNotes: sheet.clarificationNotes || [],
  };
}

function mergeNormalizedLegalTerms(values, fields, legalTerms = {}) {
  const map = {
    acceptanceLanguage: "acceptanceLanguage",
    changeOrderLanguage: "changeOrderLanguage",
    colorFinishVariationDisclaimer: "colorFinishVariationDisclaimer",
    concreteCrackingDisclaimer: "concreteCrackingDisclaimer",
    depositText: "depositText",
    finalPayment: "finalPayment",
    gcScopeControl: "gcScopeControl",
    hiddenConditions: "hiddenConditions",
    latePayment: "latePayment",
    paymentTerms: "paymentTerms",
    progressBilling: "progressBilling",
    proposalExpiration: "proposalExpiration",
    siteReadiness: "siteReadiness",
    utilityResponsibility: "utilityResponsibility",
    warrantyLimitation: "warrantyLimitation",
    weatherDelay: "weatherDelay",
  };

  Object.entries(map).forEach(([sourceKey, valueKey]) => {
    if (hasTextValue(legalTerms[sourceKey])) {
      values[valueKey] = legalTerms[sourceKey];
      fields.push("legal terms");
    }
  });
}

function mapNormalizedPacketPrintOrder(rows = []) {
  const rowsBySectionId = new Map();

  rows.forEach((row) => {
    const sectionId = getPacketBuilderSectionId(row.label);

    if (!sectionId) {
      return;
    }

    rowsBySectionId.set(sectionId, row);
  });

  return PACKET_BUILDER_SECTIONS.map((section) => {
    const row = rowsBySectionId.get(section.id);
    const status = String(row?.status || "").toLowerCase();

    return {
      id: section.id,
      title: section.title,
      included: row ? !/(not included|exclude|excluded|hidden)/i.test(status) : section.defaultIncluded,
      order: row?.order || section.defaultOrder,
    };
  }).sort((a, b) => a.order - b.order);
}

function getPacketBuilderSectionId(label = "") {
  const normalizedLabel = normalizeSmartPasteFingerprint(label);

  const directMatch = PACKET_BUILDER_SECTIONS.find((section) => normalizeSmartPasteFingerprint(section.title) === normalizedLabel);

  if (directMatch) {
    return directMatch.id;
  }

  if (normalizedLabel.includes("cover")) return "cover_summary";
  if (normalizedLabel.includes("details") || normalizedLabel.includes("pricing summary")) return "details_pricing";
  if (normalizedLabel.includes("scope control")) return "scope_control_summary";
  if (normalizedLabel.includes("schedule of values") || normalizedLabel === "sov") return "schedule_of_values";
  if (normalizedLabel.includes("takeoff")) return "takeoff_quantities";
  if (normalizedLabel.includes("addenda")) return "addenda_acknowledgement";
  if (normalizedLabel.includes("rfi") || normalizedLabel.includes("clarification")) return "rfi_clarification_register";
  if (normalizedLabel.includes("legal") || normalizedLabel.includes("terms")) return "legal_terms";
  if (normalizedLabel.includes("appendix")) return "appendix_overflow";
  if (normalizedLabel.includes("plan sheet")) return "plan_sheet_pages";
  if (normalizedLabel.includes("shade footing")) return "shade_footing_estimate";
  if (normalizedLabel.includes("proposal notes") || normalizedLabel.includes("acceptance")) return "proposal_notes_acceptance_summary";

  return "";
}

function countEnabledSmartPasteGcPacketTables(tables = {}) {
  const normalizedTables = normalizeGcPacketTables(tables);

  return Object.values(normalizedTables).filter((table) => table.enabled).length;
}

function mergeDirectSmartPasteCoverValues(notes, values, fields) {
  const extractedCoverValues = extractSmartPasteCoverFieldsFromNotes(notes);
  const mergedCoverValues = mergeSmartPasteCoverValues(values, extractedCoverValues);
  const labels = {
    clientCompany: "client/company",
    clientEmail: "client email",
    clientPhone: "client phone",
    contactName: "contact name",
    projectAddress: "project address",
    projectLocation: "project location",
    projectName: "project name",
  };

  Object.entries(labels).forEach(([key, label]) => {
    if (hasTextValue(mergedCoverValues[key]) && mergedCoverValues[key] !== values[key]) {
      fields.push(label);
    }
  });

  Object.assign(values, mergedCoverValues);

  if (
    isLikelySmartPasteStreetAddress(values.projectName) &&
    (hasTextValue(values.projectLocation) || hasTextValue(values.projectAddress))
  ) {
    if (!hasTextValue(values.projectAddress)) {
      values.projectAddress = values.projectName;
      fields.push("project address");
    }

    if (!hasTextValue(values.projectLocation)) {
      values.projectLocation = values.projectName;
      fields.push("project location");
    }

    delete values.projectName;
  }
}

function applyParsedNotesToProposal(proposal, parsedNotes) {
  const nextProposal = cloneObject(proposal);
  const values = parsedNotes.values;
  nextProposal.project = nextProposal.project || {};
  nextProposal.client = nextProposal.client || {};
  nextProposal.terms = nextProposal.terms || {};
  nextProposal.gcPrime = nextProposal.gcPrime || {};
  nextProposal.concreteSpecs = nextProposal.concreteSpecs || {};
  nextProposal.gcPacketTables = normalizeGcPacketTables(nextProposal.gcPacketTables);
  const cleanupPlan = getSmartPasteCleanupPlan(nextProposal, parsedNotes);

  applySmartPasteCleanup(nextProposal, cleanupPlan);
  parsedNotes.cleanupActions = cleanupPlan.actions;
  parsedNotes.coverFieldsUpdated = getSmartPasteCoverFieldsUpdated(values);
  parsedNotes.defaultsCleared = cleanupPlan.actions.length;
  parsedNotes.defaultRowsRemoved = cleanupPlan.defaultRowsRemoved;
  parsedNotes.packetSectionsCreated =
    values.packetSectionsPrepared || (values.subcontractorPacketDetected ? getSubcontractorPacketBuilder().filter((section) => section.included).length : 0);
  parsedNotes.pricingRowsReplaced = values.gcPacketTables?.pricingSummary?.rows?.length || 0;

  const proposalMode = normalizeProposalMode(values.proposalMode || nextProposal.proposalMode) || DEFAULT_PROPOSAL_MODE;
  nextProposal.proposalMode = proposalMode;
  nextProposal.proposalType = getProposalTypeForMode(proposalMode);
  nextProposal.type = nextProposal.proposalType;
  nextProposal.packetMode = getPacketModeForProposalMode(proposalMode);

  if (values.projectName) {
    nextProposal.project.name = values.projectName;
  }

  if (values.projectLocation) {
    nextProposal.project.location = values.projectLocation;
    nextProposal.project.address = values.projectAddress || values.projectLocation;
  }

  if (values.clientCompany) {
    nextProposal.client.companyName = values.clientCompany;
  }

  if (values.contactName) {
    nextProposal.client.contactName = values.contactName;
  }

  if (values.clientPhone) {
    nextProposal.client.phone = values.clientPhone;
  }

  if (values.clientEmail) {
    nextProposal.client.email = values.clientEmail;
  }

  if (values.billingAddress) {
    nextProposal.client.billingAddress = values.billingAddress;
    nextProposal.client.address = values.billingAddress;
  }

  if (values.projectAddress) {
    nextProposal.client.projectAddress = values.projectAddress;
    nextProposal.project.address = values.projectAddress;
  }

  if (values.projectOwner) {
    nextProposal.project.owner = values.projectOwner;
    nextProposal.gcPrime.ownerAgency = values.projectOwner;
    nextProposal.gcPrime.gcPrimeNotes = dedupeSmartPasteTextBlock(
      ["Owner / Public Agency: " + values.projectOwner, nextProposal.gcPrime.gcPrimeNotes].filter(hasTextValue).join("\n"),
    );
  }

  const projectDescription = getSmartPasteProjectDescription(values);

  if (projectDescription) {
    nextProposal.project.description = projectDescription;
  }

  const scheduleText = [values.schedule, values.scheduleAssumptions].filter(hasTextValue).join("\n");
  const durationText = [values.duration, values.scheduleRestrictions].filter(hasTextValue).join("\n");

  if (scheduleText || durationText) {
    const resolvedScheduleText = scheduleText || durationText;
    nextProposal.project.estimatedDuration = resolvedScheduleText;
    nextProposal.project.proposedSchedule = {
      ...(nextProposal.project.proposedSchedule || {}),
      display: resolvedScheduleText,
    };
    nextProposal.project.scheduleRestrictions = values.scheduleRestrictions || values.scheduleAssumptions || nextProposal.project.scheduleRestrictions || "";
  }

  if (values.bidPackageNumber) {
    nextProposal.gcPrime.bidPackageNumber = values.bidPackageNumber;
  }

  if (values.specSections) {
    nextProposal.gcPrime.specSection = values.specSections;
  }

  if (values.drawingReferences) {
    nextProposal.gcPrime.drawingReferences = values.drawingReferences;
  }

  if (values.specialRequirements) {
    nextProposal.project.specialRequirements = values.specialRequirements;
    nextProposal.gcPrime.gcPrimeNotes = dedupeSmartPasteTextBlock(
      [nextProposal.gcPrime.gcPrimeNotes, "Special requirements: " + values.specialRequirements].filter(hasTextValue).join("\n"),
    );
  }

  if (values.proposalType && !values.proposalMode) {
    nextProposal.proposalType = values.proposalType;
    nextProposal.type = values.proposalType;
  }

  if (!isResidentialProposalMode(proposalMode) && values.packetPrintOrder && values.packetSectionsPrepared > 0) {
    nextProposal.proposalMode = isGcPrimePacketMode(proposalMode) ? proposalMode : "gc_prime_packet";
    nextProposal.proposalType = "gc_prime";
    nextProposal.type = "gc_prime";
    nextProposal.packetMode = "full_gc_packet";
  }

  if (values.scopeSections) {
    nextProposal.scopeSections = values.scopeSections;
  } else if (values.scopeItems) {
    nextProposal.scopeSections = [
      {
        title: "Scope of Work",
        items: values.scopeItems,
      },
    ];
  } else if (values.description) {
    nextProposal.scopeSections = [
      {
        title: "Scope Summary",
        items: [values.description],
      },
    ];
  }

  if (values.exclusions) {
    nextProposal.exclusions = values.exclusions;
  }

  if (values.assumptions) {
    nextProposal.assumptions = values.assumptions;
  }

  if (values.terms) {
    nextProposal.terms = {
      ...nextProposal.terms,
      payment: values.terms,
    };
  }

  const termFieldMap = [
    ["proposalExpiration", "proposalExpiration"],
    ["depositText", "depositText"],
    ["progressBilling", "progressBilling"],
    ["finalPayment", "finalPayment"],
    ["latePayment", "latePayment"],
    ["siteReadiness", "siteReadiness"],
    ["weatherDelay", "weatherDelay"],
    ["weatherSiteReadiness", "weatherSiteReadiness"],
    ["utilityResponsibility", "utilityResponsibility"],
    ["concreteCrackingDisclaimer", "concreteCrackingDisclaimer"],
    ["colorFinishVariationDisclaimer", "colorFinishVariationDisclaimer"],
    ["acceptanceLanguage", "acceptanceLanguage"],
  ];

  termFieldMap.forEach(([valueKey, termKey]) => {
    if (values[valueKey]) {
      nextProposal.terms = {
        ...(nextProposal.terms || {}),
        [termKey]: values[valueKey],
      };
    }
  });

  if (values.paymentTerms) {
    nextProposal.terms.payment = values.paymentTerms;
  }

  if (values.changeOrderLanguage) {
    nextProposal.terms.changeOrderLanguage = values.changeOrderLanguage;
    nextProposal.gcPrime.changeOrderProcess = values.changeOrderLanguage;
  }

  if (values.hiddenConditions) {
    nextProposal.terms.hiddenConditions = values.hiddenConditions;
    nextProposal.gcPrime.scopeControlSummary = {
      ...normalizeScopeControlSummary(nextProposal.gcPrime.scopeControlSummary),
      hiddenUnshownConditionsNote: values.hiddenConditions,
    };
  }

  if (values.warrantyLimitation) {
    nextProposal.terms.warrantyLimitation = values.warrantyLimitation;
  }

  if (values.residentialLegalPapers) {
    nextProposal.residentialLegalPapers = normalizeResidentialLegalPapers(values.residentialLegalPapers);
  }

  if (values.gcScopeControl) {
    nextProposal.terms.gcScopeControl = values.gcScopeControl;
    const gcPacketTables = normalizeGcPacketTables(nextProposal.gcPacketTables);
    nextProposal.gcPacketTables = {
      ...gcPacketTables,
      proposalNotes: {
        ...gcPacketTables.proposalNotes,
        enabled: true,
        contractScopeControl: values.gcScopeControl,
      },
    };
  }

  if (values.ownerGcByOthers) {
    nextProposal.gcPrime.scopeControlSummary = {
      ...normalizeScopeControlSummary(nextProposal.gcPrime.scopeControlSummary),
      ownerGcByOthers: values.ownerGcByOthers,
    };
  }

  if (values.scopeControlSummary) {
    nextProposal.gcPrime.scopeControlSummary = {
      ...normalizeScopeControlSummary(nextProposal.gcPrime.scopeControlSummary),
      ...values.scopeControlSummary,
    };
  }

  if (values.rfiClarificationNotes) {
    nextProposal.gcPrime.rfiClarificationNotes = values.rfiClarificationNotes;
  }

  if (values.addendaAcknowledged) {
    nextProposal.gcPrime.addendaAcknowledged = values.addendaAcknowledged;
  }

  if (values.addendaRegister) {
    nextProposal.gcPrime.addendaRegister = mergeRegisterRows(
      normalizeAddendaRegister(nextProposal.gcPrime.addendaRegister),
      values.addendaRegister,
      "addendumNumber",
    );
  }

  if (values.rfiRegister) {
    nextProposal.gcPrime.rfiRegister = mergeRegisterRows(
      normalizeRfiRegister(nextProposal.gcPrime.rfiRegister),
      values.rfiRegister,
      "rfiNumber",
    );
  }

  if (values.proposalNotes) {
    nextProposal.proposalNotes = values.proposalNotes;
    nextProposal.notes = values.proposalNotes;
  }

  if (values.gcPrimeNotes) {
    nextProposal.gcPrime.gcPrimeNotes = dedupeSmartPasteTextBlock(
      [nextProposal.gcPrime.gcPrimeNotes, values.gcPrimeNotes].filter(hasTextValue).join("\n"),
    );
  }

  if (values.concreteSpecNotes) {
    nextProposal.concreteSpecs.notes = values.concreteSpecNotes;
  }

  if (values.concreteSpecs) {
    nextProposal.concreteSpecs = {
      ...(nextProposal.concreteSpecs || {}),
      ...values.concreteSpecs,
    };
  }

  if (values.subcontractorPacketDetected && !isResidentialProposalMode(proposalMode)) {
    nextProposal.proposalMode = isGcPrimePacketMode(proposalMode) ? "gc_prime_packet" : "commercial_subcontractor";
    nextProposal.proposalType = getProposalTypeForMode(nextProposal.proposalMode);
    nextProposal.type = nextProposal.proposalType;
    nextProposal.packetMode = getPacketModeForProposalMode(nextProposal.proposalMode);
    nextProposal.packetBuilder = isGcPrimePacketMode(nextProposal.proposalMode) ? getSubcontractorPacketBuilder() : [];
    nextProposal.terms = {
      ...nextProposal.terms,
      gcScopeControl:
        nextProposal.terms.gcScopeControl ||
        "Last Yard Concrete is bidding as a concrete/site package subcontractor. Proposal includes only the concrete/site package scope specifically listed and is not a full GC/prime proposal.",
    };
    nextProposal.gcPrime.scopeControlSummary = {
      ...normalizeScopeControlSummary(nextProposal.gcPrime.scopeControlSummary),
      includedScope:
        nextProposal.gcPrime.scopeControlSummary?.includedScope ||
        "Last Yard Concrete is bidding as a concrete/site package subcontractor for the listed concrete/site package scope only.",
      clarifications:
        nextProposal.gcPrime.scopeControlSummary?.clarifications ||
        "Last Yard is not bidding as full GC/prime. Optional Support Scope is separate unless accepted in writing.",
    };
  }

  if (parsedNotes.lineItems.length > 0) {
    nextProposal.lineItems = parsedNotes.lineItems;
  } else if (values.baseBidLineItem) {
    nextProposal.lineItems = [values.baseBidLineItem];
  }

  if (values.pricingMode) {
    nextProposal.pricingMode = values.pricingMode;
  }

  if (values.pricingOptions) {
    nextProposal.pricingOptions = values.pricingOptions;
  }

  if (values.optionalAddOns) {
    nextProposal.optionalAddOns = values.optionalAddOns;
  }

  if (values.pricingSections) {
    nextProposal.pricingSections = values.pricingSections;
  }

  if (values.planSheets) {
    nextProposal.planSheets = mergePlanSheets(nextProposal.planSheets, values.planSheets);
  }

  if (values.gcPacketTables) {
    nextProposal.gcPacketTables = mergeGcPacketTables(nextProposal.gcPacketTables, values.gcPacketTables);
  }

  if (values.packetBuilder && !isResidentialProposalMode(proposalMode)) {
    nextProposal.proposalMode = "gc_prime_packet";
    nextProposal.packetBuilder = values.packetBuilder;
    nextProposal.proposalType = "gc_prime";
    nextProposal.type = "gc_prime";
    nextProposal.packetMode = "full_gc_packet";
  }

  if (values.subcontractorPacketDetected && !isResidentialProposalMode(proposalMode)) {
    const gcPacketTables = normalizeGcPacketTables(nextProposal.gcPacketTables);
    nextProposal.gcPacketTables = {
      ...gcPacketTables,
      proposalNotes: {
        ...gcPacketTables.proposalNotes,
        enabled: true,
        contractScopeControl:
          gcPacketTables.proposalNotes.contractScopeControl ||
          "Last Yard Concrete is bidding as a concrete/site package subcontractor. Work outside the listed concrete/site package scope is excluded unless expressly accepted in writing.",
        acceptanceSummary:
          gcPacketTables.proposalNotes.acceptanceSummary ||
          "Internal review draft. GC/Prime to confirm accepted base scope, additive alternate, optional support scope, exclusions, and clarifications before release.",
      },
    };
  }

  return nextProposal;
}

function getSmartPasteCleanupPlan(proposal = {}, parsedNotes = {}) {
  const values = parsedNotes.values || {};
  const hasIncomingProjectData = ["projectName", "projectLocation", "projectAddress", "projectOwner", "clientCompany", "contactName", "clientEmail", "clientPhone"].some(
    (field) => hasTextValue(values[field]),
  );
  const hasIncomingPricingData = parsedNotes.lineItems.length > 0 || values.baseBidLineItem || values.pricingSections || values.gcPacketTables?.pricingSummary?.enabled;
  const hasIncomingPacketData =
    values.subcontractorPacketDetected ||
    values.gcPacketTables ||
    values.rfiClarificationNotes ||
    values.addendaAcknowledged ||
    values.proposalNotes ||
    values.scopeItems ||
    values.exclusions ||
    values.assumptions;
  const isStarterDraft = isLikelyStarterOrBlankDraft(proposal);
  const actions = [];
  const defaultRowsRemoved = [];

  if (isStarterDraft && (hasIncomingProjectData || hasIncomingPricingData || hasIncomingPacketData)) {
    actions.push("Starter/demo project and client defaults cleared.");
  }

  if (isStarterDraft && hasIncomingPricingData) {
    actions.push("Starter/default pricing rows replaced with pasted pricing.");
  }

  if (isStarterDraft && hasIncomingPacketData) {
    actions.push("Starter scope, exclusions, notes, packet records, and send history cleared.");
  }

  if (isStarterDraft) {
    const defaultRows = getDefaultPricingRowsInProposal(proposal);

    if (defaultRows.length > 0) {
      defaultRowsRemoved.push(...defaultRows);
    }
  }

  if (values.gcPacketTables?.pricingSummary?.enabled || hasIncomingPricingData) {
    getDefaultPricingSummaryRows(proposal).forEach((row) => {
      if (!defaultRowsRemoved.includes(row)) {
        defaultRowsRemoved.push(row);
      }
    });
  }

  if (values.subcontractorPacketDetected) {
    actions.push("Subcontractor GC packet wording and section order applied.");
  }

  return {
    actions: [...new Set(actions)],
    clearStarterDefaults: isStarterDraft && (hasIncomingProjectData || hasIncomingPricingData || hasIncomingPacketData),
    clearStarterPacketDefaults: isStarterDraft && hasIncomingPacketData,
    clearStarterPricingDefaults: isStarterDraft && hasIncomingPricingData,
    defaultRowsRemoved: [...new Set(defaultRowsRemoved)],
  };
}

function applySmartPasteCleanup(proposal, cleanupPlan) {
  if (!cleanupPlan.clearStarterDefaults) {
    return;
  }

  proposal.contactId = "";
  proposal.client = {
    ...(proposal.client || {}),
    companyName: "",
    contactName: "",
    title: "",
    address: "",
    billingAddress: "",
    cityStateZip: "",
    projectAddress: "",
    phone: "",
    email: "",
  };
  proposal.project = {
    ...(proposal.project || {}),
    name: "",
    location: "",
    address: "",
    owner: "",
    description: "",
    estimatedDuration: "",
    proposedSchedule: {
      ...(proposal.project?.proposedSchedule || {}),
      startDate: "",
      endDate: "",
      display: "",
    },
  };

  if (cleanupPlan.clearStarterPacketDefaults) {
    proposal.scopeSections = [];
    proposal.exclusions = [];
    proposal.assumptions = [];
    proposal.proposalNotes = "";
    proposal.notes = "";
    proposal.gcPrime = {
      ...(proposal.gcPrime || {}),
      addendaAcknowledged: "",
      rfiClarificationNotes: "",
      gcPrimeNotes: "",
    };
    proposal.projectPhotos = [];
    proposal.planSheets = [];
    proposal.submittedPacketRecords = [];
    proposal.sendRecords = [];
  }

  if (cleanupPlan.clearStarterPricingDefaults) {
    proposal.lineItems = [];
    proposal.pricingSections = [];
    proposal.gcPacketTables = normalizeGcPacketTables({});
  }
}

function getSmartPasteCoverFieldsUpdated(values = {}) {
  const coverFields = [];

  if (values.projectName) {
    coverFields.push("Project Name");
  }

  if (values.projectLocation || values.projectAddress) {
    coverFields.push("Project Location");
  }

  if (values.clientCompany) {
    coverFields.push("Prepared For");
  }

  if (values.contactName) {
    coverFields.push("Attention / Contact");
  }

  if (values.clientEmail) {
    coverFields.push("Email");
  }

  if (values.clientPhone) {
    coverFields.push("Phone");
  }

  return coverFields;
}

function isLikelyStarterOrBlankDraft(proposal = {}) {
  const projectName = String(proposal.project?.name || "").trim().toLowerCase();
  const projectLocation = String(proposal.project?.location || "").trim().toLowerCase();
  const clientName = String(proposal.client?.companyName || "").trim().toLowerCase();

  return (
    proposal.templateId === "blank" ||
    !projectName ||
    projectName === "marketplace retail center" ||
    projectLocation === "albany, or" ||
    !clientName ||
    clientName === "company name"
  );
}

function getDefaultPricingRowsInProposal(proposal = {}) {
  const rows = [];

  (proposal.lineItems || []).forEach((item) => {
    const description = String(item?.description || "").trim();

    if (isStarterLineItemDescription(description)) {
      rows.push(description);
    }
  });

  (proposal.pricingSections || []).forEach((section) => {
    const label = String(section?.label || section?.description || "").trim();

    if (isUnrelatedDefaultPricingLabel(label)) {
      rows.push(label);
    }
  });

  return rows;
}

function getDefaultPricingSummaryRows(proposal = {}) {
  return (proposal.gcPacketTables?.pricingSummary?.rows || [])
    .map((row) => String(row?.label || row?.description || row?.item || "").trim())
    .filter(isUnrelatedDefaultPricingLabel);
}

function isStarterLineItemDescription(value = "") {
  const normalizedValue = value.toLowerCase();

  return [
    "site prep & excavation",
    "sidewalks - 4 in thick",
    "curb & gutter",
    "concrete pads / slabs - 5 in thick",
    "control joints & sealant",
    "mobilization",
  ].includes(normalizedValue);
}

function isUnrelatedDefaultPricingLabel(value = "") {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("estimated shade footings") ||
    normalizedValue.includes("interface / rfi allowance") ||
    normalizedValue.includes("concrete interface / rfi allowance") ||
    normalizedValue.includes("base with allowances")
  );
}

function isSubcontractorPacketNotes(notes) {
  const textValue = String(notes || "").toLowerCase();

  return (
    /concrete\s*\/\s*site package subcontractor/.test(textValue) ||
    /site package subcontractor/.test(textValue) ||
    /subcontractor proposal/.test(textValue) ||
    /not\s+(?:as\s+)?(?:a\s+)?full gc\s*\/\s*prime/.test(textValue) ||
    /not full gc\s*\/\s*prime/.test(textValue) ||
    /bidding to .*(gc|prime|faison)/.test(textValue)
  );
}

function getSubcontractorPacketBuilder() {
  const includedSectionIds = [
    "cover_summary",
    "details_pricing",
    "scope_control_summary",
    "pricing_summary",
    "schedule_of_values",
    "rfi_clarification_register",
    "takeoff_quantities",
    "legal_terms",
    "proposal_notes_acceptance_summary",
  ];

  return PACKET_BUILDER_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    included: includedSectionIds.includes(section.id),
    order: includedSectionIds.includes(section.id) ? (includedSectionIds.indexOf(section.id) + 1) * 10 : section.defaultOrder + 100,
  }));
}

function collectSmartPasteSections(notes) {
  const sections = {};
  const lines = String(notes || "").split(/\r?\n/);
  let activeKey = "";
  let activePlanSheetIndex = -1;
  let activePlanSheetField = "calculationNotes";
  const multiLineKeys = new Set([
    "scope",
    "description",
    "baseBidIncludes",
    "schedule",
    "scheduleAssumptions",
    "scopeControlSummary",
    "exclusions",
    "assumptions",
    "terms",
    "proposalExpiration",
    "paymentTerms",
    "depositTerms",
    "progressBilling",
    "finalPayment",
    "latePayment",
    "changeOrders",
    "siteReadiness",
    "weatherDelays",
    "weatherSiteReadiness",
    "utilityResponsibility",
    "hiddenConditions",
    "concreteCracking",
    "colorFinishVariation",
    "warranty",
    "warrantyLimitation",
    "gcScopeControl",
    "ownerGcByOthers",
    "description",
    "baseBidIncludes",
    "schedule",
    "scheduleAssumptions",
    "scopeControlSummary",
    "lineItems",
    "rfiClarifications",
    "rfiRegister",
    "addendaAcknowledged",
    "addendaRegister",
    "packetPrintOrder",
    "proposalNotes",
    "gcPrimeNotes",
    "concreteSpecs",
    "pricingSections",
    "planSheets",
    "pricingSummary",
    "scheduleOfValues",
    "takeoffQuantities",
    "shadeFootingEstimate",
    "acceptanceSummary",
    "proposalBasis",
    "contractScopeControl",
    "gcPrimeReviewer",
  ]);
  const textCaptureKeys = new Set([
    "projectName",
    "projectLocation",
    "projectAddress",
    "projectOwner",
    "clientCompany",
    "gcCompany",
    "contactName",
    "clientEmail",
    "clientPhone",
    "rfiClarifications",
    "addendaAcknowledged",
    "proposalExpiration",
    "paymentTerms",
    "depositTerms",
    "progressBilling",
    "finalPayment",
    "latePayment",
    "changeOrders",
    "siteReadiness",
    "weatherDelays",
    "weatherSiteReadiness",
    "utilityResponsibility",
    "hiddenConditions",
    "concreteCracking",
    "colorFinishVariation",
    "warranty",
    "warrantyLimitation",
    "gcScopeControl",
    "ownerGcByOthers",
    "description",
    "baseBidIncludes",
    "schedule",
    "scheduleAssumptions",
    "scopeControlSummary",
    "proposalNotes",
    "gcPrimeNotes",
    "concreteSpecs",
  ]);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    if (isSmartPasteStructuredSectionKey(activeKey) && isSmartPasteStructuredBlockLine(activeKey, line)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (isLooseSmartPastePricingValueLine(line)) {
      activeKey = "pricingSections";
      recordSmartPasteSection(sections, "pricingSections");
      appendSmartPasteSection(sections, "pricingSections", line);
      return;
    }

    const standaloneSectionKey = getSmartPasteStandaloneSectionKey(line);

    if (standaloneSectionKey) {
      activeKey = standaloneSectionKey;
      activePlanSheetIndex = -1;
      recordSmartPasteSection(sections, standaloneSectionKey);
      return;
    }

    const labelMatch = line.match(/^([^:]+):\s*(.*)$/);

    if (labelMatch) {
      const planHeading = getSmartPlanSheetHeading(labelMatch[1]);

      if (planHeading) {
        activeKey = "planSheets";
        activePlanSheetIndex = upsertSmartPastePlanSheet(sections, planHeading);
        activePlanSheetField = planHeading.noteField || "calculationNotes";
        recordSmartPasteSection(sections, "planSheets");
        appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, labelMatch[2]);
        return;
      }

      const planSubheading = getSmartPlanSheetSubheading(labelMatch[1]);

      if (planSubheading && activePlanSheetIndex >= 0) {
        activeKey = "planSheets";

        if (planSubheading.metadataField) {
          setSmartPastePlanSheetMetadata(sections, activePlanSheetIndex, planSubheading.metadataField, labelMatch[2]);
          return;
        }

        activePlanSheetField = planSubheading.noteField;
        setSmartPastePlanSheetTitle(sections, activePlanSheetIndex, planSubheading);
        appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, labelMatch[2]);
        return;
      }

      const key = getSmartPasteLabelKey(labelMatch[1]);

      if (key && isSmartPasteSectionHeading(labelMatch[1], key)) {
        activeKey = key;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, key);
        appendSmartPasteSection(sections, key, key === "pricingSections" ? line : labelMatch[2]);
        return;
      }
    }

    if (labelMatch && shouldBreakSmartPasteTextCapture(activeKey, labelMatch[1], line)) {
      const key = getSmartPasteLabelKey(labelMatch[1]);
      const nextKey = key || (isSmartPricingLine(line) || isSmartImplicitPricingLine(line) ? "pricingSections" : "");

      if (nextKey) {
        activeKey = nextKey;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, nextKey);
        appendSmartPasteSection(sections, nextKey, nextKey === "pricingSections" ? line : labelMatch[2]);
        return;
      }
    }

    if (labelMatch) {
      const key = getSmartPasteLabelKey(labelMatch[1]);

      if (key) {
        activeKey = key;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, key);
        appendSmartPasteSection(sections, key, key === "pricingSections" ? line : labelMatch[2]);
        return;
      }
    }

    if (activeKey !== "pricingSummary" && isSmartPricingLine(line)) {
      activeKey = "pricingSections";
      activePlanSheetIndex = -1;
      recordSmartPasteSection(sections, "pricingSections");
      appendSmartPasteSection(sections, "pricingSections", line);
      return;
    }

    if (activeKey !== "pricingSummary" && isSmartImplicitPricingLine(line)) {
      activeKey = "pricingSections";
      activePlanSheetIndex = -1;
      recordSmartPasteSection(sections, "pricingSections");
      appendSmartPasteSection(sections, "pricingSections", line);
      return;
    }

    if (textCaptureKeys.has(activeKey)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (activeKey === "planSheets" && activePlanSheetIndex >= 0) {
      appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, line);
      return;
    }

    if (activeKey === "lineItems") {
      activeKey = "lineItems";
      appendSmartPasteSection(sections, "lineItems", line);
      return;
    }

    if (multiLineKeys.has(activeKey)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (line.includes("|")) {
      activeKey = "lineItems";
      recordSmartPasteSection(sections, "lineItems");
      appendSmartPasteSection(sections, "lineItems", line);
    }
  });

  return sections;
}

function shouldBreakSmartPasteTextCapture(activeKey, label, line) {
  if (!["description", "baseBidIncludes", "schedule", "scheduleAssumptions", "scopeControlSummary"].includes(activeKey)) {
    return false;
  }

  const key = getSmartPasteLabelKey(label);

  return Boolean(key) || isSmartPricingLine(line) || isSmartImplicitPricingLine(line);
}

function getSmartPasteStandaloneSectionKey(line = "") {
  const normalizedLine = normalizeSmartPasteSectionLabel(line);
  const hasColon = /[:：]/.test(String(line || ""));

  if (!normalizedLine || normalizedLine.includes("|") || /\$[\d,]/.test(normalizedLine) || isSmartPasteRowMarker(line)) {
    return "";
  }

  if (
    hasColon &&
    !/^rfi\s*\/\s*clarification\s+[a-z0-9.-]+$/i.test(normalizedLine) &&
    !/^(structured\s+)?addenda?\s+(acknowledgement|acknowledgment|acknowledged)$/i.test(normalizedLine)
  ) {
    return "";
  }

  if (/^rfi\s*\/\s*clarification\s+[a-z0-9.-]+$/i.test(normalizedLine)) {
    return "rfiRegister";
  }

  if (/^(structured\s+)?addenda?\s+(acknowledgement|acknowledgment|acknowledged)$/i.test(normalizedLine)) {
    return "addendaAcknowledged";
  }

  const headings = {
    "acceptance summary": "acceptanceSummary",
    addenda: "addendaAcknowledged",
    "addenda acknowledged": "addendaAcknowledged",
    assumptions: "assumptions",
    clarifications: "rfiClarifications",
    cover: "projectInfo",
    exclusions: "exclusions",
    "final gc packet print order": "packetPrintOrder",
    "legal / terms": "terms",
    "legal terms": "terms",
    "line items": "lineItems",
    pricing: "pricingSections",
    "pricing summary": "pricingSummary",
    "plan sheet notes": "planSheets",
    "plan sheets / takeoff pages": "planSheets",
    "project description": "description",
    "project info": "projectInfo",
    "proposal notes": "proposalNotes",
    "proposal status": "proposalStatus",
    rfis: "rfiClarifications",
    "rfi / clarification register": "rfiRegister",
    scope: "scope",
    "scope control summary": "scopeControlSummary",
    "scope of work": "scope",
    "schedule of values": "scheduleOfValues",
    sov: "scheduleOfValues",
    "takeoff quantities": "takeoffQuantities",
  };

  return headings[normalizedLine] || "";
}

function getSmartPlanSheetHeading(label) {
  const rawLabel = String(label || "").trim();
  const normalizedLabel = rawLabel.toLowerCase().replace(/\s+/g, " ");
  const codeMatch = normalizedLabel.match(/\b(l10[234]|l203|l601|l602)\b/i);

  if (normalizedLabel.startsWith("plan takeoff sheet")) {
    return getPlanHeadingFromCodeOrTitle(codeMatch?.[1], rawLabel, "plan_takeoff_sheet");
  }

  if (/^l10[234]\s+takeoff basis$/i.test(rawLabel)) {
    const heading = getPlanHeadingFromCodeOrTitle(codeMatch?.[1], rawLabel, "plan_takeoff_sheet");
    return { ...heading, calculationTitle: rawLabel, noteField: "calculationNotes" };
  }

  if (normalizedLabel.includes("sport court alternate")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("sport-courts-l203", "Plan Takeoff Sheet - Sport Courts / L203", "plan_takeoff_sheet"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  if (normalizedLabel.startsWith("l601 detail notes")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("l601", rawLabel, "detail_notes"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  if (normalizedLabel.startsWith("l602 fence") || normalizedLabel.startsWith("l602 site furnishing")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("l602", rawLabel, "detail_notes"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  return null;
}

function getPlanHeadingFromCodeOrTitle(code, fallbackTitle, fallbackType) {
  const matchKey = normalizePlanSheetMatchCode(code || fallbackTitle);
  const defaultSheet = defaultPlanSheets.find((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

  if (defaultSheet) {
    return {
      matchKey: defaultSheet.matchKey,
      pageType: defaultSheet.pageType,
      title: defaultSheet.title,
      subtitle: defaultSheet.subtitle,
      calculationTitle: defaultSheet.calculationTitle,
      noteField: "calculationNotes",
    };
  }

  return {
    matchKey,
    pageType: fallbackType,
    title: fallbackTitle,
    subtitle: "",
    calculationTitle: "Calculation Notes",
    noteField: "calculationNotes",
  };
}

function getSmartPlanSheetSubheading(label) {
  const rawLabel = String(label || "").trim();
  const normalizedLabel = rawLabel.toLowerCase().replace(/\s+/g, " ");

  if (normalizedLabel === "sheet subtitle") {
    return { metadataField: "subtitle" };
  }

  if (normalizedLabel === "calculation box title") {
    return { metadataField: "calculationTitle" };
  }

  if (/^clarifications?$/.test(normalizedLabel)) {
    return { noteField: "clarificationNotes" };
  }

  if (/takeoff basis$/.test(normalizedLabel) || normalizedLabel.includes("calculation")) {
    return { calculationTitle: rawLabel, noteField: "calculationNotes" };
  }

  return null;
}

function upsertSmartPastePlanSheet(sections, heading) {
  if (!sections.planSheets) {
    sections.planSheets = [];
  }

  const matchKey = normalizePlanSheetMatchCode(heading.matchKey || heading.title);
  const existingIndex = sections.planSheets.findIndex((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

  if (existingIndex >= 0) {
    sections.planSheets[existingIndex] = {
      ...sections.planSheets[existingIndex],
      ...heading,
      matchKey,
      enabled: true,
    };
    return existingIndex;
  }

  sections.planSheets.push({
    id: createProposalId(),
    enabled: true,
    imageSrc: "",
    calculationNotes: [],
    clarificationNotes: [],
    ...heading,
    matchKey,
  });

  return sections.planSheets.length - 1;
}

function setSmartPastePlanSheetTitle(sections, index, subheading) {
  if (!sections.planSheets?.[index] || !subheading.calculationTitle) {
    return;
  }

  sections.planSheets[index].calculationTitle = subheading.calculationTitle;
}

function setSmartPastePlanSheetMetadata(sections, index, field, value) {
  const textValue = String(value || "").trim();

  if (!textValue || !sections.planSheets?.[index]) {
    return;
  }

  sections.planSheets[index][field] = textValue;
}

function appendSmartPastePlanSheetNote(sections, index, field, value) {
  const textValue = String(value || "").trim();

  if (!textValue || !sections.planSheets?.[index]) {
    return;
  }

  const targetField = field === "clarificationNotes" ? "clarificationNotes" : "calculationNotes";

  if (!Array.isArray(sections.planSheets[index][targetField])) {
    sections.planSheets[index][targetField] = [];
  }

  sections.planSheets[index][targetField].push(textValue);
}

function normalizePlanSheetMatchCode(value) {
  const textValue = String(value || "").toLowerCase();
  const codeMatch = textValue.match(/\b(l10[234]|l203|l601|l602)\b/);

  if (codeMatch) {
    const code = codeMatch[1].toLowerCase();
    return code === "l203" ? "sport-courts-l203" : code;
  }

  if (textValue.includes("sport court")) {
    return "sport-courts-l203";
  }

  if (textValue.includes("shade footing")) {
    return "shade-footing-estimate";
  }

  return createPlanSheetMatchKey(value);
}

function getSmartPasteLabelKey(label) {
  const normalizedLabel = normalizeSmartPasteSectionLabel(label);
  const labels = {
    "addenda acknowledged": "addendaAcknowledged",
    "addendum acknowledged": "addendaAcknowledged",
    "addenda": "addendaAcknowledged",
    "addendum date": "addendaRegister",
    address: "projectAddress",
    "acceptance summary": "acceptanceSummary",
    "accepted alternates": "pricingSections",
    allowances: "pricingSections",
    alternate: "pricingSections",
    alternates: "pricingSections",
    "appendix notes": "proposalNotes",
    assumptions: "assumptions",
    "base bid includes": "baseBidIncludes",
    "change order": "changeOrders",
    "change order language": "changeOrders",
    "change orders": "changeOrders",
    client: "clientCompany",
    "client company": "clientCompany",
    "color / finish variation": "colorFinishVariation",
    "color finish variation": "colorFinishVariation",
    "concrete specs": "concreteSpecs",
    "concrete cracking": "concreteCracking",
    "concrete cracking disclaimer": "concreteCracking",
    contact: "contactName",
    "contact email": "clientEmail",
    "contact phone": "clientPhone",
    "contract scope control": "contractScopeControl",
    "deposit terms": "depositTerms",
    description: "description",
    email: "clientEmail",
    exclusions: "exclusions",
    "final payment": "finalPayment",
    "general contractor": "gcCompany",
    gc: "gcCompany",
    "gc / prime": "gcCompany",
    "gc / prime notes": "gcPrimeNotes",
    "gc / prime reviewer": "gcPrimeReviewer",
    "gc / prime scope control": "gcScopeControl",
    "gc prime notes": "gcPrimeNotes",
    "gc prime reviewer": "gcPrimeReviewer",
    "gc prime scope control": "gcScopeControl",
    "hidden condition": "hiddenConditions",
    "hidden conditions": "hiddenConditions",
    "hidden / unknown conditions": "hiddenConditions",
    inclusions: "scope",
    "included scope": "scope",
    job: "projectName",
    "job name": "projectName",
    jobsite: "projectLocation",
    "job site": "projectLocation",
    "jobsite address": "projectAddress",
    "job site address": "projectAddress",
    "late payment": "latePayment",
    "late payment / collection": "latePayment",
    "line items": "lineItems",
    "line item": "lineItems",
    location: "projectLocation",
    "location / site": "projectLocation",
    owner: "projectOwner",
    "owner / gc by others": "ownerGcByOthers",
    "owner gc by others": "ownerGcByOthers",
    "owner / public agency": "projectOwner",
    "payment terms": "paymentTerms",
    phone: "clientPhone",
    prime: "gcCompany",
    "prime contractor": "gcCompany",
    "attn": "contactName",
    "attention": "contactName",
    "prepared for": "clientCompany",
    "prepared for / client": "clientCompany",
    "prepared for/client": "clientCompany",
    "client / prepared for": "clientCompany",
    "bid requested by": "clientCompany",
    "requested from": "clientCompany",
    "requested by": "clientCompany",
    "pricing summary": "pricingSummary",
    pricing: "pricingSections",
    bid: "projectName",
    "bid name": "projectName",
    project: "projectName",
    "project address": "projectAddress",
    "project description": "description",
    "project location": "projectLocation",
    "project location / address": "projectLocation",
    "project name": "projectName",
    "proposal project": "projectName",
    "progress billing": "progressBilling",
    "proposal expiration": "proposalExpiration",
    "proposal notes / acceptance summary": "proposalNotes",
    "proposal notes": "proposalNotes",
    "proposal basis": "proposalBasis",
    "proposal status": "proposalStatus",
    "proposal type": "proposalType",
    "rfi / clarification register": "rfiRegister",
    "rfi / clarification": "rfiClarifications",
    rfi: "rfiRegister",
    clarification: "rfiRegister",
    clarifications: "rfiClarifications",
    "rfis / clarifications": "rfiClarifications",
    rfis: "rfiClarifications",
    schedule: "schedule",
    "schedule assumptions": "scheduleAssumptions",
    "schedule of values": "scheduleOfValues",
    sov: "scheduleOfValues",
    scope: "scope",
    "scope notes": "scope",
    "scope of work": "scope",
    "scope summary": "description",
    "scope control": "gcScopeControl",
    "scope control summary": "scopeControlSummary",
    "shade footing estimate": "shadeFootingEstimate",
    site: "projectLocation",
    "site address": "projectAddress",
    "site readiness": "siteReadiness",
    "takeoff quantities": "takeoffQuantities",
    "plan sheets / takeoff pages": "planSheets",
    "plan sheet notes": "planSheets",
    "legal / terms": "terms",
    "legal terms": "terms",
    "final gc packet print order": "packetPrintOrder",
    terms: "terms",
    "utilities": "utilityResponsibility",
    "utility responsibility": "utilityResponsibility",
    warranty: "warranty",
    "warranty limitation": "warrantyLimitation",
    "weather delay": "weatherDelays",
    "weather delays": "weatherDelays",
    "weather / site readiness": "weatherSiteReadiness",
  };

  if (/^addendum\s+[a-z0-9.-]+$/i.test(normalizedLabel)) {
    return "addendaRegister";
  }

  if (/^rfi\s*\/\s*clarification\s+[a-z0-9.-]+$/i.test(normalizedLabel)) {
    return "rfiRegister";
  }

  if (/^(bid|proposal)\s+(to|for)\s+/i.test(normalizedLabel)) {
    return "clientCompany";
  }

  if (/^(rfi|clarification)\s+[a-z0-9.-]+$/i.test(normalizedLabel)) {
    return "rfiRegister";
  }

  return labels[normalizedLabel] || "";
}

function isSmartPasteSectionHeading(label, key) {
  const normalizedLabel = normalizeSmartPasteSectionLabel(label);
  const sectionHeadingLabels = new Set([
    "addenda acknowledged",
    "addendum acknowledged",
    "addenda",
    "addendum date",
    "acceptance summary",
    "accepted alternates",
    "allowances",
    "alternates",
    "appendix notes",
    "assumptions",
    "base bid includes",
    "change order",
    "change order language",
    "change orders",
    "color / finish variation",
    "color finish variation",
    "concrete specs",
    "concrete cracking",
    "concrete cracking disclaimer",
    "deposit terms",
    "description",
    "exclusions",
    "final payment",
    "gc / prime notes",
    "gc / prime scope control",
    "gc prime notes",
    "gc prime scope control",
    "hidden condition",
    "hidden conditions",
    "hidden / unknown conditions",
    "included scope",
    "inclusions",
    "late payment",
    "late payment / collection",
    "line item",
    "line items",
    "owner / gc by others",
    "owner gc by others",
    "payment terms",
    "pricing summary",
    "pricing",
    "project description",
    "progress billing",
    "proposal expiration",
    "proposal notes / acceptance summary",
    "proposal notes",
    "proposal basis",
    "proposal status",
    "contract scope control",
    "gc / prime reviewer",
    "gc prime reviewer",
    "rfi / clarification",
    "rfi / clarification register",
    "rfi",
    "clarification",
    "clarifications",
    "rfis / clarifications",
    "rfis",
    "schedule assumptions",
    "schedule of values",
    "sov",
    "scope",
    "scope summary",
    "scope of work",
    "scope control",
    "scope control summary",
    "shade footing estimate",
    "site readiness",
    "takeoff quantities",
    "plan sheets / takeoff pages",
    "plan sheet notes",
    "terms",
    "legal / terms",
    "legal terms",
    "final gc packet print order",
    "utilities",
    "utility responsibility",
    "warranty",
    "warranty limitation",
    "weather delay",
    "weather delays",
    "weather / site readiness",
  ]);

  return (
    sectionHeadingLabels.has(normalizedLabel) ||
    /^addendum\s+[a-z0-9.-]+$/i.test(normalizedLabel) ||
    /^rfi\s*\/\s*clarification\s+[a-z0-9.-]+$/i.test(normalizedLabel) ||
    key === "lineItems"
  );
}

function recordSmartPasteSection(sections, key) {
  if (!sections.__capturedKeys) {
    sections.__capturedKeys = [];
  }

  if (!sections.__capturedKeys.includes(key)) {
    sections.__capturedKeys.push(key);
  }
}

function getCapturedSmartPasteLabels(sections) {
  const labels = {
    addendaAcknowledged: "Addenda Acknowledged",
    addendaRegister: "Structured Addenda",
    acceptanceSummary: "Acceptance Summary",
    assumptions: "Assumptions",
    baseBidIncludes: "Base Bid Includes",
    billingAddress: "Billing Address",
    changeOrders: "Change Orders",
    clientCompany: "Client",
    clientEmail: "Client Email",
    clientPhone: "Client Phone",
    colorFinishVariation: "Color / Finish Variation",
    concreteSpecs: "Concrete Specs",
    concreteCracking: "Concrete Cracking",
    contactName: "Contact",
    contractScopeControl: "Contract Scope Control",
    depositTerms: "Deposit Terms",
    description: "Project Description",
    exclusions: "Exclusions",
    finalPayment: "Final Payment",
    gcCompany: "GC / Prime",
    gcPrimeNotes: "GC / Prime Notes",
    gcPrimeReviewer: "GC / Prime Reviewer",
    gcScopeControl: "GC / Prime Scope Control",
    hiddenConditions: "Hidden Conditions",
    latePayment: "Late Payment",
    lineItems: "Line Items",
    ownerGcByOthers: "Owner / GC By Others",
    packetPrintOrder: "Final GC Packet Print Order",
    paymentTerms: "Payment Terms",
    planSheets: "Plan Sheets / Takeoff Pages",
    pricingSummary: "Pricing Summary",
    pricingSections: "Alternates / Allowances",
    progressBilling: "Progress Billing",
    projectAddress: "Project Address",
    projectLocation: "Project Location",
    projectName: "Project",
    projectOwner: "Owner",
    proposalExpiration: "Proposal Expiration",
    proposalBasis: "Proposal Basis",
    proposalNotes: "Proposal Notes",
    proposalStatus: "Proposal Status",
    proposalType: "Proposal Type",
    rfiClarifications: "RFIs / Clarifications",
    rfiRegister: "Structured RFI / Clarification Register",
    schedule: "Schedule",
    scheduleAssumptions: "Schedule Assumptions",
    scheduleOfValues: "Schedule of Values",
    scope: "Scope",
    scopeControlSummary: "Scope Control Summary",
    shadeFootingEstimate: "Shade Footing Estimate",
    siteReadiness: "Site Readiness",
    takeoffQuantities: "Takeoff Quantities",
    terms: "Terms",
    utilityResponsibility: "Utility Responsibility",
    warranty: "Warranty",
    warrantyLimitation: "Warranty Limitation",
    weatherDelays: "Weather Delays",
    weatherSiteReadiness: "Weather / Site Readiness",
  };

  return (sections.__capturedKeys || []).map((key) => labels[key] || key);
}

function appendSmartPasteSection(sections, key, value) {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return;
  }

  if (!sections[key]) {
    sections[key] = [];
  }

  sections[key].push(textValue);
}

function getSectionText(sections, key) {
  return (sections[key] || []).join("\n").trim();
}

function normalizeSmartPasteSectionLabel(label = "") {
  return String(label || "")
    .trim()
    .replace(/[:：]\s*$/, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isSmartPasteRowMarker(value = "") {
  return /^row\s+\d+\b/i.test(String(value || "").trim());
}

function parseSmartPasteGcPacketTables(sections, warnings) {
  const tables = normalizeGcPacketTables();
  let count = 0;

  const pricingSummaryRows = parseSmartPastePricingSummaryRows(sections.pricingSummary || [], warnings);
  const pricingSummaryNotes = getPricingSummaryPresentationNotes(sections.pricingSummary || []);

  if (pricingSummaryRows.length > 0 || hasTextValue(pricingSummaryNotes)) {
    tables.pricingSummary = {
      ...tables.pricingSummary,
      enabled: true,
      rows: pricingSummaryRows,
      presentationNotes: pricingSummaryNotes,
    };
    count += 1;
  }

  const sovRows = parseSmartPasteStructuredRows("scheduleOfValues", sections.scheduleOfValues || [], warnings);

  if (sovRows.length > 0) {
    tables.scheduleOfValues = {
      ...tables.scheduleOfValues,
      enabled: true,
      rows: sovRows,
    };
    count += 1;
  }

  const takeoffRows = parseSmartPasteStructuredRows("takeoffQuantities", sections.takeoffQuantities || [], warnings);

  if (takeoffRows.length > 0) {
    tables.takeoffQuantities = {
      ...tables.takeoffQuantities,
      enabled: true,
      rows: takeoffRows,
    };
    count += 1;
  }

  const shadeRows = parseSmartPasteStructuredRows("shadeFootingEstimate", sections.shadeFootingEstimate || [], warnings);

  if (shadeRows.length > 0) {
    tables.shadeFootingEstimate = {
      ...tables.shadeFootingEstimate,
      enabled: true,
      rows: shadeRows,
    };
    count += 1;
  }

  const proposalBasis = getSectionText(sections, "proposalNotes");
  const explicitProposalBasis = getSectionText(sections, "proposalBasis");
  const contractScopeControl = getSectionText(sections, "contractScopeControl");
  const acceptanceSummary = getSectionText(sections, "acceptanceSummary");
  const gcPrimeReviewer = getSectionText(sections, "gcPrimeReviewer");

  if (
    hasTextValue(proposalBasis) ||
    hasTextValue(explicitProposalBasis) ||
    hasTextValue(contractScopeControl) ||
    hasTextValue(acceptanceSummary) ||
    hasTextValue(gcPrimeReviewer)
  ) {
    tables.proposalNotes = {
      ...tables.proposalNotes,
      enabled: true,
      proposalBasis: explicitProposalBasis || proposalBasis,
      contractScopeControl,
      acceptanceSummary,
      gcPrimeReviewer,
    };
    count += 1;
  }

  return { count, tables };
}

function parseSmartPastePricingSummaryRows(lines = [], warnings) {
  return lines
    .map((line) => {
      if (!hasTextValue(line) || /^presentation notes?\s*:/i.test(line)) {
        return null;
      }

      const pipeParts = line.split("|").map((part) => part.trim()).filter(Boolean);

      if (pipeParts.length >= 2) {
        return {
          id: createProposalId(),
          label: pipeParts[0],
          amount: pipeParts[1],
          note: pipeParts.slice(2).join(" | "),
        };
      }

      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);

      if (colonMatch) {
        return {
          id: createProposalId(),
          label: colonMatch[1].trim(),
          amount: colonMatch[2].trim(),
          note: "",
        };
      }

      warnings.push(`Skipped pricing summary row "${line}" because it did not use Item | Amount | Notes.`);
      return null;
    })
    .filter(Boolean);
}

function getPricingSummaryPresentationNotes(lines = []) {
  return lines
    .map((line) => String(line || "").trim())
    .filter((line) => /^presentation notes?\s*:/i.test(line))
    .map((line) => line.replace(/^presentation notes?\s*:\s*/i, ""))
    .join("\n");
}

function parseSmartPasteStructuredRows(sectionKey, lines = [], warnings) {
  const fields = gcPacketRowFields[sectionKey] || [];
  const rows = [];
  const sectionNotes = [];
  let currentRow = null;
  let lastField = "";
  let skippedCount = 0;

  function flushCurrentRow() {
    if (!currentRow) {
      return;
    }

    if (hasSmartPasteStructuredRowData(sectionKey, currentRow)) {
      rows.push(currentRow);
    }

    currentRow = null;
    lastField = "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || "").trim();

    if (!line || isSmartPasteTableHeaderLine(line)) {
      continue;
    }

    const metadata = getSmartPasteStructuredMetadata(sectionKey, line);

    if (metadata.isMetadata) {
      if (hasTextValue(metadata.note)) {
        sectionNotes.push(metadata.note);
      }
      continue;
    }

    if (isSmartPasteRowMarker(line)) {
      flushCurrentRow();
      currentRow = { id: createProposalId() };
      continue;
    }

    const parts = String(line || "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= fields.length) {
      flushCurrentRow();
      rows.push(
        fields.reduce(
          (row, [field], fieldIndex) => ({
            ...row,
            [field]: parts[fieldIndex] || "",
          }),
          { id: createProposalId() },
        ),
      );
      continue;
    }

    const fieldBlock = parseSmartPasteStructuredFieldBlockLine(sectionKey, line, lines, index);

    if (fieldBlock.field) {
      if (!currentRow) {
        currentRow = { id: createProposalId() };
      }

      if (hasTextValue(currentRow[fieldBlock.field]) && isFirstStructuredRowField(sectionKey, fieldBlock.field)) {
        flushCurrentRow();
        currentRow = { id: createProposalId() };
      }

      currentRow[fieldBlock.field] = [currentRow[fieldBlock.field], fieldBlock.value].filter(hasTextValue).join(" ").trim();
      lastField = fieldBlock.field;
      index = fieldBlock.nextIndex;
      continue;
    }

    if (sectionKey === "scheduleOfValues" && isLikelyScheduleOfValuesItemLine(line)) {
      if (currentRow && hasSmartPasteStructuredRowData(sectionKey, currentRow)) {
        flushCurrentRow();
      }

      currentRow = {
        id: createProposalId(),
        item: line.replace(/^\d+[.)]\s*/, "").trim(),
      };
      lastField = "item";
      continue;
    }

    if (sectionKey === "scheduleOfValues" && currentRow) {
      const inferredField = getInferredScheduleOfValuesField(currentRow, line);

      if (inferredField) {
        currentRow[inferredField] = [currentRow[inferredField], line].filter(hasTextValue).join(" ").trim();
        lastField = inferredField;
        continue;
      }
    }

    if (currentRow && lastField && !getSmartPasteStandaloneSectionKey(line)) {
      currentRow[lastField] = [currentRow[lastField], line].filter(hasTextValue).join(" ").trim();
      continue;
    }

    if (hasTextValue(line) && !isSmartPasteIgnorableStructuredLine(line)) {
      skippedCount += 1;
    }
  }

  flushCurrentRow();

  if (skippedCount > 0 && rows.length > 0) {
    warnings.push(`Skipped ${skippedCount} malformed ${gcPacketTableLabels[sectionKey]} line${skippedCount === 1 ? "" : "s"} that did not match a row format.`);
  }

  if (sectionKey === "shadeFootingEstimate" && rows.length > 0 && sectionNotes.length > 0) {
    const lastRow = rows[rows.length - 1];
    lastRow.allowanceNote = [lastRow.allowanceNote, ...sectionNotes].filter(hasTextValue).join(" ");
  }

  return rows;
}

function getSmartPasteStructuredMetadata(sectionKey, line) {
  const match = String(line || "").trim().match(/^([^:]+):\s*(.*)$/);

  if (!match) {
    return { isMetadata: false, note: "" };
  }

  const label = match[1].trim().toLowerCase().replace(/\s+/g, " ");

  if (sectionKey === "shadeFootingEstimate" && label === "allowance note") {
    return { isMetadata: true, note: match[2].trim() };
  }

  return { isMetadata: false, note: "" };
}

function parseSmartPasteStructuredFieldBlockLine(sectionKey, line, lines, index) {
  const match = String(line || "").trim().match(/^([^:]+):\s*(.*)$/);

  if (!match) {
    return { field: "", value: "", nextIndex: index };
  }

  const field = getSmartPasteStructuredField(sectionKey, match[1]);

  if (!field) {
    return { field: "", value: "", nextIndex: index };
  }

  let value = match[2].trim();
  let nextIndex = index;

  if (!hasTextValue(value)) {
    const nextValue = getNextSmartPasteStructuredFieldValue(lines, index);

    if (nextValue.value) {
      value = nextValue.value;
      nextIndex = nextValue.index;
    }
  }

  return { field, value, nextIndex };
}

function getNextSmartPasteStructuredFieldValue(lines, index) {
  for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
    const value = String(lines[nextIndex] || "").trim();

    if (!value) {
      continue;
    }

    if (isSmartPasteRowMarker(value) || getSmartPasteStandaloneSectionKey(value)) {
      return { value: "", index };
    }

    const labelMatch = value.match(/^([^:]+):\s*(.*)$/);

    if (labelMatch && getSmartPasteStructuredField("", labelMatch[1])) {
      return { value: "", index };
    }

    if (labelMatch && getSmartPasteStructuredField("scheduleOfValues", labelMatch[1])) {
      return { value: "", index };
    }

    if (labelMatch && getSmartPasteStructuredField("takeoffQuantities", labelMatch[1])) {
      return { value: "", index };
    }

    if (labelMatch && getSmartPasteStructuredField("shadeFootingEstimate", labelMatch[1])) {
      return { value: "", index };
    }

    return { value, index: nextIndex };
  }

  return { value: "", index };
}

function getSmartPasteStructuredField(sectionKey, label) {
  const normalizedLabel = normalizeSmartPasteSectionLabel(label);
  const commonFields = {
    amount: "amount",
    description: "description",
    item: "item",
    "pricing basis": "pricingBasis",
  };
  const sectionFields = {
    scheduleOfValues: commonFields,
    takeoffQuantities: {
      item: "item",
      quantity: "quantity",
      qty: "quantity",
      "detail / size": "detailSize",
      detail: "detailSize",
      size: "detailSize",
      "net cy": "netCy",
      "net cubic yards": "netCy",
      "cy with 10%": "cyWithTenPercent",
      "cy with 10 percent": "cyWithTenPercent",
      "cy with waste": "cyWithTenPercent",
      "cy with 10": "cyWithTenPercent",
      "price / status": "priceStatus",
      "price status": "priceStatus",
      status: "priceStatus",
    },
    shadeFootingEstimate: {
      column: "column",
      "column size": "columnSize",
      "estimated spread footing": "estimatedSpreadFooting",
      "net cy": "netCy",
      "estimated subtotal": "estimatedSubtotal",
      "estimated cy with 10%": "estimatedCyWithTenPercent",
      "estimated cy with 10 percent": "estimatedCyWithTenPercent",
      "allowance amount": "allowanceAmount",
      "allowance note": "allowanceNote",
    },
  };

  if (!sectionKey) {
    return commonFields[normalizedLabel] || sectionFields.takeoffQuantities[normalizedLabel] || sectionFields.shadeFootingEstimate[normalizedLabel] || "";
  }

  return sectionFields[sectionKey]?.[normalizedLabel] || "";
}

function isFirstStructuredRowField(sectionKey, field) {
  const firstField = gcPacketRowFields[sectionKey]?.[0]?.[0];

  return field === firstField;
}

function hasSmartPasteStructuredRowData(sectionKey, row = {}) {
  const fields = gcPacketRowFields[sectionKey] || [];

  return fields.some(([field]) => hasTextValue(row[field]));
}

function isLikelyScheduleOfValuesItemLine(line = "") {
  const textValue = String(line || "").trim();

  return /^\d+[.)]\s+/.test(textValue) && !textValue.includes("|") && !/:\s*/.test(textValue);
}

function getInferredScheduleOfValuesField(row = {}, line = "") {
  const textValue = String(line || "").trim();

  if (!textValue) {
    return "";
  }

  if (!hasTextValue(row.amount) && /^\$?\s*\d[\d,]*(?:\.\d{2})?$/.test(textValue)) {
    return "amount";
  }

  if (!hasTextValue(row.pricingBasis) && /^(\d+(?:\.\d+)?%|ls|lump sum|base|base bid)$/i.test(textValue)) {
    return "pricingBasis";
  }

  if (!hasTextValue(row.description)) {
    return "description";
  }

  return "";
}

function isSmartPasteTableHeaderLine(line = "") {
  const normalizedLine = normalizeSmartPasteSectionLabel(line);

  return /^(row|item|description|qty|quantity|unit|unit price|amount|pricing basis|detail \/ size|net cy|cy with 10%|cy with 10 percent|price \/ status|price status)$/.test(
    normalizedLine,
  );
}

function isSmartPasteIgnorableStructuredLine(line = "") {
  return isSmartPasteTableHeaderLine(line) || isSmartPasteRowMarker(line);
}

function isSmartPasteStructuredSectionKey(key = "") {
  return ["scheduleOfValues", "takeoffQuantities", "shadeFootingEstimate"].includes(key);
}

function isSmartPasteStructuredBlockLine(sectionKey, line = "") {
  if (isSmartPasteRowMarker(line) || isSmartPasteTableHeaderLine(line)) {
    return true;
  }

  const match = String(line || "").trim().match(/^([^:]+):/);

  return Boolean(match && getSmartPasteStructuredField(sectionKey, match[1]));
}

function mergeGcPacketTables(currentTables = {}, parsedTables = {}) {
  const mergedTables = normalizeGcPacketTables(currentTables);
  const incomingTables = normalizeGcPacketTables(parsedTables);

  Object.keys(defaultGcPacketTables).forEach((sectionKey) => {
    if (!incomingTables[sectionKey]?.enabled) {
      return;
    }

    mergedTables[sectionKey] = {
      ...mergedTables[sectionKey],
      ...incomingTables[sectionKey],
      enabled: true,
    };
  });

  return mergedTables;
}

function mergeRegisterRows(currentRows = [], incomingRows = [], identityField) {
  const mergedRows = [...currentRows];

  incomingRows.forEach((incomingRow) => {
    const identityValue = String(incomingRow?.[identityField] || "").trim().toLowerCase();
    const existingIndex = identityValue
      ? mergedRows.findIndex((row) => String(row?.[identityField] || "").trim().toLowerCase() === identityValue)
      : -1;

    if (existingIndex >= 0) {
      mergedRows[existingIndex] = {
        ...mergedRows[existingIndex],
        ...incomingRow,
        id: mergedRows[existingIndex].id,
      };
      return;
    }

    mergedRows.push(incomingRow);
  });

  return mergedRows;
}

function parseSmartPasteAddendaRegister(notes) {
  const rows = [];
  let currentRow = null;

  String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const addendumMatch = line.match(/^addendum\s*([a-z0-9.-]+)?\s*:\s*(.*)$/i);

      if (addendumMatch) {
        currentRow = {
          ...createEmptyAddendumRecord(),
          addendumNumber: addendumMatch[1] ? `Addendum ${addendumMatch[1]}` : "Addendum",
          titleDescription: addendumMatch[2].trim(),
          acknowledged: true,
          includedInPacket: true,
        };
        rows.push(currentRow);
        return;
      }

      if (isRegisterBoundaryLine(line, "addenda")) {
        currentRow = null;
        return;
      }

      if (!currentRow) {
        return;
      }

      const fieldMatch = line.match(/^([^:]+):\s*(.*)$/);

      if (!fieldMatch) {
        currentRow.notes = [currentRow.notes, line].filter(hasTextValue).join("\n");
        return;
      }

      const label = fieldMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
      const value = fieldMatch[2].trim();

      if (label === "addendum date" || label === "date") {
        currentRow.addendumDate = value;
      } else if (label === "title" || label === "description") {
        currentRow.titleDescription = value;
      } else if (label === "acknowledged") {
        currentRow.acknowledged = !/^no|false$/i.test(value);
      } else if (label === "included in packet") {
        currentRow.includedInPacket = !/^no|false$/i.test(value);
      } else if (label === "notes" || label === "note") {
        currentRow.notes = [currentRow.notes, value].filter(hasTextValue).join("\n");
      }
    });

  return normalizeAddendaRegister(rows).filter(hasAddendumRowData);
}

function parseSmartPasteRfiRegister(notes) {
  const rows = [];
  let currentRow = null;

  String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const rfiMatch = line.match(/^(rfi\s*\/\s*clarification|rfi|clarification)\s*([0-9][a-z0-9.-]*|[a-z]+-\d+)?\s*:\s*(.*)$/i);

      if (rfiMatch) {
        const prefix = rfiMatch[1].replace(/\s*\/\s*/g, " / ").toUpperCase();
        currentRow = {
          ...createEmptyRfiRecord(),
          rfiNumber: rfiMatch[2] ? `${prefix} ${rfiMatch[2]}` : prefix,
          question: rfiMatch[3].trim(),
          includedInPacket: true,
        };
        rows.push(currentRow);
        return;
      }

      if (isRegisterBoundaryLine(line, "rfi") || (getSmartPasteStandaloneSectionKey(line) && getSmartPasteStandaloneSectionKey(line) !== "rfiRegister")) {
        currentRow = null;
        return;
      }

      if (!currentRow) {
        return;
      }

      const fieldMatch = line.match(/^([^:]+):\s*(.*)$/);

      if (!fieldMatch) {
        currentRow.answerTreatment = [currentRow.answerTreatment, line].filter(hasTextValue).join("\n");
        return;
      }

      const label = fieldMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
      const value = fieldMatch[2].trim();

      if (label === "rfi / clarification number" || label === "rfi number" || label === "clarification number") {
        currentRow.rfiNumber = value;
      } else if (label === "date asked") {
        currentRow.dateAsked = value;
      } else if (label === "date answered") {
        currentRow.dateAnswered = value;
      } else if (label === "source") {
        currentRow.source = value;
      } else if (label === "question" || label === "clarification needed" || label === "question / clarification needed") {
        currentRow.question = value;
      } else if (label === "answer" || label === "proposal treatment" || label === "answer / proposal treatment") {
        currentRow.answerTreatment = value;
      } else if (label === "price impact") {
        currentRow.priceImpact = value;
      } else if (label === "scope impact") {
        currentRow.scopeImpact = value;
      } else if (label === "included in packet") {
        currentRow.includedInPacket = !/^no|false$/i.test(value);
      }
    });

  return normalizeRfiRegister(rows).filter(hasRfiRowData);
}

function isRegisterBoundaryLine(line, registerType) {
  const fieldMatch = String(line || "").trim().match(/^([^:]+):\s*(.*)$/);

  if (!fieldMatch) {
    return false;
  }

  const label = fieldMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
  const addendaFields = new Set(["addendum date", "date", "title", "description", "acknowledged", "included in packet", "notes", "note"]);
  const rfiFields = new Set([
    "rfi / clarification number",
    "rfi number",
    "clarification number",
    "date asked",
    "date answered",
    "source",
    "question",
    "clarification needed",
    "question / clarification needed",
    "answer",
    "proposal treatment",
    "answer / proposal treatment",
    "price impact",
    "scope impact",
    "included in packet",
  ]);

  if (registerType === "addenda" && addendaFields.has(label)) {
    return false;
  }

  if (registerType === "rfi" && rfiFields.has(label)) {
    return false;
  }

  return Boolean(getSmartPasteLabelKey(label));
}

function normalizeSmartPastePlanSheets(planSheets = []) {
  if (!Array.isArray(planSheets)) {
    return [];
  }

  return planSheets
    .map((sheet, index) => normalizePlanSheet({ ...sheet, enabled: true }, index))
    .filter(
      (sheet) =>
        hasTextValue(sheet.title) ||
        normalizePlanSheetNotes(sheet.calculationNotes).length > 0 ||
        normalizePlanSheetNotes(sheet.clarificationNotes).length > 0,
    );
}

function mergePlanSheets(currentPlanSheets = [], parsedPlanSheets = []) {
  const mergedSheets = normalizePlanSheets(currentPlanSheets);

  parsedPlanSheets.forEach((parsedSheet) => {
    const normalizedSheet = normalizePlanSheet({ ...parsedSheet, enabled: true });
    const matchKey = getPlanSheetMatchKey(normalizedSheet);
    const existingIndex = mergedSheets.findIndex((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

    if (existingIndex >= 0) {
      mergedSheets[existingIndex] = {
        ...mergedSheets[existingIndex],
        ...normalizedSheet,
        ...preserveExistingImageAsset(mergedSheets[existingIndex], normalizedSheet),
        enabled: true,
      };
      return;
    }

    mergedSheets.push(normalizedSheet);
  });

  return mergedSheets;
}

function splitSmartPasteList(value) {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return [];
  }

  const normalizedLines = textValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasExplicitListLines = normalizedLines.some((line) => /^([-*\u2022]|\d+[.)])\s+/.test(line));
  const sourceItems = hasExplicitListLines
    ? normalizedLines
    : normalizedLines.length > 1
      ? normalizedLines
      : textValue.includes(";")
        ? textValue.split(";")
        : [textValue];

  return dedupeSmartPasteTextList(sourceItems
    .map((item) => item.replace(/^([-*\u2022]|\d+[.)])\s*/, "").trim())
    .filter(Boolean));
}

function getSmartPasteProjectDescription(values = {}) {
  return [values.description, values.baseBidIncludes]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, valuesList) => valuesList.indexOf(value) === index)
    .join("\n");
}

function getSmartPastePreparedPacketSectionCount(values = {}) {
  const preparedSections = new Set();
  const tables = normalizeGcPacketTables(values.gcPacketTables);

  if (tables.pricingSummary.enabled && (tables.pricingSummary.rows?.length > 0 || hasTextValue(tables.pricingSummary.presentationNotes))) {
    preparedSections.add("pricingSummary");
  }

  if (tables.scheduleOfValues.enabled && tables.scheduleOfValues.rows?.length > 0) {
    preparedSections.add("scheduleOfValues");
  }

  if (getSmartPastePricingOptionSovRowCount(values.pricingOptions) > 0) {
    preparedSections.add("scheduleOfValues");
  }

  if (tables.takeoffQuantities.enabled && tables.takeoffQuantities.rows?.length > 0) {
    preparedSections.add("takeoffQuantities");
  }

  if (tables.shadeFootingEstimate.enabled && tables.shadeFootingEstimate.rows?.length > 0) {
    preparedSections.add("shadeFootingEstimate");
  }

  if (
    tables.proposalNotes.enabled &&
    [tables.proposalNotes.proposalBasis, tables.proposalNotes.contractScopeControl, tables.proposalNotes.acceptanceSummary].some(hasTextValue)
  ) {
    preparedSections.add("proposalNotes");
  }

  if (values.planSheets?.length > 0) {
    preparedSections.add("planSheets");
  }

  if (values.scopeSections?.length > 0 || values.scopeItems?.length > 0) {
    preparedSections.add("scopeSections");
  }

  if (values.concreteSpecs && Object.values(values.concreteSpecs).some(hasTextValue)) {
    preparedSections.add("concreteSpecs");
  }

  if (values.scopeControlSummary && Object.values(values.scopeControlSummary).some(hasTextValue)) {
    preparedSections.add("scopeControlSummary");
  }

  if (values.rfiRegister?.length > 0 || hasTextValue(values.rfiClarificationNotes)) {
    preparedSections.add("rfiRegister");
  }

  if (values.addendaRegister?.length > 0 || hasTextValue(values.addendaAcknowledged)) {
    preparedSections.add("addendaAcknowledged");
  }

  if (
    [
      values.terms,
      values.proposalExpiration,
      values.paymentTerms,
      values.changeOrderLanguage,
      values.hiddenConditions,
      values.warrantyLimitation,
      values.gcScopeControl,
    ].some(hasTextValue)
  ) {
    preparedSections.add("legalTerms");
  }

  if (hasTextValue(values.proposalNotes) || hasTextValue(values.scheduleAssumptions)) {
    preparedSections.add("proposalNotes");
  }

  if (values.packetBuilder?.length > 0 || hasTextValue(values.packetPrintOrder)) {
    preparedSections.add("packetPrintOrder");
  }

  return preparedSections.size;
}

function parseSmartPasteScopeControlSummary(value) {
  const summary = {};
  const fieldMap = {
    "included scope": "includedScope",
    exclusions: "exclusions",
    clarifications: "clarifications",
    "accepted alternates": "acceptedAlternates",
    allowances: "allowances",
    "owner / gc by others": "ownerGcByOthers",
    "owner gc by others": "ownerGcByOthers",
    "hidden / unshown conditions": "hiddenUnshownConditionsNote",
    "hidden unshown conditions": "hiddenUnshownConditionsNote",
    "hidden conditions": "hiddenUnshownConditionsNote",
  };

  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const pipeParts = line.split("|").map((part) => part.trim()).filter(Boolean);

      if (pipeParts.length >= 2) {
        const normalizedLabel = pipeParts[0].toLowerCase().replace(/\s+/g, " ");
        const field = fieldMap[normalizedLabel];

        if (field) {
          summary[field] = dedupeSmartPasteTextBlock(
            [summary[field], pipeParts.slice(1).join(" | ")].filter(hasTextValue).join("\n"),
          );
        }
      }
    });

  return summary;
}

function sanitizeSmartPasteProposalNotes(value) {
  return dedupeSmartPasteTextBlock(String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isScopeControlPipeLine(line))
    .join("\n"));
}

function isScopeControlPipeLine(line) {
  const parts = String(line || "").split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  return /^(included scope|exclusions|clarifications|accepted alternates|allowances|owner\s*\/?\s*gc by others|hidden\s*\/?\s*unshown conditions|hidden conditions)$/i.test(
    parts[0],
  );
}

function parseSmartPasteLineItems(lines, warnings) {
  return lines
    .map((line) => parseSmartPasteLineItem(line, warnings))
    .filter(Boolean)
    .map((item, index) => ({ ...item, itemNumber: String(index + 1) }));
}

function parseSmartPastePricingSections(lines, warnings) {
  const result = {
    baseBidLineItem: null,
    sections: [],
    summaryRows: [],
    totalRows: [],
    totalIfAllAccepted: undefined,
  };

  lines.forEach((line) => {
    if (isSmartPastePricingHeaderLine(line)) {
      return;
    }

    const pipeLineItem = parseSmartPastePricingPipeLineItem(line);

    if (pipeLineItem) {
      result.baseBidLineItem = {
        ...pipeLineItem,
        itemNumber: "1",
      };
      result.summaryRows.push(createPricingSummaryRow(pipeLineItem.description || "Base Bid", pipeLineItem.unitPrice, ""));
      return;
    }

    const parsed = parseSmartPastePricingLine(line, warnings);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "base_bid") {
      result.baseBidLineItem = {
        itemNumber: "1",
        description: parsed.description || parsed.label || "Base Bid",
        quantity: parsed.quantity || 1,
        unit: parsed.unit || "LS",
        unitPrice: parsed.amount,
        taxable: true,
      };
      result.summaryRows.push(createPricingSummaryRow(parsed.description || parsed.label || "Base Bid", parsed.amount, parsed.note));
      return;
    }

    if (parsed.kind === "total_if_all") {
      result.totalIfAllAccepted = parsed.amount;
      result.summaryRows.push(createPricingSummaryRow(parsed.label || "Total if all accepted", parsed.amount, parsed.note));
      result.totalRows.push({ label: parsed.label || "Total if all accepted", amount: parsed.amount, kind: parsed.kind });
      return;
    }

    if (parsed.kind === "total_presentation") {
      result.summaryRows.push(createPricingSummaryRow(parsed.label, parsed.amount, parsed.note));
      result.totalRows.push({ label: parsed.label, amount: parsed.amount, kind: parsed.kind });
      return;
    }

    if (parsed.kind === "no_alternate") {
      return;
    }

    result.sections.push({
      id: createProposalId(),
      type: parsed.kind,
      label: parsed.label,
      description: parsed.description,
      amount: parsed.amount,
      included: parsed.kind === "allowance",
    });
    result.summaryRows.push(createPricingSummaryRow(parsed.label, parsed.amount, parsed.note || parsed.description));
  });

  if (!result.baseBidLineItem && result.sections.length === 0) {
    const totalProposalRow = result.totalRows.find((row) => isPresentationTotalPricingLabel(String(row.label || "").toLowerCase()) && row.amount > 0);

    if (totalProposalRow) {
      result.baseBidLineItem = {
        itemNumber: "1",
        description: "Base Bid",
        quantity: 1,
        unit: "LS",
        unitPrice: totalProposalRow.amount,
        taxable: true,
      };
      result.summaryRows.unshift(createPricingSummaryRow("Base Bid", totalProposalRow.amount, "Created from total proposal because no accepted alternates were found."));
    }
  }

  return result;
}

function parseSmartPastePricingLine(line, warnings) {
  const looseTotal = parseLooseSmartPasteTotalLine(line);

  if (looseTotal) {
    return looseTotal;
  }

  const looseBaseBid = parseLooseSmartPasteBaseBidLine(line);

  if (looseBaseBid) {
    return looseBaseBid;
  }

  const match = String(line).match(/^([^:]+):\s*(.+)$/i);

  if (!match) {
    return null;
  }

  const rawLabel = match[1].trim();
  const rawValue = match[2].trim();
  const normalizedLabel = rawLabel.toLowerCase();
  const amountParts = rawValue.split("|").map((part) => part.trim()).filter(Boolean);
  const amount = toEditableNumber(amountParts[amountParts.length - 1]);

  if (isSmartPastePricingTableHeaderLabel(normalizedLabel)) {
    return null;
  }

  if (isNoAlternatePricingLabel(normalizedLabel) && isNoAlternateValue(rawValue)) {
    return { kind: "no_alternate", label: rawLabel, amount: 0, note: rawValue };
  }

  if (amount <= 0) {
    warnings.push(`Skipped pricing section "${line}" because the amount could not be parsed.`);
    return null;
  }

  if (isTotalIfAllAcceptedLabel(normalizedLabel)) {
    return { kind: "total_if_all", label: rawLabel, amount, note: "" };
  }

  if (isPresentationTotalPricingLabel(normalizedLabel)) {
    return { kind: "total_presentation", label: rawLabel, amount, note: "" };
  }

  if (isBaseBidPricingLabel(normalizedLabel)) {
    const description = getSmartPasteBaseBidDescription(rawLabel, amountParts);

    return {
      kind: "base_bid",
      label: rawLabel,
      description,
      amount,
      note: "",
    };
  }

  const type = getSmartPricingType(normalizedLabel);

  if (!type) {
    return null;
  }

  const numberedLabel = rawLabel.replace(/\s+/g, " ");
  const valueLabel = amountParts.length > 1 ? amountParts.slice(0, -1).join(" | ") : numberedLabel;
  const hasNumberedPrefix = /\d|[a-z]$/i.test(numberedLabel.replace(/^(add|deduct|deductive|additive|optional) alternate\s*/i, ""));
  const hasClearAlternateDescription = amountParts.length > 1 || !isGenericAlternatePricingLabel(normalizedLabel);

  if (type === "add_alternate" && !hasClearAlternateDescription) {
    warnings.push(`Alternate amount found without a clear alternate description: "${line}".`);
  }

  return {
    kind: type,
    label: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? numberedLabel : valueLabel,
    description: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? valueLabel : "",
    amount,
    note: "",
  };
}

function isSmartPricingLine(line) {
  return /^(base bid|base concrete(?:\s*\/\s*site package)?|base concrete work|allowance|accepted alternates|alternate|alternates|add alternate(?:\s+\d+|\s+[a-z]+)?|additive alternate|optional alternate|alt(?:ernate)?\s*#?\s*\d+|optional support scope|deduct(?:ive)? alternate(?:\s+\d+|\s+[a-z]+)?|total proposal|grand total|total with alternates?|total if .+|base with allowances)\s*:/i.test(
    String(line).trim(),
  );
}

function isSmartImplicitPricingLine(line) {
  const match = String(line || "").trim().match(/^([^:]+):\s*(.+)$/);

  if (!match) {
    return false;
  }

  const normalizedLabel = match[1].trim().toLowerCase();
  const amount = toEditableNumber(match[2]);

  if (amount <= 0) {
    return false;
  }

  return (
    isBaseBidPricingLabel(normalizedLabel) ||
    isExplicitAlternatePricingLabel(normalizedLabel) ||
    normalizedLabel.includes("optional support") ||
    isPresentationTotalPricingLabel(normalizedLabel)
  );
}

function getSmartPricingType(label) {
  if (label.startsWith("allowance")) {
    return "allowance";
  }

  if (label.startsWith("deduct alternate") || label.startsWith("deductive alternate")) {
    return "deduct_alternate";
  }

  if (isExplicitAlternatePricingLabel(label) || label.includes("optional support")) {
    return "add_alternate";
  }

  return "";
}

function isBaseBidPricingLabel(label) {
  return label === "base bid" || label.includes("base bid") || label.includes("base concrete") || label.includes("base concrete / site package");
}

function isTotalIfAllAcceptedLabel(label) {
  return (
    label.startsWith("total if all") ||
    label.startsWith("total if all alternates") ||
    (label.startsWith("total if") && (label.includes("all accepted") || label.includes("optional support")))
  );
}

function isPresentationTotalPricingLabel(label) {
  return (
    label.startsWith("total proposal") ||
    label.startsWith("grand total") ||
    label.startsWith("total with alternate") ||
    label.startsWith("total with alternates") ||
    label.startsWith("total if") ||
    label.startsWith("base with allowances")
  );
}

function isNoAlternatePricingLabel(label) {
  return (
    label.startsWith("add alternate") ||
    label.startsWith("additive alternate") ||
    label.startsWith("optional alternate") ||
    /^alt(?:ernate)?\s*#?\s*\d+/i.test(label) ||
    label === "accepted alternates" ||
    label === "alternates" ||
    label === "alternate"
  );
}

function isNoAlternateValue(value) {
  return /^(none|none currently|none currently accepted|no add alternates?|no alternate(?:s)?|n\/a|not applicable|not included|currently none)$/i.test(
    String(value || "").trim(),
  );
}

function isExplicitAlternatePricingLabel(label) {
  return (
    label.startsWith("add alternate") ||
    label.startsWith("additive alternate") ||
    label.startsWith("deduct alternate") ||
    label.startsWith("deductive alternate") ||
    label.startsWith("optional alternate") ||
    /^alt(?:ernate)?\s*#?\s*\d+/i.test(label) ||
    label === "accepted alternates" ||
    label === "alternate" ||
    label === "alternates"
  );
}

function isGenericAlternatePricingLabel(label) {
  return /^(add alternate|additive alternate|optional alternate|alternate|alt)$/i.test(String(label || "").trim());
}

function createPricingSummaryRow(label, amount, note = "") {
  return {
    id: createProposalId(),
    label,
    amount,
    note,
  };
}

function parseSmartPastePricingPipeLineItem(line) {
  const textValue = String(line || "").trim();

  if (!textValue.includes("|") || isSmartPastePricingHeaderLine(textValue)) {
    return null;
  }

  return parseSmartPasteLineItem(textValue, null);
}

function parseLooseSmartPasteBaseBidLine(line) {
  const textValue = String(line || "").trim();

  if (!textValue || textValue.includes("|") || !/\$?\d[\d,]*(?:\.\d{2})?\s*$/.test(textValue)) {
    return null;
  }

  const amount = getTrailingSmartPasteAmount(textValue);

  if (amount <= 0) {
    return null;
  }

  const label = textValue.replace(/\s*\$?[\d,]+(?:\.\d{2})?\s*$/, "").replace(/[:\-–—]\s*$/, "").trim();

  if (!isBaseBidPricingLabel(label.toLowerCase())) {
    return null;
  }

  return {
    kind: "base_bid",
    label: "Base Bid",
    description: getSmartPasteBaseBidDescription(label, []),
    amount,
    note: "",
  };
}

function parseLooseSmartPasteTotalLine(line) {
  const textValue = String(line || "").trim();

  if (!textValue || textValue.includes("|") || !/\$?\d[\d,]*(?:\.\d{2})?\s*$/.test(textValue)) {
    return null;
  }

  const amount = getTrailingSmartPasteAmount(textValue);

  if (amount <= 0) {
    return null;
  }

  const label = textValue.replace(/\s*\$?[\d,]+(?:\.\d{2})?\s*$/, "").replace(/[:\-–—]\s*$/, "").trim();
  const normalizedLabel = label.toLowerCase();

  if (isTotalIfAllAcceptedLabel(normalizedLabel)) {
    return { kind: "total_if_all", label, amount, note: "" };
  }

  if (isPresentationTotalPricingLabel(normalizedLabel)) {
    return { kind: "total_presentation", label, amount, note: "" };
  }

  return null;
}

function isLooseSmartPastePricingValueLine(line = "") {
  const textValue = String(line || "").trim();
  const normalizedText = textValue.toLowerCase();
  const amount = getTrailingSmartPasteAmount(textValue);

  if (amount <= 0 || textValue.includes("|")) {
    return false;
  }

  return (
    normalizedText.includes("base bid") ||
    normalizedText.includes("base concrete") ||
    normalizedText.startsWith("total proposal") ||
    normalizedText.startsWith("grand total") ||
    normalizedText.startsWith("total if") ||
    normalizedText.startsWith("total with alternate") ||
    normalizedText.startsWith("base with allowances")
  );
}

function getLooseSmartPastePricingLines(notes = "") {
  return String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => isLooseSmartPastePricingValueLine(line));
}

function getTrailingSmartPasteAmount(value = "") {
  const match = String(value || "").trim().match(/(\$?\s*\d[\d,]*(?:\.\d{2})?)\s*$/);

  return match ? toEditableNumber(match[1]) : 0;
}

function getSmartPasteBaseBidDescription(rawLabel = "", amountParts = []) {
  const valueDescription = amountParts.length > 1 ? amountParts.slice(0, -1).join(" | ").trim() : "";

  if (hasTextValue(valueDescription)) {
    return valueDescription;
  }

  const labelText = String(rawLabel || "").trim();
  const dashMatch = labelText.match(/^base\s+bid\s*[-–—]\s*(.+)$/i);

  if (dashMatch?.[1]) {
    return dashMatch[1].trim();
  }

  if (/^base\s+bid$/i.test(labelText)) {
    return "Base Bid";
  }

  return labelText.replace(/^base\s+bid\s*[:\-–—]?\s*/i, "").trim() || "Base Bid";
}

function isSmartPastePricingHeaderLine(line = "") {
  const normalizedLine = normalizeSmartPasteSectionLabel(line);

  return /^(item|description|qty|quantity|unit|unit price|amount|pricing basis|total)$/.test(normalizedLine);
}

function isSmartPastePricingTableHeaderLabel(label = "") {
  return /^(unit price|amount|item|description|qty|quantity|unit|pricing basis|total)$/.test(normalizeSmartPasteSectionLabel(label));
}

function parseSmartPasteLineItem(line, warnings) {
  const parts = String(line)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    if (hasTextValue(line)) {
      warnings?.push(`Skipped line item "${line}" because it does not use Description | Quantity | Unit | Unit Price.`);
    }

    return null;
  }

  const lineParts = parts.length >= 5 && /^\d+$/.test(parts[0]) ? parts.slice(1) : parts;
  const [description, quantityText, unitText, unitPriceText] = lineParts;
  const quantity = toEditableNumber(quantityText);
  const unitPrice = toEditableNumber(unitPriceText);
  const unit = String(unitText || "").trim().toUpperCase();

  if (!hasTextValue(description) || quantity <= 0 || !LINE_ITEM_UNITS.includes(unit) || unitPrice < 0) {
    warnings?.push(`Skipped line item "${line}" because quantity, unit, or unit price could not be parsed.`);
    return null;
  }

  return {
    itemNumber: "",
    description,
    quantity,
    unit,
    unitPrice,
    taxable: true,
  };
}

function normalizeSmartProposalType(value) {
  const textValue = String(value || "").toLowerCase();

  if (!textValue) {
    return "";
  }

  if (textValue.includes("gc") || textValue.includes("prime")) {
    return "gc_prime";
  }

  if (textValue.includes("residential")) {
    return "residential";
  }

  if (textValue.includes("public") || textValue.includes("municipal")) {
    return "public_municipal";
  }

  if (textValue.includes("commercial")) {
    return "commercial";
  }

  return "";
}

function getProposalModeFromParsedProposalType(proposalType = "") {
  if (proposalType === "gc_prime") {
    return "gc_prime_packet";
  }

  if (proposalType === "residential") {
    return "residential";
  }

  if (proposalType === "commercial" || proposalType === "public_municipal") {
    return "commercial_subcontractor";
  }

  return "";
}

