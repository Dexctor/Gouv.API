import type { SearchFilters } from "./api/recherche-entreprises";
import { TRADE_PRESETS } from "./search-presets";
import { findNaf } from "./naf-lookup";
import {
  TRANCHE_EFFECTIF_LABELS,
  NAF_SECTIONS,
  NATURE_JURIDIQUE_LABELS,
} from "./insee-labels";

export interface SearchState {
  q: string;
  cp: string;
  region: string;
  trade: string;
  naf: string[];
  section: string;
  effectif: string[];
  forme: string;
  etat: string;
  categorie: string[];
  caMin: string;
  caMax: string;
  rge: boolean;
  qualiopi: boolean;
  bio: boolean;
  ess: boolean;
  enrich: boolean;
}
export const EMPTY_SEARCH: SearchState = {
  q: "",
  cp: "",
  region: "",
  trade: "",
  naf: [],
  section: "",
  effectif: [],
  forme: "",
  etat: "A",
  categorie: [],
  caMin: "",
  caMax: "",
  rge: false,
  qualiopi: false,
  bio: false,
  ess: false,
  enrich: false,
};
export const SEARCH_SORTS = [
  "relevance",
  "ca-desc",
  "ca-asc",
  "staff-desc",
  "staff-asc",
  "age-desc",
  "age-asc",
  "name",
] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];
export const SORT_LABELS: Record<SearchSort, string> = {
  relevance: "Pertinence",
  "ca-desc": "CA décroissant",
  "ca-asc": "CA croissant",
  "staff-desc": "Effectif décroissant",
  "staff-asc": "Effectif croissant",
  "age-desc": "Plus anciennes",
  "age-asc": "Plus récentes",
  name: "Nom A–Z",
};

/** Stable URL and upstream criteria; array selection order carries no meaning. */
export function normalizeSearchState(input: SearchState): SearchState {
  const state = { ...input };
  for (const key of Object.keys(state) as (keyof SearchState)[]) {
    const value = state[key];
    if (Array.isArray(value)) Object.assign(state, { [key]: [...new Set(value.map((item) => item.trim()).filter(Boolean))].sort() });
    else if (typeof value === "string") Object.assign(state, { [key]: value.trim().replace(/\s+/g, " ") });
  }
  state.naf = [...new Set(state.naf.map((code) => findNaf(code)?.code ?? code))].sort();
  return state;
}

export function readSearchState(
  params: Record<string, string | string[] | undefined>,
): SearchState {
  const state = { ...EMPTY_SEARCH };
  for (const key of Object.keys(state) as (keyof SearchState)[]) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
    if (Array.isArray(state[key]))
      Object.assign(state, { [key]: value.split(",").filter(Boolean) });
    else if (typeof state[key] === "boolean")
      Object.assign(state, { [key]: value === "true" || value === "1" });
    else Object.assign(state, { [key]: value || EMPTY_SEARCH[key] });
  }
  return normalizeSearchState(state);
}

export function searchHref(
  state: SearchState,
  page = 1,
  sort = "relevance",
  submitted = true,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeSearchState(state))) {
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value !== "" && value !== false) params.set(key, String(value));
  }
  if (submitted) params.set("run", "1");
  if (page > 1) params.set("page", String(page));
  if (sort !== "relevance") params.set("sort", sort);
  return `/search?${params}`;
}

export function parseAmount(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const match = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/^(\d+(?:\.\d+)?)(k|m)?$/i);
  if (!match)
    throw new Error("Saisissez un CA valide, par exemple 300k, 1,5M ou 0.");
  const amount = Math.round(
    Number(match[1]) *
      ({ k: 1000, m: 1000000 }[match[2]?.toLowerCase() ?? ""] ?? 1),
  );
  if (!Number.isSafeInteger(amount))
    throw new Error("Le montant du CA est trop élevé.");
  return amount;
}

export function buildSearchFilters(
  state: SearchState,
  page = 1,
): SearchFilters {
  state = normalizeSearchState(state);
  const caMin = parseAmount(state.caMin),
    caMax = parseAmount(state.caMax);
  if (caMin != null && caMax != null && caMin > caMax)
    throw new Error("Le CA minimum doit être inférieur ou égal au maximum.");
  const preset = TRADE_PRESETS.find((item) => item.id === state.trade);
  if (state.trade && !preset)
    throw new Error(
      "Ce preset métier n’existe pas. Choisissez un métier dans la liste.",
    );
  const manualCodes = state.naf.map((code) => findNaf(code)?.code);
  if (manualCodes.some((code) => !code))
    throw new Error(
      "Un code NAF est invalide. Sélectionnez-le dans la liste des activités.",
    );
  const codes = manualCodes.filter((code): code is string => Boolean(code));
  const selectedCodes = preset
    ? codes.length
      ? codes.filter((code) => preset.codes.some((item) => item === code))
      : [...preset.codes]
    : codes;
  if (preset && codes.length && !selectedCodes.length)
    throw new Error(
      "Les codes NAF choisis ne correspondent pas à ce métier. Retirez le preset ou choisissez un code compatible.",
    );
  if (state.effectif.some((code) => !(code in TRANCHE_EFFECTIF_LABELS)))
    throw new Error("Une tranche d’effectif est invalide.");
  if (
    state.section &&
    !NAF_SECTIONS.some((item) => item.code === state.section)
  )
    throw new Error("La section NAF est invalide.");
  if (state.forme && !(state.forme in NATURE_JURIDIQUE_LABELS))
    throw new Error("La forme juridique est invalide.");
  if (!["A", "C", "all"].includes(state.etat))
    throw new Error("L’état administratif est invalide.");
  if (state.categorie.some((item) => !["PME", "ETI", "GE"].includes(item)))
    throw new Error("La catégorie d’entreprise est invalide.");
  if (state.region && !/^[0-9]{2}$/.test(state.region))
    throw new Error("Le code région doit contenir deux chiffres.");
  return {
    q: state.q.trim() || undefined,
    region: state.region || undefined,
    activite_principale: selectedCodes.length ? selectedCodes : undefined,
    section_activite_principale: state.section || undefined,
    tranche_effectif_salarie: state.effectif.length
      ? state.effectif
      : undefined,
    nature_juridique: state.forme || undefined,
    categorie_entreprise: state.categorie.length
      ? (state.categorie as ("PME" | "ETI" | "GE")[])
      : undefined,
    etat_administratif:
      state.etat === "all" ? undefined : (state.etat as "A" | "C"),
    ca_min: caMin,
    ca_max: caMax,
    est_rge: state.rge || undefined,
    est_qualiopi: state.qualiopi || undefined,
    est_bio: state.bio || undefined,
    est_ess: state.ess || undefined,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    per_page: 25,
  };
}

export function activeSearchChips(
  state: SearchState,
): { key: keyof SearchState; label: string }[] {
  const chips: { key: keyof SearchState; label: string }[] = [];
  const add = (key: keyof SearchState, label: string) => {
    if (state[key] && (!Array.isArray(state[key]) || state[key].length))
      chips.push({ key, label });
  };
  add("q", `Nom : ${state.q}`);
  add("cp", state.cp);
  add(
    "region",
    state.region === "32" ? "Hauts-de-France" : `Région ${state.region}`,
  );
  add(
    "trade",
    TRADE_PRESETS.find((item) => item.id === state.trade)?.label ?? state.trade,
  );
  add("naf", `NAF : ${state.naf.join(", ")}`);
  add(
    "section",
    NAF_SECTIONS.find((item) => item.code === state.section)?.label ??
      state.section,
  );
  add(
    "effectif",
    state.effectif
      .map((code) => TRANCHE_EFFECTIF_LABELS[code] ?? code)
      .join(" / "),
  );
  add("caMin", `CA ≥ ${state.caMin} €`);
  add("caMax", `CA ≤ ${state.caMax} €`);
  add("forme", NATURE_JURIDIQUE_LABELS[state.forme] ?? state.forme);
  add("categorie", state.categorie.join(" / "));
  if (state.etat !== "all")
    add("etat", state.etat === "C" ? "Cessées" : "Actives");
  for (const [key, label] of [
    ["rge", "RGE"],
    ["qualiopi", "Qualiopi"],
    ["bio", "Bio"],
    ["ess", "ESS"],
    ["enrich", "Complément CA BCE"],
  ] as const)
    add(key, label);
  return chips;
}
