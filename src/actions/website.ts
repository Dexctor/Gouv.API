"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { detectWebsite } from "@/lib/api/website-detect";
import {
  collectWebObservations,
  type WebCollectionResult,
} from "@/lib/api/seo-audit";
import { Prisma } from "@prisma/client";

interface DetectResult {
  success: boolean;
  error?: string;
  url?: string;
  confidence?: "high" | "medium" | "low";
}

export async function detectWebsiteAction(
  prospectId: string
): Promise<DetectResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: {
      denomination: true,
      ville: true,
      siteWeb: true,
      siren: true,
    },
  });
  if (!prospect) return { success: false, error: "Prospect introuvable" };

  const detected = await detectWebsite({
    denomination: prospect.denomination,
    ville: prospect.ville,
  });
  if (!detected) {
    return { success: false, error: "Aucun site trouvé automatiquement" };
  }

  // Une réponse HTTP prouve seulement que le domaine répond : il reste candidat.
  if (!prospect.siteWeb) {
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        siteWeb: detected.url,
        siteWebStatus: "candidate",
        siteWebVerifiedAt: null,
      },
    });
    revalidatePath(`/prospects/${prospect.siren}`);
  }

  return {
    success: true,
    url: detected.url,
    confidence: detected.confidence,
  };
}

interface AuditResult {
  success: boolean;
  error?: string;
  collection?: WebCollectionResult;
}

export async function collectWebObservationsAction(
  prospectId: string
): Promise<AuditResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { siren: true, siteWeb: true, siteWebStatus: true },
  });
  if (!prospect?.siteWeb) {
    return { success: false, error: "Aucun domaine renseigné" };
  }
  if (prospect.siteWebStatus !== "verified") {
    return {
      success: false,
      error: "Le domaine doit être vérifié avant toute collecte",
    };
  }

  const collection = await collectWebObservations(prospect.siteWeb);

  if (collection.observations.length > 0) {
    await prisma.$transaction(
      collection.observations.map((observation) => {
      const scope = `${observation.scope}:${observation.url}`;
      return prisma.observation.upsert({
        where: {
          prospectId_source_scope_key: {
            prospectId,
            source: observation.source,
            scope,
            key: observation.key,
          },
        },
        update: {
          type: observation.type,
          value: observation.value as Prisma.InputJsonValue,
          url: observation.url,
          observedAt: new Date(observation.observedAt),
          status: observation.status,
          evidence: observation.evidence ?? null,
        },
        create: {
          prospectId,
          type: observation.type,
          key: observation.key,
          value: observation.value as Prisma.InputJsonValue,
          source: observation.source,
          scope,
          url: observation.url,
          observedAt: new Date(observation.observedAt),
          status: observation.status,
          evidence: observation.evidence,
        },
        });
      })
    );
  }

  revalidatePath(`/prospects/${prospect.siren}`);

  return {
    success: collection.status === "completed",
    error: collection.error,
    collection,
  };
}
