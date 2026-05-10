const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-4.1-mini";
const maxLeadContextLength = 20000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    aiFitScore: { type: "number", minimum: 0, maximum: 100 },
    aiFitLabel: { type: "string", enum: ["Good Fit", "Maybe", "Bad Fit"] },
    aiFitReason: { type: "string" },
    aiRisks: { type: "string" },
    aiNextStep: { type: "string" },
    suggestedCompanyMode: {
      type: "string",
      enum: ["Live Your Future", "Last Yard Concrete", "General Contractor", "Unknown"],
    },
  },
  required: ["aiFitScore", "aiFitLabel", "aiFitReason", "aiRisks", "aiNextStep", "suggestedCompanyMode"],
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
      error: "AI scoring is not configured yet. Add OPENAI_API_KEY to enable live AI scoring.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const lead = body.lead && typeof body.lead === "object" ? pickLeadContext(body.lead) : {};
    const leadContext = JSON.stringify(lead);

    if (!lead.title && !lead.description && !lead.notes) {
      response.status(400).json({ ok: false, error: "Add lead details before running AI scoring." });
      return;
    }

    if (leadContext.length > maxLeadContextLength) {
      response.status(413).json({ ok: false, error: "Lead details are too large. Shorten notes or description before scoring." });
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
            name: "last_yard_lead_score",
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
        error: data?.error?.message || "OpenAI lead scoring request failed.",
      });
      return;
    }

    response.status(200).json({
      ok: true,
      configured: true,
      result: normalizeScoreResult(parseOpenAiJsonResponse(data)),
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      configured: true,
      error: error.message || "AI lead scoring failed.",
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
    city: safeText(lead.city),
    state: safeText(lead.state),
    serviceType: safeText(lead.serviceType),
    projectType: safeText(lead.projectType),
    dueDate: safeText(lead.dueDate),
    estimatedValue: lead.estimatedValue ?? "",
    description: safeText(lead.description),
    notes: safeText(lead.notes),
  };
}

function buildSystemPrompt() {
  return [
    "You score construction leads for Last Yard's lead finder.",
    "Return only JSON matching the schema.",
    "Be conservative. If information is missing, say what is missing instead of guessing.",
    "Keep explanations short and customer-safe. Do not recommend auto-sending email, text, or bids.",
    "Manual lead status is separate from aiFitLabel; do not assume the lead has been contacted.",
    "Live Your Future Construction good fit: Albany and Willamette Valley preferred; fencing, decking, siding, exterior repair; residential first; simple small commercial allowed.",
    "Live Your Future Construction should avoid concrete, roofing, framing, windows for now, full GC work, huge public or bonded jobs, and work beyond current capacity unless simple subcontracted scope.",
    "Last Yard Concrete good fit: Oregon only; concrete/site packages, sidewalks, ADA ramps, curb/gutter, slabs, demo/replacement; GC/subcontractor path preferred.",
    "Last Yard Concrete should avoid full GC/prime work unless mostly concrete or clearly manageable.",
    "suggestedCompanyMode must be Live Your Future, Last Yard Concrete, General Contractor, or Unknown.",
    "aiFitScore must be 0-100. aiFitLabel must be Good Fit, Maybe, or Bad Fit.",
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
    throw new Error("OpenAI response did not include structured lead score output.");
  }

  return JSON.parse(outputText);
}

function normalizeScoreResult(result = {}) {
  const score = Number(result.aiFitScore ?? result.fitScore ?? result.score);
  const fitLabel = result.aiFitLabel ?? result.fitLabel ?? result.label;
  const fitReason = result.aiFitReason ?? result.fitReason ?? result.reason;
  const risks = result.aiRisks ?? result.risks;
  const nextStep = result.aiNextStep ?? result.nextStep;
  const companyMode = result.suggestedCompanyMode ?? result.companyMode ?? result.suggestedCompany ?? result.recommendedCompanyMode;

  return {
    aiFitScore: Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0,
    aiFitLabel: ["Good Fit", "Maybe", "Bad Fit"].includes(fitLabel) ? fitLabel : "Maybe",
    aiFitReason: safeText(fitReason),
    aiRisks: Array.isArray(risks) ? risks.map((item) => safeText(item)).filter(Boolean).join("\n") : safeText(risks),
    aiNextStep: safeText(nextStep),
    suggestedCompanyMode: ["Live Your Future", "Last Yard Concrete", "General Contractor", "Unknown"].includes(companyMode)
      ? companyMode
      : "Unknown",
  };
}

function safeText(value = "") {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}
