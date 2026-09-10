import test from "node:test";
import assert from "node:assert/strict";
import type { EnrichedCompany } from "@/actions/search";
import type { CompanySiege } from "./api/recherche-entreprises";
import { TRADE_PRESETS, tradeForCode } from "./search-presets";
import {
  EMPTY_SEARCH,
  buildSearchFilters,
  readSearchState,
  searchHref,
  parseAmount,
} from "./search-state";
import {
  rankCompanies,
  sortCompanies,
  matchedLocation,
  matchesDirectSearch,
} from "./search-ranking";
import { numericLocation, resolveSearchLocation } from "./search-location";
import { findNaf } from "./naf-lookup";
import { formatSearchEuro } from "./search-format";

test("les montants compacts ne dépendent pas de la version ICU du navigateur", () => {
  assert.equal(formatSearchEuro(620000), "620 k€");
  assert.equal(formatSearchEuro(35000), "35 k€");
  assert.equal(formatSearchEuro(1500000), "1,5 M€");
  assert.equal(formatSearchEuro(-3000), "-3 k€");
  assert.equal(formatSearchEuro(0), "0 €");
  assert.equal(formatSearchEuro(null), "—");
});

const location = (overrides: Partial<CompanySiege> = {}): CompanySiege => ({
  siret: "12345678900001",
  adresse: "",
  code_postal: "59240",
  commune: "59183",
  libelle_commune: "Dunkerque",
  departement: "59",
  region: "32",
  ...overrides,
});
const company = (
  overrides: Partial<EnrichedCompany> = {},
): EnrichedCompany => ({
  siren: "123456789",
  nom_complet: "Entreprise exemple",
  activite_principale: "43.22A",
  section_activite_principale: "F",
  date_creation: "2010-01-01",
  nature_juridique: "5499",
  etat_administratif: "A",
  nombre_etablissements: 1,
  nombre_etablissements_ouverts: 1,
  siege: location(),
  ...overrides,
});

test("les dix métiers utilisent exclusivement le référentiel NAF embarqué", () => {
  assert.equal(TRADE_PRESETS.length, 10);
  for (const preset of TRADE_PRESETS) {
    assert.ok(preset.codes.length);
    for (const code of preset.codes) assert.ok(findNaf(code), code);
  }
  assert.equal(tradeForCode("4322B")?.id, "plomberie");
  assert.equal(tradeForCode("41.10A"), undefined);
  assert.deepEqual(
    TRADE_PRESETS.find((preset) => preset.id === "avocats")?.codes,
    ["69.10Z"],
  );
  assert.match(
    TRADE_PRESETS.find((preset) => preset.id === "avocats")!.description,
    /notaires/,
  );
});
test("un preset se combine avec nom, ville, plusieurs effectifs et bornes de CA", () => {
  const state = {
    ...EMPTY_SEARCH,
    q: "Dupont",
    cp: "Dunkerque",
    trade: "plomberie",
    effectif: ["02", "03"],
    caMin: "300k",
    caMax: "1,5M",
    rge: true,
  };
  const filters = buildSearchFilters(state);
  assert.deepEqual(filters.activite_principale, ["43.22A", "43.22B"]);
  assert.deepEqual(filters.tranche_effectif_salarie, ["02", "03"]);
  assert.equal(filters.q, "Dupont");
  assert.equal(filters.ca_min, 300000);
  assert.equal(filters.ca_max, 1500000);
  assert.equal(filters.est_rge, true);
  assert.equal(state.cp, "Dunkerque");
});
test("les bornes nulles, null et zéro gardent des sens distincts", () => {
  assert.equal(parseAmount(""), undefined);
  assert.equal(parseAmount("0"), 0);
  assert.equal(buildSearchFilters({ ...EMPTY_SEARCH, caMax: "0" }).ca_max, 0);
  assert.throws(() => parseAmount("abc"));
  assert.throws(() => parseAmount("-1"));
  assert.throws(() =>
    buildSearchFilters({ ...EMPTY_SEARCH, caMin: "800k", caMax: "300k" }),
  );
});
test("les codes NAF affinent un métier sans l'élargir silencieusement", () => {
  assert.deepEqual(
    buildSearchFilters({ ...EMPTY_SEARCH, trade: "btp", naf: ["4322A"] })
      .activite_principale,
    ["43.22A"],
  );
  assert.throws(() =>
    buildSearchFilters({
      ...EMPTY_SEARCH,
      trade: "plomberie",
      naf: ["69.10Z"],
    }),
  );
  assert.throws(() => buildSearchFilters({ ...EMPTY_SEARCH, naf: ["99.99X"] }));
});
test("Nord et zone multi-département ne sont pas envoyés comme codes postaux", () => {
  assert.deepEqual(numericLocation("59, 62"), { departement: "59,62" });
  assert.deepEqual(numericLocation("59240,59140"), {
    code_postal: "59240,59140",
  });
  assert.deepEqual(numericLocation("2a"), { departement: "2A" });
  assert.throws(() => numericLocation("592"));
});
test("la correspondance exacte de dénomination prime, sans avantage lié au CA", () => {
  const unknown = company({ nom_complet: "Électricité Dupont", lastCA: null });
  const rich = company({
    siren: "999999999",
    nom_complet: "Electricite Dupont Services",
    lastCA: { year: "2025", ca: 2000000, resultat_net: null },
  });
  assert.equal(
    rankCompanies([rich, unknown], { q: "electricite dupont" })[0],
    unknown,
  );
  assert.deepEqual(rankCompanies([unknown, rich], {}), [unknown, rich]);
  assert.deepEqual(rankCompanies([rich, unknown], {}), [rich, unknown]);
});
test("le tri numérique conserve zéro et place les inconnues à la fin dans les deux sens", () => {
  const zero = company({
    siren: "000000000",
    lastCA: { year: "2025", ca: 0, resultat_net: null },
  });
  const unknown = company();
  const positive = company({
    siren: "222222222",
    cache: {
      dernierCA: 120000,
      dernierEBE: null,
      dernierResultat: null,
      derniereMarge: null,
      dateDernierBilan: null,
    },
  });
  assert.deepEqual(sortCompanies([unknown, positive, zero], "ca-asc"), [
    zero,
    positive,
    unknown,
  ]);
  assert.deepEqual(sortCompanies([unknown, positive, zero], "ca-desc"), [
    positive,
    zero,
    unknown,
  ]);
});
test("l'âge invalide et l'effectif inconnu ne deviennent pas zéro", () => {
  const old = company({
    date_creation: "1990-01-01",
    tranche_effectif_salarie: "03",
  });
  const recent = company({
    date_creation: "2020-01-01",
    tranche_effectif_salarie: "01",
  });
  const unknown = company({
    date_creation: "invalid",
    tranche_effectif_salarie: null,
  });
  assert.deepEqual(sortCompanies([unknown, recent, old], "age-desc"), [
    old,
    recent,
    unknown,
  ]);
  assert.deepEqual(sortCompanies([old, unknown, recent], "staff-asc"), [
    recent,
    old,
    unknown,
  ]);
});
test("la ville affichée correspond à l'établissement local, même avec un siège ailleurs", () => {
  const local = location({ siret: "12345678900002" });
  const c = company({
    siege: location({
      code_postal: "75001",
      commune: "75101",
      departement: "75",
      region: "11",
    }),
    matching_etablissements: [local],
  });
  assert.equal(
    matchedLocation(c, { code_commune: "59183", region: "32" }),
    local,
  );
  assert.equal(
    matchedLocation(c, { code_postal: "59240", region: "11" }),
    undefined,
  );
});
test("une recherche directe SIREN respecte les filtres ignorés par l'API", () => {
  const c = company();
  assert.equal(
    matchesDirectSearch(c, { q: c.siren, code_postal: "75001" }),
    false,
  );
  assert.equal(
    matchesDirectSearch(c, { q: c.siren, etat_administratif: "C" }),
    false,
  );
  assert.equal(
    matchesDirectSearch(c, { q: c.siren, activite_principale: ["69.10Z"] }),
    false,
  );
  assert.equal(matchesDirectSearch(c, { q: c.siren, ca_min: 0 }), false);
  assert.equal(
    matchesDirectSearch(c, { q: c.siren, code_postal: "59240" }),
    true,
  );
});
test("un établissement local ouvert prime sur une ancienne adresse fermée", () => {
  const closed = location({ siret: "12345678900002", etat_administratif: "F" });
  const open = location({ siret: "12345678900003", etat_administratif: "A" });
  const c = company({
    siege: location({ commune: "75056" }),
    matching_etablissements: [closed, open],
  });
  assert.equal(matchedLocation(c, { code_commune: "59183" }), open);
});
test("les liens de pagination préservent tous les critères et le tri", () => {
  const state = {
    ...EMPTY_SEARCH,
    q: "A & B",
    cp: "59,62",
    trade: "btp",
    effectif: ["02", "03"],
    caMin: "0",
    etat: "all",
    rge: true,
  };
  const url = new URL(searchHref(state, 3, "ca-desc"), "http://localhost");
  assert.deepEqual(
    readSearchState(Object.fromEntries(url.searchParams)),
    state,
  );
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("sort"), "ca-desc");
  assert.equal(new URL(searchHref(state), url).searchParams.has("page"), false);
});
test("la résolution de commune utilise la BAN et refuse les homonymes ambigus", async (t) => {
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request) => {
      assert.match(String(url), /type=municipality/);
      return new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                city: "Dunkerque",
                citycode: "59183",
                postcode: "59240",
              },
            },
          ],
        }),
      );
    },
  );
  assert.deepEqual(await resolveSearchLocation("Dunkerque"), {
    code_commune: "59183",
  });
  mock.mock.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                city: "Saint-Denis",
                citycode: "93066",
                postcode: "93200",
              },
            },
            {
              properties: {
                city: "Saint-Denis",
                citycode: "97411",
                postcode: "97400",
              },
            },
          ],
        }),
      ),
  );
  await assert.rejects(
    resolveSearchLocation("Saint-Denis"),
    /Plusieurs communes/,
  );
});


test("une recherche directe ne dépend pas d’un enrichissement financier précédent", () => {
  const raw = company();
  const cached = company({ cache: { dernierCA: 500000, derniereMarge: null, dernierEBE: null, dernierResultat: null, dateDernierBilan: null } });
  const filters = { q: raw.siren, ca_min: 300000, ca_max: 800000 };
  assert.equal(matchesDirectSearch(raw, filters), false);
  assert.equal(matchesDirectSearch(cached, filters), false);
  assert.equal(matchesDirectSearch(company({ finances: { "2025": { ca: 500000 } } }), filters), true);
});

test("les choix équivalents produisent la même URL et réinitialisent la page", () => {
  const a = { ...EMPTY_SEARCH, q: "  Dupont  ", naf: ["4391B", "43.91B"], effectif: ["03", "02", "03"] };
  const b = { ...EMPTY_SEARCH, q: "Dupont", naf: ["43.91B"], effectif: ["02", "03"] };
  assert.equal(searchHref(a), searchHref(b));
  assert.deepEqual(buildSearchFilters(a), buildSearchFilters(b));
  assert.equal(new URL(searchHref(a), "http://localhost").searchParams.has("page"), false);
});

test("commune, métier, effectif et CA atteignent ensemble la requête serveur", async (t) => {
  const { searchCompanies } = await import("./api/recherche-entreprises");
  const seen: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    seen.push(url);
    return new Response(JSON.stringify(url.pathname.includes("search/")
      ? { features: [{ properties: { city: "Coudekerque-Branche", citycode: "59155", postcode: "59210" } }] }
      : { results: [], total_results: 0, page: 1, per_page: 25, total_pages: 0 }));
  });
  const filters = { ...buildSearchFilters({ ...EMPTY_SEARCH, trade: "couverture", effectif: ["03", "02"], caMin: "300k", caMax: "800k" }), ...await resolveSearchLocation("  COUDÉKERQUE branche ") };
  const result = await searchCompanies(filters);
  assert.equal(result.total_results, 0);
  const query = seen.at(-1)!.searchParams;
  assert.equal(query.get("code_commune"), "59155");
  assert.equal(query.get("activite_principale"), "43.91B,43.99A");
  assert.equal(query.get("tranche_effectif_salarie"), "02,03");
  assert.equal(query.get("ca_min"), "300000");
  assert.equal(query.get("ca_max"), "800000");
  assert.equal(query.get("etat_administratif"), "A");
});

test("erreurs HTTP, délais et réponses incohérentes ne deviennent jamais zéro résultat", async (t) => {
  const { searchCompanies, validateSearchResponse } = await import("./api/recherche-entreprises");
  const zero = { results: [], total_results: 0, page: 1, per_page: 25, total_pages: 0 };
  assert.deepEqual(validateSearchResponse(zero), zero);
  assert.throws(() => validateSearchResponse({ ...zero, total_results: 8, total_pages: 1 }), /incohérente/);
  assert.throws(() => validateSearchResponse({}), /incohérente/);
  // An empty page beyond the total is distinct from an empty search.
  assert.equal(validateSearchResponse({ ...zero, total_results: 8, total_pages: 1, page: 2 }).total_results, 8);
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(searchCompanies({}), /HTTP 503/);
  await assert.rejects(resolveSearchLocation("Dunkerque"), /localisation indisponible/);
  mock.mock.mockImplementation(async () => { throw new DOMException("Timeout", "TimeoutError"); });
  await assert.rejects(searchCompanies({}), /15 secondes/);
  mock.mock.mockImplementation(async () => { throw new DOMException("Cancelled", "AbortError"); });
  await assert.rejects(searchCompanies({}), /annulée/);
});
