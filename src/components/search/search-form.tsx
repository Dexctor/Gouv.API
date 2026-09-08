"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  TRANCHE_EFFECTIF_LABELS,
  TRANCHE_EFFECTIF_MEDIAN,
  NAF_SECTIONS,
  NATURE_JURIDIQUE_LABELS,
} from "@/lib/insee-labels";
import { TRADE_PRESETS } from "@/lib/search-presets";
import {
  EMPTY_SEARCH,
  buildSearchFilters,
  searchHref,
  type SearchState,
} from "@/lib/search-state";
import { NafSelector } from "./naf-selector";

const selectClass =
  "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export function SearchForm({ initial }: { initial: SearchState }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof SearchState>(key: K, value: SearchState[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const preset = TRADE_PRESETS.find((item) => item.id === draft.trade);
  const toggleStaff = (code: string) =>
    set(
      "effectif",
      draft.effectif.includes(code)
        ? draft.effectif.filter((item) => item !== code)
        : [...draft.effectif, code],
    );
  const applyTrade = (id: string) => {
    setDraft((current) => ({
      ...current,
      trade: current.trade === id ? "" : id,
      naf: [],
      section: "",
    }));
    setError("");
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      buildSearchFilters(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vérifiez vos filtres.");
      return;
    }
    startTransition(() => {
      const href = searchHref(draft);
      if (href === `${pathname}?${searchParams}`) router.refresh();
      else router.push(href, { scroll: false });
    });
  };
  const reset = () => {
    setDraft({ ...EMPTY_SEARCH });
    setError("");
    startTransition(() => router.push("/search", { scroll: false }));
  };
  return (
    <form
      onSubmit={submit}
      aria-label="Recherche d’entreprises"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <fieldset disabled={pending} className="min-w-0 space-y-3 p-4">
        <legend className="sr-only">Critères de recherche</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="search-name">Nom de l’entreprise</Label>
            <Input
              id="search-name"
              className="h-10"
              value={draft.q}
              onChange={(event) => set("q", event.target.value)}
              placeholder="Raison sociale, nom commercial ou SIREN"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="search-location">
              Ville, code postal ou département
            </Label>
            <Input
              id="search-location"
              className="h-10"
              value={draft.cp}
              onChange={(event) => set("cp", event.target.value)}
              placeholder="Dunkerque, 59240 ou 59, 62"
              aria-describedby="location-help"
            />
            <p id="location-help" className="text-xs text-muted-foreground">
              Commune entière par son nom · plusieurs codes séparés par une
              virgule.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Métier à prospecter</Label>
            <span className="text-xs text-muted-foreground">
              Combinable avec tous vos critères
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TRADE_PRESETS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                className="min-h-8 aria-pressed:border-primary/60 aria-pressed:bg-primary/15 aria-pressed:text-foreground"
                variant={draft.trade === item.id ? "secondary" : "outline"}
                aria-pressed={draft.trade === item.id}
                title={item.description}
                onClick={() => applyTrade(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {preset && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Périmètre :</span>{" "}
              {preset.description}
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Effectif salarié</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-between font-normal"
                    aria-label="Choisir les tranches d’effectif"
                  >
                    {draft.effectif.length
                      ? `${draft.effectif.length} tranche${draft.effectif.length > 1 ? "s" : ""} sélectionnée${draft.effectif.length > 1 ? "s" : ""}`
                      : "Tous les effectifs"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                }
              />
              <PopoverContent
                align="start"
                className="max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto p-3"
              >
                <div className="mb-3 flex gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => set("effectif", ["02", "03", "11", "12"])}
                  >
                    3–49 salariés
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => set("effectif", [])}
                  >
                    Tout effacer
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(TRANCHE_EFFECTIF_LABELS)
                    .sort(
                      ([a], [b]) =>
                        TRANCHE_EFFECTIF_MEDIAN[a] - TRANCHE_EFFECTIF_MEDIAN[b],
                    )
                    .map(([code, label]) => (
                      <label
                        key={code}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={draft.effectif.includes(code)}
                          onCheckedChange={() => toggleStaff(code)}
                        />
                        {label}
                      </label>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="search-ca-min">CA minimum (€)</Label>
            <Input
              id="search-ca-min"
              className="h-10"
              value={draft.caMin}
              onChange={(event) => set("caMin", event.target.value)}
              placeholder="300k"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="search-ca-max">CA maximum (€)</Label>
            <Input
              id="search-ca-max"
              className="h-10"
              value={draft.caMax}
              onChange={(event) => set("caMax", event.target.value)}
              placeholder="800k"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="search-state">État administratif</Label>
            <select
              id="search-state"
              className={selectClass}
              value={draft.etat}
              onChange={(event) => set("etat", event.target.value)}
            >
              <option value="A">Actives</option>
              <option value="C">Cessées</option>
              <option value="all">Tous les états</option>
            </select>
          </div>
        </div>
        {(draft.caMin || draft.caMax) && (
          <p className="text-xs text-muted-foreground">
            Un filtre de CA retient les entreprises dont le CA est connu dans la
            source de recherche. Un CA inconnu n’est jamais assimilé à zéro.
          </p>
        )}
        {draft.effectif.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Effectifs :{" "}
            {draft.effectif
              .map((code) => TRANCHE_EFFECTIF_LABELS[code])
              .join(" · ")}
            . Tranches INSEE, sans estimation d’un effectif exact.
          </p>
        )}
        <details className="border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Filtres avancés
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Activité ou codes NAF précis</Label>
              <NafSelector
                value={draft.naf}
                onChange={(codes) => set("naf", codes)}
                placeholder="Activité, métier ou code NAF"
              />
              {preset && (
                <p className="text-xs text-muted-foreground">
                  Les codes précis affinent le métier sélectionné.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-section">Secteur d’activité</Label>
              <select
                id="search-section"
                className={selectClass}
                value={draft.section}
                onChange={(event) => set("section", event.target.value)}
              >
                <option value="">Tous les secteurs</option>
                {NAF_SECTIONS.map((section) => (
                  <option key={section.code} value={section.code}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-region">Zone régionale</Label>
              <select
                id="search-region"
                className={selectClass}
                value={draft.region}
                onChange={(event) => set("region", event.target.value)}
              >
                <option value="">Toutes les régions</option>
                <option value="32">Hauts-de-France</option>
                <option value="11">Île-de-France</option>
                <option value="28">Normandie</option>
                <option value="44">Grand Est</option>
                {draft.region &&
                  !["32", "11", "28", "44"].includes(draft.region) && (
                    <option value={draft.region}>Région {draft.region}</option>
                  )}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-legal">Forme juridique</Label>
              <select
                id="search-legal"
                className={selectClass}
                value={draft.forme}
                onChange={(event) => set("forme", event.target.value)}
              >
                <option value="">Toutes les formes</option>
                {Object.entries(NATURE_JURIDIQUE_LABELS).map(
                  ([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Catégorie d’entreprise</Label>
              <div className="flex flex-wrap gap-3">
                {["PME", "ETI", "GE"].map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={draft.categorie.includes(category)}
                      onCheckedChange={() =>
                        set(
                          "categorie",
                          draft.categorie.includes(category)
                            ? draft.categorie.filter(
                                (item) => item !== category,
                              )
                            : [...draft.categorie, category],
                        )
                      }
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Labels et certifications</Label>
              <div className="flex flex-wrap gap-3">
                {(["rge", "qualiopi", "bio", "ess"] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft[key]}
                      onCheckedChange={(value) => set(key, value === true)}
                    />
                    {
                      {
                        rge: "RGE",
                        qualiopi: "Qualiopi",
                        bio: "Bio",
                        ess: "ESS",
                      }[key]
                    }
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm md:col-span-2 xl:col-span-3">
              <Checkbox
                checked={draft.enrich}
                onCheckedChange={(value) => set("enrich", value === true)}
              />
              <span>
                Compléter les CA manquants via INPI/BCE{" "}
                <span className="text-muted-foreground">
                  (plus lent, jusqu’à 10 entreprises par page)
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-3">
              <span className="text-xs text-muted-foreground">
                Profils commerciaux :
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    trade: "services",
                    naf: [],
                    section: "",
                    categorie: ["PME"],
                    effectif: ["02", "03", "11", "12"],
                    caMin: "300k",
                    caMax: "10M",
                    etat: "A",
                  }))
                }
              >
                Services ≥ 300k
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    trade: "",
                    naf: [],
                    section: "G",
                    categorie: ["PME"],
                    effectif: ["02", "03", "11", "12"],
                    caMin: "800k",
                    caMax: "10M",
                    etat: "A",
                  }))
                }
              >
                Commerce ≥ 800k
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    cp: "59",
                    region: "",
                    categorie: ["PME"],
                    etat: "A",
                    effectif: ["02", "03", "11", "12"],
                  }))
                }
              >
                PME Nord (59)
              </Button>
            </div>
          </div>
        </details>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 md:px-5">
        <p role="status" className="text-xs text-muted-foreground">
          {pending
            ? "Recherche en cours…"
            : dirty
              ? "Critères modifiés — lancez la recherche pour les appliquer."
              : "Recherchez par nom, par métier ou par zone."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4" />
            Tout réinitialiser
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Rechercher
          </Button>
        </div>
      </div>
    </form>
  );
}
