export const JOB_HANDOFF_STATUSES = [
  "Draft",
  "Ready for Ops Review",
  "Waiting on Customer / GC",
  "Ready to Create Job",
  "Created in Concrete Ops Later",
  "Cancelled",
];

export const JOB_HANDOFF_OPS_READINESS_LABELS = ["Not Ready", "Needs Review", "Ready"];

export const JOB_HANDOFF_TBD_FIELDS = ["startDateTarget", "crewNotes", "scheduleNotes"];

const READY_HANDOFF_STATUSES = new Set(["Ready for Ops Review", "Ready to Create Job"]);
const READY_OPS_LABEL = "Ready";
const NEEDS_REVIEW_OPS_LABEL = "Needs Review";
const NOT_READY_OPS_LABEL = "Not Ready";
const ACCEPTABLE_MISSING_INFO_STATUSES = new Set(["Ready", "Resolved", "Complete", "Not Applicable", "N/A"]);

export function createJobHandoffId(prefix = "job-handoff") {
  const safePrefix =
    String(prefix || "job-handoff")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "job-handoff";

  if (globalThis.crypto?.randomUUID) {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyJobHandoff(seed = {}) {
  const now = new Date().toISOString();

  return normalizeJobHandoff({
    id: seed.id || "",
    sourceLeadId: "",
    sourceProposalId: "",
    sourceEstimateId: "",
    sourcePacketId: "",
    customerName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    projectName: "",
    projectAddress: "",
    city: "",
    state: "",
    serviceType: "",
    projectType: "",
    acceptedProposalAmount: "",
    proposalTitle: "",
    proposalStatus: "",
    leadStatus: "",
    scopeSummary: "",
    includedScope: [],
    exclusions: [],
    assumptions: [],
    missingInfoStatus: "",
    proposalReadinessLabel: "",
    proposalReadinessScore: "",
    followUpStatus: "",
    nextFollowUpDate: "",
    internalNotes: "",
    operationsNotes: "",
    startDateTarget: "",
    crewNotes: "",
    scheduleNotes: "",
    documentLinks: [],
    handoffStatus: "Draft",
    opsReadinessScore: "",
    opsReadinessLabel: "",
    opsReadinessChecklist: [],
    opsReadinessIssues: [],
    opsReadinessLastCheckedAt: "",
    opsReadinessOverride: false,
    opsReadinessOverrideReason: "",
    opsReadinessTbdFields: [],
    createdAt: now,
    updatedAt: now,
    ...seed,
  });
}

export function normalizeJobHandoff(packet = {}) {
  const source = isPlainObject(packet) ? packet : {};
  const now = new Date().toISOString();
  const createdAt = toIsoDateTime(source.createdAt) || now;

  return {
    ...source,
    id: toSafeText(source.id) || createJobHandoffId(),
    sourceLeadId: toSafeText(source.sourceLeadId),
    sourceProposalId: toSafeText(source.sourceProposalId),
    sourceEstimateId: toSafeText(source.sourceEstimateId),
    sourcePacketId: toSafeText(source.sourcePacketId),
    customerName: toSafeText(source.customerName),
    contactName: toSafeText(source.contactName),
    contactEmail: toSafeText(source.contactEmail),
    contactPhone: toSafeText(source.contactPhone),
    projectName: toSafeText(source.projectName),
    projectAddress: toSafeText(source.projectAddress),
    city: toSafeText(source.city),
    state: toSafeText(source.state).toUpperCase().slice(0, 2),
    serviceType: toSafeText(source.serviceType),
    projectType: toSafeText(source.projectType),
    acceptedProposalAmount: toNumberOrBlank(source.acceptedProposalAmount),
    proposalTitle: toSafeText(source.proposalTitle),
    proposalStatus: toSafeText(source.proposalStatus),
    leadStatus: toSafeText(source.leadStatus),
    scopeSummary: toSafeText(source.scopeSummary),
    includedScope: normalizeTextList(source.includedScope),
    exclusions: normalizeTextList(source.exclusions),
    assumptions: normalizeTextList(source.assumptions),
    missingInfoStatus: toSafeText(source.missingInfoStatus),
    proposalReadinessLabel: toSafeText(source.proposalReadinessLabel),
    proposalReadinessScore: toNumberOrBlank(source.proposalReadinessScore),
    followUpStatus: toSafeText(source.followUpStatus),
    nextFollowUpDate: toDateInputValue(source.nextFollowUpDate),
    internalNotes: toSafeText(source.internalNotes),
    operationsNotes: toSafeText(source.operationsNotes),
    startDateTarget: toDateInputValue(source.startDateTarget),
    crewNotes: toSafeText(source.crewNotes),
    scheduleNotes: toSafeText(source.scheduleNotes),
    documentLinks: normalizeDocumentLinks(source.documentLinks),
    handoffStatus: normalizeOption(source.handoffStatus, JOB_HANDOFF_STATUSES, "Draft"),
    opsReadinessScore: clampScoreOrBlank(source.opsReadinessScore),
    opsReadinessLabel: normalizeOption(source.opsReadinessLabel, JOB_HANDOFF_OPS_READINESS_LABELS, ""),
    opsReadinessChecklist: normalizeOpsReadinessChecklist(source.opsReadinessChecklist),
    opsReadinessIssues: normalizeTextList(source.opsReadinessIssues),
    opsReadinessLastCheckedAt: toIsoDateTime(source.opsReadinessLastCheckedAt),
    opsReadinessOverride: source.opsReadinessOverride === true,
    opsReadinessOverrideReason: toSafeText(source.opsReadinessOverrideReason),
    opsReadinessTbdFields: normalizeTbdFields(source.opsReadinessTbdFields),
    createdAt,
    updatedAt: toIsoDateTime(source.updatedAt) || createdAt,
  };
}

export function normalizeJobHandoffs(handoffs = []) {
  return (Array.isArray(handoffs) ? handoffs : [])
    .filter(isPlainObject)
    .map((packet) => normalizeJobHandoff(packet))
    .sort((a, b) => getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt));
}

export function mergeJobHandoffs(...collections) {
  const packetMap = new Map();

  collections.forEach((collection) => {
    normalizeJobHandoffs(collection).forEach((packet) => {
      const currentPacket = packetMap.get(packet.id);
      packetMap.set(packet.id, chooseNewestRecord(currentPacket, packet));
    });
  });

  return normalizeJobHandoffs(Array.from(packetMap.values()));
}

export function upsertJobHandoff(handoffs = [], packet = {}) {
  const normalizedPacket = normalizeJobHandoff({
    ...packet,
    updatedAt: packet.updatedAt || new Date().toISOString(),
  });
  const otherPackets = normalizeJobHandoffs(handoffs).filter((item) => item.id !== normalizedPacket.id);

  return normalizeJobHandoffs([normalizedPacket, ...otherPackets]);
}

export function getJobHandoffById(handoffs = [], id = "") {
  const targetId = toSafeText(id);

  if (!targetId) {
    return null;
  }

  return normalizeJobHandoffs(handoffs).find((packet) => packet.id === targetId) || null;
}

export function findJobHandoffForLead(handoffs = [], leadId = "") {
  const targetId = toSafeText(leadId);

  if (!targetId) {
    return null;
  }

  return normalizeJobHandoffs(handoffs).find((packet) => packet.sourceLeadId === targetId) || null;
}

export function findJobHandoffForProposal(handoffs = [], proposalId = "") {
  const targetId = toSafeText(proposalId);

  if (!targetId) {
    return null;
  }

  return (
    normalizeJobHandoffs(handoffs).find(
      (packet) =>
        packet.sourceProposalId === targetId ||
        packet.sourceEstimateId === targetId ||
        packet.sourcePacketId === targetId,
    ) || null
  );
}

export function createJobHandoffFromLead(lead = {}, options = {}) {
  const now = new Date().toISOString();
  const linkedProposal = isPlainObject(options.linkedProposal) ? options.linkedProposal : {};
  const projectAddress = toSafeText(lead.projectAddress || lead.address || linkedProposal.project?.address || linkedProposal.project?.location);
  const acceptedProposalAmount = toNumberOrBlank(
    options.acceptedProposalAmount ??
      linkedProposal.pricing?.selectedTotal ??
      linkedProposal.total ??
      linkedProposal.totalAmount ??
      lead.estimatedValue,
  );

  return createEmptyJobHandoff({
    id: options.id || "",
    sourceLeadId: lead.id || "",
    sourceProposalId: lead.proposalId || linkedProposal.id || "",
    sourceEstimateId: lead.estimateId || "",
    sourcePacketId: lead.packetId || "",
    customerName: lead.companyName || lead.contactName || "",
    contactName: lead.contactName || "",
    contactEmail: lead.contactEmail || "",
    contactPhone: lead.contactPhone || "",
    projectName: lead.title || linkedProposal.project?.name || "",
    projectAddress,
    city: lead.city || "",
    state: lead.state || "",
    serviceType: lead.serviceType || "",
    projectType: lead.projectType || "",
    acceptedProposalAmount,
    proposalTitle: linkedProposal.project?.name || lead.title || "",
    proposalStatus: linkedProposal.status || "",
    leadStatus: lead.status || "",
    scopeSummary: lead.description || "",
    includedScope: normalizeTextList(options.includedScope),
    exclusions: normalizeTextList(options.exclusions),
    assumptions: normalizeTextList(options.assumptions),
    missingInfoStatus: lead.missingInfoStatus || "",
    proposalReadinessLabel: lead.proposalReadinessLabel || "",
    proposalReadinessScore: lead.proposalReadinessScore ?? "",
    followUpStatus: lead.followUpStatus || "",
    nextFollowUpDate: lead.nextFollowUpDate || "",
    internalNotes: buildLeadInternalNotes(lead),
    operationsNotes: "",
    scheduleNotes: lead.aiNextStep || lead.missingInfoRecommendedNextStep || "",
    handoffStatus: "Draft",
    createdAt: now,
    updatedAt: now,
  });
}

export function createJobHandoffFromProposal(proposal = {}, options = {}) {
  const now = new Date().toISOString();
  const client = isPlainObject(proposal.client) ? proposal.client : {};
  const project = isPlainObject(proposal.project) ? proposal.project : {};
  const scopeSections = Array.isArray(proposal.scopeSections) ? proposal.scopeSections : [];
  const includedScope = scopeSections.flatMap((section) => normalizeTextList(section?.items)).slice(0, 12);

  return createEmptyJobHandoff({
    id: options.id || "",
    sourceLeadId: proposal.leadFinderLeadId || "",
    sourceProposalId: proposal.id || "",
    customerName: client.companyName || client.contactName || "",
    contactName: client.contactName || "",
    contactEmail: client.email || "",
    contactPhone: client.phone || "",
    projectName: project.name || proposal.proposalNumber || "",
    projectAddress: client.projectAddress || project.address || project.location || "",
    serviceType: project.category || "",
    acceptedProposalAmount: toNumberOrBlank(options.acceptedProposalAmount ?? proposal.pricing?.selectedTotal ?? proposal.total),
    proposalTitle: project.name || proposal.proposalNumber || "",
    proposalStatus: proposal.status || "",
    scopeSummary: project.description || "",
    includedScope,
    internalNotes: toSafeText(proposal.internalTrackingNotes),
    handoffStatus: "Draft",
    createdAt: now,
    updatedAt: now,
  });
}

export function filterJobHandoffs(handoffs = [], filters = {}) {
  const normalizedPackets = normalizeJobHandoffs(handoffs);
  const searchText = toSafeText(filters.searchQuery).toLowerCase();
  const statusFilter = toSafeText(filters.statusFilter || "all");
  const serviceFilter = toSafeText(filters.serviceTypeFilter || "all");
  const cityFilter = toSafeText(filters.cityFilter).toLowerCase();
  const readyFilter = toSafeText(filters.readyFilter || "all");
  const readinessFilter = toSafeText(filters.opsReadinessFilter || filters.readinessFilter || "all");
  const sortOption = toSafeText(filters.sortOption || "updated_desc");

  const filteredPackets = normalizedPackets.filter((packet) => {
    if (statusFilter !== "all" && packet.handoffStatus !== statusFilter) {
      return false;
    }

    if (serviceFilter !== "all" && packet.serviceType !== serviceFilter) {
      return false;
    }

    if (cityFilter && !packet.city.toLowerCase().includes(cityFilter)) {
      return false;
    }

    if (readyFilter === "ready" && !READY_HANDOFF_STATUSES.has(packet.handoffStatus)) {
      return false;
    }

    if (readyFilter === "not_ready" && READY_HANDOFF_STATUSES.has(packet.handoffStatus)) {
      return false;
    }

    if (readinessFilter === "ready" && packet.opsReadinessLabel !== READY_OPS_LABEL) {
      return false;
    }

    if (readinessFilter === "needs_review" && packet.opsReadinessLabel !== NEEDS_REVIEW_OPS_LABEL) {
      return false;
    }

    if (readinessFilter === "not_ready" && packet.opsReadinessLabel !== NOT_READY_OPS_LABEL) {
      return false;
    }

    if (readinessFilter === "override" && packet.opsReadinessOverride !== true) {
      return false;
    }

    if (!searchText) {
      return true;
    }

    return [
      packet.customerName,
      packet.contactName,
      packet.projectName,
      packet.projectAddress,
      packet.city,
      packet.serviceType,
      packet.projectType,
      packet.scopeSummary,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchText);
  });

  return sortJobHandoffs(filteredPackets, sortOption);
}

export function getJobHandoffStats(handoffs = []) {
  const packets = normalizeJobHandoffs(handoffs);

  return {
    total: packets.length,
    draft: packets.filter((packet) => packet.handoffStatus === "Draft").length,
    readyForOpsReview: packets.filter((packet) => packet.handoffStatus === "Ready for Ops Review").length,
    waitingOnCustomer: packets.filter((packet) => packet.handoffStatus === "Waiting on Customer / GC").length,
    readyToCreateJob: packets.filter((packet) => packet.handoffStatus === "Ready to Create Job").length,
    opsReady: packets.filter((packet) => packet.opsReadinessLabel === READY_OPS_LABEL || packet.opsReadinessOverride).length,
    opsNotReady: packets.filter((packet) => packet.opsReadinessLabel === NOT_READY_OPS_LABEL).length,
    opsNeedsReview: packets.filter((packet) => packet.opsReadinessLabel === NEEDS_REVIEW_OPS_LABEL).length,
    opsOverride: packets.filter((packet) => packet.opsReadinessOverride).length,
    createdLater: packets.filter((packet) => packet.handoffStatus === "Created in Concrete Ops Later").length,
    cancelled: packets.filter((packet) => packet.handoffStatus === "Cancelled").length,
  };
}

export function toggleJobHandoffOpsTbdField(packet = {}, field = "") {
  const normalizedPacket = normalizeJobHandoff(packet);
  const normalizedField = normalizeOption(field, JOB_HANDOFF_TBD_FIELDS, "");

  if (!normalizedField) {
    return normalizedPacket;
  }

  const nextTbdFields = normalizedPacket.opsReadinessTbdFields.includes(normalizedField)
    ? normalizedPacket.opsReadinessTbdFields.filter((item) => item !== normalizedField)
    : [...normalizedPacket.opsReadinessTbdFields, normalizedField];

  return normalizeJobHandoff({
    ...normalizedPacket,
    opsReadinessTbdFields: nextTbdFields,
    updatedAt: new Date().toISOString(),
  });
}

export function calculateJobHandoffOpsReadiness(packet = {}, options = {}) {
  const normalizedPacket = normalizeJobHandoff(packet);
  const checkedAt = toIsoDateTime(options.checkedAt) || new Date().toISOString();
  const checklist = buildOpsReadinessChecklist(normalizedPacket);
  const passedCount = checklist.filter((item) => item.passed).length;
  const score = Math.round((passedCount / checklist.length) * 100);
  const hasBlockingIssue = checklist.some((item) => item.id === "follow_up_not_waiting" && !item.passed);
  const calculatedLabel = hasBlockingIssue
    ? score >= 60
      ? NEEDS_REVIEW_OPS_LABEL
      : NOT_READY_OPS_LABEL
    : score >= 85
      ? READY_OPS_LABEL
      : score >= 60
        ? NEEDS_REVIEW_OPS_LABEL
        : NOT_READY_OPS_LABEL;
  const issues = checklist.filter((item) => !item.passed).map((item) => item.issue || item.label);
  const label = normalizedPacket.opsReadinessOverride ? READY_OPS_LABEL : calculatedLabel;

  return normalizeJobHandoff({
    ...normalizedPacket,
    opsReadinessScore: score,
    opsReadinessLabel: label,
    opsReadinessChecklist: checklist,
    opsReadinessIssues: issues,
    opsReadinessLastCheckedAt: checkedAt,
    updatedAt: checkedAt,
  });
}

export function applyJobHandoffOpsReadinessOverride(packet = {}, reason = "", options = {}) {
  const overrideReason = toSafeText(reason);

  if (!overrideReason) {
    throw new Error("Enter an override reason before overriding Concrete Ops readiness.");
  }

  const checkedPacket = calculateJobHandoffOpsReadiness(packet, options);
  const now = toIsoDateTime(options.checkedAt) || new Date().toISOString();

  return normalizeJobHandoff({
    ...checkedPacket,
    opsReadinessLabel: READY_OPS_LABEL,
    opsReadinessOverride: true,
    opsReadinessOverrideReason: overrideReason,
    opsReadinessLastCheckedAt: checkedPacket.opsReadinessLastCheckedAt || now,
    updatedAt: now,
  });
}

export function buildOpsReadinessChecklist(packet = {}) {
  const normalizedPacket = normalizeJobHandoff(packet);
  const hasProjectLocation = Boolean(normalizedPacket.projectAddress || normalizedPacket.city || normalizedPacket.state);
  const hasSourceLink = Boolean(normalizedPacket.sourceProposalId || normalizedPacket.sourceEstimateId || normalizedPacket.sourcePacketId);
  const hasIncludedOrProposalScope = normalizedPacket.includedScope.length > 0 || Boolean(normalizedPacket.scopeSummary);
  const exclusionsReviewed = normalizedPacket.exclusions.length > 0 || normalizedPacket.assumptions.length > 0;
  const missingInfoResolved = ACCEPTABLE_MISSING_INFO_STATUSES.has(normalizedPacket.missingInfoStatus);
  const proposalReadinessAcceptable =
    normalizedPacket.proposalReadinessLabel === READY_OPS_LABEL ||
    normalizedPacket.proposalReadinessScore >= 85;
  const startDateReady = Boolean(normalizedPacket.startDateTarget) || normalizedPacket.opsReadinessTbdFields.includes("startDateTarget");
  const crewReady = Boolean(normalizedPacket.crewNotes) || normalizedPacket.opsReadinessTbdFields.includes("crewNotes");
  const scheduleReady = Boolean(normalizedPacket.scheduleNotes) || normalizedPacket.opsReadinessTbdFields.includes("scheduleNotes");

  return [
    createChecklistItem("customer_name", "Customer name exists", Boolean(normalizedPacket.customerName), "Add the customer or company name."),
    createChecklistItem("contact_name", "Contact name exists", Boolean(normalizedPacket.contactName), "Add the primary contact name."),
    createChecklistItem("contact_method", "Contact email or phone exists", Boolean(normalizedPacket.contactEmail || normalizedPacket.contactPhone), "Add a contact email or phone number."),
    createChecklistItem("project_name", "Project name exists", Boolean(normalizedPacket.projectName), "Add the project name."),
    createChecklistItem("project_location", "Project address or city/state exists", hasProjectLocation, "Add a project address or city/state."),
    createChecklistItem("service_type", "Service type exists", Boolean(normalizedPacket.serviceType), "Add the service type."),
    createChecklistItem("project_type", "Project type exists", Boolean(normalizedPacket.projectType), "Add the project type."),
    createChecklistItem("scope_summary", "Scope summary exists", Boolean(normalizedPacket.scopeSummary), "Add a scope summary."),
    createChecklistItem("included_scope", "Included scope exists or proposal scope exists", hasIncludedOrProposalScope, "Add included scope or proposal scope."),
    createChecklistItem("exclusions_assumptions", "Exclusions/assumptions reviewed", exclusionsReviewed, "Review exclusions or assumptions."),
    createChecklistItem("source_link", "Proposal/estimate/packet link exists if available", hasSourceLink, "Link the estimate, proposal, or packet when available."),
    createChecklistItem("missing_info_ready", "Missing info status is Ready or resolved", missingInfoResolved, "Resolve missing info before creating a job."),
    createChecklistItem("proposal_readiness_ready", "Proposal readiness label is Ready or acceptable", proposalReadinessAcceptable, "Confirm proposal readiness is acceptable."),
    createChecklistItem("follow_up_not_waiting", "Follow-up status is not Waiting on Response", normalizedPacket.followUpStatus !== "Waiting on Response", "Follow-up is still waiting on response."),
    createChecklistItem("operations_notes", "Operations notes added", Boolean(normalizedPacket.operationsNotes), "Add operations notes for the crew/ops review."),
    createChecklistItem("start_date", "Start date target added or marked TBD", startDateReady, "Add a target start date or mark it TBD.", "startDateTarget"),
    createChecklistItem("crew_notes", "Crew notes added or marked TBD", crewReady, "Add crew notes or mark them TBD.", "crewNotes"),
    createChecklistItem("schedule_notes", "Schedule notes added or marked TBD", scheduleReady, "Add schedule notes or mark them TBD.", "scheduleNotes"),
    createChecklistItem("handoff_status", "Handoff status is Ready for Ops Review or Ready to Create Job", READY_HANDOFF_STATUSES.has(normalizedPacket.handoffStatus), "Set handoff status to Ready for Ops Review or Ready to Create Job."),
  ];
}

export function formatJobHandoffSummary(packet = {}) {
  const normalizedPacket = normalizeJobHandoff(packet);
  const lines = [
    `Job Handoff Packet: ${normalizedPacket.projectName || normalizedPacket.proposalTitle || normalizedPacket.id}`,
    normalizedPacket.customerName ? `Customer/Company: ${normalizedPacket.customerName}` : "",
    normalizedPacket.contactName ? `Contact: ${normalizedPacket.contactName}` : "",
    normalizedPacket.contactEmail ? `Email: ${normalizedPacket.contactEmail}` : "",
    normalizedPacket.contactPhone ? `Phone: ${normalizedPacket.contactPhone}` : "",
    normalizedPacket.projectAddress ? `Project Address: ${normalizedPacket.projectAddress}` : "",
    [normalizedPacket.city, normalizedPacket.state].filter(Boolean).length > 0
      ? `Location: ${[normalizedPacket.city, normalizedPacket.state].filter(Boolean).join(", ")}`
      : "",
    normalizedPacket.serviceType ? `Service Type: ${normalizedPacket.serviceType}` : "",
    normalizedPacket.projectType ? `Project Type: ${normalizedPacket.projectType}` : "",
    normalizedPacket.acceptedProposalAmount !== "" ? `Accepted Amount: ${normalizedPacket.acceptedProposalAmount}` : "",
    normalizedPacket.handoffStatus ? `Handoff Status: ${normalizedPacket.handoffStatus}` : "",
    normalizedPacket.scopeSummary ? `Scope Summary:\n${normalizedPacket.scopeSummary}` : "",
    normalizedPacket.includedScope.length > 0 ? `Included Scope:\n${normalizedPacket.includedScope.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedPacket.exclusions.length > 0 ? `Exclusions:\n${normalizedPacket.exclusions.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedPacket.missingInfoStatus ? `Missing Info Status: ${normalizedPacket.missingInfoStatus}` : "",
    normalizedPacket.proposalReadinessLabel
      ? `Readiness: ${normalizedPacket.proposalReadinessLabel}${normalizedPacket.proposalReadinessScore !== "" ? ` (${normalizedPacket.proposalReadinessScore}/100)` : ""}`
      : "",
    normalizedPacket.followUpStatus ? `Follow-Up Status: ${normalizedPacket.followUpStatus}` : "",
    normalizedPacket.nextFollowUpDate ? `Next Follow-Up: ${normalizedPacket.nextFollowUpDate}` : "",
    normalizedPacket.operationsNotes ? `Operations Notes:\n${normalizedPacket.operationsNotes}` : "",
    normalizedPacket.startDateTarget ? `Target Start: ${normalizedPacket.startDateTarget}` : "",
    normalizedPacket.crewNotes ? `Crew Notes:\n${normalizedPacket.crewNotes}` : "",
    normalizedPacket.scheduleNotes ? `Schedule Notes:\n${normalizedPacket.scheduleNotes}` : "",
  ];

  return lines.filter(Boolean).join("\n\n");
}

function clampScoreOrBlank(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : "";
}

function normalizeOpsReadinessChecklist(checklist = []) {
  return (Array.isArray(checklist) ? checklist : [])
    .filter(isPlainObject)
    .map((item) => ({
      id: toSafeText(item.id),
      label: toSafeText(item.label),
      passed: item.passed === true,
      issue: toSafeText(item.issue),
      tbdField: normalizeOption(item.tbdField, JOB_HANDOFF_TBD_FIELDS, ""),
    }))
    .filter((item) => item.id && item.label);
}

function normalizeTbdFields(value = []) {
  return Array.from(
    new Set((Array.isArray(value) ? value : normalizeTextList(value)).map((field) => normalizeOption(field, JOB_HANDOFF_TBD_FIELDS, "")).filter(Boolean)),
  );
}

function createChecklistItem(id, label, passed, issue, tbdField = "") {
  return {
    id,
    label,
    passed: Boolean(passed),
    issue: passed ? "" : toSafeText(issue),
    tbdField: normalizeOption(tbdField, JOB_HANDOFF_TBD_FIELDS, ""),
  };
}

function sortJobHandoffs(handoffs = [], sortOption = "updated_desc") {
  const rankByReadyFirst = {
    Ready: 0,
    "Needs Review": 1,
    "Not Ready": 2,
    "": 3,
  };
  const rankByNeedsReviewFirst = {
    "Needs Review": 0,
    "Not Ready": 1,
    Ready: 2,
    "": 3,
  };

  return [...handoffs].sort((a, b) => {
    if (sortOption === "ready_first") {
      return (rankByReadyFirst[a.opsReadinessLabel] ?? 3) - (rankByReadyFirst[b.opsReadinessLabel] ?? 3);
    }

    if (sortOption === "needs_review_first") {
      return (rankByNeedsReviewFirst[a.opsReadinessLabel] ?? 3) - (rankByNeedsReviewFirst[b.opsReadinessLabel] ?? 3);
    }

    if (sortOption === "recently_checked") {
      return getTimeValue(b.opsReadinessLastCheckedAt) - getTimeValue(a.opsReadinessLastCheckedAt);
    }

    return getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt);
  });
}

function buildLeadInternalNotes(lead = {}) {
  return [
    lead.notes ? `Lead notes: ${lead.notes}` : "",
    lead.aiFitReason ? `Fit reason: ${lead.aiFitReason}` : "",
    lead.aiRisks ? `AI risks: ${lead.aiRisks}` : "",
    lead.aiNextStep ? `AI next step: ${lead.aiNextStep}` : "",
    lead.missingInfoRecommendedNextStep ? `Missing info next step: ${lead.missingInfoRecommendedNextStep}` : "",
    lead.customerQuestionDraft ? `Customer/GC questions:\n${lead.customerQuestionDraft}` : "",
    lead.sourceUrl ? `Source URL: ${lead.sourceUrl}` : "",
  ]
    .map(toSafeText)
    .filter(Boolean)
    .join("\n\n");
}

function normalizeDocumentLinks(links = []) {
  return (Array.isArray(links) ? links : [])
    .map((link) => {
      if (typeof link === "string") {
        return { label: link, url: link };
      }

      if (!isPlainObject(link)) {
        return null;
      }

      const url = toSafeText(link.url || link.href);

      if (!url && !toSafeText(link.label || link.name)) {
        return null;
      }

      return {
        ...link,
        label: toSafeText(link.label || link.name || url),
        url,
      };
    })
    .filter(Boolean);
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
