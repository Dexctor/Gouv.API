"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PipelineStage, Priority, ActivityType } from "@prisma/client";
import { getCompanyBySiren } from "@/lib/api/recherche-entreprises";

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  return session.user;
}

const sirenSchema = z.string().regex(/^\d{9}$/, "SIREN invalide (9 chiffres)");

export async function addToPipelineAction(
  siren: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = sirenSchema.safeParse(siren);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const exists = await prisma.prospect.findUnique({
      where: { siren: parsed.data },
    });
    if (exists) {
      return { success: true, data: { id: exists.id } };
    }

    // Récupère les infos entreprise depuis l'API gouv.
    const company = await getCompanyBySiren(parsed.data);
    if (!company) {
      return { success: false, error: "Entreprise introuvable via l'API" };
    }

    const siege = company.siege;
    const prospect = await prisma.prospect.create({
      data: {
        siren: parsed.data,
        siret: siege?.siret,
        denomination: company.nom_complet,
        nomCommercial: company.nom_raison_sociale,
        adresse: siege?.adresse,
        codePostal: siege?.code_postal,
        ville: siege?.commune,
        latitude: siege?.latitude ? Number(siege.latitude) : undefined,
        longitude: siege?.longitude ? Number(siege.longitude) : undefined,
        codeNaf: company.activite_principale,
        trancheEffectif: company.tranche_effectif_salarie,
        dateCreation: company.date_creation
          ? new Date(company.date_creation)
          : undefined,
        formeJuridique: company.nature_juridique,
        etatAdministratif: company.etat_administratif,
        stage: PipelineStage.A_QUALIFIER,
        assignedToId: user.id,
        activities: {
          create: {
            type: ActivityType.SYSTEM,
            content: `Prospect ajouté au pipeline par ${user.name ?? user.email}`,
            userId: user.id,
          },
        },
      },
    });

    revalidatePath("/pipeline");
    revalidatePath("/search");
    return { success: true, data: { id: prospect.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const updateStageSchema = z.object({
  id: z.string().min(1),
  stage: z.nativeEnum(PipelineStage),
});

export async function updateStageAction(
  id: string,
  stage: PipelineStage
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateStageSchema.safeParse({ id, stage });
    if (!parsed.success) return { success: false, error: "Entrée invalide" };

    const prev = await prisma.prospect.findUnique({
      where: { id },
      select: { stage: true },
    });
    if (!prev) return { success: false, error: "Prospect introuvable" };

    await prisma.$transaction([
      prisma.prospect.update({
        where: { id },
        data: {
          stage,
          lastContactedAt: stage !== prev.stage ? new Date() : undefined,
        },
      }),
      prisma.activity.create({
        data: {
          prospectId: id,
          userId: user.id,
          type: ActivityType.STAGE_CHANGE,
          content: `Stage : ${prev.stage} → ${stage}`,
        },
      }),
    ]);

    revalidatePath("/pipeline");
    revalidatePath(`/prospects`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function updatePriorityAction(
  id: string,
  priority: Priority
): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.prospect.update({ where: { id }, data: { priority } });
    revalidatePath("/pipeline");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function updateNotesAction(
  id: string,
  notes: string
): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.prospect.update({ where: { id }, data: { notes } });
    revalidatePath(`/prospects`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const urlSchema = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === "" ||
      /^https?:\/\//.test(v) ||
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v),
    "URL invalide"
  );

export async function updateSiteWebAction(
  id: string,
  url: string
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    let normalized = parsed.data.trim();
    if (normalized && !/^https?:\/\//.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    await prisma.prospect.update({
      where: { id },
      data: { siteWeb: normalized || null },
    });
    revalidatePath(`/prospects`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteProspectAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.prospect.delete({ where: { id } });
    revalidatePath("/pipeline");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function assignProspectAction(
  id: string,
  userId: string | null
): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.prospect.update({
      where: { id },
      data: { assignedToId: userId },
    });
    revalidatePath("/pipeline");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
