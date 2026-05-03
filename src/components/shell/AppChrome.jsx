export function AppChrome({
  authLoading,
  authStatusLabel,
  authUser,
  companyName,
  currentView,
  isCloudConfigured,
  onNavigate,
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
    ["contacts", "Contacts", () => onNavigate("/contacts")],
    ["priceLibrary", "Price Library", () => onNavigate("/price-library")],
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
        <button type="button" onClick={onNewProposal}>
          New Proposal
        </button>
        <button type="button" onClick={onNewContact}>
          New Contact
        </button>
        <button className="gold-action" type="button" onClick={onNewGcPacket}>
          New GC Packet
        </button>
      </div>
    </header>
  );
}
