// Collecteur factuel de la page d'accueil. Il décrit uniquement ce qui a été
// observé dans ce périmètre et ne produit ni score ni interprétation business.

export type ObservationStatus =
  | "verified"
  | "unknown"
  | "not_found_in_scope"
  | "collection_failed";

export type ObservationValue = string | number | boolean | string[];

export interface CollectedObservation {
  type: string;
  key: string;
  value: ObservationValue;
  source: "homepage_html";
  scope: "homepage";
  url: string;
  observedAt: string;
  status: ObservationStatus;
  evidence?: string;
}

export interface WebCollectionResult {
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  collectedAt: string;
  status: "completed" | "collection_failed";
  observations: CollectedObservation[];
  error?: string;
}

interface CollectorOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}

function normalizeUrl(url: string): string {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return new URL(withProtocol).toString();
}

function cleanText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[], limit = 20): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(
    0,
    limit
  );
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, "i")
  );
  return (match?.[1] ?? match?.[2] ?? "").trim() || null;
}

function metaContent(html: string, attributeName: string, expected: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(
    (candidate) =>
      attribute(candidate, attributeName)?.toLowerCase() === expected.toLowerCase()
  );
  return tag ? attribute(tag, "content") : null;
}

function linkHrefByRel(html: string, expected: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) =>
    (attribute(candidate, "rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .includes(expected)
  );
  return tag ? attribute(tag, "href") : null;
}

function tagTexts(html: string, tagName: string, limit = 20): string[] {
  const matches = html.matchAll(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi")
  );
  return unique([...matches].map((match) => cleanText(match[1])), limit);
}

function addFoundOrMissing(
  observations: CollectedObservation[],
  base: Omit<CollectedObservation, "key" | "type" | "value" | "status">,
  input: {
    type: string;
    key: string;
    value: ObservationValue | null;
    evidence?: string;
  }
) {
  const isMissing =
    input.value === null ||
    input.value === "" ||
    (Array.isArray(input.value) && input.value.length === 0);
  observations.push({
    ...base,
    type: input.type,
    key: input.key,
    value: isMissing ? "Non trouvé" : (input.value as ObservationValue),
    status: isMissing ? "not_found_in_scope" : "verified",
    evidence: input.evidence,
  });
}

function resolveUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function collectWebObservations(
  url: string,
  options: CollectorOptions = {}
): Promise<WebCollectionResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const observedAt = (options.now?.() ?? new Date()).toISOString();
  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeUrl(url);
  } catch {
    return {
      url,
      finalUrl: null,
      statusCode: null,
      collectedAt: observedAt,
      status: "collection_failed",
      observations: [],
      error: "URL invalide",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);

  try {
    const response = await fetchImpl(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; GouvAPIBot/1.0; +https://gouv-api.opaleacquisition.fr)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const finalUrl = response.url || normalizedUrl;
    if (!response.ok) {
      return {
        url: normalizedUrl,
        finalUrl,
        statusCode: response.status,
        collectedAt: observedAt,
        status: "collection_failed",
        observations: [
          {
            type: "collection",
            key: "http_response",
            value: response.status,
            source: "homepage_html",
            scope: "homepage",
            url: normalizedUrl,
            observedAt,
            status: "collection_failed",
            evidence: `Réponse HTTP ${response.status} sur la page d'accueil`,
          },
        ],
        error: `Réponse HTTP ${response.status}`,
      };
    }

    const buffer = await response.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      buffer.slice(0, 200 * 1024)
    );
    const visibleText = cleanText(html);
    const base = {
      source: "homepage_html" as const,
      scope: "homepage" as const,
      url: normalizedUrl,
      observedAt,
    };
    const observations: CollectedObservation[] = [
      {
        ...base,
        type: "collection",
        key: "http_status",
        value: response.status,
        status: "verified",
      },
      {
        ...base,
        type: "collection",
        key: "final_url",
        value: finalUrl,
        status: "verified",
      },
    ];

    if (!visibleText) {
      observations.push({
        ...base,
        type: "collection",
        key: "page_content",
        value: "Aucun contenu textuel trouvé",
        status: "not_found_in_scope",
        evidence: "Réponse reçue, corps HTML vide ou sans texte sur la page d'accueil",
      });
    }

    const title = tagTexts(html, "title", 1)[0] ?? null;
    const description = metaContent(html, "name", "description");
    const h1 = tagTexts(html, "h1", 10);
    const h2 = tagTexts(html, "h2", 20);
    const canonical = resolveUrl(linkHrefByRel(html, "canonical"), finalUrl);
    const robots = metaContent(html, "name", "robots");
    const sitemap = resolveUrl(linkHrefByRel(html, "sitemap"), finalUrl);

    addFoundOrMissing(observations, base, { type: "seo_structure", key: "title", value: title });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "meta_description", value: description });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "h1", value: h1 });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "h2", value: h2 });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "canonical", value: canonical });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "robots_meta", value: robots });
    addFoundOrMissing(observations, base, { type: "seo_structure", key: "sitemap_link", value: sitemap });

    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(
      (match) => ({ href: attribute(match[1], "href"), text: cleanText(match[2]) })
    );
    const resolvedLinks = anchors
      .map((link) => ({ ...link, absolute: resolveUrl(link.href, finalUrl) }))
      .filter((link): link is typeof link & { absolute: string } => Boolean(link.absolute));
    const sameHostPages = unique(
      resolvedLinks
        .filter((link) => {
          try {
            return new URL(link.absolute).host === new URL(finalUrl).host;
          } catch {
            return false;
          }
        })
        .map((link) => link.absolute),
      30
    );
    const ctaTexts = unique(
      [
        ...anchors.filter((link) => /devis|contact|appel|rendez-vous|rdv|demander|réserver|commander/i.test(link.text)).map((link) => link.text),
        ...tagTexts(html, "button", 30).filter((text) => /devis|contact|appel|rendez-vous|rdv|demander|réserver|commander|envoyer/i.test(text)),
      ],
      15
    );
    const serviceTexts = unique(
      anchors
        .filter((link) => /service|prestation|solution|métier|activité|offre/i.test(`${link.text} ${link.href ?? ""}`))
        .map((link) => link.text || link.href || ""),
      15
    );
    const phoneLinks = unique(
      anchors
        .map((link) => link.href)
        .filter((href): href is string => Boolean(href?.toLowerCase().startsWith("tel:")))
        .map((href) => href.slice(4)),
      10
    );
    const formsCount = (html.match(/<form\b/gi) ?? []).length;

    addFoundOrMissing(observations, base, { type: "navigation", key: "pages_identified", value: sameHostPages });
    addFoundOrMissing(observations, base, { type: "activity", key: "services_observed", value: serviceTexts });
    addFoundOrMissing(observations, base, { type: "conversion_element", key: "cta_texts", value: ctaTexts });
    observations.push({
      ...base,
      type: "conversion_element",
      key: "forms_count",
      value: formsCount,
      status: formsCount === 0 ? "not_found_in_scope" : "verified",
      evidence: `${formsCount} formulaire(s) trouvé(s) sur la page d'accueil`,
    });
    addFoundOrMissing(observations, base, { type: "contact", key: "phone_visible", value: phoneLinks });
    observations.push({ ...base, type: "navigation", key: "links_count", value: resolvedLinks.length, status: "verified" });

    const proofLinks = (pattern: RegExp) =>
      unique(
        resolvedLinks.filter((link) => pattern.test(`${link.text} ${link.absolute}`)).map((link) => link.absolute),
        10
      );
    addFoundOrMissing(observations, base, { type: "commercial_proof", key: "realisations_pages", value: proofLinks(/réalisation|projet|chantier|portfolio|galerie/i) });
    addFoundOrMissing(observations, base, { type: "commercial_proof", key: "testimonials_pages", value: proofLinks(/témoignage|avis|référence|client/i) });
    addFoundOrMissing(observations, base, {
      type: "commercial_proof",
      key: "certifications_mentions",
      value: unique(visibleText.match(/\b(?:RGE|Qualiopi|Qualibat|ISO\s?\d{4,5})\b/gi) ?? [], 10),
    });

    return {
      url: normalizedUrl,
      finalUrl,
      statusCode: response.status,
      collectedAt: observedAt,
      status: "completed",
      observations,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Délai de collecte dépassé"
        : error instanceof Error
          ? error.message
          : "Échec de la collecte";
    return {
      url: normalizedUrl,
      finalUrl: null,
      statusCode: null,
      collectedAt: observedAt,
      status: "collection_failed",
      observations: [
        {
          type: "collection",
          key: "collection_error",
          value: message,
          source: "homepage_html",
          scope: "homepage",
          url: normalizedUrl,
          observedAt,
          status: "collection_failed",
          evidence: message,
        },
      ],
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}
