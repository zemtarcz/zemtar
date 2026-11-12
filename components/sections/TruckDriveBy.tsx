"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AssetOrPlaceholder } from "@/components/ui/AssetOrPlaceholder";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Služby → MAN → Technika.
 * MAN přijede zleva a zastaví se před pravým okrajem během průchodu sekcí.
 */
export function TruckDriveBy() {
  const driveRef = useRef<HTMLElement>(null);
  const truckRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const skipMotion = reduced || lowEnd;

  useEffect(() => {
    if (skipMotion || !driveRef.current || !truckRef.current) return;

    const truck = truckRef.current;
    const drive = driveRef.current;

    const ctx = gsap.context(() => {
      const startX = () => -truck.offsetWidth * 1.08;
      // Zastavit s rezervou před pravým okrajem (~10–12 % šířky viewportu).
      const endX = () =>
        Math.max(16, window.innerWidth - truck.offsetWidth - window.innerWidth * 0.1);

      gsap.fromTo(
        truck,
        { x: startX },
        {
          x: endX,
          ease: "none",
          scrollTrigger: {
            trigger: drive,
            start: "top 90%",
            end: "top 20%",
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        },
      );
    }, drive);

    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [skipMotion]);

  return (
    <section
      ref={driveRef}
      id="preprava"
      className="relative overflow-hidden bg-panel"
      aria-label="Vlastní doprava MAN TGL"
    >
      <div className="relative h-44 w-full md:h-56">
        <div
          ref={truckRef}
          className={
            skipMotion
              ? "absolute bottom-1 right-0 z-10 w-full max-w-full md:bottom-1.5 md:w-[min(48vw,26rem)] md:max-w-[26rem]"
              : "absolute bottom-1 left-0 z-10 w-[min(58vw,22rem)] will-change-transform md:bottom-1.5 md:w-[min(48vw,26rem)]"
          }
        >
          <AssetOrPlaceholder
            src="/truck/truck.webp"
            alt="MAN TGL s minibagrem na plošině"
            className="block h-auto w-full max-w-full select-none object-contain object-right"
            width={2000}
            height={1049}
            sizes="(min-width: 768px) min(48vw, 26rem), 58vw"
            loading="lazy"
          />
        </div>

        {/* Žlutá silnice pod koly */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-komatsu-yellow md:h-1.5"
          aria-hidden
        />
      </div>
    </section>
  );
}
