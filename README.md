# Gouv-API

Outil SaaS interne de prospection B2B pour **Opale Acquisition** (Antoine Dexctor + Hugo). Agrège les API publiques françaises (Recherche d'entreprises, BODACC, Adresse BAN, Ratios INPI/BCE) pour identifier, qualifier et suivre des prospects SME dans les Hauts-de-France.

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript strict**
- **Prisma 7** + PostgreSQL 15 (driver adapter `@prisma/adapter-pg`)
- **NextAuth v5** (Credentials + JWT sessions)
- **Tailwind CSS v4** + **shadcn/ui** (preset `base-nova`, icônes Lucide)
- **TanStack Table v8**, **nuqs** (état URL), **react-hook-form** + **zod**
- **BullMQ** + Redis (queues — scaffolding pour phase 2)
- **MapLibre GL JS** (carte — phase 2)
- **pnpm 10**, Node 20 LTS

## Prérequis

- Node.js 20 LTS ou supérieur
- pnpm 9+
- PostgreSQL 15+ (local ou distant)
- Redis 7+ (optionnel pour le MVP, requis phase 2)

## Installation locale

```bash
git clone https://github.com/Dexctor/Gouv.API.git gouv-api
cd gouv-api
pnpm install
cp .env.example .env.local
# Éditez .env.local : DATABASE_URL, AUTH_SECRET (openssl rand -base64 32)
```

Base de données (si Docker disponible) :

```bash
./scripts/setup-db.sh
```

Sinon, créez une base `gouv_api` et mettez à jour `DATABASE_URL` dans `.env.local`.

Migrations + seed :

```bash
pnpm prisma migrate dev --name init
pnpm db:seed
```

Démarrer en dev :

```bash
pnpm dev
# http://localhost:3000
```

Comptes de démo (créés par le seed) :

| Email | Mot de passe | Rôle |
|---|---|---|
| antoine@opaleacquisition.fr | changeme123 | ADMIN |
| hugo@opaleacquisition.fr | changeme123 | USER |

## Commandes utiles

| Commande | Rôle |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Build de production |
| `pnpm start` | Serveur de production |
| `pnpm lint` | ESLint |
| `pnpm db:studio` | Prisma Studio (UI de la DB) |
| `pnpm db:migrate` | Créer/appliquer migration |
| `pnpm db:seed` | Seeder les utilisateurs |
| `pnpm db:push` | Push schéma sans migration (dev rapide) |
| `pnpm db:generate` | Régénérer le client Prisma |

## Variables d'environnement

Voir `.env.example`. Clés principales :

- `DATABASE_URL` — chaîne PostgreSQL
- `AUTH_SECRET` — 32 bytes aléatoires base64
- `AUTH_URL` — URL publique de l'app
- `REDIS_URL` — pour les workers (phase 2)

## Structure du projet

```
src/
├── app/
│   ├── (auth)/login/            # Login
│   ├── (app)/                   # Layout protégé avec sidebar
│   │   ├── page.tsx             # Dashboard
│   │   ├── search/              # Recherche entreprises
│   │   ├── pipeline/            # Pipeline commercial
│   │   ├── prospects/[siren]/   # Fiche prospect
│   │   └── settings/
│   ├── api/auth/[...nextauth]/  # Handler NextAuth v5
│   └── layout.tsx               # Root layout (dark, Inter, Sonner)
├── actions/                     # Server Actions
├── components/                  # UI, layout, domain components
├── lib/
│   ├── api/                     # Clients API publiques
│   ├── auth.ts, auth.config.ts  # NextAuth
│   ├── prisma.ts, redis.ts      # Clients
│   └── utils.ts
├── types/                       # Types partagés + augmentations
├── workers/                     # Workers BullMQ (stubs phase 2)
└── proxy.ts                     # Middleware (renommé en Next 16)
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
scripts/
├── deploy.sh                    # Déploiement VPS
└── setup-db.sh                  # Postgres Docker local
```

## APIs externes

| API | Usage | Auth |
|---|---|---|
| [Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/docs/) | Recherche multi-critères | — |
| [Adresse BAN](https://adresse.data.gouv.fr/api-doc/adresse) | Géocodage | — |
| [BODACC Datadila](https://bodacc-datadila.opendatasoft.com/) | Annonces légales | — |
| Pappers (fallback URL) | Redirection lecture | — |
| INPI RNE Ratios | Ingestion batch (phase 2) | API key à prévoir |

Rate limit **Recherche d'entreprises** : 7 req/s. Limiteur client maison dans `src/lib/api/recherche-entreprises.ts`.

## Déploiement VPS (OVH 51.75.28.93)

Le VPS hébergeant Sitoscope accueille également Gouv-API. Port interne `3001`, PM2 name `gouv-api`, sous-domaine `gouv-api.opaleacquisition.fr`.

### Étapes (à exécuter depuis le VPS)

```bash
ssh deploy@51.75.28.93
cd ~/apps && git clone https://github.com/Dexctor/Gouv.API.git gouv-api
cd gouv-api
cp .env.example .env.local  # + éditer les valeurs prod
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 start ecosystem.config.js
pm2 save
```

Par la suite, un simple `./scripts/deploy.sh` suffit pour les mises à jour.

### Config Nginx

```nginx
server {
    listen 80;
    server_name gouv-api.opaleacquisition.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gouv-api.opaleacquisition.fr;

    ssl_certificate /etc/letsencrypt/live/gouv-api.opaleacquisition.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gouv-api.opaleacquisition.fr/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Certificat Let's Encrypt :

```bash
sudo certbot --nginx -d gouv-api.opaleacquisition.fr
```

## Roadmap (phase 2)

- [ ] Ingestion worker `ratios_inpi_bce` (BullMQ cron mensuel)
- [ ] Sync BODACC quotidien
- [ ] Intégration Sitoscope via HTTP pour lancer des audits
- [ ] Carte MapLibre + tuiles IGN
- [ ] NAF-selector avec recherche floue
- [ ] Notifications email (Resend) pour alertes RDV
- [ ] Export CSV segmenté par assignation

## Licence

Projet propriétaire — Antoine Dexctor / Opale Acquisition. Tous droits réservés.
