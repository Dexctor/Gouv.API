export default function ProspectLoading() {
  return (
    <div role="status" aria-label="Chargement de la fiche prospect" className="mx-auto w-full max-w-7xl space-y-4">
      <p className="text-sm text-muted-foreground">Chargement de la fiche prospect…</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-20 rounded-lg bg-muted/50" />
        <div className="h-28 rounded-lg bg-muted/50" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_288px]">
          <div className="h-72 rounded-lg bg-muted/50" />
          <div className="h-72 rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
