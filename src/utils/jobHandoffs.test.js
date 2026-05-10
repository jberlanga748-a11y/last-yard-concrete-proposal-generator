import assert from "node:assert/strict";
import test from "node:test";

import {
  JOB_HANDOFF_STATUSES,
  createJobHandoffFromLead,
  filterJobHandoffs,
  findJobHandoffForLead,
  findJobHandoffForProposal,
  formatJobHandoffSummary,
  getJobHandoffStats,
  mergeJobHandoffs,
  normalizeJobHandoff,
  normalizeJobHandoffs,
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
