export const permissionDeniedMessage = "You do not have permission to perform this action.";

const rolePermissions = {
  owner: {
    backupExport: true,
    backupImport: true,
    cloudSync: true,
    createBid: true,
    createContact: true,
    createPacketRecord: true,
    createProposal: true,
    deleteBid: true,
    deleteContact: true,
    deletePriceLibrary: true,
    deleteProposal: true,
    editBid: true,
    editContact: true,
    editPriceLibrary: true,
    editProposal: true,
    manageSettings: true,
    manageTeam: true,
    markPacketSent: true,
    markProposalOutcome: true,
    sendWorkflow: true,
    storageUpload: true,
  },
  admin: {
    backupExport: true,
    backupImport: true,
    cloudSync: true,
    createBid: true,
    createContact: true,
    createPacketRecord: true,
    createProposal: true,
    deleteBid: true,
    deleteContact: true,
    deletePriceLibrary: true,
    deleteProposal: true,
    editBid: true,
    editContact: true,
    editPriceLibrary: true,
    editProposal: true,
    manageSettings: true,
    manageTeam: true,
    markPacketSent: true,
    markProposalOutcome: true,
    sendWorkflow: true,
    storageUpload: true,
  },
  estimator: {
    backupExport: false,
    backupImport: false,
    cloudSync: false,
    createBid: true,
    createContact: true,
    createPacketRecord: true,
    createProposal: true,
    deleteBid: false,
    deleteContact: false,
    deletePriceLibrary: false,
    deleteProposal: false,
    editBid: true,
    editContact: true,
    editPriceLibrary: false,
    editProposal: true,
    manageSettings: false,
    manageTeam: false,
    markPacketSent: true,
    markProposalOutcome: false,
    sendWorkflow: true,
    storageUpload: true,
  },
  viewer: {
    backupExport: false,
    backupImport: false,
    cloudSync: false,
    createBid: false,
    createContact: false,
    createPacketRecord: false,
    createProposal: false,
    deleteBid: false,
    deleteContact: false,
    deletePriceLibrary: false,
    deleteProposal: false,
    editBid: false,
    editContact: false,
    editPriceLibrary: false,
    editProposal: false,
    manageSettings: false,
    manageTeam: false,
    markPacketSent: false,
    markProposalOutcome: false,
    sendWorkflow: false,
    storageUpload: false,
  },
};

export function normalizePermissionRole(role, { localIsOwner = true } = {}) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole === "local" || normalizedRole === "") {
    return localIsOwner ? "owner" : "viewer";
  }

  return rolePermissions[normalizedRole] ? normalizedRole : "viewer";
}

export function getRolePermissions(role) {
  return {
    ...rolePermissions.viewer,
    ...(rolePermissions[normalizePermissionRole(role)] || {}),
  };
}

export function hasRolePermission(role, action) {
  return Boolean(getRolePermissions(role)[action]);
}

export function getPermissionRoleLabel(role, { signedIn = false } = {}) {
  const normalizedRole = normalizePermissionRole(role);

  if (!signedIn && normalizedRole === "owner") {
    return "Local Owner/Admin";
  }

  if (normalizedRole === "owner") {
    return "Owner";
  }

  return `${normalizedRole.charAt(0).toUpperCase()}${normalizedRole.slice(1)}`;
}
