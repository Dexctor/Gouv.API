// Client HTTP pour l'API Sitoscope (audit SaaS Next.js d'Antoine).
// Contrat attendu :
//   POST {SITOSCOPE_URL}/api/external/audit { url, apiKey }
//   → 202 Accepted { auditId }
//   GET  {SITOSCOPE_URL}/api/external/audit/:auditId
//   → 200 { status: "pending" | "done" | "failed", score?, report? }
//
// Si Sitoscope ne dispose pas encore de ce contrat, adapter les méthodes.

const SITOSCOPE_URL = process.env.SITOSCOPE_URL ?? "";
const SITOSCOPE_API_KEY = process.env.SITOSCOPE_API_KEY ?? "";

export interface SitoscopeAuditResult {
  status: "pending" | "done" | "failed";
  auditId?: string;
  score?: {
    performance?: number;
    seo?: number;
    accessibility?: number;
    bestPractices?: number;
    overall?: number;
  };
  findings?: Array<{
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    description?: string;
  }>;
  url?: string;
  finishedAt?: string;
  reportUrl?: string;
}

export function isSitoscopeConfigured(): boolean {
  return Boolean(SITOSCOPE_URL && SITOSCOPE_API_KEY);
}

export async function launchAudit(
  url: string
): Promise<{ auditId: string } | { error: string }> {
  if (!isSitoscopeConfigured()) {
    return { error: "Sitoscope non configuré (SITOSCOPE_URL, SITOSCOPE_API_KEY manquants)" };
  }
  try {
    const res = await fetch(`${SITOSCOPE_URL}/api/external/audit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": SITOSCOPE_API_KEY,
      },
      body: JSON.stringify({ url }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status} ${res.statusText}` };
    }
    const data = (await res.json()) as { auditId: string };
    return { auditId: data.auditId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

export async function getAuditStatus(
  auditId: string
): Promise<SitoscopeAuditResult | null> {
  if (!isSitoscopeConfigured()) return null;
  try {
    const res = await fetch(
      `${SITOSCOPE_URL}/api/external/audit/${encodeURIComponent(auditId)}`,
      {
        headers: { "x-api-key": SITOSCOPE_API_KEY },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as SitoscopeAuditResult;
  } catch {
    return null;
  }
}
