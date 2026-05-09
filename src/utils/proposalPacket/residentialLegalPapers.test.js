import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResidentialLegalPaperRows,
  buildResidentialLegalSummarySections,
  buildResidentialTermsAndConditionsSections,
  getDefaultResidentialLegalPapers,
  getResidentialLegalStatusLabel,
  getResidentialTermsTemplate,
  RESIDENTIAL_TERMS_TEMPLATE_ID,
  RESIDENTIAL_TERMS_TEMPLATE_LABEL,
  normalizeResidentialLegalPapers,
  shouldDefaultIncludeResidentialTerms,
  shouldPrintResidentialTermsAndConditions,
} from "./residentialLegalPapers.js";

test("residential legal papers default to needs review", () => {
  const papers = normalizeResidentialLegalPapers();

  assert.deepEqual(papers, getDefaultResidentialLegalPapers());
  assert.equal(papers.informationNoticeToOwner.status, "needs_review");
  assert.equal(papers.rightToCancelNotice.status, "needs_review");
  assert.equal(getResidentialLegalStatusLabel(papers.informationNoticeToOwner.status), "Needs Review Before Signing");
});

test("residential terms template exists with reusable standard sections", () => {
  const template = getResidentialTermsTemplate();
  const titles = template.sections.map((section) => section.title);

  assert.equal(template.id, RESIDENTIAL_TERMS_TEMPLATE_ID);
  assert.equal(template.label, RESIDENTIAL_TERMS_TEMPLATE_LABEL);
  assert.ok(titles.includes("Residential Independent Contractor Services Agreement"));
  assert.ok(titles.includes("Parties"));
  assert.ok(titles.includes("Payment Terms"));
  assert.ok(titles.includes("Owner Responsibilities"));
  assert.ok(titles.includes("Mechanics' Lien Rights"));
  assert.ok(titles.includes("Owner Acknowledgment of Required Oregon Notices"));
  assert.ok(titles.includes("Homeowner Right To Cancel"));
  assert.ok(titles.includes("Signature / Acceptance Area"));
});

test("residential terms default to legal summary only unless explicitly included", () => {
  const defaultPapers = normalizeResidentialLegalPapers();
  const largerJobPapers = normalizeResidentialLegalPapers(undefined, { includeTermsByDefault: true });

  assert.equal(defaultPapers.termsAndConditions.status, "provided_separately");
  assert.equal(defaultPapers.termsAndConditions.template, RESIDENTIAL_TERMS_TEMPLATE_ID);
  assert.equal(defaultPapers.termsAndConditions.includedInPdf, false);
  assert.equal(largerJobPapers.termsAndConditions.status, "provided_separately");
  assert.equal(largerJobPapers.termsAndConditions.includedInPdf, false);
  assert.equal(shouldDefaultIncludeResidentialTerms({ lineItems: [{ quantity: 1, unitPrice: 40000 }] }), false);
});

test("residential simple estimate prints full terms only when includedInPdf is explicit", () => {
  const simpleEstimate = {
    proposalMode: "residential",
    residentialPdfLayout: "simple_estimate",
    pricingMode: "base_plus_addons",
    lineItems: [{ description: "Base package", quantity: 1, unitPrice: 40000 }],
  };

  assert.equal(shouldPrintResidentialTermsAndConditions(simpleEstimate), false);
  assert.equal(
    shouldPrintResidentialTermsAndConditions({
      ...simpleEstimate,
      residentialLegalPapers: {
        termsAndConditions: {
          status: "included",
          template: RESIDENTIAL_TERMS_TEMPLATE_ID,
          includedInPdf: true,
        },
      },
    }),
    true,
  );
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

test("residential legal summary avoids duplicating default deposit language when explicit payment terms exist", () => {
  const sections = buildResidentialLegalSummarySections({
    legalTerms: {
      paymentTerms: "50% down payment is required to schedule the project.",
    },
    terms: {
      depositText: "A 50% deposit is required to schedule the project.",
      finalPayment: "Final payment is due upon completion.",
    },
  });
  const paymentSection = sections.find((section) => section.title === "Payment Terms");

  assert.equal(paymentSection.body, "50% down payment is required to schedule the project.");
  assert.doesNotMatch(paymentSection.body, /A 50% deposit/);
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
      termsAndConditions: {
        status: "included",
        template: RESIDENTIAL_TERMS_TEMPLATE_ID,
        includedInPdf: true,
        customerAcknowledged: true,
        customerAcknowledgedDate: "2026-05-10",
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
  assert.equal(rows[2].title, "Residential Terms & Conditions");
  assert.equal(rows[2].status, "Included With Proposal");
  assert.match(rows[2].notes, /Last Yard Standard Residential Terms/);
  assert.match(rows[2].meta, /Included in PDF/);
  assert.match(rows[2].meta, /Customer acknowledged on 2026-05-10/);
  assert.equal(rows[3].title, "Oregon CCB Information Notice");
  assert.equal(rows[3].status, "Provided Separately");
});

test("residential terms print only when included and render dynamic proposal fields", () => {
  const proposal = {
    proposalMode: "residential",
    client: {
      companyName: "Jane Homeowner",
    },
    project: {
      name: "Back Patio",
      address: "123 Garden Lane, Salem, OR",
      description: "Residential patio, steps, and walkway.",
    },
    lineItems: [{ description: "Base Package", quantity: 1, unitPrice: 40000 }],
    optionalAddOns: [{ name: "Lighting in steps", amount: 7000, selected: true }],
    residentialLegalPapers: {
      termsAndConditions: {
        status: "included",
        template: RESIDENTIAL_TERMS_TEMPLATE_ID,
        includedInPdf: true,
      },
    },
  };
  const company = {
    name: "Last Yard Concrete LLC",
    address: "Albany, OR",
    phone: "541-555-0199",
    email: "office@lastyard.test",
    license: "CCB 123456",
  };

  assert.equal(shouldPrintResidentialTermsAndConditions(proposal), true);

  const sections = buildResidentialTermsAndConditionsSections(proposal, company);
  const combined = sections.map((section) => `${section.title}: ${section.body}`).join("\n");

  assert.ok(sections.length >= 20);
  assert.match(combined, /Last Yard Concrete LLC/);
  assert.match(combined, /Jane Homeowner/);
  assert.match(combined, /123 Garden Lane/);
  assert.match(combined, /Residential patio, steps, and walkway/);
  assert.match(combined, /Selected add-ons: Lighting in steps/);
  assert.match(combined, /\$47,000/);
});

test("missing residential terms fields do not crash template rendering", () => {
  const sections = buildResidentialTermsAndConditionsSections({
    proposalMode: "residential",
    residentialLegalPapers: {
      termsAndConditions: {
        status: "included",
        includedInPdf: true,
      },
    },
  });

  assert.ok(sections.length > 0);
  assert.match(sections[0].body, /Customer to be verified|Last Yard Concrete/);
});
