// Lightweight client-side format checks before hitting the lookup API.
// Real verification (Aadhaar/ABHA) always happens server-side with consent.

export function detectIdentifierType(rawValue) {
  const value = rawValue.trim();
  if (/^\d{10}$/.test(value)) return 'linked_mobile';
  if (/^\d{12}$/.test(value)) return 'aadhaar_number';
  if (/^\d{2}-\d{4}-\d{4}-\d{4}$|^[a-zA-Z0-9._-]{8,}@[a-zA-Z]+$/.test(value)) return 'abha_id';
  return null;
}

export function isValidMobile(value) {
  return /^[6-9]\d{9}$/.test(value);
}

export function isValidAadhaar(value) {
  return /^\d{12}$/.test(value);
}

export function identifierLabel(type) {
  switch (type) {
    case 'abha_id': return 'ABHA';
    case 'linked_mobile': return 'Mobile';
    case 'aadhaar_number': return 'Aadhaar';
    default: return 'ID';
  }
}

export function isValidAbha(value) {
  // ABHA number format: 14 digits (xx-xxxx-xxxx-xxxx) or ABHA address (name@abdm)
  return /^\d{2}-?\d{4}-?\d{4}-?\d{4}$/.test(value) || /^[a-zA-Z0-9._-]{4,}@[a-zA-Z]+$/.test(value);
}
