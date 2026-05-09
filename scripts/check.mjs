import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const filesToCheck = [
  "src/proposalData.js",
  "src/App.customerPortal.test.js",
  "src/supabaseClient.js",
  "src/utils/cloud/cloudSync.js",
  "src/utils/cloud/companyCloud.js",
  "src/utils/cloud/contactCloud.js",
  "src/utils/cloud/proposalCloud.js",
  "src/utils/cloud/storageCloud.js",
  "src/utils/cloud/teamAccess.js",
  "src/utils/authSession.js",
  "src/utils/authSession.test.js",
  "src/utils/customerPortal.js",
  "src/utils/customerPortal.test.js",
  "src/utils/formatting/display.js",
  "src/utils/aiProposal/aiProposalNormalizer.js",
  "src/utils/aiProposal/aiProposalNormalizer.test.js",
  "src/utils/smartPaste/bidSmartPasteParser.js",
  "src/utils/smartPaste/bidSmartPasteParser.test.js",
  "src/utils/smartPaste/smartPasteCoverFields.js",
  "src/utils/smartPaste/smartPasteCoverFields.test.js",
  "src/utils/smartPaste/smartPasteNormalizer.js",
  "src/utils/smartPaste/smartPasteParser.js",
  "src/utils/smartPaste/smartPasteParser.test.js",
  "src/utils/proposalPacket/printContentCleanup.js",
  "src/utils/proposalPacket/printContentCleanup.test.js",
  "src/utils/proposalPacket/proposalPdfStyle.js",
  "src/utils/proposalPacket/proposalPdfStyle.test.js",
  "src/utils/proposalPacket/residentialLegalPapers.js",
  "src/utils/proposalPacket/residentialLegalPapers.test.js",
  "src/utils/proposalPacket/residentialPricing.js",
  "src/utils/proposalPacket/residentialPricing.test.js",
  "src/utils/proposals/proposalDraftCleanup.js",
  "src/utils/proposals/proposalDraftCleanup.test.js",
  "src/utils/proposals/proposalModes.js",
  "src/utils/proposals/proposalModes.test.js",
  "src/proposalData.test.js",
  "api/ai/extract-proposal.js",
  "api/customer-proposal.js",
];

const missingFiles = filesToCheck.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error(`Missing files listed in check script:\n${missingFiles.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

for (const file of filesToCheck) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    console.error(`Syntax check failed: ${file}`);
    if (result.stdout) {
      console.error(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }
    process.exit(result.status || 1);
  }

  console.log(`checked ${file}`);
}
