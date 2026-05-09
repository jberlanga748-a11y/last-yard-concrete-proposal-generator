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

function normalizeProposalForCloud(proposal = {}, deps = {}, options = {}) {
  const lightweightNormalizer = options.forCollection ? deps.normalizeProposalForCollection : null;

  if (lightweightNormalizer) {
    return lightweightNormalizer(proposal);
  }

  if (deps.normalizeProposal) {
    return deps.normalizeProposal(proposal);
  }

  return {
    ...proposal,
    id: proposal.id || createCloudFallbackId("proposal"),
  };
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

  while (true) {
    let rows;

    try {
      rows = await fetchCloudProposalPage(client, companyId, start, pageSize);
    } catch (error) {
      if (isStatementTimeoutError(error) && !retriedAfterTimeout && smallerPageSize < pageSize) {
        pageSize = smallerPageSize;
        retriedAfterTimeout = true;
        continue;
      }

      if (isStatementTimeoutError(error) && proposals.length > 0) {
        return attachCloudProposalLoadWarning(
          proposals,
          `Cloud proposal load timed out after ${proposals.length} proposal${proposals.length === 1 ? "" : "s"}. Showing partial cloud results; try again later or contact support.`,
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

  return proposals;
}

export async function fetchCloudProposalByShareToken(shareToken, deps = {}) {
  const normalizedToken = normalizeCustomerShareToken(shareToken);

  if (!normalizedToken) {
    return null;
  }

  const client = getSupabaseClient(deps);
  const { data, error } = await client
    .from("proposals")
    .select("id,proposal_data,created_at,updated_at")
    .filter("proposal_data->>customerShareToken", "eq", normalizedToken)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeCloudProposalRow(data, deps, { forCollection: false }) : null;
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
    savedProposals.push(await saveCloudProposal(companyId, proposal, deps));
  }

  return savedProposals;
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
  const row = createCloudProposalRow(companyId, proposalToSave, deps);
  const targetRowId = row.id || existingRow?.id || "";

  try {
    await writeCloudProposalRow(client, row, targetRowId);
  } catch (error) {
    if (!shouldRetryWithCompatibleProposalRow(error)) {
      throw error;
    }

    await writeCloudProposalRow(client, createCompatibleCloudProposalRow(row), targetRowId);
  }

  return proposalToSave;
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
      .select("id,proposal_data,created_at,updated_at")
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
    .select("id,proposal_data,created_at,updated_at")
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
  const proposalData = {
    ...normalizedProposal,
    proposalListSummary: createCloudProposalListSummary(normalizedProposal),
  };
  const row = {
    company_id: companyId,
    contact_id: isUuid(normalizedProposal.contactId) ? normalizedProposal.contactId : null,
    packet_mode: normalizedProposal.packetMode || "summary",
    proposal_data: proposalData,
    proposal_number: normalizedProposal.proposalNumber || "",
    proposal_type: normalizedProposal.proposalType || normalizedProposal.type || "",
    status: getCloudProposalRowStatus(normalizedProposal.status),
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
  const mentionsOptionalColumn = /(contact_id|packet_mode|proposal_number|proposal_type)/i.test(combined);
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

  if (/statement timeout|canceling statement due to statement timeout|57014/.test(lowerCombined)) {
    return {
      code,
      message: "Cloud proposal load timed out. Try loading fewer proposals or contact support.",
      reason: "statement-timeout",
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

async function fetchCloudProposalPage(client, companyId, start, pageSize) {
  const end = start + pageSize - 1;
  const { data, error } = await client
    .from("proposals")
    .select("id,proposal_data,created_at,updated_at")
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
  const timeoutError = new Error("Cloud proposal load timed out. Try loading fewer proposals or contact support.");
  timeoutError.code = error?.code || error?.status || "";
  timeoutError.reason = "statement-timeout";
  timeoutError.originalMessage = getCloudErrorMessage(error);
  return timeoutError;
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
  const proposalData = isPlainObject(row.proposal_data) ? row.proposal_data : {};

  return normalizeProposalForCloud(
    {
      ...proposalData,
      id: proposalData.id || row.id,
      createdAt: proposalData.createdAt || row.created_at,
      updatedAt: proposalData.updatedAt || row.updated_at,
    },
    deps,
    { forCollection },
  );
}

function safelyNormalizeCloudProposalRow(row = {}, deps = {}, options = {}) {
  try {
    return normalizeCloudProposalRow(row, deps, options);
  } catch {
    const proposalData = isPlainObject(row.proposal_data) ? row.proposal_data : {};

    return normalizeProposalForCloud(
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
  }
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

    const comparison = compareProposalUpdatedAt(localProposal, cloudProposal, deps);

    if (comparison > 0) {
      needsSync = true;
      return;
    }

    if (comparison < 0 || proposalsAreEquivalent(localProposal, cloudProposal, deps)) {
      mergedById.set(cloudProposal.id, cloudProposal);
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
