import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getConcreteOpsDirectSendConfig,
  handleSendJobDraftToConcreteOpsRequest,
  normalizeConcreteOpsImportResponse,
} from "./send-job-draft-to-concrete-ops.js";

const source = readFileSync(new URL("./send-job-draft-to-concrete-ops.js", import.meta.url), "utf8");

test("Concrete Ops direct send route uses server-only env names", () => {
  assert.match(source, /process\.env/);
  assert.match(source, /CONCRETE_OPS_API_BASE_URL/);
  assert.match(source, /CONCRETE_OPS_IMPORT_TOKEN/);
  assert.doesNotMatch(source, /VITE_CONCRETE_OPS_IMPORT_TOKEN|import\.meta\.env/);

  const config = getConcreteOpsDirectSendConfig({
    CONCRETE_OPS_API_BASE_URL: " https://concrete-ops-2.fly.dev/ ",
    CONCRETE_OPS_IMPORT_TOKEN: " server-token ",
  });

  assert.equal(config.configured, true);
  assert.equal(config.apiBaseUrl, "https://concrete-ops-2.fly.dev");
  assert.equal(config.importToken, "server-token");
});

test("Concrete Ops direct send returns safe message when env vars are missing", async () => {
  let fetchCalled = false;
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    { method: "POST", body: { opsJobDraftId: "draft-1", draft: { id: "draft-1", jobName: "Albany Slab" } }, readable: false },
    response,
    {
      env: {},
      fetchImpl: async () => {
        fetchCalled = true;
        return {};
      },
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.reason, "missing-concrete-ops-config");
  assert.equal(response.body.message, "Concrete Ops direct send is not configured yet. Use Export Job Draft Package for now.");
  assert.equal(JSON.stringify(response.body).includes("server-token"), false);
  assert.equal(fetchCalled, false);
});

test("Concrete Ops direct send posts export package with bearer auth and never returns token", async () => {
  const response = createMockResponse();
  let requestUrl = "";
  let requestOptions = null;

  await handleSendJobDraftToConcreteOpsRequest(
    {
      method: "POST",
      body: {
        opsJobDraftId: "draft-1",
        draft: {
          id: "draft-1",
          jobName: "Albany Sidewalk",
          customerName: "ABC Apartments",
          city: "Albany",
          state: "OR",
          serviceType: "Sidewalk",
          scopeSummary: "Replace sidewalk panels.",
        },
      },
      readable: false,
    },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      fetchImpl: async (url, options = {}) => {
        requestUrl = url;
        requestOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            importedDraftId: "import-1",
            status: "Imported",
            openPath: "/job-draft-imports/import-1",
            message: "Imported draft.",
          }),
        };
      },
      logger: { error() {} },
    },
  );

  const sentPackage = JSON.parse(requestOptions.body);

  assert.equal(response.statusCode, 200);
  assert.equal(requestUrl, "https://concrete-ops-2.fly.dev/api/integrations/job-draft-imports");
  assert.equal(requestOptions.headers.Authorization, "Bearer server-token");
  assert.equal(requestOptions.headers["Content-Type"], "application/json");
  assert.equal(sentPackage.packageType, "concrete_ops_job_draft");
  assert.equal(sentPackage.opsJobDraftId, "draft-1");
  assert.equal(response.body.ok, true);
  assert.equal(response.body.importedDraftId, "import-1");
  assert.equal(response.body.concreteOpsUrl, "https://concrete-ops-2.fly.dev/job-draft-imports/import-1");
  assert.equal(JSON.stringify(response.body).includes("server-token"), false);
});

test("Concrete Ops direct send normalizes duplicate and failed responses safely", () => {
  const duplicate = normalizeConcreteOpsImportResponse(
    {
      duplicate: true,
      importedDraftId: "existing-import",
      openPath: "/job-draft-imports/existing-import",
      message: "Duplicate import found.",
    },
    { apiBaseUrl: "https://concrete-ops-2.fly.dev", fallbackStatus: 409, ok: false },
  );
  const failed = normalizeConcreteOpsImportResponse(
    {
      error: "Unauthorized",
    },
    { apiBaseUrl: "https://concrete-ops-2.fly.dev", fallbackStatus: 401, ok: false },
  );

  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.importedDraftId, "existing-import");
  assert.equal(duplicate.concreteOpsUrl, "https://concrete-ops-2.fly.dev/job-draft-imports/existing-import");
  assert.equal(failed.ok, false);
  assert.equal(failed.status, "HTTP 401");
  assert.equal(failed.error, "Unauthorized");
});

function createMockResponse() {
  return {
    body: null,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end(payload = "") {
      this.body = payload;
      return this;
    },
  };
}
