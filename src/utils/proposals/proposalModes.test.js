import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getPacketModeForProposalMode,
  getProposalModeFromBlankSlug,
  getProposalTypeForMode,
  inferProposalModeFromProposal,
  inferProposalModeFromSmartPaste,
  normalizeProposalMode,
} from "./proposalModes.js";

test("normalizes explicit proposal mode aliases", () => {
  assert.equal(normalizeProposalMode("Residential Customer Proposal"), "residential");
  assert.equal(normalizeProposalMode("commercial-subcontractor"), "commercial_subcontractor");
  assert.equal(normalizeProposalMode("Full GC Packet"), "gc_prime_packet");
});

test("maps proposal modes to existing proposal type and packet mode fields", () => {
  assert.equal(getProposalTypeForMode("residential"), "residential");
  assert.equal(getPacketModeForProposalMode("residential"), "summary");
  assert.equal(getProposalTypeForMode("commercial_subcontractor"), "commercial");
  assert.equal(getPacketModeForProposalMode("commercial_subcontractor"), "summary");
  assert.equal(getProposalTypeForMode("gc_prime_packet"), "gc_prime");
  assert.equal(getPacketModeForProposalMode("gc_prime_packet"), "full_gc_packet");
});

test("resolves blank proposal mode slugs", () => {
  assert.equal(getProposalModeFromBlankSlug("residential"), "residential");
  assert.equal(getProposalModeFromBlankSlug("commercial"), "commercial_subcontractor");
  assert.equal(getProposalModeFromBlankSlug("gc-prime"), "gc_prime_packet");
  assert.equal(getProposalModeFromBlankSlug(""), "commercial_subcontractor");
});

test("infers saved proposal modes without forcing simple proposals into residential", () => {
  assert.equal(inferProposalModeFromProposal({ proposalMode: "residential", proposalType: "commercial" }), "residential");
  assert.equal(inferProposalModeFromProposal({ proposalType: "residential" }), "residential");
  assert.equal(inferProposalModeFromProposal({ proposalType: "commercial", project: { name: "Retail TI" } }), "commercial_subcontractor");
  assert.equal(inferProposalModeFromProposal({ packetMode: "full_gc_packet" }), "gc_prime_packet");
  assert.equal(
    inferProposalModeFromProposal({
      gcPacketTables: {
        takeoffQuantities: {
          enabled: true,
          rows: [{ item: "Slab demo", quantity: "1,440 SF" }],
        },
      },
    }),
    "gc_prime_packet",
  );
});

test("infers Smart Paste modes from explicit JSON and rough notes", () => {
  assert.equal(inferProposalModeFromSmartPaste({ proposalMode: "residential" }), "residential");
  assert.equal(
    inferProposalModeFromSmartPaste(
      { pricing: { pricingMode: "choose_one_option", pricingOptions: [{ name: "Option 1", price: 82500 }] } },
      "",
    ),
    "residential",
  );
  assert.equal(inferProposalModeFromSmartPaste({}, "Customer chooses one of Option 1, Option 2, or Option 3 finish options."), "residential");
  assert.equal(
    inferProposalModeFromSmartPaste({
      packet: {
        takeoffQuantities: [{ item: "Freezer slab" }],
        rfiRegister: [{ number: "RFI-01" }],
        finalPacketPrintOrder: [{ order: 10, label: "Cover", status: "Included" }],
      },
    }),
    "gc_prime_packet",
  );
  assert.equal(inferProposalModeFromSmartPaste({}, "Concrete subcontractor proposal bid to GC with addenda and RFIs."), "commercial_subcontractor");
});
