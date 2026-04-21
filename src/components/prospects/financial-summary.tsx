"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Financial } from "@prisma/client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const euroCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function FinancialSummary({ data }: { data: Financial[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Données financières
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-6 text-center">
            <div className="text-sm font-medium text-muted-foreground">
              Aucun bilan publié
            </div>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Cette entreprise n&apos;a pas déposé ses comptes au greffe. Le
              worker d&apos;ingestion BCE/INPI pourra compléter cette section
              mensuellement.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tri chronologique ascendant (plus ancien → plus récent)
  const sorted = [...data].sort(
    (a, b) =>
      new Date(a.dateCloture).getTime() - new Date(b.dateCloture).getTime()
  );
  // Dernier bilan = le plus récent
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const latestYear = new Date(latest.dateCloture).getFullYear();

  const chartData = sorted.map((f) => ({
    annee: new Date(f.dateCloture).getFullYear().toString(),
    CA: f.chiffreAffaires ?? 0,
    EBE: f.ebe ?? 0,
    RN: f.resultatNet ?? 0,
  }));

  // Un seul bilan : pas de graph qui n'a aucun sens, juste les KPIs
  const showChart = chartData.length >= 2;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            Données financières
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {sorted.length} exercice{sorted.length > 1 ? "s" : ""} publié
            {sorted.length > 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs de l'exercice le plus récent */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Exercice clos {latestYear}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <KpiCell
              label="Chiffre d'affaires"
              value={latest.chiffreAffaires}
              previous={previous?.chiffreAffaires}
            />
            <KpiCell
              label="Marge brute"
              value={latest.margeBrute}
              previous={previous?.margeBrute}
            />
            <KpiCell
              label="EBE"
              value={latest.ebe}
              previous={previous?.ebe}
            />
            <KpiCell
              label="Résultat net"
              value={latest.resultatNet}
              previous={previous?.resultatNet}
              colored
            />
          </div>
        </div>

        {/* Graphique : uniquement si plusieurs années */}
        {showChart && (
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeOpacity={0.25}
                  vertical={false}
                />
                <XAxis
                  dataKey="annee"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => euroCompact.format(v)}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(v) =>
                    typeof v === "number" ? euro.format(v) : String(v)
                  }
                  cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="square"
                />
                <Bar
                  dataKey="CA"
                  fill="var(--chart-1)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="EBE"
                  fill="var(--chart-2)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="RN"
                  fill="var(--chart-3)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!showChart && (
          <p className="text-xs text-muted-foreground">
            Un seul exercice publié. L&apos;évolution annuelle sera visible dès
            qu&apos;un second bilan sera disponible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface KpiProps {
  label: string;
  value: number | null;
  previous?: number | null;
  /** Colorer en rouge si négatif */
  colored?: boolean;
}

function KpiCell({ label, value, previous, colored }: KpiProps) {
  const hasValue = value != null;
  const trend = computeTrend(value, previous);

  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          !hasValue
            ? "text-muted-foreground/60"
            : colored && value! < 0
              ? "text-red-400"
              : ""
        }`}
      >
        {hasValue ? euro.format(value!) : "—"}
      </div>
      {trend && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px]">
          {trend.direction === "up" && (
            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
          )}
          {trend.direction === "down" && (
            <TrendingDown className="h-2.5 w-2.5 text-red-400" />
          )}
          {trend.direction === "flat" && (
            <Minus className="h-2.5 w-2.5 text-muted-foreground" />
          )}
          <span
            className={
              trend.direction === "up"
                ? "text-emerald-400"
                : trend.direction === "down"
                  ? "text-red-400"
                  : "text-muted-foreground"
            }
          >
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

function computeTrend(
  current: number | null | undefined,
  previous: number | null | undefined
): { direction: "up" | "down" | "flat"; label: string } | null {
  if (current == null || previous == null || previous === 0) return null;
  const delta = current - previous;
  const pct = (delta / Math.abs(previous)) * 100;
  const absPct = Math.abs(pct);
  if (absPct < 1) return { direction: "flat", label: "stable" };
  const sign = pct > 0 ? "+" : "";
  return {
    direction: pct > 0 ? "up" : "down",
    label: `${sign}${pct.toFixed(0)}% vs N-1`,
  };
}
