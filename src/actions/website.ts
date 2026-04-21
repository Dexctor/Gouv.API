"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { detectWebsite } from "@/lib/api/website-detect";
import { auditSeo, type SeoAuditResult } from "@/lib/api/seo-audit";

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

  // Confiance haute = on persiste directement, sinon on propose à l'utilisateur
  if (detected.confidence === "high" && !prospect.siteWeb) {
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { siteWeb: detected.url },
    });
    revalidatePath(`/prospects`);
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
  audit?: SeoAuditResult;
}

// Audit SEO préliminaire — pas besoin de session car données publiques,
// mais on force l'auth par cohérence (pas d'exposition publique).
export async function auditSeoAction(url: string): Promise<AuditResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  if (!url) return { success: false, error: "URL manquante" };

  const audit = await auditSeo(url);
  if (!audit) return { success: false, error: "Audit impossible" };

  return { success: true, audit };
}
