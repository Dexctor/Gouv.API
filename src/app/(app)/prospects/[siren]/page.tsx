import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanyBySiren } from "@/lib/api/recherche-entreprises";
import {
  ProspectHeader,
  InfoCard,
  WebsiteEditor,
  NotesEditor,
} from "@/components/prospects/prospect-card";
import { FinancialSummary } from "@/components/prospects/financial-summary";
import { ActivityTimeline } from "@/components/prospects/activity-timeline";
import { DirigeantsCard } from "@/components/prospects/dirigeants-card";
import { LabelsCard } from "@/components/prospects/labels-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AddToPipelineButton } from "@/components/prospects/add-to-pipeline-button";
import {
  trancheEffectifLabel,
  natureJuridiqueLabel,
  CATEGORIE_ENTREPRISE_LABELS,
  formatCompactEuro,
} from "@/lib/insee-labels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siren: string }>;
}): Promise<Metadata> {
  const { siren } = await params;
  const p = await prisma.prospect.findUnique({
    where: { siren },
    select: { denomination: true },
  });
  return {
    title: `${p?.denomination ?? siren} — Gouv-API`,
  };
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ siren: string }>;
}) {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) notFound();

  // On charge le prospect BDD + l'API en parallèle pour toujours afficher
  // les données les plus fraîches (dirigeants, labels, finances).
  const [prospect, apiCompany] = await Promise.all([
    prisma.prospect.findUnique({
      where: { siren },
      include: {
        activities: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        financials: { orderBy: { dateCloture: "desc" } },
        tags: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    }),
    getCompanyBySiren(siren),
  ]);

  // Prospect non encore dans le pipeline : on affiche les infos API + CTA
  if (!prospect) {
    if (!apiCompany) notFound();
    const c = apiCompany;
    const ca = c.finances
      ? Object.entries(c.finances)
          .sort(([a], [b]) => b.localeCompare(a))
          .at(0)
      : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {c.nom_complet}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{c.siren}</span>
              {c.categorie_entreprise && (
                <Badge variant="outline">
                  {CATEGORIE_ENTREPRISE_LABELS[c.categorie_entreprise]}
                </Badge>
              )}
              {c.etat_administratif === "C" && (
                <Badge variant="secondary">Cessée</Badge>
              )}
            </div>
          </div>
          <AddToPipelineButton siren={c.siren} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border/60 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Informations publiques
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <InfoRow label="Adresse">
                {c.siege?.adresse} — {c.siege?.code_postal}{" "}
                {c.siege?.libelle_commune ?? c.siege?.commune}
              </InfoRow>
              <InfoRow label="NAF">{c.activite_principale}</InfoRow>
              <InfoRow label="Effectif">
                {trancheEffectifLabel(c.tranche_effectif_salarie)}
                {c.annee_tranche_effectif_salarie && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ({c.annee_tranche_effectif_salarie})
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Créée le">
                {c.date_creation
                  ? format(new Date(c.date_creation), "PPP", { locale: fr })
                  : "—"}
              </InfoRow>
              <InfoRow label="Forme juridique">
                {natureJuridiqueLabel(c.nature_juridique)}
              </InfoRow>
              <InfoRow label="État">
                {c.etat_administratif === "A" ? "Active" : "Cessée"}
              </InfoRow>
              {ca && (
                <InfoRow label={`CA ${ca[0]}`}>
                  {formatCompactEuro(ca[1]?.ca ?? null)}
                </InfoRow>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <LabelsCard
              complements={c.complements}
              idccs={c.complements?.liste_idcc ?? c.siege?.liste_idcc}
            />
            {c.dirigeants && c.dirigeants.length > 0 && (
              <DirigeantsCard dirigeants={c.dirigeants} />
            )}
          </div>
        </div>

        <div>
          <Link
            href="/search"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProspectHeader prospect={prospect} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <InfoCard prospect={prospect} />
          <LabelsCard
            complements={apiCompany?.complements}
            idccs={
              apiCompany?.complements?.liste_idcc ?? apiCompany?.siege?.liste_idcc
            }
          />
          <WebsiteEditor prospectId={prospect.id} initial={prospect.siteWeb} />
          <NotesEditor prospectId={prospect.id} initial={prospect.notes} />
        </div>
        <div className="space-y-4">
          <FinancialSummary data={prospect.financials} />
          {apiCompany?.dirigeants && apiCompany.dirigeants.length > 0 && (
            <DirigeantsCard dirigeants={apiCompany.dirigeants} />
          )}
        </div>
        <div>
          <ActivityTimeline
            prospectId={prospect.id}
            activities={prospect.activities}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
