export const RESIDENTIAL_LEGAL_NOTICE_STATUS_OPTIONS = [
  "needs_review",
  "included",
  "provided_separately",
  "not_applicable",
];

export const RESIDENTIAL_TERMS_TEMPLATE_ID = "last_yard_standard_residential_terms";
export const RESIDENTIAL_TERMS_TEMPLATE_LABEL = "Last Yard Standard Residential Terms";
export const RESIDENTIAL_TERMS_TEMPLATE_OPTIONS = [RESIDENTIAL_TERMS_TEMPLATE_ID];

export function getDefaultResidentialLegalPapers(options = {}) {
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
    termsAndConditions: getDefaultResidentialTermsAndConditions(options),
    legalAttachments: [],
  };
}

export function getDefaultResidentialTermsAndConditions(options = {}) {
  const includedInPdf = options.includedInPdf === true || options.includeInPdf === true;

  return {
    status: options.status || (includedInPdf ? "included" : "provided_separately"),
    template: RESIDENTIAL_TERMS_TEMPLATE_ID,
    includedInPdf,
    customerAcknowledged: false,
    customerAcknowledgedDate: "",
    acknowledgementRequired: true,
    notes: "",
  };
}

export function normalizeResidentialLegalPapers(value = {}, options = {}) {
  const source = isPlainObject(value) ? value : {};
  const defaults = getDefaultResidentialLegalPapers(options);

  return {
    informationNoticeToOwner: normalizeInformationNotice(
      source.informationNoticeToOwner || source.ownerNotice || source.lienNotice,
      defaults.informationNoticeToOwner,
    ),
    rightToCancelNotice: normalizeNoticeStatusBlock(
      source.rightToCancelNotice || source.cancellationNotice,
      defaults.rightToCancelNotice,
    ),
    termsAndConditions: normalizeTermsAndConditions(
      source.termsAndConditions || source.residentialTermsAndConditions || source.standardResidentialTerms,
      defaults.termsAndConditions,
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
  const cleanedPaymentTerms = cleanLegalText(terms.paymentTerms);
  const paymentText = [
    cleanedPaymentTerms,
    hasDepositLanguage(cleanedPaymentTerms) ? "" : terms.depositScheduling,
    hasFinalPaymentLanguage(cleanedPaymentTerms) ? "" : terms.finalPayment,
  ]
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
  const papers = normalizeResidentialLegalPapers(proposal.residentialLegalPapers, {
    includeTermsByDefault: shouldDefaultIncludeResidentialTerms(proposal),
  });
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
    {
      key: "residential-terms-and-conditions",
      title: "Residential Terms & Conditions",
      status: getResidentialLegalStatusLabel(papers.termsAndConditions.status),
      notes: getResidentialTermsTemplateLabel(papers.termsAndConditions.template),
      meta: buildTermsMeta(papers.termsAndConditions),
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

export function getResidentialTermsTemplate(template = RESIDENTIAL_TERMS_TEMPLATE_ID) {
  const normalizedTemplate = cleanLegalText(template) || RESIDENTIAL_TERMS_TEMPLATE_ID;

  return {
    id: normalizedTemplate,
    label: getResidentialTermsTemplateLabel(normalizedTemplate),
    title: "Residential Independent Contractor Services Agreement / Terms & Conditions",
    sections: RESIDENTIAL_TERMS_TEMPLATE_SECTIONS,
  };
}

export function getResidentialTermsTemplateLabel(template = RESIDENTIAL_TERMS_TEMPLATE_ID) {
  return cleanLegalText(template) === RESIDENTIAL_TERMS_TEMPLATE_ID ? RESIDENTIAL_TERMS_TEMPLATE_LABEL : cleanLegalText(template);
}

export function shouldPrintResidentialTermsAndConditions(proposal = {}) {
  const papers = normalizeResidentialLegalPapers(proposal.residentialLegalPapers, {
    includeTermsByDefault: shouldDefaultIncludeResidentialTerms(proposal),
  });
  const terms = papers.termsAndConditions;

  return terms.includedInPdf === true && normalizeResidentialLegalStatus(terms.status) !== "not_applicable";
}

export function buildResidentialTermsAndConditionsSections(proposal = {}, company = {}) {
  const papers = normalizeResidentialLegalPapers(proposal.residentialLegalPapers, {
    includeTermsByDefault: shouldDefaultIncludeResidentialTerms(proposal),
  });
  const terms = papers.termsAndConditions;

  if (!shouldPrintResidentialTermsAndConditions({ ...proposal, residentialLegalPapers: papers })) {
    return [];
  }

  const template = getResidentialTermsTemplate(terms.template);
  const context = buildResidentialTermsContext(proposal, company, papers);

  return template.sections.map((section, index) => ({
    id: section.id || `residential-term-${index + 1}`,
    title: section.title,
    body: cleanLegalText(typeof section.body === "function" ? section.body(context) : section.body),
  }));
}

export function shouldDefaultIncludeResidentialTerms(proposal = {}) {
  return false;
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

function normalizeTermsAndConditions(value = {}, defaults = {}) {
  const source = isPlainObject(value) ? value : {};
  const includedInPdf = Object.prototype.hasOwnProperty.call(source, "includedInPdf")
    ? source.includedInPdf === true
    : defaults.includedInPdf === true;

  return {
    ...defaults,
    status: normalizeResidentialLegalStatus(source.status || defaults.status),
    template: RESIDENTIAL_TERMS_TEMPLATE_OPTIONS.includes(cleanLegalText(source.template))
      ? cleanLegalText(source.template)
      : defaults.template || RESIDENTIAL_TERMS_TEMPLATE_ID,
    includedInPdf,
    customerAcknowledged: source.customerAcknowledged === true,
    customerAcknowledgedDate: cleanLegalText(source.customerAcknowledgedDate),
    acknowledgementRequired: source.acknowledgementRequired !== false,
    notes: cleanLegalText(source.notes || defaults.notes),
  };
}

function normalizeResidentialTermsSource(proposal = {}) {
  const legalTerms = isPlainObject(proposal.legalTerms) ? proposal.legalTerms : {};
  const terms = isPlainObject(proposal.terms) ? proposal.terms : {};
  const explicitPaymentTerms = cleanLegalText(legalTerms.paymentTerms);

  return {
    paymentTerms: firstLegalText(explicitPaymentTerms, terms.payment),
    depositScheduling: firstLegalText(legalTerms.depositScheduling, explicitPaymentTerms ? "" : terms.depositText),
    finalPayment: firstLegalText(legalTerms.finalPayment, explicitPaymentTerms ? "" : terms.finalPayment),
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

function buildTermsMeta(terms = {}) {
  const details = [];

  if (terms.includedInPdf) {
    details.push("Included in PDF.");
  } else if (normalizeResidentialLegalStatus(terms.status) === "provided_separately") {
    details.push("Provided separately.");
  } else {
    details.push("Not included in PDF.");
  }

  if (terms.acknowledgementRequired) {
    details.push("Customer acknowledgement requested.");
  }

  if (terms.customerAcknowledged) {
    details.push(`Customer acknowledged${terms.customerAcknowledgedDate ? ` on ${terms.customerAcknowledgedDate}` : ""}.`);
  }

  return details.join(" ");
}

function buildResidentialTermsContext(proposal = {}, company = {}, papers = {}) {
  const client = isPlainObject(proposal.client) ? proposal.client : {};
  const project = isPlainObject(proposal.project) ? proposal.project : {};
  const terms = normalizeResidentialTermsSource(proposal);
  const total = getResidentialAcceptedEstimateTotal(proposal);
  const selectedAddOns = getSelectedResidentialAddOns(proposal);
  const selectedOption = getSelectedResidentialOption(proposal);
  const scopeSummary = [
    project.description,
    selectedOption ? `Selected option: ${selectedOption.name}` : "",
    selectedAddOns.length > 0 ? `Selected add-ons: ${selectedAddOns.map((addOn) => addOn.name).join(", ")}` : "",
  ]
    .map(cleanLegalText)
    .filter(Boolean)
    .join(" ");

  return {
    contractorName: cleanLegalText(company.name || proposal.company?.name || "Last Yard Concrete LLC"),
    contractorAddress: cleanLegalText(company.address || proposal.company?.address || ""),
    contractorPhone: cleanLegalText(company.phone || proposal.company?.phone || ""),
    contractorEmail: cleanLegalText(company.email || proposal.company?.email || ""),
    contractorLicense: cleanLegalText(company.license || proposal.company?.license || proposal.company?.ccb || ""),
    customerName: cleanLegalText(client.companyName || client.contactName || "Customer to be verified"),
    projectName: cleanLegalText(project.name || proposal.title || "Residential concrete project"),
    projectAddress: cleanLegalText(project.address || project.location || client.projectAddress || "Project address to be verified"),
    estimateTotal: total > 0 ? formatLegalCurrency(total) : "Estimate total to be verified",
    selectedAddOns,
    selectedOption,
    scopeSummary: scopeSummary || "Scope of work is limited to the written proposal, selected pricing option, selected add-ons, and approved change orders.",
    terms,
    ownerNoticeStatus: getResidentialLegalStatusLabel(papers.informationNoticeToOwner?.status),
    rightToCancelStatus: getResidentialLegalStatusLabel(papers.rightToCancelNotice?.status),
  };
}

function firstLegalText(...values) {
  return values.map(cleanLegalText).find(Boolean) || "";
}

function cleanLegalText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasDepositLanguage(value = "") {
  return /\b(deposit|down payment|down)\b/i.test(cleanLegalText(value));
}

function hasFinalPaymentLanguage(value = "") {
  return /\bfinal payment\b/i.test(cleanLegalText(value));
}

function getResidentialAcceptedEstimateTotal(proposal = {}) {
  const pricingMode = cleanLegalText(proposal.pricingMode || proposal.pricing?.pricingMode);

  if (pricingMode === "choose_one_option") {
    const selectedOption = getSelectedResidentialOption(proposal);
    const selectedOptionTotal = toLegalNumber(selectedOption?.price || selectedOption?.amount);
    const selectedAddOnsTotal = getSelectedResidentialAddOns(proposal).reduce((sum, addOn) => sum + toLegalNumber(addOn.amount), 0);
    return selectedOptionTotal + selectedAddOnsTotal;
  }

  const lineItemTotal = (Array.isArray(proposal.lineItems) ? proposal.lineItems : []).reduce((sum, item) => {
    const quantity = toLegalNumber(item?.quantity) || 1;
    const unitPrice = toLegalNumber(item?.unitPrice ?? item?.price);
    const amount = toLegalNumber(item?.amount ?? item?.total) || quantity * unitPrice;
    return sum + amount;
  }, 0);
  const selectedAddOnsTotal = getSelectedResidentialAddOns(proposal).reduce((sum, addOn) => sum + toLegalNumber(addOn.amount), 0);
  const includedPricingTotal = (Array.isArray(proposal.pricingSections) ? proposal.pricingSections : []).reduce(
    (sum, section) => sum + (section?.included ? toLegalNumber(section.amount) : 0),
    0,
  );

  return lineItemTotal + (selectedAddOnsTotal || includedPricingTotal);
}

function getSelectedResidentialOption(proposal = {}) {
  const options = Array.isArray(proposal.pricingOptions) ? proposal.pricingOptions : proposal.pricing?.pricingOptions || [];
  return options.find((option) => option?.selected || option?.included) || options[0] || null;
}

function getSelectedResidentialAddOns(proposal = {}) {
  const addOns = Array.isArray(proposal.optionalAddOns) ? proposal.optionalAddOns : proposal.pricing?.optionalAddOns || [];
  return addOns.filter((addOn) => addOn?.selected || addOn?.included);
}

function toLegalNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLegalCurrency(value) {
  const amount = toLegalNumber(value);
  return amount.toLocaleString("en-US", {
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    style: "currency",
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const RESIDENTIAL_TERMS_TEMPLATE_SECTIONS = [
  {
    id: "agreement",
    title: "Residential Independent Contractor Services Agreement",
    body: ({ contractorName, customerName, projectAddress }) =>
      `This Residential Independent Contractor Services Agreement is between ${contractorName} and ${customerName} for residential concrete services at ${projectAddress}. The written proposal, selected pricing, selected add-ons, approved changes, and these terms together form the customer agreement.`,
  },
  {
    id: "parties",
    title: "Parties",
    body: ({ contractorName, contractorAddress, contractorPhone, contractorEmail, contractorLicense, customerName }) =>
      `Contractor: ${contractorName}${contractorAddress ? `, ${contractorAddress}` : ""}${contractorPhone ? `, ${contractorPhone}` : ""}${contractorEmail ? `, ${contractorEmail}` : ""}${contractorLicense ? `, ${contractorLicense}` : ""}. Owner/Customer: ${customerName}.`,
  },
  {
    id: "scope-of-work",
    title: "Scope of Work",
    body: ({ scopeSummary }) =>
      `The scope of work is limited to the written proposal and accepted estimate. ${scopeSummary} Work not listed in the accepted proposal is excluded unless approved by written change order.`,
  },
  {
    id: "project-timeline",
    title: "Project Timeline & Scheduling",
    body: "Scheduling depends on deposit receipt, signed acceptance, site readiness, weather, crew availability, material availability, inspections, and access. Dates are good-faith targets unless a written schedule commitment is included.",
  },
  {
    id: "payment-terms",
    title: "Payment Terms",
    body: ({ estimateTotal, terms }) =>
      `${terms.paymentTerms || "A 50% down payment is required to schedule the project."} ${terms.finalPayment || "Final payment is due when the last concrete for the included scope is poured."} Accepted estimate total: ${estimateTotal}.`,
  },
  {
    id: "owner-responsibilities",
    title: "Owner Responsibilities",
    body: "Owner is responsible for providing accurate project information, site access, water/power access if required, HOA approvals, permits not expressly included, pet/child safety, personal-property removal, irrigation marking, and decisions needed to avoid delay.",
  },
  {
    id: "utilities-underground",
    title: "Utilities & Underground Markings",
    body: ({ terms }) =>
      terms.utilityResponsibility || "Owner is responsible for identifying private utilities, irrigation, drain lines, sleeves, low-voltage wiring, and buried items that public utility locating services may not mark. Damage to unmarked or incorrectly marked private utilities is excluded unless expressly included.",
  },
  {
    id: "subsurface-site-conditions",
    title: "Subsurface & Site Conditions",
    body: ({ terms }) =>
      terms.hiddenConditions || "Unknown soil, buried debris, unsuitable subgrade, groundwater, voids, old concrete, undocumented utilities, rock, tree roots, or hidden conditions may require added work and a written change order.",
  },
  {
    id: "change-orders",
    title: "Change Orders",
    body: ({ terms }) =>
      terms.changeOrders || "Changes to scope, materials, dimensions, access, schedule, site conditions, finishes, or owner direction must be approved in writing before added work proceeds. Change orders may affect price and schedule.",
  },
  {
    id: "pre-pour-acceptance",
    title: "Pre-Pour Acceptance",
    body: "Owner or authorized representative should review layout, form lines, elevations, finish selection, color/stamp selections, drains, steps, and visible prep before concrete placement. Concrete placement authorizes Last Yard to proceed based on approved field conditions.",
  },
  {
    id: "weather-delays",
    title: "Weather, Delays & Force Majeure",
    body: ({ terms }) =>
      terms.weatherDelays || "Weather, rain, freezing temperatures, heat, smoke, site readiness, supplier delays, equipment delays, inspection delays, and events beyond contractor control may delay work without penalty.",
  },
  {
    id: "drainage-soil-disclosures",
    title: "Drainage, Soil & Construction Disclosures",
    body: "Concrete performance depends on subgrade, drainage, slope, compaction, water management, freeze/thaw conditions, curing, and owner maintenance. Ponding, settlement, heaving, drainage issues, and soil movement are excluded unless caused by defective workmanship.",
  },
  {
    id: "damage-limitations",
    title: "Damage Limitations",
    body: "Reasonable construction access may affect lawns, landscaping, gravel, soil, drive areas, sprinkler heads, edging, or adjacent surfaces. Restoration is excluded unless specifically included in the written scope.",
  },
  {
    id: "post-completion-safety",
    title: "Post-Completion Site Safety & Barricades",
    body: "Owner is responsible for keeping people, pets, vehicles, deliveries, and other trades off fresh concrete and protected work areas after Last Yard leaves the site unless written site-control services are included.",
  },
  {
    id: "insurance-workers-comp",
    title: "Insurance & Workers' Compensation",
    body: "Last Yard will maintain contractor insurance and workers' compensation coverage as required for its operations. Copies of available coverage information may be provided upon request.",
  },
  {
    id: "independent-contractor",
    title: "Independent Contractor Status",
    body: "Last Yard performs as an independent contractor and controls its means, methods, crew supervision, sequencing, equipment, and work practices, subject to the accepted scope and applicable code requirements.",
  },
  {
    id: "employee-direction",
    title: "Employee Direction & Communication Protocol",
    body: "Owner should direct questions, requests, complaints, finish changes, and scope changes to Last Yard management or the designated project contact, not individual crew members. Crew instructions from others are not binding unless approved by Last Yard.",
  },
  {
    id: "indemnification",
    title: "Indemnification",
    body: "Each party is responsible for its own negligent acts or omissions. Owner agrees to hold Last Yard harmless for damages caused by inaccurate owner information, unmarked private utilities, unsafe site conditions, owner-directed changes, or third-party interference.",
  },
  {
    id: "warranty",
    title: "Warranty",
    body: ({ terms }) =>
      terms.warrantyLimitation || "Warranty is limited to workmanship for the included scope. Normal cracking, color variation, finish variation, weather effects, soil movement, drainage issues, abuse, deicing chemicals, and owner maintenance issues are excluded.",
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: "To the extent allowed by law, Last Yard's liability is limited to repair or replacement of defective workmanship in the included scope. Consequential damages, lost use, landscaping damage, and unrelated property claims are excluded unless required by law.",
  },
  {
    id: "termination",
    title: "Termination",
    body: "Either party may request termination before work begins. Owner remains responsible for approved work, ordered materials, mobilization, cancellation costs, and completed work through termination unless prohibited by applicable law.",
  },
  {
    id: "mechanics-lien-rights",
    title: "Mechanics' Lien Rights",
    body: "Oregon law may provide lien rights to contractors, subcontractors, suppliers, and others who provide labor, materials, or equipment. Owner should review any required Information Notice to Owner About Construction Liens before signing.",
  },
  {
    id: "dispute-resolution",
    title: "Dispute Resolution",
    body: "The parties agree to first attempt good-faith resolution through direct communication. If unresolved, disputes may proceed through mediation, arbitration, small claims, or court as allowed by the agreement and applicable law.",
  },
  {
    id: "photography-marketing",
    title: "Photography & Marketing Rights",
    body: "Unless owner objects in writing, Last Yard may photograph or video the work area and completed work for documentation, quality control, portfolio, marketing, training, and dispute-prevention purposes without showing private owner information.",
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: "This agreement is governed by Oregon law unless another governing law is required by the project location or applicable contract documents.",
  },
  {
    id: "severability-no-waiver",
    title: "Severability & No Waiver",
    body: "If any part of these terms is unenforceable, the remaining terms remain in effect. Failure to enforce a term once is not a waiver of future enforcement.",
  },
  {
    id: "entire-agreement",
    title: "Entire Agreement",
    body: "The accepted proposal, selected options/add-ons, written change orders, legal notices, and these terms are the entire agreement for the residential work unless both parties sign a later written agreement.",
  },
  {
    id: "oregon-notices",
    title: "Owner Acknowledgment of Required Oregon Notices",
    body: ({ ownerNoticeStatus }) =>
      `Owner acknowledges that residential construction paperwork and notices may be required. Information Notice to Owner About Construction Liens status: ${ownerNoticeStatus}. Last Yard should verify current Oregon CCB requirements before signing.`,
  },
  {
    id: "right-to-cancel",
    title: "Homeowner Right To Cancel",
    body: ({ rightToCancelStatus }) =>
      `Right-to-cancel notice status: ${rightToCancelStatus}. Applicability may depend on contract circumstances, signing location, and current law. Last Yard and owner should verify before signing.`,
  },
  {
    id: "signature-acceptance",
    title: "Signature / Acceptance Area",
    body: "By signing, the customer accepts the proposal, selected pricing, selected add-ons, listed legal papers/notices status, and these Residential Terms & Conditions.",
  },
];
