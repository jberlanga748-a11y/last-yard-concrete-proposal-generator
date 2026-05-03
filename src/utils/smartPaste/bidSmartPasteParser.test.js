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
