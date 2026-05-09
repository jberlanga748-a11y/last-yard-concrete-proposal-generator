const customerPortalTokenPrefix = "lyp_";
const customerPortalTokenByteLength = 18;

export function normalizeCustomerShareToken(value = "") {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 96);
}

export function createCustomerShareToken(randomSource = globalThis.crypto) {
  const bytes = new Uint8Array(customerPortalTokenByteLength);

  if (randomSource?.getRandomValues) {
    randomSource.getRandomValues(bytes);
  } else {
    bytes.forEach((_value, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }

  return `${customerPortalTokenPrefix}${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getCustomerShareFields(proposal = {}) {
  return {
    customerShareEnabled: proposal.customerShareEnabled === true,
    customerShareToken: normalizeCustomerShareToken(proposal.customerShareToken),
    customerShareCreatedAt: cleanCustomerPortalText(proposal.customerShareCreatedAt),
    customerShareExpiresAt: cleanCustomerPortalText(proposal.customerShareExpiresAt),
    customerShareLastViewedAt: cleanCustomerPortalText(proposal.customerShareLastViewedAt),
  };
}

export function getCustomerPortalLink(origin = "", token = "") {
  const cleanOrigin = String(origin || "").replace(/\/+$/, "");
  const cleanToken = normalizeCustomerShareToken(token);

  return cleanOrigin && cleanToken ? `${cleanOrigin}/proposal-view/${cleanToken}` : "";
}

export function isCustomerPortalRoute(route = {}) {
  return route.view === "customerPortal" || route.public === true;
}

export function isCustomerShareExpired(proposal = {}, now = new Date()) {
  const expiresAt = getCustomerShareFields(proposal).customerShareExpiresAt;

  if (!expiresAt) {
    return false;
  }

  const normalizedExpiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ? `${expiresAt}T23:59:59.999` : expiresAt;
  const expirationTime = Date.parse(normalizedExpiresAt);
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(now);

  return Number.isFinite(expirationTime) && Number.isFinite(currentTime) ? expirationTime < currentTime : false;
}

export function getCustomerShareStatus(proposal = {}, token = "", now = new Date()) {
  const requestedToken = normalizeCustomerShareToken(token);
  const fields = getCustomerShareFields(proposal);

  if (!requestedToken) {
    return {
      available: false,
      reason: "missing-token",
      ...fields,
    };
  }

  if (!fields.customerShareToken || fields.customerShareToken !== requestedToken) {
    return {
      available: false,
      reason: "not-found",
      ...fields,
    };
  }

  if (!fields.customerShareEnabled) {
    return {
      available: false,
      reason: "disabled",
      ...fields,
    };
  }

  if (isCustomerShareExpired(proposal, now)) {
    return {
      available: false,
      reason: "expired",
      ...fields,
    };
  }

  return {
    available: true,
    reason: "available",
    ...fields,
  };
}

export function findCustomerProposalByShareToken(proposals = [], token = "", now = new Date()) {
  const requestedToken = normalizeCustomerShareToken(token);

  if (!requestedToken) {
    return {
      available: false,
      proposal: null,
      reason: "missing-token",
    };
  }

  const proposal = (Array.isArray(proposals) ? proposals : []).find(
    (item) => getCustomerShareFields(item).customerShareToken === requestedToken,
  );

  if (!proposal) {
    return {
      available: false,
      proposal: null,
      reason: "not-found",
    };
  }

  const status = getCustomerShareStatus(proposal, requestedToken, now);

  return {
    ...status,
    proposal: status.available ? proposal : null,
    matchedProposal: proposal,
  };
}

export function getCustomerPortalUnavailableMessage(reason = "") {
  if (reason === "expired") {
    return "This proposal link has expired. Please contact Last Yard Concrete for an updated link.";
  }

  if (reason === "disabled") {
    return "This proposal link is no longer available. Please contact Last Yard Concrete if you need access.";
  }

  return "This proposal link is unavailable or could not be found.";
}

export async function fetchCustomerPortalProposalByToken(shareToken = "", { endpoint = "/api/customer-proposal", fetchImpl = globalThis.fetch } = {}) {
  const token = normalizeCustomerShareToken(shareToken);

  if (!token) {
    return {
      available: false,
      proposal: null,
      reason: "missing-token",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      available: false,
      proposal: null,
      reason: "api-unavailable",
    };
  }

  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetchImpl(`${endpoint}${separator}shareToken=${encodeURIComponent(token)}`, {
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await readCustomerPortalJsonResponse(response);

    if (!response.ok) {
      return {
        available: false,
        proposal: null,
        reason: payload.reason || (response.status === 503 ? "unconfigured" : response.status === 410 ? "expired" : response.status === 403 ? "disabled" : "api-unavailable"),
      };
    }

    return {
      available: payload.available === true && Boolean(payload.proposal),
      proposal: payload.proposal || null,
      reason: payload.reason || (payload.available ? "available" : "not-found"),
    };
  } catch {
    return {
      available: false,
      proposal: null,
      reason: "api-unavailable",
    };
  }
}

export function createCustomerSafeProposalPayload(proposal = {}) {
  const pricing = isCustomerPortalObject(proposal.pricing) ? proposal.pricing : {};
  const pricingOptions = sanitizeCustomerPortalPricingOptions(selectCustomerPortalRows(proposal.pricingOptions, pricing.pricingOptions));
  const optionalAddOns = sanitizeCustomerPortalOptionalAddOns(selectCustomerPortalRows(proposal.optionalAddOns, pricing.optionalAddOns));
  const lineItems = sanitizeCustomerPortalRows(selectCustomerPortalRows(proposal.lineItems, pricing.lineItems));
  const pricingMode = cleanCustomerPortalText(proposal.pricingMode || pricing.pricingMode);

  return removeEmptyCustomerPortalFields({
    id: cleanCustomerPortalText(proposal.id),
    proposalNumber: cleanCustomerPortalText(proposal.proposalNumber),
    proposalDate: cleanCustomerPortalText(proposal.proposalDate),
    validUntil: cleanCustomerPortalText(proposal.validUntil),
    status: cleanCustomerPortalText(proposal.status),
    proposalMode: cleanCustomerPortalText(proposal.proposalMode),
    proposalType: cleanCustomerPortalText(proposal.proposalType),
    type: cleanCustomerPortalText(proposal.type),
    packetMode: cleanCustomerPortalText(proposal.packetMode),
    residentialPdfLayout: cleanCustomerPortalText(proposal.residentialPdfLayout),
    pdfStyle: sanitizeCustomerPortalObject(proposal.pdfStyle),
    ...getCustomerShareFields(proposal),
    company: sanitizeCustomerPortalCompany(proposal.company),
    client: sanitizeCustomerPortalClient(proposal.client),
    project: sanitizeCustomerPortalProject(proposal.project),
    financials: sanitizeCustomerPortalObject(proposal.financials),
    lineItems,
    pricingMode,
    pricingOptions,
    optionalAddOns,
    pricing: removeEmptyCustomerPortalFields({
      pricingMode,
      baseBid: toCustomerPortalNumber(pricing.baseBid ?? proposal.baseBid),
      totalProposal: toCustomerPortalNumber(pricing.totalProposal ?? pricing.total ?? proposal.totalProposal),
      basePackage: sanitizeCustomerPortalBasePackage(pricing.basePackage),
      lineItems,
      pricingOptions,
      optionalAddOns,
      selectedAddOnIds: sanitizeCustomerPortalTextList(pricing.selectedAddOnIds || proposal.selectedAddOnIds),
      pricingExamples: sanitizeCustomerPortalRows(pricing.pricingExamples || proposal.pricingExamples),
      paymentExamples: sanitizeCustomerPortalRows(pricing.paymentExamples || proposal.paymentExamples),
    }),
    scopeSections: sanitizeCustomerPortalRows(proposal.scopeSections),
    exclusions: sanitizeCustomerPortalTextList(proposal.exclusions),
    assumptions: sanitizeCustomerPortalTextList(proposal.assumptions),
    terms: sanitizeCustomerPortalObject(proposal.terms),
    concreteSpecs: sanitizeCustomerPortalObject(proposal.concreteSpecs),
    projectPhotos: sanitizeCustomerPortalImages(proposal.projectPhotos),
    residentialLegalPapers: sanitizeCustomerPortalLegalPapers(proposal.residentialLegalPapers),
  });
}

export function isCustomerSafeImageCaption(value = "") {
  const caption = cleanCustomerPortalText(value);

  if (!caption) {
    return false;
  }

  return !/^(img|dsc|photo|image|pxl|vid)[-_ ]?\d{3,}\.(jpe?g|png|webp|heic|heif)$/i.test(caption);
}

export function getCustomerSafeImageCaption(image = {}, fallback = "Project Photo") {
  const caption = cleanCustomerPortalText(image.caption || image.label || image.title || image.name);

  return isCustomerSafeImageCaption(caption) ? caption : fallback;
}

function cleanCustomerPortalText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function readCustomerPortalJsonResponse(response) {
  const contentType = response?.headers?.get?.("content-type") || "";

  if (!/application\/json/i.test(contentType)) {
    return {};
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

function sanitizeCustomerPortalCompany(company = {}) {
  return sanitizeCustomerPortalObject(company, [
    "name",
    "phone",
    "email",
    "address",
    "license",
    "credentials",
    "serviceArea",
    "logoPath",
  ]);
}

function sanitizeCustomerPortalClient(client = {}) {
  return sanitizeCustomerPortalObject(client, [
    "companyName",
    "contactName",
    "phone",
    "email",
    "billingAddress",
    "projectAddress",
  ]);
}

function sanitizeCustomerPortalProject(project = {}) {
  return sanitizeCustomerPortalObject(project, [
    "name",
    "address",
    "location",
    "description",
    "category",
    "estimatedDuration",
    "scheduleRestrictions",
    "specialRequirements",
    "proposedSchedule",
  ]);
}

function sanitizeCustomerPortalLegalPapers(legalPapers = {}) {
  if (!isCustomerPortalObject(legalPapers)) {
    return {};
  }

  return removeEmptyCustomerPortalFields({
    informationNoticeToOwner: sanitizeCustomerPortalObject(legalPapers.informationNoticeToOwner),
    rightToCancelNotice: sanitizeCustomerPortalObject(legalPapers.rightToCancelNotice),
    termsAndConditions: sanitizeCustomerPortalObject(legalPapers.termsAndConditions),
    legalAttachments: sanitizeCustomerPortalRows(legalPapers.legalAttachments).map((attachment) =>
      sanitizeCustomerPortalObject(attachment, [
        "id",
        "title",
        "type",
        "fileType",
        "includedInPdf",
        "providedSeparately",
        "acknowledgementRequired",
        "uploadedAt",
      ]),
    ),
  });
}

function sanitizeCustomerPortalBasePackage(basePackage = {}) {
  if (!isCustomerPortalObject(basePackage)) {
    return {};
  }

  return {
    ...sanitizeCustomerPortalObject(basePackage),
    images: sanitizeCustomerPortalImages(basePackage.images),
    lineItems: sanitizeCustomerPortalRows(basePackage.lineItems),
  };
}

function sanitizeCustomerPortalPricingOptions(pricingOptions = []) {
  return sanitizeCustomerPortalRows(pricingOptions).map((option) => ({
    ...sanitizeCustomerPortalObject(option),
    images: sanitizeCustomerPortalImages(option.images),
    lineItems: sanitizeCustomerPortalRows(option.lineItems),
    scheduleOfValues: sanitizeCustomerPortalRows(option.scheduleOfValues),
    includedScope: sanitizeCustomerPortalTextList(option.includedScope),
    excludedScope: sanitizeCustomerPortalTextList(option.excludedScope),
    notes: sanitizeCustomerPortalTextList(option.notes),
  }));
}

function sanitizeCustomerPortalOptionalAddOns(optionalAddOns = []) {
  return sanitizeCustomerPortalRows(optionalAddOns).map((addOn) => ({
    ...sanitizeCustomerPortalObject(addOn),
    images: sanitizeCustomerPortalImages(addOn.images),
    appliesTo: sanitizeCustomerPortalTextList(addOn.appliesTo),
    optionTotals: sanitizeCustomerPortalRows(addOn.optionTotals),
    notes: sanitizeCustomerPortalTextList(addOn.notes),
  }));
}

function sanitizeCustomerPortalImages(images = []) {
  return sanitizeCustomerPortalRows(images)
    .map((image) => {
      const src = cleanCustomerPortalText(image.publicUrl || image.signedUrl || image.src || image.imageSrc || image.dataUrl || image.storagePath);

      if (!src && image.uploadRequired === true) {
        return {
          id: cleanCustomerPortalText(image.id),
          label: cleanCustomerPortalText(image.label),
          caption: cleanCustomerPortalText(image.caption),
          uploadRequired: true,
        };
      }

      return removeEmptyCustomerPortalFields({
        id: cleanCustomerPortalText(image.id),
        label: cleanCustomerPortalText(image.label),
        caption: getCustomerSafeImageCaption(image, ""),
        dataUrl: cleanCustomerPortalText(image.dataUrl),
        imageSrc: cleanCustomerPortalText(image.imageSrc),
        publicUrl: cleanCustomerPortalText(image.publicUrl),
        signedUrl: cleanCustomerPortalText(image.signedUrl),
        src,
        storagePath: cleanCustomerPortalText(image.storagePath),
        uploadedAt: cleanCustomerPortalText(image.uploadedAt),
        uploadRequired: image.uploadRequired === true,
      });
    })
    .filter((image) => image.src || image.publicUrl || image.signedUrl || image.dataUrl || image.storagePath || image.uploadRequired);
}

function sanitizeCustomerPortalRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter(isCustomerPortalObject)
    .map((row) => sanitizeCustomerPortalObject(row));
}

function selectCustomerPortalRows(primaryRows, fallbackRows) {
  if (Array.isArray(primaryRows) && primaryRows.length > 0) {
    return primaryRows;
  }

  if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
    return fallbackRows;
  }

  return Array.isArray(primaryRows) ? primaryRows : Array.isArray(fallbackRows) ? fallbackRows : [];
}

function sanitizeCustomerPortalObject(value = {}, allowedKeys = null) {
  if (!isCustomerPortalObject(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([key]) => !isInternalCustomerPortalKey(key))
    .filter(([key]) => !allowedKeys || allowedKeys.includes(key))
    .map(([key, entryValue]) => [key, sanitizeCustomerPortalValue(entryValue)]);

  return removeEmptyCustomerPortalFields(Object.fromEntries(entries));
}

function sanitizeCustomerPortalValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (isCustomerPortalObject(item) ? sanitizeCustomerPortalObject(item) : sanitizeCustomerPortalPrimitive(item))).filter((item) => item !== "");
  }

  if (isCustomerPortalObject(value)) {
    return sanitizeCustomerPortalObject(value);
  }

  return sanitizeCustomerPortalPrimitive(value);
}

function sanitizeCustomerPortalPrimitive(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return cleanCustomerPortalText(value);
}

function sanitizeCustomerPortalTextList(items = []) {
  const source = Array.isArray(items) ? items : String(items ?? "").split(/\r?\n/);

  return source.map((item) => cleanCustomerPortalText(item)).filter(Boolean);
}

function removeEmptyCustomerPortalFields(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => {
      if (entryValue === "" || entryValue === null || entryValue === undefined) {
        return false;
      }

      if (Array.isArray(entryValue)) {
        return entryValue.length > 0;
      }

      if (isCustomerPortalObject(entryValue)) {
        return Object.keys(entryValue).length > 0;
      }

      return true;
    }),
  );
}

function toCustomerPortalNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isInternalCustomerPortalKey(key = "") {
  return /^(activity|admin|ai|backup|debug|internal|permission|pending|rawSmartPaste|smartPaste|staged|team)/i.test(String(key || ""));
}

function isCustomerPortalObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
