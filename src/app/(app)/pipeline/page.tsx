import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PipelineClient } from "./_components/pipeline-client";

export const metadata: Metadata = {
  title: "Pipeline — Gouv-API",
};

export default async function PipelinePage() {
  const rows = await prisma.prospect.findMany({
    include: {
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { activities: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Qualifiez et suivez vos prospects dans le cycle commercial.
        </p>
      </div>
      <PipelineClient rows={rows} />
    </div>
  );
}
