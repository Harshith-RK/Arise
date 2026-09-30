/* ==========================================================================
   The Arise mark: a forged A with one heated crossbar, the same geometry the
   app icon and the posters are cut from (scripts/brand-icons.mjs). Drawn as
   facets rather than an outline, so it reads as struck metal at any size and
   needs no separate small version.
   ========================================================================== */

const APEX = 30, BASE = 930, FOOT = 150, LEG = 172;
const slope = (500 - FOOT) / (BASE - APEX);
const outerL = (y: number) => FOOT + (BASE - y) * slope;
const merge = BASE - (500 - FOOT - LEG) / slope;
const ridge = BASE - (500 - FOOT - LEG / 2) / slope;
const BAR_Y = 640, BAR_H = 56, BAR_OUT = 38;
const barL = outerL(BAR_Y + BAR_H / 2) - BAR_OUT;

type Pt = [number, number];
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [1000 - x, y]);
const pts = (p: Pt[]) => p.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" ");

const FACETS: { p: Pt[]; fill: string }[] = [
  { p: [[FOOT, BASE], [500, APEX], [500, ridge], [FOOT + LEG / 2, BASE]], fill: "var(--frost-0)" },
  { p: [[FOOT + LEG / 2, BASE], [500, ridge], [500, merge], [FOOT + LEG, BASE]], fill: "var(--frost-1)" },
  { p: mirror([[FOOT + LEG / 2, BASE], [500, ridge], [500, merge], [FOOT + LEG, BASE]]), fill: "var(--frost-2)" },
  { p: mirror([[FOOT, BASE], [500, APEX], [500, ridge], [FOOT + LEG / 2, BASE]]), fill: "var(--line-2)" },
  { p: [[barL, BAR_Y + BAR_H / 2], [barL + BAR_H / 2, BAR_Y], [1000 - barL - BAR_H / 2, BAR_Y], [1000 - barL, BAR_Y + BAR_H / 2]], fill: "var(--ember)" },
  { p: [[barL, BAR_Y + BAR_H / 2], [1000 - barL, BAR_Y + BAR_H / 2], [1000 - barL - BAR_H / 2, BAR_Y + BAR_H], [barL + BAR_H / 2, BAR_Y + BAR_H]], fill: "var(--ember-2)" },
];

/** The mark alone. `size` is its height in pixels. */
export function BrandMark({ size = 24, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={(size * 720) / 920}
      height={size}
      viewBox="140 20 720 920"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {FACETS.map((f) => (
        // Each facet is stroked in its own colour so the planes meet with no seam.
        <polygon key={f.fill + f.p[0][0]} points={pts(f.p)} fill={f.fill} stroke={f.fill} strokeWidth={1.2} strokeLinejoin="miter" />
      ))}
    </svg>
  );
}

/** The name, in the brand face. */
export function BrandWord({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <span className={`t-brand text-frost-0 ${className ?? ""}`} style={{ fontSize: size }}>
      ARISE
    </span>
  );
}

/** Mark and name together, locked to one baseline. */
export function Brand({
  size = 22,
  word = true,
  className,
  title = "Arise",
}: {
  size?: number;
  word?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} title={word ? undefined : title} />
      {word ? <BrandWord size={size * 0.62} /> : null}
      {word ? <span className="sr-only">{title}</span> : null}
    </span>
  );
}
