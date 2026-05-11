import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildConcreteOpsLeadPayloadFromRequest, getConcreteOpsLeadSendConfig, handleSendLeadToConcreteOpsRequest, normalizeConcreteOpsLeadSendResponse } from "./send-lead-to-concrete-ops.js";

const source = readFileSync(new URL("./send-lead-to-concrete-ops.js", import.meta.url), "utf8");

test("server-only env usage and no VITE", () => {
  assert.match(source, /process\.env/);
  assert.match(source, /CONCRETE_OPS_IMPORT_TOKEN/);
  assert.doesNotMatch(source, /import\.meta\.env|VITE_/);
  const config = getConcreteOpsLeadSendConfig({ CONCRETE_OPS_API_BASE_URL: " https://concrete-ops-2.fly.dev/ ", CONCRETE_OPS_IMPORT_TOKEN: " token " });
  assert.equal(config.configured, true);
  assert.equal(config.apiBaseUrl, "https://concrete-ops-2.fly.dev");
});

test("posts safe payload with bearer auth", async () => {
  const response = createMockResponse(); let req = null;
  await handleSendLeadToConcreteOpsRequest({ method: "POST", body: { sourceLeadId: "lead-1", lead: { title: "T", customerPortalLink: "no", apiKey: "x", companyName: "C" } }, readable: false }, response, { env: { CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev", CONCRETE_OPS_IMPORT_TOKEN: "server-token" }, fetchImpl: async (u,o)=>{req={u,o}; return { ok:true, status:200, json: async()=>({ ok:true, id:"co-1", openPath:"/leads/co-1" })}; }, logger:{error(){}} });
  const body = JSON.parse(req.o.body);
  assert.equal(req.u, "https://concrete-ops-2.fly.dev/api/integrations/leads");
  assert.equal(req.o.headers.Authorization, "Bearer server-token");
  assert.equal(body.packageType, "concrete_ops_lead");
  assert.equal(body.sourceApp, "Last Yard Proposal / Lead Finder");
  assert.equal(body.lead.companyName, "C");
  assert.equal(Object.hasOwn(body.lead, "customerPortalLink"), false);
  assert.equal(Object.hasOwn(body.lead, "apiKey"), false);
});

test("normalizes duplicate and possible duplicate", () => {
  const dup = normalizeConcreteOpsLeadSendResponse({ message: "already exists duplicate" }, { fallbackStatus: 409, ok: false });
  assert.equal(dup.duplicate, true);
  assert.equal(dup.message, "This lead already exists in Concrete Ops.");
  const maybe = normalizeConcreteOpsLeadSendResponse({ message: "possible duplicate - review" }, { fallbackStatus: 202, ok: false });
  assert.equal(maybe.possibleDuplicate, true);
  assert.equal(maybe.message, "Sent to Concrete Ops for duplicate review.");
});

test("handles unauthorized and network failures safely", async () => {
  const unauth = createMockResponse();
  await handleSendLeadToConcreteOpsRequest({ method: "POST", body: { sourceLeadId: "lead-1", lead: {} }, readable: false }, unauth, { env: { CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev", CONCRETE_OPS_IMPORT_TOKEN: "server-token" }, fetchImpl: async ()=>({ ok:false, status:401, json: async()=>({ error: "Unauthorized Bearer server-token" }) }), logger:{error(){}} });
  assert.equal(unauth.statusCode, 401);
  assert.equal(unauth.body.reason, "concrete_ops_unauthorized");
  assert.equal(JSON.stringify(unauth.body).includes("server-token"), false);

  const net = createMockResponse();
  await handleSendLeadToConcreteOpsRequest({ method: "POST", body: { sourceLeadId: "lead-1", lead: {} }, readable: false }, net, { env: { CONCRETE_OPS_API_BASE_URL: "https://concrete-ops-2.fly.dev", CONCRETE_OPS_IMPORT_TOKEN: "server-token" }, fetchImpl: async ()=>{ throw new Error("fetch failed Bearer server-token"); }, logger:{error(){}} });
  assert.equal(net.statusCode, 502);
  assert.equal(net.body.reason, "concrete_ops_unreachable");
});

test("safe payload field whitelist", () => {
  const payload = buildConcreteOpsLeadPayloadFromRequest({ sourceLeadId: "lead-1", lead: { title:"A", state:"OR", secrets:"x", pdfData:"y", description:"d" } });
  assert.deepEqual(Object.keys(payload.lead).sort(), ["city","companyName","contactEmail","contactName","contactPhone","description","dueDate","nextFollowUpDate","projectType","serviceType","sourceName","sourceUrl","state","title"].sort());
});

function createMockResponse(){ return { statusCode: 200, body: null, headers: {}, setHeader(n,v){this.headers[n]=v;}, status(c){this.statusCode=c; return this;}, json(p){this.body=p; return this;}, end(){return this;} }; }
