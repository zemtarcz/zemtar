"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { track } from "@vercel/analytics";
import { formatCzk, site, unwrap } from "@/content/site";
import { Placeholder } from "@/components/ui/Placeholder";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Section, SectionHeader } from "@/components/ui/Section";
import { SuccessCheck } from "@/components/ui/SuccessCheck";
import { useQuote } from "@/components/quote/QuoteContext";
import {
  submitInquiry,
  type InquiryState,
  type InquiryValues,
} from "@/app/actions/inquiry";

const fieldBase =
  "mt-2 w-full border border-line bg-transparent px-3 py-3 text-base leading-normal text-white outline-none transition [color-scheme:dark]";

/** Jednořádková pole — stejná výška u input i select (Safari/Chrome jinak select zploští). */
const controlClass = `${fieldBase} h-12`;
const areaClass = fieldBase;

/** HTML pattern (flag `v`) — závorky a pomlčka escapované; min. 9 znaků. */
const PHONE_PATTERN = "[0-9 +\\(\\)\\-]{9,}";

const PHOTO_MAX_MB = site.inquiryPhotoMaxMb;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
const PHOTO_MAX_COUNT = 4;
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

const serviceValueSet = new Set(site.inquiryTypes.map((t) => t.value));

function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function resolveServiceSlug(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (serviceValueSet.has(key as (typeof site.inquiryTypes)[number]["value"])) {
    return key;
  }
  const alias =
    site.inquiryServiceAliases[
      key as keyof typeof site.inquiryServiceAliases
    ];
  return alias ?? null;
}

function servicesFromSearchParams(params: URLSearchParams): string[] {
  const raw = [
    ...params.getAll("sluzba"),
    ...(params.get("sluzba")?.split(",") ?? []),
  ];
  const out: string[] = [];
  for (const item of raw) {
    for (const part of item.split(",")) {
      const slug = resolveServiceSlug(part);
      if (slug && !out.includes(slug)) out.push(slug);
    }
  }
  return out;
}

type PhotoPreview = {
  id: string;
  file: File;
  url: string;
};

const initial: InquiryState = { ok: false, message: "" };

const fieldLabels: Record<string, string> = {
  place: "Místo zakázky",
  name: "Jméno",
  phone: "Telefon",
  email: "E-mail",
  services: "Služby",
  note: "Popis zakázky",
  term: "Termín",
  photos: "Fotky",
  consent: "Souhlas",
};

function fieldError(
  fieldErrors: Record<string, string[]> | undefined,
  key: string,
): string | undefined {
  return fieldErrors?.[key]?.[0];
}

async function safeSubmitInquiry(
  prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  try {
    return await submitInquiry(prev, formData);
  } catch {
    return {
      ok: false,
      message:
        "Odeslání se nepodařilo. Zkuste to znovu nebo nám zavolejte.",
      values: {
        services: formData
          .getAll("services")
          .map((v) => String(v))
          .filter(Boolean),
        place: String(formData.get("place") ?? ""),
        term: String(formData.get("term") ?? ""),
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        note: String(formData.get("note") ?? ""),
        consent: formData.get("consent") === "on",
      },
    };
  }
}

export function Contact() {
  const [state, action, pending] = useActionState(safeSubmitInquiry, initial);
  const [startedAt] = useState(() => String(Date.now()));
  const [note, setNote] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesClientError, setServicesClientError] = useState<string | null>(
    null,
  );
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosInputId = useId();
  const servicesGroupId = useId();
  const {
    applied,
    clearApplied,
    estimate,
    fleet,
    fleetApplied,
    clearFleetApplied,
  } = useQuote();
  const phoneHref = unwrap(site.phoneHref);
  const mailtoFallback = `mailto:${unwrap(site.email)}`;
  const values: InquiryValues | undefined = state.values;
  const showSuccess = state.ok;

  useEffect(() => {
    const fromUrl =
      typeof window !== "undefined"
        ? servicesFromSearchParams(
            new URLSearchParams(window.location.search),
          )
        : [];
    const fromState = values?.services ?? [];
    queueMicrotask(() => {
      setSelectedServices(
        fromState.length > 0 ? fromState : fromUrl.length > 0 ? fromUrl : [],
      );
      if (values?.note != null && values.note !== "") {
        // starší verze vkládaly odhad do poznámky — nechat jen uživatelský text
        setNote(
          values.note
            .replace(/\n?\n?Odhad z (?:konfigurátoru|ceníku)[\s\S]*$/m, "")
            .trim(),
        );
      }
    });
    // jen při mount / obnově hodnot po chybě
    // eslint-disable-next-line react-hooks/exhaustive-deps -- values serializace
  }, [values?.services?.join("|"), values?.note]);

  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.url);
    };
  }, [photos]);

  useEffect(() => {
    if (!state.ok) return;
    track("inquiry_submit", { ok: "true" });
    queueMicrotask(() => {
      setNote("");
      setPhotos((prev) => {
        for (const p of prev) URL.revokeObjectURL(p.url);
        return [];
      });
      setSelectedServices([]);
      setPhotoError(null);
      clearApplied();
      clearFleetApplied();
    });
  }, [state.ok, clearApplied, clearFleetApplied]);

  useEffect(() => {
    if (!fleetApplied) return;
    queueMicrotask(() => {
      setSelectedServices((prev) =>
        prev.includes(fleet.inquirySlug)
          ? prev
          : [...prev, fleet.inquirySlug],
      );
      setServicesClientError(null);
    });
  }, [fleetApplied, fleet.inquirySlug]);

  function toggleService(value: string) {
    setServicesClientError(null);
    setSelectedServices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function addPhotos(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);
    const incoming = Array.from(fileList);
    const next: PhotoPreview[] = [...photos];

    for (const file of incoming) {
      if (next.length >= PHOTO_MAX_COUNT) {
        setPhotoError(`Nahrajte nejvýše ${PHOTO_MAX_COUNT} fotografie.`);
        break;
      }
      if (
        !file.type.startsWith("image/") &&
        !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
      ) {
        setPhotoError(`Soubor „${file.name}“ není obrázek.`);
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        setPhotoError(
          `Fotka „${file.name}“ překračuje limit ${PHOTO_MAX_MB} MB.`,
        );
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      });
    }

    setPhotos(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
    setPhotoError(null);
  }

  function onPhotoDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setPhotoDragOver(true);
  }

  function onPhotoDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!photoDragOver) setPhotoDragOver(true);
  }

  function onPhotoDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setPhotoDragOver(false);
  }

  function onPhotoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setPhotoDragOver(false);
    addPhotos(e.dataTransfer.files);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (selectedServices.length === 0) {
      setServicesClientError("Vyberte alespoň jednu službu");
      document.getElementById(servicesGroupId)?.focus?.();
      return;
    }
    setServicesClientError(null);

    const phoneInput = form.elements.namedItem("phone");
    if (phoneInput instanceof HTMLInputElement) {
      const digits = phoneDigitCount(phoneInput.value);
      if (digits < 9) {
        phoneInput.setCustomValidity(
          "Zadejte platné telefonní číslo (min. 9 číslic)",
        );
      } else {
        phoneInput.setCustomValidity("");
      }
    }
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    formData.delete("photos");
    for (const p of photos) {
      formData.append("photos", p.file, p.file.name);
    }

    startTransition(() => {
      action(formData);
    });
  }

  return (
    <Section id="kontakt" tone="panel" className="!border-t-0">
      <SectionHeader title="Poptávka" />

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-10 sm:gap-y-2">
        <p className="text-base text-white/85 sm:text-lg">
          <span className="text-white/60">Telefon: </span>
          <a
            href={phoneHref}
            className="text-white hover:text-komatsu-yellow"
            onClick={() => track("phone_click", { source: "contact" })}
          >
            <Placeholder value={site.phone} />
          </a>
        </p>
        <p className="text-base text-white/85 sm:text-lg">
          <span className="text-white/60">Provozní doba: </span>
          <Placeholder value={site.openingHours} />
        </p>
      </div>

        {applied || fleetApplied ? (
          <div className="mt-8 space-y-3">
            {applied ? (
              <div className="border border-line bg-void/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-white/65">Váš odhad z ceníku</p>
                  <button
                    type="button"
                    onClick={clearApplied}
                    className="cursor-pointer text-sm text-white/60 hover:text-white"
                  >
                    Odebrat
                  </button>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {applied.lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3">
                      <span>{l.label}</span>
                      <span className="tabular-nums text-white">
                        {formatCzk(l.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-display text-2xl text-komatsu-yellow">
                  {formatCzk(applied.totalEx)}{" "}
                  <span className="text-sm font-sans font-normal text-white/60">
                    bez DPH
                  </span>
                </p>
              </div>
            ) : null}
            {fleetApplied ? (
              <div className="border border-line bg-void/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-white/65">
                    Výběr z konfigurátoru
                  </p>
                  <button
                    type="button"
                    onClick={clearFleetApplied}
                    className="cursor-pointer text-sm text-white/60 hover:text-white"
                  >
                    Odebrat
                  </button>
                </div>
                <p className="mt-3 font-display text-xl uppercase leading-tight text-white">
                  {fleet.workLabel}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-white/60">{fleet.slotALabel}</dt>
                    <dd className="text-white">{fleet.slotAName}</dd>
                  </div>
                  {fleet.slotBLabel && fleet.slotBName ? (
                    <div>
                      <dt className="text-white/60">{fleet.slotBLabel}</dt>
                      <dd className="text-white">{fleet.slotBName}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
            <p className="text-sm text-white/60">
              Odhad i sestava se přiloží k poptávce v e-mailu.
            </p>
          </div>
        ) : null}

        {showSuccess ? (
          <div
            className="mt-10 flex flex-col items-start justify-center gap-5 border border-line p-6 md:p-8"
            role="status"
            aria-live="polite"
          >
            <SuccessCheck className="text-komatsu-yellow" />
            <p className="font-display text-2xl uppercase text-white md:text-3xl">
              Díky, ozveme se do 24&nbsp;h
            </p>
            {state.message ? (
              <p className="text-sm text-white/60">
                {state.message.replace(
                  "1 pracovního dne",
                  unwrap(site.responseSla),
                )}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {state.mailto ? (
                <a href={state.mailto} className="underline underline-offset-4">
                  Otevřít e-mail (mailto)
                </a>
              ) : null}
              <a href={phoneHref} className="underline underline-offset-4">
                Raději zavolat
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-10">
            <form
              onSubmit={onSubmit}
              className="space-y-5 border border-line p-6 md:p-8"
              encType="multipart/form-data"
              noValidate={false}
            >
              <input type="hidden" name="startedAt" value={startedAt} />
              <input
                type="hidden"
                name="contextCenik"
                value={applied?.noteText ?? estimate.noteText}
              />
              <input
                type="hidden"
                name="contextTechnika"
                value={fleet.noteText}
              />
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
                className="hidden"
                aria-hidden="true"
              />

              <fieldset
                className="min-w-0"
                aria-describedby={
                  fieldError(state.fieldErrors, "services")
                    ? `${servicesGroupId}-err`
                    : undefined
                }
              >
                <legend className="text-sm text-white/70">
                  Co potřebujete*
                </legend>
                <div
                  id={servicesGroupId}
                  className="mt-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Výběr služeb"
                  tabIndex={-1}
                >
                  {site.inquiryTypes.map((t) => {
                    const checked = selectedServices.includes(t.value);
                    return (
                      <label
                        key={t.value}
                        className={`cursor-pointer border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-komatsu-yellow bg-komatsu-yellow text-void"
                            : "border-line text-white/70 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="services"
                          value={t.value}
                          checked={checked}
                          onChange={() => toggleService(t.value)}
                          className="sr-only"
                        />
                        {t.label}
                      </label>
                    );
                  })}
                </div>
                {servicesClientError ||
                fieldError(state.fieldErrors, "services") ? (
                  <p
                    id={`${servicesGroupId}-err`}
                    className="mt-2 text-sm text-brand-red"
                    role="alert"
                  >
                    {servicesClientError ??
                      fieldError(state.fieldErrors, "services")}
                  </p>
                ) : null}
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Jméno*"
                  error={fieldError(state.fieldErrors, "name")}
                >
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    className={controlClass}
                    defaultValue={values?.name ?? ""}
                    aria-invalid={Boolean(fieldError(state.fieldErrors, "name"))}
                  />
                </Field>
                <Field
                  label="Telefon*"
                  error={fieldError(state.fieldErrors, "phone")}
                >
                  <input
                    name="phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    pattern={PHONE_PATTERN}
                    title="Zadejte platné telefonní číslo (min. 9 číslic)"
                    className={controlClass}
                    defaultValue={values?.phone ?? ""}
                    aria-invalid={Boolean(
                      fieldError(state.fieldErrors, "phone"),
                    )}
                    onInput={(ev) => {
                      ev.currentTarget.setCustomValidity("");
                    }}
                  />
                </Field>
              </div>

              <Field
                label="E-mail*"
                error={fieldError(state.fieldErrors, "email")}
              >
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={controlClass}
                  defaultValue={values?.email ?? ""}
                  aria-invalid={Boolean(fieldError(state.fieldErrors, "email"))}
                />
              </Field>

              <Field
                label="Místo zakázky (obec / adresa)*"
                error={fieldError(state.fieldErrors, "place")}
              >
                <input
                  name="place"
                  required
                  autoComplete="street-address"
                  className={controlClass}
                  defaultValue={values?.place ?? ""}
                  aria-invalid={Boolean(fieldError(state.fieldErrors, "place"))}
                />
              </Field>

              <Field
                label="Popis zakázky"
                error={fieldError(state.fieldErrors, "note")}
              >
                <textarea
                  name="note"
                  rows={4}
                  className={areaClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Stručně popište, co je potřeba udělat…"
                />
              </Field>

              <div>
                <label
                  htmlFor="inquiry-term"
                  className="block text-sm text-white/70"
                >
                  Orientační termín
                </label>
                <span className="field-focus-line relative block">
                  <DatePicker
                    id="inquiry-term"
                    name="term"
                    defaultValue={values?.term ?? ""}
                    aria-invalid={Boolean(fieldError(state.fieldErrors, "term"))}
                  />
                </span>
                {fieldError(state.fieldErrors, "term") ? (
                  <p className="mt-1 text-sm text-brand-red" role="alert">
                    {fieldError(state.fieldErrors, "term")}
                  </p>
                ) : null}
              </div>

              <div>
                <p
                  id={`${photosInputId}-label`}
                  className="block text-sm text-white/70"
                >
                  Fotky místa (volitelné)
                </p>
                <p
                  id={`${photosInputId}-hint`}
                  className="mt-1 text-xs text-white/60"
                >
                  Nejvýše {PHOTO_MAX_COUNT} obrázky, max. {PHOTO_MAX_MB}&nbsp;MB
                  na soubor (JPEG, PNG, WebP…).
                </p>
                <input
                  ref={fileInputRef}
                  id={photosInputId}
                  type="file"
                  accept={PHOTO_ACCEPT}
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => addPhotos(e.target.files)}
                />
                <div
                  role="button"
                  tabIndex={0}
                  aria-labelledby={`${photosInputId}-label`}
                  aria-describedby={`${photosInputId}-hint`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={onPhotoDragEnter}
                  onDragOver={onPhotoDragOver}
                  onDragLeave={onPhotoDragLeave}
                  onDrop={onPhotoDrop}
                  className={`mt-3 cursor-pointer border border-dashed px-4 py-8 text-center transition ${
                    photoDragOver
                      ? "border-komatsu-yellow bg-komatsu-yellow/10"
                      : "border-line hover:border-white/30"
                  }`}
                >
                  <p className="text-sm text-white/85">
                    {photoDragOver
                      ? "Pusťte fotky sem"
                      : "Přetáhněte fotky sem"}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    nebo{" "}
                    <span className="text-white underline underline-offset-4">
                      vyberte ze zařízení
                    </span>
                  </p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-white/60">
                    {photos.length === 0
                      ? "Žádné fotky"
                      : photos.length === 1
                        ? "1 fotka"
                        : `${photos.length} fotky`}
                    {photos.length >= PHOTO_MAX_COUNT
                      ? " · maximum"
                      : photos.length > 0
                        ? ` · ještě ${PHOTO_MAX_COUNT - photos.length}`
                        : null}
                  </p>
                </div>
                {photos.length > 0 ? (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {photos.map((p) => (
                      <li
                        key={p.id}
                        className="relative aspect-square overflow-hidden border border-line bg-void"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- blob náhled */}
                        <img
                          src={p.url}
                          alt={`Náhled ${p.file.name}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="absolute right-1 top-1 cursor-pointer bg-void/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-white hover:bg-brand-red"
                        >
                          Odebrat
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {photoError || fieldError(state.fieldErrors, "photos") ? (
                  <p className="mt-2 text-sm text-brand-red" role="alert">
                    {photoError ?? fieldError(state.fieldErrors, "photos")}
                  </p>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className="mt-1 accent-brand-red"
                  defaultChecked={values?.consent ?? false}
                  aria-invalid={Boolean(
                    fieldError(state.fieldErrors, "consent"),
                  )}
                />
                <span>
                  Souhlasím se{" "}
                  <a
                    href="/zasady-ochrany-osobnich-udaju"
                    className="underline underline-offset-4"
                  >
                    zpracováním osobních údajů
                  </a>
                  *
                </span>
              </label>
              {fieldError(state.fieldErrors, "consent") ? (
                <p className="text-sm text-brand-red" role="alert">
                  {fieldError(state.fieldErrors, "consent")}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                disabled={pending}
                className="w-full"
              >
                {pending ? "Odesílám…" : "Odeslat poptávku"}
              </Button>

              <div aria-live="polite" className="min-h-6 text-sm">
                {state.message && !state.ok ? (
                  <p className="text-brand-red">{state.message}</p>
                ) : null}
                {!state.ok && state.message.includes("nepodařilo") ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={mailtoFallback}
                      className="underline underline-offset-4"
                    >
                      Napsat e-mailem
                    </a>
                    <a
                      href={phoneHref}
                      className="underline underline-offset-4"
                    >
                      Raději zavolat
                    </a>
                  </div>
                ) : null}
                {state.fieldErrors ? (
                  <ul className="mt-2 list-disc pl-5 text-brand-red">
                    {Object.entries(state.fieldErrors).map(([k, errs]) =>
                      errs?.map((e) => (
                        <li key={`${k}-${e}`}>
                          {fieldLabels[k] ?? k}: {e}
                        </li>
                      )),
                    )}
                  </ul>
                ) : null}
              </div>
            </form>
          </div>
        )}
    </Section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-white/70">
      {label}
      <span className="field-focus-line relative block">{children}</span>
      {error ? (
        <span className="mt-1 block text-sm text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
