"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RelativeTime } from "@/components/ui/relative-time";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateStageAction,
  updatePriorityAction,
  deleteProspectAction,
  refreshProspectAction,
} from "@/actions/prospects";
import { PipelineStage, Priority } from "@prisma/client";
import { PIPELINE_STAGES, PRIORITIES } from "@/types/prospect";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  id: string;
  stage: PipelineStage;
  priority: Priority;
  syncedAt?: Date | null;
}

export function ProspectActionsBar({ id, stage, priority, syncedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStage = (s: PipelineStage) =>
    startTransition(async () => {
      const res = await updateStageAction(id, s);
      if (!res.success) toast.error(res.error);
      else toast.success("Stage mis à jour");
    });

  const handlePriority = (p: Priority) =>
    startTransition(async () => {
      const res = await updatePriorityAction(id, p);
      if (!res.success) toast.error(res.error);
    });

  const handleRefresh = () =>
    startTransition(async () => {
      const res = await refreshProspectAction(id);
      if (res.success) toast.success("Données rafraîchies");
      else toast.error(res.error);
    });

  const handleDelete = () => {
    if (!confirm("Supprimer ce prospect ? Cette action est irréversible.")) return;
    startTransition(async () => {
      const res = await deleteProspectAction(id);
      if (res.success) {
        toast.success("Supprimé");
        router.push("/pipeline");
      } else {
        toast.error(res.error);
      }
    });
  };


  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={stage} onValueChange={(v) => handleStage(v as PipelineStage)}>
        <SelectTrigger className="w-40">
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
      <Select
        value={priority}
        onValueChange={(v) => handlePriority(v as Priority)}
      >
        <SelectTrigger className="w-28">
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        )}
        Rafraîchir
      </Button>
      {syncedAt && (
        <span className="text-xs text-muted-foreground">
          synchro <RelativeTime date={syncedAt} />
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        aria-label="Supprimer"
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
