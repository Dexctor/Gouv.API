"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gauge, Loader2, Play, RefreshCw, ExternalLink } from "lucide-react";
import {
  launchSitoscopeAuditAction,
  getSitoscopeStatusAction,
} from "@/actions/sitoscope";
import type { SitoscopeAuditResult } from "@/lib/api/sitoscope";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

interface Props {
  prospectId: string;
  siteWeb: string | null;
  configured: boolean;
}

export function SitoscopeCard({ prospectId, siteWeb, configured }: Props) {
  const [auditId, setAuditId] = useState<string | null>(null);
  const [status, setStatus] = useState<SitoscopeAuditResult | null>(null);
  const [isLaunching, startLaunch] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  const launch = () => {
    startLaunch(async () => {
      const res = await launchSitoscopeAuditAction(prospectId);
      if (!res.success || !res.auditId) {
        toast.error(res.error ?? "Échec");
        return;
      }
      setAuditId(res.auditId);
      setStatus({ status: "pending", auditId: res.auditId });
      toast.success("Audit lancé");
    });
  };

  const refresh = () => {
    if (!auditId) return;
    startRefresh(async () => {
      const res = await getSitoscopeStatusAction(auditId);
      if (!res) {
        toast.error("Impossible de récupérer le statut");
        return;
      }
      setStatus(res);
      if (res.status === "done") toast.success("Audit terminé");
      if (res.status === "failed") toast.error("Audit échoué");
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="h-4 w-4" />
          Audit Sitoscope
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!configured ? (
          <p className="text-xs text-muted-foreground">
            Configurez{" "}
            <code className="rounded bg-muted px-1">SITOSCOPE_URL</code> et{" "}
            <code className="rounded bg-muted px-1">SITOSCOPE_API_KEY</code>{" "}
            dans votre .env pour activer les audits.
          </p>
        ) : !siteWeb ? (
          <p className="text-xs text-muted-foreground">
            Renseignez d&apos;abord l&apos;URL du site web dans la carte
            ci-dessus.
          </p>
        ) : !auditId ? (
          <Button onClick={launch} disabled={isLaunching} size="sm">
            {isLaunching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Lancer l&apos;audit
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">
                {auditId}
              </span>
              <div className="flex items-center gap-1">
                <StatusBadge status={status?.status ?? "pending"} />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={refresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>

            {status?.status === "done" && status.score && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                <ScoreCell label="Global" value={status.score.overall} />
                <ScoreCell label="Perf" value={status.score.performance} />
                <ScoreCell label="SEO" value={status.score.seo} />
                <ScoreCell label="A11y" value={status.score.accessibility} />
              </div>
            )}

            {status?.status === "done" && status.findings && status.findings.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Problèmes détectés</div>
                {status.findings.slice(0, 5).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded border border-border/60 bg-card/40 p-2 text-xs"
                  >
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${
                        f.severity === "critical" || f.severity === "high"
                          ? "border-red-500/40 text-red-400"
                          : "border-amber-500/40 text-amber-400"
                      }`}
                    >
                      {f.severity}
                    </Badge>
                    <span>{f.title}</span>
                  </div>
                ))}
              </div>
            )}

            {status?.reportUrl && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <a
                  href={status.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Rapport complet
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "pending" | "done" | "failed" }) {
  const map = {
    pending: { label: "En cours", classes: "border-amber-500/40 text-amber-400" },
    done: { label: "Terminé", classes: "border-emerald-500/40 text-emerald-400" },
    failed: { label: "Échec", classes: "border-red-500/40 text-red-400" },
  } as const;
  const { label, classes } = map[status];
  return (
    <Badge variant="outline" className={`text-[10px] ${classes}`}>
      {label}
    </Badge>
  );
}

function ScoreCell({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  if (value == null) return null;
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2 text-center">
      <div className={`text-lg font-semibold ${scoreColor(value)}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
