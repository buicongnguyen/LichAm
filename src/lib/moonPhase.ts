export type MoonPhaseKind = "new" | "quarter" | "half" | "three-quarter" | "full";

export type MoonPhase = {
  kind: MoonPhaseKind;
  label: string;
  day: number;
  illumination: number;
  litPercent: number;
  visualScale: number;
  waxing: boolean;
  isFull: boolean;
};

export function getMoonPhase(lunarDay: number): MoonPhase {
  const day = Math.max(1, Math.min(30, lunarDay));
  const fullMoonDay = 15;
  const distanceFromFull = Math.min(Math.abs(day - fullMoonDay), Math.abs(day + 30 - fullMoonDay));
  const illumination = Math.max(0, Math.cos((distanceFromFull / fullMoonDay) * (Math.PI / 2)));
  const litPercent = Math.round(illumination * 100);
  const visualScale = 0.5 + illumination * 0.5;
  const waxing = day <= fullMoonDay;
  const isFull = illumination >= 0.96;

  let kind: MoonPhaseKind = "new";
  if (litPercent >= 92) {
    kind = "full";
  } else if (litPercent >= 67) {
    kind = "three-quarter";
  } else if (litPercent >= 34) {
    kind = "half";
  } else if (litPercent >= 8) {
    kind = "quarter";
  }

  const direction = kind === "full" || kind === "new" ? "" : waxing ? "waxing " : "waning ";
  const label = `${direction}${kind === "three-quarter" ? "three quarter" : kind} moon`;

  return {
    kind,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    day,
    illumination,
    litPercent,
    visualScale,
    waxing,
    isFull,
  };
}
