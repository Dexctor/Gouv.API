import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Megaphone, AlertTriangle } from "lucide-react";
import type { BodaccEvent } from "@prisma/client";

const RISK_PATTERNS = /(redressement|liquidation|sauvegarde|cessation|procedure)/i;

export function BodaccCard({ events }: { events: BodaccEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Megaphone className="h-4 w-4" />
          BODACC ({events.length} annonce{events.length > 1 ? "s" : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map((ev) => {
          const risky = RISK_PATTERNS.test(ev.type);
          return (
            <div
              key={ev.id}
              className={`rounded-md border p-2.5 text-sm ${
                risky
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border/60 bg-card/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {risky && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="font-medium">{ev.type}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ev.publication}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(ev.date, "d MMM yyyy", { locale: fr })}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
