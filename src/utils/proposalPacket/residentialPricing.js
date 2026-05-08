export const CHOOSE_ONE_PRICING_MODE = "choose_one_option";

export const RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE = "Estimated duration: 10 working days.";

export const RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION =
  "Residential concrete package including walkway, landings, steps, curbs, side walls, wall footings, rebar reinforcement, selected finish, and cleanup.";

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

export function buildResidentialPaymentTermsCopy(proposal = {}) {
  if (hasResidentialChooseOnePricing(proposal)) {
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
  const comparisonAddOn = getResidentialComparisonAddOn(addOns);

  return options.map((option) => {
    const basePrice = toResidentialPricingNumber(option.price);
    const addOnAmount = comparisonAddOn ? toResidentialPricingNumber(comparisonAddOn.amount) : 0;
    const withAddOnTotal = addOnAmount > 0 ? basePrice + addOnAmount : 0;

    return {
      id: option.id,
      name: option.name,
      description: option.description,
      basePrice,
      downPayment: toResidentialPricingNumber(option.downPayment) || basePrice / 2,
      finalPayment: toResidentialPricingNumber(option.finalPayment) || basePrice / 2,
      comparisonAddOn,
      images: normalizeResidentialOptionImages(option.images),
      withAddOnTotal,
      withAddOnDownPayment: withAddOnTotal > 0 ? withAddOnTotal / 2 : 0,
      withAddOnFinalPayment: withAddOnTotal > 0 ? withAddOnTotal / 2 : 0,
    };
  });
}

export function buildResidentialPricingOptionPrintPages(proposal = {}, optionsPerPage = 2) {
  if (!hasResidentialChooseOnePricing(proposal)) {
    return [];
  }

  const optionRows = buildResidentialPricingOptionRows(proposal);
  const addOns = getResidentialOptionalAddOns(proposal);
  const hasPrintableOptionPhotos = [...optionRows, ...addOns].some((item) => getPrintableResidentialOptionImages(item.images).length > 0);
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
      const uploadRequired = Boolean(image.uploadRequired);

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
        dataUrl: cleanResidentialText(image.dataUrl),
        src: cleanResidentialText(image.src || image.imageSrc),
        imageSrc: cleanResidentialText(image.imageSrc || image.src),
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
  if (!hasResidentialChooseOnePricing(proposal)) {
    return ["cover_summary", "details_pricing"];
  }

  const pages = ["cover_summary", "residential_pricing_options"];

  if (hasResidentialOptionBreakdowns(proposal)) {
    pages.push("residential_option_breakdowns");
  }

  pages.push("residential_scope", "residential_payment_terms");

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
  const addOnTotal = addOns.reduce((sum, addOn) => sum + toResidentialPricingNumber(addOn.amount), 0);
  const values = [];

  options.forEach((option) => {
    const optionPrice = toResidentialPricingNumber(option.price);
    values.push(optionPrice, option.downPayment, option.finalPayment);

    if (addOnTotal > 0) {
      const totalWithAddOns = optionPrice + addOnTotal;
      values.push(totalWithAddOns, totalWithAddOns / 2);
    }
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

      return [normalized.item, normalized.description, normalized.pricingBasis].some(Boolean) || amount > 0 ? normalized : null;
    })
    .filter(Boolean);
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

      const price = toResidentialPricingNumber(option.price ?? option.amount ?? option.total);
      const name = cleanResidentialText(option.name ?? option.label ?? option.description ?? `Option ${index + 1}`);

      if (!name || price <= 0) {
        return null;
      }

      return {
        id: cleanResidentialText(option.id),
        name,
        description: cleanResidentialText(option.description ?? option.notes),
        price,
        downPayment: toResidentialPricingNumber(option.downPayment) || price / 2,
        finalPayment: toResidentialPricingNumber(option.finalPayment) || price / 2,
        included: Boolean(option.included === true || option.selected === true || (!hasExplicitSelection && index === 0)),
        selected: Boolean(option.selected === true || option.included === true || (!hasExplicitSelection && index === 0)),
        images: normalizeResidentialOptionImages(option.images || option.optionPhotos || option.photos),
        scheduleOfValues: normalizeResidentialScheduleOfValues(
          option.scheduleOfValues ?? option.sov ?? option.breakdown ?? option.optionBreakdown,
        ),
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

      if (!name || amount <= 0) {
        return null;
      }

      return {
        id: cleanResidentialText(addOn.id),
        name,
        description: cleanResidentialText(addOn.description ?? addOn.notes),
        amount,
        appliesTo: Array.isArray(addOn.appliesTo) ? addOn.appliesTo.map(cleanResidentialText).filter(Boolean) : [],
        included: Boolean(addOn.included === true || addOn.selected === true),
        selected: Boolean(addOn.selected === true || addOn.included === true),
        images: normalizeResidentialOptionImages(addOn.images || addOn.optionPhotos || addOn.photos),
      };
    })
    .filter(Boolean);
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
  return pricingMode === CHOOSE_ONE_PRICING_MODE && getResidentialPricingOptions(proposal).length > 0;
}

export function buildResidentialOptionBreakdowns(proposal = {}) {
  return getResidentialPricingOptions(proposal)
    .map((option) => {
      const rows = normalizeResidentialScheduleOfValues(option.scheduleOfValues);
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
