import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, UserCheck } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { logAudit } from "@/lib/auditLog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

const labelCls =
  "font-mono text-xs uppercase tracking-widest text-[#86948a] transition-colors group-focus-within:text-[#4edea3]";
const inputCls =
  "rounded-lg border border-[#3c4a42] bg-[#0d0f0e] px-4 py-3 text-[#e2e3e0] outline-none transition-all placeholder:text-[#86948a]/50 focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]";

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: SignupErrors = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    if (!acceptedTerms) next.terms = "You must accept the terms to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Self-registration always creates a COMPLIANCE_OFFICER account on the
    // backend (see routes/auth.py) — there is no client-side role choice.
    setSubmitting(true);
    setApiError(null);
    try {
      await apiClient.post("/auth/register", {
        email: email.trim(),
        password,
        full_name: name.trim(),
      });
      logAudit("account_created", "session");
      navigate("/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "An unexpected error occurred during registration.";
      setApiError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-[#e2e3e0] md:text-5xl">
          Initiate Protocol
        </h1>
        <p className="text-[#bbcabf]">
          Configure your institutional credentials to begin auditing.
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#4edea3]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#4edea3]">
          <UserCheck className="size-3.5" />
          Registering as: Compliance Officer
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-4">
          {/* Full name */}
          <div className="group flex flex-col space-y-1.5">
            <label htmlFor="name" className={labelCls}>
              Full Name
            </label>
            <input
              id="name"
              autoComplete="name"
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              className={inputCls}
            />
            {errors.name ? (
              <p className="text-xs text-[#ffb4ab]">{errors.name}</p>
            ) : null}
          </div>

          {/* Email */}
          <div className="group flex flex-col space-y-1.5">
            <label htmlFor="email" className={labelCls}>
              Operational Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              className={inputCls}
            />
            {errors.email ? (
              <p className="text-xs text-[#ffb4ab]">{errors.email}</p>
            ) : null}
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="group flex flex-col space-y-1.5">
              <label htmlFor="password" className={labelCls}>
                Access Cipher
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                className={inputCls}
              />
            </div>
            <div className="group flex flex-col space-y-1.5">
              <label htmlFor="confirm" className={labelCls}>
                Confirm Cipher
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(errors.confirm)}
                className={inputCls}
              />
            </div>
          </div>
          {errors.password ? (
            <p className="text-xs text-[#ffb4ab]">{errors.password}</p>
          ) : null}
          {errors.confirm ? (
            <p className="text-xs text-[#ffb4ab]">{errors.confirm}</p>
          ) : null}
        </div>

        {/* Terms */}
        <div className="space-y-2">
          <label
            htmlFor="terms"
            className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-[#bbcabf]"
          >
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              aria-invalid={Boolean(errors.terms)}
              className="mt-0.5 size-4 rounded-sm border-[#3c4a42] bg-[#1e201f] accent-[#4edea3]"
            />
            I agree to the Terms of Service and Privacy Policy
          </label>
          {errors.terms ? (
            <p className="text-xs text-[#ffb4ab]">{errors.terms}</p>
          ) : null}
        </div>

        {apiError ? <p className="text-sm text-[#ffb4ab]">{apiError}</p> : null}

        <div className="flex flex-col space-y-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#4edea3] py-4 font-mono text-sm font-bold uppercase tracking-widest text-[#003824] shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-colors hover:bg-[#6ffbbe] active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Initiating...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="text-[#bbcabf]">Already authenticated?</span>
            <Link
              to="/login"
              className="text-[#4edea3] underline-offset-4 hover:underline"
            >
              Access Terminal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
