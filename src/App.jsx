import { useEffect, useState } from "react";
import {
  LINE_ITEM_UNITS,
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
  ["01", "PROVEN RELIABILITY", "On time. On budget. Built to last."],
  ["02", "QUALITY CRAFTSMANSHIP", "Clean finishes. Sharp details. Premium materials."],
  ["03", "SAFETY FIRST", "Safe jobsites for your team and ours."],
  ["04", "BUILT ON INTEGRITY", "Clear communication. Honest work. Local service."],
];

const defaultProjectPhotos = [
  { label: "Architectural Steps", src: "" },
  { label: "Finished Flatwork", src: "" },
  { label: "Control Joints", src: "" },
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
                onChange={updateProposalField}
                onFinancialChange={updateFinancialField}
                onLineItemChange={updateLineItem}
                onRemoveLineItem={removeLineItem}
                onAddScopeBullet={addScopeBullet}
                onAddScopeSection={addScopeSection}
                onRemoveScopeBullet={removeScopeBullet}
                onRemoveScopeSection={removeScopeSection}
                onScopeBulletChange={updateScopeBullet}
                onScopeTitleChange={updateScopeSectionTitle}
                onConcreteSpecChange={updateConcreteSpec}
                onGcPrimeChange={updateGcPrimeField}
                onProjectPhotoChange={updateProjectPhoto}
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
  onAddScopeBullet,
  onAddScopeSection,
  onChange,
  onFinancialChange,
  onLineItemChange,
  onRemoveLineItem,
  onRemoveScopeBullet,
  onRemoveScopeSection,
  onScopeBulletChange,
  onScopeTitleChange,
  onConcreteSpecChange,
  onGcPrimeChange,
  onProjectPhotoChange,
  validation,
  validationNotice,
}) {
  const proposalTotals = calculateProposalTotals(proposal);
  const isGcPrime = proposal.proposalType === "gc_prime";

  return (
    <aside className="editor-panel no-print" aria-label="Proposal editor">
      <ValidationPanel notice={validationNotice} validation={validation} />

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
  const gcPrimeRows = isGcPrime ? buildGcPrimeRows(proposal.gcPrime) : [];
  const scopeSplitIndex = Math.ceil(proposal.scopeSections.length / 2);
  const scopeLeft = proposal.scopeSections.slice(0, scopeSplitIndex);
  const scopeRight = proposal.scopeSections.slice(scopeSplitIndex);
  const specRows = buildConcreteSpecRows(proposal.concreteSpecs);
  const specSplitIndex = Math.ceil(specRows.length / 2);
  const specsLeft = specRows.slice(0, specSplitIndex);
  const specsRight = specRows.slice(specSplitIndex);
  const lineItems = proposal.lineItems.map((item, index) => {
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
        <SectionTitle icon="01" title="Scope of Work" />
        <div className="two-column section-pad">
          <ScopeColumn groups={scopeLeft} />
          <ScopeColumn groups={scopeRight} />
        </div>

        <SectionTitle icon="02" title="Concrete Specifications" className="section-title-spaced" />
        <div className="two-column spec-grid">
          <SpecTable rows={specsLeft} />
          <SpecTable rows={specsRight} />
        </div>

        <SectionTitle icon="$" title="Pricing" className="section-title-spaced" />
        <PricingTable items={lineItems} total={totalProposalPrice} />

        <div className="two-column lower-grid">
          <div>
            <MiniHeading icon="!" title="Exclusions / Assumptions" />
            <ul className="bullet-list compact-list">
              {proposal.exclusions.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <MiniHeading icon={"\u2713"} title="Terms & Acceptance" />
            <p className="terms-copy">{termsCopy}</p>
            <SignatureBlock companyName={company.name} />
          </div>
        </div>

        <div className="footer-push">
          <PageFooter company={company} companyCredentials={companyCredentials} />
        </div>
      </ProposalPage>
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
    ["CO", company.name],
    ["PH", company.phone],
    ["EM", company.email],
    ["OR", company.serviceArea],
    ["CC", `${companyCredentials}\n${company.license}`],
  ];

  return (
    <section className="company-intro">
      <div className="contact-list">
        {items.map(([icon, text]) => (
          <div key={text} className="contact-row">
            <span>{icon}</span>
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
  const proposalType = formatOptionLabel(proposal.proposalType ?? proposal.type);

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
        <Field label="Proposal #" value={proposal.proposalNumber} />
        <Field label="Proposal Date" value={formatDisplayDate(proposal.proposalDate)} />
        <Field label="Expiration" value={formatDisplayDate(proposal.validUntil)} />
        <Field label="Proposal Type" value={proposalType} />
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
            <div>{icon}</div>
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
        <span>{icon}</span>
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

function MiniHeading({ icon, title }) {
  return (
    <div className="mini-heading">
      <span>{icon}</span>
      <h3>{title}</h3>
      <div className="gold-rule mini-rule" />
    </div>
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
        <p>Phone: {company.phone}</p>
        <p>{company.license}</p>
        <p>Email: {company.email}</p>
        <p>{companyCredentials}</p>
        <p>{company.serviceArea}</p>
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
    gc_prime: "GC / Prime Contractor",
    public_municipal: "Public / Municipal",
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

function toEditableNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}
