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
    <Tabs defaultValue={first} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              {typeof t.count === "number" && t.count > 0 && (
                <span className="ml-0.5 rounded bg-muted px-1.5 py-0 text-[9px] font-semibold">
                  {t.count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} className="space-y-4">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
