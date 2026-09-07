"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  collectAuditPage,
  discoverAuditPages,
  type AuditPageType,
} from "@/lib/api/audit-page-collector";
import { MAX_SELECTED_AUDIT_PAGES } from "@/lib/audit-page-constants";

async function verifiedProspect(prospectId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" } as const;
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, siren: true, siteWeb: true, siteWebStatus: true },
  });
  if (!prospect) return { error: "Prospect introuvable" } as const;
  if (!prospect.siteWeb || prospect.siteWebStatus !== "verified") {
    return { error: "Un domaine vérifié est requis" } as const;
  }
  return { prospect } as const;
}

export async function discoverAuditPagesAction(prospectId: string) {
  const checked = await verifiedProspect(prospectId);
  if ("error" in checked) return { success: false as const, error: checked.error };
  const { prospect } = checked;
  const discovery = await discoverAuditPages(prospect.siteWeb!);
  const observedAt = new Date();
  const discoveryScope = `discovery:${prospect.siteWeb}`;
  const existingPages = await prisma.auditPage.findMany({
    where: { prospectId, siteUrl: prospect.siteWeb! },
    select: { url: true, selected: true },
  });
  const existingUrls = new Set(existingPages.map((page) => page.url));
  const remainingSelectionSlots = Math.max(
    0,
    MAX_SELECTED_AUDIT_PAGES -
      existingPages.filter((page) => page.selected).length
  );
  const autoSelectedUrls = new Set(
    discovery.candidates
      .filter(
        (candidate) => candidate.recommended && !existingUrls.has(candidate.url)
      )
      .slice(0, remainingSelectionSlots)
      .map((candidate) => candidate.url)
  );

  if (discovery.candidates.length > 0) {
    await prisma.$transaction(
      discovery.candidates.map((candidate) =>
        prisma.auditPage.upsert({
          where: {
            prospectId_siteUrl_url: {
              prospectId,
              siteUrl: prospect.siteWeb!,
              url: candidate.url,
            },
          },
          update: {
            pageType: candidate.pageType,
            source: candidate.source,
            recommended: candidate.recommended,
            discoveredAt: observedAt,
          },
          create: {
            prospectId,
            siteUrl: prospect.siteWeb!,
            url: candidate.url,
            title: candidate.label,
            pageType: candidate.pageType,
            source: candidate.source,
            recommended: candidate.recommended,
            selected: autoSelectedUrls.has(candidate.url),
            discoveredAt: observedAt,
          },
        })
      )
    );
  }

  await prisma.observation.upsert({
    where: {
      prospectId_source_scope_key: {
        prospectId,
        source: "page_discovery",
        scope: discoveryScope,
        key:
          discovery.status === "completed"
            ? "discovered_urls_count"
            : "discovery_error",
      },
    },
    update: {
      type: "collection_scope",
      value:
        discovery.status === "completed"
          ? discovery.totalDiscovered
          : discovery.error ?? "Échec de la découverte",
      url: prospect.siteWeb,
      observedAt,
      status:
        discovery.status === "completed" ? "verified" : "collection_failed",
      evidence: discovery.error ?? null,
    },
    create: {
      prospectId,
      type: "collection_scope",
      key:
        discovery.status === "completed"
          ? "discovered_urls_count"
          : "discovery_error",
      value:
        discovery.status === "completed"
          ? discovery.totalDiscovered
          : discovery.error ?? "Échec de la découverte",
      source: "page_discovery",
      scope: discoveryScope,
      url: prospect.siteWeb,
      observedAt,
      status:
        discovery.status === "completed" ? "verified" : "collection_failed",
      evidence: discovery.error,
    },
  });

  revalidatePath(`/prospects/${prospect.siren}`);
  return {
    success: discovery.status === "completed",
    error: discovery.error,
    totalDiscovered: discovery.totalDiscovered,
  };
}

export async function updateAuditPageSelectionAction(
  prospectId: string,
  selectedIds: string[]
) {
  const checked = await verifiedProspect(prospectId);
  if ("error" in checked) return { success: false as const, error: checked.error };
  const ids = [...new Set(selectedIds)];
  if (ids.length > MAX_SELECTED_AUDIT_PAGES) {
    return {
      success: false as const,
      error: `Sélection limitée à ${MAX_SELECTED_AUDIT_PAGES} pages`,
    };
  }
  const owned = await prisma.auditPage.count({
    where: {
      prospectId,
      siteUrl: checked.prospect.siteWeb!,
      id: { in: ids },
    },
  });
  if (owned !== ids.length) {
    return { success: false as const, error: "Sélection de pages invalide" };
  }

  await prisma.$transaction([
    prisma.auditPage.updateMany({
      where: {
        prospectId,
        siteUrl: checked.prospect.siteWeb!,
        selected: true,
      },
      data: { selected: false },
    }),
    prisma.auditPage.updateMany({
      where: {
        prospectId,
        siteUrl: checked.prospect.siteWeb!,
        id: { in: ids },
      },
      data: { selected: true },
    }),
  ]);
  revalidatePath(`/prospects/${checked.prospect.siren}`);
  return { success: true as const, selectedCount: ids.length };
}

export async function collectSelectedAuditPagesAction(prospectId: string) {
  const checked = await verifiedProspect(prospectId);
  if ("error" in checked) return { success: false as const, error: checked.error };
  const { prospect } = checked;
  const pages = await prisma.auditPage.findMany({
    where: {
      prospectId,
      siteUrl: prospect.siteWeb!,
      selected: true,
    },
    orderBy: [{ recommended: "desc" }, { url: "asc" }],
    take: MAX_SELECTED_AUDIT_PAGES,
  });
  if (pages.length === 0) {
    return { success: false as const, error: "Sélectionnez au moins une page" };
  }

  const results = await Promise.all(
    pages.map((page) =>
      collectAuditPage(page.url, page.pageType as AuditPageType)
    )
  );

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const page = pages[index];
    await prisma.$transaction([
      ...result.observations.map((observation) => {
        const scope = `${observation.scope}:${observation.url}`;
        return prisma.observation.upsert({
          where: {
            prospectId_source_scope_key: {
              prospectId,
              source: observation.source,
              scope,
              key: observation.key,
            },
          },
          update: {
            type: observation.type,
            value: observation.value as Prisma.InputJsonValue,
            url: observation.url,
            observedAt: new Date(observation.observedAt),
            status: observation.status,
            evidence: observation.evidence ?? null,
          },
          create: {
            prospectId,
            type: observation.type,
            key: observation.key,
            value: observation.value as Prisma.InputJsonValue,
            source: observation.source,
            scope,
            url: observation.url,
            observedAt: new Date(observation.observedAt),
            status: observation.status,
            evidence: observation.evidence,
          },
        });
      }),
      prisma.auditPage.update({
        where: { id: page.id },
        data: {
          finalUrl: result.finalUrl,
          title: result.title ?? page.title,
          collectionStatus:
            result.status === "completed" ? "collected" : "collection_failed",
          collectionError: result.error ?? null,
          lastCollectedAt: new Date(result.collectedAt),
        },
      }),
    ]);
  }

  const failed = results.filter((result) => result.status === "collection_failed");
  revalidatePath(`/prospects/${prospect.siren}`);
  return {
    success: true as const,
    collectedCount: results.length - failed.length,
    failedCount: failed.length,
  };
}
