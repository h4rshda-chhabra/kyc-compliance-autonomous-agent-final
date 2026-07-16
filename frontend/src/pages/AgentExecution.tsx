import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/status-badges";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { apiClient } from "@/services/apiClient";
import { useCurrentUser } from "@/hooks/useAuth";
import type { Company, RiskLevel } from "@/types/models";

interface SarOutcome {
  generated_new: boolean;
  id: string | null;
  status: string | null;
  created_at: string | null;
  message: string | null;
}

interface AuditResult {
  run_id: string;
  company_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  rationale: string | null;
  sanctions_hits: number;
  media_hits: number;
  material_change: boolean;
  sar: SarOutcome;
}

const STEPS = [
  { id: "planner", label: "Planner Agent", desc: "Establishing the audit scope and identifying key principals to screen" },
  { id: "sanctions", label: "Sanctions Agent", desc: "Screening the company and its principals against global sanctions and watchlists" },
  { id: "news", label: "Adverse Media Agent", desc: "Reviewing recent news coverage for adverse media signals" },
  { id: "resolution", label: "Entity Resolution Agent", desc: "Validating watchlist matches and filtering out false positives" },
  { id: "risk", label: "Risk Assessment Agent", desc: "Calculating a composite risk score and supporting rationale" },
  { id: "sar", label: "SAR Generation Agent", desc: "Preparing a draft Suspicious Activity Report where warranted" },
];

export function AgentExecution() {
  const { companyId } = useParams<{ companyId: string }>();
  const { data: currentUser } = useCurrentUser();

  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch company details to show on the header
  const { data: company, isLoading: isCompanyLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await apiClient.get<Company>(`/companies/${companyId}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  // Call PostgreSQL trigger endpoint
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<AuditResult>(`/monitor/companies/${companyId}/trigger`);
      return res.data;
    },
    onSuccess: (data: AuditResult) => {
      setLogs((prev) => [...prev, `Audit completed successfully. Reference ID: ${data.run_id}`]);
      setLogs((prev) => [...prev, `Risk score determined: ${data.risk_score}/100 (${data.risk_level.toUpperCase()} risk)`]);
      setLogs((prev) => [...prev, `Watchlist matches: ${data.sanctions_hits} · Adverse media articles: ${data.media_hits}`]);
      setActiveStepIndex(STEPS.length); // complete
      setIsSimulating(false);
    },
    onError: (err: unknown) => {
      setLogs((prev) => [...prev, `Audit could not be completed: ${err instanceof Error ? err.message : String(err)}`]);
      setIsSimulating(false);
    },
  });

  const simulateStep = (index: number) => {
    if (index >= STEPS.length) {
      // Execute the real API call
      setLogs((prev) => [...prev, "Finalizing audit results and compiling the report..."]);
      mutation.mutate();
      return;
    }

    setActiveStepIndex(index);
    const step = STEPS[index];

    // Add logs depending on current step
    let logMsg = `${step.label}: processing...`;
    if (step.id === "planner") {
      logMsg = `Establishing audit scope for ${company?.legal_name || "the company"}...`;
    } else if (step.id === "sanctions") {
      logMsg = "Screening the company and its principals against global sanctions and watchlists...";
    } else if (step.id === "news") {
      logMsg = "Reviewing recent news coverage for adverse media signals...";
    } else if (step.id === "resolution") {
      logMsg = "Validating watchlist matches and filtering out false positives...";
    } else if (step.id === "risk") {
      logMsg = "Calculating composite risk score and compiling supporting rationale...";
    } else if (step.id === "sar") {
      logMsg = "Preparing draft Suspicious Activity Report narrative...";
    }

    setLogs((prev) => [...prev, logMsg]);

    setTimeout(() => {
      setLogs((prev) => [...prev, `${step.label} completed.`]);
      simulateStep(index + 1);
    }, 1500);
  };

  const startAudit = () => {
    setLogs(["Initiating continuous compliance audit workflow..."]);
    setIsSimulating(true);
    simulateStep(0);
  };

  // Admins don't run compliance audits — the backend also enforces this,
  // but redirect here so an admin never lands on a page whose only action
  // would just 403.
  if (currentUser?.role === "ADMIN") {
    return <Navigate to={`/companies/${companyId}`} replace />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Run Compliance Audit</h1>
          <p className="text-sm text-muted-foreground">
            Running the complete audit workflow for:{" "}
            {isCompanyLoading ? (
              <span className="inline-block h-4 w-32 align-middle bg-muted rounded animate-pulse" />
            ) : (
              <strong className="text-foreground">{company?.legal_name}</strong>
            )}
          </p>
        </div>
        <Link to={mutation.isSuccess ? `/companies/${companyId}?tab=reports` : `/companies/${companyId}`}>
          <Button variant="outline" size="sm">Back to Profile</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Step Tracker */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Compliance Audit Workflow</CardTitle>
              <CardDescription>Live status of each step in the audit</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-0">
              {STEPS.map((step, idx) => {
                const isActive = idx === activeStepIndex;
                const isCompleted = idx < activeStepIndex;
                
                return (
                  <div key={step.id} className="flex gap-3 items-start">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 border ${
                      isCompleted 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : (isActive 
                            ? "bg-yellow-500 text-black border-yellow-500 animate-pulse" 
                            : "bg-muted text-muted-foreground border-border")
                    }`}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${isActive ? "text-yellow-600 dark:text-yellow-400 font-semibold" : "text-foreground"}`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Log Output and Actions */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col h-[400px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Audit Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto bg-black text-green-400 font-mono text-xs p-4 rounded-md mx-6 mb-6">
              {logs.length === 0 && (
                <div className="text-muted-foreground italic h-full flex items-center justify-center">
                  Select "Run Compliance Audit" to begin the audit workflow.
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 leading-relaxed">
                  {log}
                </div>
              ))}
            </CardContent>
          </Card>

          {mutation.isSuccess && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Audit Findings</CardTitle>
                <CardDescription>Summary of this audit's results.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <RiskGauge score={mutation.data.risk_score} />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={mutation.data.risk_level} />
                      {mutation.data.material_change && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Material change detected</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span><strong className="tabular-nums">{mutation.data.sanctions_hits}</strong> <span className="text-muted-foreground">sanctions hits</span></span>
                      <span><strong className="tabular-nums">{mutation.data.media_hits}</strong> <span className="text-muted-foreground">media hits</span></span>
                    </div>
                    {mutation.data.rationale && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{mutation.data.rationale}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  {mutation.data.sar.id ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-sm">
                        {mutation.data.sar.generated_new ? "New SAR generated for this run." : "Existing SAR remains current."}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        No SAR generated — {mutation.data.sar.message ?? `risk score (${mutation.data.risk_score}) is below the SAR threshold`}.
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 items-center justify-end">
            {mutation.isSuccess && (
              <>
                {mutation.data.sar.id ? (
                  <Link to={`/sar/${mutation.data.sar.id}`}>
                    <Button variant="outline">
                      <FileText className="w-4 h-4 mr-1.5" />
                      Review SAR
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled>
                    <FileText className="w-4 h-4 mr-1.5" />
                    No SAR to review
                  </Button>
                )}
                <Button variant="outline" onClick={() => { mutation.reset(); setLogs([]); setActiveStepIndex(-1); }}>
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Run Another Audit
                </Button>
                <Link to={`/companies/${companyId}?tab=reports`}>
                  <Button>View Risk Profile</Button>
                </Link>
              </>
            )}

            {!mutation.isSuccess && (
              <Button
                onClick={startAudit}
                disabled={isSimulating}
                className="w-48"
              >
                {isSimulating ? "Audit in progress..." : "Run Compliance Audit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
