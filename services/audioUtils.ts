export const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const playAudioData = async (
  base64Audio: string,
  sampleRate: number = 24000
): Promise<void> => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate });
    
    const arrayBuffer = decodeBase64(base64Audio).buffer;
    
    // Create an Int16Array view of the data (PCM 16-bit)
    const dataInt16 = new Int16Array(arrayBuffer);
    
    // Create an AudioBuffer
    const audioBuffer = audioContext.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Normalize Int16 to Float32 [-1.0, 1.0]
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    
    // Automatically close context after playback to save resources, 
    // strictly speaking we might want to keep one context open globally, 
    // but for occasional clicks, this is safer for clean up.
    source.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    console.error("Error playing audio", error);
  }
};

export const downloadAudio = (base64Audio: string, filename: string) => {
  try {
    const bytes = decodeBase64(base64Audio);
    // Note: The raw output from Gemini TTS is PCM. 
    // Browsers don't support playing/downloading raw PCM in <audio> tags or as simple .wav downloads 
    // without a WAV header.
    // For a robust download, we should add a simple WAV header.
    
    const wavBytes = addWavHeader(bytes, 24000, 1);
    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading audio", error);
  }
};

/**
 * Creates a Blob URL for the audio data to be used in an <audio> tag.
 */
export const createAudioUrl = (base64Audio: string): string => {
  const bytes = decodeBase64(base64Audio);
  const wavBytes = addWavHeader(bytes, 24000, 1);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

// Helper to add WAV header to raw PCM data
function addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * 2, true); // 16-bit = 2 bytes
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length, true);

  // Write the PCM samples
  const dest = new Uint8Array(buffer, 44);
  dest.set(samples);

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}