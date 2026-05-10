import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../proposalData.js";
import { Badge } from "../common/Badges.jsx";
import { formatDisplayDate } from "../../utils/formatting/display.js";
import {
  LEAD_CONTACT_METHODS,
  LEAD_FOLLOW_UP_STATUSES,
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
  getLeadFinderStats,
  getLeadSourceOpenUrl,
  hasLeadAiScore,
  isLeadFollowUpDueToday,
  isLeadFollowUpOverdue,
  isLeadSourceDueToday,
  isLeadSourceOverdue,
  normalizeLeadFinderData,
  normalizeLeadProposalDraftResult,
  normalizeLeadSource,
  previewLeadFinderBackupImport,
  previewLeadFinderStarterSources,
} from "../../utils/leadFinder.js";

export function LeadFinderView({
  data = {},
  leadAiConfigured = null,
  message = "",
  permissions = {},
  route = {},
  onBackToDashboard,
  onAddStarterSources,
  onDeactivateSource,
  onExportBackup,
  onGenerateProposalDraft,
  onImportBackup,
  onLeadHandoff,
  onNavigate,
  onApplyProposalDraft,
  onSaveLead,
  onSaveSource,
  onScoreLead,
  onScoreLeadWithRules,
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
      ) : section === "dailyCheck" ? (
        <LeadDailySourceCheckPage
          data={normalizedData}
          permissions={permissions}
          onAddLeadFromSource={addLeadFromSource}
          onSaveSource={onSaveSource}
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
          leadAiConfigured={leadAiConfigured}
          leadId={route.id}
          mode="detail"
          permissions={permissions}
          onNavigate={navigateLeadFinder}
          onApplyProposalDraft={onApplyProposalDraft}
          onLeadHandoff={onLeadHandoff}
          onGenerateProposalDraft={onGenerateProposalDraft}
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
        />
      )}
    </section>
  );
}

function LeadFinderHeader({ section = "dashboard", onBackToDashboard, onNavigate }) {
  const navItems = [
    ["dashboard", "Dashboard", "/lead-finder"],
    ["dailyCheck", "Daily Source Check", "/lead-finder/daily-check"],
    ["sources", "Sources", "/lead-finder/sources"],
    ["leads", "Lead Inbox", "/lead-finder/leads"],
    ["newLead", "New Lead", "/lead-finder/leads/new"],
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

function LeadFinderDashboard({ data = {}, permissions = {}, onExportBackup, onImportBackup, onNavigate }) {
  const stats = getLeadFinderStats(data);
  const statCards = [
    ["Total Leads", stats.totalLeads],
    ["New Leads", stats.newLeads],
    ["Good Fit Leads", stats.goodFitLeads],
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

  return (
    <>
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

function LeadEditPage({
  data = {},
  leadAiConfigured = null,
  leadId = "",
  mode = "detail",
  permissions = {},
  prefillSourceId = "",
  onApplyProposalDraft,
  onGenerateProposalDraft,
  onLeadHandoff,
  onNavigate,
  onSaveLead,
  onScoreLead,
  onScoreLeadWithRules,
  onUpdateLeadStatus,
}) {
  const normalizedData = normalizeLeadFinderData(data);
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
            lead={leadDraft}
            loading={handoffLoading}
            permissions={permissions}
            onHandoff={createLeadHandoff}
            onNavigate={onNavigate}
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
      <p>{lead.aiFitReason || "No AI reason saved."}</p>
      {lead.aiRisks ? <p><strong>Risks:</strong> {lead.aiRisks}</p> : null}
      {lead.aiNextStep ? <p><strong>Next step:</strong> {lead.aiNextStep}</p> : null}
      <small>Manual lead status is separate from this AI label.</small>
    </div>
  );
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

function LeadNextActions({ lead = {}, loading = "", permissions = {}, onHandoff, onNavigate }) {
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
  ];
  const handoffHistory = Array.isArray(lead.handoffHistory) ? lead.handoffHistory.slice(0, 4) : [];

  return (
    <LeadFormSection title="Next Actions">
      <div className="lead-next-actions">
        {actions.map((action) => {
          const recordId = lead[action.field] || "";
          const isLoading = loading === action.type;

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
                <button type="button" disabled={!action.permission || Boolean(loading)} onClick={() => onHandoff?.(action.type)}>
                  {isLoading ? "Starting..." : recordId ? "Create Another" : action.label}
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
