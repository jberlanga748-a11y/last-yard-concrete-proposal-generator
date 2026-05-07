import {
  cleanPrintablePricingSections,
  cleanPrintablePricingSummaryRows,
  cleanPrintableScopeSections,
  cleanPrintableStructuredRows,
  cleanPrintableTextBlock,
  cleanPrintableTextList,
  hasPrintableText,
  isPlaceholderPrintText,
  normalizePrintableFingerprint,
} from "../proposalPacket/printContentCleanup.js";

const starterProjectNames = new Set(["marketplace retail center"]);
const starterProjectLocations = new Set(["albany or"]);
const starterClientNames = new Set(["company name"]);
const starterLineItemDescriptions = new Set([
  "site prep and excavation",
  "sidewalks 4 in thick",
  "curb and gutter",
  "concrete pads slabs 5 in thick",
  "control joints and sealant",
  "mobilization",
]);

export function cleanTrueBlankProposalState(proposal = {}) {
  return {
    ...cloneObject(proposal),
    bidId: "",
    contactId: "",
    linkedBidId: "",
    sourceBidId: "",
    templateId: "blank",
    templateName: "Blank Proposal",
    status: "draft",
    revisionNumber: 0,
    revisionLabel: "Rev 0",
    revisionNotes: "",
    parentProposalId: "",
    previousTotal: "",
    revisedTotal: 0,
    sentDate: "",
    sentToName: "",
    sentToEmail: "",
    sentToPhone: "",
    sentMethod: "",
    followUpDate: "",
    followUpNotes: "",
    lastFollowUpDate: "",
    nextAction: "",
    outcomeReason: "",
    approvedDate: "",
    rejectedDate: "",
    viewedDate: "",
    decisionDueDate: "",
    internalTrackingNotes: "",
    client: createBlankClient(),
    project: createBlankProject(),
    scopeSections: [],
    concreteSpecs: createBlankConcreteSpecs(),
    lineItems: [],
    pricingSections: [],
    exclusions: [],
    assumptions: [],
    projectPhotos: [],
    planSheets: [],
    packetBuilder: [],
    gcPrime: createBlankGcPrime(),
    gcPacketTables: createBlankGcPacketTables(),
    submittedPacketRecords: [],
    sendRecords: [],
    proposalNotes: "",
    notes: "",
    takeoffQuantityBackup: "",
    quantityBackup: "",
  };
}

export function cleanSmartPasteBaseProposal(proposal = {}, { replaceStarterContent = false } = {}) {
  const sourceProposal = cloneObject(proposal);

  if (replaceStarterContent || isStarterOrBlankProposalState(sourceProposal)) {
    return cleanTrueBlankProposalState(sourceProposal);
  }

  return cleanProposalDraftPlaceholders(sourceProposal);
}

export function cleanProposalDraftPlaceholders(proposal = {}) {
  const nextProposal = cloneObject(proposal);

  nextProposal.client = cleanDraftClient(nextProposal.client);
  nextProposal.project = cleanDraftProject(nextProposal.project);
  nextProposal.scopeSections = cleanPrintableScopeSections(nextProposal.scopeSections);
  nextProposal.exclusions = cleanPrintableTextList(nextProposal.exclusions);
  nextProposal.assumptions = cleanPrintableTextList(nextProposal.assumptions);
  nextProposal.lineItems = cleanDraftLineItems(nextProposal.lineItems);
  nextProposal.pricingSections = cleanPrintablePricingSections(nextProposal.pricingSections);
  nextProposal.projectPhotos = cleanDraftProjectPhotos(nextProposal.projectPhotos);
  nextProposal.planSheets = cleanDraftPlanSheets(nextProposal.planSheets);
  nextProposal.proposalNotes = cleanPrintableTextBlock(nextProposal.proposalNotes);
  nextProposal.notes = cleanPrintableTextBlock(nextProposal.notes);
  nextProposal.takeoffQuantityBackup = cleanPrintableTextBlock(nextProposal.takeoffQuantityBackup);
  nextProposal.quantityBackup = cleanPrintableTextBlock(nextProposal.quantityBackup);
  nextProposal.gcPrime = cleanDraftGcPrime(nextProposal.gcPrime);
  nextProposal.gcPacketTables = cleanDraftGcPacketTables(nextProposal.gcPacketTables);

  return nextProposal;
}

export function isStarterOrBlankProposalState(proposal = {}) {
  const projectName = normalizePrintableFingerprint(proposal.project?.name);
  const projectLocation = normalizePrintableFingerprint(proposal.project?.location || proposal.project?.address);
  const clientName = normalizePrintableFingerprint(proposal.client?.companyName);
  const hasStarterLineItems = Array.isArray(proposal.lineItems) && proposal.lineItems.some((item) =>
    starterLineItemDescriptions.has(normalizePrintableFingerprint(item?.description)),
  );
  const hasPlaceholderRows = hasPlaceholderCollection(proposal.scopeSections) || hasPlaceholderCollection(proposal.planSheets);
  const hasRealProjectAndClient =
    projectName &&
    clientName &&
    !starterProjectNames.has(projectName) &&
    !starterProjectLocations.has(projectLocation) &&
    !starterClientNames.has(clientName);

  return (
    proposal.templateId === "blank" ||
    !projectName ||
    starterProjectNames.has(projectName) ||
    starterProjectLocations.has(projectLocation) ||
    !clientName ||
    starterClientNames.has(clientName) ||
    hasStarterLineItems ||
    (!hasRealProjectAndClient && hasPlaceholderRows)
  );
}

export function getSmartPasteFieldChangeSummary(currentProposal = {}, nextProposal = {}) {
  return [
    ["Project Name", currentProposal.project?.name, nextProposal.project?.name],
    ["Project Location", currentProposal.project?.location || currentProposal.project?.address, nextProposal.project?.location || nextProposal.project?.address],
    ["Prepared For", currentProposal.client?.companyName, nextProposal.client?.companyName],
    ["Attention / Contact", currentProposal.client?.contactName, nextProposal.client?.contactName],
    ["Email", currentProposal.client?.email, nextProposal.client?.email],
    ["Phone", currentProposal.client?.phone, nextProposal.client?.phone],
  ]
    .filter(([, currentValue, nextValue]) => {
      const hasCurrentRealValue = hasPrintableText(currentValue);
      const hasNextValue = hasPrintableText(nextValue);

      return hasCurrentRealValue && hasNextValue && String(currentValue).trim() !== String(nextValue).trim();
    })
    .map(([label, currentValue, nextValue]) => `${label}: "${String(currentValue).trim()}" -> "${String(nextValue).trim()}"`);
}

function createBlankClient() {
  return {
    companyName: "",
    contactName: "",
    title: "",
    address: "",
    billingAddress: "",
    cityStateZip: "",
    phone: "",
    email: "",
    projectAddress: "",
  };
}

function createBlankProject() {
  return {
    name: "",
    location: "",
    address: "",
    owner: "",
    category: "",
    description: "",
    estimatedStartDate: "",
    estimatedDuration: "",
    accessNotes: "",
    siteConditionNotes: "",
    scheduleRestrictions: "",
    specialRequirements: "",
    proposedSchedule: {
      startDate: "",
      endDate: "",
      display: "",
    },
  };
}

function createBlankConcreteSpecs() {
  return {
    estimatedSquareFeet: "",
    estimatedCubicYards: "",
    thickness: "",
    psi: "",
    slump: "",
    airEntrainment: "",
    fiberMesh: false,
    rebarMeshDetails: "",
    finishType: "",
    controlJointSpacing: "",
    sawCutTiming: "",
    cureSealerNotes: "",
    concreteSupplier: "",
    pumpRequired: false,
    truckAccessNotes: "",
    notes: "",
  };
}

function createBlankGcPrime() {
  return {
    contractorName: "",
    projectManagerName: "",
    projectManagerPhone: "",
    projectManagerEmail: "",
    bidPackageNumber: "",
    specSection: "",
    drawingReferences: "",
    addendaAcknowledged: "",
    prevailingWageRequired: false,
    certifiedPayrollRequired: false,
    insuranceCertificateRequired: false,
    w9Required: false,
    safetyOrientationRequired: false,
    jobsiteAccessBadgingRequirements: "",
    retainagePercentage: "",
    paymentApplicationTerms: "",
    changeOrderProcess: "",
    rfiClarificationNotes: "",
    rfiNotes: "",
    gcPrimeNotes: "",
    ownerAgency: "",
    addendaRegister: [],
    rfiRegister: [],
    scopeControlSummary: {
      includedScope: "",
      exclusions: "",
      clarifications: "",
      acceptedAlternates: "",
      allowances: "",
      ownerGcByOthers: "",
      hiddenUnshownConditionsNote: "",
    },
  };
}

function createBlankGcPacketTables() {
  return {
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
}

function cleanDraftClient(client = {}) {
  return {
    ...(client || {}),
    companyName: cleanDraftText(client.companyName),
    contactName: cleanDraftText(client.contactName),
    title: cleanDraftText(client.title),
    address: cleanDraftText(client.address),
    billingAddress: cleanDraftText(client.billingAddress),
    cityStateZip: cleanDraftText(client.cityStateZip),
    phone: cleanDraftText(client.phone),
    email: cleanDraftText(client.email),
    projectAddress: cleanDraftText(client.projectAddress),
  };
}

function cleanDraftProject(project = {}) {
  return {
    ...(project || {}),
    name: cleanDraftText(project.name),
    location: cleanDraftText(project.location),
    address: cleanDraftText(project.address),
    owner: cleanDraftText(project.owner),
    category: cleanDraftText(project.category),
    description: cleanPrintableTextBlock(project.description),
    estimatedDuration: cleanPrintableTextBlock(project.estimatedDuration),
    accessNotes: cleanPrintableTextBlock(project.accessNotes),
    siteConditionNotes: cleanPrintableTextBlock(project.siteConditionNotes),
    scheduleRestrictions: cleanPrintableTextBlock(project.scheduleRestrictions),
    specialRequirements: cleanPrintableTextBlock(project.specialRequirements),
    proposedSchedule: {
      ...(project.proposedSchedule || {}),
      display: cleanPrintableTextBlock(project.proposedSchedule?.display),
    },
  };
}

function cleanDraftGcPrime(gcPrime = {}) {
  return {
    ...createBlankGcPrime(),
    ...(gcPrime || {}),
    contractorName: cleanDraftText(gcPrime.contractorName),
    projectManagerName: cleanDraftText(gcPrime.projectManagerName),
    projectManagerPhone: cleanDraftText(gcPrime.projectManagerPhone),
    projectManagerEmail: cleanDraftText(gcPrime.projectManagerEmail),
    bidPackageNumber: cleanDraftText(gcPrime.bidPackageNumber),
    specSection: cleanDraftText(gcPrime.specSection),
    drawingReferences: cleanDraftText(gcPrime.drawingReferences),
    addendaAcknowledged: cleanPrintableTextBlock(gcPrime.addendaAcknowledged),
    jobsiteAccessBadgingRequirements: cleanPrintableTextBlock(gcPrime.jobsiteAccessBadgingRequirements),
    retainagePercentage: cleanDraftText(gcPrime.retainagePercentage),
    paymentApplicationTerms: cleanPrintableTextBlock(gcPrime.paymentApplicationTerms),
    changeOrderProcess: cleanPrintableTextBlock(gcPrime.changeOrderProcess),
    rfiClarificationNotes: cleanPrintableTextBlock(gcPrime.rfiClarificationNotes || gcPrime.rfiNotes),
    rfiNotes: cleanPrintableTextBlock(gcPrime.rfiNotes),
    gcPrimeNotes: cleanPrintableTextBlock(gcPrime.gcPrimeNotes),
    ownerAgency: cleanDraftText(gcPrime.ownerAgency),
    addendaRegister: cleanRegisterRows(gcPrime.addendaRegister),
    rfiRegister: cleanRegisterRows(gcPrime.rfiRegister),
    scopeControlSummary: cleanScopeControlSummary(gcPrime.scopeControlSummary),
  };
}

function cleanScopeControlSummary(summary = {}) {
  return {
    includedScope: cleanPrintableTextBlock(summary?.includedScope),
    exclusions: cleanPrintableTextBlock(summary?.exclusions),
    clarifications: cleanPrintableTextBlock(summary?.clarifications),
    acceptedAlternates: cleanPrintableTextBlock(summary?.acceptedAlternates),
    allowances: cleanPrintableTextBlock(summary?.allowances),
    ownerGcByOthers: cleanPrintableTextBlock(summary?.ownerGcByOthers),
    hiddenUnshownConditionsNote: cleanPrintableTextBlock(summary?.hiddenUnshownConditionsNote),
  };
}

function cleanDraftGcPacketTables(tables = {}) {
  return {
    pricingSummary: {
      ...(tables.pricingSummary || {}),
      presentationNotes: cleanPrintableTextBlock(tables.pricingSummary?.presentationNotes),
      rows: cleanPrintablePricingSummaryRows(tables.pricingSummary?.rows),
    },
    scheduleOfValues: {
      ...(tables.scheduleOfValues || {}),
      rows: cleanPrintableStructuredRows("scheduleOfValues", tables.scheduleOfValues?.rows),
    },
    takeoffQuantities: {
      ...(tables.takeoffQuantities || {}),
      rows: cleanPrintableStructuredRows("takeoffQuantities", tables.takeoffQuantities?.rows),
    },
    shadeFootingEstimate: {
      ...(tables.shadeFootingEstimate || {}),
      rows: cleanPrintableStructuredRows("shadeFootingEstimate", tables.shadeFootingEstimate?.rows),
    },
    proposalNotes: {
      ...(tables.proposalNotes || {}),
      proposalBasis: cleanPrintableTextBlock(tables.proposalNotes?.proposalBasis),
      contractScopeControl: cleanPrintableTextBlock(tables.proposalNotes?.contractScopeControl),
      acceptanceSummary: cleanPrintableTextBlock(tables.proposalNotes?.acceptanceSummary),
      gcPrimeReviewer: cleanPrintableTextBlock(tables.proposalNotes?.gcPrimeReviewer),
    },
  };
}

function cleanDraftLineItems(lineItems = []) {
  return (Array.isArray(lineItems) ? lineItems : []).filter((item) => {
    const description = cleanDraftText(item?.description);
    const quantity = Number.parseFloat(String(item?.quantity ?? "").replace(/[$,%\s,]/g, ""));
    const unitPrice = Number.parseFloat(String(item?.unitPrice ?? "").replace(/[$,%\s,]/g, ""));

    if (!description || starterLineItemDescriptions.has(normalizePrintableFingerprint(description))) {
      return false;
    }

    return description || Number.isFinite(quantity) || Number.isFinite(unitPrice);
  });
}

function cleanDraftProjectPhotos(photos = []) {
  return (Array.isArray(photos) ? photos : []).filter((photo) => {
    const hasImage = [photo?.src, photo?.dataUrl, photo?.publicUrl, photo?.signedUrl, photo?.storagePath].some(hasPrintableText);
    const label = cleanDraftText(photo?.label || photo?.caption);

    return hasImage || label;
  });
}

function cleanDraftPlanSheets(planSheets = []) {
  return (Array.isArray(planSheets) ? planSheets : [])
    .map((sheet) => ({
      ...(sheet || {}),
      title: cleanDraftText(sheet?.title),
      subtitle: cleanDraftText(sheet?.subtitle),
      calculationTitle: cleanDraftText(sheet?.calculationTitle),
      calculationNotes: cleanPrintableTextList(sheet?.calculationNotes),
      clarificationNotes: cleanPrintableTextList(sheet?.clarificationNotes),
    }))
    .filter((sheet) => {
      const hasImage = [sheet.imageSrc, sheet.dataUrl, sheet.publicUrl, sheet.signedUrl, sheet.storagePath].some(hasPrintableText);
      const hasNotes = cleanPrintableTextList(sheet.calculationNotes).length > 0 || cleanPrintableTextList(sheet.clarificationNotes).length > 0;

      return Boolean(sheet.enabled && (hasImage || hasNotes));
    });
}

function cleanRegisterRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    Object.entries(row || {}).some(([key, value]) => key !== "id" && key !== "includedInPacket" && hasPrintableText(value)),
  );
}

function cleanDraftText(value) {
  return hasPrintableText(value) ? String(value).trim() : "";
}

function hasPlaceholderCollection(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    if (typeof item === "string") {
      return isPlaceholderPrintText(item);
    }

    if (!item || typeof item !== "object") {
      return false;
    }

    return Object.values(item).some((nestedValue) => {
      if (Array.isArray(nestedValue)) {
        return hasPlaceholderCollection(nestedValue);
      }

      return isPlaceholderPrintText(nestedValue);
    });
  });
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}
