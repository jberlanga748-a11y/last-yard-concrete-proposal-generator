const BID_STATUSES = [
  "New",
  "Reviewing",
  "Bid / No-Bid",
  "Estimating",
  "Proposal Started",
  "Submitted",
  "Follow-Up",
  "Awarded",
  "Lost",
  "No-Bid",
];

const BID_PRIORITIES = ["Low", "Medium", "High", "Must Bid"];

const concreteKeywords = ["sidewalk", "ada", "curb", "flatwork", "slab", "footing", "concrete"];

const labelMap = new Map([
  ["project", "projectName"],
  ["project name", "projectName"],
  ["owner", "ownerOrClient"],
  ["client", "ownerOrClient"],
  ["gc", "gcCompany"],
  ["prime", "gcCompany"],
  ["contact", "contactName"],
  ["email", "contactEmail"],
  ["phone", "contactPhone"],
  ["location", "projectLocation"],
  ["address", "projectLocation"],
  ["bid source", "bidSource"],
  ["bid url", "bidUrl"],
  ["plan link", "planLink"],
  ["bid due", "bidDue"],
  ["bid date", "bidDue"],
  ["bid time", "bidDueTime"],
  ["pre-bid", "preBidMeetingDate"],
  ["prebid", "preBidMeetingDate"],
  ["pre-bid meeting", "preBidMeetingDate"],
  ["rfi deadline", "rfiDeadline"],
  ["addendum deadline", "addendumDeadline"],
  ["expected award", "expectedAwardDate"],
  ["scope", "scopeSummary"],
  ["concrete scope", "concreteScope"],
  ["red flags", "redFlags"],
  ["missing info", "missingInfo"],
  ["next step", "nextStep"],
  ["follow-up", "followUpDate"],
  ["follow up", "followUpDate"],
  ["priority", "priority"],
  ["status", "bidStatus"],
  ["estimator", "estimatorAssigned"],
]);

export function parseBidSmartPasteNotes(notes = "", currentBid = {}) {
  const lines = String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const updates = {};
  const summary = {
    contactInfo: [],
    dates: [],
    fields: [],
    unclearItems: [],
    warnings: [],
  };
  const explicitFields = new Set();
  const inferredNotes = [];
  const concreteLines = [];

  lines.forEach((line) => {
    const labeled = parseLabeledLine(line);

    if (labeled) {
      applyLabeledValue(updates, summary, explicitFields, labeled.field, labeled.value, currentBid);
      return;
    }

    captureUrls(updates, summary, explicitFields, line);

    if (mentionsConcreteScope(line)) {
      concreteLines.push(line);
    }

    if (/mandatory pre[-\s]?bid|required pre[-\s]?bid/i.test(line)) {
      inferredNotes.push(line);
      const detectedDate = parseDateValue(line);

      if (detectedDate && !updates.preBidMeetingDate && !currentBid.preBidMeetingDate) {
        updates.preBidMeetingDate = detectedDate.date;
        summary.dates.push("pre-bid meeting");
      }
    }

    if (/must bid/i.test(line) && !updates.priority && !currentBid.priority) {
      updates.priority = "Must Bid";
      summary.fields.push("priority");
    } else if (/high priority/i.test(line) && !updates.priority && !currentBid.priority) {
      updates.priority = "High";
      summary.fields.push("priority");
    } else if (/low priority/i.test(line) && !updates.priority && !currentBid.priority) {
      updates.priority = "Low";
      summary.fields.push("priority");
    }

    if (/no[-\s]?bid/i.test(line) && !updates.bidStatus && !currentBid.bidStatus) {
      updates.bidStatus = "No-Bid";
      summary.fields.push("status");
    }
  });

  if (!updates.concreteScope && concreteLines.length > 0 && !currentBid.concreteScope) {
    updates.concreteScope = uniqueLines(concreteLines).join("\n");
    summary.fields.push("concrete scope");
  }

  if (inferredNotes.length > 0) {
    updates.notes = appendText(currentBid.notes, inferredNotes.join("\n"));
    summary.fields.push("notes");
  }

  addWarnings(updates, currentBid, summary);

  return {
    bid: {
      ...currentBid,
      ...updates,
    },
    summary: {
      ...summary,
      contactInfo: uniqueLines(summary.contactInfo),
      dates: uniqueLines(summary.dates),
      fields: uniqueLines(summary.fields),
      unclearItems: uniqueLines(summary.unclearItems),
      warnings: uniqueLines(summary.warnings),
    },
  };
}

function parseLabeledLine(line) {
  const match = line.match(/^([^:]+):\s*(.+)$/);

  if (!match) {
    return null;
  }

  const label = normalizeLabel(match[1]);
  const field = labelMap.get(label);

  if (!field) {
    return null;
  }

  return {
    field,
    value: match[2].trim(),
  };
}

function applyLabeledValue(updates, summary, explicitFields, field, value, currentBid = {}) {
  explicitFields.add(field);

  if (field === "bidDue") {
    const parsedDue = parseDateTimeValue(value);

    if (parsedDue.date) {
      updates.bidDueDate = parsedDue.date;
      summary.dates.push("bid due date");
    } else {
      summary.unclearItems.push(`Bid due date: ${value}`);
    }

    if (parsedDue.time) {
      updates.bidDueTime = parsedDue.time;
      summary.dates.push("bid due time");
    }

    return;
  }

  if (field === "bidDueTime") {
    const parsedTime = parseTimeValue(value);

    if (parsedTime) {
      updates.bidDueTime = parsedTime;
      summary.dates.push("bid due time");
    } else {
      summary.unclearItems.push(`Bid time: ${value}`);
    }

    return;
  }

  if (["preBidMeetingDate", "rfiDeadline", "addendumDeadline", "expectedAwardDate", "followUpDate"].includes(field)) {
    const parsedDate = parseDateValue(value);

    if (parsedDate?.date) {
      updates[field] = parsedDate.date;
      summary.dates.push(fieldToLabel(field));
    } else {
      summary.unclearItems.push(`${fieldToLabel(field)}: ${value}`);
    }

    return;
  }

  if (field === "priority") {
    updates.priority = normalizePriority(value);
    summary.fields.push("priority");
    return;
  }

  if (field === "bidStatus") {
    updates.bidStatus = normalizeBidStatus(value);
    summary.fields.push("status");
    return;
  }

  updates[field] = value;
  summary.fields.push(fieldToLabel(field));

  if (["contactName", "contactEmail", "contactPhone", "gcCompany"].includes(field)) {
    summary.contactInfo.push(fieldToLabel(field));
  }

  if (field === "scopeSummary" && mentionsConcreteScope(value) && !updates.concreteScope && !currentBid.concreteScope) {
    updates.concreteScope = value;
    summary.fields.push("concrete scope");
  }
}

function captureUrls(updates, summary, explicitFields, line) {
  const urls = line.match(/https?:\/\/\S+/gi) || [];

  urls.forEach((url) => {
    if (/plan|drawing|sheet|spec|document/i.test(line) && !updates.planLink && !explicitFields.has("planLink")) {
      updates.planLink = trimUrl(url);
      summary.fields.push("plan link");
    } else if (!updates.bidUrl && !explicitFields.has("bidUrl")) {
      updates.bidUrl = trimUrl(url);
      summary.fields.push("bid url");
    }
  });
}

function addWarnings(updates, currentBid, summary) {
  const merged = {
    ...currentBid,
    ...updates,
  };

  if (!hasTextValue(merged.bidDueDate)) {
    summary.warnings.push("Missing bid due date.");
  }

  if (!hasTextValue(merged.gcCompany) && !hasTextValue(merged.contactName) && !hasTextValue(merged.contactEmail)) {
    summary.warnings.push("Missing GC/contact.");
  }

  if (!hasTextValue(merged.projectLocation)) {
    summary.warnings.push("Missing location.");
  }

  if (!hasTextValue(merged.concreteScope)) {
    summary.warnings.push("Missing concrete scope.");
  }

  if (!hasTextValue(merged.bidUrl) && !hasTextValue(merged.planLink)) {
    summary.warnings.push("No URL or plan link found.");
  }

  if (summary.unclearItems.some((item) => /date|time/i.test(item))) {
    summary.warnings.push("Some date/time values were unclear.");
  }
}

function normalizeLabel(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePriority(value = "") {
  const text = value.toLowerCase();

  if (text.includes("must")) {
    return "Must Bid";
  }

  if (text.includes("high")) {
    return "High";
  }

  if (text.includes("low")) {
    return "Low";
  }

  return BID_PRIORITIES.includes(value) ? value : "Medium";
}

function normalizeBidStatus(value = "") {
  const text = value.toLowerCase();

  if (text.includes("proposal started")) {
    return "Proposal Started";
  }

  if (text.includes("no-bid") || text.includes("no bid")) {
    return "No-Bid";
  }

  if (text.includes("bid") && text.includes("no")) {
    return "Bid / No-Bid";
  }

  if (text.includes("estimating")) {
    return "Estimating";
  }

  if (text.includes("submitted")) {
    return "Submitted";
  }

  if (text.includes("follow")) {
    return "Follow-Up";
  }

  if (text.includes("award")) {
    return "Awarded";
  }

  if (text.includes("lost")) {
    return "Lost";
  }

  if (text.includes("review")) {
    return "Reviewing";
  }

  return BID_STATUSES.includes(value) ? value : "New";
}

function parseDateTimeValue(value = "") {
  const date = parseDateValue(value);
  const time = parseTimeValue(value);

  return {
    date: date?.date || "",
    time: time || "",
  };
}

function parseDateValue(value = "") {
  const text = String(value || "");
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);

  if (isoMatch) {
    return { date: `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}` };
  }

  const numericMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  if (numericMatch) {
    const year = normalizeYear(numericMatch[3]);
    return {
      date: `${year}-${numericMatch[1].padStart(2, "0")}-${numericMatch[2].padStart(2, "0")}`,
    };
  }

  const monthMatch = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?/i,
  );

  if (monthMatch) {
    return {
      date: `${normalizeYear(monthMatch[3])}-${String(monthNameToNumber(monthMatch[1])).padStart(2, "0")}-${monthMatch[2].padStart(2, "0")}`,
    };
  }

  return null;
}

function parseTimeValue(value = "") {
  const text = String(value || "");
  const colonMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  const meridiemMatch = !colonMatch ? text.match(/\b(\d{1,2})\s*(am|pm)\b/i) : null;
  const match = colonMatch || meridiemMatch;

  if (!match) {
    return "";
  }

  let hour = Number.parseInt(match[1], 10);
  const minute = colonMatch ? match[2] || "00" : "00";
  const meridiem = (colonMatch ? match[3] : match[2])?.toLowerCase();

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  if (hour > 23) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function normalizeYear(value) {
  if (!value) {
    return new Date().getFullYear();
  }

  if (String(value).length === 2) {
    return 2000 + Number.parseInt(value, 10);
  }

  return Number.parseInt(value, 10);
}

function monthNameToNumber(value) {
  const key = value.slice(0, 3).toLowerCase();
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) + 1;
}

function mentionsConcreteScope(value = "") {
  const text = value.toLowerCase();
  return concreteKeywords.some((keyword) => text.includes(keyword));
}

function fieldToLabel(field = "") {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (match) => match.toUpperCase())
    .toLowerCase();
}

function appendText(existing = "", addition = "") {
  return [existing, addition].filter(hasTextValue).join("\n");
}

function trimUrl(value = "") {
  return value.replace(/[),.;]+$/g, "");
}

function uniqueLines(items = []) {
  return [...new Set(items.filter(hasTextValue))];
}

function hasTextValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
