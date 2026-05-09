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

test("proposal preview is delayed until the editor is ready", () => {
  assert.match(appSource, /const \[proposalPreviewReady, setProposalPreviewReady\]/);
  assert.match(appSource, /requestIdleCallback/);
  assert.match(appSource, /Loading proposal preview/);
  assert.match(appSource, /function PerformanceMeasuredProposalPreview/);
});

test("development performance logging is guarded from production console noise", () => {
  assert.match(appSource, /function isDevPerformanceLoggingEnabled/);
  assert.match(appSource, /import\.meta\.env\?\.DEV/);
  assert.match(appSource, /console\.debug\(`\[Last Yard perf\]/);
});
