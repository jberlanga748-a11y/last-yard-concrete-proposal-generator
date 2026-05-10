import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import handler from "./draft-proposal.js";

const draftProposalSource = readFileSync(new URL("./draft-proposal.js", import.meta.url), "utf8");

test("AI proposal draft API uses server-side OpenAI config only", () => {
  assert.match(draftProposalSource, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(draftProposalSource, /VITE_OPENAI_API_KEY|import\.meta\.env/);
});

test("AI proposal draft API returns safe config error when OpenAI key is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const response = createMockResponse();
  await handler({ method: "POST", body: { lead: { title: "Deck repair" } }, readable: false }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.configured, false);
  assert.equal(
    response.payload.error,
    "AI proposal drafting is not configured yet. Use manual proposal creation or Rule-Based Test Score for now.",
  );

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
});

test("AI proposal draft API exposes safe configured status without exposing keys", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "server-only-test-key";

  const response = createMockResponse();
  await handler({ method: "GET", body: null, readable: false }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { configured: true });

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

test("AI proposal draft API returns structured proposal draft fields", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "server-only-test-key";
  let requestBody = null;

  globalThis.fetch = async (url, options = {}) => {
    requestBody = JSON.parse(options.body);
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer server-only-test-key");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(requestBody.text.format.name, "last_yard_lead_proposal_draft");
    assert.equal(requestBody.text.format.schema.required.includes("followUpSmsDraft"), true);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          proposalTitle: "Albany Sidewalk Repair",
          clientName: "Albany Apartments",
          projectLocation: "Albany, OR",
          customerSummary: "Prepare a reviewed proposal for sidewalk repair.",
          scopeOfWork: ["Review damaged sidewalk panels", "Prepare concrete repair scope"],
          inclusions: ["Concrete sidewalk replacement scope to be confirmed"],
          exclusions: ["Permits unless confirmed"],
          assumptions: ["Access will be provided"],
          scheduleNotes: "Schedule after site details are confirmed.",
          missingInformation: ["Measurements", "Panel count"],
          internalRiskNotes: ["Confirm trip hazards and access"],
          recommendedNextStep: "Request photos and measurements.",
          followUpEmailDraft: "Thanks for reaching out. Please send photos and measurements.",
          followUpSmsDraft: "Thanks. Can you send photos and measurements?",
        }),
      }),
    };
  };

  const response = createMockResponse();
  await handler(
    {
      method: "POST",
      body: {
        lead: {
          title: "Sidewalk replacement",
          companyName: "Albany Apartments",
          city: "Albany",
          state: "OR",
          serviceType: "Sidewalk",
          suggestedCompanyMode: "Last Yard Concrete",
          description: "Replace damaged sidewalk panels.",
          estimatedValue: 12000,
        },
      },
      readable: false,
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.result.proposalTitle, "Albany Sidewalk Repair");
  assert.deepEqual(response.payload.result.missingInformation, ["Measurements", "Panel count"]);
  assert.match(requestBody.input[0].content, /Do not invent prices/);
  assert.match(requestBody.input[0].content, /estimatedValue exists, treat it as internal budget/);

  globalThis.fetch = originalFetch;
  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}
