"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

const MAX_PULL = 6;

type Props = {
  href: string;
  children: string;
  onClick?: () => void;
  className?: string;
};

/**
 * Hero primary CTA: soft magnetic pull (max 6px) + fill-from-bottom hover + arrow nudge.
 */
export function MagneticPrimaryCta({
  href,
  children,
  onClick,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLAnchorElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const skipMotion = reduced || lowEnd;
  const fineRef = useRef(false);

  useEffect(() => {
    fineRef.current = window.matchMedia("(pointer: fine)").matches;
  }, []);

  function onMove(e: MouseEvent<HTMLAnchorElement>) {
    if (skipMotion || !fineRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = Math.max(-MAX_PULL, Math.min(MAX_PULL, (e.clientX - cx) * 0.2));
    const dy = Math.max(-MAX_PULL, Math.min(MAX_PULL, (e.clientY - cy) * 0.2));
    gsap.to(wrapRef.current, {
      x: dx,
      y: dy,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  }

  function onEnter() {
    if (skipMotion) return;
    if (fillRef.current) {
      gsap.fromTo(
        fillRef.current,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    }
    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        x: 4,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }

  function onLeave() {
    if (wrapRef.current) {
      gsap.to(wrapRef.current, {
        x: 0,
        y: 0,
        duration: 0.45,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
    if (fillRef.current) {
      gsap.to(fillRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.35,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        x: 0,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }

  return (
    <a
      ref={wrapRef}
      href={href}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-none border border-transparent bg-komatsu-yellow px-5 py-3 font-display text-sm uppercase tracking-wide text-void will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-komatsu-yellow ${className}`}
    >
      <span
        ref={fillRef}
        className="pointer-events-none absolute inset-0 bg-[#c49400]"
        style={{ clipPath: "inset(100% 0 0 0)" }}
        aria-hidden
      />
      <span className="relative z-[1] inline-flex items-center gap-2">
        {children}
        <span ref={arrowRef} className="inline-block" aria-hidden>
          →
        </span>
      </span>
    </a>
  );
}
