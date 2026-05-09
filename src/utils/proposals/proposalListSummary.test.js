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
