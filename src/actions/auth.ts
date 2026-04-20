"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court"),
});

export type LoginActionResult =
  | { success: true }
  | { success: false; error: string };

export async function loginAction(
  _prev: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Données de connexion invalides",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Identifiants incorrects" };
    }
    // Next.js `redirect()` propage via une exception spéciale : on la relance.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { success: false, error: "Erreur inattendue" };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
