import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomerSafeProposalPayload,
  createCustomerShareToken,
  fetchCustomerPortalProposalByToken,
  findCustomerProposalByShareToken,
  getCustomerPortalLink,
  getCustomerPortalUnavailableMessage,
  getCustomerSafeImageCaption,
  getCustomerShareFields,
  getCustomerShareStatus,
  isCustomerPortalRoute,
  normalizeCustomerShareToken,
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
  assert.equal("smartPasteNotes" in payload, false);
  assert.equal("internalTrackingNotes" in payload, false);
  assert.equal("fileName" in payload.pricing.pricingOptions[0].images[0], false);
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
