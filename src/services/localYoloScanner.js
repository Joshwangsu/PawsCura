/**
 * PawsCura Local YOLOv11m (18-Symptom) + 26-Disease & Severity Clinical Engine
 *
 * Implements:
 *  1. 18 Unified YOLOv11 Symptom Classes (BEST_PT_CLASSES) & Intrinsic Severity Weights
 *  2. Hardcoded Clinical Severity Scorer (Mild / Moderate / Severe -> mapped to Safe / Mild / Moderate / Urgent)
 *  3. 26-Disease Veterinary Differential Classifier with Co-Occurrence Synergy Bonuses
 *  4. Direct client connection to PawsCura AI Server (`POST /predict/base64`) running `best.pt` (`best final.pt`)
 */

// ── 1. The 18 Unified YOLOv11m Symptom Classes (0..17) ───────────────────────
export const BEST_PT_CLASSES = [
  'alopecia',             // 0
  'crust_scale',          // 1
  'erythema',             // 2
  'excoriation',          // 3
  'hot_spot',             // 4
  'hyperpigmentation',    // 5
  'lichenification',      // 6
  'mass_growth',          // 7
  'oral_lesion',          // 8
  'papule_pustule',       // 9
  'swelling',             // 10
  'ulceration',           // 11
  'conjunctival_redness', // 12
  'corneal_opacity',      // 13
  'eyelid_mass',          // 14
  'eyelid_swelling',      // 15
  'lens_opacity',         // 16
  'ocular_discharge',     // 17
];

// Intrinsic clinical severity weights (0.48 to 0.95)
export const SYMPTOM_SEVERITY_WEIGHTS = {
  ulceration: 0.95,
  hot_spot: 0.90,
  mass_growth: 0.90,
  corneal_opacity: 0.90,
  lens_opacity: 0.88,
  oral_lesion: 0.85,
  eyelid_mass: 0.85,
  lichenification: 0.72,
  excoriation: 0.68,
  papule_pustule: 0.65,
  swelling: 0.65,
  eyelid_swelling: 0.65,
  crust_scale: 0.62,
  ocular_discharge: 0.58,
  conjunctival_redness: 0.55,
  erythema: 0.52,
  alopecia: 0.48,
  hyperpigmentation: 0.48,
};

// ── 2. Expanded 26 Veterinary Disease Profiles ──────────────────────────────
export const DISEASE_PROFILES = [
  // ------------------- DERMATOLOGICAL / SKIN CONDITIONS (14) -------------------
  {
    disease: 'Sarcoptic Mange (Canine/Feline Scabies)',
    category: 'Skin / Dermatological',
    weights: {
      alopecia: 0.38,
      crust_scale: 0.38,
      excoriation: 0.30,
      lichenification: 0.26,
      erythema: 0.22,
      papule_pustule: 0.20,
      hyperpigmentation: 0.18,
    },
    synergy: [
      { req: ['alopecia', 'crust_scale'], bonus: 0.22, note: 'Hair loss with thick crusty scaling' },
      { req: ['alopecia', 'excoriation'], bonus: 0.18, note: 'Intense pruritus causing scratch excoriations & hair loss' },
      { req: ['crust_scale', 'lichenification'], bonus: 0.15, note: 'Chronic crusted & thickened leathery skin' },
    ],
  },
  {
    disease: 'Demodectic Mange (Demodicosis)',
    category: 'Skin / Dermatological',
    weights: {
      alopecia: 0.46,
      hyperpigmentation: 0.28,
      lichenification: 0.28,
      erythema: 0.24,
      crust_scale: 0.22,
      papule_pustule: 0.20,
    },
    synergy: [
      { req: ['alopecia', 'hyperpigmentation'], bonus: 0.18, note: 'Follicular hair loss with darkened hyperpigmented skin' },
      { req: ['alopecia', 'lichenification'], bonus: 0.18, note: 'Chronic alopecia with thickened leathery skin' },
      { req: ['alopecia', 'erythema'], bonus: 0.14, note: 'Patchy or periocular hair loss with red skin' },
    ],
  },
  {
    disease: 'Atopic / Environmental Allergic Dermatitis',
    category: 'Skin / Dermatological',
    weights: {
      erythema: 0.42,
      alopecia: 0.32,
      excoriation: 0.32,
      lichenification: 0.24,
      hyperpigmentation: 0.22,
      papule_pustule: 0.18,
    },
    synergy: [
      { req: ['erythema', 'alopecia'], bonus: 0.18, note: 'Inflamed red skin with self-induced hair thinning' },
      { req: ['erythema', 'excoriation'], bonus: 0.18, note: 'Pruritic erythema with scratch marks' },
    ],
  },
  {
    disease: 'Flea Allergy Dermatitis (FAD)',
    category: 'Skin / Dermatological',
    weights: {
      papule_pustule: 0.36,
      excoriation: 0.36,
      alopecia: 0.32,
      erythema: 0.30,
      crust_scale: 0.25,
      hot_spot: 0.22,
    },
    synergy: [
      { req: ['alopecia', 'excoriation'], bonus: 0.16, note: 'Self-trauma hair loss and scratching from flea bite hypersensitivity' },
      { req: ['papule_pustule', 'crust_scale'], bonus: 0.16, note: 'Miliary crusted papules from flea bites' },
    ],
  },
  {
    disease: 'Malassezia (Yeast) Dermatitis',
    category: 'Skin / Dermatological',
    weights: {
      lichenification: 0.44,
      hyperpigmentation: 0.42,
      alopecia: 0.30,
      erythema: 0.28,
      crust_scale: 0.24,
    },
    synergy: [
      { req: ['lichenification', 'hyperpigmentation'], bonus: 0.24, note: "Classic 'elephant skin' (thickened, leathery, dark skin)" },
      { req: ['lichenification', 'alopecia'], bonus: 0.16, note: 'Chronic thickened hairless skin fold' },
    ],
  },
  {
    disease: 'Acute Moist Dermatitis (Pyotraumatic Hot Spot)',
    category: 'Skin / Dermatological',
    weights: {
      hot_spot: 0.72,
      erythema: 0.28,
      ulceration: 0.28,
      alopecia: 0.22,
      excoriation: 0.22,
    },
    synergy: [
      { req: ['hot_spot', 'erythema'], bonus: 0.16, note: 'Well-demarcated red, moist, raw self-licked hot spot' },
      { req: ['hot_spot', 'ulceration'], bonus: 0.15, note: 'Eroded/ulcerated acute moist dermatitis' },
      { req: ['hot_spot', 'alopecia'], bonus: 0.14, note: 'Acute focal hair loss over wet hot spot' },
    ],
  },
  {
    disease: 'Superficial Bacterial Folliculitis / Impetigo (Pyoderma)',
    category: 'Skin / Dermatological',
    weights: {
      papule_pustule: 0.54,
      crust_scale: 0.32,
      erythema: 0.28,
      alopecia: 0.22,
      hyperpigmentation: 0.16,
    },
    synergy: [
      { req: ['papule_pustule', 'crust_scale'], bonus: 0.20, note: 'Pustules and circular epidermal collarettes/crusts' },
      { req: ['papule_pustule', 'erythema'], bonus: 0.16, note: 'Erythematous pustular bacterial rash' },
    ],
  },
  {
    disease: 'Deep Pyoderma / Furunculosis / Cellulitis',
    category: 'Skin / Dermatological',
    weights: {
      ulceration: 0.44,
      papule_pustule: 0.38,
      swelling: 0.34,
      crust_scale: 0.26,
      erythema: 0.25,
      alopecia: 0.20,
    },
    synergy: [
      { req: ['ulceration', 'papule_pustule'], bonus: 0.20, note: 'Deep draining pustules and ulcerated furuncles' },
      { req: ['ulceration', 'swelling'], bonus: 0.18, note: 'Swollen infected dermis with ulceration' },
    ],
  },
  {
    disease: 'Dermatophytosis (Fungal Ringworm)',
    category: 'Skin / Dermatological',
    weights: {
      alopecia: 0.44,
      crust_scale: 0.40,
      erythema: 0.22,
      papule_pustule: 0.14,
    },
    synergy: [
      { req: ['alopecia', 'crust_scale'], bonus: 0.18, note: 'Circular/focal hair loss with dry scaling and broken hairs' },
    ],
  },
  {
    disease: 'Seborrhea / Keratinization Disorder (Scaling Dermatosis)',
    category: 'Skin / Dermatological',
    weights: {
      crust_scale: 0.56,
      alopecia: 0.26,
      lichenification: 0.22,
      hyperpigmentation: 0.20,
      erythema: 0.18,
    },
    synergy: [
      { req: ['crust_scale', 'alopecia'], bonus: 0.14, note: 'Heavy flaky dandruff/scaling with thinning coat' },
    ],
  },
  {
    disease: "Endocrine / Hormonal Alopecia (Hypothyroidism / Cushing's)",
    category: 'Skin / Dermatological',
    weights: {
      alopecia: 0.45,
      hyperpigmentation: 0.40,
      crust_scale: 0.20,
    },
    synergy: [
      { req: ['alopecia', 'hyperpigmentation'], bonus: 0.16, note: 'Non-inflammatory hair loss with dark hyperpigmented skin' },
    ],
  },
  {
    disease: 'Cutaneous Neoplasia / Mast Cell Tumor / Histiocytoma',
    category: 'Skin / Dermatological',
    weights: {
      mass_growth: 0.72,
      swelling: 0.35,
      ulceration: 0.26,
      erythema: 0.18,
      alopecia: 0.15,
    },
    synergy: [
      { req: ['mass_growth', 'ulceration'], bonus: 0.20, note: 'Raised cutaneous tumor/mass with surface ulceration' },
      { req: ['mass_growth', 'erythema'], bonus: 0.14, note: 'Hairless red raised skin mass' },
    ],
  },
  {
    disease: 'Subcutaneous Abscess / Hematoma / Seroma / Cyst',
    category: 'Skin / Dermatological',
    weights: {
      swelling: 0.65,
      mass_growth: 0.38,
      erythema: 0.24,
      ulceration: 0.22,
      alopecia: 0.14,
    },
    synergy: [
      { req: ['swelling', 'erythema'], bonus: 0.18, note: 'Localized warm erythematous soft-tissue swelling/abscess' },
      { req: ['swelling', 'ulceration'], bonus: 0.18, note: 'Ruptured or draining cutaneous abscess' },
    ],
  },
  {
    disease: 'Traumatic Cutaneous Wound / Ulcerative Dermatosis',
    category: 'Skin / Dermatological',
    weights: {
      ulceration: 0.62,
      excoriation: 0.34,
      erythema: 0.25,
      swelling: 0.20,
      crust_scale: 0.15,
    },
    synergy: [
      { req: ['ulceration', 'excoriation'], bonus: 0.18, note: 'Full-thickness open skin wound with surrounding abrasions' },
      { req: ['ulceration', 'erythema'], bonus: 0.16, note: 'Raw exposed ulcerated tissue' },
    ],
  },

  // ------------------- OCULAR / OPHTHALMIC CONDITIONS (8) -------------------
  {
    disease: 'Cataract / Nuclear Sclerosis (Lens Opacity)',
    category: 'Ocular / Ophthalmic',
    weights: {
      lens_opacity: 0.86,
      corneal_opacity: 0.14,
      conjunctival_redness: 0.10,
    },
    synergy: [],
  },
  {
    disease: 'Ulcerative Keratitis / Corneal Ulcer',
    category: 'Ocular / Ophthalmic',
    weights: {
      corneal_opacity: 0.58,
      conjunctival_redness: 0.36,
      ocular_discharge: 0.32,
      eyelid_swelling: 0.24,
    },
    synergy: [
      { req: ['corneal_opacity', 'conjunctival_redness'], bonus: 0.22, note: 'Cloudy corneal defect with intense conjunctival redness' },
      { req: ['corneal_opacity', 'ocular_discharge'], bonus: 0.18, note: 'Corneal opacity accompanied by ocular discharge' },
    ],
  },
  {
    disease: 'Non-Ulcerative Keratitis / Corneal Edema / Dystrophy',
    category: 'Ocular / Ophthalmic',
    weights: {
      corneal_opacity: 0.76,
      conjunctival_redness: 0.18,
      ocular_discharge: 0.14,
    },
    synergy: [],
  },
  {
    disease: "Infectious / Allergic Conjunctivitis ('Pink Eye')",
    category: 'Ocular / Ophthalmic',
    weights: {
      conjunctival_redness: 0.64,
      ocular_discharge: 0.46,
      eyelid_swelling: 0.34,
    },
    synergy: [
      { req: ['conjunctival_redness', 'ocular_discharge'], bonus: 0.22, note: 'Hyperemic red conjunctiva with active eye discharge' },
      { req: ['conjunctival_redness', 'eyelid_swelling'], bonus: 0.16, note: 'Red conjunctiva with eyelid swelling' },
    ],
  },
  {
    disease: 'Keratoconjunctivitis Sicca (KCS / Dry Eye Syndrome)',
    category: 'Ocular / Ophthalmic',
    weights: {
      ocular_discharge: 0.52,
      conjunctival_redness: 0.44,
      corneal_opacity: 0.38,
      eyelid_swelling: 0.20,
    },
    synergy: [
      { req: ['ocular_discharge', 'corneal_opacity', 'conjunctival_redness'], bonus: 0.24, note: 'Classic KCS triad: thick discharge + cloudy cornea + red conjunctiva' },
      { req: ['ocular_discharge', 'corneal_opacity'], bonus: 0.16, note: 'Sticky ocular discharge with corneal cloudiness' },
    ],
  },
  {
    disease: 'Anterior Uveitis / Secondary Glaucoma',
    category: 'Ocular / Ophthalmic',
    weights: {
      conjunctival_redness: 0.50,
      corneal_opacity: 0.46,
      lens_opacity: 0.28,
      eyelid_swelling: 0.22,
      ocular_discharge: 0.18,
    },
    synergy: [
      { req: ['conjunctival_redness', 'corneal_opacity'], bonus: 0.18, note: 'Deep conjunctival redness with diffuse corneal edema' },
    ],
  },
  {
    disease: 'Meibomian Gland Adenoma / Eyelid Neoplasia / Chalazion',
    category: 'Ocular / Ophthalmic',
    weights: {
      eyelid_mass: 0.80,
      eyelid_swelling: 0.30,
      conjunctival_redness: 0.22,
      ocular_discharge: 0.20,
    },
    synergy: [
      { req: ['eyelid_mass', 'conjunctival_redness'], bonus: 0.16, note: 'Eyelid margin mass irritating the conjunctiva' },
    ],
  },
  {
    disease: 'Blepharitis / Cherry Eye (Third Eyelid Prolapse) / Hordeolum',
    category: 'Ocular / Ophthalmic',
    weights: {
      eyelid_swelling: 0.65,
      eyelid_mass: 0.40,
      conjunctival_redness: 0.34,
      ocular_discharge: 0.28,
      erythema: 0.20,
      alopecia: 0.18,
    },
    synergy: [
      { req: ['eyelid_swelling', 'conjunctival_redness'], bonus: 0.18, note: 'Swollen inflamed eyelid margin with conjunctival redness' },
      { req: ['eyelid_swelling', 'ocular_discharge'], bonus: 0.15, note: 'Eyelid inflammation with ocular discharge' },
    ],
  },

  // ------------------- ORAL / MUCOSAL CONDITIONS (4) -------------------
  {
    disease: 'Gingivostomatitis / Periodontal Disease',
    category: 'Oral',
    weights: {
      oral_lesion: 0.78,
      erythema: 0.25,
      ulceration: 0.25,
      swelling: 0.20,
    },
    synergy: [
      { req: ['oral_lesion', 'erythema'], bonus: 0.15, note: 'Inflamed red gingival/oral mucosa' },
      { req: ['oral_lesion', 'ulceration'], bonus: 0.16, note: 'Ulcerative stomatitis lesion' },
    ],
  },
  {
    disease: 'Eosinophilic Granuloma Complex / Rodent Ulcer',
    category: 'Oral',
    weights: {
      oral_lesion: 0.68,
      ulceration: 0.40,
      swelling: 0.32,
      erythema: 0.22,
    },
    synergy: [
      { req: ['oral_lesion', 'ulceration'], bonus: 0.18, note: 'Well-demarcated lip/oral ulceration' },
      { req: ['oral_lesion', 'swelling'], bonus: 0.16, note: 'Swollen upper lip / eosinophilic granuloma plaque' },
    ],
  },
  {
    disease: 'Oral Neoplasia / Epulis / Oral Papillomatosis',
    category: 'Oral',
    weights: {
      oral_lesion: 0.65,
      mass_growth: 0.55,
      swelling: 0.35,
      ulceration: 0.20,
    },
    synergy: [
      { req: ['oral_lesion', 'mass_growth'], bonus: 0.22, note: 'Proliferative mass/growth on gingiva or oral cavity' },
    ],
  },
  {
    disease: 'Viral Oral Ulceration (Feline Calicivirus / Herpesvirus)',
    category: 'Oral',
    weights: {
      oral_lesion: 0.70,
      ulceration: 0.35,
      ocular_discharge: 0.30,
      conjunctival_redness: 0.25,
    },
    synergy: [
      { req: ['oral_lesion', 'ocular_discharge'], bonus: 0.20, note: 'Oral/tongue ulceration combined with ocular discharge' },
    ],
  },
];

// ── 3. Client-Side Severity & Disease Classifier Functions ──────────────────
export function evaluateClinicalSeverity(detections = []) {
  if (!detections || detections.length === 0) {
    return {
      level: 'None',
      urgencyLevel: 'Safe',
      score: 0.0,
      color: '#059669',
      reasons: ['No clinical symptom boxes detected above threshold.'],
    };
  }

  const uniqueClasses = new Set();
  let maxIntrinsic = 0.0;
  let weightedSum = 0.0;
  let totalArea = 0.0;

  detections.forEach((d) => {
    const cname = d.class_name || d.className;
    const conf = Number(d.conf ?? (d.confidence ? d.confidence / 100 : 0.5));
    const w = Number(d.w ?? 0.15);
    const h = Number(d.h ?? 0.15);
    const area = w * h;
    totalArea += area;
    uniqueClasses.add(cname);

    const sw = SYMPTOM_SEVERITY_WEIGHTS[cname] ?? 0.5;
    if (sw > maxIntrinsic) maxIntrinsic = sw;
    const boxImpact = sw * (0.65 + 0.35 * conf) * (1.0 + Math.min(0.6, area * 1.4));
    weightedSum += boxImpact;
  });

  const coOccurrenceBonus = Math.max(0, uniqueClasses.size - 1) * 11.0;
  const multiBoxBonus = Math.min(18.0, Math.max(0, detections.length - 1) * 5.5);
  const areaBonus = Math.min(22.0, totalArea * 28.0);

  const rawIndex = maxIntrinsic * 46.0 + weightedSum * 14.0 + coOccurrenceBonus + multiBoxBonus + areaBonus;
  const score = Math.round(Math.min(98.0, Math.max(8.0, rawIndex)) * 10) / 10;

  const reasons = [];
  if (maxIntrinsic >= 0.85) {
    const highSyms = [...uniqueClasses].filter((c) => (SYMPTOM_SEVERITY_WEIGHTS[c] || 0) >= 0.85);
    reasons.push(`High-severity tissue symptom present: ${highSyms.join(', ')}`);
  }
  if (uniqueClasses.size >= 2) {
    reasons.push(`${uniqueClasses.size} distinct co-occurring symptoms (${[...uniqueClasses].sort().join(', ')})`);
  }
  const areaPct = Math.round(Math.min(100.0, totalArea * 100) * 10) / 10;
  if (detections.length > 1) {
    reasons.push(`${detections.length} lesion regions detected (${areaPct}% cumulative box area)`);
  } else {
    reasons.push(`Single localized lesion (${areaPct}% image area)`);
  }

  let level = 'Mild';
  let urgencyLevel = 'Mild';
  let color = '#0284C7';
  if (score >= 68.0) {
    level = 'Severe';
    urgencyLevel = 'Urgent';
    color = '#DC2626';
  } else if (score >= 40.0) {
    level = 'Moderate';
    urgencyLevel = 'Moderate';
    color = '#D97706';
  }

  return { level, urgencyLevel, score, color, reasons };
}

export function predictClinicalDiseases(detections = [], topK = 5) {
  if (!detections || detections.length === 0) return [];

  const symptomMaxConf = {};
  const symptomCounts = {};

  detections.forEach((d) => {
    const cname = d.class_name || d.className;
    const conf = Number(d.conf ?? (d.confidence ? d.confidence / 100 : 0.5));
    symptomCounts[cname] = (symptomCounts[cname] || 0) + 1;
    if (conf > (symptomMaxConf[cname] || 0)) {
      symptomMaxConf[cname] = conf;
    }
  });

  const presentSet = new Set(Object.keys(symptomMaxConf));
  const ranked = [];

  DISEASE_PROFILES.forEach((prof) => {
    let rawScore = 0.0;
    const matchedSymptoms = [];
    const clinicalNotes = [];

    Object.entries(prof.weights).forEach(([sym, weight]) => {
      if (symptomMaxConf[sym] !== undefined) {
        const c = symptomMaxConf[sym];
        const cnt = symptomCounts[sym] || 1;
        const multiMult = 1.0 + Math.min(0.25, (cnt - 1) * 0.08);
        rawScore += weight * Math.pow(c, 0.72) * multiMult;
        const cntStr = cnt > 1 ? ` ×${cnt}` : '';
        matchedSymptoms.push(`${sym}${cntStr} (${Math.round(c * 100)}%)`);
      }
    });

    if (matchedSymptoms.length === 0) return;

    (prof.synergy || []).forEach((rule) => {
      if (rule.req.every((r) => presentSet.has(r))) {
        rawScore += rule.bonus;
        clinicalNotes.push(rule.note);
      }
    });

    const confidence = Math.round(Math.min(97.5, rawScore * 100) * 10) / 10;
    if (confidence >= 15.0) {
      ranked.push({
        disease: prof.disease,
        category: prof.category,
        confidence,
        matched_symptoms: matchedSymptoms,
        clinical_notes: clinicalNotes,
      });
    }
  });

  ranked.sort((a, b) => b.confidence - a.confidence);
  return ranked.slice(0, topK);
}

// ── 4. Local YOLOv11m Server Scanner Client ─────────────────────────────────
const AI_SERVER_ENDPOINTS = [
  process.env.EXPO_PUBLIC_AI_SERVER_URL,
  'http://10.0.2.2:8000',      // Android Emulator -> Host PC
  'http://localhost:8000',     // Web / ADB reverse / iOS Simulator
  'http://127.0.0.1:8000',
  'http://192.168.1.34:8000',  // Local Wi-Fi LAN fallback
].filter(Boolean);

export async function runLocalYoloScan(base64Image, mimeType = 'image/jpeg', registeredPets = []) {
  const firstPet = registeredPets && registeredPets.length > 0 ? registeredPets[0] : null;

  for (const endpoint of AI_SERVER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      // 1. Try PawsCura ai_server.py (/predict/base64)
      const res = await fetch(`${endpoint}/predict/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          confidence: 0.20,
          petName: firstPet ? firstPet.name : null,
          petSpecies: firstPet ? firstPet.species : null,
          registeredPets,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          matchedPetId: data.matchedPetId || (firstPet ? firstPet.id : null),
          matchedPetName: data.matchedPetName || (firstPet ? firstPet.name : null),
          matchConfidence: data.matchConfidence || (firstPet ? 94 : 0),
        };
      }
    } catch (e) {
      // Try next endpoint
    }
  }

  return null;
}
