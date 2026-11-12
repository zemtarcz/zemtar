import { site } from "@/content/site";
import { AreaMap } from "@/components/sections/AreaMap";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Area() {
  return (
    <Section id="oblast" tone="panel" className="!border-t-0">
      <SectionHeader title="Oblast působnosti">
        {site.areaLabel}
      </SectionHeader>

      <div className="relative mt-14">
        <AreaMap />

        <div className="mt-8 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-komatsu-yellow">
            Obce a města v okolí
          </p>
          <p className="mt-5 text-base leading-relaxed text-white/70">
            {site.towns.all.map((town, i) => {
              const bold = (site.towns.bold as readonly string[]).includes(town);
              return (
                <span key={town}>
                  {bold ? <strong className="font-medium text-white">{town}</strong> : town}
                  {i < site.towns.all.length - 1 ? ", " : ""}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </Section>
  );
}
