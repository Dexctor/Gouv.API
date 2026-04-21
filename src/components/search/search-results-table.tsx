"use client";

import { useMemo, useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { differenceInYears } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addToPipelineAction } from "@/actions/prospects";
import type { EnrichedCompany } from "@/actions/search";
import {
  trancheEffectifLabel,
  formatCompactEuro,
  CATEGORIE_ENTREPRISE_LABELS,
} from "@/lib/insee-labels";

function age(dateCreation?: string | null) {
  if (!dateCreation) return "—";
  const y = differenceInYears(new Date(), new Date(dateCreation));
  return `${y} an${y > 1 ? "s" : ""}`;
}

// Pastilles labels (RGE / Qualiopi / Bio / ESS)
function LabelPill({
  label,
  color,
}: {
  label: string;
  color: "green" | "blue" | "amber" | "violet";
}) {
  const classes = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  }[color];
  return (
    <span
      className={`inline-flex h-4 items-center rounded border px-1 text-[10px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function CompanyLabels({ c }: { c: EnrichedCompany }) {
  const co = c.complements;
  if (!co) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {co.est_rge && <LabelPill label="RGE" color="green" />}
      {co.est_qualiopi && <LabelPill label="Qualiopi" color="blue" />}
      {co.est_bio && <LabelPill label="Bio" color="green" />}
      {co.est_ess && <LabelPill label="ESS" color="violet" />}
      {co.est_siae && <LabelPill label="SIAE" color="violet" />}
      {co.est_societe_mission && <LabelPill label="Mission" color="amber" />}
      {co.est_service_public && <LabelPill label="Service public" color="blue" />}
    </div>
  );
}

const col = createColumnHelper<EnrichedCompany>();

export function SearchResultsTable({ data }: { data: EnrichedCompany[] }) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns = useMemo(
    () => [
      col.accessor("nom_complet", {
        header: "Dénomination",
        cell: (info) => {
          const r = info.row.original;
          return (
            <div className="min-w-[14rem]">
              <div className="flex items-center gap-2">
                <span className="font-medium">{info.getValue()}</span>
                {r.etat_administratif === "C" && (
                  <Badge variant="secondary">Cessée</Badge>
                )}
                {r.categorie_entreprise && (
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORIE_ENTREPRISE_LABELS[r.categorie_entreprise]}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5">
                <CompanyLabels c={r} />
              </div>
            </div>
          );
        },
      }),
      col.accessor("siren", {
        header: "SIREN",
        cell: (info) => <SirenCell siren={info.getValue()} />,
      }),
      col.display({
        id: "ville",
        header: "Ville",
        cell: ({ row }) => {
          const s = row.original.siege;
          const ville = s?.libelle_commune ?? s?.commune ?? "—";
          return (
            <span className="text-sm text-muted-foreground">
              {ville}
              {s?.code_postal ? ` (${s.code_postal})` : ""}
            </span>
          );
        },
      }),
      col.accessor("activite_principale", {
        header: "NAF",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.display({
        id: "effectif",
        header: "Effectif",
        cell: ({ row }) => {
          const r = row.original;
          const code = r.tranche_effectif_salarie;
          const year = r.annee_tranche_effectif_salarie;
          return (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-xs">{trancheEffectifLabel(code)}</span>
              </TooltipTrigger>
              {year && (
                <TooltipContent>Donnée INSEE {year}</TooltipContent>
              )}
            </Tooltip>
          );
        },
      }),
      col.display({
        id: "ca",
        header: "CA",
        cell: ({ row }) => {
          const r = row.original;
          const ca = r.lastCA?.ca ?? r.cache?.dernierCA ?? null;
          const year =
            r.lastCA?.year ??
            (r.cache?.dateDernierBilan
              ? new Date(r.cache.dateDernierBilan).getFullYear().toString()
              : null);
          if (ca == null) {
            return (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground/60">
                    N/C
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Entreprise n&apos;a pas publié ses comptes
                </TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Tooltip>
              <TooltipTrigger>
                <span className="tabular-nums font-medium">
                  {formatCompactEuro(ca)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                CA {year ?? "—"} — source INPI/BCE
              </TooltipContent>
            </Tooltip>
          );
        },
      }),
      col.display({
        id: "rn",
        header: "Résultat net",
        cell: ({ row }) => {
          const r = row.original;
          const rn = r.lastCA?.resultat_net ?? r.cache?.dernierResultat ?? null;
          if (rn == null) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          return (
            <span
              className={`tabular-nums text-xs ${
                rn < 0 ? "text-red-400" : ""
              }`}
            >
              {formatCompactEuro(rn)}
            </span>
          );
        },
      }),
      col.accessor("date_creation", {
        header: "Âge",
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {age(info.getValue())}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const c = row.original;
          const isAdding = addingId === c.siren;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/prospects/${c.siren}`}>Voir</Link>
              </Button>
              {c.alreadyInPipeline ? (
                <Button size="sm" variant="outline" disabled>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Dans le pipeline
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setAddingId(c.siren);
                    startTransition(async () => {
                      const res = await addToPipelineAction(c.siren);
                      setAddingId(null);
                      if (res.success) {
                        toast.success("Ajouté au pipeline");
                      } else {
                        toast.error(res.error);
                      }
                    });
                  }}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3.5 w-3.5" />
                  )}
                  Ajouter
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [addingId]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border border-border/60 bg-card/30">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="text-xs uppercase">
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-accent/30">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-2 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SirenCell({ siren }: { siren: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(siren);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
    >
      {siren}
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}
