import type {
  Prospect,
  Activity,
  Financial,
  Tag,
  User,
  PipelineStage,
  Priority,
  ActivityType,
} from "@prisma/client";

export type { PipelineStage, Priority, ActivityType };

export type ProspectWithRelations = Prospect & {
  activities: (Activity & { user: Pick<User, "id" | "name" | "email"> })[];
  financials: Financial[];
  tags: Tag[];
  assignedTo: Pick<User, "id" | "name" | "email"> | null;
};

export type ProspectListItem = Prospect & {
  assignedTo: Pick<User, "id" | "name"> | null;
  _count?: { activities: number };
};

export const PIPELINE_STAGES: Array<{ value: PipelineStage; label: string }> = [
  { value: "A_QUALIFIER", label: "À qualifier" },
  { value: "CONTACTE", label: "Contacté" },
  { value: "RDV", label: "RDV" },
  { value: "PROPOSITION", label: "Proposition" },
  { value: "SIGNE", label: "Signé" },
  { value: "PERDU", label: "Perdu" },
];

export const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: "LOW", label: "Basse" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
];

export function stageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}
