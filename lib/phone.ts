/** České mobilní číslo: 9 číslic, zobrazení `xxx xxx xxx`. */

export function normalizePhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00420") && digits.length > 5) {
    digits = digits.slice(5);
  } else if (digits.startsWith("420") && digits.length > 3) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/** Formátuje vstup na `xxx xxx xxx` (max. 9 číslic). */
export function formatPhoneDisplay(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join(" ");
}

export function isValidCzechPhone(raw: string): boolean {
  return normalizePhoneDigits(raw).length === 9;
}

export const PHONE_PATTERN = "[0-9]{3} [0-9]{3} [0-9]{3}";
