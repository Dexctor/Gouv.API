"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Prospect } from "@prisma/client";
import { PipelineStage, Priority } from "@prisma/client";
import {
  PIPELINE_STAGES,
  PRIORITIES,
} from "@/types/prospect";
import {
  updateStageAction,
  updatePriorityAction,
  updateNotesAction,
  updateSiteWebAction,
  deleteProspectAction,
} from "@/actions/prospects";
import { buildPappersUrl, buildAnnuaireUrl } from "@/lib/api/pappers-url";
import {
  trancheEffectifLabel,
  natureJuridiqueLabel,
} from "@/lib/insee-labels";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Globe,
  Save,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  Briefcase,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function ProspectHeader({ prospect }: { prospect: Prospect }) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  const handleStage = (s: PipelineStage) => {
    startTransition(async () => {
      const res = await updateStageAction(prospect.id, s);
      if (!res.success) toast.error(res.error);
    });
  };
  const handlePriority = (p: Priority) => {
    startTransition(async () => {
      const res = await updatePriorityAction(prospect.id, p);
      if (!res.success) toast.error(res.error);
    });
  };
  const handleDelete = () => {
    if (!confirm("Supprimer ce prospect ?")) return;
    startTransition(async () => {
      const res = await deleteProspectAction(prospect.id);
      if (res.success) {
        toast.success("Supprimé");
        router.push("/pipeline");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {prospect.denomination}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{prospect.siren}</span>
          {prospect.siret && (
            <>
              <span>·</span>
              <span className="font-mono">{prospect.siret}</span>
            </>
          )}
          {prospect.etatAdministratif === "F" && (
            <Badge variant="secondary">Fermé</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={prospect.stage} onValueChange={(v) => handleStage(v as PipelineStage)}>
          <SelectTrigger className="w-36">
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
        <Select value={prospect.priority} onValueChange={(v) => handlePriority(v as Priority)}>
          <SelectTrigger className="w-28">
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
        <Button asChild size="sm" variant="outline">
          <a
            href={buildPappersUrl(prospect.siren)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Pappers
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildAnnuaireUrl(prospect.siren)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Annuaire
          </a>
        </Button>
        <Button size="icon" variant="ghost" onClick={handleDelete} aria-label="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InfoCard({ prospect }: { prospect: Prospect }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Informations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row icon={MapPin} label="Adresse">
          {prospect.adresse}
          {prospect.codePostal ? ` — ${prospect.codePostal}` : ""}{" "}
          {prospect.ville ?? ""}
        </Row>
        <Row icon={Briefcase} label="Activité (NAF)">
          <span className="font-mono text-xs">{prospect.codeNaf ?? "—"}</span>
        </Row>
        <Row icon={Users} label="Effectif">
          {trancheEffectifLabel(prospect.trancheEffectif)}
        </Row>
        <Row icon={Calendar} label="Créée">
          {prospect.dateCreation
            ? format(prospect.dateCreation, "PPP", { locale: fr })
            : "—"}
        </Row>
        <Row icon={Briefcase} label="Forme juridique">
          {natureJuridiqueLabel(prospect.formeJuridique)}
        </Row>
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function WebsiteEditor({
  prospectId,
  initial,
}: {
  prospectId: string;
  initial: string | null;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateSiteWebAction(prospectId, url);
      if (res.success) toast.success("Site web mis à jour");
      else toast.error(res.error);
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4" /> Site web
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.fr"
            className="text-sm"
          />
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Le site sera utilisé pour l&apos;audit Sitoscope en phase 2.
        </p>
      </CardContent>
    </Card>
  );
}

export function NotesEditor({
  prospectId,
  initial,
}: {
  prospectId: string;
  initial: string | null;
}) {
  const [notes, setNotes] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateNotesAction(prospectId, notes);
      if (res.success) toast.success("Notes sauvegardées");
      else toast.error(res.error);
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Commentaires libres sur ce prospect..."
          className="text-sm"
        />
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
