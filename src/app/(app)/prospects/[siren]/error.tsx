"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProspectError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <section role="alert" className="mx-auto w-full max-w-7xl rounded-lg border border-border bg-card p-5">
      <h1 className="text-base font-semibold">La fiche n’a pas pu être chargée</h1>
      <p className="mt-2 text-sm text-muted-foreground">Les données sont momentanément indisponibles. Vous pouvez réessayer ou revenir au pipeline.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={unstable_retry}>Réessayer</Button>
        <Button asChild variant="outline"><Link href="/pipeline">Retour au pipeline</Link></Button>
      </div>
    </section>
  );
}
