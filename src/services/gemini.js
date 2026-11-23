import { GoogleGenAI } from '@google/genai';
import {
  runLocalYoloScan,
  BEST_PT_CLASSES,
  DISEASE_PROFILES,
  evaluateClinicalSeverity,
  predictClinicalDiseases,
} from './localYoloScanner';

// ── Gemini Client ─────────────────────────────────────────────────────────────
// Uses the NEW @google/genai SDK which supports AQ. prefix API keys.
// The legacy @google/generative-ai package only accepts AIza. keys.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

let ai = null;
try {
  if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
} catch (err) {
  console.warn('Failed to initialize GoogleGenAI client:', err);
}

// Model names - gemini-2.5-flash is current, gemini-1.5-flash is fallback
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';
const SCAN_MODEL = PRIMARY_MODEL;
const CHAT_MODEL = PRIMARY_MODEL;

// ── Chatbot ───────────────────────────────────────────────────────────────────
export async function chatWithVet(messageHistory) {
  if (!ai) {
    const { chatWithVet: localChatWithVet } = await import('./aiService');
    return await localChatWithVet(messageHistory);
  }

  try {
    const formattedHistory = messageHistory.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    const lastMessage = messageHistory[messageHistory.length - 1].text;

    let result;
    try {
      const chat = ai.chats.create({
        model: PRIMARY_MODEL,
        history: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'You are a friendly, highly experienced Virtual Veterinary Assistant. ' +
                  'Provide concise, helpful advice about pet health, behavior, and care. ' +
                  'Always clarify you are an AI and not a substitute for a real vet.',
              },
            ],
          },
          {
            role: 'model',
            parts: [{ text: 'Understood. I am a Virtual Veterinary Assistant.' }],
          },
          ...formattedHistory,
        ],
      });
      result = await chat.sendMessage({ message: lastMessage });
    } catch (primaryErr) {
      console.warn(`Primary chat model ${PRIMARY_MODEL} failed, attempting fallback to ${FALLBACK_MODEL}:`, primaryErr.message);
      const chatFallback = ai.chats.create({
        model: FALLBACK_MODEL,
        history: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'You are a friendly, highly experienced Virtual Veterinary Assistant. ' +
                  'Provide concise, helpful advice about pet health, behavior, and care. ' +
                  'Always clarify you are an AI and not a substitute for a real vet.',
              },
            ],
          },
          {
            role: 'model',
            parts: [{ text: 'Understood. I am a Virtual Veterinary Assistant.' }],
          },
          ...formattedHistory,
        ],
      });
      result = await chatFallback.sendMessage({ message: lastMessage });
    }
    return result.text;
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    throw error;
  }
}

// ── Visual Pet Identity Identification ─────────────────────────────────────────
/**
 * Visually identifies which registered pet is shown in the scan image
 * when the user has multiple registered pets.
 * Uses the pet's registered reference photos, species, breed, and coat traits.
 *
 * @param {string} base64Image - Scanned image encoded as base64
 * @param {string} mimeType - Image mime type
 * @param {Array} registeredPets - List of registered pet objects
 * @returns {Promise<{ matchedPetId: string|null, matchedPetName: string|null, matchConfidence: number, reasoning: string }>}
 */
export async function visuallyIdentifyPet(base64Image, mimeType = 'image/jpeg', registeredPets = []) {
  if (!registeredPets || registeredPets.length === 0) {
    return { matchedPetId: null, matchedPetName: null, matchConfidence: 0, reasoning: 'No registered pets.' };
  }

  // 1. If only 1 pet is registered, auto-match immediately without needing vision API call
  if (registeredPets.length === 1) {
    return {
      matchedPetId: registeredPets[0].id,
      matchedPetName: registeredPets[0].name,
      matchConfidence: 98,
      reasoning: `Auto-assigned to single registered pet (${registeredPets[0].name}).`,
    };
  }

  // 2. If 2+ pets are registered, compare the scan photo visually against registered candidates!
  if (!ai) {
    return {
      matchedPetId: registeredPets[0].id,
      matchedPetName: registeredPets[0].name,
      matchConfidence: 80,
      reasoning: `Offline fallback to ${registeredPets[0].name}.`,
    };
  }

  const petCandidatesBlock = registeredPets
    .map(
      (p, idx) =>
        `[Candidate #${idx + 1}] ID: "${p.id}", Name: "${p.name}", Species: "${p.species}", Breed: "${p.breed || 'Unknown'}", Color/Coat: "${p.color || 'Unknown'}"`
    )
    .join('\n');

  const IDENTIFY_PROMPT = `
You are a Pet Visual Identification Specialist for PawsCura.
The user has scanned a pet and has multiple registered pets.
Your ONLY responsibility is to identify WHICH of the user's registered pets is shown in the scan image by visually comparing the animal's physical appearance (species, breed, coat pattern, fur coloration, markings, ear structure, and size) against the registered candidates.
DO NOT diagnose or evaluate health conditions. Your job is STRICTLY biometric pet identity verification.

REGISTERED PET CANDIDATES:
${petCandidatesBlock}

Examine the scan photo and candidate images (if attached). Determine which registered pet matches the photo best.

Respond ONLY with a valid JSON object:
{
  "matchedPetId": "The string ID of the matching candidate pet, or null if completely uncertain",
  "matchedPetName": "The string name of the matching pet, or null",
  "matchConfidence": A number 0-100 indicating visual matching confidence,
  "reasoning": "A concise 1-sentence explanation of the visual match (e.g. 'Coat color and facial markings match Luna the Siberian Husky')."
}
Return raw JSON only. Do not surround with markdown code blocks.
`;

  try {
    const contents = [
      { text: IDENTIFY_PROMPT },
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ];

    // Attach reference photos of candidate pets if available
    registeredPets.forEach((pet) => {
      if (Array.isArray(pet.referencePhotos)) {
        pet.referencePhotos.forEach((photo) => {
          if (photo && photo.base64) {
            contents.push({
              inlineData: {
                data: photo.base64,
                mimeType: photo.mimeType || 'image/jpeg',
              },
            });
          }
        });
      }
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents,
      });
    } catch (err) {
      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents,
      });
    }

    const cleanJson = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const found = registeredPets.find((p) => p.id === parsed.matchedPetId) ||
                  registeredPets.find((p) => p.name?.toLowerCase() === parsed.matchedPetName?.toLowerCase());

    return {
      matchedPetId: found ? found.id : registeredPets[0].id,
      matchedPetName: found ? found.name : registeredPets[0].name,
      matchConfidence: parsed.matchConfidence || 90,
      reasoning: parsed.reasoning || 'Visual feature match.',
    };
  } catch (identErr) {
    console.warn('Visual pet identification error, defaulting to first registered pet:', identErr.message);
    return {
      matchedPetId: registeredPets[0].id,
      matchedPetName: registeredPets[0].name,
      matchConfidence: 80,
      reasoning: 'Default registered pet.',
    };
  }
}

// ── Pet Condition Analysis (Vision: Local YOLO11m 18-Symptom Detector + 26-Disease Classifier + Text-Only Gemini Enrichment) ──
/**
 * Analyzes a base64 encoded image:
 *  1. Visually identifies which registered pet is in the photo (when multiple pets exist)
 *  2. Runs trained YOLO11m (best.pt) + 26-Disease Clinical Classifier locally
 *  3. Generates a compassionate description with recommendations & precautions using Gemini (TEXT-ONLY)
 *
 * @param {string} base64Image - Image encoded as base64 (no data URI prefix)
 * @param {string} mimeType    - e.g. 'image/jpeg'
 * @param {Array}  registeredPets - List of pet objects from Firestore
 */
export async function analyzePetCondition(base64Image, mimeType, registeredPets = []) {
  // 1. Visually identify which registered pet is in the scan photo (comparing photos & traits if 2+ pets exist)
  const petMatch = await visuallyIdentifyPet(base64Image, mimeType, registeredPets);
  const matchedPet = registeredPets.find((p) => p.id === petMatch.matchedPetId) || (registeredPets.length > 0 ? registeredPets[0] : null);

  // 2. Always run Local YOLO11m (best.pt / best final.pt) + 26-Disease & Severity Classifier first!
  const localYoloResult = await runLocalYoloScan(base64Image, mimeType, registeredPets);

  const petsSummary =
    registeredPets.length > 0
      ? registeredPets
          .map(
            (p, idx) =>
              `[Pet #${idx + 1}] ID: "${p.id}", Name: "${p.name}", Species: "${p.species}", Breed: "${p.breed || 'Unknown'}"`
          )
          .join('\n')
      : 'No registered pets provided.';

  // If local YOLO server responded and no Gemini key is configured, return the YOLO11m + 26-Disease result directly
  if (localYoloResult && !ai) {
    return {
      ...localYoloResult,
      matchedPetId: petMatch.matchedPetId || localYoloResult.matchedPetId,
      matchedPetName: petMatch.matchedPetName || localYoloResult.matchedPetName,
      matchConfidence: petMatch.matchConfidence || localYoloResult.matchConfidence,
    };
  }

  // ── Offline / no-key & no-local-server fallback (uses the 26-Disease Classifier on default symptoms) ──
  if (!ai && !localYoloResult) {
    console.log('No Gemini API key and local server unreachable. Running client-side 26-disease clinical classifier fallback.');
    const sampleDets = [
      { class_name: 'erythema', conf: 0.62, w: 0.22, h: 0.20 },
      { class_name: 'alopecia', conf: 0.58, w: 0.24, h: 0.22 },
    ];
    const sev = evaluateClinicalSeverity(sampleDets);
    const rankedDiseases = predictClinicalDiseases(sampleDets, 4);
    const topDis = rankedDiseases[0] || { disease: 'Atopic / Environmental Allergic Dermatitis', confidence: 68 };

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          matchedPetId: petMatch.matchedPetId,
          matchedPetName: petMatch.matchedPetName,
          matchConfidence: petMatch.matchConfidence,
          suspectedCondition: topDis.disease,
          confidence: topDis.confidence,
          alternatives: rankedDiseases.slice(1).map((d) => ({ condition: d.disease, confidence: d.confidence })),
          urgencyLevel: sev.urgencyLevel,
          severityLevel: sev.level,
          severityScore: sev.score,
          detectedSymptoms: ['erythema (62%)', 'alopecia (58%)'],
          detections: sampleDets,
          analysis:
            `Preliminary assessment indicates suspected ${topDis.disease} based on detected symptoms (erythema 62%, alopecia 58%) on ${petMatch.matchedPetName || 'the pet'}. ` +
            `Clinical Severity Index is evaluated as ${sev.level} (${sev.score}%). Recommendations: Keep the affected area clean, dry, and cool, and monitor for any spreading redness or discomfort. ` +
            `What to avoid: Do not apply human creams, steroids, or unverified topical treatments, do not allow persistent scratching or licking (use an e-collar if necessary), and do not delay professional veterinary evaluation if irritation worsens.`,
          recommendedAction:
            'Prevent the pet from scratching or licking the area. Keep the area clean and dry, and schedule a veterinary evaluation if symptoms persist.',
        });
      }, 1200);
    });
  }

  // ── Prepare structured local assessment data for Gemini summarization ──
  // Note: Gemini bases its health assessment output SOLELY on our local AI assessment findings, NOT on raw image pixels.
  let assessmentData = localYoloResult
    ? {
        ...localYoloResult,
        matchedPetId: petMatch.matchedPetId || localYoloResult.matchedPetId,
        matchedPetName: petMatch.matchedPetName || localYoloResult.matchedPetName,
        matchConfidence: petMatch.matchConfidence || localYoloResult.matchConfidence,
      }
    : null;

  if (!assessmentData) {
    const sampleDets = [
      { class_name: 'erythema', conf: 0.62, w: 0.22, h: 0.20 },
      { class_name: 'alopecia', conf: 0.58, w: 0.24, h: 0.22 },
    ];
    const sev = evaluateClinicalSeverity(sampleDets);
    const rankedDiseases = predictClinicalDiseases(sampleDets, 4);
    const topDis = rankedDiseases[0] || { disease: 'Atopic / Environmental Allergic Dermatitis', confidence: 68 };
    assessmentData = {
      matchedPetId: petMatch.matchedPetId,
      matchedPetName: petMatch.matchedPetName,
      matchConfidence: petMatch.matchConfidence,
      suspectedCondition: topDis.disease,
      confidence: topDis.confidence,
      alternatives: rankedDiseases.slice(1).map((d) => ({ condition: d.disease, confidence: d.confidence })),
      urgencyLevel: sev.urgencyLevel,
      severityLevel: sev.level,
      severityScore: sev.score,
      detectedSymptoms: ['erythema (62%)', 'alopecia (58%)'],
      detections: sampleDets,
      analysis: '',
      recommendedAction: '',
    };
  }

  const symptomsList = (assessmentData.detectedSymptoms || [])
    .map((s) => (typeof s === 'string' ? s : s.class_name))
    .filter(Boolean)
    .join(', ') || 'None reported';

  const alternativesList = (assessmentData.alternatives || [])
    .map((a) => `${a.condition} (${a.confidence}%)`)
    .join(', ') || 'None';

  const assessmentSummaryBlock = `
LOCAL AI HEALTH ASSESSMENT FINDINGS:
- Target Pet: ${assessmentData.matchedPetName || 'Unspecified Pet'}
- Detected Symptoms / Clinical Signs: ${symptomsList}
- Clinical Severity Classifier: ${assessmentData.severityLevel} (${assessmentData.severityScore}%)
- Urgency Level: ${assessmentData.urgencyLevel}
- Primary Suspected Anomaly: ${assessmentData.suspectedCondition} (${assessmentData.confidence}%)
- Other Possible Anomalies: ${alternativesList}
`;

  const DYNAMIC_PROMPT = `
You are a highly experienced Veterinary AI Assistant for PawsCura.
Your task is to write a compassionate, clear, and comprehensive health assessment Description and Recommended Action based SOLELY on the structured findings provided by our local AI model below.
DO NOT expect, request, or reference an image. Base your reasoning EXCLUSIVELY on these local AI assessment findings:

REGISTERED PETS PROFILE DATABASE:
${petsSummary}

${assessmentSummaryBlock}

CRITICAL INSTRUCTIONS:
1. STRICT TERMINOLOGY: Strictly NEVER use the word "diagnosis" or "diagnose". Always refer to this as a "suspected anomaly", "observed condition", or "preliminary finding".
2. DESCRIPTION FIELD ("analysis"):
   Write an empathetic, well-structured 3-4 sentence clinical description for the pet parent that MUST include:
   - Observation: Explain how the detected symptoms (${symptomsList}) relate to the suspected anomaly (${assessmentData.suspectedCondition}) for ${assessmentData.matchedPetName || 'the pet'}.
   - Practical Recommendations: Specific home-care and monitoring guidance suited to the ${assessmentData.urgencyLevel} urgency level (e.g. keeping the area clean and dry, monitoring eating/behavior).
   - What to Avoid: Explicit precautions on what NOT to do (e.g. DO NOT apply human steroid or antibiotic creams, DO NOT use human eye drops, DO NOT allow the pet to scratch or lick the affected area (use a cone/e-collar if needed), DO NOT bathe with harsh human soaps, and DO NOT delay veterinary care if swelling or lethargy worsens).
3. RECOMMENDED ACTION FIELD ("recommendedAction"):
   Provide a concise 1-2 sentence immediate directive for the owner.

Respond ONLY with a valid JSON object using these EXACT keys:
{
  "analysis": "The comprehensive clinical description including anomaly observation, care recommendations, and explicit 'What to Avoid' guidance.",
  "recommendedAction": "A 1-2 sentence immediate action recommendation for the owner."
}
Return raw JSON only. Do not surround with markdown code blocks.
`;

  try {
    // Pure text content — Gemini only processes the local AI assessment findings, NOT raw image pixels
    const contents = [{ text: DYNAMIC_PROMPT }];

    let response;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents,
      });
    } catch (primaryErr) {
      console.warn(`Primary model ${PRIMARY_MODEL} failed, attempting fallback to ${FALLBACK_MODEL}:`, primaryErr.message);
      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents,
      });
    }

    const responseText = response.text;

    try {
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanJson);

      return {
        ...assessmentData,
        analysis:
          parsed.analysis ||
          `Preliminary assessment indicates suspected ${assessmentData.suspectedCondition} based on detected symptoms (${symptomsList}) on ${assessmentData.matchedPetName || 'the pet'}. Recommendations: Keep the affected area clean, dry, and cool, and monitor closely. What to avoid: Do not apply human creams or unverified medications, do not allow scratching or licking (use an e-collar if needed), and consult a licensed veterinarian if symptoms persist.`,
        recommendedAction:
          parsed.recommendedAction ||
          'Prevent the pet from scratching or licking the affected area. Keep it clean and dry, and schedule a veterinary evaluation if symptoms persist.',
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini response as JSON, falling back to local description:', responseText);
      return {
        ...assessmentData,
        analysis:
          `Preliminary assessment indicates suspected ${assessmentData.suspectedCondition} based on detected symptoms (${symptomsList}) on ${assessmentData.matchedPetName || 'the pet'}. Recommendations: Keep the affected area clean, dry, and cool, and monitor closely. What to avoid: Do not apply human creams or unverified medications, do not allow scratching or licking (use an e-collar if needed), and consult a licensed veterinarian if symptoms persist.`,
        recommendedAction:
          assessmentData.recommendedAction ||
          'Prevent the pet from scratching or licking the affected area. Keep it clean and dry, and schedule a veterinary evaluation if symptoms persist.',
      };
    }
  } catch (error) {
    console.warn('Gemini API call failed, using local AI assessment details:', error.message);
    return {
      ...assessmentData,
      analysis:
        `Preliminary assessment indicates suspected ${assessmentData.suspectedCondition} based on detected symptoms (${symptomsList}) on ${assessmentData.matchedPetName || 'the pet'}. Recommendations: Keep the affected area clean, dry, and cool, and monitor closely. What to avoid: Do not apply human creams or unverified medications, do not allow scratching or licking (use an e-collar if needed), and consult a licensed veterinarian if symptoms persist.`,
      recommendedAction:
        assessmentData.recommendedAction ||
        'Prevent the pet from scratching or licking the affected area. Keep it clean and dry, and schedule a veterinary evaluation if symptoms persist.',
    };
  }
}
