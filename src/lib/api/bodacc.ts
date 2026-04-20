// API BODACC (Bulletin Officiel Des Annonces Civiles et Commerciales)
// https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/console

const API_URL =
  process.env.BODACC_API_URL ??
  "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1";

export interface BodaccRecord {
  id: string;
  registre: string[];
  publicationavis: string;
  publicationavis_facette: string;
  dateparution: string;
  typeavis: string;
  typeavis_lib: string;
  familleavis?: string;
  commercant?: string;
  numeroannonce?: number;
  tribunal?: string;
  ville?: string;
  cp?: string;
  listepersonnes?: string;
  listeetablissements?: string;
  depot?: string;
  jugement?: string;
  [key: string]: unknown;
}

interface BodaccResponse {
  total_count: number;
  results: BodaccRecord[];
}

export async function getBodaccEventsBySiren(
  siren: string,
  limit = 20
): Promise<BodaccRecord[]> {
  const clean = siren.replace(/\s/g, "");
  if (!/^\d{9}$/.test(clean)) return [];
  const where = `registre LIKE "%${clean}%"`;
  const url =
    `${API_URL}/catalog/datasets/annonces-commerciales/records` +
    `?where=${encodeURIComponent(where)}&limit=${limit}&order_by=dateparution desc`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as BodaccResponse;
  return data.results ?? [];
}
