import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../proposalData.js";
import { Badge } from "../common/Badges.jsx";
import { formatDisplayDate } from "../../utils/formatting/display.js";
import {
  LEAD_CONTACT_METHODS,
  LEAD_AI_FIT_LABELS,
  LEAD_FOLLOW_UP_STATUSES,
  LEAD_PROPOSAL_READINESS_LABELS,
  LEAD_REVIEW_STATUSES,
  LEAD_SOURCE_CHECK_FREQUENCIES,
  LEAD_SOURCE_PRIORITIES,
  LEAD_SOURCE_STATUSES,
  LEAD_SERVICE_TYPES,
  LEAD_SOURCE_TYPES,
  LEAD_STATUSES,
  LEAD_SUGGESTED_COMPANY_MODES,
  applyLeadFollowUpQuickAction,
  applyLeadSourceChecked,
  createEmptyLead,
  createLeadFromSource,
  createEmptyLeadSource,
  filterLeadRecords,
  filterLeadSources,
  getLeadById,
  getLeadFinderCommandCenterData,
  getLeadFinderStats,
  getLeadReviewQueue,
  getLeadSourceOpenUrl,
  hasLeadAiScore,
  hasCompleteLeadScore,
  isLeadFollowUpDueToday,
  isLeadFollowUpOverdue,
  isLeadSourceDueToday,
  isLeadSourceOverdue,
  normalizeLeadFinderData,
  normalizeLeadMissingInfoResult,
  normalizeLeadProposalDraftResult,
  normalizeLeadSource,
  previewLeadFinderBackupImport,
  previewLeadFinderStarterSources,
} from "../../utils/leadFinder.js";
import { findJobHandoffForLead, getJobHandoffStats, normalizeJobHandoffs } from "../../utils/jobHandoffs.js";

export function LeadFinderView({
  data = {},
  jobHandoffs = [],
  leadAiConfigured = null,
  message = "",
  permissions = {},
  route = {},
  onBackToDashboard,
  onAddStarterSources,
  onCheckMissingInfo,
  onCheckMissingInfoWithRules,
  onDeactivateSource,
  onExportBackup,
  onGenerateProposalDraft,
  onImportBackup,
  onCreateJobHandoff,
  onLeadHandoff,
  onMarkMissingInfoRequested,
  onNavigate,
  onApplyProposalDraft,
  onSaveLead,
  onSaveSource,
  onScoreAllUnscoredLeads,
  onScoreLead,
  onScoreLeadWithRules,
  onUpdateLeadReviewStatus,
  onUpdateLeadStatus,
}) {
  const normalizedData = normalizeLeadFinderData(data);
  const section = route.section || "dashboard";
  const [newLeadSourceId, setNewLeadSourceId] = useState("");

  function navigateLeadFinder(path) {
    if (path === "/lead-finder/leads/new") {
      setNewLeadSourceId("");
    }

    onNavigate?.(path);
  }

  function addLeadFromSource(source = {}) {
    setNewLeadSourceId(source.id || "");
    onNavigate?.("/lead-finder/leads/new");
  }

  return (
    <section className="lead-finder-panel no-print">
      <LeadFinderHeader section={section} onBackToDashboard={onBackToDashboard} onNavigate={navigateLeadFinder} />
      {message ? <p className="backup-message">{message}</p> : null}
      {section === "sources" ? (
        <LeadSourcesPage
          data={normalizedData}
          permissions={permissions}
          onAddStarterSources={onAddStarterSources}
          onDeactivateSource={onDeactivateSource}
          onSaveSource={onSaveSource}
        />
      ) : section === "commandCenter" ? (
        <LeadCommandCenterPage
          data={normalizedData}
          jobHandoffs={jobHandoffs}
          permissions={permissions}
          onAddLeadFromSource={addLeadFromSource}
          onCheckMissingInfoWithRules={onCheckMissingInfoWithRules}
          onCreateJobHandoff={onCreateJobHandoff}
          onGenerateProposalDraft={onGenerateProposalDraft}
          onLeadHandoff={onLeadHandoff}
          onMarkMissingInfoRequested={onMarkMissingInfoRequested}
          onNavigate={navigateLeadFinder}
          onSaveLead={onSaveLead}
          onSaveSource={onSaveSource}
          onUpdateLeadReviewStatus={onUpdateLeadReviewStatus}
        />
      ) : section === "dailyCheck" ? (
        <LeadDailySourceCheckPage
          data={normalizedData}
          permissions={permissions}
          onAddLeadFromSource={addLeadFromSource}
          onSaveSource={onSaveSource}
        />
      ) : section === "review" ? (
        <LeadReviewQueuePage
          data={normalizedData}
          permissions={permissions}
          onGenerateProposalDraft={onGenerateProposalDraft}
          onLeadHandoff={onLeadHandoff}
          onNavigate={navigateLeadFinder}
          onSaveLead={onSaveLead}
          onScoreAllUnscoredLeads={onScoreAllUnscoredLeads}
          onUpdateLeadReviewStatus={onUpdateLeadReviewStatus}
        />
      ) : section === "leads" ? (
        <LeadInboxPage
          data={normalizedData}
          permissions={permissions}
          onNavigate={navigateLeadFinder}
          onUpdateLeadStatus={onUpdateLeadStatus}
        />
      ) : section === "newLead" ? (
        <LeadEditPage
          data={normalizedData}
          leadAiConfigured={leadAiConfigured}
          mode="new"
          permissions={permissions}
          prefillSourceId={newLeadSourceId}
          onNavigate={navigateLeadFinder}
          onSaveLead={onSaveLead}
        />
      ) : section === "leadDetail" ? (
        <LeadEditPage
          data={normalizedData}
          jobHandoffs={jobHandoffs}
          leadAiConfigured={leadAiConfigured}
          leadId={route.id}
          mode="detail"
          permissions={permissions}
          onNavigate={navigateLeadFinder}
          onApplyProposalDraft={onApplyProposalDraft}
          onLeadHandoff={onLeadHandoff}
          onGenerateProposalDraft={onGenerateProposalDraft}
          onCheckMissingInfo={onCheckMissingInfo}
          onCheckMissingInfoWithRules={onCheckMissingInfoWithRules}
          onCreateJobHandoff={onCreateJobHandoff}
          onMarkMissingInfoRequested={onMarkMissingInfoRequested}
          onSaveLead={onSaveLead}
          onScoreLead={onScoreLead}
          onScoreLeadWithRules={onScoreLeadWithRules}
          onUpdateLeadStatus={onUpdateLeadStatus}
        />
      ) : (
        <LeadFinderDashboard
          data={normalizedData}
          permissions={permissions}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
          onNavigate={navigateLeadFinder}
          onScoreAllUnscoredLeads={onScoreAllUnscoredLeads}
        />
      )}
    </section>
  );
}

function LeadFinderHeader({ section = "dashboard", onBackToDashboard, onNavigate }) {
  const navItems = [
    ["dashboard", "Dashboard", "/lead-finder"],
    ["commandCenter", "Command Center", "/lead-finder/command-center"],
    ["review", "Review Queue", "/lead-finder/review"],
    ["dailyCheck", "Daily Source Check", "/lead-finder/daily-check"],
    ["sources", "Sources", "/lead-finder/sources"],
    ["leads", "Lead Inbox", "/lead-finder/leads"],
    ["newLead", "New Lead", "/lead-finder/leads/new"],
    ["jobHandoffs", "Job Handoffs", "/job-handoffs"],
  ];

  return (
    <div className="list-heading lead-finder-heading">
      <div>
        <p className="list-kicker">AI Lead Finder</p>
        <h2>Lead Finder Foundation</h2>
        <p>Track lead sources and manual lead records now. AI scoring and source automation can be connected later.</p>
      </div>
      <div className="settings-actions lead-finder-nav">
        {navItems.map(([key, label, path]) => (
          <button className={section === key ? "lead-finder-nav-active" : ""} key={key} type="button" onClick={() => onNavigate?.(path)}>
            {label}
          </button>
        ))}
        <button type="button" onClick={onBackToDashboard}>
          Dashboard
        </button>
      </div>
    </div>
  );
}

function LeadFinderDashboard({ data = {}, permissions = {}, onExportBackup, onImportBackup, onNavigate, onScoreAllUnscoredLeads }) {
  const stats = getLeadFinderStats(data);
  const [scoreAllMessage, setScoreAllMessage] = useState("");
  const statCards = [
    ["Total Leads", stats.totalLeads],
    ["New Leads", stats.newLeads],
    ["New Leads Needing Review", stats.newLeadsNeedingReview],
    ["Good Fit Leads", stats.goodFitLeads],
    ["AI Good Fit Leads", stats.aiGoodFitLeads],
    ["Maybe Leads", stats.aiMaybeLeads],
    ["Bad Fit Leads", stats.aiBadFitLeads],
    ["Unscored Leads", stats.unscoredLeads],
    ["Auto-Scored Today", stats.autoScoredToday],
    ["Ready for Proposal Review", stats.readyLeads],
    ["Need Missing Info", stats.leadsNeedingInfo],
    ["Not Ready", stats.notReadyLeads],
    ["Contacted Leads", stats.contactedLeads],
    ["Estimates Started", stats.estimatesStarted],
    ["Proposals Started", stats.proposalsStarted],
    ["Won Leads", stats.wonLeads],
    ["Lost Leads", stats.lostLeads],
    ["Follow-ups Due Today", stats.followUpsDueToday],
    ["Overdue Follow-ups", stats.overdueFollowUps],
    ["Waiting on Response", stats.waitingOnResponse],
    ["No Thanks / Do Not Follow Up", stats.noFollowUpLeads],
    ["Sources Due Today", stats.sourcesDueToday],
    ["Overdue Sources", stats.overdueSources],
    ["High Priority Sources Due", stats.highPrioritySourcesDue],
    ["Active Sources", stats.activeSources],
  ];
  const recentLeads = normalizeLeadFinderData(data).leads.slice(0, 5);

  async function scoreAllUnscored() {
    const summary = await onScoreAllUnscoredLeads?.();

    if (summary) {
      setScoreAllMessage(`Rule-based scored ${summary.scoredCount} leads and skipped ${summary.skippedCount} complete scores.`);
    }
  }

  return (
    <>
      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Review Queue</p>
            <h3>Score and Review New Leads</h3>
            <p>Rule-based auto-scoring is free and does not call OpenAI. Live AI scoring stays manual on the lead detail page.</p>
          </div>
        <div className="settings-actions">
          <button className="gold-action" type="button" onClick={() => onNavigate?.("/lead-finder/command-center")}>
            Open Command Center
          </button>
          <button type="button" onClick={() => onNavigate?.("/lead-finder/review")}>
            Open Review Queue
          </button>
          <button type="button" onClick={() => onNavigate?.("/job-handoffs")}>
            Open Job Handoffs
          </button>
            <button type="button" onClick={scoreAllUnscored} disabled={!permissions.editBid || stats.unscoredLeads === 0}>
              Score All Unscored Leads
            </button>
          </div>
        </div>
        {scoreAllMessage ? <p className="backup-message">{scoreAllMessage}</p> : null}
      </article>

      <div className="dashboard-stat-grid lead-finder-stat-grid">
        {statCards.map(([label, value]) => (
          <div className="dashboard-stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <LeadFinderBackupTools data={data} permissions={permissions} onExportBackup={onExportBackup} onImportBackup={onImportBackup} />

      <div className="lead-finder-grid">
        <article className="lead-finder-card">
          <div className="recent-heading">
            <div>
              <p className="list-kicker">Sources</p>
              <h3>Lead Source Setup</h3>
            </div>
            <button type="button" onClick={() => onNavigate?.("/lead-finder/sources")}>
              Manage Sources
            </button>
            <button type="button" onClick={() => onNavigate?.("/lead-finder/daily-check")}>
              Daily Check
            </button>
          </div>
          <p>
            Add GC bid pages, property managers, builder/subdivision pages, referral sources, and manual entry sources.
          </p>
        </article>

        <article className="lead-finder-card">
          <div className="recent-heading">
            <div>
              <p className="list-kicker">Inbox</p>
              <h3>Recent Leads</h3>
            </div>
            <button type="button" onClick={() => onNavigate?.("/lead-finder/leads")}>
              Open Inbox
            </button>
          </div>
          {recentLeads.length > 0 ? (
            <div className="lead-finder-mini-list">
              {recentLeads.map((lead) => (
                <LeadMiniRow key={lead.id} lead={lead} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <p className="empty-list-message">No leads yet. Create sources first or enter a manual lead.</p>
          )}
        </article>
      </div>
    </>
  );
}

function LeadCommandCenterPage({
  data = {},
  jobHandoffs = [],
  permissions = {},
  onAddLeadFromSource,
  onCheckMissingInfoWithRules,
  onCreateJobHandoff,
  onGenerateProposalDraft,
  onLeadHandoff,
  onMarkMissingInfoRequested,
  onNavigate,
  onSaveLead,
  onSaveSource,
  onUpdateLeadReviewStatus,
}) {
  const commandData = getLeadFinderCommandCenterData(data);
  const handoffStats = getJobHandoffStats(jobHandoffs);
  const [localMessage, setLocalMessage] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const statCards = [
    ["Sources Due Today", commandData.stats.sourcesDueToday],
    ["Overdue Sources", commandData.stats.overdueSources],
    ["New Leads Needing Review", commandData.stats.newLeadsNeedingReview],
    ["Good Fit Leads", commandData.stats.aiGoodFitLeads],
    ["Maybe Leads", commandData.stats.aiMaybeLeads],
    ["Leads Missing Info", commandData.stats.leadsNeedingInfo + commandData.stats.notReadyLeads],
    ["Follow-Ups Due Today", commandData.stats.followUpsDueToday],
    ["Overdue Follow-Ups", commandData.stats.overdueFollowUps],
    ["Waiting on Response", commandData.stats.waitingOnResponse],
    ["Proposals Started", commandData.stats.proposalsStarted],
    ["Ready for Ops Review", handoffStats.readyForOpsReview],
    ["Ready to Create Job", handoffStats.readyToCreateJob],
  ];

  async function runLeadAction(lead, actionName, action) {
    setActionLoading(`${lead.id}-${actionName}`);
    setLocalMessage("");

    try {
      const result = await action();
      const message = result?.message || `${lead.title || "Lead"} updated.`;
      setLocalMessage(message);
    } catch (error) {
      setLocalMessage(error?.message || `${actionName} failed.`);
    } finally {
      setActionLoading("");
    }
  }

  async function updateReviewStatus(lead, reviewStatus) {
    await runLeadAction(lead, reviewStatus, async () => {
      const updatedLead = await onUpdateLeadReviewStatus?.(lead.id, reviewStatus);
      return { message: `${updatedLead?.title || lead.title || "Lead"} marked ${reviewStatus}.` };
    });
  }

  async function checkMissingInfo(lead) {
    await runLeadAction(lead, "missing-info", async () => {
      const updatedLead = await onCheckMissingInfoWithRules?.(lead);
      return { message: `Missing info checked for ${updatedLead?.title || lead.title || "lead"}.` };
    });
  }

  async function generateDraft(lead) {
    await runLeadAction(lead, "proposal-draft", async () => {
      const draft = await onGenerateProposalDraft?.(lead);
      return draft ? { message: `Generated a proposal draft for ${lead.title || "lead"}. Open the lead detail page to review and apply it.` } : null;
    });
  }

  async function createHandoff(lead, actionType) {
    await runLeadAction(lead, actionType, async () => onLeadHandoff?.(lead, actionType));
  }

  async function createJobHandoff(lead) {
    await runLeadAction(lead, "job_handoff", async () => onCreateJobHandoff?.(lead));
  }

  async function followUpAction(lead, actionType) {
    await runLeadAction(lead, actionType, async () => {
      const updatedLead = applyLeadFollowUpQuickAction(lead, actionType);
      const savedLead = await onSaveLead?.(updatedLead);
      return { message: `${savedLead?.title || lead.title || "Lead"} follow-up updated.` };
    });
  }

  async function markMissingInfoRequested(lead) {
    await runLeadAction(lead, "missing-info-requested", async () => {
      const updatedLead = await onMarkMissingInfoRequested?.(lead);
      return { message: `Missing info requested for ${updatedLead?.title || lead.title || "lead"}.` };
    });
  }

  async function clearMissingInfo(lead) {
    await runLeadAction(lead, "clear-missing-info", async () => {
      const savedLead = await onSaveLead?.({
        ...lead,
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
      });

      return { message: `Missing info check cleared for ${savedLead?.title || lead.title || "lead"}.` };
    });
  }

  async function copyQuestions(lead) {
    await runLeadAction(lead, "copy-questions", async () => {
      if (!lead.customerQuestionDraft) {
        return { message: "No customer question draft saved yet." };
      }

      await navigator.clipboard.writeText(lead.customerQuestionDraft);
      return { message: "Customer questions copied." };
    });
  }

  async function markSourceChecked(source) {
    setActionLoading(`${source.id}-checked`);
    setLocalMessage("");

    try {
      const savedSource = await onSaveSource?.(applyLeadSourceChecked(source));
      setLocalMessage(`Marked ${savedSource?.name || source.name || "source"} checked.`);
    } catch (error) {
      setLocalMessage(error?.message || "Mark checked failed.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="lead-command-center">
      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Daily Command Center</p>
            <h3>Morning Lead Finder Work</h3>
            <p>Work through sources, lead review, missing info, follow-ups, and proposal-ready leads from one page. No web search, scraping, or messages are sent automatically.</p>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={() => onNavigate?.("/lead-finder/daily-check")}>
              Daily Source Check
            </button>
            <button type="button" onClick={() => onNavigate?.("/lead-finder/review")}>
              Review Queue
            </button>
          </div>
        </div>
        {localMessage ? <p className="backup-message">{localMessage}</p> : null}
      </article>

      <section className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Today's Priority Summary</p>
            <h3>What Needs Attention</h3>
          </div>
        </div>
        <div className="dashboard-stat-grid lead-finder-stat-grid">
          {statCards.map(([label, value]) => (
            <div className="dashboard-stat-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <CommandCenterSection title="Sources To Check Today" emptyText="No sources are due or overdue.">
        {commandData.sourcesToCheckToday.map((source) => (
          <LeadSourceCheckRow
            key={source.id}
            source={source}
            permissions={permissions}
            onAddLeadFromSource={onAddLeadFromSource}
            onMarkChecked={markSourceChecked}
          />
        ))}
      </CommandCenterSection>

      <CommandCenterSection title="Leads Needing Review" emptyText="No leads are waiting for review.">
        {commandData.leadsNeedingReview.map((lead) => (
          <CommandCenterLeadRow
            actionLoading={actionLoading}
            key={lead.id}
            lead={lead}
            permissions={permissions}
            onNavigate={onNavigate}
            actions={[
              ["Mark Reviewed", () => updateReviewStatus(lead, "Reviewed"), permissions.editBid],
              ["Reject Lead", () => updateReviewStatus(lead, "Rejected"), permissions.editBid],
              ["Save for Later", () => updateReviewStatus(lead, "Saved for Later"), permissions.editBid],
              ["Check Missing Info", () => checkMissingInfo(lead), permissions.editBid],
              ["Generate Proposal Draft", () => generateDraft(lead), permissions.editBid],
              ["Create Estimate", () => createHandoff(lead, "residential_estimate"), permissions.createProposal],
              ["Create Proposal", () => createHandoff(lead, "commercial_proposal"), permissions.createProposal],
              ["Follow Up Tomorrow", () => followUpAction(lead, "follow_up_tomorrow"), permissions.editBid],
            ]}
          />
        ))}
      </CommandCenterSection>

      <CommandCenterSection title="Leads Missing Info" emptyText="No leads are currently marked Needs Info or Not Ready.">
        {commandData.leadsMissingInfo.map((lead) => (
          <CommandCenterLeadRow
            actionLoading={actionLoading}
            key={lead.id}
            lead={lead}
            permissions={permissions}
            onNavigate={onNavigate}
            actions={[
              ["Copy Customer Questions", () => copyQuestions(lead), Boolean(lead.customerQuestionDraft)],
              ["Mark Missing Info Requested", () => markMissingInfoRequested(lead), permissions.editBid],
              ["Follow Up Tomorrow", () => followUpAction(lead, "follow_up_tomorrow"), permissions.editBid],
              ["Clear Missing Info Check", () => clearMissingInfo(lead), permissions.editBid],
            ]}
          />
        ))}
      </CommandCenterSection>

      <CommandCenterSection title="Follow-Ups Due" emptyText="No follow-ups are due or overdue.">
        {commandData.followUpsDue.map((lead) => (
          <CommandCenterLeadRow
            actionLoading={actionLoading}
            key={lead.id}
            lead={lead}
            permissions={permissions}
            onNavigate={onNavigate}
            actions={[
              ["Mark Contacted", () => followUpAction(lead, "mark_contacted"), permissions.editBid],
              ["Waiting on Response", () => followUpAction(lead, "waiting_on_response"), permissions.editBid],
              ["Follow Up Tomorrow", () => followUpAction(lead, "follow_up_tomorrow"), permissions.editBid],
              ["Follow Up in 2 Days", () => followUpAction(lead, "follow_up_two_days"), permissions.editBid],
              ["No Thanks / Do Not Follow Up", () => followUpAction(lead, "do_not_follow_up"), permissions.editBid],
            ]}
          />
        ))}
      </CommandCenterSection>

      <CommandCenterSection title="Ready To Bid / Ready To Proposal" emptyText="No Good Fit leads are ready for proposal work yet.">
        {commandData.readyToBid.map((lead) => (
          <CommandCenterLeadRow
            actionLoading={actionLoading}
            key={lead.id}
            lead={lead}
            permissions={permissions}
            onNavigate={onNavigate}
            actions={[
              ["Generate Proposal Draft", () => generateDraft(lead), permissions.editBid],
              ["Create Job Handoff Packet", () => createJobHandoff(lead), permissions.editBid],
              ["Create Commercial Proposal", () => createHandoff(lead, "commercial_proposal"), permissions.createProposal],
              ["Create Residential Estimate", () => createHandoff(lead, "residential_estimate"), permissions.createProposal],
              ["Create GC Packet", () => createHandoff(lead, "gc_packet"), permissions.createProposal],
            ]}
          />
        ))}
      </CommandCenterSection>
    </div>
  );
}

function CommandCenterSection({ children, emptyText = "", title = "" }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];

  return (
    <section className="lead-finder-card">
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Command Center</p>
          <h3>{title}</h3>
        </div>
      </div>
      {items.length > 0 ? <div className="lead-inbox-list">{items}</div> : <p className="empty-list-message">{emptyText}</p>}
    </section>
  );
}

function CommandCenterLeadRow({ actionLoading = "", actions = [], lead = {}, onNavigate, permissions = {} }) {
  const isBusy = actionLoading.startsWith(`${lead.id}-`);

  return (
    <article className={`lead-inbox-row ${getLeadFollowUpClass(lead)}`}>
      <div className="lead-inbox-main">
        <div className="bid-card-title">
          <strong>{lead.title || "Untitled lead"}</strong>
          <Badge className={getLeadStatusClass(lead.aiFitLabel)}>{lead.aiFitLabel || "Unscored"}</Badge>
          <Badge className={getLeadReadinessClass(lead.proposalReadinessLabel)}>{lead.proposalReadinessLabel || "Not Checked"}</Badge>
          <Badge>{lead.reviewStatus}</Badge>
        </div>
        <p>{[lead.companyName, lead.city, lead.state, lead.serviceType, lead.sourceName].filter(Boolean).join(" | ") || "No lead details entered"}</p>
        <small>{lead.missingInfoRecommendedNextStep || lead.aiNextStep || lead.contactNotes || lead.description || "No next step entered."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{lead.nextFollowUpDate ? `Follow-up ${formatDisplayDate(lead.nextFollowUpDate)}` : "No follow-up set"}</span>
        <span>{lead.proposalReadinessScore !== "" ? `Ready ${lead.proposalReadinessScore}/100` : "Readiness not checked"}</span>
        <strong>{lead.aiFitScore !== "" ? `${lead.aiFitScore}/100` : "No score"}</strong>
      </div>
      <div className="table-actions lead-review-actions">
        {actions.map(([label, onClick, enabled = true]) => (
          <button key={label} type="button" disabled={!enabled || isBusy} onClick={onClick}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => onNavigate?.(`/lead-finder/leads/${lead.id}`)}>
          Open
        </button>
      </div>
    </article>
  );
}

function LeadFinderBackupTools({ data = {}, permissions = {}, onExportBackup, onImportBackup }) {
  const normalizedData = normalizeLeadFinderData(data);
  const [importInputKey, setImportInputKey] = useState(0);
  const [localMessage, setLocalMessage] = useState("");
  const [pendingImport, setPendingImport] = useState(null);

  async function stageImportFile(event) {
    const file = event.target.files?.[0];

    setPendingImport(null);

    if (!file) {
      setLocalMessage("");
      return;
    }

    try {
      const rawText = await file.text();
      const parsedJson = JSON.parse(rawText);
      const preview = previewLeadFinderBackupImport(parsedJson);

      setPendingImport({
        fileName: file.name,
        data: preview.data,
        counts: preview.counts,
      });
      setLocalMessage(`Found ${preview.counts.sourcesFound} sources and ${preview.counts.leadsFound} leads. Confirm import to merge them.`);
    } catch (error) {
      setLocalMessage(`Lead Finder import file is not valid: ${error.message}`);
      setImportInputKey((key) => key + 1);
    }
  }

  async function confirmImport() {
    if (!pendingImport) {
      setLocalMessage("Choose a Lead Finder backup file before importing.");
      return;
    }

    const summary = await onImportBackup?.(pendingImport.data);

    if (summary) {
      setLocalMessage(
        `Imported ${summary.sourcesImported} sources and ${summary.leadsImported} leads. Skipped ${summary.sourcesSkipped} duplicate sources and ${summary.leadsSkipped} duplicate leads.`,
      );
      setPendingImport(null);
      setImportInputKey((key) => key + 1);
    }
  }

  return (
    <article className="lead-finder-card lead-finder-backup-card">
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Backup Tools</p>
          <h3>Move Lead Finder Data</h3>
          <p>Export or import only Lead Finder sources and leads for localhost, Vercel Preview, or production.</p>
        </div>
        <button type="button" onClick={onExportBackup} disabled={!permissions.backupExport}>
          Export Lead Finder Data
        </button>
      </div>
      <div className="backup-import-grid lead-finder-backup-grid">
        <label className="backup-file-field">
          <span>Import Lead Finder Data</span>
          <input key={importInputKey} type="file" accept="application/json,.json" onChange={stageImportFile} disabled={!permissions.backupImport} />
        </label>
        <button type="button" onClick={confirmImport} disabled={!permissions.backupImport || !pendingImport}>
          Confirm Import
        </button>
      </div>
      <p className="backup-help">
        Current local Lead Finder data: {normalizedData.sources.length} sources and {normalizedData.leads.length} leads.
      </p>
      {pendingImport ? (
        <p className="backup-help">
          Ready to import {pendingImport.counts.sourcesFound} sources and {pendingImport.counts.leadsFound} leads from {pendingImport.fileName}. Existing matching
          records will be preserved and skipped.
        </p>
      ) : null}
      {localMessage ? <p className="backup-message">{localMessage}</p> : null}
    </article>
  );
}

function LeadSourcesPage({ data = {}, permissions = {}, onAddStarterSources, onDeactivateSource, onSaveSource }) {
  const [activeFilter, setActiveFilter] = useState("active");
  const [editingSourceId, setEditingSourceId] = useState("");
  const [sourceDraft, setSourceDraft] = useState(() => createEmptyLeadSource());
  const [starterMessage, setStarterMessage] = useState("");
  const sources = normalizeLeadFinderData(data).sources;
  const starterPreview = previewLeadFinderStarterSources(data);
  const filteredSources = sources.filter((source) => {
    if (activeFilter === "active") {
      return source.active;
    }

    if (activeFilter === "inactive") {
      return !source.active;
    }

    return true;
  });

  function startNewSource() {
    setEditingSourceId("");
    setSourceDraft(createEmptyLeadSource());
  }

  function editSource(source) {
    setEditingSourceId(source.id);
    setSourceDraft(normalizeLeadSource(source));
  }

  async function saveSource(event) {
    event.preventDefault();
    const savedSource = await onSaveSource?.(sourceDraft);

    if (savedSource) {
      setEditingSourceId(savedSource.id);
      setSourceDraft(savedSource);
    }
  }

  async function addStarterSources() {
    const summary = await onAddStarterSources?.();

    if (summary) {
      setStarterMessage(`Starter Source Pack added ${summary.sourcesAdded} sources and skipped ${summary.sourcesSkipped} duplicates.`);
    }
  }

  return (
    <div className="lead-finder-layout">
      <div className="lead-finder-card">
        <article className="lead-finder-starter-card">
          <div className="recent-heading">
            <div>
              <p className="list-kicker">Starter Source Pack</p>
              <h3>Add Common Sources</h3>
              <p>
                Adds manual source templates for Live Your Future residential exterior work, Last Yard Concrete Oregon concrete/GC work,
                and future growth contact lists.
              </p>
            </div>
            <button type="button" onClick={addStarterSources} disabled={!permissions.editBid || starterPreview.sourcesToAdd <= 0}>
              Add Starter Sources
            </button>
          </div>
          <p className="backup-help">
            {starterPreview.totalSources} starter sources available. {starterPreview.sourcesToAdd} will be added and {starterPreview.sourcesSkipped} will be skipped as duplicates.
          </p>
          {starterMessage ? <p className="backup-message">{starterMessage}</p> : null}
        </article>

        <div className="recent-heading">
          <div>
            <p className="list-kicker">Lead Sources</p>
            <h3>Source List</h3>
          </div>
          <button type="button" onClick={startNewSource} disabled={!permissions.createBid}>
            New Source
          </button>
        </div>
        <div className="list-filters lead-finder-filters">
          <label>
            <span>Status</span>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Sources</option>
            </select>
          </label>
        </div>
        {filteredSources.length > 0 ? (
          <div className="lead-source-list">
            {filteredSources.map((source) => (
              <article className="lead-source-row" key={source.id}>
                <div>
                  <strong>{source.name || "Unnamed source"}</strong>
                  <span>{[source.sourceType, source.sourcePriority, source.locationFocus, source.tradeFocus].filter(Boolean).join(" | ") || "No focus entered"}</span>
                  <small>
                    {source.nextCheckDate ? `Next check ${formatDisplayDate(source.nextCheckDate)}` : "No scheduled source check"}
                    {source.defaultCompanyMode && source.defaultCompanyMode !== "Unknown" ? ` | ${source.defaultCompanyMode}` : ""}
                  </small>
                  {source.url ? <small>{source.url}</small> : null}
                </div>
                <div className="table-actions">
                  <Badge className={source.active && source.sourceStatus === "Active" ? "lead-status-good-fit" : "lead-status-lost"}>
                    {source.sourceStatus}
                  </Badge>
                  <button type="button" onClick={() => editSource(source)}>
                    Edit
                  </button>
                  <button type="button" disabled={!permissions.editBid || !source.active} onClick={() => onDeactivateSource?.(source.id)}>
                    Deactivate
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No sources match this filter.</p>
        )}
      </div>

      <form className="lead-finder-card lead-finder-form-card" onSubmit={saveSource}>
        <div className="contact-form-heading">
          <p className="list-kicker">{editingSourceId ? "Edit Source" : "Create Source"}</p>
          <h3>{sourceDraft.name || "Lead Source"}</h3>
        </div>
        <fieldset className="editor-permission-fieldset" disabled={!permissions.editBid}>
          <div className="bid-form-grid">
            <LeadField label="Name" value={sourceDraft.name} onChange={(value) => setSourceDraft({ ...sourceDraft, name: value })} />
            <LeadSelect label="Source Type" options={LEAD_SOURCE_TYPES} value={sourceDraft.sourceType} onChange={(value) => setSourceDraft({ ...sourceDraft, sourceType: value })} />
            <LeadField label="URL" value={sourceDraft.url} onChange={(value) => setSourceDraft({ ...sourceDraft, url: value })} />
            <LeadField label="Company Type" value={sourceDraft.companyType} onChange={(value) => setSourceDraft({ ...sourceDraft, companyType: value })} />
            <LeadField label="Location Focus" value={sourceDraft.locationFocus} onChange={(value) => setSourceDraft({ ...sourceDraft, locationFocus: value })} />
            <LeadField label="Trade Focus" value={sourceDraft.tradeFocus} onChange={(value) => setSourceDraft({ ...sourceDraft, tradeFocus: value })} />
            <LeadSelect
              label="Check Frequency"
              options={LEAD_SOURCE_CHECK_FREQUENCIES}
              value={sourceDraft.checkFrequency}
              onChange={(value) => setSourceDraft({ ...sourceDraft, checkFrequency: value })}
            />
            <LeadSelect
              label="Source Status"
              options={LEAD_SOURCE_STATUSES}
              value={sourceDraft.sourceStatus}
              onChange={(value) =>
                setSourceDraft({
                  ...sourceDraft,
                  active: value !== "Paused" && value !== "Bad Source",
                  sourceStatus: value,
                })
              }
            />
            <LeadSelect
              label="Source Priority"
              options={LEAD_SOURCE_PRIORITIES}
              value={sourceDraft.sourcePriority}
              onChange={(value) => setSourceDraft({ ...sourceDraft, sourcePriority: value })}
            />
            <LeadSelect
              label="Default Service Type"
              options={LEAD_SERVICE_TYPES}
              value={sourceDraft.defaultServiceType}
              onChange={(value) => setSourceDraft({ ...sourceDraft, defaultServiceType: value })}
            />
            <LeadSelect
              label="Default Company Mode"
              options={LEAD_SUGGESTED_COMPANY_MODES}
              value={sourceDraft.defaultCompanyMode}
              onChange={(value) => setSourceDraft({ ...sourceDraft, defaultCompanyMode: value })}
            />
            <LeadField label="Last Checked Date" type="date" value={sourceDraft.lastCheckedDate} onChange={(value) => setSourceDraft({ ...sourceDraft, lastCheckedDate: value })} />
            <LeadField label="Next Check Date" type="date" value={sourceDraft.nextCheckDate} onChange={(value) => setSourceDraft({ ...sourceDraft, nextCheckDate: value })} />
            <label className="lead-finder-checkbox">
              <input
                checked={sourceDraft.active}
                type="checkbox"
                onChange={(event) =>
                  setSourceDraft({
                    ...sourceDraft,
                    active: event.target.checked,
                    sourceStatus: event.target.checked && sourceDraft.sourceStatus === "Paused" ? "Active" : event.target.checked ? sourceDraft.sourceStatus : "Paused",
                  })
                }
              />
              <span>Active source</span>
            </label>
            <div className="bid-form-wide">
              <LeadField label="Notes" multiline value={sourceDraft.notes} onChange={(value) => setSourceDraft({ ...sourceDraft, notes: value })} />
            </div>
            <div className="bid-form-wide">
              <LeadField label="Source Check Notes" multiline value={sourceDraft.sourceNotes} onChange={(value) => setSourceDraft({ ...sourceDraft, sourceNotes: value })} />
            </div>
          </div>
          <div className="contact-form-actions">
            <button type="submit">{editingSourceId ? "Save Source" : "Create Source"}</button>
            <button type="button" className="editor-secondary-button" onClick={startNewSource}>
              Clear
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

function LeadDailySourceCheckPage({ data = {}, permissions = {}, onAddLeadFromSource, onSaveSource }) {
  const normalizedData = normalizeLeadFinderData(data);
  const [dueFilter, setDueFilter] = useState("due_or_overdue");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [companyModeFilter, setCompanyModeFilter] = useState("all");
  const [sourceStateFilter, setSourceStateFilter] = useState("active");
  const [localMessage, setLocalMessage] = useState("");
  const filteredSources = filterLeadSources(normalizedData.sources, {
    companyMode: companyModeFilter,
    due: dueFilter,
    priority: priorityFilter,
    sourceState: sourceStateFilter,
    sourceType: sourceTypeFilter,
  });

  async function markSourceChecked(source) {
    const checkedSource = applyLeadSourceChecked(source);
    const savedSource = await onSaveSource?.(checkedSource);

    if (savedSource) {
      setLocalMessage(`Marked ${savedSource.name || "source"} checked.`);
    }
  }

  return (
    <div className="lead-finder-card">
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Daily Source Check</p>
          <h3>Manual Source Review</h3>
          <p>Open saved lead sources, check them manually, and record when they need to be checked again.</p>
        </div>
        <button type="button" onClick={() => onAddLeadFromSource?.({})} disabled={!permissions.createBid}>
          New Manual Lead
        </button>
      </div>
      {localMessage ? <p className="backup-message">{localMessage}</p> : null}
      <div className="list-filters lead-finder-filters">
        <label>
          <span>Due</span>
          <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
            <option value="due_or_overdue">Due or Overdue</option>
            <option value="due_today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No Check Date</option>
            <option value="all">All Sources</option>
          </select>
        </label>
        <LeadFilterSelect label="Priority" value={priorityFilter} options={LEAD_SOURCE_PRIORITIES} onChange={setPriorityFilter} />
        <LeadFilterSelect label="Source Type" value={sourceTypeFilter} options={LEAD_SOURCE_TYPES} onChange={setSourceTypeFilter} />
        <LeadFilterSelect label="Company Mode" value={companyModeFilter} options={LEAD_SUGGESTED_COMPANY_MODES} onChange={setCompanyModeFilter} />
        <label>
          <span>Active / Paused</span>
          <select value={sourceStateFilter} onChange={(event) => setSourceStateFilter(event.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="needs_review">Needs Review</option>
            <option value="bad_source">Bad Source</option>
            <option value="all">All Sources</option>
          </select>
        </label>
      </div>
      {filteredSources.length > 0 ? (
        <div className="lead-source-list">
          {filteredSources.map((source) => (
            <LeadSourceCheckRow
              key={source.id}
              source={source}
              permissions={permissions}
              onAddLeadFromSource={onAddLeadFromSource}
              onMarkChecked={markSourceChecked}
            />
          ))}
        </div>
      ) : (
        <p className="empty-list-message">No sources match this check filter.</p>
      )}
    </div>
  );
}

function LeadSourceCheckRow({ source = {}, permissions = {}, onAddLeadFromSource, onMarkChecked }) {
  const sourceClass = getLeadSourceCheckClass(source);
  const openSourceUrl = getLeadSourceOpenUrl(source);

  function openSource() {
    if (!openSourceUrl) {
      return;
    }

    window.open(openSourceUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={`lead-source-row lead-source-check-row ${sourceClass}`}>
      <div>
        <div className="bid-card-title">
          <strong>{source.name || "Unnamed source"}</strong>
          <Badge className={source.sourcePriority === "High" ? "lead-status-bad-fit" : source.sourcePriority === "Medium" ? "lead-status-maybe" : ""}>{source.sourcePriority}</Badge>
          <Badge>{source.sourceType}</Badge>
          <Badge className={source.active && source.sourceStatus === "Active" ? "lead-status-good-fit" : "lead-status-lost"}>{source.sourceStatus}</Badge>
        </div>
        <span>{[source.tradeFocus, source.locationFocus, source.defaultCompanyMode].filter(Boolean).join(" | ") || "No focus entered"}</span>
        <small>
          Next check: {source.nextCheckDate ? formatDisplayDate(source.nextCheckDate) : "Not scheduled"} | Last checked:{" "}
          {source.lastCheckedDate ? formatDisplayDate(source.lastCheckedDate) : "Never"}
        </small>
        {source.sourceNotes || source.notes ? <small>{source.sourceNotes || source.notes}</small> : null}
      </div>
      <div className="table-actions">
        <button
          type="button"
          disabled={!openSourceUrl}
          title={openSourceUrl ? `Open ${openSourceUrl}` : "No source URL saved."}
          onClick={openSource}
        >
          Open Source
        </button>
        {!openSourceUrl ? <small>No source URL saved.</small> : null}
        <button type="button" disabled={!permissions.editBid} onClick={() => onMarkChecked?.(source)}>
          Mark Checked
        </button>
        <button type="button" disabled={!permissions.createBid} onClick={() => onAddLeadFromSource?.(source)}>
          Add Lead From This Source
        </button>
      </div>
    </article>
  );
}

function LeadInboxPage({ data = {}, permissions = {}, onNavigate, onUpdateLeadStatus }) {
  const normalizedData = normalizeLeadFinderData(data);
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("all");
  const [followUpDueFilter, setFollowUpDueFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const filteredLeads = filterLeadRecords(normalizedData.leads, {
    city: cityFilter,
    followUpDue: followUpDueFilter,
    followUpStatus: followUpStatusFilter,
    serviceType: serviceTypeFilter,
    sort,
    sourceId: sourceFilter,
    status: statusFilter,
  });

  return (
    <div className="lead-finder-card">
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Lead Inbox</p>
          <h3>Review Leads</h3>
        </div>
        <button className="gold-action" type="button" onClick={() => onNavigate?.("/lead-finder/leads/new")} disabled={!permissions.createBid}>
          New Lead
        </button>
      </div>
      <div className="list-filters lead-finder-filters">
        <LeadFilterSelect label="Status" value={statusFilter} options={LEAD_STATUSES} onChange={setStatusFilter} />
        <LeadFilterSelect label="Follow-Up Status" value={followUpStatusFilter} options={LEAD_FOLLOW_UP_STATUSES} onChange={setFollowUpStatusFilter} />
        <label>
          <span>Follow-Up Due</span>
          <select value={followUpDueFilter} onChange={(event) => setFollowUpDueFilter(event.target.value)}>
            <option value="all">All Follow-Ups</option>
            <option value="due_today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="due_or_overdue">Due or Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No Follow-Up Date</option>
          </select>
        </label>
        <LeadFilterSelect label="Service Type" value={serviceTypeFilter} options={LEAD_SERVICE_TYPES} onChange={setServiceTypeFilter} />
        <label>
          <span>City</span>
          <input value={cityFilter} placeholder="Any city" onChange={(event) => setCityFilter(event.target.value)} />
        </label>
        <label>
          <span>Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All Sources</option>
            {normalizedData.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name || "Unnamed source"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="due_date">Due Date</option>
          </select>
        </label>
      </div>
      {filteredLeads.length > 0 ? (
        <div className="lead-inbox-list">
          {filteredLeads.map((lead) => (
            <LeadInboxRow
              key={lead.id}
              lead={lead}
              permissions={permissions}
              onNavigate={onNavigate}
              onUpdateLeadStatus={onUpdateLeadStatus}
            />
          ))}
        </div>
      ) : (
        <p className="empty-list-message">No leads match these filters.</p>
      )}
    </div>
  );
}

function LeadInboxRow({ lead, permissions = {}, onNavigate, onUpdateLeadStatus }) {
  const followUpClass = getLeadFollowUpClass(lead);

  return (
    <article className={`lead-inbox-row ${followUpClass}`}>
      <div className="lead-inbox-main">
        <div className="bid-card-title">
          <strong>{lead.title || "Untitled lead"}</strong>
          <Badge className={getLeadStatusClass(lead.status)}>{lead.status}</Badge>
          <Badge>{lead.serviceType}</Badge>
          <Badge className={getLeadStatusClass(lead.followUpStatus)}>{lead.followUpStatus}</Badge>
        </div>
        <p>{[lead.companyName, lead.city, lead.state, lead.sourceName].filter(Boolean).join(" | ") || "No company/location/source entered"}</p>
        <small>{lead.aiNextStep || lead.contactNotes || lead.description || "No next step entered."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{lead.dueDate ? `Due ${formatDisplayDate(lead.dueDate)}` : "No due date"}</span>
        <span>{lead.nextFollowUpDate ? `Follow-up ${formatDisplayDate(lead.nextFollowUpDate)}` : "No follow-up set"}</span>
        <strong>{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "Value TBD"}</strong>
      </div>
      <div className="table-actions">
        <select disabled={!permissions.editBid} value={lead.status} onChange={(event) => onUpdateLeadStatus?.(lead.id, event.target.value)}>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onNavigate?.(`/lead-finder/leads/${lead.id}`)}>
          Open
        </button>
      </div>
    </article>
  );
}

function LeadReviewQueuePage({
  data = {},
  permissions = {},
  onGenerateProposalDraft,
  onLeadHandoff,
  onNavigate,
  onSaveLead,
  onScoreAllUnscoredLeads,
  onUpdateLeadReviewStatus,
}) {
  const normalizedData = normalizeLeadFinderData(data);
  const stats = getLeadFinderStats(normalizedData);
  const [aiFitLabelFilter, setAiFitLabelFilter] = useState("all");
  const [companyModeFilter, setCompanyModeFilter] = useState("all");
  const [scoreSourceFilter, setScoreSourceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("Needs Review");
  const [readinessLabelFilter, setReadinessLabelFilter] = useState("all");
  const [localMessage, setLocalMessage] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const filteredLeads = getLeadReviewQueue(normalizedData, {
    aiFitLabel: aiFitLabelFilter,
    city: cityFilter,
    companyMode: companyModeFilter,
    reviewStatus: reviewStatusFilter,
    readinessLabel: readinessLabelFilter,
    scoreSource: scoreSourceFilter,
    serviceType: serviceTypeFilter,
    sourceId: sourceFilter,
  });

  async function scoreAllUnscored() {
    setActionLoading("score-all");
    setLocalMessage("");

    try {
      const summary = await onScoreAllUnscoredLeads?.();

      if (summary) {
        setLocalMessage(`Rule-based scored ${summary.scoredCount} leads and skipped ${summary.skippedCount} complete scores.`);
      }
    } catch (error) {
      setLocalMessage(error?.message || "Rule-based batch scoring failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateReviewStatus(lead, reviewStatus) {
    setActionLoading(`${lead.id}-${reviewStatus}`);
    setLocalMessage("");

    try {
      const updatedLead = await onUpdateLeadReviewStatus?.(lead.id, reviewStatus);

      if (updatedLead) {
        setLocalMessage(`${updatedLead.title || "Lead"} marked ${reviewStatus}.`);
      }
    } catch (error) {
      setLocalMessage(error?.message || "Lead review update failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function followUpTomorrow(lead) {
    setActionLoading(`${lead.id}-follow-up`);
    setLocalMessage("");

    try {
      const savedLead = await onSaveLead?.(applyLeadFollowUpQuickAction(lead, "follow_up_tomorrow"));

      if (savedLead) {
        setLocalMessage(`${savedLead.title || "Lead"} follow-up set for tomorrow.`);
      }
    } catch (error) {
      setLocalMessage(error?.message || "Follow-up update failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function createHandoff(lead, actionType) {
    setActionLoading(`${lead.id}-${actionType}`);
    setLocalMessage("");

    try {
      const result = await onLeadHandoff?.(lead, actionType);

      if (result?.message) {
        setLocalMessage(result.message);
      }
    } catch (error) {
      setLocalMessage(error?.message || "Lead handoff failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function generateProposalDraft(lead) {
    setActionLoading(`${lead.id}-proposal-draft`);
    setLocalMessage("");

    try {
      const draft = await onGenerateProposalDraft?.(lead);

      if (draft) {
        setLocalMessage(`Generated a proposal draft for ${lead.title || "lead"}. Open the lead detail page to review and apply it.`);
      }
    } catch (error) {
      setLocalMessage(error?.message || "AI proposal drafting failed.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="lead-finder-card">
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Lead Review Queue</p>
          <h3>Human Review</h3>
          <p>New and auto-scored leads wait here until Last Yard reviews them. Batch scoring uses the free rule-based scorer only.</p>
        </div>
        <button type="button" onClick={scoreAllUnscored} disabled={!permissions.editBid || actionLoading === "score-all" || stats.unscoredLeads === 0}>
          {actionLoading === "score-all" ? "Scoring..." : "Score All Unscored Leads"}
        </button>
      </div>
      {localMessage ? <p className="backup-message">{localMessage}</p> : null}
      <div className="list-filters lead-finder-filters">
        <LeadFilterSelect label="AI Label" value={aiFitLabelFilter} options={LEAD_AI_FIT_LABELS} onChange={setAiFitLabelFilter} />
        <LeadFilterSelect label="Suggested Company" value={companyModeFilter} options={LEAD_SUGGESTED_COMPANY_MODES} onChange={setCompanyModeFilter} />
        <label>
          <span>Score Source</span>
          <select value={scoreSourceFilter} onChange={(event) => setScoreSourceFilter(event.target.value)}>
            <option value="all">All Score Sources</option>
            <option value="rule_based">Rule-Based</option>
            <option value="ai">AI</option>
            <option value="">Unscored</option>
          </select>
        </label>
        <label>
          <span>Review Status</span>
          <select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value)}>
            <option value="all">All Review Statuses</option>
            {LEAD_REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <LeadFilterSelect label="Readiness" value={readinessLabelFilter} options={LEAD_PROPOSAL_READINESS_LABELS} onChange={setReadinessLabelFilter} />
        <LeadFilterSelect label="Service Type" value={serviceTypeFilter} options={LEAD_SERVICE_TYPES} onChange={setServiceTypeFilter} />
        <label>
          <span>City</span>
          <input value={cityFilter} placeholder="Any city" onChange={(event) => setCityFilter(event.target.value)} />
        </label>
        <label>
          <span>Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All Sources</option>
            {normalizedData.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name || "Unnamed source"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filteredLeads.length > 0 ? (
        <div className="lead-inbox-list">
          {filteredLeads.map((lead) => (
            <LeadReviewQueueRow
              actionLoading={actionLoading}
              key={lead.id}
              lead={lead}
              permissions={permissions}
              onCreateHandoff={createHandoff}
              onFollowUpTomorrow={followUpTomorrow}
              onGenerateProposalDraft={generateProposalDraft}
              onNavigate={onNavigate}
              onUpdateReviewStatus={updateReviewStatus}
            />
          ))}
        </div>
      ) : (
        <p className="empty-list-message">No leads match the review filters.</p>
      )}
    </div>
  );
}

function LeadReviewQueueRow({
  actionLoading = "",
  lead = {},
  permissions = {},
  onCreateHandoff,
  onFollowUpTomorrow,
  onGenerateProposalDraft,
  onNavigate,
  onUpdateReviewStatus,
}) {
  const isBusy = actionLoading.startsWith(`${lead.id}-`);

  return (
    <article className="lead-inbox-row lead-review-row">
      <div className="lead-inbox-main">
        <div className="bid-card-title">
          <strong>{lead.title || "Untitled lead"}</strong>
          <Badge className={getLeadStatusClass(lead.aiFitLabel)}>{lead.aiFitLabel || "Unscored"}</Badge>
          <Badge>{lead.reviewStatus}</Badge>
          <Badge className={getLeadReadinessClass(lead.proposalReadinessLabel)}>{lead.proposalReadinessLabel || "Not Checked"}</Badge>
          <Badge>{formatLeadScoreSource(lead.scoreSource)}</Badge>
        </div>
        <p>{[lead.companyName, lead.city, lead.state, lead.serviceType, lead.sourceName].filter(Boolean).join(" | ") || "No lead details entered"}</p>
        <small>{lead.aiFitReason || lead.description || "No score reason saved."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{lead.suggestedCompanyMode || "Unknown"}</span>
        <span>{lead.proposalReadinessScore !== "" ? `Ready ${lead.proposalReadinessScore}/100` : "Readiness not checked"}</span>
        <span>{hasCompleteLeadScore(lead) ? `Scored ${formatDisplayDate(lead.scoredAt)}` : "Needs score"}</span>
        <strong>{lead.aiFitScore !== "" ? `${lead.aiFitScore}/100` : "No score"}</strong>
      </div>
      <div className="table-actions lead-review-actions">
        <button type="button" disabled={!permissions.editBid || isBusy} onClick={() => onUpdateReviewStatus?.(lead, "Reviewed")}>
          Mark Reviewed
        </button>
        <button type="button" disabled={!permissions.editBid || isBusy} onClick={() => onUpdateReviewStatus?.(lead, "Rejected")}>
          Reject Lead
        </button>
        <button type="button" disabled={!permissions.editBid || isBusy} onClick={() => onUpdateReviewStatus?.(lead, "Saved for Later")}>
          Save for Later
        </button>
        <button type="button" disabled={!permissions.createProposal || isBusy} onClick={() => onCreateHandoff?.(lead, "residential_estimate")}>
          Create Estimate
        </button>
        <button type="button" disabled={!permissions.createProposal || isBusy} onClick={() => onCreateHandoff?.(lead, "commercial_proposal")}>
          Create Proposal
        </button>
        <button type="button" disabled={!permissions.editBid || isBusy} onClick={() => onGenerateProposalDraft?.(lead)}>
          Generate Proposal Draft
        </button>
        <button type="button" disabled={!permissions.editBid || isBusy} onClick={() => onFollowUpTomorrow?.(lead)}>
          Follow Up Tomorrow
        </button>
        <button type="button" onClick={() => onNavigate?.(`/lead-finder/leads/${lead.id}`)}>
          Open
        </button>
      </div>
    </article>
  );
}

function LeadEditPage({
  data = {},
  jobHandoffs = [],
  leadAiConfigured = null,
  leadId = "",
  mode = "detail",
  permissions = {},
  prefillSourceId = "",
  onApplyProposalDraft,
  onCheckMissingInfo,
  onCheckMissingInfoWithRules,
  onGenerateProposalDraft,
  onCreateJobHandoff,
  onLeadHandoff,
  onMarkMissingInfoRequested,
  onNavigate,
  onSaveLead,
  onScoreLead,
  onScoreLeadWithRules,
  onUpdateLeadStatus,
}) {
  const normalizedData = normalizeLeadFinderData(data);
  const normalizedJobHandoffs = normalizeJobHandoffs(jobHandoffs);
  const existingLead = mode === "new" ? null : getLeadById(normalizedData, leadId);
  const [leadDraft, setLeadDraft] = useState(() => createLeadDraftForEditor(existingLead, mode, normalizedData.sources, prefillSourceId));
  const [localMessage, setLocalMessage] = useState("");
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiScoreError, setAiScoreError] = useState("");
  const [handoffLoading, setHandoffLoading] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const [proposalDraftLoading, setProposalDraftLoading] = useState(false);
  const [proposalDraftError, setProposalDraftError] = useState("");
  const [proposalDraft, setProposalDraft] = useState(null);
  const [missingInfoLoading, setMissingInfoLoading] = useState("");
  const [missingInfoError, setMissingInfoError] = useState("");

  useEffect(() => {
    setLeadDraft(createLeadDraftForEditor(existingLead, mode, normalizedData.sources, prefillSourceId));
    setLocalMessage("");
    setAiScoreError("");
    setAiScoreLoading(false);
    setHandoffLoading("");
    setHandoffError("");
    setProposalDraftLoading(false);
    setProposalDraftError("");
    setProposalDraft(null);
    setMissingInfoLoading("");
    setMissingInfoError("");
  }, [existingLead?.id, mode, prefillSourceId]);

  const quickStatuses = ["Good Fit", "Maybe", "Bad Fit", "Contacted"];
  const pageTitle = mode === "new" ? "New Lead" : existingLead?.title || "Lead Detail";

  async function saveLead(event) {
    event.preventDefault();
    const savedLead = await onSaveLead?.(leadDraft);

    if (savedLead) {
      setLeadDraft(savedLead);
      setLocalMessage("Lead saved.");
      if (mode === "new") {
        onNavigate?.(`/lead-finder/leads/${savedLead.id}`);
      }
    }
  }

  async function setQuickStatus(status) {
    const updatedLead = {
      ...leadDraft,
      status,
    };
    setLeadDraft(updatedLead);

    if (existingLead?.id) {
      await onUpdateLeadStatus?.(existingLead.id, status);
    }
  }

  async function scoreThisLead() {
    if (hasLeadAiScore(leadDraft)) {
      const shouldReplace = window.confirm("This lead already has AI scoring fields. Replace them with a new score?");

      if (!shouldReplace) {
        return;
      }
    }

    setAiScoreLoading(true);
    setAiScoreError("");
    setLocalMessage("");

    try {
      const scoredLead = await onScoreLead?.(leadDraft);

      if (scoredLead) {
        setLeadDraft(scoredLead);
        setLocalMessage("AI score saved to this lead.");
      }
    } catch (error) {
      setAiScoreError(error?.message || "AI lead scoring failed.");
    } finally {
      setAiScoreLoading(false);
    }
  }

  async function scoreThisLeadWithRules() {
    if (hasLeadAiScore(leadDraft)) {
      const shouldReplace = window.confirm("This lead already has AI scoring fields. Replace them with a rule-based test score?");

      if (!shouldReplace) {
        return;
      }
    }

    setAiScoreLoading(true);
    setAiScoreError("");
    setLocalMessage("");

    try {
      const scoredLead = await onScoreLeadWithRules?.(leadDraft);

      if (scoredLead) {
        setLeadDraft(scoredLead);
        setLocalMessage("Rule-based test score saved to this lead.");
      }
    } catch (error) {
      setAiScoreError(error?.message || "Rule-based test scoring failed.");
    } finally {
      setAiScoreLoading(false);
    }
  }

  async function createLeadHandoff(actionType) {
    setHandoffLoading(actionType);
    setHandoffError("");
    setLocalMessage("");

    try {
      const result = await onLeadHandoff?.(leadDraft, actionType);

      if (result?.lead) {
        setLeadDraft(result.lead);
      }

      if (result?.message) {
        setLocalMessage(result.message);
      }
    } catch (error) {
      setHandoffError(error?.message || "Lead handoff failed.");
    } finally {
      setHandoffLoading("");
    }
  }

  async function generateProposalDraft() {
    setProposalDraftLoading(true);
    setProposalDraftError("");
    setLocalMessage("");

    try {
      const draft = await onGenerateProposalDraft?.(leadDraft);

      if (draft) {
        setProposalDraft(normalizeLeadProposalDraftResult(draft));
        setLocalMessage("AI proposal draft ready for review.");
      }
    } catch (error) {
      setProposalDraftError(error?.message || "AI proposal drafting failed.");
    } finally {
      setProposalDraftLoading(false);
    }
  }

  async function createJobHandoff() {
    setHandoffLoading("job_handoff");
    setHandoffError("");
    setLocalMessage("");

    try {
      const result = await onCreateJobHandoff?.(leadDraft);

      if (result?.lead) {
        setLeadDraft(result.lead);
      }

      if (result?.message) {
        setLocalMessage(result.message);
      }
    } catch (error) {
      setHandoffError(error?.message || "Job handoff creation failed.");
    } finally {
      setHandoffLoading("");
    }
  }

  async function checkMissingInfo() {
    setMissingInfoLoading("ai");
    setMissingInfoError("");
    setLocalMessage("");

    try {
      const checkedLead = await onCheckMissingInfo?.(leadDraft);

      if (checkedLead) {
        setLeadDraft(checkedLead);
        setLocalMessage("Missing info check saved to this lead.");
      }
    } catch (error) {
      setMissingInfoError(error?.message || "AI missing info check failed.");
    } finally {
      setMissingInfoLoading("");
    }
  }

  async function checkMissingInfoWithRules() {
    setMissingInfoLoading("rule_based");
    setMissingInfoError("");
    setLocalMessage("");

    try {
      const checkedLead = await onCheckMissingInfoWithRules?.(leadDraft);

      if (checkedLead) {
        setLeadDraft(checkedLead);
        setLocalMessage("Rule-based missing info check saved to this lead.");
      }
    } catch (error) {
      setMissingInfoError(error?.message || "Rule-based missing info check failed.");
    } finally {
      setMissingInfoLoading("");
    }
  }

  async function copyCustomerQuestions() {
    if (!leadDraft.customerQuestionDraft) {
      setMissingInfoError("Run a missing info check before copying customer questions.");
      return;
    }

    try {
      await navigator.clipboard.writeText(leadDraft.customerQuestionDraft);
      setLocalMessage("Customer questions copied.");
    } catch {
      setMissingInfoError("Copy failed. Select the question draft manually.");
    }
  }

  async function markMissingInfoRequested() {
    setMissingInfoLoading("requested");
    setMissingInfoError("");
    setLocalMessage("");

    try {
      const updatedLead = await onMarkMissingInfoRequested?.(leadDraft);

      if (updatedLead) {
        setLeadDraft(updatedLead);
        setLocalMessage("Missing info requested. Follow-up set for tomorrow.");
      }
    } catch (error) {
      setMissingInfoError(error?.message || "Could not mark missing info requested.");
    } finally {
      setMissingInfoLoading("");
    }
  }

  function clearMissingInfoCheck() {
    setLeadDraft({
      ...leadDraft,
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
    });
    setMissingInfoError("");
    setLocalMessage("Missing info check cleared. Save the lead to keep this change.");
  }

  async function applyProposalDraft() {
    if (!proposalDraft) {
      setProposalDraftError("Generate a proposal draft before applying it.");
      return;
    }

    setHandoffLoading("proposal_draft");
    setHandoffError("");
    setProposalDraftError("");
    setLocalMessage("");

    try {
      const result = await onApplyProposalDraft?.(leadDraft, proposalDraft);

      if (result?.lead) {
        setLeadDraft(result.lead);
      }

      if (result?.message) {
        setLocalMessage(result.message);
      }
    } catch (error) {
      setHandoffError(error?.message || "Applying proposal draft failed.");
    } finally {
      setHandoffLoading("");
    }
  }

  async function copyProposalDraft() {
    if (!proposalDraft) {
      return;
    }

    const text = formatLeadProposalDraftForClipboard(proposalDraft);

    try {
      await navigator.clipboard.writeText(text);
      setLocalMessage("Proposal draft copied.");
    } catch {
      setProposalDraftError("Copy failed. Select the draft text manually.");
    }
  }

  async function applyFollowUpQuickAction(actionType) {
    const updatedLead = applyLeadFollowUpQuickAction(leadDraft, actionType);
    setLeadDraft(updatedLead);
    setLocalMessage("");

    if (existingLead?.id) {
      const savedLead = await onSaveLead?.(updatedLead);

      if (savedLead) {
        setLeadDraft(savedLead);
        setLocalMessage("Follow-up updated.");
      }
    }
  }

  if (mode !== "new" && !existingLead) {
    return (
      <div className="contact-empty-state">
        <p className="list-kicker">Lead Detail</p>
        <h3>Lead not found.</h3>
        <p>This lead may have been deleted or is not available in local data.</p>
        <button type="button" onClick={() => onNavigate?.("/lead-finder/leads")}>
          Back to Lead Inbox
        </button>
      </div>
    );
  }

  return (
    <form className="lead-finder-card lead-detail-card" onSubmit={saveLead}>
      <div className="recent-heading">
        <div>
          <p className="list-kicker">{mode === "new" ? "Manual Entry" : "Lead Detail"}</p>
          <h3>{pageTitle}</h3>
          <p>Keep lead qualification, contact details, AI-ready score fields, and next steps in one record.</p>
          <LeadAiConfigNote configured={leadAiConfigured} />
        </div>
        <div className="settings-actions">
          <button type="button" onClick={() => onNavigate?.("/lead-finder/leads")}>
            Back to Inbox
          </button>
          {mode !== "new" ? (
            <button type="button" onClick={scoreThisLead} disabled={!permissions.editBid || aiScoreLoading}>
              {aiScoreLoading ? "Scoring..." : "Score This Lead"}
            </button>
          ) : null}
          {mode !== "new" ? (
            <button type="button" onClick={scoreThisLeadWithRules} disabled={!permissions.editBid || aiScoreLoading}>
              Rule-Based Test Score
            </button>
          ) : null}
          {mode !== "new" ? (
            <button type="button" onClick={checkMissingInfo} disabled={!permissions.editBid || Boolean(missingInfoLoading)}>
              {missingInfoLoading === "ai" ? "Checking..." : "Check Missing Info"}
            </button>
          ) : null}
          {mode !== "new" ? (
            <button type="button" onClick={checkMissingInfoWithRules} disabled={!permissions.editBid || Boolean(missingInfoLoading)}>
              Rule-Based Missing Info Check
            </button>
          ) : null}
          {mode !== "new" ? (
            <button type="button" onClick={generateProposalDraft} disabled={!permissions.editBid || proposalDraftLoading}>
              {proposalDraftLoading ? "Generating..." : "Generate Proposal Draft"}
            </button>
          ) : null}
          <button className="gold-action" type="submit" disabled={!permissions.editBid}>
            Save Lead
          </button>
        </div>
      </div>
      {localMessage ? <p className="backup-message">{localMessage}</p> : null}
      {aiScoreError ? <p className="backup-message backup-message-error">{aiScoreError}</p> : null}
      {missingInfoError ? <p className="backup-message backup-message-error">{missingInfoError}</p> : null}
      {proposalDraftError ? <p className="backup-message backup-message-error">{proposalDraftError}</p> : null}
      {handoffError ? <p className="backup-message backup-message-error">{handoffError}</p> : null}
      <fieldset className="editor-permission-fieldset" disabled={!permissions.editBid}>
        <LeadQuickActions statuses={quickStatuses} currentStatus={leadDraft.status} onSetStatus={setQuickStatus} />
        {proposalDraft ? (
          <LeadProposalDraftReview
            draft={proposalDraft}
            isApplying={handoffLoading === "proposal_draft"}
            onApply={applyProposalDraft}
            onCancel={() => setProposalDraft(null)}
            onCopy={copyProposalDraft}
          />
        ) : null}
        {mode !== "new" ? (
          <LeadNextActions
            existingJobHandoff={findJobHandoffForLead(normalizedJobHandoffs, leadDraft.id || existingLead?.id)}
            lead={leadDraft}
            loading={handoffLoading}
            permissions={permissions}
            onCreateJobHandoff={createJobHandoff}
            onHandoff={createLeadHandoff}
            onNavigate={onNavigate}
          />
        ) : null}
        {mode !== "new" ? (
          <LeadMissingInfoCard
            isLoading={missingInfoLoading}
            lead={leadDraft}
            permissions={permissions}
            onCheckAi={checkMissingInfo}
            onCheckRules={checkMissingInfoWithRules}
            onClear={clearMissingInfoCheck}
            onCopyQuestions={copyCustomerQuestions}
            onMarkRequested={markMissingInfoRequested}
          />
        ) : null}
        <div className="bid-form-sections">
          <LeadFormSection title="Lead Summary">
            <div className="bid-form-grid">
              <LeadField label="Title" value={leadDraft.title} onChange={(value) => setLeadDraft({ ...leadDraft, title: value })} />
              <LeadSelect label="Status" options={LEAD_STATUSES} value={leadDraft.status} onChange={(value) => setLeadDraft({ ...leadDraft, status: value })} />
              <LeadSelect label="Service Type" options={LEAD_SERVICE_TYPES} value={leadDraft.serviceType} onChange={(value) => setLeadDraft({ ...leadDraft, serviceType: value })} />
              <LeadField label="Project Type" value={leadDraft.projectType} onChange={(value) => setLeadDraft({ ...leadDraft, projectType: value })} />
              <LeadField label="Due Date" type="date" value={leadDraft.dueDate} onChange={(value) => setLeadDraft({ ...leadDraft, dueDate: value })} />
              <LeadField label="Estimated Value" type="number" value={leadDraft.estimatedValue} onChange={(value) => setLeadDraft({ ...leadDraft, estimatedValue: value })} />
              <div className="bid-form-wide">
                <LeadField label="Description" multiline value={leadDraft.description} onChange={(value) => setLeadDraft({ ...leadDraft, description: value })} />
              </div>
            </div>
          </LeadFormSection>

          <LeadFormSection title="Source / Company">
            <div className="bid-form-grid">
              <label className="contact-select-field bid-form-wide">
                <span>Lead Source</span>
                <select value={leadDraft.sourceId} onChange={(event) => setLeadDraft(applySourceToLeadDraft(leadDraft, normalizedData.sources, event.target.value))}>
                  <option value="">No source linked</option>
                  {normalizedData.sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name || "Unnamed source"}
                    </option>
                  ))}
                </select>
              </label>
              <LeadField label="Source Name" value={leadDraft.sourceName} onChange={(value) => setLeadDraft({ ...leadDraft, sourceName: value })} />
              <LeadField label="Source URL" value={leadDraft.sourceUrl} onChange={(value) => setLeadDraft({ ...leadDraft, sourceUrl: value })} />
              <LeadField label="Company Name" value={leadDraft.companyName} onChange={(value) => setLeadDraft({ ...leadDraft, companyName: value })} />
              <LeadField label="City" value={leadDraft.city} onChange={(value) => setLeadDraft({ ...leadDraft, city: value })} />
              <LeadField label="State" value={leadDraft.state} onChange={(value) => setLeadDraft({ ...leadDraft, state: value })} />
            </div>
          </LeadFormSection>

          <LeadFormSection title="Contact">
            <div className="bid-form-grid">
              <LeadField label="Contact Name" value={leadDraft.contactName} onChange={(value) => setLeadDraft({ ...leadDraft, contactName: value })} />
              <LeadField label="Contact Email" type="email" value={leadDraft.contactEmail} onChange={(value) => setLeadDraft({ ...leadDraft, contactEmail: value })} />
              <LeadField label="Contact Phone" value={leadDraft.contactPhone} onChange={(value) => setLeadDraft({ ...leadDraft, contactPhone: value })} />
            </div>
          </LeadFormSection>

          <LeadFormSection title="Follow-Up">
            <LeadFollowUpQuickActions lead={leadDraft} onApply={applyFollowUpQuickAction} />
            <div className="bid-form-grid">
              <LeadField label="Last Contact Date" type="date" value={leadDraft.lastContactDate} onChange={(value) => setLeadDraft({ ...leadDraft, lastContactDate: value })} />
              <LeadSelect
                label="Last Contact Method"
                options={["", ...LEAD_CONTACT_METHODS]}
                value={leadDraft.lastContactMethod}
                onChange={(value) => setLeadDraft({ ...leadDraft, lastContactMethod: value })}
              />
              <LeadField label="Next Follow-Up Date" type="date" value={leadDraft.nextFollowUpDate} onChange={(value) => setLeadDraft({ ...leadDraft, nextFollowUpDate: value })} />
              <LeadSelect
                label="Follow-Up Status"
                options={LEAD_FOLLOW_UP_STATUSES}
                value={leadDraft.followUpStatus}
                onChange={(value) => setLeadDraft({ ...leadDraft, followUpStatus: value })}
              />
              <div className="bid-form-wide">
                <LeadField label="Contact Notes" multiline value={leadDraft.contactNotes} onChange={(value) => setLeadDraft({ ...leadDraft, contactNotes: value })} />
              </div>
              <div className="bid-form-wide">
                <LeadField label="No Follow-Up Reason" multiline value={leadDraft.noFollowUpReason} onChange={(value) => setLeadDraft({ ...leadDraft, noFollowUpReason: value })} />
              </div>
            </div>
          </LeadFormSection>

          <LeadFormSection title="AI-Ready Fit Fields">
            <AiScoreSummary lead={leadDraft} />
            <div className="bid-form-grid">
              <LeadField label="Capacity Fit" value={leadDraft.capacityFit} onChange={(value) => setLeadDraft({ ...leadDraft, capacityFit: value })} />
              <LeadField label="AI Fit Score" type="number" value={leadDraft.aiFitScore} onChange={(value) => setLeadDraft({ ...leadDraft, aiFitScore: value })} />
              <LeadSelect label="AI Fit Label" options={["Good Fit", "Maybe", "Bad Fit"]} value={leadDraft.aiFitLabel || "Maybe"} onChange={(value) => setLeadDraft({ ...leadDraft, aiFitLabel: value })} />
              <LeadSelect
                label="Suggested Company Mode"
                options={LEAD_SUGGESTED_COMPANY_MODES}
                value={leadDraft.suggestedCompanyMode || "Unknown"}
                onChange={(value) => setLeadDraft({ ...leadDraft, suggestedCompanyMode: value })}
              />
              <LeadField label="AI Fit Reason" multiline value={leadDraft.aiFitReason} onChange={(value) => setLeadDraft({ ...leadDraft, aiFitReason: value })} />
              <LeadField label="AI Risks" multiline value={leadDraft.aiRisks} onChange={(value) => setLeadDraft({ ...leadDraft, aiRisks: value })} />
              <LeadField label="AI Next Step" multiline value={leadDraft.aiNextStep} onChange={(value) => setLeadDraft({ ...leadDraft, aiNextStep: value })} />
              <div className="bid-form-wide">
                <LeadField label="Notes" multiline value={leadDraft.notes} onChange={(value) => setLeadDraft({ ...leadDraft, notes: value })} />
              </div>
            </div>
          </LeadFormSection>
        </div>
      </fieldset>
    </form>
  );
}

function AiScoreSummary({ lead = {} }) {
  if (!hasLeadAiScore(lead)) {
    return <p className="empty-list-message">No AI score has been saved for this lead yet. Manual lead status stays separate from AI fit label.</p>;
  }

  return (
    <div className="lead-ai-score-card">
      <div>
        <span>AI Score</span>
        <strong>{lead.aiFitScore !== "" ? `${lead.aiFitScore}/100` : "Not scored"}</strong>
      </div>
      <div>
        <span>AI Label</span>
        <Badge className={getLeadStatusClass(lead.aiFitLabel)}>{lead.aiFitLabel || "Maybe"}</Badge>
      </div>
      <div>
        <span>Suggested Mode</span>
        <strong>{lead.suggestedCompanyMode || "Unknown"}</strong>
      </div>
      <div>
        <span>Score Source</span>
        <strong>{formatLeadScoreSource(lead.scoreSource)}</strong>
      </div>
      <p>{lead.aiFitReason || "No AI reason saved."}</p>
      {lead.aiRisks ? <p><strong>Risks:</strong> {lead.aiRisks}</p> : null}
      {lead.aiNextStep ? <p><strong>Next step:</strong> {lead.aiNextStep}</p> : null}
      <small>
        Manual lead status is separate from this AI label.
        {lead.scoredAt ? ` Scored ${formatLeadScoredAt(lead.scoredAt)}.` : ""}
      </small>
    </div>
  );
}

function LeadMissingInfoCard({
  isLoading = "",
  lead = {},
  permissions = {},
  onCheckAi,
  onCheckRules,
  onClear,
  onCopyQuestions,
  onMarkRequested,
}) {
  const normalizedResult = normalizeLeadMissingInfoResult(lead);
  const hasCheck = Boolean(lead.missingInfoLastCheckedAt || normalizedResult.proposalReadinessLabel || normalizedResult.missingInfoChecklist.length);
  const sections = [
    ["Missing Information", normalizedResult.missingInfoChecklist],
    ["Critical Questions", normalizedResult.criticalQuestions],
    ["Recommended Photos / Docs", normalizedResult.recommendedPhotosOrDocs],
    ["Risk Flags", normalizedResult.missingInfoRiskFlags],
  ];

  return (
    <LeadFormSection title="Missing Info / Proposal Readiness">
      <div className="lead-ai-score-card">
        <div>
          <span>Readiness Score</span>
          <strong>{normalizedResult.proposalReadinessScore !== "" ? `${normalizedResult.proposalReadinessScore}/100` : "Not checked"}</strong>
        </div>
        <div>
          <span>Readiness Label</span>
          <Badge className={getLeadReadinessClass(normalizedResult.proposalReadinessLabel)}>
            {normalizedResult.proposalReadinessLabel || "Not Checked"}
          </Badge>
        </div>
        <div>
          <span>Missing Info Status</span>
          <strong>{lead.missingInfoStatus || "Not Checked"}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{formatLeadScoreSource(lead.missingInfoSource)}</strong>
        </div>
        {normalizedResult.missingInfoRecommendedNextStep ? (
          <p>
            <strong>Recommended next step:</strong> {normalizedResult.missingInfoRecommendedNextStep}
          </p>
        ) : (
          <p>No missing info check has been saved yet.</p>
        )}
        {lead.missingInfoLastCheckedAt ? <small>Checked {formatLeadScoredAt(lead.missingInfoLastCheckedAt)}.</small> : null}
      </div>
      <div className="lead-proposal-draft-review">
        <div className="settings-actions">
          <button type="button" onClick={onCheckAi} disabled={!permissions.editBid || Boolean(isLoading)}>
            {isLoading === "ai" ? "Checking..." : "Check Missing Info"}
          </button>
          <button type="button" onClick={onCheckRules} disabled={!permissions.editBid || Boolean(isLoading)}>
            {isLoading === "rule_based" ? "Checking..." : "Rule-Based Missing Info Check"}
          </button>
          <button type="button" onClick={onCopyQuestions} disabled={!lead.customerQuestionDraft}>
            Copy Customer Questions
          </button>
          <button type="button" onClick={onMarkRequested} disabled={!permissions.editBid || Boolean(isLoading) || !hasCheck}>
            {isLoading === "requested" ? "Updating..." : "Mark Missing Info Requested"}
          </button>
          <button type="button" onClick={onClear} disabled={!permissions.editBid || !hasCheck}>
            Clear Missing Info Check
          </button>
        </div>
        {sections.map(([title, items]) =>
          items.length > 0 ? (
            <div className="lead-proposal-draft-section" key={title}>
              <strong>{title}</strong>
              <ul>
                {items.map((item, index) => (
                  <li key={`${title}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        {lead.customerQuestionDraft ? (
          <div className="lead-proposal-draft-section">
            <strong>Customer / GC Question Draft</strong>
            <p>{lead.customerQuestionDraft}</p>
          </div>
        ) : null}
        <small>Questions are drafts only. Review before sending anything to a customer, GC, or source.</small>
      </div>
    </LeadFormSection>
  );
}

function getLeadReadinessClass(label = "") {
  if (label === "Ready") {
    return "status-won";
  }

  if (label === "Not Ready") {
    return "status-lost";
  }

  return "status-draft";
}

function formatLeadScoreSource(scoreSource = "") {
  if (scoreSource === "ai") {
    return "AI";
  }

  if (scoreSource === "rule_based") {
    return "Rule-Based Test Score";
  }

  return "Not saved";
}

function formatLeadScoredAt(scoredAt = "") {
  const date = new Date(scoredAt);

  if (!Number.isFinite(date.valueOf())) {
    return "";
  }

  return date.toLocaleString();
}

function LeadProposalDraftReview({ draft = {}, isApplying = false, onApply, onCancel, onCopy }) {
  const normalizedDraft = normalizeLeadProposalDraftResult(draft);
  const sections = [
    ["Scope of Work", normalizedDraft.scopeOfWork],
    ["Inclusions", normalizedDraft.inclusions],
    ["Exclusions", normalizedDraft.exclusions],
    ["Assumptions", normalizedDraft.assumptions],
    ["Missing Information", normalizedDraft.missingInformation],
    ["Internal Risk Notes", normalizedDraft.internalRiskNotes],
  ];

  return (
    <LeadFormSection title="AI Proposal Draft Review">
      <div className="lead-proposal-draft-review">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Review Before Applying</p>
            <h3>{normalizedDraft.proposalTitle || "Proposal Draft"}</h3>
            <p>{normalizedDraft.customerSummary || "No customer summary generated."}</p>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={onCopy}>
              Copy Draft
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="gold-action" type="button" onClick={onApply} disabled={isApplying}>
              {isApplying ? "Applying..." : "Apply to New Proposal"}
            </button>
          </div>
        </div>
        <div className="lead-proposal-draft-meta">
          <span>Client: {normalizedDraft.clientName || "Missing"}</span>
          <span>Location: {normalizedDraft.projectLocation || "Missing"}</span>
          <span>Next step: {normalizedDraft.recommendedNextStep || "Review with Last Yard"}</span>
        </div>
        {sections.map(([title, items]) =>
          items.length > 0 ? (
            <div className="lead-proposal-draft-section" key={title}>
              <strong>{title}</strong>
              <ul>
                {items.map((item, index) => (
                  <li key={`${title}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        {normalizedDraft.scheduleNotes ? (
          <p>
            <strong>Schedule Notes:</strong> {normalizedDraft.scheduleNotes}
          </p>
        ) : null}
        {normalizedDraft.followUpEmailDraft ? (
          <div className="lead-proposal-draft-section">
            <strong>Follow-Up Email Draft</strong>
            <p>{normalizedDraft.followUpEmailDraft}</p>
          </div>
        ) : null}
        {normalizedDraft.followUpSmsDraft ? (
          <div className="lead-proposal-draft-section">
            <strong>Follow-Up SMS Draft</strong>
            <p>{normalizedDraft.followUpSmsDraft}</p>
          </div>
        ) : null}
        <small>Generated content is a draft only. Review pricing, scope, measurements, terms, and PDF output before sending anything.</small>
      </div>
    </LeadFormSection>
  );
}

function LeadNextActions({ existingJobHandoff = null, lead = {}, loading = "", permissions = {}, onCreateJobHandoff, onHandoff, onNavigate }) {
  const actions = [
    {
      field: "estimateId",
      helper: "Start a residential simple estimate draft with this lead's customer, contact, project, and scope notes.",
      label: "Create Residential Estimate",
      linkedLabel: "Residential estimate",
      openPath: (id) => `/proposals/${id}`,
      permission: permissions.createProposal,
      type: "residential_estimate",
    },
    {
      field: "proposalId",
      helper: "Start a commercial subcontractor proposal draft from the lead details.",
      label: "Create Commercial Proposal",
      linkedLabel: "Commercial proposal",
      openPath: (id) => `/proposals/${id}`,
      permission: permissions.createProposal,
      type: "commercial_proposal",
    },
    {
      field: "packetId",
      helper: "Start a GC / Prime packet draft when this lead needs a bid packet.",
      label: "Create GC Packet / Bid Packet",
      linkedLabel: "GC packet",
      openPath: (id) => `/proposals/${id}`,
      permission: permissions.createProposal,
      type: "gc_packet",
    },
    {
      field: "contactId",
      helper: "Create or link a saved contact from the lead contact details.",
      label: "Add / Link Contact",
      linkedLabel: "Contact",
      openPath: () => "/contacts",
      permission: permissions.createContact,
      type: "contact",
    },
    {
      field: "jobHandoffId",
      helper: "Prepare a prep-only operations packet for future Concrete Ops review. This does not create a real job.",
      label: "Create Job Handoff Packet",
      linkedLabel: "Job handoff packet",
      openPath: (id) => `/job-handoffs/${id}`,
      permission: permissions.editBid,
      type: "job_handoff",
    },
  ];
  const handoffHistory = Array.isArray(lead.handoffHistory) ? lead.handoffHistory.slice(0, 4) : [];

  return (
    <LeadFormSection title="Next Actions">
      <div className="lead-next-actions">
        {actions.map((action) => {
          const recordId = action.type === "job_handoff" ? lead[action.field] || existingJobHandoff?.id || "" : lead[action.field] || "";
          const isLoading = loading === action.type;
          const runAction = action.type === "job_handoff" ? onCreateJobHandoff : onHandoff;

          return (
            <article className="lead-next-action-row" key={action.type}>
              <div>
                <strong>{action.label}</strong>
                <span>{action.helper}</span>
                {recordId ? (
                  <small>
                    {action.linkedLabel} started: <code>{recordId}</code>
                  </small>
                ) : (
                  <small>Not started from this lead yet.</small>
                )}
              </div>
              <div className="table-actions">
                {recordId ? (
                  <button type="button" onClick={() => onNavigate?.(action.openPath(recordId))}>
                    Open
                  </button>
                ) : null}
                <button type="button" disabled={!action.permission || Boolean(loading)} onClick={() => runAction?.(action.type)}>
                  {isLoading ? "Starting..." : recordId && action.type === "job_handoff" ? "Open Existing" : recordId ? "Create Another" : action.label}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {handoffHistory.length > 0 ? (
        <div className="lead-handoff-history">
          <strong>Handoff history</strong>
          {handoffHistory.map((record) => (
            <small key={record.id}>
              {record.label || record.recordId || "Lead handoff"} - {record.status || record.type || "Recorded"}
            </small>
          ))}
        </div>
      ) : null}
    </LeadFormSection>
  );
}

function LeadFollowUpQuickActions({ lead = {}, onApply }) {
  const quickActions = [
    ["mark_contacted", "Mark Contacted"],
    ["follow_up_tomorrow", "Follow Up Tomorrow"],
    ["follow_up_two_days", "Follow Up in 2 Days"],
    ["waiting_on_response", "Waiting on Response"],
    ["do_not_follow_up", "No Thanks / Do Not Follow Up"],
  ];
  const statusText = lead.nextFollowUpDate
    ? `Next follow-up: ${formatDisplayDate(lead.nextFollowUpDate)}`
    : "No follow-up date set.";

  return (
    <div className={`lead-follow-up-card ${getLeadFollowUpClass(lead)}`}>
      <div>
        <strong>{lead.followUpStatus || "Not Contacted"}</strong>
        <span>{statusText}</span>
      </div>
      <div className="lead-quick-actions">
        {quickActions.map(([action, label]) => (
          <button key={action} type="button" onClick={() => onApply?.(action)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeadAiConfigNote({ configured = null }) {
  const text =
    configured === true
      ? "Live AI scoring: configured. Score This Lead uses the server-side OPENAI_API_KEY."
      : configured === false
        ? "Live AI scoring: not configured. Add OPENAI_API_KEY to enable live AI scoring. Rule-Based Test Score does not call OpenAI."
        : "Live AI scoring: checking server configuration. Rule-Based Test Score does not call OpenAI.";

  return <p className={`lead-ai-config-note ${configured === true ? "lead-ai-config-ready" : "lead-ai-config-missing"}`}>{text}</p>;
}

function formatLeadProposalDraftForClipboard(draft = {}) {
  const normalizedDraft = normalizeLeadProposalDraftResult(draft);
  const listSection = (title, items = []) => (items.length > 0 ? `${title}:\n${items.map((item) => `- ${item}`).join("\n")}` : "");

  return [
    normalizedDraft.proposalTitle,
    normalizedDraft.clientName ? `Client: ${normalizedDraft.clientName}` : "",
    normalizedDraft.projectLocation ? `Location: ${normalizedDraft.projectLocation}` : "",
    normalizedDraft.customerSummary,
    listSection("Scope of Work", normalizedDraft.scopeOfWork),
    listSection("Inclusions", normalizedDraft.inclusions),
    listSection("Exclusions", normalizedDraft.exclusions),
    listSection("Assumptions", normalizedDraft.assumptions),
    normalizedDraft.scheduleNotes ? `Schedule Notes:\n${normalizedDraft.scheduleNotes}` : "",
    listSection("Missing Information", normalizedDraft.missingInformation),
    listSection("Internal Risk Notes", normalizedDraft.internalRiskNotes),
    normalizedDraft.recommendedNextStep ? `Recommended Next Step:\n${normalizedDraft.recommendedNextStep}` : "",
    normalizedDraft.followUpEmailDraft ? `Follow-Up Email Draft:\n${normalizedDraft.followUpEmailDraft}` : "",
    normalizedDraft.followUpSmsDraft ? `Follow-Up SMS Draft:\n${normalizedDraft.followUpSmsDraft}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function LeadQuickActions({ currentStatus = "New", statuses = [], onSetStatus }) {
  return (
    <div className="lead-quick-actions">
      {statuses.map((status) => (
        <button className={currentStatus === status ? "lead-quick-active" : ""} key={status} type="button" onClick={() => onSetStatus(status)}>
          Mark {status}
        </button>
      ))}
    </div>
  );
}

function LeadFormSection({ children, title }) {
  return (
    <section className="bid-form-section">
      <div className="bid-form-section-heading">
        <strong>{title}</strong>
      </div>
      {children}
    </section>
  );
}

function LeadMiniRow({ lead = {}, onNavigate }) {
  return (
    <button className="lead-mini-row" type="button" onClick={() => onNavigate?.(`/lead-finder/leads/${lead.id}`)}>
      <span>{lead.title || "Untitled lead"}</span>
      <strong>{lead.status}</strong>
      <small>{[lead.city, lead.serviceType].filter(Boolean).join(" | ")}</small>
    </button>
  );
}

function LeadFilterSelect({ label, options = [], value = "all", onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LeadSelect({ label, options = [], value = "", onChange }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LeadField({ label, multiline = false, onChange, type = "text", value = "" }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={3} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function applySourceToLeadDraft(leadDraft = {}, sources = [], sourceId = "") {
  const source = sources.find((item) => item.id === sourceId);

  return {
    ...leadDraft,
    sourceId,
    sourceName: source?.name || "",
    sourceUrl: source?.url || "",
    serviceType: source?.defaultServiceType && source.defaultServiceType !== "Other" ? source.defaultServiceType : leadDraft.serviceType,
    suggestedCompanyMode:
      source?.defaultCompanyMode && source.defaultCompanyMode !== "Unknown" ? source.defaultCompanyMode : leadDraft.suggestedCompanyMode,
  };
}

function createLeadDraftForEditor(existingLead, mode = "detail", sources = [], prefillSourceId = "") {
  if (mode !== "new") {
    return createEmptyLead(existingLead || {});
  }

  const source = sources.find((item) => item.id === prefillSourceId);
  return source ? createLeadFromSource(source) : createEmptyLead();
}

function getLeadStatusClass(status = "") {
  return `lead-status-${String(status || "new").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new"}`;
}

function getLeadFollowUpClass(lead = {}) {
  if (isLeadFollowUpOverdue(lead)) {
    return "lead-follow-up-overdue";
  }

  if (isLeadFollowUpDueToday(lead)) {
    return "lead-follow-up-due";
  }

  return "";
}

function getLeadSourceCheckClass(source = {}) {
  if (isLeadSourceOverdue(source)) {
    return "lead-follow-up-overdue";
  }

  if (isLeadSourceDueToday(source)) {
    return "lead-follow-up-due";
  }

  return "";
}
