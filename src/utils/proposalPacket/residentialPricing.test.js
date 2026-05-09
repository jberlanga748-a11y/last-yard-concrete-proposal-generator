import assert from "node:assert/strict";
import test from "node:test";

import {
  BASE_PLUS_ADDONS_PRICING_MODE,
  CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
  RESIDENTIAL_DETAILED_BACKUP_LAYOUT,
  RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT,
  RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT,
  RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION,
  RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE,
  calculateResidentialSimpleEstimateTotals,
  buildResidentialPaymentTermsCopy,
  buildResidentialOptionBreakdowns,
  buildResidentialOptionBreakdownPrintPages,
  buildResidentialOptionalAddOnPrintPages,
  buildResidentialPricingOptionPrintPages,
  buildResidentialPricingOptionRows,
  countResidentialOptionImagePlaceholders,
  formatResidentialCurrency,
  formatResidentialMoneyText,
  getAppliedResidentialCustomerSelectionSummary,
  getResidentialAddOnAmountForOption,
  getPrintableResidentialOptionImages,
  getResidentialOptionLineItemTotal,
  getResidentialOptionTotalWarning,
  getResidentialCoverDescription,
  getResidentialCoverSchedule,
  getResidentialOptionalAddOns,
  getResidentialPacketPageStructure,
  getResidentialPricingOptions,
  hasResidentialBasePlusAddOnsPricing,
  hasResidentialChooseOnePricing,
  normalizeResidentialOptionImages,
  normalizeResidentialPdfLayout,
  normalizeResidentialPricingOptions,
  normalizeResidentialOptionalAddOns,
  normalizeResidentialOptionLineItems,
  removeResidentialItemImage,
  replaceResidentialItemImage,
  splitResidentialOptionalAddOnsForPrint,
} from "./residentialPricing.js";

const residentialProposal = {
  pricingMode: "choose_one_option",
  pricingOptions: [
    {
      name: "Option 1 - Full Scope With Broom Finish",
      price: 82500,
      downPayment: 41250,
      finalPayment: 41250,
      included: true,
      scheduleOfValues: [
        { item: "10 Day Crew Labor", amount: 56000 },
        { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
        { item: "Dirt and Gravel Area Prep", amount: 7500 },
        { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
        { item: "Broom Finish / Detailing / Cleanup", amount: 4000 },
      ],
      images: [
        {
          label: "Broom finish example",
          caption: "Upload broom finish example photo after Smart Paste.",
          uploadRequired: true,
        },
      ],
    },
    {
      name: "Option 2 - Full Scope With Stamped Finish",
      price: 97500,
      downPayment: 48750,
      finalPayment: 48750,
      included: false,
      scheduleOfValues: [
        { item: "10 Day Crew Labor", amount: 56000 },
        { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
        { item: "Dirt and Gravel Area Prep", amount: 7500 },
        { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
        { item: "Stamped Finish Labor / Pattern Work / Cleanup", amount: 19000 },
      ],
      images: [
        {
          label: "Stamped finish example",
          caption: "Stamped finish sample",
          src: "data:image/png;base64,stamped",
          fileName: "stamped.png",
          fileSize: 1200,
        },
      ],
    },
    {
      name: "Option 3 - Full Scope With Sand Finish",
      price: 90000,
      downPayment: 45000,
      finalPayment: 45000,
      included: false,
      scheduleOfValues: [
        { item: "10 Day Crew Labor", amount: 56000 },
        { item: "Concrete Demo / Removal / Haul-Off", amount: 5500 },
        { item: "Dirt and Gravel Area Prep", amount: 7500 },
        { item: "Concrete / Rebar / Forms / Wall Footing Materials", amount: 9500 },
        { item: "Sand Finish Labor / Detailing / Cleanup", amount: 11500 },
      ],
    },
  ],
  optionalAddOns: [
    {
      name: "Cantilever-Style Stair Upgrade",
      amount: 8500,
      description: "Optional upgrade to selected option.",
      appliesTo: ["Option 1", "Option 2", "Option 3"],
      images: [
        {
          label: "Cantilever stair example",
          caption: "Upload cantilever stair example photo after Smart Paste.",
          uploadRequired: true,
        },
      ],
    },
  ],
};

test("formats residential choose-one money without raw numeric output", () => {
  assert.equal(formatResidentialCurrency(82500), "$82,500");
  assert.equal(formatResidentialCurrency("97500"), "$97,500");
  assert.equal(formatResidentialCurrency(8500, { plus: true }), "+$8,500");
});

test("normalizes all residential pricing options and keeps JSON amounts numeric", () => {
  const options = normalizeResidentialPricingOptions(residentialProposal.pricingOptions);

  assert.equal(options.length, 3);
  assert.equal(options[0].price, 82500);
  assert.equal(options[1].price, 97500);
  assert.equal(options[2].price, 90000);
  assert.equal(typeof options[1].price, "number");
  assert.equal(options[1].included, false);
  assert.equal(options[2].included, false);
  assert.equal(options[0].scheduleOfValues.length, 5);
  assert.equal(options[0].images[0].label, "Broom finish example");
  assert.equal(options[0].images[0].uploadRequired, true);
  assert.equal(options[1].images[0].src, "data:image/png;base64,stamped");
});

test("residential pricing options are generic and preserve manual-builder fields", () => {
  const options = normalizeResidentialPricingOptions([
    {
      name: "Option 1 - Broom with walls",
      finishType: "Broom",
      scopeSummary: "Walkway, steps, walls, and curb.",
      includedScope: ["Side walls", "Curb included"],
      excludedScope: "Sealer\nDecorative border",
      lineItems: [
        { description: "Site preparation", quantity: 1, unit: "LS", unitPrice: 5000, amount: 5000 },
        { description: "Concrete placement and finish", quantity: 1, unit: "LS", amount: 77500 },
      ],
      notes: ["Customer-friendly option note"],
    },
    {
      name: "Option 2 - Stamped without walls",
      price: 97000,
      finishType: "Stamped",
    },
    {
      name: "Option 3 - Sand finish",
      price: 90000,
      finishType: "Sand",
    },
    {
      name: "Option 4 - Broom without curb",
      price: 79000,
      finishType: "Broom",
    },
  ]);

  assert.equal(options.length, 4);
  assert.equal(options[0].price, 82500);
  assert.equal(options[0].finishType, "Broom");
  assert.deepEqual(options[0].includedScope, ["Side walls", "Curb included"]);
  assert.deepEqual(options[0].excludedScope, ["Sealer", "Decorative border"]);
  assert.equal(options[0].lineItems.length, 2);
  assert.equal(getResidentialOptionLineItemTotal(options[0]), 82500);
  assert.equal(options[3].name, "Option 4 - Broom without curb");
});

test("option line item total warning is helpful and non-blocking", () => {
  const option = normalizeResidentialPricingOptions([
    {
      name: "Option with manual override",
      price: 90000,
      lineItems: [
        { description: "Site preparation", amount: 5000 },
        { description: "Concrete placement", amount: 80000 },
      ],
    },
  ])[0];

  assert.equal(normalizeResidentialOptionLineItems(option.lineItems).length, 2);
  assert.equal(getResidentialOptionLineItemTotal(option), 85000);
  assert.match(getResidentialOptionTotalWarning(option), /\$85,000.*\$90,000/);
});

test("preserves optional add-on image placeholders from Smart Paste JSON", () => {
  const addOns = normalizeResidentialOptionalAddOns(residentialProposal.optionalAddOns);

  assert.equal(addOns.length, 1);
  assert.equal(addOns[0].images.length, 1);
  assert.equal(addOns[0].images[0].label, "Cantilever stair example");
  assert.equal(addOns[0].images[0].uploadRequired, true);
});

test("residential option image metadata preserves cloud and local portability flags", () => {
  const images = normalizeResidentialOptionImages([
    {
      publicUrl: "https://cdn.example/option.jpg",
      storagePath: "company/demo/proposals/option-photos/option.jpg",
      cloudSynced: true,
      localOnly: false,
      uploadedBy: "user@example.com",
    },
    {
      dataUrl: "data:image/jpeg;base64,abc123",
      localOnly: true,
      cloudSynced: false,
    },
  ]);

  assert.equal(images[0].cloudSynced, true);
  assert.equal(images[0].storagePath, "company/demo/proposals/option-photos/option.jpg");
  assert.equal(images[0].uploadedBy, "user@example.com");
  assert.equal(images[1].localOnly, true);
  assert.equal(images[1].dataUrl, "data:image/jpeg;base64,abc123");
});

test("generic optional add-ons apply to selected options without becoming main choices", () => {
  const proposal = {
    pricingMode: "choose_one_option",
    pricingOptions: [
      { name: "Option 1 - Broom with walls", price: 82500 },
      { name: "Option 2 - Stamped with walls", price: 97500 },
      { name: "Option 3 - Sand without cantilever", price: 90000 },
      { name: "Option 4 - Broom without walls", price: 72000 },
    ],
    optionalAddOns: [
      { name: "Sealer", amount: 1200, appliesTo: ["Option 1", "Option 4"] },
      { name: "Extra curb", amount: 3400, appliesTo: ["Option 2"] },
    ],
  };
  const rows = buildResidentialPricingOptionRows(proposal);

  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((row) => row.addOnComparisons.map((comparison) => comparison.addOn.name)),
    [["Sealer"], ["Extra curb"], [], ["Sealer"]],
  );
  assert.equal(rows[0].addOnComparisons[0].total, 83700);
  assert.equal(rows[1].addOnComparisons[0].total, 100900);
});

test("option-specific residential add-on amounts calculate customer-choice totals", () => {
  const proposal = {
    pricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000, finishType: "Broom" },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000, finishType: "Exposed" },
      { id: "proposal-3", name: "Proposal 3 - Stamped Finish Package", price: 60000, finishType: "Stamped" },
    ],
    optionalAddOns: [
      {
        id: "walls",
        name: "Walls",
        optionAmounts: [
          { optionId: "proposal-1", amount: 10000 },
          { optionId: "proposal-2", amount: 15000 },
          { optionId: "proposal-3", amount: 20000 },
        ],
      },
      { id: "lighting", name: "Lighting", amount: 7000 },
      {
        id: "cantilever",
        name: "Cantilever-Style Stair Upgrade",
        optionAmounts: {
          "Proposal 1 - Broom Finish Package": 10000,
          "Proposal 2 - Exposed Finish Package": 15000,
          "Proposal 3 - Stamped Finish Package": 20000,
        },
      },
    ],
  };
  const options = getResidentialPricingOptions(proposal);
  const addOns = getResidentialOptionalAddOns(proposal);
  const [broom, exposed, stamped] = options;
  const [walls, lighting, cantilever] = addOns;

  assert.equal(hasResidentialChooseOnePricing(proposal), true);
  assert.equal(getResidentialAddOnAmountForOption(lighting, broom), 7000);
  assert.equal(getResidentialAddOnAmountForOption(lighting, exposed), 7000);
  assert.equal(getResidentialAddOnAmountForOption(lighting, stamped), 7000);
  assert.equal(getResidentialAddOnAmountForOption(walls, broom), 10000);
  assert.equal(getResidentialAddOnAmountForOption(walls, exposed), 15000);
  assert.equal(getResidentialAddOnAmountForOption(walls, stamped), 20000);
  assert.equal(getResidentialAddOnAmountForOption(cantilever, broom), 10000);
  assert.equal(getResidentialAddOnAmountForOption(cantilever, exposed), 15000);
  assert.equal(getResidentialAddOnAmountForOption(cantilever, stamped), 20000);
  assert.equal(broom.price + getResidentialAddOnAmountForOption(walls, broom), 50000);
  assert.equal(broom.price + getResidentialAddOnAmountForOption(lighting, broom), 47000);
  assert.equal(broom.price + getResidentialAddOnAmountForOption(cantilever, broom), 50000);
  assert.equal(broom.price + addOns.reduce((sum, addOn) => sum + getResidentialAddOnAmountForOption(addOn, broom), 0), 67000);
  assert.equal(exposed.price + addOns.reduce((sum, addOn) => sum + getResidentialAddOnAmountForOption(addOn, exposed), 0), 87000);
  assert.equal(stamped.price + addOns.reduce((sum, addOn) => sum + getResidentialAddOnAmountForOption(addOn, stamped), 0), 107000);
});

test("prints uploaded option images but hides placeholder-only images", () => {
  const options = normalizeResidentialPricingOptions(residentialProposal.pricingOptions);

  assert.equal(getPrintableResidentialOptionImages(options[0].images).length, 0);
  assert.equal(getPrintableResidentialOptionImages(options[1].images).length, 1);
  assert.equal(getPrintableResidentialOptionImages([{ label: "Upload", src: "UPLOAD IMAGE" }]).length, 0);
  assert.equal(getPrintableResidentialOptionImages([{ label: "Missing source", caption: "No uploaded image yet" }]).length, 0);
  assert.equal(countResidentialOptionImagePlaceholders(residentialProposal), 2);
});

test("keeps multiple uploaded option images printable under the selected option", () => {
  const options = normalizeResidentialPricingOptions([
    {
      name: "Option 1",
      price: 82500,
      images: [
        { label: "Broom finish one", caption: "Broom finish photo 1", src: "data:image/png;base64,one" },
        { label: "Broom finish two", caption: "Broom finish photo 2", publicUrl: "https://example.test/broom-two.jpg" },
        { label: "Broom upload reminder", caption: "Upload broom photo", uploadRequired: true },
      ],
    },
    {
      name: "Option 2",
      price: 97500,
      images: [{ label: "Stamped upload reminder", caption: "Upload stamped photo", uploadRequired: true }],
    },
  ]);

  assert.equal(getPrintableResidentialOptionImages(options[0].images).length, 2);
  assert.equal(getPrintableResidentialOptionImages(options[1].images).length, 0);
  assert.deepEqual(
    getPrintableResidentialOptionImages(options[0].images).map((image) => image.caption),
    ["Broom finish photo 1", "Broom finish photo 2"],
  );
});

test("caption edits replace only the targeted residential option image", () => {
  const options = normalizeResidentialPricingOptions([
    {
      name: "Option 1",
      price: 82500,
      images: [
        { label: "Broom one", caption: "Old broom caption", src: "data:image/png;base64,one" },
        { label: "Broom two", caption: "Second broom caption", src: "data:image/png;base64,two" },
      ],
    },
    {
      name: "Option 2",
      price: 97500,
      images: [{ label: "Stamped", caption: "Stamped caption", src: "data:image/png;base64,stamped" }],
    },
  ]);

  const nextOptions = replaceResidentialItemImage(options, 0, 1, {
    ...options[0].images[1],
    caption: "Updated second broom caption",
  });

  assert.equal(nextOptions[0].images[0].caption, "Old broom caption");
  assert.equal(nextOptions[0].images[1].caption, "Updated second broom caption");
  assert.equal(nextOptions[1].images[0].caption, "Stamped caption");
});

test("removing residential images only affects the selected option or add-on", () => {
  const options = normalizeResidentialPricingOptions([
    {
      name: "Option 1",
      price: 100,
      images: [{ label: "Option 1 image", src: "data:image/png;base64,one" }],
    },
    {
      name: "Option 2",
      price: 200,
      images: [{ label: "Option 2 image", src: "data:image/png;base64,two" }],
    },
  ]);
  const nextOptions = removeResidentialItemImage(options, 0, 0);

  assert.equal(nextOptions[0].images.length, 0);
  assert.equal(nextOptions[1].images.length, 1);
  assert.equal(nextOptions[1].images[0].label, "Option 2 image");
});

test("builds option-specific SOV breakdowns for every main option", () => {
  const breakdowns = buildResidentialOptionBreakdowns(residentialProposal);

  assert.equal(breakdowns.length, 3);
  assert.deepEqual(
    breakdowns.map((option) => option.rowsTotal),
    [82500, 97500, 90000],
  );
  assert.ok(breakdowns.every((option) => option.totalMatchesOption));
  assert.match(JSON.stringify(breakdowns), /Stamped Finish Labor/);
  assert.match(JSON.stringify(breakdowns), /Sand Finish Labor/);
});

test("residential option SOV print pagination keeps three standard five-row options on one page", () => {
  const pages = buildResidentialOptionBreakdownPrintPages(residentialProposal);

  assert.equal(pages.length, 1);
  assert.equal(pages[0].title, "Schedule of Values - Pricing Options");
  assert.deepEqual(
    pages[0].options.map((option) => option.name),
    [
      "Option 1 - Full Scope With Broom Finish",
      "Option 2 - Full Scope With Stamped Finish",
      "Option 3 - Full Scope With Sand Finish",
    ],
  );
  assert.deepEqual(
    pages[0].options.map((option) => formatResidentialCurrency(option.rowsTotal)),
    ["$82,500", "$97,500", "$90,000"],
  );
});

test("residential option SOV print pagination splits longer option data when needed", () => {
  const longRows = Array.from({ length: 8 }, (_, index) => ({
    item: `Detailed scope row ${index + 1}`,
    description: "Long residential option breakdown description with enough detail to require clean pagination instead of page clipping.",
    amount: 1000,
  }));
  const longProposal = {
    ...residentialProposal,
    pricingOptions: residentialProposal.pricingOptions.map((option, index) => ({
      ...option,
      price: 8000,
      scheduleOfValues: longRows.map((row) => ({ ...row, amount: 1000 + index })),
    })),
  };
  const pages = buildResidentialOptionBreakdownPrintPages(longProposal);

  assert.ok(pages.length > 1);
  assert.ok(pages.every((page) => page.options.length > 0));
});

test("keeps optional add-ons separate from mutually exclusive options", () => {
  assert.equal(hasResidentialChooseOnePricing(residentialProposal), true);

  const options = getResidentialPricingOptions(residentialProposal);
  const addOns = getResidentialOptionalAddOns(residentialProposal);

  assert.equal(options.length, 3);
  assert.equal(addOns.length, 1);
  assert.equal(addOns[0].name, "Cantilever-Style Stair Upgrade");
  assert.doesNotMatch(addOns.map((addOn) => addOn.name).join("\n"), /Option 2|Option 3/);
  assert.deepEqual(addOns[0].appliesTo, ["Option 1", "Option 2", "Option 3"]);
});

test("residential pricing rows show base and with-cantilever totals for every option", () => {
  const rows = buildResidentialPricingOptionRows(residentialProposal);

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.basePrice),
    [82500, 97500, 90000],
  );
  assert.deepEqual(
    rows.map((row) => row.withAddOnTotal),
    [91000, 106000, 98500],
  );
  assert.deepEqual(
    rows.map((row) => row.withAddOnDownPayment),
    [45500, 53000, 49250],
  );
  assert.deepEqual(
    rows.map((row) => row.withAddOnFinalPayment),
    [45500, 53000, 49250],
  );
  assert.ok(rows.every((row) => row.addOnComparisons[0].addOn.name === "Cantilever-Style Stair Upgrade"));
});

test("residential pricing option print pages keep option cards complete", () => {
  const pages = buildResidentialPricingOptionPrintPages(residentialProposal);

  assert.equal(pages.length, 3);
  assert.deepEqual(
    pages.map((page) => page.options.map((option) => option.name)),
    [
      ["Option 1 - Full Scope With Broom Finish"],
      ["Option 2 - Full Scope With Stamped Finish"],
      ["Option 3 - Full Scope With Sand Finish"],
    ],
  );
  assert.equal(pages[0].showAddOns, false);
  assert.equal(pages[1].showAddOns, false);
  assert.equal(pages[2].showAddOns, true);
});

test("residential pricing options can share print pages when no photos are uploaded", () => {
  const proposalWithoutPhotos = {
    ...residentialProposal,
    pricingOptions: residentialProposal.pricingOptions.map((option) => ({
      ...option,
      images: [],
    })),
    optionalAddOns: residentialProposal.optionalAddOns.map((addOn) => ({
      ...addOn,
      images: [],
    })),
  };
  const pages = buildResidentialPricingOptionPrintPages(proposalWithoutPhotos);

  assert.equal(pages.length, 2);
  assert.deepEqual(
    pages.map((page) => page.options.map((option) => option.name)),
    [
      ["Option 1 - Full Scope With Broom Finish", "Option 2 - Full Scope With Stamped Finish"],
      ["Option 3 - Full Scope With Sand Finish"],
    ],
  );
});

test("residential optional add-ons with uploaded photos get dedicated print pages", () => {
  const proposalWithAddOnPhoto = {
    ...residentialProposal,
    optionalAddOns: [
      {
        ...residentialProposal.optionalAddOns[0],
        images: [
          {
            label: "Cantilever stair example",
            caption: "Cantilever stair photo",
            src: "data:image/png;base64,cantilever",
          },
        ],
      },
    ],
  };
  const splitAddOns = splitResidentialOptionalAddOnsForPrint(proposalWithAddOnPhoto);
  const pages = buildResidentialOptionalAddOnPrintPages(proposalWithAddOnPhoto);

  assert.equal(splitAddOns.withPhotos.length, 1);
  assert.equal(splitAddOns.withoutPhotos.length, 0);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].addOn.name, "Cantilever-Style Stair Upgrade");
  assert.equal(pages[0].images.length, 1);
  assert.equal(pages[0].images[0].caption, "Cantilever stair photo");
});

test("residential optional add-on placeholders stay in pricing text and do not create photo pages", () => {
  const splitAddOns = splitResidentialOptionalAddOnsForPrint(residentialProposal);
  const pages = buildResidentialOptionalAddOnPrintPages(residentialProposal);

  assert.equal(splitAddOns.withPhotos.length, 0);
  assert.equal(splitAddOns.withoutPhotos.length, 1);
  assert.equal(pages.length, 0);
});

test("residential simple estimate page structure does not include option/SOV backup pages", () => {
  assert.deepEqual(getResidentialPacketPageStructure({ ...residentialProposal, residentialPdfLayout: RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT }), [
    "cover_summary",
    "residential_simple_estimate",
    "residential_legal_papers",
    "residential_payment_terms",
  ]);
});

test("residential proposal-with-photos shows option cards without SOV backup pages", () => {
  assert.deepEqual(getResidentialPacketPageStructure({ ...residentialProposal, residentialPdfLayout: RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT }), [
    "cover_summary",
    "residential_pricing_options",
    "residential_scope",
    "residential_legal_papers",
    "residential_payment_terms",
  ]);
});

test("residential detailed backup page structure separates pricing, SOV, scope, and terms", () => {
  assert.deepEqual(getResidentialPacketPageStructure({ ...residentialProposal, residentialPdfLayout: RESIDENTIAL_DETAILED_BACKUP_LAYOUT }), [
    "cover_summary",
    "residential_pricing_options",
    "residential_option_breakdowns",
    "residential_scope",
    "residential_legal_papers",
    "residential_payment_terms",
  ]);
});

test("uses short residential cover copy for choose-one proposals", () => {
  assert.equal(getResidentialCoverSchedule(residentialProposal, "Long schedule text"), RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE);
  assert.equal(getResidentialCoverDescription(residentialProposal, "Long description text"), RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION);
});

test("residential choose-one payment terms avoid duplicate GC billing language", () => {
  const terms = buildResidentialPaymentTermsCopy({
    ...residentialProposal,
    terms: {
      payment: "50 percent down payment required.",
      depositText: "A 50% deposit is required.",
      progressBilling: "Progress billings will be submitted monthly as work completes.",
    },
  });

  assert.match(terms, /50% down payment is required to schedule the project/);
  assert.match(terms, /Final payment is due when the last concrete/);
  assert.doesNotMatch(terms, /A 50% deposit is required/i);
  assert.doesNotMatch(terms, /Progress billings|monthly/i);
});

test("residential pricing copy avoids GC-style alternate totals", () => {
  const rows = buildResidentialPricingOptionRows(residentialProposal);
  const printablePricingCopy = [
    "Customer to Select One",
    ...rows.flatMap((row) => [
      row.name,
      `Base Price: ${formatResidentialCurrency(row.basePrice)}`,
      `50% Down: ${formatResidentialCurrency(row.downPayment)}`,
      `Final Payment: ${formatResidentialCurrency(row.finalPayment)}`,
      "Optional add-ons are selected below and added only if chosen.",
    ]),
    `Optional Add-On: ${residentialProposal.optionalAddOns[0].name} ${formatResidentialCurrency(residentialProposal.optionalAddOns[0].amount, { plus: true })}`,
  ].join("\n");

  assert.match(printablePricingCopy, /Option 1 - Full Scope With Broom Finish/);
  assert.match(printablePricingCopy, /Option 2 - Full Scope With Stamped Finish/);
  assert.match(printablePricingCopy, /Option 3 - Full Scope With Sand Finish/);
  assert.doesNotMatch(printablePricingCopy, /With optional add-on|With selected add-on|With add-on|With Cantilever Upgrade/i);
  assert.match(printablePricingCopy, /Optional Add-On: Cantilever-Style Stair Upgrade \+\$8,500/);
  assert.doesNotMatch(printablePricingCopy, /Total if All Alternates Accepted|Add Alternate|Alternate accepted total/i);
});

test("formats known residential option and add-on amounts inside printed text", () => {
  const formatted = formatResidentialMoneyText(
    "Options are 82500, 97500, and 90000. Optional cantilever is 8500. Option 2 with cantilever is 106000 and down payment is 53000.",
    residentialProposal,
  );

  assert.match(formatted, /\$82,500/);
  assert.match(formatted, /\$97,500/);
  assert.match(formatted, /\$90,000/);
  assert.match(formatted, /\$8,500/);
  assert.match(formatted, /\$106,000/);
  assert.match(formatted, /\$53,000/);
  assert.doesNotMatch(formatted, /\b82500\b|\b97500\b|\b90000\b|\b8500\b|\b106000\b|\b53000\b/);
});

test("residential base-plus-addons defaults to simple estimate layout", () => {
  const proposal = {
    proposalMode: "residential",
    pricingMode: BASE_PLUS_ADDONS_PRICING_MODE,
    lineItems: [{ description: "Base residential package", quantity: 1, unit: "LS", amount: 40000 }],
    optionalAddOns: [],
  };

  assert.equal(hasResidentialBasePlusAddOnsPricing(proposal), true);
  assert.equal(normalizeResidentialPdfLayout("", proposal), RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT);
  assert.equal(normalizeResidentialPdfLayout("", residentialProposal), RESIDENTIAL_PROPOSAL_WITH_PHOTOS_LAYOUT);
  assert.deepEqual(getResidentialPacketPageStructure(proposal), [
    "cover_summary",
    "residential_simple_estimate",
    "residential_legal_papers",
    "residential_payment_terms",
  ]);
});

test("simple estimate totals include selected add-ons and ignore unselected add-ons", () => {
  const proposal = {
    proposalMode: "residential",
    pricingMode: BASE_PLUS_ADDONS_PRICING_MODE,
    lineItems: [{ description: "Base Package", quantity: 1, unit: "LS", amount: 40000 }],
    optionalAddOns: [
      { name: "Lighting in steps", amount: 7000, selected: true },
      { name: "Cantilever steps", amount: 10000, selected: false },
      { name: "Walls", amount: 10000, included: true },
      { name: "Lighting in walls", amount: 7000, selected: false },
    ],
  };
  const totals = calculateResidentialSimpleEstimateTotals(proposal);

  assert.equal(totals.basePrice, 40000);
  assert.equal(totals.selectedAddOnsTotal, 17000);
  assert.equal(totals.total, 57000);
  assert.equal(totals.downPayment, 28500);
  assert.equal(totals.finalPayment, 28500);
  assert.deepEqual(
    totals.addOns.map((addOn) => [addOn.name, addOn.selected]),
    [
      ["Lighting in steps", true],
      ["Cantilever steps", false],
      ["Walls", true],
      ["Lighting in walls", false],
    ],
  );
});

test("submitted customer selection does not drive simple estimate final total until applied", () => {
  const proposal = {
    proposalMode: "residential",
    pricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
    residentialPdfLayout: RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT,
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000 },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000 },
    ],
    optionalAddOns: [
      { id: "walls", name: "Walls", optionAmounts: [{ optionId: "proposal-2", amount: 15000 }] },
      { id: "lighting", name: "Lighting", amount: 7000 },
    ],
    customerSelection: {
      status: "submitted",
      selectedPricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
      selectedOptionId: "proposal-2",
      selectedOptionName: "Proposal 2 - Exposed Finish Package",
      selectedAddOnIds: ["walls", "lighting"],
      selectedAddOnAmounts: [
        { id: "walls", name: "Walls", amount: 15000 },
        { id: "lighting", name: "Lighting", amount: 7000 },
      ],
      selectedTotal: 72000,
    },
  };
  const totals = calculateResidentialSimpleEstimateTotals(proposal);
  const appliedSummary = getAppliedResidentialCustomerSelectionSummary(proposal);

  assert.equal(appliedSummary.hasAppliedCustomerSelection, false);
  assert.equal(totals.hasPendingCustomerSelection, true);
  assert.equal(totals.total, 40000);
  assert.equal(totals.basePackage.name, "Proposal 1 - Broom Finish Package");
});

test("applied choose-one with add-ons drives simple estimate total for proposal 2", () => {
  const proposal = {
    proposalMode: "residential",
    pricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
    residentialPdfLayout: RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT,
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000 },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000 },
      { id: "proposal-3", name: "Proposal 3 - Stamped Finish Package", price: 60000 },
    ],
    customerSelection: {
      status: "applied_to_proposal",
      selectedPricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
      selectedOptionId: "proposal-2",
      selectedOptionName: "Proposal 2 - Exposed Finish Package",
      selectedAddOnIds: ["walls", "lighting"],
      selectedAddOnAmounts: [
        { id: "walls", name: "Walls", amount: 15000 },
        { id: "lighting", name: "Lighting", amount: 7000 },
      ],
      selectedTotal: 72000,
      selectedDownPayment: 36000,
      selectedFinalPayment: 36000,
      appliedProposalTotal: 72000,
      appliedDownPayment: 36000,
      appliedFinalPayment: 36000,
    },
  };
  const totals = calculateResidentialSimpleEstimateTotals(proposal);

  assert.equal(totals.hasAppliedCustomerSelection, true);
  assert.equal(totals.basePackage.name, "Proposal 2 - Exposed Finish Package");
  assert.equal(totals.basePrice, 50000);
  assert.equal(totals.selectedAddOnsTotal, 22000);
  assert.equal(totals.total, 72000);
  assert.equal(totals.downPayment, 36000);
  assert.equal(totals.finalPayment, 36000);
  assert.deepEqual(
    totals.selectedAddOns.map((addOn) => [addOn.name, addOn.amount]),
    [
      ["Walls", 15000],
      ["Lighting", 7000],
    ],
  );
});

test("applied choose-one with add-ons drives simple estimate total for proposal 3", () => {
  const proposal = {
    proposalMode: "residential",
    pricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
    residentialPdfLayout: RESIDENTIAL_SIMPLE_ESTIMATE_LAYOUT,
    pricingOptions: [
      { id: "proposal-1", name: "Proposal 1 - Broom Finish Package", price: 40000 },
      { id: "proposal-2", name: "Proposal 2 - Exposed Finish Package", price: 50000 },
      { id: "proposal-3", name: "Proposal 3 - Stamped Finish Package", price: 60000 },
    ],
    customerSelection: {
      status: "approval_sent",
      selectedPricingMode: CHOOSE_ONE_WITH_ADDONS_PRICING_MODE,
      selectedOptionId: "proposal-3",
      selectedOptionName: "Proposal 3 - Stamped Finish Package",
      selectedAddOnIds: ["walls", "cantilever"],
      selectedAddOnAmounts: [
        { id: "walls", name: "Walls", amount: 20000 },
        { id: "cantilever", name: "Cantilever-Style Stair Upgrade", amount: 20000 },
      ],
      selectedTotal: 100000,
      selectedDownPayment: 50000,
      selectedFinalPayment: 50000,
    },
  };
  const totals = calculateResidentialSimpleEstimateTotals(proposal);

  assert.equal(totals.hasAppliedCustomerSelection, true);
  assert.equal(totals.basePackage.name, "Proposal 3 - Stamped Finish Package");
  assert.equal(totals.basePrice, 60000);
  assert.equal(totals.selectedAddOnsTotal, 40000);
  assert.equal(totals.total, 100000);
  assert.equal(totals.downPayment, 50000);
  assert.equal(totals.finalPayment, 50000);
});
