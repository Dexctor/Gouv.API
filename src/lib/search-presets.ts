import nafCodes from "./naf-codes.json";

export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const codesWithPrefix = (...prefixes: string[]) =>
  nafCodes
    .filter(({ code }) => prefixes.some((prefix) => code.startsWith(prefix)))
    .map(({ code }) => code);

// NAF rév. 2, référentiel déjà embarqué. Les groupes larges ont un périmètre explicite.
export const TRADE_PRESETS = [
  {
    id: "btp",
    label: "BTP",
    description:
      "Construction, génie civil et travaux spécialisés ; hors promotion immobilière.",
    codes: codesWithPrefix("41.20", "42.", "43."),
    aliases: ["bâtiment", "construction", "btp"],
  },
  {
    id: "plomberie",
    label: "Plombiers / chauffagistes",
    description:
      "Installation d’eau, gaz, chauffage et climatisation : 43.22A / 43.22B.",
    codes: ["43.22A", "43.22B"],
    aliases: [
      "plombier",
      "plomberie",
      "chauffagiste",
      "chauffage",
      "climatisation",
    ],
  },
  {
    id: "couverture",
    label: "Couverture",
    description:
      "Couverture par éléments et étanchéification : 43.91B / 43.99A.",
    codes: ["43.91B", "43.99A"],
    aliases: ["couvreur", "couverture", "toiture", "étanchéité"],
  },
  {
    id: "menuiserie",
    label: "Menuiserie",
    description:
      "Pose de menuiseries bois/PVC et métalliques/serrurerie : 43.32A / 43.32B.",
    codes: ["43.32A", "43.32B"],
    aliases: ["menuisier", "menuiserie", "serrurerie"],
  },
  {
    id: "electricite",
    label: "Électricité",
    description:
      "Installation électrique dans les locaux et sur voie publique : 43.21A / 43.21B.",
    codes: ["43.21A", "43.21B"],
    aliases: ["électricien", "électricité", "installation électrique"],
  },
  {
    id: "avocats",
    label: "Avocats",
    description:
      "69.10Z : activités juridiques, incluant aussi notaires et autres professions juridiques. La NAF ne distingue pas les seuls avocats.",
    codes: ["69.10Z"],
    aliases: ["avocat", "juridique", "droit"],
  },
  {
    id: "comptables",
    label: "Experts-comptables",
    description:
      "69.20Z : activités comptables, expertise comptable et audit comptable.",
    codes: ["69.20Z"],
    aliases: ["expert comptable", "comptable", "comptabilité"],
  },
  {
    id: "services",
    label: "Prestataires de services",
    description:
      "Services aux bâtiments, nettoyage, espaces verts et soutien administratif aux entreprises (divisions 81 et 82).",
    codes: codesWithPrefix("81.", "82."),
    aliases: [
      "nettoyage",
      "paysagiste",
      "services aux entreprises",
      "prestataire",
    ],
  },
  {
    id: "conseil",
    label: "Agences / conseil",
    description:
      "Conseil en gestion/communication, publicité et études de marché ; hors sièges sociaux.",
    codes: ["70.21Z", "70.22Z", "73.11Z", "73.12Z", "73.20Z"],
    aliases: ["agence", "conseil", "communication", "publicité", "marketing"],
  },
  {
    id: "numerique",
    label: "Informatique / numérique",
    description:
      "Logiciels (58.2), activités informatiques (62), hébergement et portails (63.1).",
    codes: codesWithPrefix("58.2", "62.", "63.1"),
    aliases: [
      "informatique",
      "numérique",
      "logiciel",
      "développeur",
      "hébergement",
    ],
  },
] as const;

export function tradeForCode(code: string) {
  const normalized = code.replace(".", "").toUpperCase();
  const matches = TRADE_PRESETS.filter((preset) =>
    preset.codes.some((item) => item.replace(".", "") === normalized),
  );
  return matches.find((preset) => preset.id !== "btp") ?? matches[0];
}
