import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("app defines a public customer proposal route outside protected app chrome", () => {
  assert.match(appSource, /segments\[0\] === "proposal-view"/);
  assert.match(appSource, /view: "customerPortal"/);
  assert.match(appSource, /public: true/);
  assert.match(appSource, /if \(isCustomerPortalView\)/);
  assert.match(appSource, /<CustomerProposalPortalView/);
});

test("proposal editor includes customer portal link controls", () => {
  assert.match(appSource, /function CustomerPortalLinkEditor/);
  assert.match(appSource, /Enable customer link/);
  assert.match(appSource, /Generate Link/);
  assert.match(appSource, /Copy Link/);
  assert.match(appSource, /Disable Link/);
});

test("editable proposals preserve customer share fields safely", () => {
  assert.match(appSource, /customerShareEnabled: proposal\.customerShareEnabled === true/);
  assert.match(appSource, /customerShareToken: normalizeCustomerShareToken\(proposal\.customerShareToken\)/);
  assert.match(appSource, /customerShareCreatedAt: proposal\.customerShareCreatedAt \|\| ""/);
  assert.match(appSource, /customerShareExpiresAt: proposal\.customerShareExpiresAt \|\| ""/);
  assert.match(appSource, /customerShareLastViewedAt: proposal\.customerShareLastViewedAt \|\| ""/);
});

test("customer portal view is read-only and hides protected app navigation", () => {
  assert.match(appSource, /Customer Proposal View/);
  assert.match(appSource, /Read-only proposal/);
  assert.doesNotMatch(appSource.match(/function CustomerProposalPortalView[\s\S]*?function CustomerPortalHero/)?.[0] || "", /AppChrome|ProposalEditor|TeamAccessPanel|BackupRestorePanel/);
});

test("customer portal styling supports mobile and print-safe rendering", () => {
  assert.match(styleSource, /\.customer-portal-shell/);
  assert.match(styleSource, /\.customer-portal-option-card/);
  assert.match(styleSource, /@media \(max-width: 760px\)/);
  assert.match(styleSource, /@media print/);
  assert.match(styleSource, /page-break-inside: avoid/);
});
