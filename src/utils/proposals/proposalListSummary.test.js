import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProposalListSummaries,
  getLightweightProposalTotal,
  hasHeavyProposalListFields,
} from "./proposalListSummary.js";

test("proposal list summary derivation excludes heavy residential fields", () => {
  const summaries = buildProposalListSummaries(
    [
      {
        id: "proposal-1",
        proposalNumber: "P-100",
        proposalMode: "residential",
        pricingMode: "choose_one_option",
        project: { name: "Residential Patio" },
        client: { companyName: "Homeowner" },
        pricingOptions: [{ name: "Option 1", price: 82500, selected: true, images: [{ dataUrl: "data:image/jpeg;base64,large" }] }],
        optionalAddOns: [{ name: "Lighting", amount: 7000, selected: true }],
        residentialLegalPapers: { termsAndConditions: { status: "included" } },
        planSheets: [{ dataUrl: "data:image/jpeg;base64,large" }],
        projectPhotos: [{ dataUrl: "data:image/jpeg;base64,large" }],
      },
    ],
    [],
  );

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].projectName, "Residential Patio");
  assert.equal(summaries[0].clientCompanyName, "Homeowner");
  assert.equal(summaries[0].total, 89500);
  assert.equal(hasHeavyProposalListFields(summaries[0]), false);
  assert.equal("pricingOptions" in summaries[0], false);
  assert.equal("projectPhotos" in summaries[0], false);
  assert.equal("residentialLegalPapers" in summaries[0], false);
});

test("proposal list summary supports base-plus-addons totals and share status", () => {
  const [summary] = buildProposalListSummaries([
    {
      id: "proposal-2",
      customerShareEnabled: true,
      customerShareToken: "lyp_public",
      pricing: {
        pricingMode: "base_plus_addons",
        basePackage: { total: 40000 },
        optionalAddOns: [
          { name: "Walls", amount: 10000, selected: true },
          { name: "Lighting", amount: 7000, selected: false },
        ],
      },
    },
  ]);

  assert.equal(summary.total, 50000);
  assert.equal(summary.customerShareEnabled, true);
});

test("proposal list summary uses option-specific add-on amounts for selected residential option", () => {
  const total = getLightweightProposalTotal({
    pricingMode: "choose_one_option_with_addons",
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1", price: 40000, selected: false },
      { id: "proposal-2", name: "Proposal 2", price: 50000, selected: true },
    ],
    optionalAddOns: [
      {
        id: "walls",
        name: "Walls",
        selected: true,
        optionAmounts: [
          { optionId: "proposal-1", amount: 10000 },
          { optionId: "proposal-2", amount: 15000 },
        ],
      },
      { id: "lighting", name: "Lighting", amount: 7000, selected: true },
    ],
  });

  assert.equal(total, 72000);
});

test("proposal list summary keeps commercial and GC totals lightweight", () => {
  assert.equal(
    getLightweightProposalTotal({
      lineItems: [{ quantity: 2, unitPrice: 1000 }],
      pricingSections: [{ amount: 500, included: true }],
      financials: { taxRate: 0.1, discountAmount: 100 },
    }),
    2650,
  );
});

test("proposal list summary loads older proposals with missing new fields", () => {
  const summaries = buildProposalListSummaries([
    {
      id: "old-proposal",
      proposalNumber: "LYC-OLD",
      project: { name: "Older Saved Proposal" },
      client: { companyName: "Legacy Client" },
      lineItems: [{ description: "Concrete", quantity: 1, unitPrice: 1200 }],
    },
  ]);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, "old-proposal");
  assert.equal(summaries[0].projectName, "Older Saved Proposal");
  assert.equal(summaries[0].clientCompanyName, "Legacy Client");
  assert.equal(summaries[0].proposalType, "");
  assert.equal(summaries[0].customerShareEnabled, false);
  assert.equal(summaries[0].total, 1200);
});

test("proposal list summary tolerates missing and malformed residential pricing fields", () => {
  const summaries = buildProposalListSummaries([
    {
      id: "missing-pricing",
      proposalMode: "residential",
      project: { name: "No Pricing Object" },
    },
    {
      id: "malformed-pricing",
      proposalMode: "residential",
      pricingMode: "base_plus_addons",
      pricing: {
        basePackage: "not an object",
        optionalAddOns: { name: "not an array" },
      },
      pricingOptions: { name: "not an array" },
      optionalAddOns: "not an array",
      customerSelection: undefined,
      residentialLegalPapers: undefined,
    },
  ]);

  assert.equal(summaries.length, 2);
  assert.equal(summaries[0].id, "missing-pricing");
  assert.equal(summaries[0].total, 0);
  assert.equal(summaries[1].id, "malformed-pricing");
  assert.equal(summaries[1].total, 0);
});

test("one malformed proposal does not crash all proposal summaries", () => {
  const malformedProposal = {
    id: "bad-proposal",
    proposalNumber: "LYC-BAD",
    project: { name: "Needs Data Review" },
    client: { companyName: "Bad Data Client" },
  };

  Object.defineProperty(malformedProposal, "pricing", {
    get() {
      throw new Error("bad pricing getter");
    },
  });

  const summaries = buildProposalListSummaries([
    malformedProposal,
    {
      id: "good-proposal",
      proposalNumber: "LYC-GOOD",
      project: { name: "Good Proposal" },
      client: { companyName: "Good Client" },
      pricing: { pricingMode: "base_plus_addons", basePackage: { total: 40000 } },
    },
  ]);

  assert.equal(summaries.length, 2);
  assert.equal(summaries[0].id, "bad-proposal");
  assert.equal(summaries[0].projectName, "Needs Data Review");
  assert.equal(summaries[0].total, 0);
  assert.equal(summaries[1].id, "good-proposal");
  assert.equal(summaries[1].total, 40000);
});

test("proposal list summary does not strip full proposal data needed when opening", () => {
  const fullProposal = {
    id: "full-residential",
    proposalMode: "residential",
    pricing: {
      pricingMode: "choose_one_option",
      pricingOptions: [{ name: "Option 1", price: 82500, images: [{ publicUrl: "https://example.test/photo.jpg" }] }],
      optionalAddOns: [{ name: "Cantilever", amount: 8500 }],
    },
    residentialLegalPapers: { termsAndConditions: { status: "included" } },
    customerSelection: { status: "submitted", selectedTotal: 91000 },
  };

  const summaries = buildProposalListSummaries([fullProposal]);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, "full-residential");
  assert.equal(hasHeavyProposalListFields(summaries[0]), false);
  assert.equal(fullProposal.pricing.pricingOptions.length, 1);
  assert.equal(fullProposal.residentialLegalPapers.termsAndConditions.status, "included");
  assert.equal(fullProposal.customerSelection.status, "submitted");
});
