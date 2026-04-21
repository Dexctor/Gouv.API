// Client pour le dataset "Ratios INPI/BCE" exposé en API OpenDataSoft
// URL   : https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/
// Auth  : aucune
// Usage : récupérer les finances d'un SIREN précis quand l'API gouv renvoie null
// Volume total : ~6,5M bilans publiés entre 2012 et aujourd'hui

const API_URL =
  process.env.RATIOS_BCE_API_URL ??
  "https://data.economie.gouv.fr/api/explore/v2.1";

export interface RatioBceRecord {
  siren: string;
  date_cloture_exercice: string; // "2023-12-31"
  chiffre_d_affaires: number | null;
  marge_brute: number | null;
  ebe: number | null;
  ebit: number | null;
  resultat_net: number | null;
  taux_d_endettement: number | null;
  ratio_de_liquidite: number | null;
  autonomie_financiere: number | null;
  caf_sur_ca: number | null;
  marge_ebe: number | null;
  type_bilan: "C" | "K" | "S" | null; // Complet / Consolidé / Simplifié
  confidentiality: "Public" | "Private" | null;
}

interface RatiosResponse {
  total_count: number;
  results: RatioBceRecord[];
}

// Récupère tous les bilans historiques d'un SIREN (tri desc par date)
export async function getBilansBySiren(
  siren: string,
  limit = 10
): Promise<RatioBceRecord[]> {
  const clean = siren.replace(/\s/g, "");
  if (!/^\d{9}$/.test(clean)) return [];
  const url =
    `${API_URL}/catalog/datasets/ratios_inpi_bce/records` +
    `?where=siren%3D%22${clean}%22` +
    `&order_by=date_cloture_exercice%20desc` +
    `&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Cache 24h côté Next : les bilans ne changent jamais rétroactivement
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RatiosResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}

// Calcule la médiane d'un CA pour un secteur + tranche effectif donné.
// Utilisé pour ESTIMER le CA des PME non publiantes.
// Note : cette requête agrège 6,5M lignes, à appeler peu souvent et mettre en cache.
export async function getMedianCABySector(params: {
  section?: string; // section NAF (A-U) — l'API n'a pas ce champ, on filtre côté SIREN
  departement?: string;
  trancheEffectif?: string;
  activitePrincipale?: string;
}): Promise<{
  median_ca: number | null;
  median_ebe: number | null;
  median_resultat_net: number | null;
  count: number;
}> {
  // L'API Ratios BCE ne contient que siren+finances, pas le NAF ni l'effectif.
  // Pour une médiane réaliste il faudrait joindre avec recherche-entreprises.
  // Implémentation simplifiée : on prend la médiane nationale par année récente.
  // (une vraie médiane sectorielle sera calculée par le worker d'ingestion full dump).
  const url =
    `${API_URL}/catalog/datasets/ratios_inpi_bce/records` +
    `?select=median(chiffre_d_affaires) as median_ca,` +
    `median(ebe) as median_ebe,` +
    `median(resultat_net) as median_resultat_net,` +
    `count(*) as count` +
    `&where=date_cloture_exercice%20%3E%3D%20%222022-01-01%22` +
    `&limit=1`;

  void params; // signature préservée pour usage futur (médianes sectorielles)

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 604800 }, // 7 jours
    });
    if (!res.ok) {
      return { median_ca: null, median_ebe: null, median_resultat_net: null, count: 0 };
    }
    const data = await res.json();
    const row = data.results?.[0] ?? {};
    return {
      median_ca: row.median_ca ?? null,
      median_ebe: row.median_ebe ?? null,
      median_resultat_net: row.median_resultat_net ?? null,
      count: row.count ?? 0,
    };
  } catch {
    return { median_ca: null, median_ebe: null, median_resultat_net: null, count: 0 };
  }
}
