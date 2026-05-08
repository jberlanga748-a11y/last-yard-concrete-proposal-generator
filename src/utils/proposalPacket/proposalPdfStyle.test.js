import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultProposalPdfStyleForMode,
  getProposalPdfStyleClassNames,
  getProposalPdfStyleForMode,
  normalizeProposalPdfStyle,
  normalizeProposalPdfStyleSettings,
} from "./proposalPdfStyle.js";

test("proposal PDF style defaults follow proposal mode", () => {
  assert.deepEqual(getDefaultProposalPdfStyleForMode("residential"), {
    bodyTextSize: "large",
    headingStyle: "bold",
    proposalTone: "residential_friendly",
    pricingEmphasis: "bold",
  });
  assert.deepEqual(getDefaultProposalPdfStyleForMode("commercial_subcontractor"), {
    bodyTextSize: "standard",
    headingStyle: "bold",
    proposalTone: "commercial_professional",
    pricingEmphasis: "bold",
  });
  assert.deepEqual(getDefaultProposalPdfStyleForMode("gc_prime_packet"), {
    bodyTextSize: "standard",
    headingStyle: "bold",
    proposalTone: "gc_technical",
    pricingEmphasis: "standard",
  });
});

test("proposal PDF style normalization falls back safely for missing settings", () => {
  assert.deepEqual(normalizeProposalPdfStyle({ bodyTextSize: "huge", pricingEmphasis: "bold" }, "residential"), {
    bodyTextSize: "large",
    headingStyle: "bold",
    proposalTone: "residential_friendly",
    pricingEmphasis: "bold",
  });

  const settings = normalizeProposalPdfStyleSettings({
    residential: { bodyTextSize: "compact", headingStyle: "standard" },
  });

  assert.equal(settings.residential.bodyTextSize, "compact");
  assert.equal(settings.residential.headingStyle, "standard");
  assert.equal(settings.residential.proposalTone, "residential_friendly");
  assert.equal(settings.gc_prime_packet.proposalTone, "gc_technical");
});

test("proposal PDF style mode lookup and classes are stable", () => {
  const style = getProposalPdfStyleForMode(
    {
      residential: {
        bodyTextSize: "large",
        headingStyle: "bold",
        proposalTone: "residential_friendly",
        pricingEmphasis: "bold",
      },
    },
    "residential",
  );
  const classNames = getProposalPdfStyleClassNames(style, "residential");

  assert.equal(style.bodyTextSize, "large");
  assert.match(classNames, /proposal-style-mode-residential/);
  assert.match(classNames, /proposal-style-body-large/);
  assert.match(classNames, /proposal-style-heading-bold/);
  assert.match(classNames, /proposal-style-tone-residential-friendly/);
  assert.match(classNames, /proposal-style-pricing-bold/);
});
