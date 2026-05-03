import { LINE_ITEM_UNITS } from "../../proposalData.js";

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
  const proposal = applyParsedNotesToProposal(currentProposal, parsedNotes);
  const lineItemCount = parsedNotes.lineItems.length + (parsedNotes.values.baseBidLineItem ? 1 : 0);

  return {
    proposal,
    parsedNotes,
    summary: {
      fields: parsedNotes.fields,
      lineItemCount,
      pricingSectionCount: parsedNotes.pricingSectionCount || 0,
      planSheetCount: parsedNotes.planSheetCount || 0,
      gcPacketTableCount: parsedNotes.gcPacketTableCount || 0,
      sectionsCaptured: parsedNotes.sectionsCaptured || [],
      warnings: parsedNotes.warnings || [],
    },
  };
}

export { parseProjectNotes, applyParsedNotesToProposal };

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
  setTextValue("contactName", "contactName", "contact name");
  setTextValue("clientPhone", "clientPhone", "client phone");
  setTextValue("clientEmail", "clientEmail", "client email");
  setTextValue("billingAddress", "billingAddress", "billing address");
  setTextValue("projectAddress", "projectAddress", "project address");
  setTextValue("schedule", "schedule", "schedule");
  setTextValue("terms", "terms", "terms");
  setTextValue("paymentTerms", "paymentTerms", "payment terms");
  setTextValue("changeOrderLanguage", "changeOrders", "change orders");
  setTextValue("hiddenConditions", "hiddenConditions", "hidden conditions");
  setTextValue("warrantyLimitation", "warranty", "warranty");
  setTextValue("ownerGcByOthers", "ownerGcByOthers", "Owner / GC by others");
  setTextValue("rfiClarificationNotes", "rfiClarifications", "RFIs / Clarifications");
  setTextValue("addendaAcknowledged", "addendaAcknowledged", "addenda acknowledged");
  setTextValue("proposalNotes", "proposalNotes", "proposal notes");
  setTextValue("gcPrimeNotes", "gcPrimeNotes", "GC / Prime notes");
  setTextValue("concreteSpecNotes", "concreteSpecs", "concrete specs");

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

  const lineItems = parseSmartPasteLineItems(sections.lineItems || [], warnings);
  const pricingParse = parseSmartPastePricingSections(sections.pricingSections || [], warnings);
  const planSheetParse = normalizeSmartPastePlanSheets(sections.planSheets || []);
  const gcPacketTableParse = parseSmartPasteGcPacketTables(sections, warnings);
  const addendaRegister = parseSmartPasteAddendaRegister(notes);
  const rfiRegister = parseSmartPasteRfiRegister(notes);

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

  if (planSheetParse.length > 0) {
    values.planSheets = planSheetParse;
    fields.push("plan sheets / takeoff pages");
  }

  if (gcPacketTableParse.count > 0) {
    values.gcPacketTables = gcPacketTableParse.tables;
    fields.push("structured GC packet tables");
  }

  if ((sections.lineItems || []).length > 0 && lineItems.length === 0) {
    warnings.push("Line items were found, but none matched Description | Quantity | Unit | Unit Price.");
  }

  if (fields.length === 0 && lineItems.length === 0 && hasTextValue(notes)) {
    warnings.push("Use clear labels like Project:, Prepared for:, Scope:, or Line items: for best results.");
  }

  return {
    fields: [...new Set(fields)],
    lineItems,
    pricingSectionCount: pricingParse.sections.length,
    planSheetCount: planSheetParse.length,
    gcPacketTableCount: gcPacketTableParse.count,
    sectionsCaptured: getCapturedSmartPasteLabels(sections),
    values,
    warnings: [...new Set(warnings)],
  };
}

function applyParsedNotesToProposal(proposal, parsedNotes) {
  const nextProposal = cloneObject(proposal);
  const values = parsedNotes.values;

  if (values.projectName) {
    nextProposal.project.name = values.projectName;
  }

  if (values.projectLocation) {
    nextProposal.project.location = values.projectLocation;
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

  if (values.schedule) {
    nextProposal.project.estimatedDuration = values.schedule;
    nextProposal.project.proposedSchedule = {
      ...(nextProposal.project.proposedSchedule || {}),
      display: values.schedule,
    };
  }

  if (values.proposalType) {
    nextProposal.proposalType = values.proposalType;
    nextProposal.type = values.proposalType;
  }

  if (values.scopeItems) {
    nextProposal.scopeSections = [
      {
        title: "Scope of Work",
        items: values.scopeItems,
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

  if (values.ownerGcByOthers) {
    nextProposal.gcPrime.scopeControlSummary = {
      ...normalizeScopeControlSummary(nextProposal.gcPrime.scopeControlSummary),
      ownerGcByOthers: values.ownerGcByOthers,
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
    nextProposal.gcPrime.gcPrimeNotes = values.gcPrimeNotes;
  }

  if (values.concreteSpecNotes) {
    nextProposal.concreteSpecs.notes = values.concreteSpecNotes;
  }

  if (parsedNotes.lineItems.length > 0) {
    nextProposal.lineItems = parsedNotes.lineItems;
  } else if (values.baseBidLineItem) {
    nextProposal.lineItems = [values.baseBidLineItem];
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

  return nextProposal;
}

function collectSmartPasteSections(notes) {
  const sections = {};
  const lines = String(notes || "").split(/\r?\n/);
  let activeKey = "";
  let activePlanSheetIndex = -1;
  let activePlanSheetField = "calculationNotes";
  const multiLineKeys = new Set([
    "scope",
    "exclusions",
    "assumptions",
    "terms",
    "paymentTerms",
    "changeOrders",
    "hiddenConditions",
    "warranty",
    "ownerGcByOthers",
    "lineItems",
    "rfiClarifications",
    "rfiRegister",
    "addendaAcknowledged",
    "addendaRegister",
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
    "rfiClarifications",
    "addendaAcknowledged",
    "paymentTerms",
    "changeOrders",
    "hiddenConditions",
    "warranty",
    "ownerGcByOthers",
    "proposalNotes",
    "gcPrimeNotes",
    "concreteSpecs",
  ]);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
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
        appendSmartPasteSection(sections, key, labelMatch[2]);
        return;
      }
    }

    if (textCaptureKeys.has(activeKey)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (activeKey !== "pricingSummary" && isSmartPricingLine(line)) {
      activeKey = "pricingSections";
      activePlanSheetIndex = -1;
      recordSmartPasteSection(sections, "pricingSections");
      appendSmartPasteSection(sections, "pricingSections", line);
      return;
    }

    if (labelMatch) {
      const key = getSmartPasteLabelKey(labelMatch[1]);

      if (key) {
        activeKey = key;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, key);
        appendSmartPasteSection(sections, key, labelMatch[2]);
        return;
      }
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
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, " ");
  const labels = {
    "addenda acknowledged": "addendaAcknowledged",
    "addendum acknowledged": "addendaAcknowledged",
    "addendum date": "addendaRegister",
    address: "billingAddress",
    "acceptance summary": "acceptanceSummary",
    allowances: "pricingSections",
    alternates: "pricingSections",
    assumptions: "assumptions",
    "change order": "changeOrders",
    "change orders": "changeOrders",
    client: "clientCompany",
    "concrete specs": "concreteSpecs",
    contact: "contactName",
    "contract scope control": "contractScopeControl",
    email: "clientEmail",
    exclusions: "exclusions",
    "gc / prime notes": "gcPrimeNotes",
    "gc / prime reviewer": "gcPrimeReviewer",
    "gc prime notes": "gcPrimeNotes",
    "gc prime reviewer": "gcPrimeReviewer",
    "hidden condition": "hiddenConditions",
    "hidden conditions": "hiddenConditions",
    "line items": "lineItems",
    "line item": "lineItems",
    location: "projectLocation",
    "owner / gc by others": "ownerGcByOthers",
    "owner gc by others": "ownerGcByOthers",
    "payment terms": "paymentTerms",
    phone: "clientPhone",
    "prepared for": "clientCompany",
    "pricing summary": "pricingSummary",
    project: "projectName",
    "project address": "projectAddress",
    "project location": "projectLocation",
    "project name": "projectName",
    "proposal notes / acceptance summary": "proposalNotes",
    "proposal notes": "proposalNotes",
    "proposal basis": "proposalBasis",
    "proposal type": "proposalType",
    "rfi / clarification": "rfiClarifications",
    rfi: "rfiRegister",
    clarification: "rfiRegister",
    "rfis / clarifications": "rfiClarifications",
    schedule: "schedule",
    "schedule of values": "scheduleOfValues",
    scope: "scope",
    "shade footing estimate": "shadeFootingEstimate",
    "takeoff quantities": "takeoffQuantities",
    terms: "terms",
    "total if all accepted": "pricingSections",
    "total if all alternates accepted": "pricingSections",
    warranty: "warranty",
  };

  if (/^addendum\s+[a-z0-9.-]+$/i.test(normalizedLabel)) {
    return "addendaRegister";
  }

  if (/^(rfi|clarification)\s+[a-z0-9.-]+$/i.test(normalizedLabel)) {
    return "rfiRegister";
  }

  return labels[normalizedLabel] || "";
}

function isSmartPasteSectionHeading(label, key) {
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, " ");
  const sectionHeadingLabels = new Set([
    "addenda acknowledged",
    "addendum acknowledged",
    "addendum date",
    "acceptance summary",
    "allowances",
    "alternates",
    "assumptions",
    "change order",
    "change orders",
    "concrete specs",
    "exclusions",
    "gc / prime notes",
    "gc prime notes",
    "hidden condition",
    "hidden conditions",
    "line item",
    "line items",
    "owner / gc by others",
    "owner gc by others",
    "payment terms",
    "pricing summary",
    "proposal notes / acceptance summary",
    "proposal notes",
    "proposal basis",
    "contract scope control",
    "gc / prime reviewer",
    "gc prime reviewer",
    "rfi / clarification",
    "rfi",
    "clarification",
    "rfis / clarifications",
    "schedule of values",
    "scope",
    "shade footing estimate",
    "takeoff quantities",
    "terms",
    "warranty",
  ]);

  return sectionHeadingLabels.has(normalizedLabel) || /^addendum\s+[a-z0-9.-]+$/i.test(normalizedLabel) || key === "lineItems";
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
    billingAddress: "Billing Address",
    changeOrders: "Change Orders",
    clientCompany: "Client",
    clientEmail: "Client Email",
    clientPhone: "Client Phone",
    concreteSpecs: "Concrete Specs",
    contactName: "Contact",
    contractScopeControl: "Contract Scope Control",
    exclusions: "Exclusions",
    gcPrimeNotes: "GC / Prime Notes",
    gcPrimeReviewer: "GC / Prime Reviewer",
    hiddenConditions: "Hidden Conditions",
    lineItems: "Line Items",
    ownerGcByOthers: "Owner / GC By Others",
    paymentTerms: "Payment Terms",
    planSheets: "Plan Sheets / Takeoff Pages",
    pricingSummary: "Pricing Summary",
    pricingSections: "Alternates / Allowances",
    projectAddress: "Project Address",
    projectLocation: "Project Location",
    projectName: "Project",
    proposalBasis: "Proposal Basis",
    proposalNotes: "Proposal Notes",
    proposalType: "Proposal Type",
    rfiClarifications: "RFIs / Clarifications",
    rfiRegister: "Structured RFI / Clarification Register",
    schedule: "Schedule",
    scheduleOfValues: "Schedule of Values",
    scope: "Scope",
    shadeFootingEstimate: "Shade Footing Estimate",
    takeoffQuantities: "Takeoff Quantities",
    terms: "Terms",
    warranty: "Warranty",
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

  lines.forEach((line) => {
    const metadata = getSmartPasteStructuredMetadata(sectionKey, line);

    if (metadata.isMetadata) {
      if (hasTextValue(metadata.note)) {
        sectionNotes.push(metadata.note);
      }
      return;
    }

    const parts = String(line || "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < fields.length) {
      if (hasTextValue(line)) {
        warnings.push(`Skipped ${gcPacketTableLabels[sectionKey]} row "${line}" because it did not include ${fields.length} pipe-separated values.`);
      }

      return;
    }

    rows.push(
      fields.reduce(
        (row, [field], index) => ({
          ...row,
          [field]: parts[index] || "",
        }),
        { id: createProposalId() },
      ),
    );
  });

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
      const rfiMatch = line.match(/^(rfi|clarification)\s*([a-z0-9.-]+)?\s*:\s*(.*)$/i);

      if (rfiMatch) {
        currentRow = {
          ...createEmptyRfiRecord(),
          rfiNumber: rfiMatch[2] ? `${rfiMatch[1].toUpperCase()} ${rfiMatch[2]}` : rfiMatch[1].toUpperCase(),
          question: rfiMatch[3].trim(),
          includedInPacket: true,
        };
        rows.push(currentRow);
        return;
      }

      if (isRegisterBoundaryLine(line, "rfi")) {
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

      if (label === "date asked") {
        currentRow.dateAsked = value;
      } else if (label === "date answered") {
        currentRow.dateAnswered = value;
      } else if (label === "source") {
        currentRow.source = value;
      } else if (label === "question" || label === "clarification needed") {
        currentRow.question = value;
      } else if (label === "answer" || label === "proposal treatment") {
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
    "date asked",
    "date answered",
    "source",
    "question",
    "clarification needed",
    "answer",
    "proposal treatment",
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
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((item) => item.replace(/^[-*â€¢]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
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
    totalIfAllAccepted: undefined,
  };

  lines.forEach((line) => {
    const parsed = parseSmartPastePricingLine(line, warnings);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "base_bid") {
      result.baseBidLineItem = {
        itemNumber: "1",
        description: parsed.label || "Base Bid",
        quantity: 1,
        unit: "LS",
        unitPrice: parsed.amount,
        taxable: true,
      };
      return;
    }

    if (parsed.kind === "total_if_all") {
      result.totalIfAllAccepted = parsed.amount;
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
  });

  return result;
}

function parseSmartPastePricingLine(line, warnings) {
  const match = String(line).match(
    /^(base bid|allowance|add alternate(?:\s+\d+|\s+[a-z]+)?|deduct alternate(?:\s+\d+|\s+[a-z]+)?|unit price(?:\s+\d+|\s+[a-z]+)?|total if all(?: alternates)? accepted)\s*:\s*(.+)$/i,
  );

  if (!match) {
    return null;
  }

  const rawLabel = match[1].trim();
  const rawValue = match[2].trim();
  const normalizedLabel = rawLabel.toLowerCase();
  const amountParts = rawValue.split("|").map((part) => part.trim()).filter(Boolean);
  const amount = toEditableNumber(amountParts[amountParts.length - 1]);

  if (amount <= 0) {
    warnings.push(`Skipped pricing section "${line}" because the amount could not be parsed.`);
    return null;
  }

  if (normalizedLabel.startsWith("total if all")) {
    return { kind: "total_if_all", amount };
  }

  if (normalizedLabel === "base bid") {
    return {
      kind: "base_bid",
      label: amountParts.length > 1 ? amountParts[0] : "Base Bid",
      description: "",
      amount,
    };
  }

  const type = getSmartPricingType(normalizedLabel);
  const numberedLabel = rawLabel.replace(/\s+/g, " ");
  const valueLabel = amountParts.length > 1 ? amountParts.slice(0, -1).join(" | ") : numberedLabel;
  const hasNumberedPrefix = /\d|[a-z]$/i.test(numberedLabel.replace(/^(add|deduct) alternate\s*/i, ""));

  return {
    kind: type,
    label: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? numberedLabel : valueLabel,
    description: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? valueLabel : "",
    amount,
  };
}

function isSmartPricingLine(line) {
  return /^(base bid|allowance|add alternate(?:\s+\d+|\s+[a-z]+)?|deduct alternate(?:\s+\d+|\s+[a-z]+)?|unit price(?:\s+\d+|\s+[a-z]+)?|total if all(?: alternates)? accepted)\s*:/i.test(
    String(line).trim(),
  );
}

function getSmartPricingType(label) {
  if (label.startsWith("allowance")) {
    return "allowance";
  }

  if (label.startsWith("deduct alternate")) {
    return "deduct_alternate";
  }

  if (label.startsWith("unit price")) {
    return "unit_price";
  }

  return "add_alternate";
}

function parseSmartPasteLineItem(line, warnings) {
  const parts = String(line)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    if (hasTextValue(line)) {
      warnings.push(`Skipped line item "${line}" because it does not use Description | Quantity | Unit | Unit Price.`);
    }

    return null;
  }

  const lineParts = parts.length >= 5 && /^\d+$/.test(parts[0]) ? parts.slice(1) : parts;
  const [description, quantityText, unitText, unitPriceText] = lineParts;
  const quantity = toEditableNumber(quantityText);
  const unitPrice = toEditableNumber(unitPriceText);
  const unit = String(unitText || "").trim().toUpperCase();

  if (!hasTextValue(description) || quantity <= 0 || !LINE_ITEM_UNITS.includes(unit) || unitPrice < 0) {
    warnings.push(`Skipped line item "${line}" because quantity, unit, or unit price could not be parsed.`);
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

