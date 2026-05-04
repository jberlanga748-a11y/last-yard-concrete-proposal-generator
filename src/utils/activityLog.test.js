import test from "node:test";
import assert from "node:assert/strict";
import { createActivityRecord, getActivityLogFromSettings, normalizeActivityLog } from "./activityLog.js";

test("creates activity records with user identity", () => {
  const record = createActivityRecord(
    {
      action: "Proposal saved",
      entityType: "proposal",
      entityId: "proposal-1",
      entityLabel: "LYC-2026-0001",
    },
    { id: "user-1", email: "estimator@example.com" },
  );

  assert.equal(record.action, "Proposal saved");
  assert.equal(record.entityType, "proposal");
  assert.equal(record.userEmail, "estimator@example.com");
  assert.equal(record.userId, "user-1");
});

test("normalizes and sorts activity records newest first", () => {
  const records = normalizeActivityLog([
    { action: "Older", entityType: "bid", createdAt: "2026-01-01T00:00:00.000Z" },
    { action: "Newer", entityType: "proposal", createdAt: "2026-02-01T00:00:00.000Z" },
    { entityType: "ignored", createdAt: "2026-03-01T00:00:00.000Z" },
  ]);

  assert.equal(records.length, 2);
  assert.equal(records[0].action, "Newer");
  assert.equal(records[1].action, "Older");
});

test("reads activity log from company settings with fallback", () => {
  const fallback = [{ action: "Fallback", entityType: "settings" }];
  const settingsRecords = [{ action: "Settings record", entityType: "backup" }];

  assert.equal(getActivityLogFromSettings({}, fallback)[0].action, "Fallback");
  assert.equal(getActivityLogFromSettings({ activityLog: settingsRecords }, fallback)[0].action, "Settings record");
});
