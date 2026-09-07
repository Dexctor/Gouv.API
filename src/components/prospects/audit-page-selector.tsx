"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileSearch, Loader2, RefreshCw } from "lucide-react";
import type {
  AuditPageCollectionStatus,
  WebsiteStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  collectSelectedAuditPagesAction,
  discoverAuditPagesAction,
  updateAuditPageSelectionAction,
} from "@/actions/audit-pages";
import { MAX_SELECTED_AUDIT_PAGES } from "@/lib/audit-page-constants";

interface PageItem {
  id: string;
  url: string;
  title: string | null;
  pageType: string;
  selected: boolean;
  recommended: boolean;
  collectionStatus: AuditPageCollectionStatus;
  collectionError: string | null;
}

interface Props {
  prospectId: string;
  siteWeb: string | null;
  siteWebStatus: WebsiteStatus;
  pages: PageItem[];
  totalDiscovered: number | null;
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "Accueil",
  service: "Service",
  realisations: "Réalisations",
  contact: "Contact",
  about: "Entreprise",
  area: "Zone",
  legal: "Légal",
  other: "Autre",
};

function shortUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return value;
  }
}

export function AuditPageSelector({
  prospectId,
  siteWeb,
  siteWebStatus,
  pages,
  totalDiscovered,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(pages.filter((page) => page.selected).map((page) => page.id))
  );
  const [isPending, startTransition] = useTransition();
  const selectedCount = selectedIds.size;

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        if (next.size >= MAX_SELECTED_AUDIT_PAGES) {
          toast.error(`Maximum ${MAX_SELECTED_AUDIT_PAGES} pages`);
          return current;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const discover = () =>
    startTransition(async () => {
      const result = await discoverAuditPagesAction(prospectId);
      if (!result.success) {
        toast.error(result.error ?? "Découverte impossible");
      } else {
        toast.success(`${result.totalDiscovered} URL(s) découverte(s)`);
      }
      router.refresh();
    });

  const saveSelection = () =>
    startTransition(async () => {
      const result = await updateAuditPageSelectionAction(
        prospectId,
        [...selectedIds]
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sélection enregistrée : ${result.selectedCount} page(s)`);
      router.refresh();
    });

  const collect = () =>
    startTransition(async () => {
      const saved = await updateAuditPageSelectionAction(
        prospectId,
        [...selectedIds]
      );
      if (!saved.success) {
        toast.error(saved.error);
        return;
      }
      const result = await collectSelectedAuditPagesAction(prospectId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.failedCount) {
        toast.warning(
          `${result.collectedCount} page(s) collectée(s), ${result.failedCount} échec(s)`
        );
      } else {
        toast.success(`${result.collectedCount} page(s) collectée(s)`);
      }
      router.refresh();
    });

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileSearch className="h-4 w-4" />
          Pages du dossier audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!siteWeb || siteWebStatus !== "verified" ? (
          <p className="text-xs text-muted-foreground">
            Vérifiez le site dans la section ci-dessus pour préparer la collecte.
            Les pages seront disponibles une fois le domaine validé.
          </p>
        ) : pages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              La découverte lit uniquement l&apos;accueil, ses liens internes et
              le sitemap. Elle ne collecte pas encore le contenu des pages.
            </p>
            <Button size="sm" onClick={discover} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSearch className="mr-2 h-3.5 w-3.5" />
              )}
              Préparer la collecte
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedCount}/{MAX_SELECTED_AUDIT_PAGES}
                </span>{" "}
                pages sélectionnées
                {totalDiscovered != null && ` · ${totalDiscovered} URLs découvertes`}
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={discover}
                disabled={isPending}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Actualiser
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-md border border-border/60">
              {pages.map((page) => {
                const checked = selectedIds.has(page.id);
                return (
                  <label
                    key={page.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-border/60 p-3 last:border-0 hover:bg-muted/40"
                  >
                    <Checkbox
                      disabled={isPending || (!checked && selectedCount >= MAX_SELECTED_AUDIT_PAGES)}
                      checked={checked}
                      onCheckedChange={(value) => toggle(page.id, value === true)}
                      aria-label={`Sélectionner ${page.title ?? shortUrl(page.url)}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                        <span className="truncate">
                          {page.title || shortUrl(page.url)}
                        </span>
                        <Badge variant="outline" className="text-[9px]">
                          {PAGE_TYPE_LABELS[page.pageType] ?? page.pageType}
                        </Badge>
                        {page.recommended && (
                          <Badge variant="secondary" className="text-[9px]">
                            suggérée
                          </Badge>
                        )}
                        {page.collectionStatus === "collected" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><Check className="h-3 w-3" />Collectée</span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {shortUrl(page.url)}
                      </span>
                      {page.collectionStatus !== "collected" && <span className="block text-[11px] text-muted-foreground">{page.collectionError ? "Collecte échouée" : "Non collectée"}</span>}
                      {page.collectionError && (
                        <span className="block text-[11px] text-destructive">
                          {page.collectionError}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={saveSelection}
                disabled={isPending}
              >
                Enregistrer la sélection
              </Button>
              <Button
                size="sm"
                onClick={collect}
                disabled={isPending || selectedCount === 0}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSearch className="mr-2 h-3.5 w-3.5" />
                )}
                Collecter {selectedCount} page{selectedCount > 1 ? "s" : ""}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              La suggestion repose uniquement sur l&apos;URL et le texte de
              navigation. Vous gardez le contrôle de la sélection finale.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
