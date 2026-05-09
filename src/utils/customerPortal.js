import { BASE_PLUS_ADDONS_PRICING_MODE, CHOOSE_ONE_PRICING_MODE } from "./proposalPacket/residentialPricing.js";

const customerPortalTokenPrefix = "lyp_";
const customerPortalTokenByteLength = 18;
const customerSelectionStatuses = ["none", "submitted", "reviewed"];

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

export async function submitCustomerPortalSelectionByToken(
  shareToken = "",
  selection = {},
  { endpoint = "/api/customer-proposal", fetchImpl = globalThis.fetch } = {},
) {
  const token = normalizeCustomerShareToken(shareToken);

  if (!token) {
    return {
      available: false,
      ok: false,
      proposal: null,
      reason: "missing-token",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      available: false,
      ok: false,
      proposal: null,
      reason: "api-unavailable",
    };
  }

  try {
    const response = await fetchImpl(endpoint, {
      body: JSON.stringify({
        shareToken: token,
        selection,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = await readCustomerPortalJsonResponse(response);

    if (!response.ok) {
      return {
        available: false,
        ok: false,
        proposal: null,
        reason:
          payload.reason ||
          (response.status === 503 ? "unconfigured" : response.status === 410 ? "expired" : response.status === 403 ? "disabled" : "api-unavailable"),
      };
    }

    return {
      available: payload.available === true,
      customerSelection: normalizeCustomerSelection(payload.customerSelection),
      ok: payload.ok === true,
      proposal: payload.proposal || null,
      reason: payload.reason || (payload.available ? "available" : "not-found"),
    };
  } catch {
    return {
      available: false,
      ok: false,
      proposal: null,
      reason: "api-unavailable",
    };
  }
}

export function createDefaultCustomerSelection(overrides = {}) {
  return normalizeCustomerSelection(overrides);
}

export function normalizeCustomerSelection(selection = {}) {
  const sourceSelection = isCustomerPortalObject(selection) ? selection : {};
  const status = customerSelectionStatuses.includes(sourceSelection.status) ? sourceSelection.status : "none";

  return {
    status,
    submittedAt: cleanCustomerPortalText(sourceSelection.submittedAt),
    selectedPricingMode: cleanCustomerPortalText(sourceSelection.selectedPricingMode),
    selectedOptionId: cleanCustomerPortalText(sourceSelection.selectedOptionId),
    selectedOptionName: cleanCustomerPortalText(sourceSelection.selectedOptionName),
    selectedAddOnIds: sanitizeCustomerPortalTextList(sourceSelection.selectedAddOnIds),
    selectedAddOnNames: sanitizeCustomerPortalTextList(sourceSelection.selectedAddOnNames),
    selectedTotal: toCustomerPortalNumber(sourceSelection.selectedTotal),
    selectedDownPayment: toCustomerPortalNumber(sourceSelection.selectedDownPayment),
    selectedFinalPayment: toCustomerPortalNumber(sourceSelection.selectedFinalPayment),
    customerName: cleanCustomerPortalText(sourceSelection.customerName),
    customerEmail: cleanCustomerPortalText(sourceSelection.customerEmail),
    customerPhone: cleanCustomerPortalText(sourceSelection.customerPhone),
    customerNotes: cleanCustomerPortalLongText(sourceSelection.customerNotes),
  };
}

export function createCustomerPortalSelectionDraft(proposal = {}) {
  const existingSelection = normalizeCustomerSelection(proposal.customerSelection);
  const hasSubmittedSelection = existingSelection.status !== "none";
  const selectionSummary = calculateCustomerSelectionSummary(proposal, hasSubmittedSelection ? existingSelection : {});
  const client = isCustomerPortalObject(proposal.client) ? proposal.client : {};

  return {
    customerEmail: existingSelection.customerEmail || cleanCustomerPortalText(client.email),
    customerName: existingSelection.customerName || cleanCustomerPortalText(client.contactName || client.companyName),
    customerNotes: existingSelection.customerNotes,
    customerPhone: existingSelection.customerPhone || cleanCustomerPortalText(client.phone),
    selectedAddOnIds: hasSubmittedSelection ? existingSelection.selectedAddOnIds : selectionSummary.selectedAddOnIds,
    selectedOptionId: hasSubmittedSelection ? existingSelection.selectedOptionId : selectionSummary.selectedOptionId,
    selectedPricingMode: selectionSummary.selectedPricingMode,
  };
}

export function buildSubmittedCustomerSelection(proposal = {}, selection = {}, submittedAt = new Date().toISOString()) {
  const summary = calculateCustomerSelectionSummary(proposal, selection);

  return normalizeCustomerSelection({
    status: "submitted",
    submittedAt,
    selectedPricingMode: summary.selectedPricingMode,
    selectedOptionId: summary.selectedOptionId,
    selectedOptionName: summary.selectedOptionName,
    selectedAddOnIds: summary.selectedAddOnIds,
    selectedAddOnNames: summary.selectedAddOnNames,
    selectedTotal: summary.selectedTotal,
    selectedDownPayment: summary.selectedDownPayment,
    selectedFinalPayment: summary.selectedFinalPayment,
    customerName: selection.customerName,
    customerEmail: selection.customerEmail,
    customerPhone: selection.customerPhone,
    customerNotes: selection.customerNotes,
  });
}

export function calculateCustomerSelectionSummary(proposal = {}, selection = {}) {
  const pricing = isCustomerPortalObject(proposal.pricing) ? proposal.pricing : {};
  const selectedPricingMode = cleanCustomerPortalText(selection.selectedPricingMode || proposal.pricingMode || pricing.pricingMode);
  const addOns = selectCustomerPortalRows(proposal.optionalAddOns, pricing.optionalAddOns);
  const selectedAddOnIds = getSelectedCustomerAddOnIds(addOns, selection);

  if (selectedPricingMode === CHOOSE_ONE_PRICING_MODE) {
    const options = selectCustomerPortalRows(proposal.pricingOptions, pricing.pricingOptions);
    const selectedOption = selectCustomerPortalOption(options, selection.selectedOptionId);
    const selectedOptionId = selectedOption ? getCustomerSelectionItemId(selectedOption.item, selectedOption.index, "option") : "";
    const selectedOptionName = selectedOption?.item?.name || "";
    const optionPrice = toCustomerPortalNumber(selectedOption?.item?.price ?? selectedOption?.item?.amount ?? selectedOption?.item?.total);
    const selectedAddOns = addOns
      .map((addOn, index) => ({ addOn, id: getCustomerSelectionItemId(addOn, index, "addon"), index }))
      .filter(({ addOn, id }) => selectedAddOnIds.includes(id) && doesCustomerAddOnApplyToOption(addOn, selectedOption?.item));
    const addOnsTotal = selectedAddOns.reduce((sum, { addOn }) => sum + toCustomerPortalNumber(addOn.amount ?? addOn.price ?? addOn.total), 0);
    const selectedTotal = optionPrice + addOnsTotal;
    const selectedDownPayment = toCustomerPortalNumber(selectedOption?.item?.downPayment) || optionPrice / 2;
    const selectedFinalPayment = toCustomerPortalNumber(selectedOption?.item?.finalPayment) || optionPrice / 2;

    return {
      selectedPricingMode,
      selectedOptionId,
      selectedOptionName,
      selectedAddOnIds: selectedAddOns.map(({ id }) => id),
      selectedAddOnNames: selectedAddOns.map(({ addOn }) => cleanCustomerPortalText(addOn.name)).filter(Boolean),
      selectedTotal,
      selectedDownPayment: selectedDownPayment + addOnsTotal / 2,
      selectedFinalPayment: selectedFinalPayment + addOnsTotal / 2,
    };
  }

  if (selectedPricingMode === BASE_PLUS_ADDONS_PRICING_MODE) {
    const basePrice = getCustomerPortalBasePackagePrice(proposal);
    const selectedAddOns = addOns
      .map((addOn, index) => ({ addOn, id: getCustomerSelectionItemId(addOn, index, "addon") }))
      .filter(({ id }) => selectedAddOnIds.includes(id));
    const addOnsTotal = selectedAddOns.reduce((sum, { addOn }) => sum + toCustomerPortalNumber(addOn.amount ?? addOn.price ?? addOn.total), 0);
    const selectedTotal = basePrice + addOnsTotal;

    return {
      selectedPricingMode,
      selectedOptionId: "",
      selectedOptionName: "",
      selectedAddOnIds: selectedAddOns.map(({ id }) => id),
      selectedAddOnNames: selectedAddOns.map(({ addOn }) => cleanCustomerPortalText(addOn.name)).filter(Boolean),
      selectedTotal,
      selectedDownPayment: selectedTotal / 2,
      selectedFinalPayment: selectedTotal / 2,
    };
  }

  const fallbackTotal = toCustomerPortalNumber(proposal.revisedTotal ?? proposal.totalAmount ?? pricing.totalProposal ?? pricing.total ?? 0);

  return {
    selectedPricingMode,
    selectedOptionId: "",
    selectedOptionName: "",
    selectedAddOnIds: [],
    selectedAddOnNames: [],
    selectedTotal: fallbackTotal,
    selectedDownPayment: fallbackTotal / 2,
    selectedFinalPayment: fallbackTotal / 2,
  };
}

export function getCustomerSelectionItemId(item = {}, index = 0, prefix = "item") {
  return cleanCustomerPortalText(item.id || item.optionId || item.addOnId || item.name) || `${prefix}-${index + 1}`;
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
    customerSelection: normalizeCustomerSelection(proposal.customerSelection),
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

function cleanCustomerPortalLongText(value = "") {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, 2000);
}

function getCustomerPortalBasePackagePrice(proposal = {}) {
  const pricing = isCustomerPortalObject(proposal.pricing) ? proposal.pricing : {};
  const basePackage = isCustomerPortalObject(pricing.basePackage) ? pricing.basePackage : {};
  const explicitBase = toCustomerPortalNumber(basePackage.total ?? basePackage.price ?? basePackage.amount ?? pricing.baseBid ?? proposal.baseBid);

  if (explicitBase > 0) {
    return explicitBase;
  }

  return selectCustomerPortalRows(proposal.lineItems, pricing.lineItems).reduce((sum, item) => {
    const amount = toCustomerPortalNumber(item.amount ?? item.total);
    const quantity = toCustomerPortalNumber(item.quantity ?? item.qty) || 1;
    const unitPrice = toCustomerPortalNumber(item.unitPrice ?? item.rate ?? item.price);

    return sum + (amount || quantity * unitPrice);
  }, 0);
}

function selectCustomerPortalOption(options = [], selectedOptionId = "") {
  const normalizedSelectedOptionId = cleanCustomerPortalText(selectedOptionId);
  const optionRows = selectCustomerPortalRows(options).map((item, index) => ({
    id: getCustomerSelectionItemId(item, index, "option"),
    index,
    item,
  }));

  return (
    optionRows.find((option) => option.id === normalizedSelectedOptionId || cleanCustomerPortalText(option.item.name) === normalizedSelectedOptionId) ||
    optionRows.find((option) => option.item?.selected || option.item?.included) ||
    optionRows[0] ||
    null
  );
}

function getSelectedCustomerAddOnIds(addOns = [], selection = {}) {
  if (Object.prototype.hasOwnProperty.call(selection, "selectedAddOnIds")) {
    return sanitizeCustomerPortalTextList(selection.selectedAddOnIds);
  }

  return selectCustomerPortalRows(addOns)
    .map((addOn, index) => ({ addOn, id: getCustomerSelectionItemId(addOn, index, "addon") }))
    .filter(({ addOn }) => addOn?.selected || addOn?.included)
    .map(({ id }) => id);
}

function doesCustomerAddOnApplyToOption(addOn = {}, option = {}) {
  const appliesTo = sanitizeCustomerPortalTextList(addOn.appliesTo).map((value) => value.toLowerCase());

  if (!option || appliesTo.length === 0) {
    return true;
  }

  const optionId = cleanCustomerPortalText(option.id).toLowerCase();
  const optionName = cleanCustomerPortalText(option.name).toLowerCase();

  return appliesTo.some((value) => value === "all" || value === optionId || value === optionName || optionName.includes(value) || value.includes(optionName));
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
