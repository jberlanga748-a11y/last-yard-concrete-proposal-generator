import test from "node:test";
import assert from "node:assert/strict";

import { parseBidSmartPasteNotes } from "./bidSmartPasteParser.js";

function warningText(result) {
  return result.summary.warnings.join("\n");
}

test("parses project name", () => {
  const result = parseBidSmartPasteNotes("Project: Settlemier Park Renovation", {});

  assert.equal(result.bid.projectName, "Settlemier Park Renovation");
  assert.ok(result.summary.fields.includes("project name"));
});

test("parses GC company, contact, email, and phone", () => {
  const result = parseBidSmartPasteNotes(
    `GC: ABC Prime Contractors
Contact: Mike Smith
Email: mike@example.com
Phone: 555-123-4567`,
    {},
  );

  assert.equal(result.bid.gcCompany, "ABC Prime Contractors");
  assert.equal(result.bid.contactName, "Mike Smith");
  assert.equal(result.bid.contactEmail, "mike@example.com");
  assert.equal(result.bid.contactPhone, "555-123-4567");
  assert.ok(result.summary.contactInfo.includes("gc company"));
});

test("parses bid due date and time", () => {
  const result = parseBidSmartPasteNotes("Bid Due: June 14, 2026 2:30 PM", {});

  assert.equal(result.bid.bidDueDate, "2026-06-14");
  assert.equal(result.bid.bidDueTime, "14:30");
  assert.ok(result.summary.dates.includes("bid due date"));
  assert.ok(result.summary.dates.includes("bid due time"));
});

test("parses pre-bid meeting and mandatory pre-bid notes", () => {
  const result = parseBidSmartPasteNotes(
    `Pre-Bid Meeting: 06/04/2026
Mandatory pre-bid meeting at jobsite June 4, 2026.`,
    {},
  );

  assert.equal(result.bid.preBidMeetingDate, "2026-06-04");
  assert.match(result.bid.notes, /Mandatory pre-bid/i);
});

test("parses RFI and addendum deadlines", () => {
  const result = parseBidSmartPasteNotes(
    `RFI Deadline: 2026-06-07
Addendum Deadline: June 9, 2026
Expected Award: 6/30/2026`,
    {},
  );

  assert.equal(result.bid.rfiDeadline, "2026-06-07");
  assert.equal(result.bid.addendumDeadline, "2026-06-09");
  assert.equal(result.bid.expectedAwardDate, "2026-06-30");
});

test("parses concrete scope from explicit scope and keyword lines", () => {
  const result = parseBidSmartPasteNotes(
    `Scope: Sidewalk replacement, ADA ramps, curb, and concrete flatwork.
Plan room notes mention footing details and slab alternates.`,
    {},
  );

  assert.match(result.bid.scopeSummary, /Sidewalk replacement/);
  assert.match(result.bid.concreteScope, /Sidewalk replacement/);
});

test("parses priority and status", () => {
  const result = parseBidSmartPasteNotes(
    `Priority: Must Bid
Status: Estimating`,
    {},
  );

  assert.equal(result.bid.priority, "Must Bid");
  assert.equal(result.bid.bidStatus, "Estimating");
});

test("does not overwrite existing fields unless notes clearly include that field", () => {
  const result = parseBidSmartPasteNotes(
    `Project: New Project Name
This general note mentions Woodburn but no location label.`,
    {
      projectName: "Old Project",
      projectLocation: "Albany, OR",
    },
  );

  assert.equal(result.bid.projectName, "New Project Name");
  assert.equal(result.bid.projectLocation, "Albany, OR");
});

test("does not overwrite existing concrete scope from a general scope label", () => {
  const result = parseBidSmartPasteNotes("Scope: Sidewalk and curb replacement.", {
    concreteScope: "Existing detailed concrete scope",
  });

  assert.equal(result.bid.scopeSummary, "Sidewalk and curb replacement.");
  assert.equal(result.bid.concreteScope, "Existing detailed concrete scope");
});

test("creates warnings for missing due date, contact, location, and concrete scope", () => {
  const result = parseBidSmartPasteNotes("Project: Small Bid", {});

  assert.match(warningText(result), /Missing bid due date/);
  assert.match(warningText(result), /Missing GC\/contact/);
  assert.match(warningText(result), /Missing location/);
  assert.match(warningText(result), /Missing concrete scope/);
});

test("parses incomplete public agency bid invite notes with soft warnings", () => {
  const result = parseBidSmartPasteNotes(
    `Project:
Barlow Center Head Start Improvements

Bid / Solicitation:
Clackamas County Bid S-C01010-00016812

Location:
109 E. 2nd St, Canby, OR

Owner / Public Agency:
Clackamas County

Primary Contact:
Steve Kelly
stevekel@clackamas.us

Architect / Plans Contact:
Tim Richard
tim@jtrastudio.com

Required Pre-Bid Meeting:
May 13, 2026 at 2:00 PM
Location: 109 E. 2nd St, Canby, OR

Bid Opening:
June 10, 2026 at 2:00 PM

Proposal Status:
Draft / Pre-bid review / Do not price yet

Bid Strategy:
Conditional pursue. Do not final price until RFI responses and pre-bid meeting notes are reviewed.

Concrete Scope Notes:
Potential concrete scope includes sidewalks, ADA ramps, landings, detectable warnings, concrete demolition, sawcutting, patch-back, exterior flatwork, possible small pads/slabs, and related site concrete. Exact scope must be confirmed from plans/specs and pre-bid meeting.

RFIs / Clarifications:
Confirm concrete scope limits, ADA ramp/landing details, demo limits, existing concrete thickness, excavation responsibility, subgrade prep, base rock, survey/layout, testing, utilities, work hours, access, phasing, and multiple mobilizations.

Assumptions:
Pricing will assume standard access, normal working hours, one continuous mobilization where practical, suitable subgrade provided by others, utilities located/cleared by others, no survey/staking, no engineering/testing costs, and no work outside clearly shown concrete limits unless clarified otherwise.

Exclusions:
Exclude unsuitable soils, unknown utility conflicts, over-excavation, base rock unless specifically included, survey/layout, testing/inspection costs, rework caused by design conflicts or others, multiple mobilizations unless included, after-hours/weekend work unless specifically included, and work outside shown concrete limits.

Risk Level:
Medium-High

Next Action:
Send saved RFI email Monday morning. Attend required pre-bid meeting on May 13, 2026. Do not take off or price final number until RFI responses/pre-bid notes are reviewed.`,
    {},
  );

  assert.equal(result.bid.projectName, "Barlow Center Head Start Improvements");
  assert.equal(result.bid.ownerOrClient, "Clackamas County");
  assert.equal(result.bid.projectLocation, "109 E. 2nd St, Canby, OR");
  assert.equal(result.bid.contactName, "Steve Kelly");
  assert.equal(result.bid.contactEmail, "stevekel@clackamas.us");
  assert.equal(result.bid.bidSource, "Clackamas County Bid S-C01010-00016812");
  assert.equal(result.bid.bidDueDate, "2026-06-10");
  assert.equal(result.bid.bidDueTime, "14:00");
  assert.equal(result.bid.preBidMeetingDate, "2026-05-13");
  assert.equal(result.bid.bidStatus, "Reviewing");
  assert.equal(result.bid.priority, "High");
  assert.match(result.bid.concreteScope, /sidewalks, ADA ramps/);
  assert.match(result.bid.redFlags, /Medium-High/);
  assert.match(result.bid.notes, /Conditional pursue/);
  assert.match(result.bid.notes, /Architect \/ Plans Contact/);
  assert.match(result.bid.missingInfo, /Confirm concrete scope limits/);
  assert.match(result.bid.nextStep, /Send saved RFI email/);
  assert.doesNotMatch(warningText(result), /Missing GC\/contact/);
  assert.match(warningText(result), /No GC\/prime listed yet; public agency contact was captured/);
  assert.match(warningText(result), /No URL\/plan link found. Add one later if available/);
});
