"use client";

import { useTransition } from "react";
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

export function SearchForm() {
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useQueryState("q", searchParsers.q);
  const [cp, setCp] = useQueryState("cp", searchParsers.cp);
  const [naf, setNaf] = useQueryState("naf", searchParsers.naf);
  const [effectif, setEffectif] = useQueryState("effectif", searchParsers.effectif);
  const [forme, setForme] = useQueryState("forme", searchParsers.forme);
  const [etat, setEtat] = useQueryState("etat", searchParsers.etat);
  const [, setPage] = useQueryState("page", searchParsers.page);

  // État local miroir (pour ne pas polluer l'URL à chaque frappe)
  const [localQ, setLocalQ] = [q, setQ];
  const [localCp, setLocalCp] = [cp, setCp];
  const [localNaf, setLocalNaf] = [naf, setNaf];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      void setPage(1);
    });
  };

  const reset = () => {
    startTransition(() => {
      void setQ("");
      void setCp("");
      void setNaf([]);
      void setEffectif([]);
      void setForme("");
      void setEtat("A");
      void setPage(1);
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
            value={localQ}
            onChange={(e) => void setLocalQ(e.target.value || null)}
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
            value={localCp}
            onChange={(e) => void setLocalCp(e.target.value || null)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="naf">Code NAF</Label>
          <Input
            id="naf"
            name="naf"
            placeholder="56.10A"
            value={localNaf[0] ?? ""}
            onChange={(e) =>
              void setLocalNaf(e.target.value ? ([e.target.value] as string[]) : [])
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
