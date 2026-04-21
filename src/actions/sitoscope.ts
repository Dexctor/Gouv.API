"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActivityType } from "@prisma/client";
import {
  launchAudit,
  getAuditStatus,
  isSitoscopeConfigured,
} from "@/lib/api/sitoscope";

interface LaunchResult {
  success: boolean;
  error?: string;
  auditId?: string;
}

export async function launchSitoscopeAuditAction(
  prospectId: string
): Promise<LaunchResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  if (!isSitoscopeConfigured()) {
    return {
      success: false,
      error: "Sitoscope n'est pas configuré (env vars manquantes)",
    };
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, siteWeb: true, denomination: true },
  });
  if (!prospect?.siteWeb) {
    return {
      success: false,
      error: "Aucune URL de site web renseignée sur ce prospect",
    };
  }

  const res = await launchAudit(prospect.siteWeb);
  if ("error" in res) return { success: false, error: res.error };

  // Trace dans l'historique
  await prisma.activity.create({
    data: {
      prospectId: prospect.id,
      userId: session.user.id,
      type: ActivityType.SYSTEM,
      content: `Audit Sitoscope lancé (ID ${res.auditId}) sur ${prospect.siteWeb}`,
    },
  });

  revalidatePath(`/prospects`);
  return { success: true, auditId: res.auditId };
}

export async function getSitoscopeStatusAction(auditId: string) {
  const session = await auth();
  if (!session?.user) return null;
  return getAuditStatus(auditId);
}
