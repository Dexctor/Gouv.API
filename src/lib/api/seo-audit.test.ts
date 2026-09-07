import test from "node:test";
import assert from "node:assert/strict";
import { collectWebObservations } from "./seo-audit";

const NOW = () => new Date("2026-09-07T10:00:00.000Z");

function response(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

test("un timeout devient collection_failed sans score artificiel", async () => {
  const timeoutFetch: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });

  const result = await collectWebObservations("https://example.fr", {
    fetchImpl: timeoutFetch,
    timeoutMs: 1,
    now: NOW,
  });

  assert.equal(result.status, "collection_failed");
  assert.equal(result.observations[0]?.status, "collection_failed");
  assert.equal("score" in result, false);
});

test("une réponse 403 est une collecte échouée", async () => {
  const result = await collectWebObservations("https://example.fr", {
    fetchImpl: async () => response("Interdit", 403),
    now: NOW,
  });

  assert.equal(result.status, "collection_failed");
  assert.equal(result.statusCode, 403);
  assert.equal(result.observations[0]?.value, 403);
});

test("une page vide conserve le périmètre de l'absence", async () => {
  const result = await collectWebObservations("https://example.fr", {
    fetchImpl: async () => response(""),
    now: NOW,
  });

  assert.equal(result.status, "completed");
  const empty = result.observations.find((item) => item.key === "page_content");
  assert.equal(empty?.status, "not_found_in_scope");
  assert.equal(empty?.scope, "homepage");
});

test("les éléments présents deviennent des observations vérifiées", async () => {
  const html = `<!doctype html><html><head>
    <title>Entreprise Martin</title>
    <meta name="description" content="Présentation factuelle de Martin">
    <link rel="canonical" href="/">
  </head><body>
    <h1>Entreprise Martin</h1>
    <h2>Nos prestations</h2>
    <a href="/services">Nos services</a>
    <a href="/realisations">Réalisations</a>
    <a href="tel:0102030405">01 02 03 04 05</a>
    <button>Demander un devis</button>
    <form><input name="email"></form>
  </body></html>`;
  const result = await collectWebObservations("https://example.fr", {
    fetchImpl: async () => response(html),
    now: NOW,
  });

  const title = result.observations.find((item) => item.key === "title");
  const forms = result.observations.find((item) => item.key === "forms_count");
  assert.equal(title?.status, "verified");
  assert.equal(title?.value, "Entreprise Martin");
  assert.equal(forms?.value, 1);
});

test("une donnée non trouvée reste limitée à la homepage", async () => {
  const result = await collectWebObservations("https://example.fr", {
    fetchImpl: async () => response("<html><body><h1>Accueil</h1></body></html>"),
    now: NOW,
  });

  const description = result.observations.find(
    (item) => item.key === "meta_description"
  );
  assert.equal(description?.status, "not_found_in_scope");
  assert.equal(description?.scope, "homepage");
  assert.notEqual(description?.status, "unknown");
});
