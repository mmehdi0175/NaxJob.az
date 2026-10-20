export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function slugify(text: string): string {
  const map: Record<string, string> = {
    'ə': 'e', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ş': 's', 'ç': 'c', 'ü': 'u', 'ö': 'o',
  };
  return text
    .toLowerCase()
    .replace(/[əğışçüöİ]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function validateVoen(voen: string): boolean {
  const cleaned = voen.replace(/\s/g, '');
  return /^\d{10}$/.test(cleaned);
}

export function validatePhone(phone: string): boolean {
  return normalizeAzPhone(phone) !== null;
}

/**
 * Normalize an Azerbaijani mobile phone number to +994XXXXXXXXX format.
 * Recognized operator codes: 50, 51, 10, 70, 77, 55, 99, 60.
 * Accepts +994, 994, or leading 0 prefix and spaces/dashes/parens.
 * Returns the normalized number, or null if invalid.
 */
export function normalizeAzPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Strip optional +994 / 994 prefix, or leading 0
  let digits = cleaned;
  if (digits.startsWith('+994')) digits = digits.slice(4);
  else if (digits.startsWith('994')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  // Must be exactly 9 digits starting with a valid AZ mobile operator code (2 digits)
  const operatorCodes = ['50', '51', '10', '70', '77', '55', '99', '60'];
  if (!/^\d{9}$/.test(digits)) return null;
  if (!operatorCodes.some((c) => digits.startsWith(c))) return null;
  return `+994${digits}`;
}

export function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} AZN`;
}
