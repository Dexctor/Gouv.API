import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { nafCodeAndLabel, findNaf } from "@/lib/naf-lookup";
import { natureJuridiqueLabel } from "@/lib/insee-labels";
import type { Complements } from "@/lib/api/recherche-entreprises";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Building2, Briefcase, Award } from "lucide-react";

interface Props {
  siren: string;
  siret: string | null;
  codeNaf: string | null;
  codeNaf25?: string | null;
  formeJuridique: string | null;
  dateCreation: Date | string | null;
  enseignes?: string[] | null;
  complements?: Complements | null;
  idccs: string[];
  nombreEtablissements?: number | null;
  nombreEtablissementsOuverts?: number | null;
}

export function EntrepriseTab(props: Props) {
  const nafInfo = findNaf(props.codeNaf);

  const labels: Array<{ label: string; color: string }> = [];
  const c = props.complements;
  if (c?.est_rge) labels.push({ label: "RGE", color: "bg-emerald-500/15 text-emerald-400" });
  if (c?.est_qualiopi) labels.push({ label: "Qualiopi", color: "bg-blue-500/15 text-blue-400" });
  if (c?.est_bio) labels.push({ label: "Bio", color: "bg-emerald-500/15 text-emerald-400" });
  if (c?.est_ess) labels.push({ label: "ESS", color: "bg-violet-500/15 text-violet-400" });
  if (c?.est_siae) labels.push({ label: "SIAE", color: "bg-violet-500/15 text-violet-400" });
  if (c?.est_societe_mission) labels.push({ label: "Mission", color: "bg-amber-500/15 text-amber-400" });
  if (c?.est_organisme_formation) labels.push({ label: "OF", color: "bg-blue-500/15 text-blue-400" });
  if (c?.est_patrimoine_vivant) labels.push({ label: "EPV", color: "bg-amber-500/15 text-amber-400" });

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5 pt-5">
        {/* Activité - la plus importante en haut */}
        <section>
          <SectionTitle icon={Briefcase}>Activité principale</SectionTitle>
          <div className="mt-2 text-base font-semibold">
            {nafInfo?.libelle ?? props.codeNaf ?? "Non renseignée"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Code NAF{" "}
            <span className="font-mono">{nafInfo?.code ?? props.codeNaf ?? "—"}</span>
            {props.codeNaf25 && props.codeNaf25 !== props.codeNaf && (
              <span className="ml-2 opacity-60">
                · NAF25 <span className="font-mono">{props.codeNaf25}</span>
              </span>
            )}
          </div>
        </section>

        <Divider />

        {/* Identité légale */}
        <section>
          <SectionTitle icon={Building2}>Identité légale</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <InfoPair label="SIREN" value={props.siren} mono />
            {props.siret && <InfoPair label="SIRET (siège)" value={props.siret} mono />}
            <InfoPair
              label="Forme juridique"
              value={natureJuridiqueLabel(props.formeJuridique)}
            />
            <InfoPair
              label="Date de création"
              value={
                props.dateCreation
                  ? format(
                      typeof props.dateCreation === "string"
                        ? new Date(props.dateCreation)
                        : props.dateCreation,
                      "PPP",
                      { locale: fr }
                    )
                  : "—"
              }
            />
            <InfoPair
              label="Établissements"
              value={
                props.nombreEtablissements != null
                  ? `${props.nombreEtablissements}${
                      props.nombreEtablissementsOuverts != null
                        ? ` (${props.nombreEtablissementsOuverts} ouv.)`
                        : ""
                    }`
                  : "—"
              }
            />
          </div>
        </section>

        {/* Enseignes commerciales */}
        {props.enseignes && props.enseignes.length > 0 && (
          <>
            <Divider />
            <section>
              <SectionTitle icon={Award}>Enseignes commerciales</SectionTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {props.enseignes.map((e) => (
                  <Badge key={e} variant="secondary" className="text-xs">
                    {e}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Labels officiels */}
        {(labels.length > 0 || props.idccs.length > 0) && (
          <>
            <Divider />
            <section>
              <SectionTitle icon={Award}>Certifications & conventions</SectionTitle>
              {labels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
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
              {props.idccs.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Convention(s) collective(s) IDCC :{" "}
                  {props.idccs.map((i) => (
                    <span key={i} className="font-mono">
                      {i}{" "}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3 w-3" />
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-border/40" />;
}

function InfoPair({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
