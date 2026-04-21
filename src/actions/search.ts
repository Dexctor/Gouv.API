"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  searchCompanies,
  type SearchFilters,
  type CompanyResult,
  getLastCA,
} from "@/lib/api/recherche-entreprises";
import { getBilansBySiren } from "@/lib/api/ratios-bce";

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
  caSource?: "api-gouv" | "cache-bce" | null;
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

    const enriched: EnrichedCompany[] = raw.results.map((r) => {
      const apiCA = getLastCA(r);
      const dbCache = cacheBySiren.get(r.siren) ?? null;
      const caSource: EnrichedCompany["caSource"] = apiCA?.ca
        ? "api-gouv"
        : dbCache?.dernierCA
          ? "cache-bce"
          : null;
      return {
        ...r,
        cache: dbCache,
        alreadyInPipeline: pipelineSet.has(r.siren),
        lastCA: apiCA,
        caSource,
      };
    });

    // Fallback on-demand : pour les SIREN sans CA ni cache, on interroge
    // le dataset Ratios BCE en parallèle (rate-limité côté OpenDataSoft).
    // On ne le fait que pour max 10 SIREN par page pour ne pas exploser le temps.
    const missingSirens = enriched
      .filter((c) => !c.lastCA?.ca && !c.cache?.dernierCA)
      .slice(0, 10)
      .map((c) => c.siren);

    if (missingSirens.length > 0) {
      const bceResults = await Promise.all(
        missingSirens.map(async (siren) => {
          const bilans = await getBilansBySiren(siren, 1);
          return { siren, bilan: bilans[0] };
        })
      );

      // Upsert silencieux du cache BCE + injecte dans la réponse
      for (const { siren, bilan } of bceResults) {
        if (!bilan) continue;
        const dateCloture = new Date(bilan.date_cloture_exercice);
        try {
          await prisma.financialCache.upsert({
            where: { siren },
            update: {
              dernierCA: bilan.chiffre_d_affaires,
              dernierEBE: bilan.ebe,
              dernierResultat: bilan.resultat_net,
              dateDernierBilan: dateCloture,
            },
            create: {
              siren,
              dernierCA: bilan.chiffre_d_affaires,
              dernierEBE: bilan.ebe,
              dernierResultat: bilan.resultat_net,
              dateDernierBilan: dateCloture,
            },
          });
        } catch {
          // Silent : DB peut être down, on ne casse pas la recherche
        }

        const target = enriched.find((c) => c.siren === siren);
        if (target) {
          target.cache = {
            dernierCA: bilan.chiffre_d_affaires,
            dernierEBE: bilan.ebe,
            derniereMarge: bilan.marge_brute,
            dernierResultat: bilan.resultat_net,
            dateDernierBilan: dateCloture,
          };
          target.caSource = "cache-bce";
        }
      }
    }

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
