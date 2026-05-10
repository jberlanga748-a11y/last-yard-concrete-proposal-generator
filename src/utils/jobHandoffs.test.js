import assert from "node:assert/strict";
import test from "node:test";

import {
  JOB_HANDOFF_STATUSES,
  applyJobHandoffOpsReadinessOverride,
  calculateJobHandoffOpsReadiness,
  createJobHandoffFromLead,
  filterJobHandoffs,
  findJobHandoffForLead,
  findJobHandoffForProposal,
  formatJobHandoffSummary,
  getJobHandoffStats,
  mergeJobHandoffs,
  normalizeJobHandoff,
  normalizeJobHandoffs,
  toggleJobHandoffOpsTbdField,
  upsertJobHandoff,
} from "./jobHandoffs.js";

test("job handoff statuses include prep-only operations states", () => {
  assert.deepEqual(JOB_HANDOFF_STATUSES, [
    "Draft",
    "Ready for Ops Review",
    "Waiting on Customer / GC",
    "Ready to Create Job",
    "Created in Concrete Ops Later",
    "Cancelled",
  ]);
});

test("creates a job handoff packet from lead data", () => {
  const packet = createJobHandoffFromLead({
    id: "lead-1",
    title: "Albany sidewalk replacement",
    companyName: "ABC Apartments",
    contactName: "Alex GC",
    contactEmail: "alex@example.com",
    contactPhone: "555-0100",
    city: "Albany",
    state: "or",
    serviceType: "Sidewalk",
    projectType: "Replacement",
    description: "Replace damaged sidewalk panels.",
    estimatedValue: "$18,500",
    aiFitReason: "Good Last Yard Concrete fit.",
    aiRisks: "Confirm traffic control.",
    aiNextStep: "Request plans.",
    missingInfoStatus: "Needs Info",
    proposalReadinessLabel: "Needs Info",
    proposalReadinessScore: 55,
    followUpStatus: "Waiting on Response",
    nextFollowUpDate: "2026-05-10",
    proposalId: "proposal-1",
  });

  assert.equal(packet.sourceLeadId, "lead-1");
  assert.equal(packet.sourceProposalId, "proposal-1");
  assert.equal(packet.customerName, "ABC Apartments");
  assert.equal(packet.projectName, "Albany sidewalk replacement");
  assert.equal(packet.state, "OR");
  assert.equal(packet.acceptedProposalAmount, 18500);
  assert.equal(packet.handoffStatus, "Draft");
  assert.match(packet.internalNotes, /Good Last Yard Concrete fit/);
  assert.match(packet.internalNotes, /Confirm traffic control/);
});

test("normalizes, upserts, merges, and finds job handoffs defensively", () => {
  const first = normalizeJobHandoff({
    id: "handoff-1",
    sourceLeadId: "lead-1",
    sourceProposalId: "proposal-1",
    projectName: "Old name",
    handoffStatus: "Ready for Ops Review",
    updatedAt: "2026-05-01T00:00:00.000Z",
  });
  const newer = normalizeJobHandoff({
    ...first,
    projectName: "New name",
    updatedAt: "2026-05-02T00:00:00.000Z",
  });
  const collection = upsertJobHandoff([], first);
  const merged = mergeJobHandoffs(collection, [newer]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].projectName, "New name");
  assert.equal(findJobHandoffForLead(merged, "lead-1")?.id, "handoff-1");
  assert.equal(findJobHandoffForProposal(merged, "proposal-1")?.id, "handoff-1");
});

test("filters handoffs and reports ops-ready stats", () => {
  const handoffs = normalizeJobHandoffs([
    { id: "h1", projectName: "Albany slab", city: "Albany", serviceType: "Slab", handoffStatus: "Ready to Create Job" },
    { id: "h2", projectName: "Salem fence", city: "Salem", serviceType: "Fencing", handoffStatus: "Waiting on Customer / GC" },
    { id: "h3", projectName: "Corvallis curb", city: "Corvallis", serviceType: "Curb/Gutter", handoffStatus: "Ready for Ops Review" },
  ]);
  const readyPackets = filterJobHandoffs(handoffs, { readyFilter: "ready" });
  const salemPackets = filterJobHandoffs(handoffs, { cityFilter: "salem" });
  const stats = getJobHandoffStats(handoffs);

  assert.equal(readyPackets.length, 2);
  assert.equal(salemPackets.length, 1);
  assert.equal(stats.readyForOpsReview, 1);
  assert.equal(stats.readyToCreateJob, 1);
  assert.equal(stats.waitingOnCustomer, 1);
});

test("formats a copyable job handoff summary", () => {
  const summary = formatJobHandoffSummary({
    id: "handoff-summary",
    customerName: "ABC Apartments",
    projectName: "Sidewalk repair",
    projectAddress: "123 Main St",
    handoffStatus: "Ready for Ops Review",
    includedScope: ["Demo damaged panels", "Place broom finish concrete"],
    operationsNotes: "Coordinate access with property manager.",
  });

  assert.match(summary, /Job Handoff Packet: Sidewalk repair/);
  assert.match(summary, /Customer\/Company: ABC Apartments/);
  assert.match(summary, /Included Scope/);
  assert.match(summary, /Coordinate access/);
});

test("complete job handoff scores ready for Concrete Ops without OpenAI", () => {
  const checked = calculateJobHandoffOpsReadiness({
    id: "ready-handoff",
    customerName: "ABC Apartments",
    contactName: "Alex GC",
    contactEmail: "alex@example.com",
    projectName: "Sidewalk repair",
    projectAddress: "123 Main St",
    city: "Albany",
    state: "OR",
    serviceType: "Sidewalk",
    projectType: "Replacement",
    scopeSummary: "Replace damaged sidewalk panels.",
    includedScope: ["Demo panels", "Place broom finish concrete"],
    exclusions: ["Traffic control by GC"],
    sourceProposalId: "proposal-1",
    missingInfoStatus: "Ready",
    proposalReadinessLabel: "Ready",
    proposalReadinessScore: 95,
    followUpStatus: "Contacted",
    operationsNotes: "Confirm access before mobilization.",
    startDateTarget: "2026-05-20",
    crewNotes: "Two-person concrete crew.",
    scheduleNotes: "Coordinate after demo.",
    handoffStatus: "Ready for Ops Review",
  });

  assert.equal(checked.opsReadinessLabel, "Ready");
  assert.equal(checked.opsReadinessScore, 100);
  assert.equal(checked.opsReadinessIssues.length, 0);
  assert.equal(checked.opsReadinessChecklist.length, 19);
});

test("incomplete job handoff detects missing fields and scores not ready", () => {
  const checked = calculateJobHandoffOpsReadiness({
    id: "not-ready-handoff",
    projectName: "Unknown job",
    followUpStatus: "Waiting on Response",
  });

  assert.equal(checked.opsReadinessLabel, "Not Ready");
  assert.ok(checked.opsReadinessScore < 60);
  assert.ok(checked.opsReadinessIssues.some((issue) => /customer/i.test(issue)));
  assert.ok(checked.opsReadinessIssues.some((issue) => /waiting on response/i.test(issue)));
});

test("waiting on response blocks ready status even when other fields are strong", () => {
  const checked = calculateJobHandoffOpsReadiness({
    customerName: "ABC Apartments",
    contactName: "Alex GC",
    contactPhone: "555-0100",
    projectName: "Sidewalk repair",
    projectAddress: "123 Main St",
    serviceType: "Sidewalk",
    projectType: "Replacement",
    scopeSummary: "Replace sidewalk.",
    includedScope: ["Concrete replacement"],
    assumptions: ["Normal working hours"],
    sourceProposalId: "proposal-1",
    missingInfoStatus: "Ready",
    proposalReadinessLabel: "Ready",
    proposalReadinessScore: 90,
    followUpStatus: "Waiting on Response",
    operationsNotes: "Ops notes saved.",
    startDateTarget: "2026-05-20",
    crewNotes: "Crew notes saved.",
    scheduleNotes: "Schedule notes saved.",
    handoffStatus: "Ready to Create Job",
  });

  assert.equal(checked.opsReadinessLabel, "Needs Review");
  assert.ok(checked.opsReadinessIssues.some((issue) => /waiting on response/i.test(issue)));
});

test("TBD fields satisfy start date crew and schedule readiness items", () => {
  const basePacket = {
    customerName: "ABC Apartments",
    contactName: "Alex GC",
    contactEmail: "alex@example.com",
    projectName: "Sidewalk repair",
    projectAddress: "123 Main St",
    serviceType: "Sidewalk",
    projectType: "Replacement",
    scopeSummary: "Replace sidewalk.",
    includedScope: ["Concrete replacement"],
    assumptions: ["Normal working hours"],
    sourceProposalId: "proposal-1",
    missingInfoStatus: "Ready",
    proposalReadinessLabel: "Ready",
    proposalReadinessScore: 90,
    followUpStatus: "Contacted",
    operationsNotes: "Ops notes saved.",
    handoffStatus: "Ready for Ops Review",
  };
  const withTbd = ["startDateTarget", "crewNotes", "scheduleNotes"].reduce(
    (packet, field) => toggleJobHandoffOpsTbdField(packet, field),
    basePacket,
  );
  const checked = calculateJobHandoffOpsReadiness(withTbd);

  assert.equal(checked.opsReadinessLabel, "Ready");
  assert.equal(checked.opsReadinessScore, 100);
  assert.deepEqual(checked.opsReadinessTbdFields, ["startDateTarget", "crewNotes", "scheduleNotes"]);
});

test("readiness override requires a reason and preserves issues", () => {
  assert.throws(() => applyJobHandoffOpsReadinessOverride({ projectName: "Partial" }, ""), /override reason/i);

  const overridden = applyJobHandoffOpsReadinessOverride({ projectName: "Partial" }, "Ops reviewed by owner.");

  assert.equal(overridden.opsReadinessLabel, "Ready");
  assert.equal(overridden.opsReadinessOverride, true);
  assert.equal(overridden.opsReadinessOverrideReason, "Ops reviewed by owner.");
  assert.ok(overridden.opsReadinessIssues.length > 0);
});

test("readiness results persist through normalize merge and filters", () => {
  const checked = calculateJobHandoffOpsReadiness({
    id: "readiness-persist",
    projectName: "Partial",
    updatedAt: "2026-05-01T00:00:00.000Z",
  });
  const normalized = normalizeJobHandoff(checked);
  const merged = mergeJobHandoffs([], [normalized]);
  const notReadyPackets = filterJobHandoffs(merged, { opsReadinessFilter: "not_ready" });
  const stats = getJobHandoffStats(merged);

  assert.equal(merged[0].opsReadinessLabel, "Not Ready");
  assert.equal(merged[0].opsReadinessChecklist.length, 19);
  assert.equal(notReadyPackets.length, 1);
  assert.equal(stats.opsNotReady, 1);
});
