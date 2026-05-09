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

test("residential pricing option cards render base option details without generic add-on totals", () => {
  assert.match(source, /option\.finishType/);
  assert.match(source, /option\.includedScope/);
  assert.match(source, /option\.excludedScope/);
  assert.match(source, /Optional Add-Ons:[\s\S]*Selected separately below/);
  assert.match(source, /formatResidentialAddOnSummaryLabel\(addOn, optionRows\)/);
  assert.doesNotMatch(source, /With Optional Add-On|With optional add-on|With selected add-on/);
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

test("residential terms and conditions render as separate PDF pages when enabled", () => {
  assert.match(source, /buildResidentialTermsAndConditionsSections/);
  assert.match(source, /shouldPrintResidentialTermsAndConditions/);
  assert.match(source, /buildResidentialTermsAndConditionsPages/);
  assert.match(source, /sectionId: "residential_terms_conditions"/);
  assert.match(source, /function ResidentialTermsAndConditionsPage/);
  assert.match(source, /Residential Terms & Conditions/);
  assert.match(source, /Residential Independent Contractor Services Agreement \/ Terms & Conditions/);
  assert.match(source, /Signature \/ Acceptance/);
});

test("residential PDF can show customer approval signature record after signing", () => {
  assert.match(source, /normalizeCustomerApproval/);
  assert.match(source, /function ResidentialCustomerApprovalRecord/);
  assert.match(source, /Customer Approval \/ Signature Record/);
  assert.match(source, /approval\.typedSignature/);
  assert.match(source, /formatResidentialCurrency\(approval\.acceptedTotal\)/);
});

test("residential simple estimate has a dedicated print branch and avoids GC alternate language", () => {
  assert.match(source, /RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT/);
  assert.match(source, /useResidentialSimpleEstimate/);
  assert.match(source, /function renderResidentialPacket/);
  assert.match(source, /layout === RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT[\s\S]*return simpleEstimateItems/);
  assert.match(source, /function ResidentialSimpleEstimatePage/);
  assert.match(source, /Optional Add-On:/);
  assert.match(source, /Estimate Total/);
  assert.match(source, /residentialPricingOptionPrintPages = useResidentialSimpleEstimate \? \[\] : buildResidentialPricingOptionPrintPages/);
  assert.match(source, /residentialSimpleEstimateItems[\s\S]*residentialLegalPapersItem[\s\S]*residentialTermsItems/);
  assert.match(source, /!\s*includeResidentialTerms\s*\?\s*\[residentialPaymentTermsItem\]\s*:\s*\[\]/);
  assert.doesNotMatch(source.match(/function ResidentialSimpleEstimatePage[\s\S]*?function ResidentialSimpleEstimateAttachmentsPage/)?.[0] || "", /Add Alternate|Total if All Alternates Accepted/);
});

test("residential layout routing gates detailed backup pages behind detailed_backup", () => {
  assert.match(source, /RESIDENTIAL_DETAILED_BACKUP_LAYOUT/);
  assert.match(source, /const useResidentialDetailedBackup = isResidentialMode && residentialPdfLayout === RESIDENTIAL_DETAILED_BACKUP_LAYOUT/);
  assert.match(source, /residentialOptionBreakdownPages = useResidentialDetailedBackup \? buildResidentialOptionBreakdownPages\(packetProposal\) : \[\]/);
  assert.match(source, /useResidentialDetailedBackup[\s\S]*getEnabledPlanSheets\(packetProposal\.planSheets\)\.filter\(hasResidentialPlanSheetPrintData\)[\s\S]*: \[\]/);
  assert.match(source, /layout === RESIDENTIAL_DETAILED_BACKUP_LAYOUT[\s\S]*return detailedBackupItems/);
});

test("residential simple estimate can summarize choose-one options without customer pricing packet pages", () => {
  const simpleEstimateSource = source.match(/function ResidentialSimpleEstimatePage[\s\S]*?function ResidentialSimpleEstimateAttachmentsPage/)?.[0] || "";

  assert.match(simpleEstimateSource, /const optionRows = buildResidentialPricingOptionRows\(proposal\)/);
  assert.match(simpleEstimateSource, /hasChooseOneOptions/);
  assert.match(simpleEstimateSource, /Selected base option/);
  assert.doesNotMatch(simpleEstimateSource, /Customer Pricing Options/);
  assert.doesNotMatch(simpleEstimateSource, /Schedule of Values/);
});

test("residential simple estimate renders applied customer selection as final estimate rows", () => {
  const simpleEstimateSource = source.match(/function ResidentialSimpleEstimatePage[\s\S]*?function ResidentialSimpleEstimateAttachmentsPage/)?.[0] || "";

  assert.match(simpleEstimateSource, /hasAppliedSelection/);
  assert.match(simpleEstimateSource, /Original options were provided for selection/);
  assert.match(simpleEstimateSource, /Selected Base Option/);
  assert.match(simpleEstimateSource, /Selected Add-On:/);
  assert.match(simpleEstimateSource, /Customer selection submitted - pending Last Yard review/);
});

test("residential simple estimate print CSS avoids clipping final selected estimate rows", () => {
  const styleSource = readFileSync(join(dirname(componentPath), "../../styles.css"), "utf8");

  assert.match(styleSource, /\.proposal-page\.residential-simple-estimate-page\s*\{[\s\S]*?height:\s*auto/);
  assert.match(styleSource, /\.proposal-page\.residential-simple-estimate-page\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(styleSource, /\.simple-estimate-table tr,[\s\S]*?\.simple-estimate-final-row\s*\{[\s\S]*?break-inside:\s*avoid/);
  assert.match(styleSource, /\.proposal-page\.residential-simple-estimate-page \.simple-estimate-table tr\s*\{[\s\S]*?page-break-inside:\s*avoid/);
});

test("simple estimate attachments render customer-safe captions and photos", () => {
  assert.match(source, /function ResidentialSimpleEstimateAttachmentsPage/);
  assert.match(source, /getSimpleEstimatePhotoCaption/);
  assert.match(source, /simple-estimate-photo-grid/);
  assert.match(source, /Attached Photos \/ Documents/);
});

test("proposal packet applies PDF style classes from settings or proposal defaults", () => {
  assert.match(source, /companySettings/);
  assert.match(source, /getProposalPdfStyleClassNames/);
  assert.match(source, /proposal-grid \$\{pdfStyleClassNames\}/);
});
