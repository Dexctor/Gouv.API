import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Charge .env.local en priorité (dev), sinon .env (production)
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
