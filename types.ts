
export interface RootItem {
  part: string;
  meaning: string;
}

export interface WordData {
  id: string; // unique ID for React keys
  word: string;
  phonetic: string;
  meaning: string;
  roots: RootItem[];
  
  story?: string;
  imageUrl?: string; 
  
  storyAudioBase64?: string; // New field for caching story audio
  isLoadingDetails?: boolean;
}

export interface GeneratedContent {
  story: string;
  imageBase64: string;
}

export interface AppSettings {
  useLocal: boolean;
  localBaseUrl: string;
  localModel: string;
  // Custom Gemini Config
  useCustomGemini: boolean;
  geminiApiKey: string;
  // Local TTS Config
  useLocalTTS: boolean;
  localTTSUrl: string;
  localTTSModel: string;
  localTTSVoice: string;
}

export interface LocalModel {
  id: string;
  object: string;
}