import { useState } from "react";

export function LoginView({
  authLoading,
  authMessage,
  authUser,
  canNavigateBack = true,
  isCloudConfigured,
  onBackToDashboard,
  onSignIn,
  onSignOut,
  onSignUp,
  requireSignIn = false,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(action) {
    if (!hasTextValue(email) || !hasTextValue(password)) {
      return;
    }

    action(email.trim(), password);
  }

  return (
    <section className="login-panel no-print">
      <div className="list-toolbar">
        <div>
          <p className="list-kicker">Supabase Auth</p>
          <h2>Login</h2>
        </div>
        {canNavigateBack ? (
          <button type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        ) : null}
      </div>

      <div className="login-card">
        {!isCloudConfigured && requireSignIn ? (
          <>
            <h3>Sign In Required</h3>
            <p>Production access requires Supabase Auth. Configure Supabase sign-in before using protected app routes.</p>
          </>
        ) : !isCloudConfigured ? (
          <>
            <h3>Local Mode</h3>
            <p>Supabase is not configured. The app will keep using local browser storage.</p>
          </>
        ) : authUser ? (
          <>
            <h3>Signed In</h3>
            <p>{authUser.email}</p>
            <button type="button" onClick={onSignOut} disabled={authLoading}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <h3>Sign In or Create Account</h3>
            <p>
              {requireSignIn
                ? "Sign in to view proposals, bids, contacts, settings, backup tools, and print routes."
                : "Authentication is available. Proposals, contacts, and company settings sync when you are signed in."}
            </p>
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="login-actions">
              <button type="button" onClick={() => handleSubmit(onSignIn)} disabled={authLoading}>
                Sign In
              </button>
              <button type="button" onClick={() => handleSubmit(onSignUp)} disabled={authLoading}>
                Sign Up
              </button>
            </div>
          </>
        )}

        {authMessage ? <span className="login-message">{authMessage}</span> : null}
      </div>
    </section>
  );
}

function hasTextValue(value) {
  return String(value || "").trim().length > 0;
}
