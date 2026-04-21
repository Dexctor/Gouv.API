import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getCompanyBySiren,
  getLastCA,
} from "@/lib/api/recherche-entreprises";
import { getBilansBySiren } from "@/lib/api/ratios-bce";
import { evaluateIcp, caSeuilFor } from "@/lib/icp-opale";

// Composants nouveau layout
import { ProspectTitle } from "@/components/prospects/prospect-title";
import { DecisionBanner } from "@/components/prospects/decision-banner";
import { QuickStats } from "@/components/prospects/quick-stats";
import { ActionSidebar } from "@/components/prospects/action-sidebar";
import {
  DetailTabs,
  type DetailTab,
} from "@/components/prospects/detail-tabs";
import { EntrepriseTab } from "@/components/prospects/entreprise-tab";

// Composants existants
import { FinancialSummary } from "@/components/prospects/financial-summary";
import { ActivityTimeline } from "@/components/prospects/activity-timeline";
import { DirigeantsCard } from "@/components/prospects/dirigeants-card";
import { BodaccCard } from "@/components/prospects/bodacc-card";
import { SitoscopeCard } from "@/components/prospects/sitoscope-card";
import { SeoAuditCard } from "@/components/prospects/seo-audit-card";
import { WebsiteEditor, NotesEditor } from "@/components/prospects/prospect-card";
import { MapMini } from "@/components/map/map-mini";
import { AddToPipelineButton } from "@/components/prospects/add-to-pipeline-button";
import { isSitoscopeConfigured } from "@/lib/api/sitoscope";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

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

  const [prospect, apiCompany, bodaccEvents] = await Promise.all([
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
    prisma.bodaccEvent.findMany({
      where: { siren },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  let extraBilans: Awaited<ReturnType<typeof getBilansBySiren>> = [];
  const hasFinances =
    (prospect?.financials.length ?? 0) > 0 || apiCompany?.finances !== null;
  if (!hasFinances) extraBilans = await getBilansBySiren(siren, 5);

  // ================================================================
  // PROSPECT NON EN PIPELINE — preview avant ajout
  // ================================================================
  if (!prospect) {
    if (!apiCompany) notFound();
    const c = apiCompany;
    const lastCA = getLastCA(c);
    const icp = evaluateIcp({
      ca: lastCA?.ca ?? null,
      trancheEffectif: c.tranche_effectif_salarie,
      sectionNaf: c.section_activite_principale,
      codeNaf: c.activite_principale,
      codePostal: c.siege?.code_postal,
      siteWeb: null,
      etatAdministratif: c.etat_administratif,
    });

    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <ProspectTitle
          denomination={c.nom_complet}
          sigle={c.sigle}
          nomCommercial={c.siege?.nom_commercial ?? c.nom_raison_sociale}
          siren={c.siren}
          categorie={c.categorie_entreprise}
          etat={c.etat_administratif}
        />

        <DecisionBanner icp={icp} />

        <QuickStats
          ca={lastCA?.ca ?? null}
          caYear={lastCA?.year ?? null}
          caSeuil={caSeuilFor(c.section_activite_principale)}
          resultatNet={lastCA?.resultat_net ?? null}
          trancheEffectif={c.tranche_effectif_salarie ?? null}
          anneeEffectif={c.annee_tranche_effectif_salarie}
          dateCreation={c.date_creation}
          nombreEtablissements={c.nombre_etablissements}
          nombreEtablissementsOuverts={c.nombre_etablissements_ouverts}
          icp={icp}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <span className="text-sm">
            Ce prospect n&apos;est pas encore dans votre pipeline.
          </span>
          <AddToPipelineButton siren={c.siren} />
        </div>

        <EntrepriseTab
          siren={c.siren}
          siret={c.siege?.siret ?? null}
          codeNaf={c.activite_principale}
          codeNaf25={c.activite_principale_naf25}
          formeJuridique={c.nature_juridique}
          dateCreation={c.date_creation}
          enseignes={c.siege?.liste_enseignes}
          complements={c.complements}
          idccs={
            c.complements?.liste_idcc ?? c.siege?.liste_idcc ?? []
          }
          nombreEtablissements={c.nombre_etablissements}
          nombreEtablissementsOuverts={c.nombre_etablissements_ouverts}
        />

        {c.dirigeants && c.dirigeants.length > 0 && (
          <DirigeantsCard dirigeants={c.dirigeants} />
        )}

        <Link
          href="/search"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à la recherche
        </Link>
      </div>
    );
  }

  // ================================================================
  // PROSPECT EN PIPELINE — fiche complète
  // ================================================================
  const lastCA = apiCompany ? getLastCA(apiCompany) : null;
  const caForStats =
    lastCA?.ca ?? prospect.financials[0]?.chiffreAffaires ?? null;
  const caYear =
    lastCA?.year ??
    (prospect.financials[0]?.dateCloture
      ? new Date(prospect.financials[0].dateCloture).getFullYear().toString()
      : null);
  const rnForStats =
    lastCA?.resultat_net ?? prospect.financials[0]?.resultatNet ?? null;

  const icp = evaluateIcp({
    ca: caForStats,
    trancheEffectif: prospect.trancheEffectif,
    sectionNaf: apiCompany?.section_activite_principale,
    codeNaf: prospect.codeNaf,
    codePostal: prospect.codePostal,
    siteWeb: prospect.siteWeb,
    etatAdministratif: prospect.etatAdministratif,
  });

  // Tabs de détail : 1 seule zone active à la fois → l'UI respire
  const tabs: DetailTab[] = [
    {
      key: "entreprise",
      label: "Entreprise",
      icon: "building",
      content: (
        <EntrepriseTab
          siren={prospect.siren}
          siret={prospect.siret}
          codeNaf={prospect.codeNaf}
          codeNaf25={apiCompany?.activite_principale_naf25}
          formeJuridique={prospect.formeJuridique}
          dateCreation={prospect.dateCreation}
          enseignes={apiCompany?.siege?.liste_enseignes}
          complements={apiCompany?.complements}
          idccs={
            apiCompany?.complements?.liste_idcc ??
            apiCompany?.siege?.liste_idcc ??
            prospect.idccs
          }
          nombreEtablissements={apiCompany?.nombre_etablissements}
          nombreEtablissementsOuverts={apiCompany?.nombre_etablissements_ouverts}
        />
      ),
    },
    {
      key: "finances",
      label: "Finances",
      icon: "trend",
      content: (
        <>
          <FinancialSummary data={prospect.financials} />
          {extraBilans.length > 0 && prospect.financials.length === 0 && (
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Bilans disponibles via INPI/BCE (à importer)
                </div>
                <div className="space-y-1 text-sm">
                  {extraBilans.map((b) => (
                    <div
                      key={b.date_cloture_exercice}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5"
                    >
                      <span className="font-mono text-xs">
                        {b.date_cloture_exercice.slice(0, 4)}
                      </span>
                      <span className="tabular-nums">
                        {b.chiffre_d_affaires
                          ? b.chiffre_d_affaires.toLocaleString("fr-FR") + " €"
                          : "N/C"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ),
    },
    {
      key: "web",
      label: "Web",
      icon: "web",
      content: (
        <>
          <WebsiteEditor
            prospectId={prospect.id}
            initial={prospect.siteWeb}
          />
          <SeoAuditCard
            prospectId={prospect.id}
            siteWeb={prospect.siteWeb}
            denomination={prospect.denomination}
          />
          {isSitoscopeConfigured() && (
            <SitoscopeCard
              prospectId={prospect.id}
              siteWeb={prospect.siteWeb}
              configured={true}
            />
          )}
        </>
      ),
    },
    {
      key: "dirigeants",
      label: "Dirigeants",
      icon: "users",
      count: apiCompany?.dirigeants?.length ?? 0,
      content:
        apiCompany?.dirigeants && apiCompany.dirigeants.length > 0 ? (
          <DirigeantsCard dirigeants={apiCompany.dirigeants} />
        ) : (
          <EmptyTab
            title="Aucun dirigeant identifié"
            subtitle="L'API gouv n'a pas retourné de dirigeant pour cette entreprise."
          />
        ),
    },
    {
      key: "bodacc",
      label: "BODACC",
      icon: "bodacc",
      count: bodaccEvents.length,
      content:
        bodaccEvents.length > 0 ? (
          <BodaccCard events={bodaccEvents} />
        ) : (
          <EmptyTab
            title="Aucune annonce BODACC"
            subtitle="Pas d'événement légal récent. Le worker quotidien surveille automatiquement."
          />
        ),
    },
    {
      key: "activity",
      label: "Historique",
      icon: "activity",
      count: prospect.activities.length,
      content: (
        <>
          <ActivityTimeline
            prospectId={prospect.id}
            activities={prospect.activities}
          />
          <NotesEditor prospectId={prospect.id} initial={prospect.notes} />
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Colonne principale */}
        <div className="space-y-5 min-w-0">
          <ProspectTitle
            denomination={prospect.denomination}
            sigle={apiCompany?.sigle}
            nomCommercial={prospect.nomCommercial}
            siren={prospect.siren}
            categorie={
              prospect.categorie ?? apiCompany?.categorie_entreprise ?? null
            }
            etat={prospect.etatAdministratif}
          />

          {/* 1. DÉCISION — la question principale en 1 regard */}
          <DecisionBanner icp={icp} />

          {/* 2. KPIs — 5 chiffres essentiels, stripes colorées de match */}
          <QuickStats
            ca={caForStats}
            caYear={caYear}
            caSeuil={caSeuilFor(apiCompany?.section_activite_principale)}
            resultatNet={rnForStats}
            trancheEffectif={prospect.trancheEffectif}
            anneeEffectif={apiCompany?.annee_tranche_effectif_salarie}
            dateCreation={prospect.dateCreation}
            nombreEtablissements={apiCompany?.nombre_etablissements}
            nombreEtablissementsOuverts={apiCompany?.nombre_etablissements_ouverts}
            icp={icp}
          />

          {/* 3. Mini-carte — context géo léger */}
          {prospect.latitude != null && prospect.longitude != null && (
            <MapMini
              latitude={prospect.latitude}
              longitude={prospect.longitude}
              label={prospect.denomination}
              height={200}
            />
          )}

          {/* 4. DÉTAILS — progressive disclosure via tabs */}
          <DetailTabs tabs={tabs} defaultTab="entreprise" />
        </div>

        {/* Sidebar droite sticky */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <ActionSidebar
            prospect={{
              id: prospect.id,
              siren: prospect.siren,
              stage: prospect.stage,
              priority: prospect.priority,
              telephone: prospect.telephone,
              email: prospect.email,
              siteWeb: prospect.siteWeb,
              adresse: prospect.adresse,
              codePostal: prospect.codePostal,
              ville: prospect.ville,
              latitude: prospect.latitude,
              longitude: prospect.longitude,
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function EmptyTab({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="border-border/60 border-dashed">
      <CardContent className="py-10 text-center">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}
