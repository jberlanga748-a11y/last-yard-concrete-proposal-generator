import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const storageCloudSource = readFileSync(new URL("./utils/cloud/storageCloud.js", import.meta.url), "utf8");
const customerPortalApiSource = readFileSync(new URL("../api/customer-proposal.js", import.meta.url), "utf8");

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
  assert.match(appSource, /Cloud sync failed\. Public portal may not load this proposal until cloud save succeeds/);
  assert.match(appSource, /disabled=\{!portalUrl \|\| cloudSyncFailed\}/);
});

test("editable proposals preserve customer share fields safely", () => {
  assert.match(appSource, /customerShareEnabled: proposal\.customerShareEnabled === true/);
  assert.match(appSource, /customerShareToken: normalizeCustomerShareToken\(proposal\.customerShareToken\)/);
  assert.match(appSource, /customerShareCreatedAt: proposal\.customerShareCreatedAt \|\| ""/);
  assert.match(appSource, /customerShareExpiresAt: proposal\.customerShareExpiresAt \|\| ""/);
  assert.match(appSource, /customerShareLastViewedAt: proposal\.customerShareLastViewedAt \|\| ""/);
  assert.match(appSource, /customerSelection: normalizeCustomerSelection\(proposal\.customerSelection\)/);
});

test("customer portal loads through server token lookup before browser Supabase fallback", () => {
  assert.match(appSource, /fetchCustomerPortalProposalByToken\(token\)/);
  assert.match(appSource, /portalApiResult\.available/);
  assert.match(appSource, /fetchCloudProposalByShareToken\(token, proposalCloudDeps\)/);
});

test("signed-in proposal opens refresh latest cloud detail before hydration", () => {
  assert.match(appSource, /async function openProposal\(proposalId\)/);
  assert.match(appSource, /fetchCloudProposalById\(cloudSync\.companyId, proposalId, proposalCloudDeps\)/);
  assert.match(appSource, /Loaded latest proposal details from Supabase/);
});

test("editor cloud save accepts merged portal fields returned from cloud persistence", () => {
  assert.match(appSource, /const cloudSavedProposal = await saveCloudProposal\(companyRecord\.id, proposal, getProposalCloudSaveDeps\(\)\)/);
  assert.match(appSource, /uploadLocalProposalImageAssetToCloud\(image/);
  assert.match(appSource, /setSavedProposals\(\(currentProposals\) => upsertProposal\(currentProposals, syncedProposal\)\)/);
  assert.match(appSource, /if \(proposalDraft\.id === syncedProposal\.id\)/);
  assert.match(appSource, /formatCloudProposalSaveError\(error\)/);
  assert.match(appSource, /lastProposalSyncErrorRef\.current/);
});

test("editable proposals mirror residential pricing into nested pricing payload for cloud save", () => {
  assert.match(appSource, /const sourcePricing = isPlainObject\(proposal\.pricing\) \? proposal\.pricing : \{\}/);
  assert.match(appSource, /function mergeResidentialPricingCollectionSources/);
  assert.match(appSource, /const normalizedResidentialPricing = normalizeResidentialPricingPayload/);
  assert.match(appSource, /pricing: normalizedResidentialPricing/);
  assert.match(appSource, /pricingOptions: normalizedPricingOptions/);
  assert.match(appSource, /optionalAddOns: normalizedOptionalAddOns/);
});

test("local-only image uploads warn that images are not cloud portable", () => {
  assert.match(storageCloudSource, /Local image only - sign in\/save to cloud for access on other devices/);
  assert.match(appSource, /function isEditorOnlyCustomerHiddenImage/);
  assert.match(appSource, /This photo is visible in the editor only\. Save\/sync photo to cloud before sharing with customer/);
});

test("proposal photo uploads attach local previews before cloud sync", () => {
  const projectPhotoUploadSource = appSource.match(/async function uploadProjectPhoto[\s\S]*?function updateResidentialPricingOptions/)?.[0] || "";
  const optionPhotoUploadSource = appSource.match(/async function uploadResidentialOptionImage[\s\S]*?function updatePlanSheet/)?.[0] || "";
  const attachOptionImageSource = appSource.match(/function attachResidentialOptionImageToProposal[\s\S]*?function formatUploadResultMessage/)?.[0] || "";

  assert.match(projectPhotoUploadSource, /const asset = await createLocalImageAsset\(uploadFile\)/);
  assert.match(optionPhotoUploadSource, /const asset = await createLocalImageAsset\(uploadFile\)/);
  assert.doesNotMatch(projectPhotoUploadSource, /uploadProposalAssetToCloud\(uploadFile/);
  assert.doesNotMatch(optionPhotoUploadSource, /uploadProposalAssetToCloud\(uploadFile/);
  assert.match(attachOptionImageSource, /\.\.\.placeholder,[\s\S]*?\.\.\.asset/);
  assert.match(attachOptionImageSource, /uploadRequired:\s*false/);
  assert.match(appSource, /Cloud photo upload will retry on Save Draft/);
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
  assert.match(appSource, /Optional add-ons are selected below and added only if chosen/);
  assert.match(appSource, /getResidentialAddOnAmountForOption\(addOn, selectedOptionRow/);
  assert.doesNotMatch(appSource, /With optional add-on|With selected add-on|With add-on/);
  assert.match(appSource, /getCustomerSafeImageCaption/);
  assert.match(appSource, /\.filter\(\(image\) => image\.src\)/);
});

test("customer portal supports read-only customer selection requests", () => {
  assert.match(appSource, /Submit Selection to Last Yard/);
  assert.match(appSource, /function CustomerPortalSelectionSubmitPanel/);
  assert.match(appSource, /calculateCustomerSelectionSummary\(proposal, selectionDraft\)/);
  assert.match(appSource, /submitCustomerPortalSelectionByToken\(token, selectionDraft\)/);
  assert.match(appSource, /This is a selection request only/);
  assert.match(appSource, /function CustomerPortalSelectionEditor/);
  assert.match(appSource, /Customer Portal Selection/);
});

test("signed-in editor can review, apply, and send customer selection for approval", () => {
  assert.match(appSource, /Mark Reviewed & Apply Selection/);
  assert.match(appSource, /Apply Selection to Proposal/);
  assert.match(appSource, /Send for Customer Approval/);
  assert.match(appSource, /Request Changes \/ Do Not Apply/);
  assert.match(appSource, /applyCustomerSelectionToProposal\(proposalDraft/);
  assert.match(appSource, /status: "awaiting_customer_approval"/);
});

test("customer portal supports final approval without exposing editor controls", () => {
  assert.match(appSource, /Final Selection for Approval/);
  assert.match(appSource, /function CustomerPortalFinalSelectionPricing/);
  assert.match(appSource, /showFinalSelection/);
  assert.match(appSource, /getAppliedCustomerSelectionSummary\(proposal\)/);
  assert.match(appSource, /Selected Base Option/);
  assert.match(appSource, /Original options were provided for selection\. This view reflects the option\/add-ons currently applied by Last Yard Concrete/);
  assert.match(appSource, /Approve and Sign/);
  assert.match(appSource, /Typed Signature/);
  assert.match(appSource, /approval confirms the reviewed selection only/i);
  assert.match(appSource, /submitCustomerPortalApprovalByToken\(token, approvalDraft\)/);
  assert.doesNotMatch(appSource.match(/function CustomerProposalPortalView[\s\S]*?function CustomerPortalHero/)?.[0] || "", /ProposalEditor|BackupRestorePanel|TeamAccessPanel/);
});

test("customer portal selection API validates token and writes only requested public action state", () => {
  assert.match(customerPortalApiSource, /getSupabaseServerConfig\(env\)/);
  assert.match(customerPortalApiSource, /SUPABASE_URL, env\.NEXT_PUBLIC_SUPABASE_URL, env\.VITE_SUPABASE_URL/);
  assert.match(customerPortalApiSource, /SUPABASE_SERVICE_ROLE_KEY, env\.SUPABASE_SECRET_KEY/);
  assert.match(customerPortalApiSource, /missing-server-supabase-config/);
  assert.match(customerPortalApiSource, /persistSession:\s*false/);
  assert.match(customerPortalApiSource, /autoRefreshToken:\s*false/);
  assert.match(customerPortalApiSource, /apikey:\s*serviceRoleKey/);
  assert.match(customerPortalApiSource, /Authorization:\s*`Bearer \$\{serviceRoleKey\}`/);
  assert.doesNotMatch(customerPortalApiSource, /VITE_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(customerPortalApiSource, /request\.method === "POST"/);
  assert.match(customerPortalApiSource, /getCustomerShareStatus\(proposal, shareToken\)/);
  assert.match(customerPortalApiSource, /buildSubmittedCustomerSelection\(proposal, body\.selection/);
  assert.match(customerPortalApiSource, /updatedAt: submittedAt/);
  assert.match(customerPortalApiSource, /updated_at: proposalData\.updatedAt \|\| new Date\(\)\.toISOString\(\)/);
  assert.match(customerPortalApiSource, /status: getCustomerPortalRowStatus\(proposalData\.status\)/);
  assert.match(customerPortalApiSource, /const proposalWithSelection = \{[\s\S]*?customerSelection,[\s\S]*?\};/);
  assert.match(customerPortalApiSource, /updateCustomerProposalData\(supabase, data\.id, proposalWithSelection, \{ required: true \}\)/);
  assert.match(customerPortalApiSource, /action === "approve"/);
  assert.match(customerPortalApiSource, /buildCustomerApprovalRecord\(proposal/);
  assert.match(customerPortalApiSource, /status: "accepted_deposit_due"/);
  assert.match(customerPortalApiSource, /action === "request_changes"/);
  assert.doesNotMatch(customerPortalApiSource, /body\.pricing/);
  assert.doesNotMatch(customerPortalApiSource, /body\.scopeSections/);
});

test("customer portal selection mobile controls are tap-friendly", () => {
  assert.match(styleSource, /\.customer-portal-selection-control input\s*\{[\s\S]*?height:\s*22px/);
  assert.match(styleSource, /\.customer-portal-selection-form button\s*\{[\s\S]*?min-height:\s*48px/);
  assert.match(styleSource, /@media \(max-width: 768px\)[\s\S]*?\.customer-portal-selection-fields\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});
