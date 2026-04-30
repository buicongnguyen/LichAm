import { useId } from "react";
import type { MoonPhase } from "../lib/moonPhase";
import type { CountryCode } from "../types";

type MoonPhaseIconProps = {
  country: CountryCode;
  phase: MoonPhase;
};

function FullMoonMotif({ country }: { country: CountryCode }) {
  if (country === "VN") {
    return (
      <g className="moon-motif moon-motif-vn" aria-hidden="true">
        <path d="M16 21v-9" />
        <path d="M16 13c-3 1-4 3-5 5" />
        <path d="M16 14c3 1 4 3 5 5" />
        <path d="M16 12c-1.7 1.6-2.2 3.2-2.3 5.2" />
        <path d="M16 12c1.7 1.6 2.2 3.2 2.3 5.2" />
      </g>
    );
  }

  if (country === "KR") {
    return (
      <g className="moon-motif moon-motif-kr" aria-hidden="true">
        <ellipse cx="16" cy="18.5" rx="4.5" ry="3.4" />
        <circle cx="18.5" cy="14.6" r="2.4" />
        <ellipse cx="17.2" cy="11" rx="1" ry="3.2" transform="rotate(-18 17.2 11)" />
        <ellipse cx="20.2" cy="11.4" rx="1" ry="3" transform="rotate(24 20.2 11.4)" />
        <circle cx="19.3" cy="14.1" r="0.35" />
      </g>
    );
  }

  return null;
}

export function MoonPhaseIcon({ country, phase }: MoonPhaseIconProps) {
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
      <g>
        <circle className="moon-light" cx="16" cy="16" r="13" />
        {!phase.isFull ? (
          <circle className="moon-shadow" cx={phase.shadowX} cy="16" r="13" clipPath={`url(#${clipId})`} />
        ) : null}
        {phase.isFull ? <FullMoonMotif country={country} /> : null}
        <circle className="moon-ring" cx="16" cy="16" r="13" />
      </g>
    </svg>
  );
}
