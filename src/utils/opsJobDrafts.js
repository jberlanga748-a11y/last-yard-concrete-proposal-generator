export const OPS_JOB_DRAFT_STATUSES = [
  "Draft",
  "Needs Ops Review",
  "Ready to Create in Concrete Ops",
  "Created in Concrete Ops Later",
  "Cancelled",
];

export const CONCRETE_OPS_JOB_DRAFT_PACKAGE_VERSION = "1.0";
export const CONCRETE_OPS_JOB_DRAFT_PACKAGE_TYPE = "concrete_ops_job_draft";
export const CONCRETE_OPS_JOB_DRAFT_SOURCE_APP = "Last Yard Concrete Proposal / GC Packet Generator";
export const CONCRETE_OPS_SEND_STATUSES = ["Not Sent", "Sent", "Duplicate", "Failed"];

const READY_DRAFT_STATUS = "Ready to Create in Concrete Ops";
const NEEDS_REVIEW_DRAFT_STATUS = "Needs Ops Review";

export function createOpsJobDraftId(prefix = "ops-job-draft") {
  const safePrefix =
    String(prefix || "ops-job-draft")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ops-job-draft";

  if (globalThis.crypto?.randomUUID) {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyOpsJobDraft(seed = {}) {
  const now = new Date().toISOString();

  return normalizeOpsJobDraft({
    id: seed.id || "",
    sourceHandoffId: "",
    sourceLeadId: "",
    sourceProposalId: "",
    sourceEstimateId: "",
    sourcePacketId: "",
    customerName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    jobName: "",
    jobAddress: "",
    city: "",
    state: "",
    serviceType: "",
    projectType: "",
    scopeSummary: "",
    includedScope: [],
    exclusions: [],
    assumptions: [],
    operationsNotes: "",
    crewNotes: "",
    scheduleNotes: "",
    startDateTarget: "",
    assignedCrewPlaceholder: "",
    foremanPlaceholder: "",
    jobStatus: "",
    opsReadinessScore: "",
    opsReadinessLabel: "",
    opsReadinessIssues: [],
    proposalAmount: "",
    proposalLinkOrId: "",
    handoffStatus: "",
    draftStatus: "Draft",
    concreteOpsSendStatus: "Not Sent",
    concreteOpsImportedDraftId: "",
    concreteOpsOpenPath: "",
    concreteOpsLastSentAt: "",
    concreteOpsSendMessage: "",
    concreteOpsSendError: "",
    createdAt: now,
    updatedAt: now,
    ...seed,
  });
}

export function normalizeOpsJobDraft(draft = {}) {
  const source = isPlainObject(draft) ? draft : {};
  const now = new Date().toISOString();
  const createdAt = toIsoDateTime(source.createdAt) || now;

  return {
    ...source,
    id: toSafeText(source.id) || createOpsJobDraftId(),
    sourceHandoffId: toSafeText(source.sourceHandoffId),
    sourceLeadId: toSafeText(source.sourceLeadId),
    sourceProposalId: toSafeText(source.sourceProposalId),
    sourceEstimateId: toSafeText(source.sourceEstimateId),
    sourcePacketId: toSafeText(source.sourcePacketId),
    customerName: toSafeText(source.customerName),
    contactName: toSafeText(source.contactName),
    contactEmail: toSafeText(source.contactEmail),
    contactPhone: toSafeText(source.contactPhone),
    jobName: toSafeText(source.jobName),
    jobAddress: toSafeText(source.jobAddress),
    city: toSafeText(source.city),
    state: toSafeText(source.state).toUpperCase().slice(0, 2),
    serviceType: toSafeText(source.serviceType),
    projectType: toSafeText(source.projectType),
    scopeSummary: toSafeText(source.scopeSummary),
    includedScope: normalizeTextList(source.includedScope),
    exclusions: normalizeTextList(source.exclusions),
    assumptions: normalizeTextList(source.assumptions),
    operationsNotes: toSafeText(source.operationsNotes),
    crewNotes: toSafeText(source.crewNotes),
    scheduleNotes: toSafeText(source.scheduleNotes),
    startDateTarget: toDateInputValue(source.startDateTarget),
    assignedCrewPlaceholder: toSafeText(source.assignedCrewPlaceholder),
    foremanPlaceholder: toSafeText(source.foremanPlaceholder),
    jobStatus: toSafeText(source.jobStatus),
    opsReadinessScore: clampScoreOrBlank(source.opsReadinessScore),
    opsReadinessLabel: toSafeText(source.opsReadinessLabel),
    opsReadinessIssues: normalizeTextList(source.opsReadinessIssues),
    proposalAmount: toNumberOrBlank(source.proposalAmount),
    proposalLinkOrId: toSafeText(source.proposalLinkOrId),
    handoffStatus: toSafeText(source.handoffStatus),
    draftStatus: normalizeOption(source.draftStatus, OPS_JOB_DRAFT_STATUSES, "Draft"),
    concreteOpsSendStatus: normalizeOption(source.concreteOpsSendStatus, CONCRETE_OPS_SEND_STATUSES, "Not Sent"),
    concreteOpsImportedDraftId: toSafeText(source.concreteOpsImportedDraftId),
    concreteOpsOpenPath: toSafeText(source.concreteOpsOpenPath),
    concreteOpsLastSentAt: toIsoDateTime(source.concreteOpsLastSentAt),
    concreteOpsSendMessage: toSafeText(source.concreteOpsSendMessage),
    concreteOpsSendError: toSafeText(source.concreteOpsSendError),
    createdAt,
    updatedAt: toIsoDateTime(source.updatedAt) || createdAt,
  };
}

export function normalizeOpsJobDrafts(drafts = []) {
  return (Array.isArray(drafts) ? drafts : [])
    .filter(isPlainObject)
    .map((draft) => normalizeOpsJobDraft(draft))
    .sort((a, b) => getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt));
}

export function mergeOpsJobDrafts(...collections) {
  const draftMap = new Map();

  collections.forEach((collection) => {
    normalizeOpsJobDrafts(collection).forEach((draft) => {
      const currentDraft = draftMap.get(draft.id);
      draftMap.set(draft.id, chooseNewestRecord(currentDraft, draft));
    });
  });

  return normalizeOpsJobDrafts(Array.from(draftMap.values()));
}

export function upsertOpsJobDraft(drafts = [], draft = {}) {
  const normalizedDraft = normalizeOpsJobDraft({
    ...draft,
    updatedAt: draft.updatedAt || new Date().toISOString(),
  });
  const otherDrafts = normalizeOpsJobDrafts(drafts).filter((item) => item.id !== normalizedDraft.id);

  return normalizeOpsJobDrafts([normalizedDraft, ...otherDrafts]);
}

export function getOpsJobDraftById(drafts = [], id = "") {
  const targetId = toSafeText(id);

  if (!targetId) {
    return null;
  }

  return normalizeOpsJobDrafts(drafts).find((draft) => draft.id === targetId) || null;
}

export function findOpsJobDraftForHandoff(drafts = [], handoffId = "") {
  const targetId = toSafeText(handoffId);

  if (!targetId) {
    return null;
  }

  return normalizeOpsJobDrafts(drafts).find((draft) => draft.sourceHandoffId === targetId) || null;
}

export function createOpsJobDraftFromHandoff(handoff = {}, options = {}) {
  const source = isPlainObject(handoff) ? handoff : {};
  const isReady = source.opsReadinessLabel === "Ready" || source.opsReadinessOverride === true;
  const proposalLinkOrId = source.sourceProposalId || source.sourceEstimateId || source.sourcePacketId || "";

  return createEmptyOpsJobDraft({
    id: options.id || "",
    sourceHandoffId: source.id || "",
    sourceLeadId: source.sourceLeadId || "",
    sourceProposalId: source.sourceProposalId || "",
    sourceEstimateId: source.sourceEstimateId || "",
    sourcePacketId: source.sourcePacketId || "",
    customerName: source.customerName || "",
    contactName: source.contactName || "",
    contactEmail: source.contactEmail || "",
    contactPhone: source.contactPhone || "",
    jobName: source.projectName || source.proposalTitle || "",
    jobAddress: source.projectAddress || "",
    city: source.city || "",
    state: source.state || "",
    serviceType: source.serviceType || "",
    projectType: source.projectType || "",
    scopeSummary: source.scopeSummary || "",
    includedScope: source.includedScope || [],
    exclusions: source.exclusions || [],
    assumptions: source.assumptions || [],
    operationsNotes: source.operationsNotes || "",
    crewNotes: source.crewNotes || "",
    scheduleNotes: source.scheduleNotes || "",
    startDateTarget: source.startDateTarget || "",
    opsReadinessScore: source.opsReadinessScore ?? "",
    opsReadinessLabel: source.opsReadinessLabel || "",
    opsReadinessIssues: source.opsReadinessIssues || [],
    proposalAmount: source.acceptedProposalAmount ?? "",
    proposalLinkOrId,
    handoffStatus: source.handoffStatus || "",
    draftStatus: isReady ? READY_DRAFT_STATUS : NEEDS_REVIEW_DRAFT_STATUS,
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString(),
  });
}

export function filterOpsJobDrafts(drafts = [], filters = {}) {
  const normalizedDrafts = normalizeOpsJobDrafts(drafts);
  const draftStatusFilter = toSafeText(filters.draftStatusFilter || "all");
  const readinessFilter = toSafeText(filters.readinessFilter || "all");
  const cityFilter = toSafeText(filters.cityFilter).toLowerCase();
  const serviceTypeFilter = toSafeText(filters.serviceTypeFilter || "all");
  const readyFilter = toSafeText(filters.readyFilter || "all");

  return normalizedDrafts.filter((draft) => {
    if (draftStatusFilter !== "all" && draft.draftStatus !== draftStatusFilter) {
      return false;
    }

    if (readinessFilter !== "all" && draft.opsReadinessLabel !== readinessFilter) {
      return false;
    }

    if (serviceTypeFilter !== "all" && draft.serviceType !== serviceTypeFilter) {
      return false;
    }

    if (cityFilter && !draft.city.toLowerCase().includes(cityFilter)) {
      return false;
    }

    if (readyFilter === "ready" && draft.draftStatus !== READY_DRAFT_STATUS) {
      return false;
    }

    if (readyFilter === "not_ready" && draft.draftStatus === READY_DRAFT_STATUS) {
      return false;
    }

    return true;
  });
}

export function getOpsJobDraftStats(drafts = []) {
  const normalizedDrafts = normalizeOpsJobDrafts(drafts);

  return {
    total: normalizedDrafts.length,
    draft: normalizedDrafts.filter((draft) => draft.draftStatus === "Draft").length,
    needsOpsReview: normalizedDrafts.filter((draft) => draft.draftStatus === NEEDS_REVIEW_DRAFT_STATUS).length,
    readyToCreate: normalizedDrafts.filter((draft) => draft.draftStatus === READY_DRAFT_STATUS).length,
    createdLater: normalizedDrafts.filter((draft) => draft.draftStatus === "Created in Concrete Ops Later").length,
    cancelled: normalizedDrafts.filter((draft) => draft.draftStatus === "Cancelled").length,
  };
}

export function formatOpsJobDraftSummary(draft = {}) {
  const normalizedDraft = normalizeOpsJobDraft(draft);
  const lines = [
    `Concrete Ops Job Draft: ${normalizedDraft.jobName || normalizedDraft.id}`,
    normalizedDraft.customerName ? `Customer/Company: ${normalizedDraft.customerName}` : "",
    normalizedDraft.contactName ? `Contact: ${normalizedDraft.contactName}` : "",
    normalizedDraft.contactEmail ? `Email: ${normalizedDraft.contactEmail}` : "",
    normalizedDraft.contactPhone ? `Phone: ${normalizedDraft.contactPhone}` : "",
    normalizedDraft.jobAddress ? `Job Address: ${normalizedDraft.jobAddress}` : "",
    [normalizedDraft.city, normalizedDraft.state].filter(Boolean).length > 0
      ? `Location: ${[normalizedDraft.city, normalizedDraft.state].filter(Boolean).join(", ")}`
      : "",
    normalizedDraft.serviceType ? `Service Type: ${normalizedDraft.serviceType}` : "",
    normalizedDraft.projectType ? `Project Type: ${normalizedDraft.projectType}` : "",
    normalizedDraft.proposalAmount !== "" ? `Proposal Amount: ${normalizedDraft.proposalAmount}` : "",
    normalizedDraft.draftStatus ? `Draft Status: ${normalizedDraft.draftStatus}` : "",
    normalizedDraft.opsReadinessLabel
      ? `Ops Readiness: ${normalizedDraft.opsReadinessLabel}${normalizedDraft.opsReadinessScore !== "" ? ` (${normalizedDraft.opsReadinessScore}/100)` : ""}`
      : "",
    normalizedDraft.scopeSummary ? `Scope Summary:\n${normalizedDraft.scopeSummary}` : "",
    normalizedDraft.includedScope.length > 0 ? `Included Scope:\n${normalizedDraft.includedScope.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.exclusions.length > 0 ? `Exclusions:\n${normalizedDraft.exclusions.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.operationsNotes ? `Operations Notes:\n${normalizedDraft.operationsNotes}` : "",
    normalizedDraft.crewNotes ? `Crew Notes:\n${normalizedDraft.crewNotes}` : "",
    normalizedDraft.scheduleNotes ? `Schedule Notes:\n${normalizedDraft.scheduleNotes}` : "",
  ];

  return lines.filter(Boolean).join("\n\n");
}

export function createConcreteOpsJobDraftExportPackage(draft = {}, options = {}) {
  const normalizedDraft = normalizeOpsJobDraft(draft);
  const exportLocation = resolveOpsJobDraftExportLocation(normalizedDraft, options);
  const exportDraft = normalizeOpsJobDraft({
    ...normalizedDraft,
    city: exportLocation.city,
    state: exportLocation.state,
  });
  const exportedAt = toIsoDateTime(options.exportedAt) || new Date().toISOString();
  const locationWarning =
    exportDraft.city && exportDraft.state ? "" : "City/state missing — confirm before importing into Concrete Ops 2.";
  const jobDraftSummary = [formatOpsJobDraftSummary(exportDraft), locationWarning].filter(Boolean).join("\n\n");

  return {
    packageVersion: CONCRETE_OPS_JOB_DRAFT_PACKAGE_VERSION,
    exportedAt,
    sourceApp: CONCRETE_OPS_JOB_DRAFT_SOURCE_APP,
    packageType: CONCRETE_OPS_JOB_DRAFT_PACKAGE_TYPE,
    opsJobDraftId: exportDraft.id,
    sourceHandoffId: exportDraft.sourceHandoffId,
    sourceLeadId: exportDraft.sourceLeadId,
    sourceProposalId: exportDraft.sourceProposalId,
    sourceEstimateId: exportDraft.sourceEstimateId,
    sourcePacketId: exportDraft.sourcePacketId,
    customerName: exportDraft.customerName,
    contactName: exportDraft.contactName,
    contactEmail: exportDraft.contactEmail,
    contactPhone: exportDraft.contactPhone,
    jobName: exportDraft.jobName,
    jobAddress: exportDraft.jobAddress,
    city: exportDraft.city,
    state: exportDraft.state,
    serviceType: exportDraft.serviceType,
    projectType: exportDraft.projectType,
    scopeSummary: exportDraft.scopeSummary,
    includedScope: [...exportDraft.includedScope],
    exclusions: [...exportDraft.exclusions],
    assumptions: [...exportDraft.assumptions],
    operationsNotes: exportDraft.operationsNotes,
    crewNotes: exportDraft.crewNotes,
    scheduleNotes: exportDraft.scheduleNotes,
    startDateTarget: exportDraft.startDateTarget,
    assignedCrewPlaceholder: exportDraft.assignedCrewPlaceholder,
    foremanPlaceholder: exportDraft.foremanPlaceholder,
    draftStatus: exportDraft.draftStatus,
    opsReadinessScore: exportDraft.opsReadinessScore,
    opsReadinessLabel: exportDraft.opsReadinessLabel,
    opsReadinessIssues: [...exportDraft.opsReadinessIssues],
    proposalAmount: exportDraft.proposalAmount,
    proposalLinkOrId: exportDraft.proposalLinkOrId,
    handoffStatus: exportDraft.handoffStatus,
    createdAt: exportDraft.createdAt,
    updatedAt: exportDraft.updatedAt,
    jobDraftSummary,
  };
}

export function getConcreteOpsJobDraftExportFileName(draft = {}, date = new Date()) {
  const normalizedDraft = normalizeOpsJobDraft(draft);
  const dateValue = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const dateStamp = dateValue.toISOString().slice(0, 10);
  const slug =
    (normalizedDraft.jobName || normalizedDraft.id || "draft")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "draft";

  return `concrete-ops-job-draft-${slug}-${dateStamp}.json`;
}

export function applyConcreteOpsSendResultToDraft(draft = {}, result = {}, options = {}) {
  const sourceDraft = normalizeOpsJobDraft(draft);
  const isDuplicate = result?.duplicate === true;
  const isSent = result?.ok === true || isDuplicate;
  const status = isDuplicate ? "Duplicate" : isSent ? "Sent" : "Failed";
  const now = new Date().toISOString();
  const sentAt = toIsoDateTime(options.sentAt) || (isSent ? now : sourceDraft.concreteOpsLastSentAt);

  return normalizeOpsJobDraft({
    ...sourceDraft,
    concreteOpsSendStatus: status,
    concreteOpsImportedDraftId: toSafeText(result?.importedDraftId) || sourceDraft.concreteOpsImportedDraftId,
    concreteOpsOpenPath: toSafeText(result?.openPath) || sourceDraft.concreteOpsOpenPath,
    concreteOpsLastSentAt: sentAt,
    concreteOpsSendMessage:
      toSafeText(result?.message) ||
      (isDuplicate ? "Already sent / duplicate found." : isSent ? "Sent to Concrete Ops." : "Concrete Ops direct send failed."),
    concreteOpsSendError: isSent ? "" : toSafeText(result?.error) || toSafeText(result?.message) || "Concrete Ops direct send failed.",
    updatedAt: toIsoDateTime(options.updatedAt) || now,
  });
}

function resolveOpsJobDraftExportLocation(draft = {}, options = {}) {
  const sourceDraft = normalizeOpsJobDraft(draft);
  const handoff = isPlainObject(options.handoff) ? options.handoff : {};
  const lead = isPlainObject(options.lead) ? options.lead : {};
  const proposal = isPlainObject(options.proposal) ? options.proposal : {};
  const proposalClient = isPlainObject(proposal.client) ? proposal.client : {};
  const proposalProject = isPlainObject(proposal.project) ? proposal.project : {};
  let city = firstText(
    sourceDraft.city,
    options.city,
    handoff.city,
    lead.city,
    proposalClient.city,
    proposalProject.city,
  );
  let state = normalizeStateText(firstText(sourceDraft.state, options.state, handoff.state, lead.state, proposalClient.state, proposalProject.state));
  const locationTexts = [
    sourceDraft.jobAddress,
    options.projectLocation,
    options.location,
    options.address,
    handoff.projectAddress,
    handoff.projectLocation,
    lead.projectAddress,
    lead.address,
    lead.projectLocation,
    proposalClient.projectAddress,
    proposalClient.cityStateZip,
    proposalProject.address,
    proposalProject.location,
  ];

  for (const text of locationTexts) {
    if (city && state) {
      break;
    }

    const parsedLocation = parseCityStateFromText(text);
    city = city || parsedLocation.city;
    state = state || parsedLocation.state;
  }

  return {
    city: toSafeText(city),
    state: normalizeStateText(state),
  };
}

function parseCityStateFromText(value) {
  const text = toSafeText(value).replace(/\s+/g, " ");

  if (!text) {
    return { city: "", state: "" };
  }

  const commaMatch = text.match(/(?:^|,\s*)([A-Za-z][A-Za-z .'-]*?),\s*([A-Za-z]{2}|Oregon)(?:\s+\d{5}(?:-\d{4})?)?\b/i);

  if (commaMatch) {
    return {
      city: toSafeText(commaMatch[1]),
      state: normalizeStateText(commaMatch[2]),
    };
  }

  const looseMatch = text.match(/\b([A-Za-z][A-Za-z .'-]+?)\s+([A-Za-z]{2}|Oregon)(?:\s+\d{5}(?:-\d{4})?)?$/i);

  if (looseMatch) {
    return {
      city: toSafeText(looseMatch[1]),
      state: normalizeStateText(looseMatch[2]),
    };
  }

  return { city: "", state: "" };
}

function clampScoreOrBlank(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : "";
}

function normalizeTextList(value = []) {
  if (Array.isArray(value)) {
    return value.map(toSafeText).filter(Boolean);
  }

  return toSafeText(value)
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOption(value, options = [], fallback = "") {
  const text = toSafeText(value);
  return options.includes(text) ? text : fallback;
}

function firstText(...values) {
  return values.map(toSafeText).find(Boolean) || "";
}

function normalizeStateText(value) {
  const text = toSafeText(value);

  if (!text) {
    return "";
  }

  if (/^oregon$/i.test(text)) {
    return "OR";
  }

  return text.toUpperCase().slice(0, 2);
}

function toSafeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function toNumberOrBlank(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : "";
}

function toDateInputValue(value) {
  const text = toSafeText(value);

  if (!text) {
    return "";
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value) {
  const text = toSafeText(value);

  if (!text) {
    return "";
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getTimeValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function chooseNewestRecord(currentRecord, nextRecord) {
  if (!currentRecord) {
    return nextRecord;
  }

  return getTimeValue(nextRecord.updatedAt || nextRecord.createdAt) >= getTimeValue(currentRecord.updatedAt || currentRecord.createdAt)
    ? nextRecord
    : currentRecord;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
