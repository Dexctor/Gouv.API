import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchForm } from "@/components/search/search-form";
import { SearchResultsTable } from "@/components/search/search-results-table";
import { EmptySearchState } from "@/components/search/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { searchAction } from "@/actions/search";
import type { SearchFilters } from "@/lib/api/recherche-entreprises";
import { buildPappersUrl } from "@/lib/api/pappers-url";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Rechercher — Gouv-API",
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toStr(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(",").filter(Boolean);
}

function toBool(v: string | string[] | undefined): boolean {
  return v === "true" || v === "1";
}

function toInt(v: string | string[] | undefined): number {
  const s = typeof v === "string" ? v : "";
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function Results({
  filters,
  query,
}: {
  filters: SearchFilters;
  query: string;
}) {
  const hasAnyFilter = Boolean(
    filters.q ||
      filters.code_postal ||
      filters.activite_principale ||
      filters.section_activite_principale ||
      (Array.isArray(filters.tranche_effectif_salarie) &&
        filters.tranche_effectif_salarie.length) ||
      (Array.isArray(filters.nature_juridique) && filters.nature_juridique.length) ||
      filters.categorie_entreprise?.length ||
      filters.ca_min ||
      filters.ca_max ||
      filters.est_rge ||
      filters.est_qualiopi ||
      filters.est_bio ||
      filters.est_ess
  );

  if (!hasAnyFilter) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/20 p-8 text-center text-sm text-muted-foreground">
        Renseignez au moins un critère pour lancer la recherche.
      </div>
    );
  }

  const res = await searchAction(filters);
  if (!res.success || !res.data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {res.error ?? "Erreur lors de la recherche"}
      </div>
    );
  }

  if (res.data.results.length === 0) {
    return <EmptySearchState query={query} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {res.data.total_results.toLocaleString("fr-FR")} résultats — page{" "}
          {res.data.page}/{res.data.total_pages}
        </span>
        <Button asChild size="sm" variant="ghost">
          <a
            href={buildPappersUrl(query || " ")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Comparer sur Pappers
          </a>
        </Button>
      </div>
      <SearchResultsTable data={res.data.results} />
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = toStr(sp.q);
  const cp = toStr(sp.cp);
  const naf = toArray(sp.naf);
  const section = toStr(sp.section);
  const effectif = toArray(sp.effectif);
  const forme = toStr(sp.forme);
  const etat = sp.etat === "C" ? "C" : "A";
  const categorie = toArray(sp.categorie).filter((c): c is "PME" | "ETI" | "GE" =>
    c === "PME" || c === "ETI" || c === "GE"
  );
  const caMin = toInt(sp.caMin);
  const caMax = toInt(sp.caMax);
  const rge = toBool(sp.rge);
  const qualiopi = toBool(sp.qualiopi);
  const bio = toBool(sp.bio);
  const ess = toBool(sp.ess);
  const page = toInt(sp.page) || 1;

  const filters: SearchFilters = {
    q: q || undefined,
    code_postal: cp || undefined,
    activite_principale: naf.length ? naf : undefined,
    section_activite_principale: section || undefined,
    tranche_effectif_salarie: effectif.length ? effectif : undefined,
    nature_juridique: forme ? [forme] : undefined,
    etat_administratif: etat as "A" | "C",
    categorie_entreprise: categorie.length ? categorie : undefined,
    ca_min: caMin || undefined,
    ca_max: caMax || undefined,
    est_rge: rge || undefined,
    est_qualiopi: qualiopi || undefined,
    est_bio: bio || undefined,
    est_ess: ess || undefined,
    page,
    per_page: 25,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Rechercher des entreprises
        </h1>
        <p className="text-sm text-muted-foreground">
          Base INSEE / API Recherche-entreprises — enrichissement financier INPI/BCE.
        </p>
      </div>
      <SearchForm />
      <Suspense
        key={JSON.stringify(filters)}
        fallback={
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <Results filters={filters} query={q || cp || naf[0] || ""} />
      </Suspense>
    </div>
  );
}
