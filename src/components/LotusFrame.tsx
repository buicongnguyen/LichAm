function LotusCorner() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path className="lotus-petal lotus-petal-main" d="M48 8c15 16 15 34 0 52C33 42 33 24 48 8Z" />
      <path className="lotus-petal" d="M21 24c19 4 29 16 27 36C30 53 20 41 21 24Z" />
      <path className="lotus-petal" d="M75 24c1 17-9 29-27 36C46 40 56 28 75 24Z" />
      <path className="lotus-petal lotus-petal-soft" d="M12 50c18-2 30 5 36 20C30 72 18 65 12 50Z" />
      <path className="lotus-petal lotus-petal-soft" d="M84 50c-6 15-18 22-36 20C54 55 66 48 84 50Z" />
      <path className="lotus-base" d="M26 76c13 7 31 7 44 0" />
    </svg>
  );
}

export function LotusFrame() {
  return (
    <div className="lotus-frame" aria-hidden="true">
      <span className="lotus-corner lotus-corner-tl">
        <LotusCorner />
      </span>
      <span className="lotus-corner lotus-corner-tr">
        <LotusCorner />
      </span>
      <span className="lotus-corner lotus-corner-bl">
        <LotusCorner />
      </span>
      <span className="lotus-corner lotus-corner-br">
        <LotusCorner />
      </span>
    </div>
  );
}
