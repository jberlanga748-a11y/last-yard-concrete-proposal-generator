import { useState } from "react";

export function BackupRestorePanel({ canExportCurrent = false, message = "", onExport, onImport }) {
  const [importType, setImportType] = useState("proposal");
  const [importMode, setImportMode] = useState("merge");
  const [importFile, setImportFile] = useState(null);
  const showMergeMode = importType === "all" || importType === "contacts" || importType === "full";

  return (
    <section className="backup-panel no-print">
      <div>
        <p className="list-kicker">Backup / Restore</p>
        <h3>LocalStorage Backup Tools</h3>
        <p className="backup-help">
          Export JSON backups or restore proposals, company settings, and full app data. Backup JSON files are plain files and are not encrypted.
        </p>
        {message ? <span className="backup-message">{message}</span> : null}
      </div>

      <div className="backup-grid">
        <div className="backup-card">
          <h4>Export</h4>
          <div className="backup-button-grid">
            {canExportCurrent ? (
              <button type="button" onClick={() => onExport("current")}>
                Export Current Proposal
              </button>
            ) : null}
            <button type="button" onClick={() => onExport("all")}>
              Export All Proposals
            </button>
            <button type="button" onClick={() => onExport("settings")}>
              Export Company Settings
            </button>
            <button type="button" onClick={() => onExport("contacts")}>
              Export Contacts
            </button>
            <button type="button" onClick={() => onExport("full")}>
              Export Full App Backup
            </button>
          </div>
        </div>

        <div className="backup-card">
          <h4>Import</h4>
          <div className="backup-import-grid">
            <label>
              <span>Import Type</span>
              <select value={importType} onChange={(event) => setImportType(event.target.value)}>
                <option value="proposal">One Proposal JSON</option>
                <option value="all">All Proposals JSON</option>
                <option value="settings">Company Settings JSON</option>
                <option value="contacts">Contacts JSON</option>
                <option value="full">Full App Backup JSON</option>
              </select>
            </label>
            {showMergeMode ? (
              <label>
                <span>Import Mode</span>
                <select value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                  <option value="merge">Merge with Existing</option>
                  <option value="replace">Replace Existing</option>
                </select>
              </label>
            ) : null}
            <label className="backup-file-field">
              <span>JSON File</span>
              <input type="file" accept="application/json,.json" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
            </label>
            <button type="button" onClick={() => onImport(importType, showMergeMode ? importMode : "merge", importFile)}>
              Import Selected Backup
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
