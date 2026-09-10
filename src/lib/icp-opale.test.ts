import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIcp } from "./icp-opale";

test("un état administratif inconnu n'est pas assimilé à une cessation", () => {
  const result = evaluateIcp({
    ca: null,
    trancheEffectif: null,
    sectionNaf: "F",
    codeNaf: "43.21A",
    codePostal: null,
    siteWeb: null,
    siteWebStatus: "unknown",
    etatAdministratif: null,
  });

  assert.equal(result.negatives.includes("Entreprise cessée"), false);
});

test("un domaine candidat ne permet pas encore une collecte", () => {
  const result = evaluateIcp({
    ca: 900000,
    trancheEffectif: "03",
    sectionNaf: "F",
    codeNaf: "43.21A",
    codePostal: "59000",
    siteWeb: "https://candidate.example",
    siteWebStatus: "candidate",
    etatAdministratif: "A",
  });

  assert.equal(result.details.hasSite, true);
  assert.equal(result.details.siteVerified, false);
  assert.equal(result.positives.includes("Domaine vérifié (collecte possible)"), false);
});

test("le cœur 3-9 salariés passe devant la tranche 10-19 sans inventer la borne 15", () => {
  const common = {
    ca: 500000,
    sectionNaf: "F",
    codeNaf: "43.21A",
    codePostal: "59140",
    siteWeb: null,
    siteWebStatus: "unknown" as const,
    etatAdministratif: "A",
  };
  const core = evaluateIcp({ ...common, trancheEffectif: "03" });
  const broad = evaluateIcp({ ...common, trancheEffectif: "11" });

  assert.ok(core.score > broad.score);
  assert.ok(broad.positives.some((value) => value.includes("vérifier")));
});

test("une hypothèse sectorielle ne remplace pas une donnée de CA inconnue", () => {
  const result = evaluateIcp({
    ca: null,
    trancheEffectif: "03",
    sectionNaf: "F",
    codeNaf: "43.21A",
    codePostal: "59140",
    siteWeb: null,
    siteWebStatus: "unknown",
    etatAdministratif: "A",
  });

  assert.equal(result.details.caSource, "inconnu");
  assert.ok(result.signals.length > 0);
  assert.ok(result.score < 60);
});
