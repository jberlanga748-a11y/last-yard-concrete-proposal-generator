import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("app initializes proposals once and keeps collection load lightweight", () => {
  assert.match(appSource, /const \[initialAppState\] = useState\(\(\) => loadInitialAppState/);
  assert.match(appSource, /function loadInitialAppState/);
  assert.match(appSource, /function normalizeSavedProposalForCollection/);
  assert.match(appSource, /return parsedValue\.filter\(isPlainObject\)\.map\(\(proposal\) => normalizeSavedProposalForCollection\(proposal\)\)/);
  assert.doesNotMatch(
    appSource.match(/function loadSavedProposals[\s\S]*?function normalizeSavedProposalForCollection/)?.[0] || "",
    /parsedValue\.map\(\(proposal\) => createEditableProposal\(proposal\)\)/,
  );
});

test("proposal list uses lightweight summaries instead of full proposal calculations", () => {
  const proposalListSource = appSource.match(/function ProposalListView[\s\S]*?function CompanySettingsView/)?.[0] || "";

  assert.match(proposalListSource, /buildProposalListSummaries\(proposals, contacts\)/);
  assert.match(proposalListSource, /proposalSummaries\.filter/);
  assert.match(proposalListSource, /summary\.total/);
  assert.doesNotMatch(proposalListSource, /calculateProposalTotals\(proposal\)/);
  assert.doesNotMatch(proposalListSource, /getPacketModeLabel\(proposal\)/);
  assert.doesNotMatch(proposalListSource, /getLatestSubmittedPacketRecord\(proposal\)/);
});

test("saved proposal opening hydrates details lazily with a loading message", () => {
  const openProposalSource = appSource.match(/function openProposal[\s\S]*?async function submitCustomerPortalSelection/)?.[0] || "";

  assert.match(appSource, /Opening proposal details/);
  assert.match(appSource, /requestAnimationFrame/);
  assert.match(appSource, /createEditableProposal\(proposal\)/);
  assert.match(appSource, /proposalAlreadyEditable: true/);
  assert.match(appSource, /alreadyEditable: options\.proposalAlreadyEditable === true/);
  assert.match(openProposalSource, /try \{/);
  assert.match(openProposalSource, /Could not open this proposal because its saved data needs review/);
});

test("proposal preview is collapsed and lazy-rendered until the user opens it", () => {
  assert.match(appSource, /const \[proposalPreviewReady, setProposalPreviewReady\]/);
  assert.match(appSource, /const \[proposalPreviewOpen, setProposalPreviewOpen\]/);
  assert.match(appSource, /requestIdleCallback/);
  assert.match(appSource, /Open Preview/);
  assert.match(appSource, /Collapse Preview/);
  assert.match(appSource, /Generating proposal preview/);
  assert.match(appSource, /PDF preview is collapsed until you open it/);
  assert.match(appSource, /function PerformanceMeasuredProposalPreview/);
  assert.match(appSource, /function ProposalPreviewPanel/);
});

test("new proposal flow shows a template chooser before creating a clean draft", () => {
  const createNewProposalSource = appSource.match(/function createNewProposal\(\)[\s\S]*?function createBlankProposal/)?.[0] || "";

  assert.match(appSource, /function NewProposalTemplateChooser/);
  assert.match(appSource, /const isNewProposalChooserView = route\.view === "new" && !route\.blank && !route\.templateType/);
  assert.match(createNewProposalSource, /navigate\("\/proposals\/new"\)/);
  assert.doesNotMatch(createNewProposalSource, /createNewProposalDraft/);
  [
    "Residential Simple Estimate",
    "Residential Base Price + Optional Add-Ons",
    "Residential Choose-One Options",
    "Residential Blank",
    "Commercial Subcontractor Proposal",
    "GC / Prime Packet",
    "Completely Blank Proposal",
  ].forEach((label) => assert.match(appSource, new RegExp(label.replace(/[+/]/g, "\\$&"))));
});

test("clean proposal templates reset stale residential portal pricing and preview state", () => {
  const factorySource = appSource.match(/function createBlankProposalByTemplate[\s\S]*?function applyProposalModeToBlankProposal/)?.[0] || "";

  assert.match(factorySource, /pricingOptions: \[\]/);
  assert.match(factorySource, /optionalAddOns: \[\]/);
  assert.match(factorySource, /selectedAddOnIds: \[\]/);
  assert.match(factorySource, /customerShareToken: ""/);
  assert.match(factorySource, /customerSelection: \{ status: CUSTOMER_SELECTION_STATUS_NONE \}/);
  assert.match(factorySource, /customerApproval: \{ status: "none" \}/);
  assert.match(factorySource, /includedInPdf: false/);
  assert.match(appSource, /setProposalPreviewOpen\(false\)/);
  assert.match(appSource, /setProposalPreviewReady\(false\)/);
});

test("backup restore shortcut is not rendered inside the proposal editor route", () => {
  assert.doesNotMatch(appSource, /\{!isPrintView \? backupShortcut : null\}/);
  assert.match(appSource, /<BackupView backupTools=\{backupTools\}/);
  assert.match(appSource, /backupShortcut=\{backupShortcut\}/);
});

test("development performance logging is guarded from production console noise", () => {
  assert.match(appSource, /function isDevPerformanceLoggingEnabled/);
  assert.match(appSource, /import\.meta\.env\?\.DEV/);
  assert.match(appSource, /console\.debug\(`\[Last Yard perf\]/);
});
