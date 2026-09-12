"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line as d3line } from "d3-shape";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";
import { formatShort } from "@/lib/engine/dates";

export type Point = { date: string; value: number };

/**
 * Hand-built trend chart: hairline rules, monospace ticks, a 1.5px ember
 * line that draws itself, and an optional dashed brass target rule.
 * Fully keyboard navigable, with a data table alternative underneath.
 */
export function LineChart({
  points,
  target,
  targetLabel,
  unit,
  height = 200,
  color = "var(--ember)",
  label,
  decimals = 1,
}: {
  points: Point[];
  target?: number | null;
  targetLabel?: string;
  unit: string;
  height?: number;
  color?: string;
  label: string;
  decimals?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 12, right: 12, bottom: 22, left: 40 };
  const geom = useMemo(() => {
    if (!w || points.length === 0) return null;
    const values = points.map((p) => p.value);
    if (target != null) values.push(target);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padY = (max - min || 1) * 0.12;
    const x = scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([pad.left, w - pad.right]);
    const y = scaleLinear()
      .domain([min - padY, max + padY])
      .range([height - pad.bottom, pad.top]);
    const path =
      d3line<Point>()
        .x((_, i) => x(i))
        .y((p) => y(p.value))
        .curve(curveMonotoneX)(points) ?? "";
    return { x, y, path, min, max };
  }, [w, points, target, height, pad.left, pad.right, pad.bottom, pad.top]);

  useGSAP(
    () => {
      if (!geom || !pathRef.current || motionReduced()) return;
      registerGsap();
      gsap.fromTo(pathRef.current, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "power2.out" });
    },
    { dependencies: [geom?.path] },
  );

  if (points.length === 0) {
    return (
      <p className="t-small px-4 py-8 text-center text-frost-2">
        No readings yet. Log a weigh-in and the trend starts here.
      </p>
    );
  }

  const ticks = geom ? geom.y.ticks(4) : [];
  const activePoint = active != null ? points[active] : null;

  return (
    <div>
      <div ref={wrap} className="relative">
        {geom ? (
          <>
            <svg
              width={w}
              height={height}
              role="img"
              aria-label={`${label}. ${points.length} readings from ${formatShort(points[0].date)} to ${formatShort(points.at(-1)!.date)}.`}
              className="block touch-none"
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const i = Math.round(geom.x.invert(e.clientX - rect.left));
                setActive(Math.max(0, Math.min(points.length - 1, i)));
              }}
              onPointerLeave={() => setActive(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={w - pad.right} y1={geom.y(t)} y2={geom.y(t)} stroke="var(--line-1)" strokeWidth={1} />
                  <text x={0} y={geom.y(t) + 4} fill="var(--frost-2)" style={{ font: "500 10px var(--font-mono)" }}>
                    {t.toFixed(decimals === 0 ? 0 : 0)}
                  </text>
                </g>
              ))}

              {target != null ? (
                <>
                  <line
                    x1={pad.left}
                    x2={w - pad.right}
                    y1={geom.y(target)}
                    y2={geom.y(target)}
                    stroke="var(--brass)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text x={pad.left + 4} y={geom.y(target) - 5} fill="var(--brass)" style={{ font: "500 10px var(--font-mono)" }}>
                    {targetLabel ?? `TARGET ${target}`}
                  </text>
                </>
              ) : null}

              <path ref={pathRef} d={geom.path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="miter" />

              {points.map((p, i) => (
                <rect
                  key={p.date}
                  x={geom.x(i) - 2}
                  y={geom.y(p.value) - 2}
                  width={4}
                  height={4}
                  fill={i === active ? "var(--core)" : color}
                />
              ))}

              {active != null ? (
                <line
                  x1={geom.x(active)}
                  x2={geom.x(active)}
                  y1={pad.top}
                  y2={height - pad.bottom}
                  stroke="var(--frost-2)"
                  strokeWidth={1}
                />
              ) : null}

              <text x={pad.left} y={height - 6} fill="var(--frost-2)" style={{ font: "500 10px var(--font-mono)" }}>
                {formatShort(points[0].date)}
              </text>
              <text x={w - pad.right} y={height - 6} textAnchor="end" fill="var(--frost-2)" style={{ font: "500 10px var(--font-mono)" }}>
                {formatShort(points.at(-1)!.date)}
              </text>
            </svg>

            {activePoint ? (
              <div
                className="pointer-events-none absolute top-0 border border-line-2 bg-ink-1 px-2 py-1"
                style={{ left: Math.min(Math.max(0, geom.x(active!) - 40), w - 96) }}
              >
                <p className="t-micro text-frost-0">
                  {activePoint.value.toFixed(decimals)} {unit}
                </p>
                <p className="t-micro text-frost-2">{formatShort(activePoint.date)}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Keyboard access and the data alternative */}
      <div className="mt-2 flex items-center justify-between">
        <div
          tabIndex={0}
          role="slider"
          aria-label={`${label} readings`}
          aria-valuemin={0}
          aria-valuemax={points.length - 1}
          aria-valuenow={active ?? 0}
          aria-valuetext={
            activePoint ? `${formatShort(activePoint.date)}: ${activePoint.value.toFixed(decimals)} ${unit}` : "Use arrow keys to read values"
          }
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? points.length) - 1));
          }}
          className="t-micro text-frost-2 outline-none focus-visible:text-frost-0"
        >
          ARROW KEYS TO READ VALUES
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="t-micro text-frost-2 transition-none hov:text-frost-0"
          aria-expanded={showTable}
        >
          {showTable ? "HIDE DATA" : "SHOW DATA"}
        </button>
      </div>

      {showTable ? (
        <table className="mt-3 w-full border-collapse">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th className="t-micro border-b border-line-1 py-1.5 text-left text-frost-2">DATE</th>
              <th className="t-micro border-b border-line-1 py-1.5 text-right text-frost-2">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td className="t-micro border-b border-line-1 py-1.5 text-frost-1">{formatShort(p.date)}</td>
                <td className="t-micro border-b border-line-1 py-1.5 text-right text-frost-0">{p.value.toFixed(decimals)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
