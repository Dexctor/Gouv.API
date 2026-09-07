import test from "node:test";
import assert from "node:assert/strict";
import {
  collectAuditPage,
  discoverAuditPages,
  selectRecommendedPages,
  MAX_SELECTED_AUDIT_PAGES,
  type AuditPageCandidate,
} from "./audit-page-collector";

function response(body: string, status = 200, url = ""): Response {
  const result = new Response(body, { status });
  Object.defineProperty(result, "url", { value: url });
  return result;
}

test("la découverte peut ne proposer qu'une page", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("sitemap.xml")) return response("", 404, url);
    return response("<html><body>Accueil</body></html>", 200, "https://example.fr/");
  };
  const result = await discoverAuditPages("https://example.fr", { fetchImpl });
  assert.equal(result.totalDiscovered, 1);
  assert.equal(result.candidates[0]?.pageType, "home");
  assert.equal(result.candidates[0]?.recommended, true);
});

test("les liens internes produisent une sélection multi-page déterministe", async () => {
  const home = `<a href="/couverture">Couverture</a>
    <a href="/zinguerie">Zinguerie</a><a href="/realisations">Réalisations</a>
    <a href="/contact">Contact</a><a href="/mentions-legales">Mentions légales</a>`;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    return url.endsWith("sitemap.xml")
      ? response("", 404, url)
      : response(home, 200, "https://example.fr/");
  };
  const result = await discoverAuditPages("https://example.fr", { fetchImpl });
  const recommended = result.candidates.filter((candidate) => candidate.recommended);
  assert.ok(recommended.some((candidate) => candidate.pageType === "service"));
  assert.ok(recommended.some((candidate) => candidate.pageType === "realisations"));
  assert.equal(
    result.candidates.find((candidate) => candidate.pageType === "legal")?.recommended,
    false
  );
});

test("la présélection est strictement limitée à huit pages", () => {
  const candidates: Array<Omit<AuditPageCandidate, "recommended">> = [
    { url: "https://example.fr/", label: "Accueil", pageType: "home", source: "homepage" },
    ...Array.from({ length: 20 }, (_, index) => ({
      url: `https://example.fr/service-${index}`,
      label: `Service ${index}`,
      pageType: "service" as const,
      source: "sitemap" as const,
    })),
    { url: "https://example.fr/realisations", label: "Réalisations", pageType: "realisations", source: "homepage" },
    { url: "https://example.fr/contact", label: "Contact", pageType: "contact", source: "homepage" },
    { url: "https://example.fr/a-propos", label: "À propos", pageType: "about", source: "homepage" },
  ];
  assert.equal(selectRecommendedPages(candidates).length, MAX_SELECTED_AUDIT_PAGES);
});

test("un sitemap volumineux est compté mais la liste affichable reste bornée", async () => {
  const sitemap = `<urlset>${Array.from(
    { length: 250 },
    (_, index) => `<url><loc>https://example.fr/page-${index}</loc></url>`
  ).join("")}</urlset>`;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    return url.endsWith("sitemap.xml")
      ? response(sitemap, 200, url)
      : response("<html></html>", 200, "https://example.fr/");
  };
  const result = await discoverAuditPages("https://example.fr", { fetchImpl });
  assert.equal(result.totalDiscovered, 251);
  assert.ok(result.candidates.length <= 80);
  assert.ok(result.candidates.filter((candidate) => candidate.recommended).length <= 8);
});

test("une redirection conserve URL demandée et URL finale", async () => {
  const result = await collectAuditPage("https://example.fr/contact", "contact", {
    fetchImpl: async () =>
      response("<html><title>Nous contacter</title><h1>Contact</h1></html>", 200, "https://www.example.fr/nous-contacter"),
  });
  assert.equal(result.requestedUrl, "https://example.fr/contact");
  assert.equal(result.finalUrl, "https://www.example.fr/nous-contacter");
  assert.equal(result.title, "Nous contacter");
});

test("une page inaccessible échoue sans produire de score", async () => {
  const result = await collectAuditPage("https://example.fr/contact", "contact", {
    fetchImpl: async () => response("Indisponible", 503, "https://example.fr/contact"),
  });
  assert.equal(result.status, "collection_failed");
  assert.equal(result.statusCode, 503);
  assert.equal("score" in result, false);
});

test("les champs d'un formulaire et l'envoi de fichier sont observés", async () => {
  const html = `<html><title>Devis</title><body><main><h1>Demande de devis</h1>
    <form><label>Nom</label><input name="nom"><label>Email</label><input type="email" name="email">
    <label>Message</label><textarea name="message"></textarea><label>Photo</label><input type="file" name="photo"></form>
    <button>Envoyer la demande</button></main></body></html>`;
  const result = await collectAuditPage("https://example.fr/devis", "contact", {
    fetchImpl: async () => response(html, 200, "https://example.fr/devis"),
  });
  const fields = result.observations.find((item) => item.key === "form_fields");
  const upload = result.observations.find((item) => item.key === "form_file_upload");
  assert.deepEqual(fields?.value, ["Nom", "Email", "Message", "Photo"]);
  assert.equal(upload?.value, true);
});

test("header et footer ne dupliquent pas les extraits de contenu", async () => {
  const repeated = "Service de couverture présent dans toute la région.";
  const html = `<header><p>${repeated}</p><a href="tel:0320000000">Téléphone</a></header>
    <main><h1>Couverture</h1><p>${repeated}</p></main>
    <footer><p>${repeated}</p><a href="tel:0320000000">Téléphone</a></footer>`;
  const result = await collectAuditPage("https://example.fr/couverture", "service", {
    fetchImpl: async () => response(html, 200, "https://example.fr/couverture"),
  });
  const snippets = result.observations.find((item) => item.key === "content_snippets");
  const phones = result.observations.find((item) => item.key === "phone_visible");
  assert.deepEqual(snippets?.value, [repeated]);
  assert.deepEqual(phones?.value, ["0320000000"]);
});

test("une réalisation avec ville conserve l'extrait et une réalisation sans ville reste scoped", async () => {
  const withCity = await collectAuditPage(
    "https://example.fr/realisations",
    "realisations",
    {
      fetchImpl: async () =>
        response(
          `<main><h1>Réalisations</h1><article><h2>Toiture Dupont</h2><p>Chantier de couverture réalisé à Lille en 2025.</p><img src="a.jpg"></article></main>`,
          200,
          "https://example.fr/realisations"
        ),
    }
  );
  const withoutCity = await collectAuditPage(
    "https://example.fr/projets",
    "realisations",
    {
      fetchImpl: async () =>
        response(
          `<main><h1>Projets</h1><article><h2>Toiture en ardoise</h2><p>Réfection complète avec isolation.</p></article></main>`,
          200,
          "https://example.fr/projets"
        ),
    }
  );
  const locations = withCity.observations.find((item) => item.key === "realisations_locations");
  const missing = withoutCity.observations.find((item) => item.key === "realisations_locations");
  assert.match(String((locations?.value as string[])[0]), /Lille/);
  assert.equal(missing?.status, "not_found_in_scope");
});

test("le collecteur ne génère aucune interprétation commerciale", async () => {
  const result = await collectAuditPage("https://example.fr/", "home", {
    fetchImpl: async () => response("<main><h1>Accueil</h1><p>Service de couverture.</p></main>", 200, "https://example.fr/"),
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(
    serialized,
    /perte de clients|mauvais SEO|faible conversion|potentiel commercial|Google pénalise/i
  );
});
