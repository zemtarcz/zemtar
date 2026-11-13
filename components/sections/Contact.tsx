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
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SuccessCheck } from "@/components/ui/SuccessCheck";
import { useQuote } from "@/components/quote/QuoteContext";
import {
  compressImageToMaxBytes,
  PHOTO_SOURCE_MAX_BYTES,
} from "@/lib/compress-image";
import {
  formatPhoneDisplay,
  isValidCzechPhone,
  PHONE_PATTERN,
} from "@/lib/phone";
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

const PHOTO_MAX_MB = site.inquiryPhotoMaxMb;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
const PHOTO_MAX_COUNT = 4;
const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

const serviceValueSet = new Set(site.inquiryTypes.map((t) => t.value));

type ClientFieldKey =
  | "services"
  | "name"
  | "phone"
  | "email"
  | "place"
  | "term"
  | "consent"
  | "note";

type ClientErrors = Partial<Record<ClientFieldKey, string>>;

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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ys, ms, ds] = value.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
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

const FOCUS_ORDER: ClientFieldKey[] = [
  "services",
  "name",
  "phone",
  "email",
  "place",
  "term",
  "consent",
];

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
  const [phone, setPhone] = useState("");
  const [term, setTerm] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [suppressedServer, setSuppressedServer] = useState<
    Partial<Record<ClientFieldKey, true>>
  >({});
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [formEpoch, setFormEpoch] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const photosInputId = useId();
  const servicesGroupId = useId();
  const termErrId = useId();
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

  const err = (key: ClientFieldKey): string | undefined => {
    if (clientErrors[key]) return clientErrors[key];
    if (suppressedServer[key]) return undefined;
    return fieldError(state.fieldErrors, key);
  };

  const valuesServicesKey = values?.services?.join("|") ?? "";
  const serverErrorsKey = state.fieldErrors
    ? Object.keys(state.fieldErrors).sort().join("|")
    : "";

  useEffect(() => {
    if (!serverErrorsKey) return;
    queueMicrotask(() => {
      setClientErrors({});
      setSuppressedServer({});
    });
  }, [serverErrorsKey]);

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
      if (values) {
        setPhone(formatPhoneDisplay(values.phone));
        setTerm(values.term ?? "");
        setNote(
          (values.note ?? "")
            .replace(/\n?\n?Odhad z (?:konfigurátoru|ceníku)[\s\S]*$/m, "")
            .trim(),
        );
        setFormEpoch((n) => n + 1);
      }
    });
    // jen při mount / obnově hodnot po chybě
    // eslint-disable-next-line react-hooks/exhaustive-deps -- values serializace
  }, [
    valuesServicesKey,
    values?.note,
    values?.phone,
    values?.term,
    values?.name,
    values?.place,
    values?.email,
    values?.consent,
  ]);

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
      setPhone("");
      setTerm("");
      setClientErrors({});
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
      setClientErrors((prev) => {
        if (!prev.services) return prev;
        const next = { ...prev };
        delete next.services;
        return next;
      });
    });
  }, [fleetApplied, fleet.inquirySlug]);

  function clearFieldError(key: ClientFieldKey) {
    setClientErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSuppressedServer((prev) =>
      prev[key] ? prev : { ...prev, [key]: true },
    );
  }

  function toggleService(value: string) {
    clearFieldError("services");
    setSelectedServices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function focusFirstError(errors: ClientErrors) {
    for (const key of FOCUS_ORDER) {
      if (!errors[key]) continue;
      if (key === "services") {
        document.getElementById(servicesGroupId)?.focus?.();
        return;
      }
      if (key === "term") {
        document.getElementById("inquiry-term")?.focus?.();
        return;
      }
      if (key === "consent") {
        const el = formRef.current?.elements.namedItem("consent");
        if (el instanceof HTMLInputElement) el.focus();
        return;
      }
      const el = formRef.current?.elements.namedItem(key);
      if (el instanceof HTMLElement) {
        el.focus();
        return;
      }
    }
  }

  function validateClient(form: HTMLFormElement): ClientErrors {
    const errors: ClientErrors = {};
    if (selectedServices.length === 0) {
      errors.services = "Vyberte alespoň jednu službu";
    }

    const name = String(
      (form.elements.namedItem("name") as HTMLInputElement | null)?.value ?? "",
    ).trim();
    if (name.length < 2) errors.name = "Zadejte jméno";

    if (!isValidCzechPhone(phone)) {
      errors.phone = "Zadejte telefon ve tvaru 777 123 456";
    }

    const email = String(
      (form.elements.namedItem("email") as HTMLInputElement | null)?.value ??
        "",
    ).trim();
    if (!email) errors.email = "Zadejte e-mail";
    else if (!isValidEmail(email)) errors.email = "Zadejte platný e-mail";

    const place = String(
      (form.elements.namedItem("place") as HTMLInputElement | null)?.value ??
        "",
    ).trim();
    if (place.length < 2) errors.place = "Zadejte obec nebo adresu zakázky";

    if (!term || !isValidIsoDate(term)) {
      errors.term = "Vyberte orientační termín";
    }

    const consent = form.elements.namedItem("consent");
    if (!(consent instanceof HTMLInputElement) || !consent.checked) {
      errors.consent = "Potvrďte souhlas se zpracováním osobních údajů";
    }

    return errors;
  }

  async function addPhotos(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);
    const incoming = Array.from(fileList);
    const room = PHOTO_MAX_COUNT - photos.length;
    if (room <= 0) {
      setPhotoError(`Nahrajte nejvýše ${PHOTO_MAX_COUNT} fotografie.`);
      return;
    }

    setPhotoBusy(true);
    const next: PhotoPreview[] = [...photos];
    try {
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
        if (file.size > PHOTO_SOURCE_MAX_BYTES) {
          setPhotoError(
            `Fotka „${file.name}“ je příliš velká (max. ${Math.round(PHOTO_SOURCE_MAX_BYTES / (1024 * 1024))} MB před zmenšením).`,
          );
          continue;
        }

        let compressed: File;
        try {
          compressed = await compressImageToMaxBytes(file, PHOTO_MAX_BYTES);
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : `Fotku „${file.name}“ se nepodařilo zpracovat.`;
          setPhotoError(msg);
          continue;
        }

        next.push({
          id: `${compressed.name}-${compressed.size}-${Date.now()}-${Math.random()}`,
          file: compressed,
          url: URL.createObjectURL(compressed),
        });
      }
      setPhotos(next);
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    void addPhotos(e.dataTransfer.files);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const errors = validateClient(form);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    const formData = new FormData(form);
    formData.set("phone", formatPhoneDisplay(phone));
    formData.set("term", term);
    formData.delete("photos");
    for (const p of photos) {
      formData.append("photos", p.file, p.file.name);
    }

    startTransition(() => {
      action(formData);
    });
  }

  const servicesInvalid = Boolean(err("services"));
  const photosInvalid = Boolean(
    photoError || fieldError(state.fieldErrors, "photos"),
  );
  const failMailto = !state.ok ? state.mailto : undefined;

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
            Díky, ozveme se
          </p>
          {state.message ? (
            <p className="text-sm text-white/60">{state.message}</p>
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
            key={formEpoch}
            ref={formRef}
            onSubmit={onSubmit}
            className="space-y-5 border border-line p-6 md:p-8"
            encType="multipart/form-data"
            noValidate
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
                err("services") ? `${servicesGroupId}-err` : undefined
              }
            >
              <legend className="text-sm text-white/70">
                Co potřebujete*
              </legend>
              <div
                id={servicesGroupId}
                className={`mt-3 flex flex-wrap gap-2 ${
                  servicesInvalid ? "inquiry-services-invalid" : ""
                }`}
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
                          : servicesInvalid
                            ? "border-brand-red text-white/70 hover:border-brand-red hover:text-white"
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
              {err("services") ? (
                <p
                  id={`${servicesGroupId}-err`}
                  className="mt-2 text-sm text-brand-red"
                  role="alert"
                >
                  {err("services")}
                </p>
              ) : null}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Jméno*" error={err("name")}>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={120}
                  className={controlClass}
                  defaultValue={values?.name ?? ""}
                  aria-invalid={Boolean(err("name")) || undefined}
                  onInput={() => clearFieldError("name")}
                />
              </Field>
              <Field label="Telefon*" error={err("phone")}>
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern={PHONE_PATTERN}
                  title="Telefon ve tvaru 777 123 456"
                  placeholder="777 123 456"
                  className={controlClass}
                  value={phone}
                  aria-invalid={Boolean(err("phone")) || undefined}
                  onChange={(ev) => {
                    setPhone(formatPhoneDisplay(ev.target.value));
                    clearFieldError("phone");
                  }}
                />
              </Field>
            </div>

            <Field label="E-mail*" error={err("email")}>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={200}
                className={controlClass}
                defaultValue={values?.email ?? ""}
                aria-invalid={Boolean(err("email")) || undefined}
                onInput={() => clearFieldError("email")}
              />
            </Field>

            <Field
              label="Místo zakázky (obec / adresa)*"
              error={err("place")}
            >
              <input
                name="place"
                required
                autoComplete="street-address"
                maxLength={200}
                className={controlClass}
                defaultValue={values?.place ?? ""}
                aria-invalid={Boolean(err("place")) || undefined}
                onInput={() => clearFieldError("place")}
              />
            </Field>

            <Field label="Popis zakázky" error={err("note")}>
              <textarea
                name="note"
                rows={4}
                maxLength={4000}
                className={areaClass}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  clearFieldError("note");
                }}
                placeholder="Stručně popište, co je potřeba udělat…"
              />
            </Field>

            <div>
              <label
                htmlFor="inquiry-term"
                className="block text-sm text-white/70"
              >
                Orientační termín*
              </label>
              <span className="field-focus-line relative block">
                <DatePicker
                  id="inquiry-term"
                  name="term"
                  required
                  defaultValue={term || values?.term || ""}
                  aria-invalid={Boolean(err("term")) || undefined}
                  aria-describedby={err("term") ? termErrId : undefined}
                  onValueChange={(iso) => {
                    setTerm(iso);
                    clearFieldError("term");
                  }}
                />
              </span>
              {err("term") ? (
                <p
                  id={termErrId}
                  className="mt-1 text-sm text-brand-red"
                  role="alert"
                >
                  {err("term")}
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
                Nejvýše {PHOTO_MAX_COUNT} obrázky. Velké fotky se automaticky
                zmenší na max. {PHOTO_MAX_MB}&nbsp;MB (JPEG, PNG, WebP…).
              </p>
              <input
                ref={fileInputRef}
                id={photosInputId}
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                disabled={photoBusy}
                onChange={(e) => void addPhotos(e.target.files)}
              />
              <div
                role="button"
                tabIndex={photoBusy ? -1 : 0}
                aria-labelledby={`${photosInputId}-label`}
                aria-describedby={`${photosInputId}-hint`}
                aria-busy={photoBusy || undefined}
                data-invalid={photosInvalid ? "true" : undefined}
                onClick={() => {
                  if (!photoBusy) fileInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (photoBusy) return;
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
                  photosInvalid
                    ? "border-brand-red"
                    : photoDragOver
                      ? "border-komatsu-yellow bg-komatsu-yellow/10"
                      : "border-line hover:border-white/30"
                } ${photoBusy ? "opacity-70" : ""}`}
              >
                <p className="text-sm text-white/85">
                  {photoBusy
                    ? "Zmenšuji fotky…"
                    : photoDragOver
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
                aria-invalid={Boolean(err("consent")) || undefined}
                onChange={() => clearFieldError("consent")}
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
            {err("consent") ? (
              <p className="text-sm text-brand-red" role="alert">
                {err("consent")}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              disabled={pending || photoBusy}
              className="w-full"
            >
              {pending ? "Odesílám…" : "Odeslat poptávku"}
            </Button>

            <div aria-live="polite" className="min-h-6 text-sm">
              {state.message && !state.ok ? (
                <p className="text-brand-red">{state.message}</p>
              ) : null}
              {!state.ok &&
              (failMailto || state.message.includes("nepodařilo")) ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href={failMailto ?? mailtoFallback}
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
              {state.fieldErrors && Object.keys(clientErrors).length === 0 ? (
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
