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
