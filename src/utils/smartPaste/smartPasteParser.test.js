import test from "node:test";
import assert from "node:assert/strict";

import { calculateProposalTotals, SEED_PROPOSAL, validateProposalCompleteness } from "../../proposalData.js";
import { normalizeResidentialLegalPapers } from "../proposalPacket/residentialLegalPapers.js";
import { SMART_PASTE_JSON_MARKER, isSmartPasteJsonImportNotes } from "./smartPasteNormalizer.js";
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
  assert.equal(result.proposal.proposalMode, "commercial_subcontractor");
  assert.equal(result.summary.proposalMode, "commercial_subcontractor");
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
  assert.equal(result.proposal.proposalMode, "gc_prime_packet");
  assert.equal(result.proposal.proposalType, "gc_prime");
  assert.equal(result.proposal.packetMode, "full_gc_packet");
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
  assert.equal(result.proposal.proposalMode, "commercial_subcontractor");
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
  assert.equal(result.proposal.proposalMode, "gc_prime_packet");
  assert.equal(result.proposal.packetMode, "full_gc_packet");
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

test("parses Costco contractor-style full prompt with field-block SOV takeoff and RFI rows", () => {
  const result = parseSmartPasteNotes(
    `Project Info
Project Name: Costco #682 Albany POS Boxes Remodel
Location: 3130 Killdeer Ave SE, Albany, OR
Project Location: 3130 Killdeer Ave SE, Albany, Oregon
Project Address: 3130 Killdeer Ave SE, Albany, OR
Prepared for: Faison Construction
Owner: Costco Wholesale
Proposal Status: Draft internal review

Project Description
Interior concrete / night work freezer slab package for freezer POS boxes remodel.

Pricing
Base Concrete Work $350,000
Total Proposal $350,000
Accepted Alternates: None currently accepted

Schedule of Values
Item:
1. Mobilization / Material Procurement / Setup
Description:
Mobilization, coordination, material procurement, layout/prep, night-work setup, equipment coordination, and project startup.
Pricing Basis:
10%
Amount:
$35,000

Item:
2. Night Work / Phased Freezer Slab Package
Description:
Sawcut, slab demo, haul-off, freezer slab prep, vapor barrier, insulation, reinforcement, new freezer slab placement, and cleanup.
Pricing Basis:
90%
Amount:
$315,000

Takeoff Quantities
Row 1
Item: Freezer 1 slab demo
Quantity: 1,440.86 SF
Detail / Size: Existing slab demo
Net CY: 26.68 CY demo volume, assumes 6" slab
CY With 10%: 29.35 CY demo volume
Price / Status: Base Bid

RFI / CLARIFICATION 1:
RFI / Clarification Number: RFI-01
Date Asked: May 6, 2026
Date Answered: Pending
Source: Field discussion / A102 / proposal assumptions
Question / Clarification Needed: Confirm final freezer slab layout and phased work limits.
Answer / Proposal Treatment: Proposal is based on current listed takeoff quantities.
Price Impact: Any added slab beyond listed quantities is excluded unless accepted by change order.
Scope Impact: Layout change may affect demo, prep, and placement quantities.

STRUCTURED ADDENDA ACKNOWLEDGEMENT
Addendum 01: Pending confirmation

Scope Control Summary
Included Scope | Interior freezer slab demo, prep, vapor barrier, insulation, reinforcement, placement, and cleanup.
Exclusions | Refrigeration, electrical, permits, testing, and store operations protection by others.
Clarifications | Night work and phased access assumed.

Legal / Terms
Payment Terms: Progress billing by approved pay application.
Change Orders: Written approval required before added work.
Hidden Conditions: Unknown utilities and unsuitable soils excluded.

Proposal Notes
Acceptance Summary: Draft for internal review before sending.

Final GC Packet Print Order
Cover / Proposal Summary
Pricing Summary
Schedule of Values
Takeoff Quantities
RFI / Clarification Register
Legal / Terms`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);
  const sovRows = result.proposal.gcPacketTables.scheduleOfValues.rows;
  const takeoffRows = result.proposal.gcPacketTables.takeoffQuantities.rows;
  const rfiRows = result.proposal.gcPrime.rfiRegister;

  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.proposalMode, "gc_prime_packet");
  assert.equal(result.proposal.packetMode, "full_gc_packet");
  assert.equal(result.proposal.project.location, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.project.address, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.doesNotMatch(result.proposal.project.name, /3130 Killdeer/);
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Base Concrete Work");
  assert.equal(result.proposal.lineItems[0].unitPrice, 350000);
  assert.equal(totals.total, 350000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 350000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Unit Price|Amount|Total Proposal/);
  assert.equal(sovRows.length, 2);
  assert.equal(sovRows[0].item, "Mobilization / Material Procurement / Setup");
  assert.match(sovRows[0].description, /Mobilization, coordination/);
  assert.equal(sovRows[0].pricingBasis, "10%");
  assert.equal(sovRows[0].amount, "$35,000");
  assert.equal(takeoffRows.length, 1);
  assert.equal(takeoffRows[0].item, "Freezer 1 slab demo");
  assert.equal(takeoffRows[0].quantity, "1,440.86 SF");
  assert.equal(takeoffRows[0].cyWithTenPercent, "29.35 CY demo volume");
  assert.equal(rfiRows.length, 1);
  assert.equal(rfiRows[0].rfiNumber, "RFI-01");
  assert.match(rfiRows[0].question, /Confirm final freezer slab layout/);
  assert.doesNotMatch(JSON.stringify(takeoffRows), /RFI|Addendum|Legal|Final GC Packet Print Order|Payment Terms/);
  assert.ok(result.summary.packetSectionsCreated > 0);
  assert.ok(result.summary.warnings.length <= 2);
  assert.doesNotMatch(warningText(result), /Unit Price|Amount|pipe-separated|Schedule of Values section was found/);
});

test("normalizes a full Costco contractor prompt before applying to proposal fields", () => {
  const sovFixture = Array.from({ length: 5 }, (_, index) => {
    const rowNumber = index + 1;
    const amounts = [35000, 70000, 95000, 80000, 70000];

    return `Item:
${rowNumber}. SOV Phase ${rowNumber}

Pricing Basis:
${rowNumber * 10}%

Description:
Costco freezer slab phase ${rowNumber} work scope, coordination, material handling, and closeout.

Amount:
$${amounts[index].toLocaleString()}`;
  }).join("\n\n");
  const takeoffFixture = Array.from({ length: 38 }, (_, index) => {
    const rowNumber = index + 1;

    return `Row ${rowNumber}
Item: Freezer ${rowNumber} slab demo
Quantity: ${100 + rowNumber}.00 SF
Detail / Size: Existing freezer slab work area ${rowNumber}
Net CY: ${rowNumber}.25 CY demo volume
CY With 10%: ${rowNumber}.38 CY demo volume
Price / Status: Base Bid`;
  }).join("\n\n");
  const rfiFixture = Array.from({ length: 10 }, (_, index) => {
    const rowNumber = index + 1;
    const rfiNumber = String(rowNumber).padStart(2, "0");

    return `RFI / CLARIFICATION ${rowNumber}:
RFI / Clarification Number: RFI-${rfiNumber}
Date Asked: May ${5 + rowNumber}, 2026
Date Answered: Pending
Source: A10${rowNumber} / proposal assumptions
Question / Clarification Needed: Confirm freezer slab scope item ${rowNumber}.
Answer / Proposal Treatment: Proposal carries current listed quantity for item ${rowNumber}.
Price Impact: Added work beyond listed scope is excluded unless accepted.
Scope Impact: Change may affect phasing, demo, prep, or placement.`;
  }).join("\n\n");
  const result = parseSmartPasteNotes(
    `PROJECT INFO:
Project Name:
Costco #682 Albany POS Boxes Remodel
Project Location:
3130 Killdeer Ave SE, Albany, OR
Project Address:
3130 Killdeer Ave SE, Albany, OR
Customer / GC:
Faison Construction
Attention:
Maize
Email:
maize@faisonconstruction.com
Phone:
503-555-1212
Proposal Status:
Draft
Bid Package Number:
POS-FREEZER-682
Spec Section:
03 30 00 Cast-in-Place Concrete
Drawing References:
A101, A102, A103
Estimated Duration:
Night work only, phased freezer slab package
Schedule Restrictions:
One freezer area at a time around active store operations.
Special Requirements:
Coordinate night access, cold storage protection, and store operations.

PRICING LINE ITEM 1:
Item #: 1
Unit: LS
Description: Night Work / Phased Freezer Slab Package
Quantity: 1
Unit Price: 350000
Taxable: No / Unchecked
Amount: $350,000.00

PRICING SUMMARY / PRESENTATION NOTES:
Base Bid - Night Work / Phased Freezer Slab Package:
$350,000
Add Alternates:
None currently
Accepted Alternates: None currently accepted
Total Proposal:
$350,000

SCOPE OF WORK - SECTION 1 TITLE:
Interior freezer slab night work
SCOPE OF WORK - SECTION 1 BULLETS:
- Sawcut and remove existing freezer slab areas.
- Prep freezer slab substrate, vapor barrier, insulation, reinforcement, and placement.
- Coordinate cleanup and phased access around store operations.

CONCRETE SPECIFICATIONS - THICKNESS:
6 in freezer slabs unless noted otherwise
CONCRETE SPECIFICATIONS - CONCRETE STRENGTH:
4,000 PSI
CONCRETE SPECIFICATIONS - SLUMP:
4 in +/- 1 in
CONCRETE SPECIFICATIONS - REBAR / MESH:
Per plans and listed freezer slab assumptions
CONCRETE SPECIFICATIONS - FINISHES:
Trowel finish suitable for freezer slab use

Schedule of Values
${sovFixture}

PLAN TAKEOFF SHEET - SHEET TITLE:
Costco Freezer Slab Takeoff Overview
PLAN TAKEOFF SHEET - SHEET SUBTITLE:
POS Boxes Remodel
PLAN TAKEOFF SHEET - CALCULATION BOX TITLE:
Freezer Slab Quantity Basis
PLAN TAKEOFF SHEET - CALCULATION NOTES:
- Quantities are based on current marked takeoff areas.
PLAN TAKEOFF SHEET - CLARIFICATION NOTES:
- Confirm exact freezer slab limits before final release.

A101 - SHEET TITLE:
A101 Freezer Area 1
A101 - SHEET SUBTITLE:
Existing slab demo and replacement
A101 - CALCULATION BOX TITLE:
A101 Takeoff Basis
A101 - CALCULATION NOTES:
- Area 1 quantity backup.
A101 - CLARIFICATION NOTES:
- Confirm sawcut limits.
A101 - PICTURE CAPTION:
Area 1 marked takeoff.

A102 - SHEET TITLE:
A102 Freezer Area 2
A102 - SHEET SUBTITLE:
Existing slab demo and replacement
A102 - CALCULATION BOX TITLE:
A102 Takeoff Basis
A102 - CALCULATION NOTES:
- Area 2 quantity backup.
A102 - CLARIFICATION NOTES:
- Confirm access and phasing.
A102 - PICTURE CAPTION:
Area 2 marked takeoff.

Takeoff Quantities
${takeoffFixture}

RFI / Clarification Register
${rfiFixture}

SCOPE CONTROL SUMMARY - INCLUDED SCOPE:
Interior freezer slab demo, prep, vapor barrier, insulation, reinforcement, placement, and cleanup.
SCOPE CONTROL SUMMARY - EXCLUSIONS:
Refrigeration, electrical, permits, testing, and store operations protection by others.
SCOPE CONTROL SUMMARY - CLARIFICATIONS:
Night work and phased access assumed.
SCOPE CONTROL SUMMARY - ACCEPTED ALTERNATES:
None currently accepted.
SCOPE CONTROL SUMMARY - OWNER / GC BY OTHERS:
Store access, refrigeration, electrical, and protection by others.

LEGAL / TERMS - PAYMENT TERMS:
Progress billing by approved pay application.
LEGAL / TERMS - PROPOSAL EXPIRATION:
Pricing valid for 30 days unless otherwise stated.
LEGAL / TERMS - CHANGE ORDER LANGUAGE:
Written approval required before added work.
LEGAL / TERMS - SITE READINESS:
Work depends on access and prepared conditions by others.
LEGAL / TERMS - WARRANTY LIMITATION:
Warranty applies to included workmanship only.

Proposal Notes:
Draft freezer slab package for internal review before sending.
Acceptance Summary:
Review base scope, exclusions, RFIs, and phased night-work assumptions before final release.

FINAL GC PACKET PRINT ORDER:
10 - Cover / Proposal Summary - Included
20 - Details / Pricing Summary - Included
30 - Pricing Summary - Included
40 - Schedule of Values - Included
50 - Scope Control Summary - Included
60 - Takeoff Quantities - Included
70 - Plan Sheet Pages - Included
80 - RFI / Clarification Register - Included
90 - Legal / Terms - Included
100 - Proposal Notes / Acceptance Summary - Included
110 - Shade Footing Estimate - Not Included / Exclude`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);
  const enabledPlanSheets = result.proposal.planSheets.filter((sheet) => sheet.enabled);

  assert.equal(result.proposal.project.name, "Costco #682 Albany POS Boxes Remodel");
  assert.equal(result.proposal.project.location, "3130 Killdeer Ave SE, Albany, OR");
  assert.doesNotMatch(result.proposal.project.name, /3130 Killdeer/i);
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Night Work / Phased Freezer Slab Package");
  assert.equal(result.proposal.lineItems[0].quantity, 1);
  assert.equal(result.proposal.lineItems[0].unit, "LS");
  assert.equal(result.proposal.lineItems[0].unitPrice, 350000);
  assert.equal(totals.baseBid, 350000);
  assert.equal(totals.total, 350000);
  assert.equal(totals.totalIfAllAlternatesAccepted, 350000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Unit Price|Amount|Total Proposal/);
  assert.equal(result.proposal.gcPacketTables.scheduleOfValues.rows.length, 5);
  assert.equal(result.proposal.gcPacketTables.takeoffQuantities.rows.length, 38);
  assert.equal(result.proposal.gcPrime.rfiRegister.length, 10);
  assert.ok(enabledPlanSheets.length >= 3);
  assert.ok(result.proposal.scopeSections.length >= 1);
  assert.match(result.proposal.terms.payment, /Progress billing/);
  assert.equal(result.summary.lineItemCount, 1);
  assert.equal(result.summary.scheduleOfValuesCount, 5);
  assert.equal(result.summary.takeoffQuantityCount, 38);
  assert.equal(result.summary.rfiCount, 10);
  assert.ok(result.summary.packetSectionsCreated > 8);
  assert.ok(result.summary.applyTargets.includes("Line Items"));
  assert.ok(result.summary.applyTargets.includes("Schedule of Values"));
  assert.ok(result.summary.applyTargets.includes("Takeoff Quantities"));
  assert.ok(result.summary.applyTargets.includes("RFI Register"));
  assert.doesNotMatch(JSON.stringify(result.proposal), /New scope item|UPLOAD PLAN IMAGE/);
  assert.ok(result.summary.warnings.length <= 3);
  assert.doesNotMatch(warningText(result), /Row 1|Item:|Quantity:|Unit Price|Amount:|Pricing Basis/);
});

test("detects and imports strict Smart Paste JSON without rough-note parsing", () => {
  const jsonNotes = `${SMART_PASTE_JSON_MARKER}
${JSON.stringify(
  {
    project: {
      name: "Costco JSON Import",
      location: "3130 Killdeer Ave SE, Albany, OR",
      owner: "Costco Wholesale",
      clientGc: "Faison Construction",
      contactName: "Maize",
      phone: "503-555-1212",
      email: "maize@faisonconstruction.com",
      description: "JSON freezer slab package.",
    },
    pricing: {
      lineItems: [
        {
          itemNumber: 1,
          description: "Night Work / Phased Freezer Slab Package",
          quantity: 1,
          unit: "LS",
          unitPrice: 350000,
          amount: 350000,
          taxable: false,
        },
      ],
    },
    scheduleOfValues: [
      {
        item: "1. Mobilization",
        description: "Mobilization and setup.",
        pricingBasis: "10%",
        amount: "$35,000",
      },
    ],
    scopeSections: [
      {
        title: "Interior freezer slab night work",
        bullets: ["Sawcut and remove freezer slab.", "Place new freezer slab."],
      },
      {
        title: "New scope item",
        bullets: ["UPLOAD PLAN IMAGE"],
      },
    ],
    concreteSpecifications: {
      thickness: "6 in freezer slabs",
      psi: "4,000 PSI",
      finishType: "Trowel finish",
    },
    takeoffQuantities: [
      {
        item: "Freezer 1 slab demo",
        quantity: "1,440.86 SF",
        detailSize: "Existing slab demo",
        netCy: "26.68 CY",
        cyWithWaste: "29.35 CY",
        priceStatus: "Base Bid",
      },
    ],
    planSheets: [
      {
        sheetId: "A101",
        title: "A101 Freezer Area 1",
        subtitle: "Existing slab demo",
        calculationBoxTitle: "A101 Takeoff Basis",
        calculationNotes: ["Area 1 quantity backup."],
        clarificationNotes: ["Confirm sawcut limits."],
      },
      {
        sheetId: "BAD",
        title: "UPLOAD PLAN IMAGE",
      },
    ],
    rfiRegister: [
      {
        number: "RFI-01",
        asked: "May 6, 2026",
        answered: "Pending",
        source: "A101",
        question: "Confirm freezer slab limits.",
        treatment: "Proposal carries listed quantity.",
        priceImpact: "Added work excluded.",
        scopeImpact: "Scope may change.",
      },
    ],
    addendaAcknowledgement: [
      {
        number: "Addendum 01",
        date: "May 7, 2026",
        titleDescription: "Bid clarifications",
      },
    ],
    scopeControlSummary: {
      includedScope: "Interior freezer slab package only.",
      exclusions: "Refrigeration and electrical by others.",
      clarifications: "Night work assumed.",
    },
    legalTerms: {
      paymentTerms: "Progress billing by approved pay application.",
      proposalExpiration: "Pricing valid for 30 days.",
      changeOrderLanguage: "Written approval required before added work.",
      warrantyLimitation: "Warranty applies to included workmanship only.",
    },
    finalPacketPrintOrder: [
      { order: 10, label: "Cover / Proposal Summary", status: "Included" },
      { order: 20, label: "Pricing Summary", status: "Included" },
      { order: 30, label: "Schedule of Values", status: "Included" },
      { order: 40, label: "Takeoff Quantities", status: "Included" },
      { order: 50, label: "RFI / Clarification Register", status: "Included" },
      { order: 60, label: "Legal / Terms", status: "Included" },
    ],
    proposalNotes: ["Review JSON import before sending."],
  },
  null,
  2,
)}`;
  const result = parseSmartPasteNotes(jsonNotes, blankProposalFixture());
  const totals = calculateProposalTotals(result.proposal);

  assert.equal(isSmartPasteJsonImportNotes(jsonNotes), true);
  assert.equal(result.summary.jsonImportMode, true);
  assert.equal(result.summary.invalidJsonImport, false);
  assert.equal(result.proposal.project.name, "Costco JSON Import");
  assert.equal(result.proposal.project.location, "3130 Killdeer Ave SE, Albany, OR");
  assert.equal(result.proposal.client.companyName, "Faison Construction");
  assert.equal(result.proposal.client.contactName, "Maize");
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Night Work / Phased Freezer Slab Package");
  assert.equal(totals.baseBid, 350000);
  assert.equal(totals.total, 350000);
  assert.equal(result.proposal.pricingSections.length, 0);
  assert.equal(result.proposal.gcPacketTables.scheduleOfValues.rows.length, 1);
  assert.equal(result.proposal.gcPacketTables.takeoffQuantities.rows.length, 1);
  assert.equal(result.proposal.gcPrime.rfiRegister.length, 1);
  assert.equal(result.proposal.planSheets.filter((sheet) => sheet.enabled).length, 1);
  assert.match(result.proposal.terms.payment, /Progress billing/);
  assert.equal(result.summary.lineItemCount, 1);
  assert.equal(result.summary.scheduleOfValuesCount, 1);
  assert.equal(result.summary.takeoffQuantityCount, 1);
  assert.equal(result.summary.rfiCount, 1);
  assert.ok(result.summary.packetSectionsCreated > 5);
  assert.ok(result.summary.applyTargets.includes("Packet Print Order"));
  assert.doesNotMatch(JSON.stringify(result.proposal), /New scope item|UPLOAD PLAN IMAGE/);
});

test("invalid Smart Paste JSON shows a warning and does not fall back to rough-note parsing", () => {
  const result = parseSmartPasteNotes(
    `${SMART_PASTE_JSON_MARKER}
Project: Rough Parser Should Not Apply
Location: Albany, Oregon
Base Bid: $350,000`,
    blankProposalFixture(),
  );

  assert.equal(result.summary.jsonImportMode, true);
  assert.equal(result.summary.invalidJsonImport, true);
  assert.match(warningText(result), /invalid JSON/i);
  assert.equal(result.proposal.project.name, "");
  assert.equal(result.proposal.project.location, "");
  assert.equal(result.proposal.lineItems.length, 0);
  assert.equal(result.summary.lineItemCount, 0);
  assert.equal(result.summary.sectionsCaptured.length, 0);
});

test("imports residential base-plus-addons JSON as a simple estimate", () => {
  const jsonNotes = `${SMART_PASTE_JSON_MARKER}
${JSON.stringify(
  {
    proposalMode: "residential",
    residentialPdfLayout: "simple_estimate",
    project: {
      name: "Residential Step Estimate",
      location: "Salem, OR",
      clientGc: "Homeowner",
    },
    pricing: {
      pricingMode: "base_plus_addons",
      lineItems: [
        {
          itemNumber: 1,
          description: "Base residential step package",
          quantity: 1,
          unit: "LS",
          unitPrice: 40000,
          amount: 40000,
          taxable: false,
        },
      ],
      optionalAddOns: [
        { name: "Lighting in steps", amount: 7000, description: "Optional step lighting.", selected: true },
        { name: "Cantilever steps", amount: 10000, description: "Optional cantilever upgrade.", selected: false },
      ],
    },
  },
  null,
  2,
)}`;
  const result = parseSmartPasteNotes(jsonNotes, blankProposalFixture());
  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.proposalMode, "residential");
  assert.equal(result.proposal.pricingMode, "base_plus_addons");
  assert.equal(result.proposal.residentialPdfLayout, "simple_estimate");
  assert.equal(result.proposal.lineItems[0].description, "Base residential step package");
  assert.equal(result.proposal.optionalAddOns.length, 2);
  assert.equal(result.proposal.optionalAddOns[0].selected, true);
  assert.equal(result.proposal.pricingSections[0].included, true);
  assert.equal(result.proposal.pricingSections[1].included, false);
  const legalPapers = normalizeResidentialLegalPapers(result.proposal.residentialLegalPapers);
  assert.equal(legalPapers.termsAndConditions.status, "provided_separately");
  assert.equal(legalPapers.termsAndConditions.includedInPdf, false);
  assert.equal(totals.total, 47000);
  assert.equal(result.summary.hideTotalIfAllAccepted, true);
  assert.ok(!result.summary.fields.includes("alternates / allowances"));
  assert.ok(result.summary.applyTargets.includes("Pricing"));
});

test("imports residential choose-one pricing options from Smart Paste JSON", () => {
  const jsonNotes = `${SMART_PASTE_JSON_MARKER}
${JSON.stringify(
  {
    project: {
      name: "Residential Patio Finish Options",
      location: "Salem, Oregon",
      clientGc: "Homeowner",
      contactName: "Jane Customer",
    },
    pricing: {
      pricingMode: "choose_one_option",
      baseBid: 82500,
      totalProposal: 82500,
      lineItems: [],
      pricingOptions: [
        {
          name: "Option 1 - Full Scope With Broom Finish",
          price: 82500,
          downPayment: 41250,
          finalPayment: 41250,
          included: true,
          finishType: "Broom",
          scopeSummary: "Full residential walkway, steps, walls, curbs, and broom finish.",
          includedScope: ["Side walls", "Curbs", "Broom finish"],
          excludedScope: ["Sealer"],
          lineItems: [
            { description: "Site preparation", quantity: 1, unit: "LS", amount: 7500 },
            { description: "Concrete placement and broom finish", quantity: 1, unit: "LS", amount: 75000 },
          ],
          notes: ["Customer selects one main option."],
          images: [
            {
              label: "Broom finish example",
              caption: "Upload broom finish example photo after Smart Paste.",
              uploadRequired: true,
            },
          ],
          scheduleOfValues: [
            { item: "10 Day Crew Labor", amount: 56000 },
            { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
            { item: "Dirt and Gravel Area Prep", amount: 7500 },
            { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
            { item: "Broom Finish / Detailing / Cleanup", amount: 4000 },
          ],
        },
        {
          name: "Option 2 - Full Scope With Stamped Finish",
          price: 97500,
          downPayment: 48750,
          finalPayment: 48750,
          included: false,
          images: [
            {
              label: "Stamped finish example",
              caption: "Stamped finish sample",
              src: "data:image/png;base64,stamped",
              fileName: "stamped.png",
            },
          ],
          scheduleOfValues: [
            { item: "10 Day Crew Labor", amount: 56000 },
            { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
            { item: "Dirt and Gravel Area Prep", amount: 7500 },
            { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
            { item: "Stamped Finish Labor / Pattern Work / Cleanup", amount: 19000 },
          ],
        },
        {
          name: "Option 3 - Full Scope With Sand Finish",
          price: 90000,
          downPayment: 45000,
          finalPayment: 45000,
          included: false,
          scheduleOfValues: [
            { item: "10 Day Crew Labor", amount: 56000 },
            { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
            { item: "Dirt and Gravel Area Prep", amount: 7500 },
            { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
            { item: "Sand Finish Labor / Detailing / Cleanup", amount: 11500 },
          ],
        },
      ],
      optionalAddOns: [
        {
          name: "Cantilever-Style Stair Upgrade",
          amount: 8500,
          description: "Optional upgrade to selected option.",
          appliesTo: ["Option 1", "Option 2", "Option 3"],
          optionTotals: [
            { optionName: "Option 1 - Full Scope With Broom Finish", total: 91000, downPayment: 45500, finalPayment: 45500 },
          ],
          notes: ["Add-on is separate from main options."],
          images: [
            {
              label: "Cantilever stair example",
              caption: "Upload cantilever stair example photo after Smart Paste.",
              uploadRequired: true,
            },
          ],
        },
      ],
      alternates: [],
      allowances: [],
    },
    residentialLegalPapers: {
      informationNoticeToOwner: {
        status: "needs_review",
        providedToCustomer: false,
        providedDate: "",
        customerAcknowledged: false,
        customerAcknowledgedDate: "",
        notes: "Verify Oregon CCB owner notice requirements before signing.",
      },
      rightToCancelNotice: {
        status: "provided_separately",
        notes: "Provided separately if applicable.",
      },
      termsAndConditions: {
        status: "included",
        template: "last_yard_standard_residential_terms",
        includedInPdf: true,
        customerAcknowledged: false,
        customerAcknowledgedDate: "",
        notes: "Use Last Yard standard residential terms.",
      },
      legalAttachments: [
        {
          title: "Information Notice to Owner About Construction Liens",
          type: "owner_notice",
          fileName: "owner-notice.pdf",
          providedSeparately: true,
          acknowledgementRequired: true,
        },
      ],
    },
  },
  null,
  2,
)}`;
  const result = parseSmartPasteNotes(jsonNotes, blankProposalFixture());
  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.proposalMode, "residential");
  assert.equal(result.proposal.packetMode, "summary");
  assert.equal(result.proposal.pricingMode, "choose_one_option");
  assert.equal(result.proposal.pricingOptions.length, 3);
  assert.equal(result.proposal.pricingOptions[0].name, "Option 1 - Full Scope With Broom Finish");
  assert.equal(result.proposal.pricingOptions[0].price, 82500);
  assert.equal(result.proposal.pricingOptions[0].downPayment, 41250);
  assert.equal(result.proposal.pricingOptions[0].finalPayment, 41250);
  assert.equal(result.proposal.pricingOptions[0].finishType, "Broom");
  assert.equal(result.proposal.pricingOptions[0].scopeSummary, "Full residential walkway, steps, walls, curbs, and broom finish.");
  assert.deepEqual(result.proposal.pricingOptions[0].includedScope, ["Side walls", "Curbs", "Broom finish"]);
  assert.deepEqual(result.proposal.pricingOptions[0].excludedScope, ["Sealer"]);
  assert.equal(result.proposal.pricingOptions[0].lineItems.length, 2);
  assert.equal(result.proposal.pricingOptions[0].lineItems[1].amount, 75000);
  assert.deepEqual(result.proposal.pricingOptions[0].notes, ["Customer selects one main option."]);
  assert.equal(result.proposal.pricingOptions[0].images[0].label, "Broom finish example");
  assert.equal(result.proposal.pricingOptions[0].images[0].uploadRequired, true);
  assert.equal(result.proposal.pricingOptions[1].images[0].src, "data:image/png;base64,stamped");
  assert.equal(result.proposal.pricingOptions[0].scheduleOfValues.length, 5);
  assert.equal(result.proposal.pricingOptions[1].scheduleOfValues.length, 5);
  assert.equal(result.proposal.pricingOptions[2].scheduleOfValues.length, 5);
  assert.equal(result.proposal.pricingOptions[1].scheduleOfValues.at(-1).amount, 19000);
  assert.equal(typeof result.proposal.pricingOptions[2].scheduleOfValues.at(-1).amount, "number");
  assert.equal(result.proposal.pricingOptions[1].included, false);
  assert.equal(result.proposal.pricingOptions[2].included, false);
  assert.equal(result.proposal.optionalAddOns.length, 1);
  assert.equal(result.proposal.optionalAddOns[0].name, "Cantilever-Style Stair Upgrade");
  assert.equal(result.proposal.optionalAddOns[0].amount, 8500);
  assert.equal(result.proposal.optionalAddOns[0].optionTotals[0].total, 91000);
  assert.deepEqual(result.proposal.optionalAddOns[0].notes, ["Add-on is separate from main options."]);
  assert.equal(result.proposal.optionalAddOns[0].images[0].label, "Cantilever stair example");
  assert.equal(result.proposal.residentialLegalPapers.informationNoticeToOwner.status, "needs_review");
  assert.equal(result.proposal.residentialLegalPapers.rightToCancelNotice.status, "provided_separately");
  assert.equal(result.proposal.residentialLegalPapers.termsAndConditions.status, "included");
  assert.equal(result.proposal.residentialLegalPapers.termsAndConditions.template, "last_yard_standard_residential_terms");
  assert.equal(result.proposal.residentialLegalPapers.termsAndConditions.includedInPdf, true);
  assert.match(result.proposal.residentialLegalPapers.termsAndConditions.notes, /standard residential terms/i);
  assert.equal(result.proposal.residentialLegalPapers.legalAttachments[0].title, "Information Notice to Owner About Construction Liens");
  assert.equal(result.proposal.lineItems.length, 1);
  assert.equal(result.proposal.lineItems[0].description, "Option 1 - Full Scope With Broom Finish");
  assert.equal(result.proposal.lineItems[0].unitPrice, 82500);
  assert.equal(result.proposal.pricingSections.length, 1);
  assert.equal(result.proposal.pricingSections[0].label, "Cantilever-Style Stair Upgrade");
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Option 2|Option 3/);
  assert.equal(totals.total, 82500);
  assert.equal(result.summary.pricingMode, "choose_one_option");
  assert.equal(result.summary.proposalMode, "residential");
  assert.equal(result.summary.proposalModeLabel, "Residential");
  assert.equal(result.summary.hideTotalIfAllAccepted, true);
  assert.equal(result.summary.pricingOptions.length, 3);
  assert.equal(result.summary.optionalAddOns.length, 1);
  assert.equal(result.summary.pricingOptions[0].images[0].label, "Broom finish example");
  assert.equal(result.summary.optionalAddOns[0].images[0].uploadRequired, true);
  assert.equal(result.summary.scheduleOfValuesCount, 15);
  assert.ok(result.summary.applyTargets.includes("Schedule of Values"));
  assert.ok(result.summary.applyTargets.includes("Residential Legal Papers"));
  assert.match(warningText(result), /Residential pricing options detected/);
  assert.match(warningText(result), /Image placeholders detected/);
  assert.match(warningText(result), /Full Residential Terms are included/);
});

test("infers residential choose-one pricing from rough option notes", () => {
  const result = parseSmartPasteNotes(
    `Project: Patio Finish Options
Location: Salem, Oregon
Client: Homeowner

Main pricing options - customer chooses one:
Option 1 broom finish = $82,500
Option 2 stamped finish = $97,500
Option 3 sand finish = $90,000

Only optional upgrade is cantilever.
Cantilever-style stair upgrade = $8,500`,
    blankProposalFixture(),
  );

  const totals = calculateProposalTotals(result.proposal);

  assert.equal(result.proposal.proposalMode, "residential");
  assert.equal(result.proposal.pricingMode, "choose_one_option");
  assert.equal(result.proposal.pricingOptions.length, 3);
  assert.equal(result.proposal.pricingOptions[0].name, "Option 1 - broom finish");
  assert.equal(result.proposal.pricingOptions[0].price, 82500);
  assert.equal(result.proposal.pricingOptions[1].price, 97500);
  assert.equal(result.proposal.pricingOptions[2].price, 90000);
  assert.equal(result.proposal.optionalAddOns.length, 1);
  assert.equal(result.proposal.optionalAddOns[0].amount, 8500);
  assert.equal(result.proposal.lineItems[0].unitPrice, 82500);
  assert.equal(result.proposal.pricingSections.length, 1);
  assert.doesNotMatch(JSON.stringify(result.proposal.pricingSections), /Option 2|Option 3/);
  assert.equal(totals.total, 82500);
  assert.equal(result.summary.hideTotalIfAllAccepted, true);
  assert.equal(result.summary.proposalMode, "residential");
  assert.match(warningText(result), /Residential pricing options detected/);
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
