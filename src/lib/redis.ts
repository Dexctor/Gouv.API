import Redis from "ioredis";

// Client Redis partagé (utilisé par BullMQ et comme cache applicatif simple).
// Instancié uniquement côté serveur.
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const keyPrefix = process.env.REDIS_PREFIX ?? "gouvapi:";

export const redis =
  globalForRedis.redis ??
  new Redis(url, {
    keyPrefix,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
