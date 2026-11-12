"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Chevron rubber-belt imprint (› › ›), two halves + center gap —
 * matches excavator tread reference, laid L→R across the section.
 */
const PITCH = 20;
const UNIT_H = 40;
const TOP = 2;
const BOTTOM = 38;
const MID = UNIT_H / 2;
const CENTER_GAP = 2.4;
const SKEW = 8.5;
const BAR = 10;

type Props = {
  className?: string;
  /** ScrollTrigger start/end overrides. */
  scrubStart?: string;
  scrubEnd?: string;
};

function ChevronUnit({ x }: { x: number }) {
  const yTopInner = MID - CENTER_GAP / 2;
  const yBotInner = MID + CENTER_GAP / 2;
  const upper = [
    [x, TOP],
    [x + BAR, TOP],
    [x + BAR + SKEW, yTopInner],
    [x + SKEW, yTopInner],
  ]
    .map((p) => p.join(","))
    .join(" ");
  const lower = [
    [x + SKEW, yBotInner],
    [x + BAR + SKEW, yBotInner],
    [x + BAR, BOTTOM],
    [x, BOTTOM],
  ]
    .map((p) => p.join(","))
    .join(" ");

  return (
    <>
      <polygon points={upper} />
      <polygon points={lower} />
    </>
  );
}

export function TrackDivider({
  className = "",
  scrubStart = "top 85%",
  scrubEnd = "top 40%",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const skipMotion = reduced || lowEnd;
  const uid = useId().replace(/:/g, "");
  const patternId = `track-chevron-${uid}`;

  useEffect(() => {
    const clip = clipRef.current;
    if (!clip) return;

    if (skipMotion) {
      gsap.set(clip, { clipPath: "inset(0 0% 0 0)" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        clip,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: scrubStart,
            end: scrubEnd,
            scrub: 0.6,
          },
        },
      );
    }, rootRef);

    return () => ctx.revert();
  }, [skipMotion, scrubStart, scrubEnd]);

  return (
    <div
      ref={rootRef}
      className={`relative w-full overflow-hidden text-komatsu-yellow ${className}`}
      aria-hidden
    >
      <div className="relative h-7 w-full md:h-10">
        <div
          ref={clipRef}
          className="absolute inset-0"
          style={skipMotion ? undefined : { clipPath: "inset(0 100% 0 0)" }}
        >
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id={patternId}
                width={PITCH}
                height="100%"
                patternUnits="userSpaceOnUse"
                viewBox={`0 0 ${PITCH} ${UNIT_H}`}
                preserveAspectRatio="none"
              >
                <g fill="#f5b800" opacity="0.85">
                  <ChevronUnit x={1.5} />
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        </div>
      </div>
    </div>
  );
}
