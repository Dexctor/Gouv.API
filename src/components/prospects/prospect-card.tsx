"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateNotesAction, updateSiteWebAction } from "@/actions/prospects";
import { toast } from "sonner";
import { Loader2, Save, Globe } from "lucide-react";

export function WebsiteEditor({
  prospectId,
  initial,
}: {
  prospectId: string;
  initial: string | null;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateSiteWebAction(prospectId, url);
      if (res.success) toast.success("Site web mis à jour");
      else toast.error(res.error);
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4" /> Site web
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.fr"
            className="text-sm"
          />
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          URL utilisée pour l&apos;audit SEO et Sitoscope.
        </p>
      </CardContent>
    </Card>
  );
}

export function NotesEditor({
  prospectId,
  initial,
}: {
  prospectId: string;
  initial: string | null;
}) {
  const [notes, setNotes] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateNotesAction(prospectId, notes);
      if (res.success) toast.success("Notes sauvegardées");
      else toast.error(res.error);
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notes libres</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Contexte, éléments clés, prochaines étapes..."
          className="text-sm"
        />
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
