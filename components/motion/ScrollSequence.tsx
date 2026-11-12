"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { track } from "@vercel/analytics";
import { site, unwrap } from "@/content/site";
import { useLowEndDevice } from "@/components/motion/useLowEndDevice";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { AssetOrPlaceholder } from "@/components/ui/AssetOrPlaceholder";
import { Button } from "@/components/ui/Button";
import { MagneticPrimaryCta } from "@/components/ui/MagneticPrimaryCta";

/** Hold dig still + fade hero copy before scrubbing frames. */
const HERO_HOLD = 0.02;
/** Autoplay intro loop: first N dig frames, ping-pong until scroll. */
const IDLE_LOOP_FRAMES = 15;
/** Dig frames advanced per second while idle (ping-pong). */
const IDLE_FPS = 14;
/** Priority boost around scrub head so nearestLoaded stays close. */
const PRIORITY_RADIUS = 10;

const DIG_FIRST = "/seq/dig/0001.webp";
const DIG_FIRST_MOBILE = "/seq/dig-mobile/0001.webp";

type Manifest = {
  count: number;
  width: number;
  height: number;
  pattern: string;
  firstIndex: number;
};

function framePath(base: string, index: number, pattern: string): string {
  const padded = String(index).padStart(4, "0");
  const file = pattern.replace("{0000}", padded);
  return `${base}/${file}`;
}

async function loadManifest(url: string): Promise<Manifest | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as Manifest;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(id);
        reject(err);
      },
    );
  });
}

function getCanvas2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    const withSpace = canvas.getContext("2d", {
      alpha: false,
      colorSpace: "srgb",
    });
    if (withSpace) return withSpace;
  } catch {
    // Older WebKit may reject colorSpace — fall through.
  }
  try {
    return canvas.getContext("2d", { alpha: false });
  } catch {
    return null;
  }
}

/**
 * Cover focus (0 = left/top edge, 1 = right/bottom).
 * Dig frames are 16:9; the excavator sits near x 0.46 / y 0.59.
 * Portrait phones crop the sides — bias slightly left so the raised bucket stays in frame.
 */
const FOCUS_DESKTOP = { x: 0.4, y: 0.55 } as const;
const FOCUS_MOBILE = { x: 0.34, y: 0.59 } as const;

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cw: number,
  ch: number,
  iw: number,
  ih: number,
  focusX: number = FOCUS_DESKTOP.x,
  focusY: number = FOCUS_DESKTOP.y,
) {
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = focusX * (cw - dw);
  const dy = focusY * (ch - dh);
  ctx.fillStyle = "#0c1018";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function nearestLoaded(
  frames: (HTMLImageElement | ImageBitmap | null)[],
  index: number,
): { img: HTMLImageElement | ImageBitmap; index: number } | null {
  if (frames[index]) return { img: frames[index]!, index };
  for (let d = 1; d < frames.length; d++) {
    if (index - d >= 0 && frames[index - d]) {
      return { img: frames[index - d]!, index: index - d };
    }
    if (index + d < frames.length && frames[index + d]) {
      return { img: frames[index + d]!, index: index + d };
    }
  }
  return null;
}

function heroOpacityFromProgress(progress: number): number {
  if (progress <= 0) return 1;
  if (progress >= HERO_HOLD) return 0;
  return 1 - progress / HERO_HOLD;
}

function frameProgressFromScroll(progress: number): number {
  if (progress <= HERO_HOLD) return 0;
  return (progress - HERO_HOLD) / (1 - HERO_HOLD);
}

const HERO_LINES = site.hero.h1Lines;

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
}

function HeroCopy() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (reduced) {
      gsap.set(root.querySelectorAll("[data-hero]"), { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const lines = root.querySelectorAll("[data-hero=line]");
      const rest = root.querySelectorAll("[data-hero=sub], [data-hero=cta]");
      gsap.set(lines, { opacity: 0, y: 40 });
      gsap.set(rest, { opacity: 0, y: 18 });

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(lines, { opacity: 1, y: 0, duration: 0.85, stagger: 0.11 })
        .to("[data-hero=sub]", { opacity: 1, y: 0, duration: 0.55 }, "-=0.35")
        .to("[data-hero=cta]", { opacity: 1, y: 0, duration: 0.5 }, "-=0.25");
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={rootRef}>
      <h1 className="font-display text-[clamp(1.35rem,calc(0.55rem+5.2vw),4.5rem)] uppercase leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.65)]">
        {HERO_LINES.map((line) => (
          <span key={line} data-hero="line" className="block">
            {line}
          </span>
        ))}
      </h1>
      <p
        data-hero="sub"
        className="mt-4 max-w-2xl text-sm leading-relaxed text-white/95 drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)] text-balance sm:mt-5 sm:text-base md:text-lg"
      >
        {site.hero.subtitle}
      </p>
      <div
        data-hero="cta"
        className="relative z-10 mt-6 flex flex-nowrap items-center justify-center gap-1.5 pointer-events-auto sm:mt-7 sm:gap-3"
      >
        <MagneticPrimaryCta
          href="#kontakt"
          className="!px-2.5 !py-3 !text-xs whitespace-nowrap sm:!px-5 sm:!text-sm"
          onClick={() => track("cta_click", { source: "hero" })}
        >
          {site.hero.cta}
        </MagneticPrimaryCta>
        <Button
          href={unwrap(site.phoneHref)}
          variant="outline"
          className="!px-2.5 !py-3 !text-xs whitespace-nowrap border-white/55 bg-black/45 backdrop-blur-sm hover:border-white hover:bg-black/60 sm:!px-5 sm:!text-sm"
          onClick={() => track("phone_click", { source: "hero" })}
        >
          {site.hero.secondary}
        </Button>
      </div>
    </div>
  );
}

const heroCopyLayout =
  "mx-auto flex w-full max-w-4xl flex-col items-center px-4 sm:px-6 pt-[max(8.5rem,calc(10vh+2.5rem))] text-center pb-[min(42vh,22rem)] md:pt-[max(6.5rem,11vh)] md:pb-[min(54vh,32rem)]";

function StaticHero() {
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !mediaRef.current) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const origin = mobile
      ? `${FOCUS_MOBILE.x * 100}% ${FOCUS_MOBILE.y * 100}%`
      : `${FOCUS_DESKTOP.x * 100}% ${FOCUS_DESKTOP.y * 100}%`;
    const tween = gsap.fromTo(
      mediaRef.current,
      { scale: 1 },
      {
        scale: 1.06,
        duration: 16,
        ease: "none",
        transformOrigin: origin,
      },
    );
    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <section
      id="hero"
      className="relative flex min-h-svh items-stretch overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div ref={mediaRef} className="h-full w-full will-change-transform">
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet={DIG_FIRST_MOBILE}
              type="image/webp"
            />
            <img
              src={DIG_FIRST}
              alt=""
              width={1920}
              height={1080}
              decoding="async"
              className="h-full w-full bg-[#0c1018] object-cover object-[34%_59%] md:object-[40%_55%]"
            />
          </picture>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
      </div>
      <div className={`relative z-10 ${heroCopyLayout}`}>
        <HeroCopy />
      </div>
    </section>
  );
}

export function ScrollSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const textItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const [loadFailed, setLoadFailed] = useState(false);
  const isMobile = useIsMobile();
  const fallback = reduced || lowEnd || loadFailed;

  useEffect(() => {
    if (reduced || lowEnd) {
      return;
    }

    let cancelled = false;
    const frames: (HTMLImageElement | ImageBitmap | null)[] = [];
    let lastDrawn = -1;
    let lastTextIdx = -2;
    let lastPaintIdx = -1;
    let smoothProgress = 0;
    let pathsLen = 0;
    let digWidth = 1920;
    let digHeight = 1080;
    let paintFn: ((index: number, force?: boolean) => void) | null = null;
    let ready = false;
    let idlePos = 0;
    let idleDir = 1;
    let idleMax = IDLE_LOOP_FRAMES - 1;
    let scrollFrom = 0;
    let wasHolding = true;
    let lastTickTime = performance.now();

    const digBase = isMobile ? "/seq/dig-mobile" : "/seq/dig";
    const underBase = isMobile ? "/seq/underground-mobile" : "/seq/underground";

    async function loadImage(src: string): Promise<HTMLImageElement | ImageBitmap | null> {
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
        try {
          await withTimeout(img.decode(), 8000);
        } catch {
          if (!(img.complete && img.naturalWidth > 0)) {
            await withTimeout(
              new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("img error"));
              }),
              8000,
            );
          }
        }
        // HTMLImageElement only — createImageBitmap on 200+ WebPs stalls scrub
        // (nearestLoaded freezes on the first idle frames for seconds).
        return img;
      } catch {
        return null;
      }
    }

    const applyHeroLayers = (progress: number) => {
      const textOpacity = heroOpacityFromProgress(progress);
      if (heroLayerRef.current) {
        heroLayerRef.current.style.opacity = String(textOpacity);
        heroLayerRef.current.style.pointerEvents = textOpacity < 0.05 ? "none" : "auto";
        heroLayerRef.current.style.transform = `translate3d(0, ${(-1 + textOpacity) * 12}%, 0)`;
      }
    };

    const applyText = (frameProgress: number) => {
      let textIdx = -1;
      // Titulky hned po HERO_HOLD — dřívější práh 0.02 nechával „mrtvou“ mezeru se zamrzlým bagrem.
      if (frameProgress > 0) {
        textIdx = site.scrollTexts.findIndex(
          (t) => frameProgress >= t.start && frameProgress < t.end,
        );
        // Poslední slide drží až do konce scény (včetně progress === 1).
        if (textIdx < 0 && frameProgress >= site.scrollTexts.at(-1)!.start) {
          textIdx = site.scrollTexts.length - 1;
        }
      }
      if (textIdx === lastTextIdx) return;
      lastTextIdx = textIdx;
      textItemsRef.current.forEach((el, i) => {
        if (!el) return;
        const on = i === textIdx;
        el.style.opacity = on ? "1" : "0";
        el.style.transform = on
          ? "translate3d(-50%,0,0)"
          : "translate3d(-50%,0.8rem,0)";
        el.setAttribute("aria-hidden", on ? "false" : "true");
      });
    };

    const readProgress = () => {
      const section = sectionRef.current;
      if (!section) return 0;
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(1, Math.max(0, -section.getBoundingClientRect().top / total));
    };

    /** Priority frame loader — keep scrub responsive instead of freezing on early idle frames. */
    let enqueueLoad: ((i: number, priority?: boolean) => void) | null = null;

    const paintIndex = (idx: number) => {
      if (!paintFn || pathsLen < 1) return;
      const clamped = Math.min(pathsLen - 1, Math.max(0, idx));
      if (clamped !== lastPaintIdx) {
        lastPaintIdx = clamped;
        paintFn(clamped);
      }
      // Always pull frames around the scrub head so nearestLoaded can catch up.
      // Do not evict here — clearing decoded frames mid-scrub causes hard stutter.
      if (enqueueLoad) {
        for (let d = 0; d <= PRIORITY_RADIUS; d++) {
          enqueueLoad(clamped + d, true);
          if (d > 0) enqueueLoad(clamped - d, true);
        }
      }
    };

    const runIdle = (dt: number) => {
      if (idleMax > 0) {
        idlePos += idleDir * IDLE_FPS * dt;
        if (idlePos >= idleMax) {
          idlePos = idleMax;
          idleDir = -1;
        } else if (idlePos <= 0) {
          idlePos = 0;
          idleDir = 1;
        }
      }
      paintIndex(Math.round(idlePos));
      applyText(0);
    };

    const handoffToScroll = () => {
      if (!wasHolding) return;
      scrollFrom = Math.round(idlePos);
      wasHolding = false;
    };

    const applyScrollFrames = (progress: number) => {
      const frameProgress = frameProgressFromScroll(progress);
      const span = Math.max(1, pathsLen - 1 - scrollFrom);
      const idx = Math.min(
        pathsLen - 1,
        scrollFrom + Math.floor(frameProgress * span),
      );
      paintIndex(idx);
      applyText(frameProgress);
    };

    const onTick = () => {
      if (cancelled) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTickTime) / 1000);
      lastTickTime = now;
      // Raw progress decides idle vs scrub — never keep ping-ponging after scroll starts.
      const target = readProgress();

      if (target <= 0) {
        if (!wasHolding) {
          idlePos = scrollFrom;
          idleDir = 1;
        }
        wasHolding = true;
        smoothProgress = 0;
        applyHeroLayers(0);
        if (ready && paintFn && pathsLen > 0) runIdle(dt);
        return;
      }

      handoffToScroll();
      // Catch up instantly when scrolling down so frames track the wheel.
      if (target > smoothProgress) smoothProgress = target;
      else smoothProgress += (target - smoothProgress) * 0.28;
      if (Math.abs(target - smoothProgress) < 0.0008) smoothProgress = target;
      applyHeroLayers(smoothProgress);
      if (ready && paintFn && pathsLen > 0) applyScrollFrames(smoothProgress);
    };

    applyHeroLayers(0);
    applyText(0);
    gsap.ticker.add(onTick);
    window.addEventListener("scroll", onTick, { passive: true });

    async function setup() {
      const [digM, underM] = await Promise.all([
        loadManifest(`${digBase}/manifest.json`),
        loadManifest(`${underBase}/manifest.json`),
      ]);

      if (!digM || !underM || cancelled) {
        if (!cancelled) setLoadFailed(true);
        return;
      }

      digWidth = digM.width;
      digHeight = digM.height;

      const digPaths: string[] = [];
      for (let i = 0; i < digM.count; i++) {
        digPaths.push(framePath(digBase, digM.firstIndex + i, digM.pattern));
      }
      const underPaths: string[] = [];
      for (let i = 1; i < underM.count; i++) {
        underPaths.push(framePath(underBase, underM.firstIndex + i, underM.pattern));
      }
      const paths = [...digPaths, ...underPaths];
      pathsLen = paths.length;
      idleMax = Math.max(0, Math.min(IDLE_LOOP_FRAMES, digPaths.length) - 1);
      frames.length = paths.length;
      frames.fill(null);

      const canvas = canvasRef.current;
      const section = sectionRef.current;
      if (!canvas || !section) {
        if (!cancelled) setLoadFailed(true);
        return;
      }
      const ctx = getCanvas2d(canvas);
      if (!ctx) {
        if (!cancelled) setLoadFailed(true);
        return;
      }
      const smoothing: ImageSmoothingQuality = isMobile ? "medium" : "high";
      const maxDpr = isMobile ? 1.5 : 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = smoothing;

      let viewW = window.innerWidth;
      let viewH = window.innerHeight;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        const stage = canvas.parentElement;
        const w = stage?.clientWidth || window.innerWidth;
        const h = stage?.clientHeight || window.innerHeight;
        viewW = w;
        viewH = h;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Reset after buffer resize (browsers drop these with canvas.width assign).
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = smoothing;
        if (lastDrawn >= 0) paint(lastDrawn, true);
      };

      const paint = (index: number, force = false) => {
        if (!force && index === lastDrawn) return;
        const hit = nearestLoaded(frames, index);
        if (!hit) return;
        const iw =
          "naturalWidth" in hit.img
            ? hit.img.naturalWidth || digWidth
            : hit.img.width;
        const ih =
          "naturalHeight" in hit.img
            ? hit.img.naturalHeight || digHeight
            : hit.img.height;
        const focus = isMobile ? FOCUS_MOBILE : FOCUS_DESKTOP;
        drawCover(ctx, hit.img, viewW, viewH, iw, ih, focus.x, focus.y);
        lastDrawn = index;
      };
      paintFn = paint;

      // Bounded concurrency + priority queue. Flooding dozens of createImageBitmap
      // calls previously left scrub stuck on the first ~15 idle frames for seconds.
      const MAX_CONCURRENT = 6;
      const requested = new Set<number>();
      const queue: number[] = [];
      let activeLoads = 0;

      const pumpLoads = () => {
        while (activeLoads < MAX_CONCURRENT && queue.length > 0) {
          const i = queue.shift();
          if (i === undefined) break;
          if (frames[i] || i < 0 || i >= paths.length) continue;
          const path = paths[i];
          if (!path) continue;
          activeLoads += 1;
          void loadImage(path).then((img) => {
            activeLoads -= 1;
            if (!cancelled) {
              frames[i] = img;
              // Always refresh scrub head — previously a tight distance check
              // skipped updates and left the excavator frozen on early idle frames.
              if (img && lastPaintIdx >= 0) {
                paint(lastPaintIdx, true);
              }
              pumpLoads();
            }
          });
        }
      };

      enqueueLoad = (i: number, priority = false) => {
        if (i < 0 || i >= paths.length || frames[i]) return;
        if (requested.has(i)) {
          // Boost an already-queued frame to the front when scrub needs it now.
          if (priority) {
            const at = queue.indexOf(i);
            if (at > 0) {
              queue.splice(at, 1);
              queue.unshift(i);
            }
          }
          return;
        }
        requested.add(i);
        if (priority) queue.unshift(i);
        else queue.push(i);
        pumpLoads();
      };

      resize();
      canvas.style.opacity = "1";
      window.addEventListener("resize", resize);

      const preloadFirst = Math.min(IDLE_LOOP_FRAMES + 2, digPaths.length);
      frames[0] = await loadImage(paths[0]!);
      if (cancelled) return;
      if (!frames[0]) {
        if (!cancelled) setLoadFailed(true);
        return;
      }
      requested.add(0);
      paint(0, true);
      ready = true;
      if (stillRef.current) {
        stillRef.current.style.opacity = "0";
        stillRef.current.setAttribute("aria-hidden", "true");
      }
      lastTickTime = performance.now();
      paintIndex(Math.round(idlePos));
      // Catch up if user already scrolled while the first frame was loading.
      onTick();

      // Idle loop first, then rest of dig, then underground (background fill).
      for (let i = 1; i < preloadFirst; i++) enqueueLoad(i, true);
      for (let i = preloadFirst; i < digPaths.length; i++) enqueueLoad(i, false);
      for (let i = digPaths.length; i < paths.length; i++) enqueueLoad(i, false);

      return () => {
        window.removeEventListener("resize", resize);
        queue.length = 0;
      };
    }

    let cleanupInner: (() => void) | undefined;
    void setup()
      .then((c) => {
        cleanupInner = c;
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      ready = false;
      gsap.ticker.remove(onTick);
      window.removeEventListener("scroll", onTick);
      cleanupInner?.();
      frames.forEach((f) => {
        if (!f) return;
        if ("close" in f && typeof f.close === "function") f.close();
        else if ("src" in f) f.src = "";
      });
    };
  }, [reduced, lowEnd, isMobile]);

  if (fallback) {
    return (
      <>
        <StaticHero />
        <section id="v-akci" className="bg-ink">
          <div className="relative mx-auto max-w-6xl px-4 py-16">
            <AssetOrPlaceholder
              src="/hero/bucket-in-soil.webp"
              alt="Minibagr při výkopu"
              className="mb-8 w-full rounded-lg object-cover"
            />
            <ul className="space-y-10">
              {site.scrollTexts.map((t) => (
                <li key={t.title}>
                  <h2 className="font-display text-3xl uppercase tracking-tight text-white md:text-5xl">
                    {t.title}
                  </h2>
                  {"subtitle" in t && t.subtitle ? (
                    <p className="mt-2 font-display text-base uppercase tracking-wide text-white/60 md:text-lg">
                      <span className="text-komatsu-yellow">{unwrap(t.subtitle)}</span>
                      {"detail" in t && t.detail ? (
                        <span> · {t.detail}</span>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <AssetOrPlaceholder
              src="/textures/soil-cross-section.webp"
              alt="Řez půdou"
              className="mt-10 w-full rounded-lg object-cover"
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-[280vh] bg-ink md:h-[360vh]"
      aria-label="Úvod a animace výkopu řízená scrollem"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* LCP still — skryje se, jakmile canvas hraje idle smyčku dig 0001–0010. */}
        <div className="absolute inset-0 overflow-hidden">
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet={DIG_FIRST_MOBILE}
              type="image/webp"
            />
            <img
              ref={stillRef}
              src={DIG_FIRST}
              alt=""
              width={1920}
              height={1080}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full bg-[#0c1018] object-cover object-[34%_59%] transition-opacity duration-300 md:object-[40%_55%]"
            />
          </picture>
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full opacity-0"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/15 to-transparent" />

        <div
          ref={heroLayerRef}
          className="absolute inset-0 z-20 flex flex-col will-change-[opacity,transform]"
        >
          <div className={heroCopyLayout}>
            <HeroCopy />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[46%] z-10 -translate-y-full md:top-[48%]">
          <div className="relative mx-auto h-[11rem] w-full max-w-6xl px-4 text-center md:h-[13.5rem] md:px-8">
            {site.scrollTexts.map((t, i) => (
              <div
                key={t.title}
                ref={(el) => {
                  textItemsRef.current[i] = el;
                }}
                className="absolute left-1/2 top-0 w-full max-w-4xl opacity-0 transition-[opacity,transform] duration-500 ease-out"
                style={{ transform: "translate3d(-50%,0.8rem,0)" }}
                aria-hidden="true"
              >
                <h2 className="px-1 font-display text-[clamp(1.75rem,6vw,5.25rem)] uppercase leading-[1.05] tracking-tight text-balance text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.55)]">
                  {t.title}
                </h2>
                {"subtitle" in t && t.subtitle ? (
                  <p className="mt-3 px-1 font-display text-[clamp(1rem,2.4vw,1.85rem)] uppercase tracking-wide text-balance text-white/70">
                    <span className="text-komatsu-yellow">
                      {unwrap(t.subtitle)}
                    </span>
                    {"detail" in t && t.detail ? (
                      <span className="text-white/55"> · {t.detail}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[12vh] bg-gradient-to-b from-transparent via-panel/50 to-panel"
          aria-hidden
        />
        <p className="sr-only">
          Animace ukazuje výkop minibagrem a průlet pod povrch půdy. Texty: výkopy a
          základy, terénní úpravy, stísněné prostory, hloubka výkopu.
        </p>
      </div>
      <div id="v-akci" className="sr-only" aria-hidden />
    </section>
  );
}
