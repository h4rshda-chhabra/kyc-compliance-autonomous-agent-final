import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { RiskLevel } from "@/types/models";
import { riskVar } from "./riskColors";

function levelForScore(score: number): RiskLevel {
  if (score >= 90) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function RiskGauge({ score }: { score: number }) {
  const level = levelForScore(score);
  const data = [
    { name: "score", value: score },
    { name: "rest", value: 100 - score },
  ];

  return (
    <div className="relative mx-auto h-32 w-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={90}
            paddingAngle={1}
            strokeWidth={0}
            cy="90%"
          >
            <Cell fill={riskVar[level]} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {score}
        </span>
        <span className="text-xs capitalize text-muted-foreground">
          {level} risk
        </span>
      </div>
    </div>
  );
}
