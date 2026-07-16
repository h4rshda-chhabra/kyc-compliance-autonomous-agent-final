import { useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, XCircle } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SarStatusBadge } from "@/components/status-badges";
import { SarNarrative } from "@/components/SarNarrative";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/hooks/useCompanies";
import {
  useApproveDeactivation,
  useRecommendDeactivation,
  useRejectByAdmin,
  useRejectByOfficer,
  useSarReport,
} from "@/hooks/useSarReports";
import { downloadSarPdf } from "@/lib/sarPdf";
import { useRole } from "@/lib/roles";

export function SarReviewPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const { data: sar, isLoading, isError, refetch } = useSarReport(id);
  const { data: company } = useCompany(sar?.company_id);
  const [remarks, setRemarks] = useState("");

  const recommendDeactivation = useRecommendDeactivation();
  const rejectByOfficer = useRejectByOfficer();
  const approveDeactivation = useApproveDeactivation();
  const rejectByAdmin = useRejectByAdmin();

  const isOfficer = role === "compliance_officer";
  const anyActionPending =
    recommendDeactivation.isPending ||
    rejectByOfficer.isPending ||
    approveDeactivation.isPending ||
    rejectByAdmin.isPending;

  const awaitingOfficer = sar?.status === "draft";
  const awaitingAdmin = sar?.status === "pending_admin_review";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to={isOfficer ? "/reviews" : "/decisions"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {isOfficer ? "Back to SAR reviews" : "Back to decisions"}
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !sar ? (
        <Card>
          <CardContent>
            <ErrorState message="Could not load this SAR report." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={`SAR ${sar.id.slice(0, 8)}`}
            description={company?.legal_name || undefined}
            action={<SarStatusBadge status={sar.status} />}
          />

          <Card>
            <CardHeader>
              <CardTitle>Narrative</CardTitle>
            </CardHeader>
            <CardContent>
              {sar.narrative ? (
                <SarNarrative content={sar.narrative} />
              ) : (
                <p className="text-sm text-muted-foreground">No narrative has been drafted yet.</p>
              )}
            </CardContent>
          </Card>

          {sar.review ? (
            <Card>
              <CardHeader>
                <CardTitle>Review history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {sar.review.decision ? (
                  <div>
                    <p className="font-medium text-foreground">
                      Compliance officer:{" "}
                      <span className="capitalize">{sar.review.decision.replace(/_/g, " ")}</span>
                    </p>
                    {sar.review.notes ? (
                      <p className="text-muted-foreground">"{sar.review.notes}"</p>
                    ) : null}
                  </div>
                ) : null}
                {sar.review.final_decision ? (
                  <div>
                    <p className="font-medium text-foreground">
                      Admin:{" "}
                      <span className="capitalize">{sar.review.final_decision.replace(/_/g, " ")}</span>
                    </p>
                    {sar.review.admin_notes ? (
                      <p className="text-muted-foreground">"{sar.review.admin_notes}"</p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {isOfficer && awaitingOfficer ? (
            <Card>
              <CardHeader>
                <CardTitle>Compliance officer review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recommend deactivation to send this SAR to an admin for the final
                  decision, or reject it if there's no basis for deactivation.
                </p>
                <Textarea
                  placeholder="Remarks (optional)"
                  value={remarks}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={anyActionPending}
                    onClick={() =>
                      recommendDeactivation.mutate({ id: sar.id, remarks: remarks || undefined })
                    }
                  >
                    <CheckCircle2 data-icon="inline-start" />
                    Recommend Deactivation
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={anyActionPending}
                    onClick={() => rejectByOfficer.mutate({ id: sar.id, remarks: remarks || undefined })}
                  >
                    <XCircle data-icon="inline-start" />
                    Reject
                  </Button>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    variant="outline"
                    onClick={() => void downloadSarPdf(sar.id)}
                  >
                    <Download data-icon="inline-start" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !isOfficer && awaitingAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admin final decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A compliance officer recommended deactivating this company. Approve
                  to deactivate it, or reject to keep it under monitoring.
                </p>
                <Textarea
                  placeholder="Remarks (optional)"
                  value={remarks}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={anyActionPending}
                    onClick={() =>
                      approveDeactivation.mutate({ id: sar.id, remarks: remarks || undefined })
                    }
                  >
                    <CheckCircle2 data-icon="inline-start" />
                    Approve Deactivation
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={anyActionPending}
                    onClick={() => rejectByAdmin.mutate({ id: sar.id, remarks: remarks || undefined })}
                  >
                    <XCircle data-icon="inline-start" />
                    Reject Recommendation
                  </Button>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    variant="outline"
                    onClick={() => void downloadSarPdf(sar.id)}
                  >
                    <Download data-icon="inline-start" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isOfficer ? "No action needed" : "Officer review"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isOfficer
                    ? "This SAR isn't awaiting your review right now."
                    : "This SAR isn't awaiting an admin decision right now."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void downloadSarPdf(sar.id)}
                >
                  <Download data-icon="inline-start" />
                  Export
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
