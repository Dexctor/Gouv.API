import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/types/prospect";
import { PipelineStage } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Tableau de bord — Gouv-API",
};

export default async function DashboardPage() {
  const [counts, recentActivity] = await Promise.all([
    prisma.prospect.groupBy({
      by: ["stage"],
      _count: { _all: true },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        prospect: { select: { siren: true, denomination: true } },
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const countByStage = new Map<PipelineStage, number>();
  for (const c of counts) {
    countByStage.set(c.stage, c._count._all);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground">
            Aperçu de votre pipeline et activité récente.
          </p>
        </div>
        <Button asChild>
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Nouvelle recherche
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {PIPELINE_STAGES.map((s) => (
          <Card key={s.value} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {countByStage.get(s.value) ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune activité pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/prospects/${a.prospect.siren}`}
                      className="font-medium hover:underline"
                    >
                      {a.prospect.denomination}
                    </Link>
                    <p className="truncate text-muted-foreground">
                      {a.content}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(a.createdAt, {
                      locale: fr,
                      addSuffix: true,
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
