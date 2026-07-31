import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// The System Prompt forces the AI to act as a vet and return a strict JSON format
const VET_PROMPT = `
You are a highly experienced Veterinary Dermatologist and General Practitioner. 
The user is presenting an image of their pet's skin condition, wound, or physical abnormality.
Analyze the image carefully.

Respond ONLY with a valid JSON object using the following exact keys:
{
  "suspectedCondition": "A brief name of the primary suspected condition (e.g., 'Flea Allergy Dermatitis', 'Superficial Laceration')",
  "confidence": A number representing your confidence percentage in this primary suspected condition (e.g., 85),
  "alternatives": [
    {
      "condition": "A brief name of an alternative suspected condition",
      "confidence": A number representing the alternative's confidence percentage
    }
  ],
  "urgencyLevel": "Exactly one of these three strings: 'No Concerns Detected', 'Needs Evaluation', or 'Immediate Care'",
  "analysis": "A 2-3 sentence description of what you observe in the image.",
  "recommendedAction": "A 1-2 sentence recommendation for the owner (e.g., 'Clean with mild soap', 'Visit a vet within 24 hours')."
}
Ensure the sum of the primary confidence and alternative confidences does not exceed 100%. Do NOT wrap the response in markdown code blocks (\`\`\`json). Return raw JSON only.
`;

export async function chatWithVet(messageHistory) {
  if (!genAI) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("I am operating in offline mock mode because no API key is available! Please connect to the internet or provide a valid key.");
      }, 1500);
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const formattedHistory = messageHistory.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const lastMessage = messageHistory[messageHistory.length - 1].text;

    const chatSession = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: "You are a friendly, highly experienced Virtual Veterinary Assistant. Provide concise, helpful advice about pet health, behavior, and care. Always clarify you are an AI and not a substitute for a real vet." }]
        },
        {
          role: 'model',
          parts: [{ text: "Understood. I am a Virtual Veterinary Assistant." }]
        },
        ...formattedHistory
      ],
    });

    const result = await chatSession.sendMessage(lastMessage);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}

/**
 * Analyzes a base64 encoded image using Gemini Flash and matches against registered pets
 * @param {string} base64Image - The scan image encoded as base64
 * @param {string} mimeType - The mime type (e.g., 'image/jpeg')
 * @param {Array} registeredPets - List of registered pets for auto-identification
 */
export async function analyzePetCondition(base64Image, mimeType, registeredPets = []) {
  const petsSummary = registeredPets.length > 0
    ? registeredPets.map((p, idx) => `[Pet #${idx + 1}] ID: "${p.id}", Name: "${p.name}", Species: "${p.species}", Breed: "${p.breed || 'Unknown'}"`).join('\n')
    : 'No registered pets provided.';

  // FALLBACK: If no API key is provided, simulate a realistic AI response with pet matching
  if (!genAI) {
    console.log("No Gemini API Key found. Returning mock AI analysis with pet matching.");
    const matchedPet = registeredPets.length > 0 ? registeredPets[0] : null;
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          matchedPetId: matchedPet ? matchedPet.id : null,
          matchedPetName: matchedPet ? matchedPet.name : null,
          matchConfidence: matchedPet ? 92 : 0,
          suspectedCondition: "Mild Hot Spot (Acute Moist Dermatitis)",
          confidence: 75,
          alternatives: [
            { condition: "Allergic Dermatitis", confidence: 15 },
            { condition: "Flea Bite Hypersensitivity", confidence: 10 }
          ],
          urgencyLevel: "Needs Evaluation",
          analysis: matchedPet 
            ? `I observe a localized area of redness and fur loss on ${matchedPet.name}. The image features closely match ${matchedPet.name}'s profile.`
            : "I observe a localized area of redness, inflammation, and possible fur loss. It appears irritated and may be itchy or painful for the pet.",
          recommendedAction: "Prevent the pet from scratching or licking the area. Clean gently with a pet-safe antiseptic and consider a veterinary visit if it worsens or doesn't improve in 24 hours."
        });
      }, 1800);
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    // Construct image payload with scan photo + pet reference photos if available
    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ];

    // Add reference photos from registered pets if base64 is present
    registeredPets.forEach((pet) => {
      if (Array.isArray(pet.referencePhotos)) {
        pet.referencePhotos.forEach((photo) => {
          if (photo && photo.base64) {
            imageParts.push({
              inlineData: {
                data: photo.base64,
                mimeType: photo.mimeType || 'image/jpeg'
              }
            });
          }
        });
      }
    });

    const result = await model.generateContent([DYNAMIC_PROMPT, ...imageParts]);
    const responseText = result.response.text();

    try {
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      throw new Error("The AI returned an invalid response format.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
