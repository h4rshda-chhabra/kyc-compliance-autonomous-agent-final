import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle, Sparkles } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { logAudit } from "@/lib/auditLog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

const labelCls =
  "font-mono text-xs uppercase tracking-wider text-[#86948a] transition-colors group-focus-within:text-[#4edea3]";
const inputCls =
  "w-full border-0 border-b border-[#3c4a42] bg-[#1a1c1b] px-3 py-4 text-[#e2e3e0] outline-none transition-all duration-300 placeholder:text-[#3c4a42] focus:border-[#4edea3]";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: LoginErrors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setApiError(null);
    try {
      await login.mutateAsync({ email, password });
      logAudit("logged_in", "session");
      // Real role comes from the backend (/auth/me); RequireRole on
      // /dashboard bounces admins to /companies automatically, so a single
      // landing target works for both roles.
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Incorrect email or password.";
      setApiError(message);
    }
  }

  async function handleExploreDemo() {
    setDemoLoading(true);
    setApiError(null);
    try {
      await login.mutateAsync({ email: "demo@example.com", password: "password123" });
      logAudit("logged_in", "session");
      navigate("/dashboard");
    } catch {
      setApiError("The demo account is not available on this backend yet.");
    } finally {
      setDemoLoading(false);
    }
  }

  const busy = login.isPending || demoLoading;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-[#e2e3e0] md:text-5xl">
          Welcome back
        </h1>
        <p className="text-[#bbcabf]">Enter your credentials to access the terminal.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Email */}
        <div className="group space-y-2">
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

        {/* Password */}
        <div className="group space-y-2">
          <div className="flex items-end justify-between">
            <label htmlFor="password" className={labelCls}>
              Access Cipher
            </label>
            <Link
              to="/login"
              className="font-mono text-xs text-[#4edea3] transition-all hover:underline"
            >
              Recover Key
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#86948a] transition-colors hover:text-[#4edea3]"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-[#ffb4ab]">{errors.password}</p>
          ) : null}
        </div>

        {apiError ? <p className="text-sm text-[#ffb4ab]">{apiError}</p> : null}

        {/* Remember */}
        <label
          htmlFor="remember"
          className="flex cursor-pointer items-center gap-2 py-2 text-sm text-[#bbcabf]"
        >
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 rounded-sm border-[#3c4a42] bg-[#1e201f] accent-[#4edea3]"
          />
          Maintain encrypted session for 24 hours
        </label>

        {/* Actions */}
        <div className="space-y-4 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="h-14 w-full bg-[#4edea3] font-bold uppercase tracking-widest text-[#003824] transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {login.isPending && !demoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleExploreDemo}
            className="h-14 w-full border border-[#3c4a42] font-bold uppercase tracking-widest text-[#e2e3e0] transition-all duration-200 hover:bg-[#282a29] disabled:opacity-60"
          >
            {demoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Loading demo...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="size-4" />
                Explore the demo
              </span>
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-[#bbcabf]">
        New compliance officer?{" "}
        <Link to="/signup" className="font-bold text-[#4edea3] hover:underline">
          Request Terminal Access
        </Link>
      </p>

      <div className="rounded-lg border border-[#3c4a42]/50 bg-[#1a1c1b] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#86948a]">
          Demo Accounts
        </p>
        <p className="font-mono text-xs text-[#bbcabf]">
          demo@example.com <span className="text-[#3c4a42]">|</span> password123{" "}
          <span className="text-[#86948a]">(officer)</span>
        </p>
        <p className="font-mono text-xs text-[#bbcabf]">
          admin@example.com <span className="text-[#3c4a42]">|</span> admin12345{" "}
          <span className="text-[#86948a]">(admin)</span>
        </p>
      </div>
    </div>
  );
}
