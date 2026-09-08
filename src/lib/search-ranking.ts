import type {
  CompanyResult,
  CompanySiege,
  SearchFilters,
} from "./api/recherche-entreprises";
import type { EnrichedCompany } from "@/actions/search";
import { nafLabel } from "./naf-lookup";
import { normalizeSearch } from "./search-presets";
import { TRANCHE_EFFECTIF_MEDIAN } from "./insee-labels";
import type { SearchSort } from "./search-state";

const values = (value?: string | string[]) =>
  Array.isArray(value) ? value : (value?.split(",") ?? []);
const accepts = (
  filter: string | string[] | undefined,
  actual: string | null | undefined,
) => !values(filter).length || values(filter).includes(actual ?? "");
export function locationMatches(
  location: CompanySiege,
  filters: SearchFilters,
) {
  return (
    accepts(filters.code_postal, location.code_postal) &&
    accepts(filters.code_commune, location.commune) &&
    accepts(
      filters.departement,
      location.departement ||
        (location.code_postal?.startsWith("97")
          ? location.code_postal.slice(0, 3)
          : location.code_postal?.slice(0, 2)),
    ) &&
    accepts(filters.region, location.region)
  );
}
export function matchedLocation(
  company: CompanyResult,
  filters: SearchFilters,
) {
  if (!(
    filters.code_postal ||
    filters.code_commune ||
    filters.departement ||
    filters.region
  ))
    return company.siege;
  const matches = [
    company.siege,
    ...(company.matching_etablissements ?? []),
  ].filter((location): location is CompanySiege =>
    Boolean(location && locationMatches(location, filters)),
  );
  return (
    matches.find((location) => location.etat_administratif === "A") ??
    matches.find((location) => location.etat_administratif !== "F") ??
    matches[0]
  );
}
export function companyCA(company: EnrichedCompany) {
  return company.lastCA?.ca ?? company.cache?.dernierCA ?? null;
}

// Pour un SIREN/SIRET l'API ignore les filtres : vérification locale obligatoire.
export function matchesDirectSearch(
  company: EnrichedCompany,
  filters: SearchFilters,
) {
  if (
    !accepts(filters.activite_principale, company.activite_principale) ||
    !accepts(
      filters.section_activite_principale,
      company.section_activite_principale,
    ) ||
    !accepts(
      filters.tranche_effectif_salarie,
      company.tranche_effectif_salarie,
    ) ||
    !accepts(filters.nature_juridique, company.nature_juridique) ||
    !accepts(filters.categorie_entreprise, company.categorie_entreprise) ||
    !accepts(filters.etat_administratif, company.etat_administratif)
  )
    return false;
  if (
    (filters.code_postal ||
      filters.code_commune ||
      filters.departement ||
      filters.region) &&
    !matchedLocation(company, filters)
  )
    return false;
  const ca = companyCA(company);
  if (
    (filters.ca_min != null || filters.ca_max != null) &&
    (ca == null ||
      (filters.ca_min != null && ca < filters.ca_min) ||
      (filters.ca_max != null && ca > filters.ca_max))
  )
    return false;
  for (const key of ["est_rge", "est_qualiopi", "est_bio", "est_ess"] as const)
    if (filters[key] && !company.complements?.[key]) return false;
  return true;
}
export function rankCompanies(
  companies: EnrichedCompany[],
  filters: SearchFilters,
) {
  const query = normalizeSearch(filters.q ?? "");
  const tokens = query.split(" ").filter(Boolean);
  const tuple = (company: EnrichedCompany) => {
    const names = [
      company.nom_complet,
      company.nom_raison_sociale,
      company.sigle,
    ]
      .filter((name): name is string => Boolean(name))
      .map(normalizeSearch);
    const activity = normalizeSearch(nafLabel(company.activite_principale));
    return [
      Number(
        Boolean(query) && (names.includes(query) || company.siren === query),
      ),
      Number(
        tokens.length > 0 && tokens.every((token) => activity.includes(token)),
      ),
      filters.code_postal ||
      filters.code_commune ||
      filters.departement ||
      filters.region
        ? matchedLocation(company, filters)
          ? matchedLocation(company, filters)?.etat_administratif === "F"
            ? 1
            : 2
          : 0
        : 0,
      Number(Boolean(query) && names.some((name) => name.startsWith(query))),
    ];
  };
  return companies
    .map((company, index) => ({ company, index, rank: tuple(company) }))
    .sort((a, b) => {
      for (let i = 0; i < a.rank.length; i++)
        if (a.rank[i] !== b.rank[i]) return b.rank[i] - a.rank[i];
      return a.index - b.index;
    })
    .map(({ company }) => company);
}
export function sortCompanies(companies: EnrichedCompany[], sort: SearchSort) {
  if (sort === "relevance") return companies;
  return [...companies].sort((a, b) => {
    if (sort === "name")
      return a.nom_complet.localeCompare(b.nom_complet, "fr", {
        sensitivity: "base",
      });
    const metric = (company: EnrichedCompany) => {
      if (sort.startsWith("ca")) return companyCA(company);
      if (sort.startsWith("staff"))
        return (
          TRANCHE_EFFECTIF_MEDIAN[company.tranche_effectif_salarie ?? ""] ??
          null
        );
      const date = Date.parse(company.date_creation);
      return Number.isFinite(date) ? -date : null;
    };
    const av = metric(a),
      bv = metric(b);
    if (av == null) return bv == null ? 0 : 1;
    if (bv == null) return -1;
    return (av - bv) * (sort.endsWith("desc") ? -1 : 1);
  });
}
