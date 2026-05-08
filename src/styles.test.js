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
  assert.match(printCoverLogo, /width:\s*100%/);
  assert.match(printCoverLogo, /height:\s*100%/);
  assert.match(printCoverLogo, /object-fit:\s*cover/);
  assert.match(printCoverLogo, /transform:\s*scale\(1\.5\)/);
});

test("footer logo uses larger print-safe sizing without losing containment", () => {
  const compactFooterLogo = getCssBlock(".compact-footer .logo-seal-small");
  const printCompactFooterLogo = styles.match(/@media print\s*\{[\s\S]*?\.compact-footer \.logo-seal-small\s*\{([^}]+)\}/)?.[1] || "";
  const printCompactFooterLogoImage = styles.match(/@media print\s*\{[\s\S]*?\.compact-footer \.logo-seal-small img\s*\{([^}]+)\}/)?.[1] || "";

  assert.match(compactFooterLogo, /width:\s*46px/);
  assert.match(compactFooterLogo, /height:\s*46px/);
  assert.match(printCompactFooterLogo, /width:\s*48px/);
  assert.match(printCompactFooterLogo, /height:\s*48px/);
  assert.match(printCompactFooterLogoImage, /object-fit:\s*cover/);
  assert.match(printCompactFooterLogoImage, /transform:\s*scale\(1\.5\)/);
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

test("residential option builder has responsive manual editing grids", () => {
  const editorGrid = getCssBlock(".residential-option-editor-grid");
  const lineItemRow = getCssBlock(".residential-option-line-item-row");
  const totalsNote = getCssBlock(".residential-option-totals-note");

  assert.match(editorGrid, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(lineItemRow, /grid-template-columns:\s*minmax\(180px,\s*1\.7fr\)/);
  assert.match(styles, /\.residential-option-sov-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(150px,\s*1fr\)/);
  assert.match(totalsNote, /flex-wrap:\s*wrap/);
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

test("residential option SOV tables use compact readable spacing without page breaks between standard options", () => {
  const breakdowns = getCssBlock(".residential-option-breakdowns");
  const heading = getCssBlock(".residential-option-breakdown-heading");
  const sovCell = getCssBlock(".residential-option-sov-table td");

  assert.match(breakdowns, /gap:\s*10px/);
  assert.match(heading, /padding:\s*6px\s*9px/);
  assert.match(sovCell, /padding:\s*5px\s*7px/);
  assert.doesNotMatch(breakdowns, /break-before|page-break-before/);
});

test("residential legal papers use print-safe readable cards", () => {
  const legalSummaryCard = getCssBlock(".residential-legal-summary-card");
  const legalPaperRow = getCssBlock(".residential-legal-paper-row");
  const printLegalBody =
    styles.match(
      /@media print\s*\{[\s\S]*?\.proposal-page\.residential-legal-papers-page \.structured-packet-body,[\s\S]*?\.proposal-page\.residential-terms-page \.structured-packet-body\s*\{([^}]+)\}/,
    )?.[1] || "";

  assert.match(legalSummaryCard, /break-inside:\s*avoid/);
  assert.match(legalSummaryCard, /page-break-inside:\s*avoid/);
  assert.match(legalPaperRow, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
  assert.match(legalPaperRow, /page-break-inside:\s*avoid/);
  assert.match(printLegalBody, /padding:\s*26px\s*34px/);
});

test("residential terms and conditions pages use readable print-safe template cards", () => {
  const termsList = getCssBlock(".residential-terms-template-list");
  const termsSection = getCssBlock(".residential-terms-template-section");
  const termsIntro = getCssBlock(".residential-terms-template-intro");
  const printTermsList =
    styles.match(/@media print\s*\{[\s\S]*?\.proposal-page\.residential-terms-conditions-page \.residential-terms-template-list\s*\{([^}]+)\}/)?.[1] ||
    "";
  const printTermsSection =
    styles.match(/@media print\s*\{[\s\S]*?\.proposal-page\.residential-terms-conditions-page \.residential-terms-template-section\s*\{([^}]+)\}/)?.[1] ||
    "";

  assert.match(termsIntro, /background:\s*#fffaf0/);
  assert.match(termsList, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(termsSection, /break-inside:\s*avoid/);
  assert.match(termsSection, /page-break-inside:\s*avoid/);
  assert.match(printTermsList, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(printTermsSection, /padding:\s*7px\s*9px/);
});

test("residential simple estimate uses print-safe totals and non-distorting attachment photos", () => {
  const hero = getCssBlock(".simple-estimate-hero");
  const table = getCssBlock(".simple-estimate-table");
  const totalSection = getCssBlock(".simple-estimate-total-section");
  const photoImage = getCssBlock(".simple-estimate-photo img");
  const printSimpleBody = styles.match(/@media print\s*\{[\s\S]*?\.proposal-page\.residential-simple-estimate-page \.structured-packet-body,\s*\.proposal-page\.residential-simple-attachments-page \.structured-packet-body/)?.[0] || "";

  assert.match(hero, /break-inside:\s*avoid/);
  assert.match(hero, /page-break-inside:\s*avoid/);
  assert.match(table, /border-collapse:\s*collapse/);
  assert.match(totalSection, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(photoImage, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(photoImage, /object-fit:\s*cover/);
  assert.match(photoImage, /object-position:\s*center/);
  assert.match(printSimpleBody, /residential-simple-estimate-page/);
});
