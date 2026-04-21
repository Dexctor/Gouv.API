// Worker : synchronisation quotidienne des annonces BODACC pour les prospects du pipeline.
// Exécution : cron journalier (ex: 04h UTC) via pm2 + node-cron ou tâche Linux.
//
// Stratégie :
// 1. Récupère tous les SIREN de prospects non-cessés
// 2. Pour chaque SIREN, récupère les annonces BODACC des 90 derniers jours
// 3. Upsert dans BodaccEvent (évite les doublons via id)
// 4. Crée une Activity de type SYSTEM si un événement important apparaît
//    (procédure collective, liquidation, vente de fonds)
//
// Usage :
//   pnpm tsx src/workers/ingest-bodacc.ts

import { config as loadEnv } from "dotenv";
import { PrismaClient, ActivityType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getBodaccEventsBySiren } from "@/lib/api/bodacc";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Événements à remonter en activité utilisateur (alertes pipeline)
const IMPORTANT_TYPES = /(redressement|liquidation|sauvegarde|cessation|vente.*fonds|procedure)/i;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const start = Date.now();
  console.log("[ingest-bodacc] démarrage");

  // Prospects actifs avec un assigné (pour remonter l'alerte au bon user)
  const prospects = await prisma.prospect.findMany({
    where: {
      NOT: { etatAdministratif: "C" },
    },
    select: {
      id: true,
      siren: true,
      denomination: true,
      assignedToId: true,
    },
  });

  console.log(`[ingest-bodacc] ${prospects.length} prospects à synchroniser`);

  let totalEvents = 0;
  let newAlerts = 0;

  for (const p of prospects) {
    try {
      const events = await getBodaccEventsBySiren(p.siren, 10);

      for (const ev of events) {
        const id = String(ev.id);
        const date = new Date(ev.dateparution);
        if (Number.isNaN(date.getTime())) continue;

        // Upsert BodaccEvent (id unique par annonce)
        const existing = await prisma.bodaccEvent.findFirst({
          where: { siren: p.siren, date, type: ev.typeavis_lib ?? "" },
        });
        if (existing) continue;

        await prisma.bodaccEvent.create({
          data: {
            siren: p.siren,
            publication: ev.publicationavis ?? "",
            type: ev.typeavis_lib ?? ev.typeavis ?? "—",
            content: JSON.stringify({
              id,
              tribunal: ev.tribunal,
              ville: ev.ville,
              depot: ev.depot,
              jugement: ev.jugement,
              familleavis: ev.familleavis,
            }).slice(0, 4000),
            date,
          },
        });
        totalEvents++;

        // Si événement important et récent (< 30j), crée une activity
        const daysOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (
          daysOld <= 30 &&
          (IMPORTANT_TYPES.test(ev.typeavis_lib ?? "") ||
            IMPORTANT_TYPES.test(ev.familleavis ?? ""))
        ) {
          // Utilisateur système (fallback sur assigné)
          if (p.assignedToId) {
            await prisma.activity.create({
              data: {
                prospectId: p.id,
                userId: p.assignedToId,
                type: ActivityType.SYSTEM,
                content: `BODACC : ${ev.typeavis_lib ?? ev.typeavis} — ${ev.familleavis ?? ""}`,
              },
            });
            newAlerts++;
          }
        }
      }
    } catch (err) {
      console.error(
        `[ingest-bodacc] erreur SIREN ${p.siren} :`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const sec = Math.round((Date.now() - start) / 1000);
  console.log(
    `[ingest-bodacc] terminé en ${sec}s : ${totalEvents} events nouveaux, ${newAlerts} alertes`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[ingest-bodacc] fatal :", err);
  process.exit(1);
});
