import { useEffect, useState } from "react";
import { LoginView } from "./components/auth/LoginView.jsx";
import { BackupRestorePanel } from "./components/backup/BackupRestorePanel.jsx";
import { BackupView } from "./components/backup/BackupView.jsx";
import { Badge, StatusBadge } from "./components/common/Badges.jsx";
import { CloudStatusCard } from "./components/settings/CloudStatusCard.jsx";
import { TeamAccessPanel } from "./components/settings/TeamAccessPanel.jsx";
import { AppChrome } from "./components/shell/AppChrome.jsx";
import { LocalModeBanner } from "./components/shell/LocalModeBanner.jsx";
import {
  LINE_ITEM_UNITS,
  PRICING_SECTION_TYPES,
  PROPOSAL_TEMPLATES,
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  SEED_PROPOSAL,
  applyTemplateToProposal,
  calculateProposalTotals,
  formatCurrency,
  generateProposalNumber,
  validateProposalCompleteness,
} from "./proposalData.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { TEAM_INVITE_ROLES, canManageTeamAccess, formatTeamRole, normalizeTeamMember, normalizeTeamRole } from "./utils/cloud/teamAccess.js";
import { formatCloudSyncTime, formatDashboardDate, formatDisplayDate, formatOptionLabel } from "./utils/formatting/display.js";
import { parseSmartPasteNotes } from "./utils/smartPaste/smartPasteParser.js";

const logoSrc = "/assets/last-yard-logo.jpg";
const storageKey = "last-yard-proposals-v1";
const companySettingsStorageKey = "last-yard-company-settings-v1";
const contactsStorageKey = "last-yard-contacts-v1";
const proposalAssetsBucket = "last-yard-proposal-assets";
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
const CONTACT_TYPES = [
  "",
  "GC / Prime",
  "Commercial Client",
  "Residential Client",
  "Property Manager",
  "Builder",
  "Other",
];

const trustCards = [
  ["shield", "PROVEN RELIABILITY", "On time. On budget. Built to last."],
  ["tools", "QUALITY CRAFTSMANSHIP", "Clean finishes. Sharp details. Premium materials."],
  ["hardhat", "SAFETY FIRST", "Safe jobsites for your team and ours."],
  ["handshake", "BUILT ON INTEGRITY", "Clear communication. Honest work. Local service."],
];

const defaultProjectPhotos = [
  { label: "Architectural Steps", src: "" },
  { label: "Finished Flatwork", src: "" },
  { label: "Control Joints", src: "" },
];

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
  const isProposalDraftView = route.view === "new" || route.view === "edit";
  const proposalValidation = validateProposalCompleteness(proposalDraft);

  useEffect(() => {
    saveStoredProposals(savedProposals);
  }, [savedProposals]);

  useEffect(() => {
    saveStoredContacts(savedContacts);
  }, [savedContacts]);

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
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
        setProposalDirty(false);
        setProposalDraft(getInitialProposalForRoute(nextRoute, savedProposals, companySettings));
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
    setSaveMessage("");
    setValidationNotice("");
    setSmartPasteResult(null);
    setBackupMessage("");
    setAssetUploadMessage("");
  }, [route.path]);

  useEffect(() => {
    function handlePrintShortcut(event) {
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p";

      if (!isPrintShortcut || isDashboardView || isListView || isSettingsView || isBackupView || isContactsView || isLoginView) {
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
  }, [isBackupView, isContactsView, isDashboardView, isListView, isLoginView, isSettingsView, proposalDraft]);

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

  function updateProposalField(path, value) {
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const nextProposal = updateNestedValue(currentProposal, path, value);

      if (path === "proposalType") {
        nextProposal.type = value;
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
      setProposalDirty(false);
      setProposalDraft(
        options.proposal ? createEditableProposal(options.proposal) : getInitialProposalForRoute(nextRoute, savedProposals, companySettings),
      );
    }

    return true;
  }

  function openProposal(proposalId) {
    const proposal = savedProposals.find((item) => item.id === proposalId);
    if (!proposal) {
      return;
    }

    navigate(`/proposals/${proposalId}`, { proposal });
  }

  function createNewProposal() {
    const proposal = createNewProposalDraft(savedProposals, companySettings);
    navigate("/proposals/new", { proposal });
  }

  function createNewProposalFromTemplate(templateId) {
    const proposal = createEditableProposal(applyTemplateToProposal(templateId, createNewProposalDraft(savedProposals, companySettings)));
    navigate("/proposals/new", { proposal });
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
    const template = PROPOSAL_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    const shouldConfirm = proposalDirty || Boolean(proposalDraft.templateId);

    if (shouldConfirm && !window.confirm(`Use the ${template.name} template? This will replace current scope, pricing, specifications, exclusions, assumptions, terms, and packet defaults.`)) {
      return;
    }

    setProposalDraft((currentProposal) => createEditableProposal(applyTemplateToProposal(templateId, currentProposal)));
    setProposalDirty(false);
    setSaveMessage(`Applied ${template.name} template.`);
  }

  function updateSettingsDraft(field, value) {
    setSettingsDraft((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  }

  function saveSettings() {
    const normalizedSettings = normalizeCompanySettings(settingsDraft);
    setCompanySettings(normalizedSettings);
    setSettingsDraft(normalizedSettings);
    setSettingsMessage(getCloudReadyMessage(authUser, "Company settings saved locally. Syncing to cloud...", "Company settings saved locally."));
    syncSettingsToCloud(normalizedSettings);
  }

  function resetSettingsDraft() {
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
      const companyRecord = await ensureCloudCompany(user, companySettings);

      if (isCancelled()) {
        return;
      }

      const settingsResult = await loadOrSeedCloudCompanySettings(companyRecord.id, companySettings);

      if (isCancelled()) {
        return;
      }

      const contactsResult = await loadOrSeedCloudContacts(companyRecord.id, savedContacts);

      if (isCancelled()) {
        return;
      }

      const proposalsResult = await loadOrMergeCloudProposals(companyRecord.id, savedProposals);
      const cloudTeamMembers = await fetchCloudTeamMembers(companyRecord.id);
      const syncedAt = new Date().toISOString();

      if (isCancelled()) {
        return;
      }

      setCompanySettings(settingsResult.settings);
      setSettingsDraft(settingsResult.settings);
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
    const normalizedSettings = normalizeCompanySettings(settings);

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
      const companyRecord = await ensureCloudCompany(authUser, normalizedSettings);
      await saveCloudCompanySettings(companyRecord.id, normalizedSettings);
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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      await replaceCloudContacts(companyRecord.id, contacts);
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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      await saveCloudContact(companyRecord.id, contact);

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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
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
    if (!canUseCloudSync(authUser)) {
      setSettingsMessage(getCloudSignInMessage());
      setContactMessage(getCloudSignInMessage());
      return;
    }

    await initializeCloudSync(authUser);
  }

  async function pushLocalDataToCloud() {
    const normalizedSettings = normalizeCompanySettings(settingsDraft);
    setCompanySettings(normalizedSettings);
    setSettingsDraft(normalizedSettings);
    await syncSettingsToCloud(normalizedSettings);
    await syncContactsToCloud(savedContacts);
    await pushLocalProposalsToCloud(savedProposals);
  }

  async function refreshTeamMembers() {
    if (!canUseCloudSync(authUser)) {
      setTeamMessage(getCloudSignInMessage());
      return;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
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

      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      const invitedMember = await createCloudTeamInvite(companyRecord.id, email, role);
      const members = await fetchCloudTeamMembers(companyRecord.id);

      setTeamMembers(members);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
      }));
      setTeamMessage(`Invited ${invitedMember.inviteEmail} as ${formatTeamRole(invitedMember.role)}.`);
    } catch (error) {
      setTeamMessage(`Invite failed: ${error.message}`);
    }
  }

  async function deactivateTeamMember(memberId) {
    if (!canUseCloudSync(authUser)) {
      setTeamMessage(getCloudSignInMessage());
      return;
    }

    if (!canManageTeamAccess(cloudSync.currentRole)) {
      setTeamMessage("Only owner/admin users can manage team access.");
      return;
    }

    if (!window.confirm("Deactivate this team member? This may affect local/cloud data access.")) {
      return;
    }

    try {
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      await deactivateCloudTeamMember(companyRecord.id, memberId);
      const members = await fetchCloudTeamMembers(companyRecord.id);

      setTeamMembers(members);
      setCloudSync((currentSync) => ({
        ...currentSync,
        companyId: companyRecord.id,
        currentRole: companyRecord.role || currentSync.currentRole || "owner",
      }));
      setTeamMessage("Team member deactivated.");
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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      await saveCloudProposal(companyRecord.id, proposal);

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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      await saveCloudProposals(companyRecord.id, proposals);

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
    const synced = await syncMultipleProposalsToCloud(proposals, `Pushed ${proposals.length} local proposal${proposals.length === 1 ? "" : "s"} to Supabase.`);

    if (synced) {
      setSaveMessage(`Pushed ${proposals.length} proposal${proposals.length === 1 ? "" : "s"} to Supabase.`);
    }
  }

  async function pullCloudProposals() {
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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      const cloudProposals = await fetchCloudProposals(companyRecord.id);
      const mergeResult = mergeProposalCollections(savedProposals, cloudProposals);
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
      const companyRecord = await ensureCloudCompany(authUser, companySettings);
      const cloudProposals = await fetchCloudProposals(companyRecord.id);
      const mergeResult = mergeProposalCollections(savedProposals, cloudProposals);

      await saveCloudProposals(companyRecord.id, mergeResult.proposals);
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
    setContactDraft(createEmptyContact());
    setContactEditorOpen(true);
    setContactMessage("Ready for a new contact.");
    navigate("/contacts");
  }

  function editContact(contact) {
    setContactDraft(normalizeContact(contact));
    setContactEditorOpen(true);
    setContactMessage(`Editing ${formatContactName(contact)}.`);
  }

  function updateContactDraft(field, value) {
    setContactDraft((currentContact) => ({
      ...currentContact,
      [field]: value,
    }));
  }

  async function saveContact() {
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
    await syncSingleContactToCloud(normalizedContact);
  }

  async function deleteContact(contactId) {
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
    await deleteSingleCloudContact(contactId);
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

  async function signOut() {
    if (!isSupabaseConfigured || !supabase) {
      setAuthUser(null);
      setAuthMessage("Supabase is not configured. The app is running in local mode.");
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
    setAuthMessage("Signed out. Local browser storage remains available.");
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
        setSaveMessage("Saved locally and synced to cloud.");
      }
    } else {
      setSaveState((currentState) => ({
        ...currentState,
        isSaving: false,
        status: "Saved locally",
      }));
      setSaveMessage("Saved locally.");
    }

    if (route.view === "new") {
      navigate(`/proposals/${proposalToSave.id}`, { proposal: proposalToSave, replace: true, skipUnsavedCheck: true });
    }
  }

  async function saveSubmittedPacketRecord() {
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
  }

  function updateSubmittedPacketRecord(recordId, field, value) {
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
    await syncMultipleProposalsToCloud([sourceProposal, revision], `Created ${revision.revisionLabel} and synced it to Supabase.`);
  }

  async function duplicateCurrentProposal(proposal = proposalDraft) {
    const duplicate = duplicateProposalDraft(proposal, savedProposals);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, duplicate));
    navigate(`/proposals/${duplicate.id}`, { proposal: duplicate, skipUnsavedCheck: true });
    setSaveMessage(getCloudReadyMessage(authUser, "Duplicated locally. Syncing to cloud...", "Duplicated as a new draft."));
    await syncSingleProposalToCloud(duplicate, "Duplicate synced to Supabase.");
  }

  async function updateCurrentStatus(status) {
    const updatedProposal = applyStatusTracking({ ...proposalDraft, updatedAt: new Date().toISOString() }, status);
    setProposalDraft(updatedProposal);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    setSaveMessage(getCloudReadyMessage(authUser, `Marked as ${formatOptionLabel(status)} locally. Syncing to cloud...`, `Marked as ${formatOptionLabel(status)}.`));
    await syncSingleProposalToCloud(updatedProposal, `Status updated to ${formatOptionLabel(status)} in Supabase.`);
  }

  async function updateListProposalStatus(proposal, status) {
    const updatedProposal = applyStatusTracking({ ...proposal, updatedAt: new Date().toISOString() }, status);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    await syncSingleProposalToCloud(updatedProposal, `Status updated to ${formatOptionLabel(status)} in Supabase.`);
  }

  function exportProposalBackup(proposal = proposalDraft) {
    try {
      downloadJsonFile(createProposalExport(proposal), getCurrentProposalBackupFileName(proposal));
      setBackupMessage(`Exported ${proposal.proposalNumber || "proposal"}.`);
    } catch (error) {
      setBackupMessage(`Export failed: ${error.message}`);
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
    setProposalDirty(true);
    setProposalDraft((currentProposal) => {
      const projectPhotos = normalizeProjectPhotos(currentProposal.projectPhotos).map((photo, photoIndex) =>
        photoIndex === index ? normalizeProjectPhoto({ ...photo, ...updates }, photoIndex) : photo,
      );

      return { ...currentProposal, projectPhotos };
    });
  }

  async function uploadProjectPhoto(index, file) {
    if (!file) {
      return;
    }

    const attemptedAt = new Date().toISOString();
    const uploadType = `Featured photo ${index + 1}`;
    const localReason = getAssetLocalStorageReason(authUser);
    setStorageDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      companyId: cloudSync.companyId || currentDiagnostics.companyId,
      errorMessage: "",
      lastAttemptedAt: attemptedAt,
      lastFileName: file.name || `photo-${index + 1}`,
      lastFileSize: file.size || 0,
      lastPublicUrl: "",
      lastStatus: canUseCloudSync(authUser) ? "uploading" : "local fallback",
      lastStoragePath: "",
      lastUploadType: uploadType,
    }));
    setAssetUploadMessage(
      canUseCloudSync(authUser) ? `Uploading image to cloud: featured/photo-${index + 1}-...` : `Saved locally only. Reason: ${localReason}`,
    );

    try {
      const asset = canUseCloudSync(authUser)
        ? await uploadProposalAssetToCloud(file, {
            area: "featured",
            companySettings,
            companyUser: authUser,
            fileStem: `photo-${index + 1}`,
            proposalId: proposalDraft.id,
          })
        : await createLocalImageAsset(file);

      const projectPhotos = normalizeProjectPhotos(proposalDraft.projectPhotos).map((photo, photoIndex) =>
        photoIndex === index
          ? normalizeProjectPhoto({
              ...photo,
              ...asset,
              caption: photo.caption || photo.label,
              label: photo.label,
            }, photoIndex)
          : photo,
      );
      const nextProposal = createEditableProposal({
        ...proposalDraft,
        projectPhotos,
        updatedAt: new Date().toISOString(),
      });

      setProposalDirty(false);
      setProposalDraft(nextProposal);
      setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));

      if (canUseCloudSync(authUser)) {
        await syncSingleProposalToCloud(nextProposal, "Photo uploaded to Supabase Storage and proposal synced.");
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          companyId: asset.companyId || currentDiagnostics.companyId,
          errorMessage: "",
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || asset.fileName || `photo-${index + 1}`,
          lastFileSize: file.size || 0,
          lastPublicUrl: asset.publicUrl || "",
          lastStatus: "success",
          lastStoragePath: asset.storagePath || "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Image uploaded to Supabase Storage: ${asset.storagePath}`);
      } else {
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `Saved locally only. Reason: ${localReason}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || asset.fileName || `photo-${index + 1}`,
          lastFileSize: file.size || 0,
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(
          isSupabaseConfigured
            ? `Saved locally only. Reason: ${localReason}`
            : `Saved locally only. Reason: ${localReason}`,
        );
      }
    } catch (error) {
      console.error("Cloud image upload failed:", error);
      const errorMessage = formatStorageUploadError(error);
      try {
        const localAsset = await createLocalImageAsset(file);
        const projectPhotos = normalizeProjectPhotos(proposalDraft.projectPhotos).map((photo, photoIndex) =>
          photoIndex === index
            ? normalizeProjectPhoto({
                ...photo,
                ...localAsset,
                caption: photo.caption || photo.label,
                label: photo.label,
              }, photoIndex)
            : photo,
        );
        const nextProposal = createEditableProposal({
          ...proposalDraft,
          projectPhotos,
          updatedAt: new Date().toISOString(),
        });

        setProposalDirty(false);
        setProposalDraft(nextProposal);
        setSavedProposals((currentProposals) => upsertProposal(currentProposals, nextProposal));
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || localAsset.fileName || `photo-${index + 1}`,
          lastFileSize: file.size || 0,
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Cloud upload failed: ${errorMessage}. Saved locally only. Reason: cloud upload failed.`);
      } catch (localError) {
        console.error("Local image fallback failed:", localError);
        const localErrorMessage = formatStorageUploadError(localError);
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `${errorMessage} Local fallback failed: ${localErrorMessage}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || `photo-${index + 1}`,
          lastFileSize: file.size || 0,
          lastPublicUrl: "",
          lastStatus: "failed",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Cloud upload failed: ${errorMessage}. Local fallback failed: ${localErrorMessage}`);
      }
    }
  }

  function updatePlanSheet(index, field, value) {
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
    if (!file) {
      return;
    }

    const sheets = normalizePlanSheets(proposalDraft.planSheets);
    const sheet = sheets[index] || {};
    const attemptedAt = new Date().toISOString();
    const uploadType = "Plan sheet image";
    const localReason = getAssetLocalStorageReason(authUser);
    const planFileStem = sanitizeStoragePathSegment(sheet.id || sheet.matchKey || `plan-${index + 1}`);

    setStorageDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      companyId: cloudSync.companyId || currentDiagnostics.companyId,
      errorMessage: "",
      lastAttemptedAt: attemptedAt,
      lastFileName: file.name || planFileStem,
      lastFileSize: file.size || 0,
      lastPublicUrl: "",
      lastStatus: canUseCloudSync(authUser) ? "uploading" : "local fallback",
      lastStoragePath: "",
      lastUploadType: uploadType,
    }));
    setAssetUploadMessage(
      canUseCloudSync(authUser)
        ? `Uploading image to cloud: plans/${planFileStem}-...`
        : `Saved locally only. Reason: ${localReason}`,
    );

    try {
      const asset = canUseCloudSync(authUser)
        ? await uploadProposalAssetToCloud(file, {
            area: "plans",
            companySettings,
            companyUser: authUser,
            fileStem: sheet.id || sheet.matchKey || `plan-${index + 1}`,
            proposalId: proposalDraft.id,
          })
        : await createLocalImageAsset(file);

      const planSheets = sheets.map((currentSheet, sheetIndex) =>
        sheetIndex === index
          ? normalizePlanSheet({
              ...currentSheet,
              ...asset,
              imageSrc: asset.src,
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
          companyId: asset.companyId || currentDiagnostics.companyId,
          errorMessage: "",
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || asset.fileName || planFileStem,
          lastFileSize: file.size || 0,
          lastPublicUrl: asset.publicUrl || "",
          lastStatus: "success",
          lastStoragePath: asset.storagePath || "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Image uploaded to Supabase Storage: ${asset.storagePath}`);
      } else {
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `Saved locally only. Reason: ${localReason}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || asset.fileName || planFileStem,
          lastFileSize: file.size || 0,
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(
          isSupabaseConfigured
            ? `Saved locally only. Reason: ${localReason}`
            : `Saved locally only. Reason: ${localReason}`,
        );
      }
    } catch (error) {
      console.error("Cloud image upload failed:", error);
      const errorMessage = formatStorageUploadError(error);
      try {
        const localAsset = await createLocalImageAsset(file);
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
          lastPublicUrl: "",
          lastStatus: "local fallback",
          lastStoragePath: "",
          lastUploadType: uploadType,
        }));
        setAssetUploadMessage(`Cloud upload failed: ${errorMessage}. Saved locally only. Reason: cloud upload failed.`);
      } catch (localError) {
        console.error("Local image fallback failed:", localError);
        const localErrorMessage = formatStorageUploadError(localError);
        setStorageDiagnostics((currentDiagnostics) => ({
          ...currentDiagnostics,
          errorMessage: `${errorMessage} Local fallback failed: ${localErrorMessage}`,
          lastAttemptedAt: attemptedAt,
          lastFileName: file.name || planFileStem,
          lastFileSize: file.size || 0,
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
      const companyRecord = await ensureCloudCompany(activeUser, companySettings);
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
    } catch (error) {
      console.error("Supabase Storage diagnostic upload failed:", error);
      const errorMessage = formatStorageUploadError(error);
      setStorageDiagnostics((currentDiagnostics) => ({
        ...currentDiagnostics,
        errorMessage,
        lastStatus: "failed",
      }));
      setSettingsMessage(`Test Storage Upload failed: ${errorMessage}`);
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

  function fillProposalFromNotes() {
    const { proposal: parsedProposal, summary } = parseSmartPasteNotes(smartPasteNotes, proposalDraft);

    if (
      summary.fields.length === 0 &&
      summary.lineItemCount === 0 &&
      summary.pricingSectionCount === 0 &&
      summary.planSheetCount === 0 &&
      summary.gcPacketTableCount === 0 &&
      summary.sectionsCaptured.length === 0
    ) {
      setSmartPasteResult({
        fields: [],
        lineItemCount: 0,
        pricingSectionCount: 0,
        planSheetCount: 0,
        gcPacketTableCount: 0,
        sectionsCaptured: [],
        warnings: summary.warnings.length > 0 ? summary.warnings : ["No clearly labeled proposal fields were found."],
      });
      return;
    }

    setProposalDirty(true);
    setProposalDraft(createEditableProposal(linkProposalToMatchingContact(parsedProposal, savedContacts)));
    setSmartPasteResult(summary);
  }

  function exportBackup(type) {
    try {
      if (type === "current") {
        exportProposalBackup(proposalDraft);
        return;
      }

      if (type === "all") {
        downloadJsonFile(createAllProposalsExport(savedProposals), getAllProposalsBackupFileName());
        setBackupMessage(`Exported ${savedProposals.length} proposals.`);
        return;
      }

      if (type === "settings") {
        downloadJsonFile(createCompanySettingsExport(companySettings), getCompanySettingsBackupFileName());
        setBackupMessage("Exported company settings.");
        return;
      }

      if (type === "contacts") {
        downloadJsonFile(createContactsExport(savedContacts), getContactsBackupFileName());
        setBackupMessage(`Exported ${savedContacts.length} contacts.`);
        return;
      }

      if (type === "full") {
        downloadJsonFile(createFullAppBackup(savedProposals, companySettings, savedContacts), getFullBackupFileName());
        setBackupMessage(
          `Exported full app backup with ${savedProposals.length} proposals, ${savedContacts.length} contacts, and company settings.`,
        );
      }
    } catch (error) {
      setBackupMessage(`Export failed: ${error.message}`);
    }
  }

  async function importBackup(type, mode, file) {
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
        return;
      }

      if (type === "settings") {
        const importedSettings = parseCompanySettingsImport(importedJson);

        setCompanySettings(importedSettings);
        setSettingsDraft(importedSettings);
        setBackupMessage("Imported company settings. New proposals will use the restored defaults.");
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
        setCompanySettings(importedBackup.companySettings);
        setSettingsDraft(importedBackup.companySettings);
        setContactDraft(createEmptyContact());
        setContactEditorOpen(false);
        syncDraftAfterProposalRestore(nextProposals);
        markProposalsNeedCloudSync("Imported full backup locally. Use Sync Proposals or Push Local Data to Cloud when ready.");
        setBackupMessage(
          `${mode === "replace" ? "Restored" : "Merged"} full backup with ${importedBackup.proposals.length} proposals, ${importedBackup.contacts.length} contacts, and company settings.`,
        );
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
      canExportCurrent={isProposalDraftView}
      message={backupMessage}
      onExport={exportBackup}
      onImport={importBackup}
    />
  );

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
          onNavigate={navigate}
          onOpenLogin={() => navigate("/login")}
          onSignOut={signOut}
          onNewContact={startNewContact}
          onNewGcPacket={createNewGcPacket}
          onNewProposal={createNewProposal}
        />
      ) : null}
      {!isPrintView && isSupabaseConfigured && !authUser ? <LocalModeBanner onOpenLogin={() => navigate("/login")} /> : null}

      <div className={isPrintView ? "" : "app-content"}>
      {isDashboardView ? (
        <DashboardView
          authUser={authUser}
          cloudSync={cloudSync}
          contacts={savedContacts}
          proposals={savedProposals}
          onCreateCommercialProposal={createNewCommercialProposal}
          onCreateContact={startNewContact}
          onCreateGcPacket={createNewGcPacket}
          onCreateProposal={createNewProposal}
          onCreateResidentialProposal={createNewResidentialProposal}
          onExportBackup={() => navigate("/backup")}
          onLoadDemoData={loadDemoData}
          onOpen={openProposal}
          onOpenContacts={() => navigate("/contacts")}
          onOpenList={() => navigate("/proposals")}
          onOpenPrint={openProposalPrintView}
          onOpenSampleProposal={openSampleProposal}
          onOpenSettings={() => navigate("/settings")}
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
      ) : isSettingsView ? (
        <CompanySettingsView
          authLoading={authLoading}
          authMessage={authMessage}
          authUser={authUser}
          backupTools={backupTools}
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
          backupTools={backupTools}
          cloudSync={cloudSync}
          contacts={savedContacts}
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
              <PrintRouteToolbar
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
                isPrintView={isPrintView}
                proposal={proposalDraft}
                revisionHistory={getRevisionHistory(proposalDraft, savedProposals)}
                saveMessage={saveMessage}
                saveState={saveState}
                onBackToList={() => navigate("/proposals")}
                onCreateRevision={createRevision}
                onCreatePacketRecord={saveSubmittedPacketRecord}
                onDuplicate={() => duplicateCurrentProposal(proposalDraft)}
                onMarkPacketSent={markSubmittedPacketSent}
                onOpenPrintView={openPrintView}
                onSave={saveCurrentProposal}
                onStatusChange={updateCurrentStatus}
                onUpdatePacketRecord={updateSubmittedPacketRecord}
              />
          )}
          {!isPrintView ? backupTools : null}

          <div className={`proposal-workbench ${isPrintView ? "print-route-view" : ""}`}>
            {isPrintView ? null : (
              <ProposalEditor
                proposal={proposalDraft}
                contacts={savedContacts}
                assetUploadMessage={assetUploadMessage}
                showTemplatePicker={route.view === "new"}
                onAddLineItem={addLineItem}
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
                onSmartPasteFill={fillProposalFromNotes}
                onSmartPasteNotesChange={setSmartPasteNotes}
                onSelectContact={applyContactToCurrentProposal}
                smartPasteNotes={smartPasteNotes}
                smartPasteResult={smartPasteResult}
                validation={proposalValidation}
                validationNotice={validationNotice}
              />
            )}
            <div className="preview-pane">
              <ProposalPreview proposal={proposalDraft} />
            </div>
          </div>
        </>
      )}
      </div>
    </main>
  );
}

function DashboardView({
  authUser,
  cloudSync,
  contacts = [],
  proposals,
  onCreateCommercialProposal,
  onCreateContact,
  onCreateGcPacket,
  onCreateProposal,
  onCreateResidentialProposal,
  onExportBackup,
  onLoadDemoData,
  onOpen,
  onOpenContacts,
  onOpenList,
  onOpenPrint,
  onOpenSampleProposal,
  onOpenSettings,
  onPrintSamplePacket,
  onPullCloudProposals,
  onPushLocalProposals,
  onResetDemoData,
  onSyncProposals,
}) {
  const stats = buildDashboardStats(proposals, contacts);
  const recentProposals = getRecentProposals(proposals);
  const followUpProposals = getFollowUpDueProposals(proposals);
  const demoStatus = getDemoStatus(proposals, contacts);

  return (
    <section className="dashboard-panel no-print">
      <div className="dashboard-hero">
        <div>
          <p className="list-kicker">Production dashboard</p>
          <h2>Last Yard Proposal Workspace</h2>
          <p>Track local proposals, GC packets, backup status, and print-ready concrete proposal packets.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={onCreateProposal}>
            New Proposal
          </button>
          <button className="gold-action" type="button" onClick={onCreateGcPacket}>
            New GC Packet
          </button>
          <button type="button" onClick={onCreateCommercialProposal}>
            New Commercial Proposal
          </button>
          <button type="button" onClick={onCreateResidentialProposal}>
            New Residential Proposal
          </button>
          <button type="button" onClick={onCreateContact}>
            New Contact
          </button>
          <button type="button" onClick={onOpenList}>
            Open Proposals
          </button>
          <button type="button" onClick={onOpenContacts}>
            Contacts
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
        onPullCloudProposals={onPullCloudProposals}
        onPushLocalProposals={onPushLocalProposals}
        onSyncProposals={onSyncProposals}
      />

      <DemoOnboardingPanel
        demoStatus={demoStatus}
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

function ContactsView({
  contactDraft,
  contacts,
  isEditorOpen,
  message,
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
          <button type="button" onClick={onNew}>
            New Contact
          </button>
          <button type="button" onClick={onSave} disabled={!isEditorOpen}>
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
              <div className="contact-form-grid">
                <EditorField label="Company Name" path="contact.companyName" value={contactDraft.companyName} onChange={(_, value) => onUpdateDraft("companyName", value)} />
                <EditorField label="Contact Name" path="contact.contactName" value={contactDraft.contactName} onChange={(_, value) => onUpdateDraft("contactName", value)} />
                <EditorField label="Phone" path="contact.phone" value={contactDraft.phone} onChange={(_, value) => onUpdateDraft("phone", value)} />
                <EditorField label="Email" path="contact.email" type="email" value={contactDraft.email} onChange={(_, value) => onUpdateDraft("email", value)} />
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
                  onChange={(_, value) => onUpdateDraft("defaultProjectAddress", value)}
                />
                <div className="contact-wide-field">
                  <EditorField
                    label="Billing Address"
                    path="contact.billingAddress"
                    value={contactDraft.billingAddress}
                    onChange={(_, value) => onUpdateDraft("billingAddress", value)}
                    multiline
                  />
                </div>
                <div className="contact-wide-field">
                  <EditorField
                    label="Notes"
                    path="contact.notes"
                    value={contactDraft.notes}
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
            </>
          ) : (
            <div className="contact-empty-state">
              <p className="list-kicker">Contact details</p>
              <h3>Select a contact to edit, or create a new contact.</h3>
              <p>Saved contacts can fill client and GC information on new proposals without retyping.</p>
              <button type="button" onClick={onNew}>
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
                    <button type="button" onClick={() => onDelete(contact.id)}>
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

function ProposalSummaryRow({ compact = false, contacts = [], onDuplicate, onExport, onOpen, onPrint, proposal }) {
  const total = calculateProposalTotals(proposal).total;
  const packetMode = getPacketModeLabel(proposal);
  const linkedContact = getLinkedContact(proposal, contacts);
  const latestPacketRecord = getLatestSubmittedPacketRecord(proposal);

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
        <StatusBadge status={proposal.status} />
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
          <button type="button" onClick={() => onDuplicate(proposal)}>
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

function ProposalSyncPanel({ authUser, cloudSync, onPullCloudProposals, onPushLocalProposals, onSyncProposals }) {
  const actionsDisabled = cloudSync.loading || !canUseCloudSync(authUser);

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
          <button type="button" onClick={() => onLoadDemoData()}>
            Load Demo Data
          </button>
          <button type="button" onClick={onResetDemoData}>
            Reset Demo Data
          </button>
          <button className="gold-action" type="button" onClick={onStartGcPacket}>
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

function ProposalListView({
  authUser,
  backupTools,
  cloudSync,
  contacts = [],
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
  const filteredProposals = proposals.filter((proposal) => {
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
        <button type="button" onClick={onCreateNew}>
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
      </div>

      {backupTools}

      <ProposalSyncPanel
        authUser={authUser}
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
                        <span>{formatDashboardDate(latestPacketRecord.createdAt)}</span>
                      </>
                    ) : (
                      <Badge className="packet-record-none">No packet record</Badge>
                    )}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <StatusBadge status={proposal.status} />
                    <select value={proposal.status} onChange={(event) => onStatusChange(proposal, event.target.value)}>
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
                      <button type="button" onClick={() => onPrint(proposal)}>
                        Print
                      </button>
                      <button type="button" onClick={() => onDuplicate(proposal)}>
                        Duplicate
                      </button>
                      <button type="button" onClick={() => onExportProposal(proposal)}>
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
  backupTools,
  cloudSync,
  message,
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
          <button type="button" onClick={onReset}>
            Reset Defaults
          </button>
          <button type="button" onClick={onSave}>
            Save Settings
          </button>
        </div>
      </div>

      {backupTools}

      <CloudStatusCard
        authLoading={authLoading}
        authMessage={authMessage}
        authUser={authUser}
        bucketName={proposalAssetsBucket}
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
    </section>
  );
}

function PrintRouteToolbar({ onBackToList, onPrint, onSavePacketRecord }) {
  return (
    <div className="print-route-toolbar no-print">
      <button type="button" onClick={onBackToList}>
        Back to proposals
      </button>
      <button type="button" onClick={onSavePacketRecord}>
        Save Packet Record
      </button>
      <button type="button" onClick={onPrint}>
        Print / Save PDF
      </button>
    </div>
  );
}

function ProposalActionBar({
  isPrintView,
  proposal,
  revisionHistory = [],
  saveMessage,
  saveState,
  onBackToList,
  onCreatePacketRecord,
  onCreateRevision,
  onDuplicate,
  onMarkPacketSent,
  onOpenPrintView,
  onSave,
  onStatusChange,
  onUpdatePacketRecord,
}) {
  const revisedTotal = calculateProposalTotals(proposal).total;
  const previousTotal = toEditableNumber(proposal.previousTotal);
  const packetRecords = normalizeSubmittedPacketRecords(proposal.submittedPacketRecords);

  return (
    <section className="proposal-action-bar no-print">
      <div>
        <p>
          {formatProposalNumberWithRevision(proposal)}
          <span className="revision-inline-date">{formatDisplayDate(proposal.revisionDate || proposal.proposalDate)}</span>
        </p>
        <h2>{proposal.project?.name || "Untitled Proposal"}</h2>
        <div className="revision-summary-line">
          <span>Current total: {formatCurrency(revisedTotal)}</span>
          {previousTotal > 0 ? <span>Previous total: {formatCurrency(previousTotal)}</span> : null}
          <span>Save status: {saveState.status}</span>
          <span>Last saved: {formatCloudSyncTime(saveState.lastLocalSavedAt)}</span>
        </div>
        {saveMessage ? <span>{saveMessage}</span> : null}
      </div>
      <div className="proposal-actions">
        <label>
          <span>Status</span>
          <select value={proposal.status} onChange={(event) => onStatusChange(event.target.value)}>
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
          <button type="button" onClick={onSave} disabled={saveState.isSaving}>
            {saveState.isSaving ? "Saving..." : "Save Draft"}
          </button>
        ) : null}
        <button type="button" onClick={onDuplicate}>
          Duplicate
        </button>
        {!isPrintView ? (
          <button type="button" onClick={onCreateRevision}>
            Create Revision
          </button>
        ) : null}
        {!isPrintView ? (
          <button type="button" onClick={onCreatePacketRecord}>
            Create Packet Record
          </button>
        ) : null}
        {!isPrintView ? (
          <button type="button" onClick={onOpenPrintView}>
            Print View
          </button>
        ) : null}
      </div>
      <RevisionHistory revisions={revisionHistory} currentProposalId={proposal.id} />
      <SubmittedPacketHistory
        records={packetRecords}
        onMarkSent={onMarkPacketSent}
        onUpdateRecord={onUpdatePacketRecord}
      />
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

function SubmittedPacketHistory({ records = [], onMarkSent, onUpdateRecord }) {
  const visibleRecords = normalizeSubmittedPacketRecords(records);

  return (
    <div className="submitted-packet-history">
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
              <div className="submitted-packet-card-main">
                <div>
                  <div className="submitted-packet-card-title">
                    <Badge className={`packet-record-${record.status}`}>{formatOptionLabel(record.status)}</Badge>
                    <strong>{record.revisionLabel || formatRevisionLabel(record.revisionNumber)}</strong>
                    <span>{record.packetTitle}</span>
                  </div>
                  <div className="submitted-packet-meta">
                    <span>Created {formatCloudSyncTime(record.createdAt)}</span>
                    <span>Total {formatCurrency(record.totalAmount)}</span>
                    <span>{record.packetPageCount ? `${record.packetPageCount} page${record.packetPageCount === 1 ? "" : "s"}` : "Page count pending"}</span>
                    {record.sentDate ? <span>Sent {formatDisplayDate(record.sentDate)}</span> : null}
                    {record.sentToName || record.sentToEmail ? <span>To {[record.sentToName, record.sentToEmail].filter(Boolean).join(" | ")}</span> : null}
                  </div>
                </div>
                <div className="submitted-packet-actions">
                  {record.status !== "sent" ? (
                    <button type="button" onClick={() => onMarkSent(record.id)}>
                      Mark Packet as Sent
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="submitted-packet-notes">
                <span>Internal notes</span>
                <textarea
                  value={record.internalNotes || ""}
                  rows={2}
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
  assetUploadMessage = "",
  contacts = [],
  proposal,
  showTemplatePicker = false,
  onAddLineItem,
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
  onAddPlanSheet,
  onPlanSheetChange,
  onPlanSheetImageUpload,
  onRemovePlanSheet,
  onAddGcPacketTableRow,
  onGcPacketTableChange,
  onGcPacketTableRowChange,
  onRemoveGcPacketTableRow,
  onSmartPasteFill,
  onSmartPasteNotesChange,
  onSelectContact,
  validation,
  validationNotice,
  smartPasteNotes,
  smartPasteResult,
}) {
  const proposalTotals = calculateProposalTotals(proposal);
  const isGcPrime = proposal.proposalType === "gc_prime";

  return (
    <aside className="editor-panel no-print" aria-label="Proposal editor">
      <ValidationPanel notice={validationNotice} validation={validation} />

      {showTemplatePicker ? (
        <TemplatePicker currentTemplateId={proposal.templateId} templates={PROPOSAL_TEMPLATES} onApplyTemplate={onApplyTemplate} />
      ) : null}

      <SmartPastePanel
        notes={smartPasteNotes}
        result={smartPasteResult}
        onFill={onSmartPasteFill}
        onNotesChange={onSmartPasteNotesChange}
      />

      <ContactSelector contacts={contacts} proposal={proposal} onSelectContact={onSelectContact} />

      <EditorSection title="Proposal Info">
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

      <EditorSection title="Send / Follow-Up Tracking">
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

      <EditorSection title="Client / Prepared For">
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

      <EditorSection title="Project Summary">
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

      <EditorSection title="Project Photos">
        <ProjectPhotoEditor
          message={assetUploadMessage}
          photos={proposal.projectPhotos}
          onPhotoChange={onProjectPhotoChange}
          onPhotoUpload={onProjectPhotoUpload}
        />
      </EditorSection>

      <EditorSection title="Plan Sheets / Takeoff Pages">
        <PlanSheetEditor
          message={assetUploadMessage}
          planSheets={proposal.planSheets}
          onAddPlanSheet={onAddPlanSheet}
          onPlanSheetImageUpload={onPlanSheetImageUpload}
          onPlanSheetChange={onPlanSheetChange}
          onRemovePlanSheet={onRemovePlanSheet}
        />
      </EditorSection>

      <EditorSection title="GC Packet Tables">
        <GcPacketTablesEditor
          gcPacketTables={proposal.gcPacketTables}
          onAddRow={onAddGcPacketTableRow}
          onChange={onGcPacketTableChange}
          onRemoveRow={onRemoveGcPacketTableRow}
          onRowChange={onGcPacketTableRowChange}
        />
      </EditorSection>

      <EditorSection title="Scope of Work">
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

      <EditorSection title="Concrete Specifications">
        <ConcreteSpecsEditor concreteSpecs={proposal.concreteSpecs} onChange={onConcreteSpecChange} />
      </EditorSection>

      {isGcPrime ? (
        <EditorSection title="GC / Prime Contractor">
          <GcPrimeEditor gcPrime={proposal.gcPrime} onChange={onGcPrimeChange} />
        </EditorSection>
      ) : null}

      <EditorSection title="Legal / Terms Blocks">
        <LegalTermsEditor terms={proposal.terms} onChange={onChange} />
      </EditorSection>

      <EditorSection title="Pricing">
        <LineItemEditor
          lineItems={proposal.lineItems}
          onAddLineItem={onAddLineItem}
          onLineItemChange={onLineItemChange}
          onRemoveLineItem={onRemoveLineItem}
        />

        <PricingSectionsEditor
          pricingSections={proposal.pricingSections}
          onAddPricingSection={onAddPricingSection}
          onPricingSectionChange={onPricingSectionChange}
          onRemovePricingSection={onRemovePricingSection}
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
    </aside>
  );
}

function TemplatePicker({ currentTemplateId, onApplyTemplate, templates }) {
  function useTemplate(event, templateId) {
    event.preventDefault();
    onApplyTemplate(templateId);
  }

  return (
    <EditorSection title="Proposal Template">
      <p className="template-picker-help">
        Choose a starter template to prefill common scope, specs, exclusions, terms, pricing rows, and packet defaults.
      </p>
      <p className="template-picker-help template-picker-guide">
        Choose a template to start faster, or continue editing the current draft.
      </p>
      <p className="starter-data-notice">
        This draft starts with starter template data. Choose a template or edit fields before sending.
      </p>
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

function SmartPastePanel({ notes, result, onFill, onNotesChange }) {
  return (
    <EditorSection title="Paste Project Notes">
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
        Fill Proposal From Notes
      </button>
      {result ? <SmartPasteSummary result={result} /> : null}
    </EditorSection>
  );
}

function SmartPasteSummary({ result }) {
  return (
    <div className="smart-paste-summary" aria-live="polite">
      <strong>Smart Paste Summary</strong>
      <ul>
        <li>{result.fields.length} fields updated</li>
        <li>{result.lineItemCount} line items added</li>
        <li>{result.pricingSectionCount || 0} alternates / allowances added</li>
        <li>{result.planSheetCount || 0} plan / takeoff pages updated</li>
        <li>{result.gcPacketTableCount || 0} structured GC tables updated</li>
        <li>{(result.sectionsCaptured || []).length} sections captured</li>
        {result.fields.length > 0 ? <li>Updated: {result.fields.join(", ")}</li> : null}
        {(result.sectionsCaptured || []).length > 0 ? <li>Captured: {result.sectionsCaptured.join(", ")}</li> : null}
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
    </div>
  );
}

function LineItemEditor({ lineItems, onAddLineItem, onLineItemChange, onRemoveLineItem }) {
  return (
    <div className="line-item-editor">
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

      <button className="editor-add-button" type="button" onClick={onAddLineItem}>
        Add line item
      </button>
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
    <div className="pricing-section-editor">
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
    ["changeOrderLanguage", "Change Order Language"],
    ["weatherSiteReadiness", "Weather / Site Readiness"],
    ["utilityResponsibility", "Utility Responsibility"],
    ["hiddenConditions", "Hidden Conditions"],
    ["concreteCrackingDisclaimer", "Concrete Cracking Disclaimer"],
    ["colorFinishVariationDisclaimer", "Color / Finish Variation Disclaimer"],
    ["warrantyLimitation", "Warranty Limitation"],
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
    <div className="editor-totals">
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

  function handleUpload(index, file) {
    if (!file) {
      return;
    }

    onPhotoUpload(index, file);
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
          <EditorField
            label={`Photo ${index + 1} Caption`}
            path={`projectPhotos.${index}.label`}
            value={photo.label}
            onChange={(_, value) => onPhotoChange(index, { label: value })}
          />
          <label className="editor-field">
            <span>Photo {index + 1} Upload</span>
            <input type="file" accept="image/*" onChange={(event) => handleUpload(index, event.target.files?.[0])} />
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
    <EditorSection title="Select Saved Contact">
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

function EditorSection({ title, children }) {
  return (
    <section className="editor-section">
      <h2>{title}</h2>
      <div className="editor-fields">{children}</div>
    </section>
  );
}

function EditorField({ label, path, value, onChange, type = "text", multiline = false, options }) {
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
        <textarea id={inputId} value={value} rows={3} onChange={(event) => onChange(path, event.target.value)} />
      ) : (
        <input id={inputId} type={type} value={value} onChange={(event) => onChange(path, event.target.value)} />
      )}
    </label>
  );
}

function ProposalPreview({ proposal }) {
  const company = proposal.company;
  const companyCredentials = company.credentials.join(" | ");
  const isGcPrime = proposal.proposalType === "gc_prime";
  const appendixPlan = buildAppendixPlan(proposal);
  const gcPrimeRows = isGcPrime ? buildGcPrimeRows(appendixPlan.mainGcPrime) : [];
  const scopeSplitIndex = Math.ceil(appendixPlan.mainScopeSections.length / 2);
  const scopeLeft = appendixPlan.mainScopeSections.slice(0, scopeSplitIndex);
  const scopeRight = appendixPlan.mainScopeSections.slice(scopeSplitIndex);
  const specRows = buildConcreteSpecRows(proposal.concreteSpecs);
  const specSplitIndex = Math.ceil(specRows.length / 2);
  const specsLeft = specRows.slice(0, specSplitIndex);
  const specsRight = specRows.slice(specSplitIndex);
  const lineItems = appendixPlan.mainLineItems.map((item, index) => {
    const amount = item.amount ?? toEditableNumber(item.quantity) * toEditableNumber(item.unitPrice);

    return [
      item.itemNumber ?? String(index + 1),
      item.description,
      formatQuantity(item.quantity),
      item.unit,
      formatCurrency(item.unitPrice),
      formatCurrency(amount),
    ];
  });
  const proposalTotals = calculateProposalTotals(proposal);
  const totalProposalPrice = formatCurrency(proposalTotals.total);
  const termsCopy = buildTermsCopy(proposal.terms);
  const visiblePricingSections = appendixPlan.mainPricingSections;
  const structuredPacketPages = buildStructuredPacketPages(proposal);
  const planSheetPages = getEnabledPlanSheets(proposal.planSheets);
  const hasExtendedPacketPages = structuredPacketPages.length > 0 || appendixPlan.pages.length > 0 || planSheetPages.length > 0;
  const showCoverGcPrimeNotes = gcPrimeRows.length > 0 && !hasExtendedPacketPages;
  const firstAppendixPageNumber = structuredPacketPages.length + 3;
  const firstPlanSheetPageNumber = structuredPacketPages.length + appendixPlan.pages.length + 3;

  return (
    <section className="proposal-grid">
      <ProposalPage className="first-page">
        <CoverHeader company={company} />
        <CompanyIntro company={company} companyCredentials={companyCredentials} />
        <ProjectCards proposal={proposal} />
        {showCoverGcPrimeNotes ? <GcPrimeNotes rows={gcPrimeRows} /> : null}
        <div className="page-one-feature-block">
          <PhotoBand photos={proposal.projectPhotos} />
          <WhyChoose />
        </div>
        <PageFooter company={company} companyCredentials={companyCredentials} compact />
      </ProposalPage>

      <ProposalPage>
        <SectionTitle icon="clipboard" title="Scope of Work" />
        <div className="two-column section-pad">
          <ScopeColumn groups={scopeLeft} />
          <ScopeColumn groups={scopeRight} />
        </div>
        {appendixPlan.scopeNeedsAppendix ? <AppendixReferenceNote message="See Appendix for detailed scope backup." /> : null}

        <SectionTitle icon="gear" title="Concrete Specifications" className="section-title-spaced" />
        <div className="two-column spec-grid">
          <SpecTable rows={specsLeft} />
          <SpecTable rows={specsRight} />
        </div>

        <SectionTitle icon="dollar" title="Pricing" className="section-title-spaced" />
        <PricingTable items={lineItems} total={totalProposalPrice} />
        {visiblePricingSections.length > 0 ? (
          <AlternatesAllowancesTable sections={visiblePricingSections} totals={proposalTotals} />
        ) : null}

        <div className="two-column lower-grid">
          <div>
            <MiniHeading icon="minus" title="Exclusions / Assumptions" />
            <ul className="bullet-list compact-list">
              {appendixPlan.mainExclusions.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <MiniHeading icon="check" title="Terms & Acceptance" />
            <p className="terms-copy">{termsCopy}</p>
            <SignatureBlock companyName={company.name} />
          </div>
        </div>
        {appendixPlan.referenceNotes.length > 0 ? <AppendixReferenceNote notes={appendixPlan.referenceNotes} /> : null}

        <div className="footer-push">
          <PageFooter company={company} companyCredentials={companyCredentials} />
        </div>
      </ProposalPage>

      {structuredPacketPages.map((page, index) => (
        <StructuredPacketPage
          company={company}
          key={page.key}
          page={page}
          pageNumber={index + 3}
          projectName={proposal.project?.name}
        />
      ))}

      {appendixPlan.pages.map((page, index) => (
        <AppendixPage
          company={company}
          key={`appendix-page-${index}`}
          page={page}
          pageNumber={firstAppendixPageNumber + index}
          projectName={proposal.project?.name}
        />
      ))}

      {planSheetPages.map((sheet, index) => (
        <PlanSheetPage
          company={company}
          key={sheet.id || sheet.matchKey || `plan-sheet-page-${index}`}
          pageNumber={firstPlanSheetPageNumber + index}
          projectName={proposal.project?.name}
          sheet={sheet}
        />
      ))}
    </section>
  );
}

function GcPrimeNotes({ rows }) {
  return (
    <section className="gc-prime-notes">
      <InfoCard title="GC / Prime Notes" watermark="GC">
        <div className="gc-prime-note-grid">
          {rows.map(([label, value]) => (
            <p className="gc-prime-note-row" key={label}>
              <span>{label}:</span>
              <span>{value}</span>
            </p>
          ))}
        </div>
      </InfoCard>
    </section>
  );
}

function StructuredPacketPage({ company, page, pageNumber, projectName }) {
  return (
    <ProposalPage className="structured-packet-page">
      <header className="structured-packet-header">
        <div>
          <p>{company.name}</p>
          <h2>{page.title}</h2>
        </div>
        <div>
          <span>Project</span>
          <strong>{projectName || "GC Packet"}</strong>
        </div>
      </header>

      <div className="structured-packet-body">
        <div className="structured-accent" />
        {page.kind === "proposalNotes" ? (
          <StructuredNotesPage page={page} />
        ) : (
          <StructuredTablePage page={page} />
        )}
      </div>

      <footer className="structured-packet-footer">
        <span>{projectName || "Proposal packet"}</span>
        <span>{company.name}</span>
        <span>Packet Page {pageNumber}</span>
      </footer>
    </ProposalPage>
  );
}

function StructuredTablePage({ page }) {
  return (
    <>
      {page.notes ? <p className="structured-packet-note">{page.notes}</p> : null}
      <table className={`structured-packet-table ${page.kind}`}>
        <thead>
          <tr>
            {page.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row, index) => (
            <tr key={row.id || `${page.key}-row-${index}`}>
              {page.columns.map((column) => (
                <td key={column.key}>{formatStructuredCell(row[column.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function StructuredNotesPage({ page }) {
  return (
    <div className="structured-notes-grid">
      {page.sections.map((section) => (
        <section className="structured-note-card" key={section.title}>
          <h3>{section.title}</h3>
          <StructuredText text={section.text} />
        </section>
      ))}
    </div>
  );
}

function StructuredText({ text }) {
  const lines = splitAppendixText(text);

  if (lines.length === 0) {
    return <p>Not provided.</p>;
  }

  return (
    <>
      {lines.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </>
  );
}

function AppendixReferenceNote({ message, notes = [] }) {
  const noteItems = message ? [message] : notes;

  if (noteItems.length === 0) {
    return null;
  }

  return (
    <div className="appendix-reference">
      {noteItems.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </div>
  );
}

function AppendixPage({ company, page, pageNumber, projectName }) {
  return (
    <ProposalPage className="appendix-page">
      <header className="appendix-header">
        <div>
          <p>{company.name}</p>
          <h2>{page.title}</h2>
        </div>
        <div>
          <span>Project</span>
          <strong>{projectName || "Proposal Appendix"}</strong>
        </div>
      </header>

      <div className="appendix-body">
        {page.sections.map((section) => (
          <AppendixSection key={section.key} section={section} />
        ))}
      </div>

      <footer className="appendix-footer">
        <span>{company.name}</span>
        <span>Appendix Page {pageNumber}</span>
      </footer>
    </ProposalPage>
  );
}

function AppendixSection({ section }) {
  if (section.kind === "scope") {
    return (
      <section className="appendix-section">
        <h3>{section.title}</h3>
        <div className="appendix-two-column">
          {section.groups.map((group) => (
            <div className="appendix-list-group" key={group.title}>
              <h4>{group.title}</h4>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "listGroups") {
    return (
      <section className="appendix-section">
        <h3>{section.title}</h3>
        <div className="appendix-two-column">
          {section.groups.map((group) => (
            <div className="appendix-list-group" key={group.title}>
              <h4>{group.title}</h4>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "takeoff") {
    return (
      <section className="appendix-section">
        <h3>{section.title}</h3>
        <AppendixLineItemTable items={section.lineItems} />
        {section.text ? <AppendixText text={section.text} /> : null}
      </section>
    );
  }

  if (section.kind === "pricing") {
    return (
      <section className="appendix-section">
        <h3>{section.title}</h3>
        <AppendixPricingTable sections={section.sections} totals={section.totals} />
      </section>
    );
  }

  return (
    <section className="appendix-section">
      <h3>{section.title}</h3>
      <AppendixText text={section.text} />
    </section>
  );
}

function AppendixText({ text }) {
  return (
    <div className="appendix-text">
      {splitAppendixText(text).map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

function AppendixLineItemTable({ items }) {
  return (
    <table className="appendix-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const amount = item.amount ?? toEditableNumber(item.quantity) * toEditableNumber(item.unitPrice);

          return (
            <tr key={`${item.itemNumber || index}-${item.description}`}>
              <td>{item.itemNumber || index + 1}</td>
              <td>{item.description}</td>
              <td>{formatQuantity(item.quantity)}</td>
              <td>{item.unit}</td>
              <td>{formatCurrency(item.unitPrice)}</td>
              <td>{formatCurrency(amount)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AppendixPricingTable({ sections, totals }) {
  return (
    <table className="appendix-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Label</th>
          <th>Description</th>
          <th>Status</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {sections.map((section, index) => (
          <tr key={section.id || `${section.type}-${index}`}>
            <td>{formatOptionLabel(section.type)}</td>
            <td>{section.label}</td>
            <td>{section.description || "-"}</td>
            <td>{section.included ? "Included" : "Not Included"}</td>
            <td>{formatPricingSectionAmount(section)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="4">Total Included Alternates / Allowances</td>
          <td>{formatCurrency(totals.includedPricingSectionsTotal)}</td>
        </tr>
        <tr>
          <td colSpan="4">Total if All Alternates Accepted</td>
          <td>{formatCurrency(totals.totalIfAllAlternatesAccepted)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function PlanSheetPage({ company, sheet, pageNumber, projectName }) {
  const calculationNotes = normalizePlanSheetNotes(sheet.calculationNotes);
  const clarificationNotes = normalizePlanSheetNotes(sheet.clarificationNotes);

  return (
    <ProposalPage className="plan-sheet-page">
      <header className="plan-sheet-header">
        <div>
          <p>{formatOptionLabel(sheet.pageType)}</p>
          <h2>{sheet.title || "Plan Takeoff Sheet"}</h2>
        </div>
        <div>
          <span>{sheet.subtitle || projectName || "Takeoff Backup"}</span>
        </div>
      </header>

      <div className="plan-sheet-body">
        <section className="plan-sheet-image-area">
          {sheet.imageSrc ? (
            <img src={sheet.imageSrc} alt={sheet.title || "Uploaded plan sheet"} />
          ) : (
            <div className="plan-sheet-placeholder">
              <span>Upload plan image</span>
            </div>
          )}
        </section>

        <aside className="plan-sheet-notes">
          <div className="plan-notes-box">
            <h3>{sheet.calculationTitle || "Calculation Notes"}</h3>
            {calculationNotes.length > 0 ? (
              <ul>
                {calculationNotes.map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>No calculation notes entered.</p>
            )}
          </div>

          <div className="plan-notes-box clarification-box">
            <h3>Clarifications</h3>
            {clarificationNotes.length > 0 ? (
              <ul>
                {clarificationNotes.map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>No clarification notes entered.</p>
            )}
          </div>
        </aside>
      </div>

      <footer className="plan-sheet-footer">
        <span>{projectName || "Project takeoff backup"}</span>
        <span>{company.name}</span>
        <span>Packet Page {pageNumber}</span>
      </footer>
    </ProposalPage>
  );
}

function ProposalPage({ children, className = "" }) {
  return <article className={`proposal-page ${className}`}>{children}</article>;
}

function LogoSeal({ companyName, logoPath = logoSrc, small = false }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className={`logo-seal ${small ? "logo-seal-small" : ""}`}>
      {logoFailed ? (
        <div className="logo-fallback">
          <span>Last Yard</span>
          <strong>Concrete</strong>
        </div>
      ) : (
        <img src={logoPath || logoSrc} alt={`${companyName} logo`} onError={() => setLogoFailed(true)} />
      )}
    </div>
  );
}

function CoverHeader({ company }) {
  return (
    <header className="cover-header">
      <div className="cover-angle" />
      <div className="cover-inner">
        <LogoSeal companyName={company.name} logoPath={company.logoPath} />
        <div className="cover-copy">
          <h2>Concrete</h2>
          <h2>Proposal</h2>
          <div className="gold-rule wide-rule" />
          <div className="cover-tagline">
            <span className="star-text">{"\u2605\u2605\u2605\u2605\u2605"}</span>
            <span>SOLID WORK. STUNNING RESULTS. EVERY YARD COUNTS.</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CompanyIntro({ company, companyCredentials }) {
  const items = [
    ["user", company.name],
    ["phone", company.phone],
    ["mail", company.email],
    ["pin", company.serviceArea],
    ["shield-small", `${companyCredentials}\n${company.license}`],
  ];

  return (
    <section className="company-intro">
      <div className="contact-list">
        {items.map(([icon, text]) => (
          <div key={text} className="contact-row">
            <span>
              <SvgIcon type={icon} />
            </span>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="intro-copy">
        <div className="intro-watermark">LY</div>
        <h3>{company.tagline}</h3>
        <div className="gold-rule short-rule" />
        <p>
          We deliver high-quality concrete solutions built on integrity, craftsmanship, and attention to every last
          detail.
        </p>
      </div>
    </section>
  );
}

function ProjectCards({ proposal }) {
  const { client, project } = proposal;
  const revisionLabel = proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber);

  return (
    <section className="project-cards">
      <InfoCard title="Prepared For" watermark="CLIENT">
        <p>{client.companyName}</p>
        <p>Attn: {client.contactName}</p>
        <p>{client.title}</p>
        <p>{client.billingAddress || client.address}</p>
        <p>{client.projectAddress || client.cityStateZip}</p>
        <p>Phone: {client.phone}</p>
        <p>Email: {client.email}</p>
      </InfoCard>

      <InfoCard title="Project Summary" watermark="SCOPE">
        <div className="proposal-meta-strip">
          <span>{proposal.proposalNumber}</span>
          <span>{revisionLabel}</span>
          <span>{formatDisplayDate(proposal.revisionDate || proposal.proposalDate)}</span>
        </div>
        <Field label="Project Name" value={project.name} />
        <Field label="Project Location" value={project.location} />
        <Field label="Proposed Schedule" value={project.estimatedDuration || project.proposedSchedule.display} />
        <p className="description-copy">
          <strong>Description: </strong>
          {project.description}
        </p>
      </InfoCard>
    </section>
  );
}

function InfoCard({ title, watermark, children }) {
  return (
    <div className="info-card">
      <div className="card-watermark">{watermark}</div>
      <h4>{title}</h4>
      <div className="gold-rule card-rule" />
      <div className="card-content">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <p className="field-row">
      <span>{label}:</span>
      <span>{value}</span>
    </p>
  );
}

function PhotoBand({ photos = defaultProjectPhotos }) {
  const photoSlots = normalizeProjectPhotos(photos);

  return (
    <section className="photo-band">
      {photoSlots.map((photo, index) => (
        <ConcretePhoto key={`preview-photo-${index}`} photo={photo} variant={["one", "two", "three"][index]} />
      ))}
    </section>
  );
}

function ConcretePhoto({ photo, variant }) {
  const title = photo?.label || defaultProjectPhotos[0].label;
  const imageSource = getImageAssetSource(photo);

  return (
    <div className={`concrete-photo ${variant}`}>
      {imageSource ? <img src={imageSource} alt={title} /> : <div className="photo-texture" />}
      <div className="photo-caption">{title}</div>
    </div>
  );
}

function WhyChoose() {
  return (
    <section className="why-choose">
      <div className="why-heading">
        <div />
        <h3>Why Last Yard Concrete</h3>
        <div />
      </div>
      <div className="trust-grid">
        {trustCards.map(([icon, title, body]) => (
          <div key={title} className="trust-card">
            <div>
              <SvgIcon type={icon} />
            </div>
            <h4>{title}</h4>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ icon, title, className = "" }) {
  return (
    <div className={`section-title ${className}`}>
      <div className="section-title-row">
        <IconBadge icon={icon} />
        <h3>{title}</h3>
        <div className="gold-rule title-rule" />
        <div className="gray-rule" />
      </div>
    </div>
  );
}

function ScopeColumn({ groups }) {
  return (
    <div className="scope-column">
      {groups.map((group) => (
        <div key={group.title}>
          <h4>{group.title}</h4>
          <ul className="bullet-list">
            {group.items.map((item) => (
              <li key={item}>
                <span />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SpecTable({ rows }) {
  return (
    <table className="spec-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Specification</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([item, spec]) => (
          <tr key={item}>
            <td>{item}</td>
            <td>{spec}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PricingTable({ items, total }) {
  return (
    <div className="pricing-wrap">
      <table className="pricing-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`} className={index >= 2 ? "number-cell" : ""}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan="5">Total Proposal Price</td>
            <td>{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AlternatesAllowancesTable({ sections, totals }) {
  return (
    <div className="alternates-wrap">
      <div className="alternates-heading">
        <h4>Alternates / Allowances</h4>
        <span>Included items are reflected in the total proposal price.</span>
      </div>
      <table className="alternates-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Label</th>
            <th>Description</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="base-bid-row">
            <td>Base Bid</td>
            <td>Base scope</td>
            <td>Line item pricing total</td>
            <td>Included</td>
            <td>{formatCurrency(totals.baseBid)}</td>
          </tr>
          {sections.map((section, index) => (
            <tr key={section.id || `${section.type}-${index}`}>
              <td>{formatOptionLabel(section.type)}</td>
              <td>{section.label}</td>
              <td>{section.description || "-"}</td>
              <td>{section.included ? "Included" : "Not Included"}</td>
              <td>{formatPricingSectionAmount(section)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="4">Total Included Alternates / Allowances</td>
            <td>{formatCurrency(totals.includedPricingSectionsTotal)}</td>
          </tr>
          <tr>
            <td colSpan="4">Total if All Alternates Accepted</td>
            <td>{formatCurrency(totals.totalIfAllAlternatesAccepted)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MiniHeading({ icon, title }) {
  return (
    <div className="mini-heading">
      <IconBadge icon={icon} />
      <h3>{title}</h3>
      <div className="gold-rule mini-rule" />
    </div>
  );
}

function IconBadge({ icon }) {
  return (
    <span className="icon-badge">
      <SvgIcon type={icon} />
    </span>
  );
}

function SignatureBlock({ companyName }) {
  const lines = ["By:", "Name:", "Title:", "Date:"];

  return (
    <div className="signature-grid">
      <div>
        <p className="signature-title">{companyName}</p>
        {lines.map((line) => (
          <p key={line} className="signature-line">
            <span>{line}</span>
            <span />
          </p>
        ))}
      </div>
      <div className="client-signature">
        <p className="signature-title">Accepted By Client</p>
        {lines.map((line) => (
          <p key={line} className="signature-line">
            <span>{line}</span>
            <span />
          </p>
        ))}
      </div>
    </div>
  );
}

function SvgIcon({ type }) {
  switch (type) {
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.4 4.8 6.7 6.1c-.7.5-.9 1.4-.5 2.2 2 4 5.4 7.4 9.5 9.5.8.4 1.7.2 2.2-.5l1.3-1.7-3.5-2-1 1.3c-2.4-1.2-4.3-3.1-5.6-5.6l1.3-1-2-3.5Z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="m5 8 7 5 7-5" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s6-5.4 6-10a6 6 0 0 0-12 0c0 4.6 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
      );
    case "shield":
    case "shield-small":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5.5 5.8v5.7c0 4.1 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.1 6.5-9.2V5.8L12 3Z" />
          <path d="m8.8 12 2.1 2.2 4.4-5" />
        </svg>
      );
    case "tools":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 19 5.4-5.4" />
          <path d="m14.7 6.2 3.1 3.1" />
          <path d="m13.8 7.1 2.1-2.1 3.1 3.1-2.1 2.1" />
          <path d="m19 19-6.2-6.2" />
          <path d="m5 5 4.5 4.5" />
          <path d="M4.5 4.5 7 4l-.5 2.5" />
        </svg>
      );
    case "hardhat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 15.5h16" />
          <path d="M6 15.5V13a6 6 0 0 1 12 0v2.5" />
          <path d="M9 15.5V8" />
          <path d="M15 15.5V8" />
          <path d="M3.5 18h17" />
        </svg>
      );
    case "handshake":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7.5 12.5 3.2-3.2c.8-.8 2-.8 2.8 0l.8.8" />
          <path d="m14.5 10.3 2 2c.8.8.8 2 0 2.8l-2.8 2.8c-.8.8-2 .8-2.8 0L7.5 14.5" />
          <path d="m3.8 10.8 3.4-3.4 3 3" />
          <path d="m20.2 10.8-3.4-3.4-2.4 2.4" />
          <path d="m9 16 1.3-1.3" />
          <path d="m11 18 1.3-1.3" />
        </svg>
      );
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="12" height="15" rx="2" />
          <path d="M9 5.5A3 3 0 0 1 12 3a3 3 0 0 1 3 2.5" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      );
    case "gear":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="m5.6 5.6 2.1 2.1" />
          <path d="m16.3 16.3 2.1 2.1" />
          <path d="m18.4 5.6-2.1 2.1" />
          <path d="m7.7 16.3-2.1 2.1" />
        </svg>
      );
    case "dollar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16" />
          <path d="M16 8.2c-.8-1-2-1.5-3.6-1.5-2 0-3.4 1-3.4 2.5 0 3.4 7 1.7 7 5.4 0 1.6-1.5 2.7-3.8 2.7-1.8 0-3.2-.6-4.2-1.8" />
        </svg>
      );
    case "minus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12h12" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
        </svg>
      );
    default:
      return <span>{type}</span>;
  }
}

function PageFooter({ company, companyCredentials, compact = false }) {
  if (compact) {
    return (
      <footer className="page-footer compact-footer">
        <span>{company.name}</span>
        <span>|</span>
        <span>{company.phone}</span>
        <span>|</span>
        <span>{company.email}</span>
        <span>|</span>
        <span>{company.license}</span>
        <span>|</span>
        <span>{companyCredentials}</span>
        <LogoSeal companyName={company.name} logoPath={company.logoPath} small />
      </footer>
    );
  }

  return (
    <footer className="page-footer full-footer">
      <LogoSeal companyName={company.name} logoPath={company.logoPath} small />
      <div className="footer-brand">
        <p>{company.name}</p>
        <p>{company.tagline}</p>
      </div>
      <div className="footer-details">
        <div className="footer-contact">
          <p>Phone: {company.phone}</p>
          <p>Email: {company.email}</p>
          <p>{company.serviceArea}</p>
        </div>
        <div className="footer-compliance">
          <p>{company.license}</p>
          <p>{companyCredentials}</p>
        </div>
      </div>
    </footer>
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

  if (segments[0] === "login") {
    return { view: "login", path: "/login" };
  }

  if (segments[0] === "settings") {
    return { view: "settings", path: "/settings" };
  }

  if (segments[0] === "contacts") {
    return { view: "contacts", path: "/contacts" };
  }

  if (segments[0] !== "proposals") {
    return { view: "list", path: "/proposals" };
  }

  if (segments.length === 1) {
    return { view: "list", path: "/proposals" };
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
    lastPublicUrl: "",
    lastStatus: "not tested",
    lastStoragePath: "",
    lastUploadType: "",
  };
}

function canUseCloudSync(authUser) {
  return Boolean(isSupabaseConfigured && supabase && authUser?.id);
}

function getAssetLocalStorageReason(authUser) {
  if (!isSupabaseConfigured || !supabase) {
    return "Supabase is not configured.";
  }

  if (!authUser?.id) {
    return "Sign in to upload images to cloud.";
  }

  return "cloud storage is unavailable.";
}

function getCloudSignInMessage() {
  if (!isSupabaseConfigured) {
    return "Supabase is not configured. Proposals, contacts, and settings are stored locally.";
  }

  return cloudSignInLabel;
}

function getCloudReadyMessage(authUser, cloudMessage, localMessage) {
  return canUseCloudSync(authUser) ? cloudMessage : localMessage;
}

function getImageAssetSource(asset = {}) {
  if (hasTextValue(asset.dataUrl)) {
    return asset.dataUrl;
  }

  if (hasTextValue(asset.src) && isDataUrl(asset.src)) {
    return asset.src;
  }

  if (hasTextValue(asset.imageSrc) && isDataUrl(asset.imageSrc)) {
    return asset.imageSrc;
  }

  if (hasTextValue(asset.publicUrl)) {
    return asset.publicUrl;
  }

  if (hasTextValue(asset.signedUrl)) {
    return asset.signedUrl;
  }

  if (hasTextValue(asset.src)) {
    return asset.src;
  }

  if (hasTextValue(asset.imageSrc)) {
    return asset.imageSrc;
  }

  if (hasTextValue(asset.storagePath) && isSupabaseConfigured && supabase) {
    return getStoragePublicUrl(asset.storagePath);
  }

  return "";
}

function getImageAssetLabel(asset = {}) {
  if (hasTextValue(asset.storagePath)) {
    return "Cloud image";
  }

  if (hasTextValue(asset.dataUrl) || isDataUrl(asset.src) || isDataUrl(asset.imageSrc)) {
    return "Local image";
  }

  return "No image";
}

function getStoragePublicUrl(storagePath) {
  if (!hasTextValue(storagePath) || !isSupabaseConfigured || !supabase) {
    return "";
  }

  const { data } = supabase.storage.from(proposalAssetsBucket).getPublicUrl(storagePath);
  return data?.publicUrl || "";
}

function clearImageAssetFields(asset = {}) {
  return {
    ...asset,
    dataUrl: "",
    fileName: "",
    fileType: "",
    imageSrc: "",
    publicUrl: "",
    signedUrl: "",
    src: "",
    storagePath: "",
    uploadedAt: "",
  };
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
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

function saveStoredProposals(proposals) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(proposals));
  } catch {
    // Local saving is best-effort for this phase.
  }
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

async function ensureCloudCompany(user, settings = getDefaultCompanySettings()) {
  if (!canUseCloudSync(user)) {
    throw new Error("Sign in to sync proposals, contacts, and settings.");
  }

  const normalizedSettings = normalizeCompanySettings(settings);
  const email = user.email || "";

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      email,
      id: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  const activeMembership = await claimInvitedMembership(user);

  if (activeMembership?.companyId) {
    const memberCompany = await fetchCloudCompanyById(activeMembership.companyId);

    if (memberCompany?.id) {
      return {
        ...memberCompany,
        role: activeMembership.role,
      };
    }
  }

  const { data: existingCompanies, error: companyLoadError } = await supabase
    .from("companies")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (companyLoadError) {
    throw companyLoadError;
  }

  if (existingCompanies?.length > 0) {
    const ownedCompany = {
      ...existingCompanies[0],
      role: "owner",
    };
    await ensureOwnerCompanyMembership(ownedCompany, user);
    return ownedCompany;
  }

  const { data: createdCompany, error: companyCreateError } = await supabase
    .from("companies")
    .insert({
      name: normalizedSettings.companyName || "Last Yard Concrete LLC",
      owner_id: user.id,
    })
    .select("id,name")
    .single();

  if (companyCreateError) {
    throw companyCreateError;
  }

  const ownedCompany = {
    ...createdCompany,
    role: "owner",
  };
  await ensureOwnerCompanyMembership(ownedCompany, user);
  return ownedCompany;
}

function isMissingTeamTableError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return error?.code === "42P01" || message.includes("company_members") || message.includes("does not exist");
}

async function fetchCloudCompanyById(companyId) {
  if (!companyId) {
    return null;
  }

  const { data, error } = await supabase.from("companies").select("id,name,owner_id").eq("id", companyId).maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function claimInvitedMembership(user) {
  const email = String(user?.email || "").trim().toLowerCase();

  if (!email) {
    return null;
  }

  const inviteResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .ilike("invite_email", email)
    .eq("status", "invited")
    .order("created_at", { ascending: true })
    .limit(1);

  if (inviteResult.error) {
    if (isMissingTeamTableError(inviteResult.error)) {
      return null;
    }

    throw inviteResult.error;
  }

  const invite = inviteResult.data?.[0];

  if (invite) {
    const { data, error } = await supabase
      .from("company_members")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq("id", invite.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTeamTableError(error)) {
        return null;
      }

      throw error;
    }

    return normalizeTeamMember(data);
  }

  const activeResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (activeResult.error) {
    if (isMissingTeamTableError(activeResult.error)) {
      return null;
    }

    throw activeResult.error;
  }

  if (activeResult.data?.length > 0) {
    return normalizeTeamMember(activeResult.data[0]);
  }

  return null;
}

async function ensureOwnerCompanyMembership(companyRecord, user) {
  if (!companyRecord?.id || !user?.id) {
    return null;
  }

  const email = String(user.email || "").trim().toLowerCase();
  const { data: existingRows, error: loadError } = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyRecord.id)
    .eq("user_id", user.id)
    .limit(1);

  if (loadError) {
    if (isMissingTeamTableError(loadError)) {
      return null;
    }

    throw loadError;
  }

  if (existingRows?.length > 0) {
    const existingMember = normalizeTeamMember(existingRows[0]);

    if (existingMember.role === "owner" && existingMember.status === "active") {
      return existingMember;
    }

    const { data, error } = await supabase
      .from("company_members")
      .update({
        invite_email: existingMember.inviteEmail || email,
        role: "owner",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTeamTableError(error)) {
        return null;
      }

      throw error;
    }

    return normalizeTeamMember(data);
  }

  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyRecord.id,
      invite_email: email,
      role: "owner",
      status: "active",
      user_id: user.id,
    })
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTeamTableError(error)) {
      return null;
    }

    throw error;
  }

  return normalizeTeamMember(data);
}

async function fetchCloudTeamMembers(companyId) {
  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTeamTableError(error)) {
      return [];
    }

    throw error;
  }

  return (data || []).map((row) => normalizeTeamMember(row));
}

async function createCloudTeamInvite(companyId, inviteEmail, role = "estimator") {
  const normalizedEmail = String(inviteEmail || "").trim().toLowerCase();
  const normalizedRole = TEAM_INVITE_ROLES.includes(normalizeTeamRole(role)) ? normalizeTeamRole(role) : "estimator";

  if (!companyId) {
    throw new Error("Cloud company is not ready yet.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Enter a valid invite email.");
  }

  const existingResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyId)
    .eq("invite_email", normalizedEmail)
    .limit(1);

  if (existingResult.error) {
    if (isMissingTeamTableError(existingResult.error)) {
      throw new Error("Run the Phase 33 Supabase SQL before inviting team members.");
    }

    throw existingResult.error;
  }

  const existingMember = existingResult.data?.[0];

  if (existingMember) {
    const { data, error } = await supabase
      .from("company_members")
      .update({
        role: normalizedRole,
        status: existingMember.user_id ? "active" : "invited",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    return normalizeTeamMember(data);
  }

  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyId,
      invite_email: normalizedEmail,
      role: normalizedRole,
      status: "invited",
    })
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return normalizeTeamMember(data);
}

async function deactivateCloudTeamMember(companyId, memberId) {
  if (!companyId || !memberId) {
    throw new Error("Choose a team member to deactivate.");
  }

  const { error } = await supabase
    .from("company_members")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", memberId);

  if (error) {
    throw error;
  }
}

async function uploadProposalAssetToCloud(file, { area, companySettings, companyUser, fileStem, proposalId }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("Sign in to upload images to cloud storage.");
  }

  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const activeUser = await getActiveSupabaseUser();
  const companyRecord = await ensureCloudCompany(activeUser, companySettings);
  const safeArea = area === "plans" ? "plans" : "featured";
  const timestamp = Date.now();
  const extension = getFileExtension(file);
  const safeFileStem = sanitizeStoragePathSegment(fileStem || file.name || "image");
  const proposalPathSegment = sanitizeStoragePathSegment(proposalId || "unsaved");
  const fileName = `${safeFileStem}-${timestamp}.${extension}`;
  const storagePath = `company/${companyRecord.id}/proposals/${proposalPathSegment}/${safeArea}/${fileName}`;
  const uploadOptions = {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false,
  };
  const { data, error } = await supabase.storage.from(proposalAssetsBucket).upload(storagePath, file, uploadOptions);

  if (error) {
    console.error("Supabase Storage upload failed:", {
      bucket: proposalAssetsBucket,
      error,
      path: storagePath,
    });
    throw new Error(formatStorageUploadError(error));
  }

  if (!data?.path) {
    const missingPathError = new Error("Supabase Storage upload did not return an uploaded file path.");
    console.error("Supabase Storage upload returned no file path:", {
      bucket: proposalAssetsBucket,
      data,
      path: storagePath,
    });
    throw missingPathError;
  }

  const uploadedPath = data.path || storagePath;
  const publicUrl = getStoragePublicUrl(uploadedPath);

  return {
    companyId: companyRecord.id,
    dataUrl: "",
    fileName: file.name || `${safeFileStem}.${extension}`,
    fileType: file.type || "image/jpeg",
    publicUrl,
    signedUrl: "",
    src: publicUrl,
    storagePath: uploadedPath,
    uploadedAt: new Date().toISOString(),
  };
}

async function getActiveSupabaseUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Supabase auth session lookup failed before asset upload:", error);
    throw new Error(formatStorageUploadError(error));
  }

  const user = data?.session?.user;

  if (!user?.id) {
    throw new Error("Sign in to upload images to cloud storage.");
  }

  return user;
}

async function createLocalImageAsset(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  return {
    dataUrl,
    fileName: file.name || "local-image",
    fileType: file.type || "image/jpeg",
    publicUrl: "",
    signedUrl: "",
    src: dataUrl,
    storagePath: "",
    uploadedAt: new Date().toISOString(),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });
}

function getFileExtension(file) {
  const nameExtension = String(file?.name || "").split(".").pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]{2,5}$/.test(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  const mimeExtension = String(file?.type || "").split("/").pop()?.toLowerCase();

  if (mimeExtension && /^[a-z0-9]{2,5}$/.test(mimeExtension)) {
    return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  }

  return "jpg";
}

function sanitizeStoragePathSegment(value) {
  return String(value || "asset")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "asset";
}

function formatStorageUploadError(error) {
  if (!error) {
    return "Unknown storage upload error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (hasTextValue(error.message)) {
    return error.message;
  }

  if (hasTextValue(error.error_description)) {
    return error.error_description;
  }

  if (hasTextValue(error.error)) {
    return error.error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown storage upload error.";
  }
}

async function loadOrMergeCloudProposals(companyId, localProposals = []) {
  const cloudProposals = await fetchCloudProposals(companyId);
  const normalizedLocalProposals = localProposals.filter(isPlainObject).map((proposal) => createEditableProposal(proposal));

  if (cloudProposals.length === 0 && normalizedLocalProposals.length > 0) {
    return {
      message: `Cloud has no proposals yet. Use Push Local Proposals to upload ${normalizedLocalProposals.length} local proposal${normalizedLocalProposals.length === 1 ? "" : "s"}.`,
      proposals: normalizedLocalProposals,
      status: cloudNeedsSyncLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length === 0) {
    return {
      message: `Loaded ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"}.`,
      proposals: cloudProposals,
      status: cloudSyncedLabel,
    };
  }

  if (cloudProposals.length > 0 && normalizedLocalProposals.length > 0) {
    const mergeResult = mergeProposalCollections(normalizedLocalProposals, cloudProposals);

    return {
      message: mergeResult.warning || `Merged ${cloudProposals.length} cloud proposal${cloudProposals.length === 1 ? "" : "s"} with local proposals.`,
      proposals: mergeResult.proposals,
      status: mergeResult.needsSync ? cloudNeedsSyncLabel : cloudSyncedLabel,
    };
  }

  return {
    message: "No cloud proposals found yet.",
    proposals: [],
    status: cloudSyncedLabel,
  };
}

async function fetchCloudProposals(companyId) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id,proposal_data,created_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudProposalRow(row));
}

async function saveCloudProposals(companyId, proposals = []) {
  for (const proposal of proposals.filter(isPlainObject)) {
    await saveCloudProposal(companyId, proposal);
  }
}

async function saveCloudProposal(companyId, proposal) {
  const normalizedProposal = createEditableProposal({
    ...proposal,
    updatedAt: proposal.updatedAt || new Date().toISOString(),
  });
  const row = createCloudProposalRow(companyId, normalizedProposal);

  if (row.id) {
    const { error } = await supabase.from("proposals").upsert(row, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return;
  }

  const existingRowId = await findCloudProposalRowId(companyId, normalizedProposal.id);

  if (existingRowId) {
    const { error } = await supabase.from("proposals").update(row).eq("id", existingRowId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("proposals").insert(row);

  if (error) {
    throw error;
  }
}

async function findCloudProposalRowId(companyId, proposalId) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id,proposal_data")
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  const match = (data || []).find((row) => row.proposal_data?.id === proposalId);
  return match?.id || "";
}

function createCloudProposalRow(companyId, proposal) {
  const normalizedProposal = createEditableProposal(proposal);
  const row = {
    company_id: companyId,
    contact_id: isUuid(normalizedProposal.contactId) ? normalizedProposal.contactId : null,
    packet_mode: normalizedProposal.packetMode || "summary",
    proposal_data: normalizedProposal,
    proposal_number: normalizedProposal.proposalNumber || "",
    proposal_type: normalizedProposal.proposalType || normalizedProposal.type || "",
    status: normalizedProposal.status || "draft",
  };

  if (isUuid(normalizedProposal.id)) {
    row.id = normalizedProposal.id;
  }

  return row;
}

function normalizeCloudProposalRow(row = {}) {
  const proposalData = isPlainObject(row.proposal_data) ? row.proposal_data : {};

  return createEditableProposal({
    ...proposalData,
    id: proposalData.id || row.id,
    createdAt: proposalData.createdAt || row.created_at,
    updatedAt: proposalData.updatedAt || row.updated_at,
  });
}

function mergeProposalCollections(localProposals = [], cloudProposals = []) {
  const mergedById = new Map();
  const cloudIds = new Set(cloudProposals.filter(isPlainObject).map((proposal) => createEditableProposal(proposal).id));
  const warnings = [];
  let needsSync = false;

  localProposals.filter(isPlainObject).forEach((proposal) => {
    const normalizedProposal = createEditableProposal(proposal);
    mergedById.set(normalizedProposal.id, normalizedProposal);
  });

  cloudProposals.filter(isPlainObject).forEach((proposal) => {
    const cloudProposal = createEditableProposal(proposal);
    const localProposal = mergedById.get(cloudProposal.id);

    if (!localProposal) {
      mergedById.set(cloudProposal.id, cloudProposal);
      return;
    }

    const comparison = compareProposalUpdatedAt(localProposal, cloudProposal);

    if (comparison > 0) {
      needsSync = true;
      return;
    }

    if (comparison < 0 || proposalsAreEquivalent(localProposal, cloudProposal)) {
      mergedById.set(cloudProposal.id, cloudProposal);
      return;
    }

    const copiedCloudProposal = createEditableProposal({
      ...cloudProposal,
      id: createProposalId(),
      proposalNumber: cloudProposal.proposalNumber || localProposal.proposalNumber,
      updatedAt: cloudProposal.updatedAt || new Date().toISOString(),
    });
    mergedById.set(copiedCloudProposal.id, copiedCloudProposal);
    needsSync = true;
    warnings.push(`Kept both local and cloud copies for ${cloudProposal.proposalNumber || cloudProposal.id} because the latest update was unclear.`);
  });

  if (localProposals.filter(isPlainObject).some((proposal) => !cloudIds.has(createEditableProposal(proposal).id))) {
    needsSync = true;
  }

  return {
    needsSync,
    proposals: [...mergedById.values()].sort((a, b) => getProposalTimestamp(b) - getProposalTimestamp(a)),
    warning: warnings.join(" "),
  };
}

function compareProposalUpdatedAt(localProposal = {}, cloudProposal = {}) {
  const localTimestamp = getProposalTimestamp(localProposal);
  const cloudTimestamp = getProposalTimestamp(cloudProposal);

  if (!localTimestamp && !cloudTimestamp) {
    return 0;
  }

  if (localTimestamp > cloudTimestamp) {
    return 1;
  }

  if (cloudTimestamp > localTimestamp) {
    return -1;
  }

  return 0;
}

function proposalsAreEquivalent(firstProposal = {}, secondProposal = {}) {
  return JSON.stringify(createEditableProposal(firstProposal)) === JSON.stringify(createEditableProposal(secondProposal));
}

async function loadOrSeedCloudCompanySettings(companyId, localSettings = getDefaultCompanySettings()) {
  const cloudSettingsRow = await fetchCloudCompanySettingsRow(companyId);

  if (isPlainObject(cloudSettingsRow?.settings) && Object.keys(cloudSettingsRow.settings).length > 0) {
    return {
      message: "Loaded company settings from Supabase.",
      settings: normalizeCompanySettings(cloudSettingsRow.settings),
    };
  }

  const normalizedSettings = normalizeCompanySettings(localSettings);
  await saveCloudCompanySettings(companyId, normalizedSettings, cloudSettingsRow?.id);

  return {
    message: "Seeded Supabase company settings from local defaults.",
    settings: normalizedSettings,
  };
}

async function fetchCloudCompanySettingsRow(companyId) {
  const { data, error } = await supabase
    .from("company_settings")
    .select("id,settings")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function saveCloudCompanySettings(companyId, settings, existingRowId = "") {
  const normalizedSettings = normalizeCompanySettings(settings);
  const rowId = existingRowId || (await fetchCloudCompanySettingsRow(companyId))?.id;
  const payload = {
    company_id: companyId,
    settings: normalizedSettings,
  };

  if (rowId) {
    const { error } = await supabase.from("company_settings").update(payload).eq("id", rowId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("company_settings").insert(payload);

  if (error) {
    throw error;
  }
}

async function loadOrSeedCloudContacts(companyId, localContacts = []) {
  const cloudContacts = await fetchCloudContacts(companyId);

  if (cloudContacts.length > 0) {
    return {
      contacts: cloudContacts,
      message: `Loaded ${cloudContacts.length} cloud contact${cloudContacts.length === 1 ? "" : "s"}.`,
    };
  }

  const normalizedContacts = localContacts.filter(isPlainObject).map((contact) => normalizeContact(contact));

  if (normalizedContacts.length > 0) {
    await replaceCloudContacts(companyId, normalizedContacts);

    return {
      contacts: normalizedContacts,
      message: `Seeded ${normalizedContacts.length} local contact${normalizedContacts.length === 1 ? "" : "s"} to Supabase.`,
    };
  }

  return {
    contacts: [],
    message: "No cloud contacts found yet.",
  };
}

async function fetchCloudContacts(companyId) {
  const { data, error } = await supabase
    .from("contacts")
    .select("id,contact_data,created_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudContactRow(row));
}

async function replaceCloudContacts(companyId, contacts = []) {
  const { error: deleteError } = await supabase.from("contacts").delete().eq("company_id", companyId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = contacts.filter(isPlainObject).map((contact) => createCloudContactRow(companyId, contact));

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("contacts").insert(rows).select("id,contact_data,created_at,updated_at");

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudContactRow(row));
}

async function saveCloudContact(companyId, contact) {
  const row = createCloudContactRow(companyId, contact);

  if (row.id) {
    const { error } = await supabase.from("contacts").upsert(row, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("contacts").insert(row);

  if (error) {
    throw error;
  }
}

async function deleteCloudContact(companyId, contactId) {
  if (!isUuid(contactId)) {
    return;
  }

  const { error } = await supabase.from("contacts").delete().eq("company_id", companyId).eq("id", contactId);

  if (error) {
    throw error;
  }
}

function createCloudContactRow(companyId, contact) {
  const normalizedContact = normalizeContact(contact);
  const row = {
    company_id: companyId,
    contact_data: normalizedContact,
  };

  if (isUuid(normalizedContact.id)) {
    row.id = normalizedContact.id;
  }

  return row;
}

function normalizeCloudContactRow(row = {}) {
  return normalizeContact({
    ...(isPlainObject(row.contact_data) ? row.contact_data : {}),
    id: row.contact_data?.id || row.id,
    createdAt: row.contact_data?.createdAt || row.created_at,
    updatedAt: row.contact_data?.updatedAt || row.updated_at,
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
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

function createFullAppBackup(proposals, settings, contacts = []) {
  return {
    backupVersion,
    exportedAt: new Date().toISOString(),
    source: backupSource,
    type: "full_app_backup",
    storageKeys: {
      proposals: storageKey,
      companySettings: companySettingsStorageKey,
      contacts: contactsStorageKey,
    },
    proposals: cloneObject(proposals),
    companySettings: cloneObject(settings),
    contacts: cloneObject(contacts),
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

function parseFullAppBackupImport(importedJson) {
  if (!isPlainObject(importedJson) || (!Array.isArray(importedJson.proposals) && !isPlainObject(importedJson.companySettings))) {
    throw new Error("This file does not look like a full app backup.");
  }

  return {
    proposals: parseProposalCollectionImport(importedJson),
    companySettings: parseCompanySettingsImport(importedJson.companySettings || importedJson),
    contacts: Array.isArray(importedJson.contacts) ? parseContactCollectionImport(importedJson) : [],
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

function mergeImportedContacts(importedContacts = [], existingContacts = []) {
  return importedContacts.reduce((contacts, contact) => upsertContact(contacts, resolveImportedContactIdentity(contact, contacts)), [
    ...existingContacts,
  ]);
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

  return createEditableProposal({
    ...applyCompanySettingsToProposal(SEED_PROPOSAL, companySettings, today),
    id: createProposalId(),
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
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  });
}

function createNewGcPacketDraft(existingProposals, companySettings = getDefaultCompanySettings()) {
  const baseProposal = createNewProposalDraft(existingProposals, companySettings);
  const gcPacketTables = normalizeGcPacketTables(baseProposal.gcPacketTables);

  return createEditableProposal({
    ...baseProposal,
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
        contractScopeControl: "Accepted bid form, exclusions, and clarifications control final contract scope.",
        acceptanceSummary: "GC to identify accepted alternates and allowances before contract execution.",
        gcPrimeReviewer: "Reviewed by: ______________________________ Date: __________",
      },
    },
  });
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
  const contactType = CONTACT_TYPES.includes(contact.contactType) ? contact.contactType : "";

  return {
    id: contact.id || createProposalId(),
    companyName: contact.companyName || "",
    contactName: contact.contactName || "",
    phone: contact.phone || "",
    email: contact.email || "",
    billingAddress: contact.billingAddress || contact.address || "",
    defaultProjectAddress: contact.defaultProjectAddress || contact.projectAddress || "",
    contactType,
    notes: contact.notes || "",
    demo: Boolean(contact.demo || contact.metadata?.isDemo),
    metadata: {
      ...(isPlainObject(contact.metadata) ? contact.metadata : {}),
      isDemo: Boolean(contact.demo || contact.metadata?.isDemo),
    },
    createdAt: contact.createdAt || now,
    updatedAt: contact.updatedAt || now,
  };
}

function upsertContact(contacts, contact) {
  const normalizedContact = normalizeContact(contact);
  const otherContacts = contacts.filter((item) => item.id !== normalizedContact.id);

  return [normalizedContact, ...otherContacts].sort((a, b) => formatContactName(a).localeCompare(formatContactName(b)));
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

function buildDashboardStats(proposals = [], contacts = []) {
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
  if (proposal.packetMode === "full_gc_packet") {
    return "Full GC Packet";
  }

  return hasFullPacketContent(proposal) ? "Full GC Packet" : "Summary";
}

function hasFullPacketContent(proposal = {}) {
  const gcPacketTables = normalizeGcPacketTables(proposal.gcPacketTables);
  const hasStructuredTables = Object.values(gcPacketTables).some((table) => table.enabled);
  const hasPlanSheets = getEnabledPlanSheets(proposal.planSheets).length > 0;
  const hasAppendix = buildAppendixPlan(createEditableProposal(proposal)).pages.length > 0;

  return proposal.proposalType === "gc_prime" || proposal.type === "gc_prime" || hasStructuredTables || hasPlanSheets || hasAppendix;
}

function getDefaultCompanySettings() {
  const company = SEED_PROPOSAL.company;

  return {
    companyName: company.name,
    phone: company.phone,
    email: company.email,
    logoPath: logoSrc,
    license: company.license,
    credentialsText: company.credentials.join(" | "),
    serviceArea: company.serviceArea,
    defaultProposalExpirationDays: 30,
    defaultPaymentTerms: SEED_PROPOSAL.terms.payment,
    defaultExclusions: SEED_PROPOSAL.exclusions.join("\n"),
    defaultWarrantyNote: "",
    defaultSignatureBlock: SEED_PROPOSAL.terms.acceptance,
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
    defaultExclusions: hasTextValue(settings.defaultExclusions) ? settings.defaultExclusions : defaults.defaultExclusions,
    defaultWarrantyNote: settings.defaultWarrantyNote ?? defaults.defaultWarrantyNote,
    defaultSignatureBlock: hasTextValue(settings.defaultSignatureBlock)
      ? settings.defaultSignatureBlock
      : defaults.defaultSignatureBlock,
  };
}

function applyCompanySettingsToProposal(sourceProposal, settings, proposalDate = new Date()) {
  const normalizedSettings = normalizeCompanySettings(settings);
  const nextProposal = cloneObject(sourceProposal);
  const validUntil = new Date(proposalDate);
  validUntil.setDate(validUntil.getDate() + getExpirationDays(normalizedSettings));

  return {
    ...nextProposal,
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
    exclusions: parseMultilineList(normalizedSettings.defaultExclusions),
    terms: {
      ...nextProposal.terms,
      payment: normalizedSettings.defaultPaymentTerms,
      acceptance: normalizedSettings.defaultSignatureBlock,
      signatureBlock: normalizedSettings.defaultSignatureBlock,
      warrantyNote: normalizedSettings.defaultWarrantyNote,
    },
  };
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
  return defaultProjectPhotos.map((defaultPhoto, index) => {
    const photo = Array.isArray(photos) ? photos[index] || {} : {};
    return normalizeProjectPhoto(photo, index, defaultPhoto);
  });
}

function normalizeProjectPhoto(photo = {}, index = 0, defaultPhoto = defaultProjectPhotos[index] || defaultProjectPhotos[0]) {
  const rawSource = photo.src || photo.dataUrl || photo.publicUrl || photo.signedUrl || "";
  const dataUrl = hasTextValue(photo.dataUrl) ? photo.dataUrl : isDataUrl(rawSource) ? rawSource : "";
  const publicUrl = hasTextValue(photo.publicUrl) ? photo.publicUrl : !isDataUrl(rawSource) && hasTextValue(rawSource) ? rawSource : "";
  const label = hasTextValue(photo.label) ? photo.label : hasTextValue(photo.caption) ? photo.caption : defaultPhoto.label;
  const normalizedPhoto = {
    caption: label,
    dataUrl,
    fileName: photo.fileName || "",
    fileType: photo.fileType || "",
    label,
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
    fileType: sheet.fileType || "",
    imageSrc: getPlanSheetImageSource(sheet),
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
    fileName: existingAsset.fileName || "",
    fileType: existingAsset.fileType || "",
    imageSrc: existingAsset.imageSrc || existingAsset.src || "",
    publicUrl: existingAsset.publicUrl || "",
    signedUrl: existingAsset.signedUrl || "",
    src: existingAsset.src || existingAsset.imageSrc || "",
    storagePath: existingAsset.storagePath || "",
    uploadedAt: existingAsset.uploadedAt || "",
  };
}

function normalizePlanSheetNotes(notes = []) {
  if (Array.isArray(notes)) {
    return notes.map((note) => String(note || "").trim()).filter(Boolean);
  }

  return parseEditorList(notes);
}

function getEnabledPlanSheets(planSheets = []) {
  return normalizePlanSheets(planSheets).filter((sheet) => sheet.enabled);
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
  }));
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
  const proposalType = proposal.proposalType ?? proposal.type ?? "commercial";
  const revisionNumber = normalizeRevisionNumber(proposal.revisionNumber);
  const revisionLabel = proposal.revisionLabel || formatRevisionLabel(revisionNumber);

  const editableProposal = {
    ...proposal,
    id: proposal.id || createProposalId(),
    contactId: proposal.contactId || "",
    status: proposal.status || "draft",
    proposalType,
    type: proposalType,
    packetMode: proposal.packetMode || (proposalType === "gc_prime" ? "full_gc_packet" : "summary"),
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
      ...SEED_PROPOSAL.terms,
      ...(proposal.terms || {}),
    },
    lineItems: (proposal.lineItems || []).map((item) => ({
      ...item,
      taxable: item.taxable ?? true,
    })),
    pricingSections: normalizePricingSections(proposal.pricingSections),
    submittedPacketRecords: normalizeSubmittedPacketRecords(proposal.submittedPacketRecords),
    client: {
      ...client,
      billingAddress: client.billingAddress ?? client.address ?? "",
      projectAddress: client.projectAddress ?? client.cityStateZip ?? "",
    },
    project: {
      ...project,
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
      addendaAcknowledged: record.addendaAcknowledged || "",
      rfiCount: Number.parseInt(record.rfiCount, 10) || 0,
      planSheetCount: Number.parseInt(record.planSheetCount, 10) || 0,
      appendixPageCount: Number.parseInt(record.appendixPageCount, 10) || 0,
      packetPageCount: Number.parseInt(record.packetPageCount, 10) || 0,
      proposalSnapshot: record.proposalSnapshot || {},
    }))
    .sort((a, b) => getPacketRecordTimestamp(b) - getPacketRecordTimestamp(a));
}

function createSubmittedPacketRecord(proposal = {}, authUser = null, overrides = {}) {
  const snapshotSource = createEditableProposal({ ...proposal, submittedPacketRecords: [] });
  const totals = calculateProposalTotals(snapshotSource);
  const appendixPlan = buildAppendixPlan(snapshotSource);
  const structuredPacketPages = buildStructuredPacketPages(snapshotSource);
  const enabledPlanSheets = getEnabledPlanSheets(snapshotSource.planSheets);
  const appendixPageCount = appendixPlan.pages.length;
  const planSheetCount = enabledPlanSheets.length;
  const structuredPageCount = structuredPacketPages.length;
  const packetPageCount = 2 + structuredPageCount + appendixPageCount + planSheetCount;

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
    includedSections: getSubmittedPacketIncludedSections(snapshotSource, {
      appendixPageCount,
      planSheetCount,
      structuredPageCount,
    }),
    addendaAcknowledged:
      snapshotSource.gcPrime?.addendaAcknowledged ||
      getPrintableAddendaRows(snapshotSource.gcPrime)
        .map((row) => [row.addendumNumber, row.titleDescription].filter(hasTextValue).join(" - "))
        .filter(hasTextValue)
        .join("; "),
    rfiCount: countPacketTextLines(snapshotSource.gcPrime?.rfiClarificationNotes) + getPrintableRfiRows(snapshotSource.gcPrime).length,
    planSheetCount,
    appendixPageCount,
    packetPageCount,
    proposalSnapshot: cloneObject(snapshotSource),
    ...overrides,
  };

  return normalizeSubmittedPacketRecords([record])[0];
}

function createPacketRecordId() {
  return `packet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSubmittedPacketIncludedSections(proposal = {}, counts = {}) {
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

function countPacketTextLines(value = "") {
  return splitAppendixText(value).length;
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
  return normalizePricingSections(pricingSections).filter(
    (section) =>
      hasTextValue(section.label) ||
      hasTextValue(section.description) ||
      hasTextValue(section.amount) ||
      section.included,
  );
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
    pages.push({
      key: "structured-proposal-notes",
      kind: "proposalNotes",
      title: "Proposal Notes / Acceptance Summary",
      sections: [
        { title: "Proposal Basis", text: tables.proposalNotes.proposalBasis },
        { title: "Contract Scope Control", text: tables.proposalNotes.contractScopeControl },
        { title: "Acceptance Summary", text: tables.proposalNotes.acceptanceSummary },
        { title: "GC / Prime Reviewer", text: tables.proposalNotes.gcPrimeReviewer },
      ],
    });
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
  const generatedIncludedScope = normalizeScopeSections(proposal.scopeSections)
    .map((section) => `${section.title}: ${(section.items || []).join("; ")}`)
    .filter(hasTextValue)
    .join("\n");
  const generatedExclusions = normalizeTextList(proposal.exclusions).join("\n");
  const generatedClarifications = getAppendixTextValue(proposal.gcPrime?.rfiClarificationNotes || proposal.gcPrime?.gcPrimeNotes);
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
  ].filter((section) => hasTextValue(section.text));
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
  const legalFields = [
    ["Proposal Expiration", terms.proposalExpiration],
    ["Payment Terms", terms.payment],
    ["Deposit / Scheduling", terms.depositText],
    ["Progress Billing", terms.progressBilling],
    ["Change Orders", terms.changeOrderLanguage],
    ["Weather / Site Readiness", terms.weatherSiteReadiness],
    ["Utility Responsibility", terms.utilityResponsibility],
    ["Hidden Conditions", terms.hiddenConditions],
    ["Concrete Cracking", terms.concreteCrackingDisclaimer],
    ["Color / Finish Variation", terms.colorFinishVariationDisclaimer],
    ["Warranty Limitation", terms.warrantyLimitation],
    ["Acceptance", terms.acceptance],
  ];

  return legalFields
    .filter(([, text]) => hasTextValue(text))
    .map(([title, text]) => ({ title, text }));
}

function paginateStructuredRows(pages, kind, table, title, columns, rowsPerPage) {
  if (!table.enabled || table.rows.length === 0) {
    return;
  }

  const rowChunks = chunkArray(table.rows, rowsPerPage);

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
  const visibleCustomRows = normalizeGcPacketRows("pricingSummary", customRows).filter(
    (row) => hasTextValue(row.label) || hasTextValue(row.amount) || hasTextValue(row.note),
  );

  if (visibleCustomRows.length > 0) {
    return visibleCustomRows;
  }

  const totals = calculateProposalTotals(proposal);
  const pricingSections = getVisiblePricingSections(proposal.pricingSections);
  const allowances = pricingSections.filter((section) => section.type === "allowance");
  const addAlternates = pricingSections.filter((section) => section.type === "add_alternate");
  const shadeAllowance = findPricingSectionByText(allowances, ["shade", "footing"]);
  const interfaceAllowance = findPricingSectionByText(allowances, ["interface", "rfi", "clarification"]);
  const allowanceTotal = allowances.reduce((sum, section) => sum + Math.abs(toEditableNumber(section.amount)), 0);
  const baseWithAllowances = totals.baseBid + allowanceTotal;

  return [
    { id: "base-concrete-work", label: "Base Concrete Work", amount: formatCurrency(totals.baseBid), note: "Base bid concrete scope." },
    {
      id: "estimated-shade-footings",
      label: "Estimated Shade Footings",
      amount: shadeAllowance ? formatPricingSectionAmount(shadeAllowance) : "",
      note: shadeAllowance?.description || "Allowance if applicable.",
    },
    {
      id: "interface-rfi-allowance",
      label: "Interface / RFI Allowance",
      amount: interfaceAllowance ? formatPricingSectionAmount(interfaceAllowance) : "",
      note: interfaceAllowance?.description || "Allowance if applicable.",
    },
    {
      id: "base-with-allowances",
      label: "Base with Allowances",
      amount: formatCurrency(baseWithAllowances),
      note: "Base bid plus listed allowances.",
    },
    {
      id: "add-alternate-01",
      label: "Add Alternate 01",
      amount: addAlternates[0] ? formatPricingSectionAmount(addAlternates[0]) : "",
      note: addAlternates[0]?.label || "",
    },
    {
      id: "add-alternate-02",
      label: "Add Alternate 02",
      amount: addAlternates[1] ? formatPricingSectionAmount(addAlternates[1]) : "",
      note: addAlternates[1]?.label || "",
    },
    {
      id: "total-if-all-accepted",
      label: "Total if all accepted",
      amount: formatCurrency(totals.totalIfAllAlternatesAccepted),
      note: "For presentation only; final accepted scope controls contract total.",
    },
  ];
}

function findPricingSectionByText(sections, keywords) {
  return sections.find((section) => {
    const text = `${section.label || ""} ${section.description || ""}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function formatStructuredCell(value) {
  return hasTextValue(value) ? value : "-";
}

function formatPricingSectionAmount(section) {
  const amount = Math.abs(toEditableNumber(section.amount));
  const formattedAmount = formatCurrency(amount);

  return section.type === "deduct_alternate" ? `-${formattedAmount}` : formattedAmount;
}

function buildAppendixPlan(proposal) {
  const scopeSummary = buildScopeSummary(proposal.scopeSections);
  const exclusionsSummary = buildExclusionsSummary(proposal.exclusions, proposal.assumptions);
  const lineItemSummary = buildLineItemSummary(proposal.lineItems);
  const pricingSummary = buildPricingSectionSummary(proposal.pricingSections);
  const gcPrimeSummary = buildGcPrimeSummary(proposal.gcPrime || {});
  const proposalNotes = getAppendixTextValue(proposal.proposalNotes || proposal.notes);
  const concreteSpecNotes = getAppendixTextValue(proposal.concreteSpecs?.notes);
  const takeoffBackupText = getAppendixTextValue(proposal.takeoffQuantityBackup || proposal.quantityBackup);
  const proposalTotals = calculateProposalTotals(proposal);
  const appendixSections = [];

  if (scopeSummary.needsAppendix) {
    appendixSections.push({
      key: "detailed-scope",
      kind: "scope",
      title: "Detailed Scope Backup",
      groups: proposal.scopeSections,
    });
  }

  if (exclusionsSummary.needsAppendix) {
    appendixSections.push({
      key: "detailed-exclusions-assumptions",
      kind: "listGroups",
      title: "Detailed Exclusions / Assumptions",
      groups: [
        { title: "Exclusions", items: proposal.exclusions },
        { title: "Assumptions", items: proposal.assumptions },
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
      lineItems: proposal.lineItems,
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
  const totalItems = scopeSections.reduce((sum, section) => sum + (section.items?.length || 0), 0);
  const scopeTextLength = scopeSections.reduce(
    (sum, section) => sum + String(section.title || "").length + (section.items || []).join(" ").length,
    0,
  );
  const needsAppendix = scopeSections.length > 5 || totalItems > 22 || scopeTextLength > 950;

  if (!needsAppendix) {
    return { mainSections: scopeSections, needsAppendix: false };
  }

  return {
    needsAppendix: true,
    mainSections: scopeSections.slice(0, 5).map((section) => ({
      ...section,
      items: [
        ...(section.items || []).slice(0, 3),
        ...((section.items || []).length > 3 ? ["Additional scope items noted in Appendix."] : []),
      ],
    })),
  };
}

function buildExclusionsSummary(exclusions = [], assumptions = []) {
  const exclusionsTextLength = exclusions.join(" ").length;
  const assumptionsTextLength = assumptions.join(" ").length;
  const needsAppendix =
    exclusions.length > 6 ||
    assumptions.length > 4 ||
    exclusionsTextLength > 520 ||
    assumptionsTextLength > 420;

  if (!needsAppendix) {
    return { mainExclusions: exclusions, needsAppendix: false };
  }

  return {
    needsAppendix: true,
    mainExclusions: [...exclusions.slice(0, 5), "See Appendix for detailed exclusions and assumptions."],
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
  const rfiText = getAppendixTextValue(gcPrime.rfiClarificationNotes || gcPrime.rfiNotes);
  const addendaText = getAppendixTextValue(gcPrime.addendaAcknowledged);
  const gcPrimeNotesText = getAppendixTextValue(gcPrime.gcPrimeNotes);
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
  return value === undefined || value === null ? "" : String(value).trim();
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
  ].filter(hasTextValue);

  return copyParts.length > 0 ? `Payment terms: ${copyParts.join(" ")}` : "";
}

function buildConcreteSpecRows(concreteSpecs = {}) {
  return [
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
  ].filter(([, value]) => hasSpecValue(value));
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

  return value !== undefined && value !== null && String(value).trim() !== "";
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
