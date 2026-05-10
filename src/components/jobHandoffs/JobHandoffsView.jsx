import { useMemo, useState } from "react";
import { formatCurrency } from "../../proposalData.js";
import { Badge } from "../common/Badges.jsx";
import {
  JOB_HANDOFF_STATUSES,
  filterJobHandoffs,
  formatJobHandoffSummary,
  getJobHandoffById,
  getJobHandoffStats,
  normalizeJobHandoff,
  normalizeJobHandoffs,
} from "../../utils/jobHandoffs.js";

export function JobHandoffsView({
  handoffs = [],
  message = "",
  permissions = {},
  route = {},
  onBackToDashboard,
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
          packetId={route.id}
          permissions={permissions}
          onNavigate={onNavigate}
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
  const [searchQuery, setSearchQuery] = useState("");
  const stats = getJobHandoffStats(handoffs);
  const serviceTypes = useMemo(
    () => Array.from(new Set(handoffs.map((packet) => packet.serviceType).filter(Boolean))).sort(),
    [handoffs],
  );
  const filteredHandoffs = filterJobHandoffs(handoffs, {
    cityFilter,
    readyFilter,
    searchQuery,
    serviceTypeFilter,
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

function JobHandoffDetailPage({ handoffs = [], packetId = "", permissions = {}, onNavigate, onSaveHandoff }) {
  const existingPacket = getJobHandoffById(handoffs, packetId);
  const [packetDraft, setPacketDraft] = useState(() => (existingPacket ? normalizeJobHandoff(existingPacket) : null));
  const [localMessage, setLocalMessage] = useState("");

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
    const savedPacket = await onSaveHandoff?.(packetDraft);

    if (savedPacket) {
      setPacketDraft(savedPacket);
      setLocalMessage("Job handoff packet saved.");
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(formatJobHandoffSummary(packetDraft));
      setLocalMessage("Job handoff summary copied.");
    } catch {
      setLocalMessage("Copy failed. Select the summary text manually.");
    }
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
              </label>
              <label className="bid-form-wide">
                Crew Notes
                <textarea value={packetDraft.crewNotes} onChange={(event) => setPacketDraft({ ...packetDraft, crewNotes: event.target.value })} />
              </label>
              <label className="bid-form-wide">
                Schedule Notes
                <textarea value={packetDraft.scheduleNotes} onChange={(event) => setPacketDraft({ ...packetDraft, scheduleNotes: event.target.value })} />
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
        </div>
        <p>{[packet.customerName, packet.city, packet.state, packet.serviceType].filter(Boolean).join(" | ") || "No customer/project details entered"}</p>
        <small>{packet.scopeSummary || packet.operationsNotes || "No scope summary entered yet."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{packet.nextFollowUpDate ? `Follow-up ${packet.nextFollowUpDate}` : "No follow-up set"}</span>
        <span>{packet.acceptedProposalAmount !== "" ? formatCurrency(packet.acceptedProposalAmount) : "No accepted amount"}</span>
        <strong>{packet.proposalReadinessScore !== "" ? `${packet.proposalReadinessScore}/100` : "Not scored"}</strong>
      </div>
      <div className="table-actions">
        <button type="button" onClick={() => onNavigate?.(`/job-handoffs/${packet.id}`)}>
          Open
        </button>
      </div>
    </article>
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
