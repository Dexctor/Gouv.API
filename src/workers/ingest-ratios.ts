// TODO: Phase 2 - Ingestion du dataset Ratios BCE/INPI
// URL: https://data.economie.gouv.fr/explore/dataset/ratios_inpi_bce/
// Format: CSV volumineux (plusieurs centaines de Mo)
// Étapes:
// 1. Télécharger le CSV mensuellement (cron)
// 2. Stream parser (csv-parse) pour éviter charge mémoire
// 3. Upsert en batch (1000 lignes/chunk) dans FinancialCache
// 4. Logger les stats d'ingestion
export {};
