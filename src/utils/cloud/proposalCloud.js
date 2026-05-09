import { supabase } from "../../supabaseClient.js";
import {
  CUSTOMER_APPROVAL_STATUS_APPROVED_SIGNED,
  CUSTOMER_APPROVAL_STATUS_CHANGE_REQUESTED,
  CUSTOMER_APPROVAL_STATUS_NONE,
  CUSTOMER_SELECTION_STATUS_APPROVAL_SENT,
  CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED,
  CUSTOMER_SELECTION_STATUS_APPLIED,
  CUSTOMER_SELECTION_STATUS_CHANGE_REQUESTED,
  CUSTOMER_SELECTION_STATUS_NONE,
  CUSTOMER_SELECTION_STATUS_REVIEWED,
  CUSTOMER_SELECTION_STATUS_SUBMITTED,
  normalizeCustomerApproval,
  normalizeCustomerSelection,
  normalizeCustomerShareToken,
} from "../customerPortal.js";
import { createCloudFallbackId, isPlainObject, isUuid } from "./cloudSync.js";

const customerSelectionStatusRank = {
  [CUSTOMER_SELECTION_STATUS_NONE]: 0,
  [CUSTOMER_SELECTION_STATUS_SUBMITTED]: 10,
  [CUSTOMER_SELECTION_STATUS_REVIEWED]: 20,
  [CUSTOMER_SELECTION_STATUS_APPLIED]: 30,
  [CUSTOMER_SELECTION_STATUS_APPROVAL_SENT]: 40,
  [CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED]: 50,
  [CUSTOMER_SELECTION_STATUS_CHANGE_REQUESTED]: 50,
};
const customerApprovalStatusRank = {
  [CUSTOMER_APPROVAL_STATUS_NONE]: 0,
  [CUSTOMER_APPROVAL_STATUS_CHANGE_REQUESTED]: 40,
  [CUSTOMER_APPROVAL_STATUS_APPROVED_SIGNED]: 50,
};
const cloudProposalRowStatuses = new Set(["draft", "sent", "approved", "rejected", "expired", "archived"]);
const cloudProposalRowStatusByWorkflowStatus = {
  accepted_deposit_due: "approved",
  awaiting_customer_approval: "sent",
  customer_selection_submitted: "sent",
  selection_reviewed: "sent",
};
const defaultCloudProposalPageSize = 25;
const retryCloudProposalPageSize = 10;
const maxCloudProposalPayloadBytes = 2 * 1024 * 1024;
const cloudProposalFullSelectColumns = "id,proposal_data,created_at,updated_at";
const cloudProposalSummarySelectColumns = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "proposal_number",
  "proposal_type",
  "packet_mode",
  "project_name",
  "client_name",
  "proposal_mode",
  "pricing_mode",
  "total_amount",
  "customer_share_enabled",
  "customer_share_token",
  "customer_share_expires_at",
  "customer_selection_status",
  "customer_approval_status",
  "proposal_status",
].join(",");
const cloudProposalMinimalSummarySelectColumns = "id,created_at,updated_at,status,proposal_number,proposal_type,packet_mode";
const cloudProposalSummaryColumnsMissingWarning =
  "Cloud proposal summary columns are missing. Run the Supabase summary-column migration; showing a basic cloud proposal list.";
const cloudProposalListTimeoutMessage = "Cloud proposal list timed out because full proposal data is too large. Local drafts are still safe.";
const localOnlyImageCloudSaveWarning = "Some photos are stored locally only until uploaded to cloud storage.";
const failedImageCloudUploadWarning = "Some photos could not be uploaded to cloud storage yet. They may not appear for customers until uploaded.";
const cloudSaveBlockedLargePayloadMessage =
  "Cloud save blocked because this proposal contains too much embedded image data. Local draft is still saved. Upload photos to cloud storage or remove/compress photos.";
const cloudSaveNetworkFailureMessage = "Cloud save failed before Supabase returned details. Your local draft is still saved.";
const embeddedImageFieldNames = new Set(["dataUrl", "src", "imageSrc", "publicUrl", "signedUrl", "thumbnailUrl", "url"]);
const cloudProposalListSummaryOnlyProperty = "__lastYardCloudListSummaryOnly";

function normalizeProposalForCloud(proposal = {}, deps = {}, options = {}) {
  const lightweightNormalizer = options.forCollection ? deps.normalizeProposalForCollection : null;
  const summaryOnly = isCloudProposalListSummaryOnly(proposal);
  let normalizedProposal;

  if (lightweightNormalizer) {
    normalizedProposal = lightweightNormalizer(proposal);
  } else if (deps.normalizeProposal) {
    normalizedProposal = deps.normalizeProposal(proposal);
  } else {
    normalizedProposal = {
      ...proposal,
      id: proposal.id || createCloudFallbackId("proposal"),
    };
  }

  return summaryOnly ? attachCloudProposalListSummaryOnly(normalizedProposal) : normalizedProposal;
}

function createProposalId(deps = {}) {
  return deps.createProposalId ? deps.createProposalId() : createCloudFallbackId("proposal");
}

function getProposalTimestamp(proposal = {}, deps = {}) {
  if (deps.getProposalTimestamp) {
    return deps.getProposalTimestamp(proposal);
  }

  const value = proposal.updatedAt || proposal.createdAt || proposal.proposalDate || "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function loadOrMergeCloudProposals(companyId, localProposals = [], deps = {}, labels = {}) {
  const cloudProposals = await fetchCloudProposals(companyId, deps);
  const cloudLoadWarning = getCloudProposalLoadWarning(cloudProposals);
  const normalizedLocalProposals = localProposals.filter(isPlainObject).map((proposal) => normalizeProposalForCloud(proposal, deps, { forCollection: true }));
  const syncedLabel = labels.syncedLabel || "Synced";
  const needsSyncLabel = labels.needsSyncLabel || "Needs sync";

  if (cloudProposals.length === 0 && normalizedLocalProposals.length > 0) {
    return {
      message: withCloudProposalLoadWarning(
        `Cloud has no proposals yet. Use Push Local Proposals to upload ${normalizedLocalProposals.length} local proposal${normalizedLocalProposals.length === 1 ? "" : "s"}.`,
        cloudLoadWarning,
      ),
      proposals: normalizedLocalProposals,
      status: needsSyncLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length === 0) {
    return {
      message: withCloudProposalLoadWarning(`Loaded ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"}.`, cloudLoadWarning),
      proposals: cloudProposals,
      status: cloudLoadWarning ? needsSyncLabel : syncedLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length > 0) {
    const mergeResult = mergeProposalCollections(normalizedLocalProposals, cloudProposals, deps);

    return {
      message: withCloudProposalLoadWarning(
        mergeResult.warning || `Merged ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"} with local proposals.`,
        cloudLoadWarning,
      ),
      proposals: mergeResult.proposals,
      status: mergeResult.needsSync || cloudLoadWarning ? needsSyncLabel : syncedLabel,
    };
  }

  return {
    message: "No cloud proposals found yet.",
    proposals: [],
    status: syncedLabel,
  };
}

export async function fetchCloudProposals(companyId, deps = {}) {
  const client = getSupabaseClient(deps);
  const proposals = [];
  let start = 0;
  let pageSize = normalizeCloudProposalPageSize(deps.cloudProposalPageSize, defaultCloudProposalPageSize);
  const smallerPageSize = normalizeCloudProposalPageSize(deps.cloudProposalRetryPageSize, retryCloudProposalPageSize);
  let retriedAfterTimeout = false;
  let useMinimalSummaryColumns = false;
  const warnings = [];

  while (true) {
    let rows;

    try {
      rows = await fetchCloudProposalPage(client, companyId, start, pageSize, { minimalColumns: useMinimalSummaryColumns });
    } catch (error) {
      if (isMissingOptionalCloudSummaryColumnError(error) && !useMinimalSummaryColumns) {
        useMinimalSummaryColumns = true;
        proposals.length = 0;
        start = 0;
        warnings.push(cloudProposalSummaryColumnsMissingWarning);
        continue;
      }

      if (isStatementTimeoutError(error) && !retriedAfterTimeout && smallerPageSize < pageSize) {
        pageSize = smallerPageSize;
        retriedAfterTimeout = true;
        continue;
      }

      if (isStatementTimeoutError(error) && proposals.length > 0) {
        return attachCloudProposalLoadWarning(
          proposals,
          joinCloudProposalWarnings(
            warnings,
            `${cloudProposalListTimeoutMessage} Showing partial cloud results after ${proposals.length} proposal${proposals.length === 1 ? "" : "s"}.`,
          ),
        );
      }

      if (isStatementTimeoutError(error)) {
        throw createCloudProposalStatementTimeoutError(error);
      }

      throw error;
    }

    rows
      .map((row) => safelyNormalizeCloudProposalRow(row, deps, { forCollection: true }))
      .filter(Boolean)
      .forEach((proposal) => proposals.push(proposal));

    if (rows.length < pageSize) {
      break;
    }

    start += rows.length;
  }

  return warnings.length > 0 ? attachCloudProposalLoadWarning(proposals, joinCloudProposalWarnings(warnings)) : proposals;
}

export async function fetchCloudProposalByShareToken(shareToken, deps = {}) {
  const normalizedToken = normalizeCustomerShareToken(shareToken);

  if (!normalizedToken) {
    return null;
  }

  const client = getSupabaseClient(deps);
  let row = null;

  try {
    row = await fetchCloudProposalRowByShareTokenColumn(client, normalizedToken);
  } catch (error) {
    if (!isMissingOptionalCloudSummaryColumnError(error)) {
      throw error;
    }
  }

  if (!row) {
    row = await fetchCloudProposalRowByShareTokenJson(client, normalizedToken);
  }

  return row ? normalizeCloudProposalRow(row, deps, { forCollection: false }) : null;
}

async function fetchCloudProposalRowByShareTokenColumn(client, normalizedToken) {
  const { data, error } = await client
    .from("proposals")
    .select(cloudProposalFullSelectColumns)
    .eq("customer_share_token", normalizedToken)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function fetchCloudProposalRowByShareTokenJson(client, normalizedToken) {
  const { data, error } = await client
    .from("proposals")
    .select(cloudProposalFullSelectColumns)
    .filter("proposal_data->>customerShareToken", "eq", normalizedToken)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function fetchCloudProposalById(companyId, proposalId, deps = {}) {
  const normalizedProposalId = String(proposalId || "").trim();

  if (!companyId || !normalizedProposalId) {
    return null;
  }

  const client = getSupabaseClient(deps);
  const row = await findCloudProposalRow(companyId, normalizedProposalId, client);

  return row ? normalizeCloudProposalRow(row, deps, { forCollection: false }) : null;
}

export async function saveCloudProposals(companyId, proposals = [], deps = {}) {
  const savedProposals = [];

  for (const proposal of proposals.filter(isPlainObject)) {
    if (isCloudProposalListSummaryOnly(proposal)) {
      savedProposals.push(proposal);
      continue;
    }

    savedProposals.push(await saveCloudProposal(companyId, proposal, deps));
  }

  return savedProposals;
}

export function mergeLocalImageSourcesIntoCloudSyncedProposal(localProposal = {}, cloudProposal = {}) {
  if (!isPlainObject(localProposal) || !isPlainObject(cloudProposal)) {
    return cloudProposal;
  }

  return mergeLocalImageSourcesInValue(localProposal, cloudProposal);
}

export async function saveCloudProposal(companyId, proposal, deps = {}) {
  const client = getSupabaseClient(deps);
  const sourceUpdatedAt = getProposalTimestamp(proposal, deps);
  const normalizedProposal = normalizeProposalForCloud(
    {
      ...proposal,
      updatedAt: proposal.updatedAt || new Date().toISOString(),
    },
    deps,
  );
  const existingRow = await findCloudProposalRow(companyId, normalizedProposal.id, client);
  const existingProposal = existingRow ? normalizeCloudProposalRow(existingRow, deps, { forCollection: false }) : null;
  const proposalToSave = existingProposal
    ? mergeCloudPortalFieldsForSave(normalizedProposal, existingProposal, {
        cloudTimestamp: getProposalTimestamp(existingProposal, deps),
        sourceUpdatedAt,
      })
    : normalizedProposal;
  const imageReadyProposal = syncCloudResidentialPricingImageCollections(proposalToSave);
  const imageUploadResult = await uploadLocalProposalImagesToStorage(companyId, imageReadyProposal, deps);
  const cloudSaveSanitization = sanitizeProposalDataForCloudSave(imageUploadResult.proposal);
  const row = createCloudProposalRow(companyId, cloudSaveSanitization.proposalData, deps);
  assertCloudProposalPayloadSize(row.proposal_data, deps);
  const targetRowId = row.id || existingRow?.id || "";

  try {
    await writeCloudProposalRow(client, row, targetRowId);
  } catch (error) {
    if (!shouldRetryWithCompatibleProposalRow(error)) {
      throw error;
    }

    await writeCloudProposalRow(client, createCompatibleCloudProposalRow(row), targetRowId);
  }

  return attachCloudProposalSaveWarning(imageUploadResult.proposal, [imageUploadResult.warning, cloudSaveSanitization.warning].filter(Boolean).join(" "));
}

function syncCloudResidentialPricingImageCollections(proposal = {}) {
  if (!isPlainObject(proposal)) {
    return proposal;
  }

  const pricing = isPlainObject(proposal.pricing) ? proposal.pricing : {};
  const nextPricing = { ...pricing };
  const nextProposal = {
    ...proposal,
    pricing: nextPricing,
  };

  syncCloudResidentialPricingCollection(nextProposal, nextPricing, "pricingOptions");
  syncCloudResidentialPricingCollection(nextProposal, nextPricing, "optionalAddOns");

  return nextProposal;
}

function syncCloudResidentialPricingCollection(nextProposal, nextPricing, collectionKey) {
  const rootRows = Array.isArray(nextProposal[collectionKey]) ? nextProposal[collectionKey] : [];
  const nestedRows = Array.isArray(nextPricing[collectionKey]) ? nextPricing[collectionKey] : [];

  if (rootRows.length === 0 && nestedRows.length === 0) {
    return;
  }

  const mergedRows = mergeCloudResidentialPricingRows(rootRows, nestedRows);
  nextProposal[collectionKey] = mergedRows;
  nextPricing[collectionKey] = mergedRows.map((row) => ({ ...row }));
}

function mergeCloudResidentialPricingRows(primaryRows = [], fallbackRows = []) {
  if (primaryRows.length === 0) {
    return fallbackRows;
  }

  if (fallbackRows.length === 0) {
    return primaryRows;
  }

  const usedFallbackIndexes = new Set();
  const mergedRows = primaryRows.map((row, index) => {
    const fallbackIndex = findMatchingCloudPricingRowIndex(fallbackRows, row, index, usedFallbackIndexes);

    if (fallbackIndex < 0) {
      return row;
    }

    usedFallbackIndexes.add(fallbackIndex);
    return mergeCloudResidentialPricingRow(row, fallbackRows[fallbackIndex]);
  });

  fallbackRows.forEach((row, index) => {
    if (!usedFallbackIndexes.has(index)) {
      mergedRows.push(row);
    }
  });

  return mergedRows;
}

function findMatchingCloudPricingRowIndex(rows = [], row = {}, preferredIndex = 0, usedIndexes = new Set()) {
  const rowKeys = getCloudPricingRowMergeKeys(row);

  if (rowKeys.length > 0) {
    const matchingIndex = rows.findIndex((candidate, index) => {
      if (usedIndexes.has(index)) {
        return false;
      }

      const candidateKeys = new Set(getCloudPricingRowMergeKeys(candidate));
      return rowKeys.some((key) => candidateKeys.has(key));
    });

    if (matchingIndex >= 0) {
      return matchingIndex;
    }
  }

  return usedIndexes.has(preferredIndex) || preferredIndex >= rows.length ? -1 : preferredIndex;
}

function getCloudPricingRowMergeKeys(row = {}) {
  return [row?.id, row?.optionId, row?.addOnId, row?.name, row?.label]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function mergeCloudResidentialPricingRow(primaryRow = {}, fallbackRow = {}) {
  if (!isPlainObject(primaryRow) || !isPlainObject(fallbackRow)) {
    return primaryRow;
  }

  return {
    ...fallbackRow,
    ...primaryRow,
    images: mergeCloudImageRows(primaryRow.images, fallbackRow.images),
  };
}

function mergeCloudImageRows(primaryImages = [], fallbackImages = []) {
  const primaryRows = Array.isArray(primaryImages) ? primaryImages : [];
  const fallbackRows = Array.isArray(fallbackImages) ? fallbackImages : [];

  if (primaryRows.length === 0) {
    return fallbackRows;
  }

  if (fallbackRows.length === 0) {
    return primaryRows;
  }

  const usedFallbackIndexes = new Set();
  const mergedRows = primaryRows.map((image, index) => {
    const fallbackIndex = findMatchingCloudImageIndex(fallbackRows, image, index, usedFallbackIndexes);

    if (fallbackIndex < 0) {
      return image;
    }

    usedFallbackIndexes.add(fallbackIndex);
    const fallbackImage = fallbackRows[fallbackIndex];
    const primaryHasSource = hasAnyImageSource(image);
    const fallbackHasSource = hasAnyImageSource(fallbackImage);

    return {
      ...fallbackImage,
      ...image,
      ...(primaryHasSource ? {} : fallbackHasSource ? fallbackImage : {}),
    };
  });

  fallbackRows.forEach((image, index) => {
    if (!usedFallbackIndexes.has(index)) {
      mergedRows.push(image);
    }
  });

  return mergedRows;
}

function findMatchingCloudImageIndex(rows = [], image = {}, preferredIndex = 0, usedIndexes = new Set()) {
  const imageKeys = getImageMergeKeys(image);

  if (imageKeys.length > 0) {
    const matchingIndex = rows.findIndex((candidate, index) => {
      if (usedIndexes.has(index)) {
        return false;
      }

      const candidateKeys = new Set(getImageMergeKeys(candidate));
      return imageKeys.some((key) => candidateKeys.has(key));
    });

    if (matchingIndex >= 0) {
      return matchingIndex;
    }
  }

  return usedIndexes.has(preferredIndex) || preferredIndex >= rows.length ? -1 : preferredIndex;
}

async function writeCloudProposalRow(client, row, targetRowId = "") {
  if (row.id) {
    const { error } = await client.from("proposals").upsert(row, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return;
  }

  if (targetRowId) {
    const { error } = await client.from("proposals").update(row).eq("id", targetRowId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await client.from("proposals").insert(row);

  if (error) {
    throw error;
  }
}

async function findCloudProposalRow(companyId, proposalId, client = getSupabaseClient()) {
  const normalizedProposalId = String(proposalId || "").trim();

  if (!companyId || !normalizedProposalId) {
    return null;
  }

  if (isUuid(normalizedProposalId)) {
    const { data, error } = await client
      .from("proposals")
      .select(cloudProposalFullSelectColumns)
      .eq("company_id", companyId)
      .eq("id", normalizedProposalId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  const { data, error } = await client
    .from("proposals")
    .select(cloudProposalFullSelectColumns)
    .eq("company_id", companyId)
    .filter("proposal_data->>id", "eq", normalizedProposalId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function createCloudProposalRow(companyId, proposal, deps = {}) {
  const normalizedProposal = normalizeProposalForCloud(proposal, deps);
  const proposalListSummary = createCloudProposalListSummary(normalizedProposal);
  const proposalData = {
    ...normalizedProposal,
    proposalListSummary,
  };
  const pricingMode = getCloudProposalSummaryPricingMode(normalizedProposal);
  const customerSelection = normalizeCustomerSelection(normalizedProposal.customerSelection);
  const customerApproval = normalizeCustomerApproval(normalizedProposal.customerApproval);
  const row = {
    client_name: proposalListSummary.clientName || proposalListSummary.contactName || "",
    company_id: companyId,
    contact_id: isUuid(normalizedProposal.contactId) ? normalizedProposal.contactId : null,
    customer_approval_status: customerApproval.status || CUSTOMER_APPROVAL_STATUS_NONE,
    customer_selection_status: customerSelection.status || CUSTOMER_SELECTION_STATUS_NONE,
    customer_share_enabled: normalizedProposal.customerShareEnabled === true,
    customer_share_expires_at: normalizedProposal.customerShareExpiresAt || null,
    customer_share_token: normalizeCustomerShareToken(normalizedProposal.customerShareToken) || null,
    packet_mode: normalizedProposal.packetMode || "summary",
    pricing_mode: pricingMode,
    project_name: proposalListSummary.projectName || "",
    proposal_mode: proposalListSummary.proposalMode || "",
    proposal_data: proposalData,
    proposal_number: normalizedProposal.proposalNumber || "",
    proposal_status: normalizedProposal.status || "draft",
    proposal_type: normalizedProposal.proposalType || normalizedProposal.type || "",
    status: getCloudProposalRowStatus(normalizedProposal.status),
    total_amount: proposalListSummary.total || 0,
    updated_at: normalizedProposal.updatedAt || new Date().toISOString(),
  };

  if (isUuid(normalizedProposal.id)) {
    row.id = normalizedProposal.id;
  }

  return row;
}

function createCompatibleCloudProposalRow(row = {}) {
  const compatibleRow = {
    company_id: row.company_id,
    proposal_data: row.proposal_data,
    status: row.status || getCloudProposalRowStatus(row.proposal_data?.status),
    updated_at: row.updated_at || row.proposal_data?.updatedAt || new Date().toISOString(),
  };

  if (row.id) {
    compatibleRow.id = row.id;
  }

  return compatibleRow;
}

function shouldRetryWithCompatibleProposalRow(error = {}) {
  const combined = getCloudErrorText(error);
  const mentionsOptionalColumn =
    /(contact_id|packet_mode|proposal_number|proposal_type|project_name|client_name|proposal_mode|pricing_mode|total_amount|customer_share_enabled|customer_share_token|customer_share_expires_at|customer_selection_status|customer_approval_status|proposal_status)/i.test(
      combined,
    );
  return mentionsOptionalColumn && /(column|schema cache|pgrst204|42703)/i.test(combined);
}

export function getCloudProposalRowStatus(status = "") {
  const normalizedStatus = String(status || "draft").trim().toLowerCase();

  if (cloudProposalRowStatuses.has(normalizedStatus)) {
    return normalizedStatus;
  }

  return cloudProposalRowStatusByWorkflowStatus[normalizedStatus] || "draft";
}

export function formatCloudProposalSaveError(error = {}) {
  const message = getCloudErrorMessage(error);
  const code = String(error?.code || error?.status || error?.statusCode || "").trim();
  const combined = getCloudErrorText(error);
  const lowerCombined = combined.toLowerCase();
  let reason = "cloud-save-failed";
  let label = "Cloud save failed";

  if (error?.reason === "cloud-payload-too-large" || /cloud save blocked because this proposal contains too much embedded image data/.test(lowerCombined)) {
    return {
      code,
      message: cloudSaveBlockedLargePayloadMessage,
      reason: "cloud-payload-too-large",
    };
  }

  if (/statement timeout|canceling statement due to statement timeout|57014/.test(lowerCombined)) {
    return {
      code,
      message: cloudProposalListTimeoutMessage,
      reason: "statement-timeout",
    };
  }

  if (/failed to fetch|networkerror|network request failed|\b520\b|\b521\b|origin/.test(lowerCombined)) {
    return {
      code,
      message: cloudSaveNetworkFailureMessage,
      reason: "cloud-save-network-origin-failure",
    };
  }

  if (/supabase is not configured|missing.*supabase|no api key|apikey/.test(lowerCombined)) {
    reason = "missing-env-config";
    label = "Missing Supabase configuration";
  } else if (/auth session|session missing|jwt|not authenticated|invalid login|auth.*missing/.test(lowerCombined)) {
    reason = "missing-auth-session";
    label = "Supabase auth/session missing";
  } else if (/row-level security|rls|permission denied|42501|not authorized|violates row-level security/.test(lowerCombined)) {
    reason = "rls-permission-denied";
    label = "RLS permission denied";
  } else if (/column .* does not exist|schema cache|pgrst204|42703/.test(lowerCombined)) {
    reason = "schema-column-missing";
    label = "Supabase schema mismatch";
  } else if (/check constraint|invalid input value|22p02|23514|enum/.test(lowerCombined)) {
    reason = "invalid-payload-shape";
    label = "Supabase rejected the proposal payload";
  } else if (/413|payload too large|request entity too large|json.*too large|too large/.test(lowerCombined)) {
    reason = "json-too-large";
    label = "Proposal JSON is too large";
  } else if (/failed to fetch|networkerror|network request failed|timeout|timed out/.test(lowerCombined)) {
    reason = "network-error";
    label = "Network error";
  }

  const safeDetail = sanitizeCloudErrorMessage(message);

  return {
    code,
    message: safeDetail ? `${label}: ${safeDetail}` : label,
    reason,
  };
}

export function sanitizeProposalDataForCloudSave(proposal = {}) {
  const stats = {
    localOnlyImages: 0,
    removedEmbeddedImageStrings: 0,
    removedFileObjects: 0,
  };
  const proposalData = sanitizeCloudProposalValue(proposal, {
    currentKey: "",
    parentKey: "",
    stats,
    seen: new WeakSet(),
  });
  const warnings = [];

  if (stats.localOnlyImages > 0) {
    warnings.push(
      `${localOnlyImageCloudSaveWarning} ${stats.localOnlyImages} local-only photo${
        stats.localOnlyImages === 1 ? " was" : "s were"
      } kept as metadata so cloud sync does not send embedded image data.`,
    );
  }

  return {
    payloadBytes: getJsonPayloadSizeBytes(proposalData),
    proposalData: isPlainObject(proposalData) ? proposalData : {},
    stats,
    warning: warnings.join(" "),
  };
}

export function getCloudProposalSaveWarning(proposal = {}) {
  return proposal?.cloudSaveWarning || "";
}

export async function uploadLocalProposalImagesToStorage(companyId, proposal = {}, deps = {}) {
  if (!isPlainObject(proposal)) {
    return {
      failedCount: 0,
      proposal,
      uploadedCount: 0,
      warning: "",
    };
  }

  const uploadImage = typeof deps.uploadLocalProposalImageToStorage === "function" ? deps.uploadLocalProposalImageToStorage : null;
  const uploadCache = new Map();
  const stats = {
    failedCount: 0,
    localOnlyCount: 0,
    uploadedCount: 0,
  };
  const uploadedProposal = await uploadLocalProposalImagesInValue(proposal, {
    companyId,
    currentKey: "",
    parentKey: "",
    path: [],
    proposalId: proposal.id || "",
    stats,
    uploadCache,
    uploadImage,
  });
  const warnings = [];

  if (stats.failedCount > 0) {
    warnings.push(`${failedImageCloudUploadWarning} ${stats.failedCount} photo${stats.failedCount === 1 ? "" : "s"} remained local-only.`);
  } else if (!uploadImage && stats.localOnlyCount > 0) {
    warnings.push(`${failedImageCloudUploadWarning} ${stats.localOnlyCount} local-only photo${stats.localOnlyCount === 1 ? "" : "s"} could not be promoted during this save.`);
  }

  return {
    failedCount: stats.failedCount,
    proposal: isPlainObject(uploadedProposal) ? uploadedProposal : proposal,
    uploadedCount: stats.uploadedCount,
    warning: warnings.join(" "),
  };
}

async function uploadLocalProposalImagesInValue(value, context) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    const uploadedItems = [];

    for (let index = 0; index < value.length; index += 1) {
      uploadedItems.push(
        await uploadLocalProposalImagesInValue(value[index], {
          ...context,
          currentKey: "",
          parentKey: context.currentKey,
          path: [...context.path, index],
        }),
      );
    }

    return uploadedItems;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const imageLike = looksLikeImageMetadataObject(value, context.currentKey, context.parentKey);

  if (imageLike && shouldUploadLocalImageMetadata(value)) {
    return uploadLocalImageMetadata(value, context);
  }

  const nextValue = {};

  for (const [key, entryValue] of Object.entries(value)) {
    nextValue[key] = await uploadLocalProposalImagesInValue(entryValue, {
      ...context,
      currentKey: key,
      parentKey: context.currentKey,
      path: [...context.path, key],
    });
  }

  return nextValue;
}

async function uploadLocalImageMetadata(image, context) {
  context.stats.localOnlyCount += 1;

  if (!context.uploadImage) {
    return image;
  }

  const cacheKey = getLocalImageUploadCacheKey(image);

  if (cacheKey && context.uploadCache.has(cacheKey)) {
    context.stats.uploadedCount += 1;
    return mergeUploadedImageMetadata(image, context.uploadCache.get(cacheKey), context);
  }

  try {
    const uploadedImage = await context.uploadImage(image, {
      area: getCloudImageUploadArea(context.path),
      companyId: context.companyId,
      fileStem: getCloudImageUploadFileStem(image, context.path),
      path: context.path,
      proposalId: context.proposalId,
    });

    if (cacheKey) {
      context.uploadCache.set(cacheKey, uploadedImage);
    }

    context.stats.uploadedCount += 1;
    return mergeUploadedImageMetadata(image, uploadedImage, context);
  } catch {
    context.stats.failedCount += 1;
    return {
      ...image,
      cloudSynced: false,
      localOnly: true,
    };
  }
}

function mergeUploadedImageMetadata(image = {}, uploadedImage = {}, context = {}) {
  const publicSource = uploadedImage.publicUrl || uploadedImage.signedUrl || uploadedImage.src || uploadedImage.imageSrc || "";
  const isPlanImage = getCloudImageUploadArea(context.path) === "plans";

  return {
    ...image,
    ...uploadedImage,
    cloudSynced: true,
    dataUrl: "",
    imageSrc: isPlanImage ? publicSource : uploadedImage.imageSrc || "",
    localOnly: false,
    publicUrl: uploadedImage.publicUrl || image.publicUrl || "",
    signedUrl: uploadedImage.signedUrl || image.signedUrl || "",
    src: publicSource || image.src || "",
    storagePath: uploadedImage.storagePath || image.storagePath || "",
    uploadedAt: uploadedImage.uploadedAt || image.uploadedAt || new Date().toISOString(),
    url: publicSource || "",
  };
}

function shouldUploadLocalImageMetadata(image = {}) {
  return hasLocalImageSource(image) && !hasCloudImageSource(image);
}

function hasLocalImageSource(image = {}) {
  return ["dataUrl", "src", "imageSrc", "url"].some((key) => isEmbeddedImageReference(image?.[key])) || isFileLikeCloudValue(image?.file);
}

function getLocalImageUploadCacheKey(image = {}) {
  return ["storagePath", "publicUrl", "signedUrl", "dataUrl", "src", "imageSrc", "fileName", "id"]
    .map((key) => String(image?.[key] || "").trim())
    .filter(Boolean)
    .join("|");
}

function getCloudImageUploadArea(path = []) {
  const pathText = path.map((part) => String(part).toLowerCase()).join(".");

  if (/plansheets|plan_sheets|plan/.test(pathText)) {
    return "plans";
  }

  if (/pricingoptions|optionaladdons|basepackage|option|add.?on/.test(pathText)) {
    return "option-photos";
  }

  return "featured";
}

function getCloudImageUploadFileStem(image = {}, path = []) {
  return (
    image.id ||
    image.fileName ||
    image.label ||
    image.caption ||
    path
      .map((part) => String(part))
      .filter(Boolean)
      .join("-") ||
    "proposal-photo"
  );
}

function sanitizeCloudProposalValue(value, { currentKey = "", parentKey = "", stats, seen }) {
  if (typeof value === "string") {
    return isEmbeddedImageReference(value) ? undefined : value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (isFileLikeCloudValue(value)) {
    stats.removedFileObjects += 1;
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        sanitizeCloudProposalValue(item, {
          currentKey: "",
          parentKey: currentKey,
          stats,
          seen,
        }),
      )
      .filter((item) => item !== undefined);
  }

  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  const looksLikeImage = looksLikeImageMetadataObject(value, currentKey, parentKey);
  const sanitized = {};
  let removedEmbeddedImageData = false;

  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === "string" && embeddedImageFieldNames.has(key) && isEmbeddedImageReference(entryValue)) {
      removedEmbeddedImageData = true;
      stats.removedEmbeddedImageStrings += 1;
      return;
    }

    const sanitizedValue = sanitizeCloudProposalValue(entryValue, {
      currentKey: key,
      parentKey: currentKey,
      stats,
      seen,
    });

    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    } else if (typeof entryValue === "string" && isEmbeddedImageReference(entryValue)) {
      removedEmbeddedImageData = true;
      stats.removedEmbeddedImageStrings += 1;
    }
  });

  if (looksLikeImage && removedEmbeddedImageData && !hasCloudImageSource(sanitized)) {
    stats.localOnlyImages += 1;
    sanitized.localOnly = true;
    sanitized.cloudSynced = false;
  }

  seen.delete(value);

  return sanitized;
}

function looksLikeImageMetadataObject(value = {}, currentKey = "", parentKey = "") {
  if (!isPlainObject(value)) {
    return false;
  }

  const keyText = `${currentKey} ${parentKey}`.toLowerCase();

  if (/(image|photo|photos|asset|logo|plan|attachment)/.test(keyText)) {
    return true;
  }

  return ["dataUrl", "imageSrc", "storagePath", "publicUrl", "signedUrl", "thumbnailUrl", "fileName", "fileType"].some((key) => key in value);
}

function hasCloudImageSource(image = {}) {
  return ["storagePath", "publicUrl", "signedUrl", "thumbnailUrl", "src", "imageSrc"].some((key) => {
    const value = String(image?.[key] || "").trim();
    return value && !isEmbeddedImageReference(value);
  });
}

function hasAnyImageSource(image = {}) {
  return ["dataUrl", "src", "imageSrc", "url", "publicUrl", "signedUrl", "thumbnailUrl", "storagePath"].some((key) =>
    String(image?.[key] || "").trim(),
  );
}

function getEmbeddedLocalImageSource(image = {}) {
  return ["dataUrl", "src", "imageSrc", "url"]
    .map((key) => String(image?.[key] || "").trim())
    .find(isEmbeddedImageReference) || "";
}

function mergeLocalImageSourcesInValue(localValue, cloudValue) {
  if (Array.isArray(cloudValue)) {
    const localArray = Array.isArray(localValue) ? localValue : [];

    return cloudValue.map((cloudItem, index) => {
      const localItem = findMatchingLocalImageItem(localArray, cloudItem, index);
      return mergeLocalImageSourcesInValue(localItem, cloudItem);
    });
  }

  if (!isPlainObject(cloudValue)) {
    return cloudValue;
  }

  const localObject = isPlainObject(localValue) ? localValue : {};

  if (looksLikeImageMetadataObject(cloudValue) || looksLikeImageMetadataObject(localObject)) {
    return mergeLocalImageSourceIntoCloudImage(localObject, cloudValue);
  }

  return Object.fromEntries(
    Object.entries(cloudValue).map(([key, value]) => [key, mergeLocalImageSourcesInValue(localObject[key], value)]),
  );
}

function findMatchingLocalImageItem(localArray = [], cloudItem = {}, index = 0) {
  if (!isPlainObject(cloudItem)) {
    return localArray[index];
  }

  const cloudKeys = getImageMergeKeys(cloudItem);

  if (cloudKeys.length > 0) {
    const matchingLocal = localArray.find((localItem) => {
      if (!isPlainObject(localItem)) {
        return false;
      }

      const localKeys = new Set(getImageMergeKeys(localItem));
      return cloudKeys.some((key) => localKeys.has(key));
    });

    if (matchingLocal) {
      return matchingLocal;
    }
  }

  return localArray[index];
}

function getImageMergeKeys(image = {}) {
  return ["id", "storagePath", "publicUrl", "signedUrl", "fileName", "originalFileName", "caption", "label"]
    .map((key) => String(image?.[key] || "").trim().toLowerCase())
    .filter(Boolean);
}

function mergeLocalImageSourceIntoCloudImage(localImage = {}, cloudImage = {}) {
  const localSource = getEmbeddedLocalImageSource(localImage);
  const cloudHasSource = hasAnyImageSource(cloudImage);
  const cloudHasCustomerVisibleSource = hasCloudImageSource(cloudImage);

  if (!localSource || cloudHasCustomerVisibleSource) {
    return cloudHasSource
      ? {
          ...cloudImage,
          uploadRequired: false,
        }
      : cloudImage;
  }

  return {
    ...cloudImage,
    dataUrl: localImage.dataUrl || localSource,
    imageSrc: isEmbeddedImageReference(localImage.imageSrc) ? localImage.imageSrc : cloudImage.imageSrc || "",
    localOnly: true,
    src: isEmbeddedImageReference(localImage.src) ? localImage.src : localSource,
    uploadRequired: false,
    cloudSynced: false,
  };
}

function isEmbeddedImageReference(value = "") {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return normalizedValue.startsWith("data:image/") || normalizedValue.startsWith("blob:");
}

function isFileLikeCloudValue(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if ((typeof File !== "undefined" && value instanceof File) || (typeof Blob !== "undefined" && value instanceof Blob)) {
    return true;
  }

  return (
    !isPlainObject(value) &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    ("lastModified" in value || typeof value.arrayBuffer === "function")
  );
}

function assertCloudProposalPayloadSize(proposalData = {}, deps = {}) {
  const limit = Number.parseInt(deps.maxCloudProposalPayloadBytes, 10) || maxCloudProposalPayloadBytes;
  const payloadBytes = getJsonPayloadSizeBytes(proposalData);

  if (payloadBytes <= limit) {
    return;
  }

  const error = new Error(cloudSaveBlockedLargePayloadMessage);
  error.code = "PAYLOAD_TOO_LARGE";
  error.reason = "cloud-payload-too-large";
  error.payloadBytes = payloadBytes;
  error.maxPayloadBytes = limit;
  throw error;
}

function getJsonPayloadSizeBytes(value = {}) {
  const json = JSON.stringify(value) || "";

  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).length;
  }

  return json.length;
}

function attachCloudProposalSaveWarning(proposal = {}, warning = "") {
  if (!warning) {
    return proposal;
  }

  Object.defineProperty(proposal, "cloudSaveWarning", {
    configurable: true,
    enumerable: false,
    value: warning,
  });

  return proposal;
}

async function fetchCloudProposalPage(client, companyId, start, pageSize, { minimalColumns = false } = {}) {
  const end = start + pageSize - 1;
  const { data, error } = await client
    .from("proposals")
    .select(minimalColumns ? cloudProposalMinimalSummarySelectColumns : cloudProposalSummarySelectColumns)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .range(start, end);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function normalizeCloudProposalPageSize(value, fallback) {
  const pageSize = Number.parseInt(value, 10);
  return Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : fallback;
}

function isStatementTimeoutError(error = {}) {
  return /statement timeout|canceling statement due to statement timeout|57014/i.test(getCloudErrorText(error));
}

function createCloudProposalStatementTimeoutError(error = {}) {
  const timeoutError = new Error(cloudProposalListTimeoutMessage);
  timeoutError.code = error?.code || error?.status || "";
  timeoutError.reason = "statement-timeout";
  timeoutError.originalMessage = getCloudErrorMessage(error);
  return timeoutError;
}

function isMissingOptionalCloudSummaryColumnError(error = {}) {
  const combined = getCloudErrorText(error);
  const mentionsSummaryColumn =
    /(project_name|client_name|proposal_mode|pricing_mode|total_amount|customer_share_enabled|customer_share_token|customer_share_expires_at|customer_selection_status|customer_approval_status|proposal_status)/i.test(
      combined,
    );
  return mentionsSummaryColumn && /(column|schema cache|pgrst204|42703)/i.test(combined);
}

function joinCloudProposalWarnings(...warnings) {
  return warnings
    .flat()
    .map((warning) => String(warning || "").trim())
    .filter(Boolean)
    .join(" ");
}

function attachCloudProposalLoadWarning(proposals = [], warning = "") {
  Object.defineProperty(proposals, "cloudLoadWarning", {
    configurable: true,
    enumerable: false,
    value: warning,
  });

  return proposals;
}

export function getCloudProposalLoadWarning(proposals = []) {
  return Array.isArray(proposals) ? proposals.cloudLoadWarning || "" : "";
}

function attachCloudProposalListSummaryOnly(proposal = {}) {
  Object.defineProperty(proposal, cloudProposalListSummaryOnlyProperty, {
    configurable: true,
    enumerable: false,
    value: true,
  });

  return proposal;
}

export function isCloudProposalListSummaryOnly(proposal = {}) {
  return Boolean(proposal?.[cloudProposalListSummaryOnlyProperty]);
}

function withCloudProposalLoadWarning(message = "", warning = "") {
  return warning ? `${warning} ${message}` : message;
}

function createCloudProposalListSummary(proposal = {}) {
  return removeEmptyCloudSummaryFields({
    id: proposal.id || "",
    proposalNumber: proposal.proposalNumber || "",
    clientName: proposal.client?.companyName || proposal.client?.contactName || "",
    contactName: proposal.client?.contactName || "",
    projectName: proposal.project?.name || "",
    proposalMode: proposal.proposalMode || "",
    proposalType: proposal.proposalType || proposal.type || "",
    packetMode: proposal.packetMode || "",
    status: proposal.status || "draft",
    total: getCloudProposalSummaryTotal(proposal),
    updatedAt: proposal.updatedAt || proposal.createdAt || "",
    createdAt: proposal.createdAt || "",
    customerShareEnabled: proposal.customerShareEnabled === true,
  });
}

function removeEmptyCloudSummaryFields(summary = {}) {
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function getCloudProposalSummaryTotal(proposal = {}) {
  const explicitTotal = toCloudSummaryNumber(proposal.revisedTotal ?? proposal.totalAmount ?? proposal.totalProposal);

  if (explicitTotal > 0) {
    return explicitTotal;
  }

  const pricing = isPlainObject(proposal.pricing) ? proposal.pricing : {};
  const pricingTotal = toCloudSummaryNumber(pricing.totalProposal ?? pricing.total ?? pricing.baseBid);

  if (pricingTotal > 0) {
    return pricingTotal;
  }

  return (Array.isArray(proposal.lineItems) ? proposal.lineItems : []).reduce((sum, item) => {
    const amount = toCloudSummaryNumber(item?.amount ?? item?.total);
    const quantity = toCloudSummaryNumber(item?.quantity ?? item?.qty) || 1;
    const unitPrice = toCloudSummaryNumber(item?.unitPrice ?? item?.price ?? item?.rate);

    return sum + (amount || quantity * unitPrice);
  }, 0);
}

function getCloudProposalSummaryPricingMode(proposal = {}) {
  const pricing = isPlainObject(proposal.pricing) ? proposal.pricing : {};
  return String(proposal.pricingMode || pricing.pricingMode || "").trim();
}

function toCloudSummaryNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getCloudErrorMessage(error = {}) {
  if (typeof error === "string") {
    return error;
  }

  return error?.message || error?.error_description || error?.error || error?.details || "Unknown Supabase save error.";
}

function getCloudErrorText(error = {}) {
  if (typeof error === "string") {
    return error;
  }

  return [error?.message, error?.details, error?.hint, error?.code, error?.status, error?.statusCode]
    .filter(Boolean)
    .join(" ");
}

function sanitizeCloudErrorMessage(message = "") {
  return String(message || "")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/g, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9._~-]+/g, "[redacted-token]")
    .replace(/[A-Za-z0-9_-]{32,}\.[A-Za-z0-9._-]{16,}/g, "[redacted-token]")
    .slice(0, 240)
    .trim();
}

function normalizeCloudProposalRow(row = {}, deps = {}, { forCollection = true } = {}) {
  const hasFullProposalData = isPlainObject(row.proposal_data) && Object.keys(row.proposal_data).length > 0;
  const proposalData = hasFullProposalData ? row.proposal_data : createProposalDataFromCloudSummaryRow(row);
  const normalizedProposal = normalizeProposalForCloud(
    {
      ...proposalData,
      id: proposalData.id || row.id,
      createdAt: proposalData.createdAt || row.created_at,
      updatedAt: proposalData.updatedAt || row.updated_at,
    },
    deps,
    { forCollection },
  );

  return hasFullProposalData ? normalizedProposal : attachCloudProposalListSummaryOnly(normalizedProposal);
}

function safelyNormalizeCloudProposalRow(row = {}, deps = {}, options = {}) {
  try {
    return normalizeCloudProposalRow(row, deps, options);
  } catch {
    const hasFullProposalData = isPlainObject(row.proposal_data) && Object.keys(row.proposal_data).length > 0;
    const proposalData = hasFullProposalData ? row.proposal_data : createProposalDataFromCloudSummaryRow(row);
    const normalizedProposal = normalizeProposalForCloud(
      {
        id: proposalData.id || row.id,
        createdAt: proposalData.createdAt || row.created_at,
        customerShareEnabled: proposalData.customerShareEnabled === true,
        customerShareToken: normalizeCustomerShareToken(proposalData.customerShareToken),
        project: isPlainObject(proposalData.project) ? proposalData.project : {},
        proposalMode: proposalData.proposalMode || "",
        proposalNumber: proposalData.proposalNumber || "",
        status: proposalData.status || "draft",
        updatedAt: proposalData.updatedAt || row.updated_at,
      },
      deps,
      { forCollection: true },
    );

    return hasFullProposalData ? normalizedProposal : attachCloudProposalListSummaryOnly(normalizedProposal);
  }
}

function createProposalDataFromCloudSummaryRow(row = {}) {
  const pricingMode = String(row.pricing_mode || "").trim();
  const totalAmount = toCloudSummaryNumber(row.total_amount);
  const customerShareToken = normalizeCustomerShareToken(row.customer_share_token);
  const proposalData = {
    id: row.id || "",
    client: row.client_name ? { companyName: row.client_name, contactName: row.client_name } : {},
    createdAt: row.created_at || "",
    customerApproval: row.customer_approval_status ? { status: row.customer_approval_status } : undefined,
    customerSelection: row.customer_selection_status ? { status: row.customer_selection_status } : undefined,
    customerShareEnabled: row.customer_share_enabled === true,
    customerShareExpiresAt: row.customer_share_expires_at || "",
    customerShareToken,
    packetMode: row.packet_mode || "",
    pricing: pricingMode || totalAmount ? { pricingMode, totalProposal: totalAmount, total: totalAmount } : undefined,
    pricingMode,
    project: row.project_name ? { name: row.project_name } : {},
    proposalMode: row.proposal_mode || "",
    proposalNumber: row.proposal_number || "",
    proposalType: row.proposal_type || "",
    status: row.proposal_status || row.status || "draft",
    totalAmount,
    totalProposal: totalAmount,
    type: row.proposal_type || "",
    updatedAt: row.updated_at || "",
  };

  return removeEmptyCloudSummaryFields(proposalData);
}

export function mergeCloudPortalFieldsForSave(localProposal = {}, cloudProposal = {}, { cloudTimestamp = 0, sourceUpdatedAt = 0 } = {}) {
  if (!isPlainObject(localProposal)) {
    return localProposal;
  }

  if (!isPlainObject(cloudProposal)) {
    return localProposal;
  }

  const mergedProposal = { ...localProposal };
  const localSelection = normalizeCustomerSelection(localProposal.customerSelection);
  const cloudSelection = normalizeCustomerSelection(cloudProposal.customerSelection);
  const localApproval = normalizeCustomerApproval(localProposal.customerApproval);
  const cloudApproval = normalizeCustomerApproval(cloudProposal.customerApproval);
  const cloudIsNewerThanSource = isTimestampAfter(cloudTimestamp, sourceUpdatedAt);

  if (shouldUseCloudSelection(localSelection, cloudSelection, { cloudIsNewerThanSource })) {
    mergedProposal.customerSelection = cloudSelection;
  }

  if (shouldUseCloudApproval(localApproval, cloudApproval, { cloudIsNewerThanSource })) {
    mergedProposal.customerApproval = cloudApproval;
  }

  const localShareToken = normalizeCustomerShareToken(localProposal.customerShareToken);
  const cloudShareToken = normalizeCustomerShareToken(cloudProposal.customerShareToken);

  if ((cloudIsNewerThanSource && cloudShareToken) || (!localShareToken && cloudShareToken)) {
    mergedProposal.customerShareEnabled = cloudProposal.customerShareEnabled === true;
    mergedProposal.customerShareToken = cloudShareToken;
    mergedProposal.customerShareCreatedAt = cloudProposal.customerShareCreatedAt || mergedProposal.customerShareCreatedAt || "";
    mergedProposal.customerShareExpiresAt = cloudProposal.customerShareExpiresAt || "";
  }

  if (isTimestampAfter(getDateTimestamp(cloudProposal.customerShareLastViewedAt), getDateTimestamp(localProposal.customerShareLastViewedAt))) {
    mergedProposal.customerShareLastViewedAt = cloudProposal.customerShareLastViewedAt || "";
  }

  if (
    (mergedProposal.customerApproval?.status === CUSTOMER_APPROVAL_STATUS_APPROVED_SIGNED ||
      mergedProposal.customerSelection?.status === CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED) &&
    cloudProposal.status === "accepted_deposit_due"
  ) {
    mergedProposal.status = "accepted_deposit_due";
  }

  if (cloudIsNewerThanSource && getProposalPortalTimestamp(cloudProposal) > getProposalPortalTimestamp(localProposal)) {
    mergedProposal.updatedAt = cloudProposal.updatedAt || mergedProposal.updatedAt;
  }

  return mergedProposal;
}

function shouldUseCloudSelection(localSelection, cloudSelection, { cloudIsNewerThanSource = false } = {}) {
  const cloudRank = customerSelectionStatusRank[cloudSelection.status] || 0;
  const localRank = customerSelectionStatusRank[localSelection.status] || 0;

  if (cloudRank === 0) {
    return false;
  }

  if (cloudRank > localRank) {
    return true;
  }

  if (cloudRank < localRank) {
    return false;
  }

  return getSelectionTimestamp(cloudSelection) > getSelectionTimestamp(localSelection) || cloudIsNewerThanSource;
}

function shouldUseCloudApproval(localApproval, cloudApproval, { cloudIsNewerThanSource = false } = {}) {
  const cloudRank = customerApprovalStatusRank[cloudApproval.status] || 0;
  const localRank = customerApprovalStatusRank[localApproval.status] || 0;

  if (cloudRank === 0) {
    return false;
  }

  if (cloudRank > localRank) {
    return true;
  }

  if (cloudRank < localRank) {
    return false;
  }

  return getApprovalTimestamp(cloudApproval) > getApprovalTimestamp(localApproval) || cloudIsNewerThanSource;
}

function getSelectionTimestamp(selection = {}) {
  return Math.max(
    getDateTimestamp(selection.submittedAt),
    getDateTimestamp(selection.reviewedAt),
    getDateTimestamp(selection.appliedAt),
  );
}

function getApprovalTimestamp(approval = {}) {
  return getDateTimestamp(approval.approvedAt);
}

function getProposalPortalTimestamp(proposal = {}) {
  return Math.max(
    getSelectionTimestamp(normalizeCustomerSelection(proposal.customerSelection)),
    getApprovalTimestamp(normalizeCustomerApproval(proposal.customerApproval)),
    getDateTimestamp(proposal.customerShareLastViewedAt),
  );
}

function getDateTimestamp(value = "") {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isTimestampAfter(firstTimestamp = 0, secondTimestamp = 0) {
  return Number.isFinite(firstTimestamp) && firstTimestamp > 0 && firstTimestamp > (Number.isFinite(secondTimestamp) ? secondTimestamp : 0);
}

function getSupabaseClient(deps = {}) {
  const client = deps.supabaseClient || supabase;

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  return client;
}

export function mergeProposalCollections(localProposals = [], cloudProposals = [], deps = {}) {
  const mergedById = new Map();
  const cloudIds = new Set(cloudProposals.filter(isPlainObject).map((proposal) => normalizeProposalForCloud(proposal, deps, { forCollection: true }).id));
  const warnings = [];
  let needsSync = false;

  localProposals.filter(isPlainObject).forEach((proposal) => {
    const normalizedProposal = normalizeProposalForCloud(proposal, deps, { forCollection: true });
    mergedById.set(normalizedProposal.id, normalizedProposal);
  });

  cloudProposals.filter(isPlainObject).forEach((proposal) => {
    const cloudProposal = normalizeProposalForCloud(proposal, deps, { forCollection: true });
    const localProposal = mergedById.get(cloudProposal.id);

    if (!localProposal) {
      mergedById.set(cloudProposal.id, cloudProposal);
      return;
    }

    if (isCloudProposalListSummaryOnly(cloudProposal)) {
      mergedById.set(cloudProposal.id, mergeCloudProposalSummaryIntoLocalProposal(localProposal, cloudProposal));
      return;
    }

    const comparison = compareProposalUpdatedAt(localProposal, cloudProposal, deps);

    if (comparison > 0) {
      needsSync = true;
      return;
    }

    if (comparison < 0 || proposalsAreEquivalent(localProposal, cloudProposal, deps)) {
      mergedById.set(cloudProposal.id, mergeLocalImageSourcesIntoCloudSyncedProposal(localProposal, cloudProposal));
      return;
    }

    const copiedCloudProposal = normalizeProposalForCloud(
      {
        ...cloudProposal,
        id: createProposalId(deps),
        proposalNumber: cloudProposal.proposalNumber || localProposal.proposalNumber,
        updatedAt: cloudProposal.updatedAt || new Date().toISOString(),
      },
      deps,
      { forCollection: true },
    );
    mergedById.set(copiedCloudProposal.id, copiedCloudProposal);
    needsSync = true;
    warnings.push(`Kept both local and cloud copies for ${cloudProposal.proposalNumber || cloudProposal.id} because the latest update was unclear.`);
  });

  if (localProposals.filter(isPlainObject).some((proposal) => !cloudIds.has(normalizeProposalForCloud(proposal, deps, { forCollection: true }).id))) {
    needsSync = true;
  }

  return {
    needsSync,
    proposals: [...mergedById.values()].sort((a, b) => getProposalTimestamp(b, deps) - getProposalTimestamp(a, deps)),
    warning: warnings.join(" "),
  };
}

function mergeCloudProposalSummaryIntoLocalProposal(localProposal = {}, cloudProposalSummary = {}) {
  const mergedProposal = { ...localProposal };
  const summaryFields = [
    "proposalNumber",
    "proposalMode",
    "proposalType",
    "type",
    "packetMode",
    "pricingMode",
    "status",
    "totalAmount",
    "totalProposal",
    "updatedAt",
    "createdAt",
    "customerShareEnabled",
    "customerShareToken",
    "customerShareExpiresAt",
  ];

  summaryFields.forEach((field) => {
    if (cloudProposalSummary[field] !== undefined && cloudProposalSummary[field] !== "") {
      mergedProposal[field] = cloudProposalSummary[field];
    }
  });

  if (cloudProposalSummary.project?.name) {
    mergedProposal.project = {
      ...(isPlainObject(localProposal.project) ? localProposal.project : {}),
      name: cloudProposalSummary.project.name,
    };
  }

  if (cloudProposalSummary.client?.companyName || cloudProposalSummary.client?.contactName) {
    mergedProposal.client = {
      ...(isPlainObject(localProposal.client) ? localProposal.client : {}),
      ...cloudProposalSummary.client,
    };
  }

  if (cloudProposalSummary.pricingMode || cloudProposalSummary.totalProposal) {
    mergedProposal.pricing = {
      ...(isPlainObject(localProposal.pricing) ? localProposal.pricing : {}),
    };

    if (cloudProposalSummary.pricingMode && !mergedProposal.pricing.pricingMode) {
      mergedProposal.pricing.pricingMode = cloudProposalSummary.pricingMode;
    }

    if (cloudProposalSummary.totalProposal) {
      mergedProposal.pricing.totalProposal = cloudProposalSummary.totalProposal;
      mergedProposal.pricing.total = cloudProposalSummary.totalProposal;
    }
  }

  return mergedProposal;
}

function compareProposalUpdatedAt(localProposal = {}, cloudProposal = {}, deps = {}) {
  const localTimestamp = getProposalTimestamp(localProposal, deps);
  const cloudTimestamp = getProposalTimestamp(cloudProposal, deps);

  if (!localTimestamp && !cloudTimestamp) {
    return 0;
  }

  if (localTimestamp > cloudTimestamp) {
    return 1;
  }

  if (cloudTimestamp > localTimestamp) {
    return -1;
  }

  return 0;
}

function proposalsAreEquivalent(firstProposal = {}, secondProposal = {}, deps = {}) {
  return JSON.stringify(normalizeProposalForCloud(firstProposal, deps, { forCollection: true })) === JSON.stringify(normalizeProposalForCloud(secondProposal, deps, { forCollection: true }));
}
