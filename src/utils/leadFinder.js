export const LEAD_STATUSES = [
  "New",
  "Good Fit",
  "Maybe",
  "Bad Fit",
  "Contacted",
  "Estimate Started",
  "Proposal Started",
  "Won",
  "Lost",
];

export const LEAD_SERVICE_TYPES = [
  "Fencing",
  "Decking",
  "Siding",
  "Exterior Repair",
  "Concrete",
  "Site Concrete",
  "Sidewalk",
  "ADA Ramp",
  "Curb/Gutter",
  "Slab",
  "Other",
];

export const LEAD_SOURCE_TYPES = [
  "GC Bid Page",
  "Public Bid Page",
  "Property Manager",
  "Apartment Manager",
  "Builder/Subdivision",
  "Residential Lead",
  "Referral",
  "Manual Entry",
  "Other",
];

export const LEAD_SOURCE_CHECK_FREQUENCIES = ["Daily", "Every 2 Days", "Weekly", "Monthly", "As Needed"];

export const LEAD_SOURCE_STATUSES = ["Active", "Paused", "Bad Source", "Needs Review"];

export const LEAD_SOURCE_PRIORITIES = ["High", "Medium", "Low"];

export const LEAD_AI_FIT_LABELS = ["Good Fit", "Maybe", "Bad Fit"];

export const LEAD_SUGGESTED_COMPANY_MODES = ["Live Your Future", "Last Yard Concrete", "General Contractor", "Unknown"];

export const LEAD_SCORE_STATUSES = ["unscored", "scored", "partial", "error"];

export const LEAD_REVIEW_STATUSES = ["Needs Review", "Reviewed", "Rejected", "Saved for Later"];

export const LEAD_PROPOSAL_READINESS_LABELS = ["Ready", "Needs Info", "Not Ready"];

export const LEAD_MISSING_INFO_STATUSES = ["Not Checked", "Needs Info", "Info Requested", "Ready", "Not Ready"];

export const LEAD_FOLLOW_UP_STATUSES = [
  "Not Contacted",
  "Contacted",
  "Follow-Up Needed",
  "Waiting on Response",
  "Estimate Sent",
  "Proposal Sent",
  "Won",
  "Lost",
  "No Thanks",
  "Do Not Follow Up",
];

export const LEAD_CONTACT_METHODS = ["Email", "Text", "Call", "In Person", "Portal", "Other"];

export const LEAD_FINDER_BACKUP_TYPE = "lead_finder_backup";
export const LEAD_FINDER_STARTER_SOURCE_COUNT = 28;

const LEAD_SORT_OPTIONS = new Set(["newest", "due_date"]);
const FOLLOW_UP_DUE_FILTERS = new Set(["all", "due_today", "overdue", "due_or_overdue", "upcoming", "none"]);
const CLOSED_FOLLOW_UP_STATUSES = new Set(["Won", "Lost", "No Thanks", "Do Not Follow Up"]);
const SOURCE_DUE_FILTERS = new Set(["all", "due_today", "overdue", "due_or_overdue", "upcoming", "none"]);

const LEAD_FINDER_STARTER_SOURCE_PACK = [
  {
    id: "starter-lyf-albany-fencing",
    name: "Albany fencing leads manual search",
    sourceType: "Residential Lead",
    companyType: "Residential exterior",
    locationFocus: "Albany, Oregon",
    tradeFocus: "Fencing",
    notes: "Manual source for Albany fencing opportunities. Check local referrals, community posts, property managers, and homeowner inquiries.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Fencing",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-albany-decking",
    name: "Albany decking leads manual search",
    sourceType: "Residential Lead",
    companyType: "Residential exterior",
    locationFocus: "Albany, Oregon",
    tradeFocus: "Decking",
    notes: "Manual source for Albany deck repair, deck rebuild, and outdoor living leads.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Decking",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-albany-siding",
    name: "Albany siding leads manual search",
    sourceType: "Residential Lead",
    companyType: "Residential exterior",
    locationFocus: "Albany, Oregon",
    tradeFocus: "Siding",
    notes: "Manual source for siding repair and exterior repair opportunities around Albany.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Siding",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-linn-property-managers",
    name: "Linn County property manager list",
    sourceType: "Property Manager",
    companyType: "Property manager",
    locationFocus: "Linn County",
    tradeFocus: "Fencing, Decking, Siding, Exterior Repair",
    notes: "Manual list of Linn County property managers for exterior repair and maintenance opportunities.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-benton-property-managers",
    name: "Benton County property manager list",
    sourceType: "Property Manager",
    companyType: "Property manager",
    locationFocus: "Benton County",
    tradeFocus: "Fencing, Decking, Siding, Exterior Repair",
    notes: "Manual list of Benton County property managers for residential exterior work.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-albany-apartment-managers",
    name: "Albany apartment manager list",
    sourceType: "Apartment Manager",
    companyType: "Apartment manager",
    locationFocus: "Albany, Oregon",
    tradeFocus: "Exterior Repair",
    notes: "Manual list for apartment manager maintenance needs such as fences, decks, siding, and small exterior repairs.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-willamette-builders",
    name: "Willamette Valley builders/subdivisions",
    sourceType: "Builder/Subdivision",
    companyType: "Builder / subdivision",
    locationFocus: "Willamette Valley",
    tradeFocus: "Fencing, Decking, Siding",
    notes: "Manual source for builder and subdivision relationships in the Willamette Valley.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Fencing",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-facebook-community",
    name: "Facebook/community referral opportunities",
    sourceType: "Referral",
    companyType: "Community referral",
    locationFocus: "Albany, Oregon; Linn County; Benton County",
    tradeFocus: "Fencing, Decking, Siding, Exterior Repair",
    notes: "Manual check for community referral opportunities. Do not scrape or automate.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-google-maps-research",
    name: "Google Maps contractor opportunity research",
    sourceType: "Manual Entry",
    companyType: "Research list",
    locationFocus: "Albany, Oregon; Willamette Valley",
    tradeFocus: "Fencing, Decking, Siding, Exterior Repair",
    notes: "Manual Google Maps research list for possible partnerships and referral opportunities. Do not automate.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyf-remodeler-handyman-partners",
    name: "Local remodeler / handyman partnership list",
    sourceType: "Referral",
    companyType: "Referral partner",
    locationFocus: "Albany, Oregon; Linn County; Benton County",
    tradeFocus: "Fencing, Decking, Siding, Exterior Repair",
    notes: "Manual list of remodelers and handymen who may refer exterior scopes outside their capacity.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "Medium",
    defaultServiceType: "Exterior Repair",
    defaultCompanyMode: "Live Your Future",
  },
  {
    id: "starter-lyc-oregon-public-bid",
    name: "Oregon public bid manual check",
    sourceType: "Public Bid Page",
    companyType: "Public agency",
    locationFocus: "Oregon",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual source for Oregon public bid opportunities. Avoid huge public/bonded work unless the concrete scope is clearly manageable.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-city-procurement",
    name: "Oregon city procurement manual check",
    sourceType: "Public Bid Page",
    companyType: "City procurement",
    locationFocus: "Oregon cities",
    tradeFocus: "Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual check for city procurement pages that may include concrete repair or site concrete packages.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "Sidewalk",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-county-procurement",
    name: "Oregon county procurement manual check",
    sourceType: "Public Bid Page",
    companyType: "County procurement",
    locationFocus: "Oregon counties",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter",
    notes: "Manual check for county procurement opportunities with concrete/site concrete scope.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-school-district-bids",
    name: "Oregon school district bid manual check",
    sourceType: "Public Bid Page",
    companyType: "School district",
    locationFocus: "Oregon",
    tradeFocus: "Sidewalk, ADA Ramp, Slab",
    notes: "Manual source for school district bid pages with concrete replacement, ADA, or site packages.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "ADA Ramp",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-gc-bid-invite-pages",
    name: "Oregon GC bid invite pages",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Oregon",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual check for GC bid invite pages. Prefer subcontractor concrete packages over full prime work.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-plan-room",
    name: "Oregon plan room manual check",
    sourceType: "Public Bid Page",
    companyType: "Plan room",
    locationFocus: "Oregon",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual plan room check for concrete/site concrete bid packages. Do not automate scraping.",
    checkFrequency: "Daily",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-salem-gc-research",
    name: "Salem GC opportunity research",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Salem",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual Salem GC relationship and opportunity research for concrete packages.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-albany-corvallis-gc",
    name: "Albany / Corvallis GC opportunity research",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Albany; Corvallis",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual GC opportunity research for Albany and Corvallis concrete work.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-eugene-gc-research",
    name: "Eugene GC opportunity research",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Eugene",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual Eugene GC relationship and opportunity research for concrete packages.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-lyc-portland-metro-gc",
    name: "Portland Metro GC opportunity research",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Portland Metro",
    tradeFocus: "Site Concrete, Sidewalk, ADA Ramp, Curb/Gutter, Slab",
    notes: "Manual Portland Metro GC opportunity research. Confirm travel, schedule, and capacity before pursuing.",
    checkFrequency: "Every 2 Days",
    sourcePriority: "High",
    defaultServiceType: "Site Concrete",
    defaultCompanyMode: "Last Yard Concrete",
  },
  {
    id: "starter-general-property-managers-master",
    name: "Property managers master list",
    sourceType: "Property Manager",
    companyType: "Property manager",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "General manual list for future property manager relationships.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-apartment-managers-master",
    name: "Apartment managers master list",
    sourceType: "Apartment Manager",
    companyType: "Apartment manager",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "General manual list for future apartment manager relationships.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-builders-remodelers-master",
    name: "Builders and remodelers master list",
    sourceType: "Builder/Subdivision",
    companyType: "Builder / remodeler",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "General list for builder and remodeler contacts that may become referral or subcontractor sources.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-gc-contacts-master",
    name: "GC contacts master list",
    sourceType: "GC Bid Page",
    companyType: "General contractor",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "General GC contacts list for future bid invites and subcontractor relationships.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-past-customer-referral",
    name: "Past customer referral source",
    sourceType: "Referral",
    companyType: "Past customer",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "Manual source for tracking referrals from past customers.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-website-form",
    name: "Website contact form leads",
    sourceType: "Residential Lead",
    companyType: "Website inquiry",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "Manual source for leads that arrive through website contact forms.",
    checkFrequency: "Weekly",
    sourcePriority: "Medium",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-phone-leads",
    name: "Manual phone call leads",
    sourceType: "Manual Entry",
    companyType: "Inbound lead",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "Manual source for phone call leads.",
    checkFrequency: "Weekly",
    sourcePriority: "Low",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
  {
    id: "starter-general-email-leads",
    name: "Manual email leads",
    sourceType: "Manual Entry",
    companyType: "Inbound lead",
    locationFocus: "Oregon",
    tradeFocus: "Other",
    notes: "Manual source for email leads.",
    checkFrequency: "Weekly",
    sourcePriority: "Low",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
  },
];

export function createLeadFinderId(prefix = "lead") {
  const safePrefix = String(prefix || "lead")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "lead";

  if (globalThis.crypto?.randomUUID) {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyLeadSource(seed = {}) {
  const now = new Date().toISOString();

  return normalizeLeadSource({
    id: seed.id || "",
    name: "",
    sourceType: "Manual Entry",
    url: "",
    companyType: "",
    locationFocus: "",
    tradeFocus: "",
    active: true,
    notes: "",
    checkFrequency: "As Needed",
    lastCheckedDate: "",
    nextCheckDate: "",
    sourceStatus: "Active",
    sourcePriority: "Medium",
    sourceNotes: "",
    defaultServiceType: "Other",
    defaultCompanyMode: "Unknown",
    createdAt: now,
    updatedAt: now,
    ...seed,
  });
}

export function createEmptyLead(seed = {}) {
  const now = new Date().toISOString();

  return normalizeLead({
    id: seed.id || "",
    title: "",
    sourceId: "",
    sourceName: "",
    sourceUrl: "",
    companyName: "",
    city: "",
    state: "",
    serviceType: "Concrete",
    projectType: "",
    dueDate: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    estimatedValue: "",
    capacityFit: "",
    aiFitScore: "",
    aiFitLabel: "",
    aiFitReason: "",
    aiRisks: "",
    aiNextStep: "",
    suggestedCompanyMode: "Unknown",
    scoreStatus: "unscored",
    scoreSource: "",
    scoredAt: "",
    scoreError: "",
    reviewStatus: "Needs Review",
    reviewedAt: "",
    reviewedBy: "",
    status: "New",
    notes: "",
    estimateId: "",
    proposalId: "",
    packetId: "",
    contactId: "",
    handoffHistory: [],
    lastContactDate: "",
    lastContactMethod: "",
    nextFollowUpDate: "",
    followUpStatus: "Not Contacted",
    contactNotes: "",
    noFollowUpReason: "",
    missingInfoChecklist: [],
    criticalQuestions: [],
    recommendedPhotosOrDocs: [],
    missingInfoRiskFlags: [],
    proposalReadinessScore: "",
    proposalReadinessLabel: "",
    missingInfoRecommendedNextStep: "",
    customerQuestionDraft: "",
    missingInfoLastCheckedAt: "",
    missingInfoSource: "",
    missingInfoStatus: "Not Checked",
    createdAt: now,
    updatedAt: now,
    ...seed,
  });
}

export function createLeadFromSource(source = {}, seed = {}) {
  const normalizedSource = normalizeLeadSource(source);

  return createEmptyLead({
    ...seed,
    sourceId: normalizedSource.id,
    sourceName: normalizedSource.name,
    sourceUrl: normalizedSource.url,
    serviceType: normalizedSource.defaultServiceType || seed.serviceType,
    suggestedCompanyMode: normalizedSource.defaultCompanyMode || seed.suggestedCompanyMode,
  });
}

export function getLeadSourceOpenUrl(sourceOrUrl = "") {
  const rawUrl = isPlainObject(sourceOrUrl) ? sourceOrUrl.url : sourceOrUrl;
  const text = toSafeText(rawUrl);

  if (!text) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, "")}`;

  try {
    const parsedUrl = new URL(candidate);
    return ["http:", "https:"].includes(parsedUrl.protocol) && parsedUrl.hostname ? parsedUrl.href : "";
  } catch {
    return "";
  }
}

export function normalizeLeadFinderData(data = {}) {
  const source = isPlainObject(data) ? data : {};

  return {
    sources: normalizeLeadSources(source.sources || source.leadSources),
    leads: normalizeLeads(source.leads || source.leadRecords),
  };
}

export function mergeLeadFinderData(...records) {
  const sourceMap = new Map();
  const leadMap = new Map();

  records.forEach((record) => {
    const normalizedData = normalizeLeadFinderData(record);

    normalizedData.sources.forEach((source) => {
      sourceMap.set(source.id, chooseNewestLeadFinderRecord(sourceMap.get(source.id), source));
    });
    normalizedData.leads.forEach((lead) => {
      leadMap.set(lead.id, chooseNewestLeadFinderRecord(leadMap.get(lead.id), lead));
    });
  });

  return normalizeLeadFinderData({
    sources: Array.from(sourceMap.values()),
    leads: Array.from(leadMap.values()),
  });
}

export function normalizeLeadSources(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .filter(isPlainObject)
    .map((source) => normalizeLeadSource(source))
    .sort((a, b) => a.name.localeCompare(b.name) || getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt));
}

export function normalizeLeads(leads = []) {
  return (Array.isArray(leads) ? leads : [])
    .filter(isPlainObject)
    .map((lead) => normalizeLead(lead))
    .sort((a, b) => getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt));
}

export function normalizeLeadSource(source = {}) {
  const sourceRecord = isPlainObject(source) ? source : {};
  const now = new Date().toISOString();
  const createdAt = toSafeText(sourceRecord.createdAt) || now;
  const fallbackStatus = sourceRecord.active === false ? "Paused" : "Active";
  const sourceStatus = normalizeOption(sourceRecord.sourceStatus, LEAD_SOURCE_STATUSES, fallbackStatus);

  return {
    ...sourceRecord,
    id: toSafeText(sourceRecord.id) || createLeadFinderId("source"),
    name: toSafeText(sourceRecord.name),
    sourceType: normalizeOption(sourceRecord.sourceType, LEAD_SOURCE_TYPES, "Manual Entry"),
    url: toSafeText(sourceRecord.url),
    companyType: toSafeText(sourceRecord.companyType),
    locationFocus: toSafeText(sourceRecord.locationFocus),
    tradeFocus: toSafeText(sourceRecord.tradeFocus),
    active: sourceRecord.active !== false,
    notes: toSafeText(sourceRecord.notes),
    checkFrequency: normalizeOption(sourceRecord.checkFrequency, LEAD_SOURCE_CHECK_FREQUENCIES, "As Needed"),
    lastCheckedDate: toDateInputValue(sourceRecord.lastCheckedDate),
    nextCheckDate: toDateInputValue(sourceRecord.nextCheckDate),
    sourceStatus,
    sourcePriority: normalizeOption(sourceRecord.sourcePriority, LEAD_SOURCE_PRIORITIES, "Medium"),
    sourceNotes: toSafeText(sourceRecord.sourceNotes),
    defaultServiceType: normalizeOption(sourceRecord.defaultServiceType, LEAD_SERVICE_TYPES, "Other"),
    defaultCompanyMode: normalizeOption(sourceRecord.defaultCompanyMode, LEAD_SUGGESTED_COMPANY_MODES, "Unknown"),
    createdAt,
    updatedAt: toSafeText(sourceRecord.updatedAt) || createdAt,
  };
}

export function normalizeLead(lead = {}) {
  const leadRecord = isPlainObject(lead) ? lead : {};
  const now = new Date().toISOString();
  const createdAt = toSafeText(leadRecord.createdAt) || now;

  return {
    ...leadRecord,
    id: toSafeText(leadRecord.id) || createLeadFinderId("lead"),
    title: toSafeText(leadRecord.title),
    sourceId: toSafeText(leadRecord.sourceId),
    sourceName: toSafeText(leadRecord.sourceName),
    sourceUrl: toSafeText(leadRecord.sourceUrl),
    companyName: toSafeText(leadRecord.companyName),
    city: toSafeText(leadRecord.city),
    state: toSafeText(leadRecord.state).toUpperCase().slice(0, 2),
    serviceType: normalizeOption(leadRecord.serviceType, LEAD_SERVICE_TYPES, "Concrete"),
    projectType: toSafeText(leadRecord.projectType),
    dueDate: toDateInputValue(leadRecord.dueDate),
    contactName: toSafeText(leadRecord.contactName),
    contactEmail: toSafeText(leadRecord.contactEmail),
    contactPhone: toSafeText(leadRecord.contactPhone),
    description: toSafeText(leadRecord.description),
    estimatedValue: toNumberOrBlank(leadRecord.estimatedValue),
    capacityFit: toSafeText(leadRecord.capacityFit),
    aiFitScore: toNumberOrBlank(leadRecord.aiFitScore),
    aiFitLabel: normalizeOption(leadRecord.aiFitLabel, LEAD_AI_FIT_LABELS, ""),
    aiFitReason: toSafeText(leadRecord.aiFitReason),
    aiRisks: normalizeAiRisks(leadRecord.aiRisks),
    aiNextStep: toSafeText(leadRecord.aiNextStep),
    suggestedCompanyMode: normalizeOption(leadRecord.suggestedCompanyMode, LEAD_SUGGESTED_COMPANY_MODES, "Unknown"),
    scoreStatus: normalizeLeadScoreStatus(leadRecord),
    scoreSource: normalizeLeadScoreSource(leadRecord.scoreSource),
    scoredAt: toIsoDateTime(leadRecord.scoredAt),
    scoreError: toSafeText(leadRecord.scoreError),
    reviewStatus: normalizeOption(leadRecord.reviewStatus, LEAD_REVIEW_STATUSES, "Needs Review"),
    reviewedAt: toIsoDateTime(leadRecord.reviewedAt),
    reviewedBy: toSafeText(leadRecord.reviewedBy),
    status: normalizeOption(leadRecord.status, LEAD_STATUSES, "New"),
    notes: toSafeText(leadRecord.notes),
    estimateId: toSafeText(leadRecord.estimateId),
    proposalId: toSafeText(leadRecord.proposalId),
    packetId: toSafeText(leadRecord.packetId),
    contactId: toSafeText(leadRecord.contactId),
    handoffHistory: normalizeLeadHandoffHistory(leadRecord.handoffHistory),
    lastContactDate: toDateInputValue(leadRecord.lastContactDate),
    lastContactMethod: normalizeOption(leadRecord.lastContactMethod, LEAD_CONTACT_METHODS, ""),
    nextFollowUpDate: toDateInputValue(leadRecord.nextFollowUpDate),
    followUpStatus: normalizeOption(leadRecord.followUpStatus, LEAD_FOLLOW_UP_STATUSES, "Not Contacted"),
    contactNotes: toSafeText(leadRecord.contactNotes),
    noFollowUpReason: toSafeText(leadRecord.noFollowUpReason),
    missingInfoChecklist: normalizeTextList(leadRecord.missingInfoChecklist ?? leadRecord.missingInformation),
    criticalQuestions: normalizeTextList(leadRecord.criticalQuestions),
    recommendedPhotosOrDocs: normalizeTextList(leadRecord.recommendedPhotosOrDocs),
    missingInfoRiskFlags: normalizeTextList(leadRecord.missingInfoRiskFlags ?? leadRecord.riskFlags),
    proposalReadinessScore: clampScoreOrBlank(leadRecord.proposalReadinessScore),
    proposalReadinessLabel: normalizeOption(leadRecord.proposalReadinessLabel, LEAD_PROPOSAL_READINESS_LABELS, ""),
    missingInfoRecommendedNextStep: toSafeText(leadRecord.missingInfoRecommendedNextStep ?? leadRecord.recommendedNextStep),
    customerQuestionDraft: toSafeText(leadRecord.customerQuestionDraft),
    missingInfoLastCheckedAt: toIsoDateTime(leadRecord.missingInfoLastCheckedAt),
    missingInfoSource: normalizeLeadScoreSource(leadRecord.missingInfoSource),
    missingInfoStatus: normalizeOption(leadRecord.missingInfoStatus, LEAD_MISSING_INFO_STATUSES, "Not Checked"),
    createdAt,
    updatedAt: toSafeText(leadRecord.updatedAt) || createdAt,
  };
}

export function getLeadFinderBackupFileName(date = new Date()) {
  const backupDate = toDateInputValue(date instanceof Date ? date.toISOString() : date) || getTodayInputValue();
  return `lead-finder-backup-${backupDate}.json`;
}

export function createLeadFinderBackup(data = {}, options = {}) {
  const exportedAt = toSafeText(options.exportedAt) || new Date().toISOString();
  const sanitizedData = sanitizeLeadFinderBackupData(normalizeLeadFinderData(data));

  return {
    backupVersion: "1.0",
    source: "Last Yard Lead Finder",
    type: LEAD_FINDER_BACKUP_TYPE,
    exportedAt,
    sources: sanitizedData.sources,
    leads: sanitizedData.leads,
  };
}

export function parseLeadFinderBackupData(importedJson = {}) {
  const source =
    importedJson?.type === LEAD_FINDER_BACKUP_TYPE
      ? importedJson
      : importedJson?.leadFinder || importedJson?.companySettings?.leadFinder || importedJson;

  if (!isPlainObject(source)) {
    throw new Error("This file does not look like a Lead Finder backup.");
  }

  const sources = source.sources || source.leadSources;
  const leads = source.leads || source.leadRecords;

  if (!Array.isArray(sources) || !Array.isArray(leads)) {
    throw new Error("This file must include Lead Finder sources and leads arrays.");
  }

  return normalizeLeadFinderData(sanitizeLeadFinderBackupData({ sources, leads }));
}

export function previewLeadFinderBackupImport(importedJson = {}) {
  const data = parseLeadFinderBackupData(importedJson);

  return {
    data,
    counts: {
      sourcesFound: data.sources.length,
      leadsFound: data.leads.length,
    },
  };
}

export function mergeLeadFinderImportData(existingData = {}, importedData = {}) {
  const existing = normalizeLeadFinderData(existingData);
  const imported = normalizeLeadFinderData(importedData);
  const sourceIdMap = new Map();
  const existingSourceIds = new Set(existing.sources.map((source) => source.id));
  const existingLeadIds = new Set(existing.leads.map((lead) => lead.id));
  const sourceDuplicateMap = new Map();
  const leadDuplicateKeys = new Set(existing.leads.map((lead) => getLeadDuplicateKey(lead)).filter(Boolean));
  const sources = [...existing.sources];
  const leads = [...existing.leads];
  const summary = {
    sourcesFound: imported.sources.length,
    leadsFound: imported.leads.length,
    sourcesImported: 0,
    sourcesSkipped: 0,
    leadsImported: 0,
    leadsSkipped: 0,
  };

  existing.sources.forEach((source) => {
    const key = getLeadSourceDuplicateKey(source);

    if (key) {
      sourceDuplicateMap.set(key, source);
    }
  });

  imported.sources.forEach((source) => {
    const key = getLeadSourceDuplicateKey(source);
    const duplicateSource = key ? sourceDuplicateMap.get(key) : null;

    if (duplicateSource) {
      sourceIdMap.set(source.id, duplicateSource.id);
      summary.sourcesSkipped += 1;
      return;
    }

    const sourceId = existingSourceIds.has(source.id) ? createLeadFinderId("source") : source.id;
    const nextSource = normalizeLeadSource({
      ...source,
      id: sourceId,
    });

    sourceIdMap.set(source.id, nextSource.id);
    existingSourceIds.add(nextSource.id);
    sources.push(nextSource);

    if (key) {
      sourceDuplicateMap.set(key, nextSource);
    }

    summary.sourcesImported += 1;
  });

  imported.leads.forEach((lead) => {
    const sourceId = sourceIdMap.get(lead.sourceId) || lead.sourceId;
    const linkedSource = sources.find((source) => source.id === sourceId);
    const leadWithResolvedSource = normalizeLead({
      ...lead,
      sourceId,
      sourceName: linkedSource?.name || lead.sourceName,
      sourceUrl: linkedSource?.url || lead.sourceUrl,
    });
    const duplicateKey = getLeadDuplicateKey(leadWithResolvedSource);

    if (duplicateKey && leadDuplicateKeys.has(duplicateKey)) {
      summary.leadsSkipped += 1;
      return;
    }

    const leadId = existingLeadIds.has(leadWithResolvedSource.id) ? createLeadFinderId("lead") : leadWithResolvedSource.id;
    const nextLead = autoScoreLeadIfNeeded({
      ...leadWithResolvedSource,
      id: leadId,
    });

    existingLeadIds.add(nextLead.id);
    leads.push(nextLead);

    if (duplicateKey) {
      leadDuplicateKeys.add(duplicateKey);
    }

    summary.leadsImported += 1;
  });

  return {
    data: normalizeLeadFinderData({ sources, leads }),
    summary,
  };
}

export function getLeadFinderStarterSources() {
  return normalizeLeadSources(
    LEAD_FINDER_STARTER_SOURCE_PACK.map((source) => ({
      url: "",
      active: true,
      sourceStatus: "Active",
      sourceNotes: "Starter source pack item. Edit this source with real URLs, contacts, or notes as you develop it.",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...source,
    })),
  );
}

export function previewLeadFinderStarterSources(existingData = {}) {
  const { summary } = mergeLeadFinderImportData(existingData, {
    sources: getLeadFinderStarterSources(),
    leads: [],
  });

  return {
    totalSources: LEAD_FINDER_STARTER_SOURCE_COUNT,
    sourcesToAdd: summary.sourcesImported,
    sourcesSkipped: summary.sourcesSkipped,
  };
}

export function addLeadFinderStarterSources(existingData = {}) {
  const result = mergeLeadFinderImportData(existingData, {
    sources: getLeadFinderStarterSources(),
    leads: [],
  });

  return {
    data: result.data,
    summary: {
      totalSources: LEAD_FINDER_STARTER_SOURCE_COUNT,
      sourcesAdded: result.summary.sourcesImported,
      sourcesSkipped: result.summary.sourcesSkipped,
    },
  };
}

export function upsertLeadSource(data = {}, source = {}) {
  const normalizedData = normalizeLeadFinderData(data);
  const normalizedSource = normalizeLeadSource({
    ...source,
    updatedAt: new Date().toISOString(),
  });
  const sources = normalizeLeadSources([
    normalizedSource,
    ...normalizedData.sources.filter((item) => item.id !== normalizedSource.id),
  ]);

  return {
    ...normalizedData,
    sources,
    leads: normalizedData.leads.map((lead) =>
      lead.sourceId === normalizedSource.id
        ? {
            ...lead,
            sourceName: normalizedSource.name || lead.sourceName,
            sourceUrl: normalizedSource.url || lead.sourceUrl,
          }
        : lead,
    ),
  };
}

export function deactivateLeadSource(data = {}, sourceId = "") {
  const normalizedData = normalizeLeadFinderData(data);
  const now = new Date().toISOString();

  return {
    ...normalizedData,
    sources: normalizeLeadSources(
      normalizedData.sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              active: false,
              sourceStatus: "Paused",
              updatedAt: now,
            }
          : source,
      ),
    ),
  };
}

export function upsertLead(data = {}, lead = {}, sources = []) {
  const normalizedData = normalizeLeadFinderData(data);
  const sourceList = sources.length > 0 ? normalizeLeadSources(sources) : normalizedData.sources;
  const selectedSource = sourceList.find((source) => source.id === lead.sourceId);
  const normalizedLead = normalizeLead({
    ...lead,
    sourceName: selectedSource?.name || lead.sourceName,
    sourceUrl: selectedSource?.url || lead.sourceUrl,
    updatedAt: new Date().toISOString(),
  });

  return {
    sources: sourceList,
    leads: normalizeLeads([normalizedLead, ...normalizedData.leads.filter((item) => item.id !== normalizedLead.id)]),
  };
}

export function autoScoreLeadIfNeeded(lead = {}) {
  const normalizedLead = normalizeLead(lead);

  if (hasCompleteLeadScore(normalizedLead)) {
    return normalizedLead;
  }

  return applyLeadAiScore(normalizedLead, {
    ...scoreLeadWithLocalRules(normalizedLead),
    scoreSource: "rule_based",
  });
}

export function autoScoreLeadFinderData(data = {}) {
  const normalizedData = normalizeLeadFinderData(data);

  return {
    ...normalizedData,
    leads: normalizeLeads(normalizedData.leads.map((lead) => autoScoreLeadIfNeeded(lead))),
  };
}

export function scoreUnscoredLeads(data = {}) {
  const normalizedData = normalizeLeadFinderData(data);
  let scoredCount = 0;
  let skippedCount = 0;

  const leads = normalizedData.leads.map((lead) => {
    if (hasCompleteLeadScore(lead)) {
      skippedCount += 1;
      return lead;
    }

    scoredCount += 1;
    return autoScoreLeadIfNeeded(lead);
  });

  return {
    data: normalizeLeadFinderData({
      ...normalizedData,
      leads,
    }),
    summary: {
      scoredCount,
      skippedCount,
    },
  };
}

export function updateLeadStatus(data = {}, leadId = "", status = "New") {
  const normalizedStatus = normalizeOption(status, LEAD_STATUSES, "New");
  const now = new Date().toISOString();
  const normalizedData = normalizeLeadFinderData(data);

  return {
    ...normalizedData,
    leads: normalizeLeads(
      normalizedData.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: normalizedStatus,
              updatedAt: now,
            }
          : lead,
      ),
    ),
  };
}

export function updateLeadReviewStatus(data = {}, leadId = "", reviewStatus = "Needs Review", options = {}) {
  const normalizedReviewStatus = normalizeOption(reviewStatus, LEAD_REVIEW_STATUSES, "Needs Review");
  const now = toIsoDateTime(options.reviewedAt) || new Date().toISOString();
  const reviewedBy = toSafeText(options.reviewedBy);
  const normalizedData = normalizeLeadFinderData(data);

  return {
    ...normalizedData,
    leads: normalizeLeads(
      normalizedData.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              reviewStatus: normalizedReviewStatus,
              reviewedAt: ["Reviewed", "Rejected"].includes(normalizedReviewStatus) ? now : "",
              reviewedBy: ["Reviewed", "Rejected"].includes(normalizedReviewStatus) ? reviewedBy : "",
              updatedAt: now,
            }
          : lead,
      ),
    ),
  };
}

export function hasLeadAiScore(lead = {}) {
  return hasCompleteLeadScore(lead);
}

export function hasCompleteLeadScore(lead = {}) {
  const normalizedLead = normalizeLead(lead);

  return Boolean(
    toNumberOrBlank(normalizedLead.aiFitScore) !== "" &&
      toSafeText(normalizedLead.aiFitReason) &&
      normalizeLeadScoreSource(normalizedLead.scoreSource) &&
      toIsoDateTime(normalizedLead.scoredAt),
  );
}

export function hasPartialLeadScore(lead = {}) {
  return Boolean(
    toNumberOrBlank(lead.aiFitScore) !== "" ||
      toSafeText(lead.aiFitLabel) ||
      toSafeText(lead.aiFitReason) ||
      normalizeAiRisks(lead.aiRisks) ||
      toSafeText(lead.aiNextStep) ||
      normalizeLeadScoreSource(lead.scoreSource) ||
      toIsoDateTime(lead.scoredAt) ||
      (toSafeText(lead.suggestedCompanyMode) && toSafeText(lead.suggestedCompanyMode) !== "Unknown"),
  ) && !hasCompleteLeadScore(lead);
}

export function normalizeLeadAiScoreResult(result = {}) {
  const source = isPlainObject(result) ? result : {};
  const fitScore = source.aiFitScore ?? source.fitScore ?? source.score;
  const fitLabel = source.aiFitLabel ?? source.fitLabel ?? source.label;
  const fitReason = source.aiFitReason ?? source.fitReason ?? source.reason;
  const risks = source.aiRisks ?? source.risks;
  const nextStep = source.aiNextStep ?? source.nextStep;
  const companyMode = source.suggestedCompanyMode ?? source.companyMode ?? source.suggestedCompany ?? source.recommendedCompanyMode;

  return {
    aiFitScore: clampScore(fitScore),
    aiFitLabel: normalizeOption(fitLabel, LEAD_AI_FIT_LABELS, "Maybe"),
    aiFitReason: toSafeText(fitReason),
    aiRisks: normalizeAiRisks(risks),
    aiNextStep: toSafeText(nextStep),
    suggestedCompanyMode: normalizeOption(companyMode, LEAD_SUGGESTED_COMPANY_MODES, "Unknown"),
    scoreSource: normalizeLeadScoreSource(source.scoreSource),
    scoredAt: toIsoDateTime(source.scoredAt),
    scoreStatus: normalizeOption(source.scoreStatus, LEAD_SCORE_STATUSES, ""),
    scoreError: toSafeText(source.scoreError),
  };
}

export function normalizeLeadProposalDraftResult(result = {}) {
  const source = isPlainObject(result) ? result : {};

  return {
    proposalTitle: toSafeText(source.proposalTitle),
    clientName: toSafeText(source.clientName),
    projectLocation: toSafeText(source.projectLocation),
    customerSummary: toSafeText(source.customerSummary),
    scopeOfWork: normalizeTextList(source.scopeOfWork),
    inclusions: normalizeTextList(source.inclusions),
    exclusions: normalizeTextList(source.exclusions),
    assumptions: normalizeTextList(source.assumptions),
    scheduleNotes: toSafeText(source.scheduleNotes),
    missingInformation: normalizeTextList(source.missingInformation),
    internalRiskNotes: normalizeTextList(source.internalRiskNotes),
    recommendedNextStep: toSafeText(source.recommendedNextStep),
    followUpEmailDraft: toSafeText(source.followUpEmailDraft),
    followUpSmsDraft: toSafeText(source.followUpSmsDraft),
  };
}

export function normalizeLeadMissingInfoResult(result = {}) {
  const source = isPlainObject(result) ? result : {};

  return {
    missingInfoChecklist: normalizeTextList(source.missingInfoChecklist ?? source.missingInformation),
    criticalQuestions: normalizeTextList(source.criticalQuestions),
    recommendedPhotosOrDocs: normalizeTextList(source.recommendedPhotosOrDocs),
    missingInfoRiskFlags: normalizeTextList(source.missingInfoRiskFlags ?? source.riskFlags),
    proposalReadinessScore: clampScoreOrBlank(source.proposalReadinessScore),
    proposalReadinessLabel: normalizeOption(source.proposalReadinessLabel, LEAD_PROPOSAL_READINESS_LABELS, "Needs Info"),
    missingInfoRecommendedNextStep: toSafeText(source.missingInfoRecommendedNextStep ?? source.recommendedNextStep),
    customerQuestionDraft: toSafeText(source.customerQuestionDraft),
    missingInfoLastCheckedAt: toIsoDateTime(source.missingInfoLastCheckedAt),
    missingInfoSource: normalizeLeadScoreSource(source.missingInfoSource),
    missingInfoStatus: normalizeOption(source.missingInfoStatus, LEAD_MISSING_INFO_STATUSES, ""),
  };
}

export function applyLeadAiScore(lead = {}, result = {}) {
  const normalizedScore = normalizeLeadAiScoreResult(result);

  return normalizeLead({
    ...lead,
    ...normalizedScore,
    scoredAt: normalizedScore.scoredAt || new Date().toISOString(),
    scoreStatus: normalizedScore.scoreStatus || "scored",
    scoreError: normalizedScore.scoreError,
    updatedAt: new Date().toISOString(),
  });
}

export function applyLeadMissingInfoCheck(lead = {}, result = {}, source = "ai") {
  const normalizedResult = normalizeLeadMissingInfoResult(result);
  const checkedAt = normalizedResult.missingInfoLastCheckedAt || new Date().toISOString();
  const readinessStatus =
    normalizedResult.missingInfoStatus ||
    (normalizedResult.proposalReadinessLabel === "Ready"
      ? "Ready"
      : normalizedResult.proposalReadinessLabel === "Not Ready"
        ? "Not Ready"
        : "Needs Info");

  return normalizeLead({
    ...lead,
    ...normalizedResult,
    missingInfoLastCheckedAt: checkedAt,
    missingInfoSource: normalizedResult.missingInfoSource || source,
    missingInfoStatus: readinessStatus,
    updatedAt: new Date().toISOString(),
  });
}

export function markLeadMissingInfoRequested(lead = {}, options = {}) {
  const normalizedLead = normalizeLead(lead);
  const today = toDateInputValue(options.today) || getTodayInputValue();
  const now = new Date().toISOString();
  const note = toSafeText(options.note) || "Missing info was requested from the customer/source.";

  return normalizeLead({
    ...normalizedLead,
    missingInfoStatus: "Info Requested",
    followUpStatus: "Waiting on Response",
    lastContactDate: today,
    lastContactMethod: normalizeOption(options.contactMethod, LEAD_CONTACT_METHODS, normalizedLead.lastContactMethod || "Other"),
    nextFollowUpDate: addDaysToInputDate(today, 1),
    contactNotes: appendContactNote(normalizedLead.contactNotes, note, today),
    updatedAt: now,
  });
}

export function normalizeLeadHandoffHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .filter(isPlainObject)
    .map((record) => {
      const createdAt = toSafeText(record.createdAt) || new Date().toISOString();

      return {
        id: toSafeText(record.id) || createLeadFinderId("handoff"),
        type: toSafeText(record.type),
        recordId: toSafeText(record.recordId),
        label: toSafeText(record.label),
        status: toSafeText(record.status),
        notes: toSafeText(record.notes),
        createdAt,
        updatedAt: toSafeText(record.updatedAt) || createdAt,
      };
    })
    .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
}

export function applyLeadHandoff(lead = {}, handoff = {}) {
  const normalizedLead = normalizeLead(lead);
  const type = toSafeText(handoff.type);
  const recordId = toSafeText(handoff.recordId);
  const now = new Date().toISOString();
  const nextLead = {
    ...normalizedLead,
    updatedAt: now,
  };

  if (type === "residential_estimate") {
    nextLead.estimateId = recordId;
    nextLead.status = "Estimate Started";
  } else if (type === "commercial_proposal") {
    nextLead.proposalId = recordId;
    nextLead.status = "Proposal Started";
  } else if (type === "gc_packet") {
    nextLead.packetId = recordId;
    nextLead.status = "Proposal Started";
  } else if (type === "proposal_draft") {
    nextLead.proposalId = recordId;
    nextLead.status = "Proposal Started";
  } else if (type === "contact") {
    nextLead.contactId = recordId;
  }

  nextLead.handoffHistory = normalizeLeadHandoffHistory([
    {
      id: handoff.id || createLeadFinderId("handoff"),
      type,
      recordId,
      label: handoff.label,
      status: nextLead.status,
      notes: handoff.notes,
      createdAt: handoff.createdAt || now,
      updatedAt: now,
    },
    ...normalizedLead.handoffHistory,
  ]);

  return normalizeLead(nextLead);
}

export function applyLeadFollowUpQuickAction(lead = {}, action = "", options = {}) {
  const normalizedLead = normalizeLead(lead);
  const today = toDateInputValue(options.today) || getTodayInputValue();
  const now = new Date().toISOString();
  const nextLead = {
    ...normalizedLead,
    updatedAt: now,
  };

  if (action === "mark_contacted") {
    nextLead.lastContactDate = today;
    nextLead.followUpStatus = "Contacted";
  } else if (action === "follow_up_tomorrow") {
    nextLead.nextFollowUpDate = addDaysToInputDate(today, 1);
    nextLead.followUpStatus = "Follow-Up Needed";
  } else if (action === "follow_up_two_days") {
    nextLead.nextFollowUpDate = addDaysToInputDate(today, 2);
    nextLead.followUpStatus = "Follow-Up Needed";
  } else if (action === "waiting_on_response") {
    nextLead.followUpStatus = "Waiting on Response";
  } else if (action === "do_not_follow_up") {
    nextLead.followUpStatus = "Do Not Follow Up";
    nextLead.nextFollowUpDate = "";
    nextLead.noFollowUpReason = nextLead.noFollowUpReason || "No Thanks / Do Not Follow Up";
  }

  return normalizeLead(nextLead);
}

export function applyLeadSourceChecked(source = {}, options = {}) {
  const normalizedSource = normalizeLeadSource(source);
  const checkedDate = toDateInputValue(options.checkedDate || options.today) || getTodayInputValue();

  return normalizeLeadSource({
    ...normalizedSource,
    lastCheckedDate: checkedDate,
    nextCheckDate: calculateNextSourceCheckDate(normalizedSource.checkFrequency, checkedDate),
    updatedAt: new Date().toISOString(),
  });
}

export function markLeadSourceChecked(data = {}, sourceId = "", options = {}) {
  const normalizedData = normalizeLeadFinderData(data);

  return {
    ...normalizedData,
    sources: normalizeLeadSources(
      normalizedData.sources.map((source) => (source.id === sourceId ? applyLeadSourceChecked(source, options) : source)),
    ),
  };
}

export function calculateNextSourceCheckDate(checkFrequency = "As Needed", fromDate = "") {
  const checkedDate = toDateInputValue(fromDate) || getTodayInputValue();
  const frequency = normalizeOption(checkFrequency, LEAD_SOURCE_CHECK_FREQUENCIES, "As Needed");

  if (frequency === "Daily") {
    return addDaysToInputDate(checkedDate, 1);
  }

  if (frequency === "Every 2 Days") {
    return addDaysToInputDate(checkedDate, 2);
  }

  if (frequency === "Weekly") {
    return addDaysToInputDate(checkedDate, 7);
  }

  if (frequency === "Monthly") {
    return addMonthsToInputDate(checkedDate, 1);
  }

  return "";
}

export function scoreLeadWithLocalRules(lead = {}) {
  const normalizedLead = normalizeLead(lead);
  const text = [
    normalizedLead.title,
    normalizedLead.sourceName,
    normalizedLead.sourceUrl,
    normalizedLead.companyName,
    normalizedLead.city,
    normalizedLead.state,
    normalizedLead.serviceType,
    normalizedLead.projectType,
    normalizedLead.description,
    normalizedLead.notes,
  ]
    .join(" ")
    .toLowerCase();
  const missingInfo = [];

  if (!normalizedLead.title) {
    missingInfo.push("lead title");
  }
  if (!normalizedLead.city && !normalizedLead.state && !text.includes("oregon") && !text.includes("willamette")) {
    missingInfo.push("location");
  }
  if (!normalizedLead.serviceType || normalizedLead.serviceType === "Other") {
    missingInfo.push("service type");
  }
  if (!normalizedLead.description && !normalizedLead.notes) {
    missingInfo.push("scope description");
  }

  const serviceText = `${normalizedLead.serviceType} ${normalizedLead.projectType} ${text}`.toLowerCase();
  const cityText = `${normalizedLead.city} ${text}`.toLowerCase();
  const isOregon = normalizedLead.state === "OR" || text.includes("oregon");
  const isWillametteValley =
    cityText.includes("willamette") ||
    ["albany", "corvallis", "lebanon", "salem", "eugene", "springfield", "brownsville", "sweet home", "monmouth", "independence"].some((city) =>
      cityText.includes(city),
    );
  const liveYourFutureTrade = ["fencing", "decking", "siding", "exterior repair"].some((trade) => serviceText.includes(trade));
  const concreteTrade = ["concrete", "site concrete", "sidewalk", "ada", "ramp", "curb", "gutter", "slab"].some((trade) => serviceText.includes(trade));
  const wrongOrAvoidTrade = ["roof", "roofing", "framing", "window", "windows"].some((trade) => serviceText.includes(trade));
  const hugePublicWork =
    text.includes("bonded") ||
    text.includes("prevailing wage") ||
    text.includes("public works") ||
    text.includes("full gc") ||
    text.includes("prime contractor") ||
    text.includes("design-build");
  const risks = [];

  if (missingInfo.length > 0) {
    risks.push(`Missing info: ${missingInfo.join(", ")}.`);
  }
  if (hugePublicWork) {
    risks.push("May be bonded/public/full-GC work beyond the preferred lead profile.");
  }
  if (wrongOrAvoidTrade) {
    risks.push("Trade appears outside the current preferred scope.");
  }

  if (wrongOrAvoidTrade || hugePublicWork) {
    return normalizeLeadAiScoreResult({
      aiFitScore: missingInfo.length > 0 ? 35 : 25,
      aiFitLabel: "Bad Fit",
      aiFitReason: wrongOrAvoidTrade
        ? "Rule-based test score: trade appears outside the preferred fencing/decking/siding/exterior repair or concrete scopes."
        : "Rule-based test score: lead appears to involve large bonded/public/full-GC work.",
      aiRisks: risks.join("\n"),
      aiNextStep: "Clarify scope and only pursue if it can be handled as a narrow subcontracted package.",
      suggestedCompanyMode: hugePublicWork ? "General Contractor" : "Unknown",
      scoreSource: "rule_based",
    });
  }

  if (liveYourFutureTrade && isWillametteValley) {
    return normalizeLeadAiScoreResult({
      aiFitScore: missingInfo.length > 0 ? 72 : 88,
      aiFitLabel: missingInfo.length > 0 ? "Maybe" : "Good Fit",
      aiFitReason: "Rule-based test score: preferred Live Your Future trade in Albany/Willamette Valley service area.",
      aiRisks: risks.join("\n") || "Confirm access, timing, and scope size before committing.",
      aiNextStep: "Contact the lead, confirm scope details, and decide whether to start an estimate.",
      suggestedCompanyMode: "Live Your Future",
      scoreSource: "rule_based",
    });
  }

  if (concreteTrade && isOregon) {
    return normalizeLeadAiScoreResult({
      aiFitScore: missingInfo.length > 0 ? 68 : 84,
      aiFitLabel: missingInfo.length > 0 ? "Maybe" : "Good Fit",
      aiFitReason: "Rule-based test score: Oregon concrete/site concrete scope fits Last Yard Concrete.",
      aiRisks: risks.join("\n") || "Confirm bid path, access, quantities, schedule, and whether the work is subcontractor-friendly.",
      aiNextStep: "Review documents and contact the GC/source to confirm concrete scope and bid deadline.",
      suggestedCompanyMode: "Last Yard Concrete",
      scoreSource: "rule_based",
    });
  }

  return normalizeLeadAiScoreResult({
    aiFitScore: missingInfo.length > 0 ? 50 : 58,
    aiFitLabel: "Maybe",
    aiFitReason: "Rule-based test score: lead needs more qualification before it can be called a good fit.",
    aiRisks: risks.join("\n") || "Preferred company fit is not obvious from the current lead details.",
    aiNextStep: "Fill in missing trade, location, scope, deadline, and value details before pursuing.",
    suggestedCompanyMode: "Unknown",
    scoreSource: "rule_based",
  });
}

export function checkLeadMissingInfoWithLocalRules(lead = {}) {
  const normalizedLead = normalizeLead(lead);
  const text = [
    normalizedLead.title,
    normalizedLead.sourceName,
    normalizedLead.sourceUrl,
    normalizedLead.companyName,
    normalizedLead.city,
    normalizedLead.state,
    normalizedLead.serviceType,
    normalizedLead.projectType,
    normalizedLead.description,
    normalizedLead.aiFitReason,
    normalizedLead.aiRisks,
    normalizedLead.aiNextStep,
    normalizedLead.suggestedCompanyMode,
    normalizedLead.notes,
  ]
    .join(" ")
    .toLowerCase();
  const serviceText = `${normalizedLead.serviceType} ${normalizedLead.projectType} ${text}`.toLowerCase();
  const companyMode = inferMissingInfoCompanyMode(normalizedLead, serviceText);
  const isBadFit = normalizedLead.aiFitLabel === "Bad Fit";
  const missing = [];
  const questions = [];
  const photosOrDocs = [];
  const riskFlags = [];

  const addMissing = (item) => addUniqueText(missing, item);
  const addQuestion = (item) => addUniqueText(questions, item);
  const addPhotoOrDoc = (item) => addUniqueText(photosOrDocs, item);
  const addRisk = (item) => addUniqueText(riskFlags, item);

  if (!normalizedLead.title) {
    addMissing("Lead title / project name");
  }

  if (!normalizedLead.contactName && !normalizedLead.companyName) {
    addMissing(companyMode === "Last Yard Concrete" ? "GC/company contact name" : "Customer name");
    addQuestion(companyMode === "Last Yard Concrete" ? "Who is the GC or estimator contact for this scope?" : "Who should be listed as the customer/contact?");
  }

  if (!normalizedLead.contactEmail && !normalizedLead.contactPhone) {
    addMissing("Contact phone or email");
    addQuestion("What is the best phone number or email for follow-up?");
  }

  if (!normalizedLead.city && !normalizedLead.state) {
    addMissing(companyMode === "Last Yard Concrete" ? "Project address/location" : "Project address");
    addQuestion(companyMode === "Last Yard Concrete" ? "Where is the project located?" : "What is the project address?");
  } else if (!looksLikeSpecificAddress(text)) {
    addMissing("Specific project address");
    addQuestion("Can you send the exact project address?");
  }

  if (!normalizedLead.serviceType || normalizedLead.serviceType === "Other") {
    addMissing("Service type");
    addQuestion("Which trade/scope should this be estimated under?");
  }

  if (!normalizedLead.description && !normalizedLead.notes) {
    addMissing("Scope description");
    addQuestion("Can you send a short description of the work needed?");
  }

  if (companyMode === "Live Your Future") {
    addLiveYourFutureMissingInfo(normalizedLead, serviceText, { addMissing, addQuestion, addPhotoOrDoc, addRisk });
  } else if (companyMode === "Last Yard Concrete") {
    addLastYardConcreteMissingInfo(normalizedLead, serviceText, { addMissing, addQuestion, addPhotoOrDoc, addRisk });
  } else {
    addMissing("Company fit / trade path");
    addQuestion("Should this be handled by Live Your Future, Last Yard Concrete, or saved for later?");
    addRisk("Company fit is not clear from the lead details.");
  }

  if (isBadFit) {
    addRisk("Lead is currently scored Bad Fit; review carefully before starting a proposal.");
  }

  const readinessScore = calculateProposalReadinessScore(missing, questions, riskFlags, isBadFit);
  const readinessLabel = getProposalReadinessLabel(readinessScore, missing, questions, isBadFit);
  const recommendedNextStep = getMissingInfoRecommendedNextStep(readinessLabel, companyMode, isBadFit);

  return normalizeLeadMissingInfoResult({
    missingInfoChecklist: missing,
    criticalQuestions: questions,
    recommendedPhotosOrDocs: photosOrDocs,
    missingInfoRiskFlags: riskFlags,
    proposalReadinessScore: readinessScore,
    proposalReadinessLabel: readinessLabel,
    missingInfoRecommendedNextStep: recommendedNextStep,
    customerQuestionDraft: buildMissingInfoQuestionDraft(normalizedLead, companyMode, questions, photosOrDocs),
    missingInfoSource: "rule_based",
    missingInfoStatus: readinessLabel === "Ready" ? "Ready" : readinessLabel === "Not Ready" ? "Not Ready" : "Needs Info",
  });
}

export function getLeadFinderStats(data = {}, options = {}) {
  const { leads, sources } = normalizeLeadFinderData(data);
  const countStatus = (status) => leads.filter((lead) => lead.status === status).length;
  const countFollowUpStatus = (status) => leads.filter((lead) => lead.followUpStatus === status).length;
  const today = toDateInputValue(options.today) || getTodayInputValue();

  return {
    totalLeads: leads.length,
    newLeads: countStatus("New"),
    goodFitLeads: countStatus("Good Fit"),
    aiGoodFitLeads: leads.filter((lead) => lead.aiFitLabel === "Good Fit").length,
    aiMaybeLeads: leads.filter((lead) => lead.aiFitLabel === "Maybe").length,
    aiBadFitLeads: leads.filter((lead) => lead.aiFitLabel === "Bad Fit").length,
    newLeadsNeedingReview: leads.filter((lead) => lead.status === "New" && lead.reviewStatus === "Needs Review").length,
    unscoredLeads: leads.filter((lead) => !hasCompleteLeadScore(lead)).length,
    autoScoredToday: leads.filter((lead) => lead.scoreSource === "rule_based" && lead.scoredAt.slice(0, 10) === today).length,
    readyLeads: leads.filter((lead) => lead.proposalReadinessLabel === "Ready").length,
    leadsNeedingInfo: leads.filter((lead) => lead.proposalReadinessLabel === "Needs Info").length,
    notReadyLeads: leads.filter((lead) => lead.proposalReadinessLabel === "Not Ready").length,
    contactedLeads: countStatus("Contacted"),
    estimatesStarted: countStatus("Estimate Started"),
    proposalsStarted: countStatus("Proposal Started"),
    wonLeads: countStatus("Won"),
    lostLeads: countStatus("Lost"),
    followUpsDueToday: leads.filter((lead) => isLeadFollowUpDueToday(lead, { today })).length,
    overdueFollowUps: leads.filter((lead) => isLeadFollowUpOverdue(lead, { today })).length,
    waitingOnResponse: countFollowUpStatus("Waiting on Response"),
    noFollowUpLeads: leads.filter((lead) => ["No Thanks", "Do Not Follow Up"].includes(lead.followUpStatus)).length,
    sourcesDueToday: sources.filter((source) => isLeadSourceDueToday(source, { today })).length,
    overdueSources: sources.filter((source) => isLeadSourceOverdue(source, { today })).length,
    highPrioritySourcesDue: sources.filter((source) => source.sourcePriority === "High" && isLeadSourceDueOrOverdue(source, { today })).length,
    activeSources: sources.filter((source) => source.active && source.sourceStatus === "Active").length,
  };
}

export function getLeadReviewQueue(data = {}, filters = {}) {
  const normalizedData = normalizeLeadFinderData(data);
  const aiFitLabel = normalizeOption(filters.aiFitLabel, LEAD_AI_FIT_LABELS, "all");
  const companyMode = normalizeOption(filters.companyMode, LEAD_SUGGESTED_COMPANY_MODES, "all");
  const scoreSource = toSafeText(filters.scoreSource === undefined ? "all" : filters.scoreSource);
  const sourceId = toSafeText(filters.sourceId || "all");
  const serviceType = toSafeText(filters.serviceType || "all");
  const city = toSafeText(filters.city).toLowerCase();
  const readinessLabel = normalizeOption(filters.readinessLabel, LEAD_PROPOSAL_READINESS_LABELS, "all");
  const requestedReviewStatus = toSafeText(filters.reviewStatus || "Needs Review");
  const reviewStatus = requestedReviewStatus === "all" ? "all" : normalizeOption(requestedReviewStatus, LEAD_REVIEW_STATUSES, "Needs Review");

  return normalizedData.leads
    .filter((lead) => {
      const matchesReview = reviewStatus === "all" || lead.reviewStatus === reviewStatus;
      const matchesLabel = aiFitLabel === "all" || lead.aiFitLabel === aiFitLabel;
      const matchesCompany = companyMode === "all" || lead.suggestedCompanyMode === companyMode;
      const matchesScoreSource = scoreSource === "all" || lead.scoreSource === scoreSource;
      const matchesSource = sourceId === "all" || lead.sourceId === sourceId;
      const matchesService = serviceType === "all" || lead.serviceType === serviceType;
      const matchesCity = !city || lead.city.toLowerCase().includes(city);
      const matchesReadiness = readinessLabel === "all" || lead.proposalReadinessLabel === readinessLabel;

      return matchesReview && matchesLabel && matchesCompany && matchesScoreSource && matchesSource && matchesService && matchesCity && matchesReadiness;
    })
    .sort(compareLeadReviewQueueItems);
}

export function getLeadFinderCommandCenterData(data = {}, options = {}) {
  const normalizedData = normalizeLeadFinderData(data);
  const today = toDateInputValue(options.today) || getTodayInputValue();
  const stats = getLeadFinderStats(normalizedData, { today });
  const sourcesDueToday = normalizedData.sources.filter((source) => isLeadSourceDueToday(source, { today }));
  const overdueSources = normalizedData.sources.filter((source) => isLeadSourceOverdue(source, { today }));
  const sourcesToCheckToday = [...overdueSources, ...sourcesDueToday.filter((source) => !overdueSources.some((item) => item.id === source.id))].sort(
    compareLeadSourceCommandItems,
  );
  const leadsNeedingReview = getLeadReviewQueue(normalizedData, { reviewStatus: "Needs Review" });
  const leadsMissingInfo = normalizedData.leads
    .filter((lead) => ["Needs Info", "Not Ready"].includes(lead.proposalReadinessLabel))
    .sort(compareLeadMissingInfoItems);
  const followUpsDue = normalizedData.leads
    .filter((lead) => isLeadFollowUpDueToday(lead, { today }) || isLeadFollowUpOverdue(lead, { today }))
    .sort(compareLeadFollowUpCommandItems);
  const readyToBid = normalizedData.leads
    .filter((lead) => lead.aiFitLabel === "Good Fit" && (lead.proposalReadinessLabel === "Ready" || Number(lead.proposalReadinessScore) >= 80))
    .sort(compareLeadReadyCommandItems);

  return {
    stats,
    sourcesDueToday,
    overdueSources,
    sourcesToCheckToday,
    leadsNeedingReview,
    leadsMissingInfo,
    followUpsDue,
    readyToBid,
  };
}

export function filterLeadSources(sources = [], filters = {}) {
  const normalizedSources = normalizeLeadSources(sources);
  const due = SOURCE_DUE_FILTERS.has(filters.due) ? filters.due : "all";
  const priority = normalizeOption(filters.priority, LEAD_SOURCE_PRIORITIES, "all");
  const sourceType = normalizeOption(filters.sourceType, LEAD_SOURCE_TYPES, "all");
  const companyMode = normalizeOption(filters.companyMode, LEAD_SUGGESTED_COMPANY_MODES, "all");
  const sourceState = toSafeText(filters.sourceState || "all");

  return normalizedSources.filter((source) => {
    const matchesDue = matchesSourceDueFilter(source, due);
    const matchesPriority = priority === "all" || source.sourcePriority === priority;
    const matchesType = sourceType === "all" || source.sourceType === sourceType;
    const matchesCompany = companyMode === "all" || source.defaultCompanyMode === companyMode;
    const matchesState =
      sourceState === "all" ||
      (sourceState === "active" && source.active && source.sourceStatus === "Active") ||
      (sourceState === "paused" && (!source.active || source.sourceStatus === "Paused")) ||
      (sourceState === "needs_review" && source.sourceStatus === "Needs Review") ||
      (sourceState === "bad_source" && source.sourceStatus === "Bad Source");

    return matchesDue && matchesPriority && matchesType && matchesCompany && matchesState;
  });
}

export function filterLeadRecords(leads = [], filters = {}) {
  const normalizedLeads = normalizeLeads(leads);
  const status = toSafeText(filters.status || "all");
  const followUpStatus = toSafeText(filters.followUpStatus || "all");
  const followUpDue = FOLLOW_UP_DUE_FILTERS.has(filters.followUpDue) ? filters.followUpDue : "all";
  const serviceType = toSafeText(filters.serviceType || "all");
  const city = toSafeText(filters.city).toLowerCase();
  const sourceId = toSafeText(filters.sourceId || "all");
  const sort = LEAD_SORT_OPTIONS.has(filters.sort) ? filters.sort : "newest";
  const filtered = normalizedLeads.filter((lead) => {
    const matchesStatus = status === "all" || lead.status === status;
    const matchesFollowUpStatus = followUpStatus === "all" || lead.followUpStatus === followUpStatus;
    const matchesFollowUpDue = matchesFollowUpDueFilter(lead, followUpDue);
    const matchesService = serviceType === "all" || lead.serviceType === serviceType;
    const matchesCity = !city || lead.city.toLowerCase().includes(city);
    const matchesSource = sourceId === "all" || lead.sourceId === sourceId;

    return matchesStatus && matchesFollowUpStatus && matchesFollowUpDue && matchesService && matchesCity && matchesSource;
  });

  if (sort === "due_date") {
    return filtered.sort((a, b) => getDueDateSortValue(a) - getDueDateSortValue(b));
  }

  return filtered.sort((a, b) => getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt));
}

export function getLeadById(data = {}, leadId = "") {
  return normalizeLeadFinderData(data).leads.find((lead) => lead.id === leadId) || null;
}

export function getLeadSourceById(data = {}, sourceId = "") {
  return normalizeLeadFinderData(data).sources.find((source) => source.id === sourceId) || null;
}

export function isLeadFollowUpDueToday(lead = {}, options = {}) {
  const normalizedLead = normalizeLead(lead);

  if (!normalizedLead.nextFollowUpDate || CLOSED_FOLLOW_UP_STATUSES.has(normalizedLead.followUpStatus)) {
    return false;
  }

  return normalizedLead.nextFollowUpDate === (toDateInputValue(options.today) || getTodayInputValue());
}

export function isLeadFollowUpOverdue(lead = {}, options = {}) {
  const normalizedLead = normalizeLead(lead);

  if (!normalizedLead.nextFollowUpDate || CLOSED_FOLLOW_UP_STATUSES.has(normalizedLead.followUpStatus)) {
    return false;
  }

  return normalizedLead.nextFollowUpDate < (toDateInputValue(options.today) || getTodayInputValue());
}

export function isLeadSourceDueToday(source = {}, options = {}) {
  const normalizedSource = normalizeLeadSource(source);

  if (!isLeadSourceCheckable(normalizedSource) || !normalizedSource.nextCheckDate) {
    return false;
  }

  return normalizedSource.nextCheckDate === (toDateInputValue(options.today) || getTodayInputValue());
}

export function isLeadSourceOverdue(source = {}, options = {}) {
  const normalizedSource = normalizeLeadSource(source);

  if (!isLeadSourceCheckable(normalizedSource) || !normalizedSource.nextCheckDate) {
    return false;
  }

  return normalizedSource.nextCheckDate < (toDateInputValue(options.today) || getTodayInputValue());
}

export function isLeadSourceDueOrOverdue(source = {}, options = {}) {
  return isLeadSourceDueToday(source, options) || isLeadSourceOverdue(source, options);
}

function matchesFollowUpDueFilter(lead = {}, filter = "all") {
  if (filter === "all") {
    return true;
  }

  if (filter === "due_today") {
    return isLeadFollowUpDueToday(lead);
  }

  if (filter === "overdue") {
    return isLeadFollowUpOverdue(lead);
  }

  if (filter === "due_or_overdue") {
    return isLeadFollowUpDueToday(lead) || isLeadFollowUpOverdue(lead);
  }

  if (filter === "upcoming") {
    const normalizedLead = normalizeLead(lead);
    return Boolean(
      normalizedLead.nextFollowUpDate &&
        normalizedLead.nextFollowUpDate > getTodayInputValue() &&
        !CLOSED_FOLLOW_UP_STATUSES.has(normalizedLead.followUpStatus),
    );
  }

  if (filter === "none") {
    return !normalizeLead(lead).nextFollowUpDate;
  }

  return true;
}

function matchesSourceDueFilter(source = {}, filter = "all") {
  if (filter === "all") {
    return true;
  }

  if (filter === "due_today") {
    return isLeadSourceDueToday(source);
  }

  if (filter === "overdue") {
    return isLeadSourceOverdue(source);
  }

  if (filter === "due_or_overdue") {
    return isLeadSourceDueOrOverdue(source);
  }

  if (filter === "upcoming") {
    const normalizedSource = normalizeLeadSource(source);
    return Boolean(
      isLeadSourceCheckable(normalizedSource) &&
        normalizedSource.nextCheckDate &&
        normalizedSource.nextCheckDate > getTodayInputValue(),
    );
  }

  if (filter === "none") {
    return !normalizeLeadSource(source).nextCheckDate;
  }

  return true;
}

function isLeadSourceCheckable(source = {}) {
  const normalizedSource = normalizeLeadSource(source);

  return Boolean(normalizedSource.active && !["Paused", "Bad Source"].includes(normalizedSource.sourceStatus));
}

function inferMissingInfoCompanyMode(lead = {}, serviceText = "") {
  const normalizedMode = normalizeOption(lead.suggestedCompanyMode, LEAD_SUGGESTED_COMPANY_MODES, "Unknown");

  if (normalizedMode !== "Unknown") {
    return normalizedMode;
  }

  if (["concrete", "site concrete", "sidewalk", "ada", "ramp", "curb", "gutter", "slab"].some((term) => serviceText.includes(term))) {
    return "Last Yard Concrete";
  }

  if (["fencing", "fence", "decking", "deck", "siding", "exterior repair"].some((term) => serviceText.includes(term))) {
    return "Live Your Future";
  }

  return "Unknown";
}

function addLiveYourFutureMissingInfo(lead = {}, serviceText = "", helpers = {}) {
  const { addMissing, addQuestion, addPhotoOrDoc, addRisk } = helpers;

  if (!lead.estimatedValue) {
    addMissing("Budget range or approval to estimate");
    addQuestion("Is there a budget range or approval to prepare an estimate?");
  }

  if (!serviceText.match(/photo|image|picture/)) {
    addPhotoOrDoc("Current photos of the project area");
  }

  if (!serviceText.match(/measure|linear|lf|feet|ft|sq ft|square|length|height|size/)) {
    addMissing("Approximate measurements");
    addQuestion("What are the approximate measurements or size of the area?");
  }

  if (serviceText.includes("fenc")) {
    if (!serviceText.match(/height|6('| ft|ft)|4('| ft|ft)|cedar|wood|chain|vinyl|style|material/)) {
      addMissing("Fence height/material/style");
      addQuestion("What fence height, material, and style should be estimated?");
    }
  } else if (serviceText.includes("deck")) {
    if (!serviceText.match(/repair|replace|resurface|size|wood|composite|material|framing|rail/)) {
      addMissing("Deck size/material/repair scope");
      addQuestion("What is the deck size, material preference, and repair or replacement scope?");
    }
  } else if (serviceText.includes("siding")) {
    if (!serviceText.match(/area|damage|material|lap|panel|fiber|cedar|repair|replace/)) {
      addMissing("Siding area/material/damage scope");
      addQuestion("What siding area, material, and damage/repair scope should be included?");
    }
  } else {
    addMissing("Fence/deck/siding/exterior repair scope");
    addQuestion("Which exterior scope should be estimated?");
  }

  if (!serviceText.match(/demo|remove|haul|disposal/)) {
    addMissing("Demo/removal responsibility");
    addQuestion("Who is responsible for demo, removal, and haul-off?");
  }

  if (!serviceText.match(/access|staging|gate|yard|parking/)) {
    addMissing("Access/staging notes");
    addQuestion("Are there access, staging, parking, gate, or yard constraints?");
  }

  if (!lead.dueDate && !serviceText.match(/timeline|schedule|start|finish|asap/)) {
    addMissing("Timeline");
    addQuestion("What is the desired timeline?");
  }

  if (serviceText.match(/hoa|permit/)) {
    addRisk("Permit or HOA requirements may affect schedule and scope.");
  } else {
    addMissing("Permit/HOA concerns if relevant");
  }
}

function addLastYardConcreteMissingInfo(lead = {}, serviceText = "", helpers = {}) {
  const { addMissing, addQuestion, addPhotoOrDoc, addRisk } = helpers;

  if (!lead.dueDate && !serviceText.match(/due|bid date|deadline/)) {
    addMissing("Bid due date");
    addQuestion("What is the bid due date and time?");
  }

  if (!serviceText.match(/plan|spec|addenda|addendum|sheet|drawing/)) {
    addMissing("Plans/specs/addenda");
    addQuestion("Can you send the plans, specs, and current addenda?");
    addPhotoOrDoc("Plans, specs, addenda, and relevant plan sheets");
  }

  if (!serviceText.match(/scope limit|limits|include|exclude|site concrete|sidewalk|ada|curb|gutter|slab/)) {
    addMissing("Concrete scope limits");
    addQuestion("What concrete scopes are included and excluded?");
  }

  if (!serviceText.match(/quantity|quantities|cy|sf|lf|sq ft|square|linear|takeoff|plan sheet/)) {
    addMissing("Quantities or plan sheets");
    addQuestion("Are quantities available, or should Last Yard take off the plans?");
  }

  if (!serviceText.match(/demo|sawcut|remove|haul/)) {
    addMissing("Demo/sawcut responsibility");
    addQuestion("Who carries demo, sawcutting, removal, and haul-off?");
  }

  if (!serviceText.match(/excavat|base rock|rock|subgrade|prep/)) {
    addMissing("Excavation/base rock responsibility");
    addQuestion("Who carries excavation, subgrade prep, and base rock?");
  }

  if (!serviceText.match(/traffic|control|pedestrian|closure/)) {
    addMissing("Traffic control responsibility");
  }

  if (!serviceText.match(/schedule|phase|phasing|start|duration/)) {
    addMissing("Schedule/phasing");
    addQuestion("What is the project schedule and phasing?");
  }

  if (!serviceText.match(/access|staging|laydown|parking/)) {
    addMissing("Access/staging");
    addQuestion("What are the access, staging, laydown, and working-hour constraints?");
  }

  if (!serviceText.match(/testing|inspection|cylinder|special inspect/)) {
    addMissing("Testing/inspection responsibility");
  }

  if (!serviceText.match(/bond|insurance|public work|prevailing wage/)) {
    addMissing("Bond/insurance/public work requirements if relevant");
  } else {
    addRisk("Bond, insurance, public work, or prevailing wage requirements need review before bidding.");
  }
}

function calculateProposalReadinessScore(missing = [], questions = [], riskFlags = [], isBadFit = false) {
  const score = 100 - missing.length * 4 - questions.length * 3 - riskFlags.length * 5 - (isBadFit ? 35 : 0);
  return Math.min(100, Math.max(0, Math.round(score)));
}

function getProposalReadinessLabel(score = 0, missing = [], questions = [], isBadFit = false) {
  if (isBadFit || score < 20) {
    return "Not Ready";
  }

  if (score >= 80 && missing.length === 0 && questions.length <= 1) {
    return "Ready";
  }

  return "Needs Info";
}

function getMissingInfoRecommendedNextStep(readinessLabel = "Needs Info", companyMode = "Unknown", isBadFit = false) {
  if (isBadFit || readinessLabel === "Not Ready") {
    return "Review fit before spending estimating time. Reject or save for later unless the scope changes.";
  }

  if (readinessLabel === "Ready") {
    return "Ready for human review and estimate/proposal setup. Do not send without final scope and pricing review.";
  }

  return companyMode === "Last Yard Concrete"
    ? "Ask the GC/source for missing bid documents, scope limits, quantities, schedule, and responsibilities before pricing."
    : "Ask the customer for missing address, photos, measurements, material choices, access, and timeline before pricing.";
}

function buildMissingInfoQuestionDraft(lead = {}, companyMode = "Unknown", questions = [], photosOrDocs = []) {
  const recipient = lead.contactName || (companyMode === "Last Yard Concrete" ? "there" : "there");
  const intro =
    companyMode === "Last Yard Concrete"
      ? `Hi ${recipient}, thanks for the opportunity. Before we price this concrete scope, can you send or confirm:`
      : `Hi ${recipient}, thanks for reaching out. Before we prepare an estimate, can you send or confirm:`;
  const combinedQuestions = [...questions, ...photosOrDocs.map((item) => `Please send ${item.toLowerCase()}.`)]
    .map((item) => toSafeText(item).replace(/\?$/, ""))
    .filter(Boolean)
    .slice(0, 6);

  if (combinedQuestions.length === 0) {
    return companyMode === "Last Yard Concrete"
      ? "Hi there, thanks for the opportunity. I have enough to begin review, and I will follow up if any scope or plan details need clarification."
      : "Hi there, thanks for reaching out. I have enough to begin review, and I will follow up if any scope details need clarification.";
  }

  return `${intro}\n- ${combinedQuestions.join("\n- ")}\n\nThanks.`;
}

function looksLikeSpecificAddress(text = "") {
  return /\b\d{2,6}\s+[a-z0-9.'-]+/i.test(text);
}

function addUniqueText(items = [], value = "") {
  const text = toSafeText(value);

  if (text && !items.includes(text)) {
    items.push(text);
  }
}

function appendContactNote(existingNotes = "", note = "", date = getTodayInputValue()) {
  const nextNote = toSafeText(note);
  const existing = toSafeText(existingNotes);

  if (!nextNote) {
    return existing;
  }

  const stampedNote = `${date}: ${nextNote}`;
  return existing ? `${existing}\n${stampedNote}` : stampedNote;
}

function sanitizeLeadFinderBackupData(data = {}) {
  const normalizedData = normalizeLeadFinderData(data);

  return {
    sources: normalizedData.sources.map((source) => sanitizeLeadFinderBackupRecord(source)),
    leads: normalizedData.leads.map((lead) => sanitizeLeadFinderBackupRecord(lead)),
  };
}

function sanitizeLeadFinderBackupRecord(record = {}) {
  if (Array.isArray(record)) {
    return record.map((item) => sanitizeLeadFinderBackupRecord(item)).filter((item) => item !== undefined);
  }

  if (!isPlainObject(record)) {
    return record;
  }

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !isSensitiveBackupFieldName(key))
      .map(([key, value]) => [key, sanitizeLeadFinderBackupRecord(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function isSensitiveBackupFieldName(key = "") {
  return /(^|_|\b)(api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|service[-_]?role|authorization|password|secret|session)(\b|_)?/i.test(
    String(key),
  );
}

function getLeadSourceDuplicateKey(source = {}) {
  const normalizedSource = normalizeLeadSource(source);
  const name = toDuplicateText(normalizedSource.name);
  const url = toDuplicateText(getLeadSourceOpenUrl(normalizedSource.url) || normalizedSource.url);

  return name || url ? `${name}|${url}` : "";
}

function getLeadDuplicateKey(lead = {}) {
  const normalizedLead = normalizeLead(lead);
  const title = toDuplicateText(normalizedLead.title);
  const company = toDuplicateText(normalizedLead.companyName || normalizedLead.contactName);
  const city = toDuplicateText(normalizedLead.city);
  const state = toDuplicateText(normalizedLead.state);
  const source = toDuplicateText(normalizedLead.sourceId || normalizedLead.sourceName || getLeadSourceOpenUrl(normalizedLead.sourceUrl) || normalizedLead.sourceUrl);

  if (!title || !(company || city || source)) {
    return "";
  }

  return [title, company, city, state, source].join("|");
}

function toDuplicateText(value = "") {
  return toSafeText(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeOption(value = "", options = [], fallback = "") {
  const text = toSafeText(value);
  return options.includes(text) ? text : fallback;
}

function toSafeText(value = "") {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function toNumberOrBlank(value) {
  if (value === "" || value == null) {
    return "";
  }

  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : "";
}

function clampScore(value) {
  const parsed = Number(String(value ?? "").replace(/[$,]/g, ""));

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function clampScoreOrBlank(value) {
  if (value === "" || value == null) {
    return "";
  }

  return clampScore(value);
}

function normalizeAiRisks(value = "") {
  if (Array.isArray(value)) {
    return value.map((item) => toSafeText(item)).filter(Boolean).join("\n");
  }

  return toSafeText(value);
}

function normalizeLeadScoreSource(value = "") {
  const text = toSafeText(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (text === "ai" || text === "openai" || text === "live_ai") {
    return "ai";
  }

  if (text === "rule_based" || text === "rules" || text === "local_rules" || text === "rule_based_test_score") {
    return "rule_based";
  }

  return "";
}

function normalizeLeadScoreStatus(leadRecord = {}) {
  const explicitStatus = normalizeOption(leadRecord.scoreStatus, LEAD_SCORE_STATUSES, "");

  if (explicitStatus === "error") {
    return "error";
  }

  if (hasCompleteLeadScoreRecord(leadRecord)) {
    return "scored";
  }

  if (hasPartialLeadScoreRecord(leadRecord)) {
    return "partial";
  }

  return "unscored";
}

function hasCompleteLeadScoreRecord(leadRecord = {}) {
  return Boolean(
    toNumberOrBlank(leadRecord.aiFitScore) !== "" &&
      toSafeText(leadRecord.aiFitReason ?? leadRecord.fitReason ?? leadRecord.reason) &&
      normalizeLeadScoreSource(leadRecord.scoreSource) &&
      toIsoDateTime(leadRecord.scoredAt),
  );
}

function hasPartialLeadScoreRecord(leadRecord = {}) {
  return Boolean(
    toNumberOrBlank(leadRecord.aiFitScore) !== "" ||
      toSafeText(leadRecord.aiFitLabel ?? leadRecord.fitLabel ?? leadRecord.label) ||
      toSafeText(leadRecord.aiFitReason ?? leadRecord.fitReason ?? leadRecord.reason) ||
      normalizeAiRisks(leadRecord.aiRisks ?? leadRecord.risks) ||
      toSafeText(leadRecord.aiNextStep ?? leadRecord.nextStep) ||
      normalizeLeadScoreSource(leadRecord.scoreSource) ||
      toIsoDateTime(leadRecord.scoredAt) ||
      (toSafeText(leadRecord.suggestedCompanyMode ?? leadRecord.companyMode) && toSafeText(leadRecord.suggestedCompanyMode ?? leadRecord.companyMode) !== "Unknown"),
  );
}

function compareLeadReviewQueueItems(a = {}, b = {}) {
  const labelOrder = {
    "Good Fit": 0,
    Maybe: 1,
    "": 2,
    "Bad Fit": 3,
  };
  const reviewOrder = {
    "Needs Review": 0,
    "Saved for Later": 1,
    Reviewed: 2,
    Rejected: 3,
  };
  const labelDelta = (labelOrder[a.aiFitLabel] ?? 2) - (labelOrder[b.aiFitLabel] ?? 2);

  if (labelDelta !== 0) {
    return labelDelta;
  }

  const reviewDelta = (reviewOrder[a.reviewStatus] ?? 0) - (reviewOrder[b.reviewStatus] ?? 0);

  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  return getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt);
}

function compareLeadSourceCommandItems(a = {}, b = {}) {
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const dateDelta = getInputDateSortValue(a.nextCheckDate) - getInputDateSortValue(b.nextCheckDate);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  return (priorityOrder[a.sourcePriority] ?? 1) - (priorityOrder[b.sourcePriority] ?? 1) || a.name.localeCompare(b.name);
}

function compareLeadMissingInfoItems(a = {}, b = {}) {
  const labelOrder = { "Needs Info": 0, "Not Ready": 1 };
  const labelDelta = (labelOrder[a.proposalReadinessLabel] ?? 2) - (labelOrder[b.proposalReadinessLabel] ?? 2);

  if (labelDelta !== 0) {
    return labelDelta;
  }

  return getTimeValue(b.missingInfoLastCheckedAt || b.updatedAt || b.createdAt) - getTimeValue(a.missingInfoLastCheckedAt || a.updatedAt || a.createdAt);
}

function compareLeadFollowUpCommandItems(a = {}, b = {}) {
  return getInputDateSortValue(a.nextFollowUpDate) - getInputDateSortValue(b.nextFollowUpDate) || getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt);
}

function compareLeadReadyCommandItems(a = {}, b = {}) {
  return (Number(b.proposalReadinessScore) || 0) - (Number(a.proposalReadinessScore) || 0) || (Number(b.aiFitScore) || 0) - (Number(a.aiFitScore) || 0);
}

function normalizeTextList(value = []) {
  if (Array.isArray(value)) {
    return value.map((item) => toSafeText(item)).filter(Boolean);
  }

  const text = toSafeText(value);
  return text ? [text] : [];
}

function toDateInputValue(value = "") {
  const text = toSafeText(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);

  if (!Number.isFinite(date.valueOf())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value = "") {
  const text = toSafeText(value);

  if (!text) {
    return "";
  }

  const date = new Date(text);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : "";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToInputDate(value = "", days = 0) {
  const inputDate = toDateInputValue(value) || getTodayInputValue();
  const date = new Date(`${inputDate}T00:00:00`);

  if (!Number.isFinite(date.valueOf())) {
    return inputDate;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonthsToInputDate(value = "", months = 0) {
  const inputDate = toDateInputValue(value) || getTodayInputValue();
  const date = new Date(`${inputDate}T00:00:00`);

  if (!Number.isFinite(date.valueOf())) {
    return inputDate;
  }

  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function getTimeValue(value = "") {
  const timestamp = new Date(value || "").valueOf();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDueDateSortValue(lead = {}) {
  if (!lead.dueDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(`${lead.dueDate}T00:00:00`).valueOf();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function getInputDateSortValue(value = "") {
  const inputDate = toDateInputValue(value);

  if (!inputDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(`${inputDate}T00:00:00`).valueOf();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function chooseNewestLeadFinderRecord(currentRecord, nextRecord) {
  if (!currentRecord) {
    return nextRecord;
  }

  return getTimeValue(nextRecord.updatedAt || nextRecord.createdAt) >= getTimeValue(currentRecord.updatedAt || currentRecord.createdAt)
    ? nextRecord
    : currentRecord;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
