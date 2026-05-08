import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { dirname, join } from "node:path";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");
const styles = readFileSync(stylesPath, "utf8");

function getCssBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));

  return match?.[1] || "";
}

test("print photo renderers use non-distorting cover fit for work examples and residential option photos", () => {
  const concretePhotoImage = getCssBlock(".concrete-photo img");
  const residentialOptionImage = getCssBlock(".residential-option-photo img");
  const printRoutePhotoBand = getCssBlock(".print-route-view .first-page .photo-band");

  assert.match(concretePhotoImage, /object-fit:\s*cover/);
  assert.match(concretePhotoImage, /object-position:\s*center/);
  assert.match(printRoutePhotoBand, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(residentialOptionImage, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(residentialOptionImage, /object-fit:\s*cover/);
  assert.match(residentialOptionImage, /object-position:\s*center/);
});

test("plan sheet images keep contain fit while cover logo and tagline have print-safe rules", () => {
  const planSheetImage = getCssBlock(".plan-sheet-image-area img");
  const printCoverTagline = styles.match(/@media print\s*\{[\s\S]*?\.cover-tagline\s*\{([^}]+)\}/)?.[1] || "";
  const printCoverLogo = styles.match(/@media print\s*\{[\s\S]*?\.cover-header \.logo-seal img\s*\{([^}]+)\}/)?.[1] || "";

  assert.match(planSheetImage, /object-fit:\s*contain/);
  assert.match(printCoverTagline, /overflow:\s*visible/);
  assert.match(printCoverTagline, /letter-spacing:\s*0\.08em/);
  assert.match(printCoverLogo, /object-fit:\s*contain/);
  assert.match(printCoverLogo, /transform:\s*scale\(1\.34\)/);
});

test("residential pricing cards and add-ons use print-safe no-break rules", () => {
  const optionCard = getCssBlock(".residential-pricing-option-card");
  const addOnCallout = getCssBlock(".residential-add-on-callout");
  const addOnPrintCard = getCssBlock(".residential-add-on-print-card");
  const printPhotoStrip =
    styles.match(/@media print\s*\{[\s\S]*?\.proposal-page\.residential-add-on-page \.residential-option-photo-strip,\s*\.proposal-page\.residential-pricing-page \.residential-option-photo-strip\s*\{([^}]+)\}/)?.[1] ||
    "";
  const printPhotoImage =
    styles.match(/@media print\s*\{[\s\S]*?\.proposal-page\.residential-add-on-page \.residential-option-photo img,\s*\.proposal-page\.residential-pricing-page \.residential-option-photo img\s*\{([^}]+)\}/)?.[1] ||
    "";

  assert.match(optionCard, /break-inside:\s*avoid/);
  assert.match(optionCard, /page-break-inside:\s*avoid/);
  assert.match(addOnCallout, /break-inside:\s*avoid/);
  assert.match(addOnCallout, /page-break-inside:\s*avoid/);
  assert.match(addOnPrintCard, /break-inside:\s*avoid/);
  assert.match(addOnPrintCard, /page-break-inside:\s*avoid/);
  assert.match(printPhotoStrip, /break-inside:\s*avoid/);
  assert.match(printPhotoStrip, /page-break-inside:\s*avoid/);
  assert.match(printPhotoImage, /object-fit:\s*cover/);
  assert.match(printPhotoImage, /object-position:\s*center/);
});

test("proposal PDF style classes control readability and pricing emphasis", () => {
  const largeBody = getCssBlock(".proposal-grid.proposal-style-body-large");
  const boldHeading = getCssBlock(".proposal-grid.proposal-style-heading-bold");
  const boldPricing = getCssBlock(".proposal-grid.proposal-style-pricing-bold");
  const residentialFriendly = getCssBlock(".proposal-grid.proposal-style-tone-residential-friendly .residential-pricing-heading");

  assert.match(styles, /\.proposal-grid\s*\{[\s\S]*--packet-body-scale:\s*1/);
  assert.match(largeBody, /--packet-body-scale:\s*1\.08/);
  assert.match(boldHeading, /--packet-heading-weight:\s*950/);
  assert.match(boldPricing, /--packet-pricing-weight:\s*950/);
  assert.match(residentialFriendly, /background:\s*#fffaf0/);
});
