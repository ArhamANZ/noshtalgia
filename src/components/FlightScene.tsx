import { useEffect, useRef, useState } from "react";

// Bangladesh bottom-left, Japan top-right
const BD = { x: 140, y: 330 };
const JP = { x: 680, y: 120 };
const PATH = `M ${BD.x} ${BD.y} Q 380 20 ${JP.x} ${JP.y}`;
const PATH_BACK = `M ${JP.x} ${JP.y} Q 380 20 ${BD.x} ${BD.y}`;

type Props = {
  direction: "toJapan" | "toBangladesh";
  label?: string;
  duration?: number;
  onDone?: () => void;
};

export function FlightScene({ direction, label, duration = 3600, onDone }: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, a: 0, t: 0 });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / duration);
      const t = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      const p = path.getPointAtLength(t * len);
      const q = path.getPointAtLength(Math.min(len, t * len + 1));
      const a = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      setPos({ x: p.x, y: p.y, a, t });
      if (raw < 1) raf = requestAnimationFrame(step);
      else doneRef.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [direction, duration]);

  const d = direction === "toJapan" ? PATH : PATH_BACK;

  return (
    <svg viewBox="0 0 820 420" className="h-auto w-full" role="img" aria-label="Plane flying">
      <path d={PATH} className="flight-route" fill="none" />
      <path ref={pathRef} d={d} fill="none" stroke="none" />

      <g>
        <circle cx={BD.x} cy={BD.y} r="16" className="fill-bd" />
        <circle cx={BD.x} cy={BD.y} r="7" className="fill-bd-sun" />
        <text x={BD.x} y={BD.y + 42} textAnchor="middle" className="map-label">
          Bangladesh
        </text>
      </g>
      <g>
        <circle cx={JP.x} cy={JP.y} r="16" className="fill-jp" />
        <circle cx={JP.x} cy={JP.y} r="7" className="fill-jp-sun" />
        <text x={JP.x} y={JP.y + 42} textAnchor="middle" className="map-label">
          Japan
        </text>
      </g>

      <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.a})`}>
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="38"
          transform="rotate(45)"
        >
          ✈️
        </text>
      </g>
      {label && (
        <g transform={`translate(${pos.x} ${pos.y + 34})`}>
          <foreignObject x="-110" y="0" width="220" height="80">
            <div className="flight-note">{label}</div>
          </foreignObject>
        </g>
      )}
    </svg>
  );
}
