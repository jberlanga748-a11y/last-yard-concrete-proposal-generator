export const COMPANY_DEFAULTS = {
  name: "Last Yard Concrete LLC",
  phone: "(541) 285-1060",
  email: "jacobbrown@ly-cs.com",
  serviceArea: "Serving the Willamette Valley",
  license: "CCB #247389",
  credentials: ["Licensed", "Bonded", "Insured"],
  tagline: "Crafting Concrete, Building Dreams.",
};

export const PROPOSAL_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];

export const PROPOSAL_TYPES = ["residential", "gc_prime", "commercial", "public_municipal"];

export const LINE_ITEM_UNITS = ["LS", "SF", "SY", "LF", "CY", "EA", "HR", "DAY", "TON"];

export const DEFAULT_SCOPE_SECTIONS = [
  {
    title: "Site Preparation",
    items: [
      "Layout and staking",
      "Excavation and grading",
      "Compact subgrade",
      "Install forms and reinforcement as needed",
    ],
  },
  {
    title: "Concrete Flatwork",
    items: [
      "Sidewalks and walkways",
      "Drive aisles and parking areas",
      "Curb and gutter",
      "Concrete pads and slabs",
    ],
  },
  {
    title: "Finishes",
    items: [
      "Broom finish sidewalks",
      "Troweled slab surfaces",
      "Control joints and expansion joints",
      "Edging and joint sealant",
    ],
  },
  {
    title: "Quality & Cleanup",
    items: [
      "Concrete placement and finishing",
      "Jointing and curing",
      "Final cleanup",
      "Haul off excess materials",
    ],
  },
  {
    title: "Project Closeout",
    items: [
      "Final walkthrough",
      "Punch list resolution",
      "As-built documentation as requested",
      "Warranty documentation",
    ],
  },
];

export const DEFAULT_EXCLUSIONS = [
  "Permits and fees by others",
  "Testing by others unless noted",
  "Landscaping, irrigation, and lighting by others",
  "Unsuitable soils or rock excavation",
  "Cold weather protection",
  "Price valid for 30 days from proposal date",
];

export const DEFAULT_ASSUMPTIONS = [
  "Work areas will be accessible and ready for scheduled concrete operations.",
  "Final grades, layout control, and plan revisions will be provided before work begins.",
  "Work will be performed during normal business hours unless otherwise agreed in writing.",
  "Proposal is based on the quantities and scope shown in the provided plans and specifications.",
];

export const DEFAULT_TERMS = {
  payment: "Net 30 days from invoice date.",
  depositRate: 0.5,
  depositText: "A 50% deposit is required to schedule the project.",
  progressBilling: "Progress billings will be submitted monthly as work completes.",
  acceptance: "This proposal, including terms and conditions, is accepted by signature below.",
};

export const DEFAULT_CONCRETE_SPECIFICATIONS = [
  { item: "Concrete Strength", specification: "4,000 PSI @ 28 days" },
  { item: "Air Entrainment", specification: "5% - 7%" },
  { item: "Slump", specification: "4 in +/- 1 in" },
  { item: "Max Aggregate Size", specification: "3/4 in" },
  { item: "Reinforcement", specification: "Per plan" },
  { item: "Control Joints", specification: "Sawcut - 1/4 slab depth" },
  { item: "Expansion Joints", specification: "Per plan" },
  { item: "Finishes", specification: "Broom / troweled" },
  { item: "Curing", specification: "Minimum 7 days" },
  { item: "Concrete Supplier", specification: "Local ready-mix" },
  { item: "Testing", specification: "As required" },
  { item: "Codes", specification: "IBC / ACI / local" },
];

export const SEED_PROPOSAL = {
  id: "seed-marketplace-retail-center",
  proposalNumber: "LYC-2026-0001",
  status: "draft",
  proposalType: "commercial",
  type: "commercial",
  proposalDate: "2026-05-01",
  validUntil: "2026-05-31",
  company: COMPANY_DEFAULTS,
  client: {
    companyName: "Company Name",
    contactName: "Contact Name",
    title: "Title",
    address: "1234 Project Street",
    cityStateZip: "City, State 00000",
    phone: "(555) 123-4567",
    email: "name@company.com",
  },
  project: {
    name: "Marketplace Retail Center",
    location: "Albany, OR",
    proposedSchedule: {
      startDate: "2026-06-03",
      endDate: "2026-06-28",
      display: "June 3 - June 28, 2026",
    },
    description:
      "Provide labor, materials, equipment, and supervision for concrete flatwork including site prep, sidewalks, curb and gutter, and associated finishes as shown on the plans and specifications.",
  },
  gcPrime: {
    contractorName: "",
    projectManagerName: "",
    projectManagerPhone: "",
    projectManagerEmail: "",
    bidPackageNumber: "",
    specSection: "",
    drawingReferences: "",
    addendaAcknowledged: "",
    prevailingWageRequired: false,
    certifiedPayrollRequired: false,
    insuranceCertificateRequired: false,
    w9Required: false,
    safetyOrientationRequired: false,
    jobsiteAccessBadgingRequirements: "",
    retainagePercentage: "",
    paymentApplicationTerms: "",
    changeOrderProcess: "",
    rfiClarificationNotes: "",
  },
  scopeSections: DEFAULT_SCOPE_SECTIONS,
  concreteSpecs: {
    estimatedSquareFeet: "",
    estimatedCubicYards: "",
    thickness: "4 in sidewalks / 5 in pads",
    psi: "4,000 PSI @ 28 days",
    slump: "4 in +/- 1 in",
    airEntrainment: "5% - 7%",
    fiberMesh: false,
    rebarMeshDetails: "Per plan",
    finishType: "Broom / troweled",
    controlJointSpacing: "Sawcut - 1/4 slab depth",
    sawCutTiming: "",
    cureSealerNotes: "Minimum 7 days",
    concreteSupplier: "Local ready-mix",
    pumpRequired: false,
    truckAccessNotes: "",
  },
  specifications: DEFAULT_CONCRETE_SPECIFICATIONS,
  lineItems: [
    {
      itemNumber: "1",
      description: "Site Prep & Excavation",
      quantity: 1,
      unit: "LS",
      unitPrice: 3250,
      taxable: true,
    },
    {
      itemNumber: "2",
      description: "Sidewalks - 4 in Thick",
      quantity: 1250,
      unit: "SF",
      unitPrice: 8.75,
      taxable: true,
    },
    {
      itemNumber: "3",
      description: "Curb & Gutter",
      quantity: 600,
      unit: "LF",
      unitPrice: 14.5,
      taxable: true,
    },
    {
      itemNumber: "4",
      description: "Concrete Pads / Slabs - 5 in Thick",
      quantity: 2000,
      unit: "SF",
      unitPrice: 9.75,
      taxable: true,
    },
    {
      itemNumber: "5",
      description: "Control Joints & Sealant",
      quantity: 2000,
      unit: "SF",
      unitPrice: 1.1,
      taxable: true,
    },
    {
      itemNumber: "6",
      description: "Mobilization",
      quantity: 1,
      unit: "LS",
      unitPrice: 1850,
      taxable: true,
    },
  ],
  financials: {
    taxRate: 0,
    discountAmount: 0,
    depositRate: DEFAULT_TERMS.depositRate,
  },
  exclusions: DEFAULT_EXCLUSIONS,
  assumptions: DEFAULT_ASSUMPTIONS,
  terms: DEFAULT_TERMS,
};

export function formatCurrency(value, locale = "en-US", currency = "USD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function generateProposalNumber(sequence = 1, date = new Date()) {
  const year = getYear(date);
  const paddedSequence = String(Math.max(0, Number.parseInt(sequence, 10) || 0)).padStart(4, "0");
  return `LYC-${year}-${paddedSequence}`;
}

export function calculateProposalTotals(proposalOrLineItems, overrides = {}) {
  const proposal = Array.isArray(proposalOrLineItems)
    ? { lineItems: proposalOrLineItems, financials: {} }
    : proposalOrLineItems || {};
  const financials = { ...(proposal.financials || {}), ...overrides };

  const subtotal = roundMoney(
    (proposal.lineItems || []).reduce((sum, item) => sum + getLineItemAmount(item), 0),
  );
  const taxableSubtotal = roundMoney(
    (proposal.lineItems || []).reduce((sum, item) => sum + (item.taxable === false ? 0 : getLineItemAmount(item)), 0),
  );
  const discount = roundMoney(resolveDiscount(subtotal, financials));
  const taxableDiscount = subtotal > 0 ? discount * (taxableSubtotal / subtotal) : 0;
  const taxableAmount = Math.max(0, taxableSubtotal - taxableDiscount);
  const tax = roundMoney(taxableAmount * toRate(financials.taxRate));
  const total = roundMoney(Math.max(0, subtotal - discount) + tax);
  const deposit = roundMoney(resolveDeposit(total, financials));
  const balanceDue = roundMoney(Math.max(0, total - deposit));

  return {
    subtotal,
    tax,
    discount,
    total,
    deposit,
    balanceDue,
  };
}

export function validateRequiredFields(proposal) {
  const errors = [];

  if (!proposal) {
    return { isValid: false, errors: ["Proposal is required."] };
  }

  requireText(errors, proposal.proposalNumber, "proposalNumber");
  requireAllowed(errors, proposal.status, PROPOSAL_STATUSES, "status");
  requireAllowed(errors, proposal.type, PROPOSAL_TYPES, "type");
  requireText(errors, proposal.client?.companyName, "client.companyName");
  requireText(errors, proposal.client?.contactName, "client.contactName");
  requireText(errors, proposal.project?.name, "project.name");
  requireText(errors, proposal.project?.location, "project.location");
  requireArray(errors, proposal.scopeSections, "scopeSections");
  requireArray(errors, proposal.lineItems, "lineItems");

  (proposal.lineItems || []).forEach((item, index) => {
    const prefix = `lineItems[${index}]`;
    requireText(errors, item.description, `${prefix}.description`);
    requireAllowed(errors, item.unit, LINE_ITEM_UNITS, `${prefix}.unit`);

    if (toNumber(item.quantity) <= 0) {
      errors.push(`${prefix}.quantity must be greater than 0.`);
    }

    if (toNumber(item.unitPrice) < 0) {
      errors.push(`${prefix}.unitPrice cannot be negative.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function getLineItemAmount(item) {
  if (item.amount !== undefined) {
    return toNumber(item.amount);
  }

  return toNumber(item.quantity) * toNumber(item.unitPrice);
}

function resolveDiscount(subtotal, financials) {
  if (financials.discountAmount !== undefined) {
    return Math.min(subtotal, Math.max(0, toNumber(financials.discountAmount)));
  }

  return subtotal * toRate(financials.discountRate);
}

function resolveDeposit(total, financials) {
  if (financials.depositAmount !== undefined) {
    return Math.min(total, Math.max(0, toNumber(financials.depositAmount)));
  }

  return total * toRate(financials.depositRate);
}

function toRate(value) {
  const numericValue = toNumber(value);
  return numericValue > 1 ? numericValue / 100 : numericValue;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function getYear(date) {
  if (date instanceof Date && !Number.isNaN(date.valueOf())) {
    return date.getFullYear();
  }

  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.valueOf()) ? new Date().getFullYear() : parsedDate.getFullYear();
}

function requireText(errors, value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} is required.`);
  }
}

function requireArray(errors, value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${fieldName} must include at least one item.`);
  }
}

function requireAllowed(errors, value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }
}
