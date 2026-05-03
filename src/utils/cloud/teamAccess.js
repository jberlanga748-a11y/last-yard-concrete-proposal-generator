export const TEAM_ROLES = ["owner", "admin", "estimator", "viewer"];
export const TEAM_INVITE_ROLES = ["admin", "estimator", "viewer"];

export function normalizeTeamRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return TEAM_ROLES.includes(normalizedRole) ? normalizedRole : "viewer";
}

export function formatTeamRole(role) {
  if (String(role || "").trim().toLowerCase() === "local") {
    return "Local user";
  }

  const normalizedRole = normalizeTeamRole(role);
  if (normalizedRole === "owner") {
    return "Owner";
  }
  if (normalizedRole === "admin") {
    return "Admin";
  }
  if (normalizedRole === "estimator") {
    return "Estimator";
  }
  return "Viewer";
}

export function canManageTeamAccess(role) {
  const normalizedRole = normalizeTeamRole(role);
  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function normalizeTeamMember(row = {}) {
  return {
    companyId: row.company_id || row.companyId || "",
    createdAt: row.created_at || row.createdAt || "",
    id: row.id || createTeamMemberFallbackId(),
    inviteEmail: String(row.invite_email || row.inviteEmail || "").trim().toLowerCase(),
    role: normalizeTeamRole(row.role),
    status: String(row.status || "invited").trim().toLowerCase(),
    updatedAt: row.updated_at || row.updatedAt || "",
    userId: row.user_id || row.userId || "",
  };
}

function createTeamMemberFallbackId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `team-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
