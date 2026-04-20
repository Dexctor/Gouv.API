// API Adresse BAN (Base Adresse Nationale)
// https://adresse.data.gouv.fr/api-doc/adresse

const API_URL = process.env.ADRESSE_API_URL ?? "https://api-adresse.data.gouv.fr";

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
  limit = 5
): Promise<AddressFeature[]> {
  if (!query.trim()) return [];
  const url = `${API_URL}/search/?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as AddressResponse;
  return data.features ?? [];
}
