const projectNameLabels = new Set(["project", "project name", "job", "job name", "bid", "bid name", "proposal project"]);
const projectLocationLabels = new Set([
  "location",
  "project location",
  "project location / address",
  "site",
  "jobsite",
  "job site",
]);
const projectAddressLabels = new Set(["project address", "address", "site address", "jobsite address", "job site address"]);

const coverLabelMap = new Map([
  ["prepared for", "clientCompany"],
  ["prepared for / client", "clientCompany"],
  ["prepared for/client", "clientCompany"],
  ["client", "clientCompany"],
  ["contact", "contactName"],
  ["attn", "contactName"],
  ["attention", "contactName"],
  ["email", "clientEmail"],
  ["contact email", "clientEmail"],
  ["phone", "clientPhone"],
  ["contact phone", "clientPhone"],
]);

export function extractSmartPasteCoverFieldsFromNotes(notes = "") {
  const fields = {};
  const projectNameCandidates = [];
  const lines = String(notes || "").split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([^:]{1,80})\s*:\s*(.*?)\s*$/);

    if (!match) {
      return;
    }

    const normalizedLabel = normalizeSmartPasteCoverLabel(match[1]);
    const key = getSmartPasteCoverFieldKey(normalizedLabel);

    if (!key || hasSmartPasteText(fields[key])) {
      return;
    }

    const inlineValue = match[2].trim();
    const fallbackValue = inlineValue || getNextSmartPasteFieldValue(lines, index);

    if (!hasSmartPasteText(fallbackValue)) {
      return;
    }

    if (key === "projectName") {
      const value = fallbackValue.trim();

      projectNameCandidates.push({
        label: normalizedLabel,
        value,
        looksLikeAddress: isLikelySmartPasteStreetAddress(value),
      });

      if (isLikelySmartPasteStreetAddress(value)) {
        if (!hasSmartPasteText(fields.projectAddress)) {
          fields.projectAddress = value;
        }

        if (!hasSmartPasteText(fields.projectLocation)) {
          fields.projectLocation = value;
        }
      }
      return;
    }

    if (hasSmartPasteText(fallbackValue)) {
      fields[key] = fallbackValue;
    }
  });

  const projectName = chooseSmartPasteProjectName(projectNameCandidates, fields);

  if (hasSmartPasteText(projectName)) {
    fields.projectName = projectName;
  }

  return fields;
}

export function mergeSmartPasteCoverValues(parsedValues = {}, extractedValues = {}) {
  const nextValues = { ...(parsedValues || {}) };

  ["projectName", "projectLocation", "projectAddress", "clientCompany", "contactName", "clientEmail", "clientPhone"].forEach((key) => {
    if (hasSmartPasteText(extractedValues?.[key])) {
      if (
        key === "projectName" &&
        isLikelySmartPasteStreetAddress(extractedValues[key]) &&
        (hasSmartPasteText(nextValues.projectName) || hasSmartPasteText(extractedValues.projectLocation) || hasSmartPasteText(extractedValues.projectAddress))
      ) {
        return;
      }

      nextValues[key] = extractedValues[key];
    }
  });

  return nextValues;
}

export function summarizeSmartPasteCoverValues(values = {}) {
  return {
    projectName: values.projectName || "",
    projectLocation: values.projectLocation || values.projectAddress || "",
    clientCompany: values.clientCompany || "",
  };
}

export function firstSmartPasteText(...values) {
  const value = values.find(hasSmartPasteText);

  return hasSmartPasteText(value) ? String(value).trim() : "";
}

function getNextSmartPasteFieldValue(lines, index) {
  for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
    const value = String(lines[nextIndex] || "").trim();

    if (!value) {
      continue;
    }

    if (/^\s*[^:]{1,80}\s*:/.test(value)) {
      return "";
    }

    return value.replace(/^[-*\u2022]\s*/, "").trim();
  }

  return "";
}

function getSmartPasteCoverFieldKey(label = "") {
  const normalizedLabel = normalizeSmartPasteCoverLabel(label);

  if (projectNameLabels.has(normalizedLabel)) {
    return "projectName";
  }

  if (projectLocationLabels.has(normalizedLabel)) {
    return "projectLocation";
  }

  if (projectAddressLabels.has(normalizedLabel)) {
    return "projectAddress";
  }

  return coverLabelMap.get(normalizedLabel) || "";
}

function hasSmartPasteText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function chooseSmartPasteProjectName(candidates = [], fields = {}) {
  const nonAddressCandidates = candidates.filter((candidate) => hasSmartPasteText(candidate.value) && !candidate.looksLikeAddress);
  const projectNameCandidate = nonAddressCandidates.find((candidate) => candidate.label === "project name");

  if (projectNameCandidate) {
    return projectNameCandidate.value;
  }

  if (nonAddressCandidates.length > 0) {
    return nonAddressCandidates[0].value;
  }

  const explicitProjectAddressCandidate = candidates.find(
    (candidate) =>
      candidate.label === "project" &&
      candidate.looksLikeAddress &&
      !hasSmartPasteText(fields.projectLocation) &&
      !hasSmartPasteText(fields.projectAddress),
  );

  return explicitProjectAddressCandidate?.value || "";
}

export function isLikelySmartPasteStreetAddress(value = "") {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  return /\b\d{1,6}\s+[a-z0-9.'#-]+(?:\s+[a-z0-9.'#-]+){0,6}\s+(?:ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|ct|court|ln|lane|hwy|highway|way|place|pl|terrace|ter|circle|cir|parkway|pkwy|loop|se|ne|nw|sw)\b/i.test(
    text,
  );
}

function normalizeSmartPasteCoverLabel(label = "") {
  return String(label || "").trim().toLowerCase().replace(/\s+/g, " ");
}
