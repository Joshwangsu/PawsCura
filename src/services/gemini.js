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
  "suspectedCondition": "A brief name of the suspected condition (e.g., 'Flea Allergy Dermatitis', 'Superficial Laceration')",
  "urgencyLevel": "Exactly one of these three strings: 'No Concerns Detected', 'Needs Evaluation', or 'Immediate Care'",
  "analysis": "A 2-3 sentence description of what you observe in the image.",
  "recommendedAction": "A 1-2 sentence recommendation for the owner (e.g., 'Clean with mild soap', 'Visit a vet within 24 hours')."
}
Do NOT wrap the response in markdown code blocks (\`\`\`json). Return raw JSON only.
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
 * Analyzes a base64 encoded image using Gemini 1.5 Flash
 * @param {string} base64Image - The image encoded as a base64 string
 * @param {string} mimeType - The mime type (e.g., 'image/jpeg')
 */
export async function analyzePetCondition(base64Image, mimeType) {
  // FALLBACK: If no API key is provided, simulate a realistic AI response
  if (!genAI) {
    console.log("No Gemini API Key found. Returning mock AI analysis.");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          suspectedCondition: "Mild Hot Spot (Acute Moist Dermatitis)",
          urgencyLevel: "Needs Evaluation",
          analysis: "I observe a localized area of redness, inflammation, and possible fur loss. It appears irritated and may be itchy or painful for the pet.",
          recommendedAction: "Prevent the pet from scratching or licking the area. Clean gently with a pet-safe antiseptic and consider a veterinary visit if it worsens or doesn't improve in 24 hours."
        });
      }, 2000); // Simulate AI thinking delay
    });
  }

  try {
    // Select the fast, multimodal model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format the image for the Gemini SDK
    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ];

    // Generate content using the strict prompt and the image
    const result = await model.generateContent([VET_PROMPT, ...imageParts]);
    const responseText = result.response.text();

    // Parse the JSON response
    try {
      // Clean up the response in case the model added markdown despite instructions
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
