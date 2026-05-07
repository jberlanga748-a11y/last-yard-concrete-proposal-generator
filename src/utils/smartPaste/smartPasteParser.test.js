import test from "node:test";
import assert from "node:assert/strict";

import { calculateProposalTotals, SEED_PROPOSAL, validateProposalCompleteness } from "../../proposalData.js";
import { parseSmartPasteNotes } from "./smartPasteParser.js";

function proposalFixture(overrides = {}) {
  return {
    ...structuredClone(SEED_PROPOSAL),
    ...overrides,
  };
}

function blankProposalFixture(overrides = {}) {
  return proposalFixture({
    templateId: "blank",
    client: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      projectAddress: "",
    },
    project: {
      name: "",
      location: "",
      address: "",
    },
    lineItems: [],
    pricingSections: [],
    scopeSections: [],
    submittedPacketRecords: [],
    sendRecords: [],
    ...overrides,
  });
}

function warningText(result) {
  return result.summary.warnings.join("\n");
}

test("parses common project, client, contact, schedule, and proposal type fields", () => {
  const result = parseSmartPasteNotes(
    `Project: Settlemier Park Renovation
Location: Woodburn, OR
Prepared for: ABC Prime Contractors
Contact: Mike Smith
Email: mike@example.com
Phone: 555-123-4567
Proposal type: GC / Prime
Schedule: June 3 - June 28, 2026`,
    proposalFixture(),
  );

  assert.equal(result.proposal.project.name, "Settlemier Park Renovation");
  assert.equal(result.proposal.project.location, "Woodburn, OR");
  assert.equal(result.proposal.client.companyName, "ABC Prime Contractors");
  assert.equal(result.proposal.client.contactName, "Mike Smith");
  assert.equal(result.proposal.client.email, "mike@example.com");
  assert.equal(result.proposal.client.phone, "555-123-4567");
  assert.equal(result.proposal.proposalType, "gc_prime");
  assert.equal(result.proposal.project.estimatedDuration, "June 3 - June 28, 2026");
  assert.ok(result.summary.fields.includes("proposal type"));
});

test("keeps Costco project name separate from project location and address labels", () => {
  const result = parseSmartPasteNotes(
    `Project:
Costco #682 Albany POS Boxes Remodel

Project Name:
Costco #682 Albany POS Boxes Remodel

Location:
3130 Killdeer Ave SE, Albany, OR

Project Location:
3130 Killdeer Ave SE, Albany, Oregon

Project Address:
3130 Killdeer Ave SE, Albany, OR

Prepared for: Faison Construction
Base Bid: $325,000
Add Alternate: None currently
Total Proposal: $325,000`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.project.location, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.project.address, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.client.projectAddress, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.doesNotMatch(result.proposal.project.name, /3130 Killdeer/i);
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].unitPrice, 325000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.equal(totals.total, 325000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 325000);
});

test("parses pipe-delimited line items", () => {
  const result = parseSmartPasteNotes(
    `Line items:
Site Prep & Excavation | 1 | LS | 3250
Sidewalks 4 inch | 1250 | SF | 8.75`,
    proposalFixture(),
  );

  assert.equal(result.proposal.lineItems.length, 2);
  assert.equal(result.proposal.lineItems[0].description, "Site Prep & Excavation");
  assert.equal(result.proposal.lineItems[0].quantity, 1);
  assert.equal(result.proposal.lineItems[0].unit, "LS");
  assert.equal(result.proposal.lineItems[0].unitPrice, 3250);
  assert.equal(result.summary.lineItemCount, 2);
  assert.doesNotMatch(warningText(result), /Skipped line item/i);
});

test("parses base bid, allowances, add alternates, and total if all accepted", () => {
  const result = parseSmartPasteNotes(
    `Base Bid: 263000
Allowance: Estimated Shade Footings | 42500
Allowance: Concrete Interface / RFI Allowance | 50000
Add Alternate 01: Pedestrian asphalt-to-concrete | 212500
Total if all accepted: 965000`,
    proposalFixture(),
  );

  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Base Bid");
  assert.equal(result.proposal.lineItems[0].unitPrice, 263000);
  assert.equal(result.proposal.pricingSections.length, 3);
  assert.equal(result.parsedNotes.values.totalIfAllAccepted, 965000);
  assert.equal(result.summary.pricingSectionCount, 3);
});

test("parses Schedule of Values rows with four pipe-separated values", () => {
  const result = parseSmartPasteNotes(
    `Schedule of Values:
1 | Base Concrete Work | LS | 263000`,
    proposalFixture(),
  );

  const table = result.proposal.gcPacketTables.scheduleOfValues;
  assert.equal(table.enabled, true);
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].item, "1");
  assert.equal(table.rows[0].description, "Base Concrete Work");
  assert.equal(table.rows[0].pricingBasis, "LS");
  assert.equal(table.rows[0].amount, "263000");
  assert.doesNotMatch(warningText(result), /Skipped Schedule of Values|incomplete/i);
});

test("parses Takeoff Quantities rows with six pipe-separated values", () => {
  const result = parseSmartPasteNotes(
    `Takeoff Quantities:
Sidewalks | 1250 SF | 4 inch | 15.4 | 17.0 | Base`,
    proposalFixture(),
  );

  const table = result.proposal.gcPacketTables.takeoffQuantities;
  assert.equal(table.enabled, true);
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].item, "Sidewalks");
  assert.equal(table.rows[0].quantity, "1250 SF");
  assert.equal(table.rows[0].detailSize, "4 inch");
  assert.equal(table.rows[0].netCy, "15.4");
  assert.equal(table.rows[0].cyWithTenPercent, "17.0");
  assert.equal(table.rows[0].priceStatus, "Base");
  assert.doesNotMatch(warningText(result), /Skipped Takeoff Quantities|incomplete/i);
});

test("parses Shade Footing Estimate rows and treats Allowance Note as metadata", () => {
  const result = parseSmartPasteNotes(
    `Shade Footing Estimate:
C1 | 18 inch | 5 ft x 5 ft x 18 inch | 1.4 | 2500 | 1.6 | 42500 | Pending engineering
Allowance Note: Final engineered shade footing design required.`,
    proposalFixture(),
  );

  const table = result.proposal.gcPacketTables.shadeFootingEstimate;
  assert.equal(table.enabled, true);
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].column, "C1");
  assert.equal(table.rows[0].allowanceNote, "Pending engineering Final engineered shade footing design required.");
  assert.doesNotMatch(warningText(result), /Allowance Note/i);
});

test("captures plan sheet metadata without false warnings", () => {
  const result = parseSmartPasteNotes(
    `Plan Takeoff Sheet - L102:
Sheet Subtitle: L102 Materials Plan West
Calculation Box Title: L102 Takeoff Basis
Clarifications:
Confirm final limits before placement.`,
    proposalFixture(),
  );

  const sheet = result.proposal.planSheets.find((planSheet) => planSheet.matchKey === "l102");
  assert.ok(sheet);
  assert.equal(sheet.enabled, true);
  assert.equal(sheet.subtitle, "L102 Materials Plan West");
  assert.equal(sheet.calculationTitle, "L102 Takeoff Basis");
  assert.deepEqual(sheet.clarificationNotes, ["Confirm final limits before placement."]);
  assert.doesNotMatch(warningText(result), /Sheet Subtitle|Calculation Box Title/i);
});

test("does not parse RFIs, addenda, and proposal notes as line items after line item mode", () => {
  const result = parseSmartPasteNotes(
    `Line items:
Base Concrete Work | 1 | LS | 263000

Allowance: Estimated Shade Footings | 42500
Allowance: Concrete Interface / RFI Allowance | 50000
Add Alternate 01: Pedestrian asphalt replaced with concrete where accepted | 212500
Add Alternate 02: Sport court concrete base with #4 rebar each way and sawcut allowance | 397000
Total if all accepted: 965000

RFIs / Clarifications:
Final engineered shade footing design for C1-C6 required.
Final playground equipment footing schedule required.

Addenda Acknowledged:
Addendum 01

Proposal Notes:
Base Package with Allowances: $355,500.
Total if all accepted: $965,000.`,
    proposalFixture(),
  );

  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Base Concrete Work");
  assert.equal(result.proposal.pricingSections.length, 4);
  assert.match(result.proposal.gcPrime.rfiClarificationNotes, /Final engineered shade footing design/);
  assert.match(result.proposal.gcPrime.addendaAcknowledged, /Addendum 01/);
  assert.match(result.proposal.proposalNotes, /Base Package with Allowances/);
  assert.doesNotMatch(warningText(result), /Skipped line item/i);
  assert.doesNotMatch(warningText(result), /RFIs|Addenda|Proposal Notes/i);
});

test("maps legal and scope protection labels into proposal terms", () => {
  const result = parseSmartPasteNotes(
    `Payment Terms:
Progress billing by approved pay application.
Change Orders:
Written approval required before added work.
Hidden Conditions:
Unknown utilities and unsuitable soils are excluded.
Warranty Limitation:
Warranty applies to included workmanship only.
Site Readiness:
GC to provide access, layout, and prepared base.
Weather Delays:
Rain or freezing conditions may delay work.
Utility Responsibility:
Utility locating and repairs by others.
Concrete Cracking:
Control joints reduce risk but do not guarantee crack-free concrete.
Color / Finish Variation:
Concrete finish and color may vary.
GC / Prime Scope Control:
Proposal includes only the concrete scope specifically listed.`,
    proposalFixture(),
  );

  assert.equal(result.proposal.terms.payment, "Progress billing by approved pay application.");
  assert.equal(result.proposal.terms.changeOrderLanguage, "Written approval required before added work.");
  assert.equal(result.proposal.terms.hiddenConditions, "Unknown utilities and unsuitable soils are excluded.");
  assert.equal(result.proposal.terms.warrantyLimitation, "Warranty applies to included workmanship only.");
  assert.equal(result.proposal.terms.siteReadiness, "GC to provide access, layout, and prepared base.");
  assert.equal(result.proposal.terms.weatherDelay, "Rain or freezing conditions may delay work.");
  assert.equal(result.proposal.terms.utilityResponsibility, "Utility locating and repairs by others.");
  assert.equal(result.proposal.terms.concreteCrackingDisclaimer, "Control joints reduce risk but do not guarantee crack-free concrete.");
  assert.equal(result.proposal.terms.colorFinishVariationDisclaimer, "Concrete finish and color may vary.");
  assert.equal(result.proposal.terms.gcScopeControl, "Proposal includes only the concrete scope specifically listed.");
  assert.equal(
    result.proposal.gcPacketTables.proposalNotes.contractScopeControl,
    "Proposal includes only the concrete scope specifically listed.",
  );
  assert.ok(result.summary.fields.includes("payment terms"));
  assert.doesNotMatch(warningText(result), /Use clear labels/i);
});

test("cleans starter data and preserves NW Dunbar subcontractor packet paste", () => {
  const result = parseSmartPasteNotes(
    `Project: NW Dunbar Avenue Improvements
Location: Troutdale, Oregon
Prepared for: Faison Construction
Owner: City of Troutdale, Oregon
Contact: Maize
Email: maize@faisonconstruction.com

Base Concrete / Site Package: $695,000
Additive Alternate: $225,000
Optional Support Scope: $210,000
Total if Base + Additive: $920,000
Total if Base + Additive + Optional Support: $1,130,000

Concrete / site package subcontractor proposal
Not full GC/prime

Scope:
Concrete site package proposal only; not as full GC/prime. Include listed concrete/site package scope only.

Exclusions:
Survey/layout by others; testing by others; unsuitable soils excluded unless accepted by written change order.

Takeoff Quantities:
Base Concrete / Site Package | LS | Concrete/site package | 0 | 0 | Base

Schedule of Values:
1 | Base Concrete / Site Package | Base Included | $695,000
2 | Additive Alternate | Optional Add Alternate | $225,000
3 | Optional Support Scope | Optional Support Scope | $210,000
Base + Additive | Presentation subtotal | Presentation | $920,000
Subtotal | Total if Base + Additive | Presentation | $920,000
Total if Base + Additive + Optional Support | Presentation Total | Presentation | $1,130,000

RFIs / Clarifications:
Confirm final concrete scope limits and whether optional support scope should be carried.

Proposal Notes:
Pricing is a subcontractor concrete/site package draft for internal review.

Acceptance Summary:
Internal review draft only. Do not release until Faison confirms accepted scope and alternates.`,
    proposalFixture(),
  );

  assert.equal(result.proposal.project.name, "NW Dunbar Avenue Improvements");
  assert.equal(result.proposal.project.location, "Troutdale, Oregon");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.project.owner, "City of Troutdale, Oregon");
  assert.equal(result.proposal.client.contactName, "Maize");
  assert.equal(result.proposal.client.email, "maize@faisonconstruction.com");
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Base Concrete / Site Package");
  assert.equal(result.proposal.lineItems[0].unitPrice, 695000);
  assert.equal(result.proposal.pricingSections.length, 2);
  assert.equal(result.proposal.pricingSections[0].label, "Additive Alternate");
  assert.equal(result.proposal.pricingSections[0].amount, 225000);
  assert.equal(result.proposal.pricingSections[0].included, false);
  assert.equal(result.proposal.pricingSections[1].label, "Optional Support Scope");
  assert.equal(result.proposal.pricingSections[1].amount, 210000);
  assert.equal(result.parsedNotes.values.totalIfAllAccepted, 1130000);
  assert.equal(calculateProposalTotals(result.proposal).total, 695000);
  assert.equal(calculateProposalTotals(result.proposal).totalIfAllAlternatesAccepted, 1130000);
  assert.equal(result.proposal.gcPacketTables.pricingSummary.enabled, true);
  assert.deepEqual(
    result.proposal.gcPacketTables.pricingSummary.rows.map((row) => row.label),
    [
      "Base Concrete / Site Package",
      "Additive Alternate",
      "Optional Support Scope",
      "Total if Base + Additive",
      "Total if Base + Additive + Optional Support",
    ],
  );
  assert.doesNotMatch(JSON.stringify(result.proposal), /Estimated Shade Footings|Interface \/ RFI Allowance|Albany, OR|Marketplace Retail Center/);
  assert.match(result.proposal.gcPacketTables.proposalNotes.acceptanceSummary, /Internal review draft only/);
  assert.match(result.proposal.gcPacketTables.proposalNotes.contractScopeControl, /subcontractor/i);
  assert.match(result.proposal.scopeSections[0].items.join("\n"), /not as full GC\/prime/);
  assert.doesNotMatch(result.proposal.scopeSections[0].items.join("\n"), /\nprime$/i);
  const validation = validateProposalCompleteness(result.proposal);
  assert.doesNotMatch(validation.errors.join("\n"), /client\/company|project name|project address|project location/i);
  assert.doesNotMatch(validation.warnings.join("\n"), /3,180,000|Schedule of Values total/i);
  assert.ok(result.summary.coverFieldsUpdated.includes("Project Name"));
  assert.ok(result.summary.cleanupActions.some((action) => /Starter\/default pricing rows replaced/.test(action)));
  assert.ok(result.summary.defaultRowsRemoved.includes("Site Prep & Excavation"));
  assert.equal(result.summary.pricingRowsReplaced, 5);
});

test("fills required NW Dunbar header fields when pasted into a blank proposal draft", () => {
  const result = parseSmartPasteNotes(
    `Project: NW Dunbar Avenue Improvements
Location: Troutdale, Oregon
Prepared for: Faison Construction
Contact: Maize
Email: maize@faisonconstruction.com
Base Concrete / Site Package: $695,000
Additive Alternate: $225,000
Optional Support Scope: $210,000
Total if Base + Additive: $920,000
Total if Base + Additive + Optional Support: $1,130,000

Scope:
Concrete site package proposal only.`,
    blankProposalFixture(),
  );

  const validation = validateProposalCompleteness(result.proposal);

  assert.equal(result.proposal.project.name, "NW Dunbar Avenue Improvements");
  assert.equal(result.proposal.project.location, "Troutdale, Oregon");
  assert.equal(result.proposal.project.address, "Troutdale, Oregon");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.client.contactName, "Maize");
  assert.equal(result.proposal.client.email, "maize@faisonconstruction.com");
  assert.equal(calculateProposalTotals(result.proposal).total, 695000);
  assert.equal(calculateProposalTotals(result.proposal).totalIfAllAlternatesAccepted, 1130000);
  assert.doesNotMatch(validation.errors.join("\n"), /client\/company|project name|project address|project location/i);
});

test("handles Costco freezer slab paste without fake alternates or raw scope-control leakage", () => {
  const result = parseSmartPasteNotes(
    `Project: Costco #682 Albany POS Boxes Remodel
Location: Albany, Oregon
Prepared for: [VERIFY CUSTOMER / GC]
Contact: [ENTER CONTACT NAME BEFORE SENDING]
Email: [ENTER EMAIL BEFORE SENDING]
Phone: [ENTER PHONE BEFORE SENDING]
Proposal Type: GC / Prime
Proposal Status: Draft internal review

Scope Summary:
Interior concrete / night work freezer slab package including phased sawcut, slab demo, haul-off, freezer slab prep, sand base, vapor barrier, insulation, PVC freezer vent pipe, reinforcement, new 6 in freezer slabs, curb work, bollards, patch allowance, line pump allowance, and cleanup.

Schedule:
Estimated schedule to be confirmed after final phasing and approved night-work window. Current working assumption: night work only, one freezer area at a time, coordinated around active store operations.

Base Bid: $325,000
Add Alternate: None currently
Total Proposal: $325,000

Scope Control Summary:
Included Scope | Interior freezer slab sawcut, slab demo, haul-off, prep, vapor barrier, insulation, vent pipe, reinforcement, new slabs, curb work, bollards, patch allowance, line pump allowance, and cleanup.
Exclusions | Store operations protection by others; refrigeration system work excluded; permits and testing by others.
Clarifications | Night work only and one freezer area at a time unless changed in writing.

Schedule of Values:
1 | Base Bid | Included base scope | $325,000
Total | Total Proposal | Presentation total | $325,000

Proposal Notes:
Draft proposal for review. Verify customer, GC, contact, final phasing, and night-work window before sending.`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);
  const validation = validateProposalCompleteness(result.proposal);

  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].unitPrice, 325000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.equal(totals.total, 325000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 325000);
  assert.match(result.proposal.project.description, /Interior concrete \/ night work freezer slab package/);
  assert.match(result.proposal.project.proposedSchedule.display, /night work only/);
  assert.match(result.proposal.gcPrime.scopeControlSummary.includedScope, /Interior freezer slab sawcut/);
  assert.match(result.proposal.gcPrime.scopeControlSummary.exclusions, /refrigeration system work excluded/);
  assert.doesNotMatch(result.proposal.proposalNotes || "", /Included Scope \|/);
  assert.doesNotMatch(result.proposal.gcPacketTables.proposalNotes.proposalBasis || "", /Included Scope \|/);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Total Proposal/);
  assert.doesNotMatch(validation.warnings.join("\n"), /Schedule of Values total/);
  assert.ok(validation.warnings.includes("Verify client/contact fields before sending."));
  assert.equal(validation.isValid, true);
});

test("treats Total Proposal and Grand Total lines as summary totals, not alternates", () => {
  const result = parseSmartPasteNotes(
    `Project: Total Proposal Trap
Site: Albany, Oregon
GC: Faison Construction
Contact: Maize
Base Bid: $325,000
Total Proposal: $325,000
Grand Total: $325,000`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.project.name, "Total Proposal Trap");
  assert.equal(result.proposal.project.location, "Albany, Oregon");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Total Proposal|Grand Total/);
  assert.equal(totals.total, 325000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 325000);
  assert.deepEqual(
    result.proposal.gcPacketTables.pricingSummary.rows.map((row) => row.label),
    ["Base Bid", "Total Proposal", "Grand Total"],
  );
});

test("warns when Smart Paste cannot find project, client, or location", () => {
  const result = parseSmartPasteNotes(
    `Scope:
Place and finish slab.

Base Bid: $12,000`,
    blankProposalFixture(),
  );

  assert.match(warningText(result), /project name/i);
  assert.match(warningText(result), /client, GC, or contact/i);
  assert.match(warningText(result), /project location or address/i);
});

test("dedupes repeated exclusions, RFIs, proposal notes, and scope-control notes", () => {
  const result = parseSmartPasteNotes(
    `Project: Duplicate Note Test
Location: Salem, Oregon
Client: Faison Construction

Exclusions:
Testing by others.
testing by others
- Testing by others

RFIs / Clarifications:
Confirm slab limits.
Confirm slab limits

Scope Control Summary:
Included Scope | Site concrete package.
Included Scope | site concrete package
Exclusions | Testing by others.
Exclusions | testing by others

Proposal Notes:
Draft for review.
Draft for review`,
    blankProposalFixture(),
  );

  assert.deepEqual(result.proposal.exclusions, ["Testing by others."]);
  assert.equal(result.proposal.gcPrime.rfiClarificationNotes, "Confirm slab limits.");
  assert.equal(result.proposal.proposalNotes, "Draft for review.");
  assert.equal(result.proposal.gcPrime.scopeControlSummary.includedScope, "Site concrete package.");
  assert.equal(result.proposal.gcPrime.scopeControlSummary.exclusions, "Testing by others.");
});

test("does not show false SOV warnings when no SOV table was pasted", () => {
  const result = parseSmartPasteNotes(
    `Project: No SOV Needed
Location: Salem, Oregon
Prepared for: Faison Construction
Base Bid: $100,000
Total Proposal: $100,000`,
    blankProposalFixture(),
  );

  assert.doesNotMatch(warningText(result), /Schedule of Values/i);
  assert.equal(result.proposal.gcPacketTables.scheduleOfValues.rows.length, 0);
});

test("warns only when a pasted SOV section is actually incomplete", () => {
  const result = parseSmartPasteNotes(
    `Project: Incomplete SOV
Location: Salem, Oregon
Prepared for: Faison Construction
Base Bid: $100,000

Schedule of Values:
Base Bid | $100,000`,
    blankProposalFixture(),
  );

  assert.match(warningText(result), /Schedule of Values/i);
});
