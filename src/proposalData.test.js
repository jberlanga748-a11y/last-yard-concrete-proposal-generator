import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_EXCLUSIONS,
  DEFAULT_PRICE_LIBRARY_ITEMS,
  DEFAULT_TERMS,
  PACKET_BUILDER_SECTIONS,
  PRICE_LIBRARY_CATEGORIES,
  SEED_PROPOSAL,
  applyTemplateToProposal,
  calculateProposalTotals,
  createPriceLibraryLineItem,
  getDefaultPriceLibrary,
  normalizePacketBuilder,
  normalizePriceLibrary,
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

test("applied customer selection total overrides original option estimate total", () => {
  const submittedTotals = calculateProposalTotals({
    lineItems: [{ description: "Original base option", quantity: 1, unitPrice: 40000 }],
    customerSelection: {
      status: "submitted",
      selectedTotal: 72000,
      selectedDownPayment: 36000,
      selectedFinalPayment: 36000,
    },
  });
  const appliedTotals = calculateProposalTotals({
    lineItems: [{ description: "Original base option", quantity: 1, unitPrice: 40000 }],
    pricing: {
      selectedTotal: 72000,
      selectedDownPayment: 36000,
      selectedFinalPayment: 36000,
    },
    customerSelection: {
      status: "applied_to_proposal",
      selectedTotal: 72000,
      selectedDownPayment: 36000,
      selectedFinalPayment: 36000,
    },
  });

  assert.equal(submittedTotals.total, 40000);
  assert.equal(appliedTotals.total, 72000);
  assert.equal(appliedTotals.deposit, 36000);
  assert.equal(appliedTotals.balanceDue, 36000);
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

test("SOV validation ignores optional alternates and presentation total rows", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      lineItems: [
        {
          description: "Base Concrete / Site Package",
          quantity: 1,
          taxable: true,
          unit: "LS",
          unitPrice: 695000,
        },
      ],
      gcPacketTables: {
        scheduleOfValues: {
          enabled: true,
          rows: [
            { item: "1", description: "Base Concrete / Site Package", pricingBasis: "Base Included", amount: "$695,000" },
            { item: "2", description: "Additive Alternate", pricingBasis: "Optional Add Alternate", amount: "$225,000" },
            { item: "3", description: "Optional Support Scope", pricingBasis: "Optional Support Scope", amount: "$210,000" },
            { item: "4", description: "Additive Alternate", pricingBasis: "Included in alternate total only", amount: "$225,000" },
            { item: "5", description: "Alternates", pricingBasis: "Optional presentation", amount: "$210,000" },
            { item: "Base + Additive", description: "Presentation subtotal", pricingBasis: "Presentation", amount: "$920,000" },
            { item: "Subtotal", description: "Total if Base + Additive", pricingBasis: "Presentation", amount: "$920,000" },
            {
              item: "Total if Base + Additive + Optional Support",
              description: "Presentation Total",
              pricingBasis: "Presentation",
              amount: "$1,130,000",
            },
          ],
        },
      },
    }),
  );

  assert.equal(result.errors.length, 0);
  assert.doesNotMatch(result.warnings.join("\n"), /3,180,000|Schedule of Values total/);
});

test("SOV validation ignores Total Proposal presentation rows", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      lineItems: [
        {
          description: "Base Bid",
          quantity: 1,
          taxable: true,
          unit: "LS",
          unitPrice: 325000,
        },
      ],
      gcPacketTables: {
        scheduleOfValues: {
          enabled: true,
          rows: [
            { item: "1", description: "Base Bid", pricingBasis: "Included base scope", amount: "$325,000" },
            { item: "Total", description: "Total Proposal", pricingBasis: "Presentation total", amount: "$325,000" },
          ],
        },
      },
    }),
  );

  assert.equal(result.errors.length, 0);
  assert.doesNotMatch(result.warnings.join("\n"), /Schedule of Values total/);
});

test("validation warns on draft client/contact placeholders without blocking draft completeness", () => {
  const result = validateProposalCompleteness(
    completeProposal({
      client: {
        companyName: "[VERIFY CUSTOMER / GC]",
        contactName: "[ENTER CONTACT NAME BEFORE SENDING]",
        email: "[ENTER EMAIL BEFORE SENDING]",
        phone: "[ENTER PHONE BEFORE SENDING]",
        projectAddress: "123 Project Way",
      },
    }),
  );

  assert.equal(result.isValid, true);
  assert.ok(result.warnings.includes("Verify client/contact fields before sending."));
});

test("GC / Prime Full Packet template sets GC proposal type and full packet mode", () => {
  const proposal = applyTemplateToProposal("gc_prime_full_packet", proposalFixture());

  assert.equal(proposal.proposalMode, "gc_prime_packet");
  assert.equal(proposal.proposalType, "gc_prime");
  assert.equal(proposal.type, "gc_prime");
  assert.equal(proposal.packetMode, "full_gc_packet");
  assert.ok(proposal.scopeSections.length > 0);
  assert.ok(proposal.exclusions.length > 0);
  assert.ok(proposal.terms.payment);
  assert.match(proposal.terms.gcScopeControl, /concrete scope specifically listed/i);
  assert.match(proposal.gcPacketTables.proposalNotes.contractScopeControl, /concrete scope specifically listed/i);
  assert.equal(proposal.gcPacketTables.pricingSummary.enabled, true);
});

test("Driveway template sets residential summary proposal defaults", () => {
  const proposal = applyTemplateToProposal("driveway", proposalFixture());

  assert.equal(proposal.proposalMode, "residential");
  assert.equal(proposal.proposalType, "residential");
  assert.equal(proposal.type, "residential");
  assert.equal(proposal.packetMode, "summary");
  assert.equal(proposal.project.category, "Residential driveway");
  assert.ok(proposal.scopeSections.length > 0);
  assert.ok(proposal.exclusions.length > 0);
  assert.ok(proposal.terms.payment);
  assert.equal(proposal.terms.gcScopeControl, undefined);
  assert.ok(proposal.lineItems.length > 0);
});

test("default price library includes active categorized unit price items", () => {
  const library = getDefaultPriceLibrary();

  assert.equal(library.length, DEFAULT_PRICE_LIBRARY_ITEMS.length);
  assert.ok(library.some((item) => item.name === "4 in broom finish sidewalk"));
  assert.ok(library.every((item) => PRICE_LIBRARY_CATEGORIES.includes(item.category)));
  assert.ok(library.every((item) => item.active === true));
});

test("normalizes price library list fields and allowed units", () => {
  const library = normalizePriceLibrary([
    {
      name: "Custom Item",
      category: "Sidewalk / Flatwork",
      defaultExclusions: "Permits\nTesting",
      defaultScopeBullets: ["Place concrete", ""],
      defaultUnitPrice: "12.50",
      defaultQuantity: "4",
      unit: "BAD",
    },
  ]);

  assert.equal(library[0].unit, "LS");
  assert.equal(library[0].defaultUnitPrice, 12.5);
  assert.equal(library[0].defaultQuantity, 4);
  assert.deepEqual(library[0].defaultExclusions, ["Permits", "Testing"]);
  assert.deepEqual(library[0].defaultScopeBullets, ["Place concrete"]);
});

test("creates proposal line items from price library items", () => {
  const lineItem = createPriceLibraryLineItem(
    {
      name: "Curb and gutter",
      category: "Curb / Gutter",
      description: "Curb and gutter",
      defaultNotes: "Per plan",
      defaultQuantity: 600,
      defaultUnitPrice: 14.5,
      taxable: false,
      unit: "LF",
    },
    "3",
  );

  assert.deepEqual(lineItem, {
    description: "Curb and gutter",
    itemNumber: "3",
    notes: "Per plan",
    quantity: 600,
    taxable: false,
    unit: "LF",
    unitPrice: 14.5,
  });
});

test("normalizes packet builder defaults and custom ordering", () => {
  const builder = normalizePacketBuilder([
    { id: "plan_sheet_pages", included: false, order: 5 },
    { id: "pricing_summary", included: true, order: 15 },
  ]);

  assert.equal(builder.length, PACKET_BUILDER_SECTIONS.length);
  assert.equal(builder[0].id, "plan_sheet_pages");
  assert.equal(builder[0].included, false);
  assert.equal(builder[2].id, "pricing_summary");
  assert.equal(builder.find((section) => section.id === "cover_summary").included, true);
  assert.ok(builder.every((section) => section.title));
});
