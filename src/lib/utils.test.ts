import { describe, it, expect } from 'vitest';
import { cn, slugify, validateVoen, validatePhone, normalizeAzPhone, formatPrice } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, null, false, '', 'b')).toBe('a b');
  });
});

describe('slugify', () => {
  it('replaces Azerbaijani letters', () => {
    expect(slugify('İşçi axtarış')).toBe('isci-axtaris');
  });

  it('handles special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('collapses multiple spaces and dashes', () => {
    expect(slugify('a  b   c')).toBe('a-b-c');
  });
});

describe('validateVoen', () => {
  it('accepts 10-digit VÖEN', () => {
    expect(validateVoen('1234567890')).toBe(true);
  });

  it('accepts VÖEN with spaces', () => {
    expect(validateVoen('1234 567 890')).toBe(true);
  });

  it('rejects short VÖEN', () => {
    expect(validateVoen('12345')).toBe(false);
  });

  it('rejects non-digit VÖEN', () => {
    expect(validateVoen('12345678ab')).toBe(false);
  });
});

describe('validatePhone / normalizeAzPhone', () => {
  it('accepts +994 prefix', () => {
    expect(validatePhone('+994 50 123 45 67')).toBe(true);
    expect(normalizeAzPhone('+994 50 123 45 67')).toBe('+994501234567');
  });

  it('accepts 0 prefix', () => {
    expect(validatePhone('050 123 45 67')).toBe(true);
    expect(normalizeAzPhone('050 123 45 67')).toBe('+994501234567');
  });

  it('accepts 994 without plus', () => {
    expect(validatePhone('994551234567')).toBe(true);
  });

  it('rejects invalid operator code', () => {
    expect(validatePhone('+994 30 123 45 67')).toBe(false);
  });

  it('rejects wrong digit count', () => {
    expect(validatePhone('+994 50 123')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validatePhone('')).toBe(false);
    expect(normalizeAzPhone('')).toBe(null);
  });
});

describe('formatPrice', () => {
  it('formats with 2 decimal places and AZN suffix', () => {
    expect(formatPrice(10)).toBe('10.00 AZN');
    expect(formatPrice(10.5)).toBe('10.50 AZN');
  });
});
