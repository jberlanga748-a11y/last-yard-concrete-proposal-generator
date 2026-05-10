import assert from "node:assert/strict";
import test from "node:test";

import {
  OPS_JOB_DRAFT_STATUSES,
  createConcreteOpsJobDraftExportPackage,
  createOpsJobDraftFromHandoff,
  filterOpsJobDrafts,
  findOpsJobDraftForHandoff,
  formatOpsJobDraftSummary,
  getConcreteOpsJobDraftExportFileName,
  getOpsJobDraftStats,
  mergeOpsJobDrafts,
  normalizeOpsJobDraft,
  normalizeOpsJobDrafts,
  upsertOpsJobDraft,
} from "./opsJobDrafts.js";

test("ops job draft statuses are prep-only Concrete Ops states", () => {
  assert.deepEqual(OPS_JOB_DRAFT_STATUSES, [
    "Draft",
    "Needs Ops Review",
    "Ready to Create in Concrete Ops",
    "Created in Concrete Ops Later",
    "Cancelled",
  ]);
});

test("creates Concrete Ops job draft from ready job handoff data", () => {
  const draft = createOpsJobDraftFromHandoff({
    id: "handoff-1",
    sourceLeadId: "lead-1",
    sourceProposalId: "proposal-1",
    customerName: "ABC Apartments",
    contactName: "Alex GC",
    contactEmail: "alex@example.com",
    contactPhone: "555-0100",
    projectName: "Albany sidewalk replacement",
    projectAddress: "123 Main St",
    city: "Albany",
    state: "or",
    serviceType: "Sidewalk",
    projectType: "Replacement",
    scopeSummary: "Replace damaged sidewalk panels.",
    includedScope: ["Demo panels", "Place broom finish concrete"],
    exclusions: ["Traffic control by GC"],
    assumptions: ["Normal working hours"],
    operationsNotes: "Confirm access.",
    crewNotes: "Two-person crew.",
    scheduleNotes: "Coordinate after demo.",
    startDateTarget: "2026-05-20",
    acceptedProposalAmount: "$18,500",
    handoffStatus: "Ready for Ops Review",
    opsReadinessScore: 100,
    opsReadinessLabel: "Ready",
    opsReadinessIssues: [],
  });

  assert.equal(draft.sourceHandoffId, "handoff-1");
  assert.equal(draft.sourceLeadId, "lead-1");
  assert.equal(draft.sourceProposalId, "proposal-1");
  assert.equal(draft.customerName, "ABC Apartments");
  assert.equal(draft.jobName, "Albany sidewalk replacement");
  assert.equal(draft.jobAddress, "123 Main St");
  assert.equal(draft.state, "OR");
  assert.equal(draft.proposalAmount, 18500);
  assert.equal(draft.draftStatus, "Ready to Create in Concrete Ops");
  assert.deepEqual(draft.includedScope, ["Demo panels", "Place broom finish concrete"]);
});

test("not-ready handoff still creates draft needing ops review", () => {
  const draft = createOpsJobDraftFromHandoff({
    id: "handoff-not-ready",
    projectName: "Partial job",
    opsReadinessLabel: "Not Ready",
    opsReadinessScore: 35,
    opsReadinessIssues: ["Add project address.", "Add operations notes."],
  });

  assert.equal(draft.draftStatus, "Needs Ops Review");
  assert.equal(draft.opsReadinessLabel, "Not Ready");
  assert.deepEqual(draft.opsReadinessIssues, ["Add project address.", "Add operations notes."]);
});

test("normalizes upserts merges and finds ops job drafts defensively", () => {
  const first = normalizeOpsJobDraft({
    id: "draft-1",
    sourceHandoffId: "handoff-1",
    jobName: "Old name",
    draftStatus: "Draft",
    updatedAt: "2026-05-01T00:00:00.000Z",
  });
  const newer = normalizeOpsJobDraft({
    ...first,
    jobName: "New name",
    updatedAt: "2026-05-02T00:00:00.000Z",
  });
  const collection = upsertOpsJobDraft([], first);
  const merged = mergeOpsJobDrafts(collection, [newer]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].jobName, "New name");
  assert.equal(findOpsJobDraftForHandoff(merged, "handoff-1")?.id, "draft-1");
});

test("filters drafts and reports command center stats", () => {
  const drafts = normalizeOpsJobDrafts([
    { id: "d1", jobName: "Albany slab", city: "Albany", serviceType: "Slab", draftStatus: "Ready to Create in Concrete Ops", opsReadinessLabel: "Ready" },
    { id: "d2", jobName: "Salem fence", city: "Salem", serviceType: "Fencing", draftStatus: "Needs Ops Review", opsReadinessLabel: "Needs Review" },
    { id: "d3", jobName: "Corvallis curb", city: "Corvallis", serviceType: "Curb/Gutter", draftStatus: "Cancelled", opsReadinessLabel: "Not Ready" },
  ]);
  const readyDrafts = filterOpsJobDrafts(drafts, { readyFilter: "ready" });
  const salemDrafts = filterOpsJobDrafts(drafts, { cityFilter: "salem" });
  const concreteDrafts = filterOpsJobDrafts(drafts, { serviceTypeFilter: "Slab" });
  const stats = getOpsJobDraftStats(drafts);

  assert.equal(readyDrafts.length, 1);
  assert.equal(salemDrafts.length, 1);
  assert.equal(concreteDrafts.length, 1);
  assert.equal(stats.readyToCreate, 1);
  assert.equal(stats.needsOpsReview, 1);
  assert.equal(stats.cancelled, 1);
});

test("formats a copyable Concrete Ops job draft summary", () => {
  const summary = formatOpsJobDraftSummary({
    id: "draft-summary",
    customerName: "ABC Apartments",
    jobName: "Sidewalk repair",
    jobAddress: "123 Main St",
    draftStatus: "Ready to Create in Concrete Ops",
    includedScope: ["Demo damaged panels", "Place broom finish concrete"],
    operationsNotes: "Coordinate access with property manager.",
  });

  assert.match(summary, /Concrete Ops Job Draft: Sidewalk repair/);
  assert.match(summary, /Customer\/Company: ABC Apartments/);
  assert.match(summary, /Included Scope/);
  assert.match(summary, /Coordinate access/);
});

test("creates a clean Concrete Ops job draft export package", () => {
  const exportPackage = createConcreteOpsJobDraftExportPackage(
    {
      id: "draft-export",
      sourceHandoffId: "handoff-1",
      sourceLeadId: "lead-1",
      sourceProposalId: "proposal-1",
      customerName: "ABC Apartments",
      contactName: "Alex GC",
      contactEmail: "alex@example.com",
      contactPhone: "555-0100",
      jobName: "Albany Sidewalk Repair",
      jobAddress: "123 Main St",
      city: "Albany",
      state: "OR",
      serviceType: "Sidewalk",
      projectType: "Replacement",
      scopeSummary: "Replace damaged sidewalk panels.",
      includedScope: ["Demo panels", "Place broom finish concrete"],
      exclusions: ["Traffic control by GC"],
      assumptions: ["Normal working hours"],
      operationsNotes: "Coordinate access.",
      crewNotes: "Two-person crew.",
      scheduleNotes: "Coordinate after demo.",
      startDateTarget: "2026-05-20",
      assignedCrewPlaceholder: "Concrete crew",
      foremanPlaceholder: "TBD",
      draftStatus: "Ready to Create in Concrete Ops",
      opsReadinessScore: 92,
      opsReadinessLabel: "Ready",
      proposalAmount: 18500,
      proposalLinkOrId: "proposal-1",
      handoffStatus: "Ready for Ops Review",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
      apiKey: "secret-api-key",
      authToken: "secret-auth-token",
      session: { accessToken: "secret-session" },
    },
    { exportedAt: "2026-05-10T12:00:00.000Z" },
  );

  assert.deepEqual(Object.keys(exportPackage), [
    "packageVersion",
    "exportedAt",
    "sourceApp",
    "packageType",
    "opsJobDraftId",
    "sourceHandoffId",
    "sourceLeadId",
    "sourceProposalId",
    "sourceEstimateId",
    "sourcePacketId",
    "customerName",
    "contactName",
    "contactEmail",
    "contactPhone",
    "jobName",
    "jobAddress",
    "city",
    "state",
    "serviceType",
    "projectType",
    "scopeSummary",
    "includedScope",
    "exclusions",
    "assumptions",
    "operationsNotes",
    "crewNotes",
    "scheduleNotes",
    "startDateTarget",
    "assignedCrewPlaceholder",
    "foremanPlaceholder",
    "draftStatus",
    "opsReadinessScore",
    "opsReadinessLabel",
    "opsReadinessIssues",
    "proposalAmount",
    "proposalLinkOrId",
    "handoffStatus",
    "createdAt",
    "updatedAt",
    "jobDraftSummary",
  ]);
  assert.equal(exportPackage.packageVersion, "1.0");
  assert.equal(exportPackage.packageType, "concrete_ops_job_draft");
  assert.equal(exportPackage.sourceApp, "Last Yard Concrete Proposal / GC Packet Generator");
  assert.equal(exportPackage.exportedAt, "2026-05-10T12:00:00.000Z");
  assert.equal(exportPackage.opsJobDraftId, "draft-export");
  assert.equal(exportPackage.proposalAmount, 18500);
  assert.deepEqual(exportPackage.includedScope, ["Demo panels", "Place broom finish concrete"]);
  assert.match(exportPackage.jobDraftSummary, /Concrete Ops Job Draft: Albany Sidewalk Repair/);
  assert.doesNotMatch(JSON.stringify(exportPackage), /secret-api-key|secret-auth-token|secret-session|apiKey|authToken|session/);
});

test("export package filename uses job name or draft id with date stamp", () => {
  const fileName = getConcreteOpsJobDraftExportFileName({ id: "draft-1", jobName: "Albany Sidewalk Repair!" }, new Date("2026-05-10T12:00:00.000Z"));
  const fallbackFileName = getConcreteOpsJobDraftExportFileName({ id: "draft-1" }, new Date("2026-05-10T12:00:00.000Z"));

  assert.equal(fileName, "concrete-ops-job-draft-albany-sidewalk-repair-2026-05-10.json");
  assert.equal(fallbackFileName, "concrete-ops-job-draft-draft-1-2026-05-10.json");
});

test("not-ready draft can still create an export package with readiness issues", () => {
  const exportPackage = createConcreteOpsJobDraftExportPackage({
    id: "draft-not-ready",
    jobName: "Incomplete slab",
    opsReadinessLabel: "Not Ready",
    opsReadinessScore: 45,
    opsReadinessIssues: ["Add customer phone.", "Confirm start date."],
  });

  assert.equal(exportPackage.opsReadinessLabel, "Not Ready");
  assert.equal(exportPackage.opsReadinessScore, 45);
  assert.deepEqual(exportPackage.opsReadinessIssues, ["Add customer phone.", "Confirm start date."]);
  assert.match(exportPackage.jobDraftSummary, /Concrete Ops Job Draft: Incomplete slab/);
});
