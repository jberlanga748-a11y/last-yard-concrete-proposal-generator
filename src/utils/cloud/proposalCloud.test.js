import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCloudProposalById,
  formatCloudProposalSaveError,
  getCloudProposalRowStatus,
  mergeCloudPortalFieldsForSave,
  saveCloudProposal,
} from "./proposalCloud.js";

function createProposalRow(proposalData = {}, row = {}) {
  return {
    id: row.id || "row-1",
    created_at: row.created_at || "2026-05-08T08:00:00.000Z",
    updated_at: row.updated_at || proposalData.updatedAt || "2026-05-08T08:00:00.000Z",
    proposal_data: {
      id: "proposal-1",
      status: "draft",
      updatedAt: row.updated_at || "2026-05-08T08:00:00.000Z",
      ...proposalData,
    },
  };
}

function createFakeSupabase({
  rows = [],
  onUpdate = () => {},
  onInsert = () => {},
  onUpsert = () => {},
  updateResults = [],
  insertResults = [],
  upsertResults = [],
} = {}) {
  let updateCount = 0;
  let insertCount = 0;
  let upsertCount = 0;

  return {
    from(tableName) {
      assert.equal(tableName, "proposals");

      return {
        select() {
          const filters = {};

          return {
            eq(column, value) {
              filters[column] = value;

              if (column === "id") {
                return {
                  async maybeSingle() {
                    return {
                      data: rows.find((row) => row.id === value && (!filters.company_id || row.company_id === filters.company_id)) || null,
                      error: null,
                    };
                  },
                };
              }

              return Promise.resolve({
                data: rows.filter((row) => !filters.company_id || row.company_id === filters.company_id),
                error: null,
              });
            },
          };
        },
        update(payload) {
          onUpdate(payload);

          return {
            async eq(column, value) {
              assert.equal(column, "id");
              assert.ok(value);
              return updateResults[updateCount++] || { error: null };
            },
          };
        },
        async insert(payload) {
          onInsert(payload);
          return insertResults[insertCount++] || { error: null };
        },
        async upsert(payload) {
          onUpsert(payload);
          return upsertResults[upsertCount++] || { error: null };
        },
      };
    },
  };
}

const cloudDeps = {
  normalizeProposal: (proposal) => ({ ...proposal }),
  normalizeProposalForCollection: (proposal) => ({ ...proposal }),
  getProposalTimestamp: (proposal) => Date.parse(proposal.updatedAt || proposal.createdAt || "") || 0,
};

test("cloud save merge preserves newer public customer selection from portal writes", () => {
  const merged = mergeCloudPortalFieldsForSave(
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:00:00.000Z",
      customerSelection: { status: "none" },
      pricing: { basePackage: { price: 40000 } },
    },
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:05:00.000Z",
      customerSelection: {
        status: "submitted",
        submittedAt: "2026-05-08T10:05:00.000Z",
        selectedAddOnIds: ["walls"],
        selectedTotal: 50000,
      },
    },
    {
      cloudTimestamp: Date.parse("2026-05-08T10:05:00.000Z"),
      sourceUpdatedAt: Date.parse("2026-05-08T10:00:00.000Z"),
    },
  );

  assert.equal(merged.customerSelection.status, "submitted");
  assert.equal(merged.customerSelection.selectedTotal, 50000);
  assert.equal(merged.pricing.basePackage.price, 40000);
});

test("cloud save merge preserves same-status customer selection when portal timestamp is newer", () => {
  const merged = mergeCloudPortalFieldsForSave(
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:20:00.000Z",
      customerSelection: {
        status: "submitted",
        submittedAt: "2026-05-08T10:05:00.000Z",
        selectedAddOnIds: ["walls"],
        selectedTotal: 50000,
      },
    },
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:10:00.000Z",
      customerSelection: {
        status: "submitted",
        submittedAt: "2026-05-08T10:10:00.000Z",
        selectedAddOnIds: ["walls", "lighting"],
        selectedTotal: 57000,
      },
    },
    {
      cloudTimestamp: Date.parse("2026-05-08T10:10:00.000Z"),
      sourceUpdatedAt: Date.parse("2026-05-08T10:20:00.000Z"),
    },
  );

  assert.deepEqual(merged.customerSelection.selectedAddOnIds, ["walls", "lighting"]);
  assert.equal(merged.customerSelection.selectedTotal, 57000);
});

test("cloud save merge keeps local reviewed/applied state ahead of older submitted portal state", () => {
  const merged = mergeCloudPortalFieldsForSave(
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:20:00.000Z",
      customerSelection: {
        status: "applied_to_proposal",
        submittedAt: "2026-05-08T10:05:00.000Z",
        appliedAt: "2026-05-08T10:20:00.000Z",
        selectedTotal: 50000,
      },
    },
    {
      id: "proposal-1",
      updatedAt: "2026-05-08T10:05:00.000Z",
      customerSelection: {
        status: "submitted",
        submittedAt: "2026-05-08T10:05:00.000Z",
        selectedTotal: 50000,
      },
    },
    {
      cloudTimestamp: Date.parse("2026-05-08T10:05:00.000Z"),
      sourceUpdatedAt: Date.parse("2026-05-08T10:20:00.000Z"),
    },
  );

  assert.equal(merged.customerSelection.status, "applied_to_proposal");
  assert.equal(merged.customerSelection.appliedAt, "2026-05-08T10:20:00.000Z");
});

test("cloud save merge preserves newer customer approval and accepted status", () => {
  const merged = mergeCloudPortalFieldsForSave(
    {
      id: "proposal-1",
      status: "awaiting_customer_approval",
      updatedAt: "2026-05-08T11:00:00.000Z",
      customerSelection: { status: "approval_sent", selectedTotal: 50000 },
      customerApproval: { status: "none" },
    },
    {
      id: "proposal-1",
      status: "accepted_deposit_due",
      updatedAt: "2026-05-08T11:10:00.000Z",
      customerSelection: { status: "approved_signed", selectedTotal: 50000 },
      customerApproval: {
        status: "approved_signed",
        approvedAt: "2026-05-08T11:10:00.000Z",
        typedSignature: "Homeowner",
        acceptedTotal: 50000,
      },
    },
    {
      cloudTimestamp: Date.parse("2026-05-08T11:10:00.000Z"),
      sourceUpdatedAt: Date.parse("2026-05-08T11:00:00.000Z"),
    },
  );

  assert.equal(merged.customerSelection.status, "approved_signed");
  assert.equal(merged.customerApproval.status, "approved_signed");
  assert.equal(merged.customerApproval.typedSignature, "Homeowner");
  assert.equal(merged.status, "accepted_deposit_due");
});

test("saveCloudProposal does not wipe portal fields while persisting residential pricing and images", async () => {
  let updatePayload = null;
  const cloudRow = createProposalRow(
    {
      customerSelection: {
        status: "submitted",
        submittedAt: "2026-05-08T10:05:00.000Z",
        selectedAddOnIds: ["walls"],
        selectedTotal: 50000,
      },
      customerShareEnabled: true,
      customerShareToken: "lyp_public",
      customerShareLastViewedAt: "2026-05-08T10:06:00.000Z",
      updatedAt: "2026-05-08T10:05:00.000Z",
    },
    { updated_at: "2026-05-08T10:05:00.000Z" },
  );
  cloudRow.company_id = "company-1";
  const supabaseClient = createFakeSupabase({
    rows: [cloudRow],
    onUpdate(payload) {
      updatePayload = payload;
    },
  });
  const localProposal = {
    id: "proposal-1",
    proposalMode: "residential",
    residentialPdfLayout: "simple_estimate",
    updatedAt: "2026-05-08T10:00:00.000Z",
    customerSelection: { status: "none" },
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: {
        name: "Base Package",
        price: 40000,
        images: [{ id: "image-1", publicUrl: "https://cdn.example/base.jpg", caption: "Existing Area" }],
      },
      optionalAddOns: [
        {
          id: "walls",
          name: "Walls",
          amount: 10000,
          images: [{ id: "image-2", storagePath: "option-photos/walls.jpg", publicUrl: "https://cdn.example/walls.jpg" }],
        },
      ],
    },
    residentialLegalPapers: {
      termsAndConditions: { status: "provided_separately", includedInPdf: false },
    },
  };

  const savedProposal = await saveCloudProposal("company-1", localProposal, {
    ...cloudDeps,
    supabaseClient,
  });

  assert.equal(savedProposal.customerSelection.status, "submitted");
  assert.equal(savedProposal.customerSelection.selectedTotal, 50000);
  assert.equal(savedProposal.customerShareToken, "lyp_public");
  assert.equal(savedProposal.customerShareLastViewedAt, "2026-05-08T10:06:00.000Z");
  assert.equal(savedProposal.pricing.basePackage.images[0].publicUrl, "https://cdn.example/base.jpg");
  assert.equal(savedProposal.pricing.optionalAddOns[0].images[0].storagePath, "option-photos/walls.jpg");
  assert.equal(savedProposal.residentialLegalPapers.termsAndConditions.status, "provided_separately");
  assert.equal(updatePayload.proposal_data.customerSelection.status, "submitted");
  assert.equal(updatePayload.status, "draft");
  assert.ok(updatePayload.updated_at);
});

test("fetchCloudProposalById hydrates full customer portal data for signed-in proposal opens", async () => {
  const row = createProposalRow({
    customerSelection: {
      status: "submitted",
      submittedAt: "2026-05-08T10:05:00.000Z",
      selectedTotal: 50000,
    },
    customerApproval: {
      status: "approved_signed",
      approvedAt: "2026-05-08T11:00:00.000Z",
      acceptedTotal: 50000,
    },
    pricing: {
      pricingMode: "base_plus_addons",
      basePackage: { price: 40000 },
      optionalAddOns: [{ id: "walls", amount: 10000 }],
    },
    residentialLegalPapers: {
      informationNoticeToOwner: { status: "needs_review" },
    },
  });
  row.company_id = "company-1";

  const proposal = await fetchCloudProposalById("company-1", "proposal-1", {
    ...cloudDeps,
    supabaseClient: createFakeSupabase({ rows: [row] }),
  });

  assert.equal(proposal.id, "proposal-1");
  assert.equal(proposal.customerSelection.status, "submitted");
  assert.equal(proposal.customerApproval.status, "approved_signed");
  assert.equal(proposal.pricing.optionalAddOns[0].amount, 10000);
  assert.equal(proposal.residentialLegalPapers.informationNoticeToOwner.status, "needs_review");
});

test("cloud proposal row status keeps workflow status inside proposal data while using compatible row status", () => {
  assert.equal(getCloudProposalRowStatus("customer_selection_submitted"), "sent");
  assert.equal(getCloudProposalRowStatus("awaiting_customer_approval"), "sent");
  assert.equal(getCloudProposalRowStatus("accepted_deposit_due"), "approved");
  assert.equal(getCloudProposalRowStatus("draft"), "draft");
  assert.equal(getCloudProposalRowStatus("unexpected_new_status"), "draft");
});

test("saveCloudProposal persists accepted workflow status without putting it in the table row status", async () => {
  let updatePayload = null;
  const cloudRow = createProposalRow({ status: "awaiting_customer_approval" });
  cloudRow.company_id = "company-1";

  await saveCloudProposal(
    "company-1",
    {
      id: "proposal-1",
      status: "accepted_deposit_due",
      updatedAt: "2026-05-08T12:00:00.000Z",
      customerApproval: { status: "approved_signed", approvedAt: "2026-05-08T12:00:00.000Z" },
    },
    {
      ...cloudDeps,
      supabaseClient: createFakeSupabase({
        rows: [cloudRow],
        onUpdate(payload) {
          updatePayload = payload;
        },
      }),
    },
  );

  assert.equal(updatePayload.proposal_data.status, "accepted_deposit_due");
  assert.equal(updatePayload.status, "approved");
});

test("saveCloudProposal retries with compatible row payload when optional schema columns are missing", async () => {
  const proposalId = "proposal-compatible-row";
  const insertPayloads = [];

  await saveCloudProposal(
    "company-1",
    {
      id: proposalId,
      status: "draft",
      updatedAt: "2026-05-08T12:00:00.000Z",
    },
    {
      ...cloudDeps,
      supabaseClient: createFakeSupabase({
        onInsert(payload) {
          insertPayloads.push(payload);
        },
        insertResults: [
          {
            error: {
              code: "PGRST204",
              message: "Could not find the 'packet_mode' column of 'proposals' in the schema cache",
            },
          },
          { error: null },
        ],
      }),
    },
  );

  assert.equal(insertPayloads.length, 2);
  assert.equal(insertPayloads[0].packet_mode, "summary");
  assert.equal("packet_mode" in insertPayloads[1], false);
  assert.equal(insertPayloads[1].proposal_data.id, proposalId);
});

test("formatCloudProposalSaveError returns safe actionable reasons", () => {
  assert.match(
    formatCloudProposalSaveError({ message: "new row violates row-level security policy for table proposals", code: "42501" }).message,
    /RLS permission denied/,
  );
  assert.equal(
    formatCloudProposalSaveError({ message: "No API key found in request", code: "401" }).reason,
    "missing-env-config",
  );
  assert.equal(
    formatCloudProposalSaveError({ message: "Could not find the 'proposal_type' column of 'proposals' in the schema cache", code: "PGRST204" }).reason,
    "schema-column-missing",
  );
  assert.equal(
    formatCloudProposalSaveError({ message: "Request Entity Too Large", status: 413 }).reason,
    "json-too-large",
  );
});
