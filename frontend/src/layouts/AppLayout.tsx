import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Radar,
  RefreshCw,
  ScrollText,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useAutoScanEngine } from "@/hooks/useAutoScanEngine";
import { useLogout } from "@/hooks/useAuth";
import { useAlerts } from "@/lib/alerts";
import { invalidateScanData, scanAllCompanies } from "@/lib/autoScan";
import { useCompanies } from "@/hooks/useCompanies";
import type { Company } from "@/types/models";
import type { ScannableCompany } from "@/lib/autoScan";
import { ROLE_LABELS, useRole, type Role } from "@/lib/roles";

/* KYC Sentinel palette (matches the officer dashboard) */
const C = {
  bg: "#0B0F14",
  surfaceContainerLow: "#1c1b1c",
  surfaceContainerLowest: "#0e0e0e",
  outlineVariant: "#45474b",
  onSurface: "#e5e2e2",
  onSurfaceVariant: "#c5c6cb",
  primary: "#c3c6ce",
  error: "#ffb4ab",
  onError: "#690005",
  emerald: "#22C55E",
  onPrimaryFixed: "#181c21",
};

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
  end?: boolean;
}

// Strict role split: admins onboard companies and make final decisions;
// compliance officers monitor, review, and recommend.
const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { to: "/onboarding", label: "Onboarding", icon: Plus },
    { to: "/companies", label: "Companies", icon: Building2 },
    { to: "/decisions", label: "Decisions", icon: Gavel },
    { to: "/audit", label: "Audit Trail", icon: ScrollText },
  ],
  compliance_officer: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/portfolio", label: "Entity Watchlist", icon: Building2 },
    { to: "/alerts", label: "Risk Alerts", icon: TriangleAlert },
    { to: "/monitoring", label: "Monitoring", icon: Radar },
    { to: "/reviews", label: "SAR Reviews", icon: ClipboardList },
    { to: "/audit", label: "Audit Trail", icon: ScrollText },
  ],
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const role = useRole();
  const navItems = navByRole[role];
  const alerts = useAlerts();
  const { data: monitoredCompanies } = useCompanies(undefined, "active", "monitored");
  const portfolio: ScannableCompany[] = (monitoredCompanies ?? []).map((c: Company) => ({
    companyId: c.id,
    legalName: c.legal_name ?? c.id,
  }));
  const queryClient = useQueryClient();
  const [scanningAll, setScanningAll] = useState(false);
  const openAlertCount = alerts.filter((a) => !a.acknowledged).length;
  const isOfficer = role === "compliance_officer";

  // Continuous scanning keeps running app-wide while the layout is mounted
  useAutoScanEngine();

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    navigate("/login");
  }

  async function handleScanAll() {
    if (scanningAll || portfolio.length === 0) return;
    setScanningAll(true);
    try {
      await scanAllCompanies(portfolio);
      invalidateScanData(queryClient);
    } finally {
      setScanningAll(false);
    }
  }

  return (
    <div
      className="min-h-svh overflow-x-hidden"
      style={{ backgroundColor: C.bg, color: C.onSurface }}
    >
      {/* TopNavBar */}
      <nav
        className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b px-5 shadow-sm backdrop-blur-md"
        style={{
          borderColor: C.outlineVariant,
          backgroundColor: "rgba(19,19,20,0.8)",
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: C.primary }}
          >
            KYC Sentinel
          </span>
          <div
            className="ml-8 hidden items-center gap-2 rounded-full border px-4 py-1 transition-all focus-within:border-[#22C55E] focus-within:shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)] md:flex"
            style={{
              backgroundColor: C.surfaceContainerLow,
              borderColor: C.outlineVariant,
            }}
          >
            <Search className="size-4" style={{ color: C.onSurfaceVariant }} />
            <input
              className="w-64 border-none bg-transparent text-sm outline-none placeholder:text-[#c5c6cb]/50 focus:ring-0"
              placeholder="Search entities..."
              type="text"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(isOfficer ? "/portfolio" : "/companies");
                }
              }}
            />
          </div>
        </div>
        <div
          className="flex items-center gap-4"
          style={{ color: C.onSurfaceVariant }}
        >
          <Link
            to={isOfficer ? "/monitoring" : "/companies"}
            aria-label="Monitoring"
            className="transition-colors hover:text-[#c3c6ce]"
          >
            <Radar className="size-5" />
          </Link>
          <Link
            to={isOfficer ? "/alerts" : "/decisions"}
            aria-label="Alerts"
            className="relative transition-colors hover:text-[#c3c6ce]"
          >
            <Bell className="size-5" />
            {isOfficer && openAlertCount > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                style={{ backgroundColor: C.error, color: C.onError }}
              >
                {openAlertCount}
              </span>
            ) : null}
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="cursor-pointer transition-colors hover:text-[#ffb4ab]"
          >
            <LogOut className="size-5" />
          </button>
          <div
            className="flex size-8 items-center justify-center overflow-hidden rounded-full border text-[10px] font-bold"
            style={{ borderColor: C.outlineVariant, color: C.emerald }}
          >
            {isOfficer ? "CO" : "AD"}
          </div>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside
        className="fixed left-0 top-16 hidden h-[calc(100vh-64px)] w-60 flex-col border-r py-4 md:flex"
        style={{
          backgroundColor: C.surfaceContainerLow,
          borderColor: C.outlineVariant,
        }}
      >
        <div className="mb-6 px-4">
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(69,71,75,0.3)",
              backgroundColor: "rgba(64,71,88,0.1)",
            }}
          >
            <p className="text-sm font-bold" style={{ color: C.primary }}>
              KYC Sentinel
            </p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200"
              style={({ isActive }) =>
                isActive
                  ? {
                      color: C.primary,
                      backgroundColor: "rgba(64,71,88,0.2)",
                      borderRight: `2px solid ${C.primary}`,
                    }
                  : { color: C.onSurfaceVariant }
              }
            >
              <Icon className="size-5" />
              {label}
              {to === "/alerts" && openAlertCount > 0 ? (
                <span
                  className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                  style={{ backgroundColor: C.error, color: C.onError }}
                >
                  {openAlertCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-4">
          {isOfficer ? (
            <button
              onClick={handleScanAll}
              disabled={scanningAll || portfolio.length === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-3 font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: C.emerald, color: C.onPrimaryFixed }}
            >
              {scanningAll ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {scanningAll ? "Auditing..." : "New Audit"}
            </button>
          ) : (
            <Link
              to="/onboarding"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: C.emerald, color: C.onPrimaryFixed }}
            >
              <Plus className="size-4" />
              Onboard Entity
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-h-screen px-5 pb-16 pt-20 md:ml-60">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-1 py-2 backdrop-blur-sm md:hidden"
        style={{
          backgroundColor: "rgba(28,27,28,0.95)",
          borderColor: C.outlineVariant,
        }}
      >
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="relative flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors"
            style={({ isActive }) => ({
              color: isActive ? C.emerald : C.onSurfaceVariant,
            })}
          >
            <Icon className="size-5" />
            {label}
            {to === "/alerts" && openAlertCount > 0 ? (
              <span
                className="absolute -top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                style={{ backgroundColor: C.error, color: C.onError }}
              >
                {openAlertCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <footer
        className="fixed bottom-0 right-0 z-40 hidden h-8 w-full items-center justify-between border-t px-4 font-mono text-[11px] md:flex"
        style={{
          backgroundColor: C.surfaceContainerLowest,
          borderColor: C.outlineVariant,
        }}
      >
        <div className="flex gap-4">
          <span style={{ color: C.primary }}>© 2026 KYC Sentinel</span>
          <span className="opacity-60" style={{ color: C.onSurfaceVariant }}>
            | Session: {isOfficer ? "compliance-officer" : "admin"} | Encrypted:
            AES-256
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            to="/audit"
            className="transition-all hover:text-[#c3c6ce]"
            style={{ color: C.onSurfaceVariant }}
          >
            Audit Trail
          </Link>
          <span
            className="flex items-center gap-1"
            style={{ color: C.onSurfaceVariant }}
          >
            <Lock className="size-3" />
            Secure
          </span>
        </div>
      </footer>
    </div>
  );
}
