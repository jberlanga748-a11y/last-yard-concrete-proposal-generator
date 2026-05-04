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
    ["dashboard", "Dashboard", () => onNavigate("/dashboard")],
    ["list", "Proposals", () => onNavigate("/proposals")],
    ["bids", "Bids", () => onNavigate("/bids")],
    ["contacts", "Contacts", () => onNavigate("/contacts")],
    ["priceLibrary", "Price Library", () => onNavigate("/price-library")],
    ["activity", "Activity", () => onNavigate("/activity")],
    ["settings", "Company Settings", () => onNavigate("/settings")],
    ["backup", "Backup / Restore", () => onNavigate("/backup")],
  ];

  return (
    <header className="app-chrome no-print">
      <div className="app-brand">
        <div className="app-brand-mark">LY</div>
        <div>
          <p>{companyName}</p>
          <h1>Proposal Generator</h1>
        </div>
      </div>
      <nav className="app-nav" aria-label="Primary navigation">
        {navItems.map(([view, label, action]) => (
          <button className={activeView === view ? "active" : ""} key={view} type="button" onClick={action}>
            {label}
          </button>
        ))}
      </nav>
      <div className="app-quick-actions">
        <div className="app-auth-pill">
          <span>{authStatusLabel}</span>
          {roleLabel ? <span className="app-role-label">{roleLabel}</span> : null}
          {isCloudConfigured ? (
            authUser ? (
              <button type="button" onClick={onSignOut} disabled={authLoading}>
                Sign Out
              </button>
            ) : (
              <button type="button" onClick={onOpenLogin} disabled={authLoading}>
                Sign In
              </button>
            )
          ) : null}
        </div>
        <button type="button" onClick={onNewProposal} disabled={!permissions.createProposal}>
          New Proposal
        </button>
        <button type="button" onClick={onNewContact} disabled={!permissions.createContact}>
          New Contact
        </button>
        <button type="button" onClick={onNewBid} disabled={!permissions.createBid}>
          New Bid
        </button>
        <button className="gold-action" type="button" onClick={onNewGcPacket} disabled={!permissions.createProposal}>
          New GC Packet
        </button>
      </div>
    </header>
  );
}
