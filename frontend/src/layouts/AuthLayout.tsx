import { Link, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, Terminal } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#121413] px-6 py-12 text-[#e2e3e0]">
      <div className="w-full max-w-md space-y-10">
        <Link to="/" className="flex items-center justify-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-sm bg-[#4edea3]">
            <ShieldCheck className="size-5 text-[#121413]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#4edea3]">
            KYC AUDITOR
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>

        <footer className="flex flex-col items-center space-y-2 border-t border-[#3c4a42]/20 pt-8">
          <div className="flex items-center gap-2 text-[#86948a]/60">
            <Lock className="size-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-tight">
              AES-256 Bit Encrypted Session
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#86948a]/60">
            <Terminal className="size-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-tight">
              Continuous KYC Autonomous Auditor | Status: Ready
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
