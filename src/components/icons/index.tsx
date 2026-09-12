import type { SVGProps } from "react";

/**
 * Winter Arc icon set. Authored on a 20px grid: 1.5px stroke, square caps,
 * miter joins, no fills except state glyphs. Angular geometry that echoes the
 * chamfer language of the panels. Decorative by default (aria-hidden); pass
 * `title` to make an icon meaningful to assistive tech.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
  title?: string;
};

function make(name: string, d: string | string[], opts: { fill?: boolean } = {}) {
  const paths = Array.isArray(d) ? d : [d];
  function Icon({ size = 20, title, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill={opts.fill ? "currentColor" : "none"}
        stroke={opts.fill ? "none" : "currentColor"}
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit={10}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {paths.map((p) => (
          <path key={p} d={p} />
        ))}
      </svg>
    );
  }
  Icon.displayName = `Icon${name}`;
  return Icon;
}

/* Navigation */
export const IconStatus = make("Status", [
  "M10 2.5 16.5 6.25v7.5L10 17.5l-6.5-3.75v-7.5Z",
  "M7 12.25h6M7 9h4",
]);
export const IconQuest = make("Quest", ["M3 3h11l3 3v11H3Z", "M6.5 8h7M6.5 11.5h4.5"]);
export const IconLog = make("Log", "M3 4.5h14M3 8.5h14M3 12.5h9M3 16.5h5.5");
export const IconProgress = make("Progress", ["M2.5 15.5 7.5 10.5l3.5 2.5 6.5-7.5", "M13.25 5.5h4.25v4.25"]);
export const IconSystem = make("System", [
  "M3 5.5h14M3 10h14M3 14.5h14",
  "M5.5 4h2.5v3H5.5ZM11.5 8.5H14v3h-2.5ZM7.5 13H10v3H7.5Z",
]);

/* Quest categories */
export const IconDumbbell = make("Dumbbell", "M2.5 8v4M5 5.5v9M15 5.5v9M17.5 8v4M5 10h10");
export const IconMeal = make("Meal", ["M3 9h14l-2 6.5H5Z", "M8 3.5v2.5M12 3.5v2.5"]);
export const IconCardio = make("Cardio", "M2.5 10.5H6l2-5 3.5 9.5 2-4.5h4");
export const IconScale = make("Scale", ["M3 3.5h14v13H3Z", "M6.75 7.25h6.5l-1.5 3h-3.5Z", "M10 7.25v3"]);
export const IconSleep = make("Sleep", "M13 3 7.25 5.5 5 10l2.25 4.5L13 17l-2.5-3L9 10l1.5-4Z");
export const IconWater = make("Water", "M10 2.5 15 10l-1.5 5-3.5 2.5L6.5 15 5 10Z");
export const IconBonus = make("Bonus", ["M3 10h14", "M10 3v14", "M5.5 5.5l9 9M14.5 5.5l-9 9"]);

/* State and reward */
export const IconStreak = make("Streak", ["M5.5 17.5 10 2.5l4.5 15Z", "M8.5 17.5 10 12.5l1.5 5"]);
export const IconShield = make("Shield", "M10 2.5 16.5 5v5.5L10 17.5l-6.5-7V5Z");
export const IconSeal = make("Seal", ["M7 2.5h6L17.5 7v6L13 17.5H7L2.5 13V7Z", "M7.5 10h5"]);
export const IconBadge = make("Badge", ["M10 2.5l5.5 3.25v6.5L10 15.5l-5.5-3.25v-6.5Z", "M7 17.5h6"]);
export const IconLock = make("Lock", ["M5 9h10v8H5Z", "M7 9V6l1.5-2.5h3L13 6v3"]);
export const IconRecord = make("Record", ["M4 16.5h12", "M6 16.5V9l4-5.5L14 9v7.5", "M8.5 12h3"]);

/* Controls */
export const IconPlus = make("Plus", "M10 3.5v13M3.5 10h13");
export const IconMinus = make("Minus", "M3.5 10h13");
export const IconClose = make("Close", "M4.5 4.5l11 11M15.5 4.5l-11 11");
export const IconBack = make("Back", "M12.5 4 6.5 10l6 6");
export const IconForward = make("Forward", "M7.5 4l6 6-6 6");
export const IconDown = make("Down", "M4 7.5l6 6 6-6");
export const IconSettings = make("Settings", [
  "M10 2.5V5M10 15v2.5M2.5 10H5M15 10h2.5M4.7 4.7l1.8 1.8M13.5 13.5l1.8 1.8M15.3 4.7l-1.8 1.8M6.5 13.5l-1.8 1.8",
  "M7 7h6v6H7Z",
]);
export const IconExport = make("Export", ["M10 12.5V3M6 7l4-4 4 4", "M3.5 12v4.5h13V12"]);
export const IconImport = make("Import", ["M10 3v9.5M6 8.5l4 4 4-4", "M3.5 12v4.5h13V12"]);
export const IconTimer = make("Timer", ["M8 5h4l3.5 3.5v4L12 16H8l-3.5-3.5v-4Z", "M10 7.5v3l2 1.5", "M8 2.5h4"]);
export const IconUndo = make("Undo", ["M7.5 5.5 4 9l3.5 3.5", "M4 9h8.5l3.5 3.5v4"]);
export const IconCalendar = make("Calendar", ["M3 4.5h14V17H3Z", "M3 8h14M7 2.5V6M13 2.5V6"]);
export const IconEdit = make("Edit", "M4 16l.5-3L13 4.5 15.5 7 7 15.5Z");
export const IconTrash = make("Trash", ["M4 5.5h12M8 5.5v-2h4v2", "M5.5 5.5l1 11.5h7l1-11.5"]);
export const IconGrip = make("Grip", "M7 5h6M7 10h6M7 15h6");
export const IconSearch = make("Search", ["M3.5 8.5 5 5l3.5-1.5L12 5l1.5 3.5L12 12l-3.5 1.5L5 12Z", "M12 12l4.5 4.5"]);
export const IconSupplies = make("Supplies", ["M3 7h14v10H3Z", "M3 7l2-4h10l2 4", "M8 10.5h4"]);
export const IconSound = make("Sound", ["M3 7.5h3l4-3.5v12l-4-3.5H3Z", "M13 7.5l1.5 2.5-1.5 2.5M15.5 5l2 5-2 5"]);
export const IconPause = make("Pause", "M7 4.5v11M13 4.5v11");
export const IconPlay = make("Play", "M6 4l9 6-9 6Z");
export const IconReset = make("Reset", ["M4.5 7.5l3-3h5l3 3v5l-3 3h-5l-3-3v-1.5", "M4.5 3.5v4h4"]);
export const IconOffline = make("Offline", ["M2.5 7.5 10 3l7.5 4.5", "M5.5 11 10 8.5l4.5 2.5", "M10 15v.5", "M3 3l14 14"]);

/**
 * Quest completion glyph: filled square with one chamfered corner.
 * Never a checkmark. `done` fills it; otherwise an outline.
 */
export function CompletionGlyph({ done, size = 20, className }: { done: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={className}>
      <path
        d="M2.75 2.75h10.5l4 4v10.5H2.75Z"
        fill={done ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="miter"
      />
    </svg>
  );
}
