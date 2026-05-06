export const activityLogStorageKey = "last-yard-activity-log-v1";
export const maxActivityLogRecords = 500;

export const activityLogFilters = [
  ["all", "All"],
  ["bid", "Bids"],
  ["proposal", "Proposals"],
  ["contact", "Contacts"],
  ["settings", "Settings"],
  ["backup", "Backup"],
  ["storage", "Storage"],
  ["team", "Team"],
];

export const activityTypeMeta = {
  backup: { label: "Backup", tone: "backup" },
  bid: { label: "Bid", tone: "bid" },
  contact: { label: "Contact", tone: "contact" },
  packet: { label: "Packet", tone: "packet" },
  pdf: { label: "PDF", tone: "pdf" },
  proposal: { label: "Proposal", tone: "proposal" },
  send: { label: "Send", tone: "send" },
  settings: { label: "Settings", tone: "settings" },
  storage: { label: "Storage", tone: "storage" },
  team: { label: "Team", tone: "team" },
  general: { label: "Activity", tone: "general" },
};

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

export function getActivityDisplayMeta(record = {}) {
  const entityType = String(record.entityType || "general").trim().toLowerCase();
  const action = String(record.action || "").trim().toLowerCase();
  const labelText = `${entityType} ${action}`;

  if (labelText.includes("pdf")) {
    return activityTypeMeta.pdf;
  }

  if (labelText.includes("packet")) {
    return activityTypeMeta.packet;
  }

  if (labelText.includes("send") || labelText.includes("sent")) {
    return activityTypeMeta.send;
  }

  return activityTypeMeta[entityType] || activityTypeMeta.general;
}

export function groupActivityRecordsByDate(records = []) {
  const groupedRecords = {
    today: { key: "today", label: "Today", records: [] },
    yesterday: { key: "yesterday", label: "Yesterday", records: [] },
    earlier: { key: "earlier", label: "Earlier dates", records: [] },
  };

  normalizeActivityLog(records).forEach((record) => {
    groupedRecords[getActivityDateBucket(record.createdAt)].records.push(record);
  });

  return Object.values(groupedRecords).filter((group) => group.records.length > 0);
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

function getActivityDateBucket(createdAt) {
  const recordDate = new Date(createdAt);

  if (Number.isNaN(recordDate.getTime())) {
    return "earlier";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const recordStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate()).getTime();
  const daysAgo = Math.round((todayStart - recordStart) / 86400000);

  if (daysAgo === 0) {
    return "today";
  }

  if (daysAgo === 1) {
    return "yesterday";
  }

  return "earlier";
}
