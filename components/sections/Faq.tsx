"use client";

import { useId, useState } from "react";
import { site, unwrap } from "@/content/site";
import { Placeholder } from "@/components/ui/Placeholder";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Faq() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);

  // Two independent columns so opening one answer doesn't stretch the other.
  const mid = Math.ceil(site.faq.length / 2);
  const columns = [site.faq.slice(0, mid), site.faq.slice(mid)] as const;

  return (
    <Section id="faq" tone="void" className="!border-t-0">
      <SectionHeader title="Často kladené otázky">
        Nejčastější otázky před poptávkou.
      </SectionHeader>

      <div className="mt-12 grid border-t border-line md:grid-cols-2 md:items-start md:gap-x-12">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="min-w-0">
            {col.map((item, localIdx) => {
              const i = colIdx === 0 ? localIdx : mid + localIdx;
              const isOpen = open === i;
              const panelId = `${baseId}-panel-${i}`;
              const buttonId = `${baseId}-btn-${i}`;
              return (
                <div key={item.q} className="border-b border-line">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left font-display text-lg uppercase tracking-wide transition hover:text-komatsu-yellow"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      {item.q}
                      <span aria-hidden className="font-mono text-komatsu-yellow">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`text-white/65 ${isOpen ? "pb-5" : "pb-0"}`}
                        inert={!isOpen ? true : undefined}
                        aria-hidden={!isOpen}
                      >
                        <p>
                          <Placeholder value={item.a} />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: site.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: unwrap(item.a),
      },
    })),
  };
}
