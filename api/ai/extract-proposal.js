const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-4.1-mini";
const maxNotesLength = 60000;
const maxProposalContextLength = 90000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["extract", "review"] },
    extraction: {
      type: "object",
      additionalProperties: true,
      properties: {
        project: { type: "object", additionalProperties: true },
        client: { type: "object", additionalProperties: true },
        proposalType: { type: "string" },
        packetMode: { type: "string" },
        isSubcontractor: { type: "boolean" },
        scope: { type: "array", items: { type: "string" } },
        concreteSpecs: { type: "object", additionalProperties: true },
        lineItems: { type: "array", items: { type: "object", additionalProperties: true } },
        alternatesAllowances: { type: "array", items: { type: "object", additionalProperties: true } },
        pricingSummary: { type: "array", items: { type: "object", additionalProperties: true } },
        scheduleOfValues: { type: "array", items: { type: "object", additionalProperties: true } },
        takeoffQuantities: { type: "array", items: { type: "object", additionalProperties: true } },
        assumptions: { type: "array", items: { type: "string" } },
        exclusions: { type: "array", items: { type: "string" } },
        rfiClarifications: { type: "array", items: { type: "string" } },
        addenda: { type: "array", items: { type: "string" } },
        scopeControl: { type: "object", additionalProperties: true },
        legalTerms: { type: "object", additionalProperties: true },
        proposalNotes: { type: "string" },
        scheduleAssumptions: { type: "string" },
        warnings: { type: "array", items: { type: "string" } },
        missingInfo: { type: "array", items: { type: "string" } },
        reviewNotes: { type: "array", items: { type: "string" } },
      },
    },
    review: {
      type: "object",
      additionalProperties: true,
      properties: {
        recommendation: { type: "string" },
        readyStatus: { type: "string" },
        findings: { type: "array", items: { type: "object", additionalProperties: true } },
        warnings: { type: "array", items: { type: "string" } },
        missingInfo: { type: "array", items: { type: "string" } },
      },
    },
  },
  required: ["mode"],
};

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).end();
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
      error: "AI extraction is not configured. Use Smart Paste instead.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const mode = body.mode === "review" ? "review" : "extract";
    const notes = String(body.notes || "").trim();
    const proposal = body.proposal && typeof body.proposal === "object" ? body.proposal : {};
    const proposalContext = JSON.stringify(proposal);

    if (mode === "extract" && notes.length === 0) {
      response.status(400).json({ ok: false, error: "Paste notes before running AI Extract Proposal." });
      return;
    }

    if (notes.length > maxNotesLength || proposalContext.length > maxProposalContextLength) {
      response.status(413).json({ ok: false, error: "AI input is too large. Shorten notes or remove unrelated proposal context." });
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
            content: buildSystemPrompt(mode),
          },
          {
            role: "user",
            content: JSON.stringify({
              mode,
              notes,
              proposal,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "last_yard_ai_proposal_result",
            schema: responseSchema,
            strict: false,
          },
        },
      }),
    });

    const data = await aiResponse.json().catch(() => ({}));

    if (!aiResponse.ok) {
      response.status(aiResponse.status).json({
        ok: false,
        configured: true,
        error: data?.error?.message || "OpenAI request failed.",
      });
      return;
    }

    const parsed = parseOpenAiJsonResponse(data);
    response.status(200).json({
      ok: true,
      configured: true,
      result: parsed,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      configured: true,
      error: error.message || "AI extraction failed.",
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

function buildSystemPrompt(mode) {
  const sharedRules = [
    "You extract and review concrete subcontractor proposal notes for Last Yard Concrete.",
    "Return only JSON that matches the schema.",
    "Preserve user capitalization exactly for project names and client names.",
    "Do not invent prices, quantities, dates, contacts, or addenda.",
    "Treat Total Proposal, Total With Alternate, and Total if... as presentation totals unless an Add Alternate label explicitly has a dollar amount.",
    "If Add Alternate says none, no add alternate exists.",
    "Keep [VERIFY] and [ENTER...] placeholders as values, and also list warnings for them.",
    "If notes say not full GC/prime or subcontractor, classify as subcontractor scope and avoid full-prime wording.",
    "Separate base bid, add alternates, optional support, allowances, and presentation totals.",
    "Remove duplicate text and keep scope, exclusions, RFIs, addenda, and scope-control fields clean.",
  ];

  if (mode === "review") {
    return [
      ...sharedRules,
      "Review the current proposal for missing info, placeholders, pricing/SOV mismatches, fake alternates, duplicate text, weak exclusions, missing RFIs/addenda, optional scope included in base, and readiness.",
    ].join("\n");
  }

  return [
    ...sharedRules,
    "Extract the messy notes into structured proposal fields. Use VERIFY warnings when uncertain.",
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
    throw new Error("OpenAI response did not include structured output text.");
  }

  return JSON.parse(outputText);
}
