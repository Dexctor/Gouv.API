import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Megaphone, AlertTriangle, Handshake, Sparkles } from "lucide-react";
import type { BodaccEvent } from "@prisma/client";

type EventCategory = "risque" | "rachat" | "vie-sociale" | "autre";

const RISK_PATTERNS =
  /(redressement|liquidation|sauvegarde|cessation|procedure|radiation)/i;
const RACHAT_PATTERNS =
  /(vente|cession|rachat|acquisition|fonds|apport|fusion|scission)/i;
const VIE_SOCIALE_PATTERNS =
  /(creation|immatriculation|modification|transfert|capital|denomination|dirigeant)/i;

function categorize(ev: BodaccEvent): EventCategory {
  const hay = `${ev.type} ${ev.content}`.toLowerCase();
  if (RISK_PATTERNS.test(hay)) return "risque";
  if (RACHAT_PATTERNS.test(hay)) return "rachat";
  if (VIE_SOCIALE_PATTERNS.test(hay)) return "vie-sociale";
  return "autre";
}

const CAT_META: Record<
  EventCategory,
  { label: string; icon: typeof Megaphone; classes: string }
> = {
  risque: {
    label: "Alerte risque",
    icon: AlertTriangle,
    classes: "border-red-500/30 bg-red-500/5 text-red-400",
  },
  rachat: {
    label: "Rachat / vente",
    icon: Handshake,
    classes: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  },
  "vie-sociale": {
    label: "Vie sociale",
    icon: Sparkles,
    classes: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  },
  autre: {
    label: "Autre",
    icon: Megaphone,
    classes: "border-border/60 bg-card/40 text-muted-foreground",
  },
};

export function BodaccCard({ events }: { events: BodaccEvent[] }) {
  if (events.length === 0) return null;

  const grouped = events.reduce<Record<EventCategory, BodaccEvent[]>>(
    (acc, ev) => {
      const cat = categorize(ev);
      (acc[cat] = acc[cat] ?? []).push(ev);
      return acc;
    },
    { risque: [], rachat: [], "vie-sociale": [], autre: [] }
  );

  const order: EventCategory[] = ["risque", "rachat", "vie-sociale", "autre"];

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Megaphone className="h-4 w-4" />
          BODACC — annonces légales ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.map((cat) => {
          const list = grouped[cat];
          if (list.length === 0) return null;
          const meta = CAT_META[cat];
          const Icon = meta.icon;
          return (
            <div key={cat} className="space-y-1.5">
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.classes.split(" ").find((c) => c.startsWith("text-"))}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
                <Badge variant="outline" className="text-[10px]">
                  {list.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {list.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    className={`rounded-md border p-2 text-xs ${meta.classes}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{ev.type}</span>
                      <span className="shrink-0 text-[11px] opacity-80">
                        {format(ev.date, "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-80">
                      {ev.publication}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
