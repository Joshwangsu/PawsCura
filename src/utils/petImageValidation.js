export const VALIDATION_STATUS = {
  VALID_DOG: 'VALID_DOG',
  VALID_CAT: 'VALID_CAT',
  NO_ANIMAL: 'NO_ANIMAL',
  UNCLEAR_OR_OBSTRUCTED: 'UNCLEAR_OR_OBSTRUCTED',
  MULTIPLE_ANIMALS: 'MULTIPLE_ANIMALS',
  INVALID_IMAGE: 'INVALID_IMAGE',
  SPECIES_MISMATCH: 'SPECIES_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
};

export const ALLOWED_SPECIES = ['dog', 'cat', 'none', 'unknown'];
export const ALLOWED_VISIBILITY = ['clear', 'partial', 'obscured', 'none'];
export const ALLOWED_SUITABILITY = ['suitable', 'unsuitable'];

const SPECIES_ALIASES = {
  dog: 'dog',
  canine: 'dog',
  puppy: 'dog',
  cat: 'cat',
  feline: 'cat',
  kitten: 'cat',
};

export function normalizePetSpecies(species) {
  if (!species || typeof species !== 'string') return null;
  const cleaned = species.trim().toLowerCase();
  return SPECIES_ALIASES[cleaned] || null;
}

export function computeImageFingerprint(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return '';
  const raw = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  const len = raw.length;
  if (len === 0) return '';

  let h1 = 0x811c9dc5;
  const mid = Math.floor(len / 2);
  const ranges = [
    [0, Math.min(256, len)],
    [Math.max(0, mid - 128), Math.min(len, mid + 128)],
    [Math.max(0, len - 256), len],
  ];

  for (const [start, end] of ranges) {
    for (let i = start; i < end; i++) {
      h1 ^= raw.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
  }
  return `${len}:${h1.toString(16)}`;
}

function buildMalformedValidationResult(reason) {
  return {
    validated: false,
    isValid: false,
    validationStatus: VALIDATION_STATUS.VALIDATION_FAILED,
    detectedSpecies: 'unknown',
    animalVisibility: 'none',
    animalCount: 0,
    imageSuitability: 'unsuitable',
    rejectionReason:
      reason ||
      'The validation service returned an incomplete or unreadable response. Please tap Retry Validation.',
    canRetry: true,
    malformedResponse: true,
  };
}

/**
 * Strictly parses and cross-validates the structured JSON response from Gemini Vision.
 * Fails closed on any missing required field, invalid enum, or cross-field contradiction.
 */
export function parseGeminiValidationResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return buildMalformedValidationResult();
  }

  const stripped = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : stripped;

  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return buildMalformedValidationResult();
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildMalformedValidationResult();
  }

  const requiredFields = [
    'validationStatus',
    'detectedSpecies',
    'animalVisibility',
    'animalCount',
    'imageSuitability',
    'rejectionReason',
  ];
  for (const field of requiredFields) {
    if (!(field in parsed) || parsed[field] === undefined || parsed[field] === null) {
      return buildMalformedValidationResult();
    }
  }

  if (typeof parsed.validationStatus !== 'string' || typeof parsed.detectedSpecies !== 'string') {
    return buildMalformedValidationResult();
  }
  if (
    typeof parsed.animalVisibility !== 'string' ||
    typeof parsed.imageSuitability !== 'string' ||
    typeof parsed.rejectionReason !== 'string'
  ) {
    return buildMalformedValidationResult();
  }

  const rawStatus = parsed.validationStatus.trim().toUpperCase();
  const detectedSpecies = parsed.detectedSpecies.trim().toLowerCase();
  const animalVisibility = parsed.animalVisibility.trim().toLowerCase();
  const imageSuitability = parsed.imageSuitability.trim().toLowerCase();
  const rejectionReason = parsed.rejectionReason.trim();
  const animalCount = parsed.animalCount;

  const validInputStatuses = [
    VALIDATION_STATUS.VALID_DOG,
    VALIDATION_STATUS.VALID_CAT,
    VALIDATION_STATUS.NO_ANIMAL,
    VALIDATION_STATUS.UNCLEAR_OR_OBSTRUCTED,
    VALIDATION_STATUS.MULTIPLE_ANIMALS,
    VALIDATION_STATUS.INVALID_IMAGE,
  ];

  if (!validInputStatuses.includes(rawStatus)) {
    return buildMalformedValidationResult();
  }
  if (!ALLOWED_SPECIES.includes(detectedSpecies)) {
    return buildMalformedValidationResult();
  }
  if (!ALLOWED_VISIBILITY.includes(animalVisibility)) {
    return buildMalformedValidationResult();
  }
  if (!ALLOWED_SUITABILITY.includes(imageSuitability)) {
    return buildMalformedValidationResult();
  }
  if (typeof animalCount !== 'number' || !Number.isInteger(animalCount) || animalCount < 0) {
    return buildMalformedValidationResult();
  }

  if (animalCount > 1 || rawStatus === VALIDATION_STATUS.MULTIPLE_ANIMALS) {
    return {
      validated: true,
      isValid: false,
      validationStatus: VALIDATION_STATUS.MULTIPLE_ANIMALS,
      detectedSpecies,
      animalVisibility,
      animalCount: animalCount > 1 ? animalCount : 2,
      imageSuitability: 'unsuitable',
      rejectionReason:
        rejectionReason ||
        'Multiple animals were detected in this photo. Please upload a clear photo showing only one dog or cat.',
      canRetry: false,
      malformedResponse: false,
    };
  }

  if (
    animalCount === 0 ||
    detectedSpecies === 'none' ||
    rawStatus === VALIDATION_STATUS.NO_ANIMAL
  ) {
    return {
      validated: true,
      isValid: false,
      validationStatus: VALIDATION_STATUS.NO_ANIMAL,
      detectedSpecies: detectedSpecies === 'dog' || detectedSpecies === 'cat' ? 'none' : detectedSpecies,
      animalVisibility,
      animalCount: 0,
      imageSuitability: 'unsuitable',
      rejectionReason:
        rejectionReason ||
        'No dog or cat was detected in this photo. Please upload a clear photo of a real dog or cat.',
      canRetry: false,
      malformedResponse: false,
    };
  }

  if (
    animalVisibility === 'obscured' ||
    animalVisibility === 'none' ||
    imageSuitability !== 'suitable' ||
    rawStatus === VALIDATION_STATUS.UNCLEAR_OR_OBSTRUCTED
  ) {
    return {
      validated: true,
      isValid: false,
      validationStatus: VALIDATION_STATUS.UNCLEAR_OR_OBSTRUCTED,
      detectedSpecies,
      animalVisibility,
      animalCount,
      imageSuitability: 'unsuitable',
      rejectionReason:
        rejectionReason ||
        'The animal or target area is too blurry, dark, or obstructed for reliable assessment. Please upload another clear photo.',
      canRetry: false,
      malformedResponse: false,
    };
  }

  if (rawStatus === VALIDATION_STATUS.INVALID_IMAGE || detectedSpecies === 'unknown') {
    return {
      validated: true,
      isValid: false,
      validationStatus: VALIDATION_STATUS.INVALID_IMAGE,
      detectedSpecies,
      animalVisibility,
      animalCount,
      imageSuitability: 'unsuitable',
      rejectionReason:
        rejectionReason ||
        'The uploaded image is not suitable for a pet visual health check. Please upload a clear photo of your dog or cat.',
      canRetry: false,
      malformedResponse: false,
    };
  }

  if (
    rawStatus === VALIDATION_STATUS.VALID_DOG &&
    detectedSpecies === 'dog' &&
    animalCount === 1 &&
    (animalVisibility === 'clear' || animalVisibility === 'partial') &&
    imageSuitability === 'suitable'
  ) {
    return {
      validated: true,
      isValid: true,
      validationStatus: VALIDATION_STATUS.VALID_DOG,
      detectedSpecies: 'dog',
      animalVisibility,
      animalCount: 1,
      imageSuitability: 'suitable',
      rejectionReason: '',
      canRetry: false,
      malformedResponse: false,
    };
  }

  if (
    rawStatus === VALIDATION_STATUS.VALID_CAT &&
    detectedSpecies === 'cat' &&
    animalCount === 1 &&
    (animalVisibility === 'clear' || animalVisibility === 'partial') &&
    imageSuitability === 'suitable'
  ) {
    return {
      validated: true,
      isValid: true,
      validationStatus: VALIDATION_STATUS.VALID_CAT,
      detectedSpecies: 'cat',
      animalVisibility,
      animalCount: 1,
      imageSuitability: 'suitable',
      rejectionReason: '',
      canRetry: false,
      malformedResponse: false,
    };
  }

  return buildMalformedValidationResult(
    'Image validation returned conflicting species metadata. Please tap Retry Validation.'
  );
}

/**
 * Verifies that a passed Gemini validation result matches the selected registered pet's species.
 * Confirms species match only; never claims biometric individual identity from species validation.
 */
export function verifyRegisteredPetSpecies(validationResult, selectedPet = null) {
  if (!validationResult || !validationResult.isValid) {
    const isFailure =
      !validationResult || validationResult.validationStatus === VALIDATION_STATUS.VALIDATION_FAILED;
    return {
      matched: false,
      status: isFailure ? 'validation_failed' : 'invalid_image',
      validationStatus: validationResult?.validationStatus || VALIDATION_STATUS.VALIDATION_FAILED,
      canRetry: Boolean(validationResult?.canRetry ?? isFailure),
      detectedSpecies: validationResult?.detectedSpecies || 'unknown',
      expectedSpecies: normalizePetSpecies(selectedPet?.species),
      reason:
        validationResult?.rejectionReason ||
        'Image validation did not pass. Please upload a clear photo of a dog or cat.',
    };
  }

  const detectedSpecies = normalizePetSpecies(validationResult.detectedSpecies);
  if (!detectedSpecies) {
    return {
      matched: false,
      status: 'invalid_image',
      validationStatus: VALIDATION_STATUS.INVALID_IMAGE,
      canRetry: false,
      detectedSpecies: validationResult.detectedSpecies || 'unknown',
      expectedSpecies: normalizePetSpecies(selectedPet?.species),
      reason: 'Could not confirm whether the photo depicts a dog or cat.',
    };
  }

  const expectedSpecies = normalizePetSpecies(selectedPet?.species);
  if (selectedPet && expectedSpecies && detectedSpecies !== expectedSpecies) {
    const petName = selectedPet.name || 'the selected pet';
    return {
      matched: false,
      status: 'species_mismatch',
      validationStatus: VALIDATION_STATUS.SPECIES_MISMATCH,
      canRetry: false,
      detectedSpecies,
      expectedSpecies,
      petName,
      reason: `Species mismatch: The uploaded photo shows a ${detectedSpecies}, but ${petName} is registered as a ${expectedSpecies}. Please select a registered ${detectedSpecies} or upload a photo of a ${expectedSpecies}.`,
    };
  }

  return {
    matched: true,
    status: 'valid',
    validationStatus: validationResult.validationStatus,
    detectedSpecies,
    expectedSpecies: expectedSpecies || null,
    petId: selectedPet?.id || null,
    petName: selectedPet?.name || null,
    speciesVerified: Boolean(expectedSpecies),
  };
}
