"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { AssetOrPlaceholder } from "@/components/ui/AssetOrPlaceholder";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const PREVIEW_W = 240;
const PREVIEW_H = 160;

function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

export function Services() {
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const skipMotion = reduced || lowEnd;
  const finePointer = useFinePointer();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const xTo = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const yTo = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  useEffect(() => {
    if (skipMotion || !listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".service-card", {
        y: 28,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: listRef.current,
          start: "top 80%",
        },
      });
    }, listRef);
    return () => ctx.revert();
  }, [skipMotion]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !finePointer || skipMotion) return;
    xTo.current = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    yTo.current = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
    gsap.set(el, { x: -9999, y: -9999, opacity: 0, scale: 0.9 });
    return () => {
      xTo.current = null;
      yTo.current = null;
    };
  }, [finePointer, skipMotion]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !finePointer || skipMotion) return;
    if (activeId && previewSrc) {
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
    } else {
      gsap.to(el, {
        opacity: 0,
        scale: 0.9,
        duration: 0.25,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
  }, [activeId, previewSrc, finePointer, skipMotion]);

  const onCardEnter = useCallback(
    (id: string, src: string, alt: string) => {
      if (!finePointer || skipMotion) return;
      setActiveId(id);
      setPreviewSrc({ src, alt });
    },
    [finePointer, skipMotion],
  );

  const onCardLeave = useCallback(() => {
    if (!finePointer || skipMotion) return;
    setActiveId(null);
  }, [finePointer, skipMotion]);

  const onCardMove = useCallback(
    (e: MouseEvent) => {
      if (!finePointer || skipMotion) return;
      const offsetX = 24;
      const offsetY = -PREVIEW_H / 2;
      xTo.current?.(e.clientX + offsetX);
      yTo.current?.(e.clientY + offsetY);
    },
    [finePointer, skipMotion],
  );

  return (
    <Section
      id="sluzby"
      tone="panel"
      className="!border-t-0 !pt-10 md:!pt-20"
    >
      <SectionHeader title="Služby">{site.servicesIntro}</SectionHeader>

      <div
        ref={listRef}
        className="mt-14 grid gap-4 sm:grid-cols-2"
      >
        {site.services.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className={`service-card scroll-mt-28 ${
              finePointer && !reduced ? "cursor-default" : ""
            }`}
            onMouseEnter={() => onCardEnter(s.id, s.image, s.imageAlt)}
            onMouseLeave={onCardLeave}
            onMouseMove={onCardMove}
          >
            <Card className="h-full transition-colors duration-200 hover:border-white/30">
              <h3 className="font-display text-xl uppercase leading-snug text-white md:text-2xl">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
                {s.text}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/60">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span
                      className="mt-2 h-px w-4 shrink-0 bg-komatsu-yellow/70"
                      aria-hidden
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </article>
        ))}
      </div>

      {finePointer && !skipMotion ? (
        <div
          ref={previewRef}
          className="pointer-events-none fixed top-0 left-0 z-[90] hidden overflow-hidden border border-white/10 shadow-2xl md:block"
          style={{ width: PREVIEW_W, height: PREVIEW_H, opacity: 0 }}
          aria-hidden
        >
          {previewSrc ? (
            <AssetOrPlaceholder
              src={previewSrc.src}
              alt={previewSrc.alt}
              className="h-full w-full object-cover"
              width={PREVIEW_W}
              height={PREVIEW_H}
              sizes={`${PREVIEW_W}px`}
              loading="lazy"
            />
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}
