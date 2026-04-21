// Référentiels INSEE : codes tranche effectif, catégorie entreprise, sections NAF.
// Source : https://sirene.fr/static-resources/htm/v_sommaire_311.htm#27

export const TRANCHE_EFFECTIF_LABELS: Record<string, string> = {
  NN: "Non employeuse",
  "00": "0 salarié",
  "01": "1-2 salariés",
  "02": "3-5 salariés",
  "03": "6-9 salariés",
  "11": "10-19 salariés",
  "12": "20-49 salariés",
  "21": "50-99 salariés",
  "22": "100-199 salariés",
  "31": "200-249 salariés",
  "32": "250-499 salariés",
  "41": "500-999 salariés",
  "42": "1 000-1 999 salariés",
  "51": "2 000-4 999 salariés",
  "52": "5 000-9 999 salariés",
  "53": "10 000+ salariés",
};

export function trancheEffectifLabel(code?: string | null): string {
  if (!code) return "—";
  return TRANCHE_EFFECTIF_LABELS[code] ?? code;
}

// Valeur médiane indicative (utile pour tri ou filtre approximatif)
export const TRANCHE_EFFECTIF_MEDIAN: Record<string, number> = {
  NN: 0,
  "00": 0,
  "01": 2,
  "02": 4,
  "03": 8,
  "11": 15,
  "12": 35,
  "21": 75,
  "22": 150,
  "31": 225,
  "32": 375,
  "41": 750,
  "42": 1500,
  "51": 3500,
  "52": 7500,
  "53": 10000,
};

export const CATEGORIE_ENTREPRISE_LABELS: Record<string, string> = {
  PME: "PME",
  ETI: "ETI",
  GE: "Grand groupe",
};

// Sections NAF (niveau 1 de la NAF rév.2)
export const NAF_SECTIONS: Array<{ code: string; label: string }> = [
  { code: "A", label: "Agriculture, sylviculture et pêche" },
  { code: "B", label: "Industries extractives" },
  { code: "C", label: "Industrie manufacturière" },
  { code: "D", label: "Production et distribution d'électricité, gaz" },
  { code: "E", label: "Eau, déchets, dépollution" },
  { code: "F", label: "Construction" },
  { code: "G", label: "Commerce, réparation automobile" },
  { code: "H", label: "Transports et entreposage" },
  { code: "I", label: "Hébergement et restauration" },
  { code: "J", label: "Information et communication" },
  { code: "K", label: "Activités financières et d'assurance" },
  { code: "L", label: "Activités immobilières" },
  { code: "M", label: "Activités spécialisées, scientifiques, techniques" },
  { code: "N", label: "Activités de services administratifs et de soutien" },
  { code: "O", label: "Administration publique" },
  { code: "P", label: "Enseignement" },
  { code: "Q", label: "Santé humaine et action sociale" },
  { code: "R", label: "Arts, spectacles et activités récréatives" },
  { code: "S", label: "Autres activités de services" },
  { code: "T", label: "Ménages employeurs" },
  { code: "U", label: "Activités extraterritoriales" },
];

// Natures juridiques INSEE — top utilisées
export const NATURE_JURIDIQUE_LABELS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5410": "SARL unipersonnelle",
  "5498": "EURL",
  "5499": "SARL",
  "5599": "SA",
  "5710": "SAS",
  "5720": "SASU",
  "6540": "SCI",
  "9220": "Association",
  "5202": "SNC",
  "5306": "Société en commandite simple",
  "5722": "Société européenne",
  "5485": "Société coopérative",
};

export function natureJuridiqueLabel(code?: string | null): string {
  if (!code) return "—";
  return NATURE_JURIDIQUE_LABELS[code] ?? `Code ${code}`;
}

// Formatage monétaire compact (1 234 567 € → "1,2 M€")
const compactEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCompactEuro(value: number | null | undefined): string {
  if (value == null) return "—";
  return compactEuro.format(value);
}

export function formatEuro(value: number | null | undefined): string {
  if (value == null) return "—";
  return fullEuro.format(value);
}
