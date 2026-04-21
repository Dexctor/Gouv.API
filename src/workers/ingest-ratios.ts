// Worker d'ingestion du dataset Ratios INPI/BCE.
// Source : https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/exports/csv
// Volume : ~6,5M lignes, ~500 Mo décompressé.
//
// Stratégie :
// 1. Télécharger le CSV en stream (pas de chargement mémoire complet)
// 2. Parser ligne à ligne avec csv-parse
// 3. Bufferiser par chunks de 1000 lignes, upsert en BDD
// 4. Met à jour FinancialCache avec le dernier bilan par SIREN
//
// Usage :
//   pnpm tsx src/workers/ingest-ratios.ts
// Ou via un cron mensuel (crontab + node).

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse";
import { Readable } from "node:stream";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const CSV_URL =
  process.env.RATIOS_CSV_URL ??
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/exports/csv?use_labels_for_header=false&delimiter=%3B";

const CHUNK_SIZE = 1000;

interface CsvRow {
  siren: string;
  date_cloture_exercice: string;
  chiffre_d_affaires: string;
  marge_brute: string;
  ebe: string;
  resultat_net: string;
  type_bilan: string;
  confidentiality: string;
}

function parseFloat2(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  console.log(`[ingest-ratios] démarrage, source : ${CSV_URL}`);
  const start = Date.now();

  let totalRows = 0;
  let insertedFinancials = 0;
  let skipped = 0;
  let errors = 0;

  // Dernier bilan par SIREN (pour alimenter FinancialCache)
  const latestBySiren = new Map<
    string,
    {
      dateCloture: Date;
      ca: number | null;
      ebe: number | null;
      marge: number | null;
      rn: number | null;
    }
  >();

  const response = await fetch(CSV_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement CSV échoué : HTTP ${response.status}`);
  }

  // Conversion ReadableStream web → Readable Node
  const nodeStream = Readable.fromWeb(response.body as never);

  const parser = nodeStream.pipe(
    parse({
      delimiter: ";",
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    })
  );

  let buffer: Array<{
    siren: string;
    dateCloture: Date;
    ca: number | null;
    ebe: number | null;
    marge: number | null;
    rn: number | null;
    typeBilan: string | null;
  }> = [];

  const flush = async () => {
    if (buffer.length === 0) return;
    const chunk = buffer;
    buffer = [];
    try {
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.financial.upsert({
            where: {
              siren_dateCloture: {
                siren: r.siren,
                dateCloture: r.dateCloture,
              },
            },
            update: {
              chiffreAffaires: r.ca,
              ebe: r.ebe,
              margeBrute: r.marge,
              resultatNet: r.rn,
              typeBilan: r.typeBilan,
            },
            create: {
              siren: r.siren,
              dateCloture: r.dateCloture,
              chiffreAffaires: r.ca,
              ebe: r.ebe,
              margeBrute: r.marge,
              resultatNet: r.rn,
              typeBilan: r.typeBilan,
            },
          })
        )
      );
      insertedFinancials += chunk.length;
    } catch (err) {
      errors += chunk.length;
      console.error(`[ingest-ratios] chunk erreur :`, err instanceof Error ? err.message : err);
    }
    if (totalRows % 10000 === 0) {
      const rate = Math.round((totalRows / (Date.now() - start)) * 1000);
      console.log(
        `[ingest-ratios] ${totalRows} lignes traitées (${rate}/s), ${insertedFinancials} insérées, ${skipped} skip, ${errors} erreurs`
      );
    }
  };

  for await (const row of parser as AsyncIterable<CsvRow>) {
    totalRows++;
    if (!/^\d{9}$/.test(row.siren)) {
      skipped++;
      continue;
    }
    const dateCloture = new Date(row.date_cloture_exercice);
    if (Number.isNaN(dateCloture.getTime())) {
      skipped++;
      continue;
    }
    const ca = parseFloat2(row.chiffre_d_affaires);
    const ebe = parseFloat2(row.ebe);
    const marge = parseFloat2(row.marge_brute);
    const rn = parseFloat2(row.resultat_net);

    const entry = { siren: row.siren, dateCloture, ca, ebe, marge, rn };
    buffer.push({ ...entry, typeBilan: row.type_bilan || null });

    // Track du plus récent bilan pour FinancialCache
    const current = latestBySiren.get(row.siren);
    if (!current || dateCloture > current.dateCloture) {
      latestBySiren.set(row.siren, entry);
    }

    if (buffer.length >= CHUNK_SIZE) {
      await flush();
    }
  }
  await flush();

  console.log(
    `[ingest-ratios] données brutes ingérées en ${Math.round((Date.now() - start) / 1000)}s`
  );
  console.log(`[ingest-ratios] mise à jour FinancialCache (${latestBySiren.size} SIREN)...`);

  // Maj FinancialCache par batchs de 500
  const cacheEntries = Array.from(latestBySiren.entries());
  for (let i = 0; i < cacheEntries.length; i += 500) {
    const slice = cacheEntries.slice(i, i + 500);
    await prisma.$transaction(
      slice.map(([siren, data]) =>
        prisma.financialCache.upsert({
          where: { siren },
          update: {
            dernierCA: data.ca,
            dernierEBE: data.ebe,
            derniereMarge: data.marge,
            dernierResultat: data.rn,
            dateDernierBilan: data.dateCloture,
          },
          create: {
            siren,
            dernierCA: data.ca,
            dernierEBE: data.ebe,
            derniereMarge: data.marge,
            dernierResultat: data.rn,
            dateDernierBilan: data.dateCloture,
          },
        })
      )
    );
    if (i % 5000 === 0 && i > 0) {
      console.log(`[ingest-ratios] FinancialCache ${i}/${cacheEntries.length}`);
    }
  }

  const totalSec = Math.round((Date.now() - start) / 1000);
  console.log(
    `[ingest-ratios] terminé : ${totalRows} lignes, ${insertedFinancials} financials, ${latestBySiren.size} caches, ${errors} erreurs, ${totalSec}s`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[ingest-ratios] fatal :", err);
  process.exit(1);
});
