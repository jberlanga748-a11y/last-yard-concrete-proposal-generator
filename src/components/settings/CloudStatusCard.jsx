import { isSupabaseConfigured, supabaseFrontendConfigMessage } from "../../supabaseClient.js";
import { formatTeamRole } from "../../utils/cloud/teamAccess.js";
import { formatAssetFileSize, formatCloudSyncTime } from "../../utils/formatting/display.js";

const cloudSyncErrorLabel = "Sync error";

export function CloudStatusCard({
  authLoading,
  authMessage,
  authUser,
  bucketName,
  cloudSync,
  canUseCloudActions = true,
  saveState,
  storageDiagnostics,
  onClearCloudSyncMessage,
  onOpenLogin,
  onPullCloudData,
  onPullCloudProposals,
  onPushLocalDataToCloud,
  onPushLocalProposals,
  onSignOut,
  onSyncContacts,
  onSyncProposals,
  onSyncSettings,
  onTestStorageUpload,
}) {
  const cloudActionsDisabled = authLoading || cloudSync.loading || !canUseCloudSync(authUser) || !canUseCloudActions;
  const lastSyncError = cloudSync.lastError || (isCloudSyncErrorState(cloudSync) ? cloudSync.message : "");

  return (
    <section className="cloud-status-card no-print">
      <div>
        <p className="list-kicker">Cloud sync</p>
        <h3>Cloud Status</h3>
      </div>
      <div className="cloud-status-grid">
        <div>
          <span>Cloud save</span>
          <strong>{isSupabaseConfigured ? "Supabase configured" : "Supabase frontend config missing"}</strong>
        </div>
        <div>
          <span>Signed in</span>
          <strong>{isSupabaseConfigured && authUser ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Current storage mode</span>
          <strong>Local browser storage</strong>
        </div>
        <div>
          <span>Settings sync</span>
          <strong>{cloudSync.loading ? "Syncing" : cloudSync.settingsStatus}</strong>
        </div>
        <div>
          <span>Proposal sync</span>
          <strong>{cloudSync.loading ? "Syncing" : cloudSync.proposalStatus}</strong>
        </div>
        <div>
          <span>Asset storage</span>
          <strong>{canUseCloudSync(authUser) ? "Cloud storage enabled" : "Local only"}</strong>
        </div>
        <div>
          <span>Contacts sync</span>
          <strong>{cloudSync.loading ? "Syncing" : cloudSync.contactsStatus}</strong>
        </div>
        <div>
          <span>Last cloud sync</span>
          <strong>{formatCloudSyncTime(cloudSync.lastSyncedAt)}</strong>
        </div>
        <div>
          <span>Last saved locally</span>
          <strong>{formatCloudSyncTime(saveState.lastLocalSavedAt)}</strong>
        </div>
        <div>
          <span>Last sync error</span>
          <strong>{lastSyncError || "-"}</strong>
        </div>
        <div>
          <span>Current role</span>
          <strong>{authUser ? formatTeamRole(cloudSync.currentRole || "owner") : "Local Owner/Admin"}</strong>
        </div>
      </div>
      <p>Cloud sync is enabled for proposals, company settings, contacts, and uploaded proposal assets. Legacy data URL images still render and can remain in backups.</p>
      <p>Replacing a file updates the proposal record, but old cloud files may remain in storage until cleanup tools are added.</p>
      {!canUseCloudActions ? <p>You do not have permission to use cloud push/pull/sync controls.</p> : null}
      {authUser ? <p>Current user: {authUser.email}</p> : null}
      {authMessage ? <p>{authMessage}</p> : null}
      {cloudSync.message ? <p>{cloudSync.message}</p> : null}
      {!isSupabaseConfigured ? <p>{supabaseFrontendConfigMessage}</p> : null}
      <details className="settings-accordion-section storage-diagnostics-details no-print">
        <summary>
          <span>
            <strong>Storage Diagnostics</strong>
            <small>Test Supabase Storage uploads and review the latest upload path or error.</small>
          </span>
        </summary>
        <div className="settings-accordion-content">
          <StorageDiagnosticsPanel
            authLoading={authLoading}
            authUser={authUser}
            bucketName={bucketName}
            cloudSync={cloudSync}
            diagnostics={storageDiagnostics}
            onTestStorageUpload={onTestStorageUpload}
            canTestStorage={canUseCloudActions}
          />
        </div>
      </details>
      {isSupabaseConfigured ? (
        <div className="cloud-status-actions">
          {authUser ? (
            <>
              <button type="button" onClick={() => onSyncSettings()} disabled={cloudActionsDisabled}>
                Sync Settings Now
              </button>
              <button type="button" onClick={() => onSyncContacts()} disabled={cloudActionsDisabled}>
                Sync Contacts Now
              </button>
              <button type="button" onClick={onSyncProposals} disabled={cloudActionsDisabled}>
                Sync Proposals Now
              </button>
              <button type="button" onClick={onSyncProposals} disabled={cloudActionsDisabled}>
                Retry Sync
              </button>
              <button type="button" onClick={onPullCloudProposals} disabled={cloudActionsDisabled}>
                Pull Cloud Proposals
              </button>
              <button type="button" onClick={() => onPushLocalProposals()} disabled={cloudActionsDisabled}>
                Push Local Proposals
              </button>
              <button type="button" onClick={onPullCloudData} disabled={cloudActionsDisabled}>
                Pull Cloud Data
              </button>
              <button type="button" onClick={onPushLocalDataToCloud} disabled={cloudActionsDisabled}>
                Push Local Data to Cloud
              </button>
              <button type="button" onClick={onSignOut} disabled={authLoading || cloudSync.loading}>
                Sign Out
              </button>
              <button type="button" onClick={onClearCloudSyncMessage}>
                Clear Sync Message
              </button>
            </>
          ) : (
            <button type="button" onClick={onOpenLogin} disabled={authLoading}>
              Sign In / Sign Up
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function StorageDiagnosticsPanel({ authLoading, authUser, bucketName, canTestStorage = true, cloudSync, diagnostics, onTestStorageUpload }) {
  const assetStorageMode = canUseCloudSync(authUser) ? "cloud" : "local";
  const companyId = diagnostics.companyId || cloudSync.companyId || "";

  return (
    <div className="storage-diagnostics-panel no-print">
      <div className="storage-diagnostics-heading">
        <div>
          <p className="list-kicker">Asset storage</p>
          <h4>Storage Diagnostics</h4>
        </div>
        <button type="button" onClick={onTestStorageUpload} disabled={authLoading || !canTestStorage}>
          Test Storage Upload
        </button>
      </div>
      <div className="storage-diagnostics-grid">
        <div>
          <span>Supabase configured</span>
          <strong>{isSupabaseConfigured ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Signed in</span>
          <strong>{isSupabaseConfigured && authUser ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>User id</span>
          <strong>{authUser?.id || "-"}</strong>
        </div>
        <div>
          <span>Company id</span>
          <strong>{companyId || "-"}</strong>
        </div>
        <div>
          <span>Storage bucket name</span>
          <strong>{bucketName}</strong>
        </div>
        <div>
          <span>Asset storage mode</span>
          <strong>{assetStorageMode}</strong>
        </div>
        <div>
          <span>Last upload attempted at</span>
          <strong>{formatCloudSyncTime(diagnostics.lastAttemptedAt)}</strong>
        </div>
        <div>
          <span>Last upload type</span>
          <strong>{diagnostics.lastUploadType || "-"}</strong>
        </div>
        <div>
          <span>Last upload file name</span>
          <strong>{diagnostics.lastFileName || "-"}</strong>
        </div>
        <div>
          <span>Last upload file size</span>
          <strong>{formatAssetFileSize(diagnostics.lastFileSize)}</strong>
        </div>
        <div>
          <span>Last processed file size</span>
          <strong>{formatAssetFileSize(diagnostics.lastProcessedFileSize)}</strong>
        </div>
        <div>
          <span>Last upload storage path</span>
          <strong>{diagnostics.lastStoragePath || "-"}</strong>
        </div>
        <div>
          <span>Last successful image path</span>
          <strong>{diagnostics.lastSuccessfulImageUploadPath || "-"}</strong>
        </div>
        <div>
          <span>Last successful PDF path</span>
          <strong>{diagnostics.lastSuccessfulPdfUploadPath || "-"}</strong>
        </div>
        <div>
          <span>Last upload public URL</span>
          <strong>{diagnostics.lastPublicUrl || "-"}</strong>
        </div>
        <div>
          <span>Last upload status</span>
          <strong>{diagnostics.lastStatus || "-"}</strong>
        </div>
        <div className="storage-diagnostics-wide">
          <span>Last upload error message</span>
          <strong>{diagnostics.errorMessage || "-"}</strong>
        </div>
        <div className="storage-diagnostics-wide">
          <span>Last failed upload error</span>
          <strong>{diagnostics.lastFailedUploadError || "-"}</strong>
        </div>
      </div>
    </div>
  );
}

function canUseCloudSync(authUser) {
  return Boolean(isSupabaseConfigured && authUser?.id);
}

function isCloudSyncErrorState(cloudSync = {}) {
  return [cloudSync.contactsStatus, cloudSync.proposalStatus, cloudSync.settingsStatus].includes(cloudSyncErrorLabel);
}
