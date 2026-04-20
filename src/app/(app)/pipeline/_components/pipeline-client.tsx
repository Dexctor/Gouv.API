"use client";

import { useMemo, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PipelineStage } from "@prisma/client";
import { PIPELINE_STAGES, type ProspectListItem } from "@/types/prospect";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { exportPipelineCsvAction } from "@/actions/export";
import { toast } from "sonner";
import { Download, Loader2, LayoutGrid, Table as TableIcon } from "lucide-react";

export function PipelineClient({ rows }: { rows: ProspectListItem[] }) {
  const [stage, setStage] = useState<PipelineStage | "all">("all");
  const [search, setSearch] = useState("");
  const [isExporting, startExport] = useTransition();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (!needle) return true;
      return (
        r.denomination.toLowerCase().includes(needle) ||
        r.siren.includes(needle) ||
        (r.ville?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [rows, stage, search]);

  const handleExport = () => {
    startExport(async () => {
      const res = await exportPipelineCsvAction(
        stage !== "all" ? { stage } : undefined
      );
      if (!res.success || !res.csv) {
        toast.error(res.error ?? "Export impossible");
        return;
      }
      const blob = new Blob(["\uFEFF" + res.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename ?? "pipeline.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export généré");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher dénomination, SIREN, ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={stage}
          onValueChange={(v) => setStage(v as PipelineStage | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes étapes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes étapes</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || filtered.length === 0}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exporter CSV
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="board">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Board
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-4">
          <PipelineTable rows={filtered} />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <PipelineBoard rows={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
