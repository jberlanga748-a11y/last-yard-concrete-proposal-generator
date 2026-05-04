import { useState } from "react";

export function BackupRestorePanel({
  canExport = true,
  canExportCurrent = false,
  canImport = true,
  message = "",
  onExport,
  onImport,
}) {
  const [importType, setImportType] = useState("proposal");
  const [importMode, setImportMode] = useState("merge");
  const [importFile, setImportFile] = useState(null);
  const showMergeMode = importType === "all" || importType === "contacts" || importType === "bids" || importType === "full";

  return (
    <section className="backup-panel no-print">
      <div>
        <p className="list-kicker">Backup / Restore</p>
        <h3>LocalStorage Backup Tools</h3>
        <p className="backup-help">
          Export JSON backups or restore proposals, company settings, and full app data. Backup JSON files are plain files and are not encrypted.
        </p>
        {message ? <span className="backup-message">{message}</span> : null}
        {!canImport || !canExport ? (
          <span className="backup-message">Some backup actions are restricted for your current role.</span>
        ) : null}
      </div>

      <div className="backup-grid">
        <div className="backup-card">
          <h4>Export</h4>
          <div className="backup-button-grid">
            {canExportCurrent ? (
              <button type="button" title="Export the currently open proposal as a JSON backup." onClick={() => onExport("current")} disabled={!canExport}>
                Export Current Proposal
              </button>
            ) : null}
            <button type="button" title="Export every saved proposal as a JSON backup." onClick={() => onExport("all")} disabled={!canExport}>
              Export All Proposals
            </button>
            <button type="button" title="Export company settings as a JSON backup." onClick={() => onExport("settings")} disabled={!canExport}>
              Export Company Settings
            </button>
            <button type="button" title="Export saved contacts as a JSON backup." onClick={() => onExport("contacts")} disabled={!canExport}>
              Export Contacts
            </button>
            <button type="button" title="Export bid tracker records as a JSON backup." onClick={() => onExport("bids")} disabled={!canExport}>
              Export Bids
            </button>
            <button type="button" title="Export proposals, settings, contacts, bids, and library data as one JSON backup." onClick={() => onExport("full")} disabled={!canExport}>
              Export Full App Backup
            </button>
          </div>
        </div>

        <div className="backup-card">
          <h4>Import</h4>
          <div className="backup-import-grid">
            <label>
              <span>Import Type</span>
              <select value={importType} onChange={(event) => setImportType(event.target.value)} disabled={!canImport}>
                <option value="proposal">One Proposal JSON</option>
                <option value="all">All Proposals JSON</option>
                <option value="settings">Company Settings JSON</option>
                <option value="contacts">Contacts JSON</option>
                <option value="bids">Bids JSON</option>
                <option value="full">Full App Backup JSON</option>
              </select>
            </label>
            {showMergeMode ? (
              <label>
                <span>Import Mode</span>
                <select value={importMode} onChange={(event) => setImportMode(event.target.value)} disabled={!canImport}>
                  <option value="merge">Merge with Existing</option>
                  <option value="replace">Replace Existing</option>
                </select>
              </label>
            ) : null}
            <label className="backup-file-field">
              <span>JSON File</span>
              <input type="file" accept="application/json,.json" onChange={(event) => setImportFile(event.target.files?.[0] || null)} disabled={!canImport} />
            </label>
            <button
              type="button"
              title="Import the selected JSON backup. Replace mode asks for confirmation before changing saved data."
              onClick={() => onImport(importType, showMergeMode ? importMode : "merge", importFile)}
              disabled={!canImport}
            >
              Import Selected Backup
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
