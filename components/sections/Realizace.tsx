"use client";

import { site } from "@/content/site";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AssetOrPlaceholder } from "@/components/ui/AssetOrPlaceholder";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

const photos = site.realizace;

function PhotoStrip({ duplicate }: { duplicate?: boolean }) {
  return (
    <ul
      className="flex shrink-0 list-none"
      aria-hidden={duplicate || undefined}
    >
      {photos.map((photo) => (
        <li
          key={`${duplicate ? "b" : "a"}-${photo.src}`}
          className="relative mr-3 aspect-[4/3] w-[min(72vw,22rem)] shrink-0 overflow-hidden md:mr-4 md:w-[28rem]"
        >
          <AssetOrPlaceholder
            src={photo.src}
            alt={duplicate ? "" : photo.alt}
            fill
            sizes="(max-width: 768px) 72vw, 28rem"
            className="object-cover"
            loading="lazy"
          />
        </li>
      ))}
    </ul>
  );
}

export function Realizace() {
  const reduced = useReducedMotion();

  return (
    <section id="realizace" className="!border-t-0 bg-void py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <SectionHeader title="Realizace">{site.realizaceIntro}</SectionHeader>
      </div>

      {reduced ? (
        <div
          className="mt-10 overflow-x-auto px-4 md:mt-14 md:px-8"
          tabIndex={0}
          role="region"
          aria-label="Fotografie z realizací"
        >
          <ul className="flex w-max list-none">
            {photos.map((photo) => (
              <li
                key={photo.src}
                className="relative mr-3 aspect-[4/3] w-[min(72vw,22rem)] shrink-0 overflow-hidden last:mr-0 md:mr-4 md:w-[28rem]"
              >
                <AssetOrPlaceholder
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 72vw, 28rem"
                  className="object-cover"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className="realizace-marquee mt-10 overflow-hidden md:mt-14"
          role="region"
          aria-label="Fotografie z realizací"
        >
          <div className="realizace-marquee__inner flex w-max">
            <PhotoStrip />
            <PhotoStrip duplicate />
          </div>
        </div>
      )}
    </section>
  );
}
