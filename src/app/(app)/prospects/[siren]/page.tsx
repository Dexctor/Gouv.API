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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AddToPipelineButton } from "@/components/prospects/add-to-pipeline-button";

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

  const prospect = await prisma.prospect.findUnique({
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
  });

  // Prospect non encore dans le pipeline : on affiche les infos API + CTA
  if (!prospect) {
    const company = await getCompanyBySiren(siren);
    if (!company) notFound();

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.nom_complet}
            </h1>
            <div className="text-sm text-muted-foreground">
              <span className="font-mono">{company.siren}</span> — Non encore
              dans votre pipeline.
            </div>
          </div>
          <AddToPipelineButton siren={company.siren} />
        </div>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Informations publiques
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <InfoRow label="Adresse">
              {company.siege.adresse} — {company.siege.code_postal}{" "}
              {company.siege.commune}
            </InfoRow>
            <InfoRow label="NAF">{company.activite_principale}</InfoRow>
            <InfoRow label="Effectif">
              {company.tranche_effectif_salarie ?? "—"}
            </InfoRow>
            <InfoRow label="Créée le">{company.date_creation}</InfoRow>
            <InfoRow label="Forme juridique">
              {company.nature_juridique}
            </InfoRow>
            <InfoRow label="État">
              {company.etat_administratif === "A" ? "Actif" : "Fermé"}
            </InfoRow>
          </CardContent>
        </Card>
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
          <WebsiteEditor prospectId={prospect.id} initial={prospect.siteWeb} />
          <NotesEditor prospectId={prospect.id} initial={prospect.notes} />
        </div>
        <div className="space-y-4">
          <FinancialSummary data={prospect.financials} />
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
