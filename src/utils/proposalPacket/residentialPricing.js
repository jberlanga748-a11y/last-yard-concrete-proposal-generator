export const CHOOSE_ONE_PRICING_MODE = "choose_one_option";
export const CHOOSE_ONE_WITH_ADDONS_PRICING_MODE = "choose_one_option_with_addons";
export const BASE_PLUS_ADDONS_PRICING_MODE = "base_plus_addons";
export const RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT = "simple_estimate";
export const RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT = "proposal_with_photos";
export const RESIDENTIAL_DETAILED_BACKUP_LAYOUT = "detailed_backup";

export const RESIDENTIAL_PDF_LAYOUT_OPTIONS = [
  { value: RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT, label: "Simple Estimate" },
  { value: RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT, label: "Proposal With Photos" },
  { value: RESIDENTIAL_DETAILED_BACKUP_LAYOUT, label: "Detailed Backup" },
];

export const RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE = "Estimated duration: 10 working days.";

export const RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION =
  "Residential concrete package including walkway, landings, steps, curbs, side walls, wall footings, rebar reinforcement, selected finish, and cleanup.";

const APPLIED_CUSTOMER_SELECTION_STATUSES = new Set(["applied_to_proposal", "approval_sent", "approved_signed"]);

export function toResidentialPricingNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numberValue = Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatResidentialCurrency(value, options = {}) {
  const numericValue = toResidentialPricingNumber(value);
  const sign = numericValue < 0 ? "-" : options.plus ? "+" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(numericValue)));

  return `${sign}${formatted}`;
}

export function normalizeResidentialTextList(items = []) {
  const source = Array.isArray(items)
    ? items
    : String(items ?? "")
        .split(/\r?\n|;/)
        .map((item) => item.replace(/^[-*]\s*/, ""));

  return source.map(cleanResidentialText).filter(Boolean);
}

export function buildResidentialPaymentTermsCopy(proposal = {}) {
  if (hasResidentialChooseOnePricing(proposal) || hasResidentialBasePlusAddOnsPricing(proposal)) {
    return [
      "Payment Terms:",
      "50% down payment is required to schedule the project.",
      "Final payment is due when the last concrete for the included scope is poured.",
      "Down payment and final payment are based on the selected option and any selected add-on.",
    ].join(" ");
  }

  const terms = proposal.terms || {};
  const copyParts = [terms.payment, terms.depositText, terms.finalPayment, terms.acceptance]
    .map(cleanResidentialText)
    .filter(Boolean);

  return copyParts.length > 0 ? `Payment Terms: ${copyParts.join(" ")}` : "";
}

export function buildResidentialPricingOptionRows(proposal = {}) {
  const options = getResidentialPricingOptions(proposal);
  const addOns = getResidentialOptionalAddOns(proposal);

  return options.map((option) => {
    const basePrice = toResidentialPricingNumber(option.price);
    const addOnComparisons = addOns
      .filter((addOn) => doesResidentialAddOnApplyToOption(addOn, option))
      .map((addOn) => {
        const addOnAmount = getResidentialAddOnAmountForOption(addOn, option);
        const explicitTotalRow = getResidentialExplicitAddOnOptionTotalRow(addOn, option);
        const explicitTotal = toResidentialPricingNumber(explicitTotalRow?.total);
        const total = explicitTotal > basePrice ? explicitTotal : basePrice + addOnAmount;

        return {
          addOn,
          amount: addOnAmount,
          total,
          downPayment: toResidentialPricingNumber(explicitTotalRow?.downPayment) || total / 2,
          finalPayment: toResidentialPricingNumber(explicitTotalRow?.finalPayment) || total / 2,
        };
      })
      .filter((comparison) => comparison.total > 0);
    const comparison = addOnComparisons.length === 1 ? addOnComparisons[0] : null;

    return {
      id: option.id,
      name: option.name,
      description: option.description,
      finishType: option.finishType,
      scopeSummary: option.scopeSummary,
      includedScope: normalizeResidentialTextList(option.includedScope),
      excludedScope: normalizeResidentialTextList(option.excludedScope),
      notes: normalizeResidentialTextList(option.notes),
      lineItems: normalizeResidentialOptionLineItems(option.lineItems),
      lineItemTotal: getResidentialOptionLineItemTotal(option),
      totalWarning: getResidentialOptionTotalWarning(option),
      included: Boolean(option.included || option.selected),
      selected: Boolean(option.selected || option.included),
      basePrice,
      downPayment: toResidentialPricingNumber(option.downPayment) || basePrice / 2,
      finalPayment: toResidentialPricingNumber(option.finalPayment) || basePrice / 2,
      addOnComparisons,
      images: normalizeResidentialOptionImages(option.images),
      withAddOnTotal: comparison?.total || 0,
      withAddOnDownPayment: comparison?.downPayment || 0,
      withAddOnFinalPayment: comparison?.finalPayment || 0,
    };
  });
}

export function buildResidentialPricingOptionPrintPages(proposal = {}, optionsPerPage = 2) {
  if (!hasResidentialChooseOnePricing(proposal)) {
    return [];
  }

  const optionRows = buildResidentialPricingOptionRows(proposal);
  const { withPhotos: addOnsWithPhotos } = splitResidentialOptionalAddOnsForPrint(proposal);
  const hasPrintableOptionPhotos = [...optionRows, ...addOnsWithPhotos].some((item) => getPrintableResidentialOptionImages(item.images).length > 0);
  const chunkSize = hasPrintableOptionPhotos ? 1 : Math.max(1, Math.floor(toResidentialPricingNumber(optionsPerPage)) || 2);
  const pages = [];

  for (let index = 0; index < optionRows.length; index += chunkSize) {
    pages.push(optionRows.slice(index, index + chunkSize));
  }

  return pages.map((options, index) => ({
    key: `residential-pricing-options-${index + 1}`,
    options,
    pageIndex: index,
    pageCount: pages.length,
    showAddOns: index === pages.length - 1,
  }));
}

export function splitResidentialOptionalAddOnsForPrint(proposal = {}) {
  const withPhotos = [];
  const withoutPhotos = [];

  getResidentialOptionalAddOns(proposal).forEach((addOn) => {
    if (getPrintableResidentialOptionImages(addOn.images).length > 0) {
      withPhotos.push(addOn);
      return;
    }

    withoutPhotos.push(addOn);
  });

  return { withPhotos, withoutPhotos };
}

export function buildResidentialOptionalAddOnPrintPages(proposal = {}, photosPerPage = 6) {
  const { withPhotos } = splitResidentialOptionalAddOnsForPrint(proposal);
  const chunkSize = Math.max(1, Math.floor(toResidentialPricingNumber(photosPerPage)) || 6);

  return withPhotos.flatMap((addOn, addOnIndex) => {
    const images = getPrintableResidentialOptionImages(addOn.images);
    const chunks = [];

    for (let index = 0; index < images.length; index += chunkSize) {
      chunks.push(images.slice(index, index + chunkSize));
    }

    return chunks.map((imageChunk, pageIndex) => ({
      key: `residential-optional-add-on-${addOn.id || normalizeResidentialKey(addOn.name) || addOnIndex}-${pageIndex + 1}`,
      addOn,
      images: imageChunk,
      pageIndex,
      pageCount: chunks.length,
    }));
  });
}

export function buildResidentialOptionBreakdownPrintPages(proposal = {}, pageBudget = 24, maxRowsPerOptionPage = 14) {
  const breakdowns = buildResidentialOptionBreakdowns(proposal);

  if (breakdowns.length === 0) {
    return [];
  }

  const budget = Math.max(8, Math.floor(toResidentialPricingNumber(pageBudget)) || 24);
  const optionFragments = breakdowns.flatMap((option) => splitResidentialOptionBreakdownForPrint(option, maxRowsPerOptionPage));
  const pages = [];
  let currentPage = [];
  let currentWeight = 0;

  optionFragments.forEach((option) => {
    const optionWeight = getResidentialOptionBreakdownPrintWeight(option);

    if (currentPage.length > 0 && currentWeight + optionWeight > budget) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
    }

    currentPage.push(option);
    currentWeight += optionWeight;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.map((options, index) => ({
    key: `residential-option-breakdowns-${index}`,
    title: pages.length > 1 ? `Schedule of Values - Pricing Options (${index + 1})` : "Schedule of Values - Pricing Options",
    options,
    pageIndex: index,
    pageCount: pages.length,
  }));
}

function splitResidentialOptionBreakdownForPrint(option = {}, maxRowsPerOptionPage = 14) {
  const rows = Array.isArray(option.scheduleOfValues) ? option.scheduleOfValues : [];
  const chunkSize = Math.max(1, Math.floor(toResidentialPricingNumber(maxRowsPerOptionPage)) || 14);

  if (rows.length <= chunkSize) {
    return [option];
  }

  const chunks = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks.map((rowChunk, index) => {
    const isLastChunk = index === chunks.length - 1;
    const chunkTotal = rowChunk.reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);

    return {
      ...option,
      name: index === 0 ? option.name : `${option.name} (continued)`,
      scheduleOfValues: rowChunk,
      rowsTotal: isLastChunk ? option.rowsTotal : chunkTotal,
      totalMatchesOption: isLastChunk ? option.totalMatchesOption : false,
      footerLabel: isLastChunk
        ? option.totalMatchesOption
          ? "Option Total"
          : "Breakdown Total - Review"
        : "Continued subtotal",
    };
  });
}

export function getResidentialOptionBreakdownPrintWeight(option = {}) {
  const rows = Array.isArray(option.scheduleOfValues) ? option.scheduleOfValues : [];
  const rowWeight = rows.reduce((sum, row) => {
    const textLength = [row.item, row.description, row.pricingBasis].join(" ").length;
    return sum + 1 + Math.floor(Math.max(0, textLength - 90) / 120);
  }, 0);

  return 2 + rowWeight;
}

export function normalizeResidentialOptionImages(images = []) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const source = cleanResidentialText(
        image.dataUrl || image.src || image.imageSrc || image.publicUrl || image.signedUrl || image.storagePath,
      );
      const label = cleanResidentialText(image.label || image.name || (source ? `Option photo ${index + 1}` : ""));
      const caption = cleanResidentialText(image.caption || image.description || image.notes);
      const uploadRequired = Boolean(image.uploadRequired) && !source;

      if (!source && !label && !caption && !uploadRequired) {
        return null;
      }

      return {
        id:
          cleanResidentialText(image.id) ||
          `option-photo-${index + 1}-${normalizeResidentialKey(label || caption || source || "placeholder").slice(0, 24)}`,
        label,
        caption,
        fileName: cleanResidentialText(image.fileName || image.originalFileName || image.name),
        fileSize: toResidentialPricingNumber(image.fileSize),
        fileType: cleanResidentialText(image.fileType || image.type),
        cloudSynced: image.cloudSynced === true,
        dataUrl: cleanResidentialText(image.dataUrl),
        src: cleanResidentialText(image.src || image.imageSrc),
        imageSrc: cleanResidentialText(image.imageSrc || image.src),
        localOnly: image.localOnly === true,
        publicUrl: cleanResidentialText(image.publicUrl),
        signedUrl: cleanResidentialText(image.signedUrl),
        storagePath: cleanResidentialText(image.storagePath),
        uploadedAt: cleanResidentialText(image.uploadedAt),
        uploadedBy: cleanResidentialText(image.uploadedBy || image.uploadedByEmail || image.uploadedByUserId),
        uploadRequired,
      };
    })
    .filter(Boolean);
}

export function hasResidentialOptionImageSource(image = {}) {
  const source = cleanResidentialText(image.dataUrl || image.src || image.imageSrc || image.publicUrl || image.signedUrl || image.storagePath);

  return Boolean(
    source && !/^(upload|uploaded|placeholder|none|n\/a)\s*(image|photo|file)?$/i.test(source) && !/upload\s+(image|photo)/i.test(source),
  );
}

export function getPrintableResidentialOptionImages(images = []) {
  return normalizeResidentialOptionImages(images).filter(hasResidentialOptionImageSource);
}

export function countResidentialOptionImagePlaceholders(proposal = {}) {
  const options = getResidentialPricingOptions(proposal);
  const addOns = getResidentialOptionalAddOns(proposal);

  return [...options, ...addOns].reduce(
    (count, item) =>
      count +
      normalizeResidentialOptionImages(item.images).filter((image) => !hasResidentialOptionImageSource(image)).length,
    0,
  );
}

export function replaceResidentialItemImage(items = [], itemIndex, imageIndex, nextImage = {}) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, currentItemIndex) => {
    if (currentItemIndex !== itemIndex) {
      return item;
    }

    const images = normalizeResidentialOptionImages(item?.images);
    const normalizedImage = normalizeResidentialOptionImages([nextImage])[0];
    const nextImages = images.map((image, currentImageIndex) => (currentImageIndex === imageIndex ? normalizedImage : image)).filter(Boolean);

    return {
      ...item,
      images: nextImages,
    };
  });
}

export function removeResidentialItemImage(items = [], itemIndex, imageIndex) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, currentItemIndex) => {
    if (currentItemIndex !== itemIndex) {
      return item;
    }

    return {
      ...item,
      images: normalizeResidentialOptionImages(item?.images).filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
    };
  });
}

export function getResidentialComparisonAddOn(addOns = []) {
  const normalizedAddOns = Array.isArray(addOns) ? addOns : [];

  return (
    normalizedAddOns.find((addOn) => /cantilever/i.test(addOn?.name || addOn?.description || "")) ||
    normalizedAddOns.find((addOn) => toResidentialPricingNumber(addOn?.amount) > 0) ||
    null
  );
}

export function getResidentialPacketPageStructure(proposal = {}) {
  const layout = normalizeResidentialPdfLayout(proposal.residentialPdfLayout, proposal);
  const hasChooseOne = hasResidentialChooseOnePricing(proposal);
  const hasBasePlusAddOns = hasResidentialBasePlusAddOnsPricing(proposal);

  if (layout === RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT) {
    return ["cover_summary", "residential_simple_estimate", "residential_legal_papers", "residential_payment_terms"];
  }

  if (layout === RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT) {
    return [
      "cover_summary",
      hasChooseOne ? "residential_pricing_options" : "residential_simple_estimate",
      "residential_scope",
      "residential_legal_papers",
      "residential_payment_terms",
    ];
  }

  const pages = ["cover_summary"];

  if (hasChooseOne) {
    pages.push("residential_pricing_options");
  } else if (hasBasePlusAddOns) {
    pages.push("residential_simple_estimate");
  } else {
    pages.push("residential_scope");
  }

  if (hasResidentialOptionBreakdowns(proposal)) {
    pages.push("residential_option_breakdowns");
  }

  if (!pages.includes("residential_scope")) {
    pages.push("residential_scope");
  }

  pages.push("residential_legal_papers", "residential_payment_terms");

  return pages;
}

export function formatResidentialMoneyText(value, proposal = {}) {
  let text = String(value ?? "");

  if (!text.trim()) {
    return text;
  }

  getResidentialMoneyValues(proposal).forEach((amount) => {
    text = replaceResidentialAmountText(text, amount);
  });

  return text;
}

export function formatResidentialMoneyTextList(items = [], proposal = {}) {
  return Array.isArray(items) ? items.map((item) => formatResidentialMoneyText(item, proposal)) : [];
}

export function getResidentialMoneyValues(proposal = {}) {
  const options = getResidentialPricingOptions(proposal);
  const addOns = getResidentialOptionalAddOns(proposal);
  const values = [];

  options.forEach((option) => {
    const optionPrice = toResidentialPricingNumber(option.price);
    values.push(optionPrice, option.downPayment, option.finalPayment);

    addOns
      .filter((addOn) => doesResidentialAddOnApplyToOption(addOn, option))
      .forEach((addOn) => {
        const explicitTotalRow = getResidentialExplicitAddOnOptionTotalRow(addOn, option);
        const explicitTotal = toResidentialPricingNumber(explicitTotalRow?.total);
        const totalWithAddOn = explicitTotal > 0 ? explicitTotal : optionPrice + toResidentialPricingNumber(addOn.amount);
        values.push(totalWithAddOn, explicitTotalRow?.downPayment || totalWithAddOn / 2, explicitTotalRow?.finalPayment || totalWithAddOn / 2);
      });
  });

  addOns.forEach((addOn) => {
    values.push(addOn.amount);
  });

  return [...new Set(values.map(toResidentialPricingNumber).filter((amount) => amount > 0).map((amount) => Math.round(amount)))].sort(
    (a, b) => b - a,
  );
}

export function normalizeResidentialScheduleOfValues(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (typeof row === "string") {
        const item = cleanResidentialText(row);
        return item ? { item, description: "", pricingBasis: "", amount: 0 } : null;
      }

      if (!row || typeof row !== "object") {
        return null;
      }

      const amount = toResidentialPricingNumber(row.amount ?? row.price ?? row.total);
      const normalized = {
        id: cleanResidentialText(row.id),
        item: cleanResidentialText(row.item || row.name || row.label),
        description: cleanResidentialText(row.description || row.notes),
        pricingBasis: cleanResidentialText(row.pricingBasis || row.basis),
        amount,
      };

      return [normalized.id, normalized.item, normalized.description, normalized.pricingBasis].some(Boolean) || amount > 0 ? normalized : null;
    })
    .filter(Boolean);
}

export function normalizeResidentialOptionLineItems(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row, index) => {
      if (typeof row === "string") {
        const description = cleanResidentialText(row);

        return description ? { id: "", itemNumber: String(index + 1), description, quantity: 1, unit: "", unitPrice: 0, amount: 0 } : null;
      }

      if (!row || typeof row !== "object") {
        return null;
      }

      const quantity = toResidentialPricingNumber(row.quantity ?? row.qty ?? 1) || 1;
      const unitPrice = toResidentialPricingNumber(row.unitPrice ?? row.rate ?? row.price);
      const explicitAmount = toResidentialPricingNumber(row.amount ?? row.total);
      const amount = explicitAmount || unitPrice * quantity;
      const normalized = {
        id: cleanResidentialText(row.id),
        itemNumber: cleanResidentialText(row.itemNumber ?? row.itemNo ?? row.number ?? row.index ?? (index + 1)),
        description: cleanResidentialText(row.description || row.item || row.name || row.label),
        quantity,
        unit: cleanResidentialText(row.unit || row.uom),
        unitPrice,
        amount,
      };

      return [normalized.id, normalized.description, normalized.unit].some(Boolean) || amount > 0 ? normalized : null;
    })
    .filter(Boolean);
}

export function getResidentialOptionLineItemTotal(option = {}) {
  return normalizeResidentialOptionLineItems(option.lineItems).reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);
}

export function getResidentialOptionSovTotal(option = {}) {
  return normalizeResidentialScheduleOfValues(option.scheduleOfValues).reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);
}

export function getResidentialOptionTotalWarning(option = {}, tolerance = 1) {
  const optionPrice = toResidentialPricingNumber(option.price);
  const lineItemTotal = getResidentialOptionLineItemTotal(option);
  const sovTotal = getResidentialOptionSovTotal(option);

  if (optionPrice <= 0) {
    return "";
  }

  if (lineItemTotal > 0 && Math.abs(lineItemTotal - optionPrice) > tolerance) {
    return `Option line items total ${formatResidentialCurrency(lineItemTotal)} but option price is ${formatResidentialCurrency(optionPrice)}.`;
  }

  if (sovTotal > 0 && Math.abs(sovTotal - optionPrice) > tolerance) {
    return `Option SOV rows total ${formatResidentialCurrency(sovTotal)} but option price is ${formatResidentialCurrency(optionPrice)}.`;
  }

  return "";
}

export function normalizeResidentialPricingOptions(pricingOptions = []) {
  if (!Array.isArray(pricingOptions)) {
    return [];
  }

  const hasExplicitSelection = pricingOptions.some((option) => option?.included === true || option?.selected === true);

  return pricingOptions
    .map((option, index) => {
      if (!option || typeof option !== "object") {
        return null;
      }

      const lineItems = normalizeResidentialOptionLineItems(option.lineItems ?? option.items);
      const scheduleOfValues = normalizeResidentialScheduleOfValues(
        option.scheduleOfValues ?? option.sov ?? option.breakdown ?? option.optionBreakdown,
      );
      const calculatedTotal = lineItems.reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);
      const sovTotal = scheduleOfValues.reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);
      const price = toResidentialPricingNumber(option.price ?? option.amount ?? option.total) || calculatedTotal || sovTotal;
      const name = cleanResidentialText(option.name ?? option.label ?? option.description ?? `Option ${index + 1}`);
      const description = cleanResidentialText(option.description ?? option.notes);
      const images = normalizeResidentialOptionImages(option.images || option.optionPhotos || option.photos);
      const includedScope = normalizeResidentialTextList(option.includedScope ?? option.inclusions);
      const excludedScope = normalizeResidentialTextList(option.excludedScope ?? option.exclusions);
      const notes = normalizeResidentialTextList(option.optionNotes ?? option.notesList ?? option.notes);

      if (
        !name &&
        !description &&
        price <= 0 &&
        images.length === 0 &&
        includedScope.length === 0 &&
        excludedScope.length === 0 &&
        lineItems.length === 0 &&
        scheduleOfValues.length === 0
      ) {
        return null;
      }

      return {
        id: cleanResidentialText(option.id),
        name: name || `Option ${index + 1}`,
        description,
        finishType: cleanResidentialText(option.finishType ?? option.finish ?? option.finishOption),
        scopeSummary: cleanResidentialText(option.scopeSummary ?? option.summary),
        includedScope,
        excludedScope,
        lineItems,
        notes,
        price,
        downPayment: toResidentialPricingNumber(option.downPayment) || price / 2,
        finalPayment: toResidentialPricingNumber(option.finalPayment) || price / 2,
        included: Boolean(option.included === true || option.selected === true || (!hasExplicitSelection && index === 0)),
        selected: Boolean(option.selected === true || option.included === true || (!hasExplicitSelection && index === 0)),
        images,
        scheduleOfValues,
      };
    })
    .filter(Boolean);
}

export function normalizeResidentialOptionalAddOns(optionalAddOns = []) {
  if (!Array.isArray(optionalAddOns)) {
    return [];
  }

  return optionalAddOns
    .map((addOn) => {
      if (!addOn || typeof addOn !== "object") {
        return null;
      }

      const amount = toResidentialPricingNumber(addOn.amount ?? addOn.price ?? addOn.total);
      const name = cleanResidentialText(addOn.name ?? addOn.label ?? addOn.description ?? "Optional Add-On");
      const description = cleanResidentialText(addOn.description ?? addOn.notes);
      const images = normalizeResidentialOptionImages(addOn.images || addOn.optionPhotos || addOn.photos);
      const notes = normalizeResidentialTextList(addOn.addOnNotes ?? addOn.notesList ?? addOn.notes);

      if (!name && !description && amount <= 0 && images.length === 0 && notes.length === 0) {
        return null;
      }

      return {
        id: cleanResidentialText(addOn.id),
        name: name || "Optional Add-On",
        description,
        amount,
        appliesTo: normalizeResidentialTextList(addOn.appliesTo),
        optionAmounts: normalizeResidentialAddOnOptionAmounts(addOn.optionAmounts ?? addOn.optionPrices ?? addOn.pricesByOption),
        optionTotals: normalizeResidentialAddOnOptionTotals(addOn.optionTotals),
        notes,
        included: Boolean(addOn.included === true || addOn.selected === true),
        selected: Boolean(addOn.selected === true || addOn.included === true),
        selectedAmount: toResidentialPricingNumber(addOn.selectedAmount),
        images,
      };
    })
    .filter(Boolean);
}

export function normalizeResidentialAddOnOptionAmounts(optionAmounts = []) {
  const entries = Array.isArray(optionAmounts)
    ? optionAmounts
    : Object.entries(optionAmounts || {}).map(([optionName, amount]) => ({ optionName, amount }));

  return entries
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      return {
        optionId: cleanResidentialText(row.optionId ?? row.id),
        optionName: cleanResidentialText(row.optionName || row.name || row.label),
        amount: toResidentialPricingNumber(row.amount ?? row.price ?? row.addOnAmount ?? row.total),
      };
    })
    .filter((row) => (row.optionId || row.optionName) && row.amount > 0);
}

export function normalizeResidentialAddOnOptionTotals(optionTotals = []) {
  if (!Array.isArray(optionTotals)) {
    return [];
  }

  return optionTotals
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const total = toResidentialPricingNumber(row.total ?? row.price ?? row.amount);

      return {
        optionId: cleanResidentialText(row.optionId),
        optionName: cleanResidentialText(row.optionName || row.name || row.label),
        total,
        downPayment: toResidentialPricingNumber(row.downPayment) || (total > 0 ? total / 2 : 0),
        finalPayment: toResidentialPricingNumber(row.finalPayment) || (total > 0 ? total / 2 : 0),
      };
    })
    .filter((row) => row.optionId || row.optionName || row.total > 0);
}

export function doesResidentialAddOnApplyToOption(addOn = {}, option = {}) {
  const appliesTo = normalizeResidentialTextList(addOn.appliesTo);

  if (appliesTo.length === 0) {
    return true;
  }

  const optionKeys = [
    normalizeResidentialKey(option.id),
    normalizeResidentialKey(option.name),
    normalizeResidentialKey(option.finishType),
    normalizeResidentialKey(option.scopeSummary),
  ].filter(Boolean);

  return appliesTo.some((target) => {
    const targetKey = normalizeResidentialKey(target);

    return optionKeys.some((optionKey) => optionKey === targetKey || optionKey.includes(targetKey) || targetKey.includes(optionKey));
  });
}

export function getResidentialAddOnAmountForOption(addOn = {}, option = {}) {
  if (!doesResidentialAddOnApplyToOption(addOn, option)) {
    return 0;
  }

  const amountRow = getResidentialAddOnOptionAmountRow(addOn, option);

  if (amountRow) {
    return toResidentialPricingNumber(amountRow.amount);
  }

  const explicitTotalRow = getResidentialExplicitAddOnOptionTotalRow(addOn, option);
  const explicitTotal = toResidentialPricingNumber(explicitTotalRow?.total);
  const optionPrice = toResidentialPricingNumber(option.price ?? option.amount ?? option.total);

  if (explicitTotal > 0) {
    return explicitTotal > optionPrice && optionPrice > 0 ? explicitTotal - optionPrice : explicitTotal;
  }

  return toResidentialPricingNumber(addOn.amount ?? addOn.price ?? addOn.total);
}

export function getResidentialAddOnOptionAmountRow(addOn = {}, option = {}) {
  const optionAmounts = normalizeResidentialAddOnOptionAmounts(addOn.optionAmounts);
  const optionKeys = [normalizeResidentialKey(option.id), normalizeResidentialKey(option.name)].filter(Boolean);
  const match = optionAmounts.find((row) => {
    const rowKeys = [normalizeResidentialKey(row.optionId), normalizeResidentialKey(row.optionName)].filter(Boolean);

    return rowKeys.some((rowKey) => optionKeys.some((optionKey) => rowKey === optionKey || rowKey.includes(optionKey) || optionKey.includes(rowKey)));
  });

  return match || null;
}

export function getResidentialExplicitAddOnOptionTotal(addOn = {}, option = {}) {
  return toResidentialPricingNumber(getResidentialExplicitAddOnOptionTotalRow(addOn, option)?.total);
}

export function getResidentialExplicitAddOnOptionTotalRow(addOn = {}, option = {}) {
  const optionTotals = normalizeResidentialAddOnOptionTotals(addOn.optionTotals);
  const optionKeys = [normalizeResidentialKey(option.id), normalizeResidentialKey(option.name)].filter(Boolean);
  const match = optionTotals.find((row) => {
    const rowKeys = [normalizeResidentialKey(row.optionId), normalizeResidentialKey(row.optionName)].filter(Boolean);

    return rowKeys.some((rowKey) => optionKeys.some((optionKey) => rowKey === optionKey || rowKey.includes(optionKey) || optionKey.includes(rowKey)));
  });

  return match || null;
}

export function mergeResidentialOptionBreakdowns(pricingOptions = [], optionBreakdowns = []) {
  const options = normalizeResidentialPricingOptions(pricingOptions);
  const breakdownsByName = normalizeResidentialOptionBreakdownMap(optionBreakdowns);

  return options.map((option) => {
    if (option.scheduleOfValues.length > 0) {
      return option;
    }

    const key = normalizeResidentialKey(option.name);
    const exactRows = breakdownsByName.get(key);
    const fuzzyRows = exactRows || [...breakdownsByName.entries()].find(([breakdownKey]) => key.includes(breakdownKey) || breakdownKey.includes(key))?.[1];

    return fuzzyRows?.length > 0 ? { ...option, scheduleOfValues: fuzzyRows } : option;
  });
}

export function normalizeResidentialOptionBreakdownMap(optionBreakdowns = []) {
  const entries =
    Array.isArray(optionBreakdowns)
      ? optionBreakdowns
      : Object.entries(optionBreakdowns || {}).map(([name, rows]) => ({ name, rows }));
  const breakdownsByName = new Map();

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const name = cleanResidentialText(entry.name || entry.optionName || entry.label);
    const rows = normalizeResidentialScheduleOfValues(entry.scheduleOfValues ?? entry.rows ?? entry.breakdown);

    if (name && rows.length > 0) {
      breakdownsByName.set(normalizeResidentialKey(name), rows);
    }
  });

  return breakdownsByName;
}

export function getResidentialPricingOptions(proposal = {}) {
  return normalizeResidentialPricingOptions(proposal.pricingOptions || proposal.pricing?.pricingOptions || []);
}

export function getResidentialOptionalAddOns(proposal = {}) {
  const pricingSectionAddOns = (Array.isArray(proposal.pricingSections) ? proposal.pricingSections : [])
    .filter((section) => section?.optionalAddOn)
    .map((section) => ({
      id: section.id,
      name: section.label || section.name || "Optional Add-On",
      description: section.description || "",
      amount: section.amount,
      optionAmounts: section.optionAmounts,
      optionTotals: section.optionTotals,
      included: section.included,
      selected: section.included,
    }));
  const addOns = normalizeResidentialOptionalAddOns([
    ...(proposal.optionalAddOns || []),
    ...(proposal.pricing?.optionalAddOns || []),
    ...pricingSectionAddOns,
  ]);
  const seen = new Set();

  return addOns.filter((addOn) => {
    const key = `${normalizeResidentialKey(addOn.name)}-${addOn.amount}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function hasResidentialChooseOnePricing(proposal = {}) {
  const pricingMode = proposal.pricingMode || proposal.pricing?.pricingMode || "";
  return isResidentialChooseOnePricingMode(pricingMode) && getResidentialPricingOptions(proposal).length > 0;
}

export function hasResidentialBasePlusAddOnsPricing(proposal = {}) {
  const pricingMode = proposal.pricingMode || proposal.pricing?.pricingMode || "";
  return pricingMode === BASE_PLUS_ADDONS_PRICING_MODE;
}

export function isResidentialChooseOnePricingMode(pricingMode = "") {
  return [CHOOSE_ONE_PRICING_MODE, CHOOSE_ONE_WITH_ADDONS_PRICING_MODE].includes(cleanResidentialText(pricingMode));
}

export function normalizeResidentialPdfLayout(layout, proposal = {}) {
  const normalizedLayout = cleanResidentialText(layout || proposal.residentialPdfLayout || proposal.pdfLayout || "");
  const supportedLayouts = new Set(RESIDENTIAL_PDF_LAYOUT_OPTIONS.map((option) => option.value));

  if (supportedLayouts.has(normalizedLayout)) {
    return normalizedLayout;
  }

  if (hasResidentialBasePlusAddOnsPricing(proposal)) {
    return RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT;
  }

  if (hasResidentialChooseOnePricing(proposal)) {
    return RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT;
  }

  return RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT;
}

export function getResidentialSimpleEstimateBasePackage(proposal = {}) {
  const lineItems = Array.isArray(proposal.lineItems) ? proposal.lineItems : [];
  const normalizedLineItems = lineItems
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const quantity = toResidentialPricingNumber(item.quantity ?? item.qty ?? 1) || 1;
      const unitPrice = toResidentialPricingNumber(item.unitPrice ?? item.rate ?? item.price);
      const explicitAmount = toResidentialPricingNumber(item.amount ?? item.total);
      const amount = explicitAmount || unitPrice * quantity;
      const description = cleanResidentialText(item.description || item.name || item.label || item.item);

      return description || amount > 0
        ? {
            id: cleanResidentialText(item.id) || `base-package-line-${index + 1}`,
            name: description || "Base Package",
            description: cleanResidentialText(item.scopeSummary || item.notes || item.detail),
            quantity,
            unit: cleanResidentialText(item.unit || item.uom || "LS"),
            unitPrice: unitPrice || amount,
            amount,
          }
        : null;
    })
    .filter(Boolean);
  const lineItemTotal = normalizedLineItems.reduce((sum, item) => sum + toResidentialPricingNumber(item.amount), 0);

  if (normalizedLineItems.length > 0) {
    const firstItem = normalizedLineItems[0];

    return {
      name: firstItem.name || "Base Package",
      description: cleanResidentialText(proposal.project?.description || firstItem.description || normalizedLineItems.map((item) => item.name).join("; ")),
      quantity: normalizedLineItems.length === 1 ? firstItem.quantity || 1 : 1,
      unit: normalizedLineItems.length === 1 ? firstItem.unit || "LS" : "LS",
      price: normalizedLineItems.length === 1 ? firstItem.amount : lineItemTotal,
      total: lineItemTotal,
      lineItems: normalizedLineItems,
    };
  }

  const pricingBasePackage =
    proposal.basePackage && typeof proposal.basePackage === "object"
      ? proposal.basePackage
      : proposal.pricing?.basePackage && typeof proposal.pricing.basePackage === "object"
        ? proposal.pricing.basePackage
        : null;

  if (pricingBasePackage) {
    const price = toResidentialPricingNumber(pricingBasePackage.total ?? pricingBasePackage.price ?? pricingBasePackage.amount);
    const name = cleanResidentialText(pricingBasePackage.name || pricingBasePackage.label);
    const description = cleanResidentialText(pricingBasePackage.description || pricingBasePackage.scopeSummary || proposal.project?.description);

    if (name || description || price > 0) {
      return {
        name: name || "Base Package",
        description,
        quantity: toResidentialPricingNumber(pricingBasePackage.quantity) || 1,
        unit: cleanResidentialText(pricingBasePackage.unit || "LS"),
        price,
        total: price,
        lineItems: normalizeResidentialOptionLineItems(pricingBasePackage.lineItems),
      };
    }
  }

  const selectedOption = getResidentialPricingOptions(proposal).find((option) => option.selected || option.included) || getResidentialPricingOptions(proposal)[0];

  if (selectedOption) {
    const price = toResidentialPricingNumber(selectedOption.price);

    return {
      name: selectedOption.name || "Base Package",
      description: cleanResidentialText(selectedOption.scopeSummary || selectedOption.description || proposal.project?.description),
      quantity: 1,
      unit: "LS",
      price,
      total: price,
      lineItems: [],
    };
  }

  const baseBid = toResidentialPricingNumber(proposal.baseBid ?? proposal.pricing?.baseBid ?? proposal.financials?.baseBid);

  return {
    name: cleanResidentialText(proposal.project?.name || "Base Package"),
    description: cleanResidentialText(proposal.project?.description),
    quantity: 1,
    unit: "LS",
    price: baseBid,
    total: baseBid,
    lineItems: [],
  };
}

export function getResidentialSimpleEstimateAddOns(proposal = {}) {
  return getResidentialOptionalAddOns(proposal).map((addOn) => ({
    ...addOn,
    selected: Boolean(addOn.selected || addOn.included),
    included: Boolean(addOn.included || addOn.selected),
  }));
}

export function hasAppliedResidentialCustomerSelection(proposal = {}) {
  return APPLIED_CUSTOMER_SELECTION_STATUSES.has(cleanResidentialText(proposal.customerSelection?.status));
}

export function getAppliedResidentialCustomerSelectionSummary(proposal = {}) {
  const selection = proposal.customerSelection && typeof proposal.customerSelection === "object" ? proposal.customerSelection : {};
  const pricing = proposal.pricing && typeof proposal.pricing === "object" ? proposal.pricing : {};
  const status = cleanResidentialText(selection.status);

  if (!APPLIED_CUSTOMER_SELECTION_STATUSES.has(status)) {
    return {
      hasAppliedCustomerSelection: false,
      status,
      selectedAddOns: [],
      selectedAddOnAmounts: [],
    };
  }

  const pricingMode = cleanResidentialText(selection.selectedPricingMode || proposal.pricingMode || pricing.pricingMode);
  const selectedOptionId = cleanResidentialText(selection.selectedOptionId);
  const selectedOptionName = cleanResidentialText(selection.selectedOptionName);
  const options = getResidentialPricingOptions(proposal);
  const selectedOption =
    options.find((option) => {
      const optionKeys = [normalizeResidentialKey(option.id), normalizeResidentialKey(option.name)].filter(Boolean);
      const selectionKeys = [normalizeResidentialKey(selectedOptionId), normalizeResidentialKey(selectedOptionName)].filter(Boolean);

      return selectionKeys.some((selectionKey) => optionKeys.some((optionKey) => optionKey === selectionKey || optionKey.includes(selectionKey) || selectionKey.includes(optionKey)));
    }) ||
    options.find((option) => option.selected || option.included) ||
    null;
  const selectedAddOnIds = normalizeResidentialTextList(selection.selectedAddOnIds);
  const selectedAddOnNames = normalizeResidentialTextList(selection.selectedAddOnNames);
  const selectedAddOnAmounts = getAppliedResidentialAddOnAmounts(proposal, selection, selectedOption, selectedAddOnIds, selectedAddOnNames);
  const selectedAddOnsTotal = selectedAddOnAmounts.reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);
  const appliedTotal = toResidentialPricingNumber(selection.appliedProposalTotal || selection.selectedTotal || pricing.selectedTotal || pricing.totalProposal);
  const optionPrice = toResidentialPricingNumber(selectedOption?.price ?? selectedOption?.amount ?? selectedOption?.total);
  const fallbackBasePackage = getResidentialSimpleEstimateBasePackage({ ...proposal, pricingOptions: selectedOption ? [selectedOption] : proposal.pricingOptions });
  const basePrice =
    optionPrice > 0
      ? optionPrice
      : Math.max(0, toResidentialPricingNumber(fallbackBasePackage.total || fallbackBasePackage.price) || appliedTotal - selectedAddOnsTotal);
  const total = appliedTotal > 0 ? appliedTotal : basePrice + selectedAddOnsTotal;
  const basePackage = {
    ...fallbackBasePackage,
    name: selectedOptionName || selectedOption?.name || fallbackBasePackage.name || "Selected Base Option",
    description: cleanResidentialText(selectedOption?.description || selectedOption?.scopeSummary || fallbackBasePackage.description),
    price: basePrice,
    total: basePrice,
  };

  return {
    hasAppliedCustomerSelection: true,
    status,
    selectedPricingMode: pricingMode,
    selectedOptionId,
    selectedOptionName: basePackage.name,
    selectedAddOnIds,
    selectedAddOnNames,
    selectedAddOnAmounts,
    selectedAddOns: selectedAddOnAmounts,
    basePackage,
    basePrice,
    selectedAddOnsTotal,
    total,
    downPayment: toResidentialPricingNumber(selection.appliedDownPayment || selection.selectedDownPayment || pricing.selectedDownPayment) || total / 2,
    finalPayment: toResidentialPricingNumber(selection.appliedFinalPayment || selection.selectedFinalPayment || pricing.selectedFinalPayment) || total / 2,
  };
}

function getAppliedResidentialAddOnAmounts(proposal = {}, selection = {}, selectedOption = null, selectedAddOnIds = [], selectedAddOnNames = []) {
  const explicitRows = normalizeAppliedResidentialAddOnAmounts(selection.selectedAddOnAmounts);

  if (explicitRows.length > 0) {
    return explicitRows;
  }

  const selectedIdKeys = new Set(selectedAddOnIds.map(normalizeResidentialKey).filter(Boolean));
  const selectedNameKeys = new Set(selectedAddOnNames.map(normalizeResidentialKey).filter(Boolean));

  return getResidentialSimpleEstimateAddOns(proposal)
    .filter((addOn) => {
      const keys = [normalizeResidentialKey(addOn.id), normalizeResidentialKey(addOn.name)].filter(Boolean);

      return addOn.selected || addOn.included || keys.some((key) => selectedIdKeys.has(key) || selectedNameKeys.has(key));
    })
    .map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      amount: toResidentialPricingNumber(addOn.selectedAmount) || (selectedOption ? getResidentialAddOnAmountForOption(addOn, selectedOption) : toResidentialPricingNumber(addOn.amount)),
    }))
    .filter((row) => row.name || row.amount > 0);
}

export function calculateResidentialSimpleEstimateTotals(proposal = {}) {
  const appliedSelection = getAppliedResidentialCustomerSelectionSummary(proposal);

  if (appliedSelection.hasAppliedCustomerSelection) {
    return {
      ...appliedSelection,
      addOns: getResidentialSimpleEstimateAddOns(proposal),
      selectedAddOns: appliedSelection.selectedAddOns,
      hasPendingCustomerSelection: false,
    };
  }

  const basePackage = getResidentialSimpleEstimateBasePackage(proposal);
  const addOns = getResidentialSimpleEstimateAddOns(proposal);
  const pricingMode = proposal.pricingMode || proposal.pricing?.pricingMode || "";
  const selectedOption = isResidentialChooseOnePricingMode(pricingMode)
    ? getResidentialPricingOptions(proposal).find((option) => option.selected || option.included) || getResidentialPricingOptions(proposal)[0] || null
    : null;
  const basePrice = toResidentialPricingNumber(basePackage.total || basePackage.price);
  const selectedAddOnsTotal = addOns
    .filter((addOn) => addOn.selected || addOn.included)
    .reduce((sum, addOn) => sum + (selectedOption ? getResidentialAddOnAmountForOption(addOn, selectedOption) : toResidentialPricingNumber(addOn.amount)), 0);
  const total = basePrice + selectedAddOnsTotal;

  return {
    basePackage,
    addOns,
    basePrice,
    selectedAddOnsTotal,
    total,
    downPayment: total / 2,
    finalPayment: total / 2,
    hasAppliedCustomerSelection: false,
    hasPendingCustomerSelection: ["submitted", "reviewed"].includes(cleanResidentialText(proposal.customerSelection?.status)),
    customerSelectionStatus: cleanResidentialText(proposal.customerSelection?.status),
    selectedAddOns: addOns.filter((addOn) => addOn.selected || addOn.included),
  };
}

function normalizeAppliedResidentialAddOnAmounts(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const amount = toResidentialPricingNumber(row.amount ?? row.price ?? row.total);
      const name = cleanResidentialText(row.name || row.label || `Selected Add-On ${index + 1}`);

      return name || amount > 0
        ? {
            id: cleanResidentialText(row.id),
            name: name || `Selected Add-On ${index + 1}`,
            amount,
          }
        : null;
    })
    .filter(Boolean);
}

export function buildResidentialOptionBreakdowns(proposal = {}) {
  return getResidentialPricingOptions(proposal)
    .map((option) => {
      const explicitRows = normalizeResidentialScheduleOfValues(option.scheduleOfValues);
      const lineItemRows = normalizeResidentialOptionLineItems(option.lineItems)
        .filter((row) => row.description || toResidentialPricingNumber(row.amount) > 0)
        .map((row) => ({
          id: row.id,
          item: row.description,
          description: [row.quantity ? `${row.quantity} ${row.unit || ""}`.trim() : "", row.unitPrice ? `${formatResidentialCurrency(row.unitPrice)} each` : ""]
            .filter(Boolean)
            .join(" | "),
          pricingBasis: row.unit || "",
          amount: row.amount,
        }));
      const rows = (explicitRows.length > 0 ? explicitRows : normalizeResidentialScheduleOfValues(lineItemRows)).filter(
        (row) => row.item || row.description || row.pricingBasis || toResidentialPricingNumber(row.amount) > 0,
      );
      const rowsTotal = rows.reduce((sum, row) => sum + toResidentialPricingNumber(row.amount), 0);

      return {
        ...option,
        scheduleOfValues: rows,
        rowsTotal,
        totalMatchesOption: Math.abs(rowsTotal - toResidentialPricingNumber(option.price)) <= 1,
      };
    })
    .filter((option) => option.scheduleOfValues.length > 0);
}

export function hasResidentialOptionBreakdowns(proposal = {}) {
  return buildResidentialOptionBreakdowns(proposal).length > 0;
}

export function getResidentialCoverSchedule(proposal = {}, fallback = "") {
  return hasResidentialChooseOnePricing(proposal) ? RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE : fallback;
}

export function getResidentialCoverDescription(proposal = {}, fallback = "") {
  return hasResidentialChooseOnePricing(proposal) ? RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION : fallback;
}

function cleanResidentialText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function replaceResidentialAmountText(value, amount) {
  const roundedAmount = Math.round(toResidentialPricingNumber(amount));
  const formattedAmount = formatResidentialCurrency(roundedAmount);
  const plainAmount = String(roundedAmount);
  const commaAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
  const variants = [plainAmount, `${plainAmount}.00`, commaAmount, `${commaAmount}.00`];

  return variants.reduce((text, variant) => {
    const pattern = new RegExp(`(^|[^\\w$])${escapeRegex(variant)}(?![\\w])`, "g");
    return text.replace(pattern, (_match, prefix) => `${prefix}${formattedAmount}`);
  }, value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeResidentialKey(value) {
  return cleanResidentialText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
