import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import handler from "./check-missing-info.js";

const missingInfoSource = readFileSync(new URL("./check-missing-info.js", import.meta.url), "utf8");

test("missing info API uses server-side OpenAI config only", () => {
  assert.match(missingInfoSource, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(missingInfoSource, /VITE_OPENAI_API_KEY|import\.meta\.env/);
});

test("missing info API returns safe config error when OpenAI key is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const response = createMockResponse();
  await handler({ method: "POST", body: { lead: { title: "Fence repair" } }, readable: false }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.configured, false);
  assert.equal(response.payload.error, "AI missing info check is not configured yet. Use Rule-Based Missing Info Check for now.");

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
});

test("missing info API exposes safe configured status without exposing keys", async () => {
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

test("missing info API returns structured readiness fields", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "server-only-test-key";
  let requestBody = null;

  globalThis.fetch = async (url, options = {}) => {
    requestBody = JSON.parse(options.body);
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer server-only-test-key");
    assert.equal(requestBody.text.format.name, "last_yard_lead_missing_info_check");
    assert.equal(requestBody.text.format.schema.required.includes("customerQuestionDraft"), true);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          missingInformation: ["Project address", "Fence height"],
          criticalQuestions: ["What is the fence height?"],
          recommendedPhotosOrDocs: ["Current fence photos"],
          riskFlags: ["Missing measurements"],
          proposalReadinessScore: 62,
          proposalReadinessLabel: "Needs Info",
          recommendedNextStep: "Ask customer for address and photos.",
          customerQuestionDraft: "Hi, can you send the address and photos?",
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
          title: "Fence repair",
          city: "Albany",
          state: "OR",
          serviceType: "Fencing",
          description: "Fence needs replacement.",
          suggestedCompanyMode: "Live Your Future",
        },
      },
      readable: false,
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.deepEqual(response.payload.result.missingInformation, ["Project address", "Fence height"]);
  assert.deepEqual(response.payload.result.criticalQuestions, ["What is the fence height?"]);
  assert.deepEqual(response.payload.result.recommendedPhotosOrDocs, ["Current fence photos"]);
  assert.deepEqual(response.payload.result.riskFlags, ["Missing measurements"]);
  assert.equal(response.payload.result.proposalReadinessScore, 62);
  assert.equal(response.payload.result.proposalReadinessLabel, "Needs Info");
  assert.equal(response.payload.result.recommendedNextStep, "Ask customer for address and photos.");
  assert.equal(response.payload.result.customerQuestionDraft, "Hi, can you send the address and photos?");
  assert.match(requestBody.input[0].content, /Do not invent prices/);

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
