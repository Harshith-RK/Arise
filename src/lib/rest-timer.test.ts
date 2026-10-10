import { afterEach, describe, expect, it, vi } from "vitest";
import { dismissRest, extendRest, pauseRest, restNow, resumeRest, secondsLeft, startRest } from "./rest-timer";

/* A rest is held as the moment it ends, so these tests move the clock rather
   than waiting: real seconds pass whether or not anything is ticking. */

const left = () => secondsLeft(restNow());

describe("the rest between sets", () => {
  afterEach(() => {
    dismissRest();
    vi.useRealTimers();
  });

  it("counts down in real seconds, even when nothing is ticking", () => {
    vi.useFakeTimers();
    const start = new Date("2026-10-10T10:00:00.000Z");
    vi.setSystemTime(start);
    startRest(90);
    expect(left()).toBe(90);

    // A minute of a sleeping screen, where no interval ran at all.
    vi.setSystemTime(new Date(start.getTime() + 60_000));
    expect(left()).toBe(30);
    vi.setSystemTime(new Date(start.getTime() + 120_000));
    expect(left()).toBe(0);
  });

  it("holds where it was while paused, and carries on from there", () => {
    vi.useFakeTimers();
    const start = new Date("2026-10-10T10:00:00.000Z");
    vi.setSystemTime(start);
    startRest(90);
    vi.setSystemTime(new Date(start.getTime() + 30_000));
    pauseRest();
    expect(left()).toBe(60);

    // Time passing means nothing while it is paused.
    vi.setSystemTime(new Date(start.getTime() + 90_000));
    expect(left()).toBe(60);

    resumeRest();
    vi.setSystemTime(new Date(start.getTime() + 110_000));
    expect(left()).toBe(40);
  });

  it("adds thirty seconds to what is left and to the length behind it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T10:00:00.000Z"));
    startRest(60);
    extendRest(30);
    expect(left()).toBe(90);
    expect(restNow().total).toBe(90);
  });

  it("extends a paused rest without starting it again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T10:00:00.000Z"));
    startRest(60);
    pauseRest();
    extendRest(30);
    expect(restNow().pausedWith).toBe(90);
    expect(left()).toBe(90);
  });

  it("starts nothing for a rest of no length", () => {
    startRest(0);
    expect(restNow().endsAt).toBeNull();
  });

  it("leaves nothing running once dismissed", () => {
    startRest(60);
    dismissRest();
    expect(restNow().endsAt).toBeNull();
    expect(left()).toBe(0);
  });

  it("ignores pause, resume and extend when nothing is resting", () => {
    dismissRest();
    pauseRest();
    resumeRest();
    extendRest(30);
    expect(restNow().endsAt).toBeNull();
  });
});
