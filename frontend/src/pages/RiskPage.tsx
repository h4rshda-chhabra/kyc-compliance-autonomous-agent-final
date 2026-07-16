import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCompany } from "@/hooks/useCompanies";

interface RiskFactor {
  id: string;
  name: string;
  score: number;
  confidence: number;
  status: "elevated" | "normal" | "improving";
}

export function RiskPage() {
  const { id } = useParams();
  const { data: company } = useCompany(id);

  const riskFactors: RiskFactor[] = useMemo(
    () => [
      {
        id: "rf-001",
        name: "Adverse Media Exposure",
        score: 85,
        confidence: 92,
        status: "elevated",
      },
      {
        id: "rf-002",
        name: "Sanctions List Match",
        score: 90,
        confidence: 98,
        status: "elevated",
      },
      {
        id: "rf-003",
        name: "Geographic Risk",
        score: 65,
        confidence: 88,
        status: "elevated",
      },
      {
        id: "rf-004",
        name: "Transaction Patterns",
        score: 45,
        confidence: 75,
        status: "normal",
      },
      {
        id: "rf-005",
        name: "UBO Transparency",
        score: 30,
        confidence: 85,
        status: "improving",
      },
    ],
    []
  );

  const overallRisk = useMemo(() => {
    const avg = riskFactors.reduce((sum, f) => sum + f.score, 0) / riskFactors.length;
    if (avg >= 70) return { level: "High", color: "text-destructive" };
    if (avg >= 40) return { level: "Medium", color: "text-yellow-500" };
    return { level: "Low", color: "text-primary" };
  }, [riskFactors]);

  const getRiskIcon = (status: RiskFactor["status"]) => {
    switch (status) {
      case "elevated":
        return <AlertTriangle className="size-4 text-destructive" />;
      case "improving":
        return <CheckCircle2 className="size-4 text-primary" />;
      default:
        return <TrendingUp className="size-4 text-muted-foreground" />;
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
        title="Risk Assessment"
        description="Comprehensive risk scoring and factor analysis"
      />

      {/* Overall Risk */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overall Risk Level
                </p>
                <p className={`text-4xl font-bold ${overallRisk.color}`}>
                  {overallRisk.level}
                </p>
              </div>
              <Badge variant="outline" className="text-lg">
                {Math.round(
                  riskFactors.reduce((sum, f) => sum + f.score, 0) /
                    riskFactors.length
                )}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Risk Score</span>
                <span>
                  {Math.round(
                    riskFactors.reduce((sum, f) => sum + f.score, 0) /
                      riskFactors.length
                  )}/100
                </span>
              </div>
              <Progress
                value={Math.round(
                  riskFactors.reduce((sum, f) => sum + f.score, 0) /
                    riskFactors.length
                )}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      <div className="grid gap-4 lg:grid-cols-2">
        {riskFactors.map((factor) => (
          <Card key={factor.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(factor.status)}
                      <p className="font-medium">{factor.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {factor.confidence}%
                    </p>
                  </div>
                  <Badge
                    variant={
                      factor.score >= 70
                        ? "destructive"
                        : factor.score >= 40
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {factor.score}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Score</span>
                    <span>{factor.score}/100</span>
                  </div>
                  <Progress value={factor.score} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Risk Areas</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>
                  Multiple sanctions list matches requiring immediate escalation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>Significant adverse media coverage from regulatory bodies</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                <span>Geographic location presents elevated risk profile</span>
              </li>
            </ul>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium">Recommendations</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Recommend rejecting onboarding based on sanctions exposure</li>
              <li>• If proceeding, implement enhanced monitoring protocols</li>
              <li>• Schedule quarterly risk reassessment</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
