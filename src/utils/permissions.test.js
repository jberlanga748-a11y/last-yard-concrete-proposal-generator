import test from "node:test";
import assert from "node:assert/strict";
import { getPermissionRoleLabel, getRolePermissions, hasRolePermission, normalizePermissionRole } from "./permissions.js";

test("local mode is treated as owner/admin for permissions", () => {
  assert.equal(normalizePermissionRole("local"), "owner");
  assert.equal(getPermissionRoleLabel("local", { signedIn: false }), "Local Owner/Admin");
  assert.equal(hasRolePermission("local", "createProposal"), true);
  assert.equal(hasRolePermission("local", "backupImport"), true);
});

test("viewer can view but cannot edit, delete, or mark sent", () => {
  const permissions = getRolePermissions("viewer");

  assert.equal(permissions.editProposal, false);
  assert.equal(permissions.deleteBid, false);
  assert.equal(permissions.markPacketSent, false);
  assert.equal(permissions.storageUpload, false);
});

test("estimator can build work but cannot manage team/settings/backups", () => {
  const permissions = getRolePermissions("estimator");

  assert.equal(permissions.createProposal, true);
  assert.equal(permissions.editBid, true);
  assert.equal(permissions.createPacketRecord, true);
  assert.equal(permissions.manageTeam, false);
  assert.equal(permissions.manageSettings, false);
  assert.equal(permissions.backupImport, false);
});
