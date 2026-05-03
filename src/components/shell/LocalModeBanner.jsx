export function LocalModeBanner({ onOpenLogin }) {
  return (
    <div className="local-mode-banner no-print">
      <span>You are in local mode. Sign in to sync across devices.</span>
      <button type="button" onClick={onOpenLogin}>
        Sign In
      </button>
    </div>
  );
}
