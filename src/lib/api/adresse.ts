// API Adresse BAN (Base Adresse Nationale)
// https://adresse.data.gouv.fr/api-doc/adresse

const API_URL =
  process.env.ADRESSE_API_URL ?? "https://api-adresse.data.gouv.fr";

export interface AddressFeature {
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    name: string;
    postcode: string;
    city: string;
    citycode: string;
    context: string;
    type: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface AddressResponse {
  features: AddressFeature[];
}

export async function searchAddress(
  query: string,
  limit = 5,
  type?: "municipality",
): Promise<AddressFeature[]> {
  if (!query.trim()) return [];
  const url = `${API_URL}/search/?q=${encodeURIComponent(query)}&limit=${limit}${type ? `&type=${type}` : ""}`;
  const res = await fetch(url, {
    ...(type
      ? { next: { revalidate: 86400 } }
      : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Service de localisation indisponible (HTTP ${res.status}).`);
  const data = (await res.json()) as AddressResponse;
  if (!Array.isArray(data.features)) throw new Error("Réponse invalide du service de localisation.");
  return data.features;
}
