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
  assert.match(styleSource, /@media \(max-width: 768px\)/);
  assert.match(styleSource, /@media \(max-width: 480px\)/);
  assert.match(styleSource, /@media (?:only )?print/);
  assert.match(styleSource, /page-break-inside: avoid/);
});

test("customer portal mobile CSS prevents horizontal scroll and stacks pricing rows", () => {
  assert.match(styleSource, /\.customer-portal-shell\s*\{[\s\S]*?overflow-x:\s*hidden/);
  assert.match(styleSource, /\.customer-portal-page\s*\{[\s\S]*?overflow-x:\s*hidden/);
  assert.match(styleSource, /@media \(max-width: 768px\)[\s\S]*?\.customer-portal-toolbar button\s*\{[\s\S]*?width:\s*100%/);
  assert.match(styleSource, /@media \(max-width: 768px\)[\s\S]*?\.customer-portal-table-row,[\s\S]*?\.customer-portal-addon-row,[\s\S]*?\.customer-portal-notice-row\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styleSource, /@media \(max-width: 480px\)[\s\S]*?\.customer-portal-document\s*\{[\s\S]*?padding:\s*10px/);
});

test("customer portal photos are responsive and non-distorting", () => {
  assert.match(styleSource, /\.customer-portal-photo-tile img\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(styleSource, /\.customer-portal-photo-tile img\s*\{[\s\S]*?object-position:\s*center/);
  assert.match(styleSource, /@media \(max-width: 768px\)[\s\S]*?\.customer-portal-photo-grid,[\s\S]*?\.customer-portal-legal-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styleSource, /@media \(max-width: 480px\)[\s\S]*?\.customer-portal-photo-tile img\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*3/);
});

test("customer portal renders simple-estimate and choose-one customer pricing content", () => {
  assert.match(appSource, /function CustomerPortalSimpleEstimatePricing/);
  assert.match(appSource, /Estimate Total/);
  assert.match(appSource, /Optional Add-On:/);
  assert.match(appSource, /Selected/);
  assert.match(appSource, /Not Selected/);
  assert.match(appSource, /function CustomerPortalChooseOnePricing/);
  assert.match(appSource, /Customer to Select One/);
  assert.match(appSource, /getCustomerSafeImageCaption/);
  assert.match(appSource, /\.filter\(\(image\) => image\.src\)/);
});
