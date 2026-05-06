import { useState } from "react";
import {
  activityLogFilters,
  getActivityDisplayMeta,
  groupActivityRecordsByDate,
  normalizeActivityLog,
} from "../../utils/activityLog.js";
import { formatCloudSyncTime } from "../../utils/formatting/display.js";

export function ActivityLogView({ records = [], onBackToDashboard }) {
  const [filter, setFilter] = useState("all");
  const normalizedRecords = normalizeActivityLog(records);
  const filteredRecords =
    filter === "all" ? normalizedRecords : normalizedRecords.filter((record) => record.entityType === filter);
  const groupedRecords = groupActivityRecordsByDate(filteredRecords);
  const hasAnyActivity = normalizedRecords.length > 0;

  return (
    <section className="activity-log-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Activity log</p>
          <h2>Team Activity</h2>
          <p>Newest important proposal, bid, backup, storage, and team actions appear first.</p>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="activity-filter-row">
        {activityLogFilters.map(([value, label]) => (
          <button
            className={filter === value ? "active" : ""}
            key={value}
            type="button"
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {groupedRecords.length > 0 ? (
        <div className="activity-log-list">
          {groupedRecords.map((group) => (
            <div className="activity-date-group" key={group.key}>
              <h3>{group.label}</h3>
              <div className="activity-date-group-list">
                {group.records.map((record) => {
                  const activityMeta = getActivityDisplayMeta(record);

                  return (
                    <article className="activity-log-row" key={record.id}>
                      <div className={`activity-type-badge activity-type-${activityMeta.tone}`}>
                        {activityMeta.label}
                      </div>
                      <div className="activity-row-main">
                        <strong>{record.action}</strong>
                        <span>{record.entityLabel || record.entityId || record.entityType}</span>
                        {record.notes ? <small>{record.notes}</small> : null}
                      </div>
                      <div className="activity-row-meta">
                        <span>{record.userEmail || "Local user"}</span>
                        <small>{formatCloudSyncTime(record.createdAt)}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : !hasAnyActivity ? (
        <p className="empty-list-message">
          No activity yet. Actions like saving proposals, creating bids, attaching PDFs, and exporting backups will appear here.
        </p>
      ) : (
        <p className="empty-list-message">No activity records match this filter yet.</p>
      )}
    </section>
  );
}
