export function BackupView({ backupTools, onBackToDashboard }) {
  return (
    <section className="backup-page-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Local backup center</p>
          <h2>Backup / Restore</h2>
        </div>
        <button type="button" onClick={onBackToDashboard}>
          Back to Dashboard
        </button>
      </div>
      {backupTools}
    </section>
  );
}
