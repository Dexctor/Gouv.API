"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  TrendingUp,
  Globe,
  Users,
  Megaphone,
  ClipboardList,
} from "lucide-react";
import type { ReactNode } from "react";

export interface DetailTab {
  key: string;
  label: string;
  icon: "building" | "trend" | "web" | "users" | "bodacc" | "activity";
  count?: number;
  content: ReactNode;
}

const ICONS = {
  building: Building2,
  trend: TrendingUp,
  web: Globe,
  users: Users,
  bodacc: Megaphone,
  activity: ClipboardList,
} as const;

interface Props {
  tabs: DetailTab[];
  defaultTab?: string;
}

export function DetailTabs({ tabs, defaultTab }: Props) {
  const first = defaultTab ?? tabs[0]?.key;
  return (
    <Tabs defaultValue={first} className="min-w-0 gap-4">
      <div className="overflow-x-auto border-b border-border pb-1">
      <TabsList variant="line" aria-label="Détails du prospect" className="w-max min-w-full justify-start">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <TabsTrigger key={t.key} value={t.key} className="min-h-9 gap-1.5 px-3 text-xs after:bg-primary">
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {typeof t.count === "number" && t.count > 0 && (
                <span className="ml-0.5 rounded bg-muted px-1.5 py-0 text-[9px] font-semibold">
                  {t.count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} keepMounted={t.key === "web" || t.key === "activity"} className="min-w-0 space-y-4 data-[hidden]:hidden">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
