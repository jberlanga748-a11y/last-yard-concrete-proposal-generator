import { useState } from "react";
import { isSupabaseConfigured } from "../../supabaseClient.js";
import { Badge } from "../common/Badges.jsx";
import { TEAM_INVITE_ROLES, canManageTeamAccess, formatTeamRole } from "../../utils/cloud/teamAccess.js";
import { formatOptionLabel } from "../../utils/formatting/display.js";

export function TeamAccessPanel({
  authUser,
  cloudSync,
  members = [],
  message,
  settings,
  onDeactivateMember,
  onInviteMember,
  onOpenLogin,
  onRefreshMembers,
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("estimator");
  const canUseCloud = canUseCloudSync(authUser);
  const canManage = canUseCloud && canManageTeamAccess(cloudSync.currentRole);
  const currentRole = authUser ? formatTeamRole(cloudSync.currentRole || "owner") : "Local user";

  async function handleInvite(event) {
    event.preventDefault();
    await onInviteMember(inviteEmail, inviteRole);
    setInviteEmail("");
  }

  return (
    <section className="team-access-card no-print">
      <div className="team-access-heading">
        <div>
          <p className="list-kicker">Team / Access</p>
          <h3>Team Access</h3>
        </div>
        <div className="cloud-status-actions">
          {canUseCloud ? (
            <button type="button" onClick={onRefreshMembers}>
              Refresh Team
            </button>
          ) : (
            <button type="button" onClick={onOpenLogin} disabled={!isSupabaseConfigured}>
              Sign In to Sync
            </button>
          )}
        </div>
      </div>

      <div className="team-access-grid">
        <div>
          <span>Company</span>
          <strong>{settings.companyName || "Last Yard Concrete LLC"}</strong>
        </div>
        <div>
          <span>Signed-in email</span>
          <strong>{authUser?.email || "Local mode"}</strong>
        </div>
        <div>
          <span>Current role</span>
          <strong>{currentRole}</strong>
        </div>
        <div>
          <span>Company id</span>
          <strong>{cloudSync.companyId || "-"}</strong>
        </div>
      </div>

      <p className="team-access-help">
        Owner/admin users can invite partners to the same company account. Signed-out users can continue using local browser storage.
      </p>
      {message ? <p className="team-access-message">{message}</p> : null}

      <form className="team-invite-row" onSubmit={handleInvite}>
        <label>
          <span>Invite Email</span>
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="partner@example.com"
            disabled={!canManage}
          />
        </label>
        <label>
          <span>Role</span>
          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} disabled={!canManage}>
            {TEAM_INVITE_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatTeamRole(role)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!canManage}>
          Invite / Add Member
        </button>
      </form>

      <div className="team-member-list">
        {members.length > 0 ? (
          members.map((member) => {
            const memberEmail = member.inviteEmail || member.userId || "Pending user";
            const isCurrentUser = member.userId && member.userId === authUser?.id;
            const disableDeactivate = !canManage || member.role === "owner" || isCurrentUser || member.status === "inactive";

            return (
              <div className="team-member-row" key={member.id}>
                <div>
                  <strong>{memberEmail}</strong>
                  <span>{member.userId ? "Linked account" : "Invite pending"}</span>
                </div>
                <Badge>{formatTeamRole(member.role)}</Badge>
                <Badge className={member.status === "active" ? "status-approved" : member.status === "inactive" ? "status-rejected" : "status-sent"}>
                  {formatOptionLabel(member.status || "invited")}
                </Badge>
                <button type="button" onClick={() => onDeactivateMember(member.id)} disabled={disableDeactivate}>
                  Deactivate
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty-list-message">No cloud team members found yet. The owner row will appear after running the Phase 33 SQL and refreshing.</p>
        )}
      </div>
    </section>
  );
}

function canUseCloudSync(authUser) {
  return Boolean(isSupabaseConfigured && authUser?.id);
}
