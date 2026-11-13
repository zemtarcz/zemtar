"use server";

import { z } from "zod";
import { site, siteConfig, unwrap } from "@/content/site";
import { formatPhoneDisplay, isValidCzechPhone } from "@/lib/phone";

const INQUIRY_PHOTO_MAX_MB = site.inquiryPhotoMaxMb;
const INQUIRY_PHOTO_MAX_BYTES = INQUIRY_PHOTO_MAX_MB * 1024 * 1024;
const INQUIRY_PHOTO_MAX_COUNT = 4;
/** 4×2 MB po kompresi (+ rezerva multipart). */
const INQUIRY_PHOTOS_TOTAL_MAX_BYTES =
  INQUIRY_PHOTO_MAX_COUNT * INQUIRY_PHOTO_MAX_BYTES;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const serviceValues = site.inquiryTypes.map((t) => t.value) as [
  (typeof site.inquiryTypes)[number]["value"],
  ...(typeof site.inquiryTypes)[number]["value"][],
];

const serviceLabelByValue = Object.fromEntries(
  site.inquiryTypes.map((t) => [t.value, t.label]),
) as Record<string, string>;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
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

const inquirySchema = z.object({
  services: z
    .array(z.enum(serviceValues))
    .min(1, "Vyberte alespoň jednu službu"),
  place: z
    .string()
    .trim()
    .min(2, "Zadejte obec nebo adresu zakázky")
    .max(200, "Místo je příliš dlouhé"),
  term: z
    .string()
    .trim()
    .min(1, "Vyberte orientační termín")
    .refine(isValidIsoDate, { message: "Vyberte platné datum" }),
  name: z
    .string()
    .trim()
    .min(2, "Zadejte jméno")
    .max(120, "Jméno je příliš dlouhé"),
  phone: z
    .string()
    .trim()
    .refine(isValidCzechPhone, {
      message: "Zadejte telefon ve tvaru 777 123 456",
    }),
  email: z
    .string()
    .trim()
    .min(1, "Zadejte e-mail")
    .max(200, "E-mail je příliš dlouhý")
    .email("Zadejte platný e-mail"),
  note: z
    .string()
    .trim()
    .max(4000, "Popis je příliš dlouhý")
    .optional(),
  /** Orientační odhad z ceníku – kontext pro lepší pochopení poptávky. */
  contextCenik: z.string().trim().max(4000).optional(),
  /** Výběr z konfigurátoru Technika. */
  contextTechnika: z.string().trim().max(2000).optional(),
  consent: z.literal("on", {
    error: "Potvrďte souhlas se zpracováním osobních údajů",
  }),
  website: z.string().optional(), // honeypot
  startedAt: z.string(),
});

export type InquiryValues = {
  services: string[];
  place: string;
  term: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  consent: boolean;
};

export type InquiryState = {
  ok: boolean;
  message: string;
  mailto?: string;
  fieldErrors?: Record<string, string[]>;
  /** Zachovaná pole po neúspěchu (form reset po server action). */
  values?: InquiryValues;
};

type PhotoAttachment = {
  filename: string;
  contentType: string;
  size: number;
  contentBase64: string;
};

function collectServices(formData: FormData): string[] {
  const raw = formData
    .getAll("services")
    .map((v) => String(v).trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

function valuesFromForm(formData: FormData): InquiryValues {
  return {
    services: collectServices(formData),
    place: String(formData.get("place") ?? ""),
    term: String(formData.get("term") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    note: String(formData.get("note") ?? ""),
    consent: formData.get("consent") === "on",
  };
}

function isImageFile(file: File): boolean {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return true;
  // některé prohlížeče nepošlou MIME u HEIC
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

async function parsePhotos(
  formData: FormData,
): Promise<{ photos: PhotoAttachment[]; error?: string }> {
  const entries = formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (entries.length === 0) return { photos: [] };

  if (entries.length > INQUIRY_PHOTO_MAX_COUNT) {
    return {
      photos: [],
      error: `Nahrajte nejvýše ${INQUIRY_PHOTO_MAX_COUNT} fotografie.`,
    };
  }

  let total = 0;
  const photos: PhotoAttachment[] = [];

  for (const file of entries) {
    if (!isImageFile(file)) {
      return {
        photos: [],
        error: `Soubor „${file.name}“ není obrázek (JPEG, PNG, WebP, GIF, HEIC).`,
      };
    }
    if (file.size > INQUIRY_PHOTO_MAX_BYTES) {
      return {
        photos: [],
        error: `Fotka „${file.name}“ překračuje limit ${INQUIRY_PHOTO_MAX_MB} MB.`,
      };
    }
    total += file.size;
    if (total > INQUIRY_PHOTOS_TOTAL_MAX_BYTES) {
      return {
        photos: [],
        error:
          "Celková velikost fotek je příliš velká. Nahrajte méně nebo menší soubory.",
      };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    photos.push({
      filename: file.name || "fotka.jpg",
      contentType: file.type || "application/octet-stream",
      size: file.size,
      contentBase64: buf.toString("base64"),
    });
  }

  return { photos };
}

/** ISO `yyyy-mm-dd` → český zápis `d. m. yyyy` (např. 11. 11. 2026). */
function formatTermCs(term: string | undefined): string {
  const raw = term?.trim();
  if (!raw) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return raw;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(y, month - 1, day);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return raw;
  }
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

function buildPlainBody(
  data: z.infer<typeof inquirySchema>,
  photoNames: string[],
): string {
  const serviceLabels = data.services
    .map((s) => serviceLabelByValue[s] ?? s)
    .join(", ");

  // Priorita v e-mailu: 1) poptávka, 2) ceník, 3) konfigurátor techniky
  const sections: string[] = [
    "— POPTÁVKA —",
    `Služby: ${serviceLabels}`,
    `Místo: ${data.place}`,
    `Termín: ${formatTermCs(data.term)}`,
    `Jméno: ${data.name}`,
    `Telefon: ${data.phone}`,
    `E-mail: ${data.email}`,
    "",
    data.note?.trim() ? `Poznámka:\n${data.note.trim()}` : "Poznámka: —",
    "",
    photoNames.length
      ? `Fotky: ${photoNames.join(", ")}`
      : "Fotky: —",
  ];

  if (data.contextCenik?.trim()) {
    sections.push(
      "",
      "— CENÍK (orientační odhad) —",
      data.contextCenik.trim(),
    );
  }

  if (data.contextTechnika?.trim()) {
    sections.push(
      "",
      "— TECHNIKA (konfigurátor) —",
      data.contextTechnika.trim(),
    );
  }

  return sections.join("\n");
}

function buildMailtoUrl(
  to: string,
  subject: string,
  plainBody: string,
  photoNames: string[],
): string {
  const body = encodeURIComponent(
    [
      plainBody,
      "",
      photoNames.length
        ? `(Fotky nelze poslat přes mailto: ${photoNames.join(", ")})`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

/** Příjemce poptávek – přepsatelné přes `INQUIRY_TO`. */
const INQUIRY_TO_DEFAULT = "info@zemtar.cz";

function inquiryToAddress(): string {
  return process.env.INQUIRY_TO?.trim() || INQUIRY_TO_DEFAULT;
}

async function sendViaResend(opts: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  photos: PhotoAttachment[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Chybí konfigurace odesílání e-mailu." };
  }

  const from =
    process.env.INQUIRY_FROM?.trim() ||
    `ZEMTAR <poptavka@${siteConfig.domain}>`;

  const payload: Record<string, unknown> = {
    from,
    to: [opts.to],
    reply_to: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
  };

  if (opts.photos.length > 0) {
    payload.attachments = opts.photos.map((p) => ({
      filename: p.filename,
      content: p.contentBase64,
      content_type: p.contentType,
    }));
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[inquiry resend]", res.status, detail);
      return {
        ok: false,
        message:
          "Odeslání e-mailu se nepodařilo. Zkuste to znovu nebo nám zavolejte.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[inquiry resend]", err);
    return {
      ok: false,
      message:
        "Odeslání e-mailu se nepodařilo. Zkuste to znovu nebo nám zavolejte.",
    };
  }
}

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const values = valuesFromForm(formData);
  const raw = {
    services: values.services,
    place: values.place,
    term: values.term,
    name: values.name,
    phone: values.phone,
    email: values.email,
    note: values.note,
    contextCenik: String(formData.get("contextCenik") ?? "").trim() || undefined,
    contextTechnika:
      String(formData.get("contextTechnika") ?? "").trim() || undefined,
    consent: formData.get("consent"),
    website: String(formData.get("website") ?? ""),
    startedAt: String(formData.get("startedAt") ?? ""),
  };

  // honeypot
  if (raw.website && raw.website.length > 0) {
    return { ok: true, message: "Děkujeme, ozveme se." };
  }

  const started = Number(raw.startedAt);
  if (!Number.isFinite(started) || Date.now() - started < 3000) {
    return {
      ok: false,
      message: "Zkuste formulář odeslat znovu za chvilku.",
      values,
    };
  }

  const parsed = inquirySchema.safeParse({
    ...raw,
    consent: raw.consent === "on" ? "on" : raw.consent,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Zkontrolujte prosím vyplněná pole.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
      values,
    };
  }

  const photoResult = await parsePhotos(formData);
  if (photoResult.error) {
    return {
      ok: false,
      message: photoResult.error,
      fieldErrors: { photos: [photoResult.error] },
      values,
    };
  }

  const data = {
    ...parsed.data,
    phone: formatPhoneDisplay(parsed.data.phone),
  };
  const photos = photoResult.photos;
  const photoNames = photos.map((p) => p.filename);
  const title = `Poptávka – ${data.name} (${data.place})`;
  const plainBody = buildPlainBody(data, photoNames);

  const to = inquiryToAddress();

  if (process.env.NODE_ENV !== "production") {
    console.log("[inquiry]", {
      services: data.services,
      place: data.place,
      name: data.name,
      email: data.email,
      photos: photoNames,
      to,
      via: process.env.RESEND_API_KEY ? "resend" : "mailto",
    });
  }

  if (process.env.RESEND_API_KEY) {
    const sent = await sendViaResend({
      to,
      replyTo: data.email,
      subject: title,
      text: plainBody,
      photos,
    });
    if (!sent.ok) {
      return {
        ok: false,
        message: sent.message,
        values,
        mailto: buildMailtoUrl(to, title, plainBody, photoNames),
      };
    }
    return {
      ok: true,
      message: `Děkujeme, ozveme se nejpozději do ${unwrap(site.responseSla)}.`,
    };
  }

  return {
    ok: true,
    message:
      photos.length > 0
        ? "Děkujeme. Automatické odesílání e-mailu zatím není nastavené – fotky přes mailto nelze přiložit. Otevřete připravený e-mail nebo nám zavolejte."
        : "Děkujeme. Automatické odesílání e-mailu zatím není nastavené – otevřete připravený e-mail nebo nám zavolejte.",
    mailto: buildMailtoUrl(to, title, plainBody, photoNames),
  };
}
