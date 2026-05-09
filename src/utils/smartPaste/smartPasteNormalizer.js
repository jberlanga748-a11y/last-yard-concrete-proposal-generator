import {
  mergeResidentialOptionBreakdowns,
  isResidentialChooseOnePricingMode,
  normalizeResidentialPdfLayout,
  normalizeResidentialOptionalAddOns,
  normalizeResidentialPricingOptions,
  normalizeResidentialScheduleOfValues,
} from "../proposalPacket/residentialPricing.js";
import { normalizeResidentialLegalPapers } from "../proposalPacket/residentialLegalPapers.js";
import {
  getPacketModeForProposalMode,
  getProposalTypeForMode,
  inferProposalModeFromSmartPaste,
  normalizeProposalMode,
} from "../proposals/proposalModes.js";

export const SMART_PASTE_JSON_MARKER = "LAST_YARD_SMART_PASTE_JSON_V1";

const EMPTY_NORMALIZED_SMART_PASTE = {
  proposalMode: "",
  proposalType: "",
  packetMode: "",
  residentialPdfLayout: "",
  cover: {
    projectName: "",
    projectLocation: "",
    projectAddress: "",
    owner: "",
    clientName: "",
    contactName: "",
    phone: "",
    email: "",
    proposalStatus: "",
    bidPackageNumber: "",
    specSections: "",
    drawingReferences: "",
    duration: "",
    scheduleRestrictions: "",
    specialRequirements: "",
    proposalMode: "",
  },
  pricing: {
    pricingMode: "",
    baseBid: 0,
    totalProposal: 0,
    lineItems: [],
    pricingOptions: [],
    optionGroups: [],
    optionalAddOns: [],
    allowances: [],
    alternates: [],
    acceptedAlternatesNone: false,
    pricingSummaryNotes: "",
    totalRows: [],
  },
  scope: {
    projectDescription: "",
    scopeSections: [],
    includedScope: [],
    exclusions: [],
    assumptions: [],
    clarifications: [],
    changeOrderTriggers: [],
    concreteSpecifications: {},
    gcNotes: "",
  },
  packet: {
    scheduleOfValues: [],
    takeoffQuantities: [],
    planSheets: [],
    rfiRegister: [],
    addendaAcknowledgement: [],
    scopeControlSummary: {},
    legalTerms: {},
    finalPacketPrintOrder: [],
    proposalNotes: {
      proposalBasis: "",
      contractScopeControl: "",
      acceptanceSummary: "",
      notes: "",
    },
  },
  warnings: [],
  confidence: 0,
  cleanupActions: [],
  sectionsCaptured: [],
  residentialLegalPapers: null,
};

const SIMPLE_COVER_LABELS = {
  "attention": "contactName",
  "bid package number": "bidPackageNumber",
  "contact": "contactName",
  "customer / gc": "clientName",
  "drawing references": "drawingReferences",
  "email": "email",
  "estimated duration": "duration",
  "gc": "clientName",
  "gc / prime contractor name": "clientName",
  "job": "projectName",
  "job name": "projectName",
  "location": "projectLocation",
  "owner": "owner",
  "phone": "phone",
  "prime": "clientName",
  "project": "projectName",
  "project address": "projectAddress",
  "project location": "projectLocation",
  "project name": "projectName",
  "proposal project": "projectName",
  "proposal mode": "proposalMode",
  "proposal status": "proposalStatus",
  "schedule restrictions": "scheduleRestrictions",
  "site": "projectLocation",
  "site address": "projectAddress",
  "special requirements": "specialRequirements",
  "spec section": "specSections",
  "spec sections": "specSections",
};

const CONCRETE_SPEC_LABELS = {
  "air entrainment": "airEntrainment",
  "concrete strength": "psi",
  "concrete supplier": "concreteSupplier",
  "control joint spacing": "controlJointSpacing",
  "cure / sealer notes": "cureSealerNotes",
  "fiber mesh": "fiberMesh",
  "finishes": "finishType",
  "pump required": "pumpRequired",
  "rebar / mesh": "rebarMeshDetails",
  "slump": "slump",
  "thickness": "thickness",
  "truck access notes": "truckAccessNotes",
};

const SCOPE_CONTROL_LABELS = {
  "accepted alternates": "acceptedAlternates",
  "allowances": "allowances",
  "clarifications": "clarifications",
  "exclusions": "exclusions",
  "hidden / unshown conditions note": "hiddenUnshownConditionsNote",
  "hidden unshown conditions note": "hiddenUnshownConditionsNote",
  "included scope": "includedScope",
  "owner / gc by others": "ownerGcByOthers",
  "owner gc by others": "ownerGcByOthers",
};

const LEGAL_TERM_LABELS = {
  "acceptance language": "acceptanceLanguage",
  "change order language": "changeOrderLanguage",
  "color / finish variation disclaimer": "colorFinishVariationDisclaimer",
  "concrete cracking disclaimer": "concreteCrackingDisclaimer",
  "deposit / scheduling language": "depositText",
  "final payment": "finalPayment",
  "gc / prime scope control": "gcScopeControl",
  "hidden conditions": "hiddenConditions",
  "late payment / collection": "latePayment",
  "payment terms": "paymentTerms",
  "progress billing": "progressBilling",
  "proposal expiration": "proposalExpiration",
  "site readiness": "siteReadiness",
  "utility responsibility": "utilityResponsibility",
  "warranty limitation": "warrantyLimitation",
  "weather delays": "weatherDelay",
};

const MAJOR_SECTION_LABELS = new Set([
  "addenda",
  "addenda acknowledged",
  "addenda acknowledgement",
  "assumptions",
  "base bid includes",
  "clarifications",
  "cover",
  "exclusions",
  "final gc packet print order",
  "included scope",
  "legal / terms",
  "legal terms",
  "line items",
  "plan sheet notes",
  "plan sheets / takeoff pages",
  "pricing",
  "pricing summary",
  "pricing summary / presentation notes",
  "project description",
  "project info",
  "proposal notes",
  "proposal status",
  "rfis",
  "rfi / clarification register",
  "schedule of values",
  "scope",
  "scope control summary",
  "scope of work",
  "sov",
  "structured addenda acknowledgement",
  "takeoff quantities",
]);

export function createEmptyNormalizedSmartPaste() {
  return cloneObject(EMPTY_NORMALIZED_SMART_PASTE);
}

export function isSmartPasteJsonImportNotes(notes = "") {
  return String(notes || "").trimStart().startsWith(SMART_PASTE_JSON_MARKER);
}

export function normalizeSmartPasteNotes(notes = "") {
  if (isSmartPasteJsonImportNotes(notes)) {
    return normalizeSmartPasteJsonImport(notes);
  }

  const normalized = createEmptyNormalizedSmartPaste();
  normalized.mode = "rough_notes";
  normalized.rawText = String(notes || "");
  const lines = splitSmartPasteLines(notes);

  parseCover(lines, normalized);
  parsePricing(lines, normalized);
  parseScope(lines, normalized);
  parseConcreteSpecifications(lines, normalized);
  parsePlanSheets(lines, normalized);
  parseScheduleOfValues(lines, normalized);
  parseTakeoffQuantities(lines, normalized);
  parseRfiRegister(lines, normalized);
  parseAddenda(lines, normalized);
  parseScopeControlSummary(lines, normalized);
  parseLegalTerms(lines, normalized);
  parseProposalNotes(lines, normalized);
  parseFinalPacketPrintOrder(lines, normalized);
  finalizeNormalizedSmartPaste(normalized);

  return normalized;
}

function normalizeSmartPasteJsonImport(notes = "") {
  const normalized = createEmptyNormalizedSmartPaste();
  normalized.mode = "json_import";
  normalized.rawText = String(notes || "");
  normalized.jsonImport = true;
  normalized.confidence = 1;

  const rawJson = String(notes || "").trimStart().slice(SMART_PASTE_JSON_MARKER.length).trim();

  if (!rawJson) {
    return markInvalidJsonImport(normalized, "Smart Paste JSON import marker was found, but no JSON was provided.");
  }

  let source;

  try {
    source = JSON.parse(rawJson);
  } catch (error) {
    return markInvalidJsonImport(normalized, `Smart Paste JSON import is invalid JSON: ${error.message}`);
  }

  if (!source || Array.isArray(source) || typeof source !== "object") {
    return markInvalidJsonImport(normalized, "Smart Paste JSON import must be a JSON object.");
  }

  const project = getObject(source.project || source.cover, "project", normalized);
  const pricing = getObject(source.pricing, "pricing", normalized);
  const packet = getObject(source.packet, "packet", normalized);
  const scope = getObject(source.scope, "scope", normalized);
  const explicitProposalMode = normalizeProposalMode(source.proposalMode || project.proposalMode || source.cover?.proposalMode);

  if (explicitProposalMode) {
    normalized.proposalMode = explicitProposalMode;
    normalized.proposalType = getProposalTypeForMode(explicitProposalMode);
    normalized.packetMode = getPacketModeForProposalMode(explicitProposalMode);
    normalized.cover.proposalMode = explicitProposalMode;
    capture(normalized, "proposalMode");
  }

  normalizeJsonCover(project, source.cover, normalized);
  normalizeJsonPricing(pricing, source, normalized);
  normalizeJsonResidentialPdfLayout(source, project, pricing, normalized);
  normalizeJsonScope(scope, source, normalized);
  normalizeJsonPacket(packet, source, normalized);
  normalizeJsonResidentialLegalPapers(source, normalized);
  finalizeNormalizedSmartPaste(normalized);

  return normalized;
}

function normalizeJsonResidentialPdfLayout(source = {}, project = {}, pricing = {}, normalized) {
  const layout = firstJsonText(
    source.residentialPdfLayout,
    source.pdfLayout,
    source.residentialLayout,
    source.printLayout,
    project.residentialPdfLayout,
    project.pdfLayout,
    pricing.residentialPdfLayout,
    pricing.pdfLayout,
  );

  if (!layout) {
    return;
  }

  normalized.residentialPdfLayout = normalizeResidentialPdfLayout(layout, {
    proposalMode: normalized.proposalMode || normalized.cover?.proposalMode,
    pricingMode: normalized.pricing?.pricingMode,
  });

  if (normalized.residentialPdfLayout) {
    capture(normalized, "residentialPdfLayout");
  }
}

function normalizeJsonResidentialLegalPapers(source = {}, normalized) {
  const legalPaperSource = source.residentialLegalPapers || source.residentialLegal || source.legalPapers;

  if (!legalPaperSource) {
    return;
  }

  normalized.residentialLegalPapers = normalizeResidentialLegalPapers(legalPaperSource);
  if (normalized.residentialLegalPapers.termsAndConditions?.includedInPdf === true) {
    normalized.warnings.push("Full Residential Terms are included. This will add multiple pages to the PDF.");
  }
  capture(normalized, "residentialLegalPapers");
}

function markInvalidJsonImport(normalized, warning) {
  normalized.invalid = true;
  normalized.warnings = [warning];
  normalized.confidence = 0;
  return normalized;
}

function normalizeJsonCover(project = {}, coverSource = {}, normalized) {
  const cover = normalized.cover;
  const source = { ...(coverSource || {}), ...(project || {}) };

  setCoverValue(cover, "projectName", firstJsonText(source.name, source.projectName, source.project), "project name");
  setCoverValue(cover, "projectLocation", firstJsonText(source.location, source.projectLocation), "project location");
  setCoverValue(cover, "projectAddress", firstJsonText(source.address, source.projectAddress), "project address");
  setCoverValue(cover, "owner", firstJsonText(source.owner, source.ownerName), "owner");
  setCoverValue(cover, "clientName", firstJsonText(source.clientGc, source.clientName, source.client, source.gc, source.customerGc, source.preparedFor), "client");
  setCoverValue(cover, "contactName", firstJsonText(source.contactName, source.contact, source.attention, source.attn), "contact");
  setCoverValue(cover, "phone", firstJsonText(source.phone, source.contactPhone), "phone");
  setCoverValue(cover, "email", firstJsonText(source.email, source.contactEmail), "email");
  setCoverValue(cover, "proposalStatus", firstJsonText(source.proposalStatus, source.status), "proposal status");
  setCoverValue(cover, "proposalMode", normalizeProposalMode(source.proposalMode), "proposal mode");
  setCoverValue(cover, "bidPackageNumber", firstJsonText(source.bidPackageNumber), "bid package number");
  setCoverValue(cover, "specSections", firstJsonText(source.specSections, source.specSection), "spec section");
  setCoverValue(cover, "drawingReferences", firstJsonText(source.drawingReferences), "drawing references");
  setCoverValue(cover, "duration", firstJsonText(source.duration, source.estimatedDuration), "estimated duration");
  setCoverValue(cover, "scheduleRestrictions", firstJsonText(source.scheduleRestrictions), "schedule restrictions");
  setCoverValue(cover, "specialRequirements", firstJsonText(source.specialRequirements), "special requirements");

  if (Object.values(cover).some(hasText)) {
    capture(normalized, "cover");
  }

  if (hasText(source.description)) {
    normalized.scope.projectDescription = cleanJsonText(source.description);
    capture(normalized, "projectDescription");
  }
}

function normalizeJsonPricing(pricing = {}, root = {}, normalized) {
  const lineItems = getArray(pricing.lineItems ?? root.lineItems, "pricing.lineItems", normalized);
  normalized.pricing.lineItems = lineItems.map(normalizeJsonLineItem).filter(Boolean);
  normalized.pricing.pricingMode = cleanJsonText(pricing.pricingMode || pricing.mode || root.pricingMode);
  normalized.pricing.pricingOptions = normalizeResidentialPricingOptions(
    getArray(pricing.pricingOptions ?? root.pricingOptions, "pricing.pricingOptions", normalized),
  );
  normalized.pricing.optionGroups = normalizeJsonPricingOptionGroups(pricing.optionGroups ?? root.optionGroups, normalized);
  normalized.pricing.pricingOptions.push(...normalized.pricing.optionGroups.flatMap((group) => group.options || []));
  normalized.pricing.pricingOptions = mergeResidentialOptionBreakdowns(
    normalized.pricing.pricingOptions,
    pricing.optionBreakdowns ?? pricing.pricingOptionBreakdowns ?? root.optionBreakdowns ?? root.pricingOptionBreakdowns,
  );
  normalized.pricing.optionalAddOns = normalizeResidentialOptionalAddOns(getArray(
    pricing.optionalAddOns ?? pricing.addOns ?? root.optionalAddOns ?? root.addOns,
    "pricing.optionalAddOns",
    normalized,
  ));
  normalized.pricing.allowances = getArray(pricing.allowances, "pricing.allowances", normalized).map(normalizeJsonPricingBucket).filter(Boolean);
  normalized.pricing.alternates = getArray(pricing.alternates, "pricing.alternates", normalized).map(normalizeJsonPricingBucket).filter(Boolean);
  normalized.pricing.baseBid = toNumber(pricing.baseBid);
  normalized.pricing.totalProposal = toNumber(pricing.totalProposal);
  normalized.pricing.pricingSummaryNotes = cleanJsonText(pricing.pricingSummaryNotes);
  normalizeChooseOnePricing(normalized.pricing);

  const lineItemTotal = sumLineItemAmounts(normalized.pricing.lineItems);

  if (normalized.pricing.baseBid <= 0 && lineItemTotal > 0) {
    normalized.pricing.baseBid = lineItemTotal;
  }

  if (
    normalized.pricing.totalProposal <= 0 &&
    lineItemTotal > 0 &&
    normalized.pricing.alternates.length === 0 &&
    !isResidentialChooseOnePricingMode(normalized.pricing.pricingMode)
  ) {
    normalized.pricing.totalProposal = lineItemTotal;
  }

  if (normalized.pricing.totalProposal > 0) {
    normalized.pricing.totalRows.push({
      label: "Total Proposal",
      amount: normalized.pricing.totalProposal,
    });
  }

  if (
    normalized.pricing.lineItems.length > 0 ||
    normalized.pricing.baseBid > 0 ||
    normalized.pricing.totalProposal > 0 ||
    normalized.pricing.pricingOptions.length > 0 ||
    normalized.pricing.optionalAddOns.length > 0
  ) {
    capture(normalized, "pricing");
  }
}

function normalizeJsonLineItem(item = {}) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const description = cleanJsonText(item.description || item.name || item.label);

  if (isPlaceholderText(description)) {
    return null;
  }

  const quantity = toNumber(item.quantity) || 1;
  const unitPrice = toNumber(item.unitPrice ?? item.price);
  const amount = toNumber(item.amount) || quantity * unitPrice;

  if (!description || amount <= 0) {
    return null;
  }

  return {
    itemNumber: cleanJsonText(item.itemNumber || item.item || item.itemNumberText),
    description,
    quantity,
    unit: cleanJsonText(item.unit || "LS").toUpperCase(),
    unitPrice: unitPrice || amount / quantity,
    amount,
    taxable: item.taxable === true,
  };
}

function normalizeJsonPricingBucket(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const label = cleanJsonText(row.label || row.name || row.description);
  const description = cleanJsonText(row.description || row.notes);
  const amount = toNumber(row.amount);

  if (!label || isPlaceholderText(label) || amount <= 0) {
    return null;
  }

  return { label, description, amount, included: row.included === true };
}

function normalizeJsonPricingOption(row = {}, index = 0) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const name = cleanJsonText(row.name || row.label || row.description || `Option ${index + 1}`);
  const description = cleanJsonText(row.description || row.notes);
  const price = toNumber(row.price ?? row.amount ?? row.total);

  if (!name || isPlaceholderText(name) || price <= 0) {
    return null;
  }

  const downPayment = toNumber(row.downPayment);
  const finalPayment = toNumber(row.finalPayment);

  return {
    id: cleanJsonText(row.id),
    name,
    description,
    price,
    downPayment: downPayment > 0 ? downPayment : price / 2,
    finalPayment: finalPayment > 0 ? finalPayment : price / 2,
    included: row.included === true || row.selected === true,
    selected: row.selected === true || row.included === true,
    scheduleOfValues: normalizeResidentialScheduleOfValues(row.scheduleOfValues ?? row.sov ?? row.breakdown ?? row.optionBreakdown),
  };
}

function normalizeJsonPricingOptionGroups(value, normalized) {
  const groups = getArray(value, "pricing.optionGroups", normalized);

  return groups
    .map((group, groupIndex) => {
      if (!group || typeof group !== "object") {
        return null;
      }

      const options = normalizeResidentialPricingOptions(getArray(group.options, `pricing.optionGroups[${groupIndex}].options`, normalized));

      if (options.length === 0) {
        return null;
      }

      return {
        id: cleanJsonText(group.id),
        name: cleanJsonText(group.name || group.label || "Pricing Options"),
        pricingMode: cleanJsonText(group.pricingMode || group.mode || "choose_one_option"),
        options,
      };
    })
    .filter(Boolean);
}

function normalizeJsonOptionalAddOn(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const name = cleanJsonText(row.name || row.label || row.description);
  const description = cleanJsonText(row.description || row.notes);
  const amount = toNumber(row.amount ?? row.price ?? row.total);

  if (!name || isPlaceholderText(name) || amount <= 0) {
    return null;
  }

  return {
    id: cleanJsonText(row.id),
    name,
    description,
    amount,
    appliesTo: Array.isArray(row.appliesTo) ? row.appliesTo.map(cleanJsonText).filter(Boolean) : normalizeJsonTextList(row.appliesTo),
    included: row.included === true || row.selected === true,
    selected: row.selected === true || row.included === true,
  };
}

function normalizeChooseOnePricing(pricing) {
  if (!pricing || !Array.isArray(pricing.pricingOptions)) {
    return;
  }

  pricing.pricingOptions = dedupeRows(pricing.pricingOptions, (row) => `${row.name} ${row.price}`);
  pricing.optionalAddOns = dedupeRows(pricing.optionalAddOns || [], (row) => `${row.name} ${row.amount}`);

  if (!pricing.pricingMode && pricing.pricingOptions.length >= 2) {
    pricing.pricingMode = "choose_one_option";
  }

  if (!isResidentialChooseOnePricingMode(pricing.pricingMode)) {
    return;
  }

  if (!pricing.pricingOptions.some((option) => option.included || option.selected) && pricing.pricingOptions[0]) {
    pricing.pricingOptions[0] = {
      ...pricing.pricingOptions[0],
      included: true,
      selected: true,
    };
  }

  const selectedOption = getSelectedPricingOption(pricing.pricingOptions);
  const selectedAddOnTotal = (pricing.optionalAddOns || []).reduce((sum, addOn) => sum + (addOn.included || addOn.selected ? toNumber(addOn.amount) : 0), 0);

  if (selectedOption) {
    pricing.baseBid = selectedOption.price;
    pricing.totalProposal = selectedOption.price + selectedAddOnTotal;
  }

  pricing.alternates = (pricing.alternates || []).filter((row) => !/^option\s*\d+/i.test(`${row.label} ${row.description}`));
}

function getSelectedPricingOption(options = []) {
  return options.find((option) => option.selected || option.included) || options[0] || null;
}

function normalizeJsonScope(scope = {}, root = {}, normalized) {
  const scopeSections = getArray(scope.scopeSections ?? root.scopeSections, "scopeSections", normalized);
  normalized.scope.scopeSections = scopeSections.map(normalizeJsonScopeSection).filter(Boolean);
  normalized.scope.projectDescription = cleanJsonText(scope.projectDescription || root.project?.description || normalized.scope.projectDescription);
  normalized.scope.includedScope = normalizeJsonTextList(scope.includedScope ?? root.includedScope);
  normalized.scope.exclusions = normalizeJsonTextList(scope.exclusions ?? root.exclusions);
  normalized.scope.assumptions = normalizeJsonTextList(scope.assumptions ?? root.assumptions);
  normalized.scope.clarifications = normalizeJsonTextList(scope.clarifications ?? root.clarifications);
  normalized.scope.changeOrderTriggers = normalizeJsonTextList(scope.changeOrderTriggers ?? root.changeOrderTriggers);
  normalized.scope.concreteSpecifications = getObject(scope.concreteSpecifications ?? root.concreteSpecifications, "concreteSpecifications", normalized);
  normalized.scope.gcNotes = cleanJsonText(scope.gcNotes);

  if (
    normalized.scope.scopeSections.length > 0 ||
    normalized.scope.includedScope.length > 0 ||
    normalized.scope.exclusions.length > 0 ||
    normalized.scope.assumptions.length > 0 ||
    Object.values(normalized.scope.concreteSpecifications || {}).some(hasText)
  ) {
    capture(normalized, "scope");
  }
}

function normalizeJsonScopeSection(section = {}) {
  if (typeof section === "string") {
    const text = cleanJsonText(section);
    return text && !isPlaceholderText(text) ? { title: "Scope of Work", bullets: [text] } : null;
  }

  if (!section || typeof section !== "object") {
    return null;
  }

  const title = cleanJsonText(section.title || section.name || "Scope of Work");
  const bullets = normalizeJsonTextList(section.bullets ?? section.items ?? section.scope);

  if ((!title || isPlaceholderText(title)) && bullets.length === 0) {
    return null;
  }

  return {
    title: isPlaceholderText(title) ? "Scope of Work" : title,
    bullets,
  };
}

function normalizeJsonPacket(packet = {}, root = {}, normalized) {
  normalized.packet.scheduleOfValues = getArray(packet.scheduleOfValues ?? root.scheduleOfValues, "scheduleOfValues", normalized)
    .map(normalizeJsonSovRow)
    .filter(Boolean);
  normalized.packet.takeoffQuantities = getArray(packet.takeoffQuantities ?? root.takeoffQuantities, "takeoffQuantities", normalized)
    .map(normalizeJsonTakeoffRow)
    .filter(Boolean);
  normalized.packet.planSheets = getArray(packet.planSheets ?? root.planSheets, "planSheets", normalized).map(normalizeJsonPlanSheet).filter(Boolean);
  normalized.packet.rfiRegister = getArray(packet.rfiRegister ?? root.rfiRegister, "rfiRegister", normalized).map(normalizeJsonRfiRow).filter(Boolean);
  normalized.packet.addendaAcknowledgement = normalizeJsonAddenda(packet.addendaAcknowledgement ?? root.addendaAcknowledgement);
  normalized.packet.scopeControlSummary = getObject(packet.scopeControlSummary ?? root.scopeControlSummary, "scopeControlSummary", normalized);
  normalized.packet.legalTerms = getObject(packet.legalTerms ?? root.legalTerms, "legalTerms", normalized);
  normalized.packet.finalPacketPrintOrder = getArray(packet.finalPacketPrintOrder ?? root.finalPacketPrintOrder, "finalPacketPrintOrder", normalized)
    .map(normalizeJsonPacketOrderRow)
    .filter(Boolean);
  normalized.packet.proposalNotes = normalizeJsonProposalNotes(packet.proposalNotes ?? root.proposalNotes);

  if (
    normalized.packet.scheduleOfValues.length > 0 ||
    normalized.packet.takeoffQuantities.length > 0 ||
    normalized.packet.planSheets.length > 0 ||
    normalized.packet.rfiRegister.length > 0 ||
    normalized.packet.addendaAcknowledgement.length > 0 ||
    Object.values(normalized.packet.scopeControlSummary || {}).some(hasText) ||
    Object.values(normalized.packet.legalTerms || {}).some(hasText) ||
    normalized.packet.finalPacketPrintOrder.length > 0 ||
    Object.values(normalized.packet.proposalNotes || {}).some(hasText)
  ) {
    capture(normalized, "packet");
  }
}

function normalizeJsonSovRow(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const item = cleanJsonText(row.item || row.name);
  const description = cleanJsonText(row.description);
  const pricingBasis = cleanJsonText(row.pricingBasis || row.basis);
  const amount = cleanJsonText(row.amount);

  if ([item, description, pricingBasis, amount].every((value) => !value || isPlaceholderText(value))) {
    return null;
  }

  return { item, description, pricingBasis, amount };
}

function normalizeJsonTakeoffRow(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const normalized = {
    item: cleanJsonText(row.item || row.name),
    quantity: cleanJsonText(row.quantity || row.qty),
    detailSize: cleanJsonText(row.detailSize || row.detail || row.size),
    netCy: cleanJsonText(row.netCy),
    cyWithWaste: cleanJsonText(row.cyWithWaste || row.cyWithTenPercent),
    priceStatus: cleanJsonText(row.priceStatus || row.status),
  };

  return Object.values(normalized).some((value) => value && !isPlaceholderText(value)) ? normalized : null;
}

function normalizeJsonPlanSheet(sheet = {}) {
  if (!sheet || typeof sheet !== "object") {
    return null;
  }

  const title = cleanJsonText(sheet.title || sheet.sheetTitle || sheet.sheetId);

  if (!title || isPlaceholderText(title)) {
    return null;
  }

  return {
    sheetId: cleanJsonText(sheet.sheetId || sheet.id || title),
    title,
    subtitle: cleanJsonText(sheet.subtitle),
    calculationBoxTitle: cleanJsonText(sheet.calculationBoxTitle || sheet.calculationTitle),
    calculationNotes: normalizeJsonTextList(sheet.calculationNotes || sheet.notes),
    clarificationNotes: normalizeJsonTextList(sheet.clarificationNotes),
    pictureCaption: cleanJsonText(sheet.pictureCaption),
  };
}

function normalizeJsonRfiRow(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const normalized = {
    number: cleanJsonText(row.number || row.rfiNumber),
    asked: cleanJsonText(row.asked || row.dateAsked),
    answered: cleanJsonText(row.answered || row.dateAnswered),
    source: cleanJsonText(row.source),
    question: cleanJsonText(row.question || row.clarificationNeeded),
    treatment: cleanJsonText(row.treatment || row.answerTreatment || row.answer),
    priceImpact: cleanJsonText(row.priceImpact),
    scopeImpact: cleanJsonText(row.scopeImpact),
  };

  return Object.values(normalized).some((value) => value && !isPlaceholderText(value)) ? normalized : null;
}

function normalizeJsonAddenda(value) {
  if (typeof value === "string") {
    const text = cleanJsonText(value);
    return text && !isPlaceholderText(text)
      ? [{ number: text, date: "", titleDescription: "", acknowledged: true, notes: "", includedInPacket: true }]
      : [];
  }

  return (Array.isArray(value) ? value : [])
    .map((row) => {
      if (typeof row === "string") {
        return { number: row, date: "", titleDescription: "", acknowledged: true, notes: "", includedInPacket: true };
      }

      if (!row || typeof row !== "object") {
        return null;
      }

      return {
        number: cleanJsonText(row.number || row.addendumNumber),
        date: cleanJsonText(row.date || row.addendumDate),
        titleDescription: cleanJsonText(row.titleDescription || row.description || row.title),
        acknowledged: row.acknowledged !== false,
        notes: cleanJsonText(row.notes),
        includedInPacket: row.includedInPacket !== false,
      };
    })
    .filter((row) => row && Object.values(row).some(hasText));
}

function normalizeJsonPacketOrderRow(row = {}) {
  if (typeof row === "string") {
    const parts = row.split(/[–—-]/).map((part) => part.trim()).filter(Boolean);
    const order = Number.parseInt(parts[0], 10);
    const label = Number.isFinite(order) ? parts.slice(1, -1).join(" - ") || parts[1] : parts.slice(0, -1).join(" - ") || parts[0];
    const status = parts[parts.length - 1] || "Included";

    return label ? { order: Number.isFinite(order) ? order : 999, label, status } : null;
  }

  if (!row || typeof row !== "object") {
    return null;
  }

  const label = cleanJsonText(row.label || row.title || row.section);

  if (!label) {
    return null;
  }

  return {
    order: Number.parseInt(row.order, 10) || 999,
    label,
    status: cleanJsonText(row.status || (row.included === false ? "Exclude" : "Included")),
  };
}

function normalizeJsonProposalNotes(value) {
  if (typeof value === "string" || Array.isArray(value)) {
    return {
      proposalBasis: "",
      contractScopeControl: "",
      acceptanceSummary: "",
      notes: normalizeJsonTextList(value).join("\n"),
    };
  }

  if (!value || typeof value !== "object") {
    return { proposalBasis: "", contractScopeControl: "", acceptanceSummary: "", notes: "" };
  }

  return {
    proposalBasis: cleanJsonText(value.proposalBasis),
    contractScopeControl: cleanJsonText(value.contractScopeControl),
    acceptanceSummary: cleanJsonText(value.acceptanceSummary),
    notes: normalizeJsonTextList(value.notes ?? value.items).join("\n"),
  };
}

function getObject(value, name, normalized) {
  if (value === undefined || value === null) {
    return {};
  }

  if (Array.isArray(value) || typeof value !== "object") {
    normalized.warnings.push(`Smart Paste JSON field "${name}" should be an object.`);
    return {};
  }

  return value;
}

function getArray(value, name, normalized) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    normalized.warnings.push(`Smart Paste JSON field "${name}" should be an array.`);
    return [];
  }

  return value;
}

function firstJsonText(...values) {
  const value = values.find((candidate) => hasText(candidate));
  return cleanJsonText(value);
}

function cleanJsonText(value = "") {
  const text = cleanText(value);
  return isPlaceholderText(text) ? "" : text;
}

function normalizeJsonTextList(value) {
  if (Array.isArray(value)) {
    return dedupeList(value.map(cleanJsonText).filter(Boolean));
  }

  if (typeof value === "string") {
    return dedupeList(splitList(value).map(cleanJsonText).filter(Boolean));
  }

  return [];
}

function isPlaceholderText(value = "") {
  const normalized = cleanText(value).toLowerCase();

  return (
    !normalized ||
    normalized === "new scope item" ||
    normalized === "new item" ||
    normalized === "untitled" ||
    normalized === "upload plan image" ||
    normalized.includes("[enter") ||
    normalized.includes("[verify")
  );
}

function parseCover(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const directKey = SIMPLE_COVER_LABELS[label];
    const value = getInlineOrNextValue(lines, index, labelLine.value);

    if (!directKey || !hasText(value)) {
      return;
    }

    setCoverValue(normalized.cover, directKey, value, label);
    capture(normalized, "cover");
  });
}

function setCoverValue(cover, key, value, label) {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return;
  }

  if (key === "projectName") {
    if (looksLikeAddress(cleanValue)) {
      if (!cover.projectAddress) {
        cover.projectAddress = cleanValue;
      }
      if (!cover.projectLocation) {
        cover.projectLocation = cleanValue;
      }
      return;
    }

    if (label === "project name" || !cover.projectName) {
      cover.projectName = cleanValue;
    }
    return;
  }

  if (key === "projectLocation") {
    if (!cover.projectLocation) {
      cover.projectLocation = cleanValue;
    }
    return;
  }

  if (key === "projectAddress") {
    cover.projectAddress = cleanValue;
    if (!cover.projectLocation || looksLikeAddress(cleanValue)) {
      cover.projectLocation = cover.projectLocation || cleanValue;
    }
    return;
  }

  if (!cover[key]) {
    cover[key] = cleanValue;
  }
}

function parsePricing(lines, normalized) {
  normalized.pricing.lineItems.push(...parsePricingLineItemBlocks(lines));
  parseLoosePricingLines(lines, normalized);
  parseAlternateAndAllowanceLines(lines, normalized);
  parseResidentialPricingOptions(lines, normalized);
  normalizeChooseOnePricing(normalized.pricing);

  const lineItemTotal = sumLineItemAmounts(normalized.pricing.lineItems);

  if (lineItemTotal > 0) {
    normalized.pricing.baseBid = normalized.pricing.baseBid || lineItemTotal;
    normalized.pricing.totalProposal = normalized.pricing.totalProposal || lineItemTotal;
  }

  if (
    normalized.pricing.totalProposal > 0 &&
    normalized.pricing.baseBid <= 0 &&
    normalized.pricing.alternates.length === 0 &&
    !isResidentialChooseOnePricingMode(normalized.pricing.pricingMode)
  ) {
    normalized.pricing.baseBid = normalized.pricing.totalProposal;
    normalized.pricing.lineItems.push({
      itemNumber: "1",
      description: "Base Bid",
      quantity: 1,
      unit: "LS",
      unitPrice: normalized.pricing.totalProposal,
      amount: normalized.pricing.totalProposal,
      taxable: false,
    });
  }

  if (normalized.pricing.baseBid > 0 && normalized.pricing.lineItems.length === 0 && !isResidentialChooseOnePricingMode(normalized.pricing.pricingMode)) {
    normalized.pricing.lineItems.push({
      itemNumber: "1",
      description: "Base Bid",
      quantity: 1,
      unit: "LS",
      unitPrice: normalized.pricing.baseBid,
      amount: normalized.pricing.baseBid,
      taxable: false,
    });
  }

  if (
    normalized.pricing.lineItems.length > 0 ||
    normalized.pricing.baseBid > 0 ||
    normalized.pricing.totalProposal > 0 ||
    normalized.pricing.pricingOptions.length > 0 ||
    normalized.pricing.optionalAddOns.length > 0
  ) {
    capture(normalized, "pricing");
  }
}

function parsePricingLineItemBlocks(lines) {
  const lineItems = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^pricing\s+line\s+item\s*(\d+)?\s*:\s*$/i);

    if (!match) {
      continue;
    }

    const block = [];

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];

      if (/^pricing\s+line\s+item\s*\d*\s*:\s*$/i.test(nextLine) || isMajorSectionHeader(nextLine)) {
        break;
      }

      block.push(nextLine);
    }

    const lineItem = parsePricingLineItemBlock(block, match[1]);

    if (lineItem) {
      lineItems.push(lineItem);
    }
  }

  return lineItems;
}

function parsePricingLineItemBlock(blockLines, fallbackItemNumber = "") {
  const values = {};

  for (let index = 0; index < blockLines.length; index += 1) {
    const labelLine = parseLabelLine(blockLines[index]);

    if (!labelLine) {
      continue;
    }

    const label = normalizeLabel(labelLine.label);
    const fieldMap = {
      "amount": "amount",
      "description": "description",
      "item #": "itemNumber",
      "item number": "itemNumber",
      "quantity": "quantity",
      "qty": "quantity",
      "taxable": "taxable",
      "unit": "unit",
      "unit price": "unitPrice",
    };
    const field = fieldMap[label];

    if (!field) {
      continue;
    }

    values[field] = getInlineOrNextValue(blockLines, index, labelLine.value);
  }

  const description = cleanText(values.description);
  const quantity = toNumber(values.quantity) || 1;
  const unit = normalizeUnit(values.unit) || "LS";
  const unitPrice = toNumber(values.unitPrice);
  const amount = toNumber(values.amount) || quantity * unitPrice;

  if (!description || amount <= 0) {
    return null;
  }

  return {
    itemNumber: cleanText(values.itemNumber || fallbackItemNumber || "1"),
    description,
    quantity,
    unit,
    unitPrice: unitPrice || amount / quantity,
    amount,
    taxable: !/^(no|false|unchecked|n\/a)$/i.test(cleanText(values.taxable)),
  };
}

function parseLoosePricingLines(lines, normalized) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const labelLine = parseLabelLine(line);

    if (labelLine) {
      const label = normalizeLabel(labelLine.label);
      const value = getInlineOrNextValue(lines, index, labelLine.value);
      const amount = toNumber(value);

      if (amount > 0 && isBaseBidLabel(label)) {
        normalized.pricing.baseBid = amount;

        if (normalized.pricing.lineItems.length === 0) {
          normalized.pricing.lineItems.push({
            itemNumber: "1",
            description: getBaseBidDescription(labelLine.label),
            quantity: 1,
            unit: "LS",
            unitPrice: amount,
            amount,
            taxable: false,
          });
        }
        continue;
      }

      if (amount > 0 && isTotalProposalLabel(label)) {
        normalized.pricing.totalProposal = amount;
        normalized.pricing.totalRows.push({ label: labelLine.label.trim(), amount });
        continue;
      }

      if (isAcceptedAlternatesLabel(label) && isNoAlternateText(value)) {
        normalized.pricing.acceptedAlternatesNone = true;
      }

      continue;
    }

    const looseBase = parseLooseBaseBidLine(line);

    if (looseBase) {
      normalized.pricing.baseBid = looseBase.amount;

      if (normalized.pricing.lineItems.length === 0) {
        normalized.pricing.lineItems.push({
          itemNumber: "1",
          description: looseBase.description,
          quantity: 1,
          unit: "LS",
          unitPrice: looseBase.amount,
          amount: looseBase.amount,
          taxable: false,
        });
      }
      continue;
    }

    const looseTotal = parseLooseTotalLine(line);

    if (looseTotal) {
      normalized.pricing.totalProposal = looseTotal.amount;
      normalized.pricing.totalRows.push({ label: looseTotal.label, amount: looseTotal.amount });
    }
  }
}

function parseAlternateAndAllowanceLines(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const value = getInlineOrNextValue(lines, index, labelLine.value);

    if (isNoAlternateText(value) && (isAcceptedAlternatesLabel(label) || isAlternateLabel(label))) {
      normalized.pricing.acceptedAlternatesNone = true;
      return;
    }

    if (!isAlternateLabel(label) && !label.startsWith("allowance")) {
      return;
    }

    const amount = toNumber(value) || getTrailingAmount(value);

    if (amount <= 0) {
      return;
    }

    const amountRemoved = cleanText(value).replace(/\$?\s*\d[\d,]*(?:\.\d{2})?/g, "").replace(/\|/g, " ").trim();
    const row = {
      label: labelLine.label.trim(),
      description: amountRemoved || labelLine.label.trim(),
      amount,
    };

    if (label.startsWith("allowance")) {
      normalized.pricing.allowances.push(row);
    } else {
      normalized.pricing.alternates.push(row);
    }
  });
}

function parseResidentialPricingOptions(lines, normalized) {
  const fullText = lines.join("\n").toLowerCase();
  const pricingOptions = [];
  const optionalAddOns = [];
  const hasChooseOneLanguage =
    /customer\s+(?:to\s+)?choose(?:s)?\s+one|choose\s+one\s+option|main pricing options|mutually exclusive|finish choices?|customer selects one/i.test(
      fullText,
    );

  lines.forEach((line) => {
    const option = parseResidentialOptionLine(line);

    if (option) {
      pricingOptions.push(option);
      return;
    }

    const addOn = parseResidentialOptionalAddOnLine(line);

    if (addOn) {
      optionalAddOns.push(addOn);
    }
  });

  if (pricingOptions.length < 2 || (!hasChooseOneLanguage && pricingOptions.length < 3)) {
    return;
  }

  const sortedOptions = pricingOptions.sort((a, b) => a.optionNumber - b.optionNumber);
  sortedOptions.forEach((option, index) => {
    option.included = option.included || index === 0;
    option.selected = option.selected || option.included;
    delete option.optionNumber;
  });

  normalized.pricing.pricingMode = "choose_one_option";
  normalized.pricing.pricingOptions.push(...sortedOptions);
  normalized.pricing.optionalAddOns.push(...optionalAddOns);
  normalized.pricing.alternates = normalized.pricing.alternates.filter((row) => !/^option\s*\d+/i.test(`${row.label} ${row.description}`));
  capture(normalized, "pricing");
}

function parseResidentialOptionLine(line = "") {
  const text = cleanText(line);
  const match = text.match(/^option\s*(\d+)\s*(?:[-:–—]\s*)?(.+)$/i);

  if (!match) {
    return null;
  }

  const amount = getTrailingAmount(match[2]);

  if (amount <= 0) {
    return null;
  }

  const optionNumber = Number.parseInt(match[1], 10) || 0;
  const rawDescription = match[2]
    .replace(/\$?\s*\d[\d,]*(?:\.\d{2})?\s*$/, "")
    .replace(/\s*(?:=|:|-|–|—)\s*$/, "")
    .trim();
  const name = cleanText(`Option ${optionNumber} - ${rawDescription.replace(/^[-:–—]\s*/, "")}`);

  return {
    optionNumber,
    name,
    description: "",
    price: amount,
    downPayment: amount / 2,
    finalPayment: amount / 2,
    included: /selected|accepted|included/i.test(text),
    selected: /selected|accepted|included/i.test(text),
  };
}

function parseResidentialOptionalAddOnLine(line = "") {
  const text = cleanText(line);
  const amount = getTrailingAmount(text);

  if (amount <= 0 || /^option\s*\d+/i.test(text)) {
    return null;
  }

  if (!/cantilever|optional\s+(?:upgrade|add[- ]?on)|add[- ]?on|upgrade/i.test(text)) {
    return null;
  }

  const name = cleanText(
    text
      .replace(/\$?\s*\d[\d,]*(?:\.\d{2})?\s*$/, "")
      .replace(/\s*(?:=|:|-|–|—)\s*$/, ""),
  );

  if (!name) {
    return null;
  }

  return {
    name,
    description: /cantilever/i.test(name) ? "Optional upgrade to selected option." : "",
    amount,
    appliesTo: ["Option 1", "Option 2", "Option 3"],
    included: /selected|accepted|included/i.test(text),
    selected: /selected|accepted|included/i.test(text),
  };
}

function parseScope(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);

    if (label === "scope summary" || label === "project description") {
      normalized.scope.projectDescription = readBlockValue(lines, index, labelLine.value);
      capture(normalized, "projectDescription");
    }

    if (label === "included scope" || label === "base bid includes") {
      normalized.scope.includedScope.push(...splitList(readBlockValue(lines, index, labelLine.value)));
      capture(normalized, "includedScope");
    }

    if (label === "exclusions") {
      normalized.scope.exclusions.push(...splitList(readBlockValue(lines, index, labelLine.value)));
      capture(normalized, "exclusions");
    }

    if (label === "assumptions") {
      normalized.scope.assumptions.push(...splitList(readBlockValue(lines, index, labelLine.value)));
      capture(normalized, "assumptions");
    }

    const scopeMatch = label.match(/^scope of work - section\s+(\d+)\s+(title|bullets)$/);

    if (!scopeMatch) {
      return;
    }

    const sectionNumber = scopeMatch[1];
    const field = scopeMatch[2];
    const section = getOrCreateScopeSection(normalized.scope.scopeSections, sectionNumber);
    const value = readBlockValue(lines, index, labelLine.value);

    if (field === "title") {
      section.title = value;
    } else {
      section.bullets.push(...splitList(value));
    }

    capture(normalized, "scope");
  });

  normalized.scope.scopeSections = normalized.scope.scopeSections
    .filter((section) => section.title || section.bullets.length > 0)
    .map((section, index) => ({
      title: section.title || `Scope Section ${index + 1}`,
      bullets: dedupeList(section.bullets),
    }));

  normalized.scope.includedScope = dedupeList(normalized.scope.includedScope);
  normalized.scope.exclusions = dedupeList(normalized.scope.exclusions);
  normalized.scope.assumptions = dedupeList(normalized.scope.assumptions);
}

function getOrCreateScopeSection(scopeSections, sectionNumber) {
  let section = scopeSections.find((candidate) => candidate.sectionNumber === sectionNumber);

  if (!section) {
    section = { sectionNumber, title: "", bullets: [] };
    scopeSections.push(section);
  }

  return section;
}

function parseConcreteSpecifications(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const match = label.match(/^concrete specifications - (.+)$/);
    const field = match ? CONCRETE_SPEC_LABELS[match[1]] : "";

    if (!field) {
      return;
    }

    const value = readBlockValue(lines, index, labelLine.value);
    normalized.scope.concreteSpecifications[field] =
      field === "fiberMesh" || field === "pumpRequired" ? /^yes|true|required/i.test(value) : value;
    capture(normalized, "concreteSpecs");
  });
}

function parsePlanSheets(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const match = label.match(/^(plan takeoff sheet|[a-z]\d{2,}[a-z]?) - (sheet title|sheet subtitle|calculation box title|calculation notes|clarification notes|picture caption)$/);

    if (!match) {
      return;
    }

    const sheetId = match[1].toUpperCase();
    const fieldLabel = match[2];
    const sheet = getOrCreatePlanSheet(normalized.packet.planSheets, sheetId);
    const value = readBlockValue(lines, index, labelLine.value);

    if (fieldLabel === "sheet title") {
      sheet.title = value;
    } else if (fieldLabel === "sheet subtitle") {
      sheet.subtitle = value;
    } else if (fieldLabel === "calculation box title") {
      sheet.calculationBoxTitle = value;
    } else if (fieldLabel === "calculation notes") {
      sheet.calculationNotes.push(...splitList(value));
    } else if (fieldLabel === "clarification notes") {
      sheet.clarificationNotes.push(...splitList(value));
    } else if (fieldLabel === "picture caption") {
      sheet.pictureCaption = value;
    }

    capture(normalized, "planSheets");
  });

  normalized.packet.planSheets = normalized.packet.planSheets
    .filter((sheet) => sheet.title || sheet.subtitle || sheet.calculationNotes.length || sheet.clarificationNotes.length || sheet.pictureCaption)
    .map((sheet) => ({
      ...sheet,
      title: sheet.title || sheet.sheetId,
      calculationNotes: dedupeList(sheet.calculationNotes),
      clarificationNotes: dedupeList(sheet.clarificationNotes),
    }));
}

function getOrCreatePlanSheet(planSheets, sheetId) {
  let sheet = planSheets.find((candidate) => candidate.sheetId === sheetId);

  if (!sheet) {
    sheet = {
      sheetId,
      title: "",
      subtitle: "",
      calculationBoxTitle: "",
      calculationNotes: [],
      clarificationNotes: [],
      pictureCaption: "",
    };
    planSheets.push(sheet);
  }

  return sheet;
}

function parseScheduleOfValues(lines, normalized) {
  const sectionLines = getSectionLines(lines, (line) => /^(schedule of values|sov)\s*:?\s*$/i.test(line));
  const rows = parseFieldBlockRows(sectionLines, {
    amount: "amount",
    description: "description",
    item: "item",
    "pricing basis": "pricingBasis",
  });

  normalized.packet.scheduleOfValues = rows.map((row) => ({
    item: stripLeadingNumber(row.item || ""),
    description: cleanText(row.description),
    pricingBasis: cleanText(row.pricingBasis),
    amount: cleanText(row.amount),
  })).filter((row) => row.item || row.description || row.amount > 0);

  if (normalized.packet.scheduleOfValues.length > 0) {
    capture(normalized, "scheduleOfValues");
  }
}

function parseTakeoffQuantities(lines, normalized) {
  const sectionLines = getSectionLines(lines, (line) => /^takeoff quantities\s*:?\s*$/i.test(line));
  const rows = parseFieldBlockRows(sectionLines, {
    "cy with 10%": "cyWithWaste",
    "cy with 10 percent": "cyWithWaste",
    "cy with waste": "cyWithWaste",
    "detail / size": "detailSize",
    detail: "detailSize",
    item: "item",
    "net cy": "netCy",
    "price / status": "priceStatus",
    "price status": "priceStatus",
    quantity: "quantity",
    qty: "quantity",
    status: "priceStatus",
  });

  normalized.packet.takeoffQuantities = rows.map((row) => ({
    item: cleanText(row.item),
    quantity: cleanText(row.quantity),
    detailSize: cleanText(row.detailSize),
    netCy: cleanText(row.netCy),
    cyWithWaste: cleanText(row.cyWithWaste),
    priceStatus: cleanText(row.priceStatus),
  })).filter((row) => Object.values(row).some(hasText));

  if (normalized.packet.takeoffQuantities.length > 0) {
    capture(normalized, "takeoffQuantities");
  }
}

function parseFieldBlockRows(sectionLines, fieldMap) {
  const rows = [];
  let currentRow = null;
  let lastField = "";

  function flush() {
    if (currentRow && Object.values(currentRow).some(hasText)) {
      rows.push(currentRow);
    }
    currentRow = null;
    lastField = "";
  }

  for (let index = 0; index < sectionLines.length; index += 1) {
    const line = sectionLines[index];

    if (!line || isTableHeaderLine(line)) {
      continue;
    }

    if (/^row\s+\d+\b/i.test(line)) {
      flush();
      currentRow = {};
      continue;
    }

    const labelLine = parseLabelLine(line);

    if (labelLine) {
      const field = fieldMap[normalizeLabel(labelLine.label)];

      if (field) {
        if (!currentRow || (field === "item" && Object.values(currentRow).some(hasText))) {
          flush();
          currentRow = {};
        }

        const fieldValue = getInlineOrNextValueWithIndex(sectionLines, index, labelLine.value);
        currentRow[field] = [currentRow[field], fieldValue.value].filter(hasText).join(" ").trim();
        index = fieldValue.index;
        lastField = field;
        continue;
      }
    }

    if (/^\d+[.)]\s+/.test(line) && fieldMap.item) {
      flush();
      currentRow = { item: line };
      lastField = "item";
      continue;
    }

    if (currentRow && lastField && !isMajorSectionHeader(line)) {
      currentRow[lastField] = [currentRow[lastField], line].filter(hasText).join(" ").trim();
    }
  }

  flush();
  return rows;
}

function parseRfiRegister(lines, normalized) {
  let currentRow = null;

  function flush() {
    if (currentRow && Object.values(currentRow).some(hasText)) {
      normalized.packet.rfiRegister.push(currentRow);
    }
    currentRow = null;
  }

  lines.forEach((line, index) => {
    const rfiMatch = line.match(/^(rfi\s*\/\s*clarification|rfi|clarification)\s*([0-9][a-z0-9.-]*|[a-z]+-\d+)?\s*:\s*(.*)$/i);

    if (rfiMatch && !/number$/i.test(rfiMatch[1])) {
      flush();
      currentRow = {
        number: rfiMatch[2] ? `RFI-${String(rfiMatch[2]).padStart(2, "0")}` : "",
        asked: "",
        answered: "",
        source: "",
        question: cleanText(rfiMatch[3]),
        treatment: "",
        priceImpact: "",
        scopeImpact: "",
      };
      capture(normalized, "rfiRegister");
      return;
    }

    if (!currentRow) {
      return;
    }

    if (isMajorSectionHeader(line) && !/^rfi\s*\/\s*clarification number\s*:/i.test(line)) {
      flush();
      return;
    }

    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      currentRow.treatment = [currentRow.treatment, line].filter(hasText).join("\n");
      return;
    }

    const fieldMap = {
      "answer": "treatment",
      "answer / proposal treatment": "treatment",
      "clarification number": "number",
      "date answered": "answered",
      "date asked": "asked",
      "price impact": "priceImpact",
      "proposal treatment": "treatment",
      "question": "question",
      "question / clarification needed": "question",
      "rfi / clarification number": "number",
      "rfi number": "number",
      "scope impact": "scopeImpact",
      "source": "source",
    };
    const field = fieldMap[normalizeLabel(labelLine.label)];

    if (field) {
      currentRow[field] = readBlockValue(lines, index, labelLine.value);
    }
  });

  flush();
  normalized.packet.rfiRegister = dedupeRows(normalized.packet.rfiRegister, (row) => row.number || row.question);
}

function parseAddenda(lines, normalized) {
  const sectionLines = getSectionLines(lines, (line) => /^(structured\s+)?addenda?\s+(acknowledgement|acknowledged|acknowledgment)\s*:?\s*$/i.test(line));

  sectionLines.forEach((line) => {
    const match = line.match(/^addendum\s*([a-z0-9.-]+)?\s*:\s*(.*)$/i);

    if (!match) {
      return;
    }

    normalized.packet.addendaAcknowledgement.push({
      number: match[1] ? `Addendum ${match[1]}` : "Addendum",
      date: "",
      titleDescription: cleanText(match[2]),
      acknowledged: true,
      notes: "",
      includedInPacket: true,
    });
    capture(normalized, "addendaRegister");
  });
}

function parseScopeControlSummary(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const match = label.match(/^scope control summary - (.+)$/);
    const field = match ? SCOPE_CONTROL_LABELS[match[1]] : "";

    if (!field) {
      return;
    }

    normalized.packet.scopeControlSummary[field] = readBlockValue(lines, index, labelLine.value);
    capture(normalized, "scopeControlSummary");
  });
}

function parseLegalTerms(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);
    const match = label.match(/^legal \/ terms - (.+)$/);
    const field = match ? LEGAL_TERM_LABELS[match[1]] : "";

    if (!field) {
      return;
    }

    normalized.packet.legalTerms[field] = readBlockValue(lines, index, labelLine.value);
    capture(normalized, "legalTerms");
  });
}

function parseProposalNotes(lines, normalized) {
  lines.forEach((line, index) => {
    const labelLine = parseLabelLine(line);

    if (!labelLine) {
      return;
    }

    const label = normalizeLabel(labelLine.label);

    if (label === "proposal notes") {
      normalized.packet.proposalNotes.notes = readBlockValue(lines, index, labelLine.value);
      capture(normalized, "proposalNotes");
    } else if (label === "acceptance summary") {
      normalized.packet.proposalNotes.acceptanceSummary = readBlockValue(lines, index, labelLine.value);
      capture(normalized, "proposalNotes");
    } else if (label === "proposal basis") {
      normalized.packet.proposalNotes.proposalBasis = readBlockValue(lines, index, labelLine.value);
      capture(normalized, "proposalNotes");
    }
  });
}

function parseFinalPacketPrintOrder(lines, normalized) {
  const sectionLines = getSectionLines(lines, (line) => /^final gc packet print order\s*:?\s*$/i.test(line));

  sectionLines.forEach((line) => {
    const parts = line.split(/[–—-]/).map((part) => part.trim()).filter(Boolean);

    if (parts.length < 2) {
      return;
    }

    const order = Number.parseInt(parts[0], 10);
    const status = parts[parts.length - 1];
    const label = parts.slice(1, -1).join(" - ") || parts[1];

    if (!Number.isFinite(order) || !label) {
      return;
    }

    normalized.packet.finalPacketPrintOrder.push({
      order,
      label,
      status,
    });
    capture(normalized, "packetPrintOrder");
  });
}

function finalizeNormalizedSmartPaste(normalized) {
  normalizeChooseOnePricing(normalized.pricing);
  const proposalMode = normalizeProposalMode(normalized.proposalMode || normalized.cover?.proposalMode) || inferProposalModeFromSmartPaste(normalized, normalized.rawText);
  normalized.proposalMode = proposalMode;
  normalized.proposalType = getProposalTypeForMode(proposalMode);
  normalized.packetMode = getPacketModeForProposalMode(proposalMode);
  normalized.cover.proposalMode = proposalMode;
  normalized.pricing.lineItems = dedupeRows(normalized.pricing.lineItems, (row) => row.description);
  normalized.pricing.pricingOptions = dedupeRows(normalized.pricing.pricingOptions, (row) => `${row.name} ${row.price}`);
  normalized.pricing.optionalAddOns = dedupeRows(normalized.pricing.optionalAddOns, (row) => `${row.name} ${row.amount}`);
  normalized.pricing.allowances = dedupeRows(normalized.pricing.allowances, (row) => `${row.label} ${row.description} ${row.amount}`);
  normalized.pricing.alternates = dedupeRows(normalized.pricing.alternates, (row) => `${row.label} ${row.description} ${row.amount}`);
  normalized.scope.exclusions = dedupeList(normalized.scope.exclusions);
  normalized.scope.assumptions = dedupeList(normalized.scope.assumptions);
  normalized.scope.clarifications = dedupeList(normalized.scope.clarifications);
  normalized.warnings = dedupeList(normalized.warnings);
  normalized.cleanupActions = dedupeList(normalized.cleanupActions);

  if (
    normalized.pricing.totalProposal > 0 &&
    normalized.pricing.baseBid > 0 &&
    normalized.pricing.alternates.length === 0 &&
    !isResidentialChooseOnePricingMode(normalized.pricing.pricingMode)
  ) {
    const totalDifference = Math.abs(normalized.pricing.totalProposal - normalized.pricing.baseBid);

    if (totalDifference > 1) {
      normalized.warnings.push("Total proposal does not match parsed base bid. Review pricing before sending.");
    }
  }

  if (isResidentialChooseOnePricingMode(normalized.pricing.pricingMode)) {
    normalized.warnings.push("Residential pricing options detected. Confirm which option the customer accepted before sending.");
  } else if (normalized.pricing.alternates.length > 0 || JSON.stringify(normalized).toLowerCase().includes("optional support")) {
    normalized.warnings.push("Optional or alternate scope detected. Confirm whether it is included before sending.");
  }

  const positiveSignals = [
    normalized.cover.projectName,
    normalized.cover.projectLocation,
    normalized.cover.clientName,
    normalized.pricing.lineItems.length,
    normalized.packet.scheduleOfValues.length,
    normalized.packet.takeoffQuantities.length,
    normalized.packet.rfiRegister.length,
    normalized.packet.planSheets.length,
    normalized.scope.scopeSections.length,
  ].filter(Boolean).length;
  normalized.confidence = Math.min(1, positiveSignals / 8);
}

function getSectionLines(lines, isStartLine) {
  const sectionLines = [];
  let inSection = false;

  for (const line of lines) {
    if (isStartLine(line)) {
      inSection = true;
      continue;
    }

    if (!inSection) {
      continue;
    }

    if (isMajorSectionHeader(line)) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines;
}

function readBlockValue(lines, index, inlineValue = "") {
  if (hasText(inlineValue)) {
    return cleanText(inlineValue);
  }

  const collected = [];

  for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
    const line = cleanText(lines[nextIndex]);

    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    if (parseLabelLine(line) || isMajorSectionHeader(line)) {
      break;
    }

    collected.push(line);
  }

  return collected.join("\n").trim();
}

function getInlineOrNextValue(lines, index, inlineValue = "") {
  return getInlineOrNextValueWithIndex(lines, index, inlineValue).value;
}

function getInlineOrNextValueWithIndex(lines, index, inlineValue = "") {
  if (hasText(inlineValue)) {
    return { value: cleanText(inlineValue), index };
  }

  for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
    const line = cleanText(lines[nextIndex]);

    if (!line) {
      continue;
    }

    if (parseLabelLine(line) || isMajorSectionHeader(line)) {
      return { value: "", index };
    }

    return { value: line, index: nextIndex };
  }

  return { value: "", index };
}

function parseLabelLine(line = "") {
  const match = cleanText(line).match(/^([^:]+):\s*(.*)$/);

  if (!match) {
    return null;
  }

  return {
    label: match[1].trim(),
    value: match[2].trim(),
  };
}

function isMajorSectionHeader(line = "") {
  const text = cleanText(line);
  const labelLine = parseLabelLine(text);
  const normalized = normalizeLabel(labelLine ? labelLine.label : text);

  if (!normalized || isFieldBlockLabel(normalized)) {
    return false;
  }

  if (MAJOR_SECTION_LABELS.has(normalized)) {
    return true;
  }

  return (
    /^pricing line item\s*\d*$/.test(normalized) ||
    /^rfi \/ clarification\s+\d+$/.test(normalized) ||
    /^scope of work - section\s+\d+\s+(title|bullets)$/.test(normalized) ||
    /^concrete specifications - .+/.test(normalized) ||
    /^scope control summary - .+/.test(normalized) ||
    /^legal \/ terms - .+/.test(normalized) ||
    /^plan takeoff sheet - .+/.test(normalized) ||
    /^[a-z]\d{2,}[a-z]? - .+/.test(normalized)
  );
}

function isFieldBlockLabel(label = "") {
  return /^(item|item #|item number|description|quantity|qty|unit|unit price|taxable|amount|pricing basis|detail \/ size|detail|net cy|cy with 10%|cy with 10 percent|cy with waste|price \/ status|price status|status|date asked|date answered|source|question|question \/ clarification needed|answer|answer \/ proposal treatment|price impact|scope impact|rfi \/ clarification number|rfi number|clarification number)$/.test(
    label,
  );
}

function splitSmartPasteLines(notes = "") {
  return String(notes || "")
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function splitList(value = "") {
  const text = cleanText(value);

  if (!text) {
    return [];
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const source = lines.length > 1 ? lines : text.includes(";") ? text.split(";") : lines;

  return source.map((item) => item.replace(/^([-*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
}

function dedupeList(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const text = cleanText(item);
    const fingerprint = text.toLowerCase().replace(/[^a-z0-9$%\s]/g, "").replace(/\s+/g, " ").trim();

    if (!text || !fingerprint || seen.has(fingerprint)) {
      return;
    }

    seen.add(fingerprint);
    result.push(text);
  });

  return result;
}

function dedupeRows(rows = [], getKey) {
  const seen = new Set();
  const result = [];

  rows.forEach((row) => {
    const key = cleanText(getKey(row)).toLowerCase();

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(row);
  });

  return result;
}

function capture(normalized, section) {
  if (!normalized.sectionsCaptured.includes(section)) {
    normalized.sectionsCaptured.push(section);
  }
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeLabel(label = "") {
  return cleanText(label)
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/[:：]\s*$/, "")
    .toLowerCase();
}

function stripLeadingNumber(value = "") {
  return cleanText(value).replace(/^\d+[.)]\s*/, "");
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toNumber(value) {
  const numericValue = Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function sumLineItemAmounts(lineItems = []) {
  return lineItems.reduce((sum, item) => sum + (toNumber(item.amount) || toNumber(item.quantity || 1) * toNumber(item.unitPrice)), 0);
}

function normalizeUnit(value = "") {
  const unit = cleanText(value).toUpperCase();
  return unit || "";
}

function isNoAlternateText(value = "") {
  return /^(none|none currently|none currently accepted|no add alternates?|no alternate(?:s)?|n\/a|not applicable|not included|currently none)$/i.test(cleanText(value));
}

function isBaseBidLabel(label = "") {
  return label === "base bid" || label.startsWith("base bid -") || label.includes("base concrete work") || label.includes("base concrete");
}

function isTotalProposalLabel(label = "") {
  return (
    label.startsWith("total proposal") ||
    label.startsWith("grand total") ||
    label.startsWith("total if") ||
    label.startsWith("total with alternate") ||
    label.startsWith("base with allowances")
  );
}

function isAlternateLabel(label = "") {
  return (
    label.startsWith("alternate") ||
    label.startsWith("add alternate") ||
    label.startsWith("additive alternate") ||
    label.startsWith("deductive alternate") ||
    label.startsWith("optional support") ||
    label.startsWith("optional alternate") ||
    /^alt\s*#?\s*\d+/.test(label)
  );
}

function isAcceptedAlternatesLabel(label = "") {
  return label === "accepted alternates" || label === "alternates";
}

function getBaseBidDescription(rawLabel = "") {
  const text = cleanText(rawLabel);
  const dashMatch = text.match(/^base\s+bid\s*[-–—]\s*(.+)$/i);

  if (dashMatch?.[1]) {
    return dashMatch[1].trim();
  }

  return text.replace(/^base\s+bid\s*[:\-–—]?\s*/i, "").trim() || "Base Bid";
}

function parseLooseBaseBidLine(line = "") {
  const text = cleanText(line);

  if (text.includes("|")) {
    return null;
  }

  const amount = getTrailingAmount(text);

  if (amount <= 0) {
    return null;
  }

  const label = text.replace(/\$?\s*\d[\d,]*(?:\.\d{2})?\s*$/, "").replace(/[:\-–—]\s*$/, "").trim();

  if (!isBaseBidLabel(normalizeLabel(label))) {
    return null;
  }

  return {
    description: getBaseBidDescription(label),
    amount,
  };
}

function parseLooseTotalLine(line = "") {
  const text = cleanText(line);

  if (text.includes("|")) {
    return null;
  }

  const amount = getTrailingAmount(text);

  if (amount <= 0) {
    return null;
  }

  const label = text.replace(/\$?\s*\d[\d,]*(?:\.\d{2})?\s*$/, "").replace(/[:\-–—]\s*$/, "").trim();

  if (!isTotalProposalLabel(normalizeLabel(label))) {
    return null;
  }

  return { label, amount };
}

function getTrailingAmount(value = "") {
  const match = cleanText(value).match(/(\$?\s*\d[\d,]*(?:\.\d{2})?)\s*$/);
  return match ? toNumber(match[1]) : 0;
}

function isTableHeaderLine(line = "") {
  return /^(row|item|description|qty|quantity|unit|unit price|amount|pricing basis|detail \/ size|net cy|cy with 10%|cy with 10 percent|price \/ status|price status)$/i.test(
    cleanText(line),
  );
}

function looksLikeAddress(value = "") {
  return /\b\d{2,6}\s+[a-z0-9 .'-]+(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|court|ct\.?|lane|ln\.?|highway|hwy\.?|place|pl\.?|way|loop|circle|cir\.?)\b/i.test(
    value,
  );
}
