const concreteOpsLeadImportPath = "/api/integrations/leads";
const missingConcreteOpsConfigMessage = "Concrete Ops lead send is not configured yet.";

export default async function handler(request, response) {
  return handleSendLeadToConcreteOpsRequest(request, response);
}

export async function handleSendLeadToConcreteOpsRequest(
  request,
  response,
  { env = process.env, fetchImpl = globalThis.fetch, logger = console } = {},
) {
  response.setHeader?.("Cache-Control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    response.status(200).json(getConcreteOpsLeadSendStatus(env));
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  const config = getConcreteOpsLeadSendConfig(env);
  if (!config.configured) {
    logger.error?.("[concrete-ops-lead-send] Missing server configuration.", { missing: config.missing });
    response.status(503).json({ ok: false, configured: false, reason: "env_missing", message: missingConcreteOpsConfigMessage, error: missingConcreteOpsConfigMessage });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const packagePayload = buildConcreteOpsLeadPayloadFromRequest(body);

    if (!packagePayload) {
      response.status(400).json({ ok: false, configured: true, reason: "package_build_failed", message: "Lead payload is missing required values.", error: "Lead payload is missing required values." });
      return;
    }

    const upstreamResponse = await fetchImpl(`${config.apiBaseUrl}${concreteOpsLeadImportPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.importToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(packagePayload),
    });
    const upstreamPayload = await upstreamResponse.json().catch(() => ({}));
    const safePayload = normalizeConcreteOpsLeadSendResponse(upstreamPayload, {
      apiBaseUrl: config.apiBaseUrl,
      fallbackStatus: upstreamResponse.status,
      ok: upstreamResponse.ok,
    });

    if (safePayload.ok || safePayload.duplicate || safePayload.possibleDuplicate) {
      response.status(200).json(safePayload);
      return;
    }

    response.status(getLeadSendFailureStatusCode(safePayload.reason)).json(safePayload);
  } catch (error) {
    const reason = isNetworkOrFetchFailure(error) ? "concrete_ops_unreachable" : "unknown_error";
    const safeError = formatSafeError(error);
    logger.error?.("[concrete-ops-lead-send] Lead send failed.", { message: safeError, reason });
    response.status(getLeadSendFailureStatusCode(reason)).json({
      ok: false,
      configured: true,
      reason,
      message: reason === "concrete_ops_unreachable" ? "Concrete Ops is unreachable right now." : "Concrete Ops lead send failed.",
      error: safeError,
    });
  }
}

export function buildConcreteOpsLeadPayloadFromRequest(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const sourceLeadId = safeText(source.sourceLeadId || source.leadId || source.lead?.id);
  const lead = sanitizeLeadForConcreteOps(source.lead);
  if (!sourceLeadId) return null;

  return {
    packageType: "concrete_ops_lead",
    sourceApp: "Last Yard Proposal / Lead Finder",
    sourceLeadId,
    lead,
  };
}

export function sanitizeLeadForConcreteOps(lead = {}) { const s = lead && typeof lead === 'object' ? lead : {}; return { title: safeText(s.title), companyName: safeText(s.companyName), contactName: safeText(s.contactName), contactEmail: safeText(s.contactEmail), contactPhone: safeText(s.contactPhone), city: safeText(s.city), state: safeText(s.state), sourceName: safeText(s.sourceName), sourceUrl: safeText(s.sourceUrl), serviceType: safeText(s.serviceType), projectType: safeText(s.projectType), description: safeText(s.description), nextFollowUpDate: safeText(s.nextFollowUpDate), dueDate: safeText(s.dueDate) }; }

export function getConcreteOpsLeadSendConfig(env = process.env) {
  const apiBaseUrl = trimTrailingSlash(firstNonEmptyEnvValue(env.CONCRETE_OPS_API_BASE_URL));
  const importToken = firstNonEmptyEnvValue(env.CONCRETE_OPS_IMPORT_TOKEN);
  const missing = [];
  if (!apiBaseUrl) missing.push("CONCRETE_OPS_API_BASE_URL");
  if (!importToken) missing.push("CONCRETE_OPS_IMPORT_TOKEN");
  return { apiBaseUrl, importToken, missing, configured: Boolean(apiBaseUrl && importToken) };
}

export function getConcreteOpsLeadSendStatus(env = process.env) { const c = getConcreteOpsLeadSendConfig(env); return { configured: c.configured, hasBaseUrl: Boolean(c.apiBaseUrl), hasToken: Boolean(c.importToken), baseUrlHost: getUrlHost(c.apiBaseUrl) }; }

export function normalizeConcreteOpsLeadSendResponse(payload = {}, { apiBaseUrl = "", fallbackStatus = 0, ok = false } = {}) {
  const s = payload && typeof payload === "object" ? payload : {};
  const reason = getLeadSendFailureReason(s, fallbackStatus, ok);
  const concreteOpsLeadId = safeText(s.leadId || s.id || s.importedLeadId || s.lead?.id);
  const openPath = normalizeOpenPath(s.openPath || s.path || s.lead?.openPath);
  const possibleDuplicate = s.possibleDuplicate === true || /possible duplicate|review/i.test(`${s.reason || ""} ${s.message || ""}`);
  const duplicate = !possibleDuplicate && (s.duplicate === true || /already exists|duplicate/.test(`${s.reason || ""} ${s.message || ""}`.toLowerCase()));
  const upstreamMessage = redactSensitiveText(safeText(s.message || s.error));
  return { ok: ok || duplicate || possibleDuplicate, duplicate, possibleDuplicate, concreteOpsLeadId, openPath, concreteOpsUrl: apiBaseUrl && openPath ? `${trimTrailingSlash(apiBaseUrl)}${openPath}` : "", message: getLeadSendMessage({ duplicate, possibleDuplicate, ok, reason, upstreamMessage }), error: ok || duplicate || possibleDuplicate ? "" : upstreamMessage, reason };
}

function getLeadSendMessage({ duplicate = false, possibleDuplicate = false, ok = false, reason = "", upstreamMessage = "" } = {}) { if (duplicate) return "This lead already exists in Concrete Ops."; if (possibleDuplicate) return "Sent to Concrete Ops for duplicate review."; if (ok) return "Lead sent to Concrete Ops for review."; if (reason === "concrete_ops_unauthorized") return "Concrete Ops token was rejected."; if (reason === "concrete_ops_validation_failed") return upstreamMessage || "Concrete Ops rejected the lead payload."; return upstreamMessage || "Concrete Ops lead send failed."; }
function getLeadSendFailureReason(source = {}, status = 0, ok = false) { if (ok) return ""; if ([401,403].includes(Number(status))) return "concrete_ops_unauthorized"; if ([400,422].includes(Number(status))) return "concrete_ops_validation_failed"; const combined = [source.reason, source.error, source.message].filter(Boolean).join(" "); if (/unauthorized|forbidden|token|bearer|auth/i.test(combined)) return "concrete_ops_unauthorized"; if (/validation|invalid|missing|required/i.test(combined)) return "concrete_ops_validation_failed"; return "unknown_error"; }
function getLeadSendFailureStatusCode(reason = "") { if (reason === "concrete_ops_unauthorized") return 401; if (reason === "concrete_ops_validation_failed") return 422; if (reason === "concrete_ops_unreachable") return 502; return 500; }
function safeText(v){return typeof v==="string"?v.trim():""}
function firstNonEmptyEnvValue(v){return safeText(v)}
function trimTrailingSlash(v=""){return safeText(v).replace(/\/+$/g,"")}
function getUrlHost(v=""){try{return new URL(v).host}catch{return ""}}
function normalizeOpenPath(v=""){const p=safeText(v); if(!p)return ""; return p.startsWith("/")?p:`/${p}`;}
function redactSensitiveText(v=""){return safeText(v).replace(/Bearer\s+[A-Za-z0-9._-]+/gi,"Bearer [redacted]").replace(/CONCRETE_OPS_IMPORT_TOKEN\s*[:=]\s*\S+/gi,"CONCRETE_OPS_IMPORT_TOKEN=[redacted]")}
function formatSafeError(error){return redactSensitiveText(safeText(error?.message||String(error||"Unknown error")))}
function isNetworkOrFetchFailure(error){const m=safeText(error?.message||""); return /fetch|network|failed|econn|enotfound|timed out|timeout/i.test(m)}
async function readJsonBody(request){if(request?.body && typeof request.body === "object") return request.body; if(!request || request.readable===false) return {}; let raw=""; for await (const c of request) raw += typeof c === "string" ? c : c.toString("utf8"); return raw ? JSON.parse(raw) : {};}
