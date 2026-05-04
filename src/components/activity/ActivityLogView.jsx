import { useState } from "react";
import { activityLogFilters, normalizeActivityLog } from "../../utils/activityLog.js";
import { formatCloudSyncTime } from "../../utils/formatting/display.js";

export function ActivityLogView({ records = [], onBackToDashboard }) {
  const [filter, setFilter] = useState("all");
  const normalizedRecords = normalizeActivityLog(records);
  const filteredRecords =
    filter === "all" ? normalizedRecords : normalizedRecords.filter((record) => record.entityType === filter);

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

      {filteredRecords.length > 0 ? (
        <div className="activity-log-list">
          {filteredRecords.map((record) => (
            <article className="activity-log-row" key={record.id}>
              <div>
                <strong>{record.action}</strong>
                <span>{record.entityLabel || record.entityId || record.entityType}</span>
                {record.notes ? <small>{record.notes}</small> : null}
              </div>
              <div>
                <span>{record.userEmail || "Local user"}</span>
                <small>{formatCloudSyncTime(record.createdAt)}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-list-message">No activity records match this filter yet.</p>
      )}
    </section>
  );
}
