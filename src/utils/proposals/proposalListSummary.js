import { getCustomerShareFields } from "../customerPortal.js";
import {
  BASE_PLUS_ADDONS_PRICING_MODE,
  getResidentialAddOnAmountForOption,
  isResidentialChooseOnePricingMode,
} from "../proposalPacket/residentialPricing.js";
import { inferProposalModeFromProposal, isGcPrimePacketMode, isResidentialProposalMode } from "./proposalModes.js";

export function buildProposalListSummaries(proposals = [], contacts = []) {
  const safeProposals = (Array.isArray(proposals) ? proposals : []).filter(isSummaryObject);
  const contactsById = buildSummaryContactMap(contacts);
  const latestRevisionByProposalNumber = buildLatestRevisionMap(safeProposals);

  return safeProposals.map((proposal, index) => {
    try {
      return createProposalListSummary(proposal, { contactsById, latestRevisionByProposalNumber });
    } catch (error) {
      logProposalSummaryError(error, proposal, index);
      return createFallbackProposalListSummary(proposal, index);
    }
  });
}

export function createProposalListSummary(proposal = {}, { contactsById = new Map(), latestRevisionByProposalNumber = new Map() } = {}) {
  const linkedContact = proposal.contactId ? contactsById.get(proposal.contactId) : null;
  const packetMode = getLightweightPacketModeLabel(proposal);
  const latestPacketRecord = getLatestSummaryPacketRecord(proposal);
  const latestSendRecord = getLatestSummarySendRecord(proposal);
  const revisionNumber = normalizeSummaryRevisionNumber(proposal.revisionNumber);
  const proposalNumber = cleanSummaryText(proposal.proposalNumber);
  const latestRevisionNumber = latestRevisionByProposalNumber.has(proposalNumber)
    ? latestRevisionByProposalNumber.get(proposalNumber)
    : revisionNumber;
  const clientCompanyName = cleanSummaryText(proposal.client?.companyName);
  const clientContactName = cleanSummaryText(proposal.client?.contactName);
  const projectName = cleanSummaryText(proposal.project?.name);
  const linkedContactLabel = linkedContact ? formatSummaryContactName(linkedContact) : "";
  const status = cleanSummaryText(proposal.status) || "draft";
  const followUpDate = cleanSummaryText(proposal.followUpDate);
  const customerShareFields = getCustomerShareFields(proposal);

  return {
    id: cleanSummaryText(proposal.id),
    proposalNumber,
    revisionLabel: cleanSummaryText(proposal.revisionLabel),
    revisionNumber,
    isLatestRevision: !proposalNumber || revisionNumber >= latestRevisionNumber,
    clientCompanyName,
    clientContactName,
    linkedContactLabel,
    projectName,
    proposalMode: cleanSummaryText(proposal.proposalMode),
    proposalType: cleanSummaryText(proposal.proposalType ?? proposal.type),
    packetMode,
    latestPacketRecordCreatedAt: latestPacketRecord?.createdAt || "",
    latestPacketRecordHasPdf: hasSummaryPacketPdfAttachment(latestPacketRecord),
    latestPacketRecordStatus: latestPacketRecord?.status || "",
    latestSendRecordSentDate: latestSendRecord?.sentDate || "",
    sentDate: cleanSummaryText(proposal.sentDate),
    status,
    followUpDate,
    followUpDue: isSummaryFollowUpDue({ status, followUpDate }),
    followUpOverdue: isSummaryFollowUpOverdue({ status, followUpDate }),
    total: getLightweightProposalTotal(proposal),
    updatedAt: cleanSummaryText(proposal.updatedAt || proposal.createdAt || proposal.proposalDate),
    customerShareEnabled: customerShareFields.customerShareEnabled,
    isQaTestRecord: isSummaryQaTestRecord(proposal),
    searchText: [
      clientCompanyName,
      clientContactName,
      projectName,
      cleanSummaryText(proposal.gcPrime?.contractorName),
      linkedContact?.companyName,
      linkedContact?.contactName,
      linkedContact?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

export function getLightweightProposalTotal(proposal = {}) {
  const savedTotal = toSummaryNumber(proposal.revisedTotal ?? proposal.totalAmount ?? proposal.totalProposal);

  if (savedTotal > 0) {
    return savedTotal;
  }

  const pricing = isSummaryObject(proposal.pricing) ? proposal.pricing : {};
  const pricingMode = cleanSummaryText(proposal.pricingMode || pricing.pricingMode);

  if (isResidentialChooseOnePricingMode(pricingMode)) {
    const options = selectSummaryArray(proposal.pricingOptions, pricing.pricingOptions);
    const selectedOption = options.find((option) => option?.selected || option?.included) || options[0] || {};
    const addOns = selectSummaryArray(proposal.optionalAddOns, pricing.optionalAddOns);
    const selectedAddOnsTotal = addOns
      .filter((addOn) => addOn?.selected || addOn?.included)
      .reduce((sum, addOn) => sum + getResidentialAddOnAmountForOption(addOn, selectedOption), 0);

    return toSummaryNumber(selectedOption.price ?? selectedOption.amount ?? selectedOption.total) + selectedAddOnsTotal;
  }

  if (pricingMode === BASE_PLUS_ADDONS_PRICING_MODE) {
    const basePackage = isSummaryObject(pricing.basePackage) ? pricing.basePackage : {};
    const basePackageTotal = toSummaryNumber(basePackage.total ?? basePackage.price ?? pricing.baseBid ?? proposal.baseBid);
    const lineItemTotal = getSummaryLineItemsTotal(selectSummaryArray(proposal.lineItems, pricing.lineItems));
    const addOns = selectSummaryArray(proposal.optionalAddOns, pricing.optionalAddOns);
    const selectedAddOnsTotal = addOns
      .filter((addOn) => addOn?.selected || addOn?.included)
      .reduce((sum, addOn) => sum + toSummaryNumber(addOn.amount ?? addOn.price ?? addOn.total), 0);

    return (basePackageTotal || lineItemTotal) + selectedAddOnsTotal;
  }

  const lineItemTotal = getSummaryLineItemsTotal(proposal.lineItems);
  const includedPricingSectionsTotal = selectSummaryArray(proposal.pricingSections)
    .filter((section) => section?.included)
    .reduce((sum, section) => sum + toSummaryNumber(section.amount ?? section.total ?? section.price), 0);
  const taxRate = toSummaryNumber(proposal.financials?.taxRate);
  const discountAmount = toSummaryNumber(proposal.financials?.discountAmount);
  const subtotal = lineItemTotal + includedPricingSectionsTotal;

  return Math.max(0, subtotal + subtotal * taxRate - discountAmount);
}

export function hasHeavyProposalListFields(summary = {}) {
  return Boolean(
    summary.pricingOptions ||
      summary.optionalAddOns ||
      summary.projectPhotos ||
      summary.planSheets ||
      summary.gcPacketTables ||
      summary.residentialLegalPapers ||
      summary.smartPasteResult ||
      summary.pendingSmartPasteProposal,
  );
}

function buildLatestRevisionMap(proposals = []) {
  return proposals.reduce((latestMap, proposal) => {
    const proposalNumber = cleanSummaryText(safeReadSummaryValue(() => proposal.proposalNumber));

    if (!proposalNumber) {
      return latestMap;
    }

    latestMap.set(
      proposalNumber,
      Math.max(latestMap.get(proposalNumber) ?? -1, normalizeSummaryRevisionNumber(safeReadSummaryValue(() => proposal.revisionNumber))),
    );
    return latestMap;
  }, new Map());
}

function buildSummaryContactMap(contacts = []) {
  const contactsById = new Map();

  (Array.isArray(contacts) ? contacts : []).filter(isSummaryObject).forEach((contact) => {
    try {
      const contactId = cleanSummaryText(contact.id);

      if (contactId) {
        contactsById.set(contactId, contact);
      }
    } catch {
      // A malformed contact should not block the proposal list.
    }
  });

  return contactsById;
}

function createFallbackProposalListSummary(proposal = {}, index = 0) {
  const id = cleanSummaryText(safeReadSummaryValue(() => proposal.id)) || `malformed-proposal-${index + 1}`;
  const proposalNumber = cleanSummaryText(safeReadSummaryValue(() => proposal.proposalNumber)) || "Unavailable proposal";
  const status = cleanSummaryText(safeReadSummaryValue(() => proposal.status)) || "draft";
  const clientCompanyName = cleanSummaryText(safeReadSummaryValue(() => proposal.client?.companyName)) || "Review proposal data";
  const clientContactName = cleanSummaryText(safeReadSummaryValue(() => proposal.client?.contactName));
  const projectName = cleanSummaryText(safeReadSummaryValue(() => proposal.project?.name)) || "Could not read proposal summary";
  const updatedAt =
    cleanSummaryText(
      safeReadSummaryValue(() => proposal.updatedAt || proposal.createdAt || proposal.proposalDate),
    ) || "";

  return {
    id,
    proposalNumber,
    revisionLabel: cleanSummaryText(safeReadSummaryValue(() => proposal.revisionLabel)),
    revisionNumber: normalizeSummaryRevisionNumber(safeReadSummaryValue(() => proposal.revisionNumber)),
    isLatestRevision: true,
    clientCompanyName,
    clientContactName,
    linkedContactLabel: "",
    projectName,
    proposalMode: cleanSummaryText(safeReadSummaryValue(() => proposal.proposalMode)),
    proposalType: cleanSummaryText(safeReadSummaryValue(() => proposal.proposalType ?? proposal.type)),
    packetMode: "Summary",
    latestPacketRecordCreatedAt: "",
    latestPacketRecordHasPdf: false,
    latestPacketRecordStatus: "",
    latestSendRecordSentDate: "",
    sentDate: cleanSummaryText(safeReadSummaryValue(() => proposal.sentDate)),
    status,
    followUpDate: "",
    followUpDue: false,
    followUpOverdue: false,
    total: 0,
    updatedAt,
    customerShareEnabled: false,
    isQaTestRecord: false,
    searchText: [proposalNumber, clientCompanyName, clientContactName, projectName].filter(Boolean).join(" ").toLowerCase(),
  };
}

function getLatestSummaryPacketRecord(proposal = {}) {
  return selectSummaryArray(proposal.submittedPacketRecords)
    .slice()
    .sort((a, b) => getSummaryTimestamp(b.createdAt || b.updatedAt) - getSummaryTimestamp(a.createdAt || a.updatedAt))[0] || null;
}

function getLatestSummarySendRecord(proposal = {}) {
  return selectSummaryArray(proposal.sendRecords)
    .slice()
    .sort((a, b) => getSummaryTimestamp(b.sentDate || b.createdAt) - getSummaryTimestamp(a.sentDate || a.createdAt))[0] || null;
}

function getSummaryLineItemsTotal(lineItems = []) {
  return selectSummaryArray(lineItems).reduce((sum, item) => {
    const explicitAmount = toSummaryNumber(item.amount ?? item.total);
    const quantity = toSummaryNumber(item.quantity ?? item.qty) || 1;
    const unitPrice = toSummaryNumber(item.unitPrice ?? item.rate ?? item.price);

    return sum + (explicitAmount || quantity * unitPrice);
  }, 0);
}

function getLightweightPacketModeLabel(proposal = {}) {
  if (isGcPrimePacketMode(inferProposalModeFromProposal(proposal)) || proposal.packetMode === "full_gc_packet") {
    return "Full GC Packet";
  }

  if (isResidentialProposalMode(inferProposalModeFromProposal(proposal))) {
    return "Summary";
  }

  if (
    selectSummaryArray(proposal.planSheets).some((sheet) => sheet?.enabled && (sheet?.publicUrl || sheet?.storagePath || sheet?.calculationNotes)) ||
    selectSummaryArray(proposal.gcPrime?.rfiRegister).length > 0 ||
    selectSummaryArray(proposal.gcPrime?.addendaRegister).length > 0 ||
    selectSummaryArray(proposal.packetBuilder).some((section) => section?.enabled)
  ) {
    return "Full GC Packet";
  }

  return "Summary";
}

function hasSummaryPacketPdfAttachment(record = {}) {
  const attachment = isSummaryObject(record?.pdfAttachment) ? record.pdfAttachment : {};
  return Boolean(cleanSummaryText(attachment.storagePath || attachment.publicUrl));
}

function isSummaryFollowUpDue(proposal = {}) {
  return proposal.status === "sent" && Boolean(proposal.followUpDate) && getSummaryDateOnlyTimestamp(proposal.followUpDate) <= getTodaySummaryTimestamp();
}

function isSummaryFollowUpOverdue(proposal = {}) {
  return proposal.status === "sent" && Boolean(proposal.followUpDate) && getSummaryDateOnlyTimestamp(proposal.followUpDate) < getTodaySummaryTimestamp();
}

function isSummaryQaTestRecord(proposal = {}) {
  const values = [
    proposal.proposalNumber,
    proposal.project?.name,
    proposal.client?.companyName,
    proposal.client?.contactName,
    proposal.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return values.includes("qa test");
}

function formatSummaryContactName(contact = {}) {
  return cleanSummaryText(contact.companyName || contact.contactName || "Unnamed contact");
}

function selectSummaryArray(primaryRows, fallbackRows = []) {
  if (Array.isArray(primaryRows) && primaryRows.length > 0) {
    return primaryRows;
  }

  if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
    return fallbackRows;
  }

  return Array.isArray(primaryRows) ? primaryRows : Array.isArray(fallbackRows) ? fallbackRows : [];
}

function getTodaySummaryTimestamp() {
  return getSummaryDateOnlyTimestamp(new Date().toISOString().slice(0, 10));
}

function getSummaryDateOnlyTimestamp(value = "") {
  const date = new Date(`${cleanSummaryText(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? Number.POSITIVE_INFINITY : date.valueOf();
}

function getSummaryTimestamp(value = "") {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeSummaryRevisionNumber(value) {
  const revisionNumber = Number.parseInt(value, 10);
  return Number.isFinite(revisionNumber) && revisionNumber >= 0 ? revisionNumber : 0;
}

function toSummaryNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function cleanSummaryText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isSummaryObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeReadSummaryValue(readValue, fallback = "") {
  try {
    return typeof readValue === "function" ? readValue() : readValue;
  } catch {
    return fallback;
  }
}

function logProposalSummaryError(error, proposal = {}, index = 0) {
  if (!import.meta.env?.DEV) {
    return;
  }

  const proposalId = cleanSummaryText(safeReadSummaryValue(() => proposal.id)) || `index ${index}`;
  console.warn("[Last Yard proposals] Could not build proposal list summary.", {
    error: error?.message || String(error),
    proposalId,
  });
}
