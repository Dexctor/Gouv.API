import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
