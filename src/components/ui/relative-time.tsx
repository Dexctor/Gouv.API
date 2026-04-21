"use client";

import { useSyncExternalStore } from "react";

// Store externe : on re-calcule le temps relatif quand l'horloge change.
// useSyncExternalStore considère Date.now() comme légitime dans getSnapshot
// (c'est le pattern officiel pour intégrer une source externe impure).
const listeners = new Set<() => void>();
let started = false;

function startTicking() {
  if (started) return;
  started = true;
  setInterval(() => listeners.forEach((l) => l()), 60_000);
}

function subscribe(cb: () => void) {
  startTicking();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return Date.now();
}

function getServerSnapshot() {
  return 0;
}

interface Props {
  date: Date;
  /** unit "day" par défaut, "hour" ou "minute" aussi ok */
  unit?: "day" | "hour" | "minute";
}

export function RelativeTime({ date, unit = "day" }: Props) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (now === 0) return null; // SSR : placeholder vide
  const diffMs = now - date.getTime();
  const divisor =
    unit === "minute" ? 60_000 : unit === "hour" ? 3_600_000 : 86_400_000;
  const value = Math.round(diffMs / divisor);
  return (
    <span>{new Intl.RelativeTimeFormat("fr").format(-value, unit)}</span>
  );
}
