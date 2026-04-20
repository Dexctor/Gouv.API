"use server";

import Papa from "papaparse";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineStage } from "@prisma/client";

export interface ExportResult {
  success: boolean;
  error?: string;
  csv?: string;
  filename?: string;
}

export async function exportPipelineCsvAction(filters?: {
  stage?: PipelineStage;
}): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  try {
    const prospects = await prisma.prospect.findMany({
      where: filters?.stage ? { stage: filters.stage } : undefined,
      include: {
        assignedTo: { select: { name: true, email: true } },
        financials: {
          orderBy: { dateCloture: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const rows = prospects.map((p) => ({
      denomination: p.denomination,
      siren: p.siren,
      siret: p.siret ?? "",
      adresse: p.adresse ?? "",
      code_postal: p.codePostal ?? "",
      ville: p.ville ?? "",
      naf: p.codeNaf ?? "",
      tranche_effectif: p.trancheEffectif ?? "",
      forme_juridique: p.formeJuridique ?? "",
      site_web: p.siteWeb ?? "",
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      stage: p.stage,
      priorite: p.priority,
      derniere_interaction: p.lastContactedAt?.toISOString() ?? "",
      assignee: p.assignedTo?.name ?? p.assignedTo?.email ?? "",
      ca_dernier_exercice: p.financials[0]?.chiffreAffaires ?? "",
      ebe: p.financials[0]?.ebe ?? "",
      resultat_net: p.financials[0]?.resultatNet ?? "",
      notes: p.notes ?? "",
    }));

    const csv = Papa.unparse(rows, { delimiter: ";", header: true });
    const ts = new Date().toISOString().slice(0, 10);
    const filename = `gouv-api-pipeline-${ts}.csv`;
    return { success: true, csv, filename };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
