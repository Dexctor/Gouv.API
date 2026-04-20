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
import { Copy, ExternalLink, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addToPipelineAction } from "@/actions/prospects";
import type { EnrichedCompany } from "@/actions/search";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return euro.format(value);
}

function age(dateCreation?: string | null) {
  if (!dateCreation) return "—";
  const y = differenceInYears(new Date(), new Date(dateCreation));
  return `${y} an${y > 1 ? "s" : ""}`;
}

const col = createColumnHelper<EnrichedCompany>();

export function SearchResultsTable({ data }: { data: EnrichedCompany[] }) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns = useMemo(
    () => [
      col.accessor("nom_complet", {
        header: "Dénomination",
        cell: (info) => (
          <div className="font-medium">
            {info.getValue()}
            {info.row.original.etat_administratif === "F" && (
              <Badge variant="secondary" className="ml-2">
                Fermé
              </Badge>
            )}
          </div>
        ),
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
          return (
            <span className="text-sm text-muted-foreground">
              {s?.commune ?? "—"} {s?.code_postal ? `(${s.code_postal})` : ""}
            </span>
          );
        },
      }),
      col.accessor("activite_principale", {
        header: "NAF",
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("tranche_effectif_salarie", {
        header: "Effectif",
        cell: (info) => info.getValue() ?? "—",
      }),
      col.display({
        id: "ca",
        header: "CA",
        cell: ({ row }) => {
          const cache = row.original.cache;
          const finances = row.original.finances;
          const lastYear = finances
            ? Object.keys(finances).sort().at(-1)
            : undefined;
          const ca =
            cache?.dernierCA ??
            (lastYear ? finances?.[lastYear]?.ca ?? null : null);
          return (
            <span className="tabular-nums">{formatMoney(ca ?? null)}</span>
          );
        },
      }),
      col.display({
        id: "ebe",
        header: "EBE",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.cache?.dernierEBE ?? null)}
          </span>
        ),
      }),
      col.accessor("date_creation", {
        header: "Âge",
        cell: (info) => age(info.getValue()),
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

export function ExternalLinkButton({ url }: { url: string }) {
  return (
    <Button asChild size="sm" variant="ghost">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}
