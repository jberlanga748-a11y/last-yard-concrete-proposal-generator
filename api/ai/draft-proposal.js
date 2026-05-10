const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-4.1-mini";
const maxLeadContextLength = 20000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    proposalTitle: { type: "string" },
    clientName: { type: "string" },
    projectLocation: { type: "string" },
    customerSummary: { type: "string" },
    scopeOfWork: { type: "array", items: { type: "string" } },
    inclusions: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    scheduleNotes: { type: "string" },
    missingInformation: { type: "array", items: { type: "string" } },
    internalRiskNotes: { type: "array", items: { type: "string" } },
    recommendedNextStep: { type: "string" },
    followUpEmailDraft: { type: "string" },
    followUpSmsDraft: { type: "string" },
  },
  required: [
    "proposalTitle",
    "clientName",
    "projectLocation",
    "customerSummary",
    "scopeOfWork",
    "inclusions",
    "exclusions",
    "assumptions",
    "scheduleNotes",
    "missingInformation",
    "internalRiskNotes",
    "recommendedNextStep",
    "followUpEmailDraft",
    "followUpSmsDraft",
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
      error: "AI proposal drafting is not configured yet. Use manual proposal creation or Rule-Based Test Score for now.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const lead = body.lead && typeof body.lead === "object" ? pickLeadContext(body.lead) : {};
    const leadContext = JSON.stringify(lead);

    if (!lead.title && !lead.description && !lead.notes) {
      response.status(400).json({ ok: false, error: "Add lead details before generating a proposal draft." });
      return;
    }

    if (leadContext.length > maxLeadContextLength) {
      response.status(413).json({ ok: false, error: "Lead details are too large. Shorten notes or description before drafting." });
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
            name: "last_yard_lead_proposal_draft",
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
        error: data?.error?.message || "OpenAI proposal drafting request failed.",
      });
      return;
    }

    response.status(200).json({
      ok: true,
      configured: true,
      result: normalizeProposalDraftResult(parseOpenAiJsonResponse(data)),
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      configured: true,
      error: error.message || "AI proposal drafting failed.",
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
    sourceName: safeText(lead.sourceName),
    sourceUrl: safeText(lead.sourceUrl),
    companyName: safeText(lead.companyName),
    contactName: safeText(lead.contactName),
    contactEmail: safeText(lead.contactEmail),
    contactPhone: safeText(lead.contactPhone),
    city: safeText(lead.city),
    state: safeText(lead.state),
    serviceType: safeText(lead.serviceType),
    projectType: safeText(lead.projectType),
    estimatedValue: lead.estimatedValue ?? "",
    description: safeText(lead.description),
    aiFitScore: lead.aiFitScore ?? "",
    aiFitLabel: safeText(lead.aiFitLabel),
    aiFitReason: safeText(lead.aiFitReason),
    aiRisks: safeText(lead.aiRisks),
    aiNextStep: safeText(lead.aiNextStep),
    suggestedCompanyMode: safeText(lead.suggestedCompanyMode),
    notes: safeText(lead.notes),
  };
}

function buildSystemPrompt() {
  return [
    "You draft proposal review content from a saved construction lead for Last Yard's lead finder.",
    "Return only JSON matching the schema.",
    "Do not invent prices, quantities, measurements, dates, legal terms, warranty terms, or contract terms.",
    "If estimatedValue exists, treat it as internal budget context only; do not present it as a customer price.",
    "If information is missing, list it in missingInformation instead of guessing.",
    "Keep customer-facing wording professional, simple, and ready for human review.",
    "Put risks, capacity concerns, AI concerns, and fit concerns in internalRiskNotes only.",
    "Do not include AI risks in customer-facing proposal copy unless they are normal exclusions or assumptions.",
    "If suggestedCompanyMode is Live Your Future, write for fencing, decking, siding, or exterior repair.",
    "If suggestedCompanyMode is Last Yard Concrete, write for concrete, site concrete, sidewalk, ADA ramp, curb/gutter, or slab work.",
    "Scope, inclusions, exclusions, and assumptions must be arrays of short strings.",
    "Follow-up email and SMS are drafts only; do not imply anything was sent.",
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
    throw new Error("OpenAI response did not include structured proposal draft output.");
  }

  return JSON.parse(outputText);
}

function normalizeProposalDraftResult(result = {}) {
  return {
    proposalTitle: safeText(result.proposalTitle),
    clientName: safeText(result.clientName),
    projectLocation: safeText(result.projectLocation),
    customerSummary: safeText(result.customerSummary),
    scopeOfWork: normalizeTextList(result.scopeOfWork),
    inclusions: normalizeTextList(result.inclusions),
    exclusions: normalizeTextList(result.exclusions),
    assumptions: normalizeTextList(result.assumptions),
    scheduleNotes: safeText(result.scheduleNotes),
    missingInformation: normalizeTextList(result.missingInformation),
    internalRiskNotes: normalizeTextList(result.internalRiskNotes),
    recommendedNextStep: safeText(result.recommendedNextStep),
    followUpEmailDraft: safeText(result.followUpEmailDraft),
    followUpSmsDraft: safeText(result.followUpSmsDraft),
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
