import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getCompanyBySiren,
  getLastCA,
} from "@/lib/api/recherche-entreprises";
import { getBilansBySiren } from "@/lib/api/ratios-bce";
import { ProspectHero } from "@/components/prospects/prospect-hero";
import { IdentityCard } from "@/components/prospects/identity-card";
import { ProspectActionsBar } from "@/components/prospects/prospect-actions";
import {
  WebsiteEditor,
  NotesEditor,
} from "@/components/prospects/prospect-card";
import { FinancialSummary } from "@/components/prospects/financial-summary";
import { ActivityTimeline } from "@/components/prospects/activity-timeline";
import { DirigeantsCard } from "@/components/prospects/dirigeants-card";
import { LabelsCard } from "@/components/prospects/labels-card";
import { BodaccCard } from "@/components/prospects/bodacc-card";
import { SitoscopeCard } from "@/components/prospects/sitoscope-card";
import { SeoAuditCard } from "@/components/prospects/seo-audit-card";
import { ExternalLinksCard } from "@/components/prospects/external-links-card";
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

  // Si aucun bilan en BDD, on tente Ratios BCE en fallback
  let extraBilans: Awaited<ReturnType<typeof getBilansBySiren>> = [];
  const hasFinances =
    (prospect?.financials.length ?? 0) > 0 ||
    apiCompany?.finances !== null;
  if (!hasFinances) {
    extraBilans = await getBilansBySiren(siren, 5);
  }

  // === PAGE PROSPECT NON ENCORE EN PIPELINE ===
  if (!prospect) {
    if (!apiCompany) notFound();
    const c = apiCompany;
    const lastCA = getLastCA(c);

    return (
      <div className="space-y-5">
        <ProspectHero
          denomination={c.nom_complet}
          siren={c.siren}
          siret={c.siege?.siret}
          nomCommercial={c.siege?.nom_commercial ?? c.nom_raison_sociale}
          sigle={c.sigle}
          categorie={c.categorie_entreprise}
          etat={c.etat_administratif}
          ca={lastCA?.ca ?? null}
          caYear={lastCA?.year ?? null}
          resultatNet={lastCA?.resultat_net ?? null}
          dateCreation={c.date_creation}
          trancheEffectif={c.tranche_effectif_salarie}
          anneeEffectif={c.annee_tranche_effectif_salarie}
          nombreEtablissements={c.nombre_etablissements}
          nombreEtablissementsOuverts={c.nombre_etablissements_ouverts}
          sectionNaf={c.section_activite_principale}
          codeNaf={c.activite_principale}
          codePostal={c.siege?.code_postal}
          siteWeb={null}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <span className="text-sm">
            Ce prospect n&apos;est pas encore dans votre pipeline.
          </span>
          <AddToPipelineButton siren={c.siren} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <IdentityCard
              adresse={c.siege?.adresse ?? null}
              codePostal={c.siege?.code_postal ?? null}
              ville={c.siege?.libelle_commune ?? c.siege?.commune ?? null}
              latitude={c.siege?.latitude ? Number(c.siege.latitude) : null}
              longitude={c.siege?.longitude ? Number(c.siege.longitude) : null}
              codeNaf={c.activite_principale}
              codeNaf25={c.activite_principale_naf25}
              formeJuridique={c.nature_juridique}
              dateCreation={c.date_creation}
              siret={c.siege?.siret ?? null}
              email={null}
              telephone={null}
              siteWeb={null}
              enseignes={c.siege?.liste_enseignes ?? null}
              nombreEtablissements={c.nombre_etablissements}
              nombreEtablissementsOuverts={c.nombre_etablissements_ouverts}
              siren={c.siren}
            />
            {c.siege?.latitude && c.siege?.longitude && (
              <MapMini
                latitude={Number(c.siege.latitude)}
                longitude={Number(c.siege.longitude)}
                label={c.nom_complet}
                height={220}
              />
            )}
          </div>

          <div className="space-y-4">
            <LabelsCard
              complements={c.complements}
              idccs={c.complements?.liste_idcc ?? c.siege?.liste_idcc}
            />
            {c.dirigeants && c.dirigeants.length > 0 && (
              <DirigeantsCard dirigeants={c.dirigeants} />
            )}
            <ExternalLinksCard siren={c.siren} />
          </div>
        </div>

        <Link
          href="/search"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à la recherche
        </Link>
      </div>
    );
  }

  // === PAGE PROSPECT EN PIPELINE ===
  const lastCA = apiCompany ? getLastCA(apiCompany) : null;
  const caForHero =
    lastCA?.ca ?? prospect.financials[0]?.chiffreAffaires ?? null;
  const caYear =
    lastCA?.year ??
    (prospect.financials[0]?.dateCloture
      ? new Date(prospect.financials[0].dateCloture)
          .getFullYear()
          .toString()
      : null);
  const rnForHero =
    lastCA?.resultat_net ?? prospect.financials[0]?.resultatNet ?? null;

  return (
    <div className="space-y-5">
      <ProspectHero
        denomination={prospect.denomination}
        siren={prospect.siren}
        siret={prospect.siret}
        nomCommercial={prospect.nomCommercial}
        sigle={apiCompany?.sigle}
        categorie={prospect.categorie ?? apiCompany?.categorie_entreprise ?? null}
        etat={prospect.etatAdministratif}
        ca={caForHero}
        caYear={caYear}
        resultatNet={rnForHero}
        dateCreation={prospect.dateCreation}
        trancheEffectif={prospect.trancheEffectif}
        anneeEffectif={apiCompany?.annee_tranche_effectif_salarie}
        nombreEtablissements={apiCompany?.nombre_etablissements}
        nombreEtablissementsOuverts={apiCompany?.nombre_etablissements_ouverts}
        sectionNaf={apiCompany?.section_activite_principale}
        codeNaf={prospect.codeNaf}
        codePostal={prospect.codePostal}
        siteWeb={prospect.siteWeb}
      />

      <ProspectActionsBar
        id={prospect.id}
        stage={prospect.stage}
        priority={prospect.priority}
        syncedAt={prospect.syncedAt}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Colonne gauche : Identité + Labels */}
        <div className="space-y-4">
          <IdentityCard
            adresse={prospect.adresse}
            codePostal={prospect.codePostal}
            ville={prospect.ville}
            latitude={prospect.latitude}
            longitude={prospect.longitude}
            codeNaf={prospect.codeNaf}
            codeNaf25={apiCompany?.activite_principale_naf25}
            formeJuridique={prospect.formeJuridique}
            dateCreation={prospect.dateCreation}
            siret={prospect.siret}
            email={prospect.email}
            telephone={prospect.telephone}
            siteWeb={prospect.siteWeb}
            enseignes={apiCompany?.siege?.liste_enseignes}
            nombreEtablissements={apiCompany?.nombre_etablissements}
            nombreEtablissementsOuverts={apiCompany?.nombre_etablissements_ouverts}
            siren={prospect.siren}
          />
          {prospect.latitude != null && prospect.longitude != null && (
            <MapMini
              latitude={prospect.latitude}
              longitude={prospect.longitude}
              label={prospect.denomination}
              height={180}
            />
          )}
          <LabelsCard
            complements={apiCompany?.complements}
            idccs={
              apiCompany?.complements?.liste_idcc ??
              apiCompany?.siege?.liste_idcc ??
              prospect.idccs
            }
          />
          <ExternalLinksCard siren={prospect.siren} />
        </div>

        {/* Colonne centrale : Finances + Dirigeants + BODACC */}
        <div className="space-y-4">
          <FinancialSummary
            data={prospect.financials}
          />
          {extraBilans.length > 0 && prospect.financials.length === 0 && (
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <div className="mb-1 text-xs text-muted-foreground">
                  Bilans disponibles via INPI/BCE (non encore importés) :
                </div>
                <div className="space-y-1 text-xs">
                  {extraBilans.map((b) => (
                    <div key={b.date_cloture_exercice}>
                      {b.date_cloture_exercice.slice(0, 4)} — CA{" "}
                      {b.chiffre_d_affaires
                        ? b.chiffre_d_affaires.toLocaleString("fr-FR") + " €"
                        : "N/C"}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {apiCompany?.dirigeants && apiCompany.dirigeants.length > 0 && (
            <DirigeantsCard dirigeants={apiCompany.dirigeants} />
          )}
          <BodaccCard events={bodaccEvents} />
        </div>

        {/* Colonne droite : Historique + Audit + Notes */}
        <div className="space-y-4">
          <ActivityTimeline
            prospectId={prospect.id}
            activities={prospect.activities}
          />
          <WebsiteEditor
            prospectId={prospect.id}
            initial={prospect.siteWeb}
          />
          <SeoAuditCard
            prospectId={prospect.id}
            siteWeb={prospect.siteWeb}
            denomination={prospect.denomination}
          />
          <SitoscopeCard
            prospectId={prospect.id}
            siteWeb={prospect.siteWeb}
            configured={isSitoscopeConfigured()}
          />
          <NotesEditor prospectId={prospect.id} initial={prospect.notes} />
        </div>
      </div>
    </div>
  );
}
