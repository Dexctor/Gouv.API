import { Badge } from "@/components/ui/badge";
import { CATEGORIE_ENTREPRISE_LABELS } from "@/lib/insee-labels";

interface Props {
  denomination: string;
  sigle?: string | null;
  nomCommercial?: string | null;
  siren: string;
  categorie?: string | null;
  etat: string | null;
}

// Header simple et dense : juste ce qu'il faut pour identifier le prospect.
// Aucune action, aucune décision — tout est délégué à DecisionBanner et ActionSidebar.
export function ProspectTitle(props: Props) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {props.denomination}
        </h1>
        {props.sigle && (
          <span className="text-base text-muted-foreground">({props.sigle})</span>
        )}
        {props.categorie && CATEGORIE_ENTREPRISE_LABELS[props.categorie] && (
          <Badge variant="outline" className="text-[10px]">
            {CATEGORIE_ENTREPRISE_LABELS[props.categorie]}
          </Badge>
        )}
        {props.etat === "A" ? (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/5 text-emerald-400 text-[10px]"
          >
            Active
          </Badge>
        ) : props.etat ? (
          <Badge variant="secondary" className="text-[10px]">
            Cessée
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">SIREN {props.siren}</span>
        {props.nomCommercial && props.nomCommercial !== props.denomination && (
          <span>« {props.nomCommercial} »</span>
        )}
      </div>
    </div>
  );
}
