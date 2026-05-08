export const RESIDENTIAL_LEGAL_NOTICE_STATUS_OPTIONS = [
  "needs_review",
  "included",
  "provided_separately",
  "not_applicable",
];

export function getDefaultResidentialLegalPapers() {
  return {
    informationNoticeToOwner: {
      status: "needs_review",
      providedToCustomer: false,
      providedDate: "",
      customerAcknowledged: false,
      customerAcknowledgedDate: "",
      notes: "Verify Oregon CCB owner notice requirements before signing.",
    },
    rightToCancelNotice: {
      status: "needs_review",
      notes: "Verify whether cancellation notice applies.",
    },
    legalAttachments: [],
  };
}

export function normalizeResidentialLegalPapers(value = {}) {
  const source = isPlainObject(value) ? value : {};
  const defaults = getDefaultResidentialLegalPapers();

  return {
    informationNoticeToOwner: normalizeInformationNotice(
      source.informationNoticeToOwner || source.ownerNotice || source.lienNotice,
      defaults.informationNoticeToOwner,
    ),
    rightToCancelNotice: normalizeNoticeStatusBlock(
      source.rightToCancelNotice || source.cancellationNotice,
      defaults.rightToCancelNotice,
    ),
    legalAttachments: normalizeResidentialLegalAttachments(source.legalAttachments || source.attachments),
  };
}

export function normalizeResidentialLegalAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map(normalizeResidentialLegalAttachment)
    .filter((attachment) => attachment.title || attachment.fileName || attachment.publicUrl || attachment.storagePath);
}

export function normalizeResidentialLegalAttachment(attachment = {}, index = 0) {
  const source = isPlainObject(attachment) ? attachment : {};
  const title = cleanLegalText(source.title || source.label || source.name || source.fileName || `Legal Document ${index + 1}`);

  return {
    id: cleanLegalText(source.id),
    title,
    type: cleanLegalText(source.type || "owner_notice") || "owner_notice",
    fileName: cleanLegalText(source.fileName),
    fileType: cleanLegalText(source.fileType),
    fileSize: Number.parseInt(source.fileSize, 10) || 0,
    storagePath: cleanLegalText(source.storagePath),
    publicUrl: cleanLegalText(source.publicUrl),
    uploadedAt: cleanLegalText(source.uploadedAt),
    uploadedBy: cleanLegalText(source.uploadedBy || source.uploadedByEmail),
    includedInPdf: source.includedInPdf === true,
    providedSeparately: source.providedSeparately !== false,
    acknowledgementRequired: source.acknowledgementRequired !== false,
  };
}

export function buildResidentialLegalSummarySections(proposal = {}) {
  const terms = normalizeResidentialTermsSource(proposal);
  const paymentText = [terms.paymentTerms, terms.depositScheduling, terms.finalPayment]
    .map(cleanLegalText)
    .filter(Boolean)
    .join(" ");
  const sections = [
    ["Payment Terms", paymentText],
    ["Change Orders", terms.changeOrders],
    ["Utilities / Irrigation / Buried Items", terms.utilityResponsibility],
    ["Hidden Conditions", terms.hiddenConditions],
    ["Weather / Schedule", terms.weatherDelays],
    ["Concrete Cracking", terms.concreteCracking],
    ["Finish / Color Variation", terms.colorFinishVariation],
    ["Warranty Limitation", terms.warrantyLimitation],
  ];

  return sections
    .map(([title, body]) => ({ title, body: cleanLegalText(body) }))
    .filter((section) => section.body);
}

export function buildResidentialLegalPaperRows(proposal = {}) {
  const papers = normalizeResidentialLegalPapers(proposal.residentialLegalPapers);
  const rows = [
    {
      key: "information-notice-to-owner",
      title: "Information Notice to Owner About Construction Liens",
      status: getResidentialLegalStatusLabel(papers.informationNoticeToOwner.status),
      notes: cleanLegalText(papers.informationNoticeToOwner.notes),
      meta: buildNoticeMeta(papers.informationNoticeToOwner),
    },
    {
      key: "right-to-cancel-notice",
      title: "Right-to-Cancel Notice",
      status: getResidentialLegalStatusLabel(papers.rightToCancelNotice.status),
      notes: cleanLegalText(papers.rightToCancelNotice.notes),
      meta: "",
    },
  ];

  papers.legalAttachments.forEach((attachment, index) => {
    rows.push({
      key: attachment.id || `legal-attachment-${index + 1}`,
      title: attachment.title || attachment.fileName || `Legal Document ${index + 1}`,
      status: attachment.includedInPdf
        ? "Included With Proposal"
        : attachment.providedSeparately
          ? "Provided Separately"
          : "Listed for Review",
      notes: attachment.fileName || "",
      meta: attachment.acknowledgementRequired ? "Customer acknowledgement requested." : "",
    });
  });

  return rows;
}

export function getResidentialLegalStatusLabel(status = "") {
  const normalizedStatus = normalizeResidentialLegalStatus(status);

  if (normalizedStatus === "included") {
    return "Included With Proposal";
  }

  if (normalizedStatus === "provided_separately") {
    return "Provided Separately";
  }

  if (normalizedStatus === "not_applicable") {
    return "Not Applicable";
  }

  return "Needs Review Before Signing";
}

export function normalizeResidentialLegalStatus(status = "") {
  const normalizedStatus = cleanLegalText(status).toLowerCase().replace(/[\s-]+/g, "_");
  return RESIDENTIAL_LEGAL_NOTICE_STATUS_OPTIONS.includes(normalizedStatus) ? normalizedStatus : "needs_review";
}

function normalizeInformationNotice(value = {}, defaults = {}) {
  const source = isPlainObject(value) ? value : {};

  return {
    ...defaults,
    status: normalizeResidentialLegalStatus(source.status || defaults.status),
    providedToCustomer: source.providedToCustomer === true,
    providedDate: cleanLegalText(source.providedDate),
    customerAcknowledged: source.customerAcknowledged === true,
    customerAcknowledgedDate: cleanLegalText(source.customerAcknowledgedDate),
    notes: cleanLegalText(source.notes || defaults.notes),
  };
}

function normalizeNoticeStatusBlock(value = {}, defaults = {}) {
  const source = isPlainObject(value) ? value : {};

  return {
    ...defaults,
    status: normalizeResidentialLegalStatus(source.status || defaults.status),
    notes: cleanLegalText(source.notes || defaults.notes),
  };
}

function normalizeResidentialTermsSource(proposal = {}) {
  const legalTerms = isPlainObject(proposal.legalTerms) ? proposal.legalTerms : {};
  const terms = isPlainObject(proposal.terms) ? proposal.terms : {};

  return {
    paymentTerms: firstLegalText(legalTerms.paymentTerms, terms.payment),
    depositScheduling: firstLegalText(legalTerms.depositScheduling, terms.depositText),
    finalPayment: firstLegalText(legalTerms.finalPayment, terms.finalPayment),
    changeOrders: firstLegalText(legalTerms.changeOrders, terms.changeOrderLanguage),
    utilityResponsibility: firstLegalText(legalTerms.utilityResponsibility, terms.utilityResponsibility),
    hiddenConditions: firstLegalText(legalTerms.hiddenConditions, terms.hiddenConditions),
    weatherDelays: firstLegalText(legalTerms.weatherDelays, terms.weatherDelay, terms.weatherSiteReadiness),
    concreteCracking: firstLegalText(legalTerms.concreteCracking, terms.concreteCrackingDisclaimer),
    colorFinishVariation: firstLegalText(legalTerms.colorFinishVariation, terms.colorFinishVariationDisclaimer),
    warrantyLimitation: firstLegalText(legalTerms.warrantyLimitation, terms.warrantyLimitation),
    acceptanceLanguage: firstLegalText(legalTerms.acceptanceLanguage, terms.acceptanceLanguage, terms.acceptance),
  };
}

function buildNoticeMeta(notice = {}) {
  const details = [];

  if (notice.providedToCustomer) {
    details.push(`Marked provided${notice.providedDate ? ` on ${notice.providedDate}` : ""}.`);
  }

  if (notice.customerAcknowledged) {
    details.push(`Customer acknowledged${notice.customerAcknowledgedDate ? ` on ${notice.customerAcknowledgedDate}` : ""}.`);
  }

  return details.join(" ");
}

function firstLegalText(...values) {
  return values.map(cleanLegalText).find(Boolean) || "";
}

function cleanLegalText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
