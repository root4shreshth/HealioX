/**
 * Strict client + server validators used across forms and API routes.
 * Keep in sync — same rules on both sides prevent silent server rejections.
 */

// RFC 5322-lite — covers the realistic 99.99% of real email shapes.
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;

export function isValidEmail(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (v.length > 254) return false;
  return EMAIL_RE.test(v);
}

// E.164: + then 8-15 digits. Default to India (+91) when no country code given.
const PHONE_E164_RE = /^\+\d{8,15}$/;

export function normalizePhone(input: string, defaultCountry = "+91"): string {
  if (!input) return "";
  // strip all non-digit / non-plus
  let v = input.replace(/[^\d+]/g, "");
  if (!v) return "";

  // ensure leading +
  if (v.startsWith("00")) v = "+" + v.slice(2);   // 0091... → +91...
  if (!v.startsWith("+")) {
    // 10-digit Indian mobile? prepend default country
    if (/^[6-9]\d{9}$/.test(v)) v = `${defaultCountry}${v}`;
    else v = `+${v}`;
  }
  return v;
}

export function isValidPhone(value: string): boolean {
  if (!value) return false;
  const v = normalizePhone(value);
  return PHONE_E164_RE.test(v);
}

export function isValidAadhaar(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length === 12;
}

export function maskAadhaar(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length !== 12) return value || "";
  return `XXXX XXXX ${digits.slice(-4)}`;
}

export function isValidName(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.length >= 2 && v.length <= 80 && /^[A-Za-zÀ-ɏऀ-ॿ .'-]+$/.test(v);
}

export function isValidPassword(value: string): boolean {
  if (!value) return false;
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

// Format E.164 phone as +91 98100 00000 for display
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  const v = phone.startsWith("+") ? phone : `+${phone}`;
  if (v.startsWith("+91") && v.length === 13) {
    return `+91 ${v.slice(3, 8)} ${v.slice(8)}`;
  }
  return v;
}
