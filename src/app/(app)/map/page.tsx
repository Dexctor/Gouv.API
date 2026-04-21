import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PipelineMap, LegendItem } from "@/components/map/pipeline-map";
import { PIPELINE_STAGES } from "@/types/prospect";

export const metadata: Metadata = {
  title: "Carte — Gouv-API",
};

export default async function MapPage() {
  const prospects = await prisma.prospect.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      siren: true,
      denomination: true,
      latitude: true,
      longitude: true,
      stage: true,
      ville: true,
      codePostal: true,
    },
  });

  const mapProspects = prospects
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      id: p.id,
      siren: p.siren,
      denomination: p.denomination,
      latitude: p.latitude!,
      longitude: p.longitude!,
      stage: p.stage,
      ville: p.ville,
      codePostal: p.codePostal,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Carte des prospects
          </h1>
          <p className="text-sm text-muted-foreground">
            {mapProspects.length} prospect{mapProspects.length > 1 ? "s" : ""}{" "}
            géolocalisé{mapProspects.length > 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {PIPELINE_STAGES.map((s) => (
            <LegendItem key={s.value} stage={s.value} label={s.label} />
          ))}
        </div>
      </div>

      {mapProspects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/20 p-10 text-center text-sm text-muted-foreground">
          Aucun prospect géolocalisé. Les coordonnées sont renseignées
          automatiquement quand vous ajoutez un prospect depuis la recherche.
        </div>
      ) : (
        <PipelineMap prospects={mapProspects} height={640} />
      )}
    </div>
  );
}
