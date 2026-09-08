"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { differenceInYears } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Plus,
  Check,
  Loader2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { addToPipelineAction } from "@/actions/prospects";
import type { EnrichedCompany } from "@/actions/search";
import { trancheEffectifLabel } from "@/lib/insee-labels";
import { formatSearchEuro as formatCompactEuro } from "@/lib/search-format";
import { evaluateIcp } from "@/lib/icp-opale";
import { DecisionBadge } from "@/components/prospects/decision-banner";
import { nafLabel } from "@/lib/naf-lookup";
import { tradeForCode } from "@/lib/search-presets";
import { companyCA, sortCompanies } from "@/lib/search-ranking";
import {
  SEARCH_SORTS,
  SORT_LABELS,
  searchHref,
  type SearchState,
} from "@/lib/search-state";

const columns =
  "lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_116px]";
function age(value: string) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Ancienneté inconnue";
  const years = differenceInYears(new Date(), new Date(value));
  return years < 1 ? "Moins d’un an" : `${years} an${years > 1 ? "s" : ""}`;
}
const certificationLabels = {
  est_rge: "RGE",
  est_qualiopi: "Qualiopi",
  est_bio: "Bio",
  est_ess: "ESS",
  est_siae: "SIAE",
  est_societe_mission: "Mission",
  est_service_public: "Service public",
} as const;

export function SearchResultsTable({
  data,
  total,
  page,
  totalPages,
  state,
}: {
  data: EnrichedCompany[];
  total: number;
  page: number;
  totalPages: number;
  state: SearchState;
}) {
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SEARCH_SORTS)
      .withDefault("relevance")
      .withOptions({ shallow: true }),
  );
  const rows = useMemo(() => sortCompanies(data, sort), [data, sort]);
  const [adding, setAdding] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const add = async (siren: string) => {
    setAdding((current) => new Set(current).add(siren));
    try {
      const result = await addToPipelineAction(siren);
      if (result.success) {
        setAdded((current) => new Set(current).add(siren));
        toast.success("Entreprise ajoutée au pipeline");
      } else toast.error(result.error ?? "L’ajout a échoué");
    } catch {
      toast.error("Impossible d’ajouter l’entreprise. Réessayez.");
    } finally {
      setAdding((current) => {
        const next = new Set(current);
        next.delete(siren);
        return next;
      });
    }
  };
  return (
    <section
      aria-label="Résultats de recherche"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold tabular-nums">
            {total.toLocaleString("fr-FR")} entreprise{total > 1 ? "s" : ""}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.length} affichée{data.length > 1 ? "s" : ""} · page{" "}
            {page.toLocaleString("fr-FR")} sur{" "}
            {totalPages.toLocaleString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="result-sort"
            className="text-xs text-muted-foreground"
          >
            Tri de cette page
          </label>
          <select
            id="result-sort"
            value={sort}
            onChange={(event) =>
              void setSort(event.target.value as typeof sort)
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {SEARCH_SORTS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div role="table" aria-label="Entreprises trouvées">
        <div
          role="rowgroup"
          className="hidden border-b border-border bg-muted/25 lg:block"
        >
          <div
            role="row"
            className={`grid gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground ${columns}`}
          >
            {[
              "Entreprise",
              "Localisation",
              "Taille & finances",
              "Qualification commerciale",
              "Actions",
            ].map((label) => (
              <div key={label} role="columnheader">
                {label}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup" className="divide-y divide-border">
          {rows.map((company) => {
            const ca = companyCA(company);
            const location = company.matchedLocation ?? company.siege;
            const branch = Boolean(
              location?.siret && location.siret !== company.siege?.siret,
            );
            const trade = tradeForCode(company.activite_principale);
            const icp = evaluateIcp({
              ca,
              trancheEffectif: company.tranche_effectif_salarie,
              sectionNaf: company.section_activite_principale,
              codeNaf: company.activite_principale,
              codePostal: location?.code_postal,
              siteWeb: null,
              etatAdministratif: company.etat_administratif,
            });
            const year =
              company.lastCA?.ca != null
                ? company.lastCA.year
                : company.cache?.dateDernierBilan
                  ? new Date(company.cache.dateDernierBilan).getFullYear()
                  : null;
            const inPipeline =
              company.alreadyInPipeline || added.has(company.siren);
            const busy = adding.has(company.siren);
            return (
              <div
                key={company.siren}
                role="row"
                className={`grid grid-cols-2 items-start gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/30 focus-within:bg-muted/30 ${columns}`}
              >
                <div
                  role="cell"
                  className="col-span-2 min-w-0 space-y-1.5 lg:col-span-1"
                >
                  <Link
                    prefetch={false}
                    href={`/prospects/${company.siren}`}
                    title={company.nom_complet}
                    className="line-clamp-2 break-words text-[15px] font-semibold leading-snug hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {company.nom_complet}
                  </Link>
                  <p
                    className="line-clamp-2 text-sm leading-snug"
                    title={nafLabel(company.activite_principale)}
                  >
                    {nafLabel(company.activite_principale)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {trade && (
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                        title={trade.description}
                      >
                        {trade.id === "avocats" ? "Juridique" : trade.label}
                      </Badge>
                    )}
                    {Object.entries(certificationLabels)
                      .filter(
                        ([key]) =>
                          company.complements?.[
                            key as keyof typeof certificationLabels
                          ],
                      )
                      .map(([key, label]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {label}
                        </Badge>
                      ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span
                      className={
                        company.etat_administratif === "A"
                          ? "text-emerald-400"
                          : ""
                      }
                    >
                      {company.etat_administratif === "A"
                        ? "Active"
                        : company.etat_administratif === "C"
                          ? "Cessée"
                          : "État inconnu"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{age(company.date_creation)}</span>
                    {company.categorie_entreprise && (
                      <span>· {company.categorie_entreprise}</span>
                    )}
                  </div>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Identifiants & détails
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <SirenCopy siren={company.siren} />
                      <p>
                        NAF {company.activite_principale || "non renseigné"}
                      </p>
                      <p>
                        Création :{" "}
                        {Number.isFinite(Date.parse(company.date_creation))
                          ? new Date(company.date_creation).toLocaleDateString(
                              "fr-FR",
                            )
                          : "Non renseignée"}
                      </p>
                      <p>
                        Résultat net :{" "}
                        {(company.lastCA?.resultat_net ??
                          company.cache?.dernierResultat) != null
                          ? formatCompactEuro(
                              (company.lastCA?.resultat_net ??
                                company.cache?.dernierResultat)!,
                            )
                          : "Non renseigné"}
                      </p>
                      {branch && (
                        <p>
                          Siège :{" "}
                          {company.siege?.libelle_commune ?? "Ville inconnue"}{" "}
                          {company.siege?.code_postal}
                        </p>
                      )}
                    </div>
                  </details>
                </div>
                <div role="cell" className="min-w-0">
                  <span className="mb-1 block text-[11px] text-muted-foreground lg:hidden">
                    Localisation
                  </span>
                  <p className="break-words text-sm font-medium">
                    {location?.libelle_commune ?? "Ville non renseignée"}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {location?.code_postal || "Code postal inconnu"}
                  </p>
                  {branch && (
                    <span
                      className={`mt-1 block text-[11px] ${location?.etat_administratif === "F" ? "text-amber-400" : "text-muted-foreground"}`}
                    >
                      {location?.etat_administratif === "F"
                        ? "Ancien établissement · fermé"
                        : "Établissement local"}
                    </span>
                  )}
                </div>
                <div role="cell" className="min-w-0">
                  <span className="mb-1 block text-[11px] text-muted-foreground lg:hidden">
                    Taille & finances
                  </span>
                  <p
                    className="text-sm font-medium tabular-nums"
                    title={
                      company.annee_tranche_effectif_salarie
                        ? `Effectif INSEE ${company.annee_tranche_effectif_salarie}`
                        : undefined
                    }
                  >
                    {company.tranche_effectif_salarie
                      ? trancheEffectifLabel(company.tranche_effectif_salarie)
                      : "Effectif inconnu"}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {ca != null ? (
                      formatCompactEuro(ca)
                    ) : (
                      <span className="font-normal text-muted-foreground">
                        CA inconnu
                      </span>
                    )}
                  </p>
                  {ca != null && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      CA {year ?? "année inconnue"} ·{" "}
                      {company.caSource === "cache-bce"
                        ? "INPI/BCE"
                        : "API gouv"}
                    </p>
                  )}
                </div>
                <div role="cell" className="min-w-0">
                  <span className="mb-1 block text-[11px] text-muted-foreground lg:hidden">
                    Qualification commerciale
                  </span>
                  <DecisionBadge icp={icp} />
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Critères ICP
                    </summary>
                    <p className="mt-2">
                      Potentiel commercial, indépendant de la pertinence de
                      recherche.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {[...icp.positives, ...icp.negatives].map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </details>
                </div>
                <div role="cell" className="flex flex-col items-end gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full max-w-32"
                  >
                    <Link
                      prefetch={false}
                      href={`/prospects/${company.siren}`}
                      aria-label={`Voir ${company.nom_complet}`}
                    >
                      Voir
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {inPipeline ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Dans le pipeline
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full max-w-32"
                      disabled={busy}
                      onClick={() => void add(company.siren)}
                      aria-label={`Ajouter ${company.nom_complet} au pipeline`}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {busy ? "Ajout…" : "Ajouter"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="max-w-xl text-xs text-muted-foreground">
          Les filtres portent sur toute la recherche. Le tri organise les{" "}
          {data.length} entreprises de cette page, sans utiliser leur score
          commercial.
        </p>
        <nav
          aria-label="Pagination des résultats"
          className="flex items-center gap-2"
        >
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false} href={searchHref(state, page - 1, sort)}>
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
          )}
          <span className="text-xs tabular-nums">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false} href={searchHref(state, page + 1, sort)}>
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </nav>
      </footer>
    </section>
  );
}
function SirenCopy({ siren }: { siren: string }) {
  return (
    <button
      type="button"
      aria-label={`Copier le SIREN ${siren}`}
      className="inline-flex items-center gap-1.5 font-mono hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(siren);
          toast.success("SIREN copié");
        } catch {
          toast.error("Impossible de copier le SIREN");
        }
      }}
    >
      SIREN {siren}
      <Copy className="h-3 w-3" />
    </button>
  );
}
