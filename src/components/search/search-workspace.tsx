"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { differenceInYears } from "date-fns";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { addToPipelineAction } from "@/actions/prospects";
import type { EnrichedCompany } from "@/actions/search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { evaluateIcp, VERDICT_META } from "@/lib/icp-opale";
import { trancheEffectifLabel } from "@/lib/insee-labels";
import { nafLabel } from "@/lib/naf-lookup";
import { companyCA, sortCompanies } from "@/lib/search-ranking";
import { formatSearchEuro } from "@/lib/search-format";
import { SEARCH_SORTS, SORT_LABELS, searchHref, type SearchSort, type SearchState } from "@/lib/search-state";
import { SearchMap, type SearchMapPoint } from "./search-map";

type CrmFilter = "all" | "new" | "crm";
type WorkspaceSort = SearchSort | "opale";
const confidenceRank = { élevée: 3, partielle: 2, faible: 1 } as const;

function priority(company: EnrichedCompany) {
  const location = company.matchedLocation ?? company.siege;
  return evaluateIcp({
    ca: companyCA(company),
    trancheEffectif: company.tranche_effectif_salarie,
    sectionNaf: company.section_activite_principale,
    codeNaf: company.activite_principale,
    codePostal: location?.code_postal,
    siteWeb: company.crm?.siteWeb,
    siteWebStatus: company.crm?.siteWebStatus,
    etatAdministratif: company.etat_administratif,
  });
}

function companyAge(date: string) {
  if (!Number.isFinite(Date.parse(date))) return "Ancienneté inconnue";
  const years = differenceInYears(new Date(), new Date(date));
  return years < 1 ? "Moins d’un an" : `${years} ans`;
}

export function SearchWorkspace({
  data,
  total,
  page,
  totalPages,
  state,
}: {
  data: EnrichedCompany[];
  total: number;
  page: number;
  totalPages: number;
  state: SearchState;
}) {
  const searchParams = useSearchParams();
  const requestedSort = searchParams.get("sort");
  const [sort, setSort] = useState<WorkspaceSort>(SEARCH_SORTS.includes(requestedSort as SearchSort) ? requestedSort as SearchSort : "opale");
  const [crmFilter, setCrmFilter] = useState<CrmFilter>("all");
  const [selectedSiren, setSelectedSiren] = useState<string | null>(null);
  const [adding, setAdding] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const enriched = useMemo(
    () => data.map((company) => ({ company, score: priority(company) })),
    [data],
  );
  const visible = useMemo(() => {
    const filtered = enriched.filter(({ company }) =>
      crmFilter === "all" ? true : crmFilter === "crm" ? Boolean(company.crm || company.alreadyInPipeline || added.has(company.siren)) : !company.crm && !company.alreadyInPipeline && !added.has(company.siren),
    );
    if (sort !== "opale") return sortCompanies(filtered.map(({ company }) => company), sort);
    return [...filtered]
      .sort((a, b) =>
        b.score.score - a.score.score ||
        confidenceRank[b.score.details.confidence] - confidenceRank[a.score.details.confidence] ||
        a.company.nom_complet.localeCompare(b.company.nom_complet, "fr"),
      )
      .map(({ company }) => company);
  }, [added, crmFilter, enriched, sort]);
  const selected = data.find((company) => company.siren === selectedSiren) ?? null;
  const metrics = useMemo(() => ({
    priority: enriched.filter(({ score }) => score.verdict === "prioritaire").length,
    crm: enriched.filter(({ company }) => Boolean(company.crm || company.alreadyInPipeline || added.has(company.siren))).length,
    mapped: enriched.filter(({ company }) => {
      const location = company.matchedLocation ?? company.siege;
      return Boolean(location?.latitude?.trim() && location?.longitude?.trim()) && Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));
    }).length,
  }), [added, enriched]);
  const points = useMemo<SearchMapPoint[]>(() => visible.flatMap((company) => {
    const location = company.matchedLocation ?? company.siege;
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    if (!location?.latitude?.trim() || !location?.longitude?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{
      siren: company.siren,
      name: company.nom_complet,
      city: location?.libelle_commune ?? location?.commune ?? "Localisation inconnue",
      latitude,
      longitude,
      priority: priority(company).verdict,
      inCrm: Boolean(company.crm || company.alreadyInPipeline || added.has(company.siren)),
    }];
  }), [added, visible]);
  const select = useCallback((siren: string) => setSelectedSiren(siren), []);
  const add = async (siren: string) => {
    setAdding((current) => new Set(current).add(siren));
    try {
      const result = await addToPipelineAction(siren);
      if (!result.success) throw new Error(result.error);
      setAdded((current) => new Set(current).add(siren));
      toast.success("Entreprise ajoutée au CRM");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setAdding((current) => {
        const next = new Set(current);
        next.delete(siren);
        return next;
      });
    }
  };

  return (
    <section aria-label="Espace de qualification" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-baseline gap-3">
          <strong className="text-base tabular-nums">{total.toLocaleString("fr-FR")} résultats</strong>
          <span className="text-xs text-muted-foreground">{visible.length} affichés sur cette page</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span><b className="text-emerald-400">{metrics.priority}</b> prioritaires</span>
          <span><b>{metrics.crm}</b> déjà CRM</span>
          <span><b>{metrics.mapped}</b> localisés</span>
        </div>
      </div>
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-1" aria-label="Filtre CRM">
              {(["all", "new", "crm"] as CrmFilter[]).map((filter) => (
                <Button key={filter} size="sm" variant={crmFilter === filter ? "secondary" : "ghost"} onClick={() => setCrmFilter(filter)}>
                  {filter === "all" ? "Tous" : filter === "new" ? "Nouveaux" : "Déjà CRM"}
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Trier cette page
              <select value={sort} onChange={(event) => setSort(event.target.value as WorkspaceSort)} className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="opale">Priorité Opale</option>
                {SEARCH_SORTS.map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
              </select>
            </label>
          </div>
          <div className="hidden grid-cols-[minmax(210px,2.2fr)_minmax(120px,1fr)_minmax(125px,1fr)_130px] gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Entreprise / site connu</span><span>Commune</span><span>Effectif / CA</span><span>Priorité</span>
          </div>
          <div className="divide-y divide-border">
            {visible.map((company) => {
              const score = priority(company);
              const meta = VERDICT_META[score.verdict];
              const location = company.matchedLocation ?? company.siege;
              const inCrm = Boolean(company.crm || company.alreadyInPipeline || added.has(company.siren));
              const isSelected = selectedSiren === company.siren;
              return <button key={company.siren} type="button" onClick={() => select(company.siren)} aria-pressed={isSelected} className={`grid w-full grid-cols-1 gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring md:grid-cols-[minmax(210px,2.2fr)_minmax(120px,1fr)_minmax(125px,1fr)_130px] md:gap-3 ${isSelected ? "bg-primary/10" : ""}`}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{company.nom_complet}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{nafLabel(company.activite_principale)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground"><span className={company.etat_administratif === "A" ? "text-emerald-400" : ""}>{company.etat_administratif === "A" ? "Active" : "Cessée"}</span><span>{companyAge(company.date_creation)}</span>{inCrm && <span className="text-violet-300">CRM</span>}<span>{company.crm?.siteWebStatus === "verified" && company.crm.siteWeb ? "Site vérifié" : company.crm?.siteWebStatus === "candidate" ? "Site à vérifier" : "Site non renseigné"}</span></span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{location?.libelle_commune ?? location?.commune ?? "Inconnue"}<br />{location?.code_postal ?? ""}</span>
                <span className="text-xs"><span className="block font-medium">{trancheEffectifLabel(company.tranche_effectif_salarie)}</span><span className="mt-1 block text-muted-foreground">{companyCA(company) != null ? `CA ${formatSearchEuro(companyCA(company))}` : "CA inconnu"}</span></span>
                <span className="flex items-center justify-between gap-2 md:block"><span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>{score.score}/100 · {meta.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">Confiance {score.details.confidence}</span></span>
              </button>;
            })}
            {!visible.length && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun résultat dans ce segment.</p>}
          </div>
          <footer className="flex items-center justify-between border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
            <span>Page {page} / {totalPages}</span>
            <span className="flex gap-1">
              {page > 1 ? <Button asChild size="sm" variant="ghost"><Link prefetch={false} href={searchHref(state, page - 1, sort === "opale" ? "relevance" : sort)}><ChevronLeft className="h-4 w-4" />Précédent</Link></Button> : <Button size="sm" variant="ghost" disabled>Précédent</Button>}
              {page < totalPages ? <Button asChild size="sm" variant="ghost"><Link prefetch={false} href={searchHref(state, page + 1, sort === "opale" ? "relevance" : sort)}>Suivant<ChevronRight className="h-4 w-4" /></Link></Button> : <Button size="sm" variant="ghost" disabled>Suivant</Button>}
            </span>
          </footer>
        </div>
        <aside className="overflow-hidden rounded-lg border border-border bg-card 2xl:sticky 2xl:top-4 2xl:h-fit">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5"><span className="text-sm font-medium">Carte des résultats</span><span className="text-xs text-muted-foreground">{points.length} repères</span></div>
          <SearchMap points={points} selectedSiren={selectedSiren} onSelect={select} />
          <p className="px-3 py-2 text-xs text-muted-foreground">Cliquez un repère ou une ligne pour examiner l’entreprise. Les couleurs suivent la priorité Opale.</p>
        </aside>
      </div>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedSiren(null)}>
        {selected && <CompanyDrawer company={selected} score={priority(selected)} inCrm={Boolean(selected.crm || selected.alreadyInPipeline || added.has(selected.siren))} busy={adding.has(selected.siren)} onAdd={() => void add(selected.siren)} />}
      </Sheet>
    </section>
  );
}

function CompanyDrawer({ company, score, inCrm, busy, onAdd }: { company: EnrichedCompany; score: ReturnType<typeof priority>; inCrm: boolean; busy: boolean; onAdd: () => void }) {
  const location = company.matchedLocation ?? company.siege;
  const meta = VERDICT_META[score.verdict];
  const site = company.crm?.siteWebStatus === "verified" || company.crm?.siteWebStatus === "candidate" ? company.crm.siteWeb : null;
  return <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
    <SheetHeader className="border-b border-border pr-12"><SheetTitle>{company.nom_complet}</SheetTitle><SheetDescription>{nafLabel(company.activite_principale)} · SIREN {company.siren}</SheetDescription></SheetHeader>
    <div className="space-y-5 p-4">
      <section><p className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${meta.badgeClass}`}>{score.score}/100 · {meta.label}</p><p className="mt-2 text-xs text-muted-foreground">Alignement observable avec la cible Opale, pas une probabilité d’achat. Confiance {score.details.confidence}. {score.details.caSource === "inconnu" && "CA inconnu : aucun point n’est attribué pour ce critère."}</p></section>
      <DrawerSection title="Données factuelles"><Fact label="Adresse" value={[location?.adresse, location?.code_postal, location?.libelle_commune ?? location?.commune].filter(Boolean).join(", ") || "Inconnue"} /><Fact label="Effectif" value={trancheEffectifLabel(company.tranche_effectif_salarie)} /><Fact label="CA" value={companyCA(company) != null ? formatSearchEuro(companyCA(company)) : "Inconnu"} /><Fact label="Site internet" value={site ? company.crm?.siteWebStatus === "verified" ? "Site vérifié" : "Candidat à vérifier" : "Non renseigné"} /></DrawerSection>
      <DrawerSection title="Informations manquantes"><SignalList title="À renseigner" values={[...(companyCA(company) == null ? ["Chiffre d’affaires inconnu"] : []), ...(!company.tranche_effectif_salarie ? ["Effectif inconnu"] : []), ...(site ? [] : ["Présence d’un site non vérifiée"])]} tone="neutral" /></DrawerSection>
      <DrawerSection title="Lecture Opale"><SignalList title="Critères certains" values={score.positives} tone="positive" /><SignalList title="Écarts factuels" values={score.negatives} tone="neutral" /><SignalList title="Hypothèses à vérifier" values={[...score.signals, "Demandes, devis, planning et suivi client à explorer en entretien"]} tone="neutral" /></DrawerSection>
      {inCrm ? <Button asChild className="w-full"><Link href={`/prospects/${company.siren}`}><Building2 className="h-4 w-4" />Ouvrir la fiche CRM</Link></Button> : <Button className="w-full" disabled={busy} onClick={onAdd}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{busy ? "Ajout…" : "Ajouter au CRM"}</Button>}
      {site && <Button asChild variant="outline" className="w-full"><a href={site} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{company.crm?.siteWebStatus === "verified" ? "Ouvrir le site vérifié" : "Examiner le site candidat"}</a></Button>}
    </div>
  </SheetContent>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3><div className="space-y-2">{children}</div></section>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>; }
function SignalList({ title, values, tone }: { title: string; values: string[]; tone: "positive" | "neutral" }) { return <div><p className="text-sm font-medium">{title}</p>{values.length ? <ul className="mt-1 space-y-1 text-sm text-muted-foreground">{values.slice(0, 4).map((value) => <li key={value} className="flex gap-2"><span className={tone === "positive" ? "text-emerald-400" : "text-amber-400"}>{tone === "positive" ? "✓" : "?"}</span>{value}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">Aucun signal disponible.</p>}</div>; }
