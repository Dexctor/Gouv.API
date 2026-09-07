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
