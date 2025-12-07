
import React, { useState } from 'react';
import { AppSettings, LocalModel } from '../types';
import { fetchLocalModels, testLocalTTS } from '../services/geminiService';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [formData, setFormData] = useState<AppSettings>({
      ...settings,
      // Ensure defaults if not set previously
      localTTSUrl: settings.localTTSUrl || 'http://localhost:5000/v1/audio/speech',
      localTTSModel: settings.localTTSModel || 'tts-1',
      localTTSVoice: settings.localTTSVoice || 'alloy'
  });
  const [availableModels, setAvailableModels] = useState<LocalModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // TTS Test State
  const [testingTTS, setTestingTTS] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFetchModels = async () => {
    if (!formData.localBaseUrl) return;
    
    setLoadingModels(true);
    setCheckStatus('idle');
    try {
      const models = await fetchLocalModels(formData.localBaseUrl);
      setAvailableModels(models);
      setCheckStatus('success');
      // If models found and current model is not in list (or empty), select the first one
      if (models.length > 0) {
        if (!formData.localModel || !models.find(m => m.id === formData.localModel)) {
             setFormData(prev => ({ ...prev, localModel: models[0].id }));
        }
      }
    } catch (error) {
      console.error(error);
      setCheckStatus('error');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTestTTS = async () => {
      setTestingTTS(true);
      setTtsStatus('idle');
      try {
          await testLocalTTS(formData);
          setTtsStatus('success');
      } catch (error) {
          console.error("TTS Test Failed", error);
          setTtsStatus('error');
      } finally {
          setTestingTTS(false);
      }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto custom-scroll space-y-6 py-4 px-1">
            
            {/* Gemini Configuration */}
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Gemini API</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use your own API key for Gemini models</p>
                    </div>
                    <button 
                        onClick={() => setFormData(prev => ({ ...prev, useCustomGemini: !prev.useCustomGemini }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.useCustomGemini ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${formData.useCustomGemini ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                
                {formData.useCustomGemini && (
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                        <input 
                            type="password" 
                            value={formData.geminiApiKey}
                            onChange={e => setFormData(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                            placeholder="AIzaSy..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Key is stored locally in your browser.
                        </p>
                    </div>
                )}
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Local LLM Configuration */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Local LLM (Text)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Connect to Ollama, LM Studio, etc.</p>
                    </div>
                    <button 
                        onClick={() => setFormData(prev => ({ ...prev, useLocal: !prev.useLocal }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.useLocal ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${formData.useLocal ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {formData.useLocal && (
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base URL</label>
                        <input 
                        type="text" 
                        value={formData.localBaseUrl}
                        onChange={e => setFormData(prev => ({ ...prev, localBaseUrl: e.target.value }))}
                        placeholder="http://localhost:11434/v1"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model Name</label>
                        <div className="flex gap-2">
                        <div className="relative flex-1">
                            {availableModels.length > 0 ? (
                            <select 
                                value={formData.localModel}
                                onChange={e => setFormData(prev => ({ ...prev, localModel: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white appearance-none"
                            >
                                {availableModels.map(model => (
                                    <option key={model.id} value={model.id}>{model.id}</option>
                                ))}
                            </select>
                            ) : (
                            <input 
                                type="text" 
                                value={formData.localModel}
                                onChange={e => setFormData(prev => ({ ...prev, localModel: e.target.value }))}
                                placeholder="e.g., llama3"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            />
                            )}
                            
                            {availableModels.length > 0 && (
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleFetchModels}
                            disabled={loadingModels || !formData.localBaseUrl}
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[40px]"
                            title="Check connection and fetch models"
                        >
                            {loadingModels ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : checkStatus === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-600 dark:text-green-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            )}
                        </button>
                        </div>
                        {checkStatus === 'error' && (
                            <p className="text-xs text-red-500 mt-1">Failed to connect. Check URL/CORS.</p>
                        )}
                        {checkStatus === 'success' && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Connected! {availableModels.length} models found.</p>
                        )}
                    </div>
                    </div>
                )}
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Local TTS Configuration */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Local TTS (Audio)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use OpenAI-compatible speech endpoint</p>
                    </div>
                    <button 
                        onClick={() => setFormData(prev => ({ ...prev, useLocalTTS: !prev.useLocalTTS }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.useLocalTTS ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${formData.useLocalTTS ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {formData.useLocalTTS && (
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">TTS Endpoint URL</label>
                            <input 
                                type="text" 
                                value={formData.localTTSUrl}
                                onChange={e => setFormData(prev => ({ ...prev, localTTSUrl: e.target.value }))}
                                placeholder="http://localhost:5000/v1/audio/speech"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
                                <input 
                                    type="text" 
                                    value={formData.localTTSModel}
                                    onChange={e => setFormData(prev => ({ ...prev, localTTSModel: e.target.value }))}
                                    placeholder="tts-1"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Voice</label>
                                <input 
                                    type="text" 
                                    value={formData.localTTSVoice}
                                    onChange={e => setFormData(prev => ({ ...prev, localTTSVoice: e.target.value }))}
                                    placeholder="alloy"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                />
                             </div>
                        </div>

                        {/* TTS Test Button */}
                        <div className="pt-2">
                             <button
                                onClick={handleTestTTS}
                                disabled={testingTTS || !formData.localTTSUrl}
                                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                    ttsStatus === 'error' 
                                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                }`}
                             >
                                {testingTTS ? (
                                    <>
                                       <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating Audio...
                                    </>
                                ) : ttsStatus === 'success' ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                        </svg>
                                        Playing Test Audio (Success)
                                    </>
                                ) : (
                                    <>
                                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                       </svg>
                                       Test Audio Generation
                                    </>
                                )}
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
                Save Settings
            </button>
        </div>
      </div>
    </div>
  );
};
