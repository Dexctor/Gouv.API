import { Badge } from "@/components/ui/badge";
import { CATEGORIE_ENTREPRISE_LABELS } from "@/lib/insee-labels";

interface Props {
  denomination: string;
  sigle?: string | null;
  nomCommercial?: string | null;
  siren: string;
  categorie?: string | null;
  etat: string | null;
  activite?: string | null;
  localisation?: string | null;
}

export function ProspectTitle(props: Props) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight">
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
      {(props.activite || props.localisation) && (
        <p className="text-sm text-muted-foreground">
          {props.activite ?? "Activité non renseignée"}
          <span className="mx-2 text-border">/</span>
          {props.localisation || "Localisation non renseignée"}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">SIREN {props.siren}</span>
        {props.nomCommercial && props.nomCommercial !== props.denomination && (
          <span>« {props.nomCommercial} »</span>
        )}
      </div>
    </div>
  );
}
