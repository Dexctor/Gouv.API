// Explicit compact units avoid ICU-version differences between Node and browsers.
export function formatSearchEuro(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const [scale, unit] =
    absolute >= 1e9
      ? ([1e9, "Md€"] as const)
      : absolute >= 1e6
        ? ([1e6, "M€"] as const)
        : absolute >= 1e3
          ? ([1e3, "k€"] as const)
          : ([1, "€"] as const);
  return `${(value / scale).toFixed(1).replace(/\.0$/, "").replace(".", ",")} ${unit}`;
}
