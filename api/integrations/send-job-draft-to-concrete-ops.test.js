import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getConcreteOpsDirectSendConfig,
  getConcreteOpsDirectSendStatus,
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

test("Concrete Ops direct send GET config status hides token", async () => {
  const directStatus = getConcreteOpsDirectSendStatus({
    CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
    CONCRETE_OPS_IMPORT_TOKEN: "server-token",
  });
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    { method: "GET", body: null, readable: false },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      logger: { error() {} },
    },
  );

  assert.deepEqual(directStatus, {
    configured: true,
    hasBaseUrl: true,
    hasToken: true,
    baseUrlHost: "concrete-ops-2.fly.dev",
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, directStatus);
  assert.equal(JSON.stringify(response.body).includes("server-token"), false);
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
  assert.equal(response.body.reason, "env_missing");
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

test("Concrete Ops direct send maps missing draft package to package build failure", async () => {
  let fetchCalled = false;
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    {
      method: "POST",
      body: { opsJobDraftId: "draft-missing" },
      readable: false,
    },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      fetchImpl: async () => {
        fetchCalled = true;
        return {};
      },
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.reason, "package_build_failed");
  assert.equal(fetchCalled, false);
});

test("Concrete Ops direct send maps wrong token response to unauthorized safely", async () => {
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    {
      method: "POST",
      body: { opsJobDraftId: "draft-unauth", draft: { id: "draft-unauth", jobName: "Albany Slab" } },
      readable: false,
    },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          error: "Unauthorized Bearer server-token",
        }),
      }),
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.reason, "concrete_ops_unauthorized");
  assert.match(response.body.message, /Concrete Ops token was rejected/);
  assert.equal(JSON.stringify(response.body).includes("server-token"), false);
  assert.match(response.body.error, /Bearer \[redacted\]/);
});

test("Concrete Ops direct send maps validation response to package validation failure", async () => {
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    {
      method: "POST",
      body: { opsJobDraftId: "draft-invalid", draft: { id: "draft-invalid", jobName: "No Location" } },
      readable: false,
    },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: "missing city/state",
        }),
      }),
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.reason, "concrete_ops_validation_failed");
  assert.equal(response.body.message, "Concrete Ops rejected the package: missing city/state. Use Export Job Draft Package for now.");
});

test("Concrete Ops direct send maps network failure to unreachable", async () => {
  const response = createMockResponse();

  await handleSendJobDraftToConcreteOpsRequest(
    {
      method: "POST",
      body: { opsJobDraftId: "draft-network", draft: { id: "draft-network", jobName: "Network Slab" } },
      readable: false,
    },
    response,
    {
      env: {
        CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev",
        CONCRETE_OPS_IMPORT_TOKEN: "server-token",
      },
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 502);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.reason, "concrete_ops_unreachable");
  assert.equal(response.body.message, "Concrete Ops is unreachable right now. Use Export Job Draft Package for now.");
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
  assert.equal(failed.reason, "concrete_ops_unauthorized");
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
