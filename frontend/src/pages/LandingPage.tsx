import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  Fingerprint,
  Gavel,
  Landmark,
  Radar,
  Scale,
  ShieldCheck,
  UserCog,
  UserCheck,
} from "lucide-react";

// Veritas dark-emerald palette (self-contained; landing page is dark-only by design)
const C = {
  bg: "bg-[#121413]",
  bgLowest: "bg-[#0d0f0e]",
  text: "text-[#e2e3e0]",
  muted: "text-[#bbcabf]",
  primary: "text-[#4edea3]",
  border: "border-[#0b513d]",
};

const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6 },
} as const;

// Full-page radial glow that follows the cursor (template's #dynamic-bg)
function DynamicBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEnabled(false);
      return;
    }
    const onMove = (e: MouseEvent) => {
      ref.current?.style.setProperty("--mouse-x", `${e.clientX}px`);
      ref.current?.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        background:
          "radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.08), transparent 80%)",
      }}
    />
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [glow, setGlow] = useState<string | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setGlow(
      `radial-gradient(400px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.08), rgba(2, 44, 34, 0.4) 40%)`,
    );
  }, []);

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={() => setGlow(null)}
      style={{ background: glow ?? "rgba(2, 44, 34, 0.4)" }}
      className={`border border-[#064E3B] backdrop-blur-md transition-[border-color,transform] duration-300 hover:border-[#10B981] ${className}`}
    >
      {children}
    </div>
  );
}

const stats = [
  {
    label: "CONTINUOUS_MONITORING",
    value: "24/7",
    description:
      "Autonomous agents re-screen high-risk corporate accounts in near real time — not quarterly.",
    glow: true,
  },
  {
    label: "FALSE_POSITIVE_ENGINE",
    value: "AI",
    description:
      "Semantic analysis and entity resolution separate a corporate director from an unrelated person with the same name.",
    glow: false,
  },
  {
    label: "AGENT_STATUS",
    value: "Active",
    icon: ShieldCheck,
    description:
      "Sanctions lists, watchlists, and adverse media sources under perpetual autonomous watch.",
    glow: false,
  },
];

const capabilities = [
  {
    icon: Activity,
    title: "Continuous KYC Monitoring",
    description:
      "An autonomous agent network monitors high-risk corporate accounts in near real time, catching risk profile shifts the moment they happen.",
  },
  {
    icon: Radar,
    title: "Sanctions & Adverse Media",
    description:
      "A dedicated monitoring agent checks news sources, sanctions lists, watchlists, and relevant risk signals around the clock.",
  },
  {
    icon: Fingerprint,
    title: "Entity Resolution",
    description:
      "Semantic analysis and entity-resolution logic slash false positives, freeing compliance staff from manual verification queues.",
  },
  {
    icon: FileText,
    title: "Draft SAR Generation",
    description:
      "Audit-ready Suspicious Activity Reports with evidence, confidence levels, and risk timelines — generated for human review and sign-off.",
  },
];

const frameworks = [
  { icon: Gavel, label: "OFAC Sanctions" },
  { icon: Landmark, label: "FinCEN SAR" },
  { icon: Scale, label: "FATF Aligned" },
  { icon: ShieldCheck, label: "GDPR Ready" },
];

const roles = [
  {
    icon: UserCog,
    name: "Admin",
    description:
      "Manage the organization: onboard team members, configure monitoring policies, and oversee the full audit trail of alerts, evidence, and AI decisions.",
  },
  {
    icon: UserCheck,
    name: "Compliance Officer",
    description:
      "Work the queue: review high-risk alerts, inspect risk timelines and evidence, and approve or reject draft SARs with a complete human-review workflow.",
  },
];

export function LandingPage() {
  return (
    <div className={`min-h-screen ${C.bg} ${C.text} overflow-x-hidden font-sans`}>
      <DynamicBackground />

      {/* TopNavBar */}
      <nav className="fixed top-0 z-50 w-full border-b border-[#0b513d] bg-[#121413]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-16">
          <Link to="/" className="flex items-center gap-2.5">
            <ShieldCheck className="size-6 text-[#4edea3]" />
            <span className="text-lg font-bold tracking-tighter text-[#4edea3]">
              KYC Auditor
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#platform" className="text-sm uppercase tracking-wider text-[#bbcabf] transition-colors hover:text-[#4edea3]">
              Platform
            </a>
            <a href="#roles" className="text-sm uppercase tracking-wider text-[#bbcabf] transition-colors hover:text-[#4edea3]">
              Roles
            </a>
            <a href="#compliance" className="text-sm uppercase tracking-wider text-[#bbcabf] transition-colors hover:text-[#4edea3]">
              Compliance
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#e2e3e0] transition-all hover:text-[#4edea3] active:scale-95"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-[#10b981] px-6 py-2 font-mono text-xs uppercase tracking-widest text-[#00422b] transition-all hover:brightness-110 active:scale-95"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-[1280px] px-5 py-24 md:px-16">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-[#4edea3]/5 blur-[120px]" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 border border-[#0b513d] bg-[#0b513d]/30 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#4edea3]">
              <span className="size-2 animate-pulse rounded-full bg-[#4edea3]" />
              System Live: Perpetual Monitoring
            </div>
            <h1 className="mb-6 bg-gradient-to-br from-white to-[#a7cfc0] bg-clip-text text-5xl font-bold leading-tight tracking-tight text-transparent md:text-6xl">
              KYC That Never Sleeps
            </h1>
            <p className="mb-10 max-w-2xl text-xl leading-relaxed text-[#bbcabf]">
              The Continuous KYC Autonomous Auditor replaces slow, reactive
              periodic refreshes with machine-speed monitoring. Detect adverse
              media, sanctions changes, and executive turnover the moment risk
              profiles shift — with audit-ready evidence for every decision.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="bg-[#4edea3] px-8 py-4 text-center font-bold uppercase tracking-wider text-[#121413] transition-all hover:brightness-110 active:scale-95"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="border border-[#0b513d] px-8 py-4 text-center font-bold uppercase tracking-wider text-[#e2e3e0] transition-all hover:bg-[#0b513d]/20 active:scale-95"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Bento Stats */}
          <div className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">
            {stats.map(({ label, value, description, icon: Icon, glow }, i) => (
              <motion.div key={label} {...reveal} transition={{ duration: 0.6, delay: i * 0.1 }}>
                <GlassCard
                  className={`h-full p-8 ${glow ? "shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]" : ""}`}
                >
                  <div className="mb-4 font-mono text-xs tracking-widest text-[#4edea3]">
                    {label}
                  </div>
                  <div className="mb-2 flex items-center gap-4 text-5xl font-bold">
                    {value}
                    {Icon ? <Icon className="size-9 text-[#4edea3]" /> : null}
                  </div>
                  <div className="text-sm text-[#bbcabf]">{description}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Capabilities Grid */}
        <section id="platform" className="border-y border-[#0b513d] bg-[#0d0f0e] py-32">
          <div className="mx-auto max-w-[1280px] px-5 md:px-16">
            <motion.div {...reveal} className="mb-20 text-center">
              <h2 className="mb-4 bg-gradient-to-br from-white to-[#a7cfc0] bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                Autonomous Agent Network
              </h2>
              <div className="mx-auto h-1 w-24 bg-[#4edea3]" />
            </motion.div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {capabilities.map(({ icon: Icon, title, description }, i) => (
                <motion.div
                  key={title}
                  {...reveal}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="border border-[#0b513d] p-8 transition-colors hover:bg-[#0b513d]/10"
                >
                  <Icon className="mb-6 size-8 text-[#4edea3]" />
                  <h3 className="mb-4 text-xl font-semibold">{title}</h3>
                  <p className="text-sm text-[#bbcabf]">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Role-based Access */}
        <section id="roles" className="mx-auto max-w-[1280px] px-5 py-32 md:px-16">
          <motion.div {...reveal} className="mb-20 text-center">
            <h2 className="mb-4 bg-gradient-to-br from-white to-[#a7cfc0] bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
              Built for Your Team
            </h2>
            <p className="mx-auto max-w-xl text-[#bbcabf]">
              Role-based access keeps oversight and investigation cleanly separated.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {roles.map(({ icon: Icon, name, description }, i) => (
              <motion.div key={name} {...reveal} transition={{ duration: 0.6, delay: i * 0.1 }}>
                <GlassCard className="h-full p-10">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-[#0b513d]">
                      <Icon className="size-6 text-[#4edea3]" />
                    </div>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-[#4edea3]">
                        Role
                      </div>
                      <h3 className="text-2xl font-semibold">{name}</h3>
                    </div>
                  </div>
                  <p className="text-[#bbcabf]">{description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Regulatory Frameworks Banner */}
        <section id="compliance" className="overflow-hidden bg-[#121413] py-20">
          <div className="mx-auto max-w-[1280px] px-5 md:px-16">
            <p className="mb-12 text-center font-mono text-xs uppercase tracking-widest text-[#bbcabf]">
              Built Around Regulatory Frameworks
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-60 transition-all duration-700 hover:opacity-100 md:gap-16">
              {frameworks.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-[#0b513d]">
                    <Icon className="size-5 text-[#4edea3]" />
                  </div>
                  <span className="text-xl font-bold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative mx-auto max-w-[1280px] overflow-hidden px-5 py-40 text-center md:px-16">
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <div className="h-[400px] w-[800px] rounded-full bg-[#4edea3]/10 blur-[150px]" />
          </div>
          <motion.div {...reveal} className="relative z-10">
            <h2 className="mb-8 text-4xl font-bold tracking-tight md:text-5xl">
              Stop Auditing in Batches
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-lg text-[#bbcabf]">
              Join compliance teams replacing reactive periodic refreshes with
              continuous, autonomous KYC monitoring.
            </p>
            <div className="flex flex-col justify-center gap-6 md:flex-row">
              <Link
                to="/signup"
                className="bg-[#10b981] px-12 py-5 text-lg font-bold uppercase tracking-wider text-[#00422b] transition-all hover:scale-105 active:scale-95"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="border border-[#4edea3] bg-transparent px-12 py-5 text-lg font-bold uppercase tracking-wider text-[#4edea3] transition-all hover:bg-[#4edea3]/10 active:scale-95"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0b513d] bg-[#0d0f0e]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-5 py-20 md:grid-cols-2 md:px-16">
          <div>
            <div className="mb-6 flex items-center gap-2.5">
              <ShieldCheck className="size-6 text-[#4edea3]" />
              <span className="text-lg font-bold text-[#4edea3]">KYC Auditor</span>
            </div>
            <p className="max-w-xs font-mono text-xs uppercase tracking-tight text-[#bbcabf]">
              Continuous KYC Autonomous Auditor for modern compliance teams.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h4 className="font-mono text-xs uppercase text-[#4edea3]">Platform</h4>
              <a href="#platform" className="font-mono text-xs text-[#bbcabf] transition-colors hover:text-[#4edea3]">
                Agent Network
              </a>
              <a href="#roles" className="font-mono text-xs text-[#bbcabf] transition-colors hover:text-[#4edea3]">
                Roles & Access
              </a>
              <a href="#compliance" className="font-mono text-xs text-[#bbcabf] transition-colors hover:text-[#4edea3]">
                Compliance
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="font-mono text-xs uppercase text-[#4edea3]">Access</h4>
              <Link to="/login" className="font-mono text-xs text-[#bbcabf] transition-colors hover:text-[#4edea3]">
                Login
              </Link>
              <Link to="/signup" className="font-mono text-xs text-[#bbcabf] transition-colors hover:text-[#4edea3]">
                Sign Up
              </Link>
            </div>
          </div>
          <div className="mt-12 border-t border-[#0b513d]/30 pt-12 md:col-span-2">
            <p className="font-mono text-xs text-[#bbcabf] opacity-50">
              © {new Date().getFullYear()} KYC Auditor. Continuous KYC Autonomous Auditor.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
