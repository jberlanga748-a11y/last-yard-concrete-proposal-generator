import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = join(dirname(fileURLToPath(import.meta.url)), "ProposalPacket.jsx");
const source = readFileSync(componentPath, "utf8");

test("residential print packet omits the cover trust-card band that can clip on page one", () => {
  assert.match(source, /!\s*isResidentialMode\s*\?\s*<WhyChoose\s*\/>\s*:\s*null/);
});

test("residential pricing option cards are rendered from paginated print chunks", () => {
  assert.match(source, /buildResidentialPricingOptionPrintPages/);
  assert.match(source, /residentialPricingItems/);
});

test("residential pricing option cards render generic option details and add-on totals", () => {
  assert.match(source, /option\.finishType/);
  assert.match(source, /option\.includedScope/);
  assert.match(source, /option\.excludedScope/);
  assert.match(source, /option\.addOnComparisons/);
  assert.match(source, /With \{addOnLabel\}/);
});

test("residential option SOV pages use weighted pagination instead of a hard two-option split", () => {
  assert.match(source, /buildResidentialOptionBreakdownPrintPages/);
  assert.doesNotMatch(source, /chunkResidentialOptionBreakdowns\(breakdowns,\s*2\)/);
});

test("residential optional add-ons with photos render on dedicated print pages", () => {
  assert.match(source, /buildResidentialOptionalAddOnPrintPages/);
  assert.match(source, /residentialOptionalAddOnItems/);
  assert.match(source, /function ResidentialOptionalAddOnPage/);
});

test("residential packet includes legal papers before acceptance", () => {
  assert.match(source, /function ResidentialLegalPapersPage/);
  assert.match(source, /residentialLegalSummarySections/);
  assert.match(source, /sectionId: "residential_legal_papers"/);
  assert.match(source, /Legal Papers \/ Notices/);
});

test("proposal packet applies PDF style classes from settings or proposal defaults", () => {
  assert.match(source, /companySettings/);
  assert.match(source, /getProposalPdfStyleClassNames/);
  assert.match(source, /proposal-grid \$\{pdfStyleClassNames\}/);
});
