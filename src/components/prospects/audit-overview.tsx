import type { AuditPageCollectionStatus, WebsiteStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const websiteLabels: Record<WebsiteStatus, string> = {
  unknown: "Site inconnu", candidate: "Domaine à vérifier", verified: "Domaine vérifié", rejected: "Domaine rejeté",
};
const observationLabels: Record<string, string> = {
  verified: "Observé", unknown: "Inconnu", not_found_in_scope: "Non trouvé dans le périmètre", collection_failed: "Échec de collecte",
};

export function AuditOverview({ siteWebStatus, pages, observations }: {
  siteWebStatus: WebsiteStatus;
  pages: { selected: boolean; collectionStatus: AuditPageCollectionStatus }[];
  observations: { id: string; key: string; value: unknown; status: string; url: string | null; evidence: string | null; observedAt: Date }[];
}) {
  const selected = pages.filter((page) => page.selected);
  const collected = selected.filter((page) => page.collectionStatus === "collected").length;
  return (
    <section aria-label="Synthèse de la collecte" className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-xs">
        <Badge variant="outline" className={siteWebStatus === "verified" ? "text-emerald-400" : "text-muted-foreground"}>{websiteLabels[siteWebStatus]}</Badge>
        <span><strong className="tabular-nums">{collected}/{selected.length}</strong> pages sélectionnées collectées</span>
        <span className="text-muted-foreground"><strong className="text-foreground tabular-nums">{observations.length}</strong> observations disponibles</span>
      </div>
      <details className="border-t border-border">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">Consulter les observations et leurs sources</summary>
        {observations.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">Aucune observation disponible. Vérifiez le domaine, puis préparez et collectez les pages ci-dessous.</p>
        ) : (
          <dl className="max-h-96 divide-y divide-border overflow-y-auto border-t border-border">
            {observations.map((observation) => (
              <div key={observation.id} className="space-y-1.5 px-4 py-3 text-xs [overflow-wrap:anywhere]">
                <dt className="flex flex-wrap items-center justify-between gap-2 font-medium">
                  {observation.key.replaceAll("_", " ")}<Badge variant="outline">{observationLabels[observation.status] ?? observation.status}</Badge>
                </dt>
                <dd className="whitespace-pre-wrap text-muted-foreground">{observation.value == null ? "Non renseigné" : typeof observation.value === "string" ? observation.value : JSON.stringify(observation.value, null, 2)}</dd>
                <dd className="text-muted-foreground">{observation.url && <span className="block">Source : {observation.url}</span>}{observation.evidence && <span className="block">{observation.evidence}</span>}Observé le {observation.observedAt.toLocaleString("fr-FR")}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
    </section>
  );
}
