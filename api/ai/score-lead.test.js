import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import handler from "./score-lead.js";

const scoreLeadSource = readFileSync(new URL("./score-lead.js", import.meta.url), "utf8");

test("lead scoring API uses server-side OpenAI config only", () => {
  assert.match(scoreLeadSource, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(scoreLeadSource, /VITE_OPENAI_API_KEY|import\.meta\.env/);
});

test("lead scoring API returns safe config error when OpenAI key is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const response = createMockResponse();
  await handler({ method: "POST", body: { lead: { title: "Deck repair" } }, readable: false }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.configured, false);
  assert.equal(response.payload.error, "AI scoring is not configured yet. Add OPENAI_API_KEY to enable live AI scoring.");

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
});

test("lead scoring API exposes safe configured status without exposing keys", async () => {
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

test("lead scoring API returns structured lead score fields", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "server-only-test-key";
  let requestBody = null;

  globalThis.fetch = async (url, options = {}) => {
    requestBody = JSON.parse(options.body);
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer server-only-test-key");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(requestBody.text.format.name, "last_yard_lead_score");
    assert.equal(requestBody.text.format.schema.required.includes("suggestedCompanyMode"), true);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          aiFitScore: 82,
          aiFitLabel: "Good Fit",
          aiFitReason: "Concrete sidewalk replacement in Oregon fits Last Yard.",
          aiRisks: "Confirm access and schedule.",
          aiNextStep: "Call the source and confirm bid documents.",
          suggestedCompanyMode: "Last Yard Concrete",
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
          city: "Albany",
          state: "OR",
          serviceType: "Sidewalk",
          description: "Replace damaged concrete sidewalk panels.",
        },
      },
      readable: false,
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.result.aiFitScore, 82);
  assert.equal(response.payload.result.aiFitLabel, "Good Fit");
  assert.equal(response.payload.result.suggestedCompanyMode, "Last Yard Concrete");
  assert.match(requestBody.input[0].content, /Be conservative/);

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
