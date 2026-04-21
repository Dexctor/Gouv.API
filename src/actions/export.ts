"use server";

import Papa from "papaparse";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineStage, Priority, Prisma } from "@prisma/client";

export interface ExportResult {
  success: boolean;
  error?: string;
  csv?: string;
  filename?: string;
  count?: number;
}

export interface ExportFilters {
  stages?: PipelineStage[];
  priorities?: Priority[];
  assignedToMe?: boolean;
  assignedToUserId?: string;
  minCA?: number;
  onlyWithSite?: boolean;
  onlyWithContact?: boolean; // email ou téléphone renseigné
  createdAfter?: string; // ISO date
  lastContactedAfter?: string;
}

export async function exportPipelineCsvAction(
  filters?: ExportFilters
): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  try {
    const where: Prisma.ProspectWhereInput = {};
    const and: Prisma.ProspectWhereInput[] = [];

    if (filters?.stages?.length) {
      and.push({ stage: { in: filters.stages } });
    }
    if (filters?.priorities?.length) {
      and.push({ priority: { in: filters.priorities } });
    }
    if (filters?.assignedToMe) {
      and.push({ assignedToId: session.user.id });
    } else if (filters?.assignedToUserId) {
      and.push({ assignedToId: filters.assignedToUserId });
    }
    if (filters?.onlyWithSite) {
      and.push({ siteWeb: { not: null } });
    }
    if (filters?.onlyWithContact) {
      and.push({
        OR: [{ email: { not: null } }, { telephone: { not: null } }],
      });
    }
    if (filters?.createdAfter) {
      and.push({ createdAt: { gte: new Date(filters.createdAfter) } });
    }
    if (filters?.lastContactedAfter) {
      and.push({
        lastContactedAt: { gte: new Date(filters.lastContactedAfter) },
      });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const prospects = await prisma.prospect.findMany({
      where,
      include: {
        assignedTo: { select: { name: true, email: true } },
        financials: { orderBy: { dateCloture: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filtre CA post-fetch (pas de colonne CA sur prospect, on passe par Financial)
    const filtered = filters?.minCA
      ? prospects.filter(
          (p) =>
            (p.financials[0]?.chiffreAffaires ?? 0) >= (filters.minCA ?? 0)
        )
      : prospects;

    const rows = filtered.map((p) => ({
      denomination: p.denomination,
      siren: p.siren,
      siret: p.siret ?? "",
      adresse: p.adresse ?? "",
      code_postal: p.codePostal ?? "",
      ville: p.ville ?? "",
      naf: p.codeNaf ?? "",
      tranche_effectif: p.trancheEffectif ?? "",
      categorie: p.categorie ?? "",
      forme_juridique: p.formeJuridique ?? "",
      site_web: p.siteWeb ?? "",
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      stage: p.stage,
      priorite: p.priority,
      derniere_interaction: p.lastContactedAt?.toISOString().slice(0, 10) ?? "",
      creation_pipeline: p.createdAt.toISOString().slice(0, 10),
      assignee: p.assignedTo?.name ?? p.assignedTo?.email ?? "",
      ca_dernier_exercice: p.financials[0]?.chiffreAffaires ?? "",
      ebe: p.financials[0]?.ebe ?? "",
      resultat_net: p.financials[0]?.resultatNet ?? "",
      idccs: p.idccs.join("|"),
      notes: p.notes ?? "",
    }));

    const csv = Papa.unparse(rows, { delimiter: ";", header: true });
    const ts = new Date().toISOString().slice(0, 10);
    const filename = `gouv-api-pipeline-${ts}.csv`;
    return { success: true, csv, filename, count: filtered.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
