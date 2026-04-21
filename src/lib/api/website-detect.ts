// Détection automatique du site web d'une entreprise.
// L'API gouv ne contient pas cette donnée → on tente plusieurs stratégies :
// 1. Slugification du nom → essais de domaines (.fr, .com, -ville.fr)
// 2. Probe HTTP HEAD avec timeout court
//
// Limites : taux de faux positifs (même nom = autre entreprise) + certains sites
// bloquent les HEAD. Résultat à considérer comme "suggestion" pas "vérité".

interface DetectInput {
  denomination: string;
  ville?: string | null;
  sigle?: string | null;
}

interface Candidate {
  url: string;
  slug: string;
  tld: string;
}

// Normalise un nom d'entreprise en slug web (carrefour, maison-dupont, etc.)
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/['"]/g, "")
    .replace(/\b(sas|sarl|eurl|sa|sasu|sci|snc|scp|sel|ei|eirl)\b/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40); // on plafonne pour éviter les mastodontes
}

function generateCandidates(input: DetectInput): Candidate[] {
  const baseSlug = slugify(input.denomination);
  if (!baseSlug || baseSlug.length < 3) return [];

  const sigleSlug = input.sigle ? slugify(input.sigle) : "";
  const villeSlug = input.ville ? slugify(input.ville) : "";

  const slugs: string[] = [baseSlug];
  if (sigleSlug && sigleSlug.length >= 3 && sigleSlug !== baseSlug) {
    slugs.push(sigleSlug);
  }
  if (villeSlug) {
    slugs.push(`${baseSlug}-${villeSlug}`);
    slugs.push(`${baseSlug}${villeSlug}`);
  }
  // Version sans tirets (acronymes)
  const baseCompact = baseSlug.replace(/-/g, "");
  if (baseCompact !== baseSlug && baseCompact.length >= 3) {
    slugs.push(baseCompact);
  }

  const tlds = [".fr", ".com"];
  const candidates: Candidate[] = [];
  for (const slug of slugs) {
    for (const tld of tlds) {
      candidates.push({
        url: `https://www.${slug}${tld}`,
        slug,
        tld,
      });
    }
  }
  return candidates.slice(0, 8); // cap total
}

async function probeUrl(url: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; GouvAPIBot/1.0; +https://gouv-api.opaleacquisition.fr)",
      },
    });
    clearTimeout(t);
    // 200-399 = probablement un site qui existe
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export interface DetectedWebsite {
  url: string;
  confidence: "high" | "medium" | "low";
}

// Tente de détecter le site web officiel. Retourne null si rien trouvé.
// Appelé côté serveur uniquement (pour éviter CORS).
export async function detectWebsite(
  input: DetectInput
): Promise<DetectedWebsite | null> {
  const candidates = generateCandidates(input);
  if (candidates.length === 0) return null;

  // Lance toutes les probes en parallèle, garde le premier succès dans l'ordre
  const results = await Promise.all(
    candidates.map(async (c) => ({
      ...c,
      ok: await probeUrl(c.url),
    }))
  );

  // Priorité : .fr d'abord (marché FR), puis .com, plus le slug est long/spécifique
  const hit = results.find((r) => r.ok && r.tld === ".fr") ??
    results.find((r) => r.ok);

  if (!hit) return null;

  // Confiance basée sur la spécificité du slug
  const confidence: DetectedWebsite["confidence"] =
    hit.slug.includes("-") || hit.slug.length >= 10
      ? "high"
      : hit.slug.length >= 6
        ? "medium"
        : "low";

  return { url: hit.url, confidence };
}
