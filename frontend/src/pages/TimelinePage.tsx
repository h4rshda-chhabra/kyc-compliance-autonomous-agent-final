import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompany } from "@/hooks/useCompanies";

interface TimelineEvent {
  id: string;
  date: string;
  type: "alert" | "action" | "decision" | "monitoring";
  title: string;
  description: string;
  severity?: "high" | "medium" | "low";
}

export function TimelinePage() {
  const { id } = useParams();
  const { data: company } = useCompany(id);

  const events: TimelineEvent[] = useMemo(
    () => [
      {
        id: "evt-001",
        date: "2026-06-20",
        type: "alert",
        title: "High-Value Transaction Alert",
        description:
          "Automated monitoring detected transaction exceeding risk threshold",
        severity: "medium",
      },
      {
        id: "evt-002",
        date: "2026-06-15",
        type: "alert",
        title: "Adverse Media Detected",
        description: "News article published regarding regulatory investigation",
        severity: "high",
      },
      {
        id: "evt-003",
        date: "2026-06-10",
        type: "monitoring",
        title: "Sanctions List Match",
        description:
          "Entity matched against OFAC Specially Designated Nationals list",
        severity: "high",
      },
      {
        id: "evt-004",
        date: "2026-06-01",
        type: "action",
        title: "Compliance Review Initiated",
        description: "Compliance officer began detailed review of entity",
      },
      {
        id: "evt-005",
        date: "2026-05-15",
        type: "action",
        title: "Company Onboarded",
        description: "Entity successfully added to monitoring portfolio",
      },
      {
        id: "evt-006",
        date: "2026-05-10",
        type: "decision",
        title: "KYC Verification Completed",
        description: "All required Know-Your-Customer documentation verified",
      },
    ],
    []
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="size-5 text-destructive" />;
      case "decision":
        return <CheckCircle2 className="size-5 text-primary" />;
      case "action":
        return <Clock className="size-5 text-muted-foreground" />;
      case "monitoring":
        return <AlertCircle className="size-5 text-yellow-500" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "alert":
        return "border-destructive/30 bg-destructive/5";
      case "decision":
        return "border-primary/30 bg-primary/5";
      case "action":
        return "border-muted/30 bg-muted/20";
      case "monitoring":
        return "border-yellow-500/30 bg-yellow-500/5";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={company ? `/companies/${id}` : "/monitoring"}>
          <Button variant="ghost" size="sm" className="cursor-pointer">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Event Timeline"
        description={`${sortedEvents.length} events showing risk profile changes`}
      />

      {/* Timeline */}
      <div className="space-y-4">
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="flex gap-6">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-full border-2 border-border bg-background">
                {getEventIcon(event.type)}
              </div>
              {index < sortedEvents.length - 1 && (
                <div className="mt-2 h-12 w-0.5 bg-border" />
              )}
            </div>

            {/* Event card */}
            <div className="flex-1 pb-4">
              <Card className={`border ${getEventColor(event.type)}`}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                      {event.severity && (
                        <Badge
                          variant={
                            event.severity === "high"
                              ? "destructive"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {event.severity}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>
                        {new Date(event.date).toLocaleDateString()} at{" "}
                        {new Date(event.date).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-medium">Risk Profile Summary</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Entity was onboarded on{" "}
              <strong>2026-05-15</strong> after successful KYC verification
            </p>
            <p>
              • Monitoring began with{" "}
              <strong>initial sanction list match</strong> on 2026-06-10
            </p>
            <p>
              • Risk profile deteriorated significantly with{" "}
              <strong>adverse media coverage</strong> (2026-06-15)
            </p>
            <p>
              • Recent transaction alert (2026-06-20) suggests{" "}
              <strong>ongoing compliance concerns</strong>
            </p>
            <p className="pt-2">
              <strong>Conclusion:</strong> Risk has escalated dramatically over
              the past 10 days. Recommend immediate escalation and enhanced
              monitoring or potential offboarding.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
