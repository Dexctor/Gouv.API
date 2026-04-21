"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useQueryState,
  parseAsString,
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringLiteral,
  parseAsBoolean,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RotateCcw, SlidersHorizontal, Target } from "lucide-react";
import {
  TRANCHE_EFFECTIF_LABELS,
  NAF_SECTIONS,
  NATURE_JURIDIQUE_LABELS,
} from "@/lib/insee-labels";
import { NafSelector } from "./naf-selector";

const ETATS = ["A", "C"] as const;
const CATEGORIES = ["PME", "ETI", "GE"] as const;

export const searchParsers = {
  q: parseAsString.withDefault(""),
  cp: parseAsString.withDefault(""),
  naf: parseAsArrayOf(parseAsString).withDefault([]),
  section: parseAsString.withDefault(""),
  effectif: parseAsArrayOf(parseAsString).withDefault([]),
  forme: parseAsString.withDefault(""),
  etat: parseAsStringLiteral(ETATS).withDefault("A"),
  categorie: parseAsArrayOf(parseAsStringLiteral(CATEGORIES)).withDefault([]),
  caMin: parseAsInteger.withDefault(0),
  caMax: parseAsInteger.withDefault(0),
  rge: parseAsBoolean.withDefault(false),
  qualiopi: parseAsBoolean.withDefault(false),
  bio: parseAsBoolean.withDefault(false),
  ess: parseAsBoolean.withDefault(false),
  page: parseAsInteger.withDefault(1),
};

const SHALLOW = { shallow: true } as const;
const COMMIT = { shallow: false } as const;

// Parse "1500000", "1.5M", "1,5M", "500k"
function parseAmount(input: string): number | null {
  if (!input.trim()) return null;
  const cleaned = input.trim().toLowerCase().replace(/\s/g, "").replace(",", ".");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/i);
  if (!match) return null;
  const n = parseFloat(match[1]);
  if (Number.isNaN(n)) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const mult = unit === "k" ? 1e3 : unit === "m" ? 1e6 : unit === "b" ? 1e9 : 1;
  return Math.round(n * mult);
}

function formatAmount(n: number): string {
  if (!n) return "";
  if (n >= 1e6) return `${(n / 1e6).toString().replace(".", ",")}M`;
  if (n >= 1e3) return `${(n / 1e3).toString().replace(".", ",")}k`;
  return String(n);
}

export function SearchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useQueryState("q", searchParsers.q.withOptions(SHALLOW));
  const [cp, setCp] = useQueryState("cp", searchParsers.cp.withOptions(SHALLOW));
  const [naf, setNaf] = useQueryState("naf", searchParsers.naf.withOptions(SHALLOW));
  const [section, setSection] = useQueryState(
    "section",
    searchParsers.section.withOptions(SHALLOW)
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
  const [categorie, setCategorie] = useQueryState(
    "categorie",
    searchParsers.categorie.withOptions(SHALLOW)
  );
  const [caMin, setCaMin] = useQueryState(
    "caMin",
    searchParsers.caMin.withOptions(SHALLOW)
  );
  const [caMax, setCaMax] = useQueryState(
    "caMax",
    searchParsers.caMax.withOptions(SHALLOW)
  );
  const [rge, setRge] = useQueryState(
    "rge",
    searchParsers.rge.withOptions(SHALLOW)
  );
  const [qualiopi, setQualiopi] = useQueryState(
    "qualiopi",
    searchParsers.qualiopi.withOptions(SHALLOW)
  );
  const [bio, setBio] = useQueryState(
    "bio",
    searchParsers.bio.withOptions(SHALLOW)
  );
  const [ess, setEss] = useQueryState(
    "ess",
    searchParsers.ess.withOptions(SHALLOW)
  );
  const [, setPage] = useQueryState(
    "page",
    searchParsers.page.withOptions(COMMIT)
  );

  const activeFilterCount =
    Number(!!section) +
    Number(!!forme) +
    Number(categorie.length > 0) +
    Number(caMin > 0) +
    Number(caMax > 0) +
    Number(rge) +
    Number(qualiopi) +
    Number(bio) +
    Number(ess);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await Promise.all([
        setQ(q || null, COMMIT),
        setCp(cp || null, COMMIT),
        setNaf(naf.length ? naf : null, COMMIT),
        setSection(section || null, COMMIT),
        setEffectif(effectif.length ? effectif : null, COMMIT),
        setForme(forme || null, COMMIT),
        setEtat(etat, COMMIT),
        setCategorie(
          categorie.length ? (categorie as (typeof CATEGORIES)[number][]) : null,
          COMMIT
        ),
        setCaMin(caMin || null, COMMIT),
        setCaMax(caMax || null, COMMIT),
        setRge(rge || null, COMMIT),
        setQualiopi(qualiopi || null, COMMIT),
        setBio(bio || null, COMMIT),
        setEss(ess || null, COMMIT),
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
        setSection(null, COMMIT),
        setEffectif(null, COMMIT),
        setForme(null, COMMIT),
        setEtat("A", COMMIT),
        setCategorie(null, COMMIT),
        setCaMin(null, COMMIT),
        setCaMax(null, COMMIT),
        setRge(null, COMMIT),
        setQualiopi(null, COMMIT),
        setBio(null, COMMIT),
        setEss(null, COMMIT),
        setPage(1, COMMIT),
      ]);
      router.refresh();
    });
  };

  const toggleCategorie = (cat: (typeof CATEGORIES)[number]) => {
    const next = categorie.includes(cat)
      ? categorie.filter((c) => c !== cat)
      : [...categorie, cat];
    void setCategorie(next as (typeof CATEGORIES)[number][]);
  };

  // Presets ICP Opale : applique les filtres du critère commercial en 1 clic.
  const applyIcpPreset = (variant: "services" | "products" | "hdf") => {
    startTransition(async () => {
      if (variant === "services") {
        // Services : CA >= 300k, effectif 3-49, section NAF services
        await Promise.all([
          setCategorie(["PME"], COMMIT),
          setEtat("A", COMMIT),
          setCaMin(300_000, COMMIT),
          setCaMax(10_000_000, COMMIT),
          setEffectif(["02"], COMMIT),
          setSection("M", COMMIT), // Activités spécialisées (conseil)
          setPage(1, COMMIT),
        ]);
      } else if (variant === "products") {
        // Produits / commerce : CA >= 800k
        await Promise.all([
          setCategorie(["PME"], COMMIT),
          setEtat("A", COMMIT),
          setCaMin(800_000, COMMIT),
          setCaMax(10_000_000, COMMIT),
          setEffectif(["02"], COMMIT),
          setSection("G", COMMIT), // Commerce
          setPage(1, COMMIT),
        ]);
      } else if (variant === "hdf") {
        // Hauts-de-France pure, sans préjuger du secteur
        await Promise.all([
          setCategorie(["PME"], COMMIT),
          setEtat("A", COMMIT),
          setEffectif(["02"], COMMIT),
          setCp("59", COMMIT), // Nord, à affiner
          setPage(1, COMMIT),
        ]);
      }
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-border/60 bg-card/40 p-4"
    >
      {/* Presets ICP Opale — chargement 1 clic de critères métier */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Target className="mr-1 inline h-3 w-3" />
          Presets ICP
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => applyIcpPreset("services")}
          disabled={isPending}
        >
          Services ≥ 300 k€
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => applyIcpPreset("products")}
          disabled={isPending}
        >
          Commerce ≥ 800 k€
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => applyIcpPreset("hdf")}
          disabled={isPending}
        >
          PME Nord (59)
        </Button>
        <span className="text-[10px] text-muted-foreground">
          CA max 10 M€ · effectif 3+ · active
        </span>
      </div>

      {/* Ligne 1 : recherche principale */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
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
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="naf">Codes NAF</Label>
          <NafSelector
            value={naf}
            onChange={(codes) =>
              void setNaf(codes.length ? (codes as string[]) : [])
            }
            placeholder="Boulangerie, BTP, services..."
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
              {Object.entries(TRANCHE_EFFECTIF_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="etat">État</Label>
          <Select
            value={etat}
            onValueChange={(v) => void setEtat(v as "A" | "C")}
          >
            <SelectTrigger id="etat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Active</SelectItem>
              <SelectItem value="C">Cessée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ligne 2 : filtres avancés + actions */}
      <div className="flex flex-wrap items-end gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button type="button" variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtres avancés
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 px-1.5 text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            }
          />
          <PopoverContent className="w-96 p-4" align="start">
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Catégorie d&apos;entreprise</Label>
                <div className="flex gap-1">
                  {CATEGORIES.map((c) => (
                    <Button
                      type="button"
                      key={c}
                      size="xs"
                      variant={categorie.includes(c) ? "default" : "outline"}
                      onClick={() => toggleCategorie(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="caMin" className="text-xs">
                    CA minimum
                  </Label>
                  <Input
                    id="caMin"
                    placeholder="300k, 1M, 5M..."
                    defaultValue={formatAmount(caMin)}
                    onBlur={(e) => {
                      const n = parseAmount(e.target.value);
                      void setCaMin(n ?? 0);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="caMax" className="text-xs">
                    CA maximum
                  </Label>
                  <Input
                    id="caMax"
                    placeholder="10M, 100M..."
                    defaultValue={formatAmount(caMax)}
                    onBlur={(e) => {
                      const n = parseAmount(e.target.value);
                      void setCaMax(n ?? 0);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="section" className="text-xs">
                  Section NAF
                </Label>
                <Select
                  value={section || "all"}
                  onValueChange={(v) => void setSection(v === "all" ? "" : v)}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {NAF_SECTIONS.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="forme" className="text-xs">
                  Forme juridique
                </Label>
                <Select
                  value={forme || "all"}
                  onValueChange={(v) => void setForme(v === "all" ? "" : v)}
                >
                  <SelectTrigger id="forme">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {Object.entries(NATURE_JURIDIQUE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Labels qualité</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <CheckboxRow
                    checked={rge}
                    onCheckedChange={(v) => void setRge(v || null)}
                    label="RGE (BTP)"
                  />
                  <CheckboxRow
                    checked={qualiopi}
                    onCheckedChange={(v) => void setQualiopi(v || null)}
                    label="Qualiopi"
                  />
                  <CheckboxRow
                    checked={bio}
                    onCheckedChange={(v) => void setBio(v || null)}
                    label="Bio"
                  />
                  <CheckboxRow
                    checked={ess}
                    onCheckedChange={(v) => void setEss(v || null)}
                    label="ESS"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          onClick={reset}
          disabled={isPending}
          size="sm"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Réinitialiser
        </Button>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Rechercher
        </Button>
      </div>
    </form>
  );
}

function CheckboxRow({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      <span>{label}</span>
    </label>
  );
}
