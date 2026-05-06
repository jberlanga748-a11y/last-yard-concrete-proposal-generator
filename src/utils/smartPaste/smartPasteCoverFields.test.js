import test from "node:test";
import assert from "node:assert/strict";

import {
  extractSmartPasteCoverFieldsFromNotes,
  mergeSmartPasteCoverValues,
} from "./smartPasteCoverFields.js";

test("extracts proposal cover fields directly from raw Smart Paste labels", () => {
  const fields = extractSmartPasteCoverFieldsFromNotes(`Project: NW Dunbar Avenue Improvements
Location: Troutdale, Oregon
Prepared For: Faison Construction
Attn: Maize
Email: maize@faisonconstruction.com
Phone: 555-123-4567`);

  assert.deepEqual(fields, {
    clientCompany: "Faison Construction",
    clientEmail: "maize@faisonconstruction.com",
    clientPhone: "555-123-4567",
    contactName: "Maize",
    projectLocation: "Troutdale, Oregon",
    projectName: "NW Dunbar Avenue Improvements",
  });
});

test("extracts project address and multiline contact values without consuming later labels", () => {
  const fields = extractSmartPasteCoverFieldsFromNotes(`Project Name:
NW Dunbar Avenue Improvements
Project Address: 100 NW Dunbar Ave, Troutdale, OR
Client:
Faison Construction
Email:
maize@faisonconstruction.com
Base Concrete / Site Package: $695,000`);

  assert.equal(fields.projectName, "NW Dunbar Avenue Improvements");
  assert.equal(fields.projectAddress, "100 NW Dunbar Ave, Troutdale, OR");
  assert.equal(fields.clientCompany, "Faison Construction");
  assert.equal(fields.clientEmail, "maize@faisonconstruction.com");
  assert.equal(fields.clientPhone, undefined);
});

test("raw Smart Paste cover fields win when merged with parser values", () => {
  const merged = mergeSmartPasteCoverValues(
    {
      clientCompany: "Old GC",
      projectLocation: "Albany, OR",
      projectName: "Marketplace Retail Center",
    },
    {
      clientCompany: "Faison Construction",
      projectLocation: "Troutdale, Oregon",
      projectName: "NW Dunbar Avenue Improvements",
    },
  );

  assert.equal(merged.projectName, "NW Dunbar Avenue Improvements");
  assert.equal(merged.projectLocation, "Troutdale, Oregon");
  assert.equal(merged.clientCompany, "Faison Construction");
});
