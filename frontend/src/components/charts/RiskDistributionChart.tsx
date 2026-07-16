import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Company, RiskLevel } from "@/types/models";
import { riskVar } from "./riskColors";

const LEVELS: Array<{ level: RiskLevel; label: string }> = [
  { level: "low", label: "Low" },
  { level: "medium", label: "Medium" },
  { level: "high", label: "High" },
  { level: "critical", label: "Critical" },
  { level: "unknown", label: "Unassessed" },
];

interface ChartDatum {
  level: RiskLevel;
  label: string;
  count: number;
}

function ChartTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{d.label} risk</p>
      <p className="text-muted-foreground">
        {d.count.toLocaleString()} companies · {((d.count / total) * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export function RiskDistributionChart({ companies }: { companies: Company[] }) {
  const data = LEVELS.map(({ level, label }) => ({
    level,
    label,
    count: companies.filter((c) => c.risk_level === level).length,
  })).filter((d) => d.count > 0);

  const total = companies.length;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive
            >
              {data.map((entry) => (
                <Cell key={entry.level} fill={riskVar[entry.level]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-foreground">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">entities</span>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.level} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: riskVar[d.level] }}
            />
            <span className="text-foreground">{d.label}</span>
            <span className="ml-auto pl-6 tabular-nums text-muted-foreground">
              {d.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
