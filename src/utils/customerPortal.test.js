import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomerShareToken,
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
