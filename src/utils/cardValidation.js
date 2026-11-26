/**
 * Standard Credit & Debit Card Validation Utilities
 * Validates cardholder name, IIN/BIN network prefix, card length, Luhn (Mod-10)
 * checksum, MM/YY expiry date (including current month), and network-specific CVV/CVC length.
 */

export const CARD_BRANDS = [
  {
    id: 'amex',
    name: 'American Express',
    shortName: 'AMEX',
    pattern: /^3[47]/,
    lengths: [15],
    cvvLength: 4,
    gaps: [4, 10],
  },
  {
    id: 'diners',
    name: 'Diners Club',
    shortName: 'DINERS',
    pattern: /^(30[0-5]|36|38|39)/,
    lengths: [14, 16],
    cvvLength: 3,
    gaps: [4, 10],
  },
  {
    id: 'jcb',
    name: 'JCB',
    shortName: 'JCB',
    pattern: /^35(2[89]|[3-8]\d)/,
    lengths: [16, 19],
    cvvLength: 3,
    gaps: [4, 8, 12],
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    shortName: 'MC',
    pattern: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/,
    lengths: [16],
    cvvLength: 3,
    gaps: [4, 8, 12],
  },
  {
    id: 'discover',
    name: 'Discover',
    shortName: 'DISCOVER',
    pattern: /^(6011|65|64[4-9]|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9[01]\d|92[0-5]))/,
    lengths: [16, 19],
    cvvLength: 3,
    gaps: [4, 8, 12],
  },
  {
    id: 'unionpay',
    name: 'UnionPay',
    shortName: 'UNIONPAY',
    pattern: /^62/,
    lengths: [16, 17, 18, 19],
    cvvLength: 3,
    gaps: [4, 8, 12],
  },
  {
    id: 'visa',
    name: 'Visa',
    shortName: 'VISA',
    pattern: /^4/,
    lengths: [13, 16, 19],
    cvvLength: 3,
    gaps: [4, 8, 12],
  },
];

export function stripNonDigits(input) {
  return String(input ?? '').replace(/\D/g, '');
}

/**
 * Detects the card network from the leading IIN/BIN digits.
 */
export function detectCardBrand(cardNumberInput) {
  const digits = stripNonDigits(cardNumberInput);
  if (!digits) return null;
  // Check longer/more-specific prefixes before broad prefixes like 62 (UnionPay)
  const order = ['amex', 'diners', 'jcb', 'mastercard', 'discover', 'unionpay', 'visa'];
  for (const id of order) {
    const brand = CARD_BRANDS.find((b) => b.id === id);
    if (brand && brand.pattern.test(digits)) {
      return brand;
    }
  }
  return null;
}

/**
 * Standard Luhn (Mod-10) check. Rejects non-digits, short PANs (<13), and repeated identical digits.
 */
export function isValidLuhn(digitsInput) {
  const digits = stripNonDigits(digitsInput);
  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Formats card digits with hyphens: 4-6-5 for Amex (max 15 digits), 4-4-4-4(-3) otherwise.
 */
export function formatCardNumber(input) {
  const raw = stripNonDigits(input);
  const brand = detectCardBrand(raw);
  const maxLen = brand ? Math.max(...brand.lengths) : 16;
  const digits = raw.slice(0, maxLen);

  if (brand?.id === 'amex') {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join('-');
  }

  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join('-') : '';
}

/**
 * Formats expiry digits as MM/YY (max 4 digits).
 */
export function formatExpiry(input) {
  const digits = stripNonDigits(input).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/**
 * Formats security code digits up to the network's CVV length (4 for Amex, 3 otherwise).
 */
export function formatCvv(input, brand) {
  const maxLen = brand?.cvvLength || 3;
  return stripNonDigits(input).slice(0, maxLen);
}

/**
 * Validates cardholder name (2-60 chars, valid letters/punctuation only, first + last name).
 */
export function validateCardholderName(name) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { valid: false, error: 'Cardholder name is required' };
  }
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { valid: false, error: 'Enter a valid full name (2-60 characters)' };
  }
  if (!/^[\p{L}][\p{L}\s'.-]*[\p{L}.]$/u.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, or apostrophes' };
  }
  const parts = trimmed.split(' ').filter((p) => /[\p{L}]/u.test(p));
  if (parts.length < 2) {
    return { valid: false, error: 'Enter both first and last name as shown on card' };
  }
  return { valid: true, error: null, normalized: trimmed };
}

/**
 * Validates card number against recognized IIN network prefix, valid length, and Luhn checksum.
 */
export function validateCardNumber(cardNumberInput) {
  const digits = stripNonDigits(cardNumberInput);
  if (!digits) {
    return { valid: false, error: 'Card number is required', brand: null, digits: '', last4: '' };
  }

  const brand = detectCardBrand(digits);
  if (!brand) {
    return {
      valid: false,
      error: 'Unsupported or invalid card number (use Visa, Mastercard, Amex, Discover, JCB, Diners, or UnionPay)',
      brand: null,
      digits,
      last4: digits.slice(-4),
    };
  }

  if (!brand.lengths.includes(digits.length)) {
    const expected = brand.lengths.join(' or ');
    return {
      valid: false,
      error: `${brand.name} card numbers must be ${expected} digits`,
      brand,
      digits,
      last4: digits.slice(-4),
    };
  }

  if (!isValidLuhn(digits)) {
    return {
      valid: false,
      error: 'Invalid card number (failed security check)',
      brand,
      digits,
      last4: digits.slice(-4),
    };
  }

  return { valid: true, error: null, brand, digits, last4: digits.slice(-4) };
}

/**
 * Validates strict MM/YY expiration date against current calendar month/year (+20 year cap).
 */
export function validateExpiry(expiryInput, now = new Date()) {
  const value = String(expiryInput ?? '').trim();
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) {
    return { valid: false, error: 'Enter a valid expiry date (MM/YY)', month: null, year: null };
  }

  const month = Number(match[1]);
  const yy = Number(match[2]);
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid expiry month (01-12)', month, year: yy };
  }

  const currentYearFull = now.getFullYear();
  const currentCentury = Math.floor(currentYearFull / 100) * 100;
  const currentYY = currentYearFull % 100;
  const fullYear = currentCentury + yy;
  const currentMonth = now.getMonth() + 1;

  if (yy < currentYY || (yy === currentYY && month < currentMonth)) {
    return { valid: false, error: 'Card has expired', month, year: fullYear };
  }

  if (fullYear > currentYearFull + 20) {
    return { valid: false, error: 'Expiry year is too far in the future', month, year: fullYear };
  }

  return { valid: true, error: null, month, year: fullYear };
}

/**
 * Validates security code length (4 digits for American Express, 3 digits otherwise).
 */
export function validateCvv(cvvInput, brand = null) {
  const digits = stripNonDigits(cvvInput);
  const expectedLength = brand?.cvvLength || 3;
  if (!digits) {
    return { valid: false, error: `Enter your ${expectedLength}-digit security code` };
  }
  if (digits.length !== expectedLength) {
    const label = brand?.id === 'amex' ? '4-digit CID/CVV for American Express' : '3-digit CVV/CVC';
    return { valid: false, error: `Enter a valid ${label}` };
  }
  return { valid: true, error: null };
}

/**
 * Validates the complete credit/debit card checkout form.
 */
export function validateCardForm({ cardName, cardNumber, expiry, cvv }, now = new Date()) {
  const errors = {};

  const nameCheck = validateCardholderName(cardName);
  if (!nameCheck.valid) errors.cardName = nameCheck.error;

  const numberCheck = validateCardNumber(cardNumber);
  if (!numberCheck.valid) errors.cardNumber = numberCheck.error;

  const expiryCheck = validateExpiry(expiry, now);
  if (!expiryCheck.valid) errors.expiry = expiryCheck.error;

  const cvvCheck = validateCvv(cvv, numberCheck.brand);
  if (!cvvCheck.valid) errors.cvv = cvvCheck.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    brand: numberCheck.brand,
    last4: numberCheck.last4,
    normalizedName: nameCheck.normalized || String(cardName ?? '').trim(),
  };
}
