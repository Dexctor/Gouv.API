import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("changeme123", 10);

  await prisma.user.upsert({
    where: { email: "antoine@opaleacquisition.fr" },
    update: {},
    create: {
      email: "antoine@opaleacquisition.fr",
      name: "Antoine",
      password,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "hugo@opaleacquisition.fr" },
    update: {},
    create: {
      email: "hugo@opaleacquisition.fr",
      name: "Hugo",
      password,
      role: UserRole.USER,
    },
  });

  console.log("Seed OK — password: changeme123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
