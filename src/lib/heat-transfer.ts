import { CORE_TARGET_ID } from "@/components/system/CoreGauge";
import { motionReduced } from "@/lib/motion";

/* ==========================================================================
   Heat transfer (brief motion graphic C). A "+10" chip spawns at the quest
   that was cleared and travels a curved path to the CORE gauge. Runs after
   the state change and never blocks input. Rapid completions merge.
   ========================================================================== */

let pending = 0;
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchOrigin: DOMRect | null = null;

export function sendHeat(originEl: Element | null, amount: number): void {
  if (amount <= 0 || typeof document === "undefined") return;
  if (motionReduced()) return;
  const origin = originEl?.getBoundingClientRect() ?? null;
  if (!origin) return;

  pending += amount;
  batchOrigin = origin;
  if (batchTimer) clearTimeout(batchTimer);
  // Merge completions that land within 400ms into a single chip.
  batchTimer = setTimeout(() => {
    const total = pending;
    const from = batchOrigin;
    pending = 0;
    batchOrigin = null;
    batchTimer = null;
    if (from) void fly(from, total);
  }, 120);
}

async function fly(from: DOMRect, amount: number) {
  const { gsap, registerGsap } = await import("@/lib/gsap");
  const target = document.getElementById(CORE_TARGET_ID);
  if (!target) return;
  registerGsap();

  const to = target.getBoundingClientRect();
  const chip = document.createElement("div");
  chip.textContent = `+${amount} XP`;
  chip.setAttribute("aria-hidden", "true");
  Object.assign(chip.style, {
    position: "fixed",
    left: `${from.left + from.width / 2}px`,
    top: `${from.top + from.height / 2}px`,
    transform: "translate(-50%, -50%)",
    font: "500 11px/1.3 var(--font-martian, monospace)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--core)",
    background: "var(--ember-3)",
    border: "1px solid var(--ember)",
    padding: "2px 6px",
    pointerEvents: "none",
    zIndex: "60",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(chip);

  const dx = to.left + to.width * 0.25 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  gsap
    .timeline({ onComplete: () => chip.remove() })
    .to(chip, {
      motionPath: {
        path: [
          { x: 0, y: 0 },
          { x: dx * 0.45, y: dy * 0.35 - 40 },
          { x: dx, y: dy },
        ],
        curviness: 1.2,
      },
      duration: 0.52,
      ease: "forge",
    })
    .to(chip, { opacity: 0, duration: 0.12, ease: "power2.in" }, "-=0.1");
}
