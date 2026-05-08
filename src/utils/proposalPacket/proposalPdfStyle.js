import { normalizeProposalMode } from "../proposals/proposalModes.js";

export const PROPOSAL_PDF_BODY_TEXT_SIZE_OPTIONS = ["compact", "standard", "large"];
export const PROPOSAL_PDF_HEADING_STYLE_OPTIONS = ["standard", "bold"];
export const PROPOSAL_PDF_TONE_OPTIONS = ["residential_friendly", "commercial_professional", "gc_technical"];
export const PROPOSAL_PDF_PRICING_EMPHASIS_OPTIONS = ["standard", "bold"];

export const PROPOSAL_PDF_BODY_TEXT_SIZE_LABELS = {
  compact: "Compact",
  standard: "Standard",
  large: "Large",
};

export const PROPOSAL_PDF_HEADING_STYLE_LABELS = {
  standard: "Standard",
  bold: "Bold",
};

export const PROPOSAL_PDF_TONE_LABELS = {
  residential_friendly: "Residential Friendly",
  commercial_professional: "Commercial Professional",
  gc_technical: "GC Technical",
};

export const PROPOSAL_PDF_PRICING_EMPHASIS_LABELS = {
  standard: "Standard",
  bold: "Bold Pricing",
};

const modeDefaults = {
  residential: {
    bodyTextSize: "large",
    headingStyle: "bold",
    proposalTone: "residential_friendly",
    pricingEmphasis: "bold",
  },
  commercial_subcontractor: {
    bodyTextSize: "standard",
    headingStyle: "bold",
    proposalTone: "commercial_professional",
    pricingEmphasis: "bold",
  },
  gc_prime_packet: {
    bodyTextSize: "standard",
    headingStyle: "bold",
    proposalTone: "gc_technical",
    pricingEmphasis: "standard",
  },
};

function normalizeOption(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

export function getDefaultProposalPdfStyleForMode(mode = "commercial_subcontractor") {
  const normalizedMode = normalizeProposalMode(mode) || "commercial_subcontractor";

  return { ...(modeDefaults[normalizedMode] || modeDefaults.commercial_subcontractor) };
}

export function normalizeProposalPdfStyle(style = {}, mode = "commercial_subcontractor") {
  const defaults = getDefaultProposalPdfStyleForMode(mode);
  const source = style && typeof style === "object" ? style : {};

  return {
    bodyTextSize: normalizeOption(source.bodyTextSize, PROPOSAL_PDF_BODY_TEXT_SIZE_OPTIONS, defaults.bodyTextSize),
    headingStyle: normalizeOption(source.headingStyle, PROPOSAL_PDF_HEADING_STYLE_OPTIONS, defaults.headingStyle),
    proposalTone: normalizeOption(source.proposalTone, PROPOSAL_PDF_TONE_OPTIONS, defaults.proposalTone),
    pricingEmphasis: normalizeOption(
      source.pricingEmphasis,
      PROPOSAL_PDF_PRICING_EMPHASIS_OPTIONS,
      defaults.pricingEmphasis,
    ),
  };
}

export function getDefaultProposalPdfStyleSettings() {
  return Object.fromEntries(
    Object.keys(modeDefaults).map((mode) => [mode, getDefaultProposalPdfStyleForMode(mode)]),
  );
}

export function normalizeProposalPdfStyleSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const hasModeKeys = Object.keys(modeDefaults).some((mode) => source[mode]);

  if (!hasModeKeys && Object.keys(source).some((key) => key in modeDefaults.commercial_subcontractor)) {
    const flatStyle = normalizeProposalPdfStyle(source, "commercial_subcontractor");

    return {
      ...getDefaultProposalPdfStyleSettings(),
      commercial_subcontractor: flatStyle,
    };
  }

  return Object.fromEntries(
    Object.keys(modeDefaults).map((mode) => [mode, normalizeProposalPdfStyle(source[mode], mode)]),
  );
}

export function getProposalPdfStyleForMode(settings = {}, mode = "commercial_subcontractor") {
  const normalizedMode = normalizeProposalMode(mode) || "commercial_subcontractor";
  const normalizedSettings = normalizeProposalPdfStyleSettings(settings);

  return normalizeProposalPdfStyle(normalizedSettings[normalizedMode], normalizedMode);
}

export function getProposalPdfStyleClassNames(style = {}, mode = "commercial_subcontractor") {
  const normalizedMode = normalizeProposalMode(mode) || "commercial_subcontractor";
  const normalizedStyle = normalizeProposalPdfStyle(style, normalizedMode);

  return [
    "proposal-pdf-style",
    `proposal-style-mode-${normalizedMode.replace(/_/g, "-")}`,
    `proposal-style-body-${normalizedStyle.bodyTextSize}`,
    `proposal-style-heading-${normalizedStyle.headingStyle}`,
    `proposal-style-tone-${normalizedStyle.proposalTone.replace(/_/g, "-")}`,
    `proposal-style-pricing-${normalizedStyle.pricingEmphasis}`,
  ].join(" ");
}
