"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActivityType } from "@prisma/client";

type ActionResult = { success: true } | { success: false; error: string };

const schema = z.object({
  prospectId: z.string().min(1),
  type: z.nativeEnum(ActivityType),
  content: z.string().trim().min(1, "Contenu requis").max(2000),
});

export async function addActivityAction(
  prospectId: string,
  type: ActivityType,
  content: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non authentifié" };

  const parsed = schema.safeParse({ prospectId, type, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide" };
  }

  try {
    await prisma.$transaction([
      prisma.activity.create({
        data: {
          prospectId: parsed.data.prospectId,
          type: parsed.data.type,
          content: parsed.data.content,
          userId: session.user.id,
        },
      }),
      prisma.prospect.update({
        where: { id: parsed.data.prospectId },
        data: { lastContactedAt: new Date() },
      }),
    ]);
    revalidatePath(`/prospects`);
    revalidatePath("/pipeline");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
