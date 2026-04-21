// Helper server-safe (SSC compatible) pour traduire un code NAF en libellé.
// Le JSON est chargé une fois au build, pas de fetch runtime.
import nafCodes from "./naf-codes.json";

interface NafCode {
  code: string;
  libelle: string;
}

const CODES: NafCode[] = nafCodes as NafCode[];

// Index O(1) par code normalisé (sans le point : "5610A" et "56.10A" matchent)
const INDEX = new Map<string, NafCode>();
for (const c of CODES) {
  INDEX.set(c.code, c);
  INDEX.set(c.code.replace(".", ""), c);
}

export function findNaf(code: string | null | undefined): NafCode | null {
  if (!code) return null;
  return INDEX.get(code) ?? INDEX.get(code.replace(".", "")) ?? null;
}

export function nafLabel(code: string | null | undefined): string {
  const found = findNaf(code);
  if (!found) return code ?? "—";
  return found.libelle;
}

export function nafCodeAndLabel(code: string | null | undefined): string {
  const found = findNaf(code);
  if (!found) return code ?? "—";
  return `${found.code} — ${found.libelle}`;
}
