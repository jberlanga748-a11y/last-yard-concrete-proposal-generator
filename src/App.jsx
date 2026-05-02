import { useState } from "react";
import { SEED_PROPOSAL, calculateProposalTotals, formatCurrency } from "./proposalData.js";

const logoSrc = "/assets/last-yard-logo.jpg";
const proposal = SEED_PROPOSAL;
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
const exclusions = proposal.exclusions;
const termsCopy = buildTermsCopy(proposal.terms);

function formatQuantity(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function buildTermsCopy(terms) {
  return `Payment terms: ${terms.payment} ${terms.depositText} ${terms.progressBilling} ${terms.acceptance}`;
}

export default function App() {
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

      <section className="proposal-grid">
        <ProposalPage className="first-page">
          <CoverHeader />
          <CompanyIntro />
          <ProjectCards />
          <div className="page-one-feature-block">
            <PhotoBand />
            <WhyChoose />
          </div>
          <PageFooter compact />
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
                {exclusions.map((item) => (
                  <li key={item}>
                    <span />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <MiniHeading icon="✓" title="Terms & Acceptance" />
              <p className="terms-copy">{termsCopy}</p>
              <SignatureBlock companyName={company.name} />
            </div>
          </div>

          <div className="footer-push">
            <PageFooter />
          </div>
        </ProposalPage>
      </section>
    </main>
  );
}

function ProposalPage({ children, className = "" }) {
  return <article className={`proposal-page ${className}`}>{children}</article>;
}

function LogoSeal({ small = false }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className={`logo-seal ${small ? "logo-seal-small" : ""}`}>
      {logoFailed ? (
        <div className="logo-fallback">
          <span>Last Yard</span>
          <strong>Concrete</strong>
        </div>
      ) : (
        <img src={logoSrc} alt={`${company.name} logo`} onError={() => setLogoFailed(true)} />
      )}
    </div>
  );
}

function CoverHeader() {
  return (
    <header className="cover-header">
      <div className="cover-angle" />
      <div className="cover-inner">
        <LogoSeal />
        <div className="cover-copy">
          <h2>Concrete</h2>
          <h2>Proposal</h2>
          <div className="gold-rule wide-rule" />
          <div className="cover-tagline">
            <span className="star-text">★★★★★</span>
            <span>SOLID WORK. STUNNING RESULTS. EVERY YARD COUNTS.</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CompanyIntro() {
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

function ProjectCards() {
  const { client, project } = proposal;

  return (
    <section className="project-cards">
      <InfoCard title="Prepared For" watermark="CLIENT">
        <p>{client.companyName}</p>
        <p>Attn: {client.contactName}</p>
        <p>{client.title}</p>
        <p>{client.address}</p>
        <p>{client.cityStateZip}</p>
        <p>Phone: {client.phone}</p>
        <p>Email: {client.email}</p>
      </InfoCard>

      <InfoCard title="Project Summary" watermark="SCOPE">
        <Field label="Project Name" value={project.name} />
        <Field label="Project Location" value={project.location} />
        <Field label="Proposed Schedule" value={project.proposedSchedule.display} />
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
  const cards = [
    ["01", "PROVEN RELIABILITY", "On time. On budget. Built to last."],
    ["02", "QUALITY CRAFTSMANSHIP", "Clean finishes. Sharp details. Premium materials."],
    ["03", "SAFETY FIRST", "Safe jobsites for your team and ours."],
    ["04", "BUILT ON INTEGRITY", "Clear communication. Honest work. Local service."],
  ];

  return (
    <section className="why-choose">
      <div className="why-heading">
        <div />
        <h3>Why Last Yard Concrete</h3>
        <div />
      </div>
      <div className="trust-grid">
        {cards.map(([icon, title, body]) => (
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

function PageFooter({ compact = false }) {
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
      <LogoSeal small />
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
