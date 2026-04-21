// Audit SEO préliminaire : détecte les signaux "site nul = vente facile" en
// parcourant le HTML. Ce n'est PAS un remplacement de Sitoscope, juste une
// première passe 100% gratuite qui tourne quand on affiche une fiche.
//
// Objectif Opale : identifier immédiatement sur la fiche prospect les
// problèmes évidents qui permettent un pitch "on peut faire mieux".

export interface SeoFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  /** Affiché dans la carte */
  title: string;
  /** Explication pour le pitch commercial */
  pitch?: string;
}

export interface SeoAuditResult {
  url: string;
  statusCode: number;
  fetchedAt: string;
  title: string | null;
  description: string | null;
  findings: SeoFinding[];
  /** Score 0-100 (100 = parfait, 0 = catastrophique = vente facile) */
  score: number;
  /** Plus le ventePotentiel est élevé, plus Opale a de quoi vendre */
  ventePotentiel: "fort" | "moyen" | "faible";
}

// === Détecteurs ===

function checkHttps(url: string, finalUrl: string): SeoFinding | null {
  if (!url.startsWith("https://") && !finalUrl.startsWith("https://")) {
    return {
      id: "no-https",
      severity: "critical",
      title: "Pas de HTTPS",
      pitch: "Site non sécurisé, Google pénalise, badge 'Non sécurisé' dans le navigateur.",
    };
  }
  return null;
}

function checkTitle(html: string): { title: string | null; finding: SeoFinding | null } {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = match?.[1]?.trim() ?? null;
  if (!title) {
    return {
      title: null,
      finding: {
        id: "no-title",
        severity: "critical",
        title: "Balise <title> absente",
        pitch: "Impossible à référencer correctement sans titre de page.",
      },
    };
  }
  if (title.length < 10) {
    return {
      title,
      finding: {
        id: "short-title",
        severity: "high",
        title: `Titre trop court (${title.length} car.)`,
        pitch: "Titre sous 10 car. : Google le considère peu informatif.",
      },
    };
  }
  if (title.length > 70) {
    return {
      title,
      finding: {
        id: "long-title",
        severity: "medium",
        title: `Titre trop long (${title.length} car.)`,
        pitch: "Tronqué dans les résultats Google (idéal 50-60 car.).",
      },
    };
  }
  return { title, finding: null };
}

function checkDescription(html: string): {
  description: string | null;
  finding: SeoFinding | null;
} {
  const match = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
  );
  const alt = html.match(
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
  );
  const description = match?.[1]?.trim() ?? alt?.[1]?.trim() ?? null;
  if (!description) {
    return {
      description: null,
      finding: {
        id: "no-description",
        severity: "high",
        title: "Meta description absente",
        pitch: "Google génère une description automatique, souvent mauvaise.",
      },
    };
  }
  if (description.length < 50) {
    return {
      description,
      finding: {
        id: "short-description",
        severity: "medium",
        title: `Description trop courte (${description.length} car.)`,
      },
    };
  }
  return { description, finding: null };
}

function checkH1(html: string): SeoFinding | null {
  const h1Matches = html.match(/<h1[^>]*>/gi) ?? [];
  if (h1Matches.length === 0) {
    return {
      id: "no-h1",
      severity: "high",
      title: "Aucun H1 sur la page",
      pitch: "Signal fort pour Google : pas de hiérarchie de contenu.",
    };
  }
  if (h1Matches.length > 1) {
    return {
      id: "multiple-h1",
      severity: "medium",
      title: `${h1Matches.length} H1 sur la page`,
      pitch: "Hiérarchie HTML cassée, pénalisée par Google.",
    };
  }
  return null;
}

function checkCharset(html: string): SeoFinding | null {
  const hasCharset = /<meta[^>]*charset=/i.test(html);
  // Détection caractères mal encodés côté serveur : présence de séquences typiques
  const badEncoding = /Ã©|Ã¨|Ã |Â°|Ã§/.test(html);
  if (badEncoding) {
    return {
      id: "bad-encoding",
      severity: "high",
      title: "Caractères mal encodés visibles",
      pitch: "Texte illisible sur la page (é, à, ç cassés) — signal amateur.",
    };
  }
  if (!hasCharset) {
    return {
      id: "no-charset",
      severity: "low",
      title: "Pas de déclaration de charset",
    };
  }
  return null;
}

function checkViewport(html: string): SeoFinding | null {
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    return {
      id: "no-viewport",
      severity: "high",
      title: "Pas de viewport mobile",
      pitch: "Site non responsive, Google pénalise fortement (mobile-first).",
    };
  }
  return null;
}

function checkLang(html: string): SeoFinding | null {
  const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  if (!match) {
    return {
      id: "no-lang",
      severity: "low",
      title: "Attribut lang absent sur <html>",
    };
  }
  return null;
}

function checkOg(html: string): SeoFinding | null {
  const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);
  if (!hasOgTitle && !hasOgImage) {
    return {
      id: "no-og",
      severity: "medium",
      title: "Pas de balises Open Graph",
      pitch: "Partage sur Facebook/LinkedIn/WhatsApp sans aperçu visuel.",
    };
  }
  return null;
}

function checkFavicon(html: string): SeoFinding | null {
  const hasFavicon =
    /<link[^>]*rel=["'](?:icon|shortcut icon)["']/i.test(html);
  if (!hasFavicon) {
    return {
      id: "no-favicon",
      severity: "low",
      title: "Pas de favicon",
    };
  }
  return null;
}

function checkOutdated(html: string): SeoFinding | null {
  // Année récente du copyright — si on voit 2019, 2020 → site pas maintenu
  const years = html.match(/©\s*(\d{4})|copyright[^<]*?(\d{4})/gi) ?? [];
  const extractedYears = years
    .map((s) => parseInt(s.match(/\d{4}/)?.[0] ?? "0", 10))
    .filter((n) => n > 2010 && n < 2100);
  if (extractedYears.length === 0) return null;
  const mostRecent = Math.max(...extractedYears);
  const currentYear = new Date().getFullYear();
  if (currentYear - mostRecent >= 3) {
    return {
      id: "outdated-copyright",
      severity: "medium",
      title: `Copyright figé à ${mostRecent}`,
      pitch: `Site visiblement non maintenu depuis ${currentYear - mostRecent} ans.`,
    };
  }
  return null;
}

function checkAutoAnalytics(html: string): SeoFinding | null {
  const hasGA =
    /googletagmanager|google-analytics|gtag\(/i.test(html) ||
    /<script[^>]*gtag/i.test(html);
  const hasMatomo = /matomo|piwik/i.test(html);
  if (!hasGA && !hasMatomo) {
    return {
      id: "no-analytics",
      severity: "low",
      title: "Aucun outil de mesure détecté",
      pitch: "Le client ne sait probablement pas combien de visiteurs il a.",
    };
  }
  return null;
}

function checkStale(html: string): SeoFinding | null {
  if (/jquery-1\.|jquery-2\./i.test(html)) {
    return {
      id: "old-jquery",
      severity: "medium",
      title: "jQuery ancien détecté",
      pitch: "Stack technique obsolète, probable dette technique importante.",
    };
  }
  return null;
}

// === Fetch + analyse ===

export async function auditSeo(url: string): Promise<SeoAuditResult | null> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; GouvAPIBot/1.0; +https://gouv-api.opaleacquisition.fr)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    const finalUrl = res.url;
    const statusCode = res.status;

    if (statusCode >= 400) {
      return {
        url: normalizedUrl,
        statusCode,
        fetchedAt: new Date().toISOString(),
        title: null,
        description: null,
        findings: [
          {
            id: "http-error",
            severity: "critical",
            title: `Erreur HTTP ${statusCode}`,
            pitch: "Le site ne répond pas correctement.",
          },
        ],
        score: 0,
        ventePotentiel: "fort",
      };
    }

    // Lecture partielle (limite 200 ko pour pas exploser)
    const buf = await res.arrayBuffer();
    const slice = buf.slice(0, 200 * 1024);
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);

    const findings: SeoFinding[] = [];
    const add = (f: SeoFinding | null) => {
      if (f) findings.push(f);
    };

    add(checkHttps(normalizedUrl, finalUrl));
    const { title, finding: titleFinding } = checkTitle(html);
    add(titleFinding);
    const { description, finding: descFinding } = checkDescription(html);
    add(descFinding);
    add(checkH1(html));
    add(checkCharset(html));
    add(checkViewport(html));
    add(checkLang(html));
    add(checkOg(html));
    add(checkFavicon(html));
    add(checkOutdated(html));
    add(checkAutoAnalytics(html));
    add(checkStale(html));

    // Scoring : pondération par sévérité
    const weights = { critical: 25, high: 12, medium: 6, low: 2 };
    const deduction = findings.reduce((acc, f) => acc + weights[f.severity], 0);
    const score = Math.max(0, 100 - deduction);

    const ventePotentiel: SeoAuditResult["ventePotentiel"] =
      score <= 40 ? "fort" : score <= 70 ? "moyen" : "faible";

    return {
      url: normalizedUrl,
      statusCode,
      fetchedAt: new Date().toISOString(),
      title,
      description,
      findings,
      score,
      ventePotentiel,
    };
  } catch (err) {
    return {
      url: normalizedUrl,
      statusCode: 0,
      fetchedAt: new Date().toISOString(),
      title: null,
      description: null,
      findings: [
        {
          id: "fetch-error",
          severity: "critical",
          title: "Site inaccessible ou timeout",
          pitch:
            err instanceof Error ? err.message : "Impossible d'atteindre le site.",
        },
      ],
      score: 0,
      ventePotentiel: "fort",
    };
  }
}
