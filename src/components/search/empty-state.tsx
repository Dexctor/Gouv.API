import { Button } from "@/components/ui/button";
import { buildPappersUrl, buildAnnuaireUrl } from "@/lib/api/pappers-url";
import { ExternalLink, SearchX } from "lucide-react";

interface Props {
  query: string;
}

export function EmptySearchState({ query }: Props) {
  const pappersUrl = buildPappersUrl(query || " ");
  const annuaireUrl = buildAnnuaireUrl(query || " ");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/60 bg-card/20 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Aucune entreprise trouvée</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {query ? (
            <>
              La recherche pour <span className="font-medium">{query}</span>{" "}
              n&apos;a donné aucun résultat dans l&apos;API gouvernementale.
              Essayez via nos sources alternatives :
            </>
          ) : (
            "Lancez une recherche ou consultez des sources alternatives."
          )}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={pappersUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Voir sur Pappers
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={annuaireUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Annuaire Entreprises
          </a>
        </Button>
      </div>
    </div>
  );
}
