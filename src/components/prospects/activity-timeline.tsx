"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityType } from "@prisma/client";
import { addActivityAction } from "@/actions/activities";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import type { ProspectWithRelations } from "@/types/prospect";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Appel",
  EMAIL: "Email",
  MEETING: "RDV",
  STAGE_CHANGE: "Changement d'étape",
  SYSTEM: "Système",
};

export function ActivityTimeline({
  prospectId,
  activities,
}: {
  prospectId: string;
  activities: ProspectWithRelations["activities"];
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<ActivityType>(ActivityType.NOTE);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!content.trim()) return;
    startTransition(async () => {
      const res = await addActivityAction(prospectId, type, content.trim());
      if (res.success) {
        setContent("");
        toast.success("Activité ajoutée");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Historique</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune activité pour le moment.
            </p>
          )}
          <ul className="space-y-3">
            {activities.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-border/60 bg-card/40 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {ACTIVITY_LABELS[a.type]} ·{" "}
                    {a.user.name ?? a.user.email}
                  </span>
                  <span title={format(a.createdAt, "PPP p", { locale: fr })}>
                    {formatDistanceToNow(a.createdAt, { locale: fr, addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{a.content}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <Select
              value={type}
              onValueChange={(v) => setType(v as ActivityType)}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["NOTE", "CALL", "EMAIL", "MEETING"] as const
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTIVITY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Ajouter une note, un résumé d'appel..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={submit}
            disabled={isPending || !content.trim()}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
