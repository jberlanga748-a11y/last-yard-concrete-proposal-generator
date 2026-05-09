import { createClient } from "@supabase/supabase-js";
import {
  buildSubmittedCustomerSelection,
  createCustomerSafeProposalPayload,
  getCustomerShareStatus,
  normalizeCustomerShareToken,
} from "../src/utils/customerPortal.js";

const proposalsTable = "proposals";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (!["GET", "POST"].includes(request.method)) {
    response.status(405).json({ ok: false, available: false, reason: "method-not-allowed", error: "Method not allowed." });
    return;
  }

  const body = request.method === "POST" ? await readJsonBody(request) : {};
  const shareToken = normalizeCustomerShareToken(body.shareToken || request.query?.shareToken || getQueryParam(request.url, "shareToken"));

  if (!shareToken) {
    response.status(400).json({ ok: false, available: false, reason: "missing-token", error: "Missing proposal share token." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    response.status(503).json({
      ok: false,
      available: false,
      configured: false,
      reason: "unconfigured",
      error: "Customer proposal portal lookup is not configured.",
    });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data, error } = await supabase
      .from(proposalsTable)
      .select("id,proposal_data,created_at,updated_at")
      .filter("proposal_data->>customerShareToken", "eq", shareToken)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.proposal_data) {
      response.status(404).json({ ok: false, available: false, reason: "not-found" });
      return;
    }

    const proposal = {
      ...data.proposal_data,
      id: data.proposal_data.id || data.id,
      createdAt: data.proposal_data.createdAt || data.created_at,
      updatedAt: data.proposal_data.updatedAt || data.updated_at,
    };
    const status = getCustomerShareStatus(proposal, shareToken);

    if (!status.available) {
      response.status(getUnavailableStatusCode(status.reason)).json({ ok: false, available: false, reason: status.reason });
      return;
    }

    if (request.method === "POST") {
      const customerSelection = buildSubmittedCustomerSelection(proposal, body.selection || body.customerSelection || {});
      const proposalWithSelection = {
        ...proposal,
        customerSelection,
      };

      await updateCustomerProposalData(supabase, data.id, proposalWithSelection, { required: true });

      response.status(200).json({
        ok: true,
        available: true,
        reason: "available",
        customerSelection,
        proposal: createCustomerSafeProposalPayload(proposalWithSelection),
      });
      return;
    }

    const viewedAt = new Date().toISOString();
    const proposalWithLastViewed = {
      ...proposal,
      customerShareLastViewedAt: viewedAt,
    };

    await updateCustomerProposalData(supabase, data.id, proposalWithLastViewed);

    response.status(200).json({
      ok: true,
      available: true,
      reason: "available",
      proposal: createCustomerSafeProposalPayload(proposalWithLastViewed),
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      available: false,
      reason: "load-error",
      error: formatApiError(error),
    });
  }
}

async function updateCustomerProposalData(supabase, rowId, proposalData, { required = false } = {}) {
  if (!rowId) {
    if (required) {
      throw new Error("Missing proposal row id for customer portal update.");
    }

    return false;
  }

  try {
    const { error } = await supabase.from(proposalsTable).update({ proposal_data: proposalData }).eq("id", rowId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    if (required) {
      throw error;
    }

    // Viewing should not fail just because last-viewed tracking could not be written.
    return false;
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && typeof request.body.pipe !== "function" && typeof request.body.read !== "function") {
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

function getUnavailableStatusCode(reason = "") {
  if (reason === "expired") {
    return 410;
  }

  if (reason === "disabled") {
    return 403;
  }

  return 404;
}

function getQueryParam(url = "", key = "") {
  try {
    const parsedUrl = new URL(url, "https://local.invalid");
    return parsedUrl.searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function formatApiError(error) {
  if (!error) {
    return "Unknown customer portal lookup error.";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || error.error_description || error.error || "Unknown customer portal lookup error.";
}
