"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Search,
  TrendingDown,
  ExternalLink,
} from "lucide-react";
import { auditSeoAction, detectWebsiteAction } from "@/actions/website";
import type { SeoAuditResult } from "@/lib/api/seo-audit";

interface Props {
  prospectId: string;
  siteWeb: string | null;
  denomination: string;
}

const SEVERITY_STYLES = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  low: "border-slate-500/30 bg-slate-500/5 text-slate-400",
} as const;

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critique",
  high: "Important",
  medium: "Moyen",
  low: "Mineur",
};

const VENTE_META = {
  fort: {
    label: "Potentiel de vente FORT",
    subtitle: "Site très défaillant, pitch facile",
    classes: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  moyen: {
    label: "Potentiel de vente modéré",
    subtitle: "Quelques angles d'attaque",
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  faible: {
    label: "Site plutôt sain",
    subtitle: "Vente plus difficile sur le technique pur",
    classes: "border-slate-500/30 bg-slate-500/5 text-slate-400",
  },
} as const;

export function SeoAuditCard({ prospectId, siteWeb, denomination }: Props) {
  const [audit, setAudit] = useState<SeoAuditResult | null>(null);
  const [isAuditing, startAudit] = useTransition();
  const [isDetecting, startDetect] = useTransition();

  const runAudit = () => {
    if (!siteWeb) return;
    startAudit(async () => {
      const res = await auditSeoAction(siteWeb);
      if (!res.success || !res.audit) {
        toast.error(res.error ?? "Audit impossible");
        return;
      }
      setAudit(res.audit);
      toast.success(
        `Audit terminé : ${res.audit.findings.length} point${res.audit.findings.length > 1 ? "s" : ""} à exploiter`
      );
    });
  };

  const runDetect = () => {
    startDetect(async () => {
      const res = await detectWebsiteAction(prospectId);
      if (!res.success) {
        toast.error(res.error ?? "Pas de site détecté");
        return;
      }
      toast.success(
        res.confidence === "high"
          ? `Site détecté et enregistré : ${res.url}`
          : `Suggestion (confiance ${res.confidence}) : ${res.url}`
      );
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4" />
          Audit SEO préliminaire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!siteWeb ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Aucune URL renseignée. On peut tenter une détection automatique
              via le nom.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={runDetect}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="mr-2 h-3.5 w-3.5" />
              )}
              Détecter le site de « {denomination} »
            </Button>
          </div>
        ) : !audit ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Lance une analyse du HTML de{" "}
              <a
                href={siteWeb}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {siteWeb.replace(/^https?:\/\/(www\.)?/, "")}
              </a>{" "}
              pour remonter les signaux exploitables commercialement.
            </p>
            <Button
              size="sm"
              onClick={runAudit}
              disabled={isAuditing}
            >
              {isAuditing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-2 h-3.5 w-3.5" />
              )}
              Lancer l&apos;audit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Verdict commercial */}
            <div
              className={`rounded-md border px-3 py-2 ${VENTE_META[audit.ventePotentiel].classes}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    {audit.ventePotentiel === "fort" ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {VENTE_META[audit.ventePotentiel].label}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {VENTE_META[audit.ventePotentiel].subtitle}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold tabular-nums">
                    {audit.score}
                  </div>
                  <div className="text-[10px] uppercase opacity-80">
                    /100
                  </div>
                </div>
              </div>
            </div>

            {/* Méta-infos */}
            {(audit.title || audit.description) && (
              <div className="space-y-1 rounded-md border border-border/60 bg-card/40 p-2 text-xs">
                {audit.title && (
                  <div>
                    <span className="text-muted-foreground">Title : </span>
                    <span>{audit.title}</span>
                  </div>
                )}
                {audit.description && (
                  <div className="line-clamp-2">
                    <span className="text-muted-foreground">Description : </span>
                    <span>{audit.description}</span>
                  </div>
                )}
              </div>
            )}

            {/* Findings */}
            {audit.findings.length === 0 ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                Aucun problème évident détecté sur la home. Passer par Sitoscope
                pour un audit plus poussé.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Problèmes détectés ({audit.findings.length})
                </div>
                {audit.findings.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-md border p-2 text-xs ${SEVERITY_STYLES[f.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="font-medium">{f.title}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px] uppercase"
                      >
                        {SEVERITY_LABEL[f.severity]}
                      </Badge>
                    </div>
                    {f.pitch && (
                      <div className="mt-1 border-l-2 border-current pl-2 text-[11px] opacity-85">
                        Pitch : {f.pitch}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="xs"
                variant="outline"
                onClick={runAudit}
                disabled={isAuditing}
              >
                {isAuditing ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                Relancer
              </Button>
              <Button asChild size="xs" variant="outline">
                <a href={siteWeb} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Ouvrir
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
