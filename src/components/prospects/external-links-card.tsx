import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { buildPappersUrl, buildAnnuaireUrl } from "@/lib/api/pappers-url";

interface Props {
  siren: string;
}

export function ExternalLinksCard({ siren }: Props) {
  const links = [
    { label: "Annuaire Entreprises", url: buildAnnuaireUrl(siren) },
    { label: "Pappers", url: buildPappersUrl(siren) },
    {
      label: "INPI Data",
      url: `https://data.inpi.fr/entreprises/${siren}`,
    },
    {
      label: "Societe.com",
      url: `https://www.societe.com/cgi-bin/search?champs=${siren}`,
    },
    {
      label: "Verif.com",
      url: `https://www.verif.com/societe/${siren}`,
    },
    {
      label: "BODACC",
      url: `https://www.bodacc.fr/annonce/resultats-identite-entreprise/?etablissement-numeroIdentificationUniteLegaleUniqueValue=${siren}`,
    },
  ];

  return (
    <Card className="border-border/60">
      <CardContent className="pt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Sources externes
        </div>
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <Button key={l.label} asChild size="xs" variant="outline">
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                {l.label}
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
