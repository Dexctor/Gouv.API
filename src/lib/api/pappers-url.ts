// Builder d'URLs pour le fallback Pappers et Annuaire Entreprises.
// Pas d'API, juste des URLs publiques.

export function buildPappersUrl(query: string): string {
  const cleaned = query.replace(/\s/g, "");
  if (/^\d{9}$/.test(cleaned)) {
    return `https://www.pappers.fr/entreprise/${cleaned}`;
  }
  if (/^\d{14}$/.test(cleaned)) {
    return `https://www.pappers.fr/entreprise/${cleaned.slice(0, 9)}`;
  }
  return `https://www.pappers.fr/recherche?q=${encodeURIComponent(query)}`;
}

export function buildAnnuaireUrl(query: string): string {
  const cleaned = query.replace(/\s/g, "");
  if (/^\d{9}$/.test(cleaned)) {
    return `https://annuaire-entreprises.data.gouv.fr/entreprise/${cleaned}`;
  }
  return `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(query)}`;
}
