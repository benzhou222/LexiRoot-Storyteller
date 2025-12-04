
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordData, GeneratedContent, AppSettings, LocalModel } from "../types";
import { playAudioData } from "./audioUtils";

// Default instance using the env key
const defaultAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to get the correct AI client instance.
 * Uses custom key if provided in settings, otherwise uses default env key.
 */
const getAiClient = (settings?: AppSettings) => {
  if (settings?.useCustomGemini && settings.geminiApiKey) {
    return new GoogleGenAI({ apiKey: settings.geminiApiKey });
  }
  return defaultAi;
};

// --- Local LLM Helpers ---

export const fetchLocalModels = async (baseUrl: string): Promise<LocalModel[]> => {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${cleanUrl}/models`);
    if (!response.ok) throw new Error("Failed to fetch models");
    const data = await response.json();
    // Support both standard OpenAI format { data: [] } and generic lists
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching local models:", error);
    throw error;
  }
};

const generateLocalText = async (
  baseUrl: string, 
  model: string, 
  prompt: string, 
  temperature: number = 0.7
): Promise<string> => {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  // Assume OpenAI compatible endpoint
  const response = await fetch(`${cleanUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

const cleanJsonBlock = (text: string): string => {
  // Remove markdown code blocks if present
  let clean = text.trim();
  if (clean.startsWith("```json")) clean = clean.replace("```json", "");
  if (clean.startsWith("```")) clean = clean.replace("```", "");
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  
  // Find the first '[' or '{' and last ']' or '}'
  const firstOpenArr = clean.indexOf("[");
  const firstOpenObj = clean.indexOf("{");
  const lastCloseArr = clean.lastIndexOf("]");
  const lastCloseObj = clean.lastIndexOf("}");

  // Determine if it's an array or object
  let start = -1;
  let end = -1;

  if (firstOpenArr !== -1 && (firstOpenObj === -1 || firstOpenArr < firstOpenObj)) {
      start = firstOpenArr;
  } else if (firstOpenObj !== -1) {
      start = firstOpenObj;
  }

  if (lastCloseArr !== -1 && (lastCloseObj === -1 || lastCloseArr > lastCloseObj)) {
      end = lastCloseArr;
  } else if (lastCloseObj !== -1) {
      end = lastCloseObj;
  }
  
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  
  return clean.trim();
};

// --- Main Service Functions ---

/**
 * Generates 3 complex words excluding the provided history list.
 */
export const generateWords = async (historyWords: string[], settings?: AppSettings): Promise<Omit<WordData, 'id'>[]> => {
  const historyString = historyWords.slice(0, 50).join(", "); // Limit history context
  
  const promptText = `
    Generate 3 distinct, complex, advanced English words (GRE/SAT/C1/C2 level) that are NOT in this list: [${historyString}].
    For each word, provide:
    1. The word itself (English).
    2. Its IPA phonetic transcription.
    3. A concise definition in Chinese (Simplified).
    4. A detailed breakdown of its etymological roots (prefix/root/suffix), where the root part is in English/Latin/Greek but its meaning is in Chinese (Simplified).
  `;

  // Branch: Local LLM
  if (settings?.useLocal && settings.localBaseUrl && settings.localModel) {
    const localPrompt = `${promptText}
    
    IMPORTANT: You must output ONLY a valid JSON array. Do not add any conversational text.
    The JSON structure must be exactly:
    [
      {
        "word": "example",
        "phonetic": "/.../",
        "meaning": "chinese meaning",
        "roots": [
          { "part": "ex-", "meaning": "out (chinese)" },
          { "part": "ample", "meaning": "large (chinese)" }
        ]
      }
    ]
    `;
    
    const rawText = await generateLocalText(settings.localBaseUrl, settings.localModel, localPrompt, 0.8);
    try {
      const jsonText = cleanJsonBlock(rawText);
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Local LLM JSON", rawText);
      throw new Error("Local LLM did not return valid JSON. Try again.");
    }
  }

  // Branch: Gemini API
  const ai = getAiClient(settings);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptText,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING, description: "IPA format" },
            meaning: { type: Type.STRING, description: "Meaning in Chinese" },
            roots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  part: { type: Type.STRING, description: "The root part, e.g., 'bene-'" },
                  meaning: { type: Type.STRING, description: "Meaning of the part in Chinese" }
                },
                required: ["part", "meaning"]
              }
            }
          },
          required: ["word", "phonetic", "meaning", "roots"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data returned from Gemini");
  
  return JSON.parse(text);
};

/**
 * Generates data for a specific single word requested by the user.
 */
export const generateSingleWord = async (targetWord: string, settings?: AppSettings): Promise<Omit<WordData, 'id'>> => {
  const promptText = `
    Analyze the English word: "${targetWord}".
    Provide:
    1. The word itself (English) - correct the capitalization if needed.
    2. Its IPA phonetic transcription.
    3. A concise definition in Chinese (Simplified).
    4. A detailed breakdown of its etymological roots (prefix/root/suffix), where the root part is in English/Latin/Greek but its meaning is in Chinese (Simplified).
  `;

  // Branch: Local LLM
  if (settings?.useLocal && settings.localBaseUrl && settings.localModel) {
    const localPrompt = `${promptText}
    
    IMPORTANT: You must output ONLY a valid JSON object. Do not add any conversational text.
    The JSON structure must be exactly:
    {
      "word": "Example",
      "phonetic": "/.../",
      "meaning": "chinese meaning",
      "roots": [
        { "part": "ex-", "meaning": "out (chinese)" },
        { "part": "ample", "meaning": "large (chinese)" }
      ]
    }
    `;
    
    const rawText = await generateLocalText(settings.localBaseUrl, settings.localModel, localPrompt, 0.7);
    try {
      const jsonText = cleanJsonBlock(rawText);
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Local LLM JSON for single word", rawText);
      throw new Error("Local LLM did not return valid JSON. Try again.");
    }
  }

  // Branch: Gemini API
  const ai = getAiClient(settings);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptText,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          phonetic: { type: Type.STRING, description: "IPA format" },
          meaning: { type: Type.STRING, description: "Meaning in Chinese" },
          roots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                part: { type: Type.STRING, description: "The root part, e.g., 'bene-'" },
                meaning: { type: Type.STRING, description: "Meaning of the part in Chinese" }
              },
              required: ["part", "meaning"]
            }
          }
        },
        required: ["word", "phonetic", "meaning", "roots"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data returned from Gemini");
  
  return JSON.parse(text);
};


/**
 * Generates raw audio data (base64) for a word pronunciation.
 */
export const generatePronunciation = async (word: string, settings?: AppSettings): Promise<string> => {
  try {
    const ai = getAiClient(settings);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `Say the word clearly: ${word}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");
    return base64Audio;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
};

/**
 * Generates audio for a word and plays it immediately.
 * Wrapper around generatePronunciation for simple playback.
 */
export const playWordPronunciation = async (word: string, settings?: AppSettings): Promise<void> => {
  try {
    const base64Audio = await generatePronunciation(word, settings);
    await playAudioData(base64Audio);
  } catch (error) {
    console.error("TTS Playback Error:", error);
  }
};

/**
 * Generates audio for the story using TTS with expression.
 * Returns base64 string.
 */
export const generateStoryAudio = async (text: string, settings?: AppSettings): Promise<string> => {
  try {
    const ai = getAiClient(settings);
    // Use Fenrir or Puck for a slightly more character-driven voice, or Kore for neutrality.
    // 'Fenrir' often has a deeper, more storytelling quality.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `Read the following story with rich emotion and theatrical expression:\n\n${text}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio content returned");
    
    return base64Audio;
  } catch (error) {
    console.error("Story TTS Error:", error);
    throw error;
  }
};

/**
 * Generates a humorous story and an image for a specific word.
 * Uses Local LLM for story if configured, but always uses Gemini for Image.
 */
export const generateWordDetails = async (wordData: WordData, settings?: AppSettings): Promise<GeneratedContent> => {
  // 1. Generate Story
  const storyPrompt = `
    Write a short, humorous, and memorable story in Chinese (Simplified) (max 150 words) that explains the English word "${wordData.word}" (Meaning: ${wordData.meaning}).
    The story MUST creatively weave in the meanings of its roots: ${wordData.roots.map(r => `${r.part} (${r.meaning})`).join(', ')}.
    Make it funny to help with memorization.
  `;

  const ai = getAiClient(settings);

  let story = "";
  
  // Start Story Gen
  const storyPromise = (async () => {
    if (settings?.useLocal && settings.localBaseUrl && settings.localModel) {
      return await generateLocalText(settings.localBaseUrl, settings.localModel, storyPrompt, 0.8);
    } else {
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: storyPrompt,
      });
      return res.text || "Could not generate story.";
    }
  })();

  // 2. Generate Image (Gemini only)
  // Image generation always uses Gemini, so we use the configured Gemini client
  const imagePrompt = `A humorous, cartoon-style illustration depicting the literal or metaphorical meaning of the word "${wordData.word}": ${wordData.meaning}. Colorful, clean lines.`;
  
  const imagePromise = ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: imagePrompt,
  });

  // Execute in parallel
  const [storyText, imageRes] = await Promise.allSettled([storyPromise, imagePromise]);

  if (storyText.status === 'fulfilled') {
    story = storyText.value;
  } else {
    story = "Story generation failed.";
  }

  // Process Image
  let imageBase64 = "";
  if (imageRes.status === 'fulfilled' && imageRes.value) {
    const parts = imageRes.value.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
          if (part.inlineData) {
              imageBase64 = part.inlineData.data;
              break;
          }
      }
    }
  }

  return {
    story,
    imageBase64
  };
};
