export function AppChrome({
  authLoading,
  authStatusLabel,
  authUser,
  companyName,
  currentView,
  isCloudConfigured,
  permissions = {},
  roleLabel = "",
  onNavigate,
  onNewBid,
  onNewContact,
  onNewGcPacket,
  onNewProposal,
  onOpenLogin,
  onSignOut,
}) {
  const activeView = ["new", "edit", "print"].includes(currentView) ? "list" : currentView;
  const navItems = [
    { view: "dashboard", label: "Dashboard", shortLabel: "Dash", action: () => onNavigate("/dashboard") },
    { view: "bids", label: "Bids", shortLabel: "Bids", action: () => onNavigate("/bids") },
    { view: "leadFinder", label: "AI Lead Finder", shortLabel: "Leads", action: () => onNavigate("/lead-finder") },
    { view: "list", label: "Proposals", shortLabel: "Props", action: () => onNavigate("/proposals") },
    { view: "contacts", label: "Contacts", shortLabel: "Contacts", action: () => onNavigate("/contacts") },
    {
      view: "priceLibrary",
      label: "Price Library",
      shortLabel: "Prices",
      action: () => onNavigate("/price-library"),
    },
    { view: "activity", label: "Activity", shortLabel: "Activity", action: () => onNavigate("/activity") },
    { view: "settings", label: "Settings", shortLabel: "Settings", action: () => onNavigate("/settings") },
    { view: "backup", label: "Backup", shortLabel: "Backup", action: () => onNavigate("/backup") },
  ];
  const runMenuAction = (event, action) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  };

  return (
    <header className="app-chrome no-print">
      <div className="app-brand">
        <div className="app-brand-mark" aria-label="Last Yard Concrete">
          <img
            src="/assets/last-yard-logo.jpg"
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling?.removeAttribute("hidden");
            }}
          />
          <span hidden>LY</span>
        </div>
        <div>
          <p>{companyName}</p>
          <h1>Proposal Generator</h1>
        </div>
      </div>
      <nav className="app-nav" aria-label="Primary navigation">
        {navItems.map(({ action, label, shortLabel, view }) => (
          <button
            className={activeView === view ? "active" : ""}
            key={view}
            type="button"
            onClick={action}
            title={label}
          >
            <span className="nav-label-full">{label}</span>
            <span className="nav-label-short">{shortLabel}</span>
          </button>
        ))}
      </nav>
      <div className="app-quick-actions">
        <div className="app-auth-pill">
          <span>{authStatusLabel}</span>
          {roleLabel ? <span className="app-role-label">{roleLabel}</span> : null}
          {isCloudConfigured ? (
            authUser ? (
              <button type="button" onClick={onSignOut} disabled={authLoading} title="Sign out">
                Sign Out
              </button>
            ) : (
              <button type="button" onClick={onOpenLogin} disabled={authLoading} title="Open login">
                Sign In
              </button>
            )
          ) : null}
        </div>
        <button
          className="app-desktop-action"
          type="button"
          onClick={onNewProposal}
          disabled={!permissions.createProposal}
          title="Start a new proposal"
        >
          New Proposal
        </button>
        <button
          className="app-desktop-action"
          type="button"
          onClick={onNewContact}
          disabled={!permissions.createContact}
          title="Add a new contact"
        >
          New Contact
        </button>
        <button
          className="app-desktop-action"
          type="button"
          onClick={onNewBid}
          disabled={!permissions.createBid}
          title="Add a new bid opportunity"
        >
          New Bid
        </button>
        <button
          className="gold-action app-primary-action"
          type="button"
          onClick={onNewGcPacket}
          disabled={!permissions.createProposal}
          title="Start a new GC packet"
        >
          New GC Packet
        </button>
        <details className="app-actions-menu">
          <summary title="Open quick actions">Actions</summary>
          <div className="app-actions-popover">
            <button
              type="button"
              onClick={(event) => runMenuAction(event, onNewProposal)}
              disabled={!permissions.createProposal}
              title="Start a new proposal"
            >
              New Proposal
            </button>
            <button
              type="button"
              onClick={(event) => runMenuAction(event, onNewGcPacket)}
              disabled={!permissions.createProposal}
              title="Start a new GC packet"
            >
              New GC Packet
            </button>
            <button
              type="button"
              onClick={(event) => runMenuAction(event, onNewBid)}
              disabled={!permissions.createBid}
              title="Add a new bid opportunity"
            >
              New Bid
            </button>
            <button
              type="button"
              onClick={(event) => runMenuAction(event, onNewContact)}
              disabled={!permissions.createContact}
              title="Add a new contact"
            >
              New Contact
            </button>
            <button
              type="button"
              onClick={(event) => runMenuAction(event, () => onNavigate("/backup"))}
              title="Open Backup / Restore"
            >
              Backup / Restore
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
