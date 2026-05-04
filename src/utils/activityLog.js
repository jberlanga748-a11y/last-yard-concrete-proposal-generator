export const activityLogStorageKey = "last-yard-activity-log-v1";
export const maxActivityLogRecords = 500;

export const activityLogFilters = [
  ["all", "All"],
  ["bid", "Bids"],
  ["proposal", "Proposals"],
  ["contact", "Contacts"],
  ["settings", "Settings"],
  ["team", "Team"],
  ["backup", "Backup"],
  ["storage", "Storage"],
];

export function createActivityRecord(event = {}, authUser = null) {
  const createdAt = event.createdAt || new Date().toISOString();

  return normalizeActivityRecord({
    id: event.id || `activity-${createdAt}-${Math.random().toString(36).slice(2, 10)}`,
    action: event.action || "",
    entityType: event.entityType || "general",
    entityId: event.entityId || "",
    entityLabel: event.entityLabel || "",
    userEmail: event.userEmail || authUser?.email || "Local user",
    userId: event.userId || authUser?.id || "",
    createdAt,
    notes: event.notes || "",
  });
}

export function normalizeActivityLog(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => normalizeActivityRecord(record))
    .filter((record) => record.action)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, maxActivityLogRecords);
}

export function loadActivityLogFromLocalStorage() {
  try {
    const storedValue = window.localStorage.getItem(activityLogStorageKey);

    if (storedValue) {
      return normalizeActivityLog(JSON.parse(storedValue));
    }

    const storedSettings = window.localStorage.getItem("last-yard-company-settings-v1");

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      return getActivityLogFromSettings(parsedSettings, []);
    }
  } catch {
    // Activity logging should never block app startup.
  }

  return [];
}

export function saveActivityLogToLocalStorage(records = []) {
  try {
    window.localStorage.setItem(activityLogStorageKey, JSON.stringify(normalizeActivityLog(records)));
  } catch {
    // Activity logging is best-effort in local mode.
  }
}

export function getActivityLogFromSettings(settings = {}, fallbackRecords = []) {
  if (Array.isArray(settings?.activityLog)) {
    return normalizeActivityLog(settings.activityLog);
  }

  return normalizeActivityLog(fallbackRecords);
}

function normalizeActivityRecord(record = {}) {
  return {
    id: String(record.id || ""),
    action: String(record.action || "").trim(),
    entityType: String(record.entityType || "general").trim().toLowerCase(),
    entityId: String(record.entityId || ""),
    entityLabel: String(record.entityLabel || ""),
    userEmail: String(record.userEmail || "Local user"),
    userId: String(record.userId || ""),
    createdAt: String(record.createdAt || new Date().toISOString()),
    notes: String(record.notes || ""),
  };
}
