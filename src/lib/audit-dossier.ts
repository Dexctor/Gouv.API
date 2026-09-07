export type AuditWebsiteStatus =
  | "unknown"
  | "candidate"
  | "verified"
  | "rejected";

export type AuditObservationStatus =
  | "verified"
  | "unknown"
  | "not_found_in_scope"
  | "collection_failed";

export interface AuditObservationInput {
  type: string;
  key: string;
  value: unknown;
  source: string;
  scope: string;
  url: string | null;
  observedAt: Date | string;
  status: AuditObservationStatus;
  evidence?: string | null;
}

export interface AuditFinancialInput {
  dateCloture: Date | string;
  chiffreAffaires: number | null;
  margeBrute?: number | null;
  ebe?: number | null;
  resultatNet: number | null;
}

export interface AuditPageInput {
  url: string;
  finalUrl?: string | null;
  title?: string | null;
  pageType: string;
  selected: boolean;
  collectionStatus: "not_collected" | "collected" | "collection_failed";
  collectionError?: string | null;
  lastCollectedAt?: Date | string | null;
}

export interface AuditDossierInput {
  denomination: string;
  siren: string;
  codeNaf: string | null;
  libelleNaf: string | null;
  ville: string | null;
  codePostal?: string | null;
  dateCreation: Date | string | null;
  trancheEffectif: string | null;
  etatAdministratif: string | null;
  formeJuridique?: string | null;
  siteWeb: string | null;
  siteWebStatus: AuditWebsiteStatus;
  email: string | null;
  telephone: string | null;
  notes: string | null;
  dirigeants: unknown;
  labels?: unknown;
  financials: AuditFinancialInput[];
  observations: AuditObservationInput[];
  auditPages?: AuditPageInput[];
  totalDiscovered?: number | null;
  humanNotes?: string[];
}

const UNKNOWN = "Inconnu";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function text(value: unknown): string {
  if (value === null || value === undefined) return UNKNOWN;
  if (typeof value === "string") return value.trim() || UNKNOWN;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(text).filter((part) => part !== UNKNOWN);
    return parts.length ? parts.join(" ; ") : UNKNOWN;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return UNKNOWN;
  }
}

function money(value: number | null | undefined): string {
  return value == null
    ? UNKNOWN
    : euro.format(value).replace(/[\u00a0\u202f]/g, " ");
}

function date(value: Date | string | null | undefined): string {
  if (!value) return UNKNOWN;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? UNKNOWN
    : new Intl.DateTimeFormat("fr-FR").format(parsed);
}

function year(value: Date | string | null | undefined): string {
  if (!value) return UNKNOWN;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? UNKNOWN : String(parsed.getFullYear());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function dirigente(value: unknown): { name: string; role: string } | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const name =
      text(record.type_dirigeant) === "personne morale"
        ? text(record.denomination)
        : [text(record.prenoms), text(record.nom)]
            .filter((part) => part !== UNKNOWN)
            .join(" ");
    if (name) return { name, role: text(record.qualite) };
  }
  return null;
}

function labelNames(value: unknown): string[] {
  const labels = asRecord(value);
  if (!labels) return [];
  const names: Record<string, string> = {
    est_rge: "RGE",
    est_qualiopi: "Qualiopi",
    est_bio: "Bio",
    est_ess: "ESS",
    est_societe_mission: "Société à mission",
    est_patrimoine_vivant: "Entreprise du patrimoine vivant",
  };
  return Object.entries(names)
    .filter(([key]) => labels[key] === true)
    .map(([, name]) => name);
}

function stateLabel(value: string | null): string {
  if (!value) return UNKNOWN;
  if (value === "A") return "Active";
  if (value === "C" || value === "F") return "Cessée";
  return value;
}

function comparableUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function shortUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return value;
  }
}

function bulletValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter((item) => item !== UNKNOWN);
  const single = text(value);
  return single === UNKNOWN || single === "Non trouvé" ? [] : [single];
}

function unique(values: string[], limit = 30): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLocaleLowerCase("fr-FR");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function bullets(values: string[], empty: string): string {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : `- ${empty}`;
}

function observationsFor(
  observations: AuditObservationInput[],
  key: string,
  status?: AuditObservationStatus
): AuditObservationInput[] {
  return observations.filter(
    (observation) => observation.key === key && (!status || observation.status === status)
  );
}

function valuesFor(
  observations: AuditObservationInput[],
  key: string,
  limit = 30
): string[] {
  return unique(
    observationsFor(observations, key, "verified").flatMap((observation) =>
      bulletValues(observation.value)
    ),
    limit
  );
}

function numberFor(
  observations: AuditObservationInput[],
  key: string
): number {
  return observationsFor(observations, key)
    .map((observation) =>
      typeof observation.value === "number" ? observation.value : 0
    )
    .reduce((sum, value) => sum + value, 0);
}

function pageLabel(page: AuditPageInput | undefined, url: string | null): string {
  return page?.title || (url ? shortUrl(url) : "Page");
}

export function buildAuditDossier(input: AuditDossierInput): string {
  const selectedPages = (input.auditPages ?? []).filter((page) => page.selected);
  const allowedUrls = new Set(
    [input.siteWeb, ...selectedPages.map((page) => page.url)]
      .map(comparableUrl)
      .filter((value): value is string => Boolean(value))
  );
  const observations =
    input.siteWeb && input.siteWebStatus === "verified"
      ? input.observations.filter(
          (observation) =>
            !observation.url || allowedUrls.has(comparableUrl(observation.url) ?? "")
        )
      : [];
  const latestFinancial = [...input.financials].sort(
    (a, b) =>
      new Date(b.dateCloture).getTime() - new Date(a.dateCloture).getTime()
  )[0];
  const leader = dirigente(input.dirigeants);
  const publicLabels = labelNames(input.labels);
  const collectedPages = selectedPages.filter(
    (page) => page.collectionStatus === "collected"
  );
  const failedPages = selectedPages.filter(
    (page) => page.collectionStatus === "collection_failed"
  );
  const inspectedUrlCount =
    selectedPages.length > 0
      ? collectedPages.length
      : new Set(
          observations
            .filter((observation) => observation.source !== "page_discovery")
            .map((observation) => comparableUrl(observation.url))
            .filter(Boolean)
        ).size;

  const services = unique([
    ...valuesFor(observations, "service_mentions"),
    ...valuesFor(observations, "services_observed"),
  ], 15);
  const offerSnippets = valuesFor(observations, "content_snippets", 8);
  const clientTypes = valuesFor(observations, "client_type_mentions", 8);
  const zones = valuesFor(observations, "geographic_mentions", 10);
  const ctas = valuesFor(observations, "cta_texts", 10);
  const phones = valuesFor(observations, "phone_visible", 10);
  const emails = valuesFor(observations, "email_visible", 10);
  const formFields = valuesFor(observations, "form_fields", 20);
  const formCount = numberFor(observations, "forms_count");
  const acceptsFile = observationsFor(observations, "form_file_upload", "verified").some(
    (observation) => observation.value === true
  );
  const reassurance = valuesFor(observations, "reassurance_mentions", 12);
  const trustLogos = valuesFor(observations, "trust_logos", 10);
  const certifications = unique([
    ...publicLabels,
    ...valuesFor(observations, "certifications_mentions"),
  ], 12);
  const realisationTitles = valuesFor(observations, "realisations_titles", 12);
  const realisationDescriptions = valuesFor(
    observations,
    "realisations_descriptions",
    6
  );
  const realisationLocations = valuesFor(
    observations,
    "realisations_locations",
    10
  );
  const realisationLinks = unique([
    ...valuesFor(observations, "realisations_detail_links", 12),
    ...valuesFor(observations, "realisations_pages", 12),
  ], 12);
  const testimonialLinks = valuesFor(observations, "testimonials_pages", 10);
  const realisationCount = numberFor(observations, "realisations_approx_count");
  const photoCount = numberFor(observations, "realisations_photos_count");
  const beforeAfter = observationsFor(observations, "before_after_visible", "verified").some(
    (observation) => observation.value === true
  );

  const pageLines = selectedPages.length
    ? selectedPages.map((page) => {
        const status =
          page.collectionStatus === "collection_failed"
            ? ` — collecte échouée${page.collectionError ? ` (${page.collectionError})` : ""}`
            : page.collectionStatus === "not_collected"
              ? " — non collectée"
              : "";
        return `${page.title || page.pageType} — ${shortUrl(page.finalUrl || page.url)}${status}`;
      })
    : unique(
        observations
          .filter((observation) => observation.source !== "page_discovery")
          .map((observation) => observation.url)
          .filter((url): url is string => Boolean(url))
          .map((url) => shortUrl(url)),
        8
      );

  const contactLines: string[] = [];
  if (ctas.length) contactLines.push(`CTA observés : ${ctas.join(" ; ")}`);
  if (phones.length) contactLines.push(`Téléphones visibles : ${phones.join(" ; ")}`);
  if (emails.length) contactLines.push(`Emails visibles : ${emails.join(" ; ")}`);
  if (formCount > 0) {
    contactLines.push(
      `Formulaires observés : ${formCount}${
        formFields.length ? ` — champs : ${formFields.join(", ")}` : ""
      }`
    );
    contactLines.push(
      `Envoi de fichier/photo : ${acceptsFile ? "champ fichier observé" : "aucun champ fichier trouvé dans les formulaires inspectés"}`
    );
  }

  const proofLines = [
    realisationCount > 0
      ? `${realisationCount} élément(s) de réalisation approximativement identifié(s)`
      : null,
    photoCount > 0 ? `${photoCount} photo(s) observée(s) sur les pages réalisations` : null,
    realisationTitles.length
      ? `Titres de réalisations : ${realisationTitles.join(" ; ")}`
      : null,
    realisationDescriptions.length
      ? `Descriptions/extraits de réalisations : ${realisationDescriptions.join(" ; ")}`
      : null,
    realisationLocations.length
      ? `Localisations explicitement mentionnées : ${realisationLocations.join(" ; ")}`
      : null,
    beforeAfter ? "Mention avant/après observée" : null,
    realisationLinks.length
      ? `Liens de réalisations : ${realisationLinks.join(" ; ")}`
      : null,
    testimonialLinks.length
      ? `Pages de témoignages/avis : ${testimonialLinks.join(" ; ")}`
      : null,
    reassurance.length
      ? `Éléments de réassurance affichés : ${reassurance.join(" ; ")}`
      : null,
    certifications.length
      ? `Certifications ou labels observés : ${certifications.join(" ; ")}`
      : null,
    trustLogos.length ? `Logos de confiance observés : ${trustLogos.join(" ; ")}` : null,
  ].filter((value): value is string => Boolean(value));

  const seoKeys = ["title", "h1", "canonical", "robots_meta"] as const;
  const seoLabels: Record<(typeof seoKeys)[number], string> = {
    title: "title",
    h1: "H1",
    canonical: "canonical",
    robots_meta: "robots meta",
  };
  const seoLines = seoKeys.map((key) => {
    const scoped = observationsFor(observations, key);
    const found = new Set(
      scoped
        .filter((observation) => observation.status === "verified")
        .map((observation) => comparableUrl(observation.url))
    ).size;
    const inspected = new Set(scoped.map((observation) => comparableUrl(observation.url))).size;
    return inspected
      ? `${seoLabels[key]} observé sur ${found}/${inspected} page(s) où cet élément a été recherché`
      : null;
  }).filter((value): value is string => Boolean(value));

  const favourable: string[] = [];
  if (input.dateCreation) favourable.push(`Entreprise créée en ${year(input.dateCreation)}`);
  if (phones.length) favourable.push(`Téléphone visible sur ${new Set(observationsFor(observations, "phone_visible", "verified").map((observation) => observation.url)).size} page(s) inspectée(s)`);
  if (ctas.length) favourable.push(`CTA exacts observés : ${ctas.slice(0, 5).join(" ; ")}`);
  if (certifications.length) favourable.push(`Certifications ou labels observés : ${certifications.join(" ; ")}`);
  if (reassurance.length || testimonialLinks.length) favourable.push(`${reassurance.length + testimonialLinks.length} élément(s) de réassurance observé(s)`);
  if (realisationCount > 0) favourable.push(`${realisationCount} réalisation(s) approximativement identifiée(s), ${realisationDescriptions.length} description(s) et ${photoCount} photo(s) observées`);
  if (realisationLocations.length) favourable.push(`${realisationLocations.length} mention(s) locale(s) trouvée(s) dans les réalisations inspectées`);
  for (const observation of observationsFor(observations, "visible_word_count", "verified")) {
    if (typeof observation.value !== "number" || observation.value < 250) continue;
    const page = selectedPages.find(
      (candidate) => comparableUrl(candidate.url) === comparableUrl(observation.url)
    );
    if (page?.pageType === "service") {
      favourable.push(`Page service « ${pageLabel(page, observation.url)} » : ${observation.value} mots visibles collectés`);
    }
  }

  const toExamine: string[] = [];
  for (const observation of observationsFor(observations, "service_mentions", "verified")) {
    const values = bulletValues(observation.value);
    if (values.length < 4) continue;
    const page = selectedPages.find(
      (candidate) => comparableUrl(candidate.url) === comparableUrl(observation.url)
    );
    toExamine.push(`${values.length} prestations ou spécialités observées sur la page « ${pageLabel(page, observation.url)} »`);
  }
  if (realisationCount > 0 && realisationLocations.length === 0) {
    toExamine.push(`${realisationCount} réalisation(s) inspectée(s), aucune commune trouvée dans les éléments collectés`);
  }
  if (formCount > 0) {
    toExamine.push(
      `Formulaire observé avec les champs : ${formFields.length ? formFields.join(", ") : "aucun libellé exploitable dans le HTML collecté"}`
    );
  }
  if (inspectedUrlCount > 0 && zones.length === 0) {
    toExamine.push(`Zone d'intervention non trouvée dans les ${inspectedUrlCount} page(s) inspectée(s)`);
  }
  for (const observation of observationsFor(observations, "visible_word_count", "verified")) {
    if (typeof observation.value !== "number" || observation.value >= 80) continue;
    const page = selectedPages.find(
      (candidate) => comparableUrl(candidate.url) === comparableUrl(observation.url)
    );
    if (page?.pageType === "service") {
      toExamine.push(`Page service « ${pageLabel(page, observation.url)} » : ${observation.value} mots visibles collectés`);
    }
  }

  const missing: string[] = [];
  if (!latestFinancial || latestFinancial.chiffreAffaires == null) missing.push("CA non disponible");
  if (!input.trancheEffectif) missing.push("Effectif non disponible");
  if (!input.etatAdministratif) missing.push("État administratif non disponible");
  if (!leader) missing.push("Dirigeant non disponible");
  if (!input.siteWeb) missing.push("Aucun domaine connu");
  if (input.siteWeb && input.siteWebStatus === "candidate") missing.push("Domaine candidat non vérifié");
  if (input.siteWeb && input.siteWebStatus === "rejected") missing.push("Domaine testé puis rejeté");
  if (input.siteWebStatus === "verified" && inspectedUrlCount === 0) missing.push("Aucune page inspectée pour le domaine actuel");
  if (input.totalDiscovered != null && input.totalDiscovered > inspectedUrlCount) {
    missing.push(`${inspectedUrlCount} page(s) inspectée(s) sur ${input.totalDiscovered} URL(s) découverte(s)`);
  }
  failedPages.forEach((page) =>
    missing.push(`Page « ${page.title || shortUrl(page.url)} » inaccessible lors de la collecte${page.collectionError ? ` : ${page.collectionError}` : ""}`)
  );
  if (inspectedUrlCount > 0 && zones.length === 0) missing.push("Zone d'intervention non confirmée dans les pages inspectées");
  if (formCount > 0 && formFields.length === 0) missing.push("Formulaire présent mais champs non analysables dans le HTML collecté");

  const failures = unique(
    observations
      .filter((observation) => observation.status === "collection_failed")
      .map((observation) => text(observation.evidence ?? observation.value)),
    10
  );
  const notes = unique(
    [input.notes, ...(input.humanNotes ?? [])]
      .map((note) => note?.trim() ?? "")
      .filter(Boolean),
    20
  );
  const observedAt = observations.length
    ? date(
        [...observations].sort(
          (a, b) =>
            new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
        )[0].observedAt
      )
    : UNKNOWN;
  const complementary = [
    input.formeJuridique ? `Forme juridique : ${input.formeJuridique}` : null,
    `État administratif : ${stateLabel(input.etatAdministratif)}`,
    publicLabels.length ? `Labels publics déclarés : ${publicLabels.join(", ")}` : null,
  ].filter((value): value is string => Boolean(value));
  const missingSection = missing.length
    ? `\n\n## DONNÉES MANQUANTES / INCERTAINES\n\n${bullets(unique(missing, 20), "")}`
    : "";

  return `# DOSSIER PROSPECT — OPALE ACQUISITION

## ENTREPRISE

Nom : ${text(input.denomination)}
SIREN : ${text(input.siren)}
Activité : ${text(input.libelleNaf)}
Code NAF : ${text(input.codeNaf)}
Ville : ${text(input.ville)}
Date de création : ${date(input.dateCreation)}
Effectif : ${text(input.trancheEffectif)}
CA : ${money(latestFinancial?.chiffreAffaires)}
Exercice du CA : ${latestFinancial ? year(latestFinancial.dateCloture) : UNKNOWN}
Résultat / autres données financières pertinentes si disponibles : ${
    latestFinancial
      ? [
          latestFinancial.resultatNet != null ? `Résultat net ${money(latestFinancial.resultatNet)}` : null,
          latestFinancial.ebe != null ? `EBE ${money(latestFinancial.ebe)}` : null,
          latestFinancial.margeBrute != null ? `Marge brute ${money(latestFinancial.margeBrute)}` : null,
        ].filter(Boolean).join(" ; ") || UNKNOWN
      : UNKNOWN
  }

## CONTACT / DÉCIDEUR

Dirigeant : ${leader?.name ?? UNKNOWN}
Fonction : ${leader?.role ?? UNKNOWN}
Téléphone : ${text(input.telephone)}
Email : ${text(input.email)}
Site : ${text(input.siteWeb)}
Statut du site : ${input.siteWebStatus}

## ACTIVITÉ

Activité déclarée : ${text(input.libelleNaf)}
Informations complémentaires utiles : ${complementary.length ? complementary.join(" ; ") : UNKNOWN}
Implantation connue : ${input.ville ? `Siège connu à ${[input.codePostal, input.ville].filter(Boolean).join(" ")}. Zone d'intervention non déduite.` : UNKNOWN}

## PAGES INSPECTÉES

${bullets(pageLines, "Aucune page inspectée")}

## OFFRE OBSERVÉE

${bullets(
    [
      ...services.map((value) => `Prestation ou spécialité : ${value}`),
      ...clientTypes.map((value) => `Type de client mentionné : ${value}`),
      ...zones.map((value) => `Mention géographique : ${value}`),
      ...offerSnippets.slice(0, 6).map((value) => `Extrait : ${value}`),
    ],
    "Aucune observation d'offre disponible dans les pages inspectées"
  )}

## PARCOURS DE CONTACT

${bullets(contactLines, "Aucun élément de contact observé dans les pages inspectées")}

## RÉALISATIONS / PREUVES

${bullets(proofLines, "Aucune preuve ou réalisation observée dans les pages inspectées")}

## SEO / STRUCTURE

${bullets(seoLines, "Aucune observation SEO/structure disponible")}

## FORCES OBSERVÉES

${bullets(unique(favourable, 15), "Aucun fait favorable classé dans les données disponibles")}

## POINTS À EXAMINER

${bullets(unique(toExamine, 15), "Aucune observation descriptive riche classée dans cette rubrique")}${missingSection}

## NOTES COMMERCIALES

${bullets(notes, "Aucune note humaine")}

## PÉRIMÈTRE

- ${inspectedUrlCount} page(s) inspectée(s)${input.totalDiscovered != null ? ` sur ${input.totalDiscovered} URL(s) découverte(s)` : ""}
- Date la plus récente : ${observedAt}
- Erreurs : ${failures.length ? failures.join(" ; ") : "Aucune erreur enregistrée"}
- Limites : sélection bornée à 8 pages ; extraits courts uniquement ; une donnée non trouvée dans ce périmètre n'est pas considérée comme inexistante.`;
}
