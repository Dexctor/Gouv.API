"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Financial } from "@prisma/client";
import { format } from "date-fns";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function FinancialSummary({ data }: { data: Financial[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Données financières</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun bilan disponible pour ce prospect. Le worker d&apos;ingestion
            BCE/INPI alimentera cette section en phase 2.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...data]
    .sort(
      (a, b) =>
        new Date(a.dateCloture).getTime() - new Date(b.dateCloture).getTime()
    )
    .map((f) => ({
      date: format(new Date(f.dateCloture), "yyyy"),
      CA: f.chiffreAffaires ?? 0,
      EBE: f.ebe ?? 0,
      RN: f.resultatNet ?? 0,
    }));

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Données financières</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(v) => euro.format(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(v) => (typeof v === "number" ? euro.format(v) : String(v))}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="CA" stroke="var(--chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="EBE" stroke="var(--chart-2)" strokeWidth={2} />
              <Line type="monotone" dataKey="RN" stroke="var(--chart-3)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat
            label="CA dernier"
            value={data[0]?.chiffreAffaires}
          />
          <Stat label="EBE dernier" value={data[0]?.ebe} />
          <Stat label="RN dernier" value={data[0]?.resultatNet} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="tabular-nums font-medium">
        {value != null ? euro.format(value) : "—"}
      </div>
    </div>
  );
}
