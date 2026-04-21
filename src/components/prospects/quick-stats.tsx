import {
  formatCompactEuro,
  trancheEffectifLabel,
} from "@/lib/insee-labels";
import { differenceInYears } from "date-fns";
import { TrendingUp, Users, UserCheck, Phone, Calendar, Building2 } from "lucide-react";
import type { IcpResult } from "@/lib/icp-opale";

interface Props {
  ca: number | null;
  caYear: string | null;
  caSeuil: number;
  resultatNet: number | null;
  trancheEffectif: string | null;
  anneeEffectif?: string | null;
  dateCreation: Date | string | null;
  nombreEtablissements?: number | null;
  nombreEtablissementsOuverts?: number | null;
  icp: IcpResult;
}

// Ligne de stats principales : 3 infos critiques + 2 secondaires.
// Design minimaliste, chaque métrique = 1 valeur claire + 1 indicateur match/no-match.
export function QuickStats(props: Props) {
  const age = ageLabel(props.dateCreation);
  const caStatus = caStatusFor(props.ca, props.caSeuil);
  const effectifStatus = effectifStatusFor(props.trancheEffectif);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <Stat
        icon={TrendingUp}
        label={props.caYear ? `CA ${props.caYear}` : "Chiffre d'affaires"}
        value={props.ca != null ? formatCompactEuro(props.ca) : "N/C"}
        match={caStatus}
        sub={
          props.ca != null
            ? `seuil ${formatCompactEuro(props.caSeuil)}`
            : `seuil ${formatCompactEuro(props.caSeuil)}`
        }
      />
      <Stat
        icon={Users}
        label="Employés"
        value={trancheEffectifLabel(props.trancheEffectif)}
        match={effectifStatus}
        sub={props.anneeEffectif ? `MAJ ${props.anneeEffectif}` : undefined}
      />
      <Stat
        icon={props.icp.details.dirigeant === "direct" ? UserCheck : Phone}
        label="Dirigeant"
        value={dirigeantLabel(props.icp.details.dirigeant)}
        match={dirigeantMatch(props.icp.details.dirigeant)}
        sub={dirigeantSub(props.icp.details.dirigeant)}
      />
      <Stat
        icon={Calendar}
        label="Âge"
        value={age.value}
        match="neutral"
        sub={age.sub}
      />
      <Stat
        icon={Building2}
        label="Établissements"
        value={
          props.nombreEtablissements != null
            ? String(props.nombreEtablissements)
            : "—"
        }
        match="neutral"
        sub={
          props.nombreEtablissementsOuverts != null
            ? `${props.nombreEtablissementsOuverts} ouvert${
                props.nombreEtablissementsOuverts > 1 ? "s" : ""
              }`
            : undefined
        }
      />
    </div>
  );
}

type Match = "ok" | "ko" | "warn" | "neutral";

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  match,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
  match: Match;
}) {
  // Stripe colorée en haut pour signaler le match
  const stripe = {
    ok: "bg-emerald-500",
    ko: "bg-red-500",
    warn: "bg-amber-500",
    neutral: "bg-border/60",
  }[match];

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card/40 p-3">
      <div className={`absolute left-0 top-0 h-0.5 w-full ${stripe}`} />
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}

function ageLabel(d: Date | string | null): { value: string; sub?: string } {
  if (!d) return { value: "—" };
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return { value: "—" };
  const y = differenceInYears(new Date(), date);
  return {
    value: y <= 0 ? "< 1 an" : y === 1 ? "1 an" : `${y} ans`,
    sub: `créée ${date.getFullYear()}`,
  };
}

function caStatusFor(ca: number | null, seuil: number): Match {
  if (ca == null) return "neutral";
  if (ca >= seuil && ca <= 10_000_000) return "ok";
  if (ca > 10_000_000) return "warn";
  return "ko";
}

function effectifStatusFor(code: string | null | undefined): Match {
  if (!code) return "neutral";
  if (["NN", "00"].includes(code)) return "ko";
  if (["01"].includes(code)) return "warn";
  if (["02", "03", "11", "12"].includes(code)) return "ok";
  return "warn";
}

function dirigeantLabel(access: "direct" | "filtre" | "inconnu"): string {
  if (access === "direct") return "Accessible";
  if (access === "filtre") return "Filtré";
  return "À tester";
}

function dirigeantMatch(access: "direct" | "filtre" | "inconnu"): Match {
  if (access === "direct") return "ok";
  if (access === "filtre") return "ko";
  return "neutral";
}

function dirigeantSub(access: "direct" | "filtre" | "inconnu"): string {
  if (access === "direct") return "contact direct";
  if (access === "filtre") return "secrétaire probable";
  return "à qualifier";
}
