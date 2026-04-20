"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginAction } from "@/actions/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [isRouting, startRouting] = useTransition();
  const [state, formAction, pending] = useActionState(loginAction, null);

  // Redirige à la victoire — évalué à chaque changement de state
  if (state?.success) {
    startRouting(() => {
      router.replace("/");
      router.refresh();
    });
  }

  // Affiche les erreurs via toast (évite blink à chaque re-render)
  if (state && !state.success) {
    toast.error(state.error);
  }

  return (
    <Card className="w-full max-w-sm border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace Gouv-API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vous@exemple.fr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={pending || isRouting}
          >
            {(pending || isRouting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Se connecter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
