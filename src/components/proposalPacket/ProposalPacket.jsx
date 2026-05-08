import { Fragment, createContext, useContext, useState } from "react";
import { calculateProposalTotals, formatCurrency, normalizePacketBuilder } from "../../proposalData.js";
import { formatDisplayDate, formatOptionLabel } from "../../utils/formatting/display.js";
import {
  cleanPrintableText,
  cleanProposalForPrint,
  getCoverPageTextPreview,
  getPrintablePreparedForLines,
  hasPrintableText,
} from "../../utils/proposalPacket/printContentCleanup.js";
import {
  buildResidentialPaymentTermsCopy,
  buildResidentialOptionalAddOnPrintPages,
  buildResidentialPricingOptionPrintPages,
  buildResidentialOptionBreakdowns,
  buildResidentialPricingOptionRows,
  formatResidentialCurrency,
  formatResidentialMoneyText,
  formatResidentialMoneyTextList,
  getResidentialComparisonAddOn,
  getResidentialCoverDescription,
  getResidentialCoverSchedule,
  getResidentialOptionalAddOns,
  getPrintableResidentialOptionImages,
  hasResidentialChooseOnePricing,
  splitResidentialOptionalAddOnsForPrint,
} from "../../utils/proposalPacket/residentialPricing.js";
import {
  inferProposalModeFromProposal,
  isGcPrimePacketMode,
  isResidentialProposalMode,
} from "../../utils/proposals/proposalModes.js";
import {
  getProposalPdfStyleClassNames,
  getProposalPdfStyleForMode,
  normalizeProposalPdfStyle,
} from "../../utils/proposalPacket/proposalPdfStyle.js";

const legacyLogoSrc = "/assets/last-yard-logo.jpg";
const logoSrc = legacyLogoSrc;
const fallbackLogoSources = ["/assets/last-yard/last-yard-concrete-logo.png", "/last-yard-concrete-logo.png"];
const PacketRenderContext = createContext(null);

const defaultProjectPhotos = [
  { label: "Architectural Steps", src: "" },
  { label: "Finished Flatwork", src: "" },
  { label: "Control Joints", src: "" },
];

const trustCards = [
  ["shield", "PROVEN RELIABILITY", "On time. On budget. Built to last."],
  ["tools", "QUALITY CRAFTSMANSHIP", "Clean finishes. Sharp details. Premium materials."],
  ["hardhat", "SAFETY FIRST", "Safe jobsites for your team and ours."],
  ["handshake", "BUILT ON INTEGRITY", "Clear communication. Honest work. Local service."],
];

function orderPacketRenderItems(proposal, items, getPacketBuilderSectionStatus) {
  if (proposal.packetMode !== "full_gc_packet") {
    return items;
  }

  const builder = normalizePacketBuilder(proposal.packetBuilder);
  const orderBySectionId = new Map(builder.map((section) => [section.id, section.order]));
  const includedBySectionId = new Map(builder.map((section) => [section.id, section.included !== false]));

  return items
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter((item) => {
      if (includedBySectionId.get(item.sectionId) === false) {
        return false;
      }

      const status = getPacketBuilderSectionStatus?.(proposal, item.sectionId);
      return !status || status.hasData;
    })
    .sort((a, b) => {
      const orderA = orderBySectionId.get(a.sectionId) ?? 999;
      const orderB = orderBySectionId.get(b.sectionId) ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.originalIndex - b.originalIndex;
    });
}

function getStructuredPacketBuilderSectionId(page = {}) {
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

function usePacketHelpers() {
  const helpers = useContext(PacketRenderContext);

  if (!helpers) {
    throw new Error("Proposal packet helpers were not provided.");
  }

  return helpers;
}
export function ProposalPreview({ companySettings, proposal, helpers }) {
  return (
    <PacketRenderContext.Provider value={helpers}>
      <ProposalPacketContent companySettings={companySettings} proposal={proposal} />
    </PacketRenderContext.Provider>
  );
}

function formatResidentialProposalTextForPrint(proposal = {}) {
  return {
    ...proposal,
    project: formatResidentialTextObject(proposal.project, proposal, ["proposedSchedule"]),
    client: formatResidentialTextObject(proposal.client, proposal),
    scopeSections: (proposal.scopeSections || []).map((section) => ({
      ...section,
      title: formatResidentialMoneyText(section.title, proposal),
      items: formatResidentialMoneyTextList(section.items, proposal),
    })),
    exclusions: formatResidentialMoneyTextList(proposal.exclusions, proposal),
    assumptions: formatResidentialMoneyTextList(proposal.assumptions, proposal),
    proposalNotes: formatResidentialMoneyText(proposal.proposalNotes, proposal),
    notes: formatResidentialMoneyText(proposal.notes, proposal),
    takeoffQuantityBackup: formatResidentialMoneyText(proposal.takeoffQuantityBackup, proposal),
    quantityBackup: formatResidentialMoneyText(proposal.quantityBackup, proposal),
    concreteSpecs: formatResidentialTextObject(proposal.concreteSpecs, proposal),
    terms: formatResidentialTextObject(proposal.terms, proposal),
    gcPrime: formatResidentialTextObject(proposal.gcPrime, proposal, ["scopeControlSummary"]),
  };
}

function formatResidentialTextObject(value = {}, proposal = {}, skipKeys = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const skipKeySet = new Set(skipKeys);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (skipKeySet.has(key)) {
        return [key, item];
      }

      if (typeof item === "string" || typeof item === "number") {
        return [key, formatResidentialMoneyText(item, proposal)];
      }

      if (item && typeof item === "object" && !Array.isArray(item)) {
        return [key, formatResidentialTextObject(item, proposal)];
      }

      if (Array.isArray(item)) {
        return [
          key,
          item.map((entry) =>
            typeof entry === "string" || typeof entry === "number" ? formatResidentialMoneyText(entry, proposal) : entry,
          ),
        ];
      }

      return [key, item];
    }),
  );
}

function ProposalPacketContent({ companySettings, proposal }) {
  const {
    buildAppendixPlan,
    buildConcreteSpecRows,
    buildGcPrimeRows,
    buildStructuredPacketPages,
    buildTermsCopy,
    formatQuantity,
    getPacketBuilderSectionStatus,
    getEnabledPlanSheets,
    toEditableNumber,
  } = usePacketHelpers();
  const cleanedProposal = cleanProposalForPrint(proposal);
  const proposalMode = inferProposalModeFromProposal(cleanedProposal);
  const settingsPdfStyle = companySettings?.proposalPdfStyle
    ? getProposalPdfStyleForMode(companySettings.proposalPdfStyle, proposalMode)
    : null;
  const pdfStyle = normalizeProposalPdfStyle(settingsPdfStyle || cleanedProposal.pdfStyle, proposalMode);
  const pdfStyleClassNames = getProposalPdfStyleClassNames(pdfStyle, proposalMode);
  const isResidentialMode = isResidentialProposalMode(proposalMode);
  const packetProposal = isResidentialMode ? formatResidentialProposalTextForPrint(cleanedProposal) : cleanedProposal;
  const company = packetProposal.company;
  const companyCredentials = company.credentials.join(" | ");
  const isGcPrime = isGcPrimePacketMode(proposalMode);
  const appendixPlan = buildAppendixPlan(packetProposal);
  const gcPrimeRows = isGcPrime ? buildGcPrimeRows(appendixPlan.mainGcPrime) : [];
  const scopeSplitIndex = Math.ceil(appendixPlan.mainScopeSections.length / 2);
  const scopeLeft = appendixPlan.mainScopeSections.slice(0, scopeSplitIndex);
  const scopeRight = appendixPlan.mainScopeSections.slice(scopeSplitIndex);
  const specRows = buildConcreteSpecRows(packetProposal.concreteSpecs, { residential: isResidentialMode });
  const specSplitIndex = Math.ceil(specRows.length / 2);
  const specsLeft = specRows.slice(0, specSplitIndex);
  const specsRight = specRows.slice(specSplitIndex);
  const specTables = isResidentialMode ? [specRows] : [specsLeft, specsRight];
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
  const proposalTotals = calculateProposalTotals(packetProposal);
  const totalProposalPrice = formatCurrency(proposalTotals.total);
  const termsCopy = isResidentialMode ? buildResidentialPaymentTermsCopy(packetProposal) : buildTermsCopy(packetProposal.terms);
  const visiblePricingSections = isResidentialMode ? [] : appendixPlan.mainPricingSections;
  const hasChooseOnePricing = hasResidentialChooseOnePricing(packetProposal);
  const residentialPricingOptionPrintPages = buildResidentialPricingOptionPrintPages(packetProposal);
  const { withoutPhotos: residentialTextOptionalAddOns } = splitResidentialOptionalAddOnsForPrint(packetProposal);
  const residentialOptionalAddOnPrintPages = buildResidentialOptionalAddOnPrintPages(packetProposal);
  const structuredPacketPages = isResidentialMode ? [] : buildStructuredPacketPages(packetProposal);
  const residentialOptionBreakdownPages = buildResidentialOptionBreakdownPages(packetProposal);
  const planSheetPages = isResidentialMode ? getEnabledPlanSheets(packetProposal.planSheets).filter(hasResidentialPlanSheetPrintData) : getEnabledPlanSheets(packetProposal.planSheets);
  const appendixPages = isResidentialMode ? [] : appendixPlan.pages;
  const hasExtendedPacketPages =
    structuredPacketPages.length > 0 || residentialOptionBreakdownPages.length > 0 || appendixPages.length > 0 || planSheetPages.length > 0;
  const showCoverGcPrimeNotes = gcPrimeRows.length > 0 && !hasExtendedPacketPages;
  const coverSummaryItem = {
    key: "cover-summary",
    sectionId: "cover_summary",
    render: () => (
      <ProposalPage className="first-page">
        <CoverHeader company={company} />
        <CompanyIntro company={company} companyCredentials={companyCredentials} />
        <ProjectCards proposal={packetProposal} />
        {showCoverGcPrimeNotes ? <GcPrimeNotes rows={gcPrimeRows} /> : null}
        <div className="page-one-feature-block">
          <PhotoBand photos={packetProposal.projectPhotos} />
          {!isResidentialMode ? <WhyChoose /> : null}
        </div>
        <PageFooter company={company} companyCredentials={companyCredentials} compact />
      </ProposalPage>
    ),
  };
  const detailsPricingItem = {
    key: "details-pricing",
    sectionId: "details_pricing",
    render: () => (
      <ProposalPage>
        <SectionTitle icon="clipboard" title="Scope of Work" />
        <div className="two-column section-pad">
          <ScopeColumn groups={scopeLeft} />
          <ScopeColumn groups={scopeRight} />
        </div>
        {!isResidentialMode && appendixPlan.scopeNeedsAppendix ? <AppendixReferenceNote message="See Appendix for detailed scope backup." /> : null}

        {specRows.length > 0 ? (
          <>
            <SectionTitle icon="gear" title="Concrete Specifications" className="section-title-spaced" />
            <div className="two-column spec-grid">
              {specTables.map((rows, index) => (
                <SpecTable rows={rows} key={`spec-table-${index}`} />
              ))}
            </div>
          </>
        ) : null}

        <SectionTitle icon="dollar" title="Pricing" className="section-title-spaced" />
        <PricingTable items={lineItems} total={totalProposalPrice} />
        {visiblePricingSections.length > 0 ? <AlternatesAllowancesTable sections={visiblePricingSections} totals={proposalTotals} /> : null}

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
        {!isResidentialMode && appendixPlan.referenceNotes.length > 0 ? <AppendixReferenceNote notes={appendixPlan.referenceNotes} /> : null}

        <div className="footer-push">
          <PageFooter company={company} companyCredentials={companyCredentials} />
        </div>
      </ProposalPage>
    ),
  };
  const structuredPacketItems = structuredPacketPages.map((page) => ({
    key: page.key,
    sectionId: getStructuredPacketBuilderSectionId(page),
    render: (pageNumber) => (
      <StructuredPacketPage
        company={company}
        page={page}
        pageNumber={pageNumber}
        projectName={packetProposal.project?.name}
      />
    ),
  }));
  const residentialOptionBreakdownItems = residentialOptionBreakdownPages.map((page) => ({
    key: page.key,
    sectionId: "schedule_of_values",
    render: (pageNumber) => (
      <ResidentialOptionBreakdownsPage company={company} page={page} pageNumber={pageNumber} projectName={packetProposal.project?.name} />
    ),
  }));
  const appendixItems = appendixPages.map((page, index) => ({
    key: `appendix-page-${index}`,
    sectionId: "appendix_overflow",
    render: (pageNumber) => (
      <AppendixPage
        company={company}
        page={page}
        pageNumber={pageNumber}
        projectName={packetProposal.project?.name}
      />
    ),
  }));
  const planSheetItems = planSheetPages.map((sheet, index) => ({
    key: sheet.id || sheet.matchKey || `plan-sheet-page-${index}`,
    sectionId: "plan_sheet_pages",
    render: (pageNumber) => (
      <PlanSheetPage
        company={company}
        pageNumber={pageNumber}
        projectName={packetProposal.project?.name}
        sheet={sheet}
      />
    ),
  }));
  const residentialPricingItems = residentialPricingOptionPrintPages.map((page) => ({
    key: page.key,
    sectionId: "residential_pricing_options",
    render: (pageNumber) => (
      <ResidentialPricingPage
        company={company}
        optionRows={page.options}
        pageIndex={page.pageIndex}
        pageCount={page.pageCount}
        pageNumber={pageNumber}
        projectName={packetProposal.project?.name}
        proposal={packetProposal}
        addOns={page.showAddOns ? residentialTextOptionalAddOns : []}
        pdfStyle={pdfStyle}
        showAddOns={page.showAddOns}
      />
    ),
  }));
  const residentialOptionalAddOnItems = residentialOptionalAddOnPrintPages.map((page) => ({
    key: page.key,
    sectionId: "residential_optional_add_on_photos",
    render: (pageNumber) => (
      <ResidentialOptionalAddOnPage
        company={company}
        page={page}
        pageNumber={pageNumber}
        projectName={packetProposal.project?.name}
      />
    ),
  }));
  const residentialPacketItems = [
    coverSummaryItem,
    ...residentialPricingItems,
    ...residentialOptionalAddOnItems,
    ...residentialOptionBreakdownItems,
    {
      key: "residential-scope",
      sectionId: "residential_scope",
      render: (pageNumber) => (
        <ResidentialScopePage
          company={company}
          exclusions={appendixPlan.mainExclusions}
          pageNumber={pageNumber}
          pdfStyle={pdfStyle}
          projectName={packetProposal.project?.name}
          scopeLeft={scopeLeft}
          scopeRight={scopeRight}
          specRows={specRows}
        />
      ),
    },
    ...planSheetItems,
    {
      key: "residential-payment-terms",
      sectionId: "residential_payment_terms",
      render: (pageNumber) => (
        <ResidentialPaymentTermsPage
          company={company}
          pageNumber={pageNumber}
          pdfStyle={pdfStyle}
          projectName={packetProposal.project?.name}
          termsCopy={termsCopy}
        />
      ),
    },
  ];
  const standardPacketItems = [
    coverSummaryItem,
    detailsPricingItem,
    ...structuredPacketItems,
    ...appendixItems,
    ...planSheetItems,
  ];
  const packetItems = orderPacketRenderItems(
    packetProposal,
    isResidentialMode && hasChooseOnePricing ? residentialPacketItems : standardPacketItems,
    getPacketBuilderSectionStatus,
  );

  return (
    <section className={`proposal-grid ${pdfStyleClassNames}`}>
      {packetItems.map((item, index) => (
        <Fragment key={item.key}>{item.render(index + 1)}</Fragment>
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
  const { formatStructuredCell } = usePacketHelpers();

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
                <td key={column.key}>{formatStructuredCell(row[column.key], column.key)}</td>
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

function buildResidentialOptionBreakdownPages(proposal = {}) {
  const breakdowns = buildResidentialOptionBreakdowns(proposal);

  if (breakdowns.length === 0) {
    return [];
  }

  return chunkResidentialOptionBreakdowns(breakdowns, 2).map((options, index, chunks) => ({
    key: `residential-option-breakdowns-${index}`,
    title: chunks.length > 1 ? `Schedule of Values - Pricing Options (${index + 1})` : "Schedule of Values - Pricing Options",
    options,
  }));
}

function ResidentialOptionBreakdownsPage({ company, page, pageNumber, projectName }) {
  return (
    <ProposalPage className="structured-packet-page residential-option-breakdowns-page">
      <header className="structured-packet-header">
        <div>
          <p>{company.name}</p>
          <h2>{page.title}</h2>
        </div>
        <div>
          <span>Project</span>
          <strong>{projectName || "Residential Pricing Options"}</strong>
        </div>
      </header>

      <div className="structured-packet-body">
        <div className="structured-accent" />
        <p className="structured-packet-note">
          Customer to select one main option. Option breakdowns are shown separately and are not added together.
        </p>
        <div className="residential-option-breakdowns">
          {page.options.map((option) => (
            <section className="residential-option-breakdown" key={option.id || option.name}>
              <div className="residential-option-breakdown-heading">
                <h3>{option.name}</h3>
                <span>{formatResidentialCurrency(option.price)}</span>
              </div>
              <table className="structured-packet-table scheduleOfValues residential-option-sov-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {option.scheduleOfValues.map((row, index) => (
                    <tr key={row.id || `${option.name}-sov-${index}`}>
                      <td>{row.item || "-"}</td>
                      <td>{row.description || row.pricingBasis || "-"}</td>
                      <td>{formatResidentialCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2">{option.totalMatchesOption ? "Option Total" : "Breakdown Total - Review"}</td>
                    <td>{formatResidentialCurrency(option.rowsTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          ))}
        </div>
      </div>

      <footer className="structured-packet-footer">
        <span>{projectName || "Residential pricing options"}</span>
        <span>{company.name}</span>
        <span>Packet Page {pageNumber}</span>
      </footer>
    </ProposalPage>
  );
}

function ResidentialPricingPage({
  addOns,
  company,
  optionRows,
  pageCount = 1,
  pageIndex = 0,
  pageNumber,
  pdfStyle,
  projectName,
  proposal,
  showAddOns = true,
}) {
  const pageTitle = pageCount > 1 ? `Customer Pricing Options (${pageIndex + 1})` : "Customer Pricing Options";

  return (
    <ProposalPage className="structured-packet-page residential-pricing-page">
      <ResidentialPacketHeader company={company} pageTitle={pageTitle} projectName={projectName} />

      <div className="structured-packet-body residential-page-body">
        <div className="structured-accent" />
        <p className="structured-packet-note">
          Customer to select one main option. Optional add-ons are shown with each option so the total is clear before acceptance.
        </p>
        <ResidentialPricingOptionsTable
          addOns={addOns}
          optionRows={optionRows}
          pdfStyle={pdfStyle}
          proposal={proposal}
          showAddOns={showAddOns}
        />
      </div>

      <ResidentialPacketFooter company={company} pageNumber={pageNumber} projectName={projectName} />
    </ProposalPage>
  );
}

function ResidentialOptionalAddOnPage({ company, page, pageNumber, projectName }) {
  const { getImageAssetSource } = usePacketHelpers();
  const addOn = page.addOn || {};
  const pageTitle = page.pageCount > 1 ? `Optional Add-On (${page.pageIndex + 1})` : "Optional Add-On";

  return (
    <ProposalPage className="structured-packet-page residential-add-on-page">
      <ResidentialPacketHeader company={company} pageTitle={pageTitle} projectName={projectName} />

      <div className="structured-packet-body residential-page-body">
        <div className="structured-accent" />
        <section className="residential-add-on-print-card">
          <div className="residential-add-on-print-heading">
            <p>Optional Add-On</p>
            <h3>{addOn.name || "Optional Add-On"}</h3>
            <strong>{formatResidentialCurrency(addOn.amount, { plus: true })}</strong>
          </div>
          {addOn.description ? <p className="residential-add-on-print-description">{addOn.description}</p> : null}
          <ResidentialOptionPhotoStrip images={page.images} getImageAssetSource={getImageAssetSource} />
        </section>
      </div>

      <ResidentialPacketFooter company={company} pageNumber={pageNumber} projectName={projectName} />
    </ProposalPage>
  );
}

function ResidentialScopePage({ company, exclusions = [], pageNumber, pdfStyle, projectName, scopeLeft = [], scopeRight = [], specRows = [] }) {
  const labels = getProposalToneLabels(pdfStyle);

  return (
    <ProposalPage className="structured-packet-page residential-scope-page">
      <ResidentialPacketHeader company={company} pageTitle="Scope of Work" projectName={projectName} />

      <div className="structured-packet-body residential-page-body">
        <div className="structured-accent" />
        <section className="residential-print-section">
          <h3>{labels.includedScope}</h3>
          {scopeLeft.length > 0 || scopeRight.length > 0 ? (
            <div className="two-column section-pad residential-scope-grid">
              <ScopeColumn groups={scopeLeft} />
              <ScopeColumn groups={scopeRight} />
            </div>
          ) : (
            <p className="residential-empty-note">Included residential concrete scope to be confirmed.</p>
          )}
        </section>

        {specRows.length > 0 ? (
          <section className="residential-print-section">
            <h3>Concrete / Finish Details</h3>
            <SpecTable rows={specRows} />
          </section>
        ) : null}

        {exclusions.length > 0 ? (
          <section className="residential-print-section">
            <h3>{labels.exclusions}</h3>
            <ul className="bullet-list compact-list residential-clean-list">
              {exclusions.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <ResidentialPacketFooter company={company} pageNumber={pageNumber} projectName={projectName} />
    </ProposalPage>
  );
}

function ResidentialPaymentTermsPage({ company, pageNumber, pdfStyle, projectName, termsCopy }) {
  const labels = getProposalToneLabels(pdfStyle);

  return (
    <ProposalPage className="structured-packet-page residential-terms-page">
      <ResidentialPacketHeader company={company} pageTitle="Payment Terms / Acceptance" projectName={projectName} />

      <div className="structured-packet-body residential-page-body residential-terms-body">
        <div className="structured-accent" />
        <section className="residential-print-section">
          <h3>{labels.paymentTerms}</h3>
          <p className="terms-copy residential-terms-copy">{termsCopy}</p>
        </section>
        <section className="residential-print-section">
          <h3>{labels.acceptance}</h3>
          <SignatureBlock companyName={company.name} />
        </section>
      </div>

      <ResidentialPacketFooter company={company} pageNumber={pageNumber} projectName={projectName} />
    </ProposalPage>
  );
}

function ResidentialPacketHeader({ company, pageTitle, projectName }) {
  return (
    <header className="structured-packet-header residential-packet-header">
      <div>
        <p>{company.name}</p>
        <h2>{pageTitle}</h2>
      </div>
      <div>
        <span>Project</span>
        <strong>{projectName || "Residential Customer Proposal"}</strong>
      </div>
    </header>
  );
}

function ResidentialPacketFooter({ company, pageNumber, projectName }) {
  return (
    <footer className="structured-packet-footer residential-packet-footer">
      <span>{projectName || "Residential customer proposal"}</span>
      <span>{company.name}</span>
      <span>Page {pageNumber}</span>
    </footer>
  );
}

function chunkResidentialOptionBreakdowns(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function getProposalToneLabels(pdfStyle = {}) {
  if (pdfStyle.proposalTone === "gc_technical") {
    return {
      acceptance: "Acceptance",
      exclusions: "Scope Clarifications / Exclusions",
      includedScope: "Scope Included",
      paymentTerms: "Legal / Terms",
      pricingOptions: "Pricing Options",
      pricingOptionsNote: "Pricing selections are shown separately and are not added together unless accepted.",
    };
  }

  if (pdfStyle.proposalTone === "commercial_professional") {
    return {
      acceptance: "Signature / Acceptance",
      exclusions: "Exclusions / Clarifications",
      includedScope: "Inclusions",
      paymentTerms: "Payment Terms",
      pricingOptions: "Pricing Options",
      pricingOptionsNote: "Main pricing options are mutually exclusive and are not added together.",
    };
  }

  return {
    acceptance: "Acceptance",
    exclusions: "Exclusions / Change-Order Triggers",
    includedScope: "What's Included",
    paymentTerms: "Payment Terms",
    pricingOptions: "Customer to Select One",
    pricingOptionsNote: "Main finish options are mutually exclusive and are not added together.",
  };
}

function hasResidentialPlanSheetPrintData(sheet = {}) {
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

function StructuredText({ text }) {
  const { splitAppendixText } = usePacketHelpers();
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
  const { splitAppendixText } = usePacketHelpers();

  return (
    <div className="appendix-text">
      {splitAppendixText(text).map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

function AppendixLineItemTable({ items }) {
  const { formatQuantity, toEditableNumber } = usePacketHelpers();

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
  const { formatPricingSectionAmount } = usePacketHelpers();

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
  const { getImageAssetSource, normalizePlanSheetNotes } = usePacketHelpers();
  const imageSource = getImageAssetSource(sheet);
  const calculationNotes = normalizePlanSheetNotes(sheet.calculationNotes);
  const clarificationNotes = normalizePlanSheetNotes(sheet.clarificationNotes);
  const pictureCaption = cleanPrintableText(sheet.pictureCaption || sheet.caption);

  return (
    <ProposalPage className={`plan-sheet-page ${imageSource ? "" : "plan-sheet-page-text-only"}`}>
      <header className="plan-sheet-header">
        <div>
          <p>{formatOptionLabel(sheet.pageType)}</p>
          <h2>{sheet.title || "Plan Takeoff Sheet"}</h2>
        </div>
        <div>
          <span>{sheet.subtitle || projectName || "Takeoff Backup"}</span>
        </div>
      </header>

      <div className={`plan-sheet-body ${imageSource ? "" : "plan-sheet-body-text-only"}`}>
        {imageSource ? (
          <section className="plan-sheet-image-area">
            <img src={imageSource} alt={sheet.title || "Uploaded plan sheet"} />
            {pictureCaption ? <p className="plan-sheet-image-caption">{pictureCaption}</p> : null}
          </section>
        ) : null}

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

          {!imageSource && pictureCaption ? (
            <div className="plan-notes-box">
              <h3>Sheet Notes</h3>
              <p>{pictureCaption}</p>
            </div>
          ) : null}
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
  const isCustomLogo = logoPath && ![logoSrc, legacyLogoSrc, ...fallbackLogoSources].includes(logoPath);
  const logoCandidates = isCustomLogo ? [logoPath, logoSrc, ...fallbackLogoSources] : [logoSrc, ...fallbackLogoSources];
  const uniqueLogoCandidates = [...new Set(logoCandidates)];
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const currentLogoSrc = uniqueLogoCandidates[logoIndex] || logoSrc;

  function handleLogoError() {
    if (logoIndex < uniqueLogoCandidates.length - 1) {
      setLogoIndex((index) => index + 1);
      return;
    }

    setLogoFailed(true);
  }

  return (
    <div className={`logo-seal ${small ? "logo-seal-small" : ""}`}>
      {logoFailed ? (
        <div className="logo-fallback">
          <span>Last Yard</span>
          <strong>Concrete</strong>
        </div>
      ) : (
        <img src={currentLogoSrc} alt={`${companyName} logo`} onError={handleLogoError} />
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
  const { formatRevisionLabel } = usePacketHelpers();
  const { client, project } = proposal;
  const revisionLabel = proposal.revisionLabel || formatRevisionLabel(proposal.revisionNumber);
  const preparedForLines = getPrintablePreparedForLines(client);
  const scheduleSource = getResidentialCoverSchedule(proposal, project.estimatedDuration || project.proposedSchedule.display);
  const descriptionSource = getResidentialCoverDescription(proposal, project.description);
  const coverSchedule = getCoverPageTextPreview(scheduleSource, 180);
  const coverDescription = getCoverPageTextPreview(descriptionSource, 260);

  return (
    <section className="project-cards">
      <InfoCard title="Prepared For" watermark="CLIENT">
        {preparedForLines.map((line) => (
          <p key={`${line.label}-${line.text}`}>{line.label ? `${line.label}: ${line.text}` : line.text}</p>
        ))}
      </InfoCard>

      <InfoCard title="Project Summary" watermark="SCOPE">
        <div className="proposal-meta-strip">
          <span>{proposal.proposalNumber}</span>
          <span>{revisionLabel}</span>
          <span>{formatDisplayDate(proposal.revisionDate || proposal.proposalDate)}</span>
        </div>
        <Field label="Project Name" value={project.name} />
        <Field label="Project Location" value={project.location} />
        <Field label="Proposed Schedule" value={coverSchedule} className="cover-summary-preview" />
        {hasPrintableText(coverDescription) ? (
          <p className="description-copy cover-description-preview">
            <strong>Description: </strong>
            {coverDescription}
          </p>
        ) : null}
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

function Field({ label, value, className = "" }) {
  if (!hasPrintableText(value)) {
    return null;
  }

  return (
    <p className={`field-row ${className}`}>
      <span>{label}:</span>
      <span>{value}</span>
    </p>
  );
}

function PhotoBand({ photos = defaultProjectPhotos }) {
  const { normalizeProjectPhotos } = usePacketHelpers();
  const photoSlots = normalizeProjectPhotos(photos).slice(0, 3);

  return (
    <section className="photo-band">
      {photoSlots.map((photo, index) => (
        <ConcretePhoto key={`preview-photo-${index}`} photo={photo} variant={["one", "two", "three"][index]} />
      ))}
    </section>
  );
}

function ConcretePhoto({ photo, variant }) {
  const { getImageAssetSource } = usePacketHelpers();
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
  if (!rows || rows.length === 0) {
    return null;
  }

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

function ResidentialPricingOptionsTable({ addOns: addOnsOverride, optionRows: optionRowsOverride, pdfStyle, proposal, showAddOns = true }) {
  const { getImageAssetSource } = usePacketHelpers();
  const allAddOns = getResidentialOptionalAddOns(proposal);
  const addOns = addOnsOverride || allAddOns;
  const optionRows = optionRowsOverride || buildResidentialPricingOptionRows(proposal);
  const comparisonAddOn = getResidentialComparisonAddOn(allAddOns);
  const addOnName = comparisonAddOn?.name || "Optional Add-On";
  const addOnIsCantilever = /cantilever/i.test(addOnName);
  const labels = getProposalToneLabels(pdfStyle);

  if (optionRows.length === 0) {
    return null;
  }

  return (
    <div className="residential-pricing-options-wrap">
      <div className="residential-pricing-heading">
        <h4>{labels.pricingOptions}</h4>
        <span>{labels.pricingOptionsNote}</span>
      </div>

      <div className="residential-pricing-option-cards">
        {optionRows.map((option) => (
          <section className="residential-pricing-option-card" key={option.id || option.name}>
            <div className="residential-option-card-heading">
              <h5>{option.name}</h5>
              <strong>{formatResidentialCurrency(option.basePrice)}</strong>
            </div>
            {option.description ? <p>{option.description}</p> : null}
            <div className="residential-option-metrics">
              <p>
                <span>Base Price:</span>
                <strong>{formatResidentialCurrency(option.basePrice)}</strong>
              </p>
              <p>
                <span>50% Down:</span>
                <strong>{formatResidentialCurrency(option.downPayment)}</strong>
              </p>
              <p>
                <span>Final Payment:</span>
                <strong>{formatResidentialCurrency(option.finalPayment)}</strong>
              </p>
              {option.withAddOnTotal > 0 ? (
                <>
                  <p>
                    <span>{addOnIsCantilever ? "With Cantilever Upgrade:" : "With Optional Add-On:"}</span>
                    <strong>{formatResidentialCurrency(option.withAddOnTotal)}</strong>
                  </p>
                  <p>
                    <span>{addOnIsCantilever ? "With Cantilever Down:" : "With Add-On Down:"}</span>
                    <strong>{formatResidentialCurrency(option.withAddOnDownPayment)}</strong>
                  </p>
                  <p>
                    <span>{addOnIsCantilever ? "With Cantilever Final:" : "With Add-On Final:"}</span>
                    <strong>{formatResidentialCurrency(option.withAddOnFinalPayment)}</strong>
                  </p>
                </>
              ) : null}
            </div>
            <ResidentialOptionPhotoStrip images={option.images} getImageAssetSource={getImageAssetSource} />
          </section>
        ))}
      </div>

      {showAddOns && addOns.length > 0 ? (
        <div className="residential-add-on-callouts">
          {addOns.map((addOn) => (
            <div className="residential-add-on-callout" key={addOn.id || addOn.name}>
              <strong>Optional Add-On:</strong> {addOn.name} {formatResidentialCurrency(addOn.amount, { plus: true })}
              {addOn.description ? <span>{addOn.description}</span> : null}
              <ResidentialOptionPhotoStrip images={addOn.images} getImageAssetSource={getImageAssetSource} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResidentialOptionPhotoStrip({ images = [], getImageAssetSource }) {
  const printableImages = getPrintableResidentialOptionImages(images)
    .map((image) => ({
      ...image,
      source: getImageAssetSource(image),
    }))
    .filter((image) => image.source);

  if (printableImages.length === 0) {
    return null;
  }

  return (
    <div className="residential-option-photo-strip">
      {printableImages.map((image, index) => (
        <figure className="residential-option-photo" key={image.id || `${image.source}-${index}`}>
          <img src={image.source} alt={getResidentialOptionPhotoCaption(image) || "Residential option photo"} />
          {getResidentialOptionPhotoCaption(image) ? <figcaption>{getResidentialOptionPhotoCaption(image)}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function getResidentialOptionPhotoCaption(image = {}) {
  const caption = cleanPrintableText(image.caption);

  if (caption && !/upload|smart paste/i.test(caption)) {
    return caption;
  }

  return cleanPrintableText(image.label);
}

function AlternatesAllowancesTable({ sections, totals }) {
  const { formatPricingSectionAmount } = usePacketHelpers();

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



