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
