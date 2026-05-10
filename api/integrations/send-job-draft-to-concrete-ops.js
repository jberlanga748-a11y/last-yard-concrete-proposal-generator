import { createConcreteOpsJobDraftExportPackage } from "../../src/utils/opsJobDrafts.js";

const concreteOpsImportPath = "/api/integrations/job-draft-imports";
const missingConcreteOpsConfigMessage = "Concrete Ops direct send is not configured yet. Use Export Job Draft Package for now.";

export default async function handler(request, response) {
  return handleSendJobDraftToConcreteOpsRequest(request, response);
}

export async function handleSendJobDraftToConcreteOpsRequest(
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
    response.status(200).json(getConcreteOpsDirectSendStatus(env));
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  const config = getConcreteOpsDirectSendConfig(env);

  if (!config.configured) {
    logger.error?.("[concrete-ops-send] Missing server configuration.", { missing: config.missing });
    response.status(503).json({
      ok: false,
      configured: false,
      error: missingConcreteOpsConfigMessage,
      message: missingConcreteOpsConfigMessage,
      reason: "env_missing",
    });
    return;
  }

  if (typeof fetchImpl !== "function") {
    response.status(getDirectSendFailureStatusCode("unknown_error")).json({
      ok: false,
      configured: true,
      error: "Concrete Ops direct send cannot run in this server environment.",
      message: "Concrete Ops direct send cannot run in this server environment. Use Export Job Draft Package for now.",
      reason: "unknown_error",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const packagePayload = buildConcreteOpsJobDraftPackageFromRequest(body);

    if (!packagePayload) {
      response.status(400).json({
        ok: false,
        configured: true,
        error: "Save or open a Concrete Ops Job Draft before sending it to Concrete Ops.",
        message: "Package could not be built. Save or open a Concrete Ops Job Draft before sending it.",
        reason: "package_build_failed",
      });
      return;
    }

    const upstreamResponse = await fetchImpl(`${config.apiBaseUrl}${concreteOpsImportPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.importToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(packagePayload),
    });
    const upstreamPayload = await upstreamResponse.json().catch(() => ({}));
    const safePayload = normalizeConcreteOpsImportResponse(upstreamPayload, {
      apiBaseUrl: config.apiBaseUrl,
      fallbackStatus: upstreamResponse.status,
      ok: upstreamResponse.ok,
    });

    if (safePayload.ok || safePayload.duplicate) {
      response.status(200).json(safePayload);
      return;
    }

    response.status(getDirectSendFailureStatusCode(safePayload.reason)).json(safePayload);
  } catch (error) {
    const reason = isNetworkOrFetchFailure(error) ? "concrete_ops_unreachable" : "unknown_error";
    const safeError = formatSafeError(error);
    logger.error?.("[concrete-ops-send] Direct send failed.", { message: safeError, reason });
    response.status(getDirectSendFailureStatusCode(reason)).json({
      ok: false,
      configured: true,
      error: safeError,
      message:
        reason === "concrete_ops_unreachable"
          ? "Concrete Ops is unreachable right now. Use Export Job Draft Package for now."
          : "Concrete Ops direct send failed. Use Export Job Draft Package for now.",
      reason,
    });
  }
}

export function getConcreteOpsDirectSendConfig(env = process.env) {
  const apiBaseUrl = trimTrailingSlash(firstNonEmptyEnvValue(env.CONCRETE_OPS_API_BASE_URL));
  const importToken = firstNonEmptyEnvValue(env.CONCRETE_OPS_IMPORT_TOKEN);
  const missing = [];

  if (!apiBaseUrl) {
    missing.push("CONCRETE_OPS_API_BASE_URL");
  }

  if (!importToken) {
    missing.push("CONCRETE_OPS_IMPORT_TOKEN");
  }

  return {
    apiBaseUrl,
    configured: Boolean(apiBaseUrl && importToken),
    importToken,
    missing,
  };
}

export function getConcreteOpsDirectSendStatus(env = process.env) {
  const config = getConcreteOpsDirectSendConfig(env);

  return {
    configured: config.configured,
    hasBaseUrl: Boolean(config.apiBaseUrl),
    hasToken: Boolean(config.importToken),
    baseUrlHost: getUrlHost(config.apiBaseUrl),
  };
}

export function buildConcreteOpsJobDraftPackageFromRequest(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const opsJobDraftId = safeText(source.opsJobDraftId || source.draft?.id || source.jobDraft?.id);
  const draft = source.draft && typeof source.draft === "object" ? source.draft : source.jobDraft && typeof source.jobDraft === "object" ? source.jobDraft : null;

  if (!opsJobDraftId || !draft) {
    return null;
  }

  return createConcreteOpsJobDraftExportPackage(
    {
      ...draft,
      id: safeText(draft.id) || opsJobDraftId,
    },
    {
      handoff: source.handoff,
      lead: source.lead,
      proposal: source.proposal,
    },
  );
}

export function normalizeConcreteOpsImportResponse(payload = {}, { apiBaseUrl = "", fallbackStatus = 0, ok = false } = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const reason = getConcreteOpsFailureReason(source, fallbackStatus, ok);
  const importedDraftId = safeText(
    source.importedDraftId ||
      source.importedJobDraftId ||
      source.import?.id ||
      source.importedDraft?.id ||
      source.draft?.id ||
      source.id,
  );
  const openPath = normalizeOpenPath(source.openPath || source.path || source.importedDraft?.openPath || source.import?.openPath);
  const duplicate = source.duplicate === true || /duplicate|already/i.test(safeText(source.reason || source.status || source.message || source.error));
  const safeUpstreamError = redactSensitiveText(safeText(source.error?.message || source.error || source.reason || source.details || source.validationError));
  const message =
    getConcreteOpsDirectSendMessage(source, { duplicate, ok, reason, safeUpstreamError });

  return {
    ok: ok || duplicate,
    duplicate,
    importedDraftId,
    status: safeText(source.status) || (duplicate ? "Duplicate" : ok ? "Sent" : `HTTP ${fallbackStatus || 500}`),
    openPath,
    message,
    concreteOpsUrl: apiBaseUrl && openPath ? `${trimTrailingSlash(apiBaseUrl)}${openPath}` : "",
    error: ok || duplicate ? "" : safeUpstreamError || message,
    reason,
  };
}

function getConcreteOpsFailureReason(source = {}, status = 0, ok = false) {
  if (ok) {
    return "";
  }

  if ([401, 403].includes(Number(status))) {
    return "concrete_ops_unauthorized";
  }

  if ([400, 422].includes(Number(status))) {
    return "concrete_ops_validation_failed";
  }

  const combined = [source.reason, source.error?.message, source.error, source.message, source.details].filter(Boolean).join(" ");

  if (/unauthorized|forbidden|token|bearer|auth/i.test(combined)) {
    return "concrete_ops_unauthorized";
  }

  if (/validation|invalid|missing|required|city|state|package/i.test(combined)) {
    return "concrete_ops_validation_failed";
  }

  return "unknown_error";
}

function getConcreteOpsDirectSendMessage(source = {}, { duplicate = false, ok = false, reason = "", safeUpstreamError = "" } = {}) {
  const upstreamMessage = redactSensitiveText(safeText(source.message));

  if (duplicate) {
    return upstreamMessage || "Already sent / duplicate found.";
  }

  if (ok) {
    return upstreamMessage || "Concrete Ops Job Draft sent.";
  }

  if (reason === "concrete_ops_unauthorized") {
    return "Concrete Ops token was rejected. Check CONCRETE_OPS_IMPORT_TOKEN. Use Export Job Draft Package for now.";
  }

  if (reason === "concrete_ops_validation_failed") {
    return `Concrete Ops rejected the package${safeUpstreamError || upstreamMessage ? `: ${safeUpstreamError || upstreamMessage}` : ""}. Use Export Job Draft Package for now.`;
  }

  return upstreamMessage || "Concrete Ops direct send failed. Use Export Job Draft Package for now.";
}

function getDirectSendFailureStatusCode(reason = "") {
  if (reason === "concrete_ops_unauthorized") {
    return 401;
  }

  if (reason === "concrete_ops_validation_failed" || reason === "package_build_failed") {
    return 400;
  }

  if (reason === "concrete_ops_unreachable") {
    return 502;
  }

  return 500;
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !request.readable && typeof request.body.pipe !== "function") {
    return request.body;
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  try {
    const chunks = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString("utf8").trim();
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return {};
  }
}

function normalizeOpenPath(value = "") {
  const text = safeText(value);

  if (!text) {
    return "";
  }

  if (/^https?:\/\//i.test(text)) {
    try {
      const parsedUrl = new URL(text);
      return `${parsedUrl.pathname}${parsedUrl.search || ""}`;
    } catch {
      return "";
    }
  }

  return text.startsWith("/") ? text : `/${text}`;
}

function getUrlHost(value = "") {
  const text = safeText(value);

  if (!text) {
    return "";
  }

  try {
    return new URL(text).host;
  } catch {
    return "";
  }
}

function firstNonEmptyEnvValue(...values) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function trimTrailingSlash(value = "") {
  return safeText(value).replace(/\/+$/g, "");
}

function safeText(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isNetworkOrFetchFailure(error) {
  const message = formatSafeError(error);
  return /fetch|network|econn|enotfound|etimedout|timeout|socket|dns/i.test(message);
}

function redactSensitiveText(value = "") {
  return safeText(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/CONCRETE_OPS_IMPORT_TOKEN\s*[:=]\s*\S+/gi, "CONCRETE_OPS_IMPORT_TOKEN=[redacted]");
}

function formatSafeError(error) {
  if (!error) {
    return "Concrete Ops direct send failed.";
  }

  if (typeof error === "string") {
    return redactSensitiveText(error);
  }

  return redactSensitiveText(error.message || "Concrete Ops direct send failed.");
}
