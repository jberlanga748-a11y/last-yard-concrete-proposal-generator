import assert from "node:assert/strict";
import test from "node:test";

import { getAuthGateState, getLogoutCleanupState, isDevelopmentLocalMode } from "./authSession.js";

test("production logged-out dashboard access is gated behind login", () => {
  const gate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: false,
    route: { view: "dashboard", path: "/dashboard" },
  });

  assert.equal(gate.canRenderProtectedContent, false);
  assert.equal(gate.shouldShowLogin, true);
  assert.equal(gate.reason, "production-sign-in-required");
});

test("production logged-out proposal list does not render protected proposal data", () => {
  const gate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: false,
    route: { view: "list", path: "/proposals" },
  });

  assert.equal(gate.canRenderProtectedContent, false);
  assert.equal(gate.shouldShowLogin, true);
});

test("production logged-out blank residential route does not render editor", () => {
  const gate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: false,
    route: { view: "new", path: "/proposals/new/blank/residential", blank: true, blankMode: "residential" },
  });

  assert.equal(gate.canRenderProtectedContent, false);
  assert.equal(gate.shouldShowLogin, true);
});

test("production logged-out print route does not render proposal PDF content", () => {
  const gate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: false,
    route: { view: "print", id: "proposal-123", path: "/proposals/proposal-123/print" },
  });

  assert.equal(gate.canRenderProtectedContent, false);
  assert.equal(gate.shouldShowLogin, true);
});

test("production auth loading state does not render protected content", () => {
  const gate = getAuthGateState({
    authLoading: true,
    authUser: null,
    isDev: false,
    route: { view: "dashboard", path: "/dashboard" },
  });

  assert.equal(gate.canRenderProtectedContent, false);
  assert.equal(gate.shouldShowAuthLoading, true);
  assert.equal(gate.shouldShowLogin, false);
});

test("production signed-in users can render protected routes", () => {
  const gate = getAuthGateState({
    authLoading: false,
    authUser: { id: "user-123", email: "estimator@example.com" },
    isDev: false,
    route: { view: "dashboard", path: "/dashboard" },
  });

  assert.equal(gate.canRenderProtectedContent, true);
  assert.equal(gate.shouldShowAuthLoading, false);
  assert.equal(gate.shouldShowLogin, false);
  assert.equal(gate.reason, "signed-in");
});

test("development local mode can render protected content only in development", () => {
  assert.equal(isDevelopmentLocalMode({ isDev: true }), true);
  assert.equal(isDevelopmentLocalMode({ isDev: false }), false);

  const developmentGate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: true,
    route: { view: "dashboard", path: "/dashboard" },
  });

  const productionGate = getAuthGateState({
    authLoading: false,
    authUser: null,
    isDev: false,
    route: { view: "dashboard", path: "/dashboard" },
  });

  assert.equal(developmentGate.canRenderProtectedContent, true);
  assert.equal(developmentGate.localDevelopmentMode, true);
  assert.equal(productionGate.canRenderProtectedContent, false);
  assert.equal(productionGate.localDevelopmentMode, false);
});

test("logout cleanup plan clears active editor and Smart Paste state", () => {
  const cleanup = getLogoutCleanupState();

  assert.equal(cleanup.routePath, "/login");
  assert.equal(cleanup.proposalDirty, false);
  assert.equal(cleanup.smartPasteNotes, "");
  assert.equal(cleanup.smartPasteResult, null);
  assert.equal(cleanup.pendingSmartPasteProposal, null);
  assert.equal(cleanup.bidEditorOpen, false);
  assert.equal(cleanup.bidSmartPasteNotes, "");
  assert.equal(cleanup.contactEditorOpen, false);
  assert.equal(cleanup.aiProposalNotes, "");
  assert.equal(cleanup.assetUploadMessage, "");
});
