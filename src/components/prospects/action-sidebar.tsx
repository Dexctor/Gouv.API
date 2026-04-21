"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateStageAction,
  updatePriorityAction,
  refreshProspectAction,
  deleteProspectAction,
} from "@/actions/prospects";
import { PipelineStage, Priority } from "@prisma/client";
import { PIPELINE_STAGES, PRIORITIES } from "@/types/prospect";
import {
  Phone,
  Mail,
  Globe,
  Navigation,
  Copy,
  RefreshCw,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { buildPappersUrl } from "@/lib/api/pappers-url";

interface Props {
  prospect: {
    id: string;
    siren: string;
    stage: PipelineStage;
    priority: Priority;
    telephone: string | null;
    email: string | null;
    siteWeb: string | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

// Sidebar sticky avec toutes les actions commerciales importantes.
// Reste visible pendant le scroll sur desktop.
export function ActionSidebar({ prospect }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStage = (s: PipelineStage) =>
    startTransition(async () => {
      const res = await updateStageAction(prospect.id, s);
      if (!res.success) toast.error(res.error);
      else toast.success("Stage mis à jour");
    });

  const handlePriority = (p: Priority) =>
    startTransition(async () => {
      const res = await updatePriorityAction(prospect.id, p);
      if (!res.success) toast.error(res.error);
    });

  const handleRefresh = () =>
    startTransition(async () => {
      const res = await refreshProspectAction(prospect.id);
      if (res.success) toast.success("Données rafraîchies");
      else toast.error(res.error);
    });

  const handleDelete = () => {
    if (!confirm("Supprimer ce prospect ?")) return;
    startTransition(async () => {
      const res = await deleteProspectAction(prospect.id);
      if (res.success) {
        toast.success("Supprimé");
        router.push("/pipeline");
      } else toast.error(res.error);
    });
  };

  const adresseComplete = [prospect.adresse, prospect.codePostal, prospect.ville]
    .filter(Boolean)
    .join(", ");
  const gmapsUrl =
    prospect.latitude && prospect.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${prospect.latitude},${prospect.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete)}`;

  const copyAddress = async () => {
    if (!adresseComplete) return;
    await navigator.clipboard.writeText(adresseComplete);
    toast.success("Adresse copiée");
  };

  const copyEmail = async () => {
    if (!prospect.email) return;
    await navigator.clipboard.writeText(prospect.email);
    toast.success("Email copié");
  };

  return (
    <div className="space-y-4">
      {/* Pipeline controls */}
      <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-3">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Pipeline
        </div>
        <div className="space-y-2">
          <Select value={prospect.stage} onValueChange={(v) => handleStage(v as PipelineStage)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={prospect.priority}
            onValueChange={(v) => handlePriority(v as Priority)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contacts actions */}
      <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Contacts rapides
        </div>

        {prospect.telephone ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <a href={`tel:${prospect.telephone.replace(/\s/g, "")}`}>
              <Phone className="mr-2 h-3.5 w-3.5" />
              <span className="truncate">{prospect.telephone}</span>
            </a>
          </Button>
        ) : (
          <DisabledAction icon={Phone} label="Pas de téléphone" />
        )}

        {prospect.email ? (
          <div className="flex gap-1">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 justify-start"
            >
              <a href={`mailto:${prospect.email}`}>
                <Mail className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">{prospect.email}</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyEmail}
              aria-label="Copier email"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <DisabledAction icon={Mail} label="Pas d'email" />
        )}

        {prospect.siteWeb ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <a href={prospect.siteWeb} target="_blank" rel="noopener noreferrer">
              <Globe className="mr-2 h-3.5 w-3.5" />
              <span className="truncate">
                {prospect.siteWeb.replace(/^https?:\/\/(www\.)?/, "")}
              </span>
              <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
            </a>
          </Button>
        ) : (
          <DisabledAction icon={Globe} label="Pas de site" />
        )}
      </div>

      {/* Adresse + maps */}
      {adresseComplete && (
        <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Localisation
          </div>
          <p className="text-xs leading-relaxed">{adresseComplete}</p>
          <div className="flex gap-1">
            <Button
              asChild
              variant="outline"
              size="xs"
              className="flex-1"
            >
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-1 h-3 w-3" />
                Maps
              </a>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={copyAddress}
              className="flex-1"
            >
              <Copy className="mr-1 h-3 w-3" />
              Copier
            </Button>
          </div>
        </div>
      )}

      {/* Vérification croisée */}
      <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Vérification
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button asChild size="xs" variant="outline">
            <a
              href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${prospect.siren}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Annuaire
            </a>
          </Button>
          <Button asChild size="xs" variant="outline">
            <a href={buildPappersUrl(prospect.siren)} target="_blank" rel="noopener noreferrer">
              Pappers
            </a>
          </Button>
        </div>
      </div>

      {/* Actions secondaires */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Rafraîchir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DisabledAction({
  icon: Icon,
  label,
}: {
  icon: typeof Phone;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border/40 px-2.5 py-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 opacity-50" />
      <span>{label}</span>
    </div>
  );
}
