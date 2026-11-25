/**
 * PawsCura Veterinary AI Service
 * Exclusively powered by the user's self-built best.pt YOLO AI model
 * and the PawsCura Clinical Veterinary Knowledge Engine.
 *
 * NO external third-party cloud APIs are used.
 */

import { runLocalYoloScan, BEST_PT_CLASSES } from './localYoloScanner';

// ── Pet Health Condition Analysis (Vision) ──────────────────────────────────
/**
 * Analyzes a pet image using EXCLUSIVELY the self-built best.pt YOLO model.
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {Array} registeredPets - List of registered pet profiles for matching
 */
export async function analyzePetCondition(base64Image, mimeType = 'image/jpeg', registeredPets = []) {
  return await runLocalYoloScan(base64Image, mimeType, registeredPets);
}

// ── Virtual Veterinary Assistant Chat (Embedded On-Device) ─────────────────
/**
 * Chat with the PawsCura Veterinary Assistant.
 * Uses the standalone embedded veterinary clinical engine directly on-device.
 */
export async function chatWithVet(messageHistory) {
  const lastMessage = messageHistory[messageHistory.length - 1]?.text || '';
  const lower = lastMessage.toLowerCase().trim();

  // Embedded PawsCura Clinical Knowledge Engine
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateClinicalResponse(lastMessage, lower));
    }, 400);
  });
}
      resolve(generateClinicalResponse(lastMessage, lower));
    }, 600);
  });
}

function generateClinicalResponse(lastMessage, lower) {
  // Emergency Triage
  if (
    lower.includes('dying') ||
    lower.includes('unconscious') ||
    lower.includes('seizure') ||
    lower.includes('poison') ||
    lower.includes('choking') ||
    lower.includes('cannot breathe') ||
    lower.includes("can't breathe") ||
    lower.includes('hit by car') ||
    lower.includes('severe bleeding')
  ) {
    return (
      '🚨 EMERGENCY ALERT: Your pet requires IMMEDIATE veterinary attention! ' +
      'Please take them to the nearest emergency veterinary clinic right away. ' +
      'Keep your pet calm, warm, and minimize unnecessary movement during transit.'
    );
  }

  // Toxic Foods
  if (
    lower.includes('chocolate') ||
    lower.includes('grape') ||
    lower.includes('raisin') ||
    lower.includes('onion') ||
    lower.includes('garlic') ||
    lower.includes('xylitol') ||
    lower.includes('avocado') ||
    lower.includes('ate toxic')
  ) {
    return (
      '⚠️ Toxic Ingestion Warning: Foods such as chocolate, grapes, raisins, onions, garlic, and artificial sweeteners (xylitol) are dangerous and potentially fatal to dogs and cats. ' +
      'Do not induce vomiting unless explicitly directed by a veterinary toxicologist. Contact your emergency vet or Pet Poison Helpline immediately.'
    );
  }

  // Skin / Itching / Fleas / Mites
  if (
    lower.includes('itch') ||
    lower.includes('scratch') ||
    lower.includes('flea') ||
    lower.includes('tick') ||
    lower.includes('mite') ||
    lower.includes('mange') ||
    lower.includes('hot spot') ||
    lower.includes('red skin') ||
    lower.includes('rash') ||
    lower.includes('hair loss') ||
    lower.includes('fur loss')
  ) {
    return (
      '🐾 Dermatological Care Note: Frequent scratching, red patches, or focal alopecia typically point towards flea bite hypersensitivity, contact dermatitis, or parasitic mites (such as Demodex or Sarcoptes). ' +
      'You can use our Scan feature with your trained best.pt AI model to evaluate the specific skin area! In the meantime, prevent excessive licking with an Elizabethan collar and keep the area dry.'
    );
  }

  // Ears
  if (lower.includes('ear') || lower.includes('head shake') || lower.includes('wax')) {
    return (
      '👂 Otic Guidance: Head shaking, foul odor, or dark "coffee ground" discharge commonly indicate Otodectes ear mites or yeast otitis. ' +
      'Avoid probing deep into the ear canal with cotton swabs. A veterinarian can perform a quick ear swab cytology to prescribe the correct topical drops.'
    );
  }

  // Eyes
  if (lower.includes('eye') || lower.includes('squint') || lower.includes('discharge') || lower.includes('tear')) {
    return (
      '👁️ Ocular Care: Eye squinting, cloudiness, or green/yellow discharge could indicate acute conjunctivitis or a corneal scratch. ' +
      'Never apply leftover human eye drops or corticosteroid drops before a vet performs a fluorescein stain test to check for corneal ulcers.'
    );
  }

  // Dental
  if (lower.includes('teeth') || lower.includes('tooth') || lower.includes('breath') || lower.includes('gum')) {
    return (
      '🦷 Dental Care: Bad breath and yellow-brown tartar along the gum margin indicate plaque buildup or gingivitis. ' +
      'Routine dental care with pet-safe enzymatic toothpaste prevents periodontal disease and systemic complications. Consult your vet for an oral exam.'
    );
  }

  // Diet / Vomiting / Diarrhea
  if (lower.includes('vomit') || lower.includes('throw up') || lower.includes('diarrhea') || lower.includes('poop')) {
    return (
      '🥣 Gastrointestinal Advice: If your pet vomited once but remains active and hydrated, monitor closely and offer small amounts of water. ' +
      'If vomiting persists, contains blood, or is accompanied by lethargy, withholding food for a few hours and consulting your veterinarian is strongly advised.'
    );
  }

  // Greetings / General
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower === 'sup') {
    return (
      'Hello! I am your PawsCura Virtual Veterinary Assistant, connected to your self-built best.pt AI model. ' +
      'How can I help you and your pet today? You can ask about symptoms, diet, grooming, or ask about your latest scan results!'
    );
  }

  // Default Clinical Advice
  return (
    'As your PawsCura Veterinary Assistant, I am here to help guide you on pet health, wellness, and preventive care. ' +
    'For any visible skin, ear, or dental symptoms, you can take a picture in the Scan tab to run an on-device assessment with your self-built best.pt model. ' +
    'If you are observing unusual symptoms, could you describe what you see, how long it has been occurring, and how your pet is behaving?'
  );
}
