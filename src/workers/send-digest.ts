// Worker : envoi du digest hebdo (relance prospects dormants + alertes BODACC récentes).
// À exécuter via cron lundi 9h.
//
// Usage :
//   pnpm tsx src/workers/send-digest.ts

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  sendMail,
  relanceDormantHtml,
  bodaccAlertHtml,
  isMailerConfigured,
} from "@/lib/mailer";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DORMANT_DAYS = 30;

async function main() {
  if (!isMailerConfigured()) {
    console.log("[send-digest] Resend non configuré, skip");
    return;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    where: { email: { not: "" } },
    select: { id: true, name: true, email: true },
  });

  for (const u of users) {
    const now = Date.now();
    const cutoff = new Date(now - DORMANT_DAYS * 24 * 60 * 60 * 1000);

    // Prospects dormants : assigné à u, dernier contact < cutoff, stage actif (ni signé ni perdu)
    const dormant = await prisma.prospect.findMany({
      where: {
        assignedToId: u.id,
        NOT: { stage: { in: ["SIGNE", "PERDU"] } },
        OR: [
          { lastContactedAt: null, createdAt: { lt: cutoff } },
          { lastContactedAt: { lt: cutoff } },
        ],
      },
      select: {
        siren: true,
        denomination: true,
        lastContactedAt: true,
        createdAt: true,
      },
      take: 30,
    });

    // Alertes BODACC : events des 7 derniers jours sur prospects de u
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const recentBodacc = await prisma.bodaccEvent.findMany({
      where: {
        date: { gte: weekAgo },
        siren: {
          in: (
            await prisma.prospect.findMany({
              where: { assignedToId: u.id },
              select: { siren: true },
            })
          ).map((p) => p.siren),
        },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    let bodaccEnriched: Array<{
      denomination: string;
      siren: string;
      type: string;
      date: Date;
    }> = [];
    if (recentBodacc.length > 0) {
      const sirens = recentBodacc.map((b) => b.siren);
      const prospects = await prisma.prospect.findMany({
        where: { siren: { in: sirens } },
        select: { siren: true, denomination: true },
      });
      const bySiren = new Map(prospects.map((p) => [p.siren, p.denomination]));
      bodaccEnriched = recentBodacc.map((b) => ({
        siren: b.siren,
        denomination: bySiren.get(b.siren) ?? b.siren,
        type: b.type,
        date: b.date,
      }));
    }

    if (dormant.length === 0 && bodaccEnriched.length === 0) {
      console.log(`[send-digest] ${u.email} : rien à signaler`);
      continue;
    }

    // Relance dormante
    if (dormant.length > 0) {
      const html = relanceDormantHtml({
        userName: u.name ?? u.email,
        prospects: dormant.map((p) => ({
          siren: p.siren,
          denomination: p.denomination,
          daysSinceLastContact: Math.floor(
            (now - (p.lastContactedAt ?? p.createdAt).getTime()) /
              (24 * 60 * 60 * 1000)
          ),
        })),
        appUrl: APP_URL,
      });
      const res = await sendMail({
        to: u.email,
        subject: `${dormant.length} prospect${dormant.length > 1 ? "s" : ""} à relancer`,
        html,
      });
      console.log(`[send-digest] relance → ${u.email} : ${res.success ? "OK" : "FAIL"}`);
    }

    // Alerte BODACC
    if (bodaccEnriched.length > 0) {
      const html = bodaccAlertHtml({
        userName: u.name ?? u.email,
        events: bodaccEnriched,
        appUrl: APP_URL,
      });
      const res = await sendMail({
        to: u.email,
        subject: `${bodaccEnriched.length} alerte${bodaccEnriched.length > 1 ? "s" : ""} BODACC`,
        html,
      });
      console.log(`[send-digest] bodacc → ${u.email} : ${res.success ? "OK" : "FAIL"}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[send-digest] fatal :", err);
  process.exit(1);
});
