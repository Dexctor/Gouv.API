"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, RotateCcw } from "lucide-react";

const TRANCHES_EFFECTIF = [
  { value: "00", label: "0 salarié" },
  { value: "01", label: "1-2 salariés" },
  { value: "02", label: "3-5 salariés" },
  { value: "03", label: "6-9 salariés" },
  { value: "11", label: "10-19 salariés" },
  { value: "12", label: "20-49 salariés" },
  { value: "21", label: "50-99 salariés" },
  { value: "22", label: "100-199 salariés" },
  { value: "31", label: "200-249 salariés" },
  { value: "32", label: "250-499 salariés" },
];

const FORMES_JURIDIQUES = [
  { value: "5710", label: "SAS" },
  { value: "5499", label: "SARL" },
  { value: "5498", label: "EURL" },
  { value: "5599", label: "SA" },
  { value: "1000", label: "Entrepreneur individuel" },
  { value: "6540", label: "SCI" },
];

const ETATS = ["A", "F"] as const;

export const searchParsers = {
  q: parseAsString.withDefault(""),
  cp: parseAsString.withDefault(""),
  naf: parseAsArrayOf(parseAsString).withDefault([]),
  effectif: parseAsArrayOf(parseAsString).withDefault([]),
  forme: parseAsString.withDefault(""),
  etat: parseAsStringLiteral(ETATS).withDefault("A"),
  page: parseAsInteger.withDefault(1),
};

// Option par défaut : écritures nuqs en "shallow" (pas de re-render serveur pendant la frappe).
// Le click "Rechercher" force shallow:false pour déclencher le Server Component.
const SHALLOW = { shallow: true } as const;
const COMMIT = { shallow: false } as const;

export function SearchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useQueryState("q", searchParsers.q.withOptions(SHALLOW));
  const [cp, setCp] = useQueryState(
    "cp",
    searchParsers.cp.withOptions(SHALLOW)
  );
  const [naf, setNaf] = useQueryState(
    "naf",
    searchParsers.naf.withOptions(SHALLOW)
  );
  const [effectif, setEffectif] = useQueryState(
    "effectif",
    searchParsers.effectif.withOptions(SHALLOW)
  );
  const [forme, setForme] = useQueryState(
    "forme",
    searchParsers.forme.withOptions(SHALLOW)
  );
  const [etat, setEtat] = useQueryState(
    "etat",
    searchParsers.etat.withOptions(SHALLOW)
  );
  const [, setPage] = useQueryState(
    "page",
    searchParsers.page.withOptions(COMMIT)
  );

  // Soumission : on force l'écriture URL avec shallow:false + un refresh pour
  // redéclencher le Server Component Results.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await Promise.all([
        setQ(q || null, COMMIT),
        setCp(cp || null, COMMIT),
        setNaf(naf.length ? naf : null, COMMIT),
        setEffectif(effectif.length ? effectif : null, COMMIT),
        setForme(forme || null, COMMIT),
        setEtat(etat, COMMIT),
        setPage(1, COMMIT),
      ]);
      router.refresh();
    });
  };

  const reset = () => {
    startTransition(async () => {
      await Promise.all([
        setQ(null, COMMIT),
        setCp(null, COMMIT),
        setNaf(null, COMMIT),
        setEffectif(null, COMMIT),
        setForme(null, COMMIT),
        setEtat("A", COMMIT),
        setPage(1, COMMIT),
      ]);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-border/60 bg-card/40 p-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="q">Recherche textuelle</Label>
          <Input
            id="q"
            name="q"
            placeholder="Dénomination, SIREN, dirigeant..."
            value={q}
            onChange={(e) => void setQ(e.target.value || null)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp">Code postal</Label>
          <Input
            id="cp"
            name="cp"
            inputMode="numeric"
            maxLength={5}
            placeholder="59140"
            value={cp}
            onChange={(e) => void setCp(e.target.value || null)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="naf">Code NAF</Label>
          <Input
            id="naf"
            name="naf"
            placeholder="56.10A"
            value={naf[0] ?? ""}
            onChange={(e) =>
              void setNaf(e.target.value ? ([e.target.value] as string[]) : [])
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effectif">Tranche effectif</Label>
          <Select
            value={effectif[0] ?? "all"}
            onValueChange={(v) =>
              void setEffectif(v === "all" ? [] : ([v] as string[]))
            }
          >
            <SelectTrigger id="effectif">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {TRANCHES_EFFECTIF.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="etat">État</Label>
          <Select value={etat} onValueChange={(v) => void setEtat(v as "A" | "F")}>
            <SelectTrigger id="etat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Actif</SelectItem>
              <SelectItem value="F">Fermé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="forme">Forme juridique</Label>
          <Select
            value={forme || "all"}
            onValueChange={(v) => void setForme(v === "all" ? "" : v)}
          >
            <SelectTrigger id="forme">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {FORMES_JURIDIQUES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 md:col-span-4 md:justify-end">
          <Button type="button" variant="outline" onClick={reset} disabled={isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Rechercher
          </Button>
        </div>
      </div>
    </form>
  );
}

// Re-export pour consommation côté serveur
export function useSearchFilters() {
  return useQueryStates(searchParsers);
}
