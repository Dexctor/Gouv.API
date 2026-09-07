import type {
  ObservationStatus,
  ObservationValue,
} from "./seo-audit";
import { MAX_SELECTED_AUDIT_PAGES } from "../audit-page-constants";
export { MAX_SELECTED_AUDIT_PAGES } from "../audit-page-constants";

export type AuditPageType =
  | "home"
  | "service"
  | "realisations"
  | "contact"
  | "about"
  | "area"
  | "legal"
  | "other";

export interface AuditPageCandidate {
  url: string;
  label: string;
  pageType: AuditPageType;
  source: "homepage" | "sitemap" | "homepage+sitemap";
  recommended: boolean;
}

export interface AuditPageDiscoveryResult {
  baseUrl: string;
  totalDiscovered: number;
  candidates: AuditPageCandidate[];
  status: "completed" | "collection_failed";
  error?: string;
}

export interface AuditPageObservation {
  type: string;
  key: string;
  value: ObservationValue;
  source: "web_page_html";
  scope: string;
  url: string;
  observedAt: string;
  status: ObservationStatus;
  evidence?: string;
}

export interface AuditPageCollectionResult {
  requestedUrl: string;
  finalUrl: string | null;
  pageType: AuditPageType;
  title: string | null;
  collectedAt: string;
  statusCode: number | null;
  status: "completed" | "collection_failed";
  observations: AuditPageObservation[];
  error?: string;
}

interface FetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}

const MAX_CANDIDATES = 80;

function normalizeUrl(value: string, base?: string): string {
  return new URL(value, base).toString().replace(/#.*$/, "");
}

function comparableHost(value: string): string {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
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

function contentHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<(?:header|footer|nav)\b[^>]*>[\s\S]*?<\/(?:header|footer|nav)>/gi, " ");
}

function unique(values: string[], limit = 30): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLocaleLowerCase("fr-FR");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, "i")
  );
  return (match?.[1] ?? match?.[2] ?? "").trim() || null;
}

function tagTexts(html: string, tag: string, limit = 20): string[] {
  return unique(
    [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
      .map((match) => cleanText(match[1])),
    limit
  );
}

function metaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(
    (candidate) => attribute(candidate, "name")?.toLowerCase() === name
  );
  return tag ? attribute(tag, "content") : null;
}

function linkHrefByRel(html: string, rel: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) =>
    (attribute(candidate, "rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .includes(rel)
  );
  return tag ? attribute(tag, "href") : null;
}

interface LinkInfo {
  url: string;
  text: string;
}

function links(html: string, baseUrl: string): LinkInfo[] {
  const result: LinkInfo[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attribute(match[1], "href");
    if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const url = normalizeUrl(href, baseUrl);
      if (!/^https?:/i.test(url)) continue;
      result.push({ url, text: cleanText(match[2]) });
    } catch {
      // URL relative mal formée : ignorée, sans interrompre la découverte.
    }
  }
  return result;
}

function pageTypeFor(url: string, label = ""): AuditPageType {
  const haystack = `${new URL(url).pathname} ${label}`.toLocaleLowerCase("fr-FR");
  if (new URL(url).pathname.replace(/\/+$/, "") === "") return "home";
  if (/mentions|confidentialit|privacy|cookie|cgv|cgu|legal|juridique/.test(haystack)) return "legal";
  if (/réalisation|realisation|portfolio|projet|chantier|galerie/.test(haystack)) return "realisations";
  if (/contact|devis|rendez-vous|rdv|demande/.test(haystack)) return "contact";
  if (/à-propos|a-propos|about|entreprise|qui-sommes|notre-histoire|equipe/.test(haystack)) return "about";
  if (/zone|secteur|implantation|où-interven|ou-interven|intervention/.test(haystack)) return "area";
  if (/service|prestation|solution|expertise|métier|metier|offre|couverture|zinguerie|isolation|plomberie|électric|electric|menuiserie|maçonnerie|maconnerie/.test(haystack)) return "service";
  return "other";
}

function labelFor(url: string, anchorText = ""): string {
  if (anchorText.trim()) return anchorText.trim().slice(0, 100);
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  if (!pathname) return "Accueil";
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? pathname;
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 100);
}

function candidatePriority(candidate: Omit<AuditPageCandidate, "recommended">): number {
  const priority: Record<AuditPageType, number> = {
    home: 100,
    service: 90,
    realisations: 85,
    contact: 80,
    about: 70,
    area: 65,
    other: 20,
    legal: 0,
  };
  return priority[candidate.pageType];
}

export function selectRecommendedPages(
  candidates: Array<Omit<AuditPageCandidate, "recommended">>,
  maxPages = MAX_SELECTED_AUDIT_PAGES
): string[] {
  const selected: string[] = [];
  const add = (candidate: Omit<AuditPageCandidate, "recommended"> | undefined) => {
    if (candidate && selected.length < maxPages && !selected.includes(candidate.url)) {
      selected.push(candidate.url);
    }
  };

  add(candidates.find((candidate) => candidate.pageType === "home"));
  candidates
    .filter((candidate) => candidate.pageType === "service")
    .slice(0, 4)
    .forEach(add);
  (["realisations", "contact", "about", "area"] as AuditPageType[]).forEach(
    (type) => add(candidates.find((candidate) => candidate.pageType === type))
  );
  return selected.slice(0, maxPages);
}

async function fetchHtml(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  maxBytes = 1024 * 1024
): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml,text/xml",
        "user-agent":
          "Mozilla/5.0 (compatible; GouvAPIBot/1.0; +https://gouv-api.opaleacquisition.fr)",
      },
    });
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      buffer.slice(0, maxBytes)
    );
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverAuditPages(
  siteUrl: string,
  options: FetchOptions = {}
): Promise<AuditPageDiscoveryResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  const normalized = normalizeUrl(siteUrl);

  try {
    const homepage = await fetchHtml(normalized, fetchImpl, timeoutMs);
    const finalHome = homepage.response.url || normalized;
    if (!homepage.response.ok) {
      return {
        baseUrl: finalHome,
        totalDiscovered: 1,
        candidates: [
          {
            url: normalized,
            label: "Accueil",
            pageType: "home",
            source: "homepage",
            recommended: true,
          },
        ],
        status: "collection_failed",
        error: `Réponse HTTP ${homepage.response.status}`,
      };
    }

    const host = comparableHost(finalHome);
    const fromHomepage = links(homepage.text, finalHome).filter(
      (link) => comparableHost(link.url) === host
    );
    const sitemapHref = linkHrefByRel(homepage.text, "sitemap");
    const linkedSitemap = sitemapHref
      ? normalizeUrl(sitemapHref, finalHome)
      : null;
    const sitemapUrl =
      linkedSitemap && comparableHost(linkedSitemap) === host
        ? linkedSitemap
        : normalizeUrl("/sitemap.xml", finalHome);
    let sitemapUrls: string[] = [];
    try {
      const sitemap = await fetchHtml(sitemapUrl, fetchImpl, timeoutMs);
      if (sitemap.response.ok) {
        const extractLocations = (xml: string) =>
          unique(
            [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)]
            .map((match) => cleanText(match[1]))
            .map((value) => {
              try {
                return normalizeUrl(value, finalHome);
              } catch {
                return "";
              }
            })
              .filter((value) => value && comparableHost(value) === host),
            5000
          );
        const locations = extractLocations(sitemap.text);
        if (/<sitemapindex\b/i.test(sitemap.text)) {
          const children = locations
            .filter((value) => /\.xml(?:\.gz)?(?:\?|$)/i.test(value))
            .slice(0, 3);
          const childResults = await Promise.all(
            children.map(async (childUrl) => {
              try {
                const child = await fetchHtml(childUrl, fetchImpl, timeoutMs);
                return child.response.ok ? extractLocations(child.text) : [];
              } catch {
                return [];
              }
            })
          );
          sitemapUrls = unique(childResults.flat(), 5000);
        } else {
          sitemapUrls = locations;
        }
      }
    } catch {
      // Un sitemap absent ou inaccessible n'annule pas les liens de navigation.
    }

    const discovered = new Map<
      string,
      Omit<AuditPageCandidate, "recommended">
    >();
    const add = (
      url: string,
      label: string,
      source: "homepage" | "sitemap"
    ) => {
      const key = url.replace(/\/$/, "").toLowerCase();
      const previous = discovered.get(key);
      const pageType = pageTypeFor(url, label);
      discovered.set(key, {
        url,
        label: previous?.label || labelFor(url, label),
        pageType:
          previous && previous.pageType !== "other" ? previous.pageType : pageType,
        source: previous && previous.source !== source ? "homepage+sitemap" : source,
      });
    };

    add(finalHome, "Accueil", "homepage");
    fromHomepage.forEach((link) => add(link.url, link.text, "homepage"));
    sitemapUrls.forEach((url) => add(url, "", "sitemap"));

    const allCandidates = [...discovered.values()].sort(
      (a, b) => candidatePriority(b) - candidatePriority(a) || a.url.localeCompare(b.url)
    );
    const recommended = new Set(selectRecommendedPages(allCandidates));
    return {
      baseUrl: finalHome,
      totalDiscovered: allCandidates.length,
      candidates: allCandidates.slice(0, MAX_CANDIDATES).map((candidate) => ({
        ...candidate,
        recommended: recommended.has(candidate.url),
      })),
      status: "completed",
    };
  } catch (error) {
    return {
      baseUrl: normalized,
      totalDiscovered: 0,
      candidates: [],
      status: "collection_failed",
      error: error instanceof Error ? error.message : "Échec de la découverte",
    };
  }
}

function addObservation(
  observations: AuditPageObservation[],
  base: Omit<AuditPageObservation, "type" | "key" | "value" | "status">,
  type: string,
  key: string,
  value: ObservationValue | null,
  evidence?: string
) {
  const missing =
    value === null || value === "" || (Array.isArray(value) && value.length === 0);
  observations.push({
    ...base,
    type,
    key,
    value: missing ? "Non trouvé" : (value as ObservationValue),
    status: missing ? "not_found_in_scope" : "verified",
    evidence,
  });
}

function shortSnippets(html: string): string[] {
  const main = contentHtml(html);
  return unique(
    [...main.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)]
      .map((match) => cleanText(match[1]))
      .filter((value) => value.length >= 25)
      .map((value) => (value.length > 240 ? `${value.slice(0, 237)}…` : value)),
    12
  );
}

function exactContactLinks(html: string, protocol: "tel" | "mailto"): string[] {
  const tags = html.match(/<a\b[^>]*>/gi) ?? [];
  return unique(
    tags
      .map((tag) => attribute(tag, "href"))
      .filter((href): href is string => Boolean(href?.toLowerCase().startsWith(`${protocol}:`)))
      .map((href) => href.slice(protocol.length + 1).split("?")[0]),
    10
  );
}

function formFacts(html: string): {
  count: number;
  fields: string[];
  acceptsFile: boolean;
} {
  const forms = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)];
  const fields: string[] = [];
  let acceptsFile = false;
  for (const form of forms) {
    const labels = tagTexts(form[1], "label", 30);
    fields.push(...labels);
    for (const match of form[1].matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
      const type = attribute(match[2], "type") ?? match[1].toLowerCase();
      if (type.toLowerCase() === "file") acceptsFile = true;
      if (["hidden", "submit", "button"].includes(type.toLowerCase())) continue;
      fields.push(
        attribute(match[2], "name") ??
          attribute(match[2], "placeholder") ??
          type
      );
    }
  }
  return { count: forms.length, fields: unique(fields, 30), acceptsFile };
}

export async function collectAuditPage(
  url: string,
  pageType: AuditPageType,
  options: FetchOptions = {}
): Promise<AuditPageCollectionResult> {
  const requestedUrl = normalizeUrl(url);
  const observedAt = (options.now?.() ?? new Date()).toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = {
    source: "web_page_html" as const,
    scope: "page",
    url: requestedUrl,
    observedAt,
  };

  try {
    const { response, text: html } = await fetchHtml(
      requestedUrl,
      fetchImpl,
      options.timeoutMs ?? 8000,
      300 * 1024
    );
    const finalUrl = response.url || requestedUrl;
    if (!response.ok) {
      return {
        requestedUrl,
        finalUrl,
        pageType,
        title: null,
        collectedAt: observedAt,
        statusCode: response.status,
        status: "collection_failed",
        error: `Réponse HTTP ${response.status}`,
        observations: [
          {
            ...base,
            type: "collection",
            key: "http_response",
            value: response.status,
            status: "collection_failed",
            evidence: `Réponse HTTP ${response.status}`,
          },
        ],
      };
    }

    const main = contentHtml(html);
    const visibleText = cleanText(main);
    const snippets = shortSnippets(html);
    const title = tagTexts(html, "title", 1)[0] ?? null;
    const h1 = tagTexts(main, "h1", 10);
    const h2 = tagTexts(main, "h2", 20);
    const h3 = tagTexts(main, "h3", 20);
    const pageLinks = links(html, finalUrl);
    const ctaTexts = unique(
      [
        ...[...html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)]
          .map((match) => cleanText(match[1]))
          .filter((value) => /devis|contact|appel|rendez-vous|rdv|demander|réserver|envoyer|être rappelé/i.test(value)),
        ...[...html.matchAll(/<input\b[^>]*>/gi)]
          .map((match) => attribute(match[0], "value") ?? "")
          .filter((value) => /devis|contact|envoyer|demander/i.test(value)),
      ],
      15
    );
    const phones = exactContactLinks(html, "tel");
    const emails = exactContactLinks(html, "mailto");
    const forms = formFacts(html);
    const serviceMentions = unique(
      [...h1, ...h2, ...h3, ...snippets].filter((value) =>
        /service|prestation|solution|expertise|spécial|travaux|installation|rénovation|couverture|zinguerie|isolation|plomberie|électric|menuiserie|maçonnerie/i.test(value)
      ),
      15
    );
    const clientTypes = unique(
      snippets.filter((value) =>
        /particuliers?|professionnels?|entreprises?|collectivités?|syndics?|architectes?|promoteurs?/i.test(value)
      ),
      8
    );
    const geographicMentions = unique(
      snippets.filter((value) =>
        /(?:zone d'intervention|intervenons|secteur|rayon de|département|région|communes?|\d{5}|(?:à|sur|près de)\s+[A-ZÉÈÀÂÎÔÛ][A-Za-zÀ-ÿ-]{2,})/.test(value)
      ),
      12
    );
    const reassurance = unique(
      snippets.filter((value) =>
        /avis|témoignage|certifi|label|qualibat|qualiopi|rge|iso|garantie|partenaire|expérience|depuis \d{4}|années? d'expérience/i.test(value)
      ),
      12
    );
    const trustLogos = unique(
      [...html.matchAll(/<img\b[^>]*>/gi)]
        .map((match) => attribute(match[0], "alt") ?? "")
        .filter((value) => /certifi|label|partenaire|rge|qualibat|qualiopi|garantie|logo/i.test(value)),
      12
    );
    const canonical = linkHrefByRel(html, "canonical");
    const robots = metaContent(html, "robots");
    const formsEvidence = forms.count
      ? `Formulaire observé : ${forms.fields.join(", ") || "champs sans libellé exploitable"}`
      : undefined;

    const observations: AuditPageObservation[] = [];
    addObservation(observations, base, "collection", "http_status", response.status);
    addObservation(observations, base, "page_identity", "final_url", finalUrl);
    addObservation(observations, base, "page_identity", "page_type", pageType);
    addObservation(observations, base, "page_identity", "title", title);
    addObservation(observations, base, "page_identity", "h1", h1);
    addObservation(observations, base, "page_identity", "h2", h2);
    addObservation(observations, base, "content", "visible_word_count", visibleText ? visibleText.split(/\s+/).length : 0);
    addObservation(observations, base, "offer", "content_snippets", snippets);
    addObservation(observations, base, "offer", "service_mentions", serviceMentions);
    addObservation(observations, base, "offer", "client_type_mentions", clientTypes);
    addObservation(observations, base, "offer", "geographic_mentions", geographicMentions);
    addObservation(observations, base, "conversion", "cta_texts", ctaTexts);
    addObservation(observations, base, "conversion", "phone_visible", phones);
    addObservation(observations, base, "conversion", "email_visible", emails);
    observations.push({
      ...base,
      type: "conversion",
      key: "forms_count",
      value: forms.count,
      status: forms.count ? "verified" : "not_found_in_scope",
      evidence: formsEvidence,
    });
    addObservation(observations, base, "conversion", "form_fields", forms.fields, formsEvidence);
    observations.push({
      ...base,
      type: "conversion",
      key: "form_file_upload",
      value: forms.acceptsFile,
      status: forms.count ? "verified" : "not_found_in_scope",
    });
    addObservation(observations, base, "reassurance", "reassurance_mentions", reassurance);
    addObservation(observations, base, "reassurance", "trust_logos", trustLogos);
    addObservation(observations, base, "seo_structure", "canonical", canonical ? normalizeUrl(canonical, finalUrl) : null);
    addObservation(observations, base, "seo_structure", "robots_meta", robots);

    if (pageType === "realisations") {
      const articles = (main.match(/<article\b/gi) ?? []).length;
      const projectBlocks = (main.match(/<(?:div|li)\b[^>]*class=["'][^"']*(?:realisation|réalisation|project|projet|portfolio|chantier)[^"']*["']/gi) ?? []).length;
      const figures = (main.match(/<figure\b/gi) ?? []).length;
      const approximateCount = Math.max(articles, projectBlocks, figures);
      const photos = (main.match(/<img\b/gi) ?? []).length;
      const detailLinks = unique(
        pageLinks
          .filter((link) => /réalisation|realisation|projet|chantier|portfolio/i.test(`${link.text} ${link.url}`))
          .map((link) => link.url),
        15
      );
      observations.push({
        ...base,
        type: "realisations",
        key: "realisations_approx_count",
        value: approximateCount,
        status: approximateCount ? "verified" : "not_found_in_scope",
        evidence: "Comptage approximatif des blocs article, projet ou figure dans le HTML collecté",
      });
      addObservation(observations, base, "realisations", "realisations_titles", unique([...h2, ...h3], 15));
      addObservation(observations, base, "realisations", "realisations_descriptions", snippets.slice(0, 10));
      observations.push({ ...base, type: "realisations", key: "realisations_photos_count", value: photos, status: "verified" });
      addObservation(observations, base, "realisations", "realisations_locations", geographicMentions);
      observations.push({ ...base, type: "realisations", key: "before_after_visible", value: /avant\s*\/?\s*après/i.test(visibleText), status: "verified" });
      addObservation(observations, base, "realisations", "realisations_detail_links", detailLinks);
    }

    return {
      requestedUrl,
      finalUrl,
      pageType,
      title,
      collectedAt: observedAt,
      statusCode: response.status,
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
      requestedUrl,
      finalUrl: null,
      pageType,
      title: null,
      collectedAt: observedAt,
      statusCode: null,
      status: "collection_failed",
      error: message,
      observations: [
        {
          ...base,
          type: "collection",
          key: "collection_error",
          value: message,
          status: "collection_failed",
          evidence: message,
        },
      ],
    };
  }
}
