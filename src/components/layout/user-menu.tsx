"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { Session } from "next-auth";

export function UserMenu({ user }: { user: Session["user"] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const initials =
    user.name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent"
          >
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarFallback className="rounded-md text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col items-start text-left leading-tight">
                <span className="text-sm font-medium">
                  {user.name ?? user.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logoutAction();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
