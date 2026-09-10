import { searchAddress } from "./api/adresse";
import { normalizeSearch } from "./search-presets";
import type { SearchFilters } from "./api/recherche-entreprises";

export function numericLocation(
  input: string,
): Pick<SearchFilters, "code_postal" | "departement"> | null {
  const value = input.trim().toUpperCase();
  const parts = value.split(",").map((part) => part.trim());
  if (parts.every((part) => /^\d{5}$/.test(part)))
    return { code_postal: parts.join(",") };
  if (
    parts.every((part) =>
      /^(?:0[1-9]|[1-8]\d|9[0-5]|2[AB]|97[1-46])$/.test(part),
    )
  )
    return { departement: parts.join(",") };
  if (/^[\d,\s]+$/.test(value))
    throw new Error(
      "Saisissez un code postal à 5 chiffres ou un département (ex. 59, 62). Séparez plusieurs zones par une virgule.",
    );
  return null;
}
export async function resolveSearchLocation(
  input: string,
): Promise<
  Pick<SearchFilters, "code_postal" | "code_commune" | "departement">
> {
  if (!input.trim()) return {};
  const numeric = numericLocation(input);
  if (numeric) return numeric;
  const normalized = normalizeSearch(input);
  const candidates = await searchAddress(normalized, 10, "municipality");
  const exact = candidates.filter(
    (candidate) =>
      normalizeSearch(candidate.properties.city) === normalizeSearch(input),
  );
  const unique = [
    ...new Map(
      exact.map((candidate) => [candidate.properties.citycode, candidate]),
    ).values(),
  ];
  if (unique.length === 1)
    return { code_commune: unique[0].properties.citycode };
  const suggestions = [
    ...new Set(
      candidates.map(
        (candidate) =>
          `${candidate.properties.city} (${candidate.properties.postcode})`,
      ),
    ),
  ].slice(0, 3);
  throw new Error(
    unique.length > 1
      ? `Plusieurs communes portent ce nom. Précisez un code postal : ${suggestions.join(", ")}.`
      : `Ville non identifiée. Saisissez son nom complet ou un code postal.${suggestions.length ? ` Suggestions : ${suggestions.join(", ")}.` : ""}`,
  );
}
