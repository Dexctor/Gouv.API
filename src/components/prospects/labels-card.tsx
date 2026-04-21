import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Complements } from "@/lib/api/recherche-entreprises";
import { Award } from "lucide-react";

interface Props {
  complements?: Complements | null;
  idccs?: string[] | null;
}

// Mapping principales conventions collectives (IDCC → libellé court)
// Pour démarrer avec les plus courantes Hauts-de-France / services / BTP.
const IDCC_LABELS: Record<string, string> = {
  "0843": "Boulangerie-pâtisserie (industrielle)",
  "1404": "Boulangerie-pâtisserie (entreprises artisanales)",
  "1486": "Bureaux d'études techniques (Syntec)",
  "1979": "Hôtels, cafés, restaurants (HCR)",
  "2216": "Commerce de détail et de gros",
  "3016": "Aide, accompagnement, soins à domicile",
  "2511": "Sport",
  "1596": "Bâtiment - ouvriers -10 salariés",
  "1597": "Bâtiment - ouvriers +10 salariés",
  "2332": "Entreprises d'architecture",
  "1512": "Promotion immobilière",
  "1170": "Industrie textile",
  "0086": "Entreprises d'expertise agricole",
  "2120": "Banques",
};

function idccLabel(idcc: string): string {
  return IDCC_LABELS[idcc] ?? `IDCC ${idcc}`;
}

export function LabelsCard({ complements, idccs }: Props) {
  if (!complements && (!idccs || idccs.length === 0)) return null;

  const labels: Array<{ label: string; color: string }> = [];
  const c = complements;

  if (c?.est_rge)
    labels.push({ label: "RGE", color: "bg-emerald-500/15 text-emerald-400" });
  if (c?.est_qualiopi)
    labels.push({ label: "Qualiopi", color: "bg-blue-500/15 text-blue-400" });
  if (c?.est_bio)
    labels.push({ label: "Bio", color: "bg-emerald-500/15 text-emerald-400" });
  if (c?.est_ess)
    labels.push({ label: "ESS", color: "bg-violet-500/15 text-violet-400" });
  if (c?.est_siae)
    labels.push({ label: "SIAE", color: "bg-violet-500/15 text-violet-400" });
  if (c?.est_association)
    labels.push({ label: "Association", color: "bg-sky-500/15 text-sky-400" });
  if (c?.est_societe_mission)
    labels.push({
      label: "Société à mission",
      color: "bg-amber-500/15 text-amber-400",
    });
  if (c?.est_service_public)
    labels.push({
      label: "Service public",
      color: "bg-blue-500/15 text-blue-400",
    });
  if (c?.est_organisme_formation)
    labels.push({
      label: "Organisme de formation",
      color: "bg-blue-500/15 text-blue-400",
    });
  if (c?.est_entrepreneur_spectacle)
    labels.push({
      label: "Entrepreneur du spectacle",
      color: "bg-fuchsia-500/15 text-fuchsia-400",
    });
  if (c?.est_patrimoine_vivant)
    labels.push({
      label: "Patrimoine vivant",
      color: "bg-amber-500/15 text-amber-400",
    });
  if (c?.est_achats_responsables)
    labels.push({
      label: "Achats responsables",
      color: "bg-emerald-500/15 text-emerald-400",
    });
  if (c?.bilan_ges_renseigne)
    labels.push({
      label: "Bilan GES",
      color: "bg-emerald-500/15 text-emerald-400",
    });

  if (labels.length === 0 && (!idccs || idccs.length === 0)) return null;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Award className="h-4 w-4" />
          Labels & conventions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.map((l) => (
              <span
                key={l.label}
                className={`inline-flex h-6 items-center rounded border border-border/40 px-2 text-xs font-medium ${l.color}`}
              >
                {l.label}
              </span>
            ))}
          </div>
        )}
        {idccs && idccs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Convention(s) collective(s)
            </div>
            <div className="space-y-1">
              {idccs.map((idcc) => (
                <div
                  key={idcc}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-2 py-1 text-xs"
                >
                  <span>{idccLabel(idcc)}</span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px]"
                  >
                    {idcc}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
