import { Badge } from "@/components/ui/badge";
import {
  formatCompactEuro,
  trancheEffectifLabel,
  CATEGORIE_ENTREPRISE_LABELS,
} from "@/lib/insee-labels";
import { evaluateIcp, VERDICT_META } from "@/lib/icp-opale";
import { differenceInYears } from "date-fns";
import {
  TrendingUp,
  Users,
  Calendar,
  Building2,
  Target,
  Check,
  X,
  Phone,
  UserCheck,
} from "lucide-react";

interface HeroProps {
  denomination: string;
  siren: string;
  siret?: string | null;
  nomCommercial?: string | null;
  sigle?: string | null;
  categorie?: string | null;
  etat: "A" | "C" | "F" | string | null;
  // KPIs
  ca?: number | null;
  caYear?: string | null;
  resultatNet?: number | null;
  dateCreation?: Date | string | null;
  trancheEffectif?: string | null;
  anneeEffectif?: string | null;
  nombreEtablissements?: number | null;
  nombreEtablissementsOuverts?: number | null;
  // ICP match Opale
  sectionNaf?: string | null;
  codeNaf?: string | null;
  codePostal?: string | null;
  siteWeb?: string | null;
}

function ageEntreprise(dateCreation: Date | string | null | undefined): {
  years: number;
  label: string;
} | null {
  if (!dateCreation) return null;
  const d =
    typeof dateCreation === "string" ? new Date(dateCreation) : dateCreation;
  if (Number.isNaN(d.getTime())) return null;
  const years = differenceInYears(new Date(), d);
  return {
    years,
    label: years <= 0 ? "< 1 an" : years === 1 ? "1 an" : `${years} ans`,
  };
}

export function ProspectHero(props: HeroProps) {
  const age = ageEntreprise(props.dateCreation);
  const icp = evaluateIcp({
    ca: props.ca,
    trancheEffectif: props.trancheEffectif,
    sectionNaf: props.sectionNaf,
    codeNaf: props.codeNaf,
    codePostal: props.codePostal,
    siteWeb: props.siteWeb,
    etatAdministratif: props.etat,
  });
  const verdictMeta = VERDICT_META[icp.verdict];

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/30 p-5">
      {/* Titre + badges */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.denomination}
          </h1>
          {props.sigle && (
            <span className="text-sm text-muted-foreground">
              ({props.sigle})
            </span>
          )}
          {props.categorie &&
            CATEGORIE_ENTREPRISE_LABELS[props.categorie] && (
              <Badge variant="outline">
                {CATEGORIE_ENTREPRISE_LABELS[props.categorie]}
              </Badge>
            )}
          {props.etat === "A" ? (
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-400"
            >
              Active
            </Badge>
          ) : props.etat ? (
            <Badge variant="secondary">Cessée</Badge>
          ) : null}
          <Badge variant="outline" className={verdictMeta.badgeClass}>
            <Target className="mr-1 h-3 w-3" />
            {verdictMeta.label} · {icp.score}/100
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">SIREN {props.siren}</span>
          {props.siret && <span className="font-mono">SIRET {props.siret}</span>}
          {props.nomCommercial &&
            props.nomCommercial !== props.denomination && (
              <span>« {props.nomCommercial} »</span>
            )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi
          icon={TrendingUp}
          label={props.caYear ? `CA ${props.caYear}` : "CA"}
          value={props.ca != null ? formatCompactEuro(props.ca) : "N/C"}
          subtitle={
            props.resultatNet != null
              ? `RN ${formatCompactEuro(props.resultatNet)}`
              : undefined
          }
          dim={props.ca == null}
        />
        <Kpi
          icon={Users}
          label="Employés"
          value={trancheEffectifLabel(props.trancheEffectif)}
          subtitle={props.anneeEffectif ? `Donnée ${props.anneeEffectif}` : undefined}
          dim={
            !props.trancheEffectif ||
            ["NN", "00"].includes(props.trancheEffectif)
          }
        />
        <Kpi
          icon={Calendar}
          label="Âge"
          value={age?.label ?? "—"}
          subtitle={
            props.dateCreation
              ? `Créée ${
                  typeof props.dateCreation === "string"
                    ? props.dateCreation.slice(0, 4)
                    : props.dateCreation.getFullYear()
                }`
              : undefined
          }
          dim={!age}
        />
        <Kpi
          icon={Building2}
          label="Établissements"
          value={
            props.nombreEtablissements != null
              ? String(props.nombreEtablissements)
              : "—"
          }
          subtitle={
            props.nombreEtablissementsOuverts != null
              ? `${props.nombreEtablissementsOuverts} ouvert${
                  props.nombreEtablissementsOuverts > 1 ? "s" : ""
                }`
              : undefined
          }
          dim={!props.nombreEtablissements}
        />
        <Kpi
          icon={icp.details.dirigeant === "direct" ? UserCheck : Phone}
          label="Dirigeant"
          value={
            icp.details.dirigeant === "direct"
              ? "Accessible"
              : icp.details.dirigeant === "filtre"
                ? "Filtré"
                : "À tester"
          }
          subtitle={
            icp.details.dirigeant === "direct"
              ? "Contact direct typique"
              : icp.details.dirigeant === "filtre"
                ? "Secrétaire en front"
                : "Dépend du contact"
          }
          tone={
            icp.details.dirigeant === "direct"
              ? "ok"
              : icp.details.dirigeant === "filtre"
                ? "warn"
                : "default"
          }
        />
      </div>

      {/* Diagnostic ICP détaillé */}
      <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        {icp.positives.length > 0 && (
          <div className="space-y-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <div className="font-medium text-emerald-300">Points forts</div>
            <ul className="space-y-0.5">
              {icp.positives.map((p) => (
                <li key={p} className="flex items-start gap-1.5 text-emerald-200/80">
                  <Check className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {icp.negatives.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
            <div className="font-medium text-amber-300">Points faibles</div>
            <ul className="space-y-0.5">
              {icp.negatives.map((n) => (
                <li key={n} className="flex items-start gap-1.5 text-amber-200/80">
                  <X className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  subtitle,
  dim,
  tone = "default",
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtitle?: string;
  dim?: boolean;
  tone?: "default" | "ok" | "muted" | "warn";
}) {
  const valueColor =
    tone === "ok"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div
      className={`rounded-lg border border-border/60 bg-card/40 p-3 ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {subtitle}
        </div>
      )}
    </div>
  );
}
