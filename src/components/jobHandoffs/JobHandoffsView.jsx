import { useMemo, useState } from "react";
import { formatCurrency } from "../../proposalData.js";
import { Badge } from "../common/Badges.jsx";
import {
  JOB_HANDOFF_STATUSES,
  applyJobHandoffOpsReadinessOverride,
  calculateJobHandoffOpsReadiness,
  filterJobHandoffs,
  formatJobHandoffSummary,
  getJobHandoffById,
  getJobHandoffStats,
  normalizeJobHandoff,
  normalizeJobHandoffs,
  toggleJobHandoffOpsTbdField,
} from "../../utils/jobHandoffs.js";
import { findOpsJobDraftForHandoff, getOpsJobDraftById } from "../../utils/opsJobDrafts.js";

export function JobHandoffsView({
  handoffs = [],
  message = "",
  opsJobDrafts = [],
  permissions = {},
  route = {},
  onBackToDashboard,
  onCreateOpsJobDraft,
  onNavigate,
  onSaveHandoff,
}) {
  const normalizedHandoffs = normalizeJobHandoffs(handoffs);
  const section = route.section || "list";

  return (
    <section className="lead-finder-panel job-handoff-panel">
      <div className="recent-heading no-print">
        <div>
          <p className="list-kicker">Operations Bridge</p>
          <h2>Job Handoff Packets</h2>
          <p>Prepare ready or won leads for future Concrete Ops job creation without creating a real job yet.</p>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={() => onNavigate?.("/lead-finder")}>
            Lead Finder
          </button>
          <button type="button" onClick={onBackToDashboard}>
            Dashboard
          </button>
        </div>
      </div>
      {message ? <p className="backup-message no-print">{message}</p> : null}
      {section === "detail" ? (
        <JobHandoffDetailPage
          handoffs={normalizedHandoffs}
          opsJobDrafts={opsJobDrafts}
          packetId={route.id}
          permissions={permissions}
          onNavigate={onNavigate}
          onCreateOpsJobDraft={onCreateOpsJobDraft}
          onSaveHandoff={onSaveHandoff}
        />
      ) : (
        <JobHandoffListPage handoffs={normalizedHandoffs} onNavigate={onNavigate} />
      )}
    </section>
  );
}

function JobHandoffListPage({ handoffs = [], onNavigate }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [readyFilter, setReadyFilter] = useState("all");
  const [opsReadinessFilter, setOpsReadinessFilter] = useState("all");
  const [sortOption, setSortOption] = useState("updated_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const stats = getJobHandoffStats(handoffs);
  const serviceTypes = useMemo(
    () => Array.from(new Set(handoffs.map((packet) => packet.serviceType).filter(Boolean))).sort(),
    [handoffs],
  );
  const filteredHandoffs = filterJobHandoffs(handoffs, {
    cityFilter,
    opsReadinessFilter,
    readyFilter,
    searchQuery,
    serviceTypeFilter,
    sortOption,
    statusFilter,
  });

  return (
    <div className="lead-finder-layout">
      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Handoff Summary</p>
            <h3>Ops Prep Queue</h3>
          </div>
        </div>
        <div className="dashboard-stat-grid lead-finder-stat-grid">
          <StatCard label="Total Handoffs" value={stats.total} />
          <StatCard label="Draft" value={stats.draft} />
          <StatCard label="Ready for Ops Review" value={stats.readyForOpsReview} />
          <StatCard label="Waiting on Customer / GC" value={stats.waitingOnCustomer} />
          <StatCard label="Ready to Create Job" value={stats.readyToCreateJob} />
          <StatCard label="Handoffs Ready for Concrete Ops" value={stats.opsReady} />
          <StatCard label="Handoffs Not Ready" value={stats.opsNotReady} />
          <StatCard label="Needs Review" value={stats.opsNeedsReview} />
          <StatCard label="Created Later" value={stats.createdLater} />
        </div>
      </article>

      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Filters</p>
            <h3>Find Handoffs</h3>
          </div>
        </div>
        <div className="lead-filter-grid">
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {JOB_HANDOFF_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service Type
            <select value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
              <option value="all">All service types</option>
              {serviceTypes.map((serviceType) => (
                <option key={serviceType} value={serviceType}>
                  {serviceType}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter city" />
          </label>
          <label>
            Ready Filter
            <select value={readyFilter} onChange={(event) => setReadyFilter(event.target.value)}>
              <option value="all">All handoffs</option>
              <option value="ready">Ready / ops-ready</option>
              <option value="not_ready">Not ready</option>
            </select>
          </label>
          <label>
            Concrete Ops Readiness
            <select value={opsReadinessFilter} onChange={(event) => setOpsReadinessFilter(event.target.value)}>
              <option value="all">All readiness labels</option>
              <option value="ready">Ready</option>
              <option value="needs_review">Needs Review</option>
              <option value="not_ready">Not Ready</option>
              <option value="override">Override</option>
            </select>
          </label>
          <label>
            Sort
            <select value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
              <option value="updated_desc">Recently updated</option>
              <option value="ready_first">Ready first</option>
              <option value="needs_review_first">Needs Review first</option>
              <option value="recently_checked">Recently checked</option>
            </select>
          </label>
          <label>
            Search
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Customer, project, scope" />
          </label>
        </div>
      </article>

      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Job Handoff Packets</p>
            <h3>{filteredHandoffs.length} packet{filteredHandoffs.length === 1 ? "" : "s"}</h3>
          </div>
        </div>
        {filteredHandoffs.length > 0 ? (
          <div className="lead-inbox-list">
            {filteredHandoffs.map((packet) => (
              <JobHandoffListRow key={packet.id} packet={packet} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No job handoff packets match these filters yet.</p>
        )}
      </article>
    </div>
  );
}

function JobHandoffDetailPage({ handoffs = [], opsJobDrafts = [], packetId = "", permissions = {}, onNavigate, onCreateOpsJobDraft, onSaveHandoff }) {
  const existingPacket = getJobHandoffById(handoffs, packetId);
  const existingOpsDraft =
    existingPacket?.opsJobDraftId ? getOpsJobDraftById(opsJobDrafts, existingPacket.opsJobDraftId) : findOpsJobDraftForHandoff(opsJobDrafts, existingPacket?.id);
  const [packetDraft, setPacketDraft] = useState(() => (existingPacket ? normalizeJobHandoff(existingPacket) : null));
  const [localMessage, setLocalMessage] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  if (!existingPacket || !packetDraft) {
    return (
      <div className="contact-empty-state">
        <p className="list-kicker">Job Handoff Packet</p>
        <h3>Handoff not found.</h3>
        <p>This packet may have been deleted or is not available in local data.</p>
        <button type="button" onClick={() => onNavigate?.("/job-handoffs")}>
          Back to Job Handoffs
        </button>
      </div>
    );
  }

  async function saveHandoff(event) {
    event.preventDefault();
    await savePacket(packetDraft, "Job handoff packet saved.");
  }

  async function savePacket(nextPacket, message) {
    const savedPacket = await onSaveHandoff?.(nextPacket);
    if (savedPacket) {
      setPacketDraft(savedPacket);
      setLocalMessage(message);
    }

    return savedPacket;
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(formatJobHandoffSummary(packetDraft));
      setLocalMessage("Job handoff summary copied.");
    } catch {
      setLocalMessage("Copy failed. Select the summary text manually.");
    }
  }

  async function checkOpsReadiness() {
    const checkedPacket = calculateJobHandoffOpsReadiness(packetDraft);
    await savePacket(checkedPacket, "Concrete Ops readiness checked.");
  }

  async function overrideOpsReadiness() {
    try {
      const overriddenPacket = applyJobHandoffOpsReadinessOverride(packetDraft, overrideReason);
      const savedPacket = await savePacket(overriddenPacket, "Concrete Ops readiness override saved.");

      if (savedPacket) {
        setOverrideReason("");
      }
    } catch (error) {
      setLocalMessage(error?.message || "Enter an override reason before overriding readiness.");
    }
  }

  function toggleTbdField(field) {
    setPacketDraft(toggleJobHandoffOpsTbdField(packetDraft, field));
  }

  return (
    <form className="lead-finder-card lead-detail-card job-handoff-detail" onSubmit={saveHandoff}>
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Job Handoff Packet</p>
          <h3>{packetDraft.projectName || packetDraft.proposalTitle || "Untitled handoff"}</h3>
          <p>Prep-only packet for future Concrete Ops review. This does not create, schedule, or publish a job.</p>
        </div>
        <div className="settings-actions no-print">
          <button type="button" onClick={() => onNavigate?.("/job-handoffs")}>
            Back to Handoffs
          </button>
          <button type="button" onClick={copySummary}>
            Copy Job Handoff Summary
          </button>
          <button type="button" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          {existingOpsDraft ? (
            <button type="button" onClick={() => onNavigate?.(`/ops-job-drafts/${existingOpsDraft.id}`)}>
              Open Concrete Ops Job Draft
            </button>
          ) : (
            <button type="button" disabled={!permissions.editBid} onClick={() => onCreateOpsJobDraft?.(packetDraft)}>
              Create Concrete Ops Job Draft
            </button>
          )}
          <button className="gold-action" type="submit" disabled={!permissions.editBid}>
            Save Handoff
          </button>
        </div>
      </div>
      {localMessage ? <p className="backup-message no-print">{localMessage}</p> : null}
      <div className="bid-form-sections">
        <HandoffSection title="Customer / Contact">
          <InfoGrid
            rows={[
              ["Customer / Company", packetDraft.customerName],
              ["Contact", packetDraft.contactName],
              ["Email", packetDraft.contactEmail],
              ["Phone", packetDraft.contactPhone],
            ]}
          />
        </HandoffSection>

        <HandoffSection title="Project Info">
          <InfoGrid
            rows={[
              ["Project", packetDraft.projectName],
              ["Address", packetDraft.projectAddress],
              ["City / State", [packetDraft.city, packetDraft.state].filter(Boolean).join(", ")],
              ["Service Type", packetDraft.serviceType],
              ["Project Type", packetDraft.projectType],
              ["Accepted Proposal Amount", packetDraft.acceptedProposalAmount !== "" ? formatCurrency(packetDraft.acceptedProposalAmount) : ""],
            ]}
          />
        </HandoffSection>

        <HandoffSection title="Scope Summary">
          <p>{packetDraft.scopeSummary || "No scope summary entered yet."}</p>
          <TextList title="Included Scope" items={packetDraft.includedScope} />
          <TextList title="Exclusions" items={packetDraft.exclusions} />
          <TextList title="Assumptions" items={packetDraft.assumptions} />
        </HandoffSection>

        <HandoffSection title="Proposal / Estimate Links">
          <InfoGrid
            rows={[
              ["Lead ID", packetDraft.sourceLeadId],
              ["Proposal ID", packetDraft.sourceProposalId],
              ["Estimate ID", packetDraft.sourceEstimateId],
              ["Packet ID", packetDraft.sourcePacketId],
              ["Proposal Status", packetDraft.proposalStatus],
              ["Lead Status", packetDraft.leadStatus],
            ]}
          />
        </HandoffSection>

        <HandoffSection title="Missing Info / Readiness">
          <InfoGrid
            rows={[
              ["Missing Info Status", packetDraft.missingInfoStatus],
              ["Readiness", packetDraft.proposalReadinessLabel],
              ["Readiness Score", packetDraft.proposalReadinessScore !== "" ? `${packetDraft.proposalReadinessScore}/100` : ""],
            ]}
          />
        </HandoffSection>

        <HandoffSection title="Follow-Up Status">
          <InfoGrid
            rows={[
              ["Follow-Up Status", packetDraft.followUpStatus],
              ["Next Follow-Up", packetDraft.nextFollowUpDate],
            ]}
          />
        </HandoffSection>

        <ConcreteOpsReadinessCard
          existingOpsDraft={existingOpsDraft}
          overrideReason={overrideReason}
          packet={packetDraft}
          permissions={permissions}
          onCheckReadiness={checkOpsReadiness}
          onOverrideReadiness={overrideOpsReadiness}
          onOverrideReasonChange={setOverrideReason}
        />

        <fieldset className="editor-permission-fieldset" disabled={!permissions.editBid}>
          <HandoffSection title="Operations Notes">
            <div className="bid-form-grid">
              <label className="bid-form-wide">
                Operations Notes
                <textarea
                  value={packetDraft.operationsNotes}
                  onChange={(event) => setPacketDraft({ ...packetDraft, operationsNotes: event.target.value })}
                />
              </label>
              <label>
                Handoff Status
                <select value={packetDraft.handoffStatus} onChange={(event) => setPacketDraft({ ...packetDraft, handoffStatus: event.target.value })}>
                  {JOB_HANDOFF_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </HandoffSection>

          <HandoffSection title="Schedule / Crew Notes">
            <div className="bid-form-grid">
              <label>
                Target Start Date
                <input
                  type="date"
                  value={packetDraft.startDateTarget}
                  onChange={(event) => setPacketDraft({ ...packetDraft, startDateTarget: event.target.value })}
                />
                <button type="button" onClick={() => toggleTbdField("startDateTarget")}>
                  {packetDraft.opsReadinessTbdFields.includes("startDateTarget") ? "Clear TBD" : "Mark TBD"}
                </button>
                {packetDraft.opsReadinessTbdFields.includes("startDateTarget") ? <small>Marked TBD for readiness.</small> : null}
              </label>
              <label className="bid-form-wide">
                Crew Notes
                <textarea value={packetDraft.crewNotes} onChange={(event) => setPacketDraft({ ...packetDraft, crewNotes: event.target.value })} />
                <button type="button" onClick={() => toggleTbdField("crewNotes")}>
                  {packetDraft.opsReadinessTbdFields.includes("crewNotes") ? "Clear Crew TBD" : "Mark Crew TBD"}
                </button>
              </label>
              <label className="bid-form-wide">
                Schedule Notes
                <textarea value={packetDraft.scheduleNotes} onChange={(event) => setPacketDraft({ ...packetDraft, scheduleNotes: event.target.value })} />
                <button type="button" onClick={() => toggleTbdField("scheduleNotes")}>
                  {packetDraft.opsReadinessTbdFields.includes("scheduleNotes") ? "Clear Schedule TBD" : "Mark Schedule TBD"}
                </button>
              </label>
            </div>
          </HandoffSection>
        </fieldset>

        <HandoffSection title="Internal Notes">
          <pre className="job-handoff-summary">{packetDraft.internalNotes || "No internal notes carried over."}</pre>
        </HandoffSection>
      </div>
    </form>
  );
}

function JobHandoffListRow({ packet = {}, onNavigate }) {
  return (
    <article className="lead-inbox-row job-handoff-row">
      <div className="lead-inbox-main">
        <div className="bid-card-title">
          <strong>{packet.projectName || packet.proposalTitle || "Untitled handoff"}</strong>
          <Badge>{packet.handoffStatus}</Badge>
          {packet.proposalReadinessLabel ? <Badge>{packet.proposalReadinessLabel}</Badge> : null}
          {packet.opsReadinessLabel ? <Badge>{packet.opsReadinessLabel}</Badge> : null}
          {packet.opsReadinessOverride ? <Badge>Override</Badge> : null}
        </div>
        <p>{[packet.customerName, packet.city, packet.state, packet.serviceType].filter(Boolean).join(" | ") || "No customer/project details entered"}</p>
        <small>{packet.scopeSummary || packet.operationsNotes || "No scope summary entered yet."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{packet.nextFollowUpDate ? `Follow-up ${packet.nextFollowUpDate}` : "No follow-up set"}</span>
        <span>{packet.acceptedProposalAmount !== "" ? formatCurrency(packet.acceptedProposalAmount) : "No accepted amount"}</span>
        <strong>{packet.opsReadinessScore !== "" ? `Ops ${packet.opsReadinessScore}/100` : "Ops not checked"}</strong>
      </div>
      <div className="table-actions">
        <button type="button" onClick={() => onNavigate?.(`/job-handoffs/${packet.id}`)}>
          Open
        </button>
      </div>
    </article>
  );
}

function ConcreteOpsReadinessCard({
  existingOpsDraft = null,
  overrideReason = "",
  packet = {},
  permissions = {},
  onCheckReadiness,
  onOverrideReadiness,
  onOverrideReasonChange,
}) {
  const checklist = Array.isArray(packet.opsReadinessChecklist) ? packet.opsReadinessChecklist : [];
  const passedItems = checklist.filter((item) => item.passed);
  const missingItems = checklist.filter((item) => !item.passed);
  const scoreText = packet.opsReadinessScore !== "" ? `${packet.opsReadinessScore}/100` : "Not checked";
  const label = packet.opsReadinessLabel || "Not Checked";
  const isReady = packet.opsReadinessLabel === "Ready" || packet.opsReadinessOverride;
  const isNotReady = packet.opsReadinessLabel === "Not Ready";

  return (
    <HandoffSection title="Concrete Ops Readiness">
      <div className="lead-proposal-draft-section">
        <div className="bid-card-title">
          <strong>{scoreText}</strong>
          <Badge>{label}</Badge>
          {packet.opsReadinessOverride ? <Badge>Manual Override</Badge> : null}
        </div>
        {packet.opsReadinessLastCheckedAt ? <p>Last checked: {new Date(packet.opsReadinessLastCheckedAt).toLocaleString()}</p> : null}
        {isNotReady ? <p className="backup-message-error">This handoff is not ready to create a Concrete Ops job yet.</p> : null}
        {isReady ? <p className="backup-message">This handoff is ready for future Concrete Ops job creation.</p> : null}
        {packet.opsReadinessOverrideReason ? <p>Override reason: {packet.opsReadinessOverrideReason}</p> : null}
        {existingOpsDraft ? <p>Concrete Ops Job Draft: {existingOpsDraft.jobName || existingOpsDraft.id}</p> : null}
        <div className="settings-actions no-print">
          <button type="button" disabled={!permissions.editBid} onClick={onCheckReadiness}>
            Check Ops Readiness
          </button>
        </div>
      </div>

      {checklist.length > 0 ? (
        <div className="bid-form-grid">
          <div className="lead-proposal-draft-section">
            <strong>Passed Items</strong>
            {passedItems.length > 0 ? (
              <ul>
                {passedItems.map((item) => (
                  <li key={item.id}>
                    {item.label}
                    {item.tbdField ? " (TBD accepted)" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-list-message">No items have passed yet.</p>
            )}
          </div>
          <div className="lead-proposal-draft-section">
            <strong>Missing Items</strong>
            {missingItems.length > 0 ? (
              <ul>
                {missingItems.map((item) => (
                  <li key={item.id}>{item.issue || item.label}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-list-message">No missing readiness items.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="empty-list-message">Run Check Ops Readiness to evaluate this handoff before future Concrete Ops job creation.</p>
      )}

      <fieldset className="editor-permission-fieldset no-print" disabled={!permissions.editBid}>
        <div className="bid-form-grid">
          <label className="bid-form-wide">
            Override Readiness Reason
            <textarea value={overrideReason} onChange={(event) => onOverrideReasonChange?.(event.target.value)} />
          </label>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onOverrideReadiness}>
            Override Readiness
          </button>
        </div>
      </fieldset>
    </HandoffSection>
  );
}

function HandoffSection({ children, title }) {
  return (
    <section className="lead-form-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function InfoGrid({ rows = [] }) {
  const visibleRows = rows.filter(([, value]) => Boolean(value));

  return visibleRows.length > 0 ? (
    <div className="bid-form-grid">
      {visibleRows.map(([label, value]) => (
        <div className="lead-readonly-field" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  ) : (
    <p className="empty-list-message">No details saved yet.</p>
  );
}

function TextList({ items = [], title }) {
  return items.length > 0 ? (
    <div className="lead-proposal-draft-section">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  ) : null;
}

function StatCard({ label, value }) {
  return (
    <div className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
