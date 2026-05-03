import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_EXCLUSIONS,
  DEFAULT_TERMS,
  SEED_PROPOSAL,
  applyTemplateToProposal,
  calculateProposalTotals,
  validateProposalCompleteness,
} from "./proposalData.js";

function proposalFixture(overrides = {}) {
  return {
    ...structuredClone(SEED_PROPOSAL),
    ...overrides,
  };
}

function completeProposal(overrides = {}) {
  return proposalFixture({
    client: {
      companyName: "ABC Prime Contractors",
      contactName: "Mike Smith",
      email: "mike@example.com",
      phone: "(555) 123-4567",
      projectAddress: "123 Project Way",
    },
    concreteSpecs: {
      psi: "4,000 PSI",
      thickness: "4 in",
    },
    exclusions: DEFAULT_EXCLUSIONS,
    lineItems: [
      {
        description: "Base Concrete Work",
        quantity: 1,
        taxable: true,
        unit: "LS",
        unitPrice: 1000,
      },
    ],
    project: {
      name: "Test Project",
      location: "Woodburn, OR",
    },
    projectPhotos: [{ src: "data:image/png;base64,demo" }],
    proposalDate: "2026-05-01",
    scopeSections: [{ title: "Concrete Work", items: ["Place concrete"] }],
    terms: DEFAULT_TERMS,
    validUntil: "2026-05-31",
    ...overrides,
  });
}

test("calculates line item subtotal, tax, discount, deposit, and balance due", () => {
  const totals = calculateProposalTotals({
    financials: {
      depositRate: 0.5,
      discountAmount: 50,
      taxRate: 0.1,
    },
    lineItems: [
      { description: "Flatwork", quantity: 2, taxable: true, unitPrice: 100 },
      { description: "Curb", quantity: 3, taxable: true, unitPrice: 50 },
    ],
  });

  assert.equal(totals.subtotal, 350);
  assert.equal(totals.discount, 50);
  assert.equal(totals.tax, 30);
  assert.equal(totals.baseBid, 330);
  assert.equal(totals.total, 330);
  assert.equal(totals.deposit, 165);
  assert.equal(totals.balanceDue, 165);
});

test("respects explicit deposit amount over deposit rate", () => {
  const totals = calculateProposalTotals({
    financials: {
      depositAmount: 125,
      depositRate: 0.5,
    },
    lineItems: [{ description: "Base Work", quantity: 1, unitPrice: 1000 }],
  });

  assert.equal(totals.total, 1000);
  assert.equal(totals.deposit, 125);
  assert.equal(totals.balanceDue, 875);
});

test("calculates included and excluded alternates and allowances", () => {
  const totals = calculateProposalTotals({
    financials: {},
    lineItems: [{ description: "Base Bid", quantity: 1, unitPrice: 1000 }],
    pricingSections: [
      { amount: 100, included: true, label: "Allowance", type: "allowance" },
      { amount: 50, included: false, label: "Add Alternate", type: "add_alternate" },
      { amount: 25, included: true, label: "Deduct Alternate", type: "deduct_alternate" },
      { amount: 10, included: true, label: "Unit Price", type: "unit_price" },
    ],
  });

  assert.equal(totals.baseBid, 1000);
  assert.equal(totals.includedPricingSectionsTotal, 85);
  assert.equal(totals.total, 1085);
  assert.equal(totals.totalIfAllAlternatesAccepted, 1125);
});

test("validation blocks missing project name", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      project: {
        location: "Woodburn, OR",
        name: "",
      },
    }),
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.includes("Add a project name."));
});

test("validation blocks missing client or contact name", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      client: {
        companyName: "",
        contactName: "",
        email: "mike@example.com",
        phone: "(555) 123-4567",
        projectAddress: "123 Project Way",
      },
    }),
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.includes("Add a client/company name or contact name."));
});

test("validation blocks missing line items", () => {
  const result = validateProposalCompleteness(completeProposal({ lineItems: [] }));

  assert.equal(result.isValid, false);
  assert.ok(result.errors.includes("Add at least one pricing line item."));
});

test("validation warnings do not block otherwise complete proposals", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      client: {
        companyName: "ABC Prime Contractors",
        contactName: "Mike Smith",
        projectAddress: "123 Project Way",
      },
      concreteSpecs: {},
      exclusions: [],
      projectPhotos: [],
      terms: {},
    }),
  );

  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.includes("Client email is missing."));
  assert.ok(result.warnings.includes("Client phone is missing."));
  assert.ok(result.warnings.includes("Exclusions are missing."));
  assert.ok(result.warnings.includes("Terms are missing."));
  assert.ok(result.warnings.includes("Concrete specifications are missing."));
  assert.ok(result.warnings.includes("Project photos are missing."));
});

test("GC / Prime Full Packet template sets GC proposal type and full packet mode", () => {
  const proposal = applyTemplateToProposal("gc_prime_full_packet", proposalFixture());

  assert.equal(proposal.proposalType, "gc_prime");
  assert.equal(proposal.type, "gc_prime");
  assert.equal(proposal.packetMode, "full_gc_packet");
  assert.ok(proposal.scopeSections.length > 0);
  assert.ok(proposal.exclusions.length > 0);
  assert.ok(proposal.terms.payment);
  assert.equal(proposal.gcPacketTables.pricingSummary.enabled, true);
});

test("Driveway template sets residential summary proposal defaults", () => {
  const proposal = applyTemplateToProposal("driveway", proposalFixture());

  assert.equal(proposal.proposalType, "residential");
  assert.equal(proposal.type, "residential");
  assert.equal(proposal.packetMode, "summary");
  assert.equal(proposal.project.category, "Residential driveway");
  assert.ok(proposal.scopeSections.length > 0);
  assert.ok(proposal.exclusions.length > 0);
  assert.ok(proposal.terms.payment);
  assert.ok(proposal.lineItems.length > 0);
});
