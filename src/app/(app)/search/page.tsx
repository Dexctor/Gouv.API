import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchForm } from "@/components/search/search-form";
import { SearchWorkspace } from "@/components/search/search-workspace";
import { EmptySearchState } from "@/components/search/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { searchAction } from "@/actions/search";
import { buildPappersUrl } from "@/lib/api/pappers-url";
import { ExternalLink, X, Search, ArrowLeft } from "lucide-react";
import {
  EMPTY_SEARCH,
  readSearchState,
  searchHref,
  buildSearchFilters,
  activeSearchChips,
  type SearchState,
} from "@/lib/search-state";

export const metadata: Metadata = { title: "Rechercher — Gouv-API" };

async function Results({ state, page }: { state: SearchState; page: number }) {
  let filters;
  try {
    filters = buildSearchFilters(state, page);
  } catch (error) {
    return (
      <SearchError
        message={
          error instanceof Error ? error.message : "Vérifiez vos critères."
        }
      />
    );
  }
  const result = await searchAction(filters, {
    location: state.cp,
    enrich: state.enrich,
  });
  if (!result.success || !result.data)
    return (
      <SearchError
        message={result.error ?? "La recherche est momentanément indisponible."}
      />
    );
  if (result.data.results.length === 0)
    return (
      <div className="space-y-3">
        <EmptySearchState query={state.q || state.cp} />
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={searchHref(state)}>
              <ArrowLeft className="h-4 w-4" />
              Revenir à la première page
            </Link>
          </Button>
        )}
      </div>
    );
  return (
      <SearchWorkspace
      key={JSON.stringify([state, page])}
      data={result.data.results}
      total={result.data.total_results}
      page={result.data.page}
      totalPages={Math.max(1, result.data.total_pages)}
      state={state}
    />
  );
}
function SearchError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
    >
      <h2 className="text-sm font-semibold">La recherche n’a pas pu aboutir</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Ajustez les critères ou relancez la recherche avec le bouton Rechercher.
      </p>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = readSearchState(params);
  const rawPage = Number(params.page);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const started =
    params.run === "1" ||
    Object.keys(EMPTY_SEARCH).some((key) => params[key] !== undefined);
  const chips = activeSearchChips(state);
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Prospection Opale
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Trouver vos prochains prospects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Une entreprise, un métier, une zone. Affinez votre cible et passez à
            l’action.
          </p>
        </div>
        <Link
          href="/pipeline"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Voir le pipeline →
        </Link>
      </header>
      <SearchForm key={JSON.stringify(state)} initial={state} />
      {started ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex min-w-0 flex-wrap items-center gap-1.5"
              aria-label="Filtres appliqués"
            >
              <span className="mr-1 text-xs text-muted-foreground">
                Filtres appliqués
              </span>
              {chips.map(({ key, label }) => (
                <Link
                  prefetch={false}
                  key={key}
                  href={searchHref({
                    ...state,
                    [key]: key === "etat" ? "all" : EMPTY_SEARCH[key],
                  })}
                  title={`Retirer ${label}`}
                  aria-label={`Retirer le filtre ${label}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="max-w-72 truncate">{label}</span>
                  <X className="h-3 w-3 shrink-0" />
                </Link>
              ))}
              <Link
                href="/search"
                className="px-2 py-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Tout effacer
              </Link>
            </div>
            <Button asChild size="sm" variant="ghost">
              <a
                href={buildPappersUrl(state.q || state.cp || " ")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Comparer sur Pappers
              </a>
            </Button>
          </div>
          <Suspense
            key={JSON.stringify([state, page])}
            fallback={
              <div role="status" aria-label="Recherche des entreprises" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <p className="px-1 text-sm text-muted-foreground">Recherche et qualification des entreprises…</p>
                  {[0, 1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-[74px] w-full motion-reduce:animate-none" />)}
                </div>
                <Skeleton className="h-[280px] w-full rounded-lg motion-reduce:animate-none" />
              </div>
            }
          >
            <Results state={state} page={page} />
          </Suspense>
        </>
      ) : (
        <section className="flex items-start gap-3 rounded-lg border border-dashed border-border p-5">
          <Search className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">
              Commencez par un métier ou une zone
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Par exemple : Couverture + Dunkerque + 3–9 salariés. Les filtres
              sont appliqués quand vous lancez la recherche.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
