const placeholderTextValues = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "new item",
  "new scope item",
  "untitled",
  "new note",
  "new exclusion",
  "new assumption",
  "upload plan image",
  "upload image",
]);

const defaultPlaceholderPatterns = [
  /^new\s+scope\s+item$/i,
  /^new\s+item$/i,
  /^untitled$/i,
  /^\[?(enter|verify)\b.*\]?$/i,
  /^upload\s+plan\s+image$/i,
];

export function normalizePrintableFingerprint(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9$%\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPlaceholderPrintText(value) {
  const textValue = String(value ?? "").trim();
  const fingerprint = normalizePrintableFingerprint(textValue);

  return placeholderTextValues.has(fingerprint) || defaultPlaceholderPatterns.some((pattern) => pattern.test(textValue));
}

export function hasPrintableText(value) {
  return String(value ?? "").trim() !== "" && !isPlaceholderPrintText(value);
}

export function cleanPrintableText(value) {
  return hasPrintableText(value) ? String(value).trim() : "";
}

export function cleanPrintableTextList(items = []) {
  const seen = new Set();
  const sourceItems = Array.isArray(items)
    ? items
    : String(items ?? "")
        .split(/\r?\n/)
        .map((item) => item.trim());

  return sourceItems
    .map(cleanPrintableText)
    .filter(Boolean)
    .filter((item) => {
      const fingerprint = normalizePrintableFingerprint(item);

      if (!fingerprint || seen.has(fingerprint)) {
        return false;
      }

      seen.add(fingerprint);
      return true;
    });
}

export function cleanPrintableTextBlock(value) {
  return cleanPrintableTextList(value).join("\n");
}

export function cleanPrintableScopeSections(scopeSections = []) {
  if (!Array.isArray(scopeSections)) {
    return [];
  }

  return scopeSections
    .map((section) => ({
      ...section,
      title: cleanPrintableText(section?.title),
      items: cleanPrintableTextList(section?.items),
    }))
    .filter((section) => section.title || section.items.length > 0);
}

export function isPrintablePricingSection(section = {}) {
  const label = cleanPrintableText(section.label || section.name);
  const description = cleanPrintableText(section.description);
  const amount = toPrintableNumber(section.amount);
  const type = String(section.type || "").trim();

  if (amount <= 0 && section.included !== true) {
    return false;
  }

  if (type === "allowance" && amount <= 0 && section.included !== true) {
    return false;
  }

  if ((type === "add_alternate" || type === "deduct_alternate") && amount <= 0 && section.included !== true) {
    return false;
  }

  if (isDefaultAlternateLabel(label) && !description && amount <= 0 && section.included !== true) {
    return false;
  }

  if (isDefaultAllowanceLabel(label) && section.included !== true) {
    return false;
  }

  return Boolean(label || description || amount > 0 || section.included === true);
}

export function cleanPrintablePricingSections(pricingSections = []) {
  if (!Array.isArray(pricingSections)) {
    return [];
  }

  return pricingSections
    .filter(isPrintablePricingSection)
    .map((section) => ({
      ...section,
      label: cleanPrintableText(section.label || section.name),
      description: cleanPrintableText(section.description),
    }));
}

export function cleanPrintablePricingSummaryRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row) => {
    const label = cleanPrintableText(row.label);
    const note = cleanPrintableText(row.note);
    const amount = toPrintableNumber(row.amount);

    if (!label && !note && amount <= 0) {
      return false;
    }

    if (isDefaultAllowanceLabel(label) && amount <= 0) {
      return false;
    }

    if (isDefaultAlternateLabel(label) && !note && amount <= 0) {
      return false;
    }

    return true;
  });
}

export function cleanPrintableStructuredRows(sectionKey, rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row) =>
    Object.entries(row || {}).some(([key, value]) => key !== "id" && hasPrintableText(value)),
  );
}

export function hasPlanSheetPrintContent(sheet = {}) {
  return Boolean(
    sheet.imageSrc ||
      sheet.dataUrl ||
      sheet.publicUrl ||
      sheet.signedUrl ||
      sheet.storagePath ||
      cleanPrintableTextList(sheet.calculationNotes).length > 0 ||
      cleanPrintableTextList(sheet.clarificationNotes).length > 0,
  );
}

export function cleanPrintablePlanSheets(planSheets = []) {
  if (!Array.isArray(planSheets)) {
    return [];
  }

  return planSheets
    .map((sheet) => ({
      ...sheet,
      title: cleanPrintableText(sheet.title) || sheet.title || "",
      subtitle: cleanPrintableText(sheet.subtitle),
      calculationTitle: cleanPrintableText(sheet.calculationTitle),
      calculationNotes: cleanPrintableTextList(sheet.calculationNotes),
      clarificationNotes: cleanPrintableTextList(sheet.clarificationNotes),
    }))
    .filter((sheet) => sheet.enabled && hasPlanSheetPrintContent(sheet));
}

export function getPrintablePreparedForLines(client = {}) {
  const companyName = cleanPrintableText(client.companyName) || "To be verified";
  const lines = [{ label: "", text: companyName }];

  [
    ["Attn", client.contactName],
    ["", client.title],
    ["", client.billingAddress || client.address],
    ["", client.projectAddress || client.cityStateZip],
    ["Phone", client.phone],
    ["Email", client.email],
  ].forEach(([label, value]) => {
    const text = cleanPrintableText(value);

    if (text) {
      lines.push({ label, text });
    }
  });

  return lines;
}

export function cleanProposalForPrint(proposal = {}) {
  return {
    ...proposal,
    project: {
      ...(proposal.project || {}),
      name: cleanPrintableText(proposal.project?.name) || proposal.project?.name || "",
      location: cleanPrintableText(proposal.project?.location),
      address: cleanPrintableText(proposal.project?.address),
      description: cleanPrintableTextBlock(proposal.project?.description),
      estimatedDuration: cleanPrintableTextBlock(proposal.project?.estimatedDuration),
      scheduleRestrictions: cleanPrintableTextBlock(proposal.project?.scheduleRestrictions),
      proposedSchedule: {
        ...(proposal.project?.proposedSchedule || {}),
        display: cleanPrintableTextBlock(proposal.project?.proposedSchedule?.display),
      },
    },
    client: {
      ...(proposal.client || {}),
      companyName: cleanPrintableText(proposal.client?.companyName),
      contactName: cleanPrintableText(proposal.client?.contactName),
      title: cleanPrintableText(proposal.client?.title),
      phone: cleanPrintableText(proposal.client?.phone),
      email: cleanPrintableText(proposal.client?.email),
      billingAddress: cleanPrintableText(proposal.client?.billingAddress),
      address: cleanPrintableText(proposal.client?.address),
      projectAddress: cleanPrintableText(proposal.client?.projectAddress),
      cityStateZip: cleanPrintableText(proposal.client?.cityStateZip),
    },
    scopeSections: cleanPrintableScopeSections(proposal.scopeSections),
    exclusions: cleanPrintableTextList(proposal.exclusions),
    assumptions: cleanPrintableTextList(proposal.assumptions),
    pricingSections: cleanPrintablePricingSections(proposal.pricingSections),
    proposalNotes: cleanPrintableTextBlock(proposal.proposalNotes),
    notes: cleanPrintableTextBlock(proposal.notes),
    takeoffQuantityBackup: cleanPrintableTextBlock(proposal.takeoffQuantityBackup),
    quantityBackup: cleanPrintableTextBlock(proposal.quantityBackup),
    planSheets: cleanPrintablePlanSheets(proposal.planSheets),
    gcPrime: cleanPrintableGcPrime(proposal.gcPrime),
    concreteSpecs: {
      ...(proposal.concreteSpecs || {}),
      notes: cleanPrintableTextBlock(proposal.concreteSpecs?.notes),
    },
    gcPacketTables: cleanPrintableGcPacketTables(proposal.gcPacketTables),
  };
}

function cleanPrintableGcPrime(gcPrime = {}) {
  return {
    ...gcPrime,
    rfiClarificationNotes: cleanPrintableTextBlock(gcPrime.rfiClarificationNotes || gcPrime.rfiNotes),
    rfiNotes: cleanPrintableTextBlock(gcPrime.rfiNotes),
    addendaAcknowledged: cleanPrintableTextBlock(gcPrime.addendaAcknowledged),
    gcPrimeNotes: cleanPrintableTextBlock(gcPrime.gcPrimeNotes),
    scopeControlSummary: {
      ...(gcPrime.scopeControlSummary || {}),
      includedScope: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.includedScope),
      exclusions: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.exclusions),
      clarifications: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.clarifications),
      acceptedAlternates: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.acceptedAlternates),
      allowances: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.allowances),
      ownerGcByOthers: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.ownerGcByOthers),
      hiddenUnshownConditionsNote: cleanPrintableTextBlock(gcPrime.scopeControlSummary?.hiddenUnshownConditionsNote),
    },
  };
}

function cleanPrintableGcPacketTables(tables = {}) {
  return {
    ...tables,
    pricingSummary: {
      ...(tables.pricingSummary || {}),
      rows: cleanPrintablePricingSummaryRows(tables.pricingSummary?.rows),
      presentationNotes: cleanPrintableTextBlock(tables.pricingSummary?.presentationNotes),
    },
    scheduleOfValues: {
      ...(tables.scheduleOfValues || {}),
      rows: cleanPrintableStructuredRows("scheduleOfValues", tables.scheduleOfValues?.rows),
    },
    takeoffQuantities: {
      ...(tables.takeoffQuantities || {}),
      rows: cleanPrintableStructuredRows("takeoffQuantities", tables.takeoffQuantities?.rows),
    },
    shadeFootingEstimate: {
      ...(tables.shadeFootingEstimate || {}),
      rows: cleanPrintableStructuredRows("shadeFootingEstimate", tables.shadeFootingEstimate?.rows),
    },
    proposalNotes: {
      ...(tables.proposalNotes || {}),
      proposalBasis: cleanPrintableTextBlock(tables.proposalNotes?.proposalBasis),
      contractScopeControl: cleanPrintableTextBlock(tables.proposalNotes?.contractScopeControl),
      acceptanceSummary: cleanPrintableTextBlock(tables.proposalNotes?.acceptanceSummary),
      gcPrimeReviewer: cleanPrintableTextBlock(tables.proposalNotes?.gcPrimeReviewer),
    },
  };
}

function isDefaultAllowanceLabel(value) {
  const text = normalizePrintableFingerprint(value);
  return text.includes("estimated shade footings") || text.includes("interface rfi allowance") || text.includes("concrete interface rfi allowance");
}

function isDefaultAlternateLabel(value) {
  return /^add alternate 0?[12]$/i.test(String(value || "").trim()) || /^add alternate 0?[12]$/i.test(normalizePrintableFingerprint(value));
}

function toPrintableNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "").trim();

  if (!text || /^[-–—]$/.test(text)) {
    return 0;
  }

  const numberValue = Number.parseFloat(text.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numberValue) ? numberValue : 0;
}
