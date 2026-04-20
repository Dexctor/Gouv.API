"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import Link from "next/link";
import { toast } from "sonner";
import { PipelineStage } from "@prisma/client";
import { PIPELINE_STAGES, type ProspectListItem } from "@/types/prospect";
import { updateStageAction } from "@/actions/prospects";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PipelineBoard({ rows }: { rows: ProspectListItem[] }) {
  const [local, setLocal] = useState(rows);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStage = (stage: PipelineStage) =>
    local.filter((p) => p.stage === stage);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as PipelineStage;
    const prospectId = active.id as string;
    const prospect = local.find((p) => p.id === prospectId);
    if (!prospect || prospect.stage === newStage) return;

    // Optimistic
    setLocal((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, stage: newStage } : p))
    );

    startTransition(async () => {
      const res = await updateStageAction(prospectId, newStage);
      if (!res.success) {
        toast.error(res.error);
        setLocal(rows);
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid auto-rows-fr gap-3 overflow-x-auto pb-4 lg:grid-cols-6">
        {PIPELINE_STAGES.map((s) => (
          <StageColumn
            key={s.value}
            stage={s.value}
            label={s.label}
            prospects={byStage(s.value)}
          />
        ))}
      </div>
    </DndContext>
  );
}

function StageColumn({
  stage,
  label,
  prospects,
}: {
  stage: PipelineStage;
  label: string;
  prospects: ProspectListItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-56 flex-col gap-2 rounded-lg border border-border/60 bg-card/30 p-3 transition-colors",
        isOver && "border-primary/50 bg-accent/20"
      )}
    >
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {prospects.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {prospects.map((p) => (
          <ProspectCard key={p.id} prospect={p} />
        ))}
      </div>
    </div>
  );
}

function ProspectCard({ prospect }: { prospect: ProspectListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: prospect.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border border-border/60 bg-background/80 p-2.5 shadow-sm",
        "hover:border-border hover:bg-accent/30",
        isDragging && "opacity-50"
      )}
    >
      <Link
        href={`/prospects/${prospect.siren}`}
        className="block text-sm font-medium hover:underline"
        onClick={(e) => isDragging && e.preventDefault()}
      >
        {prospect.denomination}
      </Link>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{prospect.siren}</span>
        <span>{prospect.ville ?? "—"}</span>
      </div>
    </div>
  );
}
