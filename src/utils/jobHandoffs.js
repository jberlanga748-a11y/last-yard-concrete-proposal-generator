export const JOB_HANDOFF_STATUSES = [
  "Draft",
  "Ready for Ops Review",
  "Waiting on Customer / GC",
  "Ready to Create Job",
  "Created in Concrete Ops Later",
  "Cancelled",
];

const READY_HANDOFF_STATUSES = new Set(["Ready for Ops Review", "Ready to Create Job"]);

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

  return normalizedPackets.filter((packet) => {
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
}

export function getJobHandoffStats(handoffs = []) {
  const packets = normalizeJobHandoffs(handoffs);

  return {
    total: packets.length,
    draft: packets.filter((packet) => packet.handoffStatus === "Draft").length,
    readyForOpsReview: packets.filter((packet) => packet.handoffStatus === "Ready for Ops Review").length,
    waitingOnCustomer: packets.filter((packet) => packet.handoffStatus === "Waiting on Customer / GC").length,
    readyToCreateJob: packets.filter((packet) => packet.handoffStatus === "Ready to Create Job").length,
    createdLater: packets.filter((packet) => packet.handoffStatus === "Created in Concrete Ops Later").length,
    cancelled: packets.filter((packet) => packet.handoffStatus === "Cancelled").length,
  };
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
