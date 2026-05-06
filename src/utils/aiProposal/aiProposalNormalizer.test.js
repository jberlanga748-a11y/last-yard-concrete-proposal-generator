import test from "node:test";
import assert from "node:assert/strict";

import { calculateProposalTotals, SEED_PROPOSAL, validateProposalCompleteness } from "../../proposalData.js";
import { applyAiProposalResultToProposal, buildSmartPasteNotesFromAiResult, summarizeAiProposalResult } from "./aiProposalNormalizer.js";

function blankProposalFixture() {
  return {
    ...structuredClone(SEED_PROPOSAL),
    templateId: "blank",
    client: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      projectAddress: "",
    },
    project: {
      name: "",
      location: "",
      address: "",
    },
    lineItems: [],
    pricingSections: [],
    scopeSections: [],
    submittedPacketRecords: [],
    sendRecords: [],
  };
}

test("applies mocked Costco AI extraction without fake Total Proposal alternate", () => {
  const result = applyAiProposalResultToProposal(
    {
      mode: "extract",
      extraction: {
        project: {
          name: "Costco #682 Albany POS Boxes Remodel",
          location: "Albany, Oregon",
          description:
            "Interior concrete / night work freezer slab package including phased sawcut, slab demo, haul-off, freezer slab prep, sand base, vapor barrier, insulation, PVC freezer vent pipe, reinforcement, new 6 in freezer slabs, curb work, bollards, patch allowance, line pump allowance, and cleanup.",
          schedule:
            "Estimated schedule to be confirmed after final phasing and approved night-work window. Current working assumption: night work only, one freezer area at a time, coordinated around active store operations.",
        },
        client: {
          companyName: "[VERIFY CUSTOMER / GC]",
          contactName: "[ENTER CONTACT NAME BEFORE SENDING]",
          email: "[ENTER EMAIL BEFORE SENDING]",
          phone: "[ENTER PHONE BEFORE SENDING]",
        },
        proposalType: "GC / Prime",
        lineItems: [{ description: "Base Bid", quantity: 1, unit: "LS", unitPrice: 325000 }],
        alternatesAllowances: [{ type: "add_alternate", label: "Add Alternate", description: "None currently", amount: 0 }],
        pricingSummary: [{ label: "Total Proposal", amount: 325000 }],
        scheduleOfValues: [
          { item: "1", description: "Base Bid", pricingBasis: "Included base scope", amount: 325000 },
          { item: "Total", description: "Total Proposal", pricingBasis: "Presentation total", amount: 325000 },
        ],
        scopeControl: {
          includedScope: "Interior freezer slab sawcut, slab demo, haul-off, prep, vapor barrier, insulation, vent pipe, reinforcement, new slabs, curb work, bollards, patch allowance, line pump allowance, and cleanup.",
          exclusions: "Store operations protection by others; refrigeration system work excluded; permits and testing by others.",
          clarifications: "Night work only and one freezer area at a time unless changed in writing.",
        },
        warnings: ["Verify client/contact fields before sending."],
      },
    },
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);
  const validation = validateProposalCompleteness(result.proposal);

  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.lineItems[0].unitPrice, 325000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.equal(totals.total, 325000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 325000);
  assert.match(result.proposal.project.proposedSchedule.display, /night work only/);
  assert.match(result.proposal.gcPrime.scopeControlSummary.includedScope, /Interior freezer slab/);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Total Proposal/);
  assert.doesNotMatch(validation.warnings.join("\n"), /Schedule of Values total/);
  assert.ok(validation.warnings.includes("Verify client/contact fields before sending."));
});

test("applies mocked NW Dunbar AI extraction with optional support separate from base", () => {
  const result = applyAiProposalResultToProposal(
    {
      mode: "extract",
      extraction: {
        project: { name: "NW Dunbar Avenue Improvements", location: "Troutdale, Oregon" },
        client: { companyName: "Faison Construction", contactName: "Maize", email: "maize@faisonconstruction.com" },
        isSubcontractor: true,
        lineItems: [{ description: "Base Concrete / Site Package", quantity: 1, unit: "LS", unitPrice: 695000 }],
        alternatesAllowances: [
          { type: "add_alternate", label: "Additive Alternate", amount: 225000, included: false },
          { type: "optional_support", label: "Optional Support Scope", amount: 210000, included: false },
        ],
        pricingSummary: [
          { label: "Total if Base + Additive", amount: 920000 },
          { label: "Total if Base + Additive + Optional Support", amount: 1130000 },
        ],
      },
    },
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.project.name, "NW Dunbar Avenue Improvements");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.pricingSections.length, 2);
  assert.equal(totals.total, 695000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 1130000);
  assert.equal(result.proposal.packetMode, "full_gc_packet");
});

test("summarizes AI review results without applying changes", () => {
  const summary = summarizeAiProposalResult({
    mode: "review",
    review: {
      recommendation: "Not ready to send.",
      findings: [{ severity: "warning", category: "Client", message: "VERIFY placeholder remains." }],
      warnings: ["Verify client/contact fields before sending."],
      missingInfo: ["Client contact"],
    },
  });

  assert.equal(summary.mode, "review");
  assert.equal(summary.recommendation, "Not ready to send.");
  assert.deepEqual(summary.missingInfo, ["Client contact"]);
  assert.deepEqual(summary.reviewNotes, ["VERIFY placeholder remains."]);
});

test("builds clean Smart Paste text from AI output", () => {
  const notes = buildSmartPasteNotesFromAiResult({
    mode: "extract",
    extraction: {
      project: { name: "Costco #682 Albany POS Boxes Remodel" },
      lineItems: [{ description: "Base Bid", quantity: 1, unit: "LS", unitPrice: 325000 }],
      pricingSummary: [{ label: "Total Proposal", amount: 325000 }],
      scopeControl: { includedScope: "Freezer slab scope." },
    },
  });

  assert.match(notes, /Project: Costco #682 Albany POS Boxes Remodel/);
  assert.match(notes, /Line items:/);
  assert.match(notes, /Total Proposal \| 325000/);
  assert.match(notes, /Scope Control Summary:/);
});
