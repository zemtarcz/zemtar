"use client";

import { useId, useState } from "react";
import {
  accessoryForWork,
  equipmentKindLabel,
  fleetUnits,
  getEquipment,
  getFleetUnit,
  getWorkType,
  worksForUnit,
  type EquipmentItem,
  type FleetUnit,
  type WorkId,
} from "@/src/data/equipment";
import { useQuote } from "@/components/quote/QuoteContext";
import { AssetOrPlaceholder } from "@/components/ui/AssetOrPlaceholder";
import { Button } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Section } from "@/components/ui/Section";
import { track } from "@vercel/analytics";

function StageImage({ item }: { item: EquipmentItem }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-void">
      <AssetOrPlaceholder
        key={item.id}
        src={item.image}
        alt={item.imageAlt}
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="object-cover"
        loading="lazy"
      />
      <span
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
        aria-hidden
      />
    </div>
  );
}

function FocusThumb({
  item,
  label,
  selected,
  onSelect,
}: {
  item: EquipmentItem;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={item.name}
      className={[
        "flex min-w-0 flex-1 items-center gap-2 border p-1.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-komatsu-yellow sm:gap-3 sm:p-2",
        selected
          ? "border-komatsu-yellow bg-panel"
          : "border-line bg-transparent hover:border-white/35",
      ].join(" ")}
    >
      <span className="relative aspect-[4/3] h-11 shrink-0 overflow-hidden bg-void sm:h-14 lg:h-16">
        <AssetOrPlaceholder
          src={item.image}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
          loading="lazy"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] text-white/60 sm:text-[11px]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white sm:text-sm">
          {item.shortName}
        </span>
      </span>
    </button>
  );
}

function accessoryKindLabel(item: EquipmentItem): string {
  if (item.id === "plosina-4m") return "Nástavba";
  return equipmentKindLabel[item.kind];
}

function AccessoryCard({
  item,
  selected,
  onSelect,
}: {
  item: EquipmentItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex min-w-0 w-full items-start gap-2 border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-komatsu-yellow sm:gap-3",
        selected
          ? "border-komatsu-yellow bg-panel"
          : "border-line bg-transparent hover:border-white/35",
      ].join(" ")}
    >
      <span className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden bg-void sm:w-20">
        <AssetOrPlaceholder
          src={item.image}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
          loading="lazy"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] text-white/60">
          {accessoryKindLabel(item)}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-white">
          {item.name}
        </span>
        {item.params[0] ? (
          <span className="mt-1 block text-xs text-komatsu-yellow">
            {item.params[0].label}: <Placeholder value={item.params[0].value} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function defaultWorkForUnit(unit: FleetUnit): WorkId {
  return worksForUnit(unit)[0]?.id ?? "vykop";
}

export function Fleet() {
  const unitGroupId = useId();
  const usesGroupId = useId();
  const { setFleetWork, applyFleetToContact } = useQuote();

  const initialUnit = fleetUnits[0]!;
  const [unitId, setUnitId] = useState(initialUnit.id);
  const unit = getFleetUnit(unitId) ?? initialUnit;
  const primary = getEquipment(unit.primaryId)!;
  const accessories = unit.accessoryIds
    .map((id) => getEquipment(id))
    .filter((e): e is EquipmentItem => Boolean(e));

  const relatedWorks = worksForUnit(unit);
  const [workId, setWorkId] = useState<WorkId>(() =>
    defaultWorkForUnit(initialUnit),
  );
  const activeWorkId = relatedWorks.some((w) => w.id === workId)
    ? workId
    : defaultWorkForUnit(unit);
  const work = getWorkType(activeWorkId) ?? relatedWorks[0]!;

  const workAccessory = accessoryForWork(unit, activeWorkId);
  const [focusId, setFocusId] = useState<string>(unit.primaryId);
  const stageItem =
    getEquipment(focusId) ?? workAccessory ?? primary;
  const showingAccessory = stageItem.id !== primary.id;

  function selectUnit(nextId: string) {
    const next = getFleetUnit(nextId);
    if (!next) return;
    setUnitId(nextId);
    const nextWork = defaultWorkForUnit(next);
    setWorkId(nextWork);
    setFleetWork(nextWork);
    setFocusId(next.primaryId);
  }

  function selectWork(id: WorkId) {
    setWorkId(id);
    setFleetWork(id);
    const acc = accessoryForWork(unit, id);
    if (acc) setFocusId(acc.id);
    else setFocusId(unit.primaryId);
  }

  function selectFocus(id: string) {
    setFocusId(id);
    const item = getEquipment(id);
    if (!item) return;
    const match = item.workIds.find((w) =>
      relatedWorks.some((rw) => rw.id === w),
    );
    if (match) {
      setWorkId(match);
      setFleetWork(match);
    }
  }

  function goToInquiry() {
    setFleetWork(activeWorkId);
    applyFleetToContact();
    track("fleet_to_contact", {
      work: activeWorkId,
      unit: unit.id,
      focus: stageItem.id,
    });
    document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <Section id="technika" tone="void">
      <header>
        <h2 className="font-display text-4xl uppercase leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
          Technika
        </h2>
        <p className="mt-2 text-sm text-white/65 sm:mt-3 sm:text-base md:max-w-none md:text-lg md:whitespace-nowrap">
          Minibagr s nástavci, nákladní automobil s plošinou a kontejnery – k čemu
          slouží uvidíte dole. Bez cen.
        </p>
      </header>

      <div className="mt-5 sm:mt-6 lg:mt-10">
        <p id={unitGroupId} className="text-sm text-white/65">
          Stroj
        </p>
        <div
          role="radiogroup"
          aria-labelledby={unitGroupId}
          className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {fleetUnits.map((u) => {
            const checked = u.id === unit.id;
            return (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => selectUnit(u.id)}
                className={[
                  "shrink-0 border px-2.5 py-1.5 text-sm whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-komatsu-yellow sm:px-3 sm:py-2",
                  checked
                    ? "border-komatsu-yellow bg-komatsu-yellow text-void"
                    : "border-line text-white hover:border-white/40",
                ].join(" ")}
              >
                {u.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 sm:mt-5 sm:gap-5 lg:mt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] lg:items-start lg:gap-10">
        <aside className="order-2 flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:gap-6">
          <div>
            <h3 className="font-display text-2xl uppercase leading-tight text-white sm:text-3xl">
              {showingAccessory ? stageItem.name : primary.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              {showingAccessory ? stageItem.description : primary.description}
            </p>
            {(showingAccessory ? stageItem.params : primary.params).length >
            0 ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {(showingAccessory ? stageItem.params : primary.params).map(
                  (p) => (
                    <div key={p.label} className="min-w-0">
                      <dt className="text-[11px] text-white/60">{p.label}</dt>
                      <dd className="truncate text-komatsu-yellow">
                        <Placeholder value={p.value} />
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            ) : null}
          </div>

          {accessories.length > 0 ? (
            <div className="border-t border-line pt-4 lg:pt-5">
              <p className="text-sm text-white/65">{unit.accessoryLabel}</p>
              <ul className="mt-2 space-y-2">
                {accessories.map((acc) => (
                  <li key={acc.id}>
                    <AccessoryCard
                      item={acc}
                      selected={focusId === acc.id}
                      onSelect={() => selectFocus(acc.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-line pt-4 lg:pt-5">
            <p id={usesGroupId} className="text-sm text-white/65">
              K čemu slouží
            </p>
            <div
              role="radiogroup"
              aria-labelledby={usesGroupId}
              className="mt-2 flex flex-wrap gap-1.5"
            >
              {relatedWorks.map((w) => {
                const checked = w.id === activeWorkId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => selectWork(w.id)}
                    className={[
                      "shrink-0 border px-2.5 py-1.5 text-sm whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-komatsu-yellow",
                      checked
                        ? "border-komatsu-yellow bg-komatsu-yellow text-void"
                        : "border-line text-white hover:border-white/40",
                    ].join(" ")}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {work.explanation}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button type="button" variant="primary" onClick={goToInquiry}>
              Poptat tuto práci
            </Button>
            <p className="text-sm text-white/65">
              Vhodnou techniku pro vaši zakázku doporučíme po telefonu.
            </p>
          </div>
        </aside>

        <div className="order-1 min-w-0">
          <StageImage item={stageItem} />

          <div
            role="group"
            aria-label="Přepnout náhled"
            className="mt-2 flex min-w-0 gap-1.5 sm:mt-3 sm:gap-2"
          >
            <FocusThumb
              item={primary}
              label="Stroj"
              selected={focusId === primary.id}
              onSelect={() => selectFocus(primary.id)}
            />
            {workAccessory ? (
              <FocusThumb
                item={workAccessory}
                label={accessoryKindLabel(workAccessory)}
                selected={focusId === workAccessory.id}
                onSelect={() => selectFocus(workAccessory.id)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );
}
