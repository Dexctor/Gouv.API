import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Dirigeant } from "@/lib/api/recherche-entreprises";
import { User, Building } from "lucide-react";

export function DirigeantsCard({ dirigeants }: { dirigeants: Dirigeant[] }) {
  if (!dirigeants || dirigeants.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Dirigeants ({dirigeants.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dirigeants.map((d, i) => {
          const isPM = d.type_dirigeant === "personne morale";
          const name = isPM
            ? d.denomination ?? "—"
            : [d.prenoms, d.nom].filter(Boolean).join(" ") || "—";
          return (
            <div
              key={`${d.siren ?? ""}-${i}`}
              className="flex items-start justify-between gap-2 rounded-md border border-border/60 bg-card/40 p-2.5 text-sm"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium">
                  {isPM ? (
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate">{name}</span>
                </div>
                {d.qualite && (
                  <p className="text-xs text-muted-foreground">{d.qualite}</p>
                )}
                {isPM && d.siren && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    SIREN {d.siren}
                  </p>
                )}
                {!isPM && d.annee_de_naissance && (
                  <p className="text-[11px] text-muted-foreground">
                    Né{d.nationalite?.toLowerCase().includes("femme") ? "e" : ""}{" "}
                    en {d.annee_de_naissance}
                  </p>
                )}
              </div>
              {d.nationalite && (
                <Badge variant="outline" className="text-[10px]">
                  {d.nationalite}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
