"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type SearchMapPoint = {
  siren: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  priority: "prioritaire" | "cible" | "a-tenter" | "hors-cible";
  inCrm: boolean;
};

const style = {
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

const colors: Record<SearchMapPoint["priority"], string> = {
  prioritaire: "#34d399",
  cible: "#a78bfa",
  "a-tenter": "#fbbf24",
  "hors-cible": "#94a3b8",
};

export function SearchMap({
  points,
  selectedSiren,
  onSelect,
}: {
  points: SearchMapPoint[];
  selectedSiren: string | null;
  onSelect: (siren: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!element.current || mapRef.current) return;
    const buttons = buttonsRef.current;
    const map = new maplibregl.Map({
      container: element.current,
      style,
      center: [2.37, 51.04],
      zoom: 10,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      buttons.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    buttonsRef.current.clear();
    const bounds = new maplibregl.LngLatBounds();
    points.forEach((point) => {
      bounds.extend([point.longitude, point.latitude]);
      const button = document.createElement("button");
      button.type = "button";
      button.title = `${point.name} — ${point.city}`;
      button.setAttribute("aria-label", `Sélectionner ${point.name}`);
      button.style.cssText = `width: 13px; height: 13px; border-radius: 999px; border: 2px solid #fff; background: ${colors[point.priority]}; box-shadow: 0 1px 5px #0008; cursor: pointer;`;
      button.addEventListener("click", () => onSelect(point.siren));
      buttonsRef.current.set(point.siren, button);
      markersRef.current.push(
        new maplibregl.Marker({ element: button })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map),
      );
    });
    if (points.length > 1) map.fitBounds(bounds, { padding: 42, maxZoom: 13 });
    else if (points.length === 1) map.flyTo({ center: [points[0].longitude, points[0].latitude], zoom: 13 });
  }, [points, onSelect]);

  useEffect(() => {
    buttonsRef.current.forEach((button, siren) => {
      const selected = siren === selectedSiren;
      button.style.width = selected ? "18px" : "13px";
      button.style.height = selected ? "18px" : "13px";
      button.style.outline = selected ? "3px solid #a78bfa" : "none";
    });
  }, [selectedSiren]);

  return <div ref={element} className="h-[280px] overflow-hidden rounded-md" />;
}
