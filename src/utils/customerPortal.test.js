import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCustomerSelectionToProposal,
  buildCustomerApprovalRecord,
  buildCustomerSelectionReview,
  buildSubmittedCustomerSelection,
  calculateCustomerSelectionSummary,
  canCustomerApproveProposal,
  createCustomerSafeProposalPayload,
  createCustomerShareToken,
  createCustomerPortalSelectionDraft,
  CUSTOMER_SELECTION_STATUS_APPLIED,
  CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED,
  CUSTOMER_SELECTION_STATUS_REVIEWED,
  fetchCustomerPortalProposalByToken,
  findCustomerProposalByShareToken,
  getAppliedCustomerSelectionSummary,
  getCustomerPortalLink,
  getCustomerPortalUnavailableMessage,
  getCustomerSafeImageCaption,
  getCustomerShareFields,
  getCustomerShareStatus,
  isCustomerPortalRoute,
  normalizeCustomerApproval,
  normalizeCustomerSelection,
  normalizeCustomerShareToken,
  submitCustomerPortalApprovalByToken,
  submitCustomerPortalSelectionByToken,
} from "./customerPortal.js";

test("customer share token is normalized and generated with a safe prefix", () => {
  const bytes = new Uint8Array(18).fill(7);
  const token = createCustomerShareToken({
    getRandomValues(target) {
      target.set(bytes);
      return target;
    },
  });

  assert.equal(token, "lyp_070707070707070707070707070707070707");
  assert.equal(normalizeCustomerShareToken(" lyp_abc-123!@# "), "lyp_abc-123");
});

test("valid customer share token finds one enabled proposal", () => {
  const proposal = {
    id: "proposal-1",
    customerShareEnabled: true,
    customerShareToken: "lyp_public",
  };
  const result = findCustomerProposalByShareToken([proposal], "lyp_public", new Date("2026-05-08T12:00:00Z"));

  assert.equal(result.available, true);
  assert.equal(result.proposal.id, "proposal-1");
  assert.equal(result.reason, "available");
});

test("disabled, expired, and invalid customer links do not render a proposal", () => {
  const now = new Date("2026-05-08T12:00:00Z");
  const disabled = getCustomerShareStatus(
    {
      customerShareEnabled: false,
      customerShareToken: "lyp_disabled",
    },
    "lyp_disabled",
    now,
  );
  const expired = getCustomerShareStatus(
    {
      customerShareEnabled: true,
      customerShareToken: "lyp_expired",
      customerShareExpiresAt: "2026-05-07",
    },
    "lyp_expired",
    now,
  );
  const missing = findCustomerProposalByShareToken([], "lyp_missing", now);

  assert.equal(disabled.available, false);
  assert.equal(disabled.reason, "disabled");
  assert.equal(expired.available, false);
  assert.equal(expired.reason, "expired");
  assert.equal(missing.available, false);
  assert.equal(missing.reason, "not-found");
});

test("customer portal route is explicitly public without marking protected app routes public", () => {
  assert.equal(isCustomerPortalRoute({ view: "customerPortal", public: true }), true);
  assert.equal(isCustomerPortalRoute({ view: "dashboard", path: "/dashboard" }), false);
});

test("customer portal link and field defaults are safe for old proposals", () => {
  assert.equal(getCustomerPortalLink("https://lastyard.example/", "lyp_token"), "https://lastyard.example/proposal-view/lyp_token");
  assert.deepEqual(getCustomerShareFields({}), {
    customerShareEnabled: false,
    customerShareToken: "",
    customerShareCreatedAt: "",
    customerShareExpiresAt: "",
    customerShareLastViewedAt: "",
  });
});

test("customer portal unavailable messages and image captions stay customer safe", () => {
  assert.match(getCustomerPortalUnavailableMessage("expired"), /expired/i);
  assert.equal(getCustomerSafeImageCaption({ caption: "IMG_5474.png" }, "Existing Area"), "Existing Area");
  assert.equal(getCustomerSafeImageCaption({ caption: "Broom finish example" }, "Existing Area"), "Broom finish example");
});

test("customer-safe proposal payload preserves residential cloud fields and strips internal data", () => {
  const payload = createCustomerSafeProposalPayload({
    id: "proposal-1",
    proposalMode: "residential",
    residentialPdfLayout: "simple_estimate",
    customerShareEnabled: true,
    customerShareToken: "lyp_public",
    smartPasteNotes: "internal raw notes",
    internalTrackingNotes: "internal margin note",
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: {
        name: "Base package",
        images: [{ fileName: "IMG_5474.png", publicUrl: "https://cdn.example/base.jpg", caption: "Existing Area" }],
      },
      pricingOptions: [
        {
          name: "Option 1",
          price: 82500,
          images: [{ fileName: "IMG_1111.jpg", publicUrl: "https://cdn.example/option.jpg", caption: "Broom finish example" }],
          scheduleOfValues: [{ item: "Concrete", amount: 82500 }],
        },
      ],
      optionalAddOns: [
        {
          name: "Cantilever",
          amount: 8500,
          selected: true,
          images: [{ storagePath: "company/demo/option-photos/cantilever.jpg", caption: "Cantilever example" }],
        },
      ],
      selectedAddOnIds: ["addon-1"],
      pricingExamples: [{ label: "Example", amount: 91000 }],
      paymentExamples: [{ label: "Down", amount: 45500 }],
    },
    projectPhotos: [{ fileName: "IMG_5474.png", publicUrl: "https://cdn.example/project.jpg", caption: "IMG_5474.png" }],
    residentialLegalPapers: {
      termsAndConditions: {
        status: "included",
      },
    },
  });

  assert.equal(payload.customerShareEnabled, true);
  assert.equal(payload.customerShareToken, "lyp_public");
  assert.equal(payload.residentialPdfLayout, "simple_estimate");
  assert.equal(payload.pricing.pricingMode, "base_plus_addons");
  assert.equal(payload.pricing.pricingOptions[0].price, 82500);
  assert.equal(payload.pricing.optionalAddOns[0].selected, true);
  assert.equal(payload.pricing.selectedAddOnIds[0], "addon-1");
  assert.equal(payload.pricing.basePackage.images[0].publicUrl, "https://cdn.example/base.jpg");
  assert.equal(payload.projectPhotos[0].caption || "", "");
  assert.equal(payload.residentialLegalPapers.termsAndConditions.status, "included");
  assert.equal(payload.customerSelection.status, "none");
  assert.equal("smartPasteNotes" in payload, false);
  assert.equal("internalTrackingNotes" in payload, false);
  assert.equal("fileName" in payload.pricing.pricingOptions[0].images[0], false);
});

test("base-plus-addons customer selection calculates selected total without changing pricing", () => {
  const proposal = {
    pricingMode: "base_plus_addons",
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: { name: "Base package", price: 40000 },
      optionalAddOns: [
        { id: "walls", name: "Walls", amount: 10000 },
        { id: "lighting", name: "Lighting", amount: 7000 },
      ],
    },
  };
  const summary = calculateCustomerSelectionSummary(proposal, {
    selectedAddOnIds: ["walls"],
    selectedPricingMode: "base_plus_addons",
  });
  const submitted = buildSubmittedCustomerSelection(proposal, {
    customerName: "Homeowner",
    selectedAddOnIds: ["walls"],
    selectedPricingMode: "base_plus_addons",
  }, "2026-05-09T12:00:00.000Z");

  assert.equal(summary.selectedTotal, 50000);
  assert.equal(summary.selectedDownPayment, 25000);
  assert.equal(summary.selectedFinalPayment, 25000);
  assert.deepEqual(summary.selectedAddOnNames, ["Walls"]);
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.customerName, "Homeowner");
  assert.equal(proposal.pricing.optionalAddOns[0].selected, undefined);
});

test("choose-one customer selection allows one option and selected add-ons only", () => {
  const proposal = {
    pricingMode: "choose_one_option",
    pricingOptions: [
      { id: "broom", name: "Broom Finish", price: 82500 },
      { id: "stamped", name: "Stamped Finish", price: 97500 },
    ],
    optionalAddOns: [
      { id: "cantilever", name: "Cantilever", amount: 8500, appliesTo: ["Broom Finish", "Stamped Finish"] },
      { id: "border", name: "Decorative Border", amount: 2500, appliesTo: ["Broom Finish"] },
    ],
  };
  const summary = calculateCustomerSelectionSummary(proposal, {
    selectedAddOnIds: ["cantilever", "border"],
    selectedOptionId: "stamped",
    selectedPricingMode: "choose_one_option",
  });

  assert.equal(summary.selectedOptionName, "Stamped Finish");
  assert.equal(summary.selectedTotal, 106000);
  assert.deepEqual(summary.selectedAddOnNames, ["Cantilever"]);
  assert.equal(summary.selectedAddOnNames.includes("Decorative Border"), false);
});

test("customer portal selection draft defaults from proposal but preserves submitted selection", () => {
  const proposal = {
    client: { contactName: "Homeowner", email: "home@example.com" },
    pricingMode: "choose_one_option",
    pricingOptions: [
      { id: "option-1", name: "Option 1", price: 40000, included: false },
      { id: "option-2", name: "Option 2", price: 50000, included: true },
    ],
    optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000, selected: true }],
  };
  const draft = createCustomerPortalSelectionDraft(proposal);
  const submittedDraft = createCustomerPortalSelectionDraft({
    ...proposal,
    customerSelection: {
      status: "submitted",
      selectedOptionId: "option-1",
      selectedAddOnIds: [],
    },
  });

  assert.equal(draft.customerName, "Homeowner");
  assert.equal(draft.customerEmail, "home@example.com");
  assert.equal(draft.selectedOptionId, "option-2");
  assert.deepEqual(draft.selectedAddOnIds, ["walls"]);
  assert.equal(submittedDraft.selectedOptionId, "option-1");
  assert.deepEqual(submittedDraft.selectedAddOnIds, []);
});

test("customer selection normalization is safe for old proposals", () => {
  assert.deepEqual(normalizeCustomerSelection({ selectedAddOnIds: "walls\nlighting", selectedTotal: "$50,000" }), {
    status: "none",
    submittedAt: "",
    reviewedAt: "",
    reviewedBy: "",
    appliedAt: "",
    appliedBy: "",
    appliedSnapshot: {},
    appliedProposalTotal: 0,
    appliedDownPayment: 0,
    appliedFinalPayment: 0,
    reviewNotes: "",
    selectedPricingMode: "",
    selectedOptionId: "",
    selectedOptionName: "",
    selectedAddOnIds: ["walls", "lighting"],
    selectedAddOnNames: [],
    selectedAddOnAmounts: [],
    selectedTotal: 50000,
    selectedDownPayment: 0,
    selectedFinalPayment: 0,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerNotes: "",
  });
});

test("choose-one with add-ons uses option-specific add-on amounts", () => {
  const proposal = {
    pricingMode: "choose_one_option_with_addons",
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000 },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000 },
      { id: "proposal-3", name: "Proposal 3 - Stamped Finish Package", price: 60000 },
    ],
    optionalAddOns: [
      {
        id: "walls",
        name: "Walls",
        optionAmounts: [
          { optionId: "proposal-1", amount: 10000 },
          { optionId: "proposal-2", amount: 15000 },
          { optionId: "proposal-3", amount: 20000 },
        ],
      },
      { id: "lighting", name: "Lighting", amount: 7000 },
      {
        id: "cantilever",
        name: "Cantilever-Style Stair Upgrade",
        optionAmounts: [
          { optionName: "Proposal 1 - Broom Finish Package", amount: 10000 },
          { optionName: "Proposal 2 - Exposed Finish Package", amount: 15000 },
          { optionName: "Proposal 3 - Stamped Finish Package", amount: 20000 },
        ],
      },
    ],
  };
  const totalFor = (selectedOptionId, selectedAddOnIds) =>
    calculateCustomerSelectionSummary(proposal, {
      selectedAddOnIds,
      selectedOptionId,
      selectedPricingMode: "choose_one_option_with_addons",
    });

  assert.equal(totalFor("proposal-1", ["walls"]).selectedTotal, 50000);
  assert.equal(totalFor("proposal-1", ["lighting"]).selectedTotal, 47000);
  assert.equal(totalFor("proposal-1", ["cantilever"]).selectedTotal, 50000);
  assert.equal(totalFor("proposal-1", ["walls", "lighting", "cantilever"]).selectedTotal, 67000);
  assert.equal(totalFor("proposal-2", ["walls", "lighting"]).selectedTotal, 72000);
  assert.equal(totalFor("proposal-2", ["walls", "lighting", "cantilever"]).selectedTotal, 87000);
  assert.equal(totalFor("proposal-3", ["walls", "cantilever"]).selectedTotal, 100000);
  const proposal3Summary = totalFor("proposal-3", ["walls", "lighting", "cantilever"]);

  assert.equal(proposal3Summary.selectedTotal, 107000);
  assert.deepEqual(
    proposal3Summary.selectedAddOnAmounts.map((row) => [row.name, row.amount]),
    [
      ["Walls", 20000],
      ["Lighting", 7000],
      ["Cantilever-Style Stair Upgrade", 20000],
    ],
  );
});

test("reviewing a customer selection does not change proposal pricing", () => {
  const proposal = {
    pricingMode: "base_plus_addons",
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: { name: "Base package", price: 40000 },
      optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000 }],
    },
    customerSelection: buildSubmittedCustomerSelection({
      pricingMode: "base_plus_addons",
      pricing: {
        pricingMode: "base_plus_addons",
        basePackage: { name: "Base package", price: 40000 },
        optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000 }],
      },
    }, { selectedAddOnIds: ["walls"] }, "2026-05-09T12:00:00.000Z"),
  };
  const reviewed = buildCustomerSelectionReview(proposal.customerSelection, "Estimator", "2026-05-09T12:05:00.000Z");

  assert.equal(reviewed.status, CUSTOMER_SELECTION_STATUS_REVIEWED);
  assert.equal(reviewed.selectedTotal, 50000);
  assert.equal(proposal.pricing.optionalAddOns[0].selected, undefined);
  assert.equal(proposal.pricing.basePackage.price, 40000);
});

test("applying base-plus-addons customer selection updates selected total and preserves add-ons", () => {
  const proposal = {
    pricingMode: "base_plus_addons",
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: { id: "base", name: "Base package", price: 40000 },
      optionalAddOns: [
        { id: "walls", name: "Walls", amount: 10000 },
        { id: "lighting", name: "Lighting", amount: 7000 },
      ],
    },
    customerSelection: buildSubmittedCustomerSelection({
      pricingMode: "base_plus_addons",
      pricing: {
        pricingMode: "base_plus_addons",
        basePackage: { id: "base", name: "Base package", price: 40000 },
        optionalAddOns: [
          { id: "walls", name: "Walls", amount: 10000 },
          { id: "lighting", name: "Lighting", amount: 7000 },
        ],
      },
    }, { selectedAddOnIds: ["walls"] }, "2026-05-09T12:00:00.000Z"),
  };
  const result = applyCustomerSelectionToProposal(proposal, {
    appliedAt: "2026-05-09T12:10:00.000Z",
    appliedBy: "Estimator",
  });

  assert.equal(result.applied, true);
  assert.equal(result.proposal.customerSelection.status, CUSTOMER_SELECTION_STATUS_APPLIED);
  assert.equal(result.proposal.pricing.totalProposal, 50000);
  assert.equal(result.proposal.pricing.selectedDownPayment, 25000);
  assert.equal(result.proposal.pricing.optionalAddOns.length, 2);
  assert.equal(result.proposal.pricing.optionalAddOns[0].selected, true);
  assert.equal(result.proposal.pricing.optionalAddOns[1].selected, false);
  assert.equal(result.proposal.customerSelection.appliedSnapshot.selectedAddOnNames[0], "Walls");
});

test("applying choose-one customer selection selects one option without deleting history", () => {
  const proposal = {
    pricingMode: "choose_one_option",
    pricingOptions: [
      { id: "broom", name: "Broom Finish", price: 82500 },
      { id: "stamped", name: "Stamped Finish", price: 97500 },
    ],
    optionalAddOns: [{ id: "cantilever", name: "Cantilever", amount: 8500 }],
    customerSelection: buildSubmittedCustomerSelection({
      pricingMode: "choose_one_option",
      pricingOptions: [
        { id: "broom", name: "Broom Finish", price: 82500 },
        { id: "stamped", name: "Stamped Finish", price: 97500 },
      ],
      optionalAddOns: [{ id: "cantilever", name: "Cantilever", amount: 8500 }],
    }, {
      selectedAddOnIds: ["cantilever"],
      selectedOptionId: "stamped",
      selectedPricingMode: "choose_one_option",
    }, "2026-05-09T12:00:00.000Z"),
  };
  const result = applyCustomerSelectionToProposal(proposal);

  assert.equal(result.applied, true);
  assert.equal(result.proposal.totalProposal, 106000);
  assert.equal(result.proposal.pricingOptions.length, 2);
  assert.equal(result.proposal.pricingOptions[0].selected, false);
  assert.equal(result.proposal.pricingOptions[1].selected, true);
  assert.equal(result.proposal.optionalAddOns[0].selected, true);
  assert.equal(getAppliedCustomerSelectionSummary(result.proposal).selectedTotal, 106000);
});

test("applying choose-one with add-ons preserves original add-ons and stores selected amounts", () => {
  const sourceProposal = {
    pricingMode: "choose_one_option_with_addons",
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000 },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000 },
      { id: "proposal-3", name: "Proposal 3 - Stamped Finish Package", price: 60000 },
    ],
    optionalAddOns: [
      { id: "walls", name: "Walls", optionAmounts: [{ optionId: "proposal-2", amount: 15000 }] },
      { id: "lighting", name: "Lighting", amount: 7000 },
      { id: "cantilever", name: "Cantilever-Style Stair Upgrade", optionAmounts: [{ optionId: "proposal-2", amount: 15000 }] },
    ],
  };
  const proposal = {
    ...sourceProposal,
    customerSelection: buildSubmittedCustomerSelection(sourceProposal, {
      selectedAddOnIds: ["walls", "lighting", "cantilever"],
      selectedOptionId: "proposal-2",
      selectedPricingMode: "choose_one_option_with_addons",
    }),
  };
  const result = applyCustomerSelectionToProposal(proposal);

  assert.equal(result.applied, true);
  assert.equal(result.proposal.totalProposal, 87000);
  assert.equal(result.proposal.pricingOptions.length, 3);
  assert.equal(result.proposal.optionalAddOns[0].amount, undefined);
  assert.equal(result.proposal.optionalAddOns[0].selectedAmount, 15000);
  assert.equal(result.proposal.optionalAddOns[1].amount, 7000);
  assert.equal(result.proposal.optionalAddOns[1].selectedAmount, 7000);
  assert.deepEqual(
    result.proposal.customerSelection.selectedAddOnAmounts.map((row) => [row.id, row.amount]),
    [
      ["walls", 15000],
      ["lighting", 7000],
      ["cantilever", 15000],
    ],
  );
});

test("customer approval requires an applied selection and stores signature snapshot", () => {
  const submittedProposal = {
    pricingMode: "base_plus_addons",
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: { name: "Base package", price: 40000 },
      optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000 }],
    },
    customerSelection: buildSubmittedCustomerSelection({
      pricingMode: "base_plus_addons",
      pricing: {
        pricingMode: "base_plus_addons",
        basePackage: { name: "Base package", price: 40000 },
        optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000 }],
      },
    }, { customerName: "Homeowner", selectedAddOnIds: ["walls"] }),
  };
  const applied = applyCustomerSelectionToProposal(submittedProposal).proposal;
  const approval = buildCustomerApprovalRecord(applied, {
    acknowledgedLegalTerms: true,
    acknowledgedNotices: true,
    acknowledgedPaymentTerms: true,
    acknowledgedScope: true,
    typedSignature: "Homeowner",
  }, {
    approvedAt: "2026-05-09T13:00:00.000Z",
    ipAddress: "203.0.113.10",
    userAgent: "node-test",
  });

  assert.equal(canCustomerApproveProposal(submittedProposal), false);
  assert.equal(canCustomerApproveProposal(applied), true);
  assert.equal(approval.status, "approved_signed");
  assert.equal(approval.acceptedTotal, 50000);
  assert.equal(approval.acceptedDownPayment, 25000);
  assert.equal(approval.typedSignature, "Homeowner");
  assert.equal(approval.ipAddress, "203.0.113.10");
  assert.equal(approval.acceptedSelectionSnapshot.selectedAddOnNames[0], "Walls");
  assert.equal(normalizeCustomerApproval({ status: "bogus" }).status, "none");
});

test("customer portal API helper loads public proposal payload without signed-in local state", async () => {
  const result = await fetchCustomerPortalProposalByToken("lyp_public", {
    endpoint: "/api/customer-proposal",
    fetchImpl: async (url) => {
      assert.equal(url, "/api/customer-proposal?shareToken=lyp_public");

      return {
        ok: true,
        headers: {
          get: () => "application/json",
        },
        async json() {
          return {
            available: true,
            reason: "available",
            proposal: {
              id: "proposal-1",
              customerShareEnabled: true,
              customerShareToken: "lyp_public",
            },
          };
        },
      };
    },
  });

  assert.equal(result.available, true);
  assert.equal(result.reason, "available");
  assert.equal(result.proposal.id, "proposal-1");
});

test("customer portal API helper returns disabled, expired, and unavailable reasons safely", async () => {
  const disabled = await fetchCustomerPortalProposalByToken("lyp_disabled", {
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      headers: {
        get: () => "application/json",
      },
      async json() {
        return { reason: "disabled" };
      },
    }),
  });
  const expired = await fetchCustomerPortalProposalByToken("lyp_expired", {
    fetchImpl: async () => ({
      ok: false,
      status: 410,
      headers: {
        get: () => "application/json",
      },
      async json() {
        return { reason: "expired" };
      },
    }),
  });
  const unavailable = await fetchCustomerPortalProposalByToken("lyp_local", {
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      headers: {
        get: () => "text/html",
      },
      async json() {
        throw new Error("not json");
      },
    }),
  });

  assert.equal(disabled.reason, "disabled");
  assert.equal(expired.reason, "expired");
  assert.equal(unavailable.reason, "api-unavailable");
});

test("customer portal submit helper posts selection and handles rejected tokens", async () => {
  const submitted = await submitCustomerPortalSelectionByToken("lyp_public", { selectedAddOnIds: ["walls"] }, {
    fetchImpl: async (url, options) => {
      assert.equal(url, "/api/customer-proposal");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), {
        shareToken: "lyp_public",
        selection: { selectedAddOnIds: ["walls"] },
      });

      return {
        ok: true,
        headers: { get: () => "application/json" },
        async json() {
          return {
            ok: true,
            available: true,
            customerSelection: {
              status: "submitted",
              selectedTotal: 50000,
            },
            proposal: { id: "proposal-1" },
          };
        },
      };
    },
  });
  const disabled = await submitCustomerPortalSelectionByToken("lyp_disabled", {}, {
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      headers: { get: () => "application/json" },
      async json() {
        return { reason: "disabled" };
      },
    }),
  });

  assert.equal(submitted.ok, true);
  assert.equal(submitted.customerSelection.status, "submitted");
  assert.equal(submitted.customerSelection.selectedTotal, 50000);
  assert.equal(disabled.reason, "disabled");
});

test("customer portal approval helper posts only approval action fields", async () => {
  const approval = {
    acknowledgedLegalTerms: true,
    acknowledgedNotices: true,
    acknowledgedPaymentTerms: true,
    acknowledgedScope: true,
    customerName: "Homeowner",
    typedSignature: "Homeowner",
  };
  const submitted = await submitCustomerPortalApprovalByToken("lyp_public", approval, {
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);

      assert.equal(url, "/api/customer-proposal");
      assert.equal(options.method, "POST");
      assert.equal(body.action, "approve");
      assert.equal(body.shareToken, "lyp_public");
      assert.deepEqual(body.approval, approval);
      assert.equal("pricing" in body, false);
      assert.equal("scopeSections" in body, false);

      return {
        ok: true,
        headers: { get: () => "application/json" },
        async json() {
          return {
            ok: true,
            available: true,
            customerApproval: {
              status: "approved_signed",
              acceptedTotal: 50000,
            },
            customerSelection: {
              status: CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED,
            },
            proposal: { id: "proposal-1" },
          };
        },
      };
    },
  });

  assert.equal(submitted.ok, true);
  assert.equal(submitted.customerApproval.status, "approved_signed");
  assert.equal(submitted.customerApproval.acceptedTotal, 50000);
  assert.equal(submitted.customerSelection.status, CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED);
});
