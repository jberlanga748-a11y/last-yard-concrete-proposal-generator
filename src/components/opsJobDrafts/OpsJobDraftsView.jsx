import { useMemo, useState } from "react";
import { formatCurrency } from "../../proposalData.js";
import { Badge } from "../common/Badges.jsx";
import {
  OPS_JOB_DRAFT_STATUSES,
  createConcreteOpsJobDraftExportPackage,
  filterOpsJobDrafts,
  formatOpsJobDraftSummary,
  getOpsJobDraftById,
  getOpsJobDraftStats,
  normalizeOpsJobDraft,
  normalizeOpsJobDrafts,
} from "../../utils/opsJobDrafts.js";

export function OpsJobDraftsView({
  drafts = [],
  message = "",
  permissions = {},
  route = {},
  onBackToDashboard,
  onExportDraftPackage,
  onNavigate,
  onSaveDraft,
}) {
  const normalizedDrafts = normalizeOpsJobDrafts(drafts);
  const section = route.section || "list";

  return (
    <section className="lead-finder-panel job-handoff-panel">
      <div className="recent-heading no-print">
        <div>
          <p className="list-kicker">Concrete Ops Prep</p>
          <h2>Concrete Ops Job Drafts</h2>
          <p>Prep-only job-shaped drafts for future Concrete Ops creation. No real Concrete Ops job is created here.</p>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={() => onNavigate?.("/job-handoffs")}>
            Job Handoffs
          </button>
          <button type="button" onClick={onBackToDashboard}>
            Dashboard
          </button>
        </div>
      </div>
      {message ? <p className="backup-message no-print">{message}</p> : null}
      {section === "detail" ? (
        <OpsJobDraftDetailPage
          draftId={route.id}
          drafts={normalizedDrafts}
          permissions={permissions}
          onExportDraftPackage={onExportDraftPackage}
          onNavigate={onNavigate}
          onSaveDraft={onSaveDraft}
        />
      ) : (
        <OpsJobDraftListPage drafts={normalizedDrafts} onNavigate={onNavigate} />
      )}
    </section>
  );
}

function OpsJobDraftListPage({ drafts = [], onNavigate }) {
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [readyFilter, setReadyFilter] = useState("all");
  const stats = getOpsJobDraftStats(drafts);
  const serviceTypes = useMemo(
    () => Array.from(new Set(drafts.map((draft) => draft.serviceType).filter(Boolean))).sort(),
    [drafts],
  );
  const readinessLabels = useMemo(
    () => Array.from(new Set(drafts.map((draft) => draft.opsReadinessLabel).filter(Boolean))).sort(),
    [drafts],
  );
  const filteredDrafts = filterOpsJobDrafts(drafts, {
    cityFilter,
    draftStatusFilter,
    readinessFilter,
    readyFilter,
    serviceTypeFilter,
  });

  return (
    <div className="lead-finder-layout">
      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Draft Summary</p>
            <h3>Future Ops Job Drafts</h3>
          </div>
        </div>
        <div className="dashboard-stat-grid lead-finder-stat-grid">
          <StatCard label="Total Drafts" value={stats.total} />
          <StatCard label="Draft" value={stats.draft} />
          <StatCard label="Needs Ops Review" value={stats.needsOpsReview} />
          <StatCard label="Ready to Create" value={stats.readyToCreate} />
          <StatCard label="Created Later" value={stats.createdLater} />
          <StatCard label="Cancelled" value={stats.cancelled} />
        </div>
      </article>

      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Filters</p>
            <h3>Find Drafts</h3>
          </div>
        </div>
        <div className="lead-filter-grid">
          <label>
            Draft Status
            <select value={draftStatusFilter} onChange={(event) => setDraftStatusFilter(event.target.value)}>
              <option value="all">All draft statuses</option>
              {OPS_JOB_DRAFT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Readiness Label
            <select value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
              <option value="all">All readiness labels</option>
              {readinessLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
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
              <option value="all">All drafts</option>
              <option value="ready">Ready</option>
              <option value="not_ready">Not ready</option>
            </select>
          </label>
        </div>
      </article>

      <article className="lead-finder-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Concrete Ops Job Drafts</p>
            <h3>{filteredDrafts.length} draft{filteredDrafts.length === 1 ? "" : "s"}</h3>
          </div>
        </div>
        {filteredDrafts.length > 0 ? (
          <div className="lead-inbox-list">
            {filteredDrafts.map((draft) => (
              <OpsJobDraftListRow draft={draft} key={draft.id} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No Concrete Ops job drafts match these filters yet.</p>
        )}
      </article>
    </div>
  );
}

function OpsJobDraftDetailPage({ draftId = "", drafts = [], permissions = {}, onExportDraftPackage, onNavigate, onSaveDraft }) {
  const existingDraft = getOpsJobDraftById(drafts, draftId);
  const [draftForm, setDraftForm] = useState(() => (existingDraft ? normalizeOpsJobDraft(existingDraft) : null));
  const [localMessage, setLocalMessage] = useState("");

  if (!existingDraft || !draftForm) {
    return (
      <div className="contact-empty-state">
        <p className="list-kicker">Concrete Ops Job Draft</p>
        <h3>Draft not found.</h3>
        <p>This draft may have been deleted or is not available in local data.</p>
        <button type="button" onClick={() => onNavigate?.("/ops-job-drafts")}>
          Back to Ops Job Drafts
        </button>
      </div>
    );
  }

  async function saveDraft(event) {
    event.preventDefault();
    const savedDraft = await onSaveDraft?.(draftForm);

    if (savedDraft) {
      setDraftForm(savedDraft);
      setLocalMessage("Concrete Ops job draft saved.");
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(formatOpsJobDraftSummary(draftForm));
      setLocalMessage("Concrete Ops job draft summary copied.");
    } catch {
      setLocalMessage("Copy failed. Select the summary text manually.");
    }
  }

  async function exportDraftPackage() {
    try {
      const result = await onExportDraftPackage?.(draftForm);

      if (!result) {
        setLocalMessage("Export failed. Check permissions or try again.");
        return;
      }

      const exportedPackage = result.package || createConcreteOpsJobDraftExportPackage(draftForm);
      const warning =
        exportedPackage.opsReadinessLabel === "Not Ready"
          ? "This draft is not marked ready. Export is allowed, but review missing readiness items first. "
          : "";
      setLocalMessage(`${warning}Exported Job Draft Package: ${result.fileName || "downloaded JSON file"}.`);
    } catch {
      setLocalMessage("Export failed. Try again or use the full backup tools.");
    }
  }

  const shouldShowExportWarning = draftForm.opsReadinessLabel === "Not Ready";

  return (
    <form className="lead-finder-card lead-detail-card job-handoff-detail" onSubmit={saveDraft}>
      <div className="recent-heading">
        <div>
          <p className="list-kicker">Concrete Ops Job Draft</p>
          <h3>{draftForm.jobName || "Untitled job draft"}</h3>
          <p>Prep-only draft shaped for future Concrete Ops. This does not create a real Concrete Ops job.</p>
        </div>
        <div className="settings-actions no-print">
          <button type="button" onClick={() => onNavigate?.("/ops-job-drafts")}>
            Back to Drafts
          </button>
          <button type="button" onClick={copySummary}>
            Copy Concrete Ops Job Draft Summary
          </button>
          <button type="button" onClick={exportDraftPackage} disabled={!permissions.backupExport}>
            Export Job Draft Package
          </button>
          <button type="button" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <button className="gold-action" type="submit" disabled={!permissions.editBid}>
            Save Draft
          </button>
        </div>
      </div>
      {localMessage ? <p className="backup-message no-print">{localMessage}</p> : null}
      {shouldShowExportWarning ? (
        <p className="backup-message backup-message-error no-print">This draft is not marked ready. Export is allowed, but review missing readiness items first.</p>
      ) : null}
      <div className="bid-form-sections">
        <DraftSection title="Customer / Contact">
          <InfoGrid
            rows={[
              ["Customer / Company", draftForm.customerName],
              ["Contact", draftForm.contactName],
              ["Email", draftForm.contactEmail],
              ["Phone", draftForm.contactPhone],
            ]}
          />
        </DraftSection>

        <DraftSection title="Job Info">
          <InfoGrid
            rows={[
              ["Job", draftForm.jobName],
              ["Address", draftForm.jobAddress],
              ["City / State", [draftForm.city, draftForm.state].filter(Boolean).join(", ")],
              ["Service Type", draftForm.serviceType],
              ["Project Type", draftForm.projectType],
              ["Proposal Amount", draftForm.proposalAmount !== "" ? formatCurrency(draftForm.proposalAmount) : ""],
            ]}
          />
        </DraftSection>

        <DraftSection title="Scope">
          <p>{draftForm.scopeSummary || "No scope summary entered yet."}</p>
          <TextList title="Included Scope" items={draftForm.includedScope} />
          <TextList title="Exclusions" items={draftForm.exclusions} />
          <TextList title="Assumptions" items={draftForm.assumptions} />
        </DraftSection>

        <DraftSection title="Proposal / Handoff Links">
          <InfoGrid
            rows={[
              ["Handoff ID", draftForm.sourceHandoffId],
              ["Lead ID", draftForm.sourceLeadId],
              ["Proposal ID", draftForm.sourceProposalId],
              ["Estimate ID", draftForm.sourceEstimateId],
              ["Packet ID", draftForm.sourcePacketId],
              ["Proposal Link / ID", draftForm.proposalLinkOrId],
              ["Handoff Status", draftForm.handoffStatus],
            ]}
          />
        </DraftSection>

        <DraftSection title="Ops Readiness">
          <InfoGrid
            rows={[
              ["Readiness", draftForm.opsReadinessLabel],
              ["Readiness Score", draftForm.opsReadinessScore !== "" ? `${draftForm.opsReadinessScore}/100` : ""],
            ]}
          />
          <TextList title="Readiness Issues" items={draftForm.opsReadinessIssues} />
        </DraftSection>

        <fieldset className="editor-permission-fieldset" disabled={!permissions.editBid}>
          <DraftSection title="Crew / Schedule Placeholders">
            <div className="bid-form-grid">
              <label className="bid-form-wide">
                Job Name
                <input value={draftForm.jobName} onChange={(event) => setDraftForm({ ...draftForm, jobName: event.target.value })} />
              </label>
              <label className="bid-form-wide">
                Job Address
                <input value={draftForm.jobAddress} onChange={(event) => setDraftForm({ ...draftForm, jobAddress: event.target.value })} />
              </label>
              <label>
                Target Start Date
                <input
                  type="date"
                  value={draftForm.startDateTarget}
                  onChange={(event) => setDraftForm({ ...draftForm, startDateTarget: event.target.value })}
                />
              </label>
              <label>
                Assigned Crew Placeholder
                <input
                  value={draftForm.assignedCrewPlaceholder}
                  onChange={(event) => setDraftForm({ ...draftForm, assignedCrewPlaceholder: event.target.value })}
                />
              </label>
              <label>
                Foreman Placeholder
                <input value={draftForm.foremanPlaceholder} onChange={(event) => setDraftForm({ ...draftForm, foremanPlaceholder: event.target.value })} />
              </label>
              <label className="bid-form-wide">
                Operations Notes
                <textarea value={draftForm.operationsNotes} onChange={(event) => setDraftForm({ ...draftForm, operationsNotes: event.target.value })} />
              </label>
              <label className="bid-form-wide">
                Crew Notes
                <textarea value={draftForm.crewNotes} onChange={(event) => setDraftForm({ ...draftForm, crewNotes: event.target.value })} />
              </label>
              <label className="bid-form-wide">
                Schedule Notes
                <textarea value={draftForm.scheduleNotes} onChange={(event) => setDraftForm({ ...draftForm, scheduleNotes: event.target.value })} />
              </label>
            </div>
          </DraftSection>

          <DraftSection title="Draft Status">
            <div className="bid-form-grid">
              <label>
                Draft Status
                <select value={draftForm.draftStatus} onChange={(event) => setDraftForm({ ...draftForm, draftStatus: event.target.value })}>
                  {OPS_JOB_DRAFT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </DraftSection>
        </fieldset>
      </div>
    </form>
  );
}

function OpsJobDraftListRow({ draft = {}, onNavigate }) {
  return (
    <article className="lead-inbox-row job-handoff-row">
      <div className="lead-inbox-main">
        <div className="bid-card-title">
          <strong>{draft.jobName || "Untitled job draft"}</strong>
          <Badge>{draft.draftStatus}</Badge>
          {draft.opsReadinessLabel ? <Badge>{draft.opsReadinessLabel}</Badge> : null}
        </div>
        <p>{[draft.customerName, draft.city, draft.state, draft.serviceType].filter(Boolean).join(" | ") || "No customer/job details entered"}</p>
        <small>{draft.scopeSummary || draft.operationsNotes || "No scope summary entered yet."}</small>
      </div>
      <div className="lead-inbox-meta">
        <span>{draft.startDateTarget ? `Start ${draft.startDateTarget}` : "No start target"}</span>
        <span>{draft.proposalAmount !== "" ? formatCurrency(draft.proposalAmount) : "No proposal amount"}</span>
        <strong>{draft.opsReadinessScore !== "" ? `${draft.opsReadinessScore}/100` : "No readiness score"}</strong>
      </div>
      <div className="table-actions">
        <button type="button" onClick={() => onNavigate?.(`/ops-job-drafts/${draft.id}`)}>
          Open
        </button>
      </div>
    </article>
  );
}

function DraftSection({ children, title }) {
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
