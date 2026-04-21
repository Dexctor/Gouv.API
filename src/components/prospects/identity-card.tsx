"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Globe,
  Copy,
  Check,
  Navigation,
  ExternalLink,
  Building,
} from "lucide-react";
import { nafCodeAndLabel, findNaf } from "@/lib/naf-lookup";
import { natureJuridiqueLabel } from "@/lib/insee-labels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  codeNaf: string | null;
  codeNaf25?: string | null;
  libelleNafSiege?: string | null;
  formeJuridique: string | null;
  dateCreation: Date | string | null;
  dateDebutActivite?: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  siteWeb: string | null;
  enseignes?: string[] | null;
  // établissements
  nombreEtablissements?: number | null;
  nombreEtablissementsOuverts?: number | null;
  siren: string;
}

export function IdentityCard(props: Props) {
  const nafFull = nafCodeAndLabel(props.codeNaf);
  const nafInfo = findNaf(props.codeNaf);

  const adresseComplete = [
    props.adresse,
    props.codePostal,
    props.ville,
  ]
    .filter(Boolean)
    .join(", ");

  const gmapsUrl = props.latitude && props.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${props.latitude},${props.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete)}`;

  const wazeUrl = props.latitude && props.longitude
    ? `https://www.waze.com/ul?ll=${props.latitude}%2C${props.longitude}&navigate=yes`
    : null;

  const annuaireUrl = `https://annuaire-entreprises.data.gouv.fr/entreprise/${props.siren}#etablissements`;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Identité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Activité NAF — libellé en premier */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            Activité principale
          </div>
          <div className="space-y-0.5">
            <div className="font-medium">
              {nafInfo?.libelle ?? props.codeNaf ?? "—"}
            </div>
            {nafInfo && (
              <div className="font-mono text-[11px] text-muted-foreground">
                NAF {nafInfo.code}
                {props.codeNaf25 && props.codeNaf25 !== props.codeNaf && (
                  <span className="ml-2 opacity-60">
                    (NAF25 {props.codeNaf25})
                  </span>
                )}
              </div>
            )}
            {!nafInfo && props.codeNaf && (
              <div className="font-mono text-[11px] text-muted-foreground">
                {props.codeNaf}
              </div>
            )}
          </div>
        </div>

        {/* Forme juridique */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Forme juridique
            </div>
            <div>{natureJuridiqueLabel(props.formeJuridique)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Date de création</div>
            <div>
              {props.dateCreation
                ? format(
                    typeof props.dateCreation === "string"
                      ? new Date(props.dateCreation)
                      : props.dateCreation,
                    "PPP",
                    { locale: fr }
                  )
                : "—"}
            </div>
          </div>
        </div>

        {/* Adresse + actions */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Adresse du siège
          </div>
          <div className="text-sm">
            {adresseComplete || "—"}
            {props.siret && (
              <div className="font-mono text-[11px] text-muted-foreground">
                SIRET {props.siret}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CopyButton value={adresseComplete} label="Copier" />
            <Button asChild size="xs" variant="outline">
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-1 h-3 w-3" />
                Google Maps
              </a>
            </Button>
            {wazeUrl && (
              <Button asChild size="xs" variant="outline">
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="mr-1 h-3 w-3" />
                  Waze
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Enseignes */}
        {props.enseignes && props.enseignes.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Enseignes</div>
            <div className="flex flex-wrap gap-1">
              {props.enseignes.map((e) => (
                <Badge key={e} variant="secondary" className="text-[11px]">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Établissements */}
        {props.nombreEtablissements != null &&
          props.nombreEtablissements > 1 && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  <span className="font-medium">
                    {props.nombreEtablissements}
                  </span>{" "}
                  établissement{props.nombreEtablissements > 1 ? "s" : ""}
                  {props.nombreEtablissementsOuverts != null && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({props.nombreEtablissementsOuverts} ouvert
                      {props.nombreEtablissementsOuverts > 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              </div>
              <Button asChild size="xs" variant="ghost">
                <a href={annuaireUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Liste
                </a>
              </Button>
            </div>
          )}

        {/* Contacts */}
        {(props.email || props.telephone || props.siteWeb) && (
          <div className="space-y-1.5 border-t border-border/60 pt-3">
            <div className="text-xs text-muted-foreground">Contacts</div>
            <div className="flex flex-col gap-1.5">
              {props.telephone && (
                <ContactRow
                  icon={Phone}
                  label={props.telephone}
                  href={`tel:${props.telephone.replace(/\s/g, "")}`}
                />
              )}
              {props.email && (
                <ContactRow
                  icon={Mail}
                  label={props.email}
                  href={`mailto:${props.email}`}
                />
              )}
              {props.siteWeb && (
                <ContactRow
                  icon={Globe}
                  label={props.siteWeb.replace(/^https?:\/\//, "")}
                  href={
                    props.siteWeb.startsWith("http")
                      ? props.siteWeb
                      : `https://${props.siteWeb}`
                  }
                  external
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      onClick={onCopy}
      disabled={!value}
    >
      {copied ? (
        <>
          <Check className="mr-1 h-3 w-3 text-emerald-400" />
          Copié
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3 w-3" />
          {label}
        </>
      )}
    </Button>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/40"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
      {external && <ExternalLink className="h-3 w-3 opacity-50" />}
    </a>
  );
}
