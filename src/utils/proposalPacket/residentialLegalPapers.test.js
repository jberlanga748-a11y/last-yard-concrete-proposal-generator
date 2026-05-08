import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResidentialLegalPaperRows,
  buildResidentialLegalSummarySections,
  getDefaultResidentialLegalPapers,
  getResidentialLegalStatusLabel,
  normalizeResidentialLegalPapers,
} from "./residentialLegalPapers.js";

test("residential legal papers default to needs review", () => {
  const papers = normalizeResidentialLegalPapers();

  assert.deepEqual(papers, getDefaultResidentialLegalPapers());
  assert.equal(papers.informationNoticeToOwner.status, "needs_review");
  assert.equal(papers.rightToCancelNotice.status, "needs_review");
  assert.equal(getResidentialLegalStatusLabel(papers.informationNoticeToOwner.status), "Needs Review Before Signing");
});

test("residential legal summary renders homeowner legal term sections", () => {
  const sections = buildResidentialLegalSummarySections({
    terms: {
      payment: "50% down payment is required.",
      depositText: "Deposit schedules the project.",
      finalPayment: "Final payment due when the last pour is complete.",
      changeOrderLanguage: "Scope changes require written approval.",
      utilityResponsibility: "Customer is responsible for private utilities and irrigation.",
      hiddenConditions: "Buried or hidden conditions may require a change order.",
      weatherDelay: "Weather may affect schedule.",
      concreteCrackingDisclaimer: "Concrete may crack.",
      colorFinishVariationDisclaimer: "Color and finish may vary.",
      warrantyLimitation: "Warranty is limited to included work.",
    },
  });

  assert.deepEqual(
    sections.map((section) => section.title),
    [
      "Payment Terms",
      "Change Orders",
      "Utilities / Irrigation / Buried Items",
      "Hidden Conditions",
      "Weather / Schedule",
      "Concrete Cracking",
      "Finish / Color Variation",
      "Warranty Limitation",
    ],
  );
  assert.match(sections[0].body, /50% down payment/);
  assert.match(sections[0].body, /Final payment due/);
});

test("residential legal paper statuses and attachments are printable rows", () => {
  const rows = buildResidentialLegalPaperRows({
    residentialLegalPapers: {
      informationNoticeToOwner: {
        status: "provided_separately",
        providedToCustomer: true,
        providedDate: "2026-05-08",
        customerAcknowledged: true,
        customerAcknowledgedDate: "2026-05-09",
      },
      rightToCancelNotice: {
        status: "not_applicable",
      },
      legalAttachments: [
        {
          title: "Oregon CCB Information Notice",
          fileName: "ccb-owner-notice.pdf",
          providedSeparately: true,
          acknowledgementRequired: true,
        },
      ],
    },
  });

  assert.equal(rows[0].status, "Provided Separately");
  assert.match(rows[0].meta, /Marked provided on 2026-05-08/);
  assert.match(rows[0].meta, /Customer acknowledged on 2026-05-09/);
  assert.equal(rows[1].status, "Not Applicable");
  assert.equal(rows[2].title, "Oregon CCB Information Notice");
  assert.equal(rows[2].status, "Provided Separately");
});
