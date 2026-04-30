import { useId } from "react";
import type { MoonPhase } from "../lib/moonPhase";

type MoonPhaseIconProps = {
  phase: MoonPhase;
};

export function MoonPhaseIcon({ phase }: MoonPhaseIconProps) {
  const x = phase.waxing ? 100 - phase.litPercent : 0;
  const clipId = useId().replace(/:/g, "");

  return (
    <svg
      className="moon-phase-icon"
      viewBox="0 0 32 32"
      role="img"
      aria-label={phase.label}
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="13" />
        </clipPath>
      </defs>
      <circle className="moon-shadow" cx="16" cy="16" r="13" />
      <rect
        className="moon-light"
        x={`${x}%`}
        y="3"
        width={`${phase.litPercent}%`}
        height="26"
        clipPath={`url(#${clipId})`}
      />
      <circle className="moon-ring" cx="16" cy="16" r="13" />
    </svg>
  );
}
