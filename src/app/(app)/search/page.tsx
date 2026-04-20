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

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(",").filter(Boolean);
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
      filters.code_naf ||
      (Array.isArray(filters.tranche_effectif_salarie) &&
        filters.tranche_effectif_salarie.length) ||
      (Array.isArray(filters.nature_juridique) && filters.nature_juridique.length)
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
  const q = typeof sp.q === "string" ? sp.q : "";
  const cp = typeof sp.cp === "string" ? sp.cp : "";
  const naf = toArray(sp.naf);
  const effectif = toArray(sp.effectif);
  const forme = typeof sp.forme === "string" ? sp.forme : "";
  const etat = sp.etat === "F" ? "F" : "A";
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const filters: SearchFilters = {
    q: q || undefined,
    code_postal: cp || undefined,
    code_naf: naf.length ? naf : undefined,
    tranche_effectif_salarie: effectif.length ? effectif : undefined,
    nature_juridique: forme ? [forme] : undefined,
    etat_administratif: etat,
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
          Base INSEE / API Recherche-entreprises — enrichissement financier
          BCE/INPI.
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
