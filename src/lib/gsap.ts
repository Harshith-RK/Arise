"use client";

import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

/** Register GSAP plugins once. Safe to call from every client entry point. */
export function registerGsap() {
  if (registered) return gsap;
  gsap.registerPlugin(CustomEase, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin, ScrollTrigger, SplitText);
  // "forge": the heat-transfer curve, a slow gather then a fast release.
  CustomEase.create("forge", "M0,0 C0.14,0 0.1,1 1,1");
  registered = true;
  return gsap;
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin, CustomEase };
