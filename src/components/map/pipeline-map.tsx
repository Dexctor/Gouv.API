"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PipelineStage } from "@prisma/client";

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  A_QUALIFIER: "#94a3b8", // slate-400
  CONTACTE: "#60a5fa", // blue-400
  RDV: "#a78bfa", // violet-400
  PROPOSITION: "#fbbf24", // amber-400
  SIGNE: "#34d399", // emerald-400
  PERDU: "#f87171", // red-400
};

export interface MapProspect {
  id: string;
  siren: string;
  denomination: string;
  latitude: number;
  longitude: number;
  stage: PipelineStage;
  ville: string | null;
  codePostal: string | null;
}

interface Props {
  prospects: MapProspect[];
  height?: number;
}

export function PipelineMap({ prospects, height = 600 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    // Centre : moyenne des points, fallback sur Dunkerque
    const center =
      prospects.length > 0
        ? [
            prospects.reduce((s, p) => s + p.longitude, 0) / prospects.length,
            prospects.reduce((s, p) => s + p.latitude, 0) / prospects.length,
          ]
        : [2.37, 51.04]; // Dunkerque

    const map = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      center: center as [number, number],
      zoom: prospects.length > 0 ? 8 : 10,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Ajuste bounds pour inclure tous les points
    if (prospects.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      prospects.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [prospects]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear anciens markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    prospects.forEach((p) => {
      const popupNode = document.createElement("div");
      popupNode.innerHTML = `
        <div style="font-size:12px; min-width:180px;">
          <div style="font-weight:600; margin-bottom:2px;">${escapeHtml(p.denomination)}</div>
          <div style="color:#666; font-size:11px; margin-bottom:4px;">${escapeHtml(
            p.ville ?? ""
          )} ${escapeHtml(p.codePostal ?? "")}</div>
          <a href="/prospects/${encodeURIComponent(p.siren)}"
             style="color:#8b5cf6; text-decoration:underline; font-size:11px;">
            Ouvrir la fiche →
          </a>
        </div>
      `;
      const popup = new maplibregl.Popup({ offset: 16, closeButton: true }).setDOMContent(
        popupNode
      );
      const marker = new maplibregl.Marker({ color: STAGE_COLORS[p.stage] })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [prospects]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-lg border border-border/60"
      style={{ height }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { STAGE_COLORS };
export function LegendItem({ stage, label }: { stage: PipelineStage; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: STAGE_COLORS[stage] }}
      />
      <span>{label}</span>
    </span>
  );
}
