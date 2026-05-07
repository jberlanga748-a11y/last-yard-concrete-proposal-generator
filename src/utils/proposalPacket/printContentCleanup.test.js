import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanPrintablePlanSheets,
  cleanPrintablePricingSections,
  cleanPrintablePricingSummaryRows,
  cleanProposalForPrint,
  getCoverPageTextPreview,
  getPrintablePreparedForLines,
} from "./printContentCleanup.js";

test("removes placeholder scope rows from printable proposal data", () => {
  const proposal = cleanProposalForPrint({
    project: { name: "Costco #682 Albany POS Boxes Remodel" },
    client: {},
    scopeSections: [
      {
        title: "Scope of Work",
        items: ["New scope item", "Interior freezer slab demo and replacement.", "new item", "Untitled"],
      },
      { title: "Untitled", items: ["New scope item"] },
    ],
    exclusions: ["New scope item", "Testing by others."],
    assumptions: ["New item", "Night work only."],
  });

  const printableText = JSON.stringify({
    scopeSections: proposal.scopeSections,
    exclusions: proposal.exclusions,
    assumptions: proposal.assumptions,
  });

  assert.doesNotMatch(printableText, /New scope item|New item|Untitled/i);
  assert.deepEqual(proposal.scopeSections, [
    { title: "Scope of Work", items: ["Interior freezer slab demo and replacement."] },
  ]);
  assert.deepEqual(proposal.exclusions, ["Testing by others."]);
  assert.deepEqual(proposal.assumptions, ["Night work only."]);
});

test("hides blank default alternates and allowance rows from print data", () => {
  const pricingSections = cleanPrintablePricingSections([
    { type: "allowance", label: "Estimated Shade Footings", description: "", amount: "", included: false },
    { type: "allowance", label: "Interface / RFI Allowance", description: "", amount: "-", included: false },
    { type: "allowance", label: "Estimated Shade Footings", description: "Default not accepted", amount: 42500, included: false },
    { type: "add_alternate", label: "Add Alternate 01", description: "", amount: 0, included: false },
    { type: "add_alternate", label: "Add Alternate 02", description: "", amount: "", included: false },
    { type: "add_alternate", label: "Optional freezer curb work", description: "Accepted by GC", amount: 12000, included: false },
  ]);
  const pricingRows = cleanPrintablePricingSummaryRows([
    { label: "Estimated Shade Footings", amount: "", note: "Allowance if applicable." },
    { label: "Interface / RFI Allowance", amount: "-", note: "Allowance if applicable." },
    { label: "Add Alternate 01", amount: "", note: "" },
    { label: "Alternates", amount: "", note: "None currently accepted." },
  ]);

  assert.deepEqual(
    pricingSections.map((section) => section.label),
    ["Optional freezer curb work"],
  );
  assert.deepEqual(
    pricingRows.map((row) => row.label),
    ["Alternates"],
  );
});

test("omits blank Attn Phone and Email lines from printable prepared-for block", () => {
  const lines = getPrintablePreparedForLines({
    companyName: "[VERIFY CUSTOMER / GC]",
    contactName: "",
    phone: "",
    email: "[ENTER EMAIL BEFORE SENDING]",
    projectAddress: "Albany, Oregon",
  });
  const printedLines = lines.map((line) => (line.label ? `${line.label}: ${line.text}` : line.text));

  assert.deepEqual(printedLines, ["To be verified", "Albany, Oregon"]);
  assert.doesNotMatch(printedLines.join("\n"), /Attn:|Phone:|Email:/);
});

test("does not keep UPLOAD PLAN IMAGE placeholder when no image exists", () => {
  const sheets = cleanPrintablePlanSheets([
    {
      enabled: true,
      title: "Plan Sheet Placeholder",
      imageSrc: "",
      calculationTitle: "Upload plan image",
      calculationNotes: ["New item"],
      clarificationNotes: [],
    },
    {
      enabled: true,
      title: "Plan Sheet Notes",
      imageSrc: "",
      calculationTitle: "Takeoff Notes",
      calculationNotes: ["Coordinate freezer slab phasing."],
      clarificationNotes: [],
    },
  ]);

  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].title, "Plan Sheet Notes");
  assert.doesNotMatch(JSON.stringify(sheets), /UPLOAD PLAN IMAGE|Upload plan image/i);
});

test("keeps text-only plan sheets without printing image placeholders", () => {
  const sheets = cleanPrintablePlanSheets([
    {
      enabled: true,
      sheetId: "A101",
      title: "Freezer Slab Takeoff",
      subtitle: "POS boxes remodel",
      imageSrc: "UPLOAD PLAN IMAGE",
      calculationBoxTitle: "Quantity Notes",
      calculationNotes: ["Freezer slab quantity from A101 takeoff markup."],
      clarificationNotes: ["Verify night-work phasing before construction."],
      pictureCaption: "Area A freezer slab takeoff reference.",
    },
  ]);

  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].imageSrc, "");
  assert.equal(sheets[0].calculationTitle, "Quantity Notes");
  assert.deepEqual(sheets[0].calculationNotes, ["Freezer slab quantity from A101 takeoff markup."]);
  assert.deepEqual(sheets[0].clarificationNotes, ["Verify night-work phasing before construction."]);
  assert.equal(sheets[0].pictureCaption, "Area A freezer slab takeoff reference.");
  assert.doesNotMatch(JSON.stringify(sheets), /UPLOAD PLAN IMAGE/i);
});

test("shortens long cover description and schedule text for page-one fit", () => {
  const longText = [
    "Estimated schedule to be confirmed after final phasing and approved night-work window.",
    "Current working assumption is night work only, one freezer area at a time, coordinated around active store operations.",
    "Full phasing details remain available in the packet backup.",
  ].join(" ");

  const preview = getCoverPageTextPreview(longText, 120);

  assert.ok(preview.length <= 120);
  assert.match(preview, /\.\.\.$/);
  assert.doesNotMatch(preview, /\n/);
});
