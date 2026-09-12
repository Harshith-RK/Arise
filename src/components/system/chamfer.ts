/**
 * Chamfered rectangle geometry. Top-right and bottom-left corners are cut,
 * matching the HUD frame language used across the app.
 */
export function chamferPath(w: number, h: number, c: number, inset = 0.5): string {
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  return `M ${x0 + c} ${y0} H ${x1 - c} L ${x1} ${y0 + c} V ${y1} H ${x0 + c} L ${x0} ${y1 - c} V ${y0 + c} Z`;
}

export const CHAMFER_CLIP =
  "polygon(0 0, calc(100% - var(--chamfer)) 0, 100% var(--chamfer), 100% 100%, var(--chamfer) 100%, 0 calc(100% - var(--chamfer)))";
