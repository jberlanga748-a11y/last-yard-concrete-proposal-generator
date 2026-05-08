import { Component, useEffect, useState } from "react";
import { ActivityLogView } from "./components/activity/ActivityLogView.jsx";
import { LoginView } from "./components/auth/LoginView.jsx";
import { BackupRestorePanel } from "./components/backup/BackupRestorePanel.jsx";
import { BackupView } from "./components/backup/BackupView.jsx";
import { Badge, StatusBadge } from "./components/common/Badges.jsx";
import { CloudStatusCard } from "./components/settings/CloudStatusCard.jsx";
import { TeamAccessPanel } from "./components/settings/TeamAccessPanel.jsx";
import { AppChrome } from "./components/shell/AppChrome.jsx";
import { LocalModeBanner } from "./components/shell/LocalModeBanner.jsx";
import { ProposalPreview } from "./components/proposalPacket/ProposalPacket.jsx";
import { ProposalPrintToolbar } from "./components/proposalPacket/ProposalPrintToolbar.jsx";
import {
  LINE_ITEM_UNITS,
  PACKET_BUILDER_SECTIONS,
  PRICING_SECTION_TYPES,
  PRICE_LIBRARY_CATEGORIES,
  PROPOSAL_TEMPLATES,
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  SEED_PROPOSAL,
  applyTemplateToProposal,
  calculateProposalTotals,
  createPriceLibraryLineItem,
  formatCurrency,
  generateProposalNumber,
  getDefaultPriceLibrary,
  hasProposalDraftPlaceholders,
  normalizePacketBuilder,
  normalizePriceLibrary,
  normalizePriceLibraryItem,
  proposalPlaceholderWarning,
  validateProposalCompleteness,
} from "./proposalData.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { canManageTeamAccess, formatTeamRole } from "./utils/cloud/teamAccess.js";
import { canUseCloudSync, getCloudReadyMessage, getCloudSignInMessage } from "./utils/cloud/cloudSync.js";
import {
  createCloudTeamInvite,
  deactivateCloudTeamMember,
  ensureCloudCompany,
  fetchCloudTeamMembers,
  loadOrSeedCloudCompanySettings,
  saveCloudCompanySettings,
} from "./utils/cloud/companyCloud.js";
import {
  deleteCloudContact,
  loadOrSeedCloudContacts,
  replaceCloudContacts,
  saveCloudContact,
} from "./utils/cloud/contactCloud.js";
import {
  fetchCloudProposals,
  loadOrMergeCloudProposals,
  mergeProposalCollections,
  saveCloudProposal,
  saveCloudProposals,
} from "./utils/cloud/proposalCloud.js";
import {
  createLocalImageAsset,
  formatStorageUploadError,
  getActiveSupabaseUser,
  getAssetLocalStorageReason,
  getImageAssetLabel,
  getImageAssetSource,
  getStoragePublicUrl,
  isDataUrl,
  prepareImageFileForUpload,
  proposalAssetsBucket,
  sanitizeStoragePathSegment,
  uploadProposalAssetToCloud,
  uploadSubmittedPacketPdfToCloud,
  validatePdfUploadFile,
} from "./utils/cloud/storageCloud.js";
import { formatAssetFileSize, formatCloudSyncTime, formatDashboardDate, formatDisplayDate, formatOptionLabel } from "./utils/formatting/display.js";
import { applyAiProposalResultToProposal, normalizeAiProposalResult, summarizeAiProposalResult } from "./utils/aiProposal/aiProposalNormalizer.js";
import { parseBidSmartPasteNotes } from "./utils/smartPaste/bidSmartPasteParser.js";
import {
  extractSmartPasteCoverFieldsFromNotes,
  firstSmartPasteText,
  mergeSmartPasteCoverValues,
  summarizeSmartPasteCoverValues,
} from "./utils/smartPaste/smartPasteCoverFields.js";
import { parseSmartPasteNotes } from "./utils/smartPaste/smartPasteParser.js";
import {
  cleanPrintablePlanSheets,
  cleanPrintablePricingSections,
  cleanPrintablePricingSummaryRows,
  cleanPrintableScopeSections,
  cleanPrintableStructuredRows,
  cleanPrintableTextBlock,
  cleanPrintableTextList,
  hasPrintableText,
} from "./utils/proposalPacket/printContentCleanup.js";
import {
  formatResidentialCurrency,
  hasResidentialChooseOnePricing,
  hasResidentialOptionBreakdowns,
  normalizeResidentialOptionImages,
  normalizeResidentialScheduleOfValues,
  removeResidentialItemImage,
} from "./utils/proposalPacket/residentialPricing.js";
import {
  PROPOSAL_PDF_BODY_TEXT_SIZE_LABELS,
  PROPOSAL_PDF_BODY_TEXT_SIZE_OPTIONS,
  PROPOSAL_PDF_HEADING_STYLE_LABELS,
  PROPOSAL_PDF_HEADING_STYLE_OPTIONS,
  PROPOSAL_PDF_PRICING_EMPHASIS_LABELS,
  PROPOSAL_PDF_PRICING_EMPHASIS_OPTIONS,
  PROPOSAL_PDF_TONE_LABELS,
  PROPOSAL_PDF_TONE_OPTIONS,
  getDefaultProposalPdfStyleSettings,
  getProposalPdfStyleForMode,
  normalizeProposalPdfStyle,
  normalizeProposalPdfStyleSettings,
} from "./utils/proposalPacket/proposalPdfStyle.js";
import {
  DEFAULT_PROPOSAL_MODE,
  getBlankProposalModeOptions,
  getBlankProposalModePath,
  getPacketModeForProposalMode,
  getProposalModeFromBlankSlug,
  getProposalModeLabel,
  getProposalTypeForMode,
  inferProposalModeFromProposal,
  isGcPrimePacketMode,
  isResidentialProposalMode,
  normalizeProposalMode,
} from "./utils/proposals/proposalModes.js";
import {
  cleanSmartPasteBaseProposal,
  cleanTrueBlankProposalState,
  getSmartPasteFieldChangeSummary,
} from "./utils/proposals/proposalDraftCleanup.js";
import {
  activityLogStorageKey,
  createActivityRecord,
  getActivityDisplayMeta,
  getActivityLogFromSettings,
  loadActivityLogFromLocalStorage,
  normalizeActivityLog,
  saveActivityLogToLocalStorage,
} from "./utils/activityLog.js";
import { getAuthGateState, getLogoutCleanupState } from "./utils/authSession.js";
import {
  getPermissionRoleLabel,
  getRolePermissions,
  hasRolePermission,
  normalizePermissionRole,
  permissionDeniedMessage,
} from "./utils/permissions.js";

const logoSrc = "/assets/last-yard-logo.jpg";
const storageKey = "last-yard-proposals-v1";
const companySettingsStorageKey = "last-yard-company-settings-v1";
const contactsStorageKey = "last-yard-contacts-v1";
const priceLibraryStorageKey = "last-yard-price-library-v1";
const bidsStorageKey = "last-yard-bids-v1";
const backupVersion = "1.0";
const backupSource = "Last Yard Proposal Generator";
const demoContactId = "demo-contact-abc-prime-contractors";
const demoGcProposalId = "demo-proposal-settlemier-park-gc-packet";
const demoSimpleProposalId = "demo-proposal-residential-driveway";
const demoMetadata = {
  isDemo: true,
  source: "client-ready-demo",
};
const cloudLocalOnlyLabel = "Local only";
const cloudNeedsSyncLabel = "Needs sync";
const cloudSyncedLabel = "Synced";
const cloudSignInLabel = "Sign in to sync proposals, contacts, and settings";
const cloudSyncErrorLabel = "Sync error";
const SENT_METHODS = ["", "Email", "Text", "In Person", "Portal Upload", "Other"];
const SUBMITTED_PACKET_STATUSES = ["generated", "sent", "superseded", "approved", "rejected"];
const BID_STATUSES = [
  "New",
  "Reviewing",
  "Bid / No-Bid",
  "Estimating",
  "Proposal Started",
  "Submitted",
  "Follow-Up",
  "Awarded",
  "Lost",
  "No-Bid",
];
const BID_PRIORITIES = ["Low", "Medium", "High", "Must Bid"];
const CONTACT_TYPES = [
  "",
  "GC / Prime",
  "Commercial Client",
  "Residential Client",
  "Property Manager",
  "Builder",
  "Other",
];

const PROPOSAL_PDF_STYLE_MODE_OPTIONS = [
  {
    mode: "residential",
    helper: "Larger, friendlier customer proposal defaults with bolder pricing.",
  },
  {
    mode: "commercial_subcontractor",
    helper: "GC-facing proposal defaults with strong headings and clear pricing.",
  },
  {
    mode: "gc_prime_packet",
    helper: "Technical packet defaults that keep dense tables readable.",
  },
];

const EMAIL_TEMPLATE_OPTIONS = [
  ["gc_prime_submission", "GC / Prime proposal submission"],
  ["revised_submission", "Revised proposal submission"],
  ["rfi_follow_up", "RFI / clarification follow-up"],
  ["submitted_follow_up", "Follow-up after submitted proposal"],
  ["no_bid_decline", "No-bid / decline politely"],
];

const companyCloudDeps = {
  getDefaultCompanySettings,
  normalizeCompanySettings,
};

const contactCloudDeps = {
  normalizeContact,
};

const proposalCloudDeps = {
  createProposalId,
  getProposalTimestamp,
  normalizeProposal: createEditableProposal,
};

const proposalCloudStatusLabels = {
  needsSyncLabel: cloudNeedsSyncLabel,
  syncedLabel: cloudSyncedLabel,
};

const proposalPacketHelpers = {
  buildAppendixPlan,
  buildConcreteSpecRows,
  buildGcPrimeRows,
  buildStructuredPacketPages,
  buildTermsCopy,
  getPacketBuilderSectionStatus,
  formatPricingSectionAmount,
  formatQuantity,
  formatRevisionLabel,
  formatStructuredCell,
  getEnabledPlanSheets,
  getImageAssetSource,
  normalizePlanSheetNotes,
  normalizePacketBuilder,
  normalizeProjectPhotos,
  splitAppendixText,
  toEditableNumber,
};

const defaultProjectPhotos = [
  { label: "Architectural Steps", src: "" },
  { label: "Finished Flatwork", src: "" },
  { label: "Control Joints", src: "" },
];
const maxImageBatchSize = 10;

const PLAN_SHEET_PAGE_TYPES = ["plan_takeoff_sheet", "detail_notes", "shade_footing_estimate", "general_backup"];

const defaultPlanSheets = [
  {
    matchKey: "l102",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L102 Materials Plan West",
    subtitle: "L102 Materials Plan West",
    imageSrc: "",
    calculationTitle: "L102 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l103",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L103 Materials Plan East",
    subtitle: "L103 Materials Plan East",
    imageSrc: "",
    calculationTitle: "L103 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l104",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - L104 Materials Play Area Enlargement",
    subtitle: "L104 Materials Play Area Enlargement",
    imageSrc: "",
    calculationTitle: "L104 Takeoff Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "sport-courts-l203",
    enabled: false,
    pageType: "plan_takeoff_sheet",
    title: "Plan Takeoff Sheet - Sport Courts / L203",
    subtitle: "Sport Courts / L203",
    imageSrc: "",
    calculationTitle: "Sport Court Alternate",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l601",
    enabled: false,
    pageType: "detail_notes",
    title: "L601 Detail Notes",
    subtitle: "Construction Detail Notes",
    imageSrc: "",
    calculationTitle: "Detail Notes",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "l602",
    enabled: false,
    pageType: "detail_notes",
    title: "L602 Fence / Site Furnishing Notes",
    subtitle: "Fence / Site Furnishing Notes",
    imageSrc: "",
    calculationTitle: "Detail Notes",
    calculationNotes: [],
    clarificationNotes: [],
  },
  {
    matchKey: "shade-footing-estimate",
    enabled: false,
    pageType: "shade_footing_estimate",
    title: "Shade Footing Estimate",
    subtitle: "Concrete Footing Backup",
    imageSrc: "",
    calculationTitle: "Estimate Basis",
    calculationNotes: [],
    clarificationNotes: [],
  },
];

const defaultGcPacketTables = {
  pricingSummary: {
    enabled: false,
    presentationNotes: "",
    rows: [],
  },
  scheduleOfValues: {
    enabled: false,
    rows: [],
  },
  takeoffQuantities: {
    enabled: false,
    rows: [],
  },
  shadeFootingEstimate: {
    enabled: false,
    rows: [],
  },
  proposalNotes: {
    enabled: false,
    proposalBasis: "",
    contractScopeControl: "",
    acceptanceSummary: "",
    gcPrimeReviewer: "",
  },
};

const gcPacketTableLabels = {
  pricingSummary: "Pricing Summary",
  proposalNotes: "Proposal Notes / Acceptance Summary",
  scheduleOfValues: "Schedule of Values",
  shadeFootingEstimate: "Shade Footing Estimate",
  takeoffQuantities: "Takeoff Quantities",
};

const gcPacketRowFields = {
  scheduleOfValues: [
    ["item", "Item"],
    ["description", "Description"],
    ["pricingBasis", "Pricing Basis"],
    ["amount", "Amount"],
  ],
  takeoffQuantities: [
    ["item", "Item"],
    ["quantity", "Quantity"],
    ["detailSize", "Detail / Size"],
    ["netCy", "Net CY"],
    ["cyWithTenPercent", "CY with 10%"],
    ["priceStatus", "Price / Status"],
  ],
  shadeFootingEstimate: [
    ["column", "Column"],
    ["columnSize", "Column Size"],
    ["estimatedSpreadFooting", "Estimated Spread Footing"],
    ["netCy", "Net CY"],
    ["estimatedSubtotal", "Estimated Subtotal"],
    ["estimatedCyWithTenPercent", "Estimated CY with 10%"],
    ["allowanceAmount", "Allowance Amount"],
    ["allowanceNote", "Allowance Note"],
  ],
};

export default function App() {
  const [companySettings, setCompanySettings] = useState(() => loadCompanySettings());
  const [settingsDraft, setSettingsDraft] = useState(() => loadCompanySettings());
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savedProposals, setSavedProposals] = useState(() => loadSavedProposals(loadCompanySettings()));
  const [savedContacts, setSavedContacts] = useState(() => loadSavedContacts());
  const [priceLibrary, setPriceLibrary] = useState(() => loadPriceLibrary());
  const [priceLibraryMessage, setPriceLibraryMessage] = useState("");
  const [savedBids, setSavedBids] = useState(() => loadSavedBids());
  const [activityLog, setActivityLog] = useState(() => loadActivityLogFromLocalStorage());
  const [bidDraft, setBidDraft] = useState(() => createEmptyBid());
  const [bidEditorOpen, setBidEditorOpen] = useState(false);
  const [bidMessage, setBidMessage] = useState("");
  const [bidSmartPasteNotes, setBidSmartPasteNotes] = useState("");
  const [bidSmartPasteResult, setBidSmartPasteResult] = useState(null);
  const [bidSearchQuery, setBidSearchQuery] = useState("");
  const [bidStatusFilter, setBidStatusFilter] = useState("all");
  const [bidPriorityFilter, setBidPriorityFilter] = useState("all");
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [proposalDraft, setProposalDraft] = useState(() =>
    getInitialProposalForRoute(parseRoute(window.location.pathname), loadSavedProposals(loadCompanySettings()), loadCompanySettings()),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saveMessage, setSaveMessage] = useState("");
  const [validationNotice, setValidationNotice] = useState("");
  const [smartPasteNotes, setSmartPasteNotes] = useState("");
  const [smartPasteResult, setSmartPasteResult] = useState(null);
  const [pendingSmartPasteProposal, setPendingSmartPasteProposal] = useState(null);
  const [aiProposalNotes, setAiProposalNotes] = useState("");
  const [aiProposalResult, setAiProposalResult] = useState(null);
  const [aiProposalMessage, setAiProposalMessage] = useState("");
  const [aiProposalLoading, setAiProposalLoading] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [contactDraft, setContactDraft] = useState(() => createEmptyContact());
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactTypeFilter, setContactTypeFilter] = useState("all");
  const [contactMessage, setContactMessage] = useState("");
  const [assetUploadMessage, setAssetUploadMessage] = useState("");
  const [storageDiagnostics, setStorageDiagnostics] = useState(() => createStorageDiagnosticsState());
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authMessage, setAuthMessage] = useState("");
  const [cloudSync, setCloudSync] = useState(() => createCloudSyncState());
  const [saveState, setSaveState] = useState(() => createSaveState());
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMessage, setTeamMessage] = useState("");
  const [proposalDirty, setProposalDirty] = useState(false);
  const company = proposalDraft.company;
  const isDashboardView = route.view === "dashboard";
  const isListView = route.view === "list";
  const isPrintView = route.view === "print";
  const isSettingsView = route.view === "settings";
  const isBackupView = route.view === "backup";
  const isContactsView = route.view === "contacts";
  const isLoginView = route.view === "login";
  const isPriceLibraryView = route.view === "priceLibrary";
  const isBidsView = route.view === "bids";
  const isActivityView = route.view === "activity";
  const isProposalDraftView = route.view === "new" || route.view === "edit";
  const authGate = getAuthGateState({ authLoading, authUser, isDev: import.meta.env.DEV, route });
  const permissionRole = normalizePermissionRole(authUser ? cloudSync.currentRole : authGate.localDevelopmentMode ? "local" : "viewer");
  const permissions = getRolePermissions(permissionRole);
  const permissionRoleLabel = getPermissionRoleLabel(permissionRole, { signedIn: Boolean(authUser) });
  const proposalValidation = getProposalValidationWithPacketPdfWarnings(proposalDraft);

  useEffect(() => {
    saveStoredProposals(savedProposals);
  }, [savedProposals]);

  useEffect(() => {
    saveStoredContacts(savedContacts);
  }, [savedContacts]);

  useEffect(() => {
    saveStoredPriceLibrary(priceLibrary);
  }, [priceLibrary]);

  useEffect(() => {
    saveStoredBids(savedBids);
  }, [savedBids]);

  useEffect(() => {
    saveActivityLogToLocalStorage(activityLog);
  }, [activityLog]);

  useEffect(() => {
    saveCompanySettings(companySettings);
  }, [companySettings]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      setAuthUser(null);
      setTeamMembers([]);
      setTeamMessage("Team access is available after Supabase is configured.");
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: "",
        contactsStatus: cloudLocalOnlyLabel,
        currentRole: "local",
        loading: false,
        message: "Cloud save is not configured. Proposals, contacts, and settings are stored locally.",
        proposalStatus: cloudLocalOnlyLabel,
        settingsStatus: cloudLocalOnlyLabel,
      }));
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthMessage(error.message);
      }

      setAuthUser(data.session?.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user || null;

      if (event === "SIGNED_OUT" && !nextUser) {
        resetSessionWorkspaceState();
      }

      setAuthUser(nextUser);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    if (!authUser) {
      setTeamMembers([]);
      setTeamMessage("Sign in to sync team access.");
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: "",
        contactsStatus: cloudLocalOnlyLabel,
        currentRole: "local",
        loading: false,
        message: cloudSignInLabel,
        proposalStatus: cloudLocalOnlyLabel,
        settingsStatus: cloudLocalOnlyLabel,
      }));
      return;
    }

    let isCancelled = false;

    initializeCloudSync(authUser, { isCancelled: () => isCancelled });

    return () => {
      isCancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (window.location.pathname !== route.path) {
      window.history.replaceState({}, "", route.path);
    }
  }, [route.path]);

  useEffect(() => {
    function handlePopState() {
      const nextRoute = parseRoute(window.location.pathname);

      if (
        proposalDirty &&
        isProposalRouteView(route.view) &&
        nextRoute.path !== route.path &&
        !window.confirm("You have unsaved proposal changes. Leave without saving?")
      ) {
        window.history.pushState({}, "", route.path);
        return;
      }

      setRoute(nextRoute);

      if (isProposalRouteView(nextRoute.view)) {
        resetProposalTransientState();
        if (nextRoute.blank) {
          clearTransientProposalDraftStorage();
        }
        setProposalDraft(getProposalDraftForRoute(nextRoute, savedProposals, companySettings));
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [companySettings, proposalDirty, route.path, route.view, savedProposals]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!proposalDirty || !isProposalRouteView(route.view)) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [proposalDirty, route.view]);

  useEffect(() => {
    setValidationNotice("");
    setSmartPasteNotes("");
    setSmartPasteResult(null);
    setPendingSmartPasteProposal(null);
    setAiProposalNotes("");
    setAiProposalResult(null);
    setAiProposalMessage("");
    setAiProposalLoading("");
    setBidSmartPasteResult(null);
    setBackupMessage("");
    setAssetUploadMessage("");
  }, [route.path]);

  useEffect(() => {
    function handlePrintShortcut(event) {
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p";

      if (
        !isPrintShortcut ||
        isDashboardView ||
        isListView ||
        isSettingsView ||
        isBackupView ||
        isContactsView ||
        isLoginView ||
        isActivityView ||
        isPriceLibraryView ||
        isBidsView
      ) {
        return;
      }

      const currentValidation = validateProposalCompleteness(proposalDraft);

      if (currentValidation.errors.length > 0) {
        event.preventDefault();
        setValidationNotice("Fix required fields before printing.");
      }
    }

    window.addEventListener("keydown", handlePrintShortcut);
    return () => window.removeEventListener("keydown", handlePrintShortcut);
  }, [isActivityView, isBackupView, isBidsView, isContactsView, isDashboardView, isListView, isLoginView, isPriceLibraryView, isSettingsView, proposalDraft]);

  useEffect(() => {
    if (validationNotice && proposalValidation.errors.length === 0) {
      setValidationNotice("");
    }
  }, [proposalValidation.errors.length, validationNotice]);

  function canCompleteProposal(action) {
    const currentValidation = validateProposalCompleteness(proposalDraft);

    if (currentValidation.errors.length > 0) {
      setValidationNotice(`Fix required fields before ${action}.`);
      return false;
    }

    setValidationNotice("");
    return true;
  }

  function canPerform(action, setMessage = setSaveMessage) {
    if (hasRolePermission(permissionRole, action)) {
      return true;
    }

    setMessage(permissionDeniedMessage);
    return false;
  }

  function recordActivity(event = {}) {
    const record = createActivityRecord(event, authUser);
    const baseSettings = event.settings || companySettings;
    const baseLog = Array.isArray(event.activityLog) ? event.activityLog : activityLog;
    const activityBids = Array.isArray(event.bids) ? event.bids : savedBids;
    const activityPriceLibrary = Array.isArray(event.priceLibrary) ? event.priceLibrary : priceLibrary;
    const nextLog = normalizeActivityLog([record, ...baseLog]);
    const settingsWithActivity = getSettingsWithPriceLibraryAndBids(baseSettings, activityPriceLibrary, activityBids, nextLog);

    setActivityLog(nextLog);
    setCompanySettings(settingsWithActivity);
    setSettingsDraft((currentSettings) => getSettingsWithPriceLibraryAndBids(currentSettings, activityPriceLibrary, activityBids, nextLog));

    if (canUseCloudSync(authUser)) {
      syncActivityLogToCloud(settingsWithActivity);
    }

    return {
      activityLog: nextLog,
      record,
      settings: settingsWithActivity,
    };
  }

  async function syncActivityLogToCloud(settingsWithActivity) {
    if (!canUseCloudSync(authUser)) {
      return false;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, settingsWithActivity, companyCloudDeps);
      await saveCloudCompanySettings(companyRecord.id, settingsWithActivity, "", companyCloudDeps);

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        settingsStatus: cloudSyncedLabel,
      }));
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        message: `Activity log sync failed: ${error.message}`,
        settingsStatus: cloudSyncErrorLabel,
      }));
      return false;
    }
  }

  function updateProposalField(path, value) {
    if (path === "status" && !canPerform("markProposalOutcome")) {
      return;
    }

    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const nextProposal = updateNestedValue(currentProposal, path, value);

      if (path === "proposalType") {
        nextProposal.type = value;
      }

      if (path === "proposalMode") {
        const proposalMode = normalizeProposalMode(value) || DEFAULT_PROPOSAL_MODE;
        nextProposal.proposalMode = proposalMode;
        nextProposal.proposalType = getProposalTypeForMode(proposalMode);
        nextProposal.type = nextProposal.proposalType;
        nextProposal.packetMode = getPacketModeForProposalMode(proposalMode);
        nextProposal.packetBuilder = isGcPrimePacketMode(proposalMode) ? normalizePacketBuilder(nextProposal.packetBuilder) : [];
        nextProposal.pdfStyle = getProposalPdfStyleForMode(companySettings.proposalPdfStyle, proposalMode);
      }

      if (path === "status") {
        return applyStatusTracking(nextProposal, value);
      }

      return nextProposal;
    });
  }

  function navigate(path, options = {}) {
    const nextRoute = parseRoute(path);

    if (
      !options.skipUnsavedCheck &&
      proposalDirty &&
      isProposalRouteView(route.view) &&
      nextRoute.path !== route.path &&
      !window.confirm("You have unsaved proposal changes. Leave without saving?")
    ) {
      return false;
    }

    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", path);
    setRoute(nextRoute);

    if (isProposalRouteView(nextRoute.view)) {
      resetProposalTransientState();
      if (nextRoute.blank) {
        clearTransientProposalDraftStorage();
      }

      setProposalDraft(getProposalDraftForRoute(nextRoute, savedProposals, companySettings, options.proposal));
    }

    return true;
  }

  function resetProposalTransientState({ clearSaveMessage = true } = {}) {
    setProposalDirty(false);
    setValidationNotice("");
    setSmartPasteNotes("");
    setSmartPasteResult(null);
    setPendingSmartPasteProposal(null);
    setAiProposalNotes("");
    setAiProposalResult(null);
    setAiProposalMessage("");
    setAiProposalLoading("");
    setAssetUploadMessage("");

    if (clearSaveMessage) {
      setSaveMessage("");
    }
  }

  function openProposal(proposalId) {
    const proposal = savedProposals.find((item) => item.id === proposalId);
    if (!proposal) {
      return;
    }

    navigate(`/proposals/${proposalId}`, { proposal });
  }

  function createNewProposal() {
    if (!canPerform("createProposal")) {
      return;
    }

    const proposal = createNewProposalDraft(savedProposals, companySettings);

    if (!navigate("/proposals/new", { proposal })) {
      return;
    }

    setSaveMessage("New Draft started. This draft starts with starter template data. Choose a template or edit fields before sending.");
    recordActivity({
      action: "Proposal created",
      entityType: "proposal",
      entityId: proposal.id,
      entityLabel: proposal.proposalNumber || proposal.project?.name || "New proposal",
    });
  }

  function createBlankProposal(mode = DEFAULT_PROPOSAL_MODE) {
    if (!canPerform("createProposal")) {
      return;
    }

    const proposal = createBlankProposalDraft(savedProposals, companySettings, mode);
    const path = getBlankProposalModePath(proposal.proposalMode);

    if (!navigate(path, { proposal })) {
      return;
    }

    setSaveMessage(`${getProposalModeLabel(proposal.proposalMode)} Blank Draft started. Add required fields before saving or printing.`);
  }

  function createNewProposalFromTemplate(templateId) {
    if (!canPerform("createProposal")) {
      return;
    }

    const proposal = createEditableProposal(applyTemplateToProposal(templateId, createNewProposalDraft(savedProposals, companySettings)));

    if (!navigate("/proposals/new", { proposal })) {
      return;
    }

    setSaveMessage(`New Draft started from the ${proposal.templateName || templateId} template.`);
    recordActivity({
      action: "Proposal created",
      entityType: "proposal",
      entityId: proposal.id,
      entityLabel: proposal.proposalNumber || proposal.project?.name || "New proposal",
      notes: `Template: ${templateId}`,
    });
  }

  function createNewGcPacket() {
    createNewProposalFromTemplate("gc_prime_full_packet");
  }

  function createNewCommercialProposal() {
    createNewProposalFromTemplate("commercial_flatwork");
  }

  function createNewResidentialProposal() {
    createNewProposalFromTemplate("driveway");
  }

  function loadDemoData({ open = "" } = {}) {
    if (!canPerform("createProposal")) {
      return;
    }

    if (authUser && !window.confirm("Load demo data locally? Demo records will not be pushed to cloud unless you sync them later.")) {
      return;
    }

    const demoContact = createDemoContact();
    const demoProposals = createDemoProposals(companySettings, savedProposals, demoContact.id);
    const nextContacts = upsertContact(savedContacts.filter((contact) => !isDemoRecord(contact)), demoContact);
    const nextProposals = demoProposals.reduce((proposals, proposal) => upsertProposal(proposals, proposal), savedProposals.filter((proposal) => !isDemoRecord(proposal)));

    setSavedContacts(nextContacts);
    setSavedProposals(nextProposals);
    markProposalsNeedCloudSync("Demo data loaded locally only. It will not sync to cloud unless you choose a sync action.");
    setSaveMessage("Demo data loaded locally. Real proposals and contacts were left untouched.");

    if (open === "print-gc") {
      navigate(`/proposals/${demoGcProposalId}/print`, { proposal: demoProposals[0], skipUnsavedCheck: true });
      return;
    }

    if (open === "gc") {
      navigate(`/proposals/${demoGcProposalId}`, { proposal: demoProposals[0], skipUnsavedCheck: true });
      return;
    }

    if (open === "simple") {
      navigate(`/proposals/${demoSimpleProposalId}`, { proposal: demoProposals[1], skipUnsavedCheck: true });
    }
  }

  function resetDemoData() {
    if (!canPerform("deleteProposal")) {
      return;
    }

    const demoProposalCount = savedProposals.filter(isDemoRecord).length;
    const demoContactCount = savedContacts.filter(isDemoRecord).length;

    if (demoProposalCount + demoContactCount === 0) {
      setSaveMessage("No demo records are loaded.");
      return;
    }

    if (!window.confirm(`Reset demo data? This removes only ${demoProposalCount} demo proposal(s) and ${demoContactCount} demo contact(s). Real records and cloud data are not deleted.`)) {
      return;
    }

    const nextProposals = savedProposals.filter((proposal) => !isDemoRecord(proposal));
    const nextContacts = savedContacts.filter((contact) => !isDemoRecord(contact));
    setSavedProposals(nextProposals);
    setSavedContacts(nextContacts);
    markProposalsNeedCloudSync("Demo records were removed locally only. Cloud data was not deleted.");
    setSaveMessage("Demo data reset. Real proposals, contacts, settings, and cloud data were left untouched.");

    if (isDemoRecord(proposalDraft)) {
      navigate("/dashboard", { skipUnsavedCheck: true });
    }
  }

  function openSampleProposal() {
    const sampleProposal = savedProposals.find((proposal) => proposal.id === demoGcProposalId);

    if (sampleProposal) {
      navigate(`/proposals/${demoGcProposalId}`, { proposal: sampleProposal });
      return;
    }

    loadDemoData({ open: "gc" });
  }

  function printSamplePacket() {
    const sampleProposal = savedProposals.find((proposal) => proposal.id === demoGcProposalId);

    if (sampleProposal) {
      navigate(`/proposals/${demoGcProposalId}/print`, { proposal: sampleProposal });
      return;
    }

    loadDemoData({ open: "print-gc" });
  }

  function applyProposalTemplate(templateId) {
    if (!canPerform("editProposal")) {
      return;
    }

    const template = PROPOSAL_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    const shouldConfirm = proposalDirty || Boolean(proposalDraft.templateId);

    if (shouldConfirm && !window.confirm(`Use the ${template.name} template? This will replace current scope, pricing, specifications, exclusions, assumptions, terms, and packet defaults.`)) {
      return;
    }

    setProposalDraft((currentProposal) => createEditableProposal(applyTemplateToProposal(templateId, currentProposal)));
    setSmartPasteNotes("");
    setSmartPasteResult(null);
    setAssetUploadMessage("");
    setProposalDirty(false);
    setSaveMessage(`Applied ${template.name} template.`);
  }

  function startBlankProposalFromTemplatePicker(mode = DEFAULT_PROPOSAL_MODE) {
    if (!canPerform("editProposal")) {
      return;
    }

    const proposal = createBlankProposalDraft(savedProposals, companySettings, mode);
    const path = getBlankProposalModePath(proposal.proposalMode);

    if (!navigate(path, { proposal, skipUnsavedCheck: true })) {
      return;
    }

    setSaveMessage(`${getProposalModeLabel(proposal.proposalMode)} Blank Draft started. Add required fields before saving or printing.`);
  }

  function refreshProposalTermsFromCompanyDefaults() {
    if (!canPerform("editProposal")) {
      return;
    }

    if (
      !window.confirm(
        "Refresh terms, exclusions, and GC scope-protection wording from Company Settings? This will replace the proposal-specific legal/default wording.",
      )
    ) {
      return;
    }

    setProposalDraft((currentProposal) =>
      createEditableProposal(applyCompanyLegalDefaultsToProposal(currentProposal, companySettings)),
    );
    setProposalDirty(true);
    setSaveMessage("Terms refreshed from company defaults. Review before sending.");
  }

  function updateSettingsDraft(field, value) {
    if (!canPerform("manageSettings", setSettingsMessage)) {
      return;
    }

    setSettingsDraft((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  }

  function saveSettings() {
    if (!canPerform("manageSettings", setSettingsMessage)) {
      return;
    }

    const normalizedSettings = getSettingsWithPriceLibraryAndBids(settingsDraft, priceLibrary, savedBids, activityLog);
    setCompanySettings(normalizedSettings);
    setSettingsDraft(normalizedSettings);
    setSettingsMessage(getCloudReadyMessage(authUser, "Company settings saved locally. Syncing to cloud...", "Company settings saved locally."));
    const activityResult = recordActivity({
      action: "Company settings changed",
      entityType: "settings",
      entityId: "company-settings",
      entityLabel: normalizedSettings.companyName || "Company settings",
      settings: normalizedSettings,
    });
    syncSettingsToCloud(activityResult.settings);
  }

  function resetSettingsDraft() {
    if (!canPerform("manageSettings", setSettingsMessage)) {
      return;
    }

    const defaults = getDefaultCompanySettings();
    setSettingsDraft(defaults);
    setSettingsMessage("Company settings reset to Last Yard defaults. Save to keep these defaults.");
  }

  async function initializeCloudSync(user, { isCancelled = () => false } = {}) {
    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Loading cloud proposals, contacts, and settings...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(user, getSettingsWithPriceLibraryAndBids(companySettings, priceLibrary, savedBids, activityLog), companyCloudDeps);

      if (isCancelled()) {
        return;
      }

      const settingsResult = await loadOrSeedCloudCompanySettings(
        companyRecord.id,
        getSettingsWithPriceLibraryAndBids(companySettings, priceLibrary, savedBids, activityLog),
        companyCloudDeps,
      );

      if (isCancelled()) {
        return;
      }

      const contactsResult = await loadOrSeedCloudContacts(companyRecord.id, savedContacts, contactCloudDeps);

      if (isCancelled()) {
        return;
      }

      const proposalsResult = await loadOrMergeCloudProposals(companyRecord.id, savedProposals, proposalCloudDeps, proposalCloudStatusLabels);
      const cloudTeamMembers = await fetchCloudTeamMembers(companyRecord.id);
      const syncedAt = new Date().toISOString();

      if (isCancelled()) {
        return;
      }

      const syncedPriceLibrary = getPriceLibraryFromSettings(settingsResult.settings, priceLibrary);
      const syncedBids = getBidsFromSettings(settingsResult.settings, savedBids);
      const syncedActivityLog = getActivityLogFromSettings(settingsResult.settings, activityLog);
      const syncedSettings = getSettingsWithPriceLibraryAndBids(settingsResult.settings, syncedPriceLibrary, syncedBids, syncedActivityLog);

      setPriceLibrary(syncedPriceLibrary);
      setSavedBids(syncedBids);
      setActivityLog(syncedActivityLog);
      setCompanySettings(syncedSettings);
      setSettingsDraft(syncedSettings);
      setSavedContacts(contactsResult.contacts);
      setSavedProposals(proposalsResult.proposals);
      setTeamMembers(cloudTeamMembers);
      setTeamMessage(
        cloudTeamMembers.length > 0
          ? `Loaded ${cloudTeamMembers.length} team member${cloudTeamMembers.length === 1 ? "" : "s"}.`
          : "Team access is ready. Add invited partners from Settings.",
      );

      if (isProposalRouteView(route.view)) {
        const syncedDraft = proposalsResult.proposals.find((proposal) => proposal.id === proposalDraft.id);

        if (syncedDraft) {
          setProposalDraft(syncedDraft);
        }
      }

      setCloudSync({
        companyId: companyRecord.id,
        contactsStatus: cloudSyncedLabel,
        currentRole: companyRecord.role || "owner",
        lastError: "",
        lastSyncedAt: syncedAt,
        loading: false,
        message: `${settingsResult.message} ${contactsResult.message} ${proposalsResult.message}`,
        proposalStatus: proposalsResult.status,
        settingsStatus: cloudSyncedLabel,
      });
      setAuthMessage("Signed in. Proposals, contacts, and company settings are syncing with Supabase.");
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudSyncErrorLabel,
        lastError: error.message,
        loading: false,
        message: `Cloud sync failed: ${error.message}`,
        proposalStatus: cloudSyncErrorLabel,
        settingsStatus: cloudSyncErrorLabel,
      }));
      setAuthMessage(`Cloud sync failed: ${error.message}`);
    }
  }

  async function syncSettingsToCloud(settings = companySettings) {
    const libraryForSettings = Array.isArray(settings?.priceLibrary) ? settings.priceLibrary : priceLibrary;
    const bidsForSettings = Array.isArray(settings?.bidPipeline) ? settings.bidPipeline : savedBids;
    const activityForSettings = Array.isArray(settings?.activityLog) ? settings.activityLog : activityLog;
    const normalizedSettings = getSettingsWithPriceLibraryAndBids(settings, libraryForSettings, bidsForSettings, activityForSettings);

    if (!canUseCloudSync(authUser)) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        message: getCloudSignInMessage(),
        settingsStatus: cloudLocalOnlyLabel,
      }));
      return false;
    }

    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Syncing company settings...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(authUser, normalizedSettings, companyCloudDeps);
      await saveCloudCompanySettings(companyRecord.id, normalizedSettings, "", companyCloudDeps);
      const syncedAt = new Date().toISOString();

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: syncedAt,
        loading: false,
        message: "Company settings synced to Supabase.",
        settingsStatus: cloudSyncedLabel,
      }));
      setSettingsMessage("Company settings saved locally and synced to Supabase.");
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        loading: false,
        message: `Settings sync failed: ${error.message}`,
        settingsStatus: cloudSyncErrorLabel,
      }));
      setSettingsMessage(`Company settings saved locally. Cloud sync failed: ${error.message}`);
      return false;
    }
  }

  async function syncContactsToCloud(contacts = savedContacts) {
    if (!canUseCloudSync(authUser)) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudLocalOnlyLabel,
        message: getCloudSignInMessage(),
      }));
      return false;
    }

    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Syncing contacts...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await replaceCloudContacts(companyRecord.id, contacts, contactCloudDeps);
      const syncedAt = new Date().toISOString();

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        contactsStatus: cloudSyncedLabel,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: syncedAt,
        loading: false,
        message: "Contacts synced to Supabase.",
      }));
      setContactMessage(`Synced ${contacts.length} contact${contacts.length === 1 ? "" : "s"} to Supabase.`);
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudSyncErrorLabel,
        lastError: error.message,
        loading: false,
        message: `Contacts sync failed: ${error.message}`,
      }));
      setContactMessage(`Contacts saved locally. Cloud sync failed: ${error.message}`);
      return false;
    }
  }

  async function syncSingleContactToCloud(contact) {
    if (!canUseCloudSync(authUser)) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudLocalOnlyLabel,
        message: getCloudSignInMessage(),
      }));
      return false;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await saveCloudContact(companyRecord.id, contact, contactCloudDeps);

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        contactsStatus: cloudSyncedLabel,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        message: "Contact synced to Supabase.",
      }));
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudSyncErrorLabel,
        lastError: error.message,
        message: `Contact sync failed: ${error.message}`,
      }));
      setContactMessage(`Contact saved locally. Cloud sync failed: ${error.message}`);
      return false;
    }
  }

  async function deleteSingleCloudContact(contactId) {
    if (!canUseCloudSync(authUser)) {
      return false;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await deleteCloudContact(companyRecord.id, contactId);

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        contactsStatus: cloudSyncedLabel,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        message: "Contact deleted from Supabase.",
      }));
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        contactsStatus: cloudSyncErrorLabel,
        lastError: error.message,
        message: `Cloud contact delete failed: ${error.message}`,
      }));
      setContactMessage(`Contact deleted locally. Cloud delete failed: ${error.message}`);
      return false;
    }
  }

  async function pullCloudData() {
    if (!canPerform("cloudSync", setSettingsMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setSettingsMessage(getCloudSignInMessage());
      setContactMessage(getCloudSignInMessage());
      return;
    }

    await initializeCloudSync(authUser);
  }

  async function pushLocalDataToCloud() {
    if (!canPerform("cloudSync", setSettingsMessage)) {
      return;
    }

    const normalizedSettings = getSettingsWithPriceLibraryAndBids(settingsDraft, priceLibrary, savedBids, activityLog);
    setCompanySettings(normalizedSettings);
    setSettingsDraft(normalizedSettings);
    await syncSettingsToCloud(normalizedSettings);
    await syncContactsToCloud(savedContacts);
    await pushLocalProposalsToCloud(savedProposals);
  }

  async function refreshTeamMembers() {
    if (!canPerform("manageTeam", setTeamMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setTeamMessage(getCloudSignInMessage());
      return;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      const members = await fetchCloudTeamMembers(companyRecord.id);

      setTeamMembers(members);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
      }));
      setTeamMessage(`Loaded ${members.length} team member${members.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setTeamMessage(`Team refresh failed: ${error.message}`);
    }
  }

  async function inviteTeamMember(inviteEmail, role) {
    if (!canPerform("manageTeam", setTeamMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setTeamMessage(getCloudSignInMessage());
      return;
    }

    if (!canManageTeamAccess(cloudSync.currentRole)) {
      setTeamMessage("Only owner/admin users can manage team access.");
      return;
    }

    try {
      const email = String(inviteEmail || "").trim().toLowerCase();

      if (!email || !email.includes("@")) {
        setTeamMessage("Enter a valid invite email.");
        return;
      }

      if (email === String(authUser.email || "").trim().toLowerCase()) {
        setTeamMessage("You are already the signed-in company user.");
        return;
      }

      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      const invitedMember = await createCloudTeamInvite(companyRecord.id, email, role);
      const members = await fetchCloudTeamMembers(companyRecord.id);

      setTeamMembers(members);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
      }));
      setTeamMessage(`Invited ${invitedMember.inviteEmail} as ${formatTeamRole(invitedMember.role)}.`);
      recordActivity({
        action: "Team member invited",
        entityType: "team",
        entityId: invitedMember.id,
        entityLabel: invitedMember.inviteEmail,
        notes: `Role: ${formatTeamRole(invitedMember.role)}`,
      });
    } catch (error) {
      setTeamMessage(`Invite failed: ${error.message}`);
    }
  }

  async function deactivateTeamMember(memberId) {
    if (!canPerform("manageTeam", setTeamMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setTeamMessage(getCloudSignInMessage());
      return;
    }

    if (!canManageTeamAccess(cloudSync.currentRole)) {
      setTeamMessage("Only owner/admin users can manage team access.");
      return;
    }

    const member = teamMembers.find((teamMember) => teamMember.id === memberId);

    if (member?.role === "owner") {
      setTeamMessage("The company owner cannot be deactivated from the app.");
      return;
    }

    if (!window.confirm("Deactivate this team member? This may affect local/cloud data access.")) {
      return;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await deactivateCloudTeamMember(companyRecord.id, memberId);
      const members = await fetchCloudTeamMembers(companyRecord.id);

      setTeamMembers(members);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
      }));
      setTeamMessage("Team member deactivated.");
      recordActivity({
        action: "Team member deactivated",
        entityType: "team",
        entityId: memberId,
        entityLabel: "Team member",
      });
    } catch (error) {
      setTeamMessage(`Deactivate failed: ${error.message}`);
    }
  }

  function markProposalsNeedCloudSync(message = "Local proposals changed. Push or sync proposals to update Supabase.") {
    setCloudSync((currentSync) => ({
      ...currentSync,
      message: canUseCloudSync(authUser) ? message : getCloudSignInMessage(),
      proposalStatus: canUseCloudSync(authUser) ? cloudNeedsSyncLabel : cloudLocalOnlyLabel,
    }));
  }

  async function syncSingleProposalToCloud(proposal, successMessage = "Proposal synced to Supabase.") {
    if (!canUseCloudSync(authUser)) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        message: getCloudSignInMessage(),
        proposalStatus: cloudLocalOnlyLabel,
      }));
      return false;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await saveCloudProposal(companyRecord.id, proposal, proposalCloudDeps);

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        message: `${successMessage} Legacy data URL images may still make cloud sync slower until they are replaced.`,
        proposalStatus: cloudSyncedLabel,
      }));
      setSaveState((currentState) => ({
        ...currentState,
        lastCloudSavedAt: new Date().toISOString(),
        lastSyncError: "",
      }));
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        message: `Proposal sync failed: ${error.message}`,
        proposalStatus: cloudSyncErrorLabel,
      }));
      setSaveState((currentState) => ({
        ...currentState,
        lastSyncError: error.message,
        status: "Saved locally, cloud sync failed",
      }));
      setSaveMessage(`Saved locally. Cloud sync failed: ${error.message}`);
      return false;
    }
  }

  async function syncMultipleProposalsToCloud(proposals, successMessage = "Proposals synced to Supabase.") {
    if (!canUseCloudSync(authUser)) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        message: getCloudSignInMessage(),
        proposalStatus: cloudLocalOnlyLabel,
      }));
      return false;
    }

    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Syncing proposals...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      await saveCloudProposals(companyRecord.id, proposals, proposalCloudDeps);

      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        loading: false,
        message: `${successMessage} Legacy data URL images may still make cloud sync slower until they are replaced.`,
        proposalStatus: cloudSyncedLabel,
      }));
      setSaveState((currentState) => ({
        ...currentState,
        lastCloudSavedAt: new Date().toISOString(),
        lastSyncError: "",
      }));
      return true;
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        loading: false,
        message: `Proposal sync failed: ${error.message}`,
        proposalStatus: cloudSyncErrorLabel,
      }));
      setSaveState((currentState) => ({
        ...currentState,
        lastSyncError: error.message,
      }));
      return false;
    }
  }

  async function pushLocalProposalsToCloud(proposals = savedProposals) {
    if (!canPerform("cloudSync", setSaveMessage)) {
      return false;
    }

    const synced = await syncMultipleProposalsToCloud(proposals, `Pushed ${proposals.length} local proposal${proposals.length === 1 ? "" : "s"} to Supabase.`);

    if (synced) {
      setSaveMessage(`Pushed ${proposals.length} proposal${proposals.length === 1 ? "" : "s"} to Supabase.`);
    }
  }

  async function pullCloudProposals() {
    if (!canPerform("cloudSync", setSaveMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setSaveMessage(getCloudSignInMessage());
      setCloudSync((currentSync) => ({
        ...currentSync,
        message: getCloudSignInMessage(),
        proposalStatus: cloudLocalOnlyLabel,
      }));
      return;
    }

    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Pulling cloud proposals...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      const cloudProposals = await fetchCloudProposals(companyRecord.id, proposalCloudDeps);
      const mergeResult = mergeProposalCollections(savedProposals, cloudProposals, proposalCloudDeps);
      const syncedAt = new Date().toISOString();

      setSavedProposals(mergeResult.proposals);
      syncDraftAfterProposalRestore(mergeResult.proposals);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: syncedAt,
        loading: false,
        message: mergeResult.warning || `Pulled ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"}.`,
        proposalStatus: mergeResult.needsSync ? cloudNeedsSyncLabel : cloudSyncedLabel,
      }));
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        loading: false,
        message: `Pull failed: ${error.message}`,
        proposalStatus: cloudSyncErrorLabel,
      }));
    }
  }

  async function syncProposalsNow() {
    if (!canPerform("cloudSync", setSaveMessage)) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setSaveMessage(getCloudSignInMessage());
      setCloudSync((currentSync) => ({
        ...currentSync,
        message: getCloudSignInMessage(),
        proposalStatus: cloudLocalOnlyLabel,
      }));
      return;
    }

    setCloudSync((currentSync) => ({
      ...currentSync,
      loading: true,
      message: "Syncing cloud and local proposals...",
    }));

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings, companyCloudDeps);
      const cloudProposals = await fetchCloudProposals(companyRecord.id, proposalCloudDeps);
      const mergeResult = mergeProposalCollections(savedProposals, cloudProposals, proposalCloudDeps);

      await saveCloudProposals(companyRecord.id, mergeResult.proposals, proposalCloudDeps);
      setSavedProposals(mergeResult.proposals);
      syncDraftAfterProposalRestore(mergeResult.proposals);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
        lastError: "",
        lastSyncedAt: new Date().toISOString(),
        loading: false,
        message: `${mergeResult.warning || "Cloud and local proposals are synced."} Legacy data URL images may still make cloud sync slower until they are replaced.`,
        proposalStatus: cloudSyncedLabel,
      }));
    } catch (error) {
      setCloudSync((currentSync) => ({
        ...currentSync,
        lastError: error.message,
        loading: false,
        message: `Proposal sync failed: ${error.message}`,
        proposalStatus: cloudSyncErrorLabel,
      }));
    }
  }

  function clearCloudSyncMessage() {
    setCloudSync((currentSync) => ({
      ...currentSync,
      lastError: "",
      message: "",
    }));
    setSaveState((currentState) => ({
      ...currentState,
      lastSyncError: "",
    }));
  }

  function startNewContact() {
    if (!canPerform("createContact", setContactMessage)) {
      return;
    }

    setContactDraft(createEmptyContact());
    setContactEditorOpen(true);
    setContactMessage("Ready for a new contact.");
    navigate("/contacts");
  }

  function editContact(contact) {
    if (!hasRolePermission(permissionRole, "editContact")) {
      setContactMessage("Viewing contact. You do not have permission to edit contacts.");
    } else {
      setContactMessage(`Editing ${formatContactName(contact)}.`);
    }

    setContactDraft(normalizeContact(contact));
    setContactEditorOpen(true);
  }

  function updateContactDraft(field, value) {
    if (!canPerform("editContact", setContactMessage)) {
      return;
    }

    setContactDraft((currentContact) => ({
      ...currentContact,
      [field]: value,
    }));
  }

  async function saveContact() {
    if (!canPerform("editContact", setContactMessage)) {
      return;
    }

    if (!contactEditorOpen) {
      setContactMessage("Select a contact to edit, or create a new contact.");
      return;
    }

    const normalizedContact = normalizeContact({
      ...contactDraft,
      updatedAt: new Date().toISOString(),
    });

    if (!hasTextValue(normalizedContact.companyName) && !hasTextValue(normalizedContact.contactName)) {
      setContactMessage("Enter a company name or contact name before saving.");
      return;
    }

    setSavedContacts((currentContacts) => upsertContact(currentContacts, normalizedContact));
    setContactDraft(normalizedContact);
    setContactMessage(getCloudReadyMessage(authUser, `Saved ${formatContactName(normalizedContact)} locally. Syncing to cloud...`, `Saved ${formatContactName(normalizedContact)} locally.`));
    recordActivity({
      action: savedContacts.some((contact) => contact.id === normalizedContact.id) ? "Contact updated" : "Contact created",
      entityType: "contact",
      entityId: normalizedContact.id,
      entityLabel: formatContactName(normalizedContact),
    });
    await syncSingleContactToCloud(normalizedContact);
  }

  async function deleteContact(contactId) {
    if (!canPerform("deleteContact", setContactMessage)) {
      return;
    }

    const contact = savedContacts.find((item) => item.id === contactId);

    if (!contact) {
      return;
    }

    const linkedCount = getProposalCountForContact(contactId, savedProposals);
    const suffix = linkedCount > 0 ? ` This will not delete ${linkedCount} linked proposal${linkedCount === 1 ? "" : "s"}.` : "";

    if (!window.confirm(`Delete ${formatContactName(contact)} from saved contacts? This may affect local/cloud data after sync.${suffix}`)) {
      return;
    }

    setSavedContacts((currentContacts) => currentContacts.filter((item) => item.id !== contactId));

    if (contactDraft.id === contactId) {
      setContactDraft(createEmptyContact());
      setContactEditorOpen(false);
    }

    setContactMessage(`Deleted ${formatContactName(contact)} from contacts. Linked proposals were left untouched.`);
    recordActivity({
      action: "Contact deleted",
      entityType: "contact",
      entityId: contact.id,
      entityLabel: formatContactName(contact),
    });
    await deleteSingleCloudContact(contactId);
  }

  function startNewBid() {
    if (!canPerform("createBid", setBidMessage)) {
      return;
    }

    setBidDraft(createEmptyBid());
    setBidEditorOpen(true);
    setBidMessage("Ready for a new bid opportunity.");
    setBidSmartPasteNotes("");
    setBidSmartPasteResult(null);
    navigate("/bids");
  }

  function editBid(bid) {
    if (!hasRolePermission(permissionRole, "editBid")) {
      setBidMessage("Viewing bid. You do not have permission to edit bids.");
    } else {
      setBidMessage(`Editing ${bid.projectName || "bid opportunity"}.`);
    }

    setBidDraft(normalizeBid(bid));
    setBidEditorOpen(true);
    setBidSmartPasteNotes("");
    setBidSmartPasteResult(null);
  }

  function updateBidDraft(field, value) {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    setBidDraft((currentBid) => {
      const nextBid = {
        ...currentBid,
        [field]: value,
      };

      if (field === "contactId") {
        const contact = savedContacts.find((item) => item.id === value);

        if (contact) {
          return applyContactToBid(nextBid, contact);
        }
      }

      return nextBid;
    });
  }

  function fillBidFromNotes() {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    const { bid: parsedBid, summary } = parseBidSmartPasteNotes(bidSmartPasteNotes, bidDraft);
    const hasUpdates =
      summary.fields.length > 0 ||
      summary.dates.length > 0 ||
      summary.contactInfo.length > 0 ||
      summary.unclearItems.length > 0;

    if (!hasUpdates) {
      setBidSmartPasteResult({
        ...summary,
        warnings: summary.warnings.length > 0 ? summary.warnings : ["No clearly labeled bid fields were found."],
      });
      setBidMessage("No clearly labeled bid fields were found.");
      return;
    }

    const normalizedBid = normalizeBid({
      ...parsedBid,
      updatedAt: new Date().toISOString(),
    });

    setBidDraft(normalizedBid);
    setBidEditorOpen(true);
    setBidSmartPasteResult(summary);
    setBidMessage("Filled bid fields from pasted notes. Review before saving.");
  }

  async function commitBids(nextBids, message = "Bid pipeline saved locally.") {
    const normalizedBids = normalizeBids(nextBids);
    const settingsWithBids = getSettingsWithPriceLibraryAndBids(companySettings, priceLibrary, normalizedBids, activityLog);

    setSavedBids(normalizedBids);
    setCompanySettings(settingsWithBids);
    setSettingsDraft((currentSettings) => getSettingsWithPriceLibraryAndBids(currentSettings, priceLibrary, normalizedBids, activityLog));
    setBidMessage(getCloudReadyMessage(authUser, `${message} Syncing to cloud settings...`, message));

    if (canUseCloudSync(authUser)) {
      const synced = await syncSettingsToCloud(settingsWithBids);
      setBidMessage(synced ? `${message} Synced to cloud settings.` : `${message} Cloud sync failed. See Settings for details.`);
    }
  }

  async function saveBid() {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    if (!bidEditorOpen) {
      setBidMessage("Select a bid to edit, or create a new bid.");
      return;
    }

    const normalizedBid = normalizeBid({
      ...bidDraft,
      updatedAt: new Date().toISOString(),
    });

    if (!hasBidDraftAnchor(normalizedBid)) {
      setBidMessage("Enter at least a project, location, owner/GC, scope, or notes before saving this bid.");
      return;
    }

    const warningMessage =
      bidSmartPasteResult?.warnings?.length > 0
        ? " Bid saved with missing-info warnings. You can complete these fields later."
        : "";
    const duplicateWarning = getBidDuplicateWarning(normalizedBid, savedBids);
    const duplicateMessage = duplicateWarning ? ` ${duplicateWarning}` : "";
    const existingBid = savedBids.find((bid) => bid.id === normalizedBid.id);

    if (existingBid && areBidsEquivalentForSave(existingBid, normalizedBid)) {
      setBidMessage("No changes to save.");
      return;
    }

    const nextBids = upsertBid(savedBids, normalizedBid);

    await commitBids(nextBids, `Saved ${normalizedBid.projectName || "bid opportunity"} locally.${warningMessage}${duplicateMessage}`);
    setBidDraft(normalizedBid);
    recordActivity({
      action: savedBids.some((bid) => bid.id === normalizedBid.id) ? "Bid updated" : "Bid created",
      entityType: "bid",
      entityId: normalizedBid.id,
      entityLabel: normalizedBid.projectName || "Bid opportunity",
      bids: nextBids,
      notes: normalizedBid.bidStatus,
    });
  }

  async function duplicateBid(bidId) {
    if (!canPerform("createBid", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);

    if (!bid) {
      return;
    }

    const now = new Date().toISOString();
    const duplicate = normalizeBid({
      ...bid,
      id: createProposalId(),
      projectName: `${bid.projectName || "Bid Opportunity"} Copy`,
      bidStatus: "New",
      proposalId: "",
      submittedPacketRecordId: "",
      createdAt: now,
      updatedAt: now,
    });

    const nextBids = upsertBid(savedBids, duplicate);
    await commitBids(nextBids, `Duplicated ${bid.projectName || "bid opportunity"} locally.`);
    setBidDraft(duplicate);
    setBidEditorOpen(true);
    recordActivity({
      action: "Bid created",
      entityType: "bid",
      entityId: duplicate.id,
      entityLabel: duplicate.projectName || "Bid opportunity",
      bids: nextBids,
      notes: "Duplicated from existing bid",
    });
  }

  async function updateBidStatus(bidId, bidStatus) {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);

    if (!bid) {
      return;
    }

    const nextBid = normalizeBid({
      ...bid,
      bidStatus,
      updatedAt: new Date().toISOString(),
    });

    const nextBids = upsertBid(savedBids, nextBid);
    await commitBids(nextBids, `Marked ${nextBid.projectName || "bid"} as ${bidStatus}.`);
    recordActivity({
      action: "Bid status changed",
      entityType: "bid",
      entityId: nextBid.id,
      entityLabel: nextBid.projectName || "Bid opportunity",
      bids: nextBids,
      notes: bidStatus,
    });

    if (bidDraft.id === bidId) {
      setBidDraft(nextBid);
    }
  }

  async function deleteBid(bidId) {
    if (!canPerform("deleteBid", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);

    if (!bid) {
      return;
    }

    if (!window.confirm(`Delete bid opportunity "${bid.projectName || "Untitled bid"}"? This may affect local/cloud data after sync.`)) {
      return;
    }

    const nextBids = savedBids.filter((item) => item.id !== bidId);
    await commitBids(nextBids, `Deleted ${bid.projectName || "bid opportunity"} locally.`);
    recordActivity({
      action: "Bid deleted",
      entityType: "bid",
      entityId: bid.id,
      entityLabel: bid.projectName || "Bid opportunity",
      bids: nextBids,
    });

    if (bidDraft.id === bidId) {
      setBidDraft(createEmptyBid());
      setBidEditorOpen(false);
    }
  }

  async function createProposalFromBid(bidId) {
    if (!canPerform("createProposal", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);

    if (!bid) {
      return;
    }

    const sourceContact = bid.contactId ? savedContacts.find((contact) => contact.id === bid.contactId) : null;
    const proposal = createEditableProposal(
      applyTemplateToProposal("gc_prime_full_packet", createNewProposalDraft(savedProposals, companySettings)),
    );
    const proposalFromBid = createEditableProposal({
      ...proposal,
      contactId: bid.contactId || "",
      client: {
        ...proposal.client,
        companyName: sourceContact?.companyName || bid.gcCompany || bid.ownerOrClient || proposal.client.companyName,
        contactName: sourceContact?.contactName || bid.contactName || proposal.client.contactName,
        email: sourceContact?.email || bid.contactEmail || proposal.client.email,
        phone: sourceContact?.phone || bid.contactPhone || proposal.client.phone,
        billingAddress: sourceContact?.billingAddress || proposal.client.billingAddress || "",
        projectAddress: sourceContact?.defaultProjectAddress || bid.projectLocation || proposal.client.projectAddress || "",
      },
      gcPrime: {
        ...proposal.gcPrime,
        gcName: bid.gcCompany || proposal.gcPrime.gcName,
        projectManagerName: bid.contactName || proposal.gcPrime.projectManagerName,
        projectManagerEmail: bid.contactEmail || proposal.gcPrime.projectManagerEmail,
        projectManagerPhone: bid.contactPhone || proposal.gcPrime.projectManagerPhone,
        rfiClarificationNotes: bid.missingInfo || proposal.gcPrime.rfiClarificationNotes,
      },
      project: {
        ...proposal.project,
        name: bid.projectName || proposal.project.name,
        location: bid.projectLocation || proposal.project.location,
        address: bid.projectLocation || proposal.project.address,
        description: bid.scopeSummary || bid.concreteScope || proposal.project.description,
        specialRequirements: bid.redFlags || proposal.project.specialRequirements,
      },
      proposalNotes: [bid.notes, bid.nextStep ? `Next step: ${bid.nextStep}` : ""].filter(hasTextValue).join("\n"),
      updatedAt: new Date().toISOString(),
    });
    const linkedBid = normalizeBid({
      ...bid,
      bidStatus: "Proposal Started",
      proposalId: proposalFromBid.id,
      updatedAt: new Date().toISOString(),
    });
    const nextProposals = upsertProposal(savedProposals, proposalFromBid);
    const nextBids = upsertBid(savedBids, linkedBid);

    setSavedProposals(nextProposals);
    await commitBids(nextBids, `Created proposal from ${bid.projectName || "bid"} locally.`);
    setBidDraft(linkedBid);
    navigate(`/proposals/${proposalFromBid.id}`, { proposal: proposalFromBid, skipUnsavedCheck: true });
    recordActivity({
      action: "Proposal created",
      entityType: "proposal",
      entityId: proposalFromBid.id,
      entityLabel: proposalFromBid.proposalNumber || proposalFromBid.project?.name || "Proposal",
      bids: nextBids,
      notes: `Created from bid: ${bid.projectName || bid.id}`,
    });
    await syncSingleProposalToCloud(proposalFromBid, "Proposal from bid synced to Supabase.");
  }

  async function linkBidToProposal(bidId, proposalId) {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);
    const proposal = savedProposals.find((item) => item.id === proposalId || item.proposalNumber === proposalId);

    if (!bid || !proposal) {
      setBidMessage("Choose a valid proposal to link.");
      return;
    }

    const linkedBid = normalizeBid({
      ...bid,
      proposalId: proposal.id,
      bidStatus: bid.bidStatus === "New" || bid.bidStatus === "Reviewing" ? "Proposal Started" : bid.bidStatus,
      updatedAt: new Date().toISOString(),
    });

    const nextBids = upsertBid(savedBids, linkedBid);
    await commitBids(nextBids, `Linked ${bid.projectName || "bid"} to ${proposal.proposalNumber}.`);
    setBidDraft(linkedBid);
    recordActivity({
      action: "Bid updated",
      entityType: "bid",
      entityId: linkedBid.id,
      entityLabel: linkedBid.projectName || "Bid opportunity",
      bids: nextBids,
      notes: `Linked proposal ${proposal.proposalNumber}`,
    });
  }

  async function markBidSubmitted(bidId) {
    if (!canPerform("editBid", setBidMessage)) {
      return;
    }

    const bid = savedBids.find((item) => item.id === bidId);

    if (!bid) {
      return;
    }

    const linkedProposal = savedProposals.find((proposal) => proposal.id === bid.proposalId);
    const latestPacketRecord = linkedProposal ? getLatestSubmittedPacketRecord(linkedProposal) : null;
    const submittedBid = normalizeBid({
      ...bid,
      bidStatus: "Submitted",
      submittedPacketRecordId: latestPacketRecord?.id || bid.submittedPacketRecordId || "",
      updatedAt: new Date().toISOString(),
    });

    const nextBids = upsertBid(savedBids, submittedBid);
    await commitBids(nextBids, `Marked ${bid.projectName || "bid"} as submitted.`);
    setBidDraft(submittedBid);
    recordActivity({
      action: "Bid status changed",
      entityType: "bid",
      entityId: submittedBid.id,
      entityLabel: submittedBid.projectName || "Bid opportunity",
      bids: nextBids,
      notes: "Submitted",
    });
  }

  function applyContactToCurrentProposal(contactId) {
    if (!contactId) {
      setProposalDirty(true);
      setProposalDraft((currentProposal) => createEditableProposal({ ...currentProposal, contactId: "" }));
      return;
    }

    const contact = savedContacts.find((item) => item.id === contactId);

    if (!contact) {
      return;
    }

    const currentProposal = proposalDraft;

    if (proposalHasContactConflicts(currentProposal, contact)) {
      const shouldOverwrite = window.confirm(
        `Use ${formatContactName(contact)} for this proposal? This will replace existing client/contact fields that already have values.`,
      );

      if (!shouldOverwrite) {
        return;
      }
    }

    setProposalDirty(true);
    setProposalDraft((currentProposalValue) => createEditableProposal(applyContactToProposal(currentProposalValue, contact)));
    setSaveMessage(`Linked ${formatContactName(contact)} to this proposal.`);
  }

  async function signInWithEmail(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      setAuthMessage("Supabase is not configured. The app is running in local mode.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
      return;
    }

    setAuthUser(data.user || null);
    setAuthMessage("Signed in. Loading cloud proposals, contacts, and company settings.");
    setAuthLoading(false);
  }

  async function signUpWithEmail(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      setAuthMessage("Supabase is not configured. The app is running in local mode.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
      return;
    }

    setAuthUser(data.user || null);
    setAuthMessage("Account created. Proposals, contacts, and company settings will sync after sign-in is confirmed.");
    setAuthLoading(false);
  }

  function resetSessionWorkspaceState() {
    const cleanup = getLogoutCleanupState();
    const nextRoute = parseRoute(cleanup.routePath);

    clearTransientProposalDraftStorage();
    resetProposalTransientState({ clearSaveMessage: true });
    setProposalDraft(createBlankProposalDraft([], companySettings, DEFAULT_PROPOSAL_MODE));
    setProposalDirty(cleanup.proposalDirty);
    setValidationNotice(cleanup.validationNotice);
    setSmartPasteNotes(cleanup.smartPasteNotes);
    setSmartPasteResult(cleanup.smartPasteResult);
    setPendingSmartPasteProposal(cleanup.pendingSmartPasteProposal);
    setAiProposalNotes(cleanup.aiProposalNotes);
    setAiProposalResult(cleanup.aiProposalResult);
    setAiProposalMessage(cleanup.aiProposalMessage);
    setAiProposalLoading(cleanup.aiProposalLoading);
    setBidDraft(createEmptyBid());
    setBidEditorOpen(cleanup.bidEditorOpen);
    setBidMessage(cleanup.bidMessage);
    setBidSmartPasteNotes(cleanup.bidSmartPasteNotes);
    setBidSmartPasteResult(cleanup.bidSmartPasteResult);
    setContactDraft(createEmptyContact());
    setContactEditorOpen(cleanup.contactEditorOpen);
    setContactMessage(cleanup.contactMessage);
    setAssetUploadMessage(cleanup.assetUploadMessage);
    setBackupMessage(cleanup.backupMessage);
    setSaveMessage(cleanup.saveMessage);
    setSaveState(createSaveState());
    window.history.replaceState({}, "", cleanup.routePath);
    setRoute(nextRoute);
  }

  async function signOut() {
    if (!isSupabaseConfigured || !supabase) {
      setAuthUser(null);
      resetSessionWorkspaceState();
      setAuthMessage("Supabase is not configured. The app is running in development local mode.");
      return;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
      return;
    }

    setAuthUser(null);
    resetSessionWorkspaceState();
    setAuthMessage("Signed out. Sign in again to view proposals, bids, settings, or print routes.");
    setTeamMembers([]);
    setTeamMessage("Sign in to sync team access.");
    setCloudSync((currentSync) => ({
      ...currentSync,
      companyId: "",
      contactsStatus: cloudLocalOnlyLabel,
      currentRole: "local",
      lastError: "",
      loading: false,
      message: cloudSignInLabel,
      proposalStatus: cloudLocalOnlyLabel,
      settingsStatus: cloudLocalOnlyLabel,
    }));
    setAuthLoading(false);
  }

  async function saveCurrentProposal() {
    if (!canPerform("editProposal")) {
      return;
    }

    if (saveState.isSaving) {
      setSaveMessage("Saving...");
      return;
    }

    if (!canCompleteProposal("saving")) {
      setSaveMessage("Fix required fields before saving.");
      return;
    }

    const savedProposal = savedProposals.find((proposal) => proposal.id === proposalDraft.id);

    if (route.view !== "new" && savedProposal && !proposalDirty) {
      setValidationNotice("");
      setSaveState((currentState) => ({
        ...currentState,
        isSaving: false,
        status: "No changes to save",
      }));
      setSaveMessage("No changes to save.");
      return;
    }

    const proposalToSave = createEditableProposal({
      ...proposalDraft,
      updatedAt: new Date().toISOString(),
    });
    const savedAt = new Date().toISOString();
    const duplicateWarning = getProposalDuplicateWarning(proposalToSave, savedProposals);
    const saveSuccessMessage = duplicateWarning ? `Saved locally. ${duplicateWarning}` : "Saved locally.";
    const cloudSuccessMessage = duplicateWarning ? `Saved locally and synced to cloud. ${duplicateWarning}` : "Saved locally and synced to cloud.";

    setSaveState((currentState) => ({
      ...currentState,
      isSaving: true,
      lastLocalSavedAt: "",
      lastSyncError: "",
      status: "Saving...",
    }));
    setSaveMessage("Saving...");
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, proposalToSave));
    setProposalDraft(proposalToSave);
    setProposalDirty(false);
    setSaveState((currentState) => ({
      ...currentState,
      lastLocalSavedAt: savedAt,
      status: canUseCloudSync(authUser) ? "Saved locally. Syncing to cloud..." : "Saved locally",
    }));

    if (canUseCloudSync(authUser)) {
      setSaveMessage("Saved locally. Syncing to cloud...");
      const synced = await syncSingleProposalToCloud(proposalToSave, "Draft saved to Supabase.");

      setSaveState((currentState) => ({
        ...currentState,
        isSaving: false,
        lastCloudSavedAt: synced ? new Date().toISOString() : currentState.lastCloudSavedAt,
        lastSyncError: synced ? "" : currentState.lastSyncError || cloudSync.lastError || "Cloud sync failed.",
        status: synced ? "Saved locally and synced to cloud" : "Saved locally. Cloud sync failed",
      }));
      if (synced) {
        setSaveMessage(cloudSuccessMessage);
      } else {
        setSaveMessage(`Saved locally. Cloud sync failed: ${cloudSync.lastError || "See Settings for details."}`);
      }
    } else {
      setSaveState((currentState) => ({
        ...currentState,
        isSaving: false,
        status: "Saved locally",
      }));
      setSaveMessage(saveSuccessMessage);
    }

    if (route.view === "new") {
      navigate(`/proposals/${proposalToSave.id}`, { proposal: proposalToSave, replace: true, skipUnsavedCheck: true });
    }

    recordActivity({
      action: "Proposal saved",
      entityType: "proposal",
      entityId: proposalToSave.id,
      entityLabel: formatProposalNumberWithRevision(proposalToSave),
      notes: proposalToSave.project?.name || "",
    });
  }

  async function saveSubmittedPacketRecord() {
    if (!canPerform("createPacketRecord")) {
      return;
    }

    if (!canCompleteProposal("saving a packet record")) {
      setSaveMessage("Fix required fields before saving a packet record.");
      return;
    }

    const packetRecord = createSubmittedPacketRecord(proposalDraft, authUser);
    const existingRecords = normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).map((record) =>
      record.status === "generated" ? { ...record, status: "superseded" } : record,
    );
    const updatedProposal = createEditableProposal({
      ...proposalDraft,
      submittedPacketRecords: [packetRecord, ...existingRecords],
      updatedAt: new Date().toISOString(),
    });

    await persistProposalAfterPacketChange(
      updatedProposal,
      "Packet record saved locally.",
      "Packet record saved locally and synced to cloud.",
    );
    recordActivity({
      action: "Packet record created",
      entityType: "proposal",
      entityId: updatedProposal.id,
      entityLabel: formatProposalNumberWithRevision(updatedProposal),
      notes: packetRecord.packetTitle,
    });
  }

  function updateSubmittedPacketRecord(recordId, field, value) {
    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) =>
      createEditableProposal({
        ...currentProposal,
        submittedPacketRecords: normalizeSubmittedPacketRecords(currentProposal.submittedPacketRecords).map((record) =>
          record.id === recordId ? { ...record, [field]: value } : record,
        ),
      }),
    );
  }

  async function markSubmittedPacketSent(recordId) {
    if (!canPerform("markPacketSent")) {
      return;
    }

    if (hasProposalDraftPlaceholders(proposalDraft)) {
      setValidationNotice(proposalPlaceholderWarning);
      setSaveMessage(proposalPlaceholderWarning);
      return;
    }

    const updatedProposal = createEditableProposal({
      ...proposalDraft,
      submittedPacketRecords: normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).map((record) =>
        record.id === recordId
          ? {
              ...record,
              status: "sent",
              sentDate: record.sentDate || formatInputDate(new Date()),
              sentToName: record.sentToName || proposalDraft.sentToName || proposalDraft.client?.contactName || proposalDraft.client?.companyName || "",
              sentToEmail: record.sentToEmail || proposalDraft.sentToEmail || proposalDraft.client?.email || "",
              sentMethod: record.sentMethod || proposalDraft.sentMethod || "Email",
            }
          : record,
      ),
      updatedAt: new Date().toISOString(),
    });

    await persistProposalAfterPacketChange(
      updatedProposal,
      "Packet marked as sent locally.",
      "Packet marked as sent locally and synced to cloud.",
    );
    recordActivity({
      action: "Packet marked sent",
      entityType: "proposal",
      entityId: updatedProposal.id,
      entityLabel: formatProposalNumberWithRevision(updatedProposal),
      notes: recordId,
    });
  }

  async function attachSubmittedPacketPdf(recordId, file) {
    if (!canPerform("storageUpload")) {
      return;
    }

    if (!file) {
      return;
    }

    if (!canUseCloudSync(authUser)) {
      setSaveMessage("PDF file archive requires cloud sign-in.");
      return;
    }

    let pdfValidation;

    try {
      pdfValidation = validatePdfUploadFile(file);
    } catch (error) {
      const errorMessage = formatStorageUploadError(error);
      setSaveMessage(`Upload failed: ${errorMessage}`);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: cloudSync.companyId || currentDiagnostics.companyId,
        errorMessage,
        lastAttemptedAt: new Date().toISOString(),
        lastFailedUploadError: errorMessage,
        lastFileName: file.name || "submitted-packet",
        lastFileSize: file.size || 0,
        lastProcessedFileSize: "",
        lastPublicUrl: "",
        lastStatus: "failed",
        lastStoragePath: "",
        lastUploadType: "Submitted packet PDF",
      }));
      recordActivity({
        action: "PDF upload failed",
        entityType: "storage",
        entityId: recordId,
        entityLabel: file.name || "Submitted PDF",
        notes: errorMessage,
      });
      return;
    }

    const record = normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).find((item) => item.id === recordId);

    if (!record) {
      setSaveMessage("Choose a valid packet record before attaching a PDF.");
      return;
    }

    const attemptedAt = new Date().toISOString();
    const pdfWarningMessage = pdfValidation.warnings.length > 0 ? ` ${pdfValidation.warnings.join(" ")}` : "";

    setStorageDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      companyId: cloudSync.companyId || currentDiagnostics.companyId,
      errorMessage: "",
      lastAttemptedAt: attemptedAt,
      lastFileName: file.name || "submitted-packet.pdf",
      lastFileSize: file.size || 0,
      lastProcessedFileSize: file.size || 0,
      lastPublicUrl: "",
      lastStatus: "uploading",
      lastStoragePath: "",
      lastUploadType: "Submitted packet PDF",
    }));
    setSaveMessage(`Uploading to cloud... ${formatSelectedFileLabel(file)}${pdfWarningMessage}`);

    try {
      const pdfAttachment = await uploadSubmittedPacketPdfToCloud(file, {
        companySettings,
        companyUser: authUser,
        companyDeps: companyCloudDeps,
        packetRecordId: record.id,
        proposalId: proposalDraft.id,
      });
      const updatedProposal = updateSubmittedPacketRecordInProposal(proposalDraft, recordId, {
        pdfAttachment,
        updatedAt: new Date().toISOString(),
      });

      await persistProposalAfterPacketChange(
        updatedProposal,
        "Submitted PDF attached locally.",
        "Submitted PDF attached and synced to cloud.",
      );
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: cloudSync.companyId || currentDiagnostics.companyId,
        errorMessage: "",
        lastAttemptedAt: attemptedAt,
        lastFileName: pdfAttachment.fileName || file.name || "submitted-packet.pdf",
        lastFileSize: file.size || pdfAttachment.fileSize || 0,
        lastProcessedFileSize: pdfAttachment.fileSize || file.size || 0,
        lastPublicUrl: pdfAttachment.publicUrl || "",
        lastStatus: "success",
        lastStoragePath: pdfAttachment.storagePath || "",
        lastSuccessfulPdfUploadPath: pdfAttachment.storagePath || currentDiagnostics.lastSuccessfulPdfUploadPath,
        lastUploadType: "Submitted packet PDF",
      }));
      setSaveMessage(`Uploaded to Supabase Storage: ${pdfAttachment.storagePath}. ${formatSelectedFileLabel(file)}${pdfWarningMessage}`);
      recordActivity({
        action: "PDF upload succeeded",
        entityType: "storage",
        entityId: recordId,
        entityLabel: pdfAttachment.fileName || "Submitted PDF",
        notes: pdfAttachment.storagePath,
      });
    } catch (error) {
      console.error("Submitted packet PDF upload failed:", error);
      setSaveMessage(`PDF upload failed: ${formatStorageUploadError(error)}`);
      const errorMessage = formatStorageUploadError(error);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage,
        lastAttemptedAt: attemptedAt,
        lastFailedUploadError: errorMessage,
        lastFileName: file.name || "submitted-packet.pdf",
        lastFileSize: file.size || 0,
        lastProcessedFileSize: file.size || 0,
        lastPublicUrl: "",
        lastStatus: "failed",
        lastStoragePath: "",
        lastUploadType: "Submitted packet PDF",
      }));
      recordActivity({
        action: "PDF upload failed",
        entityType: "storage",
        entityId: recordId,
        entityLabel: file.name || "Submitted PDF",
        notes: errorMessage,
      });
    }
  }

  async function removeSubmittedPacketPdf(recordId) {
    if (!canPerform("storageUpload")) {
      return;
    }

    const record = normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).find((item) => item.id === recordId);

    if (!record?.pdfAttachment?.storagePath && !record?.pdfAttachment?.publicUrl) {
      setSaveMessage("No submitted PDF is attached to this packet record.");
      return;
    }

    if (!window.confirm("Remove this PDF attachment from the packet record? The storage file will not be deleted in this phase.")) {
      return;
    }

    const updatedProposal = updateSubmittedPacketRecordInProposal(proposalDraft, recordId, {
      pdfAttachment: createEmptyPdfAttachment(),
      updatedAt: new Date().toISOString(),
    });

    await persistProposalAfterPacketChange(
      updatedProposal,
      "Submitted PDF attachment removed locally.",
      "Submitted PDF attachment removed and synced to cloud.",
    );
    recordActivity({
      action: "PDF removed",
      entityType: "storage",
      entityId: recordId,
      entityLabel: "Submitted PDF",
    });
  }

  async function markSendPackageSent(sendDraft) {
    if (!canPerform("sendWorkflow")) {
      return;
    }

    if (hasProposalDraftPlaceholders(proposalDraft)) {
      setValidationNotice(proposalPlaceholderWarning);
      setSaveMessage(proposalPlaceholderWarning);
      return;
    }

    const packetRecord = normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).find((record) => record.id === sendDraft.packetRecordId);

    if (!packetRecord) {
      setSaveMessage("Choose a packet record before marking sent.");
      return;
    }

    if (!hasPacketPdfAttachment(packetRecord)) {
      setSaveMessage("Attach submitted PDF before marking sent.");
      return;
    }

    const sendRecord = createSendRecord(proposalDraft, packetRecord, sendDraft, authUser);
    const updatedProposal = createEditableProposal({
      ...proposalDraft,
      status: "sent",
      sentDate: sendRecord.sentDate,
      sentToName: sendRecord.sentToName,
      sentToEmail: sendRecord.sentToEmail,
      sentMethod: sendRecord.sentMethod,
      followUpDate: sendRecord.followUpDate,
      nextAction: sendRecord.nextAction,
      sendRecords: [sendRecord, ...normalizeSendRecords(proposalDraft.sendRecords)],
      submittedPacketRecords: normalizeSubmittedPacketRecords(proposalDraft.submittedPacketRecords).map((record) =>
        record.id === packetRecord.id
          ? {
              ...record,
              status: "sent",
              sentDate: sendRecord.sentDate,
              sentToName: sendRecord.sentToName,
              sentToEmail: sendRecord.sentToEmail,
              sentMethod: sendRecord.sentMethod,
            }
          : record,
      ),
      updatedAt: new Date().toISOString(),
    });

    await persistProposalAfterPacketChange(
      updatedProposal,
      "Send package marked as sent locally.",
      "Send package marked as sent and synced to cloud.",
    );
    const linkedBidUpdates = savedBids.map((bid) =>
      bid.proposalId === updatedProposal.id
        ? normalizeBid({
            ...bid,
            bidStatus: "Submitted",
            followUpDate: bid.followUpDate || sendRecord.followUpDate,
            nextStep: bid.nextStep || sendRecord.nextAction,
            submittedPacketRecordId: packetRecord.id,
            updatedAt: new Date().toISOString(),
          })
        : bid,
    );

    if (JSON.stringify(linkedBidUpdates) !== JSON.stringify(savedBids)) {
      await commitBids(linkedBidUpdates, `Updated linked bid after sending ${formatProposalNumberWithRevision(updatedProposal)} locally.`);
    }

    recordActivity({
      action: "Send package marked sent",
      entityType: "proposal",
      entityId: updatedProposal.id,
      entityLabel: formatProposalNumberWithRevision(updatedProposal),
      bids: linkedBidUpdates,
      notes: sendRecord.sentToEmail || sendRecord.sentToName,
    });
  }

  async function persistProposalAfterPacketChange(updatedProposal, localMessage, cloudMessage) {
    const savedAt = new Date().toISOString();

    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    setProposalDraft(updatedProposal);
    setProposalDirty(false);
    setSaveState((currentState) => ({
      ...currentState,
      lastLocalSavedAt: savedAt,
      status: canUseCloudSync(authUser) ? "Saved locally. Syncing to cloud..." : "Saved locally",
    }));
    setSaveMessage(canUseCloudSync(authUser) ? "Saved locally. Syncing to cloud..." : localMessage);

    if (canUseCloudSync(authUser)) {
      const synced = await syncSingleProposalToCloud(updatedProposal, cloudMessage);
      setSaveState((currentState) => ({
        ...currentState,
        lastCloudSavedAt: synced ? new Date().toISOString() : currentState.lastCloudSavedAt,
        status: synced ? "Saved locally and synced to cloud" : "Saved locally. Cloud sync failed",
      }));
      if (synced) {
        setSaveMessage(cloudMessage);
      }
    }
  }

  function printCurrentProposal() {
    if (!canCompleteProposal("printing")) {
      return;
    }

    window.print();
  }

  function openPrintView() {
    if (!canCompleteProposal("opening the print view")) {
      return;
    }

    navigate(`/proposals/${proposalDraft.id}/print`, { proposal: proposalDraft });
  }

  function openProposalPrintView(proposal) {
    navigate(`/proposals/${proposal.id}/print`, { proposal });
  }

  async function createRevision() {
    if (!canPerform("editProposal")) {
      return;
    }

    if (!canCompleteProposal("creating a revision")) {
      return;
    }

    const sourceProposal = createEditableProposal({ ...proposalDraft, updatedAt: new Date().toISOString() });
    const revision = createProposalRevisionDraft(sourceProposal, savedProposals);
    const nextProposals = upsertProposal(upsertProposal(savedProposals, sourceProposal), revision);
    setSavedProposals(nextProposals);
    navigate(`/proposals/${revision.id}`, { proposal: revision, skipUnsavedCheck: true });
    setProposalDirty(false);
    setSaveMessage(`Created ${revision.revisionLabel}.`);
    recordActivity({
      action: "Revision created",
      entityType: "proposal",
      entityId: revision.id,
      entityLabel: formatProposalNumberWithRevision(revision),
      notes: `Previous proposal: ${formatProposalNumberWithRevision(sourceProposal)}`,
    });
    await syncMultipleProposalsToCloud([sourceProposal, revision], `Created ${revision.revisionLabel} and synced it to Supabase.`);
  }

  async function duplicateCurrentProposal(proposal = proposalDraft) {
    if (!canPerform("createProposal")) {
      return;
    }

    const duplicate = duplicateProposalDraft(proposal, savedProposals);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, duplicate));
    navigate(`/proposals/${duplicate.id}`, { proposal: duplicate, skipUnsavedCheck: true });
    setSaveMessage(getCloudReadyMessage(authUser, "Duplicated locally. Syncing to cloud...", "Duplicated as a new draft."));
    recordActivity({
      action: "Proposal duplicated",
      entityType: "proposal",
      entityId: duplicate.id,
      entityLabel: formatProposalNumberWithRevision(duplicate),
      notes: `Copied from ${formatProposalNumberWithRevision(proposal)}`,
    });
    await syncSingleProposalToCloud(duplicate, "Duplicate synced to Supabase.");
  }

  async function updateCurrentStatus(status) {
    if (!canPerform("markProposalOutcome")) {
      return;
    }

    if (String(status || "").toLowerCase() === "sent" && hasProposalDraftPlaceholders(proposalDraft)) {
      setValidationNotice(proposalPlaceholderWarning);
      setSaveMessage(proposalPlaceholderWarning);
      return;
    }

    const updatedProposal = applyStatusTracking({ ...proposalDraft, updatedAt: new Date().toISOString() }, status);
    setProposalDraft(updatedProposal);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    setSaveMessage(getCloudReadyMessage(authUser, `Marked as ${formatOptionLabel(status)} locally. Syncing to cloud...`, `Marked as ${formatOptionLabel(status)}.`));
    recordActivity({
      action: "Proposal status changed",
      entityType: "proposal",
      entityId: updatedProposal.id,
      entityLabel: formatProposalNumberWithRevision(updatedProposal),
      notes: formatOptionLabel(status),
    });
    await syncSingleProposalToCloud(updatedProposal, `Status updated to ${formatOptionLabel(status)} in Supabase.`);
  }

  async function updateListProposalStatus(proposal, status) {
    if (!canPerform("markProposalOutcome")) {
      return;
    }

    if (String(status || "").toLowerCase() === "sent" && hasProposalDraftPlaceholders(proposal)) {
      setSaveMessage(proposalPlaceholderWarning);
      return;
    }

    const updatedProposal = applyStatusTracking({ ...proposal, updatedAt: new Date().toISOString() }, status);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    recordActivity({
      action: "Proposal status changed",
      entityType: "proposal",
      entityId: updatedProposal.id,
      entityLabel: formatProposalNumberWithRevision(updatedProposal),
      notes: formatOptionLabel(status),
    });
    await syncSingleProposalToCloud(updatedProposal, `Status updated to ${formatOptionLabel(status)} in Supabase.`);
  }

  function exportProposalBackup(proposal = proposalDraft) {
    if (!canPerform("backupExport", setBackupMessage)) {
      return;
    }

    try {
      downloadJsonFile(createProposalExport(proposal), getCurrentProposalBackupFileName(proposal));
      setBackupMessage(`Exported ${proposal.proposalNumber || "proposal"}.`);
      recordActivity({
        action: "Backup exported",
        entityType: "backup",
        entityId: proposal.id,
        entityLabel: proposal.proposalNumber || "Proposal backup",
        notes: "Current proposal",
      });
    } catch (error) {
      setBackupMessage(`Export failed: ${error.message}`);
    }
  }

  async function commitPriceLibrary(nextLibrary, message = "Price library saved locally.") {
    const normalizedLibrary = normalizePriceLibrary(nextLibrary);
    const settingsWithLibrary = getSettingsWithPriceLibraryAndBids(companySettings, normalizedLibrary, savedBids, activityLog);

    setPriceLibrary(normalizedLibrary);
    setCompanySettings(settingsWithLibrary);
    setSettingsDraft((currentSettings) => getSettingsWithPriceLibraryAndBids(currentSettings, normalizedLibrary, savedBids, activityLog));
    setPriceLibraryMessage(getCloudReadyMessage(authUser, `${message} Syncing to cloud settings...`, message));

    if (canUseCloudSync(authUser)) {
      const synced = await syncSettingsToCloud(settingsWithLibrary);
      setPriceLibraryMessage(synced ? `${message} Synced to cloud settings.` : `${message} Cloud sync failed. See Settings for details.`);
    }
  }

  async function savePriceLibraryItem(item) {
    if (!canPerform("editPriceLibrary", setPriceLibraryMessage)) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedItem = normalizePriceLibraryItem({
      ...item,
      id: item.id || createProposalId(),
      createdAt: item.createdAt || now,
      updatedAt: now,
    });
    const nextLibrary = upsertPriceLibraryItem(priceLibrary, normalizedItem);
    const duplicateWarning = getPriceLibraryDuplicateWarning(normalizedItem, priceLibrary);

    await commitPriceLibrary(
      nextLibrary,
      `Saved ${normalizedItem.name} to the price library.${duplicateWarning ? ` ${duplicateWarning}` : ""}`,
    );
    recordActivity({
      action: priceLibrary.some((libraryItem) => libraryItem.id === normalizedItem.id)
        ? "Price library item updated"
        : "Price library item created",
      entityType: "settings",
      entityId: normalizedItem.id,
      entityLabel: normalizedItem.name,
      notes: normalizedItem.category,
      priceLibrary: nextLibrary,
    });
  }

  async function togglePriceLibraryItem(itemId, active) {
    if (!canPerform("editPriceLibrary", setPriceLibraryMessage)) {
      return;
    }

    const nextLibrary = priceLibrary.map((item) =>
      item.id === itemId
        ? normalizePriceLibraryItem({
            ...item,
            active,
            updatedAt: new Date().toISOString(),
          })
        : item,
    );

    await commitPriceLibrary(nextLibrary, "Updated price library item status locally.");
    const item = nextLibrary.find((libraryItem) => libraryItem.id === itemId);
    recordActivity({
      action: "Price library item updated",
      entityType: "settings",
      entityId: itemId,
      entityLabel: item?.name || "Price library item",
      notes: active ? "Active" : "Inactive",
      priceLibrary: nextLibrary,
    });
  }

  async function deletePriceLibraryItem(itemId) {
    if (!canPerform("deletePriceLibrary", setPriceLibraryMessage)) {
      return;
    }

    const item = priceLibrary.find((libraryItem) => libraryItem.id === itemId);

    if (!item) {
      return;
    }

    if (!window.confirm(`Delete ${item.name} from the price library? This may affect local/cloud data after sync.`)) {
      return;
    }

    const nextLibrary = priceLibrary.filter((libraryItem) => libraryItem.id !== itemId);
    await commitPriceLibrary(nextLibrary, `Deleted ${item.name} from the price library.`);
    recordActivity({
      action: "Price library item deleted",
      entityType: "settings",
      entityId: item.id,
      entityLabel: item.name,
      notes: item.category,
      priceLibrary: nextLibrary,
    });
  }

  async function duplicatePriceLibraryItem(itemId) {
    if (!canPerform("editPriceLibrary", setPriceLibraryMessage)) {
      return;
    }

    const item = priceLibrary.find((libraryItem) => libraryItem.id === itemId);

    if (!item) {
      return;
    }

    const now = new Date().toISOString();
    const duplicate = normalizePriceLibraryItem({
      ...item,
      id: createProposalId(),
      name: `${item.name} Copy`,
      createdAt: now,
      updatedAt: now,
    });

    const nextLibrary = [...priceLibrary, duplicate];
    await commitPriceLibrary(nextLibrary, `Duplicated ${item.name}.`);
    recordActivity({
      action: "Price library item created",
      entityType: "settings",
      entityId: duplicate.id,
      entityLabel: duplicate.name,
      notes: "Duplicated price library item",
      priceLibrary: nextLibrary,
    });
  }

  function exportPriceLibraryBackup() {
    if (!canPerform("backupExport", setPriceLibraryMessage)) {
      return;
    }

    try {
      downloadJsonFile(createPriceLibraryExport(priceLibrary), getPriceLibraryBackupFileName());
      setPriceLibraryMessage(`Exported ${priceLibrary.length} price library items.`);
      recordActivity({
        action: "Backup exported",
        entityType: "backup",
        entityId: "price-library",
        entityLabel: "Price library backup",
        notes: `${priceLibrary.length} items`,
      });
    } catch (error) {
      setPriceLibraryMessage(`Price library export failed: ${error.message}`);
    }
  }

  async function importPriceLibraryBackup(file, mode = "merge") {
    if (!canPerform("backupImport", setPriceLibraryMessage)) {
      return;
    }

    if (!file) {
      setPriceLibraryMessage("Choose a price library JSON file before importing.");
      return;
    }

    try {
      const importedJson = await readJsonFile(file);
      const importedLibrary = parsePriceLibraryImport(importedJson);
      const nextLibrary = mergeOrReplaceImportedPriceLibrary(importedLibrary, priceLibrary, mode);

      if (!nextLibrary) {
        setPriceLibraryMessage("Price library import cancelled.");
        return;
      }

      await commitPriceLibrary(
        nextLibrary,
        `${mode === "replace" ? "Replaced" : "Merged"} ${importedLibrary.length} price library items locally.`,
      );
      recordActivity({
        action: "Backup imported",
        entityType: "backup",
        entityId: "price-library",
        entityLabel: "Price library backup",
        notes: `${mode}: ${importedLibrary.length} items`,
        priceLibrary: nextLibrary,
      });
    } catch (error) {
      setPriceLibraryMessage(`Price library import failed: ${error.message}`);
    }
  }

  function updateLineItem(index, field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const lineItems = currentProposal.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      );

      return { ...currentProposal, lineItems };
    });
  }

  function addLineItem() {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const nextItemNumber = String(currentProposal.lineItems.length + 1);
      const nextLineItem = {
        itemNumber: nextItemNumber,
        description: "New line item",
        quantity: 1,
        unit: "LS",
        unitPrice: 0,
        taxable: true,
      };

      return {
        ...currentProposal,
        lineItems: [...currentProposal.lineItems, nextLineItem],
      };
    });
  }

  function addLineItemFromPriceLibrary(itemId) {
    const libraryItem = priceLibrary.find((item) => item.id === itemId);

    if (!libraryItem) {
      setSaveMessage("Choose a price library item to add.");
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const nextItemNumber = String((currentProposal.lineItems || []).length + 1);
      const nextLineItem = createPriceLibraryLineItem(libraryItem, nextItemNumber);

      return {
        ...currentProposal,
        lineItems: [...(currentProposal.lineItems || []), nextLineItem],
      };
    });
    setSaveMessage(`Added ${libraryItem.name} from the price library.`);
  }

  function removeLineItem(index) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      lineItems: currentProposal.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updatePricingSection(index, field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const pricingSections = normalizePricingSections(currentProposal.pricingSections).map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      );

      return { ...currentProposal, pricingSections };
    });
  }

  function addPricingSection() {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      pricingSections: [
        ...normalizePricingSections(currentProposal.pricingSections),
        {
          id: createProposalId(),
          type: "add_alternate",
          label: "",
          description: "",
          amount: "",
          included: false,
        },
      ],
    }));
  }

  function removePricingSection(index) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      pricingSections: normalizePricingSections(currentProposal.pricingSections).filter(
        (_, sectionIndex) => sectionIndex !== index,
      ),
    }));
  }

  function updateFinancialField(field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const financials = { ...currentProposal.financials };

      if (value === "" && (field === "discountAmount" || field === "depositAmount")) {
        delete financials[field];
      } else {
        financials[field] = value;
      }

      return { ...currentProposal, financials };
    });
  }

  function updateScopeSectionTitle(sectionIndex, title) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) =>
        index === sectionIndex ? { ...section, title } : section,
      );

      return { ...currentProposal, scopeSections };
    });
  }

  function updateScopeBullet(sectionIndex, bulletIndex, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const items = section.items.map((item, itemIndex) => (itemIndex === bulletIndex ? value : item));
        return { ...section, items };
      });

      return { ...currentProposal, scopeSections };
    });
  }

  function addScopeBullet(sectionIndex) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) =>
        index === sectionIndex ? { ...section, items: [...section.items, "New scope item"] } : section,
      );

      return { ...currentProposal, scopeSections };
    });
  }

  function removeScopeBullet(sectionIndex, bulletIndex) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        return { ...section, items: section.items.filter((_, itemIndex) => itemIndex !== bulletIndex) };
      });

      return { ...currentProposal, scopeSections };
    });
  }

  function addScopeSection() {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      scopeSections: [
        ...currentProposal.scopeSections,
        {
          title: "New Scope Section",
          items: ["New scope item"],
        },
      ],
    }));
  }

  function removeScopeSection(sectionIndex) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      scopeSections: currentProposal.scopeSections.filter((_, index) => index !== sectionIndex),
    }));
  }

  function updateConcreteSpec(field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      concreteSpecs: {
        ...currentProposal.concreteSpecs,
        [field]: value,
      },
    }));
  }

  function updateGcPrimeField(field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      gcPrime: {
        ...currentProposal.gcPrime,
        [field]: value,
      },
    }));
  }

  function updateProjectPhoto(index, updates) {
    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const projectPhotos = normalizeProjectPhotos(currentProposal.projectPhotos).map((photo, photoIndex) =>
        photoIndex === index ? normalizeProjectPhoto({ ...photo, ...updates }, photoIndex) : photo,
      );

      return { ...currentProposal, projectPhotos };
    });
  }

  async function uploadProjectPhoto(index, files) {
    if (!canPerform("storageUpload")) {
      return;
    }

    const imageFiles = normalizeSelectedImageFiles(files);

    if (imageFiles.length === 0) {
      return;
    }

    const attemptedAt = new Date().toISOString();
    const uploadType = imageFiles.length > 1 ? "Featured photo batch" : `Featured photo ${index + 1}`;
    const localReason = getAssetLocalStorageReason(authUser);
    let workingPhotos = normalizeProjectPhotos(proposalDraft.projectPhotos);
    const uploadedPaths = [];
    const failures = [];

    if (imageFiles.length < normalizeFileArray(files).length) {
      setAssetUploadMessage(`Uploading first ${maxImageBatchSize} images. Select another batch for the rest.`);
    }

    for (let fileIndex = 0; fileIndex < imageFiles.length; fileIndex += 1) {
      const file = imageFiles[fileIndex];
      const targetIndex = index + fileIndex;
      let preparedImage;

      try {
        preparedImage = await prepareImageFileForUpload(file, { kind: "featured" });
      } catch (error) {
        const errorMessage = formatStorageUploadError(error);
        failures.push(`${file.name || `Photo ${fileIndex + 1}`}: ${errorMessage}`);
        recordActivity({
          action: "Image upload failed",
          entityType: "storage",
          entityId: proposalDraft.id,
          entityLabel: uploadType,
          notes: errorMessage,
        });
        continue;
      }

      const uploadFile = preparedImage.file;
      const preparationMessage = formatImagePreparationMessage(preparedImage);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: cloudSync.companyId || currentDiagnostics.companyId,
        errorMessage: "",
        lastAttemptedAt: attemptedAt,
        lastFileName: file.name || `photo-${targetIndex + 1}`,
        lastFileSize: file.size || 0,
        lastProcessedFileSize: uploadFile.size || file.size || 0,
        lastPublicUrl: "",
        lastStatus: canUseCloudSync(authUser) ? "uploading" : "local fallback",
        lastStoragePath: "",
        lastUploadType: uploadType,
      }));
      setAssetUploadMessage(
        canUseCloudSync(authUser)
          ? `Uploading to cloud... ${fileIndex + 1}/${imageFiles.length} ${formatSelectedFileLabel(file)}${preparationMessage ? ` ${preparationMessage}` : ""}`
          : `Saved locally only. Reason: ${localReason} ${fileIndex + 1}/${imageFiles.length} ${formatSelectedFileLabel(uploadFile)}${preparationMessage ? ` ${preparationMessage}` : ""}`,
      );

      try {
        const asset = canUseCloudSync(authUser)
          ? await uploadProposalAssetToCloud(uploadFile, {
              area: "featured",
              companySettings,
              companyUser: authUser,
              companyDeps: companyCloudDeps,
              fileStem: `photo-${targetIndex + 1}`,
              proposalId: proposalDraft.id,
            })
          : await createLocalImageAsset(uploadFile);
        const safeAsset = withImageSafetyMetadata(asset, file, preparedImage);
        const existingPhoto = workingPhotos[targetIndex] || {};
        workingPhotos[targetIndex] = normalizeProjectPhoto(
          {
            ...existingPhoto,
            ...safeAsset,
            caption: getCleanUploadedImageCaption(existingPhoto.caption || existingPhoto.label, existingPhoto.label),
            label: getCleanUploadedImageCaption(existingPhoto.label, getImageCaptionFromFile(file.name) || `Photo ${targetIndex + 1}`),
          },
          targetIndex,
        );
        uploadedPaths.push(safeAsset.storagePath || safeAsset.fileName || file.name || `photo-${targetIndex + 1}`);

        if (canUseCloudSync(authUser)) {
          setStorageDiagnostics((currentDiagnostics) => ({
            ...currentDiagnostics,
            companyId: safeAsset.companyId || currentDiagnostics.companyId,
            errorMessage: "",
            lastAttemptedAt: attemptedAt,
            lastFileName: file.name || safeAsset.fileName || `photo-${targetIndex + 1}`,
            lastFileSize: file.size || 0,
            lastProcessedFileSize: uploadFile.size || file.size || 0,
            lastPublicUrl: safeAsset.publicUrl || "",
            lastStatus: "success",
            lastStoragePath: safeAsset.storagePath || "",
            lastSuccessfulImageUploadPath: safeAsset.storagePath || currentDiagnostics.lastSuccessfulImageUploadPath,
            lastUploadType: uploadType,
          }));
        }
      } catch (error) {
        console.error("Cloud image upload failed:", error);
        const errorMessage = formatStorageUploadError(error);
        try {
          const localAsset = withImageSafetyMetadata(await createLocalImageAsset(uploadFile), file, preparedImage);
          const existingPhoto = workingPhotos[targetIndex] || {};
          workingPhotos[targetIndex] = normalizeProjectPhoto(
            {
              ...existingPhoto,
              ...localAsset,
              caption: getCleanUploadedImageCaption(existingPhoto.caption || existingPhoto.label, existingPhoto.label),
              label: getCleanUploadedImageCaption(existingPhoto.label, getImageCaptionFromFile(file.name) || `Photo ${targetIndex + 1}`),
            },
            targetIndex,
          );
          uploadedPaths.push(localAsset.fileName || file.name || `photo-${targetIndex + 1}`);
          failures.push(`${file.name || `Photo ${fileIndex + 1}`}: cloud upload failed; saved locally.`);
          recordActivity({
            action: "Image upload failed",
            entityType: "storage",
            entityId: proposalDraft.id,
            entityLabel: uploadType,
            notes: errorMessage,
          });
        } catch (localError) {
          console.error("Local image fallback failed:", localError);
          const localErrorMessage = formatStorageUploadError(localError);
          failures.push(`${file.name || `Photo ${fileIndex + 1}`}: ${errorMessage}. Local fallback failed: ${localErrorMessage}`);
        }
      }
    }

    if (uploadedPaths.length > 0) {
      const nextProposal = createEditableProposal({
        ...proposalDraft,
        projectPhotos: workingPhotos,
        updatedAt: new Date().toISOString(),
      });

      setProposalDirty(false);
      setProposalDraft(nextProposal);
      setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));

      if (canUseCloudSync(authUser)) {
        await syncSingleProposalToCloud(nextProposal, `${uploadedPaths.length} photo${uploadedPaths.length === 1 ? "" : "s"} uploaded to Supabase Storage and proposal synced.`);
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          companyId: currentDiagnostics.companyId,
          errorMessage: "",
          lastAttemptedAt: attemptedAt,
          lastFailedUploadError: failures.join(" "),
          lastStatus: "success",
          lastStoragePath: uploadedPaths.at(-1) || "",
          lastSuccessfulImageUploadPath: uploadedPaths.at(-1) || currentDiagnostics.lastSuccessfulImageUploadPath,
          lastUploadType: uploadType,
        }));
      }

      if (!canUseCloudSync(authUser)) {
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `Saved locally only. Reason: ${localReason}`,
          lastAttemptedAt: attemptedAt,
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
      }

      setAssetUploadMessage(formatImageBatchResultMessage(uploadedPaths.length, failures, canUseCloudSync(authUser) ? "Uploaded to Supabase Storage" : `Saved locally only. Reason: ${localReason}`));
      recordActivity({
        action: "Image upload succeeded",
        entityType: "storage",
        entityId: proposalDraft.id,
        entityLabel: uploadType,
        notes: uploadedPaths.join(", "),
      });
    } else {
      setAssetUploadMessage(`Upload failed: ${failures.join(" ") || "No supported image files were uploaded."}`);
    }
  }

  function updateResidentialPricingOptionImage(optionIndex, imageIndex, updates) {
    updateResidentialItemImage("pricingOptions", optionIndex, imageIndex, updates);
  }

  function updateResidentialOptionalAddOnImage(addOnIndex, imageIndex, updates) {
    updateResidentialItemImage("optionalAddOns", addOnIndex, imageIndex, updates);
  }

  function updateResidentialItemImage(collectionKey, itemIndex, imageIndex, updates) {
    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const normalizeItems = collectionKey === "optionalAddOns" ? normalizeOptionalAddOns : normalizePricingOptions;
      const items = normalizeItems(currentProposal[collectionKey]).map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        const images = normalizeResidentialOptionImages(item.images).map((image, currentImageIndex) =>
          currentImageIndex === imageIndex
            ? normalizeResidentialOptionImages([{ ...image, ...updates }])[0] || image
            : image,
        );

        return {
          ...item,
          images,
        };
      });

      return {
        ...currentProposal,
        [collectionKey]: items,
      };
    });
  }

  function removeResidentialPricingOptionImage(optionIndex, imageIndex) {
    removeResidentialImageFromItem("pricingOptions", optionIndex, imageIndex);
  }

  function removeResidentialOptionalAddOnImage(addOnIndex, imageIndex) {
    removeResidentialImageFromItem("optionalAddOns", addOnIndex, imageIndex);
  }

  function removeResidentialImageFromItem(collectionKey, itemIndex, imageIndex) {
    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const normalizeItems = collectionKey === "optionalAddOns" ? normalizeOptionalAddOns : normalizePricingOptions;

      return {
        ...currentProposal,
        [collectionKey]: removeResidentialItemImage(normalizeItems(currentProposal[collectionKey]), itemIndex, imageIndex),
      };
    });
  }

  async function uploadResidentialPricingOptionImage(optionIndex, files) {
    await uploadResidentialOptionImage("pricingOptions", optionIndex, files);
  }

  async function uploadResidentialOptionalAddOnImage(addOnIndex, files) {
    await uploadResidentialOptionImage("optionalAddOns", addOnIndex, files);
  }

  async function uploadResidentialOptionImage(collectionKey, itemIndex, files) {
    if (!canPerform("storageUpload")) {
      return;
    }

    const imageFiles = normalizeSelectedImageFiles(files);

    if (imageFiles.length === 0) {
      return;
    }

    const isAddOn = collectionKey === "optionalAddOns";
    const normalizeItems = isAddOn ? normalizeOptionalAddOns : normalizePricingOptions;
    const items = normalizeItems(proposalDraft[collectionKey]);
    const item = items[itemIndex] || {};
    const attemptedAt = new Date().toISOString();
    const uploadType = isAddOn ? "Optional add-on photo" : "Pricing option photo";
    const localReason = getAssetLocalStorageReason(authUser);
    const fileStem = sanitizeStoragePathSegment(`${isAddOn ? "add-on" : "option"}-${itemIndex + 1}-${item.name || "photo"}`);
    let workingProposal = proposalDraft;
    const uploadedPaths = [];
    const failures = [];

    if (imageFiles.length < normalizeFileArray(files).length) {
      setAssetUploadMessage(`Uploading first ${maxImageBatchSize} images. Select another batch for the rest.`);
    }

    for (let fileIndex = 0; fileIndex < imageFiles.length; fileIndex += 1) {
      const file = imageFiles[fileIndex];
      let preparedImage;

      try {
        preparedImage = await prepareImageFileForUpload(file, { kind: "featured" });
      } catch (error) {
        const errorMessage = formatStorageUploadError(error);
        failures.push(`${file.name || `Photo ${fileIndex + 1}`}: ${errorMessage}`);
        recordActivity({
          action: "Image upload failed",
          entityType: "storage",
          entityId: proposalDraft.id,
          entityLabel: uploadType,
          notes: errorMessage,
        });
        continue;
      }

      const uploadFile = preparedImage.file;
      const preparationMessage = formatImagePreparationMessage(preparedImage);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: cloudSync.companyId || currentDiagnostics.companyId,
        errorMessage: "",
        lastAttemptedAt: attemptedAt,
        lastFileName: file.name || fileStem,
        lastFileSize: file.size || 0,
        lastProcessedFileSize: uploadFile.size || file.size || 0,
        lastPublicUrl: "",
        lastStatus: canUseCloudSync(authUser) ? "uploading" : "local fallback",
        lastStoragePath: "",
        lastUploadType: uploadType,
      }));
      setAssetUploadMessage(
        canUseCloudSync(authUser)
          ? `Uploading to cloud... ${fileIndex + 1}/${imageFiles.length} ${formatSelectedFileLabel(file)}${preparationMessage ? ` ${preparationMessage}` : ""}`
          : `Saved locally only. Reason: ${localReason} ${fileIndex + 1}/${imageFiles.length} ${formatSelectedFileLabel(uploadFile)}${preparationMessage ? ` ${preparationMessage}` : ""}`,
      );

      try {
        const asset = canUseCloudSync(authUser)
          ? await uploadProposalAssetToCloud(uploadFile, {
              area: "option-photos",
              companySettings,
              companyUser: authUser,
              companyDeps: companyCloudDeps,
              fileStem: `${fileStem}-${fileIndex + 1}`,
              proposalId: proposalDraft.id,
            })
          : await createLocalImageAsset(uploadFile);
        const safeAsset = withImageSafetyMetadata(asset, file, preparedImage);
        workingProposal = attachResidentialOptionImageToProposal(workingProposal, collectionKey, itemIndex, safeAsset, authUser?.email || "");
        uploadedPaths.push(safeAsset.storagePath || safeAsset.fileName || file.name || `${fileStem}-${fileIndex + 1}`);
      } catch (error) {
        console.error("Option photo upload failed:", error);
        const errorMessage = formatStorageUploadError(error);

        try {
          const localAsset = withImageSafetyMetadata(await createLocalImageAsset(uploadFile), file, preparedImage);
          workingProposal = attachResidentialOptionImageToProposal(workingProposal, collectionKey, itemIndex, localAsset, authUser?.email || "");
          uploadedPaths.push(localAsset.fileName || file.name || `${fileStem}-${fileIndex + 1}`);
          failures.push(`${file.name || `Photo ${fileIndex + 1}`}: cloud upload failed; saved locally.`);
          recordActivity({
            action: "Image upload failed",
            entityType: "storage",
            entityId: proposalDraft.id,
            entityLabel: uploadType,
            notes: errorMessage,
          });
        } catch (localError) {
          console.error("Local option photo fallback failed:", localError);
          const localErrorMessage = formatStorageUploadError(localError);
          failures.push(`${file.name || `Photo ${fileIndex + 1}`}: ${errorMessage}. Local fallback failed: ${localErrorMessage}`);
        }
      }
    }

    if (uploadedPaths.length > 0) {
      const nextProposal = createEditableProposal(workingProposal);
      setProposalDirty(false);
      setProposalDraft(nextProposal);
      setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));

      if (canUseCloudSync(authUser)) {
        await syncSingleProposalToCloud(nextProposal, `${uploadedPaths.length} option photo${uploadedPaths.length === 1 ? "" : "s"} uploaded to Supabase Storage and proposal synced.`);
      }

      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage: failures.length > 0 ? failures.join(" ") : canUseCloudSync(authUser) ? "" : `Saved locally only. Reason: ${localReason}`,
        lastAttemptedAt: attemptedAt,
        lastFailedUploadError: failures.join(" "),
        lastStatus: failures.length > 0 ? "local fallback" : canUseCloudSync(authUser) ? "success" : "local fallback",
        lastStoragePath: canUseCloudSync(authUser) ? uploadedPaths.at(-1) || "" : "",
        lastSuccessfulImageUploadPath: uploadedPaths.at(-1) || currentDiagnostics.lastSuccessfulImageUploadPath,
        lastUploadType: uploadType,
      }));
      setAssetUploadMessage(formatImageBatchResultMessage(uploadedPaths.length, failures, canUseCloudSync(authUser) ? "Uploaded to Supabase Storage" : `Saved locally only. Reason: ${localReason}`));
      recordActivity({
        action: "Image upload succeeded",
        entityType: "storage",
        entityId: proposalDraft.id,
        entityLabel: uploadType,
        notes: uploadedPaths.join(", "),
      });
    } else {
      setAssetUploadMessage(`Upload failed: ${failures.join(" ") || "No supported image files were uploaded."}`);
      if (failures.length > 0) {
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: failures.join(" "),
          lastAttemptedAt: attemptedAt,
          lastFailedUploadError: failures.join(" "),
          lastStatus: "failed",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
      }
    }
  }

  function updatePlanSheet(index, field, value) {
    if (!canPerform("editProposal")) {
      return;
    }

    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const planSheets = normalizePlanSheets(currentProposal.planSheets).map((sheet, sheetIndex) =>
        sheetIndex === index
          ? normalizePlanSheet(field === "__clearImage" ? clearImageAssetFields(sheet) : { ...sheet, [field]: value }, sheetIndex)
          : sheet,
      );

      return { ...currentProposal, planSheets };
    });
  }

  async function uploadPlanSheetImage(index, file) {
    if (!canPerform("storageUpload")) {
      return;
    }

    if (!file) {
      return;
    }

    const sheets = normalizePlanSheets(proposalDraft.planSheets);
    const sheet = sheets[index] || {};
    const attemptedAt = new Date().toISOString();
    const uploadType = "Plan sheet image";
    const localReason = getAssetLocalStorageReason(authUser);
    const planFileStem = sanitizeStoragePathSegment(sheet.id || sheet.matchKey || `plan-${index + 1}`);
    let preparedImage;

    try {
      preparedImage = await prepareImageFileForUpload(file, { kind: "plan" });
    } catch (error) {
      const errorMessage = formatStorageUploadError(error);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: cloudSync.companyId || currentDiagnostics.companyId,
        errorMessage,
        lastAttemptedAt: attemptedAt,
        lastFailedUploadError: errorMessage,
        lastFileName: file.name || planFileStem,
        lastFileSize: file.size || 0,
        lastProcessedFileSize: "",
        lastPublicUrl: "",
        lastStatus: "failed",
        lastStoragePath: "",
        lastUploadType: uploadType,
      }));
      setAssetUploadMessage(`Upload failed: ${errorMessage}`);
      recordActivity({
        action: "Image upload failed",
        entityType: "storage",
        entityId: proposalDraft.id,
        entityLabel: uploadType,
        notes: errorMessage,
      });
      return;
    }

    const uploadFile = preparedImage.file;
    const preparationMessage = formatImagePreparationMessage(preparedImage);

    setStorageDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      companyId: cloudSync.companyId || currentDiagnostics.companyId,
      errorMessage: "",
      lastAttemptedAt: attemptedAt,
      lastFileName: file.name || planFileStem,
      lastFileSize: file.size || 0,
      lastProcessedFileSize: uploadFile.size || file.size || 0,
      lastPublicUrl: "",
      lastStatus: canUseCloudSync(authUser) ? "uploading" : "local fallback",
      lastStoragePath: "",
      lastUploadType: uploadType,
    }));
    setAssetUploadMessage(
      canUseCloudSync(authUser)
        ? `Uploading to cloud... ${formatSelectedFileLabel(file)}${preparationMessage ? ` ${preparationMessage}` : ""}`
        : `Saved locally only. Reason: ${localReason} ${formatSelectedFileLabel(uploadFile)}${preparationMessage ? ` ${preparationMessage}` : ""}`,
    );

    try {
      const asset = canUseCloudSync(authUser)
        ? await uploadProposalAssetToCloud(uploadFile, {
            area: "plans",
            companySettings,
            companyUser: authUser,
            companyDeps: companyCloudDeps,
            fileStem: sheet.id || sheet.matchKey || `plan-${index + 1}`,
            proposalId: proposalDraft.id,
          })
        : await createLocalImageAsset(uploadFile);
      const safeAsset = withImageSafetyMetadata(asset, file, preparedImage);

      const planSheets = sheets.map((currentSheet, sheetIndex) =>
        sheetIndex === index
          ? normalizePlanSheet({
              ...currentSheet,
              ...safeAsset,
              imageSrc: safeAsset.src,
            }, sheetIndex)
          : currentSheet,
      );
      const nextProposal = createEditableProposal({
        ...proposalDraft,
        planSheets,
        updatedAt: new Date().toISOString(),
      });

      setProposalDirty(false);
      setProposalDraft(nextProposal);
      setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));

      if (canUseCloudSync(authUser)) {
        await syncSingleProposalToCloud(nextProposal, "Plan image uploaded to Supabase Storage and proposal synced.");
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          companyId: safeAsset.companyId || currentDiagnostics.companyId,
          errorMessage: "",
          lastAttemptedAt: attemptedAt,
          lastFailedUploadError: currentDiagnostics.lastFailedUploadError,
          lastFileName: file.name || safeAsset.fileName || planFileStem,
          lastFileSize: file.size || 0,
          lastProcessedFileSize: uploadFile.size || file.size || 0,
          lastPublicUrl: safeAsset.publicUrl || "",
          lastStatus: "success",
          lastStoragePath: safeAsset.storagePath || "",
          lastSuccessfulImageUploadPath: safeAsset.storagePath || currentDiagnostics.lastSuccessfulImageUploadPath,
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(formatUploadResultMessage(`Uploaded to Supabase Storage: ${safeAsset.storagePath}.`, safeAsset, preparedImage));
        recordActivity({
          action: "Image upload succeeded",
          entityType: "storage",
          entityId: proposalDraft.id,
          entityLabel: uploadType,
          notes: safeAsset.storagePath,
        });
      } else {
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `Saved locally only. Reason: ${localReason}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || safeAsset.fileName || planFileStem,
          lastFileSize: file.size || 0,
          lastProcessedFileSize: uploadFile.size || file.size || 0,
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(formatUploadResultMessage(`Saved locally only. Reason: ${localReason}`, safeAsset, preparedImage));
        recordActivity({
          action: "Image upload succeeded",
          entityType: "storage",
          entityId: proposalDraft.id,
          entityLabel: uploadType,
          notes: localReason,
        });
      }
    } catch (error) {
      console.error("Cloud image upload failed:", error);
      const errorMessage = formatStorageUploadError(error);
      try {
        const localAsset = withImageSafetyMetadata(await createLocalImageAsset(uploadFile), file, preparedImage);
        const planSheets = sheets.map((currentSheet, sheetIndex) =>
          sheetIndex === index
            ? normalizePlanSheet({
                ...currentSheet,
                ...localAsset,
                imageSrc: localAsset.src,
              }, sheetIndex)
            : currentSheet,
        );
        const nextProposal = createEditableProposal({
          ...proposalDraft,
          planSheets,
          updatedAt: new Date().toISOString(),
        });

        setProposalDirty(false);
        setProposalDraft(nextProposal);
        setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || localAsset.fileName || planFileStem,
          lastFileSize: file.size || 0,
          lastFailedUploadError: errorMessage,
          lastProcessedFileSize: uploadFile.size || file.size || 0,
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(formatUploadResultMessage(`Cloud upload failed: ${errorMessage}. Saved locally only. Reason: cloud upload failed.`, localAsset, preparedImage));
        recordActivity({
          action: "Image upload failed",
          entityType: "storage",
          entityId: proposalDraft.id,
          entityLabel: uploadType,
          notes: errorMessage,
        });
      } catch (localError) {
        console.error("Local image fallback failed:", localError);
        const localErrorMessage = formatStorageUploadError(localError);
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `${errorMessage} Local fallback failed: ${localErrorMessage}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || planFileStem,
          lastFileSize: file.size || 0,
          lastFailedUploadError: `${errorMessage} Local fallback failed: ${localErrorMessage}`,
          lastProcessedFileSize: uploadFile.size || file.size || 0,
          lastPublicUrl: "",
          lastStatus: "failed",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Cloud upload failed: ${errorMessage}. Local fallback failed: ${localErrorMessage}`);
      }
    }
  }

  async function testStorageUpload() {
    if (!canPerform("storageUpload", setSettingsMessage)) {
      return;
    }

    const attemptedAt = new Date().toISOString();
    const timestamp = Date.now();
    const fileName = `test-upload-${timestamp}.txt`;
    const testFile = new Blob([`Last Yard storage diagnostic ${new Date(timestamp).toISOString()}`], {
      type: "text/plain",
    });

    setStorageDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      companyId: cloudSync.companyId || currentDiagnostics.companyId,
      errorMessage: "",
      lastAttemptedAt: attemptedAt,
      lastFileName: fileName,
      lastFileSize: testFile.size,
      lastPublicUrl: "",
      lastStatus: "uploading",
      lastStoragePath: "",
      lastUploadType: "Storage diagnostic",
    }));

    if (!isSupabaseConfigured || !supabase) {
      const errorMessage = "Supabase is not configured.";
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage,
        lastStatus: "failed",
      }));
      setSettingsMessage(`Test Storage Upload failed: ${errorMessage}`);
      return;
    }

    if (!authUser?.id) {
      const errorMessage = "Sign in required to test Supabase Storage upload.";
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage,
        lastStatus: "failed",
      }));
      setSettingsMessage(`Test Storage Upload failed: ${errorMessage}`);
      return;
    }

    try {
      const activeUser = await getActiveSupabaseUser();
      const companyRecord = await ensureCloudCompany(activeUser, companySettings, companyCloudDeps);
      const storagePath = `company/${companyRecord.id}/diagnostics/${fileName}`;
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: companyRecord.id,
        lastStoragePath: storagePath,
      }));

      const { data, error } = await supabase.storage.from(proposalAssetsBucket).upload(storagePath, testFile, {
        cacheControl: "60",
        contentType: "text/plain",
        upsert: false,
      });

      if (error) {
        console.error("Supabase Storage diagnostic upload failed:", {
          bucket: proposalAssetsBucket,
          error,
          path: storagePath,
        });
        throw new Error(formatStorageUploadError(error));
      }

      const uploadedPath = data?.path || storagePath;
      const publicUrl = getStoragePublicUrl(uploadedPath);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        companyId: companyRecord.id,
        errorMessage: "",
        lastAttemptedAt: attemptedAt,
        lastFileName: fileName,
        lastFileSize: testFile.size,
        lastPublicUrl: publicUrl,
        lastStatus: "success",
        lastStoragePath: uploadedPath,
        lastUploadType: "Storage diagnostic",
      }));
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
      }));
      setSettingsMessage(`Test Storage Upload succeeded: ${uploadedPath}`);
      recordActivity({
        action: "Storage upload succeeded",
        entityType: "storage",
        entityId: companyRecord.id,
        entityLabel: "Storage diagnostic",
        notes: uploadedPath,
      });
    } catch (error) {
      console.error("Supabase Storage diagnostic upload failed:", error);
      const errorMessage = formatStorageUploadError(error);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage,
        lastStatus: "failed",
      }));
      setSettingsMessage(`Test Storage Upload failed: ${errorMessage}`);
      recordActivity({
        action: "Storage upload failed",
        entityType: "storage",
        entityId: cloudSync.companyId || "",
        entityLabel: "Storage diagnostic",
        notes: errorMessage,
      });
    }
  }

  function addPlanSheet() {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      planSheets: [
        ...normalizePlanSheets(currentProposal.planSheets),
        {
          id: createProposalId(),
          matchKey: `custom-${Date.now()}`,
          enabled: true,
          pageType: "general_backup",
          title: "General Backup",
          subtitle: "",
          imageSrc: "",
          calculationTitle: "Backup Notes",
          calculationNotes: [],
          clarificationNotes: [],
        },
      ],
    }));
  }

  function removePlanSheet(index) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      planSheets: normalizePlanSheets(currentProposal.planSheets).filter((_, sheetIndex) => sheetIndex !== index),
    }));
  }

  function updateGcPacketTable(sectionKey, field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const gcPacketTables = normalizeGcPacketTables(currentProposal.gcPacketTables);

      return {
        ...currentProposal,
        gcPacketTables: {
          ...gcPacketTables,
          [sectionKey]: {
            ...gcPacketTables[sectionKey],
            [field]: value,
          },
        },
      };
    });
  }

  function addGcPacketTableRow(sectionKey) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const gcPacketTables = normalizeGcPacketTables(currentProposal.gcPacketTables);

      return {
        ...currentProposal,
        gcPacketTables: {
          ...gcPacketTables,
          [sectionKey]: {
            ...gcPacketTables[sectionKey],
            enabled: true,
            rows: [...(gcPacketTables[sectionKey]?.rows || []), createEmptyGcPacketRow(sectionKey)],
          },
        },
      };
    });
  }

  function updateGcPacketTableRow(sectionKey, rowIndex, field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const gcPacketTables = normalizeGcPacketTables(currentProposal.gcPacketTables);
      const rows = (gcPacketTables[sectionKey]?.rows || []).map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      );

      return {
        ...currentProposal,
        gcPacketTables: {
          ...gcPacketTables,
          [sectionKey]: {
            ...gcPacketTables[sectionKey],
            rows,
          },
        },
      };
    });
  }

  function removeGcPacketTableRow(sectionKey, rowIndex) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const gcPacketTables = normalizeGcPacketTables(currentProposal.gcPacketTables);

      return {
        ...currentProposal,
        gcPacketTables: {
          ...gcPacketTables,
          [sectionKey]: {
            ...gcPacketTables[sectionKey],
            rows: (gcPacketTables[sectionKey]?.rows || []).filter((_, index) => index !== rowIndex),
          },
        },
      };
    });
  }

  function updatePacketBuilderSection(sectionId, field, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const packetBuilder = normalizePacketBuilder(currentProposal.packetBuilder).map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      );

      return createEditableProposal({
        ...currentProposal,
        packetBuilder,
      });
    });
  }

  function movePacketBuilderSection(sectionId, direction) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const packetBuilder = normalizePacketBuilder(currentProposal.packetBuilder);
      const currentIndex = packetBuilder.findIndex((section) => section.id === sectionId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= packetBuilder.length) {
        return currentProposal;
      }

      const reorderedSections = [...packetBuilder];
      const [movedSection] = reorderedSections.splice(currentIndex, 1);
      reorderedSections.splice(nextIndex, 0, movedSection);

      return createEditableProposal({
        ...currentProposal,
        packetBuilder: resequencePacketBuilder(reorderedSections),
      });
    });
  }

  function resetPacketBuilderOrder() {
    setProposalDirty(true);
    setProposalDraft((currentProposal) =>
      createEditableProposal({
        ...currentProposal,
        packetBuilder: normalizePacketBuilder([]),
      }),
    );
  }

  function updateSmartPasteNotes(value) {
    setSmartPasteNotes(value);

    if (pendingSmartPasteProposal || smartPasteResult?.pendingReview) {
      setPendingSmartPasteProposal(null);
      setSmartPasteResult(null);
    }
  }

  function fillProposalFromNotes() {
    const extractedCoverValues = extractSmartPasteCoverFieldsFromNotes(smartPasteNotes);
    const hasExtractedCoverValues = Object.values(extractedCoverValues).some(hasTextValue);
    const replaceStarterContent = isBlankProposalSmartPasteMode(route, proposalDraft);
    const smartPasteBaseProposal = cleanSmartPasteBaseProposal(proposalDraft, { replaceStarterContent });
    const { proposal: parsedProposal, parsedNotes, summary } = parseSmartPasteNotes(smartPasteNotes, smartPasteBaseProposal);

    if (summary.invalidJsonImport) {
      setSmartPasteResult({
        ...summary,
        pendingReview: false,
      });
      setPendingSmartPasteProposal(null);
      setSaveMessage("Smart Paste JSON import could not be parsed.");
      return;
    }

    if (
      summary.fields.length === 0 &&
      summary.lineItemCount === 0 &&
      summary.pricingSectionCount === 0 &&
      summary.planSheetCount === 0 &&
      summary.gcPacketTableCount === 0 &&
      summary.sectionsCaptured.length === 0 &&
      !hasExtractedCoverValues
    ) {
      setSmartPasteResult({
        fields: [],
        lineItemCount: 0,
        pricingSectionCount: 0,
        planSheetCount: 0,
        gcPacketTableCount: 0,
        sectionsCaptured: [],
        cleanupActions: [],
        coverFieldsUpdated: [],
        defaultsCleared: 0,
        defaultRowsRemoved: [],
        packetSectionsCreated: 0,
        pricingRowsReplaced: 0,
        scheduleOfValuesCount: 0,
        takeoffQuantityCount: 0,
        rfiCount: 0,
        scopeSectionCount: 0,
        concreteSpecCount: 0,
        packetPrintOrderCount: 0,
        applyTargets: [],
        parsedCoverValues: {},
        activeDraftFieldsUpdated: [],
        pendingReview: false,
        warnings: summary.warnings.length > 0 ? summary.warnings : ["No clearly labeled proposal fields were found."],
      });
      setPendingSmartPasteProposal(null);
      return;
    }

    const coverValues = mergeSmartPasteCoverValues(parsedNotes?.values, extractedCoverValues);
    const parsedProposalWithRawCover = forceApplySmartPasteCoverFields(parsedProposal, parsedProposal, coverValues);
    const contactLinkedProposal = linkProposalToMatchingContact(parsedProposalWithRawCover, savedContacts);
    const nextProposal = cleanProposalDraftAfterSmartPaste(
      forceApplySmartPasteCoverFields(
        createEditableProposal(contactLinkedProposal),
        parsedProposalWithRawCover,
        coverValues,
      ),
    );
    const nextValidation = validateProposalCompleteness(nextProposal);
    const existingFieldChanges = getSmartPasteFieldChangeSummary(proposalDraft, nextProposal);
    const nextSummary = {
      ...summary,
      proposalMode: inferProposalModeFromProposal(nextProposal),
      proposalModeLabel: getProposalModeLabel(inferProposalModeFromProposal(nextProposal)),
      applyMode: replaceStarterContent ? "Replace starter content" : "Merge into existing proposal",
      existingFieldChanges,
      parsedCoverValues: summarizeSmartPasteCoverValues(coverValues),
      activeDraftFieldsUpdated: [...new Set([...getSmartPasteActiveDraftFields(nextProposal, coverValues), ...(summary.applyTargets || [])])],
      detectedProjectInfo: {
        projectName: nextProposal.project?.name || "",
        clientCompany: nextProposal.client?.companyName || "",
        contactName: nextProposal.client?.contactName || "",
        projectLocation: nextProposal.project?.location || nextProposal.project?.address || nextProposal.client?.projectAddress || "",
      },
      detectedPricing: summarizeSmartPasteDetectedPricing(nextProposal),
      detectedAlternates:
        nextProposal.pricingMode === "choose_one_option"
          ? []
          : (nextProposal.pricingSections || []).map((section) => ({
              label: section.label || section.description || "Alternate / allowance",
              amount: section.amount || 0,
              included: section.included === true,
            })),
      pendingReview: true,
      validationErrors: nextValidation.errors,
    };

    setPendingSmartPasteProposal(nextProposal);
    setValidationNotice("");
    setSaveMessage(
      replaceStarterContent
        ? "Smart Paste review ready. Blank draft starter content will be replaced when you apply."
        : "Smart Paste review ready. Review detected fields, then click Apply Smart Paste.",
    );
    setSmartPasteResult(nextSummary);
  }

  function applyPendingSmartPasteResult() {
    if (!pendingSmartPasteProposal) {
      setSaveMessage("Run Smart Paste review before applying.");
      return;
    }

    const cleanedProposal = cleanProposalDraftAfterSmartPaste(pendingSmartPasteProposal);
    const nextValidation = validateProposalCompleteness(cleanedProposal);

    setProposalDirty(true);
    setProposalDraft(cleanedProposal);
    setValidationNotice(nextValidation.errors.length === 0 ? "" : "Review required fields before save/print.");
    setSaveMessage("Smart Paste applied. Review fields before saving.");
    setSmartPasteResult((currentResult) =>
      currentResult
        ? {
            ...currentResult,
            pendingReview: false,
            applied: true,
            validationErrors: nextValidation.errors,
          }
        : currentResult,
    );
    setPendingSmartPasteProposal(null);
  }

  function clearPendingSmartPasteResult() {
    setPendingSmartPasteProposal(null);
    setSmartPasteResult(null);
    setSaveMessage("Smart Paste review cleared.");
  }

  async function runAiProposalTool(mode) {
    if (!canPerform("editProposal")) {
      return;
    }

    const normalizedMode = mode === "review" ? "review" : "extract";
    const notes = aiProposalNotes.trim();

    if (normalizedMode === "extract" && !notes) {
      setAiProposalMessage("Paste notes before running AI Extract Proposal.");
      return;
    }

    setAiProposalLoading(normalizedMode);
    setAiProposalMessage(normalizedMode === "review" ? "Reviewing proposal with AI..." : "Extracting proposal data with AI...");

    try {
      const response = await fetch("/api/ai/extract-proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: normalizedMode,
          notes,
          proposal: getAiSafeProposalContext(proposalDraft),
        }),
      });
      const isJsonResponse = response.headers.get("content-type")?.includes("application/json");

      if (!isJsonResponse) {
        throw new Error("AI extraction is not configured. Use Smart Paste instead.");
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "AI request failed.");
      }

      const result = normalizeAiProposalResult(payload.result);
      setAiProposalResult(result);
      setAiProposalMessage(normalizedMode === "review" ? "AI review complete. Review findings before taking action." : "AI extraction complete. Review the result before applying.");
    } catch (error) {
      setAiProposalResult(null);
      setAiProposalMessage(error.message || "AI extraction failed. Use Smart Paste instead.");
    } finally {
      setAiProposalLoading("");
    }
  }

  function applyAiProposalResult() {
    if (!canPerform("editProposal")) {
      return;
    }

    if (!aiProposalResult || aiProposalResult.mode !== "extract") {
      setAiProposalMessage("Run AI Extract Proposal before applying results.");
      return;
    }

    const applied = applyAiProposalResultToProposal(aiProposalResult, proposalDraft);
    const linkedProposal = linkProposalToMatchingContact(applied.proposal, savedContacts);
    const nextProposal = createEditableProposal(linkedProposal);
    const nextValidation = validateProposalCompleteness(nextProposal);

    setProposalDirty(true);
    setProposalDraft(nextProposal);
    setValidationNotice(nextValidation.errors.length === 0 ? "" : "Review required fields before save/print.");
    setSmartPasteResult({
      ...applied.summary,
      fields: applied.summary.fields || [],
      warnings: [...new Set([...(applied.summary.warnings || []), ...(applied.summary.aiWarnings || [])])],
    });
    setAiProposalMessage("AI result applied. Review all fields before saving or sending.");
  }

  function exportBackup(type) {
    if (!canPerform("backupExport", setBackupMessage)) {
      return;
    }

    try {
      if (type === "current") {
        exportProposalBackup(proposalDraft);
        return;
      }

      if (type === "all") {
        downloadJsonFile(createAllProposalsExport(savedProposals), getAllProposalsBackupFileName());
        setBackupMessage(`Exported ${savedProposals.length} proposals.`);
        recordActivity({
          action: "Backup exported",
          entityType: "backup",
          entityId: "all-proposals",
          entityLabel: "All proposals backup",
          notes: `${savedProposals.length} proposals`,
        });
        return;
      }

      if (type === "settings") {
        downloadJsonFile(createCompanySettingsExport(getSettingsWithPriceLibraryAndBids(companySettings, priceLibrary, savedBids, activityLog)), getCompanySettingsBackupFileName());
        setBackupMessage("Exported company settings.");
        recordActivity({
          action: "Backup exported",
          entityType: "backup",
          entityId: "company-settings",
          entityLabel: "Company settings backup",
        });
        return;
      }

      if (type === "contacts") {
        downloadJsonFile(createContactsExport(savedContacts), getContactsBackupFileName());
        setBackupMessage(`Exported ${savedContacts.length} contacts.`);
        recordActivity({
          action: "Backup exported",
          entityType: "backup",
          entityId: "contacts",
          entityLabel: "Contacts backup",
          notes: `${savedContacts.length} contacts`,
        });
        return;
      }

      if (type === "bids") {
        downloadJsonFile(createBidsExport(savedBids), getBidsBackupFileName());
        setBackupMessage(`Exported ${savedBids.length} bids.`);
        recordActivity({
          action: "Backup exported",
          entityType: "backup",
          entityId: "bids",
          entityLabel: "Bids backup",
          notes: `${savedBids.length} bids`,
        });
        return;
      }

      if (type === "full") {
        downloadJsonFile(createFullAppBackup(savedProposals, companySettings, savedContacts, priceLibrary, savedBids, activityLog), getFullBackupFileName());
        setBackupMessage(
          `Exported full app backup with ${savedProposals.length} proposals, ${savedContacts.length} contacts, ${savedBids.length} bids, ${priceLibrary.length} price items, ${activityLog.length} activity records, and company settings.`,
        );
        recordActivity({
          action: "Backup exported",
          entityType: "backup",
          entityId: "full-app",
          entityLabel: "Full app backup",
          notes: `${savedProposals.length} proposals, ${savedBids.length} bids, ${activityLog.length} activity records`,
        });
      }
    } catch (error) {
      setBackupMessage(`Export failed: ${error.message}`);
    }
  }

  async function importBackup(type, mode, file) {
    if (!canPerform("backupImport", setBackupMessage)) {
      return;
    }

    if (!file) {
      setBackupMessage("Choose a JSON backup file before importing.");
      return;
    }

    try {
      const importedJson = await readJsonFile(file);

      if (type === "proposal") {
        const importedProposal = parseSingleProposalImport(importedJson, savedProposals);
        const nextProposals = upsertProposal(savedProposals, importedProposal);

        setSavedProposals(nextProposals);
        setProposalDraft(importedProposal);
        markProposalsNeedCloudSync("Imported proposal locally. Use Sync Proposals or Push Local Data to Cloud when ready.");
        setBackupMessage(`Imported proposal ${importedProposal.proposalNumber || importedProposal.id}.`);
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: importedProposal.id,
          entityLabel: importedProposal.proposalNumber || "Proposal import",
          notes: "Single proposal",
        });
        return;
      }

      if (type === "all") {
        const importedProposals = parseProposalCollectionImport(importedJson);
        const nextProposals = mergeOrReplaceImportedProposals(importedProposals, savedProposals, mode, "all proposals");

        if (!nextProposals) {
          setBackupMessage("Import cancelled.");
          return;
        }

        setSavedProposals(nextProposals);
        syncDraftAfterProposalRestore(nextProposals);
        markProposalsNeedCloudSync("Imported proposals locally. Use Sync Proposals or Push Local Data to Cloud when ready.");
        setBackupMessage(`${mode === "replace" ? "Replaced" : "Merged"} ${importedProposals.length} imported proposals.`);
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: "all-proposals",
          entityLabel: "All proposals import",
          notes: `${mode}: ${importedProposals.length} proposals`,
        });
        return;
      }

      if (type === "settings") {
        const importedSettings = parseCompanySettingsImport(importedJson);
        const importedPriceLibrary = getPriceLibraryFromSettings(importedSettings, priceLibrary);
        const importedBids = getBidsFromSettings(importedSettings, savedBids);
        const importedActivityLog = getActivityLogFromSettings(importedSettings, activityLog);
        const settingsWithLibrary = getSettingsWithPriceLibraryAndBids(importedSettings, importedPriceLibrary, importedBids, importedActivityLog);

        setPriceLibrary(importedPriceLibrary);
        setSavedBids(importedBids);
        setActivityLog(importedActivityLog);
        setCompanySettings(settingsWithLibrary);
        setSettingsDraft(settingsWithLibrary);
        setBackupMessage("Imported company settings. New proposals will use the restored defaults.");
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: "company-settings",
          entityLabel: "Company settings import",
          activityLog: importedActivityLog,
          bids: importedBids,
          priceLibrary: importedPriceLibrary,
          settings: settingsWithLibrary,
        });
        return;
      }

      if (type === "contacts") {
        const importedContacts = parseContactCollectionImport(importedJson);
        const nextContacts = mergeOrReplaceImportedContacts(importedContacts, savedContacts, mode, "contacts");

        if (!nextContacts) {
          setBackupMessage("Import cancelled.");
          return;
        }

        setSavedContacts(nextContacts);
        setContactDraft(createEmptyContact());
        setContactEditorOpen(false);
        setBackupMessage(`${mode === "replace" ? "Replaced" : "Merged"} ${importedContacts.length} imported contacts.`);
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: "contacts",
          entityLabel: "Contacts import",
          notes: `${mode}: ${importedContacts.length} contacts`,
        });
        return;
      }

      if (type === "bids") {
        const importedBids = parseBidCollectionImport(importedJson);
        const nextBids = mergeOrReplaceImportedBids(importedBids, savedBids, mode, "bids");

        if (!nextBids) {
          setBackupMessage("Import cancelled.");
          return;
        }

        await commitBids(nextBids, `${mode === "replace" ? "Replaced" : "Merged"} ${importedBids.length} imported bids locally.`);
        setBidDraft(createEmptyBid());
        setBidEditorOpen(false);
        setBackupMessage(`${mode === "replace" ? "Replaced" : "Merged"} ${importedBids.length} imported bids.`);
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: "bids",
          entityLabel: "Bids import",
          bids: nextBids,
          notes: `${mode}: ${importedBids.length} bids`,
        });
        return;
      }

      if (type === "full") {
        const importedBackup = parseFullAppBackupImport(importedJson);
        const nextProposals = mergeOrReplaceImportedProposals(
          importedBackup.proposals,
          savedProposals,
          mode,
          "the full app backup",
        );

        if (!nextProposals) {
          setBackupMessage("Import cancelled.");
          return;
        }

        setSavedProposals(nextProposals);
        setSavedContacts(
          mode === "replace"
            ? importedBackup.contacts.map((contact) => normalizeContact(contact))
            : mergeImportedContacts(importedBackup.contacts, savedContacts),
        );
        const nextBids =
          mode === "replace"
            ? importedBackup.bids.map((bid) => normalizeBid(bid))
            : mergeImportedBids(importedBackup.bids, savedBids);
        const importedPriceLibrary =
          importedBackup.priceLibrary.length > 0 ? normalizePriceLibrary(importedBackup.priceLibrary) : priceLibrary;
        const nextActivityLog =
          mode === "replace" ? normalizeActivityLog(importedBackup.activityLog) : normalizeActivityLog([...importedBackup.activityLog, ...activityLog]);
        const importedSettings = getSettingsWithPriceLibraryAndBids(importedBackup.companySettings, importedPriceLibrary, nextBids, nextActivityLog);

        setPriceLibrary(importedPriceLibrary);
        setSavedBids(nextBids);
        setActivityLog(nextActivityLog);
        setCompanySettings(importedSettings);
        setSettingsDraft(importedSettings);
        setContactDraft(createEmptyContact());
        setContactEditorOpen(false);
        setBidDraft(createEmptyBid());
        setBidEditorOpen(false);
        syncDraftAfterProposalRestore(nextProposals);
        markProposalsNeedCloudSync("Imported full backup locally. Use Sync Proposals or Push Local Data to Cloud when ready.");
        setBackupMessage(
          `${mode === "replace" ? "Restored" : "Merged"} full backup with ${importedBackup.proposals.length} proposals, ${importedBackup.contacts.length} contacts, ${nextBids.length} bids, ${importedPriceLibrary.length} price items, ${nextActivityLog.length} activity records, and company settings.`,
        );
        recordActivity({
          action: "Backup imported",
          entityType: "backup",
          entityId: "full-app",
          entityLabel: "Full app backup",
          notes: `${mode}: ${importedBackup.proposals.length} proposals, ${nextActivityLog.length} activity records`,
          activityLog: nextActivityLog,
          bids: nextBids,
          priceLibrary: importedPriceLibrary,
          settings: importedSettings,
        });
      }
    } catch (error) {
      setBackupMessage(`Import failed: ${error.message}`);
    }
  }

  function syncDraftAfterProposalRestore(nextProposals) {
    const currentMatch = nextProposals.find((proposal) => proposal.id === proposalDraft.id);

    if (currentMatch) {
      setProposalDraft(currentMatch);
      return;
    }

    if (isProposalRouteView(route.view) && nextProposals.length > 0) {
      navigate(`/proposals/${nextProposals[0].id}`, { proposal: nextProposals[0], replace: true });
    }
  }

  const backupTools = (
    <BackupRestorePanel
      canExport={permissions.backupExport}
      canExportCurrent={isProposalDraftView}
      canImport={permissions.backupImport}
      message={backupMessage}
      onExport={exportBackup}
      onImport={importBackup}
    />
  );
  const backupShortcut = <BackupShortcutCard onOpenBackup={() => navigate("/backup")} />;

  if (!authGate.canRenderProtectedContent) {
    return (
      <main className="app-shell auth-gated-shell">
        <style>{`
          @media print {
            @page { size: letter portrait; margin: 0; }
          }
        `}</style>
        <div className="app-content auth-gated-content">
          {authGate.shouldShowAuthLoading ? (
            <AuthLoadingScreen />
          ) : (
            <LoginView
              authLoading={authLoading}
              authMessage={authMessage}
              authUser={authUser}
              canNavigateBack={false}
              isCloudConfigured={isSupabaseConfigured}
              requireSignIn
              onBackToDashboard={() => navigate("/dashboard")}
              onSignIn={signInWithEmail}
              onSignOut={signOut}
              onSignUp={signUpWithEmail}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className={`app-shell ${isPrintView ? "print-route-shell" : ""}`}>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      {!isPrintView ? (
        <AppChrome
          authLoading={authLoading}
          authStatusLabel={getAuthStatusLabel(authUser, authLoading)}
          authUser={authUser}
          companyName={company.name}
          currentView={route.view}
          isCloudConfigured={isSupabaseConfigured}
          permissions={permissions}
          roleLabel={permissionRoleLabel}
          onNavigate={navigate}
          onOpenLogin={() => navigate("/login")}
          onSignOut={signOut}
          onNewBid={startNewBid}
          onNewContact={startNewContact}
          onNewGcPacket={createNewGcPacket}
          onNewProposal={createNewProposal}
        />
      ) : null}
      {!isPrintView && isSupabaseConfigured && !authUser ? <LocalModeBanner onOpenLogin={() => navigate("/login")} /> : null}

      <div className={isPrintView ? "" : "app-content"}>
      {isDashboardView ? (
        <DashboardView
          activityLog={activityLog}
          authUser={authUser}
          bids={savedBids}
          cloudSync={cloudSync}
          contacts={savedContacts}
          permissions={permissions}
          proposals={savedProposals}
          onCreateBid={startNewBid}
          onCreateCommercialProposal={createNewCommercialProposal}
          onCreateContact={startNewContact}
          onCreateGcPacket={createNewGcPacket}
          onCreateProposal={createNewProposal}
          onCreateResidentialProposal={createNewResidentialProposal}
          onExportBackup={() => navigate("/backup")}
          onLoadDemoData={loadDemoData}
          onOpen={openProposal}
          onOpenContacts={() => navigate("/contacts")}
          onOpenBids={() => navigate("/bids")}
          onOpenList={() => navigate("/proposals")}
          onOpenPrint={openProposalPrintView}
          onOpenSampleProposal={openSampleProposal}
          onOpenPriceLibrary={() => navigate("/price-library")}
          onOpenSettings={() => navigate("/settings")}
          onOpenActivity={() => navigate("/activity")}
          onPrintSamplePacket={printSamplePacket}
          onPullCloudProposals={pullCloudProposals}
          onPushLocalProposals={pushLocalProposalsToCloud}
          onResetDemoData={resetDemoData}
          onSyncProposals={syncProposalsNow}
        />
      ) : isBackupView ? (
        <BackupView backupTools={backupTools} onBackToDashboard={() => navigate("/dashboard")} />
      ) : isLoginView ? (
        <LoginView
          authLoading={authLoading}
          authMessage={authMessage}
          authUser={authUser}
          isCloudConfigured={isSupabaseConfigured}
          onBackToDashboard={() => navigate("/dashboard")}
          onSignIn={signInWithEmail}
          onSignOut={signOut}
          onSignUp={signUpWithEmail}
        />
      ) : isActivityView ? (
        <ActivityLogView records={activityLog} onBackToDashboard={() => navigate("/dashboard")} />
      ) : isPriceLibraryView ? (
        <PriceLibraryView
          canExport={permissions.backupExport}
          canImport={permissions.backupImport}
          canManage={permissions.editPriceLibrary}
          items={priceLibrary}
          message={priceLibraryMessage}
          onBackToDashboard={() => navigate("/dashboard")}
          onDelete={deletePriceLibraryItem}
          onDuplicate={duplicatePriceLibraryItem}
          onExport={exportPriceLibraryBackup}
          onImport={importPriceLibraryBackup}
          onSave={savePriceLibraryItem}
          onToggleActive={togglePriceLibraryItem}
        />
      ) : isBidsView ? (
        <BidsRouteErrorBoundary onBackToDashboard={() => navigate("/dashboard")} onNewBid={startNewBid} resetKey={route.path}>
          <BidsView
            bidDraft={normalizeBid(bidDraft)}
            bidSmartPasteNotes={bidSmartPasteNotes}
            bidSmartPasteResult={bidSmartPasteResult}
            bids={normalizeBids(savedBids)}
            contacts={normalizeContacts(savedContacts)}
            isEditorOpen={bidEditorOpen}
            message={bidMessage}
            permissions={permissions}
            priorityFilter={bidPriorityFilter}
            proposals={normalizeProposals(savedProposals, companySettings)}
            searchQuery={bidSearchQuery}
            statusFilter={bidStatusFilter}
            onBackToDashboard={() => navigate("/dashboard")}
            onCreateProposal={createProposalFromBid}
            onDelete={deleteBid}
            onDuplicate={duplicateBid}
            onEdit={editBid}
            onFillBidFromNotes={fillBidFromNotes}
            onLinkProposal={linkBidToProposal}
            onMarkSubmitted={markBidSubmitted}
            onNew={startNewBid}
            onOpenProposal={openProposal}
            onPriorityFilterChange={setBidPriorityFilter}
            onSave={saveBid}
            onSearchChange={setBidSearchQuery}
            onStatusChange={updateBidStatus}
            onStatusFilterChange={setBidStatusFilter}
            onUpdateBidSmartPasteNotes={setBidSmartPasteNotes}
            onUpdateDraft={updateBidDraft}
          />
        </BidsRouteErrorBoundary>
      ) : isSettingsView ? (
        <CompanySettingsView
          authLoading={authLoading}
          authMessage={authMessage}
          authUser={authUser}
          backupShortcut={backupShortcut}
          cloudSync={cloudSync}
          message={settingsMessage}
          saveState={saveState}
          settings={settingsDraft}
          storageDiagnostics={storageDiagnostics}
          teamMembers={teamMembers}
          teamMessage={teamMessage}
          onClearCloudSyncMessage={clearCloudSyncMessage}
          onDeactivateTeamMember={deactivateTeamMember}
          onInviteTeamMember={inviteTeamMember}
          onOpenLogin={() => navigate("/login")}
          onPullCloudData={pullCloudData}
          onPullCloudProposals={pullCloudProposals}
          onPushLocalDataToCloud={pushLocalDataToCloud}
          onPushLocalProposals={pushLocalProposalsToCloud}
          onRefreshTeamMembers={refreshTeamMembers}
          onSignOut={signOut}
          onSyncContacts={syncContactsToCloud}
          onSyncProposals={syncProposalsNow}
          onSyncSettings={syncSettingsToCloud}
          onTestStorageUpload={testStorageUpload}
          onBackToList={() => navigate("/proposals")}
          permissions={permissions}
          onChange={updateSettingsDraft}
          onReset={resetSettingsDraft}
          onSave={saveSettings}
        />
      ) : isContactsView ? (
        <ContactsView
          contactDraft={contactDraft}
          isEditorOpen={contactEditorOpen}
          contacts={savedContacts}
          message={contactMessage}
          permissions={permissions}
          proposals={savedProposals}
          searchQuery={contactSearchQuery}
          typeFilter={contactTypeFilter}
          onBackToDashboard={() => navigate("/dashboard")}
          onDelete={deleteContact}
          onEdit={editContact}
          onNew={startNewContact}
          onOpenProposal={openProposal}
          onSave={saveContact}
          onSearchChange={setContactSearchQuery}
          onTypeFilterChange={setContactTypeFilter}
          onUpdateDraft={updateContactDraft}
        />
      ) : isListView ? (
        <ProposalListView
          authUser={authUser}
          backupShortcut={backupShortcut}
          cloudSync={cloudSync}
          contacts={savedContacts}
          permissions={permissions}
          proposals={savedProposals}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onCreateNew={createNewProposal}
          onDuplicate={duplicateCurrentProposal}
          onExportProposal={exportProposalBackup}
          onOpen={openProposal}
          onPrint={openProposalPrintView}
          onPullCloudProposals={pullCloudProposals}
          onPushLocalProposals={pushLocalProposalsToCloud}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => navigate("/settings")}
          onStatusFilterChange={setStatusFilter}
          onStatusChange={updateListProposalStatus}
          onSyncProposals={syncProposalsNow}
        />
      ) : (
        <>
          {isPrintView ? (
            <>
              <ProposalPrintToolbar
                canSavePacketRecord={permissions.createPacketRecord}
                onBackToList={() => navigate("/proposals")}
                onPrint={printCurrentProposal}
                onSavePacketRecord={saveSubmittedPacketRecord}
              />
              <ValidationPanel
                className="print-route-validation"
                notice={validationNotice}
                validation={proposalValidation}
              />
            </>
          ) : (
              <ProposalActionBar
                key={`action-${route.path}-${proposalDraft.id}`}
                draftLabel={getDraftRouteLabel(route)}
                isPrintView={isPrintView}
                proposal={proposalDraft}
                revisionHistory={getRevisionHistory(proposalDraft, savedProposals)}
                saveMessage={saveMessage}
                saveState={saveState}
                showStartBlank={route.view === "new"}
                permissions={permissions}
                onBackToList={() => navigate("/proposals")}
                onCreateRevision={createRevision}
                onCreatePacketRecord={saveSubmittedPacketRecord}
                onDuplicate={() => duplicateCurrentProposal(proposalDraft)}
                onOpenPrintView={openPrintView}
                onSave={saveCurrentProposal}
                onStartBlankProposal={startBlankProposalFromTemplatePicker}
                onStatusChange={updateCurrentStatus}
              />
          )}
          {!isPrintView ? backupShortcut : null}

          <div className={`proposal-workbench ${isPrintView ? "print-route-view" : ""}`}>
            {isPrintView ? null : (
              <ProposalEditor
                key={`editor-${route.path}-${proposalDraft.id}`}
                proposal={proposalDraft}
                readOnly={!permissions.editProposal}
                contacts={savedContacts}
                assetUploadMessage={assetUploadMessage}
                draftLabel={getDraftRouteLabel(route)}
                showTemplatePicker={route.view === "new"}
                permissions={permissions}
                onAddLineItem={addLineItem}
                onAddLineItemFromLibrary={addLineItemFromPriceLibrary}
                onAddPricingSection={addPricingSection}
                onApplyTemplate={applyProposalTemplate}
                onChange={updateProposalField}
                onFinancialChange={updateFinancialField}
                onLineItemChange={updateLineItem}
                onPricingSectionChange={updatePricingSection}
                onRemoveLineItem={removeLineItem}
                onRemovePricingSection={removePricingSection}
                onAddScopeBullet={addScopeBullet}
                onAddScopeSection={addScopeSection}
                onRemoveScopeBullet={removeScopeBullet}
                onRemoveScopeSection={removeScopeSection}
                onScopeBulletChange={updateScopeBullet}
                onScopeTitleChange={updateScopeSectionTitle}
                onConcreteSpecChange={updateConcreteSpec}
                onGcPrimeChange={updateGcPrimeField}
                onPricingOptionImageChange={updateResidentialPricingOptionImage}
                onPricingOptionImageRemove={removeResidentialPricingOptionImage}
                onPricingOptionImageUpload={uploadResidentialPricingOptionImage}
                onOptionalAddOnImageChange={updateResidentialOptionalAddOnImage}
                onOptionalAddOnImageRemove={removeResidentialOptionalAddOnImage}
                onOptionalAddOnImageUpload={uploadResidentialOptionalAddOnImage}
                onProjectPhotoChange={updateProjectPhoto}
                onProjectPhotoUpload={uploadProjectPhoto}
                onAddPlanSheet={addPlanSheet}
                onPlanSheetChange={updatePlanSheet}
                onPlanSheetImageUpload={uploadPlanSheetImage}
                onRemovePlanSheet={removePlanSheet}
                onAddGcPacketTableRow={addGcPacketTableRow}
                onGcPacketTableChange={updateGcPacketTable}
                onGcPacketTableRowChange={updateGcPacketTableRow}
                onRemoveGcPacketTableRow={removeGcPacketTableRow}
                onAttachPacketPdf={attachSubmittedPacketPdf}
                onMarkPacketSent={markSubmittedPacketSent}
                onMarkSendPackageSent={markSendPackageSent}
                onMovePacketBuilderSection={movePacketBuilderSection}
                onCreatePacketRecord={saveSubmittedPacketRecord}
                onPacketBuilderChange={updatePacketBuilderSection}
                onRemovePacketPdf={removeSubmittedPacketPdf}
                onResetPacketBuilder={resetPacketBuilderOrder}
                onRefreshTermsFromDefaults={refreshProposalTermsFromCompanyDefaults}
                onStartBlankProposal={startBlankProposalFromTemplatePicker}
                onSmartPasteApply={applyPendingSmartPasteResult}
                onSmartPasteClear={clearPendingSmartPasteResult}
                onSmartPasteFill={fillProposalFromNotes}
                onSmartPasteNotesChange={updateSmartPasteNotes}
                onAiProposalNotesChange={setAiProposalNotes}
                onAiProposalRun={runAiProposalTool}
                onApplyAiProposalResult={applyAiProposalResult}
                onSelectContact={applyContactToCurrentProposal}
                onUpdatePacketRecord={updateSubmittedPacketRecord}
                priceLibrary={priceLibrary}
                aiProposalLoading={aiProposalLoading}
                aiProposalMessage={aiProposalMessage}
                aiProposalNotes={aiProposalNotes}
                aiProposalResult={aiProposalResult}
                smartPasteNotes={smartPasteNotes}
                smartPasteResult={smartPasteResult}
                validation={proposalValidation}
                validationNotice={validationNotice}
              />
            )}
            <div className="preview-pane">
              <ProposalPreview companySettings={companySettings} helpers={proposalPacketHelpers} proposal={proposalDraft} />
            </div>
          </div>
        </>
      )}
      </div>
    </main>
  );
}

function AuthLoadingScreen() {
  return (
    <section className="login-panel no-print">
      <div className="login-card auth-loading-card">
        <h3>Checking sign-in</h3>
        <p>Loading your secure Last Yard workspace...</p>
      </div>
    </section>
  );
}

function DashboardView({
  activityLog = [],
  authUser,
  bids = [],
  cloudSync,
  contacts = [],
  permissions = {},
  proposals,
  onCreateBid,
  onCreateCommercialProposal,
  onCreateContact,
  onCreateGcPacket,
  onCreateProposal,
  onCreateResidentialProposal,
  onExportBackup,
  onLoadDemoData,
  onOpen,
  onOpenBids,
  onOpenContacts,
  onOpenList,
  onOpenPrint,
  onOpenPriceLibrary,
  onOpenActivity,
  onOpenSampleProposal,
  onOpenSettings,
  onPrintSamplePacket,
  onPullCloudProposals,
  onPushLocalProposals,
  onResetDemoData,
  onSyncProposals,
}) {
  const stats = buildDashboardStats(proposals, contacts, bids);
  const recentProposals = getRecentProposals(proposals);
  const followUpProposals = getFollowUpDueProposals(proposals);
  const upcomingBids = getUpcomingBids(bids);
  const demoStatus = getDemoStatus(proposals, contacts);
  const recentActivity = normalizeActivityLog(activityLog).slice(0, 6);

  return (
    <section className="dashboard-panel no-print">
      <div className="dashboard-hero">
        <div>
          <p className="list-kicker">Production dashboard</p>
          <h2>Last Yard Proposal Workspace</h2>
          <p>Track local proposals, GC packets, backup status, and print-ready concrete proposal packets.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={onCreateProposal} disabled={!permissions.createProposal}>
            New Proposal
          </button>
          <button className="gold-action" type="button" onClick={onCreateGcPacket} disabled={!permissions.createProposal}>
            New GC Packet
          </button>
          <button type="button" onClick={onCreateCommercialProposal} disabled={!permissions.createProposal}>
            New Commercial Proposal
          </button>
          <button type="button" onClick={onCreateResidentialProposal} disabled={!permissions.createProposal}>
            New Residential Proposal
          </button>
          <button type="button" onClick={onCreateContact} disabled={!permissions.createContact}>
            New Contact
          </button>
          <button type="button" onClick={onCreateBid} disabled={!permissions.createBid}>
            Add Bid
          </button>
          <button type="button" onClick={onOpenList}>
            Open Proposals
          </button>
          <button type="button" onClick={onOpenContacts}>
            Contacts
          </button>
          <button type="button" onClick={onOpenBids}>
            Bid Tracker
          </button>
          <button type="button" onClick={onOpenPriceLibrary}>
            Price Library
          </button>
          <button type="button" onClick={onOpenActivity}>
            Activity Log
          </button>
          <button type="button" onClick={onOpenSettings}>
            Company Settings
          </button>
          <button type="button" onClick={onExportBackup}>
            Backup Tools
          </button>
        </div>
      </div>

      <ProposalSyncPanel
        authUser={authUser}
        cloudSync={cloudSync}
        canUseCloudActions={permissions.cloudSync}
        onPullCloudProposals={onPullCloudProposals}
        onPushLocalProposals={onPushLocalProposals}
        onSyncProposals={onSyncProposals}
      />

      <DemoOnboardingPanel
        demoStatus={demoStatus}
        permissions={permissions}
        onLoadDemoData={onLoadDemoData}
        onOpenSampleProposal={onOpenSampleProposal}
        onPrintSamplePacket={onPrintSamplePacket}
        onResetDemoData={onResetDemoData}
        onStartGcPacket={onCreateGcPacket}
      />

      <div className="dashboard-stat-grid">
        {stats.cards.map((card) => (
          <div className="dashboard-stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-summary-grid">
        <div className="dashboard-summary-card">
          <span>Total Proposed Value</span>
          <strong>{formatCurrency(stats.totalValue)}</strong>
        </div>
        <div className="dashboard-summary-card">
          <span>Full GC Packets</span>
          <strong>{stats.fullPacketCount}</strong>
        </div>
        <div className="dashboard-summary-card">
          <span>Last Updated Proposal</span>
          <strong>{stats.lastUpdated ? stats.lastUpdated.project?.name || stats.lastUpdated.proposalNumber : "None yet"}</strong>
          {stats.lastUpdated ? <small>{formatDashboardDate(stats.lastUpdated.updatedAt || stats.lastUpdated.createdAt || stats.lastUpdated.proposalDate)}</small> : null}
        </div>
        <div className="dashboard-summary-card">
          <span>Last Submitted Packet</span>
          <strong>{stats.lastSubmittedPacket ? stats.lastSubmittedPacket.packetTitle : "No packet records"}</strong>
          {stats.lastSubmittedPacket ? (
            <small>
              {formatOptionLabel(stats.lastSubmittedPacket.status)} | {formatDashboardDate(stats.lastSubmittedPacket.createdAt)}
            </small>
          ) : null}
        </div>
      </div>

      <div className="recent-proposals-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Audit trail</p>
            <h3>Recent Activity</h3>
          </div>
          <button type="button" onClick={onOpenActivity}>
            View Activity
          </button>
        </div>

        {recentActivity.length > 0 ? (
          <div className="activity-preview-list">
            {recentActivity.map((record) => {
              const activityMeta = getActivityDisplayMeta(record);

              return (
                <div className="activity-preview-row" key={record.id}>
                  <div className={`activity-type-badge activity-type-${activityMeta.tone}`}>
                    {activityMeta.label}
                  </div>
                  <div className="activity-preview-main">
                    <strong>{record.action}</strong>
                    <span>{record.entityLabel || record.entityId || record.entityType}</span>
                  </div>
                  <small>
                    {record.userEmail || "Local user"} | {formatCloudSyncTime(record.createdAt)}
                  </small>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-list-message">
            No activity yet. Actions like saving proposals, creating bids, attaching PDFs, and exporting backups will appear here.
          </p>
        )}
      </div>

      <div className="recent-proposals-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Bid pipeline</p>
            <h3>Upcoming Bid Opportunities</h3>
          </div>
          <button type="button" onClick={onOpenBids}>
            Open Bids
          </button>
        </div>

        {upcomingBids.length > 0 ? (
          <div className="bid-dashboard-list">
            {upcomingBids.map((bid) => (
              <div className="bid-dashboard-row" key={bid.id}>
                <div>
                  <strong>{bid.projectName || "Untitled bid"}</strong>
                  <span>{[bid.gcCompany, bid.projectLocation].filter(Boolean).join(" | ") || "No GC/location entered"}</span>
                </div>
                <div>
                  <Badge className={getBidStatusClass(bid.bidStatus)}>{bid.bidStatus}</Badge>
                  <small>{bid.bidDueDate ? `Due ${formatDisplayDate(bid.bidDueDate)}` : "No due date"}</small>
                </div>
                <p>{bid.nextStep || "Review opportunity details."}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No open bid opportunities are due soon.</p>
        )}
      </div>

      <div className="recent-proposals-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Proposal follow-up</p>
            <h3>Needs Follow-Up</h3>
          </div>
          <button type="button" onClick={onOpenList}>
            View Pipeline
          </button>
        </div>

        {followUpProposals.length > 0 ? (
          <div className="follow-up-list">
            {followUpProposals.map((proposal) => (
              <FollowUpRow key={proposal.id} proposal={proposal} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No sent proposals are due for follow-up today.</p>
        )}
      </div>

      <div className="recent-proposals-card">
        <div className="recent-heading">
          <div>
            <p className="list-kicker">Recent work</p>
            <h3>Recent Proposals</h3>
          </div>
          <button type="button" onClick={onOpenList}>
            View All
          </button>
        </div>

        {recentProposals.length > 0 ? (
          <div className="recent-list">
            {recentProposals.map((proposal) => (
              <ProposalSummaryRow
                key={proposal.id}
                contacts={contacts}
                proposal={proposal}
                onOpen={onOpen}
                onPrint={onOpenPrint}
                compact
              />
            ))}
          </div>
        ) : (
          <p className="empty-list-message">No proposals yet. Start with a standard proposal or a full GC packet.</p>
        )}
      </div>
    </section>
  );
}

class BidsRouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      resetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return {
        error: null,
        resetKey: props.resetKey,
      };
    }

    return null;
  }

  componentDidCatch(error) {
    console.error("Bid Tracker render failed:", error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <section className="bids-panel no-print">
        <div className="contact-empty-state bid-route-error-state">
          <p className="list-kicker">Bid Tracker</p>
          <h3>Bid Tracker could not render one saved record.</h3>
          <p>The app recovered instead of showing a blank screen. Start a new bid or return to the dashboard.</p>
          <div className="settings-actions">
            <button type="button" onClick={this.props.onNewBid}>
              Add Bid
            </button>
            <button type="button" onClick={this.props.onBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }
}

function BidsView({
  bidDraft,
  bidSmartPasteNotes,
  bidSmartPasteResult,
  bids = [],
  contacts = [],
  isEditorOpen,
  message,
  permissions = {},
  priorityFilter,
  proposals = [],
  searchQuery,
  statusFilter,
  onBackToDashboard,
  onCreateProposal,
  onDelete,
  onDuplicate,
  onEdit,
  onFillBidFromNotes,
  onLinkProposal,
  onMarkSubmitted,
  onNew,
  onOpenProposal,
  onPriorityFilterChange,
  onSave,
  onSearchChange,
  onStatusChange,
  onStatusFilterChange,
  onUpdateBidSmartPasteNotes,
  onUpdateDraft,
}) {
  const [hideQaTestRecords, setHideQaTestRecords] = useState(false);
  const displayBids = hideQaTestRecords ? bids.filter((bid) => !isQaTestRecord(bid)) : bids;
  const filteredBids = filterBids(displayBids, {
    priorityFilter,
    searchQuery,
    statusFilter,
  });
  const linkedProposal = proposals.find((proposal) => proposal.id === bidDraft.proposalId);
  const linkedPacketRecord = getBidLinkedPacketRecord(bidDraft, linkedProposal);
  const linkedPacketHasPdf = hasPacketPdfAttachment(linkedPacketRecord);
  const isSavedBid = bids.some((bid) => bid.id === bidDraft.id);

  return (
    <section className="bids-panel no-print">
      <div className="list-heading">
        <div>
          <p className="list-kicker">Bid Tracker</p>
          <h2>Bid Pipeline</h2>
          <p>Track GC bid opportunities before they become proposal packets.</p>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          <button className="gold-action" type="button" onClick={onNew} disabled={!permissions.createBid}>
            Add Bid
          </button>
        </div>
      </div>

      {message ? <p className="backup-message">{message}</p> : null}

      <div className="bids-layout">
        <div className="bids-list-card">
          <div className="list-filters bid-filters">
            <label>
              <span>Search</span>
              <input
                value={searchQuery}
                placeholder="Search project, GC, location..."
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
            <label>
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                <option value="all">All Statuses</option>
                <option value="due_this_week">Due This Week</option>
                <option value="overdue">Overdue</option>
                <option value="no_proposal">No Proposal Linked</option>
                {BID_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={priorityFilter} onChange={(event) => onPriorityFilterChange(event.target.value)}>
                <option value="all">All Priorities</option>
                {BID_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label className="test-record-filter">
              <input
                checked={hideQaTestRecords}
                type="checkbox"
                onChange={(event) => setHideQaTestRecords(event.target.checked)}
              />
              <span>Hide QA/Test Records</span>
            </label>
          </div>

          {filteredBids.length > 0 ? (
            <div className="bid-list">
              {filteredBids.map((bid) => {
                const bidProposal = proposals.find((proposal) => proposal.id === bid.proposalId);
                const bidPacketRecord = getBidLinkedPacketRecord(bid, bidProposal);
                const bidPacketHasPdf = hasPacketPdfAttachment(bidPacketRecord);
                const deadlineClass = getBidDeadlineClass(bid);

                return (
                  <article className="bid-card" key={bid.id}>
                    <div className="bid-card-main">
                      <div>
                        <div className="bid-card-title">
                          <strong>{bid.projectName || "Untitled bid"}</strong>
                          <Badge className={getBidStatusClass(bid.bidStatus)}>{bid.bidStatus}</Badge>
                          <Badge className={getBidPriorityClass(bid.priority)}>{bid.priority}</Badge>
                          {bid.bidStatus === "Submitted" || bidPacketRecord ? (
                            <Badge className={bidPacketHasPdf ? "packet-pdf-attached" : "packet-pdf-missing"}>
                              {bidPacketHasPdf ? "PDF attached" : "PDF missing"}
                            </Badge>
                          ) : null}
                        </div>
                        <p>{[bid.gcCompany, bid.ownerOrClient, bid.projectLocation].filter(Boolean).join(" | ") || "No GC/owner/location entered"}</p>
                        <div className="bid-card-deadlines">
                          <span className={`bid-deadline-pill ${deadlineClass}`}>{formatBidDueLabel(bid)}</span>
                          {bid.preBidMeetingDate ? <span>Pre-bid {formatDisplayDate(bid.preBidMeetingDate)}</span> : null}
                          {bid.rfiDeadline ? <span>RFI {formatDisplayDate(bid.rfiDeadline)}</span> : null}
                        </div>
                        <small>{bid.nextStep || "No next step"}</small>
                      </div>
                      <div className="bid-card-meta">
                        <span className={bidProposal ? "bid-linked-proposal" : "bid-no-proposal"}>
                          {bidProposal ? `Linked proposal: ${bidProposal.proposalNumber}` : "No proposal yet"}
                        </span>
                        {bidPacketRecord ? (
                          <span>{`Packet: ${formatOptionLabel(bidPacketRecord.status)}${bidPacketHasPdf ? " with PDF" : " without PDF"}`}</span>
                        ) : (
                          <span>No submitted packet linked</span>
                        )}
                        {bid.followUpDate ? <span>Follow-up {formatDisplayDate(bid.followUpDate)}</span> : null}
                      </div>
                    </div>
                    <div className="table-actions">
                      <button type="button" onClick={() => onEdit(bid)}>
                        Edit
                      </button>
                      <button type="button" title="Create a GC proposal draft from this bid opportunity." onClick={() => onCreateProposal(bid.id)} disabled={!permissions.createProposal}>
                        Create Proposal
                      </button>
                      {bidProposal ? (
                        <button type="button" onClick={() => onOpenProposal(bidProposal.id)}>
                          Open Proposal
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!permissions.editBid}
                          onClick={() => {
                            const proposalKey = window.prompt("Enter proposal number or ID to link:");
                            if (proposalKey) {
                              onLinkProposal(bid.id, proposalKey);
                            }
                          }}
                        >
                          Link Existing
                        </button>
                      )}
                      <button type="button" onClick={() => onStatusChange(bid.id, "No-Bid")} disabled={!permissions.editBid}>
                        Mark No-Bid
                      </button>
                      <button type="button" onClick={() => onMarkSubmitted(bid.id)} disabled={!permissions.editBid}>
                        Mark Submitted
                      </button>
                      <button type="button" onClick={() => onStatusChange(bid.id, "Awarded")} disabled={!permissions.editBid}>
                        Awarded
                      </button>
                      <button type="button" onClick={() => onStatusChange(bid.id, "Lost")} disabled={!permissions.editBid}>
                        Lost
                      </button>
                      <button type="button" title="Copy this bid opportunity as a new record." onClick={() => onDuplicate(bid.id)} disabled={!permissions.createBid}>
                        Duplicate
                      </button>
                      <button type="button" onClick={() => onDelete(bid.id)} disabled={!permissions.deleteBid}>
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-list-message">No bid opportunities match the current filters.</p>
          )}
        </div>

        <div className="bid-form-card">
          {isEditorOpen ? (
            <>
              <div className="contact-form-heading">
                <p className="list-kicker">Bid details</p>
                <h3>{bidDraft.projectName || "New Bid Opportunity"}</h3>
                <p>Save project pursuit details, due dates, GC contacts, and proposal links.</p>
              </div>

              {!permissions.editBid ? <p className="permission-message">Bid details are read-only for your current role.</p> : null}
              <fieldset className="editor-permission-fieldset" disabled={!permissions.editBid}>
              <BidSmartPastePanel
                notes={bidSmartPasteNotes}
                result={bidSmartPasteResult}
                onFill={onFillBidFromNotes}
                onNotesChange={onUpdateBidSmartPasteNotes}
              />

              <div className="bid-form-sections">
                <BidFormSection title="Project / Opportunity Info" helper="Start with the pursuit name, location, and source links.">
                  <div className="bid-form-grid">
                    <EditorField label="Project Name" path="projectName" value={bidDraft.projectName} onChange={(_, value) => onUpdateDraft("projectName", value)} />
                    <EditorField label="Project Location" path="projectLocation" value={bidDraft.projectLocation} onChange={(_, value) => onUpdateDraft("projectLocation", value)} />
                    <EditorField label="Bid Source" path="bidSource" value={bidDraft.bidSource} onChange={(_, value) => onUpdateDraft("bidSource", value)} />
                    <EditorField label="Bid URL" path="bidUrl" value={bidDraft.bidUrl} onChange={(_, value) => onUpdateDraft("bidUrl", value)} />
                    <div className="bid-form-wide">
                      <EditorField label="Plan Link" path="planLink" value={bidDraft.planLink} onChange={(_, value) => onUpdateDraft("planLink", value)} />
                    </div>
                  </div>
                </BidFormSection>

                <BidFormSection title="GC / Owner / Contact" helper="Link a saved GC/client contact or enter bid-specific contact details.">
                  <div className="bid-form-grid">
                    <EditorField label="Owner / Client" path="ownerOrClient" value={bidDraft.ownerOrClient} onChange={(_, value) => onUpdateDraft("ownerOrClient", value)} />
                    <EditorField label="GC Company" path="gcCompany" value={bidDraft.gcCompany} onChange={(_, value) => onUpdateDraft("gcCompany", value)} />
                    <label className="contact-select-field bid-form-wide">
                      <span>Select Saved Contact / GC</span>
                      <select value={bidDraft.contactId} onChange={(event) => onUpdateDraft("contactId", event.target.value)}>
                        <option value="">No saved contact linked</option>
                        {contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {formatContactName(contact)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <EditorField label="Contact Name" path="contactName" value={bidDraft.contactName} onChange={(_, value) => onUpdateDraft("contactName", value)} />
                    <EditorField label="Contact Email" path="contactEmail" value={bidDraft.contactEmail} onChange={(_, value) => onUpdateDraft("contactEmail", value)} />
                    <EditorField label="Contact Phone" path="contactPhone" value={bidDraft.contactPhone} onChange={(_, value) => onUpdateDraft("contactPhone", value)} />
                  </div>
                </BidFormSection>

                <BidFormSection title="Bid Dates / Deadlines" helper="Keep hard dates visible for pursuit planning.">
                  <div className="bid-form-grid">
                    <EditorField label="Bid Due Date" path="bidDueDate" type="date" value={bidDraft.bidDueDate} onChange={(_, value) => onUpdateDraft("bidDueDate", value)} />
                    <EditorField label="Bid Due Time" path="bidDueTime" type="time" value={bidDraft.bidDueTime} onChange={(_, value) => onUpdateDraft("bidDueTime", value)} />
                    <EditorField label="Pre-Bid Meeting" path="preBidMeetingDate" type="date" value={bidDraft.preBidMeetingDate} onChange={(_, value) => onUpdateDraft("preBidMeetingDate", value)} />
                    <EditorField label="RFI Deadline" path="rfiDeadline" type="date" value={bidDraft.rfiDeadline} onChange={(_, value) => onUpdateDraft("rfiDeadline", value)} />
                    <EditorField label="Addendum Deadline" path="addendumDeadline" type="date" value={bidDraft.addendumDeadline} onChange={(_, value) => onUpdateDraft("addendumDeadline", value)} />
                    <EditorField label="Expected Award Date" path="expectedAwardDate" type="date" value={bidDraft.expectedAwardDate} onChange={(_, value) => onUpdateDraft("expectedAwardDate", value)} />
                  </div>
                </BidFormSection>

                <BidFormSection title="Scope / Concrete Work" helper="Capture enough detail to decide whether to estimate or create a proposal.">
                  <div className="bid-form-grid">
                    <EditorField label="Scope Summary" path="scopeSummary" value={bidDraft.scopeSummary} onChange={(_, value) => onUpdateDraft("scopeSummary", value)} multiline />
                    <EditorField label="Concrete Scope" path="concreteScope" value={bidDraft.concreteScope} onChange={(_, value) => onUpdateDraft("concreteScope", value)} multiline />
                  </div>
                </BidFormSection>

                <BidFormSection title="Risk / Missing Info" helper="Warnings are for review later. Incomplete bids can still be saved.">
                  <div className="bid-form-grid">
                    <EditorField label="Red Flags" path="redFlags" value={bidDraft.redFlags} onChange={(_, value) => onUpdateDraft("redFlags", value)} multiline />
                    <EditorField label="Missing Info" path="missingInfo" value={bidDraft.missingInfo} onChange={(_, value) => onUpdateDraft("missingInfo", value)} multiline />
                    <div className="bid-form-wide">
                      <EditorField label="Notes" path="notes" value={bidDraft.notes} onChange={(_, value) => onUpdateDraft("notes", value)} multiline />
                    </div>
                  </div>
                </BidFormSection>

                <BidFormSection title="Status / Priority / Next Step" helper="Set where this opportunity sits in the bid pipeline.">
                  <div className="bid-form-grid">
                    <EditorField label="Bid Status" path="bidStatus" value={bidDraft.bidStatus} onChange={(_, value) => onUpdateDraft("bidStatus", value)} options={BID_STATUSES} />
                    <EditorField label="Priority" path="priority" value={bidDraft.priority} onChange={(_, value) => onUpdateDraft("priority", value)} options={BID_PRIORITIES} />
                    <EditorField label="Estimator Assigned" path="estimatorAssigned" value={bidDraft.estimatorAssigned} onChange={(_, value) => onUpdateDraft("estimatorAssigned", value)} />
                    <EditorField label="Follow-Up Date" path="followUpDate" type="date" value={bidDraft.followUpDate} onChange={(_, value) => onUpdateDraft("followUpDate", value)} />
                    <div className="bid-form-wide">
                      <EditorField label="Next Step" path="nextStep" value={bidDraft.nextStep} onChange={(_, value) => onUpdateDraft("nextStep", value)} multiline />
                    </div>
                  </div>
                </BidFormSection>

                <BidFormSection title="Linked Proposal / Submitted Packet" helper="Connect the bid to the proposal and submitted packet record when ready.">
                  <div className="bid-form-grid">
                    <label className="contact-select-field bid-form-wide">
                      <span>Linked Proposal</span>
                      <select value={bidDraft.proposalId} onChange={(event) => onUpdateDraft("proposalId", event.target.value)}>
                        <option value="">No proposal linked</option>
                        {proposals.map((proposal) => (
                          <option key={proposal.id} value={proposal.id}>
                            {proposal.proposalNumber} - {proposal.project?.name || "Untitled"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="bid-link-summary bid-form-wide">
                      <strong>{linkedProposal ? `Linked proposal: ${linkedProposal.proposalNumber}` : "No proposal yet"}</strong>
                      <span>{linkedProposal?.project?.name || "Create or link a proposal when this bid is ready."}</span>
                      <span>
                        {linkedPacketRecord
                          ? `Submitted packet: ${formatOptionLabel(linkedPacketRecord.status)}${linkedPacketHasPdf ? " with PDF attached" : " without PDF"}`
                          : "No submitted packet linked"}
                      </span>
                    </div>
                  </div>
                </BidFormSection>
              </div>

              <div className="contact-form-actions">
                <button type="button" title="Save this bid locally and sync through company settings when available." onClick={onSave}>
                  Save Bid
                </button>
                <button
                  className="gold-action"
                  type="button"
                  title="Create a proposal from this saved bid opportunity."
                  onClick={() => onCreateProposal(bidDraft.id)}
                  disabled={!isSavedBid || !permissions.createProposal}
                >
                  Create Proposal from Bid
                </button>
              </div>
              </fieldset>
            </>
          ) : (
            <div className="contact-empty-state">
              <p className="list-kicker">No bid selected</p>
              <h3>Select a bid to edit, or create a new opportunity.</h3>
              <p>Use the bid tracker for due dates, GC pursuit notes, no-bid decisions, and proposal links.</p>
              <button type="button" onClick={onNew} disabled={!permissions.createBid}>
                Add Bid
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BidFormSection({ children, helper = "", title }) {
  return (
    <section className="bid-form-section">
      <div className="bid-form-section-heading">
        <strong>{title}</strong>
        {helper ? <span>{helper}</span> : null}
      </div>
      {children}
    </section>
  );
}

function BidSmartPastePanel({ notes, result, onFill, onNotesChange }) {
  return (
    <div className="bid-smart-paste-panel no-print">
      <div>
        <p className="list-kicker">Smart Paste</p>
        <h4>Paste Bid Notes</h4>
        <p className="smart-paste-help">
          Paste bid invite text, OregonBuys details, GC email notes, plan room notes, or project scope notes. Review all fields before using.
        </p>
        <p className="smart-paste-help">Bid opportunities can be saved before all details are known.</p>
      </div>
      <label className="editor-field" htmlFor="bid-smart-paste-notes">
        <span>Bid Notes</span>
        <textarea
          id="bid-smart-paste-notes"
          value={notes}
          rows={6}
          placeholder="Project: Settlemier Park Renovation&#10;GC: ABC Prime Contractors&#10;Contact: Mike Smith&#10;Bid Due: June 14, 2026 2:30 PM&#10;Scope: sidewalks, ADA ramps, curb and concrete flatwork"
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </label>
      <button className="editor-add-button" type="button" onClick={onFill}>
        Fill Bid From Notes
      </button>
      {result ? <BidSmartPasteSummary result={result} /> : null}
    </div>
  );
}

function BidSmartPasteSummary({ result }) {
  const fields = result.fields || [];
  const dates = result.dates || [];
  const contactInfo = result.contactInfo || [];
  const unclearItems = result.unclearItems || [];
  const warnings = result.warnings || [];

  return (
    <div className="smart-paste-summary bid-smart-paste-summary" aria-live="polite">
      <strong>Bid Smart Paste Summary</strong>
      <ul>
        <li>{fields.length} fields updated</li>
        <li>{dates.length} dates detected</li>
        <li>{contactInfo.length} contact items detected</li>
        {fields.length > 0 ? <li>Updated: {fields.join(", ")}</li> : null}
        {dates.length > 0 ? <li>Dates: {dates.join(", ")}</li> : null}
        {contactInfo.length > 0 ? <li>Contact info: {contactInfo.join(", ")}</li> : null}
      </ul>
      {unclearItems.length > 0 ? (
        <div className="smart-paste-warnings bid-smart-paste-review">
          <span>Unclear items</span>
          <ul>
            {unclearItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="smart-paste-warnings bid-smart-paste-review">
          <span>Missing Info / Review Later</span>
          <p>These are not errors. You can save the bid now and complete these fields later.</p>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ContactsView({
  contactDraft,
  contacts,
  isEditorOpen,
  message,
  permissions = {},
  proposals,
  searchQuery,
  typeFilter,
  onBackToDashboard,
  onDelete,
  onEdit,
  onNew,
  onOpenProposal,
  onSave,
  onSearchChange,
  onTypeFilterChange,
  onUpdateDraft,
}) {
  const filteredContacts = contacts.filter((contact) => {
    const searchText = [contact.companyName, contact.contactName, contact.phone, contact.email].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = searchText.includes(searchQuery.trim().toLowerCase());
    const matchesType = typeFilter === "all" || contact.contactType === typeFilter;

    return matchesSearch && matchesType;
  });

  const linkedProposals = isEditorOpen && contactDraft.id ? proposals.filter((proposal) => proposal.contactId === contactDraft.id) : [];
  const editingExistingContact = isEditorOpen && contacts.some((contact) => contact.id === contactDraft.id);
  const contactHeading = hasTextValue(contactDraft.companyName) || hasTextValue(contactDraft.contactName)
    ? formatContactName(contactDraft)
    : "New Contact";

  return (
    <section className="contacts-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Local client database</p>
          <h2>Customer / GC Contacts</h2>
          {message ? <span className="settings-message">{message}</span> : null}
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          <button type="button" onClick={onNew} disabled={!permissions.createContact}>
            New Contact
          </button>
          <button type="button" onClick={onSave} disabled={!isEditorOpen || !permissions.editContact}>
            Save Contact
          </button>
        </div>
      </div>

      <div className="contacts-layout">
        <div className="contact-form-card">
          {isEditorOpen ? (
            <>
              <div className="contact-form-heading">
                <p className="list-kicker">{editingExistingContact ? "Edit contact" : "New contact"}</p>
                <h3>{contactHeading}</h3>
              </div>
              {!permissions.editContact ? <p className="permission-message">Contact details are read-only for your current role.</p> : null}
              <fieldset className="editor-permission-fieldset" disabled={!permissions.editContact}>
              <div className="contact-form-grid">
                <EditorField
                  label="Company Name"
                  path="contact.companyName"
                  value={contactDraft.companyName}
                  placeholder="ABC Prime Contractors"
                  onChange={(_, value) => onUpdateDraft("companyName", value)}
                />
                <EditorField
                  label="Contact Name"
                  path="contact.contactName"
                  value={contactDraft.contactName}
                  placeholder="Project manager or estimator"
                  onChange={(_, value) => onUpdateDraft("contactName", value)}
                />
                <EditorField label="Phone" path="contact.phone" value={contactDraft.phone} placeholder="(555) 123-4567" onChange={(_, value) => onUpdateDraft("phone", value)} />
                <EditorField
                  label="Email"
                  path="contact.email"
                  type="email"
                  value={contactDraft.email}
                  placeholder="name@company.com"
                  onChange={(_, value) => onUpdateDraft("email", value)}
                />
                <EditorField
                  label="Contact Type"
                  path="contact.contactType"
                  value={contactDraft.contactType}
                  onChange={(_, value) => onUpdateDraft("contactType", value)}
                  options={CONTACT_TYPES}
                />
                <EditorField
                  label="Default Project Address"
                  path="contact.defaultProjectAddress"
                  value={contactDraft.defaultProjectAddress}
                  placeholder="Common jobsite address or service area"
                  onChange={(_, value) => onUpdateDraft("defaultProjectAddress", value)}
                />
                <div className="contact-wide-field">
                  <EditorField
                    label="Billing Address"
                    path="contact.billingAddress"
                    value={contactDraft.billingAddress}
                    placeholder="Billing street, city, state, ZIP"
                    onChange={(_, value) => onUpdateDraft("billingAddress", value)}
                    multiline
                  />
                </div>
                <div className="contact-wide-field">
                  <EditorField
                    label="Notes"
                    path="contact.notes"
                    value={contactDraft.notes}
                    placeholder="Portal notes, preferred contact method, estimating notes"
                    onChange={(_, value) => onUpdateDraft("notes", value)}
                    multiline
                  />
                </div>
              </div>

              {linkedProposals.length > 0 ? (
                <div className="contact-linked-proposals">
                  <strong>Linked proposals</strong>
                  {linkedProposals.slice(0, 5).map((proposal) => (
                    <button key={proposal.id} type="button" onClick={() => onOpenProposal(proposal.id)}>
                      {formatProposalNumberWithRevision(proposal)} - {proposal.project?.name || "Untitled project"}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="contact-form-actions">
                <button type="button" onClick={onSave}>
                  Save Contact
                </button>
              </div>
              </fieldset>
            </>
          ) : (
            <div className="contact-empty-state">
              <p className="list-kicker">Contact details</p>
              <h3>Select a contact to edit, or create a new contact.</h3>
              <p>Saved contacts can fill client and GC information on new proposals without retyping.</p>
              <button type="button" onClick={onNew} disabled={!permissions.createContact}>
                New Contact
              </button>
            </div>
          )}
        </div>

        <div className="contacts-list-card">
          <div className="list-filters contact-filters">
            <label>
              <span>Search Contacts</span>
              <input
                type="search"
                value={searchQuery}
                placeholder="Company, contact, phone, or email"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
            <label>
              <span>Contact Type</span>
              <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
                <option value="all">All contact types</option>
                {CONTACT_TYPES.filter(Boolean).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="contacts-list">
            {filteredContacts.map((contact) => {
              const proposalCount = getProposalCountForContact(contact.id, proposals);

              return (
                <article className="contact-row" key={contact.id}>
                  <div>
                    <strong>{formatContactName(contact)}</strong>
                    <span>{contact.contactType || "Other"}</span>
                    <small>{[contact.phone, contact.email].filter(Boolean).join(" | ") || "No phone/email entered"}</small>
                    <small>{proposalCount} linked proposal{proposalCount === 1 ? "" : "s"}</small>
                  </div>
                  <div className="contact-row-actions">
                    <button type="button" onClick={() => onEdit(contact)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(contact.id)} disabled={!permissions.deleteContact}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredContacts.length === 0 ? <p className="empty-list-message">No contacts match those filters.</p> : null}
        </div>
      </div>
    </section>
  );
}

function PriceLibraryView({
  canExport = true,
  canImport = true,
  canManage = true,
  items = [],
  message = "",
  onBackToDashboard,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  onSave,
  onToggleActive,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [importMode, setImportMode] = useState("merge");
  const [importFile, setImportFile] = useState(null);
  const [draft, setDraft] = useState(() => createEmptyPriceLibraryDraft());
  const filteredItems = filterPriceLibraryItems(items, searchQuery, categoryFilter);
  const activeCount = items.filter((item) => item.active !== false).length;

  function updateDraft(field, value) {
    if (!canManage) {
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function editItem(item) {
    if (!canManage) {
      return;
    }

    setDraft({
      ...normalizePriceLibraryItem(item),
      defaultScopeBullets: formatPriceLibraryListInput(item.defaultScopeBullets),
      defaultExclusions: formatPriceLibraryListInput(item.defaultExclusions),
    });
  }

  async function saveDraft() {
    await onSave(draft);
    setDraft(createEmptyPriceLibraryDraft());
  }

  return (
    <section className="price-library-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Reusable estimating items</p>
          <h2>Unit Price Library</h2>
          <span className="settings-message">
            {activeCount} active items | {items.length} total items
          </span>
          {message ? <span className="settings-message">{message}</span> : null}
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          <button type="button" onClick={() => setDraft(createEmptyPriceLibraryDraft())} disabled={!canManage}>
            New Item
          </button>
          <button type="button" title="Export the unit price library as a JSON backup file." onClick={onExport} disabled={!canExport}>
            Export Library
          </button>
        </div>
      </div>

      <div className="price-library-layout">
        <div className="price-library-list-card">
          <div className="list-filters">
            <label>
              <span>Search</span>
              <input
                type="search"
                value={searchQuery}
                placeholder="Name, category, unit, or description"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {PRICE_LIBRARY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="price-library-table-wrap">
            <table className="proposal-list-table price-library-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Default</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>
                      <strong>{formatCurrency(item.defaultUnitPrice)}</strong>
                      <span>Qty {item.defaultQuantity || 1}</span>
                    </td>
                    <td>
                      <label className="editor-check">
                        <input
                          checked={item.active !== false}
                          type="checkbox"
                          disabled={!canManage}
                          onChange={(event) => onToggleActive(item.id, event.target.checked)}
                        />
                        <span>{item.active === false ? "Inactive" : "Active"}</span>
                      </label>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => editItem(item)} disabled={!canManage}>
                          Edit
                        </button>
                        <button type="button" title="Create a copy of this price item." onClick={() => onDuplicate(item.id)} disabled={!canManage}>
                          Duplicate
                        </button>
                        <button type="button" onClick={() => onDelete(item.id)} disabled={!canManage}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeCount === 0 ? (
            <p className="empty-list-message">
              No active price library items are available. Add an item or turn an existing item active to use it from proposal pricing.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="empty-list-message">No price library items match those filters.</p>
          ) : null}

          <div className="price-library-import-card">
            <h3>Import Price Library</h3>
            <p className="backup-help">Import a saved price library JSON file. Replace mode requires confirmation.</p>
            <div className="backup-import-grid">
              <label>
                <span>Import Mode</span>
                <select value={importMode} onChange={(event) => setImportMode(event.target.value)} disabled={!canImport}>
                  <option value="merge">Merge with Existing</option>
                  <option value="replace">Replace Existing</option>
                </select>
              </label>
              <label className="backup-file-field">
                <span>JSON File</span>
                <input type="file" accept="application/json,.json" onChange={(event) => setImportFile(event.target.files?.[0] || null)} disabled={!canImport} />
              </label>
              <button type="button" title="Import price library items from a JSON backup file." onClick={() => onImport(importFile, importMode)} disabled={!canImport}>
                Import Price Library
              </button>
            </div>
          </div>
        </div>

        <div className="price-library-form-card">
          <h3>{draft.id ? "Edit Price Item" : "Add Price Item"}</h3>
          {!canManage ? <p className="permission-message">Price library management is read-only for your current role.</p> : null}
          <fieldset className="editor-permission-fieldset" disabled={!canManage}>
          <div className="price-library-form-grid">
            <EditorField label="Name" path="priceLibrary.name" value={draft.name} onChange={(_, value) => updateDraft("name", value)} />
            <EditorField
              label="Category"
              path="priceLibrary.category"
              value={draft.category}
              onChange={(_, value) => updateDraft("category", value)}
              options={PRICE_LIBRARY_CATEGORIES}
            />
            <div className="price-library-wide-field">
              <EditorField
                label="Description"
                path="priceLibrary.description"
                value={draft.description}
                onChange={(_, value) => updateDraft("description", value)}
              />
            </div>
            <EditorField
              label="Unit"
              path="priceLibrary.unit"
              value={draft.unit}
              onChange={(_, value) => updateDraft("unit", value)}
              options={LINE_ITEM_UNITS}
            />
            <EditorField
              label="Default Quantity"
              path="priceLibrary.defaultQuantity"
              type="number"
              value={draft.defaultQuantity}
              onChange={(_, value) => updateDraft("defaultQuantity", value)}
            />
            <EditorField
              label="Default Unit Price"
              path="priceLibrary.defaultUnitPrice"
              type="number"
              value={draft.defaultUnitPrice}
              onChange={(_, value) => updateDraft("defaultUnitPrice", value)}
            />
            <div className="editor-field">
              <span>Taxable</span>
              <label className="editor-check price-library-check">
                <input
                  checked={draft.taxable !== false}
                  type="checkbox"
                  onChange={(event) => updateDraft("taxable", event.target.checked)}
                />
                <span>Taxable line item</span>
              </label>
            </div>
            <div className="editor-field">
              <span>Active</span>
              <label className="editor-check price-library-check">
                <input
                  checked={draft.active !== false}
                  type="checkbox"
                  onChange={(event) => updateDraft("active", event.target.checked)}
                />
                <span>Show in proposal picker</span>
              </label>
            </div>
            <div className="price-library-wide-field">
              <EditorField
                label="Notes"
                path="priceLibrary.defaultNotes"
                value={draft.defaultNotes}
                onChange={(_, value) => updateDraft("defaultNotes", value)}
                multiline
              />
            </div>
            <div className="price-library-wide-field">
              <EditorField
                label="Default Scope Bullets"
                path="priceLibrary.defaultScopeBullets"
                value={draft.defaultScopeBullets}
                onChange={(_, value) => updateDraft("defaultScopeBullets", value)}
                multiline
              />
            </div>
            <div className="price-library-wide-field">
              <EditorField
                label="Default Exclusions"
                path="priceLibrary.defaultExclusions"
                value={draft.defaultExclusions}
                onChange={(_, value) => updateDraft("defaultExclusions", value)}
                multiline
              />
            </div>
          </div>
          <div className="price-library-form-actions">
            <button type="button" title="Save this reusable price item for future proposal line items." onClick={saveDraft}>
              Save Price Item
            </button>
            <button type="button" onClick={() => setDraft(createEmptyPriceLibraryDraft())}>
              Clear Form
            </button>
          </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}

function ProposalSummaryRow({ compact = false, contacts = [], onDuplicate, onExport, onOpen, onPrint, proposal }) {
  const total = calculateProposalTotals(proposal).total;
  const packetMode = getPacketModeLabel(proposal);
  const linkedContact = getLinkedContact(proposal, contacts);
  const latestPacketRecord = getLatestSubmittedPacketRecord(proposal);
  const latestSendRecord = getLatestSendRecord(proposal);

  return (
    <div className={`proposal-summary-row ${compact ? "compact" : ""}`}>
      <div className="proposal-summary-main">
        <strong>{formatProposalNumberWithRevision(proposal) || "No proposal #"}</strong>
        <span>{proposal.project?.name || "Untitled project"}</span>
        <small>{proposal.client?.companyName || proposal.client?.contactName || "No client entered"}</small>
        {linkedContact ? <small>Linked: {formatContactName(linkedContact)}</small> : null}
      </div>
      <div className="proposal-summary-meta">
        <Badge>{formatOptionLabel(proposal.proposalType ?? proposal.type)}</Badge>
        <Badge className={packetMode === "Full GC Packet" ? "packet-full" : "packet-summary"}>{packetMode}</Badge>
        <Badge className={latestPacketRecord ? `packet-record-${latestPacketRecord.status}` : "packet-record-none"}>
          {latestPacketRecord ? formatOptionLabel(latestPacketRecord.status) : "No packet record"}
        </Badge>
        {latestPacketRecord ? (
          <Badge className={hasPacketPdfAttachment(latestPacketRecord) ? "packet-pdf-attached" : "packet-pdf-missing"}>
            {hasPacketPdfAttachment(latestPacketRecord) ? "PDF attached" : "PDF missing"}
          </Badge>
        ) : null}
        <StatusBadge status={proposal.status} />
        {latestSendRecord ? <Badge className="packet-record-sent">Sent package {formatDisplayDate(latestSendRecord.sentDate)}</Badge> : null}
      </div>
      <div className="proposal-summary-total">
        <strong>{formatCurrency(total)}</strong>
        <small>{formatDashboardDate(proposal.updatedAt || proposal.createdAt || proposal.proposalDate)}</small>
      </div>
      <div className="proposal-summary-actions">
        <button type="button" onClick={() => onOpen(proposal.id)}>
          Open
        </button>
        <button type="button" onClick={() => onPrint(proposal)}>
          Print
        </button>
        {onDuplicate ? (
        <button type="button" title="Create a separate copy of this proposal as a new draft." onClick={() => onDuplicate(proposal)}>
          Duplicate
        </button>
        ) : null}
        {onExport ? (
          <button type="button" onClick={() => onExport(proposal)}>
            Export
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FollowUpRow({ onOpen, proposal }) {
  const total = calculateProposalTotals(proposal).total;

  return (
    <div className="follow-up-row">
      <div>
        <strong>{formatProposalNumberWithRevision(proposal)}</strong>
        <span>{proposal.project?.name || "Untitled project"}</span>
        <small>{proposal.client?.companyName || proposal.client?.contactName || "No client entered"}</small>
      </div>
      <div>
        <span>Follow-up</span>
        <strong>{formatDisplayDate(proposal.followUpDate)}</strong>
      </div>
      <div>
        <span>Total</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
      <div>
        <span>Next action</span>
        <small>{proposal.nextAction || "Follow up on proposal decision."}</small>
      </div>
      <button type="button" onClick={() => onOpen(proposal.id)}>
        Open
      </button>
    </div>
  );
}

function ProposalSyncPanel({ authUser, canUseCloudActions = true, cloudSync, onPullCloudProposals, onPushLocalProposals, onSyncProposals }) {
  const actionsDisabled = cloudSync.loading || !canUseCloudSync(authUser) || !canUseCloudActions;

  return (
    <div className="proposal-sync-panel no-print">
      <div>
        <span>Proposal sync</span>
        <strong>{cloudSync.loading ? "Syncing" : cloudSync.proposalStatus}</strong>
        <small>Last sync: {formatCloudSyncTime(cloudSync.lastSyncedAt)}</small>
      </div>
      <p>
        {canUseCloudSync(authUser)
          ? "Proposals save to localStorage and Supabase. New uploaded images use Supabase Storage when signed in."
          : getCloudSignInMessage()}
      </p>
      {isSupabaseConfigured ? (
        <div className="proposal-sync-actions">
          <button type="button" onClick={onPullCloudProposals} disabled={actionsDisabled}>
            Pull Cloud Proposals
          </button>
          <button type="button" onClick={() => onPushLocalProposals()} disabled={actionsDisabled}>
            Push Local Proposals
          </button>
          <button type="button" onClick={onSyncProposals} disabled={actionsDisabled}>
            Sync Proposals Now
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DemoOnboardingPanel({
  demoStatus,
  permissions = {},
  onLoadDemoData,
  onOpenSampleProposal,
  onPrintSamplePacket,
  onResetDemoData,
  onStartGcPacket,
}) {
  const checklist = [
    "Add or select a GC/client contact",
    "Choose a proposal template",
    "Paste rough bid notes with Smart Paste",
    "Review pricing and alternates",
    "Add plan/takeoff pages if needed",
    "Save proposal",
    "Open print view",
    "Export backup",
  ];

  return (
    <section className="demo-onboarding-panel no-print">
      <div className="demo-onboarding-copy">
        <p className="list-kicker">Start here</p>
        <h3>Client-Ready Demo Mode</h3>
        <p>
          Load sample data to walk through a GC packet, a simple residential proposal, contacts, print view, and backup/export flow.
          Demo records are marked and can be reset without deleting real work.
        </p>
        <div className="demo-status-line">
          <Badge>{demoStatus.isLoaded ? "Demo data loaded" : "Demo data not loaded"}</Badge>
          <span>{demoStatus.proposalCount} demo proposal(s)</span>
          <span>{demoStatus.contactCount} demo contact(s)</span>
        </div>
        <div className="demo-actions">
          <button type="button" onClick={() => onLoadDemoData()} disabled={!permissions.createProposal}>
            Load Demo Data
          </button>
          <button type="button" onClick={onResetDemoData} disabled={!permissions.deleteProposal}>
            Reset Demo Data
          </button>
          <button className="gold-action" type="button" onClick={onStartGcPacket} disabled={!permissions.createProposal}>
            Start New GC Packet
          </button>
          <button type="button" onClick={onOpenSampleProposal}>
            Open Sample Proposal
          </button>
          <button type="button" onClick={onPrintSamplePacket}>
            Print Sample Packet
          </button>
        </div>
      </div>

      <div className="demo-checklist-card">
        <h4>Walkthrough Checklist</h4>
        <ul>
          {checklist.map((item) => (
            <li key={item}>
              <span />
              {item}
            </li>
          ))}
        </ul>
        <p>Next steps: load demo data, open the GC packet, review Smart Paste-ready fields, then open print view.</p>
      </div>
    </section>
  );
}

function BackupShortcutCard({ onOpenBackup }) {
  return (
    <section className="backup-shortcut-card no-print">
      <div>
        <p className="list-kicker">Backup / Restore</p>
        <h3>Backup tools live on one page</h3>
        <p>Export JSON backups, import files, or replace local data from the dedicated Backup / Restore page.</p>
      </div>
      <button type="button" title="Open the full Backup / Restore page." onClick={onOpenBackup}>
        Open Backup / Restore
      </button>
    </section>
  );
}

function ProposalListView({
  authUser,
  backupShortcut,
  cloudSync,
  contacts = [],
  permissions = {},
  proposals,
  searchQuery,
  statusFilter,
  onCreateNew,
  onDuplicate,
  onExportProposal,
  onOpen,
  onOpenSettings,
  onPrint,
  onPullCloudProposals,
  onPushLocalProposals,
  onSearchChange,
  onStatusChange,
  onStatusFilterChange,
  onSyncProposals,
}) {
  const [hideQaTestRecords, setHideQaTestRecords] = useState(false);
  const filteredProposals = proposals.filter((proposal) => {
    if (hideQaTestRecords && isQaTestRecord(proposal)) {
      return false;
    }

    const linkedContact = getLinkedContact(proposal, contacts);
    const searchText = [
      proposal.client?.companyName,
      proposal.client?.contactName,
      proposal.project?.name,
      proposal.gcPrime?.contractorName,
      linkedContact?.companyName,
      linkedContact?.contactName,
      linkedContact?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = searchText.includes(searchQuery.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "needs_follow_up" && isFollowUpDue(proposal)) ||
      (statusFilter === "overdue_follow_up" && isFollowUpOverdue(proposal)) ||
      proposal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="proposal-list-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Local proposals</p>
          <h2>Saved Proposals</h2>
        </div>
        <button type="button" onClick={onCreateNew} disabled={!permissions.createProposal}>
          New Proposal
        </button>
        <button type="button" onClick={onOpenSettings}>
          Company Settings
        </button>
      </div>

      <div className="list-filters">
        <label>
          <span>Search</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Client, contact, project, or GC"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="needs_follow_up">Needs Follow-Up</option>
            <option value="overdue_follow_up">Overdue Follow-Up</option>
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatOptionLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="test-record-filter">
          <input
            checked={hideQaTestRecords}
            type="checkbox"
            onChange={(event) => setHideQaTestRecords(event.target.checked)}
          />
          <span>Hide QA/Test Records</span>
        </label>
      </div>

      {backupShortcut}

      <ProposalSyncPanel
        authUser={authUser}
        canUseCloudActions={permissions.cloudSync}
        cloudSync={cloudSync}
        onPullCloudProposals={onPullCloudProposals}
        onPushLocalProposals={onPushLocalProposals}
        onSyncProposals={onSyncProposals}
      />

      <div className="proposal-table-wrap">
        <table className="proposal-list-table">
          <thead>
            <tr>
              <th>Proposal #</th>
              <th>Client</th>
              <th>Project</th>
              <th>Type</th>
              <th>Packet</th>
              <th>Packet Record</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Follow-Up</th>
              <th>Total</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.map((proposal) => {
              const total = calculateProposalTotals(proposal).total;
              const packetMode = getPacketModeLabel(proposal);
              const linkedContact = getLinkedContact(proposal, contacts);
              const latestPacketRecord = getLatestSubmittedPacketRecord(proposal);
              const latestSendRecord = getLatestSendRecord(proposal);

              return (
                <tr key={proposal.id} onClick={() => onOpen(proposal.id)}>
                  <td>
                    <strong>{proposal.proposalNumber}</strong>
                    <span>{proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber)}</span>
                    {isLatestRevision(proposal, proposals) ? <Badge className="revision-latest">Latest</Badge> : null}
                  </td>
                  <td>
                    <strong>{proposal.client?.companyName}</strong>
                    <span>{proposal.client?.contactName}</span>
                    {linkedContact ? <span>Linked: {formatContactName(linkedContact)}</span> : null}
                  </td>
                  <td>{proposal.project?.name}</td>
                  <td>{formatOptionLabel(proposal.proposalType ?? proposal.type)}</td>
                  <td>
                    <Badge className={packetMode === "Full GC Packet" ? "packet-full" : "packet-summary"}>
                      {packetMode}
                    </Badge>
                  </td>
                  <td>
                    {latestPacketRecord ? (
                      <>
                        <Badge className={`packet-record-${latestPacketRecord.status}`}>
                          {formatOptionLabel(latestPacketRecord.status)}
                        </Badge>
                        <Badge className={hasPacketPdfAttachment(latestPacketRecord) ? "packet-pdf-attached" : "packet-pdf-missing"}>
                          {hasPacketPdfAttachment(latestPacketRecord) ? "PDF attached" : "PDF missing"}
                        </Badge>
                        <span>{formatDashboardDate(latestPacketRecord.createdAt)}</span>
                        {latestSendRecord ? <span>Sent package {formatDisplayDate(latestSendRecord.sentDate)}</span> : null}
                      </>
                    ) : (
                      <Badge className="packet-record-none">No packet record</Badge>
                    )}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <StatusBadge status={proposal.status} />
                    <select value={proposal.status} onChange={(event) => onStatusChange(proposal, event.target.value)} disabled={!permissions.markProposalOutcome}>
                      {PROPOSAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatOptionLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDisplayDate(proposal.sentDate) || "-"}</td>
                  <td>
                    {proposal.followUpDate ? (
                      <Badge className={isFollowUpOverdue(proposal) ? "follow-up-overdue" : "follow-up-due"}>
                        {formatDisplayDate(proposal.followUpDate)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{formatCurrency(total)}</td>
                  <td>{formatDashboardDate(proposal.updatedAt || proposal.createdAt || proposal.proposalDate)}</td>
                  <td>
                    <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => onOpen(proposal.id)}>
                        Open
                      </button>
                      <button type="button" title="Open the print/PDF view for this proposal." onClick={() => onPrint(proposal)}>
                        Print
                      </button>
                      <button type="button" title="Create a separate copy of this proposal as a new draft." onClick={() => onDuplicate(proposal)} disabled={!permissions.createProposal}>
                        Duplicate
                      </button>
                      <button type="button" title="Export this proposal as a JSON backup file." onClick={() => onExportProposal(proposal)} disabled={!permissions.backupExport}>
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredProposals.length === 0 ? <p className="empty-list-message">No saved proposals match those filters.</p> : null}
    </section>
  );
}

function CompanySettingsView({
  authLoading,
  authMessage,
  authUser,
  backupShortcut,
  cloudSync,
  message,
  permissions = {},
  saveState,
  settings,
  storageDiagnostics,
  teamMembers,
  teamMessage,
  onBackToList,
  onChange,
  onClearCloudSyncMessage,
  onDeactivateTeamMember,
  onInviteTeamMember,
  onOpenLogin,
  onPullCloudData,
  onPullCloudProposals,
  onPushLocalDataToCloud,
  onPushLocalProposals,
  onRefreshTeamMembers,
  onReset,
  onSave,
  onSignOut,
  onSyncContacts,
  onSyncProposals,
  onSyncSettings,
  onTestStorageUpload,
}) {
  function handleLogoUpload(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange("logoPath", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <section className="company-settings-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Last Yard defaults</p>
          <h2>Company Settings</h2>
          {message ? <span className="settings-message">{message}</span> : null}
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onBackToList}>
            Back to Proposals
          </button>
          <button type="button" onClick={onReset} disabled={!permissions.manageSettings}>
            Reset Defaults
          </button>
          <button type="button" onClick={onSave} disabled={!permissions.manageSettings}>
            Save Settings
          </button>
        </div>
      </div>

      {backupShortcut}

      <div className="settings-accordion-stack">
        <SettingsAccordionSection defaultOpen title="Cloud Status" helper="Sync status, cloud actions, and local/cloud save state.">
          <CloudStatusCard
            authLoading={authLoading}
            authMessage={authMessage}
            authUser={authUser}
            bucketName={proposalAssetsBucket}
            canUseCloudActions={permissions.cloudSync}
            cloudSync={cloudSync}
            saveState={saveState}
            storageDiagnostics={storageDiagnostics}
            onClearCloudSyncMessage={onClearCloudSyncMessage}
            onOpenLogin={onOpenLogin}
            onPullCloudData={onPullCloudData}
            onPullCloudProposals={onPullCloudProposals}
            onPushLocalDataToCloud={onPushLocalDataToCloud}
            onPushLocalProposals={onPushLocalProposals}
            onSignOut={onSignOut}
            onSyncContacts={onSyncContacts}
            onSyncProposals={onSyncProposals}
            onSyncSettings={() => onSyncSettings(settings)}
            onTestStorageUpload={onTestStorageUpload}
          />
        </SettingsAccordionSection>

        <SettingsAccordionSection title="Team / Access" helper="Invite and review company users. Owner/Admin controls remain protected.">
          <TeamAccessPanel
            authUser={authUser}
            cloudSync={cloudSync}
            members={teamMembers}
            message={teamMessage}
            settings={settings}
            onDeactivateMember={onDeactivateTeamMember}
            onInviteMember={onInviteTeamMember}
            onOpenLogin={onOpenLogin}
            onRefreshMembers={onRefreshTeamMembers}
          />
        </SettingsAccordionSection>
      </div>

      {!permissions.manageSettings ? (
        <p className="permission-message">Company settings are read-only for your current role.</p>
      ) : null}

      <fieldset className="editor-permission-fieldset" disabled={!permissions.manageSettings}>
      <div className="settings-accordion-stack">
        <SettingsAccordionSection
          defaultOpen
          title="Company Info"
          helper="Core Last Yard identity and contact details used by new proposals."
        >
      <div className="settings-grid">
        <EditorField label="Company Name" path="settings.companyName" value={settings.companyName} onChange={(_, value) => onChange("companyName", value)} />
        <EditorField label="Phone" path="settings.phone" value={settings.phone} onChange={(_, value) => onChange("phone", value)} />
        <EditorField label="Email" path="settings.email" type="email" value={settings.email} onChange={(_, value) => onChange("email", value)} />
        <EditorField label="CCB Number" path="settings.license" value={settings.license} onChange={(_, value) => onChange("license", value)} />
        <EditorField
          label="Licensed / Bonded / Insured Text"
          path="settings.credentialsText"
          value={settings.credentialsText}
          onChange={(_, value) => onChange("credentialsText", value)}
        />
        <EditorField label="Service Area" path="settings.serviceArea" value={settings.serviceArea} onChange={(_, value) => onChange("serviceArea", value)} />
        <EditorField
          label="Logo Path"
          path="settings.logoPath"
          value={settings.logoPath}
          onChange={(_, value) => onChange("logoPath", value)}
        />
        <label className="editor-field">
          <span>Logo Upload</span>
          <input type="file" accept="image/*" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
        </label>
      </div>
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Proposal Defaults"
          helper="Default expiration, payment terms, exclusions, warranty note, and signature block for new proposal drafts."
        >
      <div className="settings-grid">
        <EditorField
          label="Default Proposal Expiration Days"
          path="settings.defaultProposalExpirationDays"
          type="number"
          value={settings.defaultProposalExpirationDays}
          onChange={(_, value) => onChange("defaultProposalExpirationDays", value)}
        />
        <EditorField
          label="Default Payment Terms"
          path="settings.defaultPaymentTerms"
          value={settings.defaultPaymentTerms}
          onChange={(_, value) => onChange("defaultPaymentTerms", value)}
        />
        <div className="settings-wide-field">
          <EditorField
            label="Default Exclusions"
            path="settings.defaultExclusions"
            value={settings.defaultExclusions}
            onChange={(_, value) => onChange("defaultExclusions", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Default Warranty Note"
            path="settings.defaultWarrantyNote"
            value={settings.defaultWarrantyNote}
            onChange={(_, value) => onChange("defaultWarrantyNote", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Default Signature Block"
            path="settings.defaultSignatureBlock"
            value={settings.defaultSignatureBlock}
            onChange={(_, value) => onChange("defaultSignatureBlock", value)}
            multiline
          />
        </div>
      </div>
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Proposal PDF Style"
          helper="Readability defaults for proposal print/PDF output. Existing proposal data stays unchanged."
        >
          <ProposalPdfStyleSettingsPanel
            settings={settings.proposalPdfStyle}
            onChange={(nextSettings) => onChange("proposalPdfStyle", nextSettings)}
          />
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Legal / Scope Protection"
          helper="These defaults protect Last Yard's scope. New proposals use these terms unless edited."
        >
      <div className="settings-grid legal-settings-grid">
        <div className="settings-wide-field">
          <EditorField
            label="Proposal Expiration Clause"
            path="settings.defaultProposalExpirationClause"
            value={settings.defaultProposalExpirationClause}
            onChange={(_, value) => onChange("defaultProposalExpirationClause", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Deposit Terms"
            path="settings.defaultDepositTerms"
            value={settings.defaultDepositTerms}
            onChange={(_, value) => onChange("defaultDepositTerms", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Progress Billing Terms"
            path="settings.defaultProgressBillingTerms"
            value={settings.defaultProgressBillingTerms}
            onChange={(_, value) => onChange("defaultProgressBillingTerms", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Final Payment Terms"
            path="settings.defaultFinalPaymentTerms"
            value={settings.defaultFinalPaymentTerms}
            onChange={(_, value) => onChange("defaultFinalPaymentTerms", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Late Payment / Collection Language"
            path="settings.defaultLatePaymentTerms"
            value={settings.defaultLatePaymentTerms}
            onChange={(_, value) => onChange("defaultLatePaymentTerms", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Change Order Language"
            path="settings.defaultChangeOrderLanguage"
            value={settings.defaultChangeOrderLanguage}
            onChange={(_, value) => onChange("defaultChangeOrderLanguage", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Site Readiness Language"
            path="settings.defaultSiteReadinessLanguage"
            value={settings.defaultSiteReadinessLanguage}
            onChange={(_, value) => onChange("defaultSiteReadinessLanguage", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Weather Delay Language"
            path="settings.defaultWeatherDelayLanguage"
            value={settings.defaultWeatherDelayLanguage}
            onChange={(_, value) => onChange("defaultWeatherDelayLanguage", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Utility Responsibility"
            path="settings.defaultUtilityResponsibility"
            value={settings.defaultUtilityResponsibility}
            onChange={(_, value) => onChange("defaultUtilityResponsibility", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Hidden / Unknown Conditions"
            path="settings.defaultHiddenConditions"
            value={settings.defaultHiddenConditions}
            onChange={(_, value) => onChange("defaultHiddenConditions", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Concrete Cracking Disclaimer"
            path="settings.defaultConcreteCrackingDisclaimer"
            value={settings.defaultConcreteCrackingDisclaimer}
            onChange={(_, value) => onChange("defaultConcreteCrackingDisclaimer", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Color / Finish Variation Disclaimer"
            path="settings.defaultColorFinishVariationDisclaimer"
            value={settings.defaultColorFinishVariationDisclaimer}
            onChange={(_, value) => onChange("defaultColorFinishVariationDisclaimer", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="Warranty Limitation"
            path="settings.defaultWarrantyLimitation"
            value={settings.defaultWarrantyLimitation}
            onChange={(_, value) => onChange("defaultWarrantyLimitation", value)}
            multiline
          />
        </div>
        <div className="settings-wide-field">
          <EditorField
            label="GC / Prime Scope-Control Note"
            path="settings.defaultGcScopeControlNote"
            value={settings.defaultGcScopeControlNote}
            onChange={(_, value) => onChange("defaultGcScopeControlNote", value)}
            multiline
          />
        </div>
      </div>
        </SettingsAccordionSection>
      </div>
      </fieldset>
    </section>
  );
}

function SettingsAccordionSection({ children, defaultOpen = false, helper = "", title }) {
  return (
    <details className="settings-accordion-section no-print" open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          {helper ? <small>{helper}</small> : null}
        </span>
      </summary>
      <div className="settings-accordion-content">{children}</div>
    </details>
  );
}

function ProposalPdfStyleSettingsPanel({ settings = {}, onChange }) {
  const normalizedSettings = normalizeProposalPdfStyleSettings(settings);

  function updateModeStyle(mode, field, value) {
    onChange(
      normalizeProposalPdfStyleSettings({
        ...normalizedSettings,
        [mode]: normalizeProposalPdfStyle(
          {
            ...normalizedSettings[mode],
            [field]: value,
          },
          mode,
        ),
      }),
    );
  }

  return (
    <div className="proposal-pdf-style-settings">
      <p className="settings-helper-text">
        These settings adjust packet typography and labels for PDF output. They do not change pricing calculations or proposal wording data.
      </p>
      <div className="proposal-pdf-style-grid">
        {PROPOSAL_PDF_STYLE_MODE_OPTIONS.map(({ mode, helper }) => {
          const style = normalizedSettings[mode];

          return (
            <section className="proposal-pdf-style-card" key={mode}>
              <div>
                <h3>{getProposalModeLabel(mode)}</h3>
                <p>{helper}</p>
              </div>
              <div className="proposal-pdf-style-controls">
                <SettingsSelect
                  label="Body text size"
                  value={style.bodyTextSize}
                  options={PROPOSAL_PDF_BODY_TEXT_SIZE_OPTIONS}
                  labels={PROPOSAL_PDF_BODY_TEXT_SIZE_LABELS}
                  onChange={(value) => updateModeStyle(mode, "bodyTextSize", value)}
                />
                <SettingsSelect
                  label="Heading style"
                  value={style.headingStyle}
                  options={PROPOSAL_PDF_HEADING_STYLE_OPTIONS}
                  labels={PROPOSAL_PDF_HEADING_STYLE_LABELS}
                  onChange={(value) => updateModeStyle(mode, "headingStyle", value)}
                />
                <SettingsSelect
                  label="Proposal tone"
                  value={style.proposalTone}
                  options={PROPOSAL_PDF_TONE_OPTIONS}
                  labels={PROPOSAL_PDF_TONE_LABELS}
                  onChange={(value) => updateModeStyle(mode, "proposalTone", value)}
                />
                <SettingsSelect
                  label="Pricing emphasis"
                  value={style.pricingEmphasis}
                  options={PROPOSAL_PDF_PRICING_EMPHASIS_OPTIONS}
                  labels={PROPOSAL_PDF_PRICING_EMPHASIS_LABELS}
                  onChange={(value) => updateModeStyle(mode, "pricingEmphasis", value)}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SettingsSelect({ label, labels = {}, onChange, options = [], value }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || formatOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProposalActionBar({
  draftLabel = "",
  isPrintView,
  permissions = {},
  proposal,
  revisionHistory = [],
  saveMessage,
  saveState,
  showStartBlank = false,
  onBackToList,
  onCreatePacketRecord,
  onCreateRevision,
  onDuplicate,
  onOpenPrintView,
  onSave,
  onStartBlankProposal,
  onStatusChange,
}) {
  const revisedTotal = calculateProposalTotals(proposal).total;
  const previousTotal = toEditableNumber(proposal.previousTotal);
  const proposalMode = inferProposalModeFromProposal(proposal);
  const blankModeOptions = getBlankProposalModeOptions();

  return (
    <section className="proposal-action-bar no-print">
      <div>
        <p>
          {formatProposalNumberWithRevision(proposal)}
          <span className="revision-inline-date">{formatDisplayDate(proposal.revisionDate || proposal.proposalDate)}</span>
          {draftLabel ? <Badge className="draft-route-badge">{draftLabel}</Badge> : null}
        </p>
        <h2>{proposal.project?.name || "Untitled Proposal"}</h2>
        <div className="revision-summary-line">
          <span>Current total: {formatCurrency(revisedTotal)}</span>
          {previousTotal > 0 ? <span>Previous total: {formatCurrency(previousTotal)}</span> : null}
          <span>Mode: {getProposalModeLabel(proposalMode)}</span>
          <span>Save status: {saveState.status}</span>
          <span>Last saved: {formatCloudSyncTime(saveState.lastLocalSavedAt)}</span>
        </div>
        {saveMessage ? <span>{saveMessage}</span> : null}
      </div>
      <div className="proposal-actions">
        <label>
          <span>Status</span>
          <select value={proposal.status} onChange={(event) => onStatusChange(event.target.value)} disabled={!permissions.markProposalOutcome}>
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatOptionLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onBackToList}>
          Back to List
        </button>
        {!isPrintView ? (
          <button type="button" title="Save the current proposal draft locally and sync to cloud when available." onClick={onSave} disabled={saveState.isSaving || !permissions.editProposal}>
            {saveState.isSaving ? "Saving..." : "Save Draft"}
          </button>
        ) : null}
        {showStartBlank && permissions.createProposal ? (
          <div className="proposal-mode-actions" aria-label="Start blank proposal mode">
            {blankModeOptions.map((option) => (
              <button
                className="proposal-action-link"
                type="button"
                key={option.mode}
                onClick={() => onStartBlankProposal(option.mode)}
                title={option.description}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" title="Create a separate copy with a new proposal ID and draft status." onClick={onDuplicate} disabled={!permissions.createProposal}>
          Duplicate
        </button>
        {!isPrintView ? (
          <button type="button" title="Create the next revision while preserving the current proposal." onClick={onCreateRevision} disabled={!permissions.editProposal}>
            Create Revision
          </button>
        ) : null}
        {!isPrintView ? (
          <button type="button" title="Save a historical record of the current proposal packet version." onClick={onCreatePacketRecord} disabled={!permissions.createPacketRecord}>
            Create Packet Record
          </button>
        ) : null}
        {!isPrintView ? (
          <button type="button" title="Open the clean print/PDF view for this proposal." onClick={onOpenPrintView}>
            Print View
          </button>
        ) : null}
      </div>
      <RevisionHistory revisions={revisionHistory} currentProposalId={proposal.id} />
    </section>
  );
}

function RevisionHistory({ currentProposalId, revisions = [] }) {
  const visibleRevisions = revisions.filter((revision) => revision.id);

  if (visibleRevisions.length <= 1) {
    return null;
  }

  return (
    <div className="revision-history">
      <strong>Revision History</strong>
      <div>
        {visibleRevisions.map((revision) => (
          <span className={revision.id === currentProposalId ? "active" : ""} key={revision.id}>
            {revision.revisionLabel || formatRevisionLabel(revision.revisionNumber)}
            {" | "}
            {formatDisplayDate(revision.revisionDate || revision.proposalDate)}
            {" | "}
            {formatCurrency(calculateProposalTotals(revision).total)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SubmittedPacketHistory({ permissions = {}, records = [], onAttachPdf, onMarkSent, onPrepareSend, onRemovePdf, onUpdateRecord }) {
  const visibleRecords = normalizeSubmittedPacketRecords(records);

  return (
    <div className="submitted-packet-history" id="submitted-packet-history">
      <div className="submitted-packet-history-heading">
        <div>
          <strong>Submitted Packet History</strong>
          <span>Historical records of generated, sent, and superseded packet versions.</span>
        </div>
      </div>

      {visibleRecords.length === 0 ? (
        <p className="submitted-packet-empty">No packet records yet. Use Create Packet Record or Save Packet Record from print view.</p>
      ) : (
        <div className="submitted-packet-list">
          {visibleRecords.map((record) => (
            <article className="submitted-packet-card" key={record.id}>
              {(() => {
                const pdfUrl = getSubmittedPacketPdfUrl(record);
                const hasPdf = hasPacketPdfAttachment(record);

                return (
                  <>
              <div className="submitted-packet-card-main">
                <div>
                  <div className="submitted-packet-card-title">
                    <Badge className={`packet-record-${record.status}`}>{formatOptionLabel(record.status)}</Badge>
                    <strong>{record.revisionLabel || formatRevisionLabel(record.revisionNumber)}</strong>
                    <span>{record.packetTitle}</span>
                    <Badge className={hasPdf ? "packet-pdf-attached" : "packet-pdf-missing"}>
                      {hasPdf ? "PDF attached" : "PDF missing"}
                    </Badge>
                  </div>
                  <div className="submitted-packet-meta">
                    <span>{record.proposalNumber}</span>
                    <span>Created {formatCloudSyncTime(record.createdAt)}</span>
                    <span>Total {formatCurrency(record.totalAmount)}</span>
                    <span>{record.packetPageCount ? `${record.packetPageCount} page${record.packetPageCount === 1 ? "" : "s"}` : "Page count pending"}</span>
                    {record.sentDate ? <span>Sent {formatDisplayDate(record.sentDate)}</span> : null}
                    {record.sentToName || record.sentToEmail ? <span>To {[record.sentToName, record.sentToEmail].filter(Boolean).join(" | ")}</span> : null}
                    {hasPdf ? (
                      <>
                        <span>{record.pdfAttachment.fileName}</span>
                        {record.pdfAttachment.fileSize ? <span>{formatAssetFileSize(record.pdfAttachment.fileSize)}</span> : null}
                        <span>Uploaded {formatCloudSyncTime(record.pdfAttachment.uploadedAt)}</span>
                        {record.pdfAttachment.uploadedByEmail ? <span>By {record.pdfAttachment.uploadedByEmail}</span> : null}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="submitted-packet-actions">
                  {record.status !== "sent" ? (
                    <button type="button" title="Mark this saved packet record as sent." onClick={() => onMarkSent(record.id)} disabled={!permissions.markPacketSent}>
                      Mark Packet as Sent
                    </button>
                  ) : null}
                  <button type="button" title="Prepare a copy-and-paste email package for this packet record." onClick={() => onPrepareSend(record.id)} disabled={!permissions.sendWorkflow}>
                    Prepare Send
                  </button>
                  <label className="submitted-packet-upload-button" title="Attach the final saved PDF to this submitted packet record.">
                    <span>{hasPdf ? "Replace PDF" : "Attach PDF"}</span>
                    <input
                      accept="application/pdf,.pdf"
                      type="file"
                      disabled={!permissions.storageUpload}
                      onChange={(event) => {
                        const [file] = event.target.files || [];
                        onAttachPdf(record.id, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {hasPdf && pdfUrl ? (
                    <>
                      <a href={pdfUrl} rel="noreferrer" target="_blank">
                        Open PDF
                      </a>
                      <a href={pdfUrl} download={record.pdfAttachment.fileName || "submitted-packet.pdf"}>
                        Download PDF
                      </a>
                    </>
                  ) : null}
                  {hasPdf ? (
                    <button type="button" onClick={() => onRemovePdf(record.id)} disabled={!permissions.storageUpload}>
                      Remove PDF
                    </button>
                  ) : null}
                </div>
              </div>
              </>
                );
              })()}
              <label className="submitted-packet-notes">
                <span>Internal notes</span>
                <textarea
                  value={record.internalNotes || ""}
                  rows={2}
                  disabled={!permissions.editProposal}
                  onChange={(event) => onUpdateRecord(record.id, "internalNotes", event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SendSubmissionPanel({ contacts = [], packetRecords = [], permissions = {}, proposal, selectedPacketId, onMarkSent }) {
  const firstPacketId = selectedPacketId || packetRecords[0]?.id || "";
  const [templateId, setTemplateId] = useState("gc_prime_submission");
  const [packetRecordId, setPacketRecordId] = useState(firstPacketId);
  const [draft, setDraft] = useState(() => createSendPackageDraft(proposal, packetRecords.find((record) => record.id === firstPacketId), "gc_prime_submission"));
  const [copyMessage, setCopyMessage] = useState("");
  const selectedRecord = packetRecords.find((record) => record.id === packetRecordId);
  const hasPdf = hasPacketPdfAttachment(selectedRecord);

  useEffect(() => {
    if (!selectedPacketId || selectedPacketId === packetRecordId) {
      return;
    }

    const nextRecord = packetRecords.find((record) => record.id === selectedPacketId);
    setPacketRecordId(selectedPacketId);
    setDraft(createSendPackageDraft(proposal, nextRecord, templateId));
    setCopyMessage("");
  }, [packetRecordId, packetRecords, proposal, selectedPacketId, templateId]);

  useEffect(() => {
    if (packetRecordId || !packetRecords[0]?.id) {
      return;
    }

    setPacketRecordId(packetRecords[0].id);
    setDraft(createSendPackageDraft(proposal, packetRecords[0], templateId));
  }, [packetRecordId, packetRecords, proposal, templateId]);

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function selectTemplate(nextTemplateId) {
    setTemplateId(nextTemplateId);
    setDraft(createSendPackageDraft(proposal, selectedRecord, nextTemplateId, draft));
    setCopyMessage("");
  }

  function selectPacketRecord(nextPacketId) {
    const nextRecord = packetRecords.find((record) => record.id === nextPacketId);
    setPacketRecordId(nextPacketId);
    setDraft(createSendPackageDraft(proposal, nextRecord, templateId, draft));
    setCopyMessage("");
  }

  async function copyToClipboard(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(message);
    } catch {
      setCopyMessage("Copy failed. Select the text manually and copy it.");
    }
  }

  if (packetRecords.length === 0) {
    return (
      <div className="send-submission-panel" id="send-submission">
        <div>
          <strong>Send / Submission</strong>
          <span>Create a packet record before preparing a send package.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="send-submission-panel" id="send-submission">
      <div className="send-submission-heading">
        <div>
          <strong>Send / Submission</strong>
          <span>Prepare copy-ready email text and track exactly what packet was sent. Emails are not sent by this app.</span>
        </div>
        {copyMessage ? <em>{copyMessage}</em> : null}
      </div>
      {!permissions.sendWorkflow ? <p className="permission-message">Send workflow is read-only for your current role.</p> : null}
      <fieldset className="editor-permission-fieldset" disabled={!permissions.sendWorkflow}>
      <div className="send-submission-grid">
        <label>
          <span>Packet record / PDF</span>
          <select value={packetRecordId} onChange={(event) => selectPacketRecord(event.target.value)}>
            {packetRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.revisionLabel || formatRevisionLabel(record.revisionNumber)} | {record.packetTitle} | {hasPacketPdfAttachment(record) ? "PDF attached" : "PDF missing"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Email template</span>
          <select value={templateId} onChange={(event) => selectTemplate(event.target.value)}>
            {EMAIL_TEMPLATE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Select saved contact</span>
          <select
            value=""
            onChange={(event) => {
              const contact = contacts.find((item) => item.id === event.target.value);
              if (contact) {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  sentToEmail: contact.email || currentDraft.sentToEmail,
                  sentToName: formatContactName(contact),
                }));
              }
            }}
          >
            <option value="">Manual / proposal recipient</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {formatContactName(contact)}
              </option>
            ))}
          </select>
        </label>
        <EditorField label="Sent To Name" path="send.sentToName" value={draft.sentToName} onChange={(_, value) => updateDraft("sentToName", value)} />
        <EditorField label="Sent To Email" path="send.sentToEmail" type="email" value={draft.sentToEmail} onChange={(_, value) => updateDraft("sentToEmail", value)} />
        <EditorField label="Sent Date" path="send.sentDate" type="date" value={draft.sentDate} onChange={(_, value) => updateDraft("sentDate", value)} />
        <EditorField label="Sent Method" path="send.sentMethod" value={draft.sentMethod} onChange={(_, value) => updateDraft("sentMethod", value)} options={SENT_METHODS} />
        <EditorField label="Follow-Up Date" path="send.followUpDate" type="date" value={draft.followUpDate} onChange={(_, value) => updateDraft("followUpDate", value)} />
        <div className="send-submission-wide">
          <EditorField label="Email Subject" path="send.subject" value={draft.subject} onChange={(_, value) => updateDraft("subject", value)} />
        </div>
        <div className="send-submission-wide">
          <EditorField label="Email Body" path="send.body" value={draft.body} onChange={(_, value) => updateDraft("body", value)} multiline />
        </div>
        <div className="send-submission-wide">
          <EditorField label="Next Action" path="send.nextAction" value={draft.nextAction} onChange={(_, value) => updateDraft("nextAction", value)} multiline />
        </div>
      </div>
      {!hasPdf ? <p className="send-submission-warning">Attach submitted PDF before marking sent.</p> : null}
      <div className="send-submission-actions">
        <button type="button" title="Copy only the drafted email body." onClick={() => copyToClipboard(draft.body, "Email body copied.")}>
          Copy Email Body
        </button>
        <button
          type="button"
          title="Copy recipient, subject, and body for manual sending."
          onClick={() => copyToClipboard(formatSendPackageClipboardText(draft), "Recipient, subject, and body copied.")}
        >
          Copy Recipient / Subject / Body
        </button>
        <button type="button" title="Record this package as sent without sending an email automatically." onClick={() => onMarkSent({ ...draft, packetRecordId })}>
          Mark as Sent
        </button>
      </div>
      </fieldset>
    </div>
  );
}

function PdfArchiveSummary({ records = [] }) {
  const visibleRecords = normalizeSubmittedPacketRecords(records);
  const pdfRecords = visibleRecords.filter(hasPacketPdfAttachment);

  return (
    <div className="pdf-archive-summary">
      <div className="pdf-archive-heading">
        <strong>{pdfRecords.length > 0 ? `${pdfRecords.length} archived PDF${pdfRecords.length === 1 ? "" : "s"}` : "No PDF attached yet"}</strong>
        <span>Attach, replace, or remove final submitted PDFs from Submitted Packet History.</span>
      </div>
      {pdfRecords.length > 0 ? (
        <div className="pdf-archive-list">
          {pdfRecords.map((record) => {
            const pdfUrl = getSubmittedPacketPdfUrl(record);

            return (
              <div className="pdf-archive-row" key={record.id}>
                <div>
                  <strong>{record.pdfAttachment?.fileName || "Submitted packet PDF"}</strong>
                  <span>
                    {record.revisionLabel || formatRevisionLabel(record.revisionNumber)} | {formatAssetFileSize(record.pdfAttachment?.fileSize)} |{" "}
                    {formatCloudSyncTime(record.pdfAttachment?.uploadedAt)}
                  </span>
                </div>
                {pdfUrl ? (
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    Open PDF
                  </a>
                ) : (
                  <span>Storage path saved</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="submitted-packet-empty">Create or open a packet record, then attach the final saved PDF.</p>
      )}
    </div>
  );
}

function ValidationPanel({ className = "", notice = "", validation }) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];

  if (!notice && errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <section className={`validation-panel no-print ${className}`} aria-live="polite">
      {notice ? <p className="validation-notice">{notice}</p> : null}

      {errors.length > 0 ? (
        <div className="validation-group validation-errors">
          <h3>Required Before Save / Print</h3>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="validation-group validation-warnings">
          <h3>Warnings</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ProposalEditor({
  aiProposalLoading = "",
  aiProposalMessage = "",
  aiProposalNotes = "",
  aiProposalResult = null,
  assetUploadMessage = "",
  contacts = [],
  draftLabel = "",
  proposal,
  showTemplatePicker = false,
  onAddLineItem,
  onAddLineItemFromLibrary,
  onAddPricingSection,
  onAddScopeBullet,
  onAddScopeSection,
  onApplyTemplate,
  onChange,
  onFinancialChange,
  onLineItemChange,
  onPricingSectionChange,
  onRemoveLineItem,
  onRemovePricingSection,
  onRemoveScopeBullet,
  onRemoveScopeSection,
  onScopeBulletChange,
  onScopeTitleChange,
  onConcreteSpecChange,
  onGcPrimeChange,
  onProjectPhotoChange,
  onProjectPhotoUpload,
  onPricingOptionImageChange,
  onPricingOptionImageRemove,
  onPricingOptionImageUpload,
  onOptionalAddOnImageChange,
  onOptionalAddOnImageRemove,
  onOptionalAddOnImageUpload,
  onAddPlanSheet,
  onPlanSheetChange,
  onPlanSheetImageUpload,
  onRemovePlanSheet,
  onAddGcPacketTableRow,
  onGcPacketTableChange,
  onGcPacketTableRowChange,
  onAttachPacketPdf,
  onCreatePacketRecord,
  onMarkPacketSent,
  onMarkSendPackageSent,
  onMovePacketBuilderSection,
  onPacketBuilderChange,
  onRemovePacketPdf,
  onRemoveGcPacketTableRow,
  onRefreshTermsFromDefaults,
  onResetPacketBuilder,
  onStartBlankProposal,
  onSmartPasteApply,
  onSmartPasteClear,
  onAiProposalNotesChange,
  onAiProposalRun,
  onApplyAiProposalResult,
  onSmartPasteFill,
  onSmartPasteNotesChange,
  onSelectContact,
  onUpdatePacketRecord,
  permissions = {},
  priceLibrary = [],
  readOnly = false,
  validation,
  validationNotice,
  smartPasteNotes,
  smartPasteResult,
}) {
  const proposalTotals = calculateProposalTotals(proposal);
  const proposalMode = inferProposalModeFromProposal(proposal);
  const isGcPrime = isGcPrimePacketMode(proposalMode);
  const packetRecords = normalizeSubmittedPacketRecords(proposal.submittedPacketRecords);
  const [selectedSendPacketId, setSelectedSendPacketId] = useState(packetRecords[0]?.id || "");

  return (
    <aside className="editor-panel no-print" aria-label="Proposal editor">
      <ValidationPanel notice={validationNotice} validation={validation} />

      {readOnly ? (
        <p className="permission-message">Viewer mode: proposal fields are read-only for your current role.</p>
      ) : null}

      <EditorNavigation proposal={proposal} showTemplatePicker={showTemplatePicker} />

      <fieldset className="editor-permission-fieldset" disabled={readOnly}>
      {showTemplatePicker ? (
        <TemplatePicker
          currentTemplateId={proposal.templateId}
          draftLabel={draftLabel}
          templates={PROPOSAL_TEMPLATES}
          onApplyTemplate={onApplyTemplate}
          onStartBlankProposal={onStartBlankProposal}
        />
      ) : null}

      <SmartPastePanel
        notes={smartPasteNotes}
        result={smartPasteResult}
        onApply={onSmartPasteApply}
        onClear={onSmartPasteClear}
        onFill={onSmartPasteFill}
        onNotesChange={onSmartPasteNotesChange}
      />

      <AiProposalPanel
        loading={aiProposalLoading}
        message={aiProposalMessage}
        notes={aiProposalNotes}
        result={aiProposalResult}
        onApply={onApplyAiProposalResult}
        onNotesChange={onAiProposalNotesChange}
        onRun={onAiProposalRun}
      />

      <ContactSelector contacts={contacts} proposal={proposal} onSelectContact={onSelectContact} />

      <EditorSection defaultOpen id="proposal-info-section" title="Proposal Info">
        <EditorField
          label="Proposal Mode"
          path="proposalMode"
          value={proposalMode}
          onChange={onChange}
          options={getBlankProposalModeOptions().map((option) => option.mode)}
        />
        <EditorField
          label="Proposal Type"
          path="proposalType"
          value={proposal.proposalType}
          onChange={onChange}
          options={PROPOSAL_TYPES}
        />
        <EditorField label="Status" path="status" value={proposal.status} onChange={onChange} options={PROPOSAL_STATUSES} />
        <EditorField label="Proposal Number" path="proposalNumber" value={proposal.proposalNumber} onChange={onChange} />
        <label className="editor-field revision-label-field">
          <span>Revision</span>
          <strong>{proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber)}</strong>
        </label>
        <EditorField
          label="Revision Date"
          path="revisionDate"
          type="date"
          value={proposal.revisionDate}
          onChange={onChange}
        />
        <EditorField
          label="Proposal Date"
          path="proposalDate"
          type="date"
          value={proposal.proposalDate}
          onChange={onChange}
        />
        <EditorField
          label="Expiration Date"
          path="validUntil"
          type="date"
          value={proposal.validUntil}
          onChange={onChange}
        />
        <EditorField
          label="Revision Notes"
          path="revisionNotes"
          value={proposal.revisionNotes}
          onChange={onChange}
          multiline
        />
      </EditorSection>

      <EditorSection id="follow-up-tracking-section" title="Send / Follow-Up Tracking">
        <EditorField label="Sent Date" path="sentDate" type="date" value={proposal.sentDate} onChange={onChange} />
        <EditorField label="Sent To Name" path="sentToName" value={proposal.sentToName} onChange={onChange} />
        <EditorField label="Sent To Email" path="sentToEmail" type="email" value={proposal.sentToEmail} onChange={onChange} />
        <EditorField label="Sent To Phone" path="sentToPhone" value={proposal.sentToPhone} onChange={onChange} />
        <EditorField label="Sent Method" path="sentMethod" value={proposal.sentMethod} onChange={onChange} options={SENT_METHODS} />
        <EditorField label="Follow-Up Date" path="followUpDate" type="date" value={proposal.followUpDate} onChange={onChange} />
        <EditorField
          label="Last Follow-Up Date"
          path="lastFollowUpDate"
          type="date"
          value={proposal.lastFollowUpDate}
          onChange={onChange}
        />
        <EditorField label="Viewed Date" path="viewedDate" type="date" value={proposal.viewedDate} onChange={onChange} />
        <EditorField label="Next Action" path="nextAction" value={proposal.nextAction} onChange={onChange} />
        <EditorField
          label="Decision Due Date"
          path="decisionDueDate"
          type="date"
          value={proposal.decisionDueDate}
          onChange={onChange}
        />
        <EditorField label="Follow-Up Notes" path="followUpNotes" value={proposal.followUpNotes} onChange={onChange} multiline />
        <EditorField label="Outcome Reason" path="outcomeReason" value={proposal.outcomeReason} onChange={onChange} multiline />
        <EditorField label="Approved Date" path="approvedDate" type="date" value={proposal.approvedDate} onChange={onChange} />
        <EditorField label="Rejected Date" path="rejectedDate" type="date" value={proposal.rejectedDate} onChange={onChange} />
        <EditorField
          label="Internal Tracking Notes"
          path="internalTrackingNotes"
          value={proposal.internalTrackingNotes}
          onChange={onChange}
          multiline
        />
      </EditorSection>

      <EditorSection id="client-contact-section" title="Client / Prepared For">
        <EditorField
          label="Client / Company Name"
          path="client.companyName"
          value={proposal.client.companyName}
          onChange={onChange}
        />
        <EditorField label="Contact Name" path="client.contactName" value={proposal.client.contactName} onChange={onChange} />
        <EditorField label="Contact Phone" path="client.phone" value={proposal.client.phone} onChange={onChange} />
        <EditorField label="Contact Email" path="client.email" type="email" value={proposal.client.email} onChange={onChange} />
        <EditorField
          label="Billing Address"
          path="client.billingAddress"
          value={proposal.client.billingAddress}
          onChange={onChange}
          multiline
        />
        <EditorField
          label="Project Address"
          path="client.projectAddress"
          value={proposal.client.projectAddress}
          onChange={onChange}
          multiline
        />
      </EditorSection>

      <EditorSection id="project-summary-section" title="Project Summary">
        <EditorField label="Project Name" path="project.name" value={proposal.project.name} onChange={onChange} />
        <EditorField
          label="Project Location"
          path="project.location"
          value={proposal.project.location}
          onChange={onChange}
        />
        <EditorField
          label="Project Description"
          path="project.description"
          value={proposal.project.description}
          onChange={onChange}
          multiline
        />
        <EditorField
          label="Project Category"
          path="project.category"
          value={proposal.project.category}
          onChange={onChange}
        />
        <EditorField
          label="Estimated Start Date"
          path="project.proposedSchedule.startDate"
          type="date"
          value={proposal.project.proposedSchedule.startDate}
          onChange={onChange}
        />
        <EditorField
          label="Estimated Duration"
          path="project.estimatedDuration"
          value={proposal.project.estimatedDuration}
          onChange={onChange}
        />
        <EditorField
          label="Access Notes"
          path="project.accessNotes"
          value={proposal.project.accessNotes}
          onChange={onChange}
          multiline
        />
        <EditorField
          label="Site Condition Notes"
          path="project.siteConditionNotes"
          value={proposal.project.siteConditionNotes}
          onChange={onChange}
          multiline
        />
        <EditorField
          label="Schedule Restrictions"
          path="project.scheduleRestrictions"
          value={proposal.project.scheduleRestrictions}
          onChange={onChange}
          multiline
        />
        <EditorField
          label="Special Requirements"
          path="project.specialRequirements"
          value={proposal.project.specialRequirements}
          onChange={onChange}
          multiline
        />
      </EditorSection>

      <EditorSection id="project-photos-section" title="Project Photos">
        <ProjectPhotoEditor
          message={assetUploadMessage}
          photos={proposal.projectPhotos}
          onPhotoChange={onProjectPhotoChange}
          onPhotoUpload={onProjectPhotoUpload}
        />
      </EditorSection>

      {isGcPrime || getEnabledPlanSheets(proposal.planSheets).length > 0 ? (
        <EditorSection id="plan-sheets-section" title="Plan Sheets / Takeoff Pages">
          <PlanSheetEditor
            message={assetUploadMessage}
            planSheets={proposal.planSheets}
            onAddPlanSheet={onAddPlanSheet}
            onPlanSheetImageUpload={onPlanSheetImageUpload}
            onPlanSheetChange={onPlanSheetChange}
            onRemovePlanSheet={onRemovePlanSheet}
          />
        </EditorSection>
      ) : null}

      {isGcPrime || (!isResidentialProposalMode(proposalMode) && hasAnyGcPacketTableData(proposal.gcPacketTables)) ? (
        <EditorSection id="gc-packet-tables-section" title="GC Packet Tables">
          <GcPacketTablesEditor
            gcPacketTables={proposal.gcPacketTables}
            onAddRow={onAddGcPacketTableRow}
            onChange={onGcPacketTableChange}
            onRemoveRow={onRemoveGcPacketTableRow}
            onRowChange={onGcPacketTableRowChange}
          />
        </EditorSection>
      ) : null}

      <EditorSection id="scope-section" title="Scope of Work">
        <ScopeBuilder
          scopeSections={proposal.scopeSections}
          onAddBullet={onAddScopeBullet}
          onAddSection={onAddScopeSection}
          onBulletChange={onScopeBulletChange}
          onRemoveBullet={onRemoveScopeBullet}
          onRemoveSection={onRemoveScopeSection}
          onTitleChange={onScopeTitleChange}
        />
      </EditorSection>

      <EditorSection id="concrete-specs-section" title="Concrete Specifications">
        <ConcreteSpecsEditor concreteSpecs={proposal.concreteSpecs} onChange={onConcreteSpecChange} />
      </EditorSection>

      {isGcPrime ? (
        <EditorSection id="gc-prime-section" title="GC / Prime Notes">
          <GcPrimeEditor gcPrime={proposal.gcPrime} onChange={onGcPrimeChange} />
        </EditorSection>
      ) : null}

      {isGcPrime ? (
        <EditorSection id="packet-builder-section" title="Packet Builder">
          <PacketBuilderEditor
            proposal={proposal}
            onChange={onPacketBuilderChange}
            onMove={onMovePacketBuilderSection}
            onReset={onResetPacketBuilder}
          />
        </EditorSection>
      ) : null}

      <EditorSection id="legal-terms-section" title="Addenda / RFIs / Legal Terms">
        <div className="editor-section-actions">
          <button
            type="button"
            title="Replace proposal-specific terms and exclusions with the latest saved Company Settings defaults."
            onClick={onRefreshTermsFromDefaults}
          >
            Refresh Terms from Company Defaults
          </button>
        </div>
        <LegalTermsEditor terms={proposal.terms} onChange={onChange} />
      </EditorSection>

      <EditorSection id="pricing-section" title="Pricing / Line Items">
        <nav className="pricing-mini-toolbar" aria-label="Pricing editor shortcuts">
          <a href="#pricing-line-items" onClick={(event) => openEditorAccordionSection(event, "pricing-section")}>Line Items</a>
          <a href="#pricing-library-picker" onClick={(event) => openEditorAccordionSection(event, "pricing-section")}>Add from Price Library</a>
          <a href="#pricing-alternates-section" onClick={(event) => openEditorAccordionSection(event, "pricing-alternates-section")}>Alternates / Allowances</a>
          <a href="#pricing-summary" onClick={(event) => openEditorAccordionSection(event, "pricing-section")}>Pricing Summary</a>
        </nav>
        <ResidentialPricingOptionsEditorSummary
          addOnImageChange={onOptionalAddOnImageChange}
          addOnImageRemove={onOptionalAddOnImageRemove}
          addOnImageUpload={onOptionalAddOnImageUpload}
          message={assetUploadMessage}
          optionImageChange={onPricingOptionImageChange}
          optionImageRemove={onPricingOptionImageRemove}
          optionImageUpload={onPricingOptionImageUpload}
          proposal={proposal}
        />
        <LineItemEditor
          lineItems={proposal.lineItems}
          priceLibrary={priceLibrary}
          onAddLineItemFromLibrary={onAddLineItemFromLibrary}
          onAddLineItem={onAddLineItem}
          onLineItemChange={onLineItemChange}
          onRemoveLineItem={onRemoveLineItem}
        />

        <div className="editor-pricing-settings">
          <EditorField
            label="Tax Rate (%)"
            path="financials.taxRate"
            type="number"
            value={proposal.financials.taxRate ?? ""}
            onChange={(_, value) => onFinancialChange("taxRate", value)}
          />
          <EditorField
            label="Discount Amount"
            path="financials.discountAmount"
            type="number"
            value={proposal.financials.discountAmount ?? ""}
            onChange={(_, value) => onFinancialChange("discountAmount", value)}
          />
          <EditorField
            label="Deposit Amount"
            path="financials.depositAmount"
            type="number"
            value={proposal.financials.depositAmount ?? ""}
            onChange={(_, value) => onFinancialChange("depositAmount", value)}
          />
        </div>

        <PricingSummary totals={proposalTotals} />
      </EditorSection>

      <EditorSection id="pricing-alternates-section" title="Alternates / Allowances">
        <PricingSectionsEditor
          pricingSections={proposal.pricingSections}
          onAddPricingSection={onAddPricingSection}
          onPricingSectionChange={onPricingSectionChange}
          onRemovePricingSection={onRemovePricingSection}
        />
      </EditorSection>

      <EditorSection id="submitted-packet-section" title="Submitted Packet History">
        <div className="editor-section-actions">
          <button
            type="button"
            title="Save a historical record of the current proposal packet version."
            onClick={onCreatePacketRecord}
            disabled={!permissions.createPacketRecord}
          >
            Create Packet Record
          </button>
        </div>
        <SubmittedPacketHistory
          permissions={permissions}
          records={packetRecords}
          onAttachPdf={onAttachPacketPdf}
          onMarkSent={onMarkPacketSent}
          onPrepareSend={(packetId) => {
            setSelectedSendPacketId(packetId);
            openEditorAccordionSection(null, "send-submission-section");
          }}
          onRemovePdf={onRemovePacketPdf}
          onUpdateRecord={onUpdatePacketRecord}
        />
      </EditorSection>

      <EditorSection id="pdf-archive-section" title="PDF Archive">
        <PdfArchiveSummary records={packetRecords} />
      </EditorSection>

      <EditorSection id="send-submission-section" title="Send / Submission">
        <SendSubmissionPanel
          contacts={contacts}
          packetRecords={packetRecords}
          permissions={permissions}
          proposal={proposal}
          selectedPacketId={selectedSendPacketId}
          onMarkSent={onMarkSendPackageSent}
        />
      </EditorSection>
      </fieldset>
    </aside>
  );
}

function TemplatePicker({ currentTemplateId, draftLabel = "New Draft", onApplyTemplate, onStartBlankProposal, templates }) {
  const blankModeOptions = getBlankProposalModeOptions();

  function useTemplate(event, templateId) {
    event.preventDefault();
    onApplyTemplate(templateId);
  }

  return (
    <EditorSection defaultOpen id="proposal-template-section" title="Proposal Template">
      <p className="template-picker-help">
        Choose a starter template to prefill common scope, specs, exclusions, terms, pricing rows, and packet defaults.
      </p>
      <p className="template-picker-help template-picker-guide">
        Choose a template to start faster, or continue editing the current draft.
      </p>
      <p className="starter-data-notice">
        {draftLabel.includes("Blank Draft")
          ? "Blank Draft: this proposal starts without project, client, scope, pricing, photos, packet records, PDF attachments, send history, or follow-up data."
          : "New Draft: this draft starts with starter template data. Choose a template or edit fields before sending."}
      </p>
      <div className="template-picker-actions">
        {blankModeOptions.map((option) => (
          <button
            type="button"
            title={option.description}
            key={option.mode}
            onClick={() => onStartBlankProposal(option.mode)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="template-card-grid">
        {templates.map((template) => (
          <article
            className={`template-card ${currentTemplateId === template.id ? "active" : ""}`}
            key={template.id}
          >
            <div>
              <div className="template-card-meta">
                <span>{template.category}</span>
                {currentTemplateId === template.id ? <strong>Applied</strong> : null}
              </div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <small>{template.recommendedFor}</small>
            </div>
            <button
              type="button"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  useTemplate(event, template.id);
                }
              }}
              onClick={(event) => useTemplate(event, template.id)}
            >
              Use Template
            </button>
          </article>
        ))}
      </div>
    </EditorSection>
  );
}

function EditorNavigation({ proposal, showTemplatePicker = false }) {
  const proposalMode = inferProposalModeFromProposal(proposal);
  const isGcPrime = isGcPrimePacketMode(proposalMode);
  const isResidential = isResidentialProposalMode(proposalMode);

  const links = [
    showTemplatePicker ? ["Proposal Template", "proposal-template-section"] : null,
    ["Smart Paste", "smart-paste-section"],
    ["Proposal Info", "proposal-info-section"],
    ["Client / Contact", "saved-contact-section"],
    ["Project Summary", "project-summary-section"],
    ["Photos", "project-photos-section"],
    ["Scope", "scope-section"],
    ["Concrete Specs", "concrete-specs-section"],
    ["Pricing", "pricing-section"],
    ["Alternates / Allowances", "pricing-alternates-section"],
    isGcPrime || (!isResidential && proposal?.gcPrime) ? ["GC / Prime Notes", "gc-prime-section"] : null,
    isGcPrime ? ["GC Packet Tables", "gc-packet-tables-section"] : null,
    isGcPrime ? ["Packet Builder", "packet-builder-section"] : null,
    isGcPrime ? ["Plan Sheets", "plan-sheets-section"] : null,
    isResidential ? ["Residential Terms", "legal-terms-section"] : ["Addenda / RFIs / Legal Terms", "legal-terms-section"],
    ["Submitted Packet History", "submitted-packet-section"],
    ["PDF Archive", "pdf-archive-section"],
    ["Send / Submission", "send-submission-section"],
  ].filter(Boolean);

  return (
    <nav className="editor-navigation" aria-label="Editor navigation">
      <div>
        <strong>Editor Navigation</strong>
        <span>Jump to the work area you need.</span>
      </div>
      <div className="editor-navigation-links">
        {links.map(([label, targetId]) => (
          <a href={`#${targetId}`} key={targetId} onClick={(event) => openEditorAccordionSection(event, targetId)}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function openEditorAccordionSection(event, targetId) {
  const target = document.getElementById(targetId);

  if (target instanceof HTMLDetailsElement) {
    target.open = true;
  }

  if (target) {
    window.setTimeout(() => target.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }
}

function SmartPastePanel({ notes, result, onApply, onClear, onFill, onNotesChange }) {
  return (
    <EditorSection defaultOpen id="smart-paste-section" title="Smart Paste">
      <p className="smart-paste-help">
        Paste rough bid notes, takeoff notes, or GC scope notes. Review all fields before sending.
      </p>
      <label className="editor-field" htmlFor="smart-paste-notes">
        <span>Project Notes</span>
        <textarea
          id="smart-paste-notes"
          value={notes}
          rows={8}
          placeholder="Project: Settlemier Park Renovation&#10;Location: Woodburn, OR&#10;Prepared for: ABC Prime Contractors&#10;Line items:&#10;Site Prep & Excavation | 1 | LS | 3250"
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </label>
      <button className="editor-add-button" type="button" onClick={onFill}>
        Review Proposal From Notes
      </button>
      {result ? <SmartPasteSummary result={result} onApply={onApply} onClear={onClear} /> : null}
    </EditorSection>
  );
}

function AiProposalPanel({ loading = "", message = "", notes = "", result = null, onApply, onNotesChange, onRun }) {
  const summary = result ? summarizeAiProposalResult(result) : null;
  const isExtractResult = result?.mode === "extract";

  return (
    <EditorSection id="ai-proposal-section" title="AI Extract / Review">
      <p className="smart-paste-help">
        Use AI for messy contractor notes, then review the structured result before applying. If AI extraction is not configured, use Smart Paste instead.
      </p>
      <label className="editor-field" htmlFor="ai-proposal-notes">
        <span>AI Extract Notes</span>
        <textarea
          id="ai-proposal-notes"
          value={notes}
          rows={8}
          placeholder="Paste bid invite text, GC notes, pricing summary, RFIs, addenda, scope-control notes, and exclusions."
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </label>
      <div className="pricing-action-buttons">
        <button className="editor-add-button" type="button" disabled={Boolean(loading)} onClick={() => onRun("extract")}>
          {loading === "extract" ? "Extracting..." : "AI Extract Proposal"}
        </button>
        <button className="editor-secondary-button" type="button" disabled={Boolean(loading)} onClick={() => onRun("review")}>
          {loading === "review" ? "Reviewing..." : "AI Review Proposal"}
        </button>
      </div>
      {message ? <p className="save-message">{message}</p> : null}
      {summary ? (
        <div className="smart-paste-summary" aria-live="polite">
          <strong>{summary.mode === "review" ? "AI Review Summary" : "AI Extract Summary"}</strong>
          <ul>
            {summary.fieldsFound.length > 0 ? <li>Fields found: {summary.fieldsFound.join(", ")}</li> : null}
            {summary.pricingFound.length > 0 ? <li>Pricing found: {summary.pricingFound.join(", ")}</li> : null}
            {summary.missingInfo.length > 0 ? <li>Missing info: {summary.missingInfo.join(", ")}</li> : null}
            {summary.recommendation ? <li>Recommendation: {summary.recommendation}</li> : null}
          </ul>
          {summary.reviewNotes.length > 0 ? (
            <div className="smart-paste-warnings">
              <span>Review Notes</span>
              <ul>
                {summary.reviewNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.warnings.length > 0 ? (
            <div className="smart-paste-warnings">
              <span>Warnings</span>
              <ul>
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {isExtractResult ? (
            <button className="editor-add-button" type="button" onClick={onApply}>
              Apply AI Result
            </button>
          ) : null}
        </div>
      ) : null}
    </EditorSection>
  );
}

function SmartPasteSummary({ result, onApply, onClear }) {
  return (
    <div className="smart-paste-summary" aria-live="polite">
      <strong>{result.pendingReview ? "Smart Paste Review" : "Smart Paste Summary"}</strong>
      {result.pendingReview ? <p>Review the detected fields below, then apply when ready. Your proposal will not change until you apply.</p> : null}
      <ul>
        <li>{result.fields.length} fields detected</li>
        {result.proposalModeLabel ? <li>Proposal mode: {result.proposalModeLabel}</li> : null}
        <li>{result.lineItemCount} line items detected</li>
        {result.pricingMode === "choose_one_option" ? (
          <>
            <li>Pricing mode: Customer chooses one option</li>
            <li>Pricing options detected: {(result.pricingOptions || []).length}</li>
            <li>Optional add-ons detected: {(result.optionalAddOns || []).length}</li>
          </>
        ) : (
          <li>{result.pricingSectionCount || 0} alternates / allowances detected</li>
        )}
        {(result.pricingOptions || []).length > 0 ? (
          <li>
            Main pricing options:{" "}
            {result.pricingOptions.map((option) => `${option.name}: ${formatResidentialCurrency(option.price || 0)}`).join(", ")}
          </li>
        ) : null}
        {(result.optionalAddOns || []).length > 0 ? (
          <li>
            Optional add-ons:{" "}
            {result.optionalAddOns.map((addOn) => `${addOn.name}: ${formatResidentialCurrency(addOn.amount || 0, { plus: true })}`).join(", ")}
          </li>
        ) : null}
        <li>{result.planSheetCount || 0} plan / takeoff pages detected</li>
        <li>{result.gcPacketTableCount || 0} structured GC tables detected</li>
        {result.scheduleOfValuesCount !== undefined ? <li>{result.scheduleOfValuesCount || 0} SOV rows detected</li> : null}
        {result.takeoffQuantityCount !== undefined ? <li>{result.takeoffQuantityCount || 0} takeoff rows detected</li> : null}
        {result.rfiCount !== undefined ? <li>{result.rfiCount || 0} RFI rows detected</li> : null}
        {result.scopeSectionCount !== undefined ? <li>{result.scopeSectionCount || 0} scope sections detected</li> : null}
        {result.concreteSpecCount !== undefined ? <li>{result.concreteSpecCount || 0} concrete spec fields detected</li> : null}
        {result.packetPrintOrderCount !== undefined ? <li>{result.packetPrintOrderCount || 0} packet order rows detected</li> : null}
        <li>{(result.sectionsCaptured || []).length} sections captured</li>
        <li>{result.defaultsCleared || 0} default cleanup actions applied</li>
        <li>{result.pricingRowsReplaced || 0} pricing summary rows replaced</li>
        <li>{result.packetSectionsCreated || 0} packet sections prepared</li>
        {result.applyMode ? <li>Apply mode: {result.applyMode}</li> : null}
        {result.fields.length > 0 ? <li>Updated: {result.fields.join(", ")}</li> : null}
        {(result.sectionsCaptured || []).length > 0 ? <li>Captured: {result.sectionsCaptured.join(", ")}</li> : null}
        {(result.coverFieldsUpdated || []).length > 0 ? <li>Cover updated: {result.coverFieldsUpdated.join(", ")}</li> : null}
        {result.parsedCoverValues?.projectName ? <li>Project {result.pendingReview ? "ready" : "applied"}: {result.parsedCoverValues.projectName}</li> : null}
        {result.parsedCoverValues?.clientCompany ? <li>Client {result.pendingReview ? "ready" : "applied"}: {result.parsedCoverValues.clientCompany}</li> : null}
        {result.parsedCoverValues?.projectLocation ? <li>Location {result.pendingReview ? "ready" : "applied"}: {result.parsedCoverValues.projectLocation}</li> : null}
        {result.detectedProjectInfo?.projectName ? <li>Detected project: {result.detectedProjectInfo.projectName}</li> : null}
        {result.detectedProjectInfo?.clientCompany ? <li>Detected client/GC: {result.detectedProjectInfo.clientCompany}</li> : null}
        {result.detectedProjectInfo?.projectLocation ? <li>Detected location: {result.detectedProjectInfo.projectLocation}</li> : null}
        {result.detectedPricing && result.pricingMode !== "choose_one_option" ? (
          <li>
            Detected pricing: base {formatCurrency(result.detectedPricing.baseTotal || 0)}, total if all accepted{" "}
            {formatCurrency(result.detectedPricing.totalIfAllAccepted || 0)}
          </li>
        ) : null}
        {result.detectedPricing && result.pricingMode === "choose_one_option" ? (
          <li>
            Detected pricing: selected/base option{" "}
            {formatResidentialCurrency(result.detectedPricing.currentTotal || result.detectedPricing.baseTotal || 0)}
          </li>
        ) : null}
        {(result.detectedAlternates || []).length > 0 ? (
          <li>
            Detected alternates:{" "}
            {result.detectedAlternates.map((alternate) => `${alternate.label} (${formatCurrency(alternate.amount || 0)})`).join(", ")}
          </li>
        ) : null}
        {(result.activeDraftFieldsUpdated || []).length > 0 ? (
          <li>{result.pendingReview ? "Will apply to draft" : "Applied to active draft"}: {result.activeDraftFieldsUpdated.join(", ")}</li>
        ) : null}
        {(result.existingFieldChanges || []).length > 0 ? (
          <li>Existing real fields flagged for review: {result.existingFieldChanges.join("; ")}</li>
        ) : null}
        {(result.cleanupActions || []).length > 0 ? <li>Cleanup: {result.cleanupActions.join(" ")}</li> : null}
        {(result.defaultRowsRemoved || []).length > 0 ? <li>Removed defaults: {result.defaultRowsRemoved.join(", ")}</li> : null}
      </ul>
      {result.warnings.length > 0 ? (
        <div className="smart-paste-warnings">
          <span>Warnings</span>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.pendingReview ? (
        <div className="pricing-action-buttons">
          <button className="editor-add-button" type="button" onClick={onApply}>
            Apply Smart Paste
          </button>
          <button className="editor-secondary-button" type="button" onClick={onClear}>
            Clear Review
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LineItemEditor({
  lineItems,
  priceLibrary = [],
  onAddLineItem,
  onAddLineItemFromLibrary,
  onLineItemChange,
  onRemoveLineItem,
}) {
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState("all");
  const activeLibraryItems = priceLibrary.filter((item) => item.active !== false);
  const filteredLibraryItems = filterPriceLibraryItems(activeLibraryItems, librarySearch, libraryCategoryFilter);

  return (
    <div className="line-item-editor" id="pricing-line-items">
      <div className="price-library-picker-toolbar" id="pricing-library-picker">
        <div>
          <strong>Line Items</strong>
          <span>{activeLibraryItems.length} active reusable price library items</span>
        </div>
        <div className="pricing-action-buttons">
          <button className="editor-add-button" type="button" title="Add a blank pricing line item." onClick={onAddLineItem}>
            Add Line Item
          </button>
          <button
            className="editor-secondary-button"
            type="button"
            title="Open reusable unit price items and add one to this proposal."
            onClick={() => setLibraryPickerOpen((isOpen) => !isOpen)}
          >
            Add from Price Library
          </button>
        </div>
      </div>

      {libraryPickerOpen ? (
        <div className="price-library-picker-panel">
          <div className="price-library-picker-filters">
            <label>
              <span>Search Library</span>
              <input
                type="search"
                value={librarySearch}
                placeholder="Item, category, or unit"
                onChange={(event) => setLibrarySearch(event.target.value)}
              />
            </label>
            <label>
              <span>Category</span>
              <select value={libraryCategoryFilter} onChange={(event) => setLibraryCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {PRICE_LIBRARY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="price-library-picker-list">
            {filteredLibraryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAddLineItemFromLibrary(item.id);
                  setLibraryPickerOpen(false);
                }}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.category} | {item.unit} | {formatCurrency(item.defaultUnitPrice)}
                </span>
              </button>
            ))}
            {filteredLibraryItems.length === 0 ? <p className="empty-list-message">No active library items match those filters.</p> : null}
          </div>
        </div>
      ) : null}

      {lineItems.map((item, index) => {
        const amount = toEditableNumber(item.quantity) * toEditableNumber(item.unitPrice);

        return (
          <div className="line-item-card" key={`${item.itemNumber}-${index}`}>
            <div className="line-item-card-header">
              <strong>Line Item {index + 1}</strong>
              <button type="button" onClick={() => onRemoveLineItem(index)}>
                Remove
              </button>
            </div>

            <div className="line-item-grid">
              <EditorField
                label="Item #"
                path={`lineItems.${index}.itemNumber`}
                value={item.itemNumber ?? ""}
                onChange={(_, value) => onLineItemChange(index, "itemNumber", value)}
              />
              <EditorField
                label="Unit"
                path={`lineItems.${index}.unit`}
                value={item.unit}
                onChange={(_, value) => onLineItemChange(index, "unit", value)}
                options={LINE_ITEM_UNITS}
              />
              <div className="line-item-description">
                <EditorField
                  label="Description"
                  path={`lineItems.${index}.description`}
                  value={item.description}
                  onChange={(_, value) => onLineItemChange(index, "description", value)}
                />
              </div>
              <EditorField
                label="Quantity"
                path={`lineItems.${index}.quantity`}
                type="number"
                value={item.quantity}
                onChange={(_, value) => onLineItemChange(index, "quantity", value)}
              />
              <EditorField
                label="Unit Price"
                path={`lineItems.${index}.unitPrice`}
                type="number"
                value={item.unitPrice}
                onChange={(_, value) => onLineItemChange(index, "unitPrice", value)}
              />
            </div>

            <div className="line-item-meta">
              <label className="editor-check">
                <input
                  checked={item.taxable !== false}
                  type="checkbox"
                  onChange={(event) => onLineItemChange(index, "taxable", event.target.checked)}
                />
                <span>Taxable</span>
              </label>
              <span>Amount: {formatCurrency(amount)}</span>
            </div>
          </div>
        );
      })}

      <div className="pricing-bottom-actions">
        <button className="editor-add-button" type="button" title="Add another blank pricing line item." onClick={onAddLineItem}>
          Add Line Item
        </button>
        <button
          className="editor-secondary-button"
          type="button"
          title="Open reusable unit price items and add one to this proposal."
          onClick={() => setLibraryPickerOpen((isOpen) => !isOpen)}
        >
          Add from Price Library
        </button>
        <a href="#pricing-summary">Jump to Pricing Summary</a>
      </div>
    </div>
  );
}

function PricingSectionsEditor({
  pricingSections,
  onAddPricingSection,
  onPricingSectionChange,
  onRemovePricingSection,
}) {
  const sections = normalizePricingSections(pricingSections);

  return (
    <div className="pricing-section-editor" id="pricing-alternates">
      <div className="pricing-section-editor-header">
        <strong>Alternates / Allowances</strong>
        <span>Included items are added to the proposal total.</span>
      </div>

      {sections.map((section, index) => (
        <div className="pricing-section-card" key={section.id || `pricing-section-${index}`}>
          <div className="line-item-card-header">
            <strong>{formatOptionLabel(section.type)}</strong>
            <button type="button" onClick={() => onRemovePricingSection(index)}>
              Remove
            </button>
          </div>

          <div className="pricing-section-grid">
            <EditorField
              label="Section Type"
              path={`pricingSections.${index}.type`}
              value={section.type}
              onChange={(_, value) => onPricingSectionChange(index, "type", value)}
              options={PRICING_SECTION_TYPES}
            />
            <EditorField
              label="Amount"
              path={`pricingSections.${index}.amount`}
              type="number"
              value={section.amount}
              onChange={(_, value) => onPricingSectionChange(index, "amount", value)}
            />
            <div className="pricing-section-wide">
              <EditorField
                label="Section Label / Name"
                path={`pricingSections.${index}.label`}
                value={section.label}
                onChange={(_, value) => onPricingSectionChange(index, "label", value)}
              />
            </div>
            <div className="pricing-section-wide">
              <EditorField
                label="Description"
                path={`pricingSections.${index}.description`}
                value={section.description}
                onChange={(_, value) => onPricingSectionChange(index, "description", value)}
                multiline
              />
            </div>
          </div>

          <label className="editor-check">
            <input
              checked={Boolean(section.included)}
              type="checkbox"
              onChange={(event) => onPricingSectionChange(index, "included", event.target.checked)}
            />
            <span>Included in proposal total</span>
          </label>
        </div>
      ))}

      <button className="editor-add-button" type="button" onClick={onAddPricingSection}>
        Add alternate / allowance
      </button>
    </div>
  );
}

function LegalTermsEditor({ terms = {}, onChange }) {
  const fields = [
    ["payment", "Payment Terms"],
    ["proposalExpiration", "Proposal Expiration"],
    ["depositText", "Deposit / Scheduling Language"],
    ["progressBilling", "Progress Billing"],
    ["finalPayment", "Final Payment"],
    ["latePayment", "Late Payment / Collection"],
    ["changeOrderLanguage", "Change Order Language"],
    ["siteReadiness", "Site Readiness"],
    ["weatherDelay", "Weather Delays"],
    ["utilityResponsibility", "Utility Responsibility"],
    ["hiddenConditions", "Hidden Conditions"],
    ["concreteCrackingDisclaimer", "Concrete Cracking Disclaimer"],
    ["colorFinishVariationDisclaimer", "Color / Finish Variation Disclaimer"],
    ["warrantyLimitation", "Warranty Limitation"],
    ["gcScopeControl", "GC / Prime Scope Control"],
    ["acceptance", "Acceptance Language"],
  ];

  return (
    <div className="legal-terms-editor">
      <p className="smart-paste-help">
        Keep these client-facing. They can print in the full GC packet and remain editable per proposal.
      </p>
      {fields.map(([field, label]) => (
        <EditorField
          key={field}
          label={label}
          path={`terms.${field}`}
          value={terms[field] || ""}
          onChange={onChange}
          multiline
        />
      ))}
    </div>
  );
}

function PricingSummary({ totals }) {
  return (
    <div className="editor-totals" id="pricing-summary">
      <div className="editor-totals-heading">
        <span>Pricing Summary</span>
        <strong>{formatCurrency(totals.total)}</strong>
      </div>
      <div>
        <span>Subtotal</span>
        <strong>{formatCurrency(totals.subtotal)}</strong>
      </div>
      <div>
        <span>Tax</span>
        <strong>{formatCurrency(totals.tax)}</strong>
      </div>
      <div>
        <span>Discount</span>
        <strong>{formatCurrency(totals.discount)}</strong>
      </div>
      <div>
        <span>Total Proposal</span>
        <strong>{formatCurrency(totals.total)}</strong>
      </div>
      <div>
        <span>Included Alternates / Allowances</span>
        <strong>{formatCurrency(totals.includedPricingSectionsTotal)}</strong>
      </div>
      <div>
        <span>Deposit</span>
        <strong>{formatCurrency(totals.deposit)}</strong>
      </div>
      <div>
        <span>Balance Due</span>
        <strong>{formatCurrency(totals.balanceDue)}</strong>
      </div>
    </div>
  );
}

function ProjectPhotoEditor({ message = "", photos, onPhotoChange, onPhotoUpload }) {
  const photoSlots = normalizeProjectPhotos(photos);

  function handleUpload(index, files) {
    if (!files || files.length === 0) {
      return;
    }

    onPhotoUpload(index, files);
  }

  return (
    <div className="project-photo-editor">
      {message ? <p className="asset-upload-message">{message}</p> : null}
      {photoSlots.map((photo, index) => (
        <div className="project-photo-card" key={`project-photo-${index}`}>
          <div className="project-photo-preview">
            {getImageAssetSource(photo) ? (
              <img src={getImageAssetSource(photo)} alt={photo.label || `Project photo ${index + 1}`} />
            ) : (
              <span>Photo {index + 1}</span>
            )}
          </div>
          <span className="asset-source-badge">{getImageAssetLabel(photo)}</span>
          {photo.fileName ? (
            <span className="asset-upload-detail">
              {photo.fileName} {photo.fileSize ? `| ${formatAssetFileSize(photo.fileSize)}` : ""}
            </span>
          ) : null}
          <PhotoCaptionField
            label={`Photo ${index + 1} Caption`}
            value={photo.label}
            onCommit={(value) => onPhotoChange(index, { caption: value, label: value })}
          />
          <label className="editor-field">
            <span>Photo {index + 1} Upload</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                handleUpload(index, event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {getImageAssetSource(photo) ? (
            <button className="editor-secondary-button" type="button" onClick={() => onPhotoChange(index, clearImageAssetFields({}))}>
              Remove photo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PhotoCaptionField({ label, value = "", placeholder = "", onCommit }) {
  const [draftValue, setDraftValue] = useState(value || "");

  useEffect(() => {
    setDraftValue(value || "");
  }, [value]);

  function commitDraft() {
    const nextValue = draftValue.trim();

    if (nextValue !== String(value || "")) {
      onCommit?.(nextValue);
    }
  }

  return (
    <label className="editor-field">
      <span>{label}</span>
      <input
        type="text"
        value={draftValue}
        placeholder={placeholder}
        onBlur={commitDraft}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function PlanSheetEditor({ message = "", planSheets, onAddPlanSheet, onPlanSheetChange, onPlanSheetImageUpload, onRemovePlanSheet }) {
  const sheets = normalizePlanSheets(planSheets);

  function handleUpload(index, file) {
    if (!file) {
      return;
    }

    onPlanSheetImageUpload(index, file);
  }

  return (
    <div className="plan-sheet-editor">
      <p className="smart-paste-help">
        Enable only the plan and takeoff backup pages that should print with the full GC packet.
      </p>
      {message ? <p className="asset-upload-message">{message}</p> : null}
      {sheets.map((sheet, index) => (
        <div className="plan-sheet-editor-card" key={sheet.id || sheet.matchKey || `${sheet.title}-${index}`}>
          <div className="line-item-card-header">
            <strong>{sheet.title || `Plan Sheet ${index + 1}`}</strong>
            {isDefaultPlanSheet(sheet) ? null : (
              <button type="button" onClick={() => onRemovePlanSheet(index)}>
                Remove
              </button>
            )}
          </div>

          <label className="editor-check">
            <input
              checked={Boolean(sheet.enabled)}
              type="checkbox"
              onChange={(event) => onPlanSheetChange(index, "enabled", event.target.checked)}
            />
            <span>Include this page in full packet</span>
          </label>

          <div className="plan-sheet-editor-grid">
            <EditorField
              label="Page Type"
              path={`planSheets.${index}.pageType`}
              value={sheet.pageType}
              onChange={(_, value) => onPlanSheetChange(index, "pageType", value)}
              options={PLAN_SHEET_PAGE_TYPES}
            />
            <EditorField
              label="Sheet Subtitle"
              path={`planSheets.${index}.subtitle`}
              value={sheet.subtitle}
              onChange={(_, value) => onPlanSheetChange(index, "subtitle", value)}
            />
            <div className="plan-sheet-editor-wide">
              <EditorField
                label="Sheet Title"
                path={`planSheets.${index}.title`}
                value={sheet.title}
                onChange={(_, value) => onPlanSheetChange(index, "title", value)}
              />
            </div>
            <div className="plan-sheet-editor-wide">
              <EditorField
                label="Calculation Box Title"
                path={`planSheets.${index}.calculationTitle`}
                value={sheet.calculationTitle}
                onChange={(_, value) => onPlanSheetChange(index, "calculationTitle", value)}
              />
            </div>
            <div className="plan-sheet-editor-wide">
              <EditorField
                label="Calculation Notes / Bullet List"
                path={`planSheets.${index}.calculationNotes`}
                value={formatEditorList(sheet.calculationNotes)}
                onChange={(_, value) => onPlanSheetChange(index, "calculationNotes", parseEditorList(value))}
                multiline
              />
            </div>
            <div className="plan-sheet-editor-wide">
              <EditorField
                label="Clarification Notes / Bullet List"
                path={`planSheets.${index}.clarificationNotes`}
                value={formatEditorList(sheet.clarificationNotes)}
                onChange={(_, value) => onPlanSheetChange(index, "clarificationNotes", parseEditorList(value))}
                multiline
              />
            </div>
          </div>

          <div className="plan-sheet-upload-row">
            <div className="plan-sheet-image-preview">
              {getImageAssetSource(sheet) ? (
                <img src={getImageAssetSource(sheet)} alt={sheet.title || "Plan sheet preview"} />
              ) : (
                <span>Upload plan image</span>
              )}
            </div>
            <div className="plan-sheet-upload-controls">
              <span className="asset-source-badge">{getImageAssetLabel(sheet)}</span>
              {sheet.fileName ? (
                <span className="asset-upload-detail">
                  {sheet.fileName} {sheet.fileSize ? `| ${formatAssetFileSize(sheet.fileSize)}` : ""}
                </span>
              ) : null}
              <label className="editor-field">
                <span>Plan Image Upload</span>
                <input type="file" accept="image/*" onChange={(event) => handleUpload(index, event.target.files?.[0])} />
              </label>
              {getImageAssetSource(sheet) ? (
                <button className="editor-secondary-button" type="button" onClick={() => onPlanSheetChange(index, "__clearImage", true)}>
                  Remove plan image
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}

      <button className="editor-add-button" type="button" onClick={onAddPlanSheet}>
        Add plan / takeoff page
      </button>
    </div>
  );
}

function GcPacketTablesEditor({ gcPacketTables, onAddRow, onChange, onRemoveRow, onRowChange }) {
  const tables = normalizeGcPacketTables(gcPacketTables);

  return (
    <div className="gc-packet-table-editor">
      <p className="smart-paste-help">
        Enable structured GC handoff tables for full packet proposals. These pages print after the proposal summary.
      </p>

      <div className="packet-editor-card">
        <PacketEditorHeader
          checked={tables.pricingSummary.enabled}
          label={gcPacketTableLabels.pricingSummary}
          onChange={(checked) => onChange("pricingSummary", "enabled", checked)}
        />
        <EditorField
          label="Presentation Notes"
          path="gcPacketTables.pricingSummary.presentationNotes"
          value={tables.pricingSummary.presentationNotes}
          onChange={(_, value) => onChange("pricingSummary", "presentationNotes", value)}
          multiline
        />
      </div>

      <EditablePacketTable
        sectionKey="scheduleOfValues"
        title={gcPacketTableLabels.scheduleOfValues}
        table={tables.scheduleOfValues}
        onAddRow={onAddRow}
        onChange={onChange}
        onRemoveRow={onRemoveRow}
        onRowChange={onRowChange}
      />

      <EditablePacketTable
        sectionKey="takeoffQuantities"
        title={gcPacketTableLabels.takeoffQuantities}
        table={tables.takeoffQuantities}
        onAddRow={onAddRow}
        onChange={onChange}
        onRemoveRow={onRemoveRow}
        onRowChange={onRowChange}
      />

      <EditablePacketTable
        sectionKey="shadeFootingEstimate"
        title={gcPacketTableLabels.shadeFootingEstimate}
        table={tables.shadeFootingEstimate}
        onAddRow={onAddRow}
        onChange={onChange}
        onRemoveRow={onRemoveRow}
        onRowChange={onRowChange}
      />

      <div className="packet-editor-card">
        <PacketEditorHeader
          checked={tables.proposalNotes.enabled}
          label={gcPacketTableLabels.proposalNotes}
          onChange={(checked) => onChange("proposalNotes", "enabled", checked)}
        />
        <EditorField
          label="Proposal Basis"
          path="gcPacketTables.proposalNotes.proposalBasis"
          value={tables.proposalNotes.proposalBasis}
          onChange={(_, value) => onChange("proposalNotes", "proposalBasis", value)}
          multiline
        />
        <EditorField
          label="Contract Scope Control"
          path="gcPacketTables.proposalNotes.contractScopeControl"
          value={tables.proposalNotes.contractScopeControl}
          onChange={(_, value) => onChange("proposalNotes", "contractScopeControl", value)}
          multiline
        />
        <EditorField
          label="Acceptance Summary"
          path="gcPacketTables.proposalNotes.acceptanceSummary"
          value={tables.proposalNotes.acceptanceSummary}
          onChange={(_, value) => onChange("proposalNotes", "acceptanceSummary", value)}
          multiline
        />
        <EditorField
          label="GC / Prime Reviewer Line"
          path="gcPacketTables.proposalNotes.gcPrimeReviewer"
          value={tables.proposalNotes.gcPrimeReviewer}
          onChange={(_, value) => onChange("proposalNotes", "gcPrimeReviewer", value)}
        />
      </div>
    </div>
  );
}

function PacketEditorHeader({ checked, label, onChange }) {
  return (
    <div className="packet-editor-header">
      <strong>{label}</strong>
      <label className="editor-check">
        <input checked={Boolean(checked)} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span>Include page</span>
      </label>
    </div>
  );
}

function PacketBuilderEditor({ proposal, onChange, onMove, onReset }) {
  const sections = normalizePacketBuilder(proposal.packetBuilder);

  return (
    <div className="packet-builder-editor">
      <div className="packet-builder-intro">
        <p className="smart-paste-help">Control what appears in the final GC packet and the order it prints.</p>
        <button className="packet-builder-reset" type="button" onClick={onReset}>
          Reset to Default Order
        </button>
      </div>

      <div className="packet-builder-list">
        {sections.map((section, index) => {
          const status = getPacketBuilderSectionStatus(proposal, section.id);
          const statusClass = section.included ? (status.hasData ? "included" : "missing") : "hidden";

          return (
            <div className="packet-builder-row" key={section.id}>
              <label className="packet-builder-toggle">
                <input
                  checked={Boolean(section.included)}
                  type="checkbox"
                  onChange={(event) => onChange(section.id, "included", event.target.checked)}
                />
                <span>{section.title}</span>
              </label>
              <label className="packet-builder-order">
                <span>Order</span>
                <input
                  type="number"
                  value={section.order}
                  onChange={(event) => onChange(section.id, "order", event.target.value)}
                />
              </label>
              <span className={`packet-builder-status ${statusClass}`}>
                {section.included ? (status.hasData ? "Included" : "Missing data") : "Hidden"}
              </span>
              <div className="packet-builder-actions">
                <button type="button" onClick={() => onMove(section.id, -1)} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={() => onMove(section.id, 1)} disabled={index === sections.length - 1}>
                  Down
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditablePacketTable({ sectionKey, title, table, onAddRow, onChange, onRemoveRow, onRowChange }) {
  const fields = gcPacketRowFields[sectionKey] || [];

  return (
    <div className="packet-editor-card">
      <PacketEditorHeader
        checked={table.enabled}
        label={title}
        onChange={(checked) => onChange(sectionKey, "enabled", checked)}
      />
      <div className="packet-row-list">
        {table.rows.map((row, rowIndex) => (
          <div className="packet-row-card" key={row.id || `${sectionKey}-${rowIndex}`}>
            <div className="line-item-card-header">
              <strong>Row {rowIndex + 1}</strong>
              <button type="button" onClick={() => onRemoveRow(sectionKey, rowIndex)}>
                Remove
              </button>
            </div>
            <div className="packet-row-grid">
              {fields.map(([field, label]) => (
                <EditorField
                  key={field}
                  label={label}
                  path={`gcPacketTables.${sectionKey}.rows.${rowIndex}.${field}`}
                  value={row[field] ?? ""}
                  onChange={(_, value) => onRowChange(sectionKey, rowIndex, field, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="editor-add-button" type="button" onClick={() => onAddRow(sectionKey)}>
        Add {title.toLowerCase()} row
      </button>
    </div>
  );
}

function ScopeBuilder({
  scopeSections,
  onAddBullet,
  onAddSection,
  onBulletChange,
  onRemoveBullet,
  onRemoveSection,
  onTitleChange,
}) {
  return (
    <div className="scope-builder">
      {scopeSections.map((section, sectionIndex) => (
        <div className="scope-editor-card" key={`${section.title}-${sectionIndex}`}>
          <div className="scope-editor-card-header">
            <strong>Scope Section {sectionIndex + 1}</strong>
            <button type="button" onClick={() => onRemoveSection(sectionIndex)}>
              Remove
            </button>
          </div>

          <EditorField
            label="Section Title"
            path={`scopeSections.${sectionIndex}.title`}
            value={section.title}
            onChange={(_, value) => onTitleChange(sectionIndex, value)}
          />

          <div className="scope-bullet-list">
            {section.items.map((item, bulletIndex) => (
              <div className="scope-bullet-row" key={`${section.title}-${bulletIndex}`}>
                <EditorField
                  label={`Bullet ${bulletIndex + 1}`}
                  path={`scopeSections.${sectionIndex}.items.${bulletIndex}`}
                  value={item}
                  onChange={(_, value) => onBulletChange(sectionIndex, bulletIndex, value)}
                />
                <button type="button" onClick={() => onRemoveBullet(sectionIndex, bulletIndex)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button className="editor-secondary-button" type="button" onClick={() => onAddBullet(sectionIndex)}>
            Add bullet
          </button>
        </div>
      ))}

      <button className="editor-add-button" type="button" onClick={onAddSection}>
        Add scope section
      </button>
    </div>
  );
}

function ConcreteSpecsEditor({ concreteSpecs, onChange }) {
  return (
    <div className="concrete-spec-editor">
      <div className="editor-spec-grid">
        <EditorField
          label="Estimated Square Feet"
          path="concreteSpecs.estimatedSquareFeet"
          value={concreteSpecs.estimatedSquareFeet}
          onChange={(_, value) => onChange("estimatedSquareFeet", value)}
        />
        <EditorField
          label="Estimated Cubic Yards"
          path="concreteSpecs.estimatedCubicYards"
          value={concreteSpecs.estimatedCubicYards}
          onChange={(_, value) => onChange("estimatedCubicYards", value)}
        />
        <EditorField
          label="Thickness"
          path="concreteSpecs.thickness"
          value={concreteSpecs.thickness}
          onChange={(_, value) => onChange("thickness", value)}
        />
        <EditorField
          label="PSI"
          path="concreteSpecs.psi"
          value={concreteSpecs.psi}
          onChange={(_, value) => onChange("psi", value)}
        />
        <EditorField
          label="Slump"
          path="concreteSpecs.slump"
          value={concreteSpecs.slump}
          onChange={(_, value) => onChange("slump", value)}
        />
        <EditorField
          label="Air Entrainment"
          path="concreteSpecs.airEntrainment"
          value={concreteSpecs.airEntrainment}
          onChange={(_, value) => onChange("airEntrainment", value)}
        />
      </div>

      <div className="editor-check-row">
        <label className="editor-check">
          <input
            checked={Boolean(concreteSpecs.fiberMesh)}
            type="checkbox"
            onChange={(event) => onChange("fiberMesh", event.target.checked)}
          />
          <span>Fiber mesh</span>
        </label>
        <label className="editor-check">
          <input
            checked={Boolean(concreteSpecs.pumpRequired)}
            type="checkbox"
            onChange={(event) => onChange("pumpRequired", event.target.checked)}
          />
          <span>Pump required</span>
        </label>
      </div>

      <EditorField
        label="Rebar / Mesh Details"
        path="concreteSpecs.rebarMeshDetails"
        value={concreteSpecs.rebarMeshDetails}
        onChange={(_, value) => onChange("rebarMeshDetails", value)}
        multiline
      />
      <EditorField
        label="Finish Type"
        path="concreteSpecs.finishType"
        value={concreteSpecs.finishType}
        onChange={(_, value) => onChange("finishType", value)}
      />
      <EditorField
        label="Control Joint Spacing"
        path="concreteSpecs.controlJointSpacing"
        value={concreteSpecs.controlJointSpacing}
        onChange={(_, value) => onChange("controlJointSpacing", value)}
      />
      <EditorField
        label="Saw Cut Timing"
        path="concreteSpecs.sawCutTiming"
        value={concreteSpecs.sawCutTiming}
        onChange={(_, value) => onChange("sawCutTiming", value)}
      />
      <EditorField
        label="Cure / Sealer Notes"
        path="concreteSpecs.cureSealerNotes"
        value={concreteSpecs.cureSealerNotes}
        onChange={(_, value) => onChange("cureSealerNotes", value)}
        multiline
      />
      <EditorField
        label="Concrete Supplier"
        path="concreteSpecs.concreteSupplier"
        value={concreteSpecs.concreteSupplier}
        onChange={(_, value) => onChange("concreteSupplier", value)}
      />
      <EditorField
        label="Truck Access Notes"
        path="concreteSpecs.truckAccessNotes"
        value={concreteSpecs.truckAccessNotes}
        onChange={(_, value) => onChange("truckAccessNotes", value)}
        multiline
      />
    </div>
  );
}

function GcPrimeEditor({ gcPrime, onChange }) {
  const addendaRegister = normalizeAddendaRegister(gcPrime.addendaRegister);
  const rfiRegister = normalizeRfiRegister(gcPrime.rfiRegister);
  const scopeControlSummary = normalizeScopeControlSummary(gcPrime.scopeControlSummary);

  function updateAddendum(index, field, value) {
    onChange(
      "addendaRegister",
      addendaRegister.map((addendum, addendumIndex) =>
        addendumIndex === index ? { ...addendum, [field]: value } : addendum,
      ),
    );
  }

  function addAddendum() {
    onChange("addendaRegister", [...addendaRegister, createEmptyAddendumRecord()]);
  }

  function removeAddendum(index) {
    onChange(
      "addendaRegister",
      addendaRegister.filter((_, addendumIndex) => addendumIndex !== index),
    );
  }

  function updateRfi(index, field, value) {
    onChange(
      "rfiRegister",
      rfiRegister.map((rfi, rfiIndex) => (rfiIndex === index ? { ...rfi, [field]: value } : rfi)),
    );
  }

  function addRfi() {
    onChange("rfiRegister", [...rfiRegister, createEmptyRfiRecord()]);
  }

  function removeRfi(index) {
    onChange(
      "rfiRegister",
      rfiRegister.filter((_, rfiIndex) => rfiIndex !== index),
    );
  }

  function updateScopeControl(field, value) {
    onChange("scopeControlSummary", {
      ...scopeControlSummary,
      [field]: value,
    });
  }

  return (
    <div className="gc-prime-editor">
      <div className="editor-spec-grid">
        <EditorField
          label="GC / Prime Contractor Name"
          path="gcPrime.contractorName"
          value={gcPrime.contractorName}
          onChange={(_, value) => onChange("contractorName", value)}
        />
        <EditorField
          label="Project Manager Name"
          path="gcPrime.projectManagerName"
          value={gcPrime.projectManagerName}
          onChange={(_, value) => onChange("projectManagerName", value)}
        />
        <EditorField
          label="Project Manager Phone"
          path="gcPrime.projectManagerPhone"
          value={gcPrime.projectManagerPhone}
          onChange={(_, value) => onChange("projectManagerPhone", value)}
        />
        <EditorField
          label="Project Manager Email"
          path="gcPrime.projectManagerEmail"
          type="email"
          value={gcPrime.projectManagerEmail}
          onChange={(_, value) => onChange("projectManagerEmail", value)}
        />
        <EditorField
          label="Bid Package Number"
          path="gcPrime.bidPackageNumber"
          value={gcPrime.bidPackageNumber}
          onChange={(_, value) => onChange("bidPackageNumber", value)}
        />
        <EditorField
          label="Spec Section"
          path="gcPrime.specSection"
          value={gcPrime.specSection}
          onChange={(_, value) => onChange("specSection", value)}
        />
        <EditorField
          label="Retainage Percentage"
          path="gcPrime.retainagePercentage"
          value={gcPrime.retainagePercentage}
          onChange={(_, value) => onChange("retainagePercentage", value)}
        />
        <EditorField
          label="Addenda Acknowledged"
          path="gcPrime.addendaAcknowledged"
          value={gcPrime.addendaAcknowledged}
          onChange={(_, value) => onChange("addendaAcknowledged", value)}
        />
      </div>

      <EditorField
        label="Drawing References"
        path="gcPrime.drawingReferences"
        value={gcPrime.drawingReferences}
        onChange={(_, value) => onChange("drawingReferences", value)}
        multiline
      />

      <div className="editor-check-row gc-check-row">
        <label className="editor-check">
          <input
            checked={Boolean(gcPrime.prevailingWageRequired)}
            type="checkbox"
            onChange={(event) => onChange("prevailingWageRequired", event.target.checked)}
          />
          <span>Prevailing wage required</span>
        </label>
        <label className="editor-check">
          <input
            checked={Boolean(gcPrime.certifiedPayrollRequired)}
            type="checkbox"
            onChange={(event) => onChange("certifiedPayrollRequired", event.target.checked)}
          />
          <span>Certified payroll required</span>
        </label>
        <label className="editor-check">
          <input
            checked={Boolean(gcPrime.insuranceCertificateRequired)}
            type="checkbox"
            onChange={(event) => onChange("insuranceCertificateRequired", event.target.checked)}
          />
          <span>Insurance certificate required</span>
        </label>
        <label className="editor-check">
          <input
            checked={Boolean(gcPrime.w9Required)}
            type="checkbox"
            onChange={(event) => onChange("w9Required", event.target.checked)}
          />
          <span>W-9 required</span>
        </label>
        <label className="editor-check">
          <input
            checked={Boolean(gcPrime.safetyOrientationRequired)}
            type="checkbox"
            onChange={(event) => onChange("safetyOrientationRequired", event.target.checked)}
          />
          <span>Safety orientation required</span>
        </label>
      </div>

      <EditorField
        label="Jobsite Access / Badging Requirements"
        path="gcPrime.jobsiteAccessBadgingRequirements"
        value={gcPrime.jobsiteAccessBadgingRequirements}
        onChange={(_, value) => onChange("jobsiteAccessBadgingRequirements", value)}
        multiline
      />
      <EditorField
        label="Payment Application Terms"
        path="gcPrime.paymentApplicationTerms"
        value={gcPrime.paymentApplicationTerms}
        onChange={(_, value) => onChange("paymentApplicationTerms", value)}
        multiline
      />
      <EditorField
        label="Change Order Process"
        path="gcPrime.changeOrderProcess"
        value={gcPrime.changeOrderProcess}
        onChange={(_, value) => onChange("changeOrderProcess", value)}
        multiline
      />
      <EditorField
        label="RFI / Clarification Notes"
        path="gcPrime.rfiClarificationNotes"
        value={gcPrime.rfiClarificationNotes}
        onChange={(_, value) => onChange("rfiClarificationNotes", value)}
        multiline
      />

      <div className="packet-editor-card">
        <div className="pricing-section-editor-header">
          <strong>Structured Addenda Acknowledgement</strong>
          <span>Included rows print in the full GC packet and packet snapshots.</span>
        </div>
        {addendaRegister.map((addendum, index) => (
          <div className="packet-row-card" key={addendum.id || `addendum-${index}`}>
            <div className="line-item-card-header">
              <strong>Addendum {index + 1}</strong>
              <button type="button" onClick={() => removeAddendum(index)}>
                Remove
              </button>
            </div>
            <div className="packet-row-grid">
              <EditorField
                label="Addendum Number"
                path={`gcPrime.addendaRegister.${index}.addendumNumber`}
                value={addendum.addendumNumber}
                onChange={(_, value) => updateAddendum(index, "addendumNumber", value)}
              />
              <EditorField
                label="Addendum Date"
                path={`gcPrime.addendaRegister.${index}.addendumDate`}
                value={addendum.addendumDate}
                onChange={(_, value) => updateAddendum(index, "addendumDate", value)}
              />
              <EditorField
                label="Title / Description"
                path={`gcPrime.addendaRegister.${index}.titleDescription`}
                value={addendum.titleDescription}
                onChange={(_, value) => updateAddendum(index, "titleDescription", value)}
              />
              <EditorField
                label="Notes"
                path={`gcPrime.addendaRegister.${index}.notes`}
                value={addendum.notes}
                onChange={(_, value) => updateAddendum(index, "notes", value)}
              />
            </div>
            <div className="editor-check-row">
              <label className="editor-check">
                <input
                  checked={Boolean(addendum.acknowledged)}
                  type="checkbox"
                  onChange={(event) => updateAddendum(index, "acknowledged", event.target.checked)}
                />
                <span>Acknowledged</span>
              </label>
              <label className="editor-check">
                <input
                  checked={Boolean(addendum.includedInPacket)}
                  type="checkbox"
                  onChange={(event) => updateAddendum(index, "includedInPacket", event.target.checked)}
                />
                <span>Included in packet</span>
              </label>
            </div>
          </div>
        ))}
        <button className="editor-add-button" type="button" onClick={addAddendum}>
          Add addendum
        </button>
      </div>

      <div className="packet-editor-card">
        <div className="pricing-section-editor-header">
          <strong>Structured RFI / Clarification Register</strong>
          <span>Track clarifications, proposal treatment, and scope/price impact.</span>
        </div>
        {rfiRegister.map((rfi, index) => (
          <div className="packet-row-card" key={rfi.id || `rfi-${index}`}>
            <div className="line-item-card-header">
              <strong>RFI / Clarification {index + 1}</strong>
              <button type="button" onClick={() => removeRfi(index)}>
                Remove
              </button>
            </div>
            <div className="packet-row-grid">
              <EditorField
                label="RFI / Clarification Number"
                path={`gcPrime.rfiRegister.${index}.rfiNumber`}
                value={rfi.rfiNumber}
                onChange={(_, value) => updateRfi(index, "rfiNumber", value)}
              />
              <EditorField
                label="Date Asked"
                path={`gcPrime.rfiRegister.${index}.dateAsked`}
                value={rfi.dateAsked}
                onChange={(_, value) => updateRfi(index, "dateAsked", value)}
              />
              <EditorField
                label="Date Answered"
                path={`gcPrime.rfiRegister.${index}.dateAnswered`}
                value={rfi.dateAnswered}
                onChange={(_, value) => updateRfi(index, "dateAnswered", value)}
              />
              <EditorField
                label="Source"
                path={`gcPrime.rfiRegister.${index}.source`}
                value={rfi.source}
                onChange={(_, value) => updateRfi(index, "source", value)}
              />
              <EditorField
                label="Question / Clarification Needed"
                path={`gcPrime.rfiRegister.${index}.question`}
                value={rfi.question}
                onChange={(_, value) => updateRfi(index, "question", value)}
                multiline
              />
              <EditorField
                label="Answer / Proposal Treatment"
                path={`gcPrime.rfiRegister.${index}.answerTreatment`}
                value={rfi.answerTreatment}
                onChange={(_, value) => updateRfi(index, "answerTreatment", value)}
                multiline
              />
              <EditorField
                label="Price Impact"
                path={`gcPrime.rfiRegister.${index}.priceImpact`}
                value={rfi.priceImpact}
                onChange={(_, value) => updateRfi(index, "priceImpact", value)}
              />
              <EditorField
                label="Scope Impact"
                path={`gcPrime.rfiRegister.${index}.scopeImpact`}
                value={rfi.scopeImpact}
                onChange={(_, value) => updateRfi(index, "scopeImpact", value)}
              />
            </div>
            <label className="editor-check">
              <input
                checked={Boolean(rfi.includedInPacket)}
                type="checkbox"
                onChange={(event) => updateRfi(index, "includedInPacket", event.target.checked)}
              />
              <span>Included in packet</span>
            </label>
          </div>
        ))}
        <button className="editor-add-button" type="button" onClick={addRfi}>
          Add RFI / clarification
        </button>
      </div>

      <div className="packet-editor-card">
        <div className="pricing-section-editor-header">
          <strong>Scope Control Summary</strong>
          <span>Prints in full GC packet mode when populated.</span>
        </div>
        <EditorField
          label="Included Scope"
          path="gcPrime.scopeControlSummary.includedScope"
          value={scopeControlSummary.includedScope}
          onChange={(_, value) => updateScopeControl("includedScope", value)}
          multiline
        />
        <EditorField
          label="Exclusions"
          path="gcPrime.scopeControlSummary.exclusions"
          value={scopeControlSummary.exclusions}
          onChange={(_, value) => updateScopeControl("exclusions", value)}
          multiline
        />
        <EditorField
          label="Clarifications"
          path="gcPrime.scopeControlSummary.clarifications"
          value={scopeControlSummary.clarifications}
          onChange={(_, value) => updateScopeControl("clarifications", value)}
          multiline
        />
        <EditorField
          label="Accepted Alternates"
          path="gcPrime.scopeControlSummary.acceptedAlternates"
          value={scopeControlSummary.acceptedAlternates}
          onChange={(_, value) => updateScopeControl("acceptedAlternates", value)}
          multiline
        />
        <EditorField
          label="Allowances"
          path="gcPrime.scopeControlSummary.allowances"
          value={scopeControlSummary.allowances}
          onChange={(_, value) => updateScopeControl("allowances", value)}
          multiline
        />
        <EditorField
          label="Owner / GC By Others"
          path="gcPrime.scopeControlSummary.ownerGcByOthers"
          value={scopeControlSummary.ownerGcByOthers}
          onChange={(_, value) => updateScopeControl("ownerGcByOthers", value)}
          multiline
        />
        <EditorField
          label="Hidden / Unshown Conditions Note"
          path="gcPrime.scopeControlSummary.hiddenUnshownConditionsNote"
          value={scopeControlSummary.hiddenUnshownConditionsNote}
          onChange={(_, value) => updateScopeControl("hiddenUnshownConditionsNote", value)}
          multiline
        />
      </div>
    </div>
  );
}

function ContactSelector({ contacts = [], proposal, onSelectContact }) {
  const linkedContact = getLinkedContact(proposal, contacts);

  return (
    <EditorSection id="saved-contact-section" title="Select Saved Contact">
      {contacts.length > 0 ? (
        <label className="editor-field contact-select-field" htmlFor="field-contact-id">
          <span>Saved Contact</span>
          <select id="field-contact-id" value={proposal.contactId || ""} onChange={(event) => onSelectContact(event.target.value)}>
            <option value="">No saved contact selected</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {formatContactOption(contact)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="contact-selector-empty">No saved contacts yet. Add contacts from the Contacts page.</p>
      )}
      {linkedContact ? (
        <p className="contact-selector-note">
          Linked to {formatContactName(linkedContact)}
          {linkedContact.email ? ` | ${linkedContact.email}` : ""}
        </p>
      ) : null}
    </EditorSection>
  );
}

function EditorSection({ children, defaultOpen = false, id, title }) {
  return (
    <details className="editor-section" id={id} open={defaultOpen}>
      <summary>
        <h2>{title}</h2>
      </summary>
      <div className="editor-fields">{children}</div>
    </details>
  );
}

function EditorField({ label, path, value, onChange, type = "text", multiline = false, options, placeholder = "" }) {
  const inputId = `field-${path.replaceAll(".", "-")}`;

  return (
    <label className="editor-field" htmlFor={inputId}>
      <span>{label}</span>
      {options ? (
        <select id={inputId} value={value} onChange={(event) => onChange(path, event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {formatOptionLabel(option)}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea id={inputId} value={value} rows={3} placeholder={placeholder} onChange={(event) => onChange(path, event.target.value)} />
      ) : (
        <input id={inputId} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(path, event.target.value)} />
      )}
    </label>
  );
}

function parseRoute(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "dashboard") {
    return { view: "dashboard", path: "/dashboard" };
  }

  if (segments[0] === "backup") {
    return { view: "backup", path: "/backup" };
  }

  if (segments[0] === "activity") {
    return { view: "activity", path: "/activity" };
  }

  if (segments[0] === "login") {
    return { view: "login", path: "/login" };
  }

  if (segments[0] === "settings") {
    return { view: "settings", path: "/settings" };
  }

  if (segments[0] === "contacts") {
    return { view: "contacts", path: "/contacts" };
  }

  if (segments[0] === "bids") {
    return { view: "bids", path: "/bids" };
  }

  if (segments[0] === "price-library") {
    return { view: "priceLibrary", path: "/price-library" };
  }

  if (segments[0] !== "proposals") {
    return { view: "list", path: "/proposals" };
  }

  if (segments.length === 1) {
    return { view: "list", path: "/proposals" };
  }

  if (segments[1] === "new" && segments[2] === "blank") {
    const blankMode = getProposalModeFromBlankSlug(segments[3]);

    return {
      view: "new",
      path: segments[3] ? getBlankProposalModePath(blankMode) : "/proposals/new/blank",
      blank: true,
      blankMode,
    };
  }

  if (segments[1] === "new") {
    return { view: "new", path: "/proposals/new" };
  }

  if (segments[1] && segments[2] === "print") {
    return { view: "print", id: segments[1], path: `/proposals/${segments[1]}/print` };
  }

  return { view: "edit", id: segments[1], path: `/proposals/${segments[1]}` };
}

function isProposalRouteView(view) {
  return view === "new" || view === "edit" || view === "print";
}

function getDraftRouteLabel(route = {}) {
  if (route.view !== "new") {
    return "";
  }

  return route.blank ? `${getProposalModeLabel(route.blankMode)} Blank Draft` : "New Draft";
}

function isBlankProposalSmartPasteMode(route = {}, proposal = {}) {
  return Boolean(route.view === "new" && route.blank) || proposal.templateId === "blank";
}

function createCloudSyncState() {
  const localMessage = isSupabaseConfigured ? cloudSignInLabel : "Cloud save is not configured. Proposals, contacts, and settings are stored locally.";

  return {
    companyId: "",
    contactsStatus: cloudLocalOnlyLabel,
    currentRole: "local",
    lastError: "",
    lastSyncedAt: "",
    loading: false,
    message: localMessage,
    proposalStatus: cloudLocalOnlyLabel,
    settingsStatus: cloudLocalOnlyLabel,
  };
}

function createSaveState() {
  return {
    isSaving: false,
    lastCloudSavedAt: "",
    lastLocalSavedAt: "",
    lastSyncError: "",
    status: "Not saved this session",
  };
}

function createStorageDiagnosticsState() {
  return {
    companyId: "",
    errorMessage: "",
    lastAttemptedAt: "",
    lastFileName: "",
    lastFileSize: "",
    lastProcessedFileSize: "",
    lastSuccessfulImageUploadPath: "",
    lastSuccessfulPdfUploadPath: "",
    lastFailedUploadError: "",
    lastPublicUrl: "",
    lastStatus: "not tested",
    lastStoragePath: "",
    lastUploadType: "",
  };
}

function formatSelectedFileLabel(file) {
  if (!file) {
    return "No file selected";
  }

  return `${file.name || "Selected file"} (${formatAssetFileSize(file.size)})`;
}

function normalizeFileArray(files) {
  if (!files) {
    return [];
  }

  if (Array.isArray(files)) {
    return files.filter(Boolean);
  }

  if (typeof File !== "undefined" && files instanceof File) {
    return [files];
  }

  if (typeof files.length === "number") {
    return Array.from(files).filter(Boolean);
  }

  return [files].filter(Boolean);
}

function normalizeSelectedImageFiles(files) {
  return normalizeFileArray(files)
    .filter((file) => file && typeof file === "object")
    .slice(0, maxImageBatchSize);
}

function getImageCaptionFromFile(fileName = "") {
  return String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCleanUploadedImageCaption(value = "", fallback = "") {
  const text = String(value || "").trim();

  if (!text || /^(upload|uploaded|placeholder|none|n\/a)$/i.test(text) || /upload|smart paste/i.test(text)) {
    return fallback || "";
  }

  return text;
}

function formatImageBatchResultMessage(successCount, failures = [], prefix = "Uploaded") {
  const pieces = [`${prefix}: ${successCount} image${successCount === 1 ? "" : "s"}.`];
  const issueSummary = failures.filter(Boolean);

  if (issueSummary.length > 0) {
    const visibleIssues = issueSummary.slice(0, 3).join(" ");
    const remaining = issueSummary.length > 3 ? ` ${issueSummary.length - 3} more failed.` : "";
    pieces.push(`Issues: ${visibleIssues}${remaining}`);
  }

  return pieces.join(" ");
}

function formatImagePreparationMessage(preparedImage = {}) {
  const compression = preparedImage.compression || {};
  const messages = [];

  if (compression.wasCompressed) {
    messages.push(compression.message || `Compressed to ${formatAssetFileSize(compression.outputSize)}.`);
  } else if (compression.failed) {
    messages.push(compression.message || "Image compression failed; using the original file.");
  }

  if (Array.isArray(preparedImage.warnings) && preparedImage.warnings.length > 0) {
    messages.push(preparedImage.warnings.join(" "));
  }

  return messages.filter(Boolean).join(" ");
}

function withImageSafetyMetadata(asset = {}, originalFile = {}, preparedImage = {}) {
  const compression = preparedImage.compression || {};

  return {
    ...asset,
    compressionMessage: compression.message || "",
    compressed: Boolean(compression.wasCompressed),
    fileSize: preparedImage.file?.size || asset.fileSize || originalFile.size || 0,
    originalFileName: originalFile.name || asset.originalFileName || asset.fileName || "",
    originalFileSize: originalFile.size || asset.originalFileSize || asset.fileSize || 0,
  };
}

function attachResidentialOptionImageToProposal(proposal = {}, collectionKey, itemIndex, asset = {}, uploadedBy = "") {
  const normalizeItems = collectionKey === "optionalAddOns" ? normalizeOptionalAddOns : normalizePricingOptions;
  const items = normalizeItems(proposal[collectionKey]).map((item, currentItemIndex) => {
    if (currentItemIndex !== itemIndex) {
      return item;
    }

    const existingImages = normalizeResidentialOptionImages(item.images);
    const placeholderIndex = existingImages.findIndex((image) => !getImageAssetSource(image));
    const placeholder = placeholderIndex >= 0 ? existingImages[placeholderIndex] : {};
    const placeholderCaption = /upload|smart paste/i.test(placeholder.caption || "") ? "" : placeholder.caption;
    const uploadedCaption = getImageCaptionFromFile(asset.originalFileName || asset.fileName);
    const uploadedImage = normalizeResidentialOptionImages([
      {
        ...placeholder,
        ...asset,
        label: placeholder.label || asset.label || uploadedCaption || `${item.name || "Option"} photo`,
        caption: placeholderCaption || asset.caption || uploadedCaption || placeholder.label || "",
        uploadedAt: asset.uploadedAt || new Date().toISOString(),
        uploadedBy: uploadedBy || placeholder.uploadedBy || "",
        uploadRequired: false,
      },
    ])[0];

    const images =
      placeholderIndex >= 0
        ? existingImages.map((image, currentImageIndex) => (currentImageIndex === placeholderIndex ? uploadedImage : image))
        : [...existingImages, uploadedImage];

    return {
      ...item,
      images: images.filter(Boolean),
    };
  });

  return {
    ...proposal,
    [collectionKey]: items,
    updatedAt: new Date().toISOString(),
  };
}

function formatUploadResultMessage(prefix, asset = {}, preparedImage = {}) {
  const pieces = [prefix];
  const fileLabel = formatSelectedFileLabel({
    name: asset.fileName || preparedImage.file?.name,
    size: asset.fileSize || preparedImage.file?.size,
  });
  const preparationMessage = formatImagePreparationMessage(preparedImage);

  if (fileLabel !== "No file selected") {
    pieces.push(fileLabel);
  }

  if (preparationMessage) {
    pieces.push(preparationMessage);
  }

  return pieces.join(" ");
}

function clearImageAssetFields(asset = {}) {
  return {
    ...asset,
    compressed: false,
    compressionMessage: "",
    dataUrl: "",
    fileName: "",
    fileSize: "",
    fileType: "",
    imageSrc: "",
    originalFileName: "",
    originalFileSize: "",
    publicUrl: "",
    signedUrl: "",
    src: "",
    storagePath: "",
    uploadedAt: "",
  };
}

function getAuthStatusLabel(authUser, authLoading = false) {
  if (!isSupabaseConfigured) {
    return "Local mode";
  }

  if (authLoading) {
    return "Checking auth";
  }

  return authUser ? `Signed in: ${authUser.email}` : "Signed out";
}

function getInitialProposalForRoute(route, proposals, companySettings = getDefaultCompanySettings()) {
  if (route.view === "new") {
    if (route.blank) {
      return createBlankProposalDraft(proposals, companySettings, route.blankMode);
    }

    return createNewProposalDraft(proposals, companySettings);
  }

  if (route.id) {
    const savedProposal = proposals.find((proposal) => proposal.id === route.id);

    if (savedProposal) {
      return createEditableProposal(savedProposal);
    }
  }

  return createEditableProposal(proposals[0] || createSeedProposal(companySettings));
}

function getProposalDraftForRoute(route, proposals, companySettings = getDefaultCompanySettings(), proposalOverride = null) {
  const draft = proposalOverride ? createEditableProposal(proposalOverride) : getInitialProposalForRoute(route, proposals, companySettings);

  return route.blank
    ? applyProposalModeToBlankProposal(cleanTrueBlankProposalState(draft), route.blankMode || draft.proposalMode, companySettings.proposalPdfStyle)
    : draft;
}

function loadSavedProposals(companySettings = getDefaultCompanySettings()) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);

      if (Array.isArray(parsedValue) && parsedValue.length > 0) {
        return parsedValue.map((proposal) => createEditableProposal(proposal));
      }
    }
  } catch {
    // Fall through to the seed proposal if local storage is unavailable or malformed.
  }

  return [createSeedProposal(companySettings)];
}

function normalizeProposals(proposals = [], companySettings = getDefaultCompanySettings()) {
  const normalizedProposals = (Array.isArray(proposals) ? proposals : [])
    .filter(isPlainObject)
    .map((proposal) => {
      try {
        return createEditableProposal(proposal);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return normalizedProposals.length > 0 ? normalizedProposals : [createSeedProposal(companySettings)];
}

function saveStoredProposals(proposals) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(proposals));
  } catch {
    // Local saving is best-effort for this phase.
  }
}

function clearTransientProposalDraftStorage() {
  const transientKeys = [
    "last-yard-active-proposal-draft-v1",
    "last-yard-current-proposal-draft-v1",
    "last-yard-last-opened-proposal-v1",
    "last-yard-smart-paste-draft-v1",
    "last-yard-unsaved-proposal-draft-v1",
  ];

  transientKeys.forEach((key) => {
    try {
      window.sessionStorage?.removeItem(key);
      window.localStorage?.removeItem(key);
    } catch {
      // Transient cleanup is best-effort and must never block blank draft creation.
    }
  });
}

function loadCompanySettings() {
  try {
    const storedValue = window.localStorage.getItem(companySettingsStorageKey);

    if (storedValue) {
      return normalizeCompanySettings(JSON.parse(storedValue));
    }
  } catch {
    // Fall through to Last Yard defaults if settings are unavailable or malformed.
  }

  return getDefaultCompanySettings();
}

function saveCompanySettings(settings) {
  try {
    window.localStorage.setItem(companySettingsStorageKey, JSON.stringify(settings));
  } catch {
    // Local settings are best-effort for this phase.
  }
}

function loadSavedContacts() {
  try {
    const storedValue = window.localStorage.getItem(contactsStorageKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue.filter(isPlainObject).map((contact) => normalizeContact(contact));
      }
    }
  } catch {
    // Fall through to an empty contact list if local storage is unavailable or malformed.
  }

  return [];
}

function saveStoredContacts(contacts) {
  try {
    window.localStorage.setItem(contactsStorageKey, JSON.stringify(contacts));
  } catch {
    // Local contact saving is best-effort for this phase.
  }
}

function loadSavedBids() {
  try {
    const storedValue = window.localStorage.getItem(bidsStorageKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        return normalizeBids(parsedValue);
      }
    }

    const storedSettings = window.localStorage.getItem(companySettingsStorageKey);

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);

      if (Array.isArray(parsedSettings?.bidPipeline)) {
        return normalizeBids(parsedSettings.bidPipeline);
      }
    }
  } catch {
    // Fall through to an empty bid list if local storage is unavailable or malformed.
  }

  return [];
}

function saveStoredBids(bids) {
  try {
    window.localStorage.setItem(bidsStorageKey, JSON.stringify(normalizeBids(bids)));
  } catch {
    // Local bid saving is best-effort for this phase.
  }
}

function loadPriceLibrary() {
  try {
    const storedValue = window.localStorage.getItem(priceLibraryStorageKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        return normalizePriceLibrary(parsedValue);
      }
    }

    const storedSettings = window.localStorage.getItem(companySettingsStorageKey);

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);

      if (Array.isArray(parsedSettings?.priceLibrary)) {
        return normalizePriceLibrary(parsedSettings.priceLibrary);
      }
    }
  } catch {
    // Fall through to starter items if local storage is unavailable or malformed.
  }

  return getDefaultPriceLibrary();
}

function saveStoredPriceLibrary(items) {
  try {
    window.localStorage.setItem(priceLibraryStorageKey, JSON.stringify(normalizePriceLibrary(items)));
  } catch {
    // Local price library saving is best-effort for this phase.
  }
}

function getSettingsWithPriceLibrary(settings = {}, priceLibrary = []) {
  return normalizeCompanySettings({
    ...(settings || {}),
    priceLibrary: normalizePriceLibrary(priceLibrary),
  });
}

function getSettingsWithPriceLibraryAndBids(settings = {}, priceLibrary = [], bids = [], activityLog = []) {
  return normalizeCompanySettings({
    ...(settings || {}),
    activityLog: normalizeActivityLog(Array.isArray(activityLog) && activityLog.length > 0 ? activityLog : settings?.activityLog),
    bidPipeline: normalizeBids(bids),
    priceLibrary: normalizePriceLibrary(priceLibrary),
  });
}

function getPriceLibraryFromSettings(settings = {}, fallbackLibrary = []) {
  if (Array.isArray(settings?.priceLibrary)) {
    return normalizePriceLibrary(settings.priceLibrary);
  }

  return normalizePriceLibrary(fallbackLibrary);
}

function getBidsFromSettings(settings = {}, fallbackBids = []) {
  if (Array.isArray(settings?.bidPipeline)) {
    return normalizeBids(settings.bidPipeline);
  }

  return normalizeBids(fallbackBids);
}

function isDemoRecord(record = {}) {
  return Boolean(record.demo || record.metadata?.isDemo);
}

function createProposalExport(proposal) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "proposal",
    proposal: cloneObject(proposal),
  };
}

function createAllProposalsExport(proposals) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "all_proposals",
    storageKey,
    proposals: cloneObject(proposals),
  };
}

function createCompanySettingsExport(settings) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "company_settings",
    storageKey: companySettingsStorageKey,
    companySettings: cloneObject(settings),
  };
}

function createContactsExport(contacts) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "contacts",
    storageKey: contactsStorageKey,
    contacts: cloneObject(contacts),
  };
}

function createBidsExport(bids = []) {
  return {
    backupVersion,
    bids: cloneObject(normalizeBids(bids)),
    exportedAt: new Date().toISOString(),
    source: backupSource,
    storageKey: bidsStorageKey,
    type: "bids",
  };
}

function createPriceLibraryExport(priceLibrary = []) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "price_library",
    storageKey: priceLibraryStorageKey,
    priceLibrary: cloneObject(normalizePriceLibrary(priceLibrary)),
  };
}

function createFullAppBackup(proposals, settings, contacts = [], priceLibrary = [], bids = [], activityLog = []) {
  const normalizedPriceLibrary = normalizePriceLibrary(priceLibrary);
  const normalizedBids = normalizeBids(bids);
  const normalizedActivityLog = normalizeActivityLog(activityLog);

  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "full_app_backup",
    storageKeys: {
      proposals: storageKey,
      companySettings: companySettingsStorageKey,
      contacts: contactsStorageKey,
      bids: bidsStorageKey,
      priceLibrary: priceLibraryStorageKey,
      activityLog: activityLogStorageKey,
    },
    proposals: cloneObject(proposals),
    companySettings: cloneObject(getSettingsWithPriceLibraryAndBids(settings, normalizedPriceLibrary, normalizedBids, normalizedActivityLog)),
    contacts: cloneObject(contacts),
    bids: cloneObject(normalizedBids),
    priceLibrary: cloneObject(normalizedPriceLibrary),
    activityLog: cloneObject(normalizedActivityLog),
  };
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "")));
      } catch {
        reject(new Error("The selected file is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}

function parseSingleProposalImport(importedJson, existingProposals = []) {
  const proposal = importedJson?.proposal || importedJson;

  if (!isPlainObject(proposal) || !isProposalLike(proposal)) {
    throw new Error("This file does not look like a proposal backup.");
  }

  return resolveImportedProposalIdentity(createEditableProposal(proposal), existingProposals);
}

function parseProposalCollectionImport(importedJson) {
  const proposals = Array.isArray(importedJson) ? importedJson : importedJson?.proposals;

  if (!Array.isArray(proposals)) {
    throw new Error("This file does not include a proposals array.");
  }

  const normalizedProposals = proposals.filter(isProposalLike).map((proposal) => createEditableProposal(proposal));

  if (normalizedProposals.length === 0) {
    throw new Error("No valid proposals were found in the selected file.");
  }

  return normalizedProposals;
}

function parseCompanySettingsImport(importedJson) {
  const settings = importedJson?.companySettings || importedJson;

  if (!isPlainObject(settings)) {
    throw new Error("This file does not include company settings.");
  }

  return normalizeCompanySettings(settings);
}

function parseContactCollectionImport(importedJson) {
  const contacts = Array.isArray(importedJson) ? importedJson : importedJson?.contacts;

  if (!Array.isArray(contacts)) {
    throw new Error("This file does not include a contacts array.");
  }

  return contacts.filter(isPlainObject).map((contact) => normalizeContact(contact));
}

function parsePriceLibraryImport(importedJson) {
  const priceLibrary = Array.isArray(importedJson) ? importedJson : importedJson?.priceLibrary || importedJson?.companySettings?.priceLibrary;

  if (!Array.isArray(priceLibrary)) {
    throw new Error("This file does not include a priceLibrary array.");
  }

  return normalizePriceLibrary(priceLibrary).filter((item) => hasTextValue(item.name));
}

function parseBidCollectionImport(importedJson) {
  const bids = Array.isArray(importedJson) ? importedJson : importedJson?.bids || importedJson?.companySettings?.bidPipeline;

  if (!Array.isArray(bids)) {
    throw new Error("This file does not include a bids array.");
  }

  return normalizeBids(bids).filter((bid) => hasTextValue(bid.projectName));
}

function parseFullAppBackupImport(importedJson) {
  if (!isPlainObject(importedJson) || (!Array.isArray(importedJson.proposals) && !isPlainObject(importedJson.companySettings))) {
    throw new Error("This file does not look like a full app backup.");
  }

  const importedSettings = parseCompanySettingsImport(importedJson.companySettings || importedJson);
  const importedPriceLibrary = Array.isArray(importedJson.priceLibrary)
    ? parsePriceLibraryImport(importedJson)
    : getPriceLibraryFromSettings(importedSettings, []);
  const importedBids = Array.isArray(importedJson.bids) || Array.isArray(importedSettings.bidPipeline)
    ? parseBidCollectionImport(importedJson)
    : [];
  const importedActivityLog = Array.isArray(importedJson.activityLog) || Array.isArray(importedSettings.activityLog)
    ? getActivityLogFromSettings(importedSettings, importedJson.activityLog)
    : [];

  return {
    proposals: parseProposalCollectionImport(importedJson),
    companySettings: getSettingsWithPriceLibraryAndBids(importedSettings, importedPriceLibrary, importedBids, importedActivityLog),
    contacts: Array.isArray(importedJson.contacts) ? parseContactCollectionImport(importedJson) : [],
    bids: importedBids,
    priceLibrary: importedPriceLibrary,
    activityLog: importedActivityLog,
  };
}

function mergeOrReplaceImportedProposals(importedProposals, existingProposals, mode, label) {
  if (mode === "replace") {
    const confirmed = window.confirm(
      `Replace existing proposals with ${label}? This may affect local and cloud data after your next sync. This cannot be undone unless you have a backup.`,
    );

    if (!confirmed) {
      return null;
    }

    return importedProposals.map((proposal) => createEditableProposal(proposal));
  }

  return importedProposals.reduce((proposals, proposal) => {
    const resolvedProposal = resolveImportedProposalIdentity(createEditableProposal(proposal), proposals);
    return upsertProposal(proposals, resolvedProposal);
  }, existingProposals);
}

function mergeOrReplaceImportedContacts(importedContacts, existingContacts, mode, label) {
  if (mode === "replace") {
    const confirmed = window.confirm(
      `Replace existing contacts with ${label}? This may affect local and cloud data after your next sync. This cannot be undone unless you have a backup.`,
    );

    if (!confirmed) {
      return null;
    }

    return importedContacts.map((contact) => normalizeContact(contact));
  }

  return mergeImportedContacts(importedContacts, existingContacts);
}

function mergeOrReplaceImportedBids(importedBids, existingBids, mode, label) {
  if (mode === "replace") {
    const confirmed = window.confirm(
      `Replace existing bids with ${label}? This may affect local and cloud data after your next settings sync. This cannot be undone unless you have a backup.`,
    );

    if (!confirmed) {
      return null;
    }

    return normalizeBids(importedBids);
  }

  return mergeImportedBids(importedBids, existingBids);
}

function mergeImportedContacts(importedContacts = [], existingContacts = []) {
  return importedContacts.reduce((contacts, contact) => upsertContact(contacts, resolveImportedContactIdentity(contact, contacts)), [
    ...existingContacts,
  ]);
}

function mergeImportedBids(importedBids = [], existingBids = []) {
  return importedBids.reduce((bids, bid) => upsertBid(bids, resolveImportedBidIdentity(bid, bids)), [
    ...normalizeBids(existingBids),
  ]);
}

function mergeOrReplaceImportedPriceLibrary(importedItems, existingItems, mode) {
  if (mode === "replace") {
    const confirmed = window.confirm(
      "Replace existing price library items with this import? This may affect local and cloud data after your next settings sync.",
    );

    if (!confirmed) {
      return null;
    }

    return normalizePriceLibrary(importedItems);
  }

  return importedItems.reduce((items, item) => upsertPriceLibraryItem(items, resolveImportedPriceLibraryIdentity(item, items)), [
    ...normalizePriceLibrary(existingItems),
  ]);
}

function resolveImportedPriceLibraryIdentity(item, existingItems = []) {
  const normalizedItem = normalizePriceLibraryItem(item);
  const existingIds = new Set(existingItems.map((existingItem) => existingItem.id));

  if (!normalizedItem.id || existingIds.has(normalizedItem.id)) {
    normalizedItem.id = createProposalId();
  }

  normalizedItem.updatedAt = new Date().toISOString();
  return normalizedItem;
}

function resolveImportedBidIdentity(bid, existingBids = []) {
  const normalizedBid = normalizeBid(bid);
  const existingIds = new Set(existingBids.map((existingBid) => existingBid.id));

  if (!normalizedBid.id || existingIds.has(normalizedBid.id)) {
    normalizedBid.id = createProposalId();
  }

  normalizedBid.updatedAt = new Date().toISOString();
  return normalizedBid;
}

function resolveImportedProposalIdentity(proposal, existingProposals = []) {
  const existingIds = new Set(existingProposals.map((item) => item.id));
  const existingNumbers = new Set(existingProposals.map((item) => item.proposalNumber).filter(Boolean));
  const hasRevisionMetadata =
    normalizeRevisionNumber(proposal.revisionNumber) > 0 || hasTextValue(proposal.revisionLabel) || hasTextValue(proposal.parentProposalId);
  const importedProposal = createEditableProposal({
    ...proposal,
    updatedAt: new Date().toISOString(),
  });

  if (!importedProposal.id || existingIds.has(importedProposal.id)) {
    importedProposal.id = createProposalId();
  }

  if (!importedProposal.proposalNumber || (existingNumbers.has(importedProposal.proposalNumber) && !hasRevisionMetadata)) {
    importedProposal.proposalNumber = getNextProposalNumber(existingProposals, new Date(importedProposal.proposalDate || Date.now()));
  }

  importedProposal.submittedPacketRecords = normalizeSubmittedPacketRecords(importedProposal.submittedPacketRecords).map((record) => ({
    ...record,
    proposalId: importedProposal.id,
    proposalNumber: importedProposal.proposalNumber || record.proposalNumber,
  }));

  return importedProposal;
}

function resolveImportedContactIdentity(contact, existingContacts = []) {
  const normalizedContact = normalizeContact(contact);
  const existingIds = new Set(existingContacts.map((item) => item.id));

  if (!normalizedContact.id || existingIds.has(normalizedContact.id)) {
    normalizedContact.id = createProposalId();
  }

  normalizedContact.updatedAt = new Date().toISOString();
  return normalizedContact;
}

function isProposalLike(value) {
  return (
    isPlainObject(value) &&
    (isPlainObject(value.client) ||
      isPlainObject(value.project) ||
      Array.isArray(value.lineItems) ||
      hasTextValue(value.proposalNumber) ||
      hasTextValue(value.id))
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getBackupDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentProposalBackupFileName(proposal) {
  return `Last_Yard_Proposal_${sanitizeFileName(proposal.proposalNumber || "Current")}.json`;
}

function getAllProposalsBackupFileName() {
  return `Last_Yard_All_Proposals_Backup_${getBackupDateStamp()}.json`;
}

function getCompanySettingsBackupFileName() {
  return `Last_Yard_Company_Settings_${getBackupDateStamp()}.json`;
}

function getContactsBackupFileName() {
  return `Last_Yard_Contacts_Backup_${getBackupDateStamp()}.json`;
}

function getBidsBackupFileName() {
  return `Last_Yard_Bids_Backup_${getBackupDateStamp()}.json`;
}

function getPriceLibraryBackupFileName() {
  return `Last_Yard_Price_Library_${getBackupDateStamp()}.json`;
}

function getFullBackupFileName() {
  return `Last_Yard_Full_Backup_${getBackupDateStamp()}.json`;
}

function sanitizeFileName(value) {
  return String(value || "Backup")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

function createSeedProposal(companySettings = getDefaultCompanySettings()) {
  return createEditableProposal({
    ...applyCompanySettingsToProposal(SEED_PROPOSAL, companySettings, new Date(SEED_PROPOSAL.proposalDate)),
    id: SEED_PROPOSAL.id || createProposalId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function createNewProposalDraft(existingProposals, companySettings = getDefaultCompanySettings()) {
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + getExpirationDays(companySettings));
  const seedProposal = cloneObject(SEED_PROPOSAL);

  delete seedProposal.demo;
  delete seedProposal.metadata;

  return createEditableProposal({
    ...applyCompanySettingsToProposal(seedProposal, companySettings, today),
    id: createProposalId(),
    proposalMode: DEFAULT_PROPOSAL_MODE,
    proposalType: getProposalTypeForMode(DEFAULT_PROPOSAL_MODE),
    type: getProposalTypeForMode(DEFAULT_PROPOSAL_MODE),
    packetMode: getPacketModeForProposalMode(DEFAULT_PROPOSAL_MODE),
    contactId: "",
    proposalNumber: getNextProposalNumber(existingProposals, today),
    status: "draft",
    revisionNumber: 0,
    revisionLabel: "Rev 0",
    revisionDate: formatInputDate(today),
    revisionNotes: "",
    parentProposalId: "",
    previousTotal: "",
    revisedTotal: "",
    ...getDefaultTrackingFields(),
    proposalDate: formatInputDate(today),
    validUntil: formatInputDate(validUntil),
    packetBuilder: [],
    projectPhotos: normalizeProjectPhotos([]),
    planSheets: normalizePlanSheets([]),
    gcPrime: getDefaultGcPrime(),
    gcPacketTables: normalizeGcPacketTables({}),
    submittedPacketRecords: [],
    sendRecords: [],
    proposalNotes: "",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  });
}

function createBlankProposalDraft(existingProposals, companySettings = getDefaultCompanySettings(), proposalMode = DEFAULT_PROPOSAL_MODE) {
  const normalizedMode = normalizeProposalMode(proposalMode) || DEFAULT_PROPOSAL_MODE;
  const normalizedSettings = normalizeCompanySettings(companySettings);
  const baseProposal = cleanTrueBlankProposalState(createNewProposalDraft(existingProposals, companySettings));
  const blankProposal = createEditableProposal({
    ...baseProposal,
    proposalMode: normalizedMode,
    proposalType: getProposalTypeForMode(normalizedMode),
    type: getProposalTypeForMode(normalizedMode),
    packetMode: getPacketModeForProposalMode(normalizedMode),
    pdfStyle: getProposalPdfStyleForMode(normalizedSettings.proposalPdfStyle, normalizedMode),
    templateId: "blank",
    templateName: `${getProposalModeLabel(normalizedMode)} Blank Proposal`,
    contactId: "",
    client: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      billingAddress: "",
      projectAddress: "",
    },
    project: {
      name: "",
      location: "",
      address: "",
      description: "",
      category: "",
      proposedSchedule: {
        startDate: "",
        display: "",
      },
      estimatedDuration: "",
      accessNotes: "",
      siteConditionNotes: "",
      scheduleRestrictions: "",
      specialRequirements: "",
    },
    scopeSections: [],
    concreteSpecs: getDefaultConcreteSpecs(),
    lineItems: [],
    pricingSections: [],
    exclusions: [],
    assumptions: [],
    projectPhotos: normalizeProjectPhotos([]),
    planSheets: normalizePlanSheets([]),
    packetBuilder: isGcPrimePacketMode(normalizedMode) ? normalizePacketBuilder([]) : [],
    gcPrime: getDefaultGcPrime(),
    gcPacketTables: normalizeGcPacketTables({}),
    submittedPacketRecords: [],
    sendRecords: [],
    proposalNotes: "",
  });

  return applyProposalModeToBlankProposal(cleanTrueBlankProposalState(blankProposal), normalizedMode, normalizedSettings.proposalPdfStyle);
}

function applyProposalModeToBlankProposal(proposal = {}, mode = DEFAULT_PROPOSAL_MODE, proposalPdfStyleSettings = null) {
  const normalizedMode = normalizeProposalMode(mode) || DEFAULT_PROPOSAL_MODE;
  const proposalType = getProposalTypeForMode(normalizedMode);
  const packetMode = getPacketModeForProposalMode(normalizedMode);
  const pdfStyleSettings = proposalPdfStyleSettings || getDefaultProposalPdfStyleSettings();
  const nextProposal = {
    ...proposal,
    proposalMode: normalizedMode,
    proposalType,
    type: proposalType,
    packetMode,
    templateId: "blank",
    templateName: `${getProposalModeLabel(normalizedMode)} Blank Proposal`,
    pdfStyle: getProposalPdfStyleForMode(pdfStyleSettings, normalizedMode),
    pricingMode: isResidentialProposalMode(normalizedMode) ? proposal.pricingMode || "" : proposal.pricingMode || "",
    pricingOptions: isResidentialProposalMode(normalizedMode) ? proposal.pricingOptions || [] : [],
    optionalAddOns: isResidentialProposalMode(normalizedMode) ? proposal.optionalAddOns || [] : [],
    packetBuilder: isGcPrimePacketMode(normalizedMode) ? normalizePacketBuilder(proposal.packetBuilder) : [],
  };

  if (!isGcPrimePacketMode(normalizedMode)) {
    return createEditableProposal({
      ...nextProposal,
      gcPacketTables: normalizeGcPacketTables({}),
      planSheets: [],
      gcPrime: getDefaultGcPrime(),
    });
  }

  return createEditableProposal({
    ...nextProposal,
    gcPacketTables: normalizeGcPacketTables(nextProposal.gcPacketTables),
    gcPrime: {
      ...getDefaultGcPrime(),
      ...(nextProposal.gcPrime || {}),
    },
  });
}

function createNewGcPacketDraft(existingProposals, companySettings = getDefaultCompanySettings()) {
  const baseProposal = createNewProposalDraft(existingProposals, companySettings);
  const gcPacketTables = normalizeGcPacketTables(baseProposal.gcPacketTables);

  return createEditableProposal(applyCompanyLegalDefaultsToProposal({
    ...baseProposal,
    proposalMode: "gc_prime_packet",
    proposalType: "gc_prime",
    type: "gc_prime",
    project: {
      ...baseProposal.project,
      category: "GC / Prime concrete packet",
    },
    gcPacketTables: {
      ...gcPacketTables,
      pricingSummary: {
        ...gcPacketTables.pricingSummary,
        enabled: true,
      },
      proposalNotes: {
        ...gcPacketTables.proposalNotes,
        enabled: true,
        proposalBasis: "Proposal based on provided plans, addenda, and listed clarifications.",
        contractScopeControl:
          "Proposal includes only the concrete scope specifically listed. Work shown elsewhere in the documents is excluded unless expressly included in this proposal, SOV, or written accepted scope sheet.",
        acceptanceSummary: "GC to identify accepted alternates and allowances before contract execution.",
        gcPrimeReviewer: "Reviewed by: ______________________________ Date: __________",
      },
    },
  }, companySettings));
}

function createProposalRevisionDraft(sourceProposal, existingProposals = []) {
  const now = new Date();
  const source = createEditableProposal(sourceProposal);
  const revisionNumber = getNextRevisionNumber(source, existingProposals);
  const previousTotal = calculateProposalTotals(source).total;
  const revisionLabel = formatRevisionLabel(revisionNumber);

  return createEditableProposal({
    ...cloneObject(source),
    id: createProposalId(),
    status: "draft",
    ...getDefaultTrackingFields(),
    revisionNumber,
    revisionLabel,
    revisionDate: formatInputDate(now),
    revisionNotes: `Created ${revisionLabel} from ${source.revisionLabel || formatRevisionLabel(source.revisionNumber)}.`,
    parentProposalId: source.id,
    previousTotal,
    revisedTotal: previousTotal,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

function getNextRevisionNumber(sourceProposal, proposals = []) {
  const sourceNumber = sourceProposal.proposalNumber;
  const maxExistingRevision = proposals
    .filter((proposal) => proposal.proposalNumber === sourceNumber)
    .reduce((maxRevision, proposal) => Math.max(maxRevision, normalizeRevisionNumber(proposal.revisionNumber)), -1);

  return Math.max(normalizeRevisionNumber(sourceProposal.revisionNumber), maxExistingRevision) + 1;
}

function hasTemplateSensitiveChanges(proposal, companySettings = getDefaultCompanySettings()) {
  const baseline = createNewProposalDraft([], companySettings);

  return getTemplateSensitiveSignature(proposal) !== getTemplateSensitiveSignature(baseline);
}

function getTemplateSensitiveSignature(proposal = {}) {
  return JSON.stringify({
    proposalType: proposal.proposalType ?? proposal.type ?? "",
    packetMode: proposal.packetMode || "",
    projectCategory: proposal.project?.category || "",
    scopeSections: normalizeScopeSections(proposal.scopeSections),
    concreteSpecs: proposal.concreteSpecs || {},
    exclusions: normalizeTextList(proposal.exclusions),
    assumptions: normalizeTextList(proposal.assumptions),
    terms: proposal.terms || {},
    lineItems: (proposal.lineItems || []).map((item) => ({
      description: item.description || "",
      quantity: item.quantity ?? "",
      unit: item.unit || "",
      unitPrice: item.unitPrice ?? "",
      taxable: item.taxable ?? true,
    })),
    pricingSections: normalizePricingSections(proposal.pricingSections).map(({ type, label, description, amount, included }) => ({
      type,
      label,
      description,
      amount,
      included,
    })),
    gcPacketTables: getTemplateGcPacketSignature(proposal.gcPacketTables),
    planSheets: normalizePlanSheets(proposal.planSheets).map((sheet) => ({
      matchKey: getPlanSheetMatchKey(sheet),
      enabled: sheet.enabled,
      title: sheet.title,
      subtitle: sheet.subtitle,
      calculationTitle: sheet.calculationTitle,
      calculationNotes: sheet.calculationNotes,
      clarificationNotes: sheet.clarificationNotes,
    })),
  });
}

function getTemplateGcPacketSignature(gcPacketTables = {}) {
  const tables = normalizeGcPacketTables(gcPacketTables);

  return Object.fromEntries(
    Object.entries(tables).map(([sectionKey, table]) => [
      sectionKey,
      {
        ...table,
        rows: (table.rows || []).map(({ id, ...row }) => row),
      },
    ]),
  );
}

function duplicateProposalDraft(sourceProposal, existingProposals) {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  return createEditableProposal({
    ...cloneObject(sourceProposal),
    id: createProposalId(),
    proposalNumber: getNextProposalNumber(existingProposals, now),
    status: "draft",
    ...getDefaultTrackingFields(),
    revisionNumber: 0,
    revisionLabel: "Rev 0",
    revisionDate: formatInputDate(now),
    revisionNotes: "",
    parentProposalId: "",
    previousTotal: "",
    revisedTotal: "",
    submittedPacketRecords: [],
    sendRecords: [],
    proposalDate: formatInputDate(now),
    validUntil: formatInputDate(validUntil),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

function upsertProposal(proposals, proposal) {
  const normalizedProposal = createEditableProposal({
    ...proposal,
    id: proposal.id || createProposalId(),
    updatedAt: proposal.updatedAt || new Date().toISOString(),
  });
  const otherProposals = proposals.filter((item) => item.id !== normalizedProposal.id);

  return [normalizedProposal, ...otherProposals];
}

function createEmptyContact() {
  const now = new Date().toISOString();

  return {
    id: createProposalId(),
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    billingAddress: "",
    defaultProjectAddress: "",
    contactType: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeContact(contact = {}) {
  const now = new Date().toISOString();
  const sourceContact = isPlainObject(contact) ? contact : {};
  const safeContactType = toSafeBidText(sourceContact.contactType);
  const contactType = CONTACT_TYPES.includes(safeContactType) ? safeContactType : "";

  return {
    id: toSafeBidText(sourceContact.id) || createProposalId(),
    companyName: toSafeBidText(sourceContact.companyName),
    contactName: toSafeBidText(sourceContact.contactName),
    phone: toSafeBidText(sourceContact.phone),
    email: toSafeBidText(sourceContact.email),
    billingAddress: toSafeBidText(sourceContact.billingAddress || sourceContact.address),
    defaultProjectAddress: toSafeBidText(sourceContact.defaultProjectAddress || sourceContact.projectAddress),
    contactType,
    notes: toSafeBidText(sourceContact.notes),
    demo: Boolean(sourceContact.demo || sourceContact.metadata?.isDemo),
    metadata: {
      ...(isPlainObject(sourceContact.metadata) ? sourceContact.metadata : {}),
      isDemo: Boolean(sourceContact.demo || sourceContact.metadata?.isDemo),
    },
    createdAt: toSafeBidText(sourceContact.createdAt) || now,
    updatedAt: toSafeBidText(sourceContact.updatedAt) || now,
  };
}

function normalizeContacts(contacts = []) {
  return (Array.isArray(contacts) ? contacts : []).filter(isPlainObject).map((contact) => normalizeContact(contact));
}

function upsertContact(contacts, contact) {
  const normalizedContact = normalizeContact(contact);
  const otherContacts = contacts.filter((item) => item.id !== normalizedContact.id);

  return [normalizedContact, ...otherContacts].sort((a, b) => formatContactName(a).localeCompare(formatContactName(b)));
}

function createEmptyBid() {
  const now = new Date().toISOString();

  return {
    id: createProposalId(),
    projectName: "",
    ownerOrClient: "",
    gcCompany: "",
    contactId: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    projectLocation: "",
    bidSource: "",
    bidUrl: "",
    planLink: "",
    bidDueDate: "",
    bidDueTime: "",
    preBidMeetingDate: "",
    rfiDeadline: "",
    addendumDeadline: "",
    expectedAwardDate: "",
    bidStatus: "New",
    priority: "Medium",
    estimatorAssigned: "",
    scopeSummary: "",
    concreteScope: "",
    redFlags: "",
    missingInfo: "",
    nextStep: "",
    followUpDate: "",
    proposalId: "",
    submittedPacketRecordId: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeBid(bid = {}) {
  const now = new Date().toISOString();
  const sourceBid = isPlainObject(bid) ? bid : {};
  const safeId = toSafeBidText(sourceBid.id);
  const safeStatus = toSafeBidText(sourceBid.bidStatus);
  const safePriority = toSafeBidText(sourceBid.priority);

  return {
    ...createEmptyBid(),
    ...sourceBid,
    id: safeId || createProposalId(),
    projectName: toSafeBidText(sourceBid.projectName),
    ownerOrClient: toSafeBidText(sourceBid.ownerOrClient),
    gcCompany: toSafeBidText(sourceBid.gcCompany),
    contactId: toSafeBidText(sourceBid.contactId),
    contactName: toSafeBidText(sourceBid.contactName),
    contactEmail: toSafeBidText(sourceBid.contactEmail),
    contactPhone: toSafeBidText(sourceBid.contactPhone),
    projectLocation: toSafeBidText(sourceBid.projectLocation),
    bidSource: toSafeBidText(sourceBid.bidSource),
    bidUrl: toSafeBidText(sourceBid.bidUrl),
    planLink: toSafeBidText(sourceBid.planLink),
    bidDueDate: toSafeBidText(sourceBid.bidDueDate),
    bidDueTime: toSafeBidText(sourceBid.bidDueTime),
    preBidMeetingDate: toSafeBidText(sourceBid.preBidMeetingDate),
    rfiDeadline: toSafeBidText(sourceBid.rfiDeadline),
    addendumDeadline: toSafeBidText(sourceBid.addendumDeadline),
    expectedAwardDate: toSafeBidText(sourceBid.expectedAwardDate),
    bidStatus: BID_STATUSES.includes(safeStatus) ? safeStatus : "New",
    priority: BID_PRIORITIES.includes(safePriority) ? safePriority : "Medium",
    estimatorAssigned: toSafeBidText(sourceBid.estimatorAssigned),
    scopeSummary: toSafeBidText(sourceBid.scopeSummary),
    concreteScope: toSafeBidText(sourceBid.concreteScope),
    redFlags: toSafeBidText(sourceBid.redFlags),
    missingInfo: toSafeBidText(sourceBid.missingInfo),
    nextStep: toSafeBidText(sourceBid.nextStep),
    followUpDate: toSafeBidText(sourceBid.followUpDate),
    proposalId: toSafeBidText(sourceBid.proposalId),
    submittedPacketRecordId: toSafeBidText(sourceBid.submittedPacketRecordId),
    notes: toSafeBidText(sourceBid.notes),
    createdAt: toSafeBidText(sourceBid.createdAt) || now,
    updatedAt: toSafeBidText(sourceBid.updatedAt) || now,
  };
}

function toSafeBidText(value) {
  if (!hasTextValue(value)) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.filter(hasTextValue).map(toSafeBidText).filter(hasTextValue).join(", ");
  }

  if (isPlainObject(value)) {
    const likelyValue = value.value ?? value.text ?? value.name ?? value.label ?? value.title ?? value.display;

    if (hasTextValue(likelyValue)) {
      return toSafeBidText(likelyValue);
    }
  }

  return "";
}

function hasBidDraftAnchor(bid = {}) {
  return [
    bid.projectName,
    bid.projectLocation,
    bid.ownerOrClient,
    bid.gcCompany,
    bid.scopeSummary,
    bid.concreteScope,
    bid.notes,
  ].some(hasTextValue);
}

function normalizeBids(bids = []) {
  return (Array.isArray(bids) ? bids : [])
    .filter(isPlainObject)
    .map((bid) => normalizeBid(bid))
    .sort((a, b) => getBidSortTimestamp(a) - getBidSortTimestamp(b));
}

function upsertBid(bids, bid) {
  const normalizedBid = normalizeBid(bid);
  const otherBids = normalizeBids(bids).filter((item) => item.id !== normalizedBid.id);

  return normalizeBids([normalizedBid, ...otherBids]);
}

function applyContactToBid(bid, contact) {
  return {
    ...bid,
    contactId: contact.id,
    contactName: contact.contactName || bid.contactName,
    contactEmail: contact.email || bid.contactEmail,
    contactPhone: contact.phone || bid.contactPhone,
    gcCompany: contact.companyName || bid.gcCompany,
    projectLocation: contact.defaultProjectAddress || bid.projectLocation,
  };
}

function filterBids(bids = [], { priorityFilter = "all", searchQuery = "", statusFilter = "all" } = {}) {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return normalizeBids(bids).filter((bid) => {
    const searchText = [bid.projectName, bid.gcCompany, bid.ownerOrClient, bid.projectLocation, bid.contactName, bid.contactEmail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesPriority = priorityFilter === "all" || bid.priority === priorityFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "due_this_week" && isBidDueThisWeek(bid)) ||
      (statusFilter === "overdue" && isBidOverdue(bid)) ||
      (statusFilter === "no_proposal" && !hasTextValue(bid.proposalId)) ||
      bid.bidStatus === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });
}

function getUpcomingBids(bids = [], limit = 5) {
  return normalizeBids(bids)
    .filter((bid) => !["Awarded", "Lost", "No-Bid"].includes(bid.bidStatus))
    .slice(0, limit);
}

function getBidSortTimestamp(bid = {}) {
  if (hasTextValue(bid.bidDueDate)) {
    return getDateOnlyTimestamp(bid.bidDueDate);
  }

  const timestamp = new Date(bid.updatedAt || bid.createdAt || "").valueOf();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function isBidDueThisWeek(bid = {}) {
  if (!hasTextValue(bid.bidDueDate)) {
    return false;
  }

  const dueTimestamp = getDateOnlyTimestamp(bid.bidDueDate);
  const todayTimestamp = getTodayTimestamp();
  const weekFromToday = todayTimestamp + 7 * 24 * 60 * 60 * 1000;

  return dueTimestamp >= todayTimestamp && dueTimestamp <= weekFromToday;
}

function isBidOverdue(bid = {}) {
  return (
    hasTextValue(bid.bidDueDate) &&
    getDateOnlyTimestamp(bid.bidDueDate) < getTodayTimestamp() &&
    !["Submitted", "Awarded", "Lost", "No-Bid"].includes(bid.bidStatus)
  );
}

function getBidStatusClass(status = "") {
  return `bid-status-${String(status || "new").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getBidPriorityClass(priority = "") {
  return `bid-priority-${String(priority || "medium").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getBidDeadlineClass(bid = {}) {
  if (isBidOverdue(bid)) {
    return "bid-deadline-overdue";
  }

  if (isBidDueThisWeek(bid)) {
    return "bid-deadline-soon";
  }

  return "bid-deadline-normal";
}

function formatBidDueLabel(bid = {}) {
  if (!hasTextValue(bid.bidDueDate)) {
    return "No due date";
  }

  const dueTime = hasTextValue(bid.bidDueTime) ? ` at ${bid.bidDueTime}` : "";
  return `Due ${formatDisplayDate(bid.bidDueDate)}${dueTime}`;
}

function areBidsEquivalentForSave(savedBid = {}, draftBid = {}) {
  const normalizeComparableBid = (bid) => {
    const normalizedBid = normalizeBid(bid);
    return {
      ...normalizedBid,
      updatedAt: "",
    };
  };

  return JSON.stringify(normalizeComparableBid(savedBid)) === JSON.stringify(normalizeComparableBid(draftBid));
}

function createEmptyPriceLibraryDraft() {
  return {
    id: "",
    name: "",
    category: "Sidewalk / Flatwork",
    description: "",
    unit: "SF",
    defaultUnitPrice: 0,
    defaultQuantity: 1,
    taxable: true,
    defaultNotes: "",
    defaultScopeBullets: "",
    defaultExclusions: "",
    active: true,
    createdAt: "",
    updatedAt: "",
  };
}

function upsertPriceLibraryItem(items, item) {
  const normalizedItem = normalizePriceLibraryItem(item);
  const otherItems = normalizePriceLibrary(items).filter((libraryItem) => libraryItem.id !== normalizedItem.id);

  return [normalizedItem, ...otherItems].sort((a, b) => a.name.localeCompare(b.name));
}

function filterPriceLibraryItems(items = [], searchQuery = "", categoryFilter = "all") {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return normalizePriceLibrary(items).filter((item) => {
    const searchText = [item.name, item.category, item.description, item.unit].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });
}

function formatPriceLibraryListInput(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

function getProposalCountForContact(contactId, proposals = []) {
  return proposals.filter((proposal) => proposal.contactId === contactId).length;
}

function getLinkedContact(proposal = {}, contacts = []) {
  return contacts.find((contact) => contact.id === proposal.contactId) || null;
}

function formatContactName(contact = {}) {
  return contact.companyName || contact.contactName || "Unnamed contact";
}

function formatContactOption(contact = {}) {
  const contactName = contact.contactName && contact.contactName !== contact.companyName ? ` - ${contact.contactName}` : "";
  const type = contact.contactType ? ` (${contact.contactType})` : "";

  return `${formatContactName(contact)}${contactName}${type}`;
}

function createDemoContact() {
  const now = new Date().toISOString();

  return normalizeContact({
    id: demoContactId,
    companyName: "ABC Prime Contractors",
    contactName: "Mike Smith",
    phone: "(555) 123-4567",
    email: "mike@example.com",
    billingAddress: "100 Demo Contractor Way\nWoodburn, OR 97071",
    defaultProjectAddress: "Settlemier Park, Woodburn, Oregon",
    contactType: "GC / Prime",
    notes: "Demo GC contact for proposal packet walkthrough",
    demo: true,
    metadata: { ...demoMetadata, label: "Sample GC contact" },
    createdAt: now,
    updatedAt: now,
  });
}

function createDemoProposals(companySettings = getDefaultCompanySettings(), existingProposals = [], contactId = demoContactId) {
  return [
    createDemoGcPacketProposal(companySettings, existingProposals, contactId),
    createDemoSimpleProposal(companySettings, existingProposals),
  ];
}

function createDemoGcPacketProposal(companySettings = getDefaultCompanySettings(), existingProposals = [], contactId = demoContactId) {
  const now = new Date();
  const baseProposal = createNewGcPacketDraft(existingProposals, companySettings);
  const gcPacketTables = normalizeGcPacketTables({
    pricingSummary: {
      enabled: true,
      presentationNotes: "Base Package with Allowances: $355,500. Total if all accepted: $965,000.",
      rows: [],
    },
    scheduleOfValues: {
      enabled: true,
      rows: [
        { item: "1", description: "Base Concrete Work", pricingBasis: "Base bid", amount: "$263,000" },
        { item: "2", description: "Estimated Shade Footings", pricingBasis: "Allowance", amount: "$42,500" },
        { item: "3", description: "Concrete Interface / RFI Allowance", pricingBasis: "Allowance", amount: "$50,000" },
        { item: "4", description: "Pedestrian asphalt-to-concrete", pricingBasis: "Add Alternate 01", amount: "$212,500" },
        { item: "5", description: "Sport court concrete base", pricingBasis: "Add Alternate 02", amount: "$397,000" },
      ],
    },
    takeoffQuantities: {
      enabled: true,
      rows: [
        { item: "L102 West Walks", quantity: "12,450 SF", detailSize: "4 in flatwork", netCy: "153.7", cyWithTenPercent: "169.1", priceStatus: "Included in base" },
        { item: "L103 East Walks", quantity: "9,820 SF", detailSize: "4 in flatwork", netCy: "121.2", cyWithTenPercent: "133.3", priceStatus: "Included in base" },
        { item: "Play Area Pads", quantity: "3,600 SF", detailSize: "5 in slab", netCy: "55.6", cyWithTenPercent: "61.1", priceStatus: "Allowance/RFI" },
        { item: "Sport Court Base", quantity: "18,200 SF", detailSize: "5 in with #4 rebar", netCy: "280.9", cyWithTenPercent: "309.0", priceStatus: "Add Alt 02" },
      ],
    },
    shadeFootingEstimate: {
      enabled: true,
      rows: [
        { column: "C1-C2", columnSize: "8 in steel columns", estimatedSpreadFooting: "5 ft x 5 ft x 18 in", netCy: "2.8", estimatedSubtotal: "5.6 CY", estimatedCyWithTenPercent: "6.2 CY", allowanceAmount: "$14,000", allowanceNote: "Pending final shade footing design" },
        { column: "C3-C6", columnSize: "10 in steel columns", estimatedSpreadFooting: "6 ft x 6 ft x 24 in", netCy: "5.3", estimatedSubtotal: "21.2 CY", estimatedCyWithTenPercent: "23.3 CY", allowanceAmount: "$28,500", allowanceNote: "Allowance only until engineered design is issued" },
      ],
    },
    proposalNotes: {
      enabled: true,
      proposalBasis: "Demo packet based on preliminary park renovation notes, plan sheet placeholders, and listed clarifications.",
      contractScopeControl: "Accepted bid form, exclusions, clarifications, and acknowledged addenda control final contract scope.",
      acceptanceSummary: "GC to identify accepted alternates and allowances before contract execution.",
      gcPrimeReviewer: "Reviewed by: ______________________________ Date: __________",
    },
  });

  return createEditableProposal({
    ...baseProposal,
    id: demoGcProposalId,
    contactId,
    demo: true,
    metadata: { ...demoMetadata, label: "Sample GC packet proposal" },
    proposalNumber: "LYC-DEMO-0001",
    status: "draft",
    proposalMode: "gc_prime_packet",
    proposalType: "gc_prime",
    type: "gc_prime",
    packetMode: "full_gc_packet",
    proposalDate: "2026-05-03",
    validUntil: "2026-06-02",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    client: {
      companyName: "ABC Prime Contractors",
      contactName: "Mike Smith",
      title: "Project Manager",
      phone: "(555) 123-4567",
      email: "mike@example.com",
      billingAddress: "100 Demo Contractor Way\nWoodburn, OR 97071",
      projectAddress: "Settlemier Park, Woodburn, Oregon",
      address: "100 Demo Contractor Way",
      cityStateZip: "Woodburn, OR 97071",
    },
    project: {
      ...baseProposal.project,
      name: "Settlemier Park Renovation Demo",
      location: "Woodburn, Oregon",
      address: "Settlemier Park, Woodburn, Oregon",
      category: "GC / Prime concrete packet",
      estimatedStartDate: "2026-06-03",
      estimatedDuration: "June 3 - June 28, 2026",
      description: "Demo full GC packet for concrete flatwork, allowances, alternates, plan/takeoff backup, RFIs, addenda, and acceptance summary.",
      accessNotes: "Coordinate park access, staging, and haul routes with GC superintendent before mobilization.",
      siteConditionNotes: "Demo assumes prepared subgrade by others unless specifically listed in base scope.",
      scheduleRestrictions: "Work sequence subject to GC master schedule, public access limits, and approved concrete placement windows.",
      specialRequirements: "Confirm final shade footing design, playground equipment footing schedule, and accepted alternates before contract execution.",
      proposedSchedule: {
        startDate: "2026-06-03",
        endDate: "2026-06-28",
        display: "June 3 - June 28, 2026",
      },
    },
    gcPrime: {
      ...baseProposal.gcPrime,
      contractorName: "ABC Prime Contractors",
      projectManagerName: "Mike Smith",
      projectManagerPhone: "(555) 123-4567",
      projectManagerEmail: "mike@example.com",
      bidPackageNumber: "Demo BP-03 Concrete",
      specSection: "03 30 00 Cast-in-Place Concrete",
      drawingReferences: "L102, L103, L104, L203, L601, L602",
      addendaAcknowledged: "Addendum 01",
      prevailingWageRequired: true,
      certifiedPayrollRequired: true,
      insuranceCertificateRequired: true,
      w9Required: true,
      safetyOrientationRequired: true,
      jobsiteAccessBadgingRequirements: "GC orientation and site access coordination required before mobilization.",
      retainagePercentage: "5%",
      paymentApplicationTerms: "Monthly progress billing per GC schedule of values.",
      changeOrderProcess: "Written GC approval required before added or changed work proceeds.",
      rfiClarificationNotes:
        "Final engineered shade footing design for C1-C6 required.\nFinal playground equipment footing schedule required.\nConfirm concrete interface limits at asphalt-to-concrete transitions.",
    },
    scopeSections: [
      { title: "Base Concrete Work", items: ["Demo base bid concrete flatwork per listed plan sheets", "Sidewalks and pedestrian paving", "Concrete pads and miscellaneous site slabs", "Sawcut control joints and standard curing"] },
      { title: "Allowances", items: ["Estimated shade footing allowance pending final engineered footing design", "Concrete interface / RFI allowance for unresolved transition conditions"] },
      { title: "Add Alternates", items: ["Add Alternate 01: pedestrian asphalt replaced with concrete where accepted", "Add Alternate 02: sport court concrete base with #4 rebar each way and sawcut allowance"] },
      { title: "GC Coordination", items: ["Coordinate schedule, access, and phasing with GC", "Submit RFIs for unresolved scope boundaries", "Review addenda and accepted alternates before contract execution"] },
      { title: "Closeout", items: ["Final cleanup of concrete work areas", "Punch list support for accepted scope", "Warranty documentation per proposal terms"] },
    ],
    concreteSpecs: {
      ...baseProposal.concreteSpecs,
      estimatedSquareFeet: "44,070 SF demo takeoff",
      estimatedCubicYards: "Approximately 612 CY with contingency",
      thickness: "4 in walks / 5 in slabs / footing depths per final design",
      psi: "4,000 PSI @ 28 days",
      slump: "4 in +/- 1 in",
      airEntrainment: "5% - 7%",
      rebarMeshDetails: "Per plan; sport court alternate assumes #4 rebar each way",
      finishType: "Broom finish exterior flatwork",
      controlJointSpacing: "Sawcut per ACI and plan requirements",
      sawCutTiming: "Early-entry or same-day sawcut as conditions require",
      cureSealerNotes: "Cure/sealer per specification and weather conditions",
      truckAccessNotes: "Truck access and washout location by GC.",
    },
    lineItems: [{ itemNumber: "1", description: "Base Concrete Work", quantity: 1, unit: "LS", unitPrice: 263000, taxable: true }],
    pricingSections: [
      { id: "demo-allowance-shade-footings", type: "allowance", label: "Estimated Shade Footings", description: "Allowance pending final engineered footing design.", amount: 42500, included: true },
      { id: "demo-allowance-interface-rfi", type: "allowance", label: "Concrete Interface / RFI Allowance", description: "Allowance for unresolved concrete interface items.", amount: 50000, included: true },
      { id: "demo-add-alt-01", type: "add_alternate", label: "Add Alternate 01", description: "Pedestrian asphalt replaced with concrete where accepted.", amount: 212500, included: false },
      { id: "demo-add-alt-02", type: "add_alternate", label: "Add Alternate 02", description: "Sport court concrete base with #4 rebar each way and sawcut allowance.", amount: 397000, included: false },
    ],
    exclusions: [
      "Permits, testing, and inspection fees by others unless specifically listed.",
      "Unsuitable soils, rock excavation, contaminated materials, and subgrade remediation excluded.",
      "Survey, staking, layout control, traffic control, and public access management by others.",
      "Cold weather protection, dewatering, and temporary heat excluded unless added by change order.",
      "Final quantities and accepted alternates must be confirmed by GC before contract execution.",
      "Shade footing pricing is allowance only until final engineered footing design is issued.",
    ],
    assumptions: [
      "GC provides access, staging, approved subgrade, and timely RFI responses.",
      "Proposal is based on demo packet assumptions and placeholder plan sheet backup.",
      "Work will be performed in one efficient mobilization sequence unless otherwise agreed.",
    ],
    terms: {
      payment: "Monthly progress billing per GC payment application schedule. Retainage and final payment per executed subcontract.",
      depositText: "Deposit waived for approved GC contract unless otherwise noted.",
      progressBilling: "Progress billings submitted monthly based on completed work and accepted alternates.",
      acceptance: "Accepted bid form, exclusions, clarifications, and addenda listed in this packet are incorporated into the contract scope.",
    },
    proposalNotes:
      "Base Package with Allowances: $355,500.\nTotal if all accepted: $965,000.\nThis is demo data for walkthrough and should be reviewed before sending any client-facing proposal.",
    takeoffQuantityBackup:
      "Demo takeoff includes L102 west walks, L103 east walks, L104 play area enlargement, sport court alternate, L601 detail notes, L602 furnishing notes, and shade footing allowance assumptions.",
    gcPacketTables,
    planSheets: normalizePlanSheets([
      { matchKey: "l102", enabled: true, pageType: "plan_takeoff_sheet", title: "Plan Takeoff Sheet - L102 Materials Plan West", subtitle: "L102 Materials Plan West", calculationTitle: "L102 Takeoff Basis", calculationNotes: ["West materials plan demo quantity backup", "Sidewalk and plaza flatwork summarized for base bid"], clarificationNotes: ["Confirm final paving limits with GC before contract."] },
      { matchKey: "l103", enabled: true, pageType: "plan_takeoff_sheet", title: "Plan Takeoff Sheet - L103 Materials Plan East", subtitle: "L103 Materials Plan East", calculationTitle: "L103 Takeoff Basis", calculationNotes: ["East materials plan demo quantity backup", "Concrete walks and pads included in base bid"], clarificationNotes: ["RFI required for unresolved transitions."] },
      { matchKey: "l104", enabled: true, pageType: "plan_takeoff_sheet", title: "Plan Takeoff Sheet - L104 Materials Play Area Enlargement", subtitle: "L104 Play Area Enlargement", calculationTitle: "L104 Takeoff Basis", calculationNotes: ["Play area concrete pads and equipment coordination", "Footing schedule pending final playground equipment package"], clarificationNotes: ["Final equipment footing schedule required."] },
      { matchKey: "sport-court", enabled: true, pageType: "plan_takeoff_sheet", title: "Sport Courts / L203", subtitle: "Sport Court Alternate", calculationTitle: "Sport Court Alternate", calculationNotes: ["Sport court concrete base priced as Add Alternate 02", "#4 rebar each way and sawcut allowance included"], clarificationNotes: ["Accepted alternate required before procurement."] },
      { matchKey: "l601", enabled: true, pageType: "detail_notes", title: "L601 Detail Notes", subtitle: "Concrete Detail Backup", calculationTitle: "Detail Notes", calculationNotes: ["Concrete detail assumptions summarized for demo packet", "Jointing and edge conditions per details"], clarificationNotes: [] },
      { matchKey: "l602", enabled: true, pageType: "detail_notes", title: "L602 Fence / Site Furnishing Notes", subtitle: "Site Furnishing Coordination", calculationTitle: "Furnishing Notes", calculationNotes: ["Coordinate concrete work at site furnishing interfaces", "Fence and furnishing embeds excluded unless shown in accepted scope"], clarificationNotes: [] },
      { matchKey: "shade-footing-estimate", enabled: true, pageType: "shade_footing_estimate", title: "Shade Footing Estimate", subtitle: "Concrete Footing Backup", calculationTitle: "Shade Footing Estimate", calculationNotes: ["Allowance based on preliminary C1-C6 footing assumptions", "Final engineered footing design required before fixed price"], clarificationNotes: ["Allowance only; final design may change quantity and price."] },
    ]),
  });
}

function createDemoSimpleProposal(companySettings = getDefaultCompanySettings(), existingProposals = []) {
  const now = new Date();
  const baseProposal = createEditableProposal(applyTemplateToProposal("driveway", createNewProposalDraft(existingProposals, companySettings)));

  return createEditableProposal({
    ...baseProposal,
    id: demoSimpleProposalId,
    demo: true,
    metadata: { ...demoMetadata, label: "Sample residential proposal" },
    proposalNumber: "LYC-DEMO-0002",
    status: "draft",
    proposalMode: "residential",
    proposalType: "residential",
    type: "residential",
    packetMode: "summary",
    proposalDate: "2026-05-03",
    validUntil: "2026-06-02",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    client: {
      companyName: "",
      contactName: "Jordan Homeowner",
      title: "",
      phone: "(555) 987-6543",
      email: "jordan@example.com",
      billingAddress: "220 Demo Drive\nSalem, OR 97301",
      projectAddress: "220 Demo Drive, Salem, OR 97301",
      address: "220 Demo Drive",
      cityStateZip: "Salem, OR 97301",
    },
    project: {
      ...baseProposal.project,
      name: "Residential Driveway Demo",
      location: "Salem, OR",
      address: "220 Demo Drive, Salem, OR 97301",
      category: "Residential driveway",
      estimatedStartDate: "2026-06-10",
      estimatedDuration: "3-4 working days",
      description: "Demo summary proposal for driveway removal, prep, and replacement with broom-finished concrete.",
      accessNotes: "Homeowner to keep driveway clear before mobilization.",
      siteConditionNotes: "Assumes normal excavation and stable subgrade.",
      scheduleRestrictions: "Schedule subject to weather and concrete supplier availability.",
      specialRequirements: "Confirm final driveway limits before forming.",
      proposedSchedule: {
        startDate: "2026-06-10",
        endDate: "",
        display: "3-4 working days",
      },
    },
    scopeSections: [
      { title: "Site Preparation", items: ["Remove existing driveway concrete", "Prepare and compact subgrade", "Install forms for new driveway limits"] },
      { title: "Concrete Driveway", items: ["Place 4 in concrete driveway", "Broom finish surface", "Install control joints"] },
      { title: "Cleanup", items: ["Final cleanup of work area", "Haul off excess concrete debris", "Owner walkthrough at completion"] },
    ],
    concreteSpecs: {
      ...baseProposal.concreteSpecs,
      estimatedSquareFeet: "720 SF",
      estimatedCubicYards: "9 CY",
      thickness: "4 in",
      psi: "4,000 PSI @ 28 days",
      finishType: "Broom finish",
      controlJointSpacing: "Sawcut or tooled joints as appropriate",
    },
    lineItems: [
      { itemNumber: "1", description: "Demo & Haul Off Existing Driveway", quantity: 720, unit: "SF", unitPrice: 2.25, taxable: true },
      { itemNumber: "2", description: "Driveway Prep & Forms", quantity: 720, unit: "SF", unitPrice: 2.1, taxable: true },
      { itemNumber: "3", description: "Concrete Driveway - 4 in Broom Finish", quantity: 720, unit: "SF", unitPrice: 8.95, taxable: true },
      { itemNumber: "4", description: "Control Joints & Cleanup", quantity: 1, unit: "LS", unitPrice: 750, taxable: true },
    ],
    pricingSections: [],
    exclusions: ["Permits by owner if required", "Unexpected unsuitable subgrade", "Landscape repair beyond immediate work area", "Irrigation or utility relocation"],
    assumptions: ["Owner provides clear access", "Work completed during normal working hours", "Pricing valid for 30 days"],
    terms: {
      payment: "50% deposit required to schedule. Balance due upon completion.",
      depositText: "50% deposit required.",
      progressBilling: "Final invoice due at completion.",
      acceptance: "This demo proposal is accepted by signature below after final owner review.",
    },
  });
}

function proposalHasContactConflicts(proposal = {}, contact = {}) {
  const comparisons = [
    [proposal.client?.companyName, contact.companyName],
    [proposal.client?.contactName, contact.contactName],
    [proposal.client?.phone, contact.phone],
    [proposal.client?.email, contact.email],
    [proposal.client?.billingAddress || proposal.client?.address, contact.billingAddress],
    [proposal.client?.projectAddress || proposal.project?.address, contact.defaultProjectAddress],
  ];

  return comparisons.some(([currentValue, nextValue]) => {
    if (!hasTextValue(currentValue) || !hasTextValue(nextValue)) {
      return false;
    }

    return String(currentValue).trim() !== String(nextValue).trim();
  });
}

function applyContactToProposal(proposal = {}, contact = {}) {
  const nextProposal = cloneObject(proposal);
  const normalizedContact = normalizeContact(contact);

  nextProposal.contactId = normalizedContact.id;
  nextProposal.client = {
    ...(nextProposal.client || {}),
    companyName: normalizedContact.companyName || nextProposal.client?.companyName || "",
    contactName: normalizedContact.contactName || nextProposal.client?.contactName || "",
    phone: normalizedContact.phone || nextProposal.client?.phone || "",
    email: normalizedContact.email || nextProposal.client?.email || "",
    billingAddress: normalizedContact.billingAddress || nextProposal.client?.billingAddress || nextProposal.client?.address || "",
    address: normalizedContact.billingAddress || nextProposal.client?.address || nextProposal.client?.billingAddress || "",
    projectAddress: normalizedContact.defaultProjectAddress || nextProposal.client?.projectAddress || "",
  };

  if (hasTextValue(normalizedContact.defaultProjectAddress)) {
    nextProposal.project = {
      ...(nextProposal.project || {}),
      address: normalizedContact.defaultProjectAddress,
    };
  }

  return nextProposal;
}

function linkProposalToMatchingContact(proposal = {}, contacts = []) {
  if (proposal.contactId || contacts.length === 0) {
    return proposal;
  }

  const clientEmail = String(proposal.client?.email || "").trim().toLowerCase();
  const clientCompany = String(proposal.client?.companyName || "").trim().toLowerCase();
  const matches = contacts.filter((contact) => {
    const contactEmail = String(contact.email || "").trim().toLowerCase();
    const contactCompany = String(contact.companyName || "").trim().toLowerCase();

    return (clientEmail && contactEmail === clientEmail) || (clientCompany && contactCompany === clientCompany);
  });

  return matches.length === 1 ? { ...proposal, contactId: matches[0].id } : proposal;
}

function forceApplySmartPasteCoverFields(proposal = {}, parsedProposal = {}, parsedValues = {}) {
  const nextProposal = cloneObject(proposal);
  const values = parsedValues || {};
  const parsedProject = parsedProposal.project || {};
  const parsedClient = parsedProposal.client || {};
  const projectName = firstSmartPasteText(values.projectName, parsedProject.name);
  const projectLocation = firstSmartPasteText(values.projectLocation, parsedProject.location, values.projectAddress);
  const projectAddress = firstSmartPasteText(values.projectAddress, parsedProject.address, projectLocation);
  const clientCompany = firstSmartPasteText(values.clientCompany, parsedClient.companyName);
  const contactName = firstSmartPasteText(values.contactName, parsedClient.contactName);
  const clientEmail = firstSmartPasteText(values.clientEmail, parsedClient.email);
  const clientPhone = firstSmartPasteText(values.clientPhone, parsedClient.phone);

  nextProposal.project = { ...(nextProposal.project || {}) };
  nextProposal.client = { ...(nextProposal.client || {}) };

  if (hasTextValue(projectName)) {
    nextProposal.project.name = projectName;
  }

  if (hasTextValue(projectLocation)) {
    nextProposal.project.location = projectLocation;
  }

  if (hasTextValue(projectAddress)) {
    nextProposal.project.address = projectAddress;
  }

  if (hasTextValue(clientCompany)) {
    nextProposal.client.companyName = clientCompany;
  }

  if (hasTextValue(contactName)) {
    nextProposal.client.contactName = contactName;
  }

  if (hasTextValue(clientEmail)) {
    nextProposal.client.email = clientEmail;
  }

  if (hasTextValue(clientPhone)) {
    nextProposal.client.phone = clientPhone;
  }

  return nextProposal;
}

function getSmartPasteActiveDraftFields(proposal = {}, values = {}) {
  const fields = [];

  if (proposal.proposalMode) {
    fields.push("Proposal Mode");
  }

  if (hasTextValue(values.projectName) && proposal.project?.name === values.projectName) {
    fields.push("Project Name");
  }

  if (
    (hasTextValue(values.projectLocation) && proposal.project?.location === values.projectLocation) ||
    (hasTextValue(values.projectAddress) && proposal.project?.address === values.projectAddress)
  ) {
    fields.push("Project Location");
  }

  if (hasTextValue(values.clientCompany) && proposal.client?.companyName === values.clientCompany) {
    fields.push("Prepared For");
  }

  if (hasTextValue(values.contactName) && proposal.client?.contactName === values.contactName) {
    fields.push("Attention / Contact");
  }

  if (hasTextValue(values.clientEmail) && proposal.client?.email === values.clientEmail) {
    fields.push("Email");
  }

  if (hasTextValue(values.clientPhone) && proposal.client?.phone === values.clientPhone) {
    fields.push("Phone");
  }

  return fields;
}

function summarizeSmartPasteDetectedPricing(proposal = {}) {
  const toPricingNumber = (value) => {
    const numberValue = Number.parseFloat(String(value ?? "").replace(/[$,%\s,]/g, ""));
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const totals = calculateProposalTotals(proposal);
  const lineItemTotal = (proposal.lineItems || []).reduce(
    (sum, item) => sum + toPricingNumber(item.quantity || 1) * toPricingNumber(item.unitPrice),
    0,
  );

  return {
    baseTotal: lineItemTotal,
    currentTotal: totals.total,
    totalIfAllAccepted: totals.totalIfAllAlternatesAccepted,
  };
}

function cleanProposalDraftAfterSmartPaste(proposal = {}) {
  const gcPacketTables = normalizeGcPacketTables(proposal.gcPacketTables);
  const editableProposal = createEditableProposal({
    ...proposal,
    scopeSections: cleanPrintableScopeSections(proposal.scopeSections),
    exclusions: cleanPrintableTextList(proposal.exclusions),
    assumptions: cleanPrintableTextList(proposal.assumptions),
    pricingSections: cleanPrintablePricingSections(proposal.pricingSections),
    projectPhotos: cleanProjectPhotosAfterSmartPaste(proposal.projectPhotos),
    planSheets: cleanPrintablePlanSheets(proposal.planSheets),
    proposalNotes: cleanPrintableTextBlock(proposal.proposalNotes),
    notes: cleanPrintableTextBlock(proposal.notes),
    takeoffQuantityBackup: cleanPrintableTextBlock(proposal.takeoffQuantityBackup),
    quantityBackup: cleanPrintableTextBlock(proposal.quantityBackup),
    gcPrime: {
      ...(proposal.gcPrime || {}),
      rfiClarificationNotes: cleanPrintableTextBlock(proposal.gcPrime?.rfiClarificationNotes || proposal.gcPrime?.rfiNotes),
      rfiNotes: cleanPrintableTextBlock(proposal.gcPrime?.rfiNotes),
      addendaAcknowledged: cleanPrintableTextBlock(proposal.gcPrime?.addendaAcknowledged),
      gcPrimeNotes: cleanPrintableTextBlock(proposal.gcPrime?.gcPrimeNotes),
      scopeControlSummary: {
        ...(proposal.gcPrime?.scopeControlSummary || {}),
        includedScope: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.includedScope),
        exclusions: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.exclusions),
        clarifications: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.clarifications),
        acceptedAlternates: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.acceptedAlternates),
        allowances: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.allowances),
        ownerGcByOthers: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.ownerGcByOthers),
        hiddenUnshownConditionsNote: cleanPrintableTextBlock(proposal.gcPrime?.scopeControlSummary?.hiddenUnshownConditionsNote),
      },
    },
    gcPacketTables: {
      ...gcPacketTables,
      pricingSummary: {
        ...gcPacketTables.pricingSummary,
        presentationNotes: cleanPrintableTextBlock(gcPacketTables.pricingSummary.presentationNotes),
        rows: cleanPrintablePricingSummaryRows(gcPacketTables.pricingSummary.rows),
      },
      scheduleOfValues: {
        ...gcPacketTables.scheduleOfValues,
        rows: cleanPrintableStructuredRows("scheduleOfValues", gcPacketTables.scheduleOfValues.rows),
      },
      takeoffQuantities: {
        ...gcPacketTables.takeoffQuantities,
        rows: cleanPrintableStructuredRows("takeoffQuantities", gcPacketTables.takeoffQuantities.rows),
      },
      shadeFootingEstimate: {
        ...gcPacketTables.shadeFootingEstimate,
        rows: cleanPrintableStructuredRows("shadeFootingEstimate", gcPacketTables.shadeFootingEstimate.rows),
      },
      proposalNotes: {
        ...gcPacketTables.proposalNotes,
        proposalBasis: cleanPrintableTextBlock(gcPacketTables.proposalNotes.proposalBasis),
        contractScopeControl: cleanPrintableTextBlock(gcPacketTables.proposalNotes.contractScopeControl),
        acceptanceSummary: cleanPrintableTextBlock(gcPacketTables.proposalNotes.acceptanceSummary),
        gcPrimeReviewer: cleanPrintableTextBlock(gcPacketTables.proposalNotes.gcPrimeReviewer),
      },
    },
  });

  return {
    ...editableProposal,
    scopeSections: cleanPrintableScopeSections(editableProposal.scopeSections),
    exclusions: cleanPrintableTextList(editableProposal.exclusions),
    assumptions: cleanPrintableTextList(editableProposal.assumptions),
    pricingSections: cleanPrintablePricingSections(editableProposal.pricingSections),
    projectPhotos: cleanProjectPhotosAfterSmartPaste(editableProposal.projectPhotos),
    planSheets: cleanPrintablePlanSheets(editableProposal.planSheets),
    gcPacketTables: {
      ...editableProposal.gcPacketTables,
      pricingSummary: {
        ...editableProposal.gcPacketTables.pricingSummary,
        rows: cleanPrintablePricingSummaryRows(editableProposal.gcPacketTables.pricingSummary.rows),
      },
      scheduleOfValues: {
        ...editableProposal.gcPacketTables.scheduleOfValues,
        rows: cleanPrintableStructuredRows("scheduleOfValues", editableProposal.gcPacketTables.scheduleOfValues.rows),
      },
      takeoffQuantities: {
        ...editableProposal.gcPacketTables.takeoffQuantities,
        rows: cleanPrintableStructuredRows("takeoffQuantities", editableProposal.gcPacketTables.takeoffQuantities.rows),
      },
      shadeFootingEstimate: {
        ...editableProposal.gcPacketTables.shadeFootingEstimate,
        rows: cleanPrintableStructuredRows("shadeFootingEstimate", editableProposal.gcPacketTables.shadeFootingEstimate.rows),
      },
    },
  };
}

function cleanProjectPhotosAfterSmartPaste(photos = []) {
  return (Array.isArray(photos) ? photos : []).filter((photo) => {
    const hasImage = getImageAssetSource(photo);
    const label = cleanPrintableTextBlock(photo?.label || photo?.caption);

    return Boolean(hasImage || label);
  });
}

function getNextProposalNumber(proposals, date = new Date()) {
  const year = date.getFullYear();
  const nextSequence =
    proposals.reduce((maxSequence, proposal) => {
      const match = String(proposal.proposalNumber || "").match(/^LYC-(\d{4})-(\d{4})$/);

      if (!match || Number(match[1]) !== year) {
        return maxSequence;
      }

      return Math.max(maxSequence, Number(match[2]));
    }, 0) + 1;

  return generateProposalNumber(nextSequence, date);
}

function createProposalId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRevisionLabel(revisionNumber = 0) {
  return `Rev ${normalizeRevisionNumber(revisionNumber)}`;
}

function formatProposalNumberWithRevision(proposal = {}) {
  const proposalNumber = proposal.proposalNumber || "";
  const revisionLabel = proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber);

  return proposalNumber ? `${proposalNumber} - ${revisionLabel}` : revisionLabel;
}

function normalizeRevisionNumber(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getRevisionHistory(proposal = {}, proposals = []) {
  if (!proposal?.proposalNumber) {
    return [proposal].filter((item) => item?.id);
  }

  const family = [...proposals, proposal]
    .filter((item) => item?.id && item.proposalNumber === proposal.proposalNumber)
    .reduce((items, item) => {
      if (!items.some((existing) => existing.id === item.id)) {
        items.push(createEditableProposal(item));
      }

      return items;
    }, []);

  return family.sort((a, b) => normalizeRevisionNumber(a.revisionNumber) - normalizeRevisionNumber(b.revisionNumber));
}

function isLatestRevision(proposal = {}, proposals = []) {
  if (!proposal.proposalNumber) {
    return true;
  }

  const latestRevisionNumber = proposals
    .filter((item) => item.proposalNumber === proposal.proposalNumber)
    .reduce((latest, item) => Math.max(latest, normalizeRevisionNumber(item.revisionNumber)), -1);

  return normalizeRevisionNumber(proposal.revisionNumber) >= latestRevisionNumber;
}

function applyStatusTracking(proposal = {}, status) {
  const today = formatInputDate(new Date());
  const nextProposal = {
    ...proposal,
    status,
  };

  if (status === "sent") {
    if (!hasTextValue(nextProposal.sentDate)) {
      nextProposal.sentDate = today;
    }

    nextProposal.sentToName = nextProposal.sentToName || nextProposal.client?.contactName || nextProposal.client?.companyName || "";
    nextProposal.sentToEmail = nextProposal.sentToEmail || nextProposal.client?.email || "";
    nextProposal.sentToPhone = nextProposal.sentToPhone || nextProposal.client?.phone || "";
    nextProposal.sentMethod = nextProposal.sentMethod || "Email";
  }

  if (status === "approved" && !hasTextValue(nextProposal.approvedDate)) {
    nextProposal.approvedDate = today;
  }

  if (status === "rejected" && !hasTextValue(nextProposal.rejectedDate)) {
    nextProposal.rejectedDate = today;
  }

  return createEditableProposal(nextProposal);
}

function getDefaultTrackingFields() {
  return {
    sentDate: "",
    sentToName: "",
    sentToEmail: "",
    sentToPhone: "",
    sentMethod: "",
    followUpDate: "",
    followUpNotes: "",
    lastFollowUpDate: "",
    nextAction: "",
    outcomeReason: "",
    approvedDate: "",
    rejectedDate: "",
    viewedDate: "",
    decisionDueDate: "",
    internalTrackingNotes: "",
  };
}

function resetTrackingFields(proposal = {}) {
  return {
    ...proposal,
    ...getDefaultTrackingFields(),
  };
}

function getFollowUpDueProposals(proposals = []) {
  return proposals
    .filter((proposal) => isFollowUpDue(proposal))
    .sort((a, b) => getDateOnlyTimestamp(a.followUpDate) - getDateOnlyTimestamp(b.followUpDate));
}

function getOverdueFollowUpProposals(proposals = []) {
  return proposals.filter((proposal) => isFollowUpOverdue(proposal));
}

function isFollowUpDue(proposal = {}) {
  return proposal.status === "sent" && hasTextValue(proposal.followUpDate) && getDateOnlyTimestamp(proposal.followUpDate) <= getTodayTimestamp();
}

function isFollowUpOverdue(proposal = {}) {
  return proposal.status === "sent" && hasTextValue(proposal.followUpDate) && getDateOnlyTimestamp(proposal.followUpDate) < getTodayTimestamp();
}

function getTodayTimestamp() {
  return getDateOnlyTimestamp(formatInputDate(new Date()));
}

function getDateOnlyTimestamp(value) {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.valueOf()) ? Number.POSITIVE_INFINITY : date.valueOf();
}

function buildDashboardStats(proposals = [], contacts = [], bids = []) {
  const statusCounts = PROPOSAL_STATUSES.reduce(
    (counts, status) => ({
      ...counts,
      [status]: proposals.filter((proposal) => proposal.status === status).length,
    }),
    {},
  );
  const totalValue = proposals.reduce((sum, proposal) => sum + calculateProposalTotals(proposal).total, 0);
  const lastUpdated = getRecentProposals(proposals, 1)[0] || null;
  const followUpDueCount = getFollowUpDueProposals(proposals).length;
  const overdueFollowUpCount = getOverdueFollowUpProposals(proposals).length;
  const decidedCount = (statusCounts.approved || 0) + (statusCounts.rejected || 0);
  const winRate = decidedCount > 0 ? Math.round(((statusCounts.approved || 0) / decidedCount) * 100) : 0;
  const submittedPackets = getSubmittedPacketRecordsForDashboard(proposals);
  const packetsGeneratedThisMonth = submittedPackets.filter((record) => isCurrentMonthDate(record.createdAt)).length;
  const lastSubmittedPacket = submittedPackets[0] || null;
  const openBids = bids.filter((bid) => !["Awarded", "Lost", "No-Bid"].includes(bid.bidStatus));
  const bidsDueThisWeek = bids.filter(isBidDueThisWeek);
  const bidsOverdue = bids.filter(isBidOverdue);
  const estimatingBids = bids.filter((bid) => bid.bidStatus === "Estimating");
  const submittedBidsAwaitingFollowUp = bids.filter(
    (bid) =>
      (bid.bidStatus === "Submitted" || bid.bidStatus === "Follow-Up") &&
      (!hasTextValue(bid.followUpDate) || getDateOnlyTimestamp(bid.followUpDate) <= getTodayTimestamp()),
  );

  return {
    cards: [
      { label: "Total Proposals", value: proposals.length },
      { label: "Draft", value: statusCounts.draft || 0 },
      { label: "Sent", value: statusCounts.sent || 0 },
      { label: "Approved", value: statusCounts.approved || 0 },
      { label: "Rejected", value: statusCounts.rejected || 0 },
      { label: "Expired", value: statusCounts.expired || 0 },
      { label: "Proposals Sent", value: statusCounts.sent || 0 },
      { label: "Proposals Approved", value: statusCounts.approved || 0 },
      { label: "Needs Follow-Up", value: followUpDueCount },
      { label: "Overdue Follow-Up", value: overdueFollowUpCount },
      { label: "Contacts", value: contacts.length },
      { label: "Packets This Month", value: packetsGeneratedThisMonth },
      { label: "Win Rate", value: decidedCount > 0 ? `${winRate}%` : "-" },
      { label: "Open Bids", value: openBids.length },
      { label: "Bids Due This Week", value: bidsDueThisWeek.length },
      { label: "Bids Overdue", value: bidsOverdue.length },
      { label: "Bids Estimating", value: estimatingBids.length },
      { label: "Submitted Bid Follow-Up", value: submittedBidsAwaitingFollowUp.length },
    ],
    fullPacketCount: proposals.filter((proposal) => getPacketModeLabel(proposal) === "Full GC Packet").length,
    lastSubmittedPacket,
    lastUpdated,
    totalValue,
  };
}

function getDemoStatus(proposals = [], contacts = []) {
  const proposalCount = proposals.filter(isDemoRecord).length;
  const contactCount = contacts.filter(isDemoRecord).length;

  return {
    contactCount,
    isLoaded: proposalCount > 0 || contactCount > 0,
    proposalCount,
  };
}

function getRecentProposals(proposals = [], limit = 5) {
  return [...proposals]
    .sort((a, b) => getProposalTimestamp(b) - getProposalTimestamp(a))
    .slice(0, limit);
}

function getProposalTimestamp(proposal = {}) {
  const value = proposal.updatedAt || proposal.createdAt || proposal.proposalDate || "";
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf();
}

function getPacketModeLabel(proposal = {}) {
  if (isGcPrimePacketMode(inferProposalModeFromProposal(proposal)) || proposal.packetMode === "full_gc_packet") {
    return "Full GC Packet";
  }

  return hasFullPacketContent(proposal) ? "Full GC Packet" : "Summary";
}

function hasFullPacketContent(proposal = {}) {
  if (isResidentialProposalMode(inferProposalModeFromProposal(proposal))) {
    return false;
  }

  const gcPacketTables = normalizeGcPacketTables(proposal.gcPacketTables);
  const hasStructuredTables = Object.values(gcPacketTables).some((table) => table.enabled);
  const hasPlanSheets = getEnabledPlanSheets(proposal.planSheets).length > 0;
  const hasAppendix = buildAppendixPlan(createEditableProposal(proposal)).pages.length > 0;

  return proposal.proposalType === "gc_prime" || proposal.type === "gc_prime" || hasStructuredTables || hasPlanSheets || hasAppendix;
}

function getDefaultCompanySettings() {
  const company = SEED_PROPOSAL.company;
  const terms = SEED_PROPOSAL.terms || {};

  return {
    companyName: company.name,
    phone: company.phone,
    email: company.email,
    logoPath: logoSrc,
    license: company.license,
    credentialsText: company.credentials.join(" | "),
    serviceArea: company.serviceArea,
    defaultProposalExpirationDays: 30,
    defaultPaymentTerms: terms.payment,
    defaultProposalExpirationClause:
      "Price is valid for {days} days from proposal date unless otherwise stated. Material or labor price changes after expiration require revised pricing.",
    defaultDepositTerms: terms.depositText,
    defaultProgressBillingTerms: terms.progressBilling,
    defaultFinalPaymentTerms: terms.finalPayment,
    defaultLatePaymentTerms: terms.latePayment,
    defaultChangeOrderLanguage: terms.changeOrderLanguage,
    defaultSiteReadinessLanguage: terms.siteReadiness,
    defaultWeatherDelayLanguage: terms.weatherDelay,
    defaultUtilityResponsibility: terms.utilityResponsibility,
    defaultHiddenConditions: terms.hiddenConditions,
    defaultConcreteCrackingDisclaimer: terms.concreteCrackingDisclaimer,
    defaultColorFinishVariationDisclaimer: terms.colorFinishVariationDisclaimer,
    defaultWarrantyLimitation: terms.warrantyLimitation,
    defaultGcScopeControlNote:
      "Proposal includes only the concrete scope specifically listed. Work shown elsewhere in the documents is excluded unless expressly included in this proposal, SOV, or written accepted scope sheet.",
    defaultExclusions: SEED_PROPOSAL.exclusions.join("\n"),
    defaultWarrantyNote: "",
    defaultSignatureBlock: terms.acceptance,
    proposalPdfStyle: getDefaultProposalPdfStyleSettings(),
  };
}

function normalizeCompanySettings(settings = {}) {
  const defaults = getDefaultCompanySettings();

  return {
    ...defaults,
    ...settings,
    companyName: hasTextValue(settings.companyName) ? settings.companyName : defaults.companyName,
    phone: hasTextValue(settings.phone) ? settings.phone : defaults.phone,
    email: hasTextValue(settings.email) ? settings.email : defaults.email,
    logoPath: hasTextValue(settings.logoPath) ? settings.logoPath : defaults.logoPath,
    license: hasTextValue(settings.license) ? settings.license : defaults.license,
    credentialsText: hasTextValue(settings.credentialsText) ? settings.credentialsText : defaults.credentialsText,
    serviceArea: hasTextValue(settings.serviceArea) ? settings.serviceArea : defaults.serviceArea,
    defaultProposalExpirationDays: getExpirationDays(settings),
    defaultPaymentTerms: hasTextValue(settings.defaultPaymentTerms)
      ? settings.defaultPaymentTerms
      : defaults.defaultPaymentTerms,
    defaultProposalExpirationClause: hasTextValue(settings.defaultProposalExpirationClause)
      ? settings.defaultProposalExpirationClause
      : defaults.defaultProposalExpirationClause,
    defaultDepositTerms: hasTextValue(settings.defaultDepositTerms) ? settings.defaultDepositTerms : defaults.defaultDepositTerms,
    defaultProgressBillingTerms: hasTextValue(settings.defaultProgressBillingTerms)
      ? settings.defaultProgressBillingTerms
      : defaults.defaultProgressBillingTerms,
    defaultFinalPaymentTerms: hasTextValue(settings.defaultFinalPaymentTerms)
      ? settings.defaultFinalPaymentTerms
      : defaults.defaultFinalPaymentTerms,
    defaultLatePaymentTerms: hasTextValue(settings.defaultLatePaymentTerms)
      ? settings.defaultLatePaymentTerms
      : defaults.defaultLatePaymentTerms,
    defaultChangeOrderLanguage: hasTextValue(settings.defaultChangeOrderLanguage)
      ? settings.defaultChangeOrderLanguage
      : defaults.defaultChangeOrderLanguage,
    defaultSiteReadinessLanguage: hasTextValue(settings.defaultSiteReadinessLanguage)
      ? settings.defaultSiteReadinessLanguage
      : defaults.defaultSiteReadinessLanguage,
    defaultWeatherDelayLanguage: hasTextValue(settings.defaultWeatherDelayLanguage)
      ? settings.defaultWeatherDelayLanguage
      : defaults.defaultWeatherDelayLanguage,
    defaultUtilityResponsibility: hasTextValue(settings.defaultUtilityResponsibility)
      ? settings.defaultUtilityResponsibility
      : defaults.defaultUtilityResponsibility,
    defaultHiddenConditions: hasTextValue(settings.defaultHiddenConditions)
      ? settings.defaultHiddenConditions
      : defaults.defaultHiddenConditions,
    defaultConcreteCrackingDisclaimer: hasTextValue(settings.defaultConcreteCrackingDisclaimer)
      ? settings.defaultConcreteCrackingDisclaimer
      : defaults.defaultConcreteCrackingDisclaimer,
    defaultColorFinishVariationDisclaimer: hasTextValue(settings.defaultColorFinishVariationDisclaimer)
      ? settings.defaultColorFinishVariationDisclaimer
      : defaults.defaultColorFinishVariationDisclaimer,
    defaultWarrantyLimitation: hasTextValue(settings.defaultWarrantyLimitation)
      ? settings.defaultWarrantyLimitation
      : defaults.defaultWarrantyLimitation,
    defaultGcScopeControlNote: hasTextValue(settings.defaultGcScopeControlNote)
      ? settings.defaultGcScopeControlNote
      : defaults.defaultGcScopeControlNote,
    defaultExclusions: hasTextValue(settings.defaultExclusions) ? settings.defaultExclusions : defaults.defaultExclusions,
    defaultWarrantyNote: settings.defaultWarrantyNote ?? defaults.defaultWarrantyNote,
    defaultSignatureBlock: hasTextValue(settings.defaultSignatureBlock)
      ? settings.defaultSignatureBlock
      : defaults.defaultSignatureBlock,
    proposalPdfStyle: normalizeProposalPdfStyleSettings(settings.proposalPdfStyle || defaults.proposalPdfStyle),
  };
}

function buildDefaultTermsFromCompanySettings(settings = {}, proposal = {}) {
  const normalizedSettings = normalizeCompanySettings(settings);
  const isGcPrime = isGcPrimePacketMode(inferProposalModeFromProposal(proposal)) || proposal.packetMode === "full_gc_packet";
  const siteReadiness = normalizedSettings.defaultSiteReadinessLanguage;
  const weatherDelay = normalizedSettings.defaultWeatherDelayLanguage;
  const terms = {
    payment: normalizedSettings.defaultPaymentTerms,
    proposalExpiration: formatLegalClause(normalizedSettings.defaultProposalExpirationClause, normalizedSettings),
    depositText: normalizedSettings.defaultDepositTerms,
    progressBilling: normalizedSettings.defaultProgressBillingTerms,
    finalPayment: normalizedSettings.defaultFinalPaymentTerms,
    latePayment: normalizedSettings.defaultLatePaymentTerms,
    changeOrderLanguage: normalizedSettings.defaultChangeOrderLanguage,
    siteReadiness,
    weatherDelay,
    weatherSiteReadiness: [siteReadiness, weatherDelay].filter(hasTextValue).join(" "),
    utilityResponsibility: normalizedSettings.defaultUtilityResponsibility,
    hiddenConditions: normalizedSettings.defaultHiddenConditions,
    concreteCrackingDisclaimer: normalizedSettings.defaultConcreteCrackingDisclaimer,
    colorFinishVariationDisclaimer: normalizedSettings.defaultColorFinishVariationDisclaimer,
    warrantyLimitation: normalizedSettings.defaultWarrantyLimitation,
    warrantyNote: normalizedSettings.defaultWarrantyNote,
    acceptance: normalizedSettings.defaultSignatureBlock,
    signatureBlock: normalizedSettings.defaultSignatureBlock,
  };

  if (isGcPrime) {
    terms.gcScopeControl = normalizedSettings.defaultGcScopeControlNote;
  }

  return terms;
}

function formatLegalClause(value, settings = {}) {
  return String(value || "").replace(/\{days\}/g, String(getExpirationDays(settings)));
}

function applyCompanyLegalDefaultsToProposal(sourceProposal, settings = getDefaultCompanySettings()) {
  const normalizedSettings = normalizeCompanySettings(settings);
  const nextProposal = cloneObject(sourceProposal);
  const defaultTerms = buildDefaultTermsFromCompanySettings(normalizedSettings, nextProposal);
  const isGcPrime = isGcPrimePacketMode(inferProposalModeFromProposal(nextProposal)) || nextProposal.packetMode === "full_gc_packet";
  const updatedProposal = {
    ...nextProposal,
    exclusions: parseMultilineList(normalizedSettings.defaultExclusions),
    terms: {
      ...(nextProposal.terms || {}),
      ...defaultTerms,
    },
  };

  if (!isGcPrime) {
    return updatedProposal;
  }

  const gcPacketTables = normalizeGcPacketTables(updatedProposal.gcPacketTables);
  const scopeControlSummary = normalizeScopeControlSummary(updatedProposal.gcPrime?.scopeControlSummary);

  return {
    ...updatedProposal,
    gcPrime: {
      ...(updatedProposal.gcPrime || {}),
      scopeControlSummary: {
        ...scopeControlSummary,
        ownerGcByOthers: scopeControlSummary.ownerGcByOthers || "Owner / GC / others are responsible for work not expressly included in this proposal.",
        hiddenUnshownConditionsNote: defaultTerms.hiddenConditions || scopeControlSummary.hiddenUnshownConditionsNote,
      },
    },
    gcPacketTables: {
      ...gcPacketTables,
      proposalNotes: {
        ...gcPacketTables.proposalNotes,
        enabled: true,
        contractScopeControl: defaultTerms.gcScopeControl || gcPacketTables.proposalNotes.contractScopeControl,
      },
    },
  };
}

function applyCompanySettingsToProposal(sourceProposal, settings, proposalDate = new Date()) {
  const normalizedSettings = normalizeCompanySettings(settings);
  const nextProposal = cloneObject(sourceProposal);
  const proposalMode = inferProposalModeFromProposal(nextProposal);
  const validUntil = new Date(proposalDate);
  validUntil.setDate(validUntil.getDate() + getExpirationDays(normalizedSettings));

  return applyCompanyLegalDefaultsToProposal({
    ...nextProposal,
    pdfStyle: getProposalPdfStyleForMode(normalizedSettings.proposalPdfStyle, proposalMode),
    company: {
      ...nextProposal.company,
      name: normalizedSettings.companyName,
      phone: normalizedSettings.phone,
      email: normalizedSettings.email,
      logoPath: normalizedSettings.logoPath || logoSrc,
      license: normalizedSettings.license,
      credentials: parseCredentials(normalizedSettings.credentialsText),
      serviceArea: normalizedSettings.serviceArea,
    },
    validUntil: formatInputDate(validUntil),
  }, normalizedSettings);
}

function getExpirationDays(settings = {}) {
  const fallbackDays = getDefaultCompanySettings().defaultProposalExpirationDays;
  const numericValue = Number.parseInt(settings.defaultProposalExpirationDays, 10);

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallbackDays;
}

function parseCredentials(value) {
  const credentials = String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return credentials.length > 0 ? credentials : getDefaultCompanySettings().credentialsText.split(" | ");
}

function parseMultilineList(value) {
  const items = String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [...SEED_PROPOSAL.exclusions];
}

function normalizeProjectPhotos(photos = []) {
  const sourcePhotos = Array.isArray(photos) ? photos : [];
  const photoCount = Math.max(defaultProjectPhotos.length, sourcePhotos.length);

  return Array.from({ length: photoCount }, (_, index) => {
    const defaultPhoto = defaultProjectPhotos[index] || { label: `Project Photo ${index + 1}`, src: "" };
    const photo = sourcePhotos[index] || {};
    return normalizeProjectPhoto(photo, index, defaultPhoto);
  });
}

function normalizeProjectPhoto(photo = {}, index = 0, defaultPhoto = defaultProjectPhotos[index] || { label: `Project Photo ${index + 1}`, src: "" }) {
  const rawSource = photo.src || photo.dataUrl || photo.publicUrl || photo.signedUrl || "";
  const dataUrl = hasTextValue(photo.dataUrl) ? photo.dataUrl : isDataUrl(rawSource) ? rawSource : "";
  const publicUrl = hasTextValue(photo.publicUrl) ? photo.publicUrl : !isDataUrl(rawSource) && hasTextValue(rawSource) ? rawSource : "";
  const label = hasTextValue(photo.label) ? photo.label : hasTextValue(photo.caption) ? photo.caption : defaultPhoto.label;
  const normalizedPhoto = {
    caption: label,
    compressed: Boolean(photo.compressed),
    compressionMessage: photo.compressionMessage || "",
    dataUrl,
    fileName: photo.fileName || "",
    fileSize: Number.parseInt(photo.fileSize, 10) || 0,
    fileType: photo.fileType || "",
    label,
    originalFileName: photo.originalFileName || "",
    originalFileSize: Number.parseInt(photo.originalFileSize, 10) || 0,
    publicUrl,
    signedUrl: photo.signedUrl || "",
    storagePath: photo.storagePath || "",
    uploadedAt: photo.uploadedAt || "",
  };

  return {
    ...normalizedPhoto,
    src: getImageAssetSource(normalizedPhoto),
  };
}

function normalizePlanSheets(planSheets = []) {
  const sourceSheets = Array.isArray(planSheets) ? planSheets : [];
  const normalizedExisting = sourceSheets.map((sheet, index) => normalizePlanSheet(sheet, index));
  const defaultSheets = defaultPlanSheets.map((sheet, index) => normalizePlanSheet(sheet, index));
  const mergedSheets = [...normalizedExisting];

  defaultSheets.forEach((defaultSheet) => {
    const hasSheet = mergedSheets.some((sheet) => getPlanSheetMatchKey(sheet) === getPlanSheetMatchKey(defaultSheet));

    if (!hasSheet) {
      mergedSheets.push(defaultSheet);
    }
  });

  return mergedSheets;
}

function normalizePlanSheet(sheet = {}, index = 0) {
  const fallback = defaultPlanSheets[index] || {};
  const pageType = PLAN_SHEET_PAGE_TYPES.includes(sheet.pageType) ? sheet.pageType : fallback.pageType || "general_backup";

  return {
    id: sheet.id || fallback.id || createProposalId(),
    matchKey: sheet.matchKey || fallback.matchKey || createPlanSheetMatchKey(sheet.title || fallback.title || `plan-sheet-${index + 1}`),
    enabled: Boolean(sheet.enabled),
    pageType,
    title: sheet.title ?? fallback.title ?? `Plan Sheet ${index + 1}`,
    subtitle: sheet.subtitle ?? fallback.subtitle ?? "",
    dataUrl: getPlanSheetDataUrl(sheet),
    fileName: sheet.fileName || "",
    fileSize: Number.parseInt(sheet.fileSize, 10) || 0,
    fileType: sheet.fileType || "",
    imageSrc: getPlanSheetImageSource(sheet),
    compressed: Boolean(sheet.compressed),
    compressionMessage: sheet.compressionMessage || "",
    originalFileName: sheet.originalFileName || "",
    originalFileSize: Number.parseInt(sheet.originalFileSize, 10) || 0,
    publicUrl: getPlanSheetPublicUrl(sheet),
    signedUrl: sheet.signedUrl || "",
    storagePath: sheet.storagePath || "",
    uploadedAt: sheet.uploadedAt || "",
    calculationTitle: sheet.calculationTitle ?? fallback.calculationTitle ?? "Calculation Notes",
    calculationNotes: normalizePlanSheetNotes(sheet.calculationNotes ?? sheet.notes ?? fallback.calculationNotes),
    clarificationNotes: normalizePlanSheetNotes(sheet.clarificationNotes ?? fallback.clarificationNotes),
  };
}

function getPlanSheetDataUrl(sheet = {}) {
  const rawSource = sheet.imageSrc ?? sheet.image ?? sheet.dataUrl ?? "";
  return hasTextValue(sheet.dataUrl) ? sheet.dataUrl : isDataUrl(rawSource) ? rawSource : "";
}

function getPlanSheetPublicUrl(sheet = {}) {
  const rawSource = sheet.imageSrc ?? sheet.image ?? "";
  return hasTextValue(sheet.publicUrl) ? sheet.publicUrl : !isDataUrl(rawSource) && hasTextValue(rawSource) ? rawSource : "";
}

function getPlanSheetImageSource(sheet = {}) {
  return getImageAssetSource({
    dataUrl: getPlanSheetDataUrl(sheet),
    imageSrc: sheet.imageSrc ?? sheet.image ?? "",
    publicUrl: getPlanSheetPublicUrl(sheet),
    signedUrl: sheet.signedUrl || "",
    storagePath: sheet.storagePath || "",
  });
}

function preserveExistingImageAsset(existingAsset = {}, incomingAsset = {}) {
  if (getImageAssetSource(incomingAsset)) {
    return incomingAsset;
  }

  return {
    dataUrl: existingAsset.dataUrl || "",
    compressed: Boolean(existingAsset.compressed),
    compressionMessage: existingAsset.compressionMessage || "",
    fileName: existingAsset.fileName || "",
    fileSize: Number.parseInt(existingAsset.fileSize, 10) || 0,
    fileType: existingAsset.fileType || "",
    imageSrc: existingAsset.imageSrc || existingAsset.src || "",
    originalFileName: existingAsset.originalFileName || "",
    originalFileSize: Number.parseInt(existingAsset.originalFileSize, 10) || 0,
    publicUrl: existingAsset.publicUrl || "",
    signedUrl: existingAsset.signedUrl || "",
    src: existingAsset.src || existingAsset.imageSrc || "",
    storagePath: existingAsset.storagePath || "",
    uploadedAt: existingAsset.uploadedAt || "",
  };
}

function normalizePlanSheetNotes(notes = []) {
  if (Array.isArray(notes)) {
    return cleanPrintableTextList(notes);
  }

  return cleanPrintableTextList(parseEditorList(notes));
}

function getEnabledPlanSheets(planSheets = []) {
  return cleanPrintablePlanSheets(normalizePlanSheets(planSheets));
}

function formatEditorList(items = []) {
  return normalizePlanSheetNotes(items).join("\n");
}

function parseEditorList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function createPlanSheetMatchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPlanSheetMatchKey(sheet = {}) {
  return sheet.matchKey || createPlanSheetMatchKey(sheet.title || sheet.subtitle);
}

function isDefaultPlanSheet(sheet = {}) {
  const matchKey = getPlanSheetMatchKey(sheet);
  return defaultPlanSheets.some((defaultSheet) => getPlanSheetMatchKey(defaultSheet) === matchKey);
}

function normalizeGcPacketTables(gcPacketTables = {}) {
  return {
    pricingSummary: {
      ...defaultGcPacketTables.pricingSummary,
      ...(gcPacketTables.pricingSummary || {}),
      rows: normalizeGcPacketRows("pricingSummary", gcPacketTables.pricingSummary?.rows),
    },
    scheduleOfValues: {
      ...defaultGcPacketTables.scheduleOfValues,
      ...(gcPacketTables.scheduleOfValues || {}),
      rows: normalizeGcPacketRows("scheduleOfValues", gcPacketTables.scheduleOfValues?.rows),
    },
    takeoffQuantities: {
      ...defaultGcPacketTables.takeoffQuantities,
      ...(gcPacketTables.takeoffQuantities || {}),
      rows: normalizeGcPacketRows("takeoffQuantities", gcPacketTables.takeoffQuantities?.rows),
    },
    shadeFootingEstimate: {
      ...defaultGcPacketTables.shadeFootingEstimate,
      ...(gcPacketTables.shadeFootingEstimate || {}),
      rows: normalizeGcPacketRows("shadeFootingEstimate", gcPacketTables.shadeFootingEstimate?.rows),
    },
    proposalNotes: {
      ...defaultGcPacketTables.proposalNotes,
      ...(gcPacketTables.proposalNotes || {}),
    },
  };
}

function normalizeGcPacketRows(sectionKey, rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => ({
    ...createEmptyGcPacketRow(sectionKey),
    ...row,
    id: row.id || createProposalId(),
  }));
}

function createEmptyGcPacketRow(sectionKey) {
  const baseRow = { id: createProposalId() };

  if (sectionKey === "scheduleOfValues") {
    return {
      ...baseRow,
      item: "",
      description: "",
      pricingBasis: "",
      amount: "",
    };
  }

  if (sectionKey === "takeoffQuantities") {
    return {
      ...baseRow,
      item: "",
      quantity: "",
      detailSize: "",
      netCy: "",
      cyWithTenPercent: "",
      priceStatus: "",
    };
  }

  if (sectionKey === "shadeFootingEstimate") {
    return {
      ...baseRow,
      column: "",
      columnSize: "",
      estimatedSpreadFooting: "",
      netCy: "",
      estimatedSubtotal: "",
      estimatedCyWithTenPercent: "",
      allowanceAmount: "",
      allowanceNote: "",
    };
  }

  return {
    ...baseRow,
    label: "",
    amount: "",
    note: "",
  };
}

function normalizeScopeSections(scopeSections = []) {
  if (!Array.isArray(scopeSections)) {
    return [];
  }

  return scopeSections.map((section) => ({
    title: section?.title ?? "",
    items: Array.isArray(section?.items) ? section.items : [],
  }));
}

function normalizeTextList(items = []) {
  return Array.isArray(items) ? items : [];
}

function normalizePricingSections(pricingSections = []) {
  if (!Array.isArray(pricingSections)) {
    return [];
  }

  return pricingSections.map((section) => ({
    id: section?.id || createProposalId(),
    type: PRICING_SECTION_TYPES.includes(section?.type) ? section.type : "add_alternate",
    label: section?.label ?? section?.name ?? "",
    description: section?.description ?? "",
    amount: section?.amount ?? "",
    included: Boolean(section?.included),
    optionalAddOn: Boolean(section?.optionalAddOn),
  }));
}

function ResidentialPricingOptionsEditorSummary({
  addOnImageChange,
  addOnImageRemove,
  addOnImageUpload,
  message = "",
  optionImageChange,
  optionImageRemove,
  optionImageUpload,
  proposal,
}) {
  if (!hasResidentialChooseOnePricing(proposal)) {
    return null;
  }

  const options = proposal.pricingOptions || [];
  const addOns = proposal.optionalAddOns || [];

  return (
    <div className="editor-totals residential-options-editor-summary" id="pricing-options-summary">
      <div className="editor-totals-heading">
        <span>Customer to Select One Pricing Option</span>
        <strong>{formatResidentialCurrency(options.find((option) => option.selected || option.included)?.price || options[0]?.price || 0)}</strong>
      </div>
      {message ? <p className="asset-upload-message">{message}</p> : null}
      {options.map((option, optionIndex) => (
        <div className="residential-option-editor-card" key={option.id || option.name}>
          <div className="residential-option-editor-row">
            <span>{option.name}</span>
            <strong>{formatResidentialCurrency(option.price)}</strong>
          </div>
          <ResidentialOptionPhotosEditor
            images={option.images}
            itemLabel={option.name}
            onCaptionChange={(imageIndex, value) => optionImageChange?.(optionIndex, imageIndex, { caption: value })}
            onRemove={(imageIndex) => optionImageRemove?.(optionIndex, imageIndex)}
            onUpload={(file) => optionImageUpload?.(optionIndex, file)}
          />
        </div>
      ))}
      {addOns.length > 0 ? (
        <div className="residential-add-on-editor-group">
          <span>Optional Add-On</span>
          {addOns.map((addOn, addOnIndex) => (
            <div className="residential-option-editor-card" key={addOn.id || addOn.name}>
              <div className="residential-option-editor-row">
                <span>{addOn.name}</span>
                <strong>{formatResidentialCurrency(addOn.amount, { plus: true })}</strong>
              </div>
              <ResidentialOptionPhotosEditor
                images={addOn.images}
                itemLabel={addOn.name}
                onCaptionChange={(imageIndex, value) => addOnImageChange?.(addOnIndex, imageIndex, { caption: value })}
                onRemove={(imageIndex) => addOnImageRemove?.(addOnIndex, imageIndex)}
                onUpload={(file) => addOnImageUpload?.(addOnIndex, file)}
              />
            </div>
          ))}
        </div>
      ) : null}
      <p className="pricing-helper-text">Main options are mutually exclusive. Optional add-ons are separate from the selected option.</p>
    </div>
  );
}

function ResidentialOptionPhotosEditor({ images = [], itemLabel = "Pricing option", onCaptionChange, onRemove, onUpload }) {
  const normalizedImages = normalizeResidentialOptionImages(images);

  function handleUpload(files) {
    if (!files || files.length === 0) {
      return;
    }

    onUpload?.(files);
  }

  return (
    <div className="residential-option-photos-editor">
      <div className="residential-option-photos-heading">
        <span>Option Photos</span>
        <label className="editor-secondary-file-button">
          Upload images
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              handleUpload(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {normalizedImages.length > 0 ? (
        <div className="residential-option-photo-list">
          {normalizedImages.map((image, imageIndex) => {
            const source = getImageAssetSource(image);

            return (
              <div className="residential-option-photo-editor-card" key={image.id || `${itemLabel}-${imageIndex}`}>
                <div className="residential-option-photo-preview">
                  {source ? <img src={source} alt={image.caption || image.label || itemLabel} /> : <span>{image.label || "Photo reminder"}</span>}
                </div>
                <div className="residential-option-photo-fields">
                  <span className="asset-source-badge">{source ? getImageAssetLabel(image) : "Upload reminder"}</span>
                  {image.fileName ? (
                    <span className="asset-upload-detail">
                      {image.fileName} {image.fileSize ? `| ${formatAssetFileSize(image.fileSize)}` : ""}
                    </span>
                  ) : null}
                  <PhotoCaptionField
                    label="Caption"
                    value={image.caption}
                    placeholder={image.label || "Finish photo caption"}
                    onCommit={(value) => onCaptionChange?.(imageIndex, value)}
                  />
                  <button className="editor-secondary-button" type="button" onClick={() => onRemove?.(imageIndex)}>
                    Remove photo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="pricing-helper-text">No option photos yet. Upload finish or add-on examples for the customer packet.</p>
      )}
    </div>
  );
}

function normalizePricingOptions(pricingOptions = []) {
  if (!Array.isArray(pricingOptions)) {
    return [];
  }

  const hasExplicitSelection = pricingOptions.some((option) => option?.included === true || option?.selected === true);

  return pricingOptions
    .map((option, index) => {
      const price = toEditableNumber(option?.price ?? option?.amount ?? option?.total);

      return {
        id: option?.id || createProposalId(),
        name: option?.name ?? option?.label ?? `Option ${index + 1}`,
        description: option?.description ?? "",
        price,
        downPayment: toEditableNumber(option?.downPayment) || price / 2,
        finalPayment: toEditableNumber(option?.finalPayment) || price / 2,
        included: Boolean(option?.included === true || option?.selected === true || (!hasExplicitSelection && index === 0)),
        selected: Boolean(option?.selected === true || option?.included === true || (!hasExplicitSelection && index === 0)),
        images: normalizeResidentialOptionImages(option?.images || option?.optionPhotos || option?.photos),
        scheduleOfValues: normalizeResidentialScheduleOfValues(
          option?.scheduleOfValues ?? option?.sov ?? option?.breakdown ?? option?.optionBreakdown,
        ),
      };
    })
    .filter((option) => option.name && option.price > 0);
}

function normalizeOptionalAddOns(optionalAddOns = []) {
  if (!Array.isArray(optionalAddOns)) {
    return [];
  }

  return optionalAddOns
    .map((addOn) => ({
      id: addOn?.id || createProposalId(),
      name: addOn?.name ?? addOn?.label ?? "Optional Add-On",
      description: addOn?.description ?? "",
      amount: toEditableNumber(addOn?.amount ?? addOn?.price ?? addOn?.total),
      appliesTo: Array.isArray(addOn?.appliesTo) ? addOn.appliesTo : [],
      included: Boolean(addOn?.included ?? addOn?.selected),
      selected: Boolean(addOn?.selected ?? addOn?.included),
      images: normalizeResidentialOptionImages(addOn?.images || addOn?.optionPhotos || addOn?.photos),
    }))
    .filter((addOn) => addOn.name && addOn.amount > 0);
}

function createEmptyAddendumRecord() {
  return {
    id: createProposalId(),
    addendumNumber: "",
    addendumDate: "",
    titleDescription: "",
    acknowledged: true,
    notes: "",
    includedInPacket: true,
  };
}

function normalizeAddendaRegister(addenda = []) {
  if (!Array.isArray(addenda)) {
    return [];
  }

  return addenda.map((addendum) => ({
    ...createEmptyAddendumRecord(),
    ...addendum,
    id: addendum?.id || createProposalId(),
    acknowledged: addendum?.acknowledged !== false,
    includedInPacket: addendum?.includedInPacket !== false,
  }));
}

function createEmptyRfiRecord() {
  return {
    id: createProposalId(),
    rfiNumber: "",
    dateAsked: "",
    dateAnswered: "",
    source: "",
    question: "",
    answerTreatment: "",
    priceImpact: "",
    scopeImpact: "",
    includedInPacket: true,
  };
}

function normalizeRfiRegister(rfis = []) {
  if (!Array.isArray(rfis)) {
    return [];
  }

  return rfis.map((rfi) => ({
    ...createEmptyRfiRecord(),
    ...rfi,
    id: rfi?.id || createProposalId(),
    includedInPacket: rfi?.includedInPacket !== false,
  }));
}

function getDefaultScopeControlSummary() {
  return {
    includedScope: "",
    exclusions: "",
    clarifications: "",
    acceptedAlternates: "",
    allowances: "",
    ownerGcByOthers: "",
    hiddenUnshownConditionsNote: "",
  };
}

function normalizeScopeControlSummary(summary = {}) {
  return {
    ...getDefaultScopeControlSummary(),
    ...(summary || {}),
  };
}

function createEditableProposal(seedProposal) {
  const proposal = cloneObject(seedProposal || {});
  const client = proposal.client || {};
  const project = proposal.project || {};
  const gcPrime = proposal.gcPrime || {};
  const proposedSchedule = project.proposedSchedule || {};
  const explicitProposalMode = normalizeProposalMode(proposal.proposalMode || project.proposalMode);
  const proposalMode = inferProposalModeFromProposal(proposal);
  const proposalType = explicitProposalMode ? getProposalTypeForMode(proposalMode) : proposal.proposalType ?? proposal.type ?? getProposalTypeForMode(proposalMode);
  const packetMode = explicitProposalMode ? getPacketModeForProposalMode(proposalMode) : proposal.packetMode || getPacketModeForProposalMode(proposalMode);
  const revisionNumber = normalizeRevisionNumber(proposal.revisionNumber);
  const revisionLabel = proposal.revisionLabel || formatRevisionLabel(revisionNumber);
  const hasProposalTerms = Object.prototype.hasOwnProperty.call(proposal, "terms");

  const editableProposal = {
    ...proposal,
    id: proposal.id || createProposalId(),
    contactId: proposal.contactId || "",
    status: proposal.status || "draft",
    proposalMode,
    proposalType,
    type: proposalType,
    packetMode,
    packetBuilder: isGcPrimePacketMode(proposalMode) || packetMode === "full_gc_packet" ? normalizePacketBuilder(proposal.packetBuilder) : [],
    pdfStyle: normalizeProposalPdfStyle(proposal.pdfStyle, proposalMode),
    revisionNumber,
    revisionLabel,
    revisionDate: proposal.revisionDate || proposal.proposalDate || "",
    revisionNotes: proposal.revisionNotes || "",
    parentProposalId: proposal.parentProposalId || "",
    previousTotal: proposal.previousTotal ?? "",
    ...getDefaultTrackingFields(),
    sentDate: proposal.sentDate || "",
    sentToName: proposal.sentToName || "",
    sentToEmail: proposal.sentToEmail || "",
    sentToPhone: proposal.sentToPhone || "",
    sentMethod: SENT_METHODS.includes(proposal.sentMethod) ? proposal.sentMethod : "",
    followUpDate: proposal.followUpDate || "",
    followUpNotes: proposal.followUpNotes || "",
    lastFollowUpDate: proposal.lastFollowUpDate || "",
    nextAction: proposal.nextAction || "",
    outcomeReason: proposal.outcomeReason || "",
    approvedDate: proposal.approvedDate || "",
    rejectedDate: proposal.rejectedDate || "",
    viewedDate: proposal.viewedDate || "",
    decisionDueDate: proposal.decisionDueDate || "",
    internalTrackingNotes: proposal.internalTrackingNotes || "",
    company: {
      ...SEED_PROPOSAL.company,
      ...(proposal.company || {}),
      logoPath: proposal.company?.logoPath || logoSrc,
      credentials: Array.isArray(proposal.company?.credentials)
        ? proposal.company.credentials
        : parseCredentials(proposal.company?.credentials || getDefaultCompanySettings().credentialsText),
    },
    scopeSections: normalizeScopeSections(proposal.scopeSections),
    projectPhotos: normalizeProjectPhotos(proposal.projectPhotos),
    planSheets: normalizePlanSheets(proposal.planSheets),
    gcPacketTables: normalizeGcPacketTables(proposal.gcPacketTables),
    concreteSpecs: {
      ...getDefaultConcreteSpecs(),
      ...(proposal.concreteSpecs || {}),
    },
    gcPrime: {
      ...getDefaultGcPrime(),
      ...gcPrime,
      addendaRegister: normalizeAddendaRegister(gcPrime.addendaRegister),
      rfiRegister: normalizeRfiRegister(gcPrime.rfiRegister),
      scopeControlSummary: normalizeScopeControlSummary(gcPrime.scopeControlSummary),
    },
    financials: {
      taxRate: 0,
      discountAmount: 0,
      depositRate: SEED_PROPOSAL.financials.depositRate,
      ...(proposal.financials || {}),
    },
    exclusions: normalizeTextList(proposal.exclusions),
    assumptions: normalizeTextList(proposal.assumptions),
    terms: {
      ...(hasProposalTerms ? proposal.terms || {} : SEED_PROPOSAL.terms),
    },
    lineItems: (proposal.lineItems || []).map((item) => ({
      ...item,
      taxable: item.taxable ?? true,
    })),
    pricingSections: normalizePricingSections(proposal.pricingSections),
    pricingMode: proposal.pricingMode || "",
    pricingOptions: normalizePricingOptions(proposal.pricingOptions),
    optionalAddOns: normalizeOptionalAddOns(proposal.optionalAddOns),
    submittedPacketRecords: normalizeSubmittedPacketRecords(proposal.submittedPacketRecords),
    sendRecords: normalizeSendRecords(proposal.sendRecords),
    client: {
      ...client,
      billingAddress: client.billingAddress ?? client.address ?? "",
      projectAddress: client.projectAddress ?? client.cityStateZip ?? "",
    },
    project: {
      ...project,
      proposalMode: project.proposalMode || proposalMode,
      address: project.address ?? project.location ?? "",
      category: project.category ?? "Commercial flatwork",
      estimatedDuration: project.estimatedDuration ?? proposedSchedule.display ?? "",
      accessNotes: project.accessNotes ?? "",
      siteConditionNotes: project.siteConditionNotes ?? "",
      scheduleRestrictions: project.scheduleRestrictions ?? "",
      specialRequirements: project.specialRequirements ?? "",
      proposedSchedule: {
        ...proposedSchedule,
        startDate: proposedSchedule.startDate ?? "",
        display: proposedSchedule.display ?? "",
      },
    },
  };

  return {
    ...editableProposal,
    revisedTotal: calculateProposalTotals(editableProposal).total,
  };
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSubmittedPacketRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter(Boolean)
    .map((record) => ({
      id: record.id || createPacketRecordId(),
      proposalId: record.proposalId || "",
      proposalNumber: record.proposalNumber || "",
      revisionNumber: normalizeRevisionNumber(record.revisionNumber),
      revisionLabel: record.revisionLabel || formatRevisionLabel(record.revisionNumber),
      packetMode: record.packetMode || "summary",
      packetTitle: record.packetTitle || "Proposal Packet",
      createdAt: record.createdAt || new Date().toISOString(),
      createdByUserId: record.createdByUserId || "",
      createdByEmail: record.createdByEmail || "",
      status: SUBMITTED_PACKET_STATUSES.includes(record.status) ? record.status : "generated",
      sentDate: record.sentDate || "",
      sentToName: record.sentToName || "",
      sentToEmail: record.sentToEmail || "",
      sentMethod: record.sentMethod || "",
      internalNotes: record.internalNotes || "",
      totalAmount: toEditableNumber(record.totalAmount),
      baseAmount: toEditableNumber(record.baseAmount),
      includedAlternatesAmount: toEditableNumber(record.includedAlternatesAmount),
      totalIfAllAccepted: toEditableNumber(record.totalIfAllAccepted),
      includedSections: Array.isArray(record.includedSections) ? record.includedSections : [],
      packetSectionOrder: Array.isArray(record.packetSectionOrder)
        ? record.packetSectionOrder
        : Array.isArray(record.includedSections)
          ? record.includedSections
          : [],
      addendaAcknowledged: record.addendaAcknowledged || "",
      rfiCount: Number.parseInt(record.rfiCount, 10) || 0,
      planSheetCount: Number.parseInt(record.planSheetCount, 10) || 0,
      appendixPageCount: Number.parseInt(record.appendixPageCount, 10) || 0,
      packetPageCount: Number.parseInt(record.packetPageCount, 10) || 0,
      pdfAttachment: normalizePdfAttachment(record.pdfAttachment),
      proposalSnapshot: record.proposalSnapshot || {},
    }))
    .sort((a, b) => getPacketRecordTimestamp(b) - getPacketRecordTimestamp(a));
}

function createEmptyPdfAttachment() {
  return {
    fileName: "",
    fileSize: 0,
    fileType: "",
    publicUrl: "",
    storagePath: "",
    uploadedAt: "",
    uploadedByEmail: "",
    uploadedByUserId: "",
  };
}

function normalizePdfAttachment(pdfAttachment = {}) {
  if (!isPlainObject(pdfAttachment)) {
    return createEmptyPdfAttachment();
  }

  return {
    ...createEmptyPdfAttachment(),
    fileName: pdfAttachment.fileName || "",
    fileSize: Number.parseInt(pdfAttachment.fileSize, 10) || 0,
    fileType: pdfAttachment.fileType || "",
    publicUrl: pdfAttachment.publicUrl || "",
    storagePath: pdfAttachment.storagePath || "",
    uploadedAt: pdfAttachment.uploadedAt || "",
    uploadedByEmail: pdfAttachment.uploadedByEmail || "",
    uploadedByUserId: pdfAttachment.uploadedByUserId || "",
  };
}

function hasPacketPdfAttachment(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  const pdfAttachment = normalizePdfAttachment(safeRecord.pdfAttachment);
  return hasTextValue(pdfAttachment.storagePath) || hasTextValue(pdfAttachment.publicUrl);
}

function getSubmittedPacketPdfUrl(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  const pdfAttachment = normalizePdfAttachment(safeRecord.pdfAttachment);

  if (hasTextValue(pdfAttachment.publicUrl)) {
    return pdfAttachment.publicUrl;
  }

  if (hasTextValue(pdfAttachment.storagePath)) {
    return getStoragePublicUrl(pdfAttachment.storagePath);
  }

  return "";
}

function updateSubmittedPacketRecordInProposal(proposal = {}, recordId, patch = {}) {
  return createEditableProposal({
    ...proposal,
    submittedPacketRecords: normalizeSubmittedPacketRecords(proposal.submittedPacketRecords).map((record) =>
      record.id === recordId
        ? {
            ...record,
            ...patch,
          }
        : record,
    ),
    updatedAt: new Date().toISOString(),
  });
}

function normalizeSendRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter(Boolean)
    .map((record) => ({
      id: record.id || createSendRecordId(),
      proposalId: record.proposalId || "",
      proposalNumber: record.proposalNumber || "",
      revisionNumber: normalizeRevisionNumber(record.revisionNumber),
      revisionLabel: record.revisionLabel || formatRevisionLabel(record.revisionNumber),
      packetRecordId: record.packetRecordId || "",
      packetTitle: record.packetTitle || "",
      pdfAttachment: normalizePdfAttachment(record.pdfAttachment),
      templateId: record.templateId || "gc_prime_submission",
      subject: record.subject || "",
      body: record.body || "",
      sentDate: record.sentDate || "",
      sentMethod: SENT_METHODS.includes(record.sentMethod) ? record.sentMethod : "Email",
      sentToName: record.sentToName || "",
      sentToEmail: record.sentToEmail || "",
      followUpDate: record.followUpDate || "",
      nextAction: record.nextAction || "",
      createdAt: record.createdAt || new Date().toISOString(),
      createdByEmail: record.createdByEmail || "",
      createdByUserId: record.createdByUserId || "",
      status: record.status || "sent",
    }))
    .sort((a, b) => getSendRecordTimestamp(b) - getSendRecordTimestamp(a));
}

function createSendRecord(proposal = {}, packetRecord = {}, sendDraft = {}, authUser = null) {
  return normalizeSendRecords([
    {
      id: createSendRecordId(),
      proposalId: proposal.id || "",
      proposalNumber: proposal.proposalNumber || "",
      revisionNumber: proposal.revisionNumber,
      revisionLabel: proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber),
      packetRecordId: packetRecord.id || sendDraft.packetRecordId || "",
      packetTitle: packetRecord.packetTitle || "",
      pdfAttachment: normalizePdfAttachment(packetRecord.pdfAttachment || sendDraft.pdfAttachment),
      templateId: sendDraft.templateId || "gc_prime_submission",
      subject: sendDraft.subject || "",
      body: sendDraft.body || "",
      sentDate: sendDraft.sentDate || formatInputDate(new Date()),
      sentMethod: SENT_METHODS.includes(sendDraft.sentMethod) ? sendDraft.sentMethod : "Email",
      sentToName: sendDraft.sentToName || "",
      sentToEmail: sendDraft.sentToEmail || "",
      followUpDate: sendDraft.followUpDate || "",
      nextAction: sendDraft.nextAction || "",
      createdAt: new Date().toISOString(),
      createdByEmail: authUser?.email || "",
      createdByUserId: authUser?.id || "",
      status: "sent",
    },
  ])[0];
}

function createSendRecordId() {
  return `send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLatestSendRecord(proposal = {}) {
  return normalizeSendRecords(proposal.sendRecords)[0] || null;
}

function getSendRecordTimestamp(record = {}) {
  const date = new Date(record.sentDate || record.createdAt || "");
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf();
}

function createSendPackageDraft(proposal = {}, packetRecord = {}, templateId = "gc_prime_submission", previousDraft = {}) {
  const template = buildEmailTemplate(templateId, proposal, packetRecord);

  return {
    body: template.body,
    followUpDate: previousDraft.followUpDate || proposal.followUpDate || "",
    nextAction: previousDraft.nextAction || proposal.nextAction || "Confirm receipt and follow up on bid review.",
    packetRecordId: packetRecord?.id || previousDraft.packetRecordId || "",
    sentDate: previousDraft.sentDate || formatInputDate(new Date()),
    sentMethod: previousDraft.sentMethod || proposal.sentMethod || "Email",
    sentToEmail: previousDraft.sentToEmail || proposal.sentToEmail || proposal.client?.email || "",
    sentToName: previousDraft.sentToName || proposal.sentToName || proposal.client?.contactName || proposal.client?.companyName || "",
    subject: template.subject,
    templateId,
  };
}

function buildEmailTemplate(templateId, proposal = {}, packetRecord = {}) {
  const companyName = proposal.company?.name || "Last Yard Concrete";
  const projectName = proposal.project?.name || "Project";
  const revision = proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber);
  const totals = calculateProposalTotals(proposal);
  const pricingSections = getVisiblePricingSections(proposal.pricingSections);
  const addendaText = packetRecord?.addendaAcknowledged || proposal.gcPrime?.addendaAcknowledged || "";
  const contactLine = [proposal.company?.phone, proposal.company?.email].filter(hasTextValue).join(" | ");
  const pricingLine = `Proposal total/base packet amount: ${formatCurrency(totals.total)}.`;
  const alternateLine =
    pricingSections.length > 0
      ? `Alternates/allowances are listed in the packet. Total if all alternates are accepted: ${formatCurrency(totals.totalIfAllAlternatesAccepted || totals.total)}.`
      : null;
  const addendaLine = addendaText ? `Addenda acknowledged: ${addendaText}.` : null;
  const pdfLine = hasPacketPdfAttachment(packetRecord) ? "The submitted PDF packet is attached." : "The submitted PDF still needs to be attached before sending.";

  if (templateId === "revised_submission") {
    return {
      subject: `Revised Concrete Proposal — ${projectName} — ${revision}`,
      body: formatEmailBody([
        "Hello,",
        "",
        `Please see the revised concrete proposal packet for ${projectName}.`,
        pricingLine,
        alternateLine,
        addendaLine,
        "The revision notes and updated clarifications are included in the packet.",
        pdfLine,
        "",
        "Please confirm receipt when you have a chance.",
        "",
        `${companyName}`,
        contactLine || null,
      ]),
    };
  }

  if (templateId === "rfi_follow_up") {
    return {
      subject: `RFI / Clarification Follow-Up — ${projectName}`,
      body: formatEmailBody([
        "Hello,",
        "",
        `Following up on RFIs / clarifications for ${projectName}.`,
        "Please confirm any open concrete scope, addenda, exclusion, or plan clarification items before final pricing is relied upon.",
        "Our proposal packet includes the current clarification assumptions and scope treatment.",
        "",
        `${companyName}`,
        contactLine || null,
      ]),
    };
  }

  if (templateId === "submitted_follow_up") {
    return {
      subject: `Follow-Up — Concrete Proposal for ${projectName}`,
      body: formatEmailBody([
        "Hello,",
        "",
        `Checking in on the concrete proposal packet submitted for ${projectName}.`,
        "Please let us know if you need any clarification, alternate breakout, or revision.",
        "We would also appreciate confirmation that the packet was received and is under review.",
        "",
        `${companyName}`,
        contactLine || null,
      ]),
    };
  }

  if (templateId === "no_bid_decline") {
    return {
      subject: `No-Bid Notice — ${projectName}`,
      body: formatEmailBody([
        "Hello,",
        "",
        `Thank you for the opportunity to review ${projectName}.`,
        "At this time, Last Yard Concrete will respectfully decline to submit pricing for this bid package.",
        "Please keep us in mind for future concrete scopes.",
        "",
        `${companyName}`,
        contactLine || null,
      ]),
    };
  }

  return {
    subject: `Concrete Proposal / GC Packet — ${projectName} — ${companyName}`,
    body: formatEmailBody([
      "Hello,",
      "",
      `Attached is ${companyName}'s concrete proposal / GC packet for ${projectName}.`,
      pricingLine,
      alternateLine,
      addendaLine,
      "Exclusions, assumptions, clarifications, and scope control notes are included in the packet.",
      pdfLine,
      "",
      "Please confirm receipt and let us know if you need any clarification or revised breakout.",
      "",
      `${companyName}`,
      contactLine || null,
    ]),
  };
}

function formatEmailBody(lines = []) {
  return lines.filter((line) => line !== null && line !== undefined).join("\n");
}

function formatSendPackageClipboardText(draft = {}) {
  return [
    `To: ${[draft.sentToName, draft.sentToEmail].filter(hasTextValue).join(" <")}${draft.sentToName && draft.sentToEmail ? ">" : ""}`,
    `Subject: ${draft.subject || ""}`,
    "",
    draft.body || "",
  ].join("\n");
}

function getProposalValidationWithPacketPdfWarnings(proposal = {}) {
  const validation = validateProposalCompleteness(proposal);

  if (String(proposal.status || "").toLowerCase() !== "sent" || proposalHasSubmittedPdf(proposal)) {
    return validation;
  }

  return {
    ...validation,
    warnings: [...validation.warnings, "Sent proposal has no submitted PDF attached."],
  };
}

function getAiSafeProposalContext(proposal = {}) {
  const totals = calculateProposalTotals(proposal);

  return {
    id: proposal.id || "",
    proposalNumber: proposal.proposalNumber || "",
    proposalType: proposal.proposalType || proposal.type || "",
    packetMode: proposal.packetMode || "",
    status: proposal.status || "",
    project: {
      name: proposal.project?.name || "",
      location: proposal.project?.location || "",
      address: proposal.project?.address || "",
      description: proposal.project?.description || "",
      schedule: proposal.project?.proposedSchedule?.display || proposal.project?.estimatedDuration || "",
      scheduleRestrictions: proposal.project?.scheduleRestrictions || "",
    },
    client: {
      companyName: proposal.client?.companyName || "",
      contactName: proposal.client?.contactName || "",
      email: proposal.client?.email || "",
      phone: proposal.client?.phone || "",
    },
    scopeSections: proposal.scopeSections || [],
    exclusions: proposal.exclusions || [],
    assumptions: proposal.assumptions || [],
    lineItems: proposal.lineItems || [],
    pricingSections: proposal.pricingSections || [],
    gcPrime: {
      addendaAcknowledged: proposal.gcPrime?.addendaAcknowledged || "",
      rfiClarificationNotes: proposal.gcPrime?.rfiClarificationNotes || "",
      addendaRegister: proposal.gcPrime?.addendaRegister || [],
      rfiRegister: proposal.gcPrime?.rfiRegister || [],
      scopeControlSummary: proposal.gcPrime?.scopeControlSummary || {},
    },
    gcPacketTables: {
      pricingSummary: proposal.gcPacketTables?.pricingSummary || {},
      scheduleOfValues: proposal.gcPacketTables?.scheduleOfValues || {},
      takeoffQuantities: proposal.gcPacketTables?.takeoffQuantities || {},
      proposalNotes: proposal.gcPacketTables?.proposalNotes || {},
    },
    terms: proposal.terms || {},
    proposalNotes: proposal.proposalNotes || "",
    totals: {
      total: totals.total,
      baseBid: totals.baseBid,
      totalIfAllAlternatesAccepted: totals.totalIfAllAlternatesAccepted,
    },
  };
}

function proposalHasSubmittedPdf(proposal = {}) {
  return normalizeSubmittedPacketRecords(proposal.submittedPacketRecords).some(hasPacketPdfAttachment);
}

function getBidLinkedPacketRecord(bid = {}, proposal = {}) {
  const records = normalizeSubmittedPacketRecords(proposal?.submittedPacketRecords);

  if (!records.length) {
    return null;
  }

  return records.find((record) => record.id === bid.submittedPacketRecordId) || records[0];
}

function createSubmittedPacketRecord(proposal = {}, authUser = null, overrides = {}) {
  const snapshotSource = createEditableProposal({ ...proposal, submittedPacketRecords: [] });
  const totals = calculateProposalTotals(snapshotSource);
  const packetSummary = getSubmittedPacketRenderSummary(snapshotSource);

  const record = {
    id: createPacketRecordId(),
    proposalId: snapshotSource.id,
    proposalNumber: snapshotSource.proposalNumber,
    revisionNumber: snapshotSource.revisionNumber,
    revisionLabel: snapshotSource.revisionLabel || formatRevisionLabel(snapshotSource.revisionNumber),
    packetMode: snapshotSource.packetMode || "summary",
    packetTitle: `${snapshotSource.project?.name || "Proposal"} - ${getPacketModeLabel(snapshotSource)}`,
    createdAt: new Date().toISOString(),
    createdByUserId: authUser?.id || "",
    createdByEmail: authUser?.email || "",
    status: "generated",
    sentDate: snapshotSource.sentDate || "",
    sentToName: snapshotSource.sentToName || snapshotSource.client?.contactName || snapshotSource.client?.companyName || "",
    sentToEmail: snapshotSource.sentToEmail || snapshotSource.client?.email || "",
    sentMethod: snapshotSource.sentMethod || "",
    internalNotes: "",
    totalAmount: totals.total,
    baseAmount: totals.baseBid,
    includedAlternatesAmount: totals.includedPricingSectionsTotal,
    totalIfAllAccepted: totals.totalIfAllAlternatesAccepted,
    includedSections: packetSummary.includedSections,
    packetSectionOrder: packetSummary.sectionOrder,
    addendaAcknowledged:
      snapshotSource.gcPrime?.addendaAcknowledged ||
      getPrintableAddendaRows(snapshotSource.gcPrime)
        .map((row) => [row.addendumNumber, row.titleDescription].filter(hasTextValue).join(" - "))
        .filter(hasTextValue)
        .join("; "),
    rfiCount: countPacketTextLines(snapshotSource.gcPrime?.rfiClarificationNotes) + getPrintableRfiRows(snapshotSource.gcPrime).length,
    planSheetCount: packetSummary.planSheetCount,
    appendixPageCount: packetSummary.appendixPageCount,
    packetPageCount: packetSummary.packetPageCount,
    proposalSnapshot: cloneObject(snapshotSource),
    ...overrides,
  };

  return normalizeSubmittedPacketRecords([record])[0];
}

function createPacketRecordId() {
  return `packet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSubmittedPacketIncludedSections(proposal = {}, counts = {}) {
  if (isGcPrimePacketMode(inferProposalModeFromProposal(proposal)) || proposal.packetMode === "full_gc_packet") {
    return getSubmittedPacketRenderSummary(proposal).includedSections;
  }

  const sections = ["Cover Page", "Proposal Details"];

  if (getVisiblePricingSections(proposal.pricingSections).length > 0) {
    sections.push("Alternates / Allowances");
  }

  if (counts.structuredPageCount > 0) {
    sections.push("Structured GC Tables");
  }

  if (counts.appendixPageCount > 0) {
    sections.push("Appendix Backup");
  }

  if (counts.planSheetCount > 0) {
    sections.push("Plan / Takeoff Pages");
  }

  return sections;
}

function getSubmittedPacketRenderSummary(proposal = {}) {
  if (isGcPrimePacketMode(inferProposalModeFromProposal(proposal)) || proposal.packetMode === "full_gc_packet") {
    const orderedSections = getOrderedFullGcPacketSections(proposal);

    return {
      appendixPageCount: orderedSections.filter((section) => section.kind === "appendix").length,
      planSheetCount: orderedSections.filter((section) => section.kind === "plan").length,
      structuredPageCount: orderedSections.filter((section) => section.kind === "structured").length,
      packetPageCount: orderedSections.length,
      includedSections: orderedSections.map((section, index) => `${String(index + 1).padStart(2, "0")}. ${section.title}`),
      sectionOrder: orderedSections.map((section, index) => ({
        id: section.id,
        title: section.title,
        order: index + 1,
      })),
    };
  }

  const proposalMode = inferProposalModeFromProposal(proposal);
  const appendixPlan = buildAppendixPlan(proposal);
  const structuredPacketPages = isResidentialProposalMode(proposalMode) ? [] : buildStructuredPacketPages(proposal);
  const enabledPlanSheets = isResidentialProposalMode(proposalMode)
    ? getEnabledPlanSheets(proposal.planSheets).filter(hasResidentialPlanSheetSummaryData)
    : getEnabledPlanSheets(proposal.planSheets);
  const appendixPageCount = appendixPlan.pages.length;
  const planSheetCount = enabledPlanSheets.length;
  const structuredPageCount = structuredPacketPages.length;
  const includedSections = getSubmittedPacketIncludedSections(proposal, {
    appendixPageCount,
    planSheetCount,
    structuredPageCount,
  });

  return {
    appendixPageCount,
    planSheetCount,
    structuredPageCount,
    packetPageCount: 2 + structuredPageCount + appendixPageCount + planSheetCount,
    includedSections,
    sectionOrder: includedSections.map((title, index) => ({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
      title,
      order: index + 1,
    })),
  };
}

function countPacketTextLines(value = "") {
  return splitAppendixText(value).length;
}

function hasResidentialPlanSheetSummaryData(sheet = {}) {
  return Boolean(
    sheet.imageSrc ||
      sheet.imageUrl ||
      sheet.storagePath ||
      sheet.publicUrl ||
      hasPrintableText(sheet.calculationTitle) ||
      hasPrintableText(sheet.calculationNotes) ||
      hasPrintableText(sheet.clarificationNotes),
  );
}

function getPacketRecordTimestamp(record = {}) {
  const date = new Date(record.createdAt || record.sentDate || "");
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf();
}

function getLatestSubmittedPacketRecord(proposal = {}) {
  return normalizeSubmittedPacketRecords(proposal.submittedPacketRecords)[0] || null;
}

function getSubmittedPacketRecordsForDashboard(proposals = []) {
  return proposals
    .flatMap((proposal) =>
      normalizeSubmittedPacketRecords(proposal.submittedPacketRecords).map((record) => ({
        ...record,
        proposalId: proposal.id,
        projectName: proposal.project?.name || record.packetTitle,
        clientName: proposal.client?.companyName || proposal.client?.contactName || "",
      })),
    )
    .sort((a, b) => getPacketRecordTimestamp(b) - getPacketRecordTimestamp(a));
}

function isCurrentMonthDate(value = "") {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function updateNestedValue(source, path, value) {
  const keys = path.split(".");
  const next = Array.isArray(source) ? [...source] : { ...source };
  let target = next;
  let current = source;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      target[key] = value;
      return;
    }

    const nextSourceValue = current?.[key] || {};
    const nextTargetValue = Array.isArray(nextSourceValue) ? [...nextSourceValue] : { ...nextSourceValue };
    target[key] = nextTargetValue;
    target = nextTargetValue;
    current = nextSourceValue;
  });

  return next;
}

function formatQuantity(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(toEditableNumber(value));
}

function getVisiblePricingSections(pricingSections = []) {
  return cleanPrintablePricingSections(normalizePricingSections(pricingSections));
}

function resequencePacketBuilder(sections = []) {
  return normalizePacketBuilder(sections).map((section, index) => ({
    ...section,
    order: (index + 1) * 10,
  }));
}

function getPacketBuilderTitle(sectionId = "") {
  return PACKET_BUILDER_SECTIONS.find((section) => section.id === sectionId)?.title || sectionId;
}

function getPacketBuilderSectionStatus(proposal = {}, sectionId = "") {
  const tables = normalizeGcPacketTables(proposal.gcPacketTables);

  switch (sectionId) {
    case "cover_summary":
    case "details_pricing":
      return { hasData: true };
    case "scope_control_summary":
      return { hasData: buildScopeControlSummarySections(proposal).length > 0 };
    case "pricing_summary":
      return { hasData: Boolean(tables.pricingSummary.enabled) };
    case "schedule_of_values":
      return { hasData: hasGcPacketRows(tables.scheduleOfValues) || hasResidentialOptionBreakdowns(proposal) };
    case "takeoff_quantities":
      return { hasData: hasGcPacketRows(tables.takeoffQuantities) };
    case "addenda_acknowledgement":
      return { hasData: getPrintableAddendaRows(proposal.gcPrime).length > 0 };
    case "rfi_clarification_register":
      return { hasData: getPrintableRfiRows(proposal.gcPrime).length > 0 };
    case "legal_terms":
      return { hasData: buildLegalTermsSections(proposal.terms).length > 0 };
    case "appendix_overflow":
      return { hasData: buildAppendixPlan(proposal).pages.length > 0 };
    case "plan_sheet_pages":
      return { hasData: getEnabledPlanSheets(proposal.planSheets).length > 0 };
    case "shade_footing_estimate":
      return { hasData: hasGcPacketRows(tables.shadeFootingEstimate) };
    case "proposal_notes_acceptance_summary":
      return { hasData: hasProposalNotesData(tables.proposalNotes) };
    default:
      return { hasData: false };
  }
}

function hasGcPacketRows(table = {}) {
  return (
    Boolean(table.enabled) &&
    Array.isArray(table.rows) &&
    table.rows.some((row) =>
      Object.entries(row).some(([key, value]) => key !== "id" && hasPrintableText(value)),
    )
  );
}

function hasAnyGcPacketTableData(gcPacketTables = {}) {
  const tables = normalizeGcPacketTables(gcPacketTables);

  return Object.values(tables).some((table) => {
    if (hasGcPacketRows(table)) {
      return true;
    }

    return ["presentationNotes", "proposalBasis", "contractScopeControl", "acceptanceSummary", "gcPrimeReviewer"].some((field) =>
      hasPrintableText(table[field]),
    );
  });
}

function hasProposalNotesData(table = {}) {
  return (
    Boolean(table.enabled) &&
    ["proposalBasis", "contractScopeControl", "acceptanceSummary", "gcPrimeReviewer"].some((field) =>
      hasPrintableText(table[field]),
    )
  );
}

function getStructuredPacketSectionIdForBuilder(page = {}) {
  const key = String(page.key || "");

  if (key === "structured-scope-control-summary") {
    return "scope_control_summary";
  }

  if (key === "structured-pricing-summary" || page.kind === "pricing-summary") {
    return "pricing_summary";
  }

  if (key.startsWith("structured-scheduleOfValues")) {
    return "schedule_of_values";
  }

  if (key.startsWith("structured-takeoffQuantities")) {
    return "takeoff_quantities";
  }

  if (key.startsWith("structured-addendaRegister")) {
    return "addenda_acknowledgement";
  }

  if (key.startsWith("structured-rfiRegister")) {
    return "rfi_clarification_register";
  }

  if (key.startsWith("structured-legal-terms")) {
    return "legal_terms";
  }

  if (key.startsWith("structured-shadeFootingEstimate")) {
    return "shade_footing_estimate";
  }

  if (key === "structured-proposal-notes" || page.kind === "proposalNotes") {
    return "proposal_notes_acceptance_summary";
  }

  return "appendix_overflow";
}

function getOrderedFullGcPacketSections(proposal = {}) {
  const builder = normalizePacketBuilder(proposal.packetBuilder);
  const orderBySectionId = new Map(builder.map((section) => [section.id, section.order]));
  const includedBySectionId = new Map(builder.map((section) => [section.id, section.included !== false]));
  const appendixPlan = buildAppendixPlan(proposal);
  const structuredPacketPages = buildStructuredPacketPages(proposal);
  const enabledPlanSheets = getEnabledPlanSheets(proposal.planSheets);
  const rawSections = [
    { id: "cover_summary", title: getPacketBuilderTitle("cover_summary"), kind: "summary" },
    { id: "details_pricing", title: getPacketBuilderTitle("details_pricing"), kind: "summary" },
    ...structuredPacketPages.map((page, index) => {
      const sectionId = getStructuredPacketSectionIdForBuilder(page);

      return {
        id: sectionId,
        title: getPacketBuilderTitle(sectionId),
        kind: "structured",
        originalIndex: index + 2,
      };
    }),
    ...appendixPlan.pages.map((page, index) => ({
      id: "appendix_overflow",
      title: getPacketBuilderTitle("appendix_overflow"),
      kind: "appendix",
      originalIndex: structuredPacketPages.length + index + 2,
    })),
    ...enabledPlanSheets.map((sheet, index) => ({
      id: "plan_sheet_pages",
      title: getPacketBuilderTitle("plan_sheet_pages"),
      kind: "plan",
      originalIndex: structuredPacketPages.length + appendixPlan.pages.length + index + 2,
    })),
  ];

  return rawSections
    .map((section, index) => ({ ...section, originalIndex: section.originalIndex ?? index }))
    .filter((section) => includedBySectionId.get(section.id) !== false)
    .filter((section) => getPacketBuilderSectionStatus(proposal, section.id).hasData)
    .sort((a, b) => {
      const orderA = orderBySectionId.get(a.id) ?? 999;
      const orderB = orderBySectionId.get(b.id) ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.originalIndex - b.originalIndex;
    });
}

function buildStructuredPacketPages(proposal) {
  const tables = normalizeGcPacketTables(proposal.gcPacketTables);
  const pages = [];
  const isFullGcPacket = proposal.packetMode === "full_gc_packet";

  if (isFullGcPacket) {
    const scopeControlSections = buildScopeControlSummarySections(proposal);

    if (scopeControlSections.length > 0) {
      pages.push({
        key: "structured-scope-control-summary",
        kind: "proposalNotes",
        title: "Scope Control Summary",
        sections: scopeControlSections,
      });
    }

    paginateStructuredRows(
      pages,
      "addendaRegister",
      { enabled: true, rows: getPrintableAddendaRows(proposal.gcPrime) },
      "Addenda Acknowledgement",
      [
        { key: "addendumNumber", label: "Addendum #" },
        { key: "addendumDate", label: "Date" },
        { key: "titleDescription", label: "Title / Description" },
        { key: "acknowledgedLabel", label: "Acknowledged" },
        { key: "notes", label: "Notes" },
      ],
      12,
    );

    paginateStructuredRows(
      pages,
      "rfiRegister",
      { enabled: true, rows: getPrintableRfiRows(proposal.gcPrime) },
      "RFI / Clarification Register",
      [
        { key: "rfiNumber", label: "RFI / Clarification #" },
        { key: "dateAsked", label: "Asked" },
        { key: "dateAnswered", label: "Answered" },
        { key: "source", label: "Source" },
        { key: "question", label: "Question / Clarification" },
        { key: "answerTreatment", label: "Proposal Treatment" },
        { key: "priceImpact", label: "Price Impact" },
        { key: "scopeImpact", label: "Scope Impact" },
      ],
      8,
    );
  }

  if (tables.pricingSummary.enabled) {
    pages.push({
      key: "structured-pricing-summary",
      kind: "pricing-summary",
      title: "Pricing Summary",
      columns: [
        { key: "label", label: "Item" },
        { key: "amount", label: "Amount" },
        { key: "note", label: "Presentation Notes" },
      ],
      rows: buildStructuredPricingSummaryRows(proposal, tables.pricingSummary.rows),
      notes: tables.pricingSummary.presentationNotes,
    });
  }

  paginateStructuredRows(
    pages,
    "scheduleOfValues",
    tables.scheduleOfValues,
    "Schedule of Values",
    [
      { key: "item", label: "Item" },
      { key: "description", label: "Description" },
      { key: "pricingBasis", label: "Pricing Basis" },
      { key: "amount", label: "Amount" },
    ],
    18,
  );

  paginateStructuredRows(
    pages,
    "takeoffQuantities",
    tables.takeoffQuantities,
    "Takeoff Quantities",
    [
      { key: "item", label: "Item" },
      { key: "quantity", label: "Quantity" },
      { key: "detailSize", label: "Detail / Size" },
      { key: "netCy", label: "Net CY" },
      { key: "cyWithTenPercent", label: "CY with 10%" },
      { key: "priceStatus", label: "Price / Status" },
    ],
    16,
  );

  paginateStructuredRows(
    pages,
    "shadeFootingEstimate",
    tables.shadeFootingEstimate,
    "Shade Footing Estimate",
    [
      { key: "column", label: "Column" },
      { key: "columnSize", label: "Column Size" },
      { key: "estimatedSpreadFooting", label: "Estimated Spread Footing" },
      { key: "netCy", label: "Net CY" },
      { key: "estimatedSubtotal", label: "Estimated Subtotal" },
      { key: "estimatedCyWithTenPercent", label: "Estimated CY with 10%" },
      { key: "allowanceAmount", label: "Allowance Amount" },
      { key: "allowanceNote", label: "Allowance Note" },
    ],
    12,
  );

  if (tables.proposalNotes.enabled) {
    const proposalNoteSections = [
      { title: "Proposal Basis", text: cleanPrintableTextBlock(tables.proposalNotes.proposalBasis) },
      { title: "Contract Scope Control", text: cleanPrintableTextBlock(tables.proposalNotes.contractScopeControl) },
      { title: "Acceptance Summary", text: cleanPrintableTextBlock(tables.proposalNotes.acceptanceSummary) },
      { title: "GC / Prime Reviewer", text: cleanPrintableTextBlock(tables.proposalNotes.gcPrimeReviewer) },
    ].filter((section) => hasPrintableText(section.text));

    if (proposalNoteSections.length > 0) {
      pages.push({
        key: "structured-proposal-notes",
        kind: "proposalNotes",
        title: "Proposal Notes / Acceptance Summary",
        sections: proposalNoteSections,
      });
    }
  }

  if (isFullGcPacket) {
    const legalTermsSections = buildLegalTermsSections(proposal.terms);

    if (legalTermsSections.length > 0) {
      chunkArray(legalTermsSections, 6).forEach((sections, index, chunks) => {
        pages.push({
          key: `structured-legal-terms-${index}`,
          kind: "proposalNotes",
          title: chunks.length > 1 ? `Legal / Terms Clarifications (${index + 1})` : "Legal / Terms Clarifications",
          sections,
        });
      });
    }
  }

  return pages;
}

function buildScopeControlSummarySections(proposal = {}) {
  const scopeControl = normalizeScopeControlSummary(proposal.gcPrime?.scopeControlSummary);
  const includedAlternates = getVisiblePricingSections(proposal.pricingSections).filter(
    (section) => section.included && section.type !== "unit_price",
  );
  const allowances = getVisiblePricingSections(proposal.pricingSections).filter((section) => section.type === "allowance");
  const generatedIncludedScope = cleanPrintableScopeSections(proposal.scopeSections)
    .map((section) => `${section.title}: ${(section.items || []).join("; ")}`)
    .filter(hasPrintableText)
    .join("\n");
  const generatedExclusions = cleanPrintableTextList(proposal.exclusions).join("\n");
  const generatedClarifications = getAppendixTextValue(cleanPrintableTextBlock(proposal.gcPrime?.rfiClarificationNotes || proposal.gcPrime?.gcPrimeNotes));
  const generatedAcceptedAlternates = includedAlternates
    .map((section) => `${section.label}: ${formatPricingSectionAmount(section)}`)
    .join("\n");
  const generatedAllowances = allowances
    .map((section) => `${section.label}: ${formatPricingSectionAmount(section)}${section.included ? " included" : " not included"}`)
    .join("\n");

  return [
    { title: "Included Scope", text: limitStructuredNoteText(scopeControl.includedScope || generatedIncludedScope) },
    { title: "Exclusions", text: limitStructuredNoteText(scopeControl.exclusions || generatedExclusions) },
    { title: "Clarifications", text: limitStructuredNoteText(scopeControl.clarifications || generatedClarifications) },
    { title: "Accepted Alternates", text: limitStructuredNoteText(scopeControl.acceptedAlternates || generatedAcceptedAlternates) },
    { title: "Allowances", text: limitStructuredNoteText(scopeControl.allowances || generatedAllowances) },
    { title: "Owner / GC By Others", text: limitStructuredNoteText(scopeControl.ownerGcByOthers) },
    {
      title: "Hidden / Unshown Conditions",
      text: limitStructuredNoteText(scopeControl.hiddenUnshownConditionsNote || proposal.terms?.hiddenConditions),
    },
  ].filter((section) => hasPrintableText(section.text));
}

function limitStructuredNoteText(value, maxLength = 520) {
  const text = getAppendixTextValue(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${truncateText(text, maxLength)}\nSee Appendix for detailed backup.`;
}

function getPrintableAddendaRows(gcPrime = {}) {
  return normalizeAddendaRegister(gcPrime.addendaRegister)
    .filter((row) => row.includedInPacket && hasAddendumRowData(row))
    .map((row) => ({
      ...row,
      acknowledgedLabel: row.acknowledged ? "Yes" : "No",
    }));
}

function getPrintableRfiRows(gcPrime = {}) {
  return normalizeRfiRegister(gcPrime.rfiRegister).filter((row) => row.includedInPacket && hasRfiRowData(row));
}

function hasAddendumRowData(row = {}) {
  return ["addendumNumber", "addendumDate", "titleDescription", "notes"].some((field) => hasTextValue(row[field]));
}

function hasRfiRowData(row = {}) {
  return [
    "rfiNumber",
    "dateAsked",
    "dateAnswered",
    "source",
    "question",
    "answerTreatment",
    "priceImpact",
    "scopeImpact",
  ].some((field) => hasTextValue(row[field]));
}

function buildLegalTermsSections(terms = {}) {
  const legacyWeatherSiteReadiness =
    !hasTextValue(terms.siteReadiness) && !hasTextValue(terms.weatherDelay) ? terms.weatherSiteReadiness : "";
  const legalFields = [
    ["Proposal Expiration", terms.proposalExpiration],
    ["Payment Terms", terms.payment],
    ["Deposit / Scheduling", terms.depositText],
    ["Progress Billing", terms.progressBilling],
    ["Final Payment", terms.finalPayment],
    ["Late Payment / Collection", terms.latePayment],
    ["Change Orders", terms.changeOrderLanguage],
    ["Site Readiness", terms.siteReadiness],
    ["Weather Delays", terms.weatherDelay],
    ["Weather / Site Readiness", legacyWeatherSiteReadiness],
    ["Utility Responsibility", terms.utilityResponsibility],
    ["Hidden Conditions", terms.hiddenConditions],
    ["Concrete Cracking", terms.concreteCrackingDisclaimer],
    ["Color / Finish Variation", terms.colorFinishVariationDisclaimer],
    ["Warranty Limitation", terms.warrantyLimitation],
    ["GC / Prime Scope Control", terms.gcScopeControl],
    ["Acceptance", terms.acceptance],
  ];

  return legalFields
    .filter(([, text]) => hasPrintableText(text))
    .map(([title, text]) => ({ title, text: cleanPrintableTextBlock(text) }));
}

function paginateStructuredRows(pages, kind, table, title, columns, rowsPerPage) {
  const printableRows = cleanPrintableStructuredRows(kind, table.rows);

  if (!table.enabled || printableRows.length === 0) {
    return;
  }

  const rowChunks = chunkArray(printableRows, rowsPerPage);

  rowChunks.forEach((rows, index) => {
    pages.push({
      key: `structured-${kind}-${index}`,
      kind,
      title: rowChunks.length > 1 ? `${title} (${index + 1})` : title,
      columns,
      rows,
    });
  });
}

function buildStructuredPricingSummaryRows(proposal, customRows = []) {
  if (hasResidentialChooseOnePricing(proposal)) {
    const optionRows = normalizePricingOptions(proposal.pricingOptions).map((option) => ({
      id: option.id || createProposalId(),
      label: option.name,
      amount: formatResidentialCurrency(option.price),
      note: [option.description, `50% Down: ${formatResidentialCurrency(option.downPayment)}`, `Final: ${formatResidentialCurrency(option.finalPayment)}`]
        .filter(hasTextValue)
        .join(" | "),
    }));
    const addOnRows = normalizeOptionalAddOns(proposal.optionalAddOns).map((addOn) => ({
      id: addOn.id || createProposalId(),
      label: `Optional Add-On - ${addOn.name}`,
      amount: formatResidentialCurrency(addOn.amount, { plus: true }),
      note: addOn.description || "Optional upgrade to selected option.",
    }));

    return cleanPrintablePricingSummaryRows([
      ...optionRows,
      ...addOnRows,
      {
        id: "choose-one-pricing-mode-note",
        label: "Pricing Mode",
        amount: "",
        note: "Customer to select one main option. Main options are mutually exclusive and are not added together.",
      },
    ]);
  }

  const visibleCustomRows = cleanPrintablePricingSummaryRows(normalizeGcPacketRows("pricingSummary", customRows));

  if (visibleCustomRows.length > 0) {
    return visibleCustomRows;
  }

  const totals = calculateProposalTotals(proposal);
  const pricingSections = getVisiblePricingSections(proposal.pricingSections);
  const allowances = pricingSections.filter((section) => section.type === "allowance");
  const addAlternates = pricingSections.filter((section) => section.type === "add_alternate");
  const includedAlternates = addAlternates.filter((section) => section.included);
  const rows = [
    { id: "base-concrete-work", label: "Base Concrete Work", amount: formatCurrency(totals.baseBid), note: "Base bid concrete scope." },
    ...allowances.map((section) => ({
      id: section.id || createProposalId(),
      label: section.label || "Allowance",
      amount: formatPricingSectionAmount(section),
      note: [section.description, section.included ? "Included" : "Not included unless accepted in writing."].filter(hasTextValue).join(" "),
    })),
    ...(addAlternates.length > 0
      ? addAlternates.map((section, index) => ({
          id: section.id || createProposalId(),
          label: section.label || `Add Alternate ${String(index + 1).padStart(2, "0")}`,
          amount: formatPricingSectionAmount(section),
          note: [section.description, section.included ? "Accepted / included" : "Optional / not included"].filter(hasTextValue).join(" "),
        }))
      : [
          {
            id: "no-alternates-accepted",
            label: "Alternates",
            amount: "",
            note: "None currently accepted.",
          },
        ]),
    {
      id: "total-if-all-accepted",
      label: includedAlternates.length > 0 ? "Total if all accepted" : "Total Proposal",
      amount: formatCurrency(totals.totalIfAllAlternatesAccepted),
      note: "For presentation only; final accepted scope controls contract total.",
    },
  ];

  return cleanPrintablePricingSummaryRows(rows);
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function formatStructuredCell(value, columnKey = "") {
  if (!hasPrintableText(value)) {
    return "-";
  }

  if (columnKey === "amount") {
    const textValue = String(value).trim();

    if (typeof value === "number" || (/^-?[\d,]+(?:\.\d+)?$/.test(textValue) && !textValue.includes("$"))) {
      return formatResidentialCurrency(value);
    }
  }

  return value;
}

function formatPricingSectionAmount(section) {
  const amount = Math.abs(toEditableNumber(section.amount));
  const formattedAmount = formatCurrency(amount);

  return section.type === "deduct_alternate" ? `-${formattedAmount}` : formattedAmount;
}

function buildAppendixPlan(proposal) {
  const printableScopeSections = cleanPrintableScopeSections(proposal.scopeSections);
  const printableExclusions = cleanPrintableTextList(proposal.exclusions);
  const printableAssumptions = cleanPrintableTextList(proposal.assumptions);
  const printableLineItems = (proposal.lineItems || []).filter((item) => hasPrintableText(item.description));
  const isResidentialMode = isResidentialProposalMode(inferProposalModeFromProposal(proposal));

  if (isResidentialMode) {
    return {
      mainScopeSections: printableScopeSections,
      mainExclusions: [...printableExclusions, ...printableAssumptions],
      mainGcPrime: {},
      mainLineItems: printableLineItems,
      mainPricingSections: [],
      scopeNeedsAppendix: false,
      referenceNotes: [],
      pages: [],
    };
  }

  const scopeSummary = buildScopeSummary(printableScopeSections);
  const exclusionsSummary = buildExclusionsSummary(printableExclusions, printableAssumptions);
  const lineItemSummary = buildLineItemSummary(printableLineItems);
  const pricingSummary = buildPricingSectionSummary(proposal.pricingSections);
  const gcPrimeSummary = buildGcPrimeSummary(proposal.gcPrime || {});
  const proposalNotes = getAppendixTextValue(cleanPrintableTextBlock(proposal.proposalNotes || proposal.notes));
  const concreteSpecNotes = getAppendixTextValue(cleanPrintableTextBlock(proposal.concreteSpecs?.notes));
  const takeoffBackupText = getAppendixTextValue(cleanPrintableTextBlock(proposal.takeoffQuantityBackup || proposal.quantityBackup));
  const proposalTotals = calculateProposalTotals(proposal);
  const appendixSections = [];

  if (scopeSummary.needsAppendix) {
    appendixSections.push({
      key: "detailed-scope",
      kind: "scope",
      title: "Detailed Scope Backup",
      groups: printableScopeSections,
    });
  }

  if (exclusionsSummary.needsAppendix) {
    appendixSections.push({
      key: "detailed-exclusions-assumptions",
      kind: "listGroups",
      title: "Detailed Exclusions / Assumptions",
      groups: [
        { title: "Exclusions", items: printableExclusions },
        { title: "Assumptions", items: printableAssumptions },
      ].filter((group) => group.items.length > 0),
    });
  }

  if (gcPrimeSummary.rfiNeedsAppendix) {
    appendixSections.push({
      key: "rfis-clarifications",
      kind: "text",
      title: "RFIs / Clarifications",
      text: gcPrimeSummary.rfiText,
    });
  }

  if (gcPrimeSummary.addendaNeedsAppendix) {
    appendixSections.push({
      key: "addenda-acknowledgement",
      kind: "text",
      title: "Addenda Acknowledgement",
      text: gcPrimeSummary.addendaText,
    });
  }

  if (proposalNotes || concreteSpecNotes || gcPrimeSummary.gcPrimeNotesText) {
    appendixSections.push({
      key: "proposal-notes",
      kind: "text",
      title: "Proposal Notes",
      text: [proposalNotes, gcPrimeSummary.gcPrimeNotesText, concreteSpecNotes].filter(Boolean).join("\n\n"),
    });
  }

  if (lineItemSummary.needsAppendix || takeoffBackupText) {
    appendixSections.push({
      key: "takeoff-quantity-backup",
      kind: "takeoff",
      title: "Takeoff Quantity Backup",
      lineItems: printableLineItems,
      text: takeoffBackupText,
    });
  }

  if (pricingSummary.needsAppendix) {
    appendixSections.push({
      key: "alternates-allowances-detail",
      kind: "pricing",
      title: "Alternates / Allowances Detail",
      sections: pricingSummary.fullSections,
      totals: proposalTotals,
    });
  }

  const referenceNotes = buildAppendixReferenceNotes({
    scopeNeedsAppendix: scopeSummary.needsAppendix,
    exclusionsNeedsAppendix: exclusionsSummary.needsAppendix,
    lineItemsNeedAppendix: lineItemSummary.needsAppendix,
    pricingNeedsAppendix: pricingSummary.needsAppendix,
    hasRfiAppendix: gcPrimeSummary.rfiNeedsAppendix,
    hasAddendaAppendix: gcPrimeSummary.addendaNeedsAppendix,
    hasNotesAppendix: Boolean(proposalNotes || concreteSpecNotes || gcPrimeSummary.gcPrimeNotesText),
  });

  return {
    mainScopeSections: scopeSummary.mainSections,
    mainExclusions: exclusionsSummary.mainExclusions,
    mainGcPrime: gcPrimeSummary.mainGcPrime,
    mainLineItems: lineItemSummary.mainLineItems,
    mainPricingSections: pricingSummary.mainSections,
    scopeNeedsAppendix: scopeSummary.needsAppendix,
    referenceNotes,
    pages: paginateAppendixSections(appendixSections),
  };
}

function buildScopeSummary(scopeSections = []) {
  const printableScopeSections = cleanPrintableScopeSections(scopeSections);
  const totalItems = printableScopeSections.reduce((sum, section) => sum + (section.items?.length || 0), 0);
  const scopeTextLength = printableScopeSections.reduce(
    (sum, section) => sum + String(section.title || "").length + (section.items || []).join(" ").length,
    0,
  );
  const needsAppendix = printableScopeSections.length > 5 || totalItems > 22 || scopeTextLength > 950;

  if (!needsAppendix) {
    return { mainSections: printableScopeSections, needsAppendix: false };
  }

  return {
    needsAppendix: true,
    mainSections: printableScopeSections.slice(0, 5).map((section) => ({
      ...section,
      items: [
        ...(section.items || []).slice(0, 3),
        ...((section.items || []).length > 3 ? ["Additional scope items noted in Appendix."] : []),
      ],
    })),
  };
}

function buildExclusionsSummary(exclusions = [], assumptions = []) {
  const printableExclusions = cleanPrintableTextList(exclusions);
  const printableAssumptions = cleanPrintableTextList(assumptions);
  const exclusionsTextLength = printableExclusions.join(" ").length;
  const assumptionsTextLength = printableAssumptions.join(" ").length;
  const needsAppendix =
    printableExclusions.length > 6 ||
    printableAssumptions.length > 4 ||
    exclusionsTextLength > 520 ||
    assumptionsTextLength > 420;

  if (!needsAppendix) {
    return { mainExclusions: printableExclusions, needsAppendix: false };
  }

  return {
    needsAppendix: true,
    mainExclusions: [...printableExclusions.slice(0, 5), "See Appendix for detailed exclusions and assumptions."],
  };
}

function buildLineItemSummary(lineItems = []) {
  const lineItemTextLength = lineItems.map((item) => item.description).join(" ").length;
  const needsAppendix = lineItems.length > 8 || lineItemTextLength > 760;

  return {
    needsAppendix,
    mainLineItems: needsAppendix ? lineItems.slice(0, 8) : lineItems,
  };
}

function buildPricingSectionSummary(pricingSections = []) {
  const fullSections = getVisiblePricingSections(pricingSections);
  const pricingTextLength = fullSections
    .map((section) => `${section.label} ${section.description} ${section.amount}`)
    .join(" ").length;
  const needsAppendix =
    fullSections.length >= 4 ||
    pricingTextLength > 620 ||
    fullSections.some((section) => String(section.description || "").length > 90);

  if (!needsAppendix) {
    return { fullSections, mainSections: fullSections, needsAppendix: false };
  }

  return {
    fullSections,
    needsAppendix: true,
    mainSections: fullSections.slice(0, 4).map((section) => ({
      ...section,
      description: truncateText(section.description, 72),
    })),
  };
}

function buildGcPrimeSummary(gcPrime = {}) {
  const rfiText = getAppendixTextValue(cleanPrintableTextBlock(gcPrime.rfiClarificationNotes || gcPrime.rfiNotes));
  const addendaText = getAppendixTextValue(cleanPrintableTextBlock(gcPrime.addendaAcknowledged));
  const gcPrimeNotesText = getAppendixTextValue(cleanPrintableTextBlock(gcPrime.gcPrimeNotes));
  const rfiNeedsAppendix = rfiText.length > 0;
  const addendaNeedsAppendix = addendaText.length > 80 || splitAppendixText(addendaText).length > 1;
  const mainGcPrime = {
    ...gcPrime,
    rfiClarificationNotes: rfiNeedsAppendix ? "See Appendix for RFI / clarification backup." : gcPrime.rfiClarificationNotes,
    addendaAcknowledged: addendaNeedsAppendix ? "See Appendix for addenda acknowledgement." : gcPrime.addendaAcknowledged,
  };

  return {
    mainGcPrime,
    rfiText,
    addendaText,
    gcPrimeNotesText,
    rfiNeedsAppendix,
    addendaNeedsAppendix,
  };
}

function buildAppendixReferenceNotes(flags) {
  const topics = [];

  if (flags.scopeNeedsAppendix) {
    topics.push("detailed scope");
  }

  if (flags.exclusionsNeedsAppendix) {
    topics.push("exclusions / assumptions");
  }

  if (flags.lineItemsNeedAppendix) {
    topics.push("takeoff backup");
  }

  if (flags.pricingNeedsAppendix) {
    topics.push("alternate detail");
  }

  if (flags.hasRfiAppendix || flags.hasAddendaAppendix || flags.hasNotesAppendix) {
    topics.push("clarifications and proposal notes");
  }

  return topics.length > 0 ? [`See Appendix for ${formatTopicList(topics)}.`] : [];
}

function paginateAppendixSections(sections) {
  const pages = [];
  let currentSections = [];
  let currentEstimate = 0;
  const maxEstimate = 34;

  sections.forEach((section) => {
    const estimate = estimateAppendixSectionSize(section);

    if (currentSections.length > 0 && currentEstimate + estimate > maxEstimate) {
      pages.push({ title: "Proposal Appendix", sections: currentSections });
      currentSections = [];
      currentEstimate = 0;
    }

    currentSections.push(section);
    currentEstimate += estimate;
  });

  if (currentSections.length > 0) {
    pages.push({ title: "Proposal Appendix", sections: currentSections });
  }

  return pages;
}

function estimateAppendixSectionSize(section) {
  if (section.kind === "scope") {
    return 3 + section.groups.reduce((sum, group) => sum + 1 + (group.items?.length || 0), 0);
  }

  if (section.kind === "listGroups") {
    return 3 + section.groups.reduce((sum, group) => sum + 1 + (group.items?.length || 0), 0);
  }

  if (section.kind === "pricing") {
    return 5 + section.sections.length;
  }

  if (section.kind === "takeoff") {
    return 5 + section.lineItems.length + splitAppendixText(section.text).length;
  }

  return 3 + splitAppendixText(section.text).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 95)), 0);
}

function formatTopicList(topics) {
  if (topics.length <= 1) {
    return topics[0] || "backup details";
  }

  if (topics.length === 2) {
    return `${topics[0]} and ${topics[1]}`;
  }

  return `${topics.slice(0, -1).join(", ")}, and ${topics[topics.length - 1]}`;
}

function getAppendixTextValue(value) {
  return cleanPrintableTextBlock(value);
}

function splitAppendixText(text) {
  return getAppendixTextValue(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function truncateText(value, maxLength) {
  const textValue = String(value || "").trim();

  if (textValue.length <= maxLength) {
    return textValue;
  }

  return `${textValue.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function buildTermsCopy(terms) {
  const normalizedTerms = terms || {};
  const copyParts = [
    normalizedTerms.payment,
    normalizedTerms.depositText,
    normalizedTerms.progressBilling,
    normalizedTerms.acceptance,
  ].filter(hasPrintableText);

  return copyParts.length > 0 ? `Payment terms: ${copyParts.join(" ")}` : "";
}

function buildConcreteSpecRows(concreteSpecs = {}, options = {}) {
  const rows = [
    ["Estimated Square Feet", concreteSpecs.estimatedSquareFeet],
    ["Estimated Cubic Yards", concreteSpecs.estimatedCubicYards],
    ["Thickness", concreteSpecs.thickness],
    ["Concrete Strength", concreteSpecs.psi],
    ["Slump", concreteSpecs.slump],
    ["Air Entrainment", concreteSpecs.airEntrainment],
    ["Fiber Mesh", formatBooleanSpec(concreteSpecs.fiberMesh)],
    ["Rebar / Mesh", concreteSpecs.rebarMeshDetails],
    ["Finishes", concreteSpecs.finishType],
    ["Control Joint Spacing", concreteSpecs.controlJointSpacing],
    ["Saw Cut Timing", concreteSpecs.sawCutTiming],
    ["Cure / Sealer Notes", concreteSpecs.cureSealerNotes],
    ["Concrete Supplier", concreteSpecs.concreteSupplier],
    ["Pump Required", formatBooleanSpec(concreteSpecs.pumpRequired)],
    ["Truck Access Notes", concreteSpecs.truckAccessNotes],
  ];

  if (options.residential) {
    const residentialRows = [
      ["Thickness", concreteSpecs.thickness],
      ["Reinforcement", concreteSpecs.rebarMeshDetails || concreteSpecs.reinforcement],
      ["Finish", concreteSpecs.finishType || concreteSpecs.finish],
      ["Control Joints", concreteSpecs.controlJointSpacing || concreteSpecs.controlJoints],
      ["Truck / Access Notes", concreteSpecs.truckAccessNotes || concreteSpecs.accessNotes],
    ];

    return residentialRows.filter(([, value]) => hasSpecValue(value));
  }

  return rows.filter(([, value]) => hasSpecValue(value));
}

function formatBooleanSpec(value) {
  if (typeof value !== "boolean") {
    return value;
  }

  return value ? "Yes" : "No";
}

function hasSpecValue(value) {
  if (typeof value === "boolean") {
    return true;
  }

  return hasPrintableText(value);
}

function buildGcPrimeRows(gcPrime = {}) {
  const textRows = [
    ["GC / Prime", gcPrime.contractorName],
    ["Project Manager", gcPrime.projectManagerName],
    ["PM Phone", gcPrime.projectManagerPhone],
    ["PM Email", gcPrime.projectManagerEmail],
    ["Bid Package", gcPrime.bidPackageNumber],
    ["Spec Section", gcPrime.specSection],
    ["Drawings", gcPrime.drawingReferences],
    ["Addenda", gcPrime.addendaAcknowledged],
    ["Access / Badging", gcPrime.jobsiteAccessBadgingRequirements],
    ["Retainage", formatRetainage(gcPrime.retainagePercentage)],
    ["Pay App Terms", gcPrime.paymentApplicationTerms],
    ["Change Orders", gcPrime.changeOrderProcess],
    ["RFI Notes", gcPrime.rfiClarificationNotes],
  ].filter(([, value]) => hasTextValue(value));

  const requirementRows = [
    ["Prevailing Wage", gcPrime.prevailingWageRequired],
    ["Certified Payroll", gcPrime.certifiedPayrollRequired],
    ["Insurance Cert", gcPrime.insuranceCertificateRequired],
    ["W-9", gcPrime.w9Required],
    ["Safety Orientation", gcPrime.safetyOrientationRequired],
  ]
    .filter(([, value]) => value === true)
    .map(([label]) => [label, "Yes"]);

  return [...textRows, ...requirementRows];
}

function hasTextValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getProposalDuplicateWarning(proposal = {}, proposals = []) {
  const projectName = normalizeComparableText(proposal.project?.name);
  const clientName = normalizeComparableText(proposal.client?.companyName || proposal.client?.contactName);

  if (!projectName || !clientName) {
    return "";
  }

  const duplicate = proposals.some((existingProposal) => {
    if (existingProposal.id === proposal.id) {
      return false;
    }

    return (
      normalizeComparableText(existingProposal.project?.name) === projectName &&
      normalizeComparableText(existingProposal.client?.companyName || existingProposal.client?.contactName) === clientName
    );
  });

  return duplicate ? "Possible duplicate found. Review existing records before continuing." : "";
}

function getBidDuplicateWarning(bid = {}, bids = []) {
  const projectName = normalizeComparableText(bid.projectName);
  const projectLocation = normalizeComparableText(bid.projectLocation);

  if (!projectName || !projectLocation) {
    return "";
  }

  const duplicate = bids.some((existingBid) => {
    if (existingBid.id === bid.id) {
      return false;
    }

    return normalizeComparableText(existingBid.projectName) === projectName && normalizeComparableText(existingBid.projectLocation) === projectLocation;
  });

  return duplicate ? "Possible duplicate found. Review existing records before continuing." : "";
}

function getPriceLibraryDuplicateWarning(item = {}, items = []) {
  const itemName = normalizeComparableText(item.name);
  const itemCategory = normalizeComparableText(item.category);

  if (!itemName || !itemCategory) {
    return "";
  }

  const duplicate = items.some((existingItem) => {
    if (existingItem.id === item.id) {
      return false;
    }

    return normalizeComparableText(existingItem.name) === itemName && normalizeComparableText(existingItem.category) === itemCategory;
  });

  return duplicate ? "Possible duplicate found. Review existing records before continuing." : "";
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isQaTestRecord(value = {}) {
  const searchableText = [
    value.proposalNumber,
    value.projectName,
    value.projectLocation,
    value.gcCompany,
    value.ownerOrClient,
    value.name,
    value.companyName,
    value.contactName,
    value.client?.companyName,
    value.client?.contactName,
    value.project?.name,
    value.project?.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes("qa test");
}

function formatRetainage(value) {
  if (!hasTextValue(value)) {
    return "";
  }

  const textValue = String(value).trim();
  return textValue.includes("%") ? textValue : `${textValue}%`;
}

function getDefaultConcreteSpecs() {
  return {
    estimatedSquareFeet: "",
    estimatedCubicYards: "",
    thickness: "",
    psi: "",
    slump: "",
    airEntrainment: "",
    fiberMesh: false,
    rebarMeshDetails: "",
    finishType: "",
    controlJointSpacing: "",
    sawCutTiming: "",
    cureSealerNotes: "",
    concreteSupplier: "",
    pumpRequired: false,
    truckAccessNotes: "",
  };
}

function getDefaultGcPrime() {
  return {
    contractorName: "",
    projectManagerName: "",
    projectManagerPhone: "",
    projectManagerEmail: "",
    bidPackageNumber: "",
    specSection: "",
    drawingReferences: "",
    addendaAcknowledged: "",
    prevailingWageRequired: false,
    certifiedPayrollRequired: false,
    insuranceCertificateRequired: false,
    w9Required: false,
    safetyOrientationRequired: false,
    jobsiteAccessBadgingRequirements: "",
    retainagePercentage: "",
    paymentApplicationTerms: "",
    changeOrderProcess: "",
    rfiClarificationNotes: "",
    addendaRegister: [],
    rfiRegister: [],
    scopeControlSummary: getDefaultScopeControlSummary(),
  };
}

function toEditableNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}
