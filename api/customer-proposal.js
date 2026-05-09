import { createClient } from "@supabase/supabase-js";
import {
  buildCustomerApprovalRecord,
  buildCustomerChangeRequestRecord,
  buildSubmittedCustomerSelection,
  canCustomerApproveProposal,
  createCustomerSafeProposalPayload,
  CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED,
  CUSTOMER_SELECTION_STATUS_CHANGE_REQUESTED,
  getCustomerShareStatus,
  normalizeCustomerSelection,
  normalizeCustomerShareToken,
} from "../src/utils/customerPortal.js";

const proposalsTable = "proposals";
const customerPortalConfigError = {
  ok: false,
  error: "Customer portal is not configured. Please contact Last Yard Concrete.",
  reason: "missing-server-supabase-config",
};

export default async function handler(request, response) {
  return handleCustomerProposalRequest(request, response);
}

export async function handleCustomerProposalRequest(
  request,
  response,
  { env = process.env, createClientImpl = createClient, logger = console } = {},
) {
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

  const serverConfig = getSupabaseServerConfig(env);

  if (!serverConfig.configured) {
    logger.error?.("[customer-proposal] Missing server Supabase config.", {
      hasSupabaseUrl: Boolean(serverConfig.supabaseUrl),
      hasServiceRoleKey: Boolean(serverConfig.serviceRoleKey),
      missing: serverConfig.missing,
    });
    response.status(500).json({ ...customerPortalConfigError });
    return;
  }

  try {
    const supabase = createCustomerPortalSupabaseClient(serverConfig, { createClientImpl });
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
      const action = String(body.action || "submit_selection").trim();

      if (action === "approve") {
        if (!canCustomerApproveProposal(proposal)) {
          response.status(409).json({ ok: false, available: true, reason: "approval-not-ready" });
          return;
        }

        const customerApproval = buildCustomerApprovalRecord(proposal, body.approval || body.customerApproval || {}, {
          approvedAt: new Date().toISOString(),
          ipAddress: getRequestIpAddress(request),
          userAgent: request.headers?.["user-agent"] || "",
        });

        if (
          !customerApproval.customerName ||
          !customerApproval.typedSignature ||
          !customerApproval.acknowledgedPaymentTerms ||
          !customerApproval.acknowledgedScope ||
          !customerApproval.acknowledgedLegalTerms ||
          !customerApproval.acknowledgedNotices
        ) {
          response.status(400).json({ ok: false, available: true, reason: "approval-incomplete" });
          return;
        }

        const proposalWithApproval = {
          ...proposal,
          customerApproval,
          customerSelection: {
            ...normalizeCustomerSelection(proposal.customerSelection),
            status: CUSTOMER_SELECTION_STATUS_APPROVED_SIGNED,
          },
          status: "accepted_deposit_due",
          updatedAt: customerApproval.approvedAt,
        };

        await updateCustomerProposalData(supabase, data.id, proposalWithApproval, { required: true });

        response.status(200).json({
          ok: true,
          available: true,
          reason: "available",
          customerApproval,
          customerSelection: proposalWithApproval.customerSelection,
          proposal: createCustomerSafeProposalPayload(proposalWithApproval),
        });
        return;
      }

      if (action === "request_changes") {
        if (!canCustomerApproveProposal(proposal)) {
          response.status(409).json({ ok: false, available: true, reason: "approval-not-ready" });
          return;
        }

        const customerApproval = buildCustomerChangeRequestRecord(proposal, body.approval || body.customerApproval || {}, {
          requestedAt: new Date().toISOString(),
          ipAddress: getRequestIpAddress(request),
          userAgent: request.headers?.["user-agent"] || "",
        });
        const proposalWithChangeRequest = {
          ...proposal,
          customerApproval,
          customerSelection: {
            ...normalizeCustomerSelection(proposal.customerSelection),
            status: CUSTOMER_SELECTION_STATUS_CHANGE_REQUESTED,
          },
          updatedAt: customerApproval.approvedAt,
        };

        await updateCustomerProposalData(supabase, data.id, proposalWithChangeRequest, { required: true });

        response.status(200).json({
          ok: true,
          available: true,
          reason: "available",
          customerApproval,
          customerSelection: proposalWithChangeRequest.customerSelection,
          proposal: createCustomerSafeProposalPayload(proposalWithChangeRequest),
        });
        return;
      }

      const customerSelection = buildSubmittedCustomerSelection(proposal, body.selection || body.customerSelection || {});
      const submittedAt = customerSelection.submittedAt || new Date().toISOString();
      const proposalWithSelection = {
        ...proposal,
        customerSelection,
        status: proposal.status === "accepted_deposit_due" ? proposal.status : "customer_selection_submitted",
        updatedAt: submittedAt,
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

export function getSupabaseServerConfig(env = process.env) {
  const supabaseUrl = firstNonEmptyEnvValue(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL, env.VITE_SUPABASE_URL);
  const serviceRoleKey = firstNonEmptyEnvValue(env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_SECRET_KEY);
  const missing = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    configured: Boolean(supabaseUrl && serviceRoleKey),
    missing,
    serviceRoleKey,
    supabaseUrl,
  };
}

export function createCustomerPortalSupabaseClient({ supabaseUrl, serviceRoleKey } = {}, { createClientImpl = createClient } = {}) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing server Supabase config for customer proposal portal.");
  }

  return createClientImpl(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });
}

export function getCustomerPortalConfigErrorPayload() {
  return { ...customerPortalConfigError };
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

function getRequestIpAddress(request) {
  const forwardedFor = request.headers?.["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "";
}

async function updateCustomerProposalData(supabase, rowId, proposalData, { required = false } = {}) {
  if (!rowId) {
    if (required) {
      throw new Error("Missing proposal row id for customer portal update.");
    }

    return false;
  }

  try {
    const { error } = await supabase
      .from(proposalsTable)
      .update({
        proposal_data: proposalData,
        status: proposalData.status || "draft",
        updated_at: proposalData.updatedAt || new Date().toISOString(),
      })
      .eq("id", rowId);

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
