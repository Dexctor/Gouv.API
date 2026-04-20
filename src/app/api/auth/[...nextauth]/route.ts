import { handlers } from "@/lib/auth";

// Force l'exécution en runtime Node (bcryptjs + Prisma incompatibles avec Edge)
export const runtime = "nodejs";

export const { GET, POST } = handlers;
