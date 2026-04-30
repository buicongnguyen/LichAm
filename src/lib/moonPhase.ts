export type MoonPhaseKind = "new" | "quarter" | "half" | "three-quarter" | "full";

export type MoonPhase = {
  kind: MoonPhaseKind;
  label: string;
  litPercent: number;
  waxing: boolean;
};

export function getMoonPhase(lunarDay: number): MoonPhase {
  const day = Math.max(1, Math.min(30, lunarDay));

  if (day <= 2 || day >= 29) {
    return { kind: "new", label: "New moon", litPercent: 0, waxing: day < 15 };
  }

  if (day <= 5) {
    return { kind: "quarter", label: "Quarter moon", litPercent: 25, waxing: true };
  }

  if (day <= 9) {
    return { kind: "half", label: "Half moon", litPercent: 50, waxing: true };
  }

  if (day <= 13) {
    return { kind: "three-quarter", label: "Three quarter moon", litPercent: 75, waxing: true };
  }

  if (day <= 17) {
    return { kind: "full", label: "Full moon", litPercent: 100, waxing: true };
  }

  if (day <= 21) {
    return { kind: "three-quarter", label: "Three quarter moon", litPercent: 75, waxing: false };
  }

  if (day <= 25) {
    return { kind: "half", label: "Half moon", litPercent: 50, waxing: false };
  }

  return { kind: "quarter", label: "Quarter moon", litPercent: 25, waxing: false };
}
