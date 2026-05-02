import { useState } from "react";
import {
  LINE_ITEM_UNITS,
  PROPOSAL_TYPES,
  SEED_PROPOSAL,
  calculateProposalTotals,
  formatCurrency,
} from "./proposalData.js";

const logoSrc = "/assets/last-yard-logo.jpg";

const trustCards = [
  ["01", "PROVEN RELIABILITY", "On time. On budget. Built to last."],
  ["02", "QUALITY CRAFTSMANSHIP", "Clean finishes. Sharp details. Premium materials."],
  ["03", "SAFETY FIRST", "Safe jobsites for your team and ours."],
  ["04", "BUILT ON INTEGRITY", "Clear communication. Honest work. Local service."],
];

export default function App() {
  const [proposalDraft, setProposalDraft] = useState(() => createEditableProposal(SEED_PROPOSAL));
  const company = proposalDraft.company;

  function updateProposalField(path, value) {
    setProposalDraft((currentProposal) => updateNestedValue(currentProposal, path, value));
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

  return (
    <main className="app-shell">
      <style>{`
        @media print {
          @page { size: letter landscape; margin: 0.25in; }
        }
      `}</style>

      <div className="print-bar no-print">
        <div>
          <p className="eyebrow">{company.name}</p>
          <h1>Proposal Generator</h1>
        </div>
        <button type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="proposal-workbench">
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
        />
        <div className="preview-pane">
          <ProposalPreview proposal={proposalDraft} />
        </div>
      </div>
    </main>
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
}) {
  const proposalTotals = calculateProposalTotals(proposal);

  return (
    <aside className="editor-panel no-print" aria-label="Proposal editor">
      <EditorSection title="Proposal Info">
        <EditorField
          label="Proposal Type"
          path="type"
          value={proposal.type}
          onChange={onChange}
          options={PROPOSAL_TYPES}
        />
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
  const scopeSplitIndex = Math.ceil(proposal.scopeSections.length / 2);
  const scopeLeft = proposal.scopeSections.slice(0, scopeSplitIndex);
  const scopeRight = proposal.scopeSections.slice(scopeSplitIndex);
  const specSplitIndex = Math.ceil(proposal.specifications.length / 2);
  const specsLeft = proposal.specifications.slice(0, specSplitIndex).map(({ item, specification }) => [item, specification]);
  const specsRight = proposal.specifications.slice(specSplitIndex).map(({ item, specification }) => [item, specification]);
  const lineItems = proposal.lineItems.map((item, index) => {
    const amount = item.amount ?? item.quantity * item.unitPrice;

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
        <div className="page-one-feature-block">
          <PhotoBand />
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

function ProposalPage({ children, className = "" }) {
  return <article className={`proposal-page ${className}`}>{children}</article>;
}

function LogoSeal({ companyName, small = false }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className={`logo-seal ${small ? "logo-seal-small" : ""}`}>
      {logoFailed ? (
        <div className="logo-fallback">
          <span>Last Yard</span>
          <strong>Concrete</strong>
        </div>
      ) : (
        <img src={logoSrc} alt={`${companyName} logo`} onError={() => setLogoFailed(true)} />
      )}
    </div>
  );
}

function CoverHeader({ company }) {
  return (
    <header className="cover-header">
      <div className="cover-angle" />
      <div className="cover-inner">
        <LogoSeal companyName={company.name} />
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

function PhotoBand() {
  return (
    <section className="photo-band">
      <ConcretePhoto title="Architectural Steps" variant="one" />
      <ConcretePhoto title="Finished Flatwork" variant="two" />
      <ConcretePhoto title="Control Joints" variant="three" />
    </section>
  );
}

function ConcretePhoto({ title, variant }) {
  return (
    <div className={`concrete-photo ${variant}`}>
      <div className="photo-texture" />
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
      <LogoSeal companyName={company.name} small />
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

function createEditableProposal(seedProposal) {
  const proposal = cloneObject(seedProposal);

  return {
    ...proposal,
    lineItems: proposal.lineItems.map((item) => ({
      ...item,
      taxable: item.taxable ?? true,
    })),
    client: {
      ...proposal.client,
      billingAddress: proposal.client.billingAddress ?? proposal.client.address ?? "",
      projectAddress: proposal.client.projectAddress ?? proposal.client.cityStateZip ?? "",
    },
    project: {
      ...proposal.project,
      address: proposal.project.address ?? proposal.project.location ?? "",
      category: proposal.project.category ?? "Commercial flatwork",
      estimatedDuration: proposal.project.estimatedDuration ?? proposal.project.proposedSchedule?.display ?? "",
      accessNotes: proposal.project.accessNotes ?? "",
      siteConditionNotes: proposal.project.siteConditionNotes ?? "",
      scheduleRestrictions: proposal.project.scheduleRestrictions ?? "",
      specialRequirements: proposal.project.specialRequirements ?? "",
      proposedSchedule: {
        ...(proposal.project.proposedSchedule || {}),
        startDate: proposal.project.proposedSchedule?.startDate ?? "",
        display: proposal.project.proposedSchedule?.display ?? "",
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
  return `Payment terms: ${terms.payment} ${terms.depositText} ${terms.progressBilling} ${terms.acceptance}`;
}

function formatOptionLabel(value) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toEditableNumber(value) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}
