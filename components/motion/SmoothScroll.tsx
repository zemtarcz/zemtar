"use client";

import { useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();

  useEffect(() => {
    if (reduced || lowEnd) {
      document.documentElement.classList.remove("lenis");
      return;
    }

    let cancelled = false;
    let lenis: Lenis | null = null;
    let ticker: ((time: number) => void) | null = null;

    void import("lenis").then(({ default: LenisCtor }) => {
      if (cancelled) return;

      const instance = new LenisCtor({
        duration: 1.1,
        smoothWheel: true,
        anchors: {
          offset: -88,
        },
      });

      lenis = instance;
      document.documentElement.classList.add("lenis");
      instance.on("scroll", ScrollTrigger.update);

      ticker = (time: number) => {
        instance.raf(time * 1000);
      };
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      cancelled = true;
      if (ticker) gsap.ticker.remove(ticker);
      lenis?.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, [reduced, lowEnd]);

  return children;
}
