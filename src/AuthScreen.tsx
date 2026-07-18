import { useState } from "react";
import { AlertTriangle, BrainCircuit, Eye, EyeOff, Loader2, LockKeyhole, LogIn, ShieldCheck, UserPlus } from "lucide-react";

type AuthMode = "login" | "signup";

type AuthScreenProps = {
  busy: string;
  error: string;
  onSubmit: (email: string, password: string, mode: AuthMode) => void;
};

export function SessionLoading() {
  return (
    <main className="auth-shell auth-loading" aria-live="polite">
      <div className="brand-lockup">
        <span className="brand-mark">
          <BrainCircuit size={26} aria-hidden="true" />
        </span>
        <span>UrgeWise</span>
      </div>
      <Loader2 className="animate-spin text-mint" size={24} aria-hidden="true" />
      <p>Opening your workspace...</p>
    </main>
  );
}

export function AuthScreen({ busy, error, onSubmit }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowPassword(false);
  };

  return (
    <main className="auth-shell">
      <header className="auth-brandbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <BrainCircuit size={26} aria-hidden="true" />
          </span>
          <span>UrgeWise</span>
        </div>
        <span className="auth-private">
          <ShieldCheck size={16} aria-hidden="true" />
          Private workspace
        </span>
      </header>

      <div className="auth-stage">
        <section className="auth-copy" aria-labelledby="auth-headline">
          <p className="eyebrow">Pause. Notice. Choose.</p>
          <h1 id="auth-headline">Make the next choice count.</h1>
          <p>Track the moments that matter and turn them into a clearer path forward.</p>
          <div className="safety-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Supportive habit coaching with a clear boundary for medical or crisis needs.</span>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-panel-heading">
            <p className="eyebrow">Your workspace</p>
            <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p>{mode === "login" ? "Sign in to continue." : "Start with a private workspace."}</p>
          </div>

          <div className="segmented" role="tablist" aria-label="Account access">
            <button
              className={mode === "login" ? "selected" : ""}
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              className={mode === "signup" ? "selected" : ""}
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
            >
              Create account
            </button>
          </div>

          <form
            key={mode}
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSubmit(String(form.get("email")), String(form.get("password")), mode);
            }}
          >
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required autoFocus />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="alert" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button className="primary-button auth-submit" disabled={busy === mode}>
              {busy === mode ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : mode === "login" ? (
                <LogIn size={18} aria-hidden="true" />
              ) : (
                <UserPlus size={18} aria-hidden="true" />
              )}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="auth-security">
            <LockKeyhole size={15} aria-hidden="true" />
            Session protected with an HTTP-only secure cookie.
          </div>
        </section>
      </div>
    </main>
  );
}
