import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Paramètres — Gouv-API",
};

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Compte, préférences et intégrations.
        </p>
      </div>
      <Card className="max-w-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Nom</div>
            <div>{session?.user?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{session?.user?.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Rôle</div>
            <div>{session?.user?.role}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
