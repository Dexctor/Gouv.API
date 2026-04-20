// Client pour l'API publique Recherche d'entreprises (api.gouv.fr)
// Documentation : https://recherche-entreprises.api.gouv.fr/docs/
// Rate limit : 7 req/sec

const API_URL =
  process.env.RECHERCHE_ENTREPRISES_API_URL ??
  "https://recherche-entreprises.api.gouv.fr";

export interface SearchFilters {
  q?: string;
  code_naf?: string | string[];
  code_postal?: string;
  departement?: string;
  tranche_effectif_salarie?: string[];
  nature_juridique?: string[];
  etat_administratif?: "A" | "F";
  est_rge?: boolean;
  est_qualiopi?: boolean;
  est_bio?: boolean;
  page?: number;
  per_page?: number;
}

export interface CompanySiege {
  siret: string;
  adresse: string;
  code_postal: string;
  commune: string;
  departement: string;
  region: string;
  latitude?: string;
  longitude?: string;
}

export interface CompanyResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  sigle?: string;
  nombre_etablissements: number;
  nombre_etablissements_ouverts: number;
  siege: CompanySiege;
  activite_principale: string;
  categorie_entreprise?: string;
  tranche_effectif_salarie?: string;
  annee_tranche_effectif_salarie?: string;
  date_creation: string;
  etat_administratif: "A" | "F";
  nature_juridique: string;
  dirigeants?: Array<{
    nom?: string;
    prenoms?: string;
    qualite?: string;
  }>;
  finances?: Record<string, {
    ca?: number;
    resultat_net?: number;
  }>;
}

export interface SearchResponse {
  results: CompanyResult[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Limiteur de débit simple : ~7 req/s => une requête toutes les 150ms max
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

export async function searchCompanies(
  filters: SearchFilters
): Promise<SearchResponse> {
  const perPage = Math.min(filters.per_page ?? 25, 25);
  const normalized: SearchFilters = { ...filters, per_page: perPage };
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
  const url = `${API_URL}/search?q=${clean}&per_page=1`;

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
