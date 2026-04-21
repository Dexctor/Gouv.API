// Logique de qualification ICP Opale Acquisition.
// Centralisée ici pour être réutilisée : badge hero, table de recherche,
// filtres CSV, scoring, alertes BODACC, etc.
//
// Critères affinés avec Antoine + Hugo (terrain) :
// - CA : 300k€ services / 800k€ produits (seuil bas), 10M€ plafond haut
// - Effectif : idéal 3+, acceptable 2, éliminatoire 0-1
// - Dirigeant accessible : varie selon NAF (artisans OK, avocats NO)
// - Site web : requis (sinon pas d'audit possible)
// - Géo : Hauts-de-France prioritaire

// === Sections NAF considérées comme PRESTATAIRE DE SERVICES ===
// Référence INSEE NAF rév.2 sections G à U.
// Services (seuil 300k€) vs Produits (seuil 800k€).
// Le seul cas ambigu : section G (commerce) → traité comme PRODUITS car e-commerce/détail.
export const SERVICE_SECTIONS = new Set([
  "H", // Transports
  "I", // Hébergement et restauration (mitigé, mais restauration = service)
  "J", // Information et communication
  "K", // Finance et assurance
  "L", // Immobilier
  "M", // Activités spécialisées, scientifiques et techniques (conseil, audit, avocat...)
  "N", // Services administratifs et soutien
  "P", // Enseignement (auto-école, formation)
  "Q", // Santé humaine
  "R", // Arts, spectacles
  "S", // Autres services (coiffure, nettoyage, associations, etc.)
]);

export const PRODUCT_SECTIONS = new Set([
  "A", // Agriculture
  "B", // Extraction
  "C", // Industrie manufacturière
  "D", // Énergie
  "E", // Eau, déchets
  "F", // Construction (produit = ouvrages)
  "G", // Commerce (détail, gros, auto, e-commerce)
]);

// Sections à exclure totalement de la cible commerciale
export const EXCLUDED_SECTIONS = new Set([
  "O", // Administration publique
  "T", // Ménages employeurs
  "U", // Extraterritoriales
]);

// === Seuils CA ===
export const CA_MIN_SERVICES = 300_000;
export const CA_MIN_PRODUCTS = 800_000;
export const CA_MAX = 10_000_000; // au-delà, dirigeant inaccessible

// === Codes NAF où le dirigeant est typiquement FILTRÉ (secrétaire en front) ===
// Basé sur l'expérience terrain Opale. À ajuster au fil du temps.
const NAF_DIRIGEANT_FILTRE = new Set([
  "69.10Z", // Avocats & notaires
  "69.20Z", // Expertise comptable
  "86.21Z", // Médecins généralistes
  "86.22A", // Médecins spécialistes
  "86.22B", // Médecins spécialistes divers
  "86.22C", // Autres activités médicales
  "86.23Z", // Chirurgiens-dentistes
  "64.19Z", // Banques (monétaire)
  "65.11Z", // Assurances vie
  "65.12Z", // Autres assurances
]);

// === Codes NAF où le dirigeant est typiquement DIRECTEMENT ACCESSIBLE ===
// Appliqué en BONUS dans le score (+ explicite dans l'UI).
const NAF_DIRIGEANT_DIRECT = new Set([
  "85.53Z", // Auto-écoles
  "56.10A", // Restauration traditionnelle
  "56.10B", // Cafétéria
  "56.10C", // Restauration rapide
  "56.30Z", // Débits de boissons
  "47.", // préfixe : tous commerces de détail (match ci-dessous sur startsWith)
  "43.", // BTP spécialisés (plomberie, peinture, électricité, maçonnerie)
  "41.", // Construction de bâtiments
  "42.", // Génie civil
  "68.31Z", // Agences immobilières
  "70.22Z", // Conseil gestion
  "96.02A", // Coiffure
  "96.02B", // Soins beauté
  "81.21Z", // Nettoyage
  "81.22Z", // Nettoyage spécialisé
  "81.30Z", // Paysagistes
]);

export type DirigeantAccess = "direct" | "filtre" | "inconnu";

export function dirigeantAccess(codeNaf: string | null | undefined): DirigeantAccess {
  if (!codeNaf) return "inconnu";
  const clean = codeNaf.replace(/\s/g, "");
  if (NAF_DIRIGEANT_FILTRE.has(clean)) return "filtre";
  for (const prefix of NAF_DIRIGEANT_DIRECT) {
    if (prefix.endsWith(".") ? clean.startsWith(prefix) : clean === prefix) {
      return "direct";
    }
  }
  return "inconnu";
}

// === Type catégorie Opale ===
export type OpaleCategory = "services" | "products" | "excluded";

export function categorizeBySection(
  sectionNaf: string | null | undefined
): OpaleCategory {
  if (!sectionNaf) return "services"; // défaut le plus tolérant
  if (SERVICE_SECTIONS.has(sectionNaf)) return "services";
  if (PRODUCT_SECTIONS.has(sectionNaf)) return "products";
  if (EXCLUDED_SECTIONS.has(sectionNaf)) return "excluded";
  return "services";
}

export function caSeuilFor(sectionNaf: string | null | undefined): number {
  const cat = categorizeBySection(sectionNaf);
  if (cat === "products") return CA_MIN_PRODUCTS;
  return CA_MIN_SERVICES;
}

// === Codes d'effectif ===
// Ordre approximatif de valeur commerciale pour Opale.
// "00" / "NN" = non-employeuse (hors cible)
// "01" = 1-2 salariés (à tenter)
// "02" = 3-5 (idéal)
// "03" = 6-9 (idéal)
// "11" = 10-19 (OK)
// "12" = 20-49 (OK)
// "21"+ = 50+ (trop gros, déprioriser)
export function effectifIsTarget(code: string | null | undefined): {
  target: "idéal" | "acceptable" | "trop petit" | "trop grand" | "inconnu";
  score: number;
} {
  if (!code) return { target: "inconnu", score: 0 };
  const c = code.trim();
  if (["NN", "00"].includes(c)) return { target: "trop petit", score: 0 };
  if (c === "01") return { target: "acceptable", score: 10 };
  if (["02", "03"].includes(c)) return { target: "idéal", score: 20 };
  if (["11", "12"].includes(c)) return { target: "acceptable", score: 15 };
  // 21+ : entreprise trop grosse, dirigeant inaccessible
  return { target: "trop grand", score: 5 };
}

// === Géographie ===
const HDF_DEPT = new Set(["02", "59", "60", "62", "80"]);
const IDF_DEPT = new Set(["75", "77", "78", "91", "92", "93", "94", "95"]);

export function geoScore(codePostal: string | null | undefined): {
  zone: "HDF" | "IDF" | "autre" | "inconnu";
  score: number;
} {
  if (!codePostal || codePostal.length < 2) return { zone: "inconnu", score: 0 };
  const dept = codePostal.substring(0, 2);
  if (HDF_DEPT.has(dept)) return { zone: "HDF", score: 10 };
  if (IDF_DEPT.has(dept)) return { zone: "IDF", score: 5 };
  return { zone: "autre", score: 2 };
}

// === Scoring global ===
export interface IcpInput {
  ca: number | null | undefined;
  trancheEffectif: string | null | undefined;
  sectionNaf: string | null | undefined;
  codeNaf: string | null | undefined;
  codePostal: string | null | undefined;
  siteWeb: string | null | undefined;
  etatAdministratif: string | null | undefined;
}

export interface IcpResult {
  /** 0-100 */
  score: number;
  /** Diagnostic principal */
  verdict: "prioritaire" | "cible" | "a-tenter" | "hors-cible";
  /** Raisons positives (affichable en UI, max 4) */
  positives: string[];
  /** Raisons négatives (max 4) */
  negatives: string[];
  /** Détails par axe */
  details: {
    category: OpaleCategory;
    caOk: boolean;
    caSource: "réel" | "inconnu";
    effectif: ReturnType<typeof effectifIsTarget>;
    dirigeant: DirigeantAccess;
    geo: ReturnType<typeof geoScore>;
    hasSite: boolean;
    active: boolean;
  };
}

export function evaluateIcp(input: IcpInput): IcpResult {
  const category = categorizeBySection(input.sectionNaf);
  const active = input.etatAdministratif === "A";
  const hasSite = Boolean(input.siteWeb?.trim());
  const effectif = effectifIsTarget(input.trancheEffectif);
  const dirigeant = dirigeantAccess(input.codeNaf);
  const geo = geoScore(input.codePostal);

  // === Scoring ===
  let score = 0;
  const positives: string[] = [];
  const negatives: string[] = [];

  // État administratif : éliminatoire si cessée
  if (!active) {
    return {
      score: 0,
      verdict: "hors-cible",
      positives: [],
      negatives: ["Entreprise cessée"],
      details: {
        category,
        caOk: false,
        caSource: "inconnu",
        effectif,
        dirigeant,
        geo,
        hasSite,
        active,
      },
    };
  }

  // Secteur exclu : éliminatoire
  if (category === "excluded") {
    return {
      score: 0,
      verdict: "hors-cible",
      positives: [],
      negatives: ["Secteur exclu (service public, ménage employeur, extraterritorial)"],
      details: {
        category,
        caOk: false,
        caSource: "inconnu",
        effectif,
        dirigeant,
        geo,
        hasSite,
        active,
      },
    };
  }

  // CA : 40 points
  const seuil = caSeuilFor(input.sectionNaf);
  const caOk = input.ca != null && input.ca >= seuil && input.ca <= CA_MAX;
  if (input.ca == null) {
    // CA inconnu : on neutralise, on ne pénalise pas
    score += 15;
  } else if (caOk) {
    score += 40;
    positives.push(
      `CA ${formatCompact(input.ca)} ≥ ${formatCompact(seuil)} (${category === "services" ? "services" : "produits"})`
    );
  } else if (input.ca > CA_MAX) {
    negatives.push(`CA ${formatCompact(input.ca)} > ${formatCompact(CA_MAX)} (dirigeant inaccessible)`);
  } else {
    negatives.push(`CA ${formatCompact(input.ca)} < seuil ${formatCompact(seuil)}`);
  }

  // Effectif : 20 points
  score += effectif.score;
  if (effectif.target === "idéal") {
    positives.push("Effectif idéal (3-9 salariés)");
  } else if (effectif.target === "acceptable") {
    positives.push("Effectif acceptable");
  } else if (effectif.target === "trop petit") {
    negatives.push("Effectif 0-1 (hors cible)");
  } else if (effectif.target === "trop grand") {
    negatives.push("Effectif 50+ (dirigeant filtré)");
  }

  // Site web : 15 points + bonus commercial
  if (hasSite) {
    score += 15;
    positives.push("Site web présent (audit possible)");
  } else {
    negatives.push("Pas de site web (vente refonte difficile)");
  }

  // Dirigeant : 15 points
  if (dirigeant === "direct") {
    score += 15;
    positives.push("Dirigeant typiquement accessible");
  } else if (dirigeant === "filtre") {
    score += 2;
    negatives.push("Secrétaire filtrante probable (cabinet, cabinet médical)");
  } else {
    score += 8;
  }

  // Géo : 10 points
  score += geo.score;
  if (geo.zone === "HDF") {
    positives.push("Hauts-de-France (priorité Opale)");
  }

  // === Verdict ===
  let verdict: IcpResult["verdict"];
  if (score >= 75) verdict = "prioritaire";
  else if (score >= 55) verdict = "cible";
  else if (score >= 35) verdict = "a-tenter";
  else verdict = "hors-cible";

  return {
    score: Math.min(100, Math.round(score)),
    verdict,
    positives: positives.slice(0, 4),
    negatives: negatives.slice(0, 4),
    details: {
      category,
      caOk,
      caSource: input.ca != null ? "réel" : "inconnu",
      effectif,
      dirigeant,
      geo,
      hasSite,
      active,
    },
  };
}

// === Verdict → libellé + couleur ===
export const VERDICT_META: Record<
  IcpResult["verdict"],
  { label: string; color: string; badgeClass: string }
> = {
  prioritaire: {
    label: "Prospect prioritaire",
    color: "#10b981", // emerald-500
    badgeClass: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  },
  cible: {
    label: "Dans la cible",
    color: "#8b5cf6", // violet-500
    badgeClass: "border-violet-500/50 bg-violet-500/15 text-violet-300",
  },
  "a-tenter": {
    label: "À tenter",
    color: "#f59e0b", // amber-500
    badgeClass: "border-amber-500/50 bg-amber-500/15 text-amber-300",
  },
  "hors-cible": {
    label: "Hors cible",
    color: "#6b7280", // gray-500
    badgeClass: "border-muted text-muted-foreground",
  },
};

// Formatage compact (duplique insee-labels pour éviter une dépendance circulaire)
function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1e9).toFixed(1)} Md€`;
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)} M€`;
  if (n >= 1_000) return `${Math.round(n / 1e3)} k€`;
  return `${n} €`;
}
