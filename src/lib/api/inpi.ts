// Client INPI RNE — stub.
// Le dataset "Ratios INPI/BCE" sera ingéré en batch via un worker (phase 2).
// Voir src/workers/ingest-ratios.ts pour la procédure.

export interface InpiRatioRow {
  siren: string;
  dateCloture: string;
  chiffreAffaires?: number;
  margeBrute?: number;
  ebe?: number;
  resultatNet?: number;
  typeBilan?: string;
}

// TODO phase 2 : client INPI RNE pour récupération granulaire des bilans.
// Le paramètre siren sera utilisé lors de l'implémentation.
export async function getInpiRatiosBySiren(
  siren: string
): Promise<InpiRatioRow[]> {
  void siren;
  return [];
}
