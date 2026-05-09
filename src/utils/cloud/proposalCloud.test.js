import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCloudProposalById,
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

function createFakeSupabase({ rows = [], onUpdate = () => {}, onInsert = () => {}, onUpsert = () => {} } = {}) {
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
              return { error: null };
            },
          };
        },
        async insert(payload) {
          onInsert(payload);
          return { error: null };
        },
        async upsert(payload) {
          onUpsert(payload);
          return { error: null };
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
