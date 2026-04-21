"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  searchCompanies,
  type SearchFilters,
  type CompanyResult,
  getLastCA,
} from "@/lib/api/recherche-entreprises";

export interface EnrichedCompany extends CompanyResult {
  cache?: {
    dernierCA: number | null;
    derniereMarge: number | null;
    dernierEBE: number | null;
    dernierResultat: number | null;
    dateDernierBilan: Date | null;
  } | null;
  alreadyInPipeline?: boolean;
  lastCA?: { year: string; ca: number | null; resultat_net: number | null } | null;
}

export interface SearchActionResult {
  success: boolean;
  error?: string;
  data?: {
    results: EnrichedCompany[];
    total_results: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export async function searchAction(
  filters: SearchFilters
): Promise<SearchActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  try {
    const raw = await searchCompanies(filters);
    const sirens = raw.results.map((r) => r.siren);

    const [cached, existingProspects] = await Promise.all([
      sirens.length
        ? prisma.financialCache.findMany({ where: { siren: { in: sirens } } })
        : Promise.resolve([]),
      sirens.length
        ? prisma.prospect.findMany({
            where: { siren: { in: sirens } },
            select: { siren: true },
          })
        : Promise.resolve([]),
    ]);

    const cacheBySiren = new Map(cached.map((c) => [c.siren, c]));
    const pipelineSet = new Set(existingProspects.map((p) => p.siren));

    const enriched: EnrichedCompany[] = raw.results.map((r) => ({
      ...r,
      cache: cacheBySiren.get(r.siren) ?? null,
      alreadyInPipeline: pipelineSet.has(r.siren),
      lastCA: getLastCA(r),
    }));

    return {
      success: true,
      data: {
        results: enriched,
        total_results: raw.total_results,
        page: raw.page,
        per_page: raw.per_page,
        total_pages: raw.total_pages,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur API";
    return { success: false, error: msg };
  }
}
