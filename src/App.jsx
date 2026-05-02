import { useEffect, useState } from "react";
import {
  LINE_ITEM_UNITS,
  PRICING_SECTION_TYPES,
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  SEED_PROPOSAL,
  calculateProposalTotals,
  formatCurrency,
  generateProposalNumber,
  validateProposalCompleteness,
} from "./proposalData.js";

const logoSrc = "/assets/last-yard-logo.jpg";
const storageKey = "last-yard-proposals-v1";
const companySettingsStorageKey = "last-yard-company-settings-v1";

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

export default function App() {
  const [companySettings, setCompanySettings] = useState(() => loadCompanySettings());
  const [settingsDraft, setSettingsDraft] = useState(() => loadCompanySettings());
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savedProposals, setSavedProposals] = useState(() => loadSavedProposals(loadCompanySettings()));
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
  const company = proposalDraft.company;
  const isListView = route.view === "list";
  const isPrintView = route.view === "print";
  const isSettingsView = route.view === "settings";
  const proposalValidation = validateProposalCompleteness(proposalDraft);

  useEffect(() => {
    saveStoredProposals(savedProposals);
  }, [savedProposals]);

  useEffect(() => {
    saveCompanySettings(companySettings);
  }, [companySettings]);

  useEffect(() => {
    if (window.location.pathname !== route.path) {
      window.history.replaceState({}, "", route.path);
    }
  }, [route.path]);

  useEffect(() => {
    function handlePopState() {
      const nextRoute = parseRoute(window.location.pathname);
      setRoute(nextRoute);

      if (nextRoute.view !== "list") {
        setProposalDraft(getInitialProposalForRoute(nextRoute, savedProposals, companySettings));
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [companySettings, savedProposals]);

  useEffect(() => {
    setSaveMessage("");
    setValidationNotice("");
    setSmartPasteResult(null);
  }, [route.path]);

  useEffect(() => {
    function handlePrintShortcut(event) {
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p";

      if (!isPrintShortcut || isListView || isSettingsView) {
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
  }, [isListView, isSettingsView, proposalDraft]);

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
    setProposalDraft((currentProposal) => {
      const nextProposal = updateNestedValue(currentProposal, path, value);

      if (path === "proposalType") {
        nextProposal.type = value;
      }

      if (path === "status") {
        nextProposal.status = value;
      }

      return nextProposal;
    });
  }

  function navigate(path, options = {}) {
    const nextRoute = parseRoute(path);
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", path);
    setRoute(nextRoute);

    if (nextRoute.view !== "list" && nextRoute.view !== "settings") {
      setProposalDraft(
        options.proposal ? createEditableProposal(options.proposal) : getInitialProposalForRoute(nextRoute, savedProposals, companySettings),
      );
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
    const proposal = createNewProposalDraft(savedProposals, companySettings);
    navigate("/proposals/new", { proposal });
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
    setSettingsMessage("Company settings saved locally.");
  }

  function resetSettingsDraft() {
    const defaults = getDefaultCompanySettings();
    setSettingsDraft(defaults);
    setSettingsMessage("Company settings reset to Last Yard defaults. Save to keep these defaults.");
  }

  function saveCurrentProposal() {
    if (!canCompleteProposal("saving")) {
      return;
    }

    const proposalToSave = createEditableProposal({
      ...proposalDraft,
      updatedAt: new Date().toISOString(),
    });

    setSavedProposals((currentProposals) => upsertProposal(currentProposals, proposalToSave));
    setProposalDraft(proposalToSave);
    setSaveMessage("Draft saved locally.");

    if (route.view === "new") {
      navigate(`/proposals/${proposalToSave.id}`, { proposal: proposalToSave, replace: true });
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

  function duplicateCurrentProposal(proposal = proposalDraft) {
    const duplicate = duplicateProposalDraft(proposal, savedProposals);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, duplicate));
    navigate(`/proposals/${duplicate.id}`, { proposal: duplicate });
    setSaveMessage("Duplicated as a new draft.");
  }

  function updateCurrentStatus(status) {
    const updatedProposal = createEditableProposal({ ...proposalDraft, status, updatedAt: new Date().toISOString() });
    setProposalDraft(updatedProposal);
    setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
    setSaveMessage(`Marked as ${formatOptionLabel(status)}.`);
  }

  function updateLineItem(index, field, value) {
    setProposalDraft((currentProposal) => {
      const lineItems = currentProposal.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      );

      return { ...currentProposal, lineItems };
    });
  }

  function addLineItem() {
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
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      lineItems: currentProposal.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updatePricingSection(index, field, value) {
    setProposalDraft((currentProposal) => {
      const pricingSections = normalizePricingSections(currentProposal.pricingSections).map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      );

      return { ...currentProposal, pricingSections };
    });
  }

  function addPricingSection() {
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
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      pricingSections: normalizePricingSections(currentProposal.pricingSections).filter(
        (_, sectionIndex) => sectionIndex !== index,
      ),
    }));
  }

  function updateFinancialField(field, value) {
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
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) =>
        index === sectionIndex ? { ...section, title } : section,
      );

      return { ...currentProposal, scopeSections };
    });
  }

  function updateScopeBullet(sectionIndex, bulletIndex, value) {
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
    setProposalDraft((currentProposal) => {
      const scopeSections = currentProposal.scopeSections.map((section, index) =>
        index === sectionIndex ? { ...section, items: [...section.items, "New scope item"] } : section,
      );

      return { ...currentProposal, scopeSections };
    });
  }

  function removeScopeBullet(sectionIndex, bulletIndex) {
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
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      scopeSections: currentProposal.scopeSections.filter((_, index) => index !== sectionIndex),
    }));
  }

  function updateConcreteSpec(field, value) {
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      concreteSpecs: {
        ...currentProposal.concreteSpecs,
        [field]: value,
      },
    }));
  }

  function updateGcPrimeField(field, value) {
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      gcPrime: {
        ...currentProposal.gcPrime,
        [field]: value,
      },
    }));
  }

  function updateProjectPhoto(index, updates) {
    setProposalDraft((currentProposal) => {
      const projectPhotos = normalizeProjectPhotos(currentProposal.projectPhotos).map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, ...updates } : photo,
      );

      return { ...currentProposal, projectPhotos };
    });
  }

  function updatePlanSheet(index, field, value) {
    setProposalDraft((currentProposal) => {
      const planSheets = normalizePlanSheets(currentProposal.planSheets).map((sheet, sheetIndex) =>
        sheetIndex === index ? { ...sheet, [field]: value } : sheet,
      );

      return { ...currentProposal, planSheets };
    });
  }

  function addPlanSheet() {
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
    setProposalDraft((currentProposal) => ({
      ...currentProposal,
      planSheets: normalizePlanSheets(currentProposal.planSheets).filter((_, sheetIndex) => sheetIndex !== index),
    }));
  }

  function fillProposalFromNotes() {
    const parsedNotes = parseProjectNotes(smartPasteNotes);
    const parsedLineItemCount = parsedNotes.lineItems.length + (parsedNotes.values.baseBidLineItem ? 1 : 0);
    const parsedPricingSectionCount = parsedNotes.pricingSectionCount || 0;
    const parsedPlanSheetCount = parsedNotes.planSheetCount || 0;

    if (
      parsedNotes.fields.length === 0 &&
      parsedNotes.lineItems.length === 0 &&
      parsedPricingSectionCount === 0 &&
      parsedPlanSheetCount === 0 &&
      parsedNotes.sectionsCaptured.length === 0
    ) {
      setSmartPasteResult({
        fields: [],
        lineItemCount: 0,
        pricingSectionCount: 0,
        planSheetCount: 0,
        sectionsCaptured: [],
        warnings: parsedNotes.warnings.length > 0 ? parsedNotes.warnings : ["No clearly labeled proposal fields were found."],
      });
      return;
    }

    setProposalDraft((currentProposal) => createEditableProposal(applyParsedNotesToProposal(currentProposal, parsedNotes)));
    setSmartPasteResult({
      fields: parsedNotes.fields,
      lineItemCount: parsedLineItemCount,
      pricingSectionCount: parsedPricingSectionCount,
      planSheetCount: parsedPlanSheetCount,
      sectionsCaptured: parsedNotes.sectionsCaptured,
      warnings: parsedNotes.warnings,
    });
  }

  return (
    <main className={`app-shell ${isPrintView ? "print-route-shell" : ""}`}>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      {!isPrintView ? (
        <div className="print-bar no-print">
          <div>
            <p className="eyebrow">{company.name}</p>
            <h1>Proposal Generator</h1>
          </div>
          <div className="app-header-actions">
            <button type="button" onClick={() => navigate("/proposals")}>
              Proposals
            </button>
            <button type="button" onClick={createNewProposal}>
              New Proposal
            </button>
            <button type="button" onClick={() => navigate("/settings")}>
              Company Settings
            </button>
            {!isListView && !isSettingsView ? (
              <button type="button" onClick={printCurrentProposal}>
                Print / Save PDF
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isSettingsView ? (
        <CompanySettingsView
          message={settingsMessage}
          settings={settingsDraft}
          onBackToList={() => navigate("/proposals")}
          onChange={updateSettingsDraft}
          onReset={resetSettingsDraft}
          onSave={saveSettings}
        />
      ) : isListView ? (
        <ProposalListView
          proposals={savedProposals}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onCreateNew={createNewProposal}
          onDuplicate={duplicateCurrentProposal}
          onOpen={openProposal}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => navigate("/settings")}
          onStatusFilterChange={setStatusFilter}
          onStatusChange={(proposal, status) => {
            const updatedProposal = { ...proposal, status, updatedAt: new Date().toISOString() };
            setSavedProposals((currentProposals) => upsertProposal(currentProposals, updatedProposal));
          }}
        />
      ) : (
        <>
          {isPrintView ? (
            <>
              <PrintRouteToolbar onBackToList={() => navigate("/proposals")} onPrint={printCurrentProposal} />
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
              saveMessage={saveMessage}
              onBackToList={() => navigate("/proposals")}
              onDuplicate={() => duplicateCurrentProposal(proposalDraft)}
              onOpenPrintView={openPrintView}
              onSave={saveCurrentProposal}
              onStatusChange={updateCurrentStatus}
            />
          )}

          <div className={`proposal-workbench ${isPrintView ? "print-route-view" : ""}`}>
            {isPrintView ? null : (
              <ProposalEditor
                proposal={proposalDraft}
                onAddLineItem={addLineItem}
                onAddPricingSection={addPricingSection}
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
                onAddPlanSheet={addPlanSheet}
                onPlanSheetChange={updatePlanSheet}
                onRemovePlanSheet={removePlanSheet}
                onSmartPasteFill={fillProposalFromNotes}
                onSmartPasteNotesChange={setSmartPasteNotes}
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
    </main>
  );
}

function ProposalListView({
  proposals,
  searchQuery,
  statusFilter,
  onCreateNew,
  onDuplicate,
  onOpen,
  onOpenSettings,
  onSearchChange,
  onStatusChange,
  onStatusFilterChange,
}) {
  const filteredProposals = proposals.filter((proposal) => {
    const searchText = [
      proposal.client?.companyName,
      proposal.client?.contactName,
      proposal.project?.name,
      proposal.gcPrime?.contractorName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = searchText.includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;

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
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatOptionLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="proposal-table-wrap">
        <table className="proposal-list-table">
          <thead>
            <tr>
              <th>Proposal #</th>
              <th>Client</th>
              <th>Project</th>
              <th>Type</th>
              <th>Status</th>
              <th>Total</th>
              <th>Proposal Date</th>
              <th>Expiration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.map((proposal) => {
              const total = calculateProposalTotals(proposal).total;

              return (
                <tr key={proposal.id} onClick={() => onOpen(proposal.id)}>
                  <td>{proposal.proposalNumber}</td>
                  <td>
                    <strong>{proposal.client?.companyName}</strong>
                    <span>{proposal.client?.contactName}</span>
                  </td>
                  <td>{proposal.project?.name}</td>
                  <td>{formatOptionLabel(proposal.proposalType ?? proposal.type)}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <select value={proposal.status} onChange={(event) => onStatusChange(proposal, event.target.value)}>
                      {PROPOSAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatOptionLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatCurrency(total)}</td>
                  <td>{formatDisplayDate(proposal.proposalDate)}</td>
                  <td>{formatDisplayDate(proposal.validUntil)}</td>
                  <td>
                    <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => onOpen(proposal.id)}>
                        Open
                      </button>
                      <button type="button" onClick={() => onDuplicate(proposal)}>
                        Duplicate
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

function CompanySettingsView({ message, settings, onBackToList, onChange, onReset, onSave }) {
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

function PrintRouteToolbar({ onBackToList, onPrint }) {
  return (
    <div className="print-route-toolbar no-print">
      <button type="button" onClick={onBackToList}>
        Back to proposals
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
  saveMessage,
  onBackToList,
  onDuplicate,
  onOpenPrintView,
  onSave,
  onStatusChange,
}) {
  return (
    <section className="proposal-action-bar no-print">
      <div>
        <p>{proposal.proposalNumber}</p>
        <h2>{proposal.project?.name || "Untitled Proposal"}</h2>
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
          <button type="button" onClick={onSave}>
            Save Draft
          </button>
        ) : null}
        <button type="button" onClick={onDuplicate}>
          Duplicate
        </button>
        {!isPrintView ? (
          <button type="button" onClick={onOpenPrintView}>
            Print View
          </button>
        ) : null}
      </div>
    </section>
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
  proposal,
  onAddLineItem,
  onAddPricingSection,
  onAddScopeBullet,
  onAddScopeSection,
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
  onAddPlanSheet,
  onPlanSheetChange,
  onRemovePlanSheet,
  onSmartPasteFill,
  onSmartPasteNotesChange,
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

      <SmartPastePanel
        notes={smartPasteNotes}
        result={smartPasteResult}
        onFill={onSmartPasteFill}
        onNotesChange={onSmartPasteNotesChange}
      />

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
        <ProjectPhotoEditor photos={proposal.projectPhotos} onPhotoChange={onProjectPhotoChange} />
      </EditorSection>

      <EditorSection title="Plan Sheets / Takeoff Pages">
        <PlanSheetEditor
          planSheets={proposal.planSheets}
          onAddPlanSheet={onAddPlanSheet}
          onPlanSheetChange={onPlanSheetChange}
          onRemovePlanSheet={onRemovePlanSheet}
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

function ProjectPhotoEditor({ photos, onPhotoChange }) {
  const photoSlots = normalizeProjectPhotos(photos);

  function handleUpload(index, file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onPhotoChange(index, { src: String(reader.result || "") });
    reader.readAsDataURL(file);
  }

  return (
    <div className="project-photo-editor">
      {photoSlots.map((photo, index) => (
        <div className="project-photo-card" key={`project-photo-${index}`}>
          <div className="project-photo-preview">
            {photo.src ? <img src={photo.src} alt={photo.label || `Project photo ${index + 1}`} /> : <span>Photo {index + 1}</span>}
          </div>
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
          {photo.src ? (
            <button className="editor-secondary-button" type="button" onClick={() => onPhotoChange(index, { src: "" })}>
              Remove photo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PlanSheetEditor({ planSheets, onAddPlanSheet, onPlanSheetChange, onRemovePlanSheet }) {
  const sheets = normalizePlanSheets(planSheets);

  function handleUpload(index, file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onPlanSheetChange(index, "imageSrc", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="plan-sheet-editor">
      <p className="smart-paste-help">
        Enable only the plan and takeoff backup pages that should print with the full GC packet.
      </p>
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
              {sheet.imageSrc ? <img src={sheet.imageSrc} alt={sheet.title || "Plan sheet preview"} /> : <span>Upload plan image</span>}
            </div>
            <div className="plan-sheet-upload-controls">
              <label className="editor-field">
                <span>Plan Image Upload</span>
                <input type="file" accept="image/*" onChange={(event) => handleUpload(index, event.target.files?.[0])} />
              </label>
              {sheet.imageSrc ? (
                <button className="editor-secondary-button" type="button" onClick={() => onPlanSheetChange(index, "imageSrc", "")}>
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
    </div>
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
  const planSheetPages = getEnabledPlanSheets(proposal.planSheets);
  const firstPlanSheetPageNumber = appendixPlan.pages.length + 3;

  return (
    <section className="proposal-grid">
      <ProposalPage className="first-page">
        <CoverHeader company={company} />
        <CompanyIntro company={company} companyCredentials={companyCredentials} />
        <ProjectCards proposal={proposal} />
        {gcPrimeRows.length > 0 ? <GcPrimeNotes rows={gcPrimeRows} /> : null}
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

      {appendixPlan.pages.map((page, index) => (
        <AppendixPage
          company={company}
          key={`appendix-page-${index}`}
          page={page}
          pageNumber={index + 3}
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

  return (
    <div className={`concrete-photo ${variant}`}>
      {photo?.src ? <img src={photo.src} alt={title} /> : <div className="photo-texture" />}
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

  if (segments[0] === "settings") {
    return { view: "settings", path: "/settings" };
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
    proposalDate: formatInputDate(today),
    validUntil: formatInputDate(validUntil),
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  });
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

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

    return {
      label: hasTextValue(photo.label) ? photo.label : defaultPhoto.label,
      src: hasTextValue(photo.src) ? photo.src : "",
    };
  });
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
    imageSrc: sheet.imageSrc ?? sheet.image ?? "",
    calculationTitle: sheet.calculationTitle ?? fallback.calculationTitle ?? "Calculation Notes",
    calculationNotes: normalizePlanSheetNotes(sheet.calculationNotes ?? sheet.notes ?? fallback.calculationNotes),
    clarificationNotes: normalizePlanSheetNotes(sheet.clarificationNotes ?? fallback.clarificationNotes),
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

function createEditableProposal(seedProposal) {
  const proposal = cloneObject(seedProposal || {});
  const client = proposal.client || {};
  const project = proposal.project || {};
  const proposedSchedule = project.proposedSchedule || {};
  const proposalType = proposal.proposalType ?? proposal.type ?? "commercial";

  return {
    ...proposal,
    id: proposal.id || createProposalId(),
    status: proposal.status || "draft",
    proposalType,
    type: proposalType,
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
    concreteSpecs: {
      ...getDefaultConcreteSpecs(),
      ...(proposal.concreteSpecs || {}),
    },
    gcPrime: {
      ...getDefaultGcPrime(),
      ...(proposal.gcPrime || {}),
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
      payment: "",
      depositText: "",
      progressBilling: "",
      acceptance: "",
      ...(proposal.terms || {}),
    },
    lineItems: (proposal.lineItems || []).map((item) => ({
      ...item,
      taxable: item.taxable ?? true,
    })),
    pricingSections: normalizePricingSections(proposal.pricingSections),
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
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
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

function formatOptionLabel(value) {
  const labels = {
    add_alternate: "Add Alternate",
    allowance: "Allowance",
    base_bid: "Base Bid",
    deduct_alternate: "Deduct Alternate",
    detail_notes: "Detail Notes",
    general_backup: "General Backup",
    gc_prime: "GC / Prime Contractor",
    plan_takeoff_sheet: "Plan Takeoff Sheet",
    public_municipal: "Public / Municipal",
    shade_footing_estimate: "Shade Footing Estimate",
    unit_price: "Unit Price",
  };

  if (labels[value]) {
    return labels[value];
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  };
}

function parseProjectNotes(notes) {
  const sections = collectSmartPasteSections(notes);
  const values = {};
  const fields = [];
  const warnings = [];

  function setTextValue(key, sectionKey, label) {
    const value = getSectionText(sections, sectionKey);

    if (!hasTextValue(value)) {
      return;
    }

    values[key] = value;
    fields.push(label);
  }

  setTextValue("projectName", "projectName", "project name");
  setTextValue("projectLocation", "projectLocation", "project location");
  setTextValue("clientCompany", "clientCompany", "client/company");
  setTextValue("contactName", "contactName", "contact name");
  setTextValue("clientPhone", "clientPhone", "client phone");
  setTextValue("clientEmail", "clientEmail", "client email");
  setTextValue("billingAddress", "billingAddress", "billing address");
  setTextValue("projectAddress", "projectAddress", "project address");
  setTextValue("schedule", "schedule", "schedule");
  setTextValue("terms", "terms", "terms");
  setTextValue("rfiClarificationNotes", "rfiClarifications", "RFIs / Clarifications");
  setTextValue("addendaAcknowledged", "addendaAcknowledged", "addenda acknowledged");
  setTextValue("proposalNotes", "proposalNotes", "proposal notes");
  setTextValue("gcPrimeNotes", "gcPrimeNotes", "GC / Prime notes");
  setTextValue("concreteSpecNotes", "concreteSpecs", "concrete specs");

  const proposalType = normalizeSmartProposalType(getSectionText(sections, "proposalType"));

  if (proposalType) {
    values.proposalType = proposalType;
    fields.push("proposal type");
  }

  const scopeItems = splitSmartPasteList(getSectionText(sections, "scope"));

  if (scopeItems.length > 0) {
    values.scopeItems = scopeItems;
    fields.push("scope");
  }

  const exclusions = splitSmartPasteList(getSectionText(sections, "exclusions"));

  if (exclusions.length > 0) {
    values.exclusions = exclusions;
    fields.push("exclusions");
  }

  const assumptions = splitSmartPasteList(getSectionText(sections, "assumptions"));

  if (assumptions.length > 0) {
    values.assumptions = assumptions;
    fields.push("assumptions");
  }

  const lineItems = parseSmartPasteLineItems(sections.lineItems || [], warnings);
  const pricingParse = parseSmartPastePricingSections(sections.pricingSections || [], warnings);
  const planSheetParse = normalizeSmartPastePlanSheets(sections.planSheets || []);

  if (pricingParse.baseBidLineItem) {
    values.baseBidLineItem = pricingParse.baseBidLineItem;
    fields.push("base bid");
  }

  if (pricingParse.sections.length > 0) {
    values.pricingSections = pricingParse.sections;
    fields.push("alternates / allowances");
  }

  if (pricingParse.totalIfAllAccepted !== undefined) {
    values.totalIfAllAccepted = pricingParse.totalIfAllAccepted;
    fields.push("total if all accepted");
  }

  if (planSheetParse.length > 0) {
    values.planSheets = planSheetParse;
    fields.push("plan sheets / takeoff pages");
  }

  if ((sections.lineItems || []).length > 0 && lineItems.length === 0) {
    warnings.push("Line items were found, but none matched Description | Quantity | Unit | Unit Price.");
  }

  if (fields.length === 0 && lineItems.length === 0 && hasTextValue(notes)) {
    warnings.push("Use clear labels like Project:, Prepared for:, Scope:, or Line items: for best results.");
  }

  return {
    fields: [...new Set(fields)],
    lineItems,
    pricingSectionCount: pricingParse.sections.length,
    planSheetCount: planSheetParse.length,
    sectionsCaptured: getCapturedSmartPasteLabels(sections),
    values,
    warnings: [...new Set(warnings)],
  };
}

function applyParsedNotesToProposal(proposal, parsedNotes) {
  const nextProposal = cloneObject(proposal);
  const values = parsedNotes.values;

  if (values.projectName) {
    nextProposal.project.name = values.projectName;
  }

  if (values.projectLocation) {
    nextProposal.project.location = values.projectLocation;
  }

  if (values.clientCompany) {
    nextProposal.client.companyName = values.clientCompany;
  }

  if (values.contactName) {
    nextProposal.client.contactName = values.contactName;
  }

  if (values.clientPhone) {
    nextProposal.client.phone = values.clientPhone;
  }

  if (values.clientEmail) {
    nextProposal.client.email = values.clientEmail;
  }

  if (values.billingAddress) {
    nextProposal.client.billingAddress = values.billingAddress;
    nextProposal.client.address = values.billingAddress;
  }

  if (values.projectAddress) {
    nextProposal.client.projectAddress = values.projectAddress;
    nextProposal.project.address = values.projectAddress;
  }

  if (values.schedule) {
    nextProposal.project.estimatedDuration = values.schedule;
    nextProposal.project.proposedSchedule = {
      ...(nextProposal.project.proposedSchedule || {}),
      display: values.schedule,
    };
  }

  if (values.proposalType) {
    nextProposal.proposalType = values.proposalType;
    nextProposal.type = values.proposalType;
  }

  if (values.scopeItems) {
    nextProposal.scopeSections = [
      {
        title: "Scope of Work",
        items: values.scopeItems,
      },
    ];
  }

  if (values.exclusions) {
    nextProposal.exclusions = values.exclusions;
  }

  if (values.assumptions) {
    nextProposal.assumptions = values.assumptions;
  }

  if (values.terms) {
    nextProposal.terms = {
      ...nextProposal.terms,
      payment: values.terms,
    };
  }

  if (values.rfiClarificationNotes) {
    nextProposal.gcPrime.rfiClarificationNotes = values.rfiClarificationNotes;
  }

  if (values.addendaAcknowledged) {
    nextProposal.gcPrime.addendaAcknowledged = values.addendaAcknowledged;
  }

  if (values.proposalNotes) {
    nextProposal.proposalNotes = values.proposalNotes;
    nextProposal.notes = values.proposalNotes;
  }

  if (values.gcPrimeNotes) {
    nextProposal.gcPrime.gcPrimeNotes = values.gcPrimeNotes;
  }

  if (values.concreteSpecNotes) {
    nextProposal.concreteSpecs.notes = values.concreteSpecNotes;
  }

  if (parsedNotes.lineItems.length > 0) {
    nextProposal.lineItems = parsedNotes.lineItems;
  } else if (values.baseBidLineItem) {
    nextProposal.lineItems = [values.baseBidLineItem];
  }

  if (values.pricingSections) {
    nextProposal.pricingSections = values.pricingSections;
  }

  if (values.planSheets) {
    nextProposal.planSheets = mergePlanSheets(nextProposal.planSheets, values.planSheets);
  }

  return nextProposal;
}

function collectSmartPasteSections(notes) {
  const sections = {};
  const lines = String(notes || "").split(/\r?\n/);
  let activeKey = "";
  let activePlanSheetIndex = -1;
  let activePlanSheetField = "calculationNotes";
  const multiLineKeys = new Set([
    "scope",
    "exclusions",
    "assumptions",
    "terms",
    "lineItems",
    "rfiClarifications",
    "addendaAcknowledged",
    "proposalNotes",
    "gcPrimeNotes",
    "concreteSpecs",
    "pricingSections",
    "planSheets",
  ]);
  const textCaptureKeys = new Set([
    "rfiClarifications",
    "addendaAcknowledged",
    "proposalNotes",
    "gcPrimeNotes",
    "concreteSpecs",
  ]);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    const labelMatch = line.match(/^([^:]+):\s*(.*)$/);

    if (labelMatch) {
      const planHeading = getSmartPlanSheetHeading(labelMatch[1]);

      if (planHeading) {
        activeKey = "planSheets";
        activePlanSheetIndex = upsertSmartPastePlanSheet(sections, planHeading);
        activePlanSheetField = planHeading.noteField || "calculationNotes";
        recordSmartPasteSection(sections, "planSheets");
        appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, labelMatch[2]);
        return;
      }

      const planSubheading = getSmartPlanSheetSubheading(labelMatch[1]);

      if (planSubheading && activePlanSheetIndex >= 0) {
        activeKey = "planSheets";
        activePlanSheetField = planSubheading.noteField;
        setSmartPastePlanSheetTitle(sections, activePlanSheetIndex, planSubheading);
        appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, labelMatch[2]);
        return;
      }

      const key = getSmartPasteLabelKey(labelMatch[1]);

      if (key && isSmartPasteSectionHeading(labelMatch[1], key)) {
        activeKey = key;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, key);
        appendSmartPasteSection(sections, key, labelMatch[2]);
        return;
      }
    }

    if (textCaptureKeys.has(activeKey)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (isSmartPricingLine(line)) {
      activeKey = "pricingSections";
      activePlanSheetIndex = -1;
      recordSmartPasteSection(sections, "pricingSections");
      appendSmartPasteSection(sections, "pricingSections", line);
      return;
    }

    if (labelMatch) {
      const key = getSmartPasteLabelKey(labelMatch[1]);

      if (key) {
        activeKey = key;
        activePlanSheetIndex = -1;
        recordSmartPasteSection(sections, key);
        appendSmartPasteSection(sections, key, labelMatch[2]);
        return;
      }
    }

    if (activeKey === "planSheets" && activePlanSheetIndex >= 0) {
      appendSmartPastePlanSheetNote(sections, activePlanSheetIndex, activePlanSheetField, line);
      return;
    }

    if (activeKey === "lineItems") {
      activeKey = "lineItems";
      appendSmartPasteSection(sections, "lineItems", line);
      return;
    }

    if (multiLineKeys.has(activeKey)) {
      appendSmartPasteSection(sections, activeKey, line);
      return;
    }

    if (line.includes("|")) {
      activeKey = "lineItems";
      recordSmartPasteSection(sections, "lineItems");
      appendSmartPasteSection(sections, "lineItems", line);
    }
  });

  return sections;
}

function getSmartPlanSheetHeading(label) {
  const rawLabel = String(label || "").trim();
  const normalizedLabel = rawLabel.toLowerCase().replace(/\s+/g, " ");
  const codeMatch = normalizedLabel.match(/\b(l10[234]|l203|l601|l602)\b/i);

  if (normalizedLabel.startsWith("plan takeoff sheet")) {
    return getPlanHeadingFromCodeOrTitle(codeMatch?.[1], rawLabel, "plan_takeoff_sheet");
  }

  if (/^l10[234]\s+takeoff basis$/i.test(rawLabel)) {
    const heading = getPlanHeadingFromCodeOrTitle(codeMatch?.[1], rawLabel, "plan_takeoff_sheet");
    return { ...heading, calculationTitle: rawLabel, noteField: "calculationNotes" };
  }

  if (normalizedLabel.includes("sport court alternate")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("sport-courts-l203", "Plan Takeoff Sheet - Sport Courts / L203", "plan_takeoff_sheet"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  if (normalizedLabel.startsWith("l601 detail notes")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("l601", rawLabel, "detail_notes"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  if (normalizedLabel.startsWith("l602 fence") || normalizedLabel.startsWith("l602 site furnishing")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("l602", rawLabel, "detail_notes"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  if (normalizedLabel.startsWith("shade footing estimate")) {
    return {
      ...getPlanHeadingFromCodeOrTitle("shade-footing-estimate", rawLabel, "shade_footing_estimate"),
      calculationTitle: rawLabel,
      noteField: "calculationNotes",
    };
  }

  return null;
}

function getPlanHeadingFromCodeOrTitle(code, fallbackTitle, fallbackType) {
  const matchKey = normalizePlanSheetMatchCode(code || fallbackTitle);
  const defaultSheet = defaultPlanSheets.find((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

  if (defaultSheet) {
    return {
      matchKey: defaultSheet.matchKey,
      pageType: defaultSheet.pageType,
      title: defaultSheet.title,
      subtitle: defaultSheet.subtitle,
      calculationTitle: defaultSheet.calculationTitle,
      noteField: "calculationNotes",
    };
  }

  return {
    matchKey,
    pageType: fallbackType,
    title: fallbackTitle,
    subtitle: "",
    calculationTitle: "Calculation Notes",
    noteField: "calculationNotes",
  };
}

function getSmartPlanSheetSubheading(label) {
  const rawLabel = String(label || "").trim();
  const normalizedLabel = rawLabel.toLowerCase().replace(/\s+/g, " ");

  if (/^clarifications?$/.test(normalizedLabel)) {
    return { noteField: "clarificationNotes" };
  }

  if (/takeoff basis$/.test(normalizedLabel) || normalizedLabel.includes("calculation")) {
    return { calculationTitle: rawLabel, noteField: "calculationNotes" };
  }

  return null;
}

function upsertSmartPastePlanSheet(sections, heading) {
  if (!sections.planSheets) {
    sections.planSheets = [];
  }

  const matchKey = normalizePlanSheetMatchCode(heading.matchKey || heading.title);
  const existingIndex = sections.planSheets.findIndex((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

  if (existingIndex >= 0) {
    sections.planSheets[existingIndex] = {
      ...sections.planSheets[existingIndex],
      ...heading,
      matchKey,
      enabled: true,
    };
    return existingIndex;
  }

  sections.planSheets.push({
    id: createProposalId(),
    enabled: true,
    imageSrc: "",
    calculationNotes: [],
    clarificationNotes: [],
    ...heading,
    matchKey,
  });

  return sections.planSheets.length - 1;
}

function setSmartPastePlanSheetTitle(sections, index, subheading) {
  if (!sections.planSheets?.[index] || !subheading.calculationTitle) {
    return;
  }

  sections.planSheets[index].calculationTitle = subheading.calculationTitle;
}

function appendSmartPastePlanSheetNote(sections, index, field, value) {
  const textValue = String(value || "").trim();

  if (!textValue || !sections.planSheets?.[index]) {
    return;
  }

  const targetField = field === "clarificationNotes" ? "clarificationNotes" : "calculationNotes";

  if (!Array.isArray(sections.planSheets[index][targetField])) {
    sections.planSheets[index][targetField] = [];
  }

  sections.planSheets[index][targetField].push(textValue);
}

function normalizePlanSheetMatchCode(value) {
  const textValue = String(value || "").toLowerCase();
  const codeMatch = textValue.match(/\b(l10[234]|l203|l601|l602)\b/);

  if (codeMatch) {
    const code = codeMatch[1].toLowerCase();
    return code === "l203" ? "sport-courts-l203" : code;
  }

  if (textValue.includes("sport court")) {
    return "sport-courts-l203";
  }

  if (textValue.includes("shade footing")) {
    return "shade-footing-estimate";
  }

  return createPlanSheetMatchKey(value);
}

function getSmartPasteLabelKey(label) {
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, " ");
  const labels = {
    "addenda acknowledged": "addendaAcknowledged",
    "addendum acknowledged": "addendaAcknowledged",
    address: "billingAddress",
    allowances: "pricingSections",
    alternates: "pricingSections",
    assumptions: "assumptions",
    client: "clientCompany",
    "concrete specs": "concreteSpecs",
    contact: "contactName",
    email: "clientEmail",
    exclusions: "exclusions",
    "gc / prime notes": "gcPrimeNotes",
    "gc prime notes": "gcPrimeNotes",
    "line items": "lineItems",
    "line item": "lineItems",
    location: "projectLocation",
    phone: "clientPhone",
    "prepared for": "clientCompany",
    project: "projectName",
    "project address": "projectAddress",
    "project location": "projectLocation",
    "project name": "projectName",
    "proposal notes": "proposalNotes",
    "proposal type": "proposalType",
    "rfi / clarification": "rfiClarifications",
    "rfis / clarifications": "rfiClarifications",
    schedule: "schedule",
    scope: "scope",
    terms: "terms",
    "total if all accepted": "pricingSections",
    "total if all alternates accepted": "pricingSections",
  };

  return labels[normalizedLabel] || "";
}

function isSmartPasteSectionHeading(label, key) {
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, " ");
  const sectionHeadingLabels = new Set([
    "addenda acknowledged",
    "addendum acknowledged",
    "allowances",
    "alternates",
    "assumptions",
    "concrete specs",
    "exclusions",
    "gc / prime notes",
    "gc prime notes",
    "line item",
    "line items",
    "proposal notes",
    "rfi / clarification",
    "rfis / clarifications",
    "scope",
    "terms",
  ]);

  return sectionHeadingLabels.has(normalizedLabel) || key === "lineItems";
}

function recordSmartPasteSection(sections, key) {
  if (!sections.__capturedKeys) {
    sections.__capturedKeys = [];
  }

  if (!sections.__capturedKeys.includes(key)) {
    sections.__capturedKeys.push(key);
  }
}

function getCapturedSmartPasteLabels(sections) {
  const labels = {
    addendaAcknowledged: "Addenda Acknowledged",
    assumptions: "Assumptions",
    billingAddress: "Billing Address",
    clientCompany: "Client",
    clientEmail: "Client Email",
    clientPhone: "Client Phone",
    concreteSpecs: "Concrete Specs",
    contactName: "Contact",
    exclusions: "Exclusions",
    gcPrimeNotes: "GC / Prime Notes",
    lineItems: "Line Items",
    planSheets: "Plan Sheets / Takeoff Pages",
    pricingSections: "Alternates / Allowances",
    projectAddress: "Project Address",
    projectLocation: "Project Location",
    projectName: "Project",
    proposalNotes: "Proposal Notes",
    proposalType: "Proposal Type",
    rfiClarifications: "RFIs / Clarifications",
    schedule: "Schedule",
    scope: "Scope",
    terms: "Terms",
  };

  return (sections.__capturedKeys || []).map((key) => labels[key] || key);
}

function appendSmartPasteSection(sections, key, value) {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return;
  }

  if (!sections[key]) {
    sections[key] = [];
  }

  sections[key].push(textValue);
}

function getSectionText(sections, key) {
  return (sections[key] || []).join("\n").trim();
}

function normalizeSmartPastePlanSheets(planSheets = []) {
  if (!Array.isArray(planSheets)) {
    return [];
  }

  return planSheets
    .map((sheet, index) => normalizePlanSheet({ ...sheet, enabled: true }, index))
    .filter(
      (sheet) =>
        hasTextValue(sheet.title) ||
        normalizePlanSheetNotes(sheet.calculationNotes).length > 0 ||
        normalizePlanSheetNotes(sheet.clarificationNotes).length > 0,
    );
}

function mergePlanSheets(currentPlanSheets = [], parsedPlanSheets = []) {
  const mergedSheets = normalizePlanSheets(currentPlanSheets);

  parsedPlanSheets.forEach((parsedSheet) => {
    const normalizedSheet = normalizePlanSheet({ ...parsedSheet, enabled: true });
    const matchKey = getPlanSheetMatchKey(normalizedSheet);
    const existingIndex = mergedSheets.findIndex((sheet) => getPlanSheetMatchKey(sheet) === matchKey);

    if (existingIndex >= 0) {
      mergedSheets[existingIndex] = {
        ...mergedSheets[existingIndex],
        ...normalizedSheet,
        imageSrc: mergedSheets[existingIndex].imageSrc || normalizedSheet.imageSrc,
        enabled: true,
      };
      return;
    }

    mergedSheets.push(normalizedSheet);
  });

  return mergedSheets;
}

function splitSmartPasteList(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
}

function parseSmartPasteLineItems(lines, warnings) {
  return lines
    .map((line) => parseSmartPasteLineItem(line, warnings))
    .filter(Boolean)
    .map((item, index) => ({ ...item, itemNumber: String(index + 1) }));
}

function parseSmartPastePricingSections(lines, warnings) {
  const result = {
    baseBidLineItem: null,
    sections: [],
    totalIfAllAccepted: undefined,
  };

  lines.forEach((line) => {
    const parsed = parseSmartPastePricingLine(line, warnings);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "base_bid") {
      result.baseBidLineItem = {
        itemNumber: "1",
        description: parsed.label || "Base Bid",
        quantity: 1,
        unit: "LS",
        unitPrice: parsed.amount,
        taxable: true,
      };
      return;
    }

    if (parsed.kind === "total_if_all") {
      result.totalIfAllAccepted = parsed.amount;
      return;
    }

    result.sections.push({
      id: createProposalId(),
      type: parsed.kind,
      label: parsed.label,
      description: parsed.description,
      amount: parsed.amount,
      included: parsed.kind === "allowance",
    });
  });

  return result;
}

function parseSmartPastePricingLine(line, warnings) {
  const match = String(line).match(
    /^(base bid|allowance|add alternate(?:\s+\d+|\s+[a-z]+)?|deduct alternate(?:\s+\d+|\s+[a-z]+)?|unit price(?:\s+\d+|\s+[a-z]+)?|total if all(?: alternates)? accepted)\s*:\s*(.+)$/i,
  );

  if (!match) {
    return null;
  }

  const rawLabel = match[1].trim();
  const rawValue = match[2].trim();
  const normalizedLabel = rawLabel.toLowerCase();
  const amountParts = rawValue.split("|").map((part) => part.trim()).filter(Boolean);
  const amount = toEditableNumber(amountParts[amountParts.length - 1]);

  if (amount <= 0) {
    warnings.push(`Skipped pricing section "${line}" because the amount could not be parsed.`);
    return null;
  }

  if (normalizedLabel.startsWith("total if all")) {
    return { kind: "total_if_all", amount };
  }

  if (normalizedLabel === "base bid") {
    return {
      kind: "base_bid",
      label: amountParts.length > 1 ? amountParts[0] : "Base Bid",
      description: "",
      amount,
    };
  }

  const type = getSmartPricingType(normalizedLabel);
  const numberedLabel = rawLabel.replace(/\s+/g, " ");
  const valueLabel = amountParts.length > 1 ? amountParts.slice(0, -1).join(" | ") : numberedLabel;
  const hasNumberedPrefix = /\d|[a-z]$/i.test(numberedLabel.replace(/^(add|deduct) alternate\s*/i, ""));

  return {
    kind: type,
    label: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? numberedLabel : valueLabel,
    description: hasNumberedPrefix && type !== "allowance" && type !== "unit_price" ? valueLabel : "",
    amount,
  };
}

function isSmartPricingLine(line) {
  return /^(base bid|allowance|add alternate(?:\s+\d+|\s+[a-z]+)?|deduct alternate(?:\s+\d+|\s+[a-z]+)?|unit price(?:\s+\d+|\s+[a-z]+)?|total if all(?: alternates)? accepted)\s*:/i.test(
    String(line).trim(),
  );
}

function getSmartPricingType(label) {
  if (label.startsWith("allowance")) {
    return "allowance";
  }

  if (label.startsWith("deduct alternate")) {
    return "deduct_alternate";
  }

  if (label.startsWith("unit price")) {
    return "unit_price";
  }

  return "add_alternate";
}

function parseSmartPasteLineItem(line, warnings) {
  const parts = String(line)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    if (hasTextValue(line)) {
      warnings.push(`Skipped line item "${line}" because it does not use Description | Quantity | Unit | Unit Price.`);
    }

    return null;
  }

  const lineParts = parts.length >= 5 && /^\d+$/.test(parts[0]) ? parts.slice(1) : parts;
  const [description, quantityText, unitText, unitPriceText] = lineParts;
  const quantity = toEditableNumber(quantityText);
  const unitPrice = toEditableNumber(unitPriceText);
  const unit = String(unitText || "").trim().toUpperCase();

  if (!hasTextValue(description) || quantity <= 0 || !LINE_ITEM_UNITS.includes(unit) || unitPrice < 0) {
    warnings.push(`Skipped line item "${line}" because quantity, unit, or unit price could not be parsed.`);
    return null;
  }

  return {
    itemNumber: "",
    description,
    quantity,
    unit,
    unitPrice,
    taxable: true,
  };
}

function normalizeSmartProposalType(value) {
  const textValue = String(value || "").toLowerCase();

  if (!textValue) {
    return "";
  }

  if (textValue.includes("gc") || textValue.includes("prime")) {
    return "gc_prime";
  }

  if (textValue.includes("residential")) {
    return "residential";
  }

  if (textValue.includes("public") || textValue.includes("municipal")) {
    return "public_municipal";
  }

  if (textValue.includes("commercial")) {
    return "commercial";
  }

  return "";
}

function toEditableNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}
