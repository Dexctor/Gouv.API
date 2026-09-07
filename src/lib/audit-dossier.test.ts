import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAuditDossier,
  type AuditDossierInput,
  type AuditWebsiteStatus,
} from "./audit-dossier";

function fixture(overrides: Partial<AuditDossierInput> = {}): AuditDossierInput {
  return {
    denomination: "Martin Bâtiment",
    siren: "123456789",
    codeNaf: "43.21A",
    libelleNaf: "Travaux d'installation électrique dans tous locaux",
    ville: "Lille",
    codePostal: "59000",
    dateCreation: "1998-03-12",
    trancheEffectif: "03",
    etatAdministratif: "A",
    formeJuridique: "SAS",
    siteWeb: "https://martin.example/",
    siteWebStatus: "verified",
    email: "contact@martin.example",
    telephone: "01 02 03 04 05",
    notes: "Échange prévu avec la direction.",
    dirigeants: [
      {
        prenoms: "Jeanne",
        nom: "Martin",
        qualite: "Présidente",
        type_dirigeant: "personne physique",
      },
    ],
    labels: { est_rge: true },
    financials: [
      {
        dateCloture: "2025-12-31",
        chiffreAffaires: 750000,
        margeBrute: 300000,
        ebe: 90000,
        resultatNet: 45000,
      },
    ],
    observations: [
      {
        type: "seo_structure",
        key: "title",
        value: "Martin Bâtiment — Électricité",
        source: "homepage_html",
        scope: "homepage:https://martin.example/",
        url: "https://martin.example/",
        observedAt: "2026-09-07T10:00:00.000Z",
        status: "verified",
      },
      {
        type: "seo_structure",
        key: "meta_description",
        value: "Non trouvé",
        source: "homepage_html",
        scope: "homepage:https://martin.example/",
        url: "https://martin.example/",
        observedAt: "2026-09-07T10:00:00.000Z",
        status: "not_found_in_scope",
      },
      {
        type: "navigation",
        key: "pages_identified",
        value: ["https://martin.example/services", "https://martin.example/realisations"],
        source: "homepage_html",
        scope: "homepage:https://martin.example/",
        url: "https://martin.example/",
        observedAt: "2026-09-07T10:00:00.000Z",
        status: "verified",
      },
      {
        type: "activity",
        key: "services_observed",
        value: ["Électricité", "Dépannage"],
        source: "homepage_html",
        scope: "homepage:https://martin.example/",
        url: "https://martin.example/",
        observedAt: "2026-09-07T10:00:00.000Z",
        status: "verified",
      },
      {
        type: "conversion_element",
        key: "forms_count",
        value: 1,
        source: "homepage_html",
        scope: "homepage:https://martin.example/",
        url: "https://martin.example/",
        observedAt: "2026-09-07T10:00:00.000Z",
        status: "verified",
      },
    ],
    ...overrides,
  };
}

test("l'export complet reste factuel, compact et sérialisable", () => {
  const markdown = buildAuditDossier(
    fixture({ humanNotes: ["La dirigeante préfère un contact téléphonique."] })
  );

  assert.match(markdown, /^# DOSSIER PROSPECT — OPALE ACQUISITION/);
  assert.match(markdown, /CA : 750 000 €/);
  assert.match(markdown, /Dirigeant : Jeanne Martin/);
  assert.doesNotMatch(markdown, /## POINTS À EXAMINER[\s\S]*Meta description non trouvée/);
  assert.doesNotMatch(markdown, /undefined|\[object Object\]/);
  assert.doesNotMatch(
    markdown,
    /Google pénalise|vous êtes mal référencé|fort potentiel commercial|vous perdez des clients|site abandonné|dette technique importante|impossible à référencer/i
  );
});

test("CA null reste inconnu et CA égal à zéro reste zéro", () => {
  const unknown = buildAuditDossier(
    fixture({
      financials: [
        { dateCloture: "2025-12-31", chiffreAffaires: null, resultatNet: null },
      ],
    })
  );
  const zero = buildAuditDossier(
    fixture({
      financials: [
        { dateCloture: "2025-12-31", chiffreAffaires: 0, resultatNet: 0 },
      ],
    })
  );

  assert.match(unknown, /CA : Inconnu/);
  assert.match(zero, /CA : 0 €/);
  assert.match(zero, /Résultat net 0 €/);
});

test("les inconnues ne deviennent pas des faits négatifs", () => {
  const markdown = buildAuditDossier(
    fixture({
      trancheEffectif: null,
      etatAdministratif: null,
      dirigeants: null,
      financials: [],
    })
  );

  assert.match(markdown, /Effectif : Inconnu/);
  assert.match(markdown, /État administratif non disponible/);
  assert.doesNotMatch(markdown, /Entreprise cessée/);
  assert.doesNotMatch(markdown, /n'a pas de salariés|n'a pas publié/i);
});

for (const status of [
  "unknown",
  "candidate",
  "verified",
  "rejected",
] as AuditWebsiteStatus[]) {
  test(`le statut de site ${status} est exporté sans extrapolation`, () => {
    const markdown = buildAuditDossier(
      fixture({
        siteWeb: status === "unknown" ? null : "https://candidate.example",
        siteWebStatus: status,
        observations: [],
      })
    );
    assert.match(markdown, new RegExp(`Statut du site : ${status}`));
  });
}

test("un prospect très incomplet produit tout de même un Markdown propre", () => {
  const markdown = buildAuditDossier(
    fixture({
      codeNaf: null,
      libelleNaf: null,
      ville: null,
      codePostal: null,
      dateCreation: null,
      trancheEffectif: null,
      etatAdministratif: null,
      formeJuridique: null,
      siteWeb: null,
      siteWebStatus: "unknown",
      email: null,
      telephone: null,
      notes: null,
      dirigeants: null,
      labels: null,
      financials: [],
      observations: [],
    })
  );

  assert.match(markdown, /CA : Inconnu/);
  assert.match(markdown, /Aucun domaine connu/);
  assert.doesNotMatch(markdown, /undefined|\[object Object\]/);
  assert.doesNotMatch(markdown, /Lille|750 000|Jeanne Martin/);
});

test("les observations d'un domaine rejeté ne sont pas exportées", () => {
  const markdown = buildAuditDossier(
    fixture({ siteWebStatus: "rejected" })
  );

  assert.doesNotMatch(markdown, /Martin Bâtiment — Électricité/);
  assert.match(markdown, /Domaine testé puis rejeté/);
});

test("une valeur objet ne devient jamais [object Object]", () => {
  const markdown = buildAuditDossier(
    fixture({
      observations: [
        {
          type: "seo_structure",
          key: "title",
          value: { raw: "Titre" },
          source: "test",
          scope: "homepage",
          url: "https://martin.example/",
          observedAt: "2026-09-07T10:00:00.000Z",
          status: "verified",
        },
      ],
    })
  );
  assert.doesNotMatch(markdown, /\[object Object\]/);
});

function observation(
  url: string,
  key: string,
  value: unknown,
  status: "verified" | "not_found_in_scope" = "verified"
) {
  return {
    type: "test",
    key,
    value,
    source: "web_page_html",
    scope: "page:test",
    url,
    observedAt: "2026-09-07T10:00:00.000Z",
    status,
  } as const;
}

test("l'export multi-page déduplique téléphone et prestations", () => {
  const home = "https://martin.example/";
  const service = "https://martin.example/couverture";
  const contact = "https://martin.example/contact";
  const realisations = "https://martin.example/realisations";
  const markdown = buildAuditDossier(
    fixture({
      telephone: null,
      totalDiscovered: 34,
      auditPages: [
        { url: home, title: "Accueil", pageType: "home", selected: true, collectionStatus: "collected" },
        { url: service, title: "Couverture", pageType: "service", selected: true, collectionStatus: "collected" },
        { url: contact, title: "Contact", pageType: "contact", selected: true, collectionStatus: "collected" },
        { url: realisations, title: "Réalisations", pageType: "realisations", selected: true, collectionStatus: "collected" },
      ],
      observations: [
        ...[home, service, contact, realisations].flatMap((url) => [
          observation(url, "phone_visible", ["03 20 00 00 00"]),
          observation(url, "title", `Titre ${url}`),
          observation(url, "h1", ["Martin Bâtiment"]),
        ]),
        observation(home, "service_mentions", ["Couverture", "Zinguerie"]),
        observation(service, "service_mentions", ["Couverture", "Zinguerie"]),
        observation(contact, "forms_count", 1),
        observation(contact, "form_fields", ["nom", "téléphone", "email", "message", "photo"]),
        observation(contact, "form_file_upload", true),
        observation(contact, "cta_texts", ["Demander un devis"]),
        observation(realisations, "realisations_approx_count", 12),
        observation(realisations, "realisations_titles", ["Toiture Dupont"]),
        observation(realisations, "realisations_descriptions", ["Réfection complète d'une toiture en ardoise."]),
        observation(realisations, "realisations_photos_count", 24),
        observation(realisations, "realisations_locations", ["Chantier réalisé à Lille"]),
        observation(realisations, "geographic_mentions", ["Chantier réalisé à Lille"]),
      ],
    })
  );

  assert.equal(markdown.match(/03 20 00 00 00/g)?.length, 1);
  assert.equal(markdown.match(/Prestation ou spécialité : Couverture/g)?.length, 1);
  assert.match(markdown, /Formulaires observés : 1 — champs : nom, téléphone, email, message, photo/);
  assert.match(markdown, /Localisations explicitement mentionnées : Chantier réalisé à Lille/);
  assert.match(markdown, /Descriptions\/extraits de réalisations : Réfection complète/);
  assert.match(markdown, /CTA exacts observés : Demander un devis/);
  assert.match(markdown, /4 page\(s\) inspectée\(s\) sur 34 URL\(s\) découverte\(s\)/);
  assert.ok(markdown.length < 12_000);
});

test("une réalisation sans ville reste une observation à examiner", () => {
  const url = "https://martin.example/realisations";
  const markdown = buildAuditDossier(
    fixture({
      auditPages: [
        { url, title: "Réalisations", pageType: "realisations", selected: true, collectionStatus: "collected" },
      ],
      observations: [
        observation(url, "realisations_approx_count", 12),
        observation(url, "realisations_locations", "Non trouvé", "not_found_in_scope"),
      ],
    })
  );

  assert.match(markdown, /12 réalisation\(s\) inspectée\(s\), aucune commune trouvée/);
  assert.doesNotMatch(markdown, /mauvais SEO|faible conversion|perte de clients/i);
});
