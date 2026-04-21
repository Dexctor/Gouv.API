"use client";

import { useMemo, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PipelineStage } from "@prisma/client";
import { PIPELINE_STAGES, type ProspectListItem } from "@/types/prospect";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import {
  exportPipelineCsvAction,
  type ExportFilters,
} from "@/actions/export";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

export function PipelineClient({ rows }: { rows: ProspectListItem[] }) {
  const [stage, setStage] = useState<PipelineStage | "all">("all");
  const [search, setSearch] = useState("");
  const [isExporting, startExport] = useTransition();

  // Export options
  const [exportAssigned, setExportAssigned] = useState<"all" | "me">("all");
  const [exportMinCA, setExportMinCA] = useState("");
  const [exportOnlyWithSite, setExportOnlyWithSite] = useState(false);
  const [exportOnlyWithContact, setExportOnlyWithContact] = useState(false);
  const [exportLastContactDays, setExportLastContactDays] = useState("");

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
      const filters: ExportFilters = {
        stages: stage !== "all" ? [stage] : undefined,
        assignedToMe: exportAssigned === "me",
        minCA: exportMinCA ? parseFloat(exportMinCA) * 1000 : undefined, // kilo-euros
        onlyWithSite: exportOnlyWithSite || undefined,
        onlyWithContact: exportOnlyWithContact || undefined,
        lastContactedAfter: exportLastContactDays
          ? new Date(
              Date.now() -
                parseInt(exportLastContactDays, 10) * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
      };
      const res = await exportPipelineCsvAction(filters);
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
      toast.success(`${res.count ?? 0} ligne(s) exportées`);
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
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                disabled={isExporting || filtered.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exporter CSV
              </Button>
            }
          />
          <PopoverContent className="w-80 space-y-3 p-4" align="end">
            <div className="space-y-1">
              <Label className="text-xs">Assignation</Label>
              <Select
                value={exportAssigned}
                onValueChange={(v) => setExportAssigned(v as "all" | "me")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout le pipeline</SelectItem>
                  <SelectItem value="me">Mes prospects uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="exportMinCA" className="text-xs">
                CA minimum (k€)
              </Label>
              <Input
                id="exportMinCA"
                inputMode="numeric"
                placeholder="300"
                value={exportMinCA}
                onChange={(e) => setExportMinCA(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exportDays" className="text-xs">
                Contacté depuis moins de (jours)
              </Label>
              <Input
                id="exportDays"
                inputMode="numeric"
                placeholder="30"
                value={exportLastContactDays}
                onChange={(e) => setExportLastContactDays(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={exportOnlyWithSite}
                  onCheckedChange={(v) => setExportOnlyWithSite(v === true)}
                />
                <span>Avec site web</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={exportOnlyWithContact}
                  onCheckedChange={(v) => setExportOnlyWithContact(v === true)}
                />
                <span>Avec email ou téléphone</span>
              </label>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              size="sm"
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger
            </Button>
          </PopoverContent>
        </Popover>
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
