import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/types/prospect";
import { PipelineStage } from "@prisma/client";
import { subDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpRight, Search, Activity, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Tableau de bord — Gouv-API" };

export default async function DashboardPage() {
  const staleBefore = subDays(new Date(), 14);
  const openStages: PipelineStage[] = ["A_QUALIFIER", "CONTACTE", "RDV", "PROPOSITION"];
  const [counts, recentActivity, openProspects, staleCount, nextToQualify] = await Promise.all([
    prisma.prospect.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      include: {
        prospect: { select: { siren: true, denomination: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.prospect.findMany({
      where: { stage: { in: ["A_QUALIFIER", "CONTACTE", "RDV", "PROPOSITION"] } },
      orderBy: [{ priority: "desc" }, { updatedAt: "asc" }], take: 6,
      select: { id: true, siren: true, denomination: true, ville: true, stage: true, priority: true, updatedAt: true },
    }),
    prisma.prospect.count({ where: { stage: { in: openStages }, updatedAt: { lt: staleBefore } } }),
    prisma.prospect.findMany({
      where: { stage: "A_QUALIFIER" }, orderBy: [{ priority: "desc" }, { updatedAt: "asc" }], take: 3,
      select: { siren: true, denomination: true, ville: true },
    }),
  ]);
  const countByStage = new Map<PipelineStage, number>();
  for (const c of counts) countByStage.set(c.stage, c._count._all);
  const total = counts.reduce((sum, item) => sum + item._count._all, 0);
  const active = total - (countByStage.get("SIGNE") ?? 0) - (countByStage.get("PERDU") ?? 0);
  const indicators = [
    { label: "Sans mise à jour depuis 14 jours", value: staleCount, detail: "Dossiers ouverts à examiner" },
    { label: "Dossiers ouverts", value: active, detail: "De la qualification à la proposition" },
    { label: "À qualifier", value: countByStage.get("A_QUALIFIER") ?? 0, detail: "Première étape de prospection" },
    { label: "Clients signés", value: countByStage.get("SIGNE") ?? 0, detail: "Prospects convertis" },
  ];
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Espace de prospection</p>
          <h1 className="text-xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos dossiers, vos priorités et les derniers échanges.</p>
        </div>
        <Button asChild><Link href="/search"><Search className="h-4 w-4" />Nouvelle recherche</Link></Button>
      </header>
      <section aria-label="Indicateurs de prospection" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {indicators.map((item) => (
          <div key={item.label} className="bg-card px-4 py-4 md:px-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="my-2 text-2xl font-semibold tracking-tight tabular-nums">{item.value.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>
      {nextToQualify.length > 0 && <section aria-label="Prochaines qualifications" className="rounded-lg border border-border bg-card px-4 py-3">
        <h2 className="mb-2 text-sm font-semibold">À qualifier ensuite</h2>
        <div className="grid gap-2 md:grid-cols-3">{nextToQualify.map((prospect) => <Link key={prospect.siren} href={`/prospects/${prospect.siren}`} className="flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><span className="min-w-0"><span className="block truncate font-medium">{prospect.denomination}</span><span className="text-xs text-muted-foreground">{prospect.ville ?? "Ville inconnue"}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</div>
      </section>}
      <section aria-labelledby="pipeline-title" className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="pipeline-title" className="text-sm font-semibold">Répartition du pipeline</h2>
          <Link href="/pipeline" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">Ouvrir le pipeline<ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 md:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => {
            const count = countByStage.get(stage.value) ?? 0;
            return (
              <div key={stage.value}>
                <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{stage.label}</span><strong className="font-medium tabular-nums">{count}</strong></div>
                <div className="h-1 overflow-hidden rounded-full bg-muted"><div className={stage.value === "SIGNE" ? "h-full rounded-full bg-emerald-400/70" : "h-full rounded-full bg-primary/70"} style={{ width: `${total ? count / total * 100 : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="priorities-title" className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 id="priorities-title" className="text-sm font-semibold">Dossiers à suivre</h2>
            <p className="mt-1 text-xs text-muted-foreground">Dossiers ouverts · priorité haute, puis mise à jour la plus ancienne.</p>
          </div>
          {openProspects.length === 0 ? (
            <div className="space-y-3 p-6 text-sm"><p className="text-muted-foreground">Aucun dossier ouvert à suivre.</p><Link href="/search" className="inline-flex items-center gap-2 font-medium hover:underline">Rechercher des entreprises<ArrowRight className="h-4 w-4" /></Link></div>
          ) : (
            <ul className="divide-y divide-border">
              {openProspects.map((prospect) => (
                <li key={prospect.id}>
                  <Link href={`/prospects/${prospect.siren}`} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium group-hover:underline">{prospect.denomination}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{prospect.updatedAt < staleBefore && <span className="text-amber-300">Sans mise à jour depuis 14 j · </span>}{prospect.ville ?? "Ville non renseignée"} · Mis à jour {formatDistanceToNow(prospect.updatedAt, { locale: fr, addSuffix: true })}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5"><Badge variant="outline" className="text-[11px]">{PIPELINE_STAGES.find((stage) => stage.value === prospect.stage)?.label}</Badge>{prospect.priority === "HIGH" && <span className="text-[11px] text-amber-400">Priorité haute</span>}</div>
                    <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="activity-title" className="min-w-0 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Activity className="h-4 w-4 text-muted-foreground" /><h2 id="activity-title" className="text-sm font-semibold">Activité récente</h2></div>
          {recentActivity.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Vos notes, appels et changements d’étape apparaîtront ici.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((a) => (
                <li key={a.id} className="space-y-1.5 px-4 py-3.5 text-sm">
                  <Link href={`/prospects/${a.prospect.siren}`} className="break-words font-medium hover:underline">{a.prospect.denomination}</Link>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{a.content}</p>
                  <p className="text-[11px] text-muted-foreground">{a.user.name ?? a.user.email} · <time dateTime={a.createdAt.toISOString()}>{formatDistanceToNow(a.createdAt, { locale: fr, addSuffix: true })}</time></p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
