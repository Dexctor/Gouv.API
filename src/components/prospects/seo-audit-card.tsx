"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import {
  collectWebObservationsAction,
  detectWebsiteAction,
} from "@/actions/website";
import type {
  ObservationStatus,
} from "@/lib/api/seo-audit";
import type { WebsiteStatus } from "@prisma/client";

export interface SerializedObservation {
  key: string;
  value: unknown;
  status: ObservationStatus;
  observedAt: string;
  evidence: string | null;
}

interface Props {
  prospectId: string;
  siteWeb: string | null;
  siteWebStatus: WebsiteStatus;
  denomination: string;
  initialObservations: SerializedObservation[];
}

const LABELS: Record<string, string> = {
  http_status: "Réponse HTTP",
  final_url: "URL finale",
  page_content: "Contenu de page",
  title: "Title",
  meta_description: "Meta description",
  h1: "H1",
  h2: "H2",
  canonical: "Canonical",
  robots_meta: "Robots meta",
  sitemap_link: "Sitemap déclaré",
  pages_identified: "Pages identifiées",
  services_observed: "Services/prestations observés",
  cta_texts: "CTA observés",
  forms_count: "Formulaires",
  phone_visible: "Téléphone visible",
  links_count: "Liens trouvés",
  realisations_pages: "Pages de réalisations",
  testimonials_pages: "Pages de témoignages/avis",
  certifications_mentions: "Certifications mentionnées",
  http_response: "Échec HTTP",
  collection_error: "Échec de collecte",
};

function valueLabel(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(" · ");
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusLabel(status: ObservationStatus): string {
  const labels: Record<ObservationStatus, string> = {
    verified: "Observé",
    unknown: "Inconnu",
    not_found_in_scope: "Non trouvé ici",
    collection_failed: "Collecte échouée",
  };
  return labels[status];
}

export function SeoAuditCard({
  prospectId,
  siteWeb,
  siteWebStatus,
  denomination,
  initialObservations,
}: Props) {
  const router = useRouter();
  const [observations, setObservations] = useState(initialObservations);
  const [isCollecting, startCollection] = useTransition();
  const [isDetecting, startDetect] = useTransition();

  const runCollection = () => {
    startCollection(async () => {
      const result = await collectWebObservationsAction(prospectId);
      if (result.collection) {
        setObservations(
          result.collection.observations.map((observation) => ({
            key: observation.key,
            value: observation.value,
            status: observation.status,
            observedAt: observation.observedAt,
            evidence: observation.evidence ?? null,
          }))
        );
      }
      if (!result.success) {
        toast.error(result.error ?? "Collecte impossible");
        return;
      }
      toast.success("Observations web collectées");
      router.refresh();
    });
  };

  const runDetect = () => {
    startDetect(async () => {
      const result = await detectWebsiteAction(prospectId);
      if (!result.success) {
        toast.error(result.error ?? "Aucun domaine candidat trouvé");
        return;
      }
      toast.success(`Domaine candidat enregistré : ${result.url}`);
      router.refresh();
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4" />
          Observations web
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!siteWeb ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Aucun domaine connu. La détection automatique crée uniquement un
              candidat à valider.
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
              Chercher un domaine pour « {denomination} »
            </Button>
          </div>
        ) : siteWebStatus !== "verified" ? (
          <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            Domaine {siteWebStatus}. Validez manuellement son identité avant de
            collecter son contenu. Une réponse HTTP seule ne constitue pas une
            preuve d’identité.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={siteWeb}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline hover:text-foreground"
              >
                {siteWeb.replace(/^https?:\/\/(www\.)?/, "")}
                <ExternalLink className="h-3 w-3" />
              </a>
              <Button
                size="xs"
                onClick={runCollection}
                disabled={isCollecting}
              >
                {isCollecting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                {observations.length ? "Actualiser" : "Collecter"}
              </Button>
            </div>

            {observations.length ? (
              <div className="space-y-1.5">
                {observations.map((observation) => (
                  <div
                    key={observation.key}
                    className="rounded-md border border-border/60 bg-card/40 p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {LABELS[observation.key] ?? observation.key}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        {statusLabel(observation.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 break-words text-muted-foreground">
                      {valueLabel(observation.value)}
                    </p>
                    {observation.evidence && (
                      <p className="mt-1 text-[10px] text-muted-foreground/80">
                        Périmètre : {observation.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune observation collectée pour ce domaine.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
