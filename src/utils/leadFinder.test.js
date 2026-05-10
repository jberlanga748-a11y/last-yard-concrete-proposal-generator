import assert from "node:assert/strict";
import test from "node:test";

import {
  LEAD_CONTACT_METHODS,
  LEAD_FOLLOW_UP_STATUSES,
  LEAD_SOURCE_CHECK_FREQUENCIES,
  LEAD_SOURCE_PRIORITIES,
  LEAD_SOURCE_STATUSES,
  LEAD_SERVICE_TYPES,
  LEAD_SOURCE_TYPES,
  LEAD_STATUSES,
  LEAD_FINDER_STARTER_SOURCE_COUNT,
  addLeadFinderStarterSources,
  applyLeadAiScore,
  applyLeadFollowUpQuickAction,
  applyLeadHandoff,
  applyLeadSourceChecked,
  calculateNextSourceCheckDate,
  createEmptyLead,
  createLeadFinderBackup,
  createLeadFromSource,
  createEmptyLeadSource,
  deactivateLeadSource,
  filterLeadSources,
  filterLeadRecords,
  getLeadFinderBackupFileName,
  getLeadFinderStarterSources,
  getLeadFinderStats,
  getLeadSourceOpenUrl,
  hasLeadAiScore,
  isLeadFollowUpOverdue,
  isLeadSourceOverdue,
  markLeadSourceChecked,
  mergeLeadFinderImportData,
  mergeLeadFinderData,
  normalizeLead,
  normalizeLeadAiScoreResult,
  normalizeLeadFinderData,
  normalizeLeadHandoffHistory,
  normalizeLeadProposalDraftResult,
  normalizeLeadSource,
  parseLeadFinderBackupData,
  previewLeadFinderStarterSources,
  previewLeadFinderBackupImport,
  scoreLeadWithLocalRules,
  upsertLead,
  upsertLeadSource,
  updateLeadStatus,
} from "./leadFinder.js";

test("lead finder constants include requested statuses, service types, and source types", () => {
  assert.deepEqual(LEAD_STATUSES, [
    "New",
    "Good Fit",
    "Maybe",
    "Bad Fit",
    "Contacted",
    "Estimate Started",
    "Proposal Started",
    "Won",
    "Lost",
  ]);
  assert.ok(LEAD_SERVICE_TYPES.includes("ADA Ramp"));
  assert.ok(LEAD_SERVICE_TYPES.includes("Curb/Gutter"));
  assert.ok(LEAD_SOURCE_TYPES.includes("GC Bid Page"));
  assert.ok(LEAD_SOURCE_TYPES.includes("Manual Entry"));
  assert.ok(LEAD_FOLLOW_UP_STATUSES.includes("Waiting on Response"));
  assert.ok(LEAD_FOLLOW_UP_STATUSES.includes("Do Not Follow Up"));
  assert.ok(LEAD_CONTACT_METHODS.includes("Text"));
  assert.ok(LEAD_SOURCE_CHECK_FREQUENCIES.includes("Every 2 Days"));
  assert.ok(LEAD_SOURCE_STATUSES.includes("Needs Review"));
  assert.ok(LEAD_SOURCE_PRIORITIES.includes("High"));
});

test("normalizes lead source and lead records with safe defaults", () => {
  const source = createEmptyLeadSource({ name: "GC Bid Board", sourceType: "GC Bid Page" });
  const lead = createEmptyLead({ title: "Apartment sidewalk repairs", sourceId: source.id, estimatedValue: "$12,500" });

  assert.equal(source.active, true);
  assert.equal(source.sourceType, "GC Bid Page");
  assert.equal(source.checkFrequency, "As Needed");
  assert.equal(source.sourceStatus, "Active");
  assert.equal(source.sourcePriority, "Medium");
  assert.equal(source.defaultServiceType, "Other");
  assert.equal(source.defaultCompanyMode, "Unknown");
  assert.equal(lead.status, "New");
  assert.equal(lead.serviceType, "Concrete");
  assert.equal(lead.estimatedValue, 12500);
  assert.equal(lead.aiFitLabel, "");
  assert.equal(lead.suggestedCompanyMode, "Unknown");
  assert.equal(lead.scoreSource, "");
  assert.equal(lead.scoredAt, "");
  assert.equal(lead.estimateId, "");
  assert.deepEqual(lead.handoffHistory, []);
  assert.equal(lead.followUpStatus, "Not Contacted");
  assert.equal(lead.lastContactDate, "");
  assert.equal(lead.nextFollowUpDate, "");
});

test("normalizes and applies AI scoring fields conservatively", () => {
  const score = normalizeLeadAiScoreResult({
    aiFitScore: 112.8,
    aiFitLabel: "Great",
    aiFitReason: "Good concrete scope, but confirm documents.",
    aiRisks: ["Missing due date", "Confirm Oregon location"],
    aiNextStep: "Call the GC contact.",
    suggestedCompanyMode: "Last Yard Concrete",
    scoreSource: "ai",
    scoredAt: "2026-05-09T12:00:00.000Z",
  });
  const lead = applyLeadAiScore(createEmptyLead({ id: "lead-ai", title: "ADA ramp", serviceType: "ADA Ramp" }), score);

  assert.equal(score.aiFitScore, 100);
  assert.equal(score.aiFitLabel, "Maybe");
  assert.equal(score.aiRisks, "Missing due date\nConfirm Oregon location");
  assert.equal(lead.aiFitScore, 100);
  assert.equal(lead.aiFitLabel, "Maybe");
  assert.equal(lead.suggestedCompanyMode, "Last Yard Concrete");
  assert.equal(lead.scoreSource, "ai");
  assert.equal(lead.scoredAt, "2026-05-09T12:00:00.000Z");
  assert.equal(hasLeadAiScore(lead), true);
  assert.equal(hasLeadAiScore(createEmptyLead()), false);
});

test("normalizes alternate live AI scoring keys into persisted lead fields", () => {
  const score = normalizeLeadAiScoreResult({
    score: 73.4,
    label: "Good Fit",
    reason: "Sidewalk replacement in Oregon is a likely Last Yard fit.",
    risks: ["Confirm quantities", "Confirm bid path"],
    nextStep: "Request plans and schedule details.",
    companyMode: "Last Yard Concrete",
    scoreSource: "live-ai",
  });
  const lead = applyLeadAiScore(createEmptyLead({ id: "lead-alias", title: "Sidewalk lead" }), score);
  const reloaded = normalizeLead({ ...lead });

  assert.equal(score.aiFitScore, 73);
  assert.equal(score.aiFitLabel, "Good Fit");
  assert.equal(score.aiFitReason, "Sidewalk replacement in Oregon is a likely Last Yard fit.");
  assert.equal(score.aiRisks, "Confirm quantities\nConfirm bid path");
  assert.equal(score.aiNextStep, "Request plans and schedule details.");
  assert.equal(score.suggestedCompanyMode, "Last Yard Concrete");
  assert.equal(score.scoreSource, "ai");
  assert.equal(reloaded.aiFitReason, "Sidewalk replacement in Oregon is a likely Last Yard fit.");
  assert.equal(reloaded.aiRisks, "Confirm quantities\nConfirm bid path");
  assert.equal(reloaded.aiNextStep, "Request plans and schedule details.");
  assert.equal(reloaded.suggestedCompanyMode, "Last Yard Concrete");
  assert.equal(reloaded.scoreSource, "ai");
  assert.match(reloaded.scoredAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("normalizes AI proposal draft fields without inventing missing data", () => {
  const draft = normalizeLeadProposalDraftResult({
    proposalTitle: "Sidewalk Repair",
    clientName: "Albany Apartments",
    projectLocation: "Albany, OR",
    customerSummary: "Customer-facing summary.",
    scopeOfWork: ["Replace damaged sidewalk panels", ""],
    inclusions: "Concrete placement after review",
    exclusions: ["Permits unless confirmed"],
    assumptions: ["Access provided"],
    scheduleNotes: "Schedule after scope confirmation.",
    missingInformation: ["Measurements"],
    internalRiskNotes: ["Confirm trip hazards"],
    recommendedNextStep: "Request photos.",
    followUpEmailDraft: "Please send photos.",
    followUpSmsDraft: "Can you send photos?",
  });

  assert.equal(draft.proposalTitle, "Sidewalk Repair");
  assert.deepEqual(draft.scopeOfWork, ["Replace damaged sidewalk panels"]);
  assert.deepEqual(draft.inclusions, ["Concrete placement after review"]);
  assert.deepEqual(draft.missingInformation, ["Measurements"]);
  assert.equal(normalizeLeadProposalDraftResult({}).proposalTitle, "");
});

test("rule-based test scoring handles Live Your Future and Last Yard good-fit leads", () => {
  const lyfScore = scoreLeadWithLocalRules({
    title: "Albany fence repair",
    city: "Albany",
    state: "OR",
    serviceType: "Fencing",
    description: "Residential cedar fence repair.",
  });
  const concreteScore = scoreLeadWithLocalRules({
    title: "Salem ADA ramp replacement",
    city: "Salem",
    state: "OR",
    serviceType: "ADA Ramp",
    description: "Concrete ADA ramp demo and replacement.",
  });

  assert.equal(lyfScore.aiFitLabel, "Good Fit");
  assert.equal(lyfScore.suggestedCompanyMode, "Live Your Future");
  assert.equal(lyfScore.scoreSource, "rule_based");
  assert.match(lyfScore.aiFitReason, /Rule-based test score/);
  assert.equal(concreteScore.aiFitLabel, "Good Fit");
  assert.equal(concreteScore.suggestedCompanyMode, "Last Yard Concrete");
  assert.equal(concreteScore.scoreSource, "rule_based");
});

test("rule-based test scoring is conservative for missing or bad-fit details", () => {
  const missingScore = scoreLeadWithLocalRules({ title: "Possible project", serviceType: "Other" });
  const badScore = scoreLeadWithLocalRules({
    title: "Bonded public roofing project",
    city: "Portland",
    state: "OR",
    serviceType: "Other",
    description: "Large bonded public works roofing and framing prime contractor job.",
  });

  assert.equal(missingScore.aiFitLabel, "Maybe");
  assert.match(missingScore.aiRisks, /Missing info/);
  assert.equal(badScore.aiFitLabel, "Bad Fit");
  assert.match(badScore.aiRisks, /bonded|public|preferred scope/i);
});

test("upserts sources and leads while preserving source display metadata", () => {
  const source = createEmptyLeadSource({
    id: "source-1",
    name: "Property Manager",
    sourceType: "Property Manager",
    url: "https://example.test/leads",
  });
  const dataWithSource = upsertLeadSource(normalizeLeadFinderData(), source);
  const dataWithLead = upsertLead(
    dataWithSource,
    normalizeLead({
      id: "lead-1",
      title: "Deck repair",
      sourceId: "source-1",
      serviceType: "Decking",
    }),
  );

  assert.equal(dataWithLead.sources.length, 1);
  assert.equal(dataWithLead.leads.length, 1);
  assert.equal(dataWithLead.leads[0].sourceName, "Property Manager");
  assert.equal(dataWithLead.leads[0].sourceUrl, "https://example.test/leads");
});

test("merges Lead Finder data from root and nested company settings paths", () => {
  const rootData = normalizeLeadFinderData({
    sources: [{ id: "source-root", name: "Root Source", updatedAt: "2026-01-01T00:00:00.000Z" }],
    leads: [{ id: "lead-shared", title: "Old title", updatedAt: "2026-01-01T00:00:00.000Z" }],
  });
  const companyData = normalizeLeadFinderData({
    sources: [{ id: "source-company", name: "Company Source", updatedAt: "2026-01-02T00:00:00.000Z" }],
    leads: [{ id: "lead-shared", title: "New title", updatedAt: "2026-01-03T00:00:00.000Z" }],
  });

  const merged = mergeLeadFinderData(rootData, companyData);

  assert.equal(merged.sources.length, 2);
  assert.equal(merged.leads.length, 1);
  assert.equal(merged.leads[0].title, "New title");
});

test("Lead Finder export returns only Lead Finder data without secrets", () => {
  const backup = createLeadFinderBackup(
    {
      sources: [
        {
          id: "source-export",
          name: "GC Board",
          url: "https://example.test",
          checkFrequency: "Daily",
          sourcePriority: "High",
          apiKey: "secret-source-key",
          futureSourceField: "keep me",
        },
      ],
      leads: [
        {
          id: "lead-export",
          title: "Sidewalk",
          companyName: "Owner",
          city: "Albany",
          sourceId: "source-export",
          aiFitScore: 88,
          aiFitReason: "Good concrete fit.",
          estimateId: "estimate-1",
          nextFollowUpDate: "2026-05-10",
          accessToken: "secret-lead-token",
          futureLeadField: { safe: true },
        },
      ],
      unrelatedAppData: [{ id: "proposal-1" }],
    },
    { exportedAt: "2026-05-09T12:00:00.000Z" },
  );
  const serialized = JSON.stringify(backup);

  assert.equal(backup.type, "lead_finder_backup");
  assert.equal(getLeadFinderBackupFileName("2026-05-09"), "lead-finder-backup-2026-05-09.json");
  assert.equal(backup.sources.length, 1);
  assert.equal(backup.leads.length, 1);
  assert.equal(backup.sources[0].futureSourceField, "keep me");
  assert.equal(backup.leads[0].futureLeadField.safe, true);
  assert.equal(backup.unrelatedAppData, undefined);
  assert.doesNotMatch(serialized, /secret-source-key|secret-lead-token|apiKey|accessToken/);
});

test("Lead Finder import validates JSON shape and reports counts", () => {
  assert.throws(() => parseLeadFinderBackupData({ proposals: [] }), /sources and leads arrays/);

  const preview = previewLeadFinderBackupImport({
    type: "lead_finder_backup",
    sources: [{ id: "source-import", name: "Builder Page" }],
    leads: [{ id: "lead-import", title: "Deck", companyName: "Builder", city: "Albany" }],
  });

  assert.equal(preview.counts.sourcesFound, 1);
  assert.equal(preview.counts.leadsFound, 1);
  assert.equal(preview.data.sources[0].name, "Builder Page");
  assert.equal(preview.data.leads[0].title, "Deck");
});

test("Lead Finder import merges sources and leads without duplicates", () => {
  const existing = normalizeLeadFinderData({
    sources: [{ id: "source-existing", name: "GC Board", url: "https://example.test/bids" }],
    leads: [
      {
        id: "lead-existing",
        title: "Sidewalk repair",
        companyName: "Albany Apartments",
        city: "Albany",
        sourceId: "source-existing",
      },
    ],
  });
  const imported = parseLeadFinderBackupData({
    sources: [
      { id: "source-duplicate", name: "GC Board", url: "example.test/bids" },
      { id: "source-new", name: "Referral Source", url: "" },
    ],
    leads: [
      {
        id: "lead-duplicate",
        title: "Sidewalk repair",
        companyName: "Albany Apartments",
        city: "Albany",
        sourceId: "source-duplicate",
      },
      {
        id: "lead-new",
        title: "Fence replacement",
        companyName: "Homeowner",
        city: "Albany",
        sourceId: "source-new",
        futureImportedField: "preserved",
      },
    ],
  });
  const { data, summary } = mergeLeadFinderImportData(existing, imported);
  const reloaded = mergeLeadFinderData(data);

  assert.equal(summary.sourcesFound, 2);
  assert.equal(summary.sourcesImported, 1);
  assert.equal(summary.sourcesSkipped, 1);
  assert.equal(summary.leadsImported, 1);
  assert.equal(summary.leadsSkipped, 1);
  assert.equal(data.sources.length, 2);
  assert.equal(data.leads.length, 2);
  assert.equal(reloaded.leads.find((lead) => lead.id === "lead-new").futureImportedField, "preserved");
  assert.equal(reloaded.leads.find((lead) => lead.id === "lead-new").sourceName, "Referral Source");
});

test("Starter sources import successfully and preserve existing sources", () => {
  const existing = normalizeLeadFinderData({
    sources: [
      {
        id: "source-existing",
        name: "Custom local referral source",
        sourceType: "Referral",
        defaultCompanyMode: "Unknown",
      },
    ],
  });
  const { data, summary } = addLeadFinderStarterSources(existing);
  const starterSources = getLeadFinderStarterSources();

  assert.equal(starterSources.length, LEAD_FINDER_STARTER_SOURCE_COUNT);
  assert.equal(summary.sourcesAdded, LEAD_FINDER_STARTER_SOURCE_COUNT);
  assert.equal(summary.sourcesSkipped, 0);
  assert.equal(data.sources.length, LEAD_FINDER_STARTER_SOURCE_COUNT + 1);
  assert.equal(data.sources.some((source) => source.name === "Custom local referral source"), true);
  assert.equal(data.sources.find((source) => source.name === "Albany fencing leads manual search").defaultCompanyMode, "Live Your Future");
  assert.equal(data.sources.find((source) => source.name === "Oregon public bid manual check").defaultCompanyMode, "Last Yard Concrete");
  assert.equal(data.sources.find((source) => source.name === "Property managers master list").defaultServiceType, "Other");
});

test("Starter sources skip duplicates and remain ready for Daily Source Check", () => {
  const firstImport = addLeadFinderStarterSources(normalizeLeadFinderData());
  const secondImport = addLeadFinderStarterSources(firstImport.data);
  const preview = previewLeadFinderStarterSources(firstImport.data);
  const dailySource = firstImport.data.sources.find((source) => source.name === "Oregon public bid manual check");
  const manualSource = firstImport.data.sources.find((source) => source.name === "Manual phone call leads");

  assert.equal(secondImport.summary.sourcesAdded, 0);
  assert.equal(secondImport.summary.sourcesSkipped, LEAD_FINDER_STARTER_SOURCE_COUNT);
  assert.equal(preview.sourcesToAdd, 0);
  assert.equal(preview.sourcesSkipped, LEAD_FINDER_STARTER_SOURCE_COUNT);
  assert.equal(dailySource.checkFrequency, "Daily");
  assert.equal(dailySource.sourcePriority, "High");
  assert.equal(dailySource.sourceStatus, "Active");
  assert.equal(getLeadSourceOpenUrl(manualSource), "");
  assert.equal(createLeadFinderBackup(firstImport.data).sources.length, LEAD_FINDER_STARTER_SOURCE_COUNT);
});

test("lead finder stats count dashboard status buckets", () => {
  const today = new Date().toISOString().slice(0, 10);
  const data = normalizeLeadFinderData({
    sources: [
      { id: "source-1", name: "Due", sourcePriority: "High", nextCheckDate: today },
      { id: "source-2", name: "Overdue", sourcePriority: "Low", nextCheckDate: "2000-01-01" },
      { id: "source-3", name: "Active", sourcePriority: "Medium" },
      { id: "source-4", name: "Paused", active: false, sourceStatus: "Paused", nextCheckDate: "2000-01-01" },
    ],
    leads: [
      { id: "lead-1", title: "One", status: "New" },
      { id: "lead-2", title: "Two", status: "Good Fit" },
      { id: "lead-3", title: "Three", status: "Contacted" },
      { id: "lead-4", title: "Four", status: "Estimate Started" },
      { id: "lead-5", title: "Five", status: "Proposal Started" },
      { id: "lead-6", title: "Six", status: "Won" },
      { id: "lead-7", title: "Seven", status: "Lost" },
      { id: "lead-8", title: "Eight", status: "Maybe", followUpStatus: "Waiting on Response", nextFollowUpDate: today },
      { id: "lead-9", title: "Nine", status: "Maybe", followUpStatus: "Do Not Follow Up" },
      { id: "lead-10", title: "Ten", status: "Maybe", followUpStatus: "Follow-Up Needed", nextFollowUpDate: "2000-01-01" },
    ],
  });
  const stats = getLeadFinderStats(data);

  assert.equal(stats.totalLeads, 10);
  assert.equal(stats.newLeads, 1);
  assert.equal(stats.goodFitLeads, 1);
  assert.equal(stats.contactedLeads, 1);
  assert.equal(stats.estimatesStarted, 1);
  assert.equal(stats.proposalsStarted, 1);
  assert.equal(stats.wonLeads, 1);
  assert.equal(stats.lostLeads, 1);
  assert.equal(stats.followUpsDueToday, 1);
  assert.equal(stats.overdueFollowUps, 1);
  assert.equal(stats.waitingOnResponse, 1);
  assert.equal(stats.noFollowUpLeads, 1);
  assert.equal(stats.sourcesDueToday, 1);
  assert.equal(stats.overdueSources, 1);
  assert.equal(stats.highPrioritySourcesDue, 1);
  assert.equal(stats.activeSources, 3);
});

test("filters leads by status service city source follow-up and due date sort", () => {
  const leads = [
    { id: "lead-1", title: "Sidewalk", status: "Good Fit", serviceType: "Sidewalk", city: "Salem", sourceId: "source-1", dueDate: "2026-06-15" },
    { id: "lead-2", title: "Fence", status: "Maybe", serviceType: "Fencing", city: "Portland", sourceId: "source-2", dueDate: "2026-05-20", followUpStatus: "No Thanks" },
    {
      id: "lead-3",
      title: "Ramp",
      status: "Good Fit",
      serviceType: "ADA Ramp",
      city: "Salem",
      sourceId: "source-1",
      dueDate: "2026-05-18",
      followUpStatus: "Follow-Up Needed",
      nextFollowUpDate: "2000-01-01",
    },
  ];

  const filtered = filterLeadRecords(leads, {
    city: "sal",
    followUpDue: "overdue",
    followUpStatus: "Follow-Up Needed",
    serviceType: "ADA Ramp",
    sort: "due_date",
    sourceId: "source-1",
    status: "Good Fit",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "lead-3");
  assert.equal(filterLeadRecords(leads, { followUpStatus: "No Thanks" })[0].id, "lead-2");
  assert.equal(filterLeadRecords(leads, { followUpDue: "overdue" })[0].id, "lead-3");
});

test("quick status and source deactivate helpers update only targeted records", () => {
  const data = normalizeLeadFinderData({
    sources: [
      { id: "source-1", name: "Active Source", active: true },
      { id: "source-2", name: "Keep Active", active: true },
    ],
    leads: [
      { id: "lead-1", title: "Lead One", status: "New" },
      { id: "lead-2", title: "Lead Two", status: "New" },
    ],
  });
  const statusData = updateLeadStatus(data, "lead-1", "Contacted");
  const sourceData = deactivateLeadSource(statusData, "source-1");

  assert.equal(statusData.leads.find((lead) => lead.id === "lead-1").status, "Contacted");
  assert.equal(statusData.leads.find((lead) => lead.id === "lead-2").status, "New");
  assert.equal(sourceData.sources.find((source) => source.id === "source-1").active, false);
  assert.equal(sourceData.sources.find((source) => source.id === "source-1").sourceStatus, "Paused");
  assert.equal(sourceData.sources.find((source) => source.id === "source-2").active, true);
});

test("source check fields normalize persist and mark checked calculates next date", () => {
  const source = normalizeLeadSource({
    id: "source-check",
    name: "GC bid page",
    checkFrequency: "Every 2 Days",
    lastCheckedDate: "2026-05-01",
    nextCheckDate: "2026-05-03",
    sourceStatus: "Needs Review",
    sourcePriority: "High",
    sourceNotes: "Check bid board manually.",
    defaultServiceType: "Sidewalk",
    defaultCompanyMode: "Last Yard Concrete",
  });
  const checked = applyLeadSourceChecked(source, { checkedDate: "2026-05-09" });
  const data = markLeadSourceChecked({ sources: [source] }, "source-check", { checkedDate: "2026-05-09" });

  assert.equal(source.sourcePriority, "High");
  assert.equal(source.sourceNotes, "Check bid board manually.");
  assert.equal(source.defaultServiceType, "Sidewalk");
  assert.equal(source.defaultCompanyMode, "Last Yard Concrete");
  assert.equal(checked.lastCheckedDate, "2026-05-09");
  assert.equal(checked.nextCheckDate, "2026-05-11");
  assert.equal(data.sources[0].nextCheckDate, "2026-05-11");
  assert.equal(calculateNextSourceCheckDate("Daily", "2026-05-09"), "2026-05-10");
  assert.equal(calculateNextSourceCheckDate("Weekly", "2026-05-09"), "2026-05-16");
  assert.equal(calculateNextSourceCheckDate("As Needed", "2026-05-09"), "");
});

test("daily source check filters due today overdue and source attributes", () => {
  const today = new Date().toISOString().slice(0, 10);
  const sources = [
    {
      id: "source-due",
      name: "Due high source",
      sourceType: "GC Bid Page",
      sourcePriority: "High",
      defaultCompanyMode: "Last Yard Concrete",
      nextCheckDate: today,
    },
    {
      id: "source-overdue",
      name: "Overdue source",
      sourceType: "Property Manager",
      sourcePriority: "Low",
      defaultCompanyMode: "Live Your Future",
      nextCheckDate: "2026-05-01",
    },
    {
      id: "source-paused",
      name: "Paused source",
      sourceStatus: "Paused",
      active: false,
      nextCheckDate: "2026-05-01",
    },
  ];

  assert.equal(isLeadSourceOverdue(sources[1], { today }), true);
  assert.deepEqual(
    filterLeadSources(sources, {
      companyMode: "Last Yard Concrete",
      due: "due_today",
      priority: "High",
      sourceState: "active",
      sourceType: "GC Bid Page",
    }).map((source) => source.id),
    ["source-due"],
  );
  assert.deepEqual(filterLeadSources(sources, { due: "overdue" }).map((source) => source.id), ["source-overdue"]);
  assert.deepEqual(filterLeadSources(sources, { sourceState: "paused" }).map((source) => source.id), ["source-paused"]);
});

test("adding a lead from a source prefills source defaults", () => {
  const source = createEmptyLeadSource({
    id: "source-prefill",
    name: "Albany property manager",
    url: "https://example.test/source",
    defaultServiceType: "Decking",
    defaultCompanyMode: "Live Your Future",
  });
  const lead = createLeadFromSource(source, { title: "Deck lead" });

  assert.equal(lead.title, "Deck lead");
  assert.equal(lead.sourceId, "source-prefill");
  assert.equal(lead.sourceName, "Albany property manager");
  assert.equal(lead.sourceUrl, "https://example.test/source");
  assert.equal(lead.serviceType, "Decking");
  assert.equal(lead.suggestedCompanyMode, "Live Your Future");
});

test("source open URLs are safe and normalized", () => {
  assert.equal(getLeadSourceOpenUrl(""), "");
  assert.equal(getLeadSourceOpenUrl({ url: "   " }), "");
  assert.equal(getLeadSourceOpenUrl("example.test/leads"), "https://example.test/leads");
  assert.equal(getLeadSourceOpenUrl({ url: "www.example.test" }), "https://www.example.test/");
  assert.equal(getLeadSourceOpenUrl("https://example.test/source"), "https://example.test/source");
  assert.equal(getLeadSourceOpenUrl("http://example.test/source"), "http://example.test/source");
  assert.equal(getLeadSourceOpenUrl("not a url"), "");
});

test("lead handoff fields normalize and survive merge/load cycles", () => {
  const lead = normalizeLead({
    id: "lead-handoff",
    title: "Patio estimate",
    estimateId: "proposal-estimate-1",
    proposalId: "proposal-commercial-1",
    packetId: "proposal-packet-1",
    contactId: "contact-1",
    handoffHistory: [
      {
        id: "handoff-1",
        type: "residential_estimate",
        recordId: "proposal-estimate-1",
        label: "Residential Estimate",
        status: "Estimate Started",
      },
    ],
  });
  const data = mergeLeadFinderData({ leads: [lead] });

  assert.equal(data.leads[0].estimateId, "proposal-estimate-1");
  assert.equal(data.leads[0].proposalId, "proposal-commercial-1");
  assert.equal(data.leads[0].packetId, "proposal-packet-1");
  assert.equal(data.leads[0].contactId, "contact-1");
  assert.equal(data.leads[0].handoffHistory.length, 1);
  assert.equal(normalizeLeadHandoffHistory(data.leads[0].handoffHistory)[0].recordId, "proposal-estimate-1");
});

test("applying lead handoffs stores record ids and updates lead status", () => {
  const lead = createEmptyLead({ id: "lead-apply", title: "Sidewalk lead" });
  const estimateLead = applyLeadHandoff(lead, {
    type: "residential_estimate",
    recordId: "estimate-1",
    label: "Residential Estimate",
  });
  const proposalLead = applyLeadHandoff(estimateLead, {
    type: "commercial_proposal",
    recordId: "proposal-1",
    label: "Commercial Proposal",
  });
  const packetLead = applyLeadHandoff(proposalLead, {
    type: "gc_packet",
    recordId: "packet-1",
    label: "GC Packet",
  });
  const aiProposalLead = applyLeadHandoff(lead, {
    type: "proposal_draft",
    recordId: "proposal-ai-1",
    label: "AI Proposal Draft",
  });

  assert.equal(estimateLead.estimateId, "estimate-1");
  assert.equal(estimateLead.status, "Estimate Started");
  assert.equal(proposalLead.proposalId, "proposal-1");
  assert.equal(proposalLead.status, "Proposal Started");
  assert.equal(packetLead.packetId, "packet-1");
  assert.equal(packetLead.status, "Proposal Started");
  assert.equal(packetLead.handoffHistory.length, 3);
  assert.equal(aiProposalLead.proposalId, "proposal-ai-1");
  assert.equal(aiProposalLead.status, "Proposal Started");
  assert.equal(aiProposalLead.handoffHistory[0].type, "proposal_draft");
});

test("follow-up fields persist and quick actions update dates and statuses", () => {
  const lead = normalizeLead({
    id: "lead-follow-up",
    title: "Follow-up lead",
    lastContactDate: "2026-05-01",
    lastContactMethod: "Text",
    nextFollowUpDate: "2026-05-03",
    followUpStatus: "Follow-Up Needed",
    contactNotes: "Texted owner.",
    noFollowUpReason: "",
  });
  const contacted = applyLeadFollowUpQuickAction(lead, "mark_contacted", { today: "2026-05-09" });
  const tomorrow = applyLeadFollowUpQuickAction(contacted, "follow_up_tomorrow", { today: "2026-05-09" });
  const twoDays = applyLeadFollowUpQuickAction(contacted, "follow_up_two_days", { today: "2026-05-09" });
  const waiting = applyLeadFollowUpQuickAction(contacted, "waiting_on_response", { today: "2026-05-09" });
  const noFollowUp = applyLeadFollowUpQuickAction(contacted, "do_not_follow_up", { today: "2026-05-09" });

  assert.equal(lead.lastContactMethod, "Text");
  assert.equal(lead.contactNotes, "Texted owner.");
  assert.equal(contacted.lastContactDate, "2026-05-09");
  assert.equal(contacted.followUpStatus, "Contacted");
  assert.equal(tomorrow.nextFollowUpDate, "2026-05-10");
  assert.equal(tomorrow.followUpStatus, "Follow-Up Needed");
  assert.equal(twoDays.nextFollowUpDate, "2026-05-11");
  assert.equal(waiting.followUpStatus, "Waiting on Response");
  assert.equal(noFollowUp.followUpStatus, "Do Not Follow Up");
  assert.equal(noFollowUp.nextFollowUpDate, "");
  assert.equal(isLeadFollowUpOverdue(normalizeLead({ nextFollowUpDate: "2000-01-01", followUpStatus: "Follow-Up Needed" })), true);
});
