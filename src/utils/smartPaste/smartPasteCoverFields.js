const coverLabelMap = new Map([
  ["project", "projectName"],
  ["project name", "projectName"],
  ["location", "projectLocation"],
  ["project location", "projectLocation"],
  ["project location / address", "projectLocation"],
  ["project address", "projectAddress"],
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
  const lines = String(notes || "").split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([^:]{1,80})\s*:\s*(.*?)\s*$/);

    if (!match) {
      return;
    }

    const key = getSmartPasteCoverFieldKey(match[1]);

    if (!key || hasSmartPasteText(fields[key])) {
      return;
    }

    const inlineValue = match[2].trim();
    const fallbackValue = inlineValue || getNextSmartPasteFieldValue(lines, index);

    if (hasSmartPasteText(fallbackValue)) {
      fields[key] = fallbackValue;
    }
  });

  return fields;
}

export function mergeSmartPasteCoverValues(parsedValues = {}, extractedValues = {}) {
  const nextValues = { ...(parsedValues || {}) };

  ["projectName", "projectLocation", "projectAddress", "clientCompany", "contactName", "clientEmail", "clientPhone"].forEach((key) => {
    if (hasSmartPasteText(extractedValues?.[key])) {
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
  return coverLabelMap.get(String(label || "").trim().toLowerCase().replace(/\s+/g, " ")) || "";
}

function hasSmartPasteText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
