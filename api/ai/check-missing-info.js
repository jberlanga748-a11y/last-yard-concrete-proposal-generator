const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-4.1-mini";
const maxLeadContextLength = 20000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    missingInformation: { type: "array", items: { type: "string" } },
    criticalQuestions: { type: "array", items: { type: "string" } },
    recommendedPhotosOrDocs: { type: "array", items: { type: "string" } },
    riskFlags: { type: "array", items: { type: "string" } },
    proposalReadinessScore: { type: "number", minimum: 0, maximum: 100 },
    proposalReadinessLabel: { type: "string", enum: ["Ready", "Needs Info", "Not Ready"] },
    recommendedNextStep: { type: "string" },
    customerQuestionDraft: { type: "string" },
  },
  required: [
    "missingInformation",
    "criticalQuestions",
    "recommendedPhotosOrDocs",
    "riskFlags",
    "proposalReadinessScore",
    "proposalReadinessLabel",
    "recommendedNextStep",
    "customerQuestionDraft",
  ],
};

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    response.status(200).json({
      configured: Boolean(process.env.OPENAI_API_KEY),
    });
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({
      ok: false,
      configured: false,
      error: "AI missing info check is not configured yet. Use Rule-Based Missing Info Check for now.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const lead = body.lead && typeof body.lead === "object" ? pickLeadContext(body.lead) : {};
    const leadContext = JSON.stringify(lead);

    if (!lead.title && !lead.description && !lead.notes) {
      response.status(400).json({ ok: false, error: "Add lead details before checking missing info." });
      return;
    }

    if (leadContext.length > maxLeadContextLength) {
      response.status(413).json({ ok: false, error: "Lead details are too large. Shorten notes or description before checking missing info." });
      return;
    }

    const aiResponse = await fetch(openAiResponsesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || defaultModel,
        input: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify({ lead }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "last_yard_lead_missing_info_check",
            schema: responseSchema,
            strict: true,
          },
        },
      }),
    });

    const data = await aiResponse.json().catch(() => ({}));

    if (!aiResponse.ok) {
      response.status(aiResponse.status).json({
        ok: false,
        configured: true,
        error: data?.error?.message || "OpenAI missing info check request failed.",
      });
      return;
    }

    response.status(200).json({
      ok: true,
      configured: true,
      result: normalizeMissingInfoResult(parseOpenAiJsonResponse(data)),
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      configured: true,
      error: error.message || "AI missing info check failed.",
    });
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !request.readable) {
    return request.body;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function pickLeadContext(lead = {}) {
  return {
    title: safeText(lead.title),
    companyName: safeText(lead.companyName),
    contactName: safeText(lead.contactName),
    contactEmail: safeText(lead.contactEmail),
    contactPhone: safeText(lead.contactPhone),
    city: safeText(lead.city),
    state: safeText(lead.state),
    serviceType: safeText(lead.serviceType),
    projectType: safeText(lead.projectType),
    dueDate: safeText(lead.dueDate),
    estimatedValue: lead.estimatedValue ?? "",
    description: safeText(lead.description),
    aiFitScore: lead.aiFitScore ?? "",
    aiFitLabel: safeText(lead.aiFitLabel),
    aiFitReason: safeText(lead.aiFitReason),
    aiRisks: safeText(lead.aiRisks),
    aiNextStep: safeText(lead.aiNextStep),
    suggestedCompanyMode: safeText(lead.suggestedCompanyMode),
    scoreSource: safeText(lead.scoreSource),
    reviewStatus: safeText(lead.reviewStatus),
    notes: safeText(lead.notes),
    proposalId: safeText(lead.proposalId),
    estimateId: safeText(lead.estimateId),
    packetId: safeText(lead.packetId),
  };
}

function buildSystemPrompt() {
  return [
    "You check saved construction leads for missing information before a human generates an estimate, proposal, or GC packet.",
    "Return only JSON matching the schema.",
    "Do not invent prices, quantities, measurements, addresses, contract terms, plan details, or due dates.",
    "Do not recommend auto-sending email, text, proposals, or customer messages.",
    "Keep riskFlags internal. The customerQuestionDraft should be short, polite, and ready for a human to review before sending.",
    "If suggestedCompanyMode is Live Your Future, check residential exterior needs: address, customer contact, photos, service type, fence/deck/siding scope, approximate measurements, material/style, demo/removal, access/staging, timeline, budget, and permit/HOA concerns.",
    "If suggestedCompanyMode is Last Yard Concrete, check concrete/GC needs: project location, GC contact, bid due date, plans/specs/addenda, concrete scope limits, quantities or plan sheets, demo/sawcut, excavation/base rock, traffic control, schedule/phasing, access/staging, testing/inspection, exclusions, and bond/insurance/public work requirements.",
    "If the lead is Bad Fit, proposalReadinessLabel should usually be Not Ready or Needs Info with a recommendation to reject or save for later unless the user chooses otherwise.",
    "proposalReadinessScore must be 0-100. proposalReadinessLabel must be Ready, Needs Info, or Not Ready.",
  ].join("\n");
}

function parseOpenAiJsonResponse(data) {
  const parsedContent = Array.isArray(data.output)
    ? data.output
        .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
        .find((content) => content.parsed)?.parsed
    : null;

  if (parsedContent) {
    return parsedContent;
  }

  const outputText =
    data.output_text ||
    (Array.isArray(data.output)
      ? data.output
          .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
          .map((content) => content.text || content.output_text || "")
          .filter(Boolean)
          .join("\n")
      : "");

  if (!outputText) {
    throw new Error("OpenAI response did not include structured missing info output.");
  }

  return JSON.parse(outputText);
}

function normalizeMissingInfoResult(result = {}) {
  const score = Number(result.proposalReadinessScore ?? result.readinessScore ?? result.score);
  const label = result.proposalReadinessLabel ?? result.readinessLabel ?? result.label;

  return {
    missingInformation: normalizeTextList(result.missingInformation ?? result.missingInfoChecklist),
    criticalQuestions: normalizeTextList(result.criticalQuestions),
    recommendedPhotosOrDocs: normalizeTextList(result.recommendedPhotosOrDocs),
    riskFlags: normalizeTextList(result.riskFlags ?? result.missingInfoRiskFlags),
    proposalReadinessScore: Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0,
    proposalReadinessLabel: ["Ready", "Needs Info", "Not Ready"].includes(label) ? label : "Needs Info",
    recommendedNextStep: safeText(result.recommendedNextStep ?? result.missingInfoRecommendedNextStep),
    customerQuestionDraft: safeText(result.customerQuestionDraft),
  };
}

function normalizeTextList(value = []) {
  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean);
  }

  const text = safeText(value);
  return text ? [text] : [];
}

function safeText(value = "") {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}
