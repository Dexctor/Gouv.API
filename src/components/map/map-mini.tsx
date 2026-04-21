"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Style gratuit OSM (fallback si IGN indisponible)
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
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
    },
  ],
};

interface Props {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
}

export function MapMini({ latitude, longitude, label, height = 200 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Marker
    const marker = new maplibregl.Marker({ color: "#8b5cf6" })
      .setLngLat([longitude, latitude])
      .addTo(map);
    if (label) {
      marker.setPopup(new maplibregl.Popup().setText(label));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-md border border-border/60"
      style={{ height }}
    />
  );
}
