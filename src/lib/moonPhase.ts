export type MoonPhaseKind = "new" | "quarter" | "half" | "three-quarter" | "full";

export type MoonPhase = {
  kind: MoonPhaseKind;
  label: string;
  day: number;
  illumination: number;
  litPercent: number;
  shadowX: number;
  waxing: boolean;
  isFull: boolean;
};

export function getMoonPhase(lunarDay: number): MoonPhase {
  const day = Math.max(1, Math.min(30, lunarDay));
  const fullMoonDay = 15;
  const isFull = day === fullMoonDay;
  const waxing = day <= fullMoonDay;
  const illumination = waxing ? Math.max(0, (day - 1) / 14) : Math.max(0, (30 - day) / 15);
  const litPercent = Math.round(illumination * 100);
  const shadowX = waxing ? 16 - illumination * 26 : 42 - (1 - illumination) * 26;

  let kind: MoonPhaseKind = "new";
  if (isFull) {
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
    shadowX,
    waxing,
    isFull,
  };
}
