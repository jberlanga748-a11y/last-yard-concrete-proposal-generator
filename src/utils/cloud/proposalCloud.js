import { supabase } from "../../supabaseClient.js";
import { createCloudFallbackId, isPlainObject, isUuid } from "./cloudSync.js";

function normalizeProposalForCloud(proposal = {}, deps = {}) {
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
  const normalizedLocalProposals = localProposals.filter(isPlainObject).map((proposal) => normalizeProposalForCloud(proposal, deps));
  const syncedLabel = labels.syncedLabel || "Synced";
  const needsSyncLabel = labels.needsSyncLabel || "Needs sync";

  if (cloudProposals.length === 0 && normalizedLocalProposals.length > 0) {
    return {
      message: `Cloud has no proposals yet. Use Push Local Proposals to upload ${normalizedLocalProposals.length} local proposal${normalizedLocalProposals.length === 1 ? "" : "s"}.`,
      proposals: normalizedLocalProposals,
      status: needsSyncLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length === 0) {
    return {
      message: `Loaded ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"}.`,
      proposals: cloudProposals,
      status: syncedLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length > 0) {
    const mergeResult = mergeProposalCollections(normalizedLocalProposals, cloudProposals, deps);

    return {
      message: mergeResult.warning || `Merged ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"} with local proposals.`,
      proposals: mergeResult.proposals,
      status: mergeResult.needsSync ? needsSyncLabel : syncedLabel,
    };
  }

  return {
    message: "No cloud proposals found yet.",
    proposals: [],
    status: syncedLabel,
  };
}

export async function fetchCloudProposals(companyId, deps = {}) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id,proposal_data,created_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudProposalRow(row, deps));
}

export async function saveCloudProposals(companyId, proposals = [], deps = {}) {
  for (const proposal of proposals.filter(isPlainObject)) {
    await saveCloudProposal(companyId, proposal, deps);
  }
}

export async function saveCloudProposal(companyId, proposal, deps = {}) {
  const normalizedProposal = normalizeProposalForCloud(
    {
      ...proposal,
      updatedAt: proposal.updatedAt || new Date().toISOString(),
    },
    deps,
  );
  const row = createCloudProposalRow(companyId, normalizedProposal, deps);

  if (row.id) {
    const { error } = await supabase.from("proposals").upsert(row, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return;
  }

  const existingRowId = await findCloudProposalRowId(companyId, normalizedProposal.id);

  if (existingRowId) {
    const { error } = await supabase.from("proposals").update(row).eq("id", existingRowId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("proposals").insert(row);

  if (error) {
    throw error;
  }
}

async function findCloudProposalRowId(companyId, proposalId) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id,proposal_data")
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  const match = (data || []).find((row) => row.proposal_data?.id === proposalId);
  return match?.id || "";
}

function createCloudProposalRow(companyId, proposal, deps = {}) {
  const normalizedProposal = normalizeProposalForCloud(proposal, deps);
  const row = {
    company_id: companyId,
    contact_id: isUuid(normalizedProposal.contactId) ? normalizedProposal.contactId : null,
    packet_mode: normalizedProposal.packetMode || "summary",
    proposal_data: normalizedProposal,
    proposal_number: normalizedProposal.proposalNumber || "",
    proposal_type: normalizedProposal.proposalType || normalizedProposal.type || "",
    status: normalizedProposal.status || "draft",
  };

  if (isUuid(normalizedProposal.id)) {
    row.id = normalizedProposal.id;
  }

  return row;
}

function normalizeCloudProposalRow(row = {}, deps = {}) {
  const proposalData = isPlainObject(row.proposal_data) ? row.proposal_data : {};

  return normalizeProposalForCloud(
    {
      ...proposalData,
      id: proposalData.id || row.id,
      createdAt: proposalData.createdAt || row.created_at,
      updatedAt: proposalData.updatedAt || row.updated_at,
    },
    deps,
  );
}

export function mergeProposalCollections(localProposals = [], cloudProposals = [], deps = {}) {
  const mergedById = new Map();
  const cloudIds = new Set(cloudProposals.filter(isPlainObject).map((proposal) => normalizeProposalForCloud(proposal, deps).id));
  const warnings = [];
  let needsSync = false;

  localProposals.filter(isPlainObject).forEach((proposal) => {
    const normalizedProposal = normalizeProposalForCloud(proposal, deps);
    mergedById.set(normalizedProposal.id, normalizedProposal);
  });

  cloudProposals.filter(isPlainObject).forEach((proposal) => {
    const cloudProposal = normalizeProposalForCloud(proposal, deps);
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
    );
    mergedById.set(copiedCloudProposal.id, copiedCloudProposal);
    needsSync = true;
    warnings.push(`Kept both local and cloud copies for ${cloudProposal.proposalNumber || cloudProposal.id} because the latest update was unclear.`);
  });

  if (localProposals.filter(isPlainObject).some((proposal) => !cloudIds.has(normalizeProposalForCloud(proposal, deps).id))) {
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
  return JSON.stringify(normalizeProposalForCloud(firstProposal, deps)) === JSON.stringify(normalizeProposalForCloud(secondProposal, deps));
}
