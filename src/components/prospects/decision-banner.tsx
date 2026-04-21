import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { IcpResult } from "@/lib/icp-opale";

interface Props {
  icp: IcpResult;
}

// Bandeau de décision principal — la question à laquelle on répond :
// "Est-ce qu'on démarche ce prospect, oui ou non ?"
// Visible IMMÉDIATEMENT en haut, impossible à rater, réponse en 1 regard.
export function DecisionBanner({ icp }: Props) {
  const { verdict, score, positives, negatives } = icp;

  const config = {
    prioritaire: {
      icon: CheckCircle2,
      label: "Démarchez",
      subtitle: "Cible prioritaire — fort match ICP",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      dotBg: "bg-emerald-500",
    },
    cible: {
      icon: CheckCircle2,
      label: "À démarcher",
      subtitle: "Dans la cible ICP Opale",
      bg: "bg-violet-500/10",
      border: "border-violet-500/40",
      text: "text-violet-400",
      dotBg: "bg-violet-500",
    },
    "a-tenter": {
      icon: AlertCircle,
      label: "À tester",
      subtitle: "Match partiel, approche à qualifier",
      bg: "bg-amber-500/10",
      border: "border-amber-500/40",
      text: "text-amber-400",
      dotBg: "bg-amber-500",
    },
    "hors-cible": {
      icon: XCircle,
      label: "Hors cible",
      subtitle: "Non-démarchage recommandé",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/30",
      text: "text-zinc-400",
      dotBg: "bg-zinc-500",
    },
  }[verdict];

  const Icon = config.icon;
  const mainReason =
    verdict === "hors-cible" || verdict === "a-tenter"
      ? negatives[0] ?? "Critères non réunis"
      : positives[0] ?? "Profil cible";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-5`}
    >
      {/* Barre verticale à gauche pour renforcer visuellement */}
      <div className={`absolute left-0 top-0 h-full w-1 ${config.dotBg}`} />

      <div className="flex items-center gap-4 pl-2">
        <Icon className={`h-10 w-10 shrink-0 ${config.text}`} strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2 className={`text-2xl font-bold ${config.text}`}>
              {config.label}
            </h2>
            <span className="text-sm text-muted-foreground">
              {config.subtitle}
            </span>
          </div>
          <p className="mt-0.5 text-sm">
            <span className="text-muted-foreground">Raison :</span>{" "}
            <span className="font-medium">{mainReason}</span>
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <div className={`text-3xl font-bold tabular-nums ${config.text}`}>
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            sur 100
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini-variante pour les listes
export function DecisionBadge({ icp }: { icp: IcpResult }) {
  const { verdict, score } = icp;
  const config = {
    prioritaire: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    cible: "border-violet-500/40 bg-violet-500/10 text-violet-400",
    "a-tenter": "border-amber-500/40 bg-amber-500/10 text-amber-400",
    "hors-cible": "border-zinc-500/30 bg-zinc-500/5 text-zinc-500",
  }[verdict];

  const labels = {
    prioritaire: "DÉMARCHEZ",
    cible: "CIBLE",
    "a-tenter": "À TESTER",
    "hors-cible": "SKIP",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide ${config}`}
    >
      <TrendingUp className="h-2.5 w-2.5" />
      {labels[verdict]} · {score}
    </span>
  );
}
