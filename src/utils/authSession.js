export function isDevelopmentLocalMode({ isDev = false } = {}) {
  return Boolean(isDev);
}

export function getAuthGateState({ authLoading = false, authUser = null, isDev = false, route = {} } = {}) {
  const localDevelopmentMode = isDevelopmentLocalMode({ isDev });

  if (route.view === "customerPortal" || route.public === true) {
    return {
      canRenderProtectedContent: true,
      localDevelopmentMode,
      publicRoute: true,
      reason: "public-customer-portal",
      routePath: route.path || "/proposal-view",
      shouldShowAuthLoading: false,
      shouldShowLogin: false,
    };
  }

  // Local/offline mode is intentionally restricted to development builds. A production
  // deployment must have a signed-in Supabase user before protected content renders.
  if (localDevelopmentMode) {
    return {
      canRenderProtectedContent: true,
      localDevelopmentMode,
      reason: "development-local-mode",
      routePath: route.path || "/dashboard",
      shouldShowAuthLoading: false,
      shouldShowLogin: false,
    };
  }

  if (authLoading) {
    return {
      canRenderProtectedContent: false,
      localDevelopmentMode,
      reason: "auth-loading",
      routePath: route.path || "/dashboard",
      shouldShowAuthLoading: true,
      shouldShowLogin: false,
    };
  }

  if (!authUser?.id) {
    return {
      canRenderProtectedContent: false,
      localDevelopmentMode,
      reason: "production-sign-in-required",
      routePath: route.path || "/dashboard",
      shouldShowAuthLoading: false,
      shouldShowLogin: true,
    };
  }

  return {
    canRenderProtectedContent: true,
    localDevelopmentMode,
    reason: "signed-in",
    routePath: route.path || "/dashboard",
    shouldShowAuthLoading: false,
    shouldShowLogin: false,
  };
}

export function getLogoutCleanupState() {
  return {
    aiProposalLoading: "",
    aiProposalMessage: "",
    aiProposalNotes: "",
    aiProposalResult: null,
    assetUploadMessage: "",
    backupMessage: "",
    bidEditorOpen: false,
    bidMessage: "",
    bidSmartPasteNotes: "",
    bidSmartPasteResult: null,
    contactEditorOpen: false,
    contactMessage: "",
    pendingSmartPasteProposal: null,
    proposalDirty: false,
    routePath: "/login",
    saveMessage: "",
    smartPasteNotes: "",
    smartPasteResult: null,
    validationNotice: "",
  };
}
