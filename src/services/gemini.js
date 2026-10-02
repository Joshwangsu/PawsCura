import { GoogleGenAI } from '@google/genai';

// ── Gemini Client ─────────────────────────────────────────────────────────────
// Uses the NEW @google/genai SDK which supports AQ. prefix API keys.
// The legacy @google/generative-ai package only accepts AIza. keys.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Model names - gemini-2.5-flash is current, gemini-1.5-flash is fallback
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';
const SCAN_MODEL = PRIMARY_MODEL;
const CHAT_MODEL = PRIMARY_MODEL;

// ── Chatbot ───────────────────────────────────────────────────────────────────
export async function chatWithVet(messageHistory) {
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          'I am operating in offline mock mode because no API key is available. ' +
          'Please provide a valid Gemini API key in your .env file.'
        );
      }, 1500);
    });
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

// ── Pet Condition Analysis (Vision) ──────────────────────────────────────────
/**
 * Analyzes a base64 encoded image using Gemini and matches against registered pets.
 * @param {string} base64Image - Image encoded as base64 (no data URI prefix)
 * @param {string} mimeType    - e.g. 'image/jpeg'
 * @param {Array}  registeredPets - List of pet objects from Firestore
 */
export async function analyzePetCondition(base64Image, mimeType, registeredPets = []) {
  const petsSummary =
    registeredPets.length > 0
      ? registeredPets
          .map(
            (p, idx) =>
              `[Pet #${idx + 1}] ID: "${p.id}", Name: "${p.name}", Species: "${p.species}", Breed: "${p.breed || 'Unknown'}"`
          )
          .join('\n')
      : 'No registered pets provided.';

  // ── Offline / no-key fallback ─────────────────────────────────────────────
  if (!ai) {
    console.log('No Gemini API key. Returning mock AI analysis.');
    const matchedPet = registeredPets.length > 0 ? registeredPets[0] : null;
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          matchedPetId: matchedPet ? matchedPet.id : null,
          matchedPetName: matchedPet ? matchedPet.name : null,
          matchConfidence: matchedPet ? 92 : 0,
          suspectedCondition: 'Mild Hot Spot (Acute Moist Dermatitis)',
          confidence: 75,
          alternatives: [
            { condition: 'Allergic Dermatitis', confidence: 15 },
            { condition: 'Flea Bite Hypersensitivity', confidence: 10 },
          ],
          urgencyLevel: 'Needs Evaluation',
          analysis: matchedPet
            ? `I observe a localized area of redness and fur loss on ${matchedPet.name}. The image features closely match ${matchedPet.name}'s profile.`
            : 'I observe a localized area of redness, inflammation, and possible fur loss. It appears irritated and may be itchy or painful for the pet.',
          recommendedAction:
            "Prevent the pet from scratching or licking the area. Clean gently with a pet-safe antiseptic and consider a veterinary visit if it worsens or doesn't improve in 24 hours.",
        });
      }, 1800);
    });
  }

  // ── Live Gemini vision call ───────────────────────────────────────────────
  const DYNAMIC_PROMPT = `
You are a highly experienced Veterinary AI Assistant.
The user is presenting an image of a pet for health assessment.

REGISTERED PETS PROFILE DATABASE:
${petsSummary}

INSTRUCTIONS:
1. Examine the image closely.
2. Compare the visual characteristics of the pet in the image against the REGISTERED PETS DATABASE.
3. Identify which registered pet matches the image (if any).
4. Perform a dermatological and health abnormality assessment.

Respond ONLY with a valid JSON object using these EXACT keys:
{
  "matchedPetId": "The string ID of the matched pet from database, or null if uncertain",
  "matchedPetName": "The string name of the matched pet, or null",
  "matchConfidence": A number 0-100 indicating your confidence in the pet identification match,
  "suspectedCondition": "A brief name of the primary suspected condition",
  "confidence": A number 0-100 for condition diagnostic confidence,
  "alternatives": [
    {
      "condition": "Alternative condition name",
      "confidence": A number 0-100
    }
  ],
  "urgencyLevel": "Exactly one of: 'No Concerns Detected', 'Needs Evaluation', or 'Immediate Care'",
  "analysis": "A 2-3 sentence description of visual observations and pet identification reasoning.",
  "recommendedAction": "A 1-2 sentence recommendation for the owner."
}
Return raw JSON only. Do not surround with markdown code blocks.
`;

  try {
    // Build content parts: prompt text + scan image + optional pet reference photos
    const contents = [
      { text: DYNAMIC_PROMPT },
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ];

    // Attach any stored reference photos for better pet matching
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
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      throw new Error('The AI returned an invalid response format. Please try again.');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
