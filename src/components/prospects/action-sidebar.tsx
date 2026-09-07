"use client";

import { useState, useTransition } from "react";
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
  Check,
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
  auditMarkdown: string;
}

// Sidebar sticky avec toutes les actions commerciales importantes.
// Reste visible pendant le scroll sur desktop.
export function ActionSidebar({ prospect, auditMarkdown }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dossierCopied, setDossierCopied] = useState(false);

  const copyAuditPrompt = async () => {
    try {
      await navigator.clipboard.writeText("Analyse le dossier audit ci-dessous pour préparer une prise de contact commerciale. Appuie chaque constat sur les observations et les pages effectivement collectées. Distingue faits vérifiés, hypothèses et données manquantes. Ne déduis jamais une absence à partir d’une collecte incomplète. Propose une synthèse de l’entreprise, les points à vérifier et les prochaines actions prioritaires.\n\n" + auditMarkdown);
      toast.success("Prompt audit copié avec le dossier");
    } catch { toast.error("Impossible de copier le prompt"); }
  };

  const copyAuditDossier = async () => {
    try {
      await navigator.clipboard.writeText(auditMarkdown);
      setDossierCopied(true);
      toast.success("Dossier copié");
      window.setTimeout(() => setDossierCopied(false), 2500);
    } catch {
      toast.error("Impossible de copier le dossier");
    }
  };

  const handleStage = (s: PipelineStage) =>
    startTransition(async () => {
      const res = await updateStageAction(prospect.id, s);
      if (!res.success) toast.error(res.error);
      else toast.success("Étape commerciale mise à jour");
    });

  const handlePriority = (p: Priority) =>
    startTransition(async () => {
      const res = await updatePriorityAction(prospect.id, p);
      if (!res.success) toast.error(res.error);
      else toast.success("Priorité mise à jour");
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
    prospect.latitude != null && prospect.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${prospect.latitude},${prospect.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete)}`;

  const copyAddress = async () => {
    if (!adresseComplete) return;
    try {
      await navigator.clipboard.writeText(adresseComplete);
      toast.success("Adresse copiée");
    } catch { toast.error("Impossible de copier l’adresse"); }
  };

  const copyEmail = async () => {
    if (!prospect.email) return;
    try {
      await navigator.clipboard.writeText(prospect.email);
      toast.success("Email copié");
    } catch { toast.error("Impossible de copier l’email"); }
  };

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {/* Pipeline controls */}
      <div className="p-4 space-y-3">
        <div className="text-[11px] font-medium text-muted-foreground">
          Pipeline
        </div>
        <div className="space-y-2">
          <Select disabled={isPending} value={prospect.stage} onValueChange={(v) => handleStage(v as PipelineStage)}>
            <SelectTrigger aria-label="Étape commerciale" className="w-full">
              <SelectValue>{PIPELINE_STAGES.find((stage) => stage.value === prospect.stage)?.label}</SelectValue>
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
            disabled={isPending}
            value={prospect.priority}
            onValueChange={(v) => handlePriority(v as Priority)}
          >
            <SelectTrigger aria-label="Priorité commerciale" className="w-full">
              <SelectValue>Priorité {PRIORITIES.find((priority) => priority.value === prospect.priority)?.label.toLowerCase()}</SelectValue>
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
      <div className="p-4 space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground">
          Contacts rapides
        </div>

        {prospect.telephone ? (
          <Button
            asChild
            variant="default"
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
              className="min-w-0 flex-1 justify-start"
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
          <DisabledAction icon={Globe} label="Site inconnu" />
        )}
      </div>

      {/* Adresse + maps */}
      {adresseComplete && (
        <div className="p-4 space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">
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

      <div className="p-4 space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground">
          Dossier Audit Opale
        </div>
        <Button variant="outline" className="w-full" size="sm" onClick={copyAuditDossier}>
          {dossierCopied ? (
            <Check className="mr-2 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-2 h-3.5 w-3.5" />
          )}
          {dossierCopied ? "Dossier copié" : "Copier dossier audit"}
        </Button>
        <Button variant="ghost" className="w-full" size="sm" onClick={copyAuditPrompt}><Copy className="mr-2 h-3.5 w-3.5" />Copier prompt audit</Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Données et sources de la collecte.
        </p>
      </div>

      {/* Vérification croisée */}
      <div className="p-4 space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground">
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
      <div className="flex gap-1 p-4">
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
