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

export const PRICING_SECTION_TYPES = ["base_bid", "allowance", "add_alternate", "deduct_alternate", "unit_price"];

export const PRICE_LIBRARY_CATEGORIES = [
  "Mobilization",
  "Demo / Removal",
  "Sidewalk / Flatwork",
  "Slabs",
  "Curb / Gutter",
  "Mowband",
  "ADA / Ramps",
  "Stairs / Walls",
  "Footings",
  "Reinforcement",
  "Sawcut / Joints",
  "Sealer / Cure",
  "Cleanup / Closeout",
  "Allowances",
  "Other",
];

export const DEFAULT_PRICE_LIBRARY_ITEMS = [
  {
    id: "price-mobilization",
    name: "Mobilization",
    category: "Mobilization",
    description: "Mobilization / project setup",
    unit: "LS",
    defaultUnitPrice: 1850,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Includes basic project startup, coordination, and closeout setup.",
    defaultScopeBullets: ["Mobilize crew, tools, and basic equipment", "Coordinate project startup"],
    defaultExclusions: [],
    active: true,
  },
  {
    id: "price-demo-haul-off-concrete",
    name: "Demo and haul-off concrete",
    category: "Demo / Removal",
    description: "Demo and haul-off existing concrete",
    unit: "SF",
    defaultUnitPrice: 2.25,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Existing concrete removal where listed.",
    defaultScopeBullets: ["Sawcut or break out existing concrete as listed", "Haul off removed concrete debris"],
    defaultExclusions: ["Hazardous materials or contaminated soils"],
    active: true,
  },
  {
    id: "price-4in-broom-sidewalk",
    name: "4 in broom finish sidewalk",
    category: "Sidewalk / Flatwork",
    description: "Sidewalks - 4 in broom finish",
    unit: "SF",
    defaultUnitPrice: 8.75,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Broom finish pedestrian flatwork.",
    defaultScopeBullets: ["Form and place 4 in sidewalk concrete", "Broom finish and tool edges"],
    defaultExclusions: ["Detectable warning panels unless listed separately"],
    active: true,
  },
  {
    id: "price-5in-concrete-slab",
    name: "5 in concrete slab",
    category: "Slabs",
    description: "Concrete pads / slabs - 5 in thick",
    unit: "SF",
    defaultUnitPrice: 9.75,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Standard flatwork slab item.",
    defaultScopeBullets: ["Form and place 5 in concrete slab", "Finish per proposal specifications"],
    defaultExclusions: ["Vapor barrier or special reinforcement unless listed"],
    active: true,
  },
  {
    id: "price-curb-gutter",
    name: "Curb and gutter",
    category: "Curb / Gutter",
    description: "Curb and gutter",
    unit: "LF",
    defaultUnitPrice: 14.5,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Concrete curb and gutter as listed.",
    defaultScopeBullets: ["Form and place curb and gutter", "Tool joints and finish exposed faces"],
    defaultExclusions: ["Survey staking by others unless noted"],
    active: true,
  },
  {
    id: "price-concrete-mowband",
    name: "Concrete mowband",
    category: "Mowband",
    description: "Concrete mowband",
    unit: "LF",
    defaultUnitPrice: 12.5,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Concrete mow strip or banding as listed.",
    defaultScopeBullets: ["Form and place concrete mowband", "Finish exposed edges cleanly"],
    defaultExclusions: ["Landscape restoration beyond immediate work area"],
    active: true,
  },
  {
    id: "price-ada-ramp-landing",
    name: "ADA ramp / landing",
    category: "ADA / Ramps",
    description: "ADA ramp / landing",
    unit: "EA",
    defaultUnitPrice: 2500,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "ADA ramp or landing starter item; final pricing subject to layout.",
    defaultScopeBullets: ["Construct ADA ramp or landing as listed", "Broom finish and tool edges"],
    defaultExclusions: ["ADA design certification by others"],
    active: true,
  },
  {
    id: "price-concrete-stairs-allowance",
    name: "Concrete stairs allowance",
    category: "Stairs / Walls",
    description: "Concrete stairs allowance",
    unit: "LS",
    defaultUnitPrice: 0,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Allowance placeholder for concrete stair scope pending final details.",
    defaultScopeBullets: ["Concrete stair work as listed in proposal"],
    defaultExclusions: ["Handrails, guardrails, or engineering unless listed"],
    active: true,
  },
  {
    id: "price-trench-drain-collar",
    name: "Trench drain concrete collar",
    category: "Sidewalk / Flatwork",
    description: "Trench drain concrete collar",
    unit: "LF",
    defaultUnitPrice: 45,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Concrete collar around trench drain where listed.",
    defaultScopeBullets: ["Form and place concrete collar at trench drain", "Coordinate elevation with adjacent flatwork"],
    defaultExclusions: ["Trench drain fixture, plumbing, or utility connections"],
    active: true,
  },
  {
    id: "price-control-joints-sawcut",
    name: "Control joints / sawcut allowance",
    category: "Sawcut / Joints",
    description: "Control joints / sawcut allowance",
    unit: "LF",
    defaultUnitPrice: 1.1,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Control joint sawcut or jointing allowance.",
    defaultScopeBullets: ["Sawcut or install control joints as listed", "Coordinate joint layout with panel geometry"],
    defaultExclusions: ["Joint sealant unless listed separately"],
    active: true,
  },
  {
    id: "price-rebar-reinforcement-allowance",
    name: "Rebar / reinforcement allowance",
    category: "Reinforcement",
    description: "Rebar / reinforcement allowance",
    unit: "LS",
    defaultUnitPrice: 0,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Allowance placeholder for reinforcement pending final details.",
    defaultScopeBullets: ["Install reinforcement as listed in proposal"],
    defaultExclusions: ["Engineered reinforcement design by others"],
    active: true,
  },
  {
    id: "price-cleanup-closeout",
    name: "Cleanup / closeout",
    category: "Cleanup / Closeout",
    description: "Cleanup / closeout",
    unit: "LS",
    defaultUnitPrice: 750,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Final cleanup and closeout support.",
    defaultScopeBullets: ["Final cleanup of concrete work area", "Haul off excess concrete-related debris"],
    defaultExclusions: [],
    active: true,
  },
  {
    id: "price-shade-footing-allowance",
    name: "Shade footing allowance",
    category: "Allowances",
    description: "Shade footing allowance",
    unit: "LS",
    defaultUnitPrice: 0,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Allowance for shade footing concrete pending final engineered details.",
    defaultScopeBullets: ["Concrete shade footing allowance as listed"],
    defaultExclusions: ["Final engineered footing design by others"],
    active: true,
  },
  {
    id: "price-concrete-interface-rfi-allowance",
    name: "Concrete interface / RFI allowance",
    category: "Allowances",
    description: "Concrete interface / RFI allowance",
    unit: "LS",
    defaultUnitPrice: 0,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "Allowance for unresolved concrete interface items pending RFI response.",
    defaultScopeBullets: ["Concrete interface allowance as listed"],
    defaultExclusions: ["Unresolved scope outside accepted allowance"],
    active: true,
  },
];

export const PACKET_BUILDER_SECTIONS = [
  { id: "cover_summary", title: "Cover / Proposal Summary", defaultIncluded: true, defaultOrder: 10 },
  { id: "details_pricing", title: "Details / Pricing Summary", defaultIncluded: true, defaultOrder: 20 },
  { id: "scope_control_summary", title: "Scope Control Summary", defaultIncluded: true, defaultOrder: 30 },
  { id: "pricing_summary", title: "Pricing Summary", defaultIncluded: true, defaultOrder: 40 },
  { id: "schedule_of_values", title: "Schedule of Values", defaultIncluded: true, defaultOrder: 50 },
  { id: "takeoff_quantities", title: "Takeoff Quantities", defaultIncluded: true, defaultOrder: 60 },
  { id: "addenda_acknowledgement", title: "Addenda Acknowledgement", defaultIncluded: true, defaultOrder: 70 },
  { id: "rfi_clarification_register", title: "RFI / Clarification Register", defaultIncluded: true, defaultOrder: 80 },
  { id: "legal_terms", title: "Legal / Terms", defaultIncluded: true, defaultOrder: 90 },
  { id: "appendix_overflow", title: "Appendix / Overflow Pages", defaultIncluded: true, defaultOrder: 100 },
  { id: "plan_sheet_pages", title: "Plan Sheet Pages", defaultIncluded: true, defaultOrder: 110 },
  { id: "shade_footing_estimate", title: "Shade Footing Estimate", defaultIncluded: true, defaultOrder: 120 },
  { id: "proposal_notes_acceptance_summary", title: "Proposal Notes / Acceptance Summary", defaultIncluded: true, defaultOrder: 130 },
];

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
  "Permits, fees, testing, inspections, engineering, and design by others unless specifically listed.",
  "Survey, staking, layout control, utility locating, utility conflicts, utility relocation, and utility repairs by others unless listed.",
  "Excavation, rough grading, base rock, unsuitable soils, rock excavation, buried debris, groundwater, and hidden conditions are excluded unless listed.",
  "Asphalt paving/patching, landscaping, irrigation, fencing, traffic control, and after-hours/weekend work by others unless listed.",
  "Demolition, haul-off, and added mobilizations are excluded unless specifically listed in the scope or pricing.",
  "Cold/weather protection and work outside the specifically listed concrete scope are excluded unless included in writing.",
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
  finalPayment: "Final payment is due upon substantial completion of the included concrete scope unless otherwise stated.",
  latePayment: "Past-due amounts may be subject to collection costs and applicable late charges where allowed by contract or law.",
  proposalExpiration: "Price is valid for 30 days from proposal date unless otherwise stated. Material or labor price changes after expiration require revised pricing.",
  changeOrderLanguage: "Written approval is required before added work proceeds. Added scope, field directives, plan revisions, changed conditions, and added mobilizations are extra unless expressly included.",
  siteReadiness: "Work depends on clear access, prepared subgrade/base, layout, approvals, inspections, and required work by others being complete before scheduled concrete operations.",
  weatherDelay: "Weather, temperature, rain, freezing conditions, unsuitable site conditions, or supplier delays may affect schedule. Cold/weather protection is excluded unless specifically included.",
  weatherSiteReadiness: "Schedule is subject to weather, access, approved subgrade, site readiness, and concrete supplier availability.",
  utilityResponsibility: "Utility locating, potholing, relocation, conflicts, damage from unmarked utilities, and utility repairs are excluded unless specifically included.",
  hiddenConditions: "Unsuitable soils, buried debris, unknown thickness, hidden concrete/asphalt, undocumented utilities, rock, groundwater, and unshown conditions are excluded unless specifically included.",
  concreteCrackingDisclaimer: "Concrete may crack due to shrinkage, subgrade movement, weather, curing, or site conditions. Control joints reduce risk but do not guarantee crack-free concrete.",
  colorFinishVariationDisclaimer: "Concrete color, texture, finish, broom marks, curing variation, patching, and decorative effects may vary unless a separate written finish scope is accepted.",
  warrantyLimitation: "Warranty applies only to workmanship within the included scope and excludes movement, settlement, abuse, weather, deicing chemicals, owner/third-party damage, and work by others.",
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

export const PROPOSAL_TEMPLATES = [
  {
    id: "gc_prime_full_packet",
    name: "GC / Prime Full Packet",
    description: "Full bid packet starter for GC, prime contractor, and public bid packages.",
    category: "GC / Prime",
    recommendedFor: "Plan-based bid packages, alternates, allowances, RFIs, and takeoff backup.",
    proposalType: "gc_prime",
    packetMode: "full_gc_packet",
    projectCategory: "GC / Prime concrete packet",
    scopeSections: DEFAULT_SCOPE_SECTIONS,
    concreteSpecs: createConcreteSpecTemplate({
      thickness: "Per plan",
      rebarMeshDetails: "Per plan and specifications",
      finishType: "Per plan",
      controlJointSpacing: "Per plan / ACI guidance",
      truckAccessNotes: "GC to provide clear concrete truck and pump access.",
    }),
    exclusions: [
      ...DEFAULT_EXCLUSIONS,
      "Engineering, delegated design, and stamped calculations by others unless specifically listed.",
      "Survey control, benchmarks, and layout files by others unless noted.",
      "Traffic control, off-site improvements, and utility relocation by others.",
    ],
    assumptions: [
      "Proposal is based on issued plans, specifications, addenda, and written clarifications available at bid time.",
      "GC will coordinate access, laydown, safety orientation, and sequencing with other trades.",
      "Accepted alternates, allowances, and clarifications must be identified before contract execution.",
      "Changes in scope, quantities, phasing, or schedule will be handled by written change order.",
    ],
    terms: createTemplateTerms(
      "Payment by approved progress billing or pay application per contract documents.",
      "Deposit requirements may be waived or adjusted for approved GC / Prime contract terms.",
      "Progress billings will be submitted monthly or by approved schedule of values.",
      {
        gcScopeControl:
          "Proposal includes only the concrete scope specifically listed. Work shown elsewhere in the documents is excluded unless expressly included in this proposal, SOV, or written accepted scope sheet.",
      },
    ),
    starterLineItems: makeTemplateLineItems([
      ["Base Concrete Work", 1, "LS", 0],
      ["Mobilization / Project Setup", 1, "LS", 0],
      ["Concrete Flatwork Per Plans", 1, "LS", 0],
    ]),
    pricingSections: [],
    gcPacketTables: createFullGcPacketTableDefaults(),
  },
  {
    id: "commercial_flatwork",
    name: "Commercial Flatwork",
    description: "Commercial sidewalks, slabs, curb, gutter, and flatwork starter proposal.",
    category: "Commercial",
    recommendedFor: "Retail, tenant improvement, site concrete, and commercial flatwork jobs.",
    proposalType: "commercial",
    packetMode: "summary",
    projectCategory: "Commercial flatwork",
    scopeSections: [
      templateScope("Site Preparation", ["Layout and staking", "Excavation and grading", "Compact subgrade", "Install forms and reinforcement as needed"]),
      templateScope("Concrete Flatwork", ["Sidewalks and walkways", "Drive aisles and parking areas", "Concrete pads and slabs", "Curb and gutter as listed"]),
      templateScope("Finishes", ["Broom finish sidewalks", "Troweled slab surfaces", "Control joints and expansion joints", "Edging and joint sealant"]),
      templateScope("Quality & Cleanup", ["Concrete placement and finishing", "Jointing and curing", "Final cleanup", "Haul off excess materials"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in sidewalks / 5 in slabs", finishType: "Broom / troweled" }),
    exclusions: DEFAULT_EXCLUSIONS,
    assumptions: DEFAULT_ASSUMPTIONS,
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Site Prep & Excavation", 1, "LS", 0],
      ["Sidewalks - 4 in Thick", 1, "SF", 0],
      ["Concrete Pads / Slabs - 5 in Thick", 1, "SF", 0],
      ["Curb & Gutter", 1, "LF", 0],
      ["Control Joints & Sealant", 1, "SF", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "sidewalk_ada",
    name: "Sidewalk / ADA",
    description: "Sidewalk replacement, ADA ramps, detectable warnings, and pedestrian flatwork.",
    category: "Commercial",
    recommendedFor: "ADA upgrades, public walks, storefront access, and pedestrian repairs.",
    proposalType: "commercial",
    packetMode: "summary",
    projectCategory: "Sidewalk / ADA concrete",
    scopeSections: [
      templateScope("Demolition & Prep", ["Remove existing concrete as listed", "Excavate and prep subgrade", "Compact base material", "Protect adjacent surfaces"]),
      templateScope("Sidewalk & ADA Work", ["Form and place sidewalk sections", "Construct ADA ramp panels as listed", "Install detectable warning panels as listed", "Match adjacent grades where practical"]),
      templateScope("Finishes & Cleanup", ["Broom finish walking surfaces", "Tool edges and joints", "Cure concrete", "Final cleanup and debris haul off"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in typical / 6 in at drive approaches as needed", finishType: "Broom finish", controlJointSpacing: "Per panel layout / sawcut as needed" }),
    exclusions: [
      "Permits and fees by others",
      "Testing by others unless noted",
      "Survey, civil design, and ADA compliance certification by others",
      "Utility relocation or repair",
      "Landscaping, irrigation, and lighting by others",
      "Unsuitable soils or rock excavation",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Existing grades allow reasonable tie-in to adjacent surfaces.",
      "Work area will be accessible and ready for demolition and placement.",
      "Detectable warning panel color and product will be approved before ordering.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Remove Existing Sidewalk", 1, "SF", 0],
      ["Sidewalk Replacement - 4 in", 1, "SF", 0],
      ["ADA Ramp Panels", 1, "EA", 0],
      ["Detectable Warning Panels", 1, "EA", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "driveway",
    name: "Driveway",
    description: "Residential driveway replacement or new concrete driveway starter.",
    category: "Residential",
    recommendedFor: "Residential driveway tear-out, replacement, widening, and approaches.",
    proposalType: "residential",
    packetMode: "summary",
    projectCategory: "Residential driveway",
    scopeSections: [
      templateScope("Driveway Preparation", ["Layout driveway limits", "Remove existing concrete as listed", "Excavate and grade", "Compact subgrade / base"]),
      templateScope("Concrete Driveway", ["Install forms", "Place concrete driveway slab", "Add reinforcement as listed", "Tool edges and joints"]),
      templateScope("Finish & Cleanup", ["Broom finish surface", "Sawcut or tool control joints", "Cure concrete", "Final cleanup and debris haul off"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in typical / 5 in to 6 in where listed", finishType: "Broom finish", rebarMeshDetails: "Per proposal / as listed" }),
    exclusions: [
      "Permits and fees by owner unless noted",
      "Utility relocation or repair",
      "Irrigation, landscaping, gates, fencing, and lighting by others",
      "Unsuitable soils, tree roots, or rock excavation",
      "Concrete staining, stamping, or sealer unless listed",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Owner will provide clear access to the driveway work area.",
      "Existing subgrade is suitable for standard residential concrete placement.",
      "Vehicle traffic will remain off new concrete until curing period is complete.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Driveway Demolition / Removal", 1, "SF", 0],
      ["Base Prep & Grading", 1, "LS", 0],
      ["Concrete Driveway", 1, "SF", 0],
      ["Control Joints", 1, "SF", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "patio",
    name: "Patio",
    description: "Residential patio slab, walkway tie-ins, and outdoor living concrete.",
    category: "Residential",
    recommendedFor: "Backyard patios, outdoor seating areas, walkways, and small pads.",
    proposalType: "residential",
    packetMode: "summary",
    projectCategory: "Residential patio",
    scopeSections: [
      templateScope("Patio Preparation", ["Layout patio footprint", "Excavate and grade", "Compact base", "Install forms"]),
      templateScope("Patio Concrete", ["Place concrete patio slab", "Install reinforcement as listed", "Tool edges and control joints", "Coordinate drainage slope as practical"]),
      templateScope("Finish & Cleanup", ["Apply selected finish", "Cure concrete", "Remove forms", "Final cleanup"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in typical", finishType: "Broom / smooth trowel as selected", controlJointSpacing: "Per patio layout" }),
    exclusions: [
      "Permits and fees by owner unless noted",
      "Patio cover footings, electrical, plumbing, and drainage systems by others unless listed",
      "Landscaping, irrigation, lighting, and hardscape walls by others",
      "Unsuitable soils or rock excavation",
      "Decorative finish or sealer unless listed",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Owner will approve patio layout and finish before scheduling concrete.",
      "Work area access is suitable for equipment, wheelbarrow, or pump placement as needed.",
      "Final grade allows positive drainage away from structures.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Patio Excavation & Base Prep", 1, "LS", 0],
      ["Concrete Patio Slab - 4 in", 1, "SF", 0],
      ["Thickened Edge / Step Detail", 1, "LF", 0],
      ["Finish / Cure / Cleanup", 1, "LS", 0],
    ]),
  },
  {
    id: "slab",
    name: "Slab",
    description: "Concrete slab starter for pads, equipment slabs, shed slabs, and small foundations.",
    category: "Commercial",
    recommendedFor: "Equipment pads, shed slabs, dumpster pads, utility pads, and small slabs.",
    proposalType: "commercial",
    packetMode: "summary",
    projectCategory: "Concrete slab / pad",
    scopeSections: [
      templateScope("Slab Preparation", ["Layout slab limits", "Excavate and grade", "Compact subgrade", "Install forms"]),
      templateScope("Concrete Slab", ["Place concrete slab", "Install reinforcement as listed", "Finish slab surface", "Install control joints"]),
      templateScope("Closeout", ["Cure concrete", "Strip forms", "Final cleanup", "Haul off excess materials"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in to 6 in as listed", finishType: "Troweled / broom as selected", rebarMeshDetails: "Per proposal / as listed" }),
    exclusions: DEFAULT_EXCLUSIONS,
    assumptions: [
      "Subgrade and base section are suitable for the listed slab use.",
      "Anchor bolts, embeds, and equipment templates by others unless listed.",
      "Final slab dimensions and elevations will be approved before forming.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Slab Prep & Forms", 1, "LS", 0],
      ["Concrete Slab", 1, "SF", 0],
      ["Reinforcement", 1, "SF", 0],
      ["Control Joints", 1, "SF", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "curb_gutter",
    name: "Curb / Gutter",
    description: "Curb, gutter, curb cuts, and site concrete edge work.",
    category: "Commercial",
    recommendedFor: "Parking lots, drive aisles, site frontage work, and concrete edge repairs.",
    proposalType: "commercial",
    packetMode: "summary",
    projectCategory: "Curb and gutter",
    scopeSections: [
      templateScope("Curb Preparation", ["Layout curb alignment", "Excavate and grade", "Compact subgrade", "Set forms"]),
      templateScope("Curb & Gutter", ["Place curb and gutter", "Tie into existing concrete as practical", "Tool joints and edges", "Coordinate transitions and returns"]),
      templateScope("Cleanup", ["Cure concrete", "Remove forms", "Backfill edges as listed", "Final cleanup"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "Per curb / gutter profile", finishType: "Formed curb finish / broom gutter pan", controlJointSpacing: "Per plan / field layout" }),
    exclusions: [
      "Permits and fees by others",
      "Testing by others unless noted",
      "Asphalt sawcut, paving, striping, and traffic control by others unless listed",
      "Survey control and staking by others unless listed",
      "Unsuitable soils or rock excavation",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Curb grades, alignments, and tie-in elevations will be provided before forming.",
      "Work area will be accessible for concrete trucks and finishing operations.",
      "Adjacent asphalt or base repairs are excluded unless specifically listed.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Curb & Gutter", 1, "LF", 0],
      ["Curb Returns / Transitions", 1, "EA", 0],
      ["Sawcut / Tie-In Prep", 1, "LS", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "stamped_decorative",
    name: "Stamped / Decorative Concrete",
    description: "Decorative patio, walkway, borders, color, stamp, and sealer starter.",
    category: "Residential",
    recommendedFor: "Stamped patios, decorative walkways, colored slabs, and accent borders.",
    proposalType: "residential",
    packetMode: "summary",
    projectCategory: "Stamped / decorative concrete",
    scopeSections: [
      templateScope("Decorative Concrete Prep", ["Confirm pattern, color, and layout", "Excavate and grade", "Compact base", "Install forms"]),
      templateScope("Placement & Finish", ["Place decorative concrete slab", "Apply selected color / release system as listed", "Stamp selected pattern", "Tool joints and edges"]),
      templateScope("Seal & Cleanup", ["Wash and detail stamped surface", "Apply sealer as listed", "Final cleanup", "Provide basic care instructions"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "4 in typical", finishType: "Stamped / decorative finish", controlJointSpacing: "Decorative layout / sawcut as needed", cureSealerNotes: "Sealer as listed after surface preparation" }),
    exclusions: [
      "Permits and fees by owner unless noted",
      "Color variation, weather variation, and natural curing variation are inherent to decorative concrete",
      "Landscaping, irrigation, drainage, and lighting by others",
      "Unsuitable soils or rock excavation",
      "Future resealing or maintenance unless listed",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Owner will approve pattern, color, borders, and final layout before placement.",
      "Decorative concrete requires weather-appropriate scheduling and may shift based on conditions.",
      "Final appearance may vary from samples due to site and weather conditions.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Decorative Slab Prep", 1, "LS", 0],
      ["Stamped Concrete", 1, "SF", 0],
      ["Integral Color / Release", 1, "SF", 0],
      ["Sealer", 1, "SF", 0],
      ["Mobilization", 1, "LS", 0],
    ]),
  },
  {
    id: "concrete_repair",
    name: "Concrete Repair",
    description: "Patch, removal, replacement, joint repair, and localized concrete repair starter.",
    category: "Repair",
    recommendedFor: "Trip hazards, broken panels, joint repair, pads, and localized replacement.",
    proposalType: "commercial",
    packetMode: "summary",
    projectCategory: "Concrete repair",
    scopeSections: [
      templateScope("Repair Preparation", ["Identify repair limits", "Sawcut or remove damaged concrete as listed", "Prepare base / substrate", "Protect adjacent surfaces"]),
      templateScope("Concrete Repair", ["Place repair concrete or patch material as listed", "Match adjacent finish where practical", "Tool or sawcut joints", "Cure repair areas"]),
      templateScope("Cleanup", ["Remove debris", "Clean work area", "Haul off excess materials", "Final walkthrough"]),
    ],
    concreteSpecs: createConcreteSpecTemplate({ thickness: "Match existing or as listed", finishType: "Match adjacent finish where practical", controlJointSpacing: "Match existing joint layout where practical" }),
    exclusions: [
      "Permits and fees by others",
      "Testing by others unless noted",
      "Structural engineering, root removal, or utility repair by others",
      "Full-depth replacement beyond listed repair limits",
      "Color and texture match is approximate unless specified otherwise",
      "Price valid for 30 days from proposal date",
    ],
    assumptions: [
      "Repair areas are based on visible conditions at proposal time.",
      "Hidden deterioration may require written change order.",
      "Owner or GC will keep repaired areas protected during curing.",
    ],
    terms: DEFAULT_TERMS,
    starterLineItems: makeTemplateLineItems([
      ["Sawcut / Demo Repair Area", 1, "LS", 0],
      ["Concrete Panel Replacement", 1, "SF", 0],
      ["Joint Repair / Sealant", 1, "LF", 0],
      ["Cleanup & Haul Off", 1, "LS", 0],
    ]),
  },
];

export const SEED_PROPOSAL = {
  id: "seed-marketplace-retail-center",
  contactId: "",
  proposalNumber: "LYC-2026-0001",
  revisionNumber: 0,
  revisionLabel: "Rev 0",
  revisionDate: "2026-05-01",
  revisionNotes: "",
  parentProposalId: "",
  previousTotal: "",
  sentDate: "",
  sentToName: "",
  sentToEmail: "",
  sentToPhone: "",
  sentMethod: "",
  followUpDate: "",
  followUpNotes: "",
  lastFollowUpDate: "",
  nextAction: "",
  outcomeReason: "",
  approvedDate: "",
  rejectedDate: "",
  viewedDate: "",
  decisionDueDate: "",
  internalTrackingNotes: "",
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
  pricingSections: [],
  financials: {
    taxRate: 0,
    discountAmount: 0,
    depositRate: DEFAULT_TERMS.depositRate,
  },
  exclusions: DEFAULT_EXCLUSIONS,
  assumptions: DEFAULT_ASSUMPTIONS,
  terms: DEFAULT_TERMS,
};

export function applyTemplateToProposal(templateId, proposal = {}) {
  const template = PROPOSAL_TEMPLATES.find((item) => item.id === templateId);
  const nextProposal = cloneTemplateValue(proposal || {});

  if (!template) {
    return nextProposal;
  }

  const project = nextProposal.project || {};

  return {
    ...nextProposal,
    templateId: template.id,
    templateName: template.name,
    proposalType: template.proposalType,
    type: template.proposalType,
    packetMode: template.packetMode,
    project: {
      ...project,
      category: template.projectCategory || project.category || template.name,
    },
    scopeSections: cloneTemplateValue(template.scopeSections || []),
    concreteSpecs: cloneTemplateValue(template.concreteSpecs || {}),
    exclusions: cloneTemplateValue(template.exclusions || []),
    assumptions: cloneTemplateValue(template.assumptions || []),
    terms: cloneTemplateValue(template.terms || DEFAULT_TERMS),
    lineItems: normalizeTemplateLineItems(template.starterLineItems || []),
    pricingSections: cloneTemplateValue(template.pricingSections || []),
    gcPacketTables: cloneTemplateValue(template.gcPacketTables || createSummaryGcPacketTableDefaults()),
    planSheets: cloneTemplateValue(template.planSheets || []),
    financials: {
      ...(nextProposal.financials || {}),
      depositRate: template.terms?.depositRate ?? nextProposal.financials?.depositRate ?? DEFAULT_TERMS.depositRate,
    },
  };
}

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

export function getDefaultPriceLibrary() {
  return normalizePriceLibrary(DEFAULT_PRICE_LIBRARY_ITEMS);
}

export function normalizePriceLibrary(items = []) {
  return (Array.isArray(items) ? items : []).filter(Boolean).map((item, index) => normalizePriceLibraryItem(item, index));
}

export function normalizePriceLibraryItem(item = {}, index = 0) {
  const now = new Date().toISOString();
  const fallbackName = `Price Item ${index + 1}`;
  const unit = LINE_ITEM_UNITS.includes(item.unit) ? item.unit : "LS";
  const category = PRICE_LIBRARY_CATEGORIES.includes(item.category) ? item.category : "Other";

  return {
    id: item.id || `price-library-${index + 1}`,
    name: hasText(item.name) ? String(item.name).trim() : fallbackName,
    category,
    description: hasText(item.description) ? String(item.description).trim() : hasText(item.name) ? String(item.name).trim() : fallbackName,
    unit,
    defaultUnitPrice: toNumber(item.defaultUnitPrice),
    defaultQuantity: item.defaultQuantity === "" ? "" : toNumber(item.defaultQuantity ?? 1),
    taxable: item.taxable ?? true,
    defaultNotes: item.defaultNotes || "",
    defaultScopeBullets: normalizePriceLibraryTextList(item.defaultScopeBullets),
    defaultExclusions: normalizePriceLibraryTextList(item.defaultExclusions),
    active: item.active ?? true,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

export function createPriceLibraryLineItem(item = {}, itemNumber = "") {
  const normalizedItem = normalizePriceLibraryItem(item);

  return {
    itemNumber: String(itemNumber || ""),
    description: normalizedItem.description || normalizedItem.name,
    quantity: normalizedItem.defaultQuantity === "" ? 1 : normalizedItem.defaultQuantity,
    unit: normalizedItem.unit,
    unitPrice: normalizedItem.defaultUnitPrice,
    taxable: normalizedItem.taxable,
    notes: normalizedItem.defaultNotes,
  };
}

export function getDefaultPacketBuilder() {
  return normalizePacketBuilder();
}

export function normalizePacketBuilder(sections = []) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const sourceById = new Map(sourceSections.filter((section) => section?.id).map((section) => [section.id, section]));

  return PACKET_BUILDER_SECTIONS.map((defaultSection) => {
    const source = sourceById.get(defaultSection.id) || {};
    const order = Number.parseInt(source.order, 10);

    return {
      id: defaultSection.id,
      title: defaultSection.title,
      included: source.included ?? defaultSection.defaultIncluded,
      order: Number.isFinite(order) ? order : defaultSection.defaultOrder,
    };
  }).sort((a, b) => a.order - b.order);
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
  const includedPricingSectionsTotal = roundMoney(
    (proposal.pricingSections || []).reduce(
      (sum, section) => sum + (section.included ? getPricingSectionSignedAmount(section) : 0),
      0,
    ),
  );
  const allAcceptedPricingSectionsTotal = roundMoney(
    (proposal.pricingSections || [])
      .filter((section) => section.type !== "unit_price")
      .reduce((sum, section) => sum + getPricingSectionSignedAmount(section), 0),
  );
  const baseBid = roundMoney(Math.max(0, subtotal - discount) + tax);
  const total = roundMoney(Math.max(0, baseBid + includedPricingSectionsTotal));
  const totalIfAllAlternatesAccepted = roundMoney(Math.max(0, baseBid + allAcceptedPricingSectionsTotal));
  const deposit = roundMoney(resolveDeposit(total, financials));
  const balanceDue = roundMoney(Math.max(0, total - deposit));

  return {
    baseBid,
    subtotal,
    tax,
    discount,
    includedPricingSectionsTotal,
    totalIfAllAlternatesAccepted,
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

export function validateProposalCompleteness(proposal) {
  const errors = [];
  const warnings = [];

  if (!proposal) {
    return {
      isValid: false,
      errors: ["Open or create a proposal before saving or printing."],
      warnings,
    };
  }

  if (!hasText(proposal.client?.companyName) && !hasText(proposal.client?.contactName)) {
    errors.push("Add a client/company name or contact name.");
  }

  if (!hasText(proposal.project?.name)) {
    errors.push("Add a project name.");
  }

  if (!hasText(proposal.client?.projectAddress) && !hasText(proposal.project?.address) && !hasText(proposal.project?.location)) {
    errors.push("Add a project address or project location.");
  }

  if (!hasUsableScopeSections(proposal.scopeSections)) {
    errors.push("Add at least one scope section.");
  }

  if (!hasUsableLineItems(proposal.lineItems)) {
    errors.push("Add at least one pricing line item.");
  }

  if (!hasText(proposal.proposalDate)) {
    errors.push("Add a proposal date.");
  }

  if (!hasText(proposal.validUntil)) {
    errors.push("Add an expiration date.");
  }

  if (!hasText(proposal.client?.email)) {
    warnings.push("Client email is missing.");
  }

  if (!hasText(proposal.client?.phone)) {
    warnings.push("Client phone is missing.");
  }

  if (!hasTextList(proposal.exclusions)) {
    warnings.push("Exclusions are missing.");
  }

  if (!hasTerms(proposal.terms)) {
    warnings.push("Terms are missing.");
  }

  if (!hasConcreteSpecs(proposal.concreteSpecs)) {
    warnings.push("Concrete specifications are missing.");
  }

  if (!hasProjectPhotos(proposal.projectPhotos)) {
    warnings.push("Project photos are missing.");
  }

  if ((proposal.proposalType ?? proposal.type) === "gc_prime" && !hasGcPrimeDetails(proposal.gcPrime)) {
    warnings.push("GC / Prime contractor fields are missing.");
  }

  getPricingSectionWarnings(proposal.pricingSections).forEach((warning) => warnings.push(warning));
  getSovValidationWarnings(proposal).forEach((warning) => warnings.push(warning));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function templateScope(title, items) {
  return { title, items };
}

function createTemplateTerms(payment, depositText = DEFAULT_TERMS.depositText, progressBilling = DEFAULT_TERMS.progressBilling, overrides = {}) {
  return {
    ...DEFAULT_TERMS,
    payment,
    depositText,
    progressBilling,
    ...overrides,
  };
}

function createConcreteSpecTemplate(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function makeTemplateLineItems(rows) {
  return rows.map(([description, quantity, unit, unitPrice], index) => ({
    itemNumber: String(index + 1),
    description,
    quantity,
    unit,
    unitPrice,
    taxable: true,
  }));
}

function createSummaryGcPacketTableDefaults() {
  return {
    pricingSummary: { enabled: false, presentationNotes: "", rows: [] },
    scheduleOfValues: { enabled: false, rows: [] },
    takeoffQuantities: { enabled: false, rows: [] },
    shadeFootingEstimate: { enabled: false, rows: [] },
    proposalNotes: {
      enabled: false,
      proposalBasis: "",
      contractScopeControl: "",
      acceptanceSummary: "",
      gcPrimeReviewer: "",
    },
  };
}

function createFullGcPacketTableDefaults() {
  return {
    ...createSummaryGcPacketTableDefaults(),
    pricingSummary: {
      enabled: true,
      presentationNotes: "Confirm accepted alternates and allowances before contract execution.",
      rows: [],
    },
    proposalNotes: {
      enabled: true,
      proposalBasis: "Proposal based on provided plans, specifications, addenda, and written clarifications.",
      contractScopeControl:
        "Proposal includes only the concrete scope specifically listed. Work shown elsewhere in the documents is excluded unless expressly included in this proposal, SOV, or written accepted scope sheet.",
      acceptanceSummary: "GC to identify accepted alternates and allowances before contract execution.",
      gcPrimeReviewer: "Reviewed by: ______________________________ Date: __________",
    },
  };
}

function normalizeTemplateLineItems(items = []) {
  return items.map((item, index) => ({
    itemNumber: String(index + 1),
    description: item.description || "",
    quantity: item.quantity ?? 1,
    unit: LINE_ITEM_UNITS.includes(item.unit) ? item.unit : "LS",
    unitPrice: item.unitPrice ?? 0,
    taxable: item.taxable ?? true,
  }));
}

function normalizePriceLibraryTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function cloneTemplateValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function getLineItemAmount(item) {
  if (item.amount !== undefined) {
    return toNumber(item.amount);
  }

  return toNumber(item.quantity) * toNumber(item.unitPrice);
}

function getPricingSectionSignedAmount(section) {
  const amount = Math.abs(toNumber(section.amount));

  return section.type === "deduct_alternate" ? -amount : amount;
}

function getPricingSectionWarnings(pricingSections = []) {
  if (!Array.isArray(pricingSections)) {
    return [];
  }

  return pricingSections
    .map((section, index) => {
      const hasAnyPricingValue =
        hasText(section?.label) || hasText(section?.description) || hasText(section?.amount) || section?.included === true;

      if (!hasAnyPricingValue) {
        return "";
      }

      if (!hasText(section?.label)) {
        return `Alternate / allowance ${index + 1} is missing a label.`;
      }

      if (!hasText(section?.amount) || toNumber(section.amount) < 0) {
        return `Alternate / allowance ${index + 1} is missing a valid amount.`;
      }

      if (section.included !== true && section.included !== false) {
        return `Alternate / allowance ${index + 1} should be clearly marked included or excluded.`;
      }

      return "";
    })
    .filter(Boolean);
}

function getSovValidationWarnings(proposal = {}) {
  const scheduleOfValues = proposal.gcPacketTables?.scheduleOfValues;
  const rows = Array.isArray(scheduleOfValues?.rows) ? scheduleOfValues.rows : [];
  const visibleRows = rows.filter((row) =>
    ["item", "description", "pricingBasis", "amount"].some((field) => hasText(row?.[field])),
  );
  const validationRows = visibleRows.filter((row) => !isSovPresentationTotalRow(row));
  const warnings = [];

  validationRows.forEach((row, index) => {
    const missingFields = ["item", "description", "pricingBasis", "amount"].filter((field) => !hasText(row?.[field]));

    if (missingFields.length > 0) {
      warnings.push(`Schedule of Values row ${index + 1} is incomplete.`);
    }
  });

  const comparableRows = validationRows.filter((row) => {
    if (isSovOptionalPresentationRow(row)) {
      return row.included === true;
    }

    return isSovRowExplicitlyIncluded(row) || !isSovOptionalPresentationRow(row);
  });

  if (comparableRows.length > 0) {
    const sovTotal = roundMoney(comparableRows.reduce((sum, row) => sum + toNumber(row.amount), 0));
    const proposalTotal = calculateProposalTotals(proposal).total;

    if (proposalTotal > 0 && Math.abs(sovTotal - proposalTotal) > 1) {
      warnings.push(
        `Schedule of Values total (${formatValidationCurrency(sovTotal)}) does not match included proposal total (${formatValidationCurrency(proposalTotal)}).`,
      );
    }
  }

  return warnings;
}

function getSovRowText(row = {}) {
  return [row.item, row.description, row.pricingBasis].map((value) => String(value || "").trim()).filter(Boolean).join(" ").toLowerCase();
}

function isSovPresentationTotalRow(row = {}) {
  const item = String(row.item || "").trim().toLowerCase();
  const description = String(row.description || "").trim().toLowerCase();
  const rowText = getSovRowText(row);
  const presentationPattern = /^(subtotal|total|total base|total if)\b/;
  const presentationPhrases = ["subtotal", "total", "total if", "total base", "base + additive", "base + additive + optional"];

  return presentationPattern.test(item) || presentationPattern.test(description) || presentationPhrases.some((phrase) => rowText.includes(phrase));
}

function isSovRowExplicitlyIncluded(row = {}) {
  const textValue = getSovRowText(row);

  if (/\b(not included|excluded)\b/.test(textValue)) {
    return false;
  }

  return row.included === true || /\b(included|accepted|base included)\b/.test(textValue);
}

function isSovOptionalPresentationRow(row = {}) {
  const textValue = getSovRowText(row);

  return /\b(optional|alternate|alternates|additive alternate|add alternate|deduct alternate|optional support scope|support scope)\b/.test(textValue);
}

function formatValidationCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(roundMoney(value));
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

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function hasTextList(value) {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

function hasUsableScopeSections(scopeSections) {
  return (
    Array.isArray(scopeSections) &&
    scopeSections.some((section) => hasText(section?.title) || (Array.isArray(section?.items) && section.items.some((item) => hasText(item))))
  );
}

function hasUsableLineItems(lineItems) {
  return Array.isArray(lineItems) && lineItems.some((item) => hasText(item?.description));
}

function hasTerms(terms = {}) {
  return Object.values(terms).some((value) => hasText(value));
}

function hasConcreteSpecs(concreteSpecs = {}) {
  return Object.values(concreteSpecs).some((value) => {
    if (typeof value === "boolean") {
      return value === true;
    }

    return hasText(value);
  });
}

function hasProjectPhotos(projectPhotos) {
  return Array.isArray(projectPhotos) && projectPhotos.some((photo) => hasText(photo?.src));
}

function hasGcPrimeDetails(gcPrime = {}) {
  return Object.values(gcPrime).some((value) => {
    if (typeof value === "boolean") {
      return value === true;
    }

    return hasText(value);
  });
}
