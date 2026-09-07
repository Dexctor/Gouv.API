"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  updateNotesAction,
  updateSiteWebAction,
  updateSiteWebStatusAction,
} from "@/actions/prospects";
import { toast } from "sonner";
import { Check, Loader2, Save, Globe, X } from "lucide-react";
import type { WebsiteStatus } from "@prisma/client";

const SITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  unknown: "Inconnu",
  candidate: "Candidat",
  verified: "Vérifié",
  rejected: "Rejeté",
};

export function WebsiteEditor({
  prospectId,
  initial,
  initialStatus,
}: {
  prospectId: string;
  initial: string | null;
  initialStatus: WebsiteStatus;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasUnsavedUrl = url.trim() !== (initial ?? "");

  const save = () => {
    startTransition(async () => {
      const res = await updateSiteWebAction(prospectId, url);
      if (res.success) {
        if (res.data?.status) setStatus(res.data.status);
        toast.success("Site web mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const setWebsiteStatus = (nextStatus: WebsiteStatus) => {
    startTransition(async () => {
      const res = await updateSiteWebStatusAction(prospectId, nextStatus);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setStatus(nextStatus);
      toast.success(
        nextStatus === "verified" ? "Domaine vérifié" : "Domaine rejeté"
      );
      router.refresh();
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Statut du domaine</span>
          <Badge variant="outline" className={status === "verified" ? "border-emerald-500/25 text-emerald-400" : status === "candidate" ? "border-amber-500/25 text-amber-400" : status === "rejected" ? "border-red-500/25 text-red-400" : "text-muted-foreground"}>{SITE_STATUS_LABELS[status]}</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            aria-label="Adresse du site web"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.fr"
            className="text-sm"
          />
          <Button size="sm" aria-label="Enregistrer le site web" variant="outline" onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Une URL ajoutée ou détectée reste candidate jusqu&apos;à validation
          humaine. La modifier annule sa validation.
        </p>
        {url.trim() && (
          <div className="mt-3 space-y-2">
            {hasUnsavedUrl && (
              <p className="text-xs text-muted-foreground">
                Enregistrez l&apos;URL avant de valider son identité.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant={status === "verified" ? "secondary" : "default"}
              onClick={() => setWebsiteStatus("verified")}
              disabled={isPending || hasUnsavedUrl || status === "verified"}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Valider ce domaine
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setWebsiteStatus("rejected")}
              disabled={isPending || hasUnsavedUrl || status === "rejected"}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Rejeter
            </Button>
            </div>
          </div>
        )}
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
          aria-label="Notes et prochaines actions"
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
