import assert from "node:assert/strict";
import test from "node:test";

import {
  RESIDENTIAL_CHOOSE_ONE_COVER_DESCRIPTION,
  RESIDENTIAL_CHOOSE_ONE_COVER_SCHEDULE,
  buildResidentialPaymentTermsCopy,
  buildResidentialOptionBreakdowns,
  formatResidentialCurrency,
  formatResidentialMoneyText,
  getResidentialCoverDescription,
  getResidentialCoverSchedule,
  getResidentialOptionalAddOns,
  getResidentialPricingOptions,
  hasResidentialChooseOnePricing,
  normalizeResidentialPricingOptions,
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
