import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomerPortalSupabaseClient,
  getCustomerPortalConfigErrorPayload,
  getSupabaseServerConfig,
  handleCustomerProposalRequest,
} from "./customer-proposal.js";

function createMockResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end(payload = "") {
      this.body = payload;
      this.ended = true;
      return this;
    },
  };
}

function createMockSupabase({ row, selectError = null, updateError = null, onUpdate = () => {} } = {}) {
  return {
    from(tableName) {
      assert.equal(tableName, "proposals");

      return {
        select(columns) {
          assert.equal(columns, "id,proposal_data,created_at,updated_at");

          return {
            filter(column, operator, value) {
              assert.equal(column, "proposal_data->>customerShareToken");
              assert.equal(operator, "eq");
              assert.equal(value.startsWith("lyp_"), true);

              return {
                limit(limitCount) {
                  assert.equal(limitCount, 1);

                  return {
                    async maybeSingle() {
                      return { data: row || null, error: selectError };
                    },
                  };
                },
              };
            },
          };
        },
        update(payload) {
          onUpdate(payload);

          return {
            async eq(column, rowId) {
              assert.equal(column, "id");
              assert.equal(rowId, row?.id);

              return { error: updateError };
            },
          };
        },
      };
    },
  };
}

function createClientFactory(mockSupabase, onCreate = () => {}) {
  return (supabaseUrl, serviceRoleKey, options) => {
    onCreate({ options, serviceRoleKey, supabaseUrl });
    return mockSupabase;
  };
}

function createEnabledProposal(overrides = {}) {
  return {
    id: "row-1",
    created_at: "2026-05-08T12:00:00.000Z",
    updated_at: "2026-05-08T12:00:00.000Z",
    proposal_data: {
      id: "proposal-1",
      customerShareEnabled: true,
      customerShareToken: "lyp_public",
      proposalMode: "residential",
      pricingMode: "base_plus_addons",
      pricing: {
        pricingMode: "base_plus_addons",
        basePackage: { id: "base", name: "Base Package", price: 40000 },
        optionalAddOns: [{ id: "walls", name: "Walls", amount: 10000 }],
      },
      scopeSections: [{ title: "Original Scope", bullets: ["Keep me"] }],
      residentialLegalPapers: {
        informationNoticeToOwner: { status: "needs_review" },
      },
      projectPhotos: [{ id: "photo-1", publicUrl: "https://cdn.example/photo.jpg", caption: "Existing Area" }],
      teamPermissions: { owner: "last-yard" },
      ...overrides,
    },
  };
}

test("customer proposal API returns safe config error when server Supabase config is missing", async () => {
  const response = createMockResponse();
  let createClientCalled = false;

  await handleCustomerProposalRequest(
    {
      method: "GET",
      query: { shareToken: "lyp_public" },
      url: "/api/customer-proposal?shareToken=lyp_public",
      headers: {},
    },
    response,
    {
      env: {},
      createClientImpl: () => {
        createClientCalled = true;
        throw new Error("Should not create Supabase client without config.");
      },
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, getCustomerPortalConfigErrorPayload());
  assert.equal(createClientCalled, false);
});

test("customer proposal API reads only server-safe Supabase env names", () => {
  const config = getSupabaseServerConfig({
    NEXT_PUBLIC_SUPABASE_URL: " https://public-url.supabase.co ",
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "public-service-role-must-be-ignored",
    VITE_SUPABASE_SERVICE_ROLE_KEY: "vite-service-role-must-be-ignored",
  });
  const secretConfig = getSupabaseServerConfig({
    VITE_SUPABASE_URL: "https://vite-url.supabase.co",
    SUPABASE_SECRET_KEY: " secret-service-role ",
  });

  assert.equal(config.supabaseUrl, "https://public-url.supabase.co");
  assert.equal(config.serviceRoleKey, "");
  assert.equal(config.configured, false);
  assert.deepEqual(config.missing, ["SUPABASE_SERVICE_ROLE_KEY"]);
  assert.equal(secretConfig.configured, true);
  assert.equal(secretConfig.supabaseUrl, "https://vite-url.supabase.co");
  assert.equal(secretConfig.serviceRoleKey, "secret-service-role");
});

test("customer proposal API creates Supabase server client with service role headers", () => {
  let captured = null;
  const client = createCustomerPortalSupabaseClient(
    {
      supabaseUrl: "https://project.supabase.co",
      serviceRoleKey: "server-service-role",
    },
    {
      createClientImpl: (supabaseUrl, serviceRoleKey, options) => {
        captured = { options, serviceRoleKey, supabaseUrl };
        return { ok: true };
      },
    },
  );

  assert.deepEqual(client, { ok: true });
  assert.equal(captured.supabaseUrl, "https://project.supabase.co");
  assert.equal(captured.serviceRoleKey, "server-service-role");
  assert.equal(captured.options.auth.persistSession, false);
  assert.equal(captured.options.auth.autoRefreshToken, false);
  assert.equal(captured.options.global.headers.apikey, "server-service-role");
  assert.equal(captured.options.global.headers.Authorization, "Bearer server-service-role");
});

test("customer proposal API valid token lookup returns customer-safe payload", async () => {
  const response = createMockResponse();
  const row = createEnabledProposal();
  let updatePayload = null;

  await handleCustomerProposalRequest(
    {
      method: "GET",
      query: { shareToken: "lyp_public" },
      url: "/api/customer-proposal?shareToken=lyp_public",
      headers: {},
    },
    response,
    {
      env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-service-role" },
      createClientImpl: createClientFactory(createMockSupabase({ row, onUpdate: (payload) => { updatePayload = payload; } })),
      logger: { error() {} },
    },
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.available, true);
  assert.equal(response.body.proposal.id, "proposal-1");
  assert.equal(response.body.proposal.customerShareToken, "lyp_public");
  assert.equal(updatePayload.proposal_data.customerShareLastViewedAt.length > 0, true);
});

test("customer proposal API rejects invalid, disabled, and expired share tokens safely", async () => {
  const env = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-service-role" };
  const invalidResponse = createMockResponse();
  const disabledResponse = createMockResponse();
  const expiredResponse = createMockResponse();

  await handleCustomerProposalRequest(
    { method: "GET", query: { shareToken: "lyp_missing" }, url: "/api/customer-proposal?shareToken=lyp_missing", headers: {} },
    invalidResponse,
    { env, createClientImpl: createClientFactory(createMockSupabase({ row: null })), logger: { error() {} } },
  );
  await handleCustomerProposalRequest(
    { method: "GET", query: { shareToken: "lyp_public" }, url: "/api/customer-proposal?shareToken=lyp_public", headers: {} },
    disabledResponse,
    { env, createClientImpl: createClientFactory(createMockSupabase({ row: createEnabledProposal({ customerShareEnabled: false }) })), logger: { error() {} } },
  );
  await handleCustomerProposalRequest(
    { method: "GET", query: { shareToken: "lyp_public" }, url: "/api/customer-proposal?shareToken=lyp_public", headers: {} },
    expiredResponse,
    {
      env,
      createClientImpl: createClientFactory(
        createMockSupabase({ row: createEnabledProposal({ customerShareExpiresAt: "2026-05-07T12:00:00.000Z" }) }),
      ),
      logger: { error() {} },
    },
  );

  assert.deepEqual([invalidResponse.statusCode, invalidResponse.body.reason], [404, "not-found"]);
  assert.deepEqual([disabledResponse.statusCode, disabledResponse.body.reason], [403, "disabled"]);
  assert.deepEqual([expiredResponse.statusCode, expiredResponse.body.reason], [410, "expired"]);
});

test("customer proposal API selection submit writes only customerSelection state", async () => {
  const response = createMockResponse();
  const row = createEnabledProposal();
  let updatePayload = null;

  await handleCustomerProposalRequest(
    {
      method: "POST",
      body: {
        shareToken: "lyp_public",
        pricing: { totalProposal: 1 },
        scopeSections: [{ title: "Malicious overwrite" }],
        residentialLegalPapers: { termsAndConditions: { includedInPdf: true } },
        projectPhotos: [{ publicUrl: "https://evil.example/photo.jpg" }],
        teamPermissions: { owner: "public-user" },
        selection: {
          selectedAddOnIds: ["walls"],
          selectedPricingMode: "base_plus_addons",
        },
      },
      url: "/api/customer-proposal",
      headers: {},
    },
    response,
    {
      env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-service-role" },
      createClientImpl: createClientFactory(createMockSupabase({ row, onUpdate: (payload) => { updatePayload = payload; } })),
      logger: { error() {} },
    },
  );

  const updatedProposal = updatePayload.proposal_data;

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.customerSelection.status, "submitted");
  assert.equal(response.body.customerSelection.selectedTotal, 50000);
  assert.equal(updatedProposal.customerSelection.selectedTotal, 50000);
  assert.equal(updatedProposal.status, "customer_selection_submitted");
  assert.equal(Boolean(updatedProposal.updatedAt), true);
  assert.equal(updatePayload.status, "customer_selection_submitted");
  assert.equal(updatePayload.updated_at, updatedProposal.updatedAt);
  assert.equal(updatedProposal.pricing.basePackage.price, 40000);
  assert.deepEqual(updatedProposal.scopeSections, [{ title: "Original Scope", bullets: ["Keep me"] }]);
  assert.equal(updatedProposal.residentialLegalPapers.informationNoticeToOwner.status, "needs_review");
  assert.equal(updatedProposal.projectPhotos[0].publicUrl, "https://cdn.example/photo.jpg");
  assert.equal(updatedProposal.teamPermissions.owner, "last-yard");
  assert.equal("pricing" in response.body, false);
  assert.equal("scopeSections" in response.body, false);
});
