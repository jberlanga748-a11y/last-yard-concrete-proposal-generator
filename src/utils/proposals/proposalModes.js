export const PROPOSAL_MODE_RESIDENTIAL = "residential";
export const PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR = "commercial_subcontractor";
export const PROPOSAL_MODE_GC_PRIME_PACKET = "gc_prime_packet";

export const PROPOSAL_MODES = [
  PROPOSAL_MODE_RESIDENTIAL,
  PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR,
  PROPOSAL_MODE_GC_PRIME_PACKET,
];

export const DEFAULT_PROPOSAL_MODE = PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR;

export const PROPOSAL_MODE_LABELS = {
  [PROPOSAL_MODE_RESIDENTIAL]: "Residential",
  [PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR]: "Commercial Subcontractor",
  [PROPOSAL_MODE_GC_PRIME_PACKET]: "GC / Prime Packet",
};

export const BLANK_PROPOSAL_MODE_OPTIONS = [
  {
    mode: PROPOSAL_MODE_RESIDENTIAL,
    label: "Residential Customer Proposal",
    shortLabel: "Residential Blank",
    path: "/proposals/new/blank/residential",
    description: "Customer-friendly pricing options, homeowner scope, payment terms, and acceptance.",
  },
  {
    mode: PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR,
    label: "Commercial Subcontractor Proposal",
    shortLabel: "Commercial Blank",
    path: "/proposals/new/blank/commercial",
    description: "GC-facing base bid, alternates, inclusions, exclusions, clarifications, and addenda.",
  },
  {
    mode: PROPOSAL_MODE_GC_PRIME_PACKET,
    label: "Full GC / Prime Packet",
    shortLabel: "GC Packet Blank",
    path: "/proposals/new/blank/gc-prime",
    description: "Full packet builder with SOV, takeoff tables, RFIs, addenda, legal terms, and plan pages.",
  },
];

const modeAliases = new Map([
  ["residential", PROPOSAL_MODE_RESIDENTIAL],
  ["homeowner", PROPOSAL_MODE_RESIDENTIAL],
  ["customer", PROPOSAL_MODE_RESIDENTIAL],
  ["customer_proposal", PROPOSAL_MODE_RESIDENTIAL],
  ["residential_customer", PROPOSAL_MODE_RESIDENTIAL],
  ["residential_customer_proposal", PROPOSAL_MODE_RESIDENTIAL],
  ["commercial", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["commercial_sub", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["commercial_subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["commercial_subcontractor_proposal", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["sub", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["concrete_subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["gc_subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["gc", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["gc_prime", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["gc_prime_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["gc_prime_full_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["prime", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["prime_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["full_gc", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["full_gc_prime_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["full_gc_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["full_packet", PROPOSAL_MODE_GC_PRIME_PACKET],
]);

const blankSlugToMode = new Map([
  ["residential", PROPOSAL_MODE_RESIDENTIAL],
  ["homeowner", PROPOSAL_MODE_RESIDENTIAL],
  ["commercial", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["commercial-subcontractor", PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR],
  ["gc", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["gc-prime", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["prime", PROPOSAL_MODE_GC_PRIME_PACKET],
  ["full-packet", PROPOSAL_MODE_GC_PRIME_PACKET],
]);

export function normalizeProposalMode(value) {
  const key = normalizeModeKey(value);

  if (!key) {
    return "";
  }

  return modeAliases.get(key) || "";
}

export function getProposalModeLabel(mode) {
  return PROPOSAL_MODE_LABELS[normalizeProposalMode(mode) || DEFAULT_PROPOSAL_MODE];
}

export function getProposalTypeForMode(mode) {
  const normalizedMode = normalizeProposalMode(mode) || DEFAULT_PROPOSAL_MODE;

  if (normalizedMode === PROPOSAL_MODE_RESIDENTIAL) {
    return "residential";
  }

  if (normalizedMode === PROPOSAL_MODE_GC_PRIME_PACKET) {
    return "gc_prime";
  }

  return "commercial";
}

export function getPacketModeForProposalMode(mode) {
  return normalizeProposalMode(mode) === PROPOSAL_MODE_GC_PRIME_PACKET ? "full_gc_packet" : "summary";
}

export function isResidentialProposalMode(mode) {
  return normalizeProposalMode(mode) === PROPOSAL_MODE_RESIDENTIAL;
}

export function isCommercialSubcontractorMode(mode) {
  return normalizeProposalMode(mode) === PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR;
}

export function isGcPrimePacketMode(mode) {
  return normalizeProposalMode(mode) === PROPOSAL_MODE_GC_PRIME_PACKET;
}

export function getBlankProposalModePath(mode) {
  const normalizedMode = normalizeProposalMode(mode) || DEFAULT_PROPOSAL_MODE;
  return BLANK_PROPOSAL_MODE_OPTIONS.find((option) => option.mode === normalizedMode)?.path || "/proposals/new/blank";
}

export function getProposalModeFromBlankSlug(slug) {
  return blankSlugToMode.get(normalizeSlug(slug)) || DEFAULT_PROPOSAL_MODE;
}

export function getBlankProposalModeOptions() {
  return BLANK_PROPOSAL_MODE_OPTIONS.map((option) => ({ ...option }));
}

export function inferProposalModeFromProposal(proposal = {}) {
  const explicitMode = normalizeProposalMode(proposal.proposalMode);

  if (explicitMode) {
    return explicitMode;
  }

  const projectMode = normalizeProposalMode(proposal.project?.proposalMode);

  if (projectMode) {
    return projectMode;
  }

  if (looksClearlyResidential(proposal)) {
    return PROPOSAL_MODE_RESIDENTIAL;
  }

  if (hasFullPacketProposalData(proposal)) {
    return PROPOSAL_MODE_GC_PRIME_PACKET;
  }

  return PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR;
}

export function hasFullPacketProposalData(proposal = {}) {
  if (proposal.packetMode === "full_gc_packet" || proposal.proposalType === "gc_prime" || proposal.type === "gc_prime") {
    return true;
  }

  if (hasPlanSheetData(proposal.planSheets)) {
    return true;
  }

  if (hasGcPrimePacketData(proposal.gcPrime)) {
    return true;
  }

  return hasGcPacketTableData(proposal.gcPacketTables);
}

export function inferProposalModeFromSmartPaste(normalized = {}, rawNotes = "") {
  const explicitMode = normalizeProposalMode(normalized.proposalMode || normalized.cover?.proposalMode || normalized.project?.proposalMode);

  if (explicitMode) {
    return explicitMode;
  }

  const text = normalizeSearchText(rawNotes || JSON.stringify(normalized || {}));

  if (looksLikeResidentialSmartPaste(normalized, text)) {
    return PROPOSAL_MODE_RESIDENTIAL;
  }

  if (looksLikeFullPacketSmartPaste(normalized, text)) {
    return PROPOSAL_MODE_GC_PRIME_PACKET;
  }

  if (/(subcontractor|sub contractor|bid to gc|bidding to gc|gc \/ prime|prime contractor|public works|addenda|clarification|rfi|schedule of values|scope control)/i.test(text)) {
    return PROPOSAL_MODE_COMMERCIAL_SUBCONTRACTOR;
  }

  return DEFAULT_PROPOSAL_MODE;
}

function looksClearlyResidential(proposal = {}) {
  if (proposal.proposalType === "residential" || proposal.type === "residential") {
    return true;
  }

  if ((proposal.pricingMode || proposal.pricing?.pricingMode) === "choose_one_option" && hasArrayItems(proposal.pricingOptions || proposal.pricing?.pricingOptions)) {
    return true;
  }

  return /residential|homeowner|driveway|patio|walkway|steps?/i.test(
    [
      proposal.templateId,
      proposal.templateName,
      proposal.project?.category,
      proposal.project?.description,
      proposal.project?.name,
    ].filter(Boolean).join(" "),
  );
}

function looksLikeResidentialSmartPaste(normalized = {}, normalizedText = "") {
  if ((normalized.pricing?.pricingMode || "") === "choose_one_option" || hasArrayItems(normalized.pricing?.pricingOptions)) {
    return true;
  }

  return /(residential|homeowner|customer chooses one|choose one option|pricing options|option 1|option 2|option 3|driveway|patio|walkway|residential steps|finish options?)/i.test(
    normalizedText,
  );
}

function looksLikeFullPacketSmartPaste(normalized = {}, normalizedText = "") {
  const packet = normalized.packet || {};
  const packetSignals = [
    hasArrayItems(packet.scheduleOfValues),
    hasArrayItems(packet.takeoffQuantities),
    hasArrayItems(packet.planSheets),
    hasArrayItems(packet.rfiRegister),
    hasArrayItems(packet.addendaAcknowledgement),
    hasObjectText(packet.scopeControlSummary),
    hasObjectText(packet.legalTerms),
    hasArrayItems(packet.finalPacketPrintOrder),
  ].filter(Boolean).length;

  if (packetSignals >= 2) {
    return true;
  }

  return /(full gc packet|gc prime packet|final gc packet print order|takeoff quantities|plan sheets|rfi \/ clarification register|scope control summary|structured addenda|legal \/ terms)/i.test(
    normalizedText,
  );
}

function hasPlanSheetData(planSheets) {
  return Array.isArray(planSheets) && planSheets.some((sheet) =>
    Boolean(
      sheet?.imageSrc ||
        sheet?.imageUrl ||
        sheet?.storagePath ||
        sheet?.publicUrl ||
        hasText(sheet?.calculationTitle) ||
        hasArrayItems(sheet?.calculationNotes) ||
        hasArrayItems(sheet?.clarificationNotes),
    ),
  );
}

function hasGcPrimePacketData(gcPrime = {}) {
  if (!gcPrime || typeof gcPrime !== "object") {
    return false;
  }

  return (
    hasArrayItems(gcPrime.addendaRegister) ||
    hasArrayItems(gcPrime.rfiRegister) ||
    hasText(gcPrime.addendaAcknowledged) ||
    hasText(gcPrime.rfiClarificationNotes) ||
    hasObjectText(gcPrime.scopeControlSummary)
  );
}

function hasGcPacketTableData(gcPacketTables = {}) {
  if (!gcPacketTables || typeof gcPacketTables !== "object") {
    return false;
  }

  return Object.values(gcPacketTables).some((table) => {
    if (!table || typeof table !== "object") {
      return false;
    }

    if (table.enabled && hasObjectText(table)) {
      return true;
    }

    return Array.isArray(table.rows) && table.rows.some(hasObjectText);
  });
}

function hasObjectText(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasObjectText);
  }

  return Object.entries(value).some(([key, item]) => {
    if (key === "id" || key === "order" || key === "enabled" || key === "included" || key === "defaultIncluded") {
      return false;
    }

    if (typeof item === "boolean") {
      return item === true;
    }

    if (typeof item === "object") {
      return hasObjectText(item);
    }

    return hasText(item);
  });
}

function hasArrayItems(value) {
  return Array.isArray(value) && value.some((item) => (typeof item === "object" ? hasObjectText(item) : hasText(item)));
}

function normalizeModeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
