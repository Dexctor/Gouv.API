// Client pour l'API publique Recherche d'entreprises (api.gouv.fr)
// Documentation : https://recherche-entreprises.api.gouv.fr/docs/
// OpenAPI       : https://recherche-entreprises.api.gouv.fr/openapi.json
// Rate limit    : 7 req/sec
//
// IMPORTANT : pour recevoir finances/dirigeants/complements il faut
// - soit ne rien passer (tous les champs sont renvoyés sauf score)
// - soit `minimal=true` ET `include=finances,dirigeants,complements,siege,matching_etablissements,score`
// Si on envoie `include` sans `minimal=true`, l'API renvoie une erreur.

const API_URL =
  process.env.RECHERCHE_ENTREPRISES_API_URL ??
  "https://recherche-entreprises.api.gouv.fr";

// Tous les inclusions possibles (openapi.json). "score" n'est jamais inclus par défaut.
export const ALL_INCLUDES = [
  "finances",
  "dirigeants",
  "complements",
  "siege",
  "matching_etablissements",
  "score",
] as const;
export type IncludeField = (typeof ALL_INCLUDES)[number];

// Tous les filtres disponibles (openapi v1.0.0)
export interface SearchFilters {
  // Recherche plein texte
  q?: string;
  // Localisation
  code_postal?: string;
  code_commune?: string;
  departement?: string;
  region?: string;
  epci?: string;
  // Activité
  activite_principale?: string | string[]; // code NAF/APE
  section_activite_principale?: string | string[]; // A-U
  // Taille
  tranche_effectif_salarie?: string | string[];
  categorie_entreprise?: Array<"PME" | "ETI" | "GE">;
  // Finances (euros)
  ca_min?: number;
  ca_max?: number;
  resultat_net_min?: number;
  resultat_net_max?: number;
  // Forme & état
  nature_juridique?: string | string[];
  etat_administratif?: "A" | "C"; // Attention : "C" (cessée) et non "F"
  // Labels & qualifications
  est_rge?: boolean;
  est_qualiopi?: boolean;
  est_bio?: boolean;
  est_ess?: boolean;
  est_association?: boolean;
  est_entrepreneur_individuel?: boolean;
  est_organisme_formation?: boolean;
  est_siae?: boolean;
  est_societe_mission?: boolean;
  est_service_public?: boolean;
  est_finess?: boolean;
  est_uai?: boolean;
  convention_collective_renseignee?: boolean;
  id_convention_collective?: string;
  // Dirigeant
  nom_personne?: string;
  prenoms_personne?: string;
  type_personne?: "dirigeant" | "elu";
  // Pagination
  page?: number;
  per_page?: number;
  // Options d'enrichissement
  include?: IncludeField[];
  minimal?: boolean;
  sort_by_size?: boolean;
}

// === Réponses typées ===

export interface CompanySiege {
  siret: string;
  adresse: string;
  code_postal: string;
  commune: string;
  libelle_commune?: string;
  departement: string;
  region: string;
  latitude?: string;
  longitude?: string;
  liste_enseignes?: string[] | null;
  liste_idcc?: string[] | null;
  liste_rge?: string[] | null;
  nom_commercial?: string | null;
  tranche_effectif_salarie?: string | null;
  activite_principale?: string;
  est_siege?: boolean;
  etat_administratif?: "A" | "F";
  date_creation?: string;
}

export interface Dirigeant {
  nom?: string | null;
  prenoms?: string | null;
  annee_de_naissance?: string | null;
  date_de_naissance?: string | null;
  qualite?: string | null;
  nationalite?: string | null;
  type_dirigeant?: "personne physique" | "personne morale";
  // cas personne morale
  denomination?: string | null;
  siren?: string | null;
}

export interface Complements {
  convention_collective_renseignee?: boolean;
  liste_idcc?: string[] | null;
  egapro_renseignee?: boolean;
  est_achats_responsables?: boolean;
  est_alim_confiance?: boolean;
  est_association?: boolean;
  est_bio?: boolean;
  est_entrepreneur_individuel?: boolean;
  est_entrepreneur_spectacle?: boolean;
  est_ess?: boolean;
  est_finess?: boolean;
  est_organisme_formation?: boolean;
  est_qualiopi?: boolean;
  est_rge?: boolean;
  est_service_public?: boolean;
  est_siae?: boolean;
  est_societe_mission?: boolean;
  est_uai?: boolean;
  est_patrimoine_vivant?: boolean;
  bilan_ges_renseigne?: boolean;
  identifiant_association?: string | null;
  statut_entrepreneur_spectacle?: string | null;
  type_siae?: string | null;
}

// finances peut être null si l'entreprise ne publie pas
export type FinancesMap = Record<
  string,
  { ca?: number | null; resultat_net?: number | null }
> | null;

export interface CompanyResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string | null;
  sigle?: string | null;
  nombre_etablissements: number;
  nombre_etablissements_ouverts: number;
  siege?: CompanySiege;
  activite_principale: string;
  activite_principale_naf25?: string | null;
  categorie_entreprise?: "PME" | "ETI" | "GE" | null;
  annee_categorie_entreprise?: string | null;
  tranche_effectif_salarie?: string | null;
  annee_tranche_effectif_salarie?: string | null;
  date_creation: string;
  date_fermeture?: string | null;
  date_mise_a_jour?: string | null;
  date_mise_a_jour_insee?: string | null;
  etat_administratif: "A" | "C";
  nature_juridique: string;
  section_activite_principale?: string | null;
  dirigeants?: Dirigeant[] | null;
  finances?: FinancesMap;
  complements?: Complements | null;
  matching_etablissements?: Array<
    CompanySiege & { ancien_siege?: boolean }
  > | null;
  score?: number;
}

export interface SearchResponse {
  results: CompanyResult[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// === Rate limiter (~7 req/s = 150ms minimum entre deux appels) ===

class RateLimiter {
  private queue: Array<() => void> = [];
  private lastRun = 0;
  private readonly minIntervalMs = 150;

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(() => {
        fn().then(resolve).catch(reject);
      });
      this.run();
    });
  }

  private async run() {
    if (this.queue.length === 0) return;
    const now = Date.now();
    const wait = Math.max(0, this.minIntervalMs - (now - this.lastRun));
    if (wait > 0) {
      setTimeout(() => this.run(), wait);
      return;
    }
    const task = this.queue.shift();
    if (!task) return;
    this.lastRun = Date.now();
    task();
    if (this.queue.length > 0) {
      setTimeout(() => this.run(), this.minIntervalMs);
    }
  }
}

const limiter = new RateLimiter();

// Conversion filtres → querystring
function buildQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(","));
    } else if (typeof value === "boolean") {
      params.set(key, value ? "true" : "false");
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

// Normalisation : si on veut l'enrichissement (par défaut OUI), on force minimal+include.
function withEnrichment(filters: SearchFilters): SearchFilters {
  const includeWanted = filters.include ?? [
    "finances",
    "dirigeants",
    "complements",
    "siege",
    "matching_etablissements",
  ];
  return {
    ...filters,
    minimal: true,
    include: includeWanted,
  };
}

export async function searchCompanies(
  filters: SearchFilters
): Promise<SearchResponse> {
  const perPage = Math.min(filters.per_page ?? 25, 25);
  const normalized = withEnrichment({ ...filters, per_page: perPage });
  const qs = buildQueryString(normalized);
  const url = `${API_URL}/search?${qs}`;

  return limiter.acquire(async () => {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `recherche-entreprises: HTTP ${res.status} ${res.statusText}`
      );
    }
    return (await res.json()) as SearchResponse;
  });
}

export async function getCompanyBySiren(
  siren: string
): Promise<CompanyResult | null> {
  const clean = siren.replace(/\s/g, "");
  if (!/^\d{9}$/.test(clean)) return null;
  const normalized = withEnrichment({ q: clean, per_page: 1 });
  const url = `${API_URL}/search?${buildQueryString(normalized)}`;

  return limiter.acquire(async () => {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponse;
    const found = data.results.find((r) => r.siren === clean);
    return found ?? data.results[0] ?? null;
  });
}

// Endpoint géographique — utile pour la prospection locale autour d'un point
export interface NearPointFilters {
  lat: number;
  long: number;
  radius?: number; // km, max 50
  activite_principale?: string | string[];
  section_activite_principale?: string | string[];
  page?: number;
  per_page?: number;
  include?: IncludeField[];
  sort_by_size?: boolean;
}

export async function searchNearPoint(
  filters: NearPointFilters
): Promise<SearchResponse> {
  const perPage = Math.min(filters.per_page ?? 25, 25);
  const radius = Math.min(filters.radius ?? 5, 50);
  const qs = buildQueryString({
    ...filters,
    radius,
    per_page: perPage,
    minimal: true,
    include: filters.include ?? [
      "finances",
      "dirigeants",
      "complements",
      "siege",
    ],
  } as unknown as SearchFilters);
  const url = `${API_URL}/near_point?${qs}`;

  return limiter.acquire(async () => {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `near_point: HTTP ${res.status} ${res.statusText}`
      );
    }
    return (await res.json()) as SearchResponse;
  });
}

// === Helpers d'extraction ===

// Retourne le CA le plus récent, ou null
export function getLastCA(r: CompanyResult): {
  year: string;
  ca: number | null;
  resultat_net: number | null;
} | null {
  if (!r.finances) return null;
  const years = Object.keys(r.finances).sort();
  const last = years.at(-1);
  if (!last) return null;
  const f = r.finances[last];
  return {
    year: last,
    ca: f?.ca ?? null,
    resultat_net: f?.resultat_net ?? null,
  };
}
