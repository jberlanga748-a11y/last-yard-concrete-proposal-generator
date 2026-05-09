import test from "node:test";
import assert from "node:assert/strict";

import { parseSmartPasteNotes } from "../smartPaste/smartPasteParser.js";
import {
  cleanSmartPasteBaseProposal,
  cleanTrueBlankProposalState,
  getSmartPasteFieldChangeSummary,
} from "./proposalDraftCleanup.js";

function dirtyProposalFixture(overrides = {}) {
  return {
    id: "existing-dirty-proposal",
    proposalNumber: "LYC-2026-0999",
    proposalDate: "2026-05-06",
    validUntil: "2026-06-05",
    templateId: "commercial",
    company: {
      name: "Last Yard Concrete LLC",
      phone: "(541) 285-1060",
      email: "jacobbrown@ly-cs.com",
    },
    terms: {
      payment: "Company default payment terms.",
      acceptance: "Company default acceptance language.",
    },
    client: {
      companyName: "Old GC",
      contactName: "Old Contact",
      phone: "555-0000",
      email: "old@example.com",
      billingAddress: "Old billing",
      projectAddress: "Old project address",
    },
    project: {
      name: "Old Project",
      location: "Old Location",
      address: "Old Address",
      owner: "Old Owner",
      description: "Old description",
      proposedSchedule: {
        startDate: "2026-05-20",
        display: "Old schedule",
      },
      estimatedDuration: "Old schedule",
    },
    scopeSections: [{ title: "Scope", items: ["New scope item", "Old real scope"] }],
    concreteSpecs: {
      thickness: "Old thickness",
      psi: "Old PSI",
      finishType: "Old finish",
    },
    lineItems: [{ description: "Old line item", quantity: 1, unit: "LS", unitPrice: 12345 }],
    pricingSections: [{ type: "allowance", label: "Estimated Shade Footings", description: "", amount: 42500, included: false }],
    pricingMode: "choose_one_option",
    basePackage: { name: "Old base", price: 46437.5, images: [{ src: "https://example.test/base.jpg" }] },
    pricingOptions: [{ name: "Old option", price: 46437.5, images: [{ src: "https://example.test/option.jpg" }] }],
    optionalAddOns: [{ name: "Old add-on", amount: 8500, selected: true, images: [{ src: "https://example.test/addon.jpg" }] }],
    selectedAddOnIds: ["old-add-on"],
    pricing: {
      pricingMode: "base_plus_addons",
      baseBid: 46437.5,
      totalProposal: 54937.5,
      basePackage: { name: "Old base package", price: 46437.5 },
      pricingOptions: [{ name: "Old nested option", price: 46437.5 }],
      optionalAddOns: [{ name: "Old nested add-on", amount: 8500, selected: true }],
      selectedAddOnIds: ["old-nested-add-on"],
      pricingExamples: [{ label: "Old example" }],
      paymentExamples: [{ label: "Old payment example" }],
    },
    residentialPdfLayout: "detailed_backup",
    residentialLegalPapers: {
      informationNoticeToOwner: { status: "included", providedToCustomer: true },
      termsAndConditions: { status: "included", includedInPdf: true },
      legalAttachments: [{ title: "Old legal paper", publicUrl: "https://example.test/legal.pdf" }],
    },
    customerShareEnabled: true,
    customerShareToken: "old-share-token",
    customerShareCreatedAt: "2026-05-01T00:00:00.000Z",
    customerShareExpiresAt: "2026-06-01T00:00:00.000Z",
    customerShareLastViewedAt: "2026-05-02T00:00:00.000Z",
    customerSelection: {
      status: "submitted",
      selectedTotal: 54937.5,
      selectedAddOnIds: ["old-add-on"],
    },
    customerApproval: {
      status: "approved_signed",
      typedSignature: "Old Customer",
      acceptedTotal: 54937.5,
    },
    exclusions: ["Old exclusion", "New item"],
    assumptions: ["Old assumption"],
    projectPhotos: [{ label: "Old photo", src: "data:image/png;base64,abc" }],
    planSheets: [{ enabled: true, title: "Old plan", imageSrc: "", calculationTitle: "UPLOAD PLAN IMAGE", calculationNotes: ["New item"] }],
    packetBuilder: [{ id: "plan_sheet_pages", included: true, order: 10 }],
    gcPrime: {
      contractorName: "Old contractor",
      projectManagerName: "Old PM",
      addendaAcknowledged: "Old addendum",
      rfiClarificationNotes: "Old RFI",
      gcPrimeNotes: "Old GC note",
      scopeControlSummary: {
        includedScope: "Old included scope",
        exclusions: "Old GC exclusion",
        clarifications: "Old clarification",
      },
      addendaRegister: [{ addendumNumber: "01", titleDescription: "Old addendum" }],
      rfiRegister: [{ rfiNumber: "RFI-1", question: "Old RFI" }],
    },
    gcPacketTables: {
      pricingSummary: {
        enabled: true,
        rows: [{ label: "Estimated Shade Footings", amount: "$42,500", note: "" }],
      },
      scheduleOfValues: {
        enabled: true,
        rows: [{ item: "1", description: "Old SOV", pricingBasis: "Old", amount: "$12,345" }],
      },
      takeoffQuantities: {
        enabled: true,
        rows: [{ item: "Old takeoff", quantity: "1 LS", detailSize: "Old", netCy: "", cyWithTenPercent: "", priceStatus: "Old" }],
      },
      shadeFootingEstimate: {
        enabled: true,
        rows: [{ column: "Old", columnSize: "Old", allowanceAmount: "$1" }],
      },
      proposalNotes: {
        enabled: true,
        proposalBasis: "Old basis",
        contractScopeControl: "Old scope control",
        acceptanceSummary: "Old acceptance",
      },
    },
    submittedPacketRecords: [{ id: "packet-old", packetTitle: "Old packet" }],
    sendRecords: [{ id: "send-old", subject: "Old send" }],
    proposalNotes: "Old notes",
    notes: "Old notes",
    takeoffQuantityBackup: "Old backup",
    quantityBackup: "Old quantity backup",
    ...overrides,
  };
}

test("true blank proposal state removes prior project client pricing scope and packet data", () => {
  const blank = cleanTrueBlankProposalState(dirtyProposalFixture());

  assert.equal(blank.proposalNumber, "LYC-2026-0999");
  assert.equal(blank.company.name, "Last Yard Concrete LLC");
  assert.equal(blank.terms.payment, "Company default payment terms.");
  assert.equal(blank.templateId, "blank");
  assert.equal(blank.project.name, "");
  assert.equal(blank.project.location, "");
  assert.equal(blank.project.address, "");
  assert.equal(blank.client.companyName, "");
  assert.equal(blank.client.contactName, "");
  assert.deepEqual(blank.scopeSections, []);
  assert.deepEqual(blank.lineItems, []);
  assert.deepEqual(blank.pricingSections, []);
  assert.equal(blank.baseBid, 0);
  assert.equal(blank.totalProposal, 0);
  assert.equal(blank.pricingMode, "");
  assert.deepEqual(blank.basePackage, {});
  assert.deepEqual(blank.pricingOptions, []);
  assert.deepEqual(blank.optionalAddOns, []);
  assert.deepEqual(blank.selectedAddOnIds, []);
  assert.deepEqual(blank.pricing.pricingOptions, []);
  assert.deepEqual(blank.pricing.optionalAddOns, []);
  assert.equal(blank.pricing.baseBid, 0);
  assert.equal(blank.pricing.totalProposal, 0);
  assert.equal(blank.customerShareEnabled, false);
  assert.equal(blank.customerShareToken, "");
  assert.equal(blank.customerSelection.status, "none");
  assert.equal(blank.customerApproval.status, "none");
  assert.equal(blank.residentialPdfLayout, "");
  assert.equal(blank.residentialLegalPapers, undefined);
  assert.deepEqual(blank.exclusions, []);
  assert.deepEqual(blank.assumptions, []);
  assert.deepEqual(blank.planSheets, []);
  assert.deepEqual(blank.projectPhotos, []);
  assert.deepEqual(blank.submittedPacketRecords, []);
  assert.deepEqual(blank.sendRecords, []);
  assert.equal(blank.gcPacketTables.scheduleOfValues.rows.length, 0);
  assert.equal(blank.gcPacketTables.proposalNotes.proposalBasis, "");
});

test("starting blank after an existing proposal does not carry over stale data", () => {
  const viewedProposal = dirtyProposalFixture({ project: { name: "Recently Viewed Existing Project", location: "Salem, OR" } });
  const blank = cleanTrueBlankProposalState(viewedProposal);

  assert.doesNotMatch(JSON.stringify(blank), /Recently Viewed Existing Project|Old GC|Old line item|Old packet|Old send/);
});

test("Smart Paste base cleanup replaces starter placeholders on blank proposals", () => {
  const dirtyBlank = dirtyProposalFixture({
    templateId: "blank",
    client: {
      companyName: "Company Name",
      contactName: "Contact Name",
      phone: "(555) 123-4567",
      email: "name@company.com",
    },
    project: {
      name: "Marketplace Retail Center",
      location: "Albany, OR",
      address: "Albany, OR",
    },
    scopeSections: [{ title: "Scope", items: ["New scope item"] }],
    lineItems: [{ description: "Site Prep & Excavation", quantity: 1, unit: "LS", unitPrice: 3250 }],
  });
  const cleanedBase = cleanSmartPasteBaseProposal(dirtyBlank, { replaceStarterContent: true });
  const result = parseSmartPasteNotes(
    `Project: Costco #682 Albany POS Boxes Remodel
Location: Albany, Oregon
Prepared for: Faison Construction
Base Bid: $325,000
Scope:
Freezer slab package.`,
    cleanedBase,
  );

  assert.equal(cleanedBase.project.name, "");
  assert.equal(cleanedBase.client.companyName, "");
  assert.equal(cleanedBase.lineItems.length, 0);
  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.lineItems[0].unitPrice, 325000);
  assert.doesNotMatch(JSON.stringify(result.proposal), /Marketplace Retail Center|New scope item|Site Prep & Excavation/);
});

test("Smart Paste merge cleanup preserves real existing fields before review", () => {
  const existingProposal = dirtyProposalFixture({
    client: { companyName: "Real Existing GC", contactName: "Real Contact", email: "real@example.com" },
    project: { name: "Real Existing Project", location: "Bend, Oregon" },
    scopeSections: [{ title: "Real Scope", items: ["Keep this real scope", "New scope item"] }],
  });
  const cleanedBase = cleanSmartPasteBaseProposal(existingProposal, { replaceStarterContent: false });

  assert.equal(cleanedBase.project.name, "Real Existing Project");
  assert.equal(cleanedBase.client.companyName, "Real Existing GC");
  assert.deepEqual(cleanedBase.scopeSections[0].items, ["Keep this real scope"]);

  const parsed = parseSmartPasteNotes(
    `Project: Parsed Replacement Project
Location: Portland, Oregon
Prepared for: Parsed GC`,
    cleanedBase,
  ).proposal;
  const changes = getSmartPasteFieldChangeSummary(cleanedBase, parsed);

  assert.ok(changes.some((change) => change.includes("Project Name")));
  assert.ok(changes.some((change) => change.includes("Prepared For")));
});
