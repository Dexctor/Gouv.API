"use client";

import { useMemo, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PipelineStage, Priority } from "@prisma/client";
import {
  PIPELINE_STAGES,
  PRIORITIES,
  type ProspectListItem,
} from "@/types/prospect";
import {
  updateStageAction,
  updatePriorityAction,
  deleteProspectAction,
} from "@/actions/prospects";
import { Trash2 } from "lucide-react";

const col = createColumnHelper<ProspectListItem>();

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return format(d, "d MMM yyyy", { locale: fr });
}

export function PipelineTable({ rows }: { rows: ProspectListItem[] }) {
  const [, startTransition] = useTransition();

  const handleStage = (id: string, stage: PipelineStage) => {
    startTransition(async () => {
      const res = await updateStageAction(id, stage);
      if (!res.success) toast.error(res.error);
      else toast.success("Stage mis à jour");
    });
  };

  const handlePriority = (id: string, priority: Priority) => {
    startTransition(async () => {
      const res = await updatePriorityAction(id, priority);
      if (!res.success) toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    startTransition(async () => {
      const res = await deleteProspectAction(id);
      if (!res.success) toast.error(res.error);
      else toast.success("Prospect supprimé");
    });
  };

  const columns = useMemo(
    () => [
      col.accessor("denomination", {
        header: "Dénomination",
        cell: (info) => (
          <Link
            href={`/prospects/${info.row.original.siren}`}
            className="font-medium hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor("siren", {
        header: "SIREN",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("stage", {
        header: "Stage",
        cell: (info) => (
          <Select
            value={info.getValue()}
            onValueChange={(v) => handleStage(info.row.original.id, v as PipelineStage)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      }),
      col.accessor("priority", {
        header: "Priorité",
        cell: (info) => (
          <Select
            value={info.getValue()}
            onValueChange={(v) => handlePriority(info.row.original.id, v as Priority)}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      }),
      col.accessor("ville", {
        header: "Ville",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("lastContactedAt", {
        header: "Dernier contact",
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      col.accessor((row) => row.assignedTo?.name ?? null, {
        id: "assignee",
        header: "Assigné à",
        cell: (info) => (
          <span className="text-xs">{info.getValue() ?? "—"}</span>
        ),
      }),
      col.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(row.original.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/20 p-10 text-center text-sm text-muted-foreground">
        Aucun prospect. Ajoutez-en depuis la recherche.
      </div>
    );
  }

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
          {table.getRowModel().rows.map((r) => (
            <TableRow key={r.id} className="hover:bg-accent/30">
              {r.getVisibleCells().map((cell) => (
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

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const label = PIPELINE_STAGES.find((s) => s.value === stage)?.label ?? stage;
  return <Badge variant="secondary">{label}</Badge>;
}
