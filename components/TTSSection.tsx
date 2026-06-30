
import React, { useState, useRef } from 'react';
import { Language } from '../types';
import { createWavBlob, decode, encode, SHOTGUN_MIC_CONSTRAINTS, applyVoiceFocusFilter } from '../utils/audioUtils';

interface TTSSectionProps {
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

type ModelType = 'whisper' | 'wav2vec2' | 'vosk';
type DialectType = 'standard' | 'harar' | 'arsi' | 'borana' | 'wollo' | 'wallagga';

const TTSSection: React.FC<TTSSectionProps> = ({ language, onAddHistory }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      setStatusMessage({ text, type });
      setTimeout(() => setStatusMessage(null), 4500);
  };

  // Custom API key states and quota warning
  const [quotaExceededError, setQuotaExceededError] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => localStorage.getItem('multisphere_gemini_apikey') || '');
  const [keySavedConfirmation, setKeySavedConfirmation] = useState(false);
  
  const [preferredModel, setPreferredModel] = useState<ModelType>(() => {
    return (localStorage.getItem('multisphere_model') as ModelType) || 'whisper';
  });
  
  const [selectedDialect, setSelectedDialect] = useState<DialectType>(() => {
    return (localStorage.getItem('multisphere_dialect') as DialectType) || 'standard';
  });

  const [showConfig, setShowConfig] = useState(false);

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "TTS & STT (Sagalee AI)",
        placeholder: "Barreeffama Afaan Oromoo asitti galchi ykn mallattoo mic tuqi...",
        convert: "Sagaleetti Jijjiiri",
        download: "Sagalee Buufadhu",
        share: "Hirmaadhu (Share)",
        selectApp: "App Koo Filadhu",
        modelSelect: "Gosa Modelii AI:",
        dialectSelect: "Loqoda Dubbataa Filadhu:",
        configSaved: "Appiin kee filatameera!",
        converting: "Generating...",
        success: "Sagaleen uumameera!",
        startMic: "Dubbachuuf mic tuqi",
        stopMic: "Waraabbii Dhaabi",
        transcribing: "Barreeffamatti jijjiiraa jira...",
        textSelect: "Text Select model"
      },
      en: {
        title: "TTS & STT (Speech AI)",
        placeholder: "Enter Afaan Oromo text or click mic to speak...",
        convert: "Convert to Speech",
        download: "Download Voice",
        share: "Share",
        selectApp: "Select My App",
        modelSelect: "AI Model Engine:",
        dialectSelect: "Select Speaker Dialect:",
        configSaved: "App selected and saved!",
        converting: "Generating...",
        success: "Voice generated successfully!",
        startMic: "Click mic to speak",
        stopMic: "Stop Recording",
        transcribing: "Transcribing audio...",
        textSelect: "Text Select model"
      },
      am: {
        title: "TTS & STT (የድምጽ AI)",
        placeholder: "ጽሑፍ እዚህ ያስገቡ ወይም ማይክሮፎኑን ይጫኑ...",
        convert: "ወደ ድምጽ ቀይር",
        download: "ድምጽ አውርድ",
        share: "አጋራ",
        selectApp: "የእኔን መተግበሪያ ምረጥ",
        modelSelect: "የ AI ሞዴል ዓይነት:",
        dialectSelect: "የድምጽ ዘይቤ ይምረጡ:",
        configSaved: "ምርጫዎ ተቀምጧል!",
        converting: "በማመንጨት ላይ...",
        success: "ድምጽ ተፈጥሯል!",
        startMic: "ለመናገር ይጫኑ",
        stopMic: "መቅዳት አቁም",
        transcribing: "ወደ ጽሑፍ በመቀየር ላይ...",
        textSelect: "የጽሑፍ ምርጫ ሞዴል"
      }
    };
    return (base as any)[lang] || base.en;
  };
  
  const t = getT(language);

  const startRecording = async () => {
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia(SHOTGUN_MIC_CONSTRAINTS);
      const stream = applyVoiceFocusFilter(rawStream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await handleSTT(audioBlob);
        try {
          rawStream.getTracks().forEach(t => t.stop());
          const ctx = (stream as any)._audioCtx;
          if (ctx) ctx.close();
        } catch (e) {}
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingSTT(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingSTT) {
      mediaRecorderRef.current.stop();
      setIsRecordingSTT(false);
    }
  };

  const handleSTT = async (blob: Blob) => {
    setLoading(true);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const base64Audio = encode(new Uint8Array(arrayBuffer));
      
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "audio/wav", data: base64Audio } },
                { text: `Transcribe this audio. Language: ${language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English'}. Just return the transcription text.` }
              ]
            }
          ]
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429 || (errJson.error || "").toLowerCase().includes("quota")) {
          setQuotaExceededError(true);
        }
        throw new Error(errJson.error || "Failed to transcribe audio");
      }
      const response = await res.json();
      setQuotaExceededError(false);
      const text = response.text;
      if (text) {
        setText(text);
        onAddHistory('STT', `Transcribed audio to: ${text.slice(0, 50)}...`);
      }
    } catch (error: any) {
      console.error("STT Error:", error);
      const isQuota = error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED");
      if (isQuota) {
        const quotaMsg = language === 'om' ? "Quota dhumateera. Maaloo saphana kee bilisa gochuuf mudannoo bilbilaatti dhihaadhu ykn text barreessi." :
                           language === 'am' ? "የአገልግሎቱ ኮታ አልቋል:: እባክዎ ጽሑፉን በእጅዎ ይጻፉ ወይም በቅንብሮች ውስጥ የክፍያ መለያ ያገናኙ::" :
                           "Gemini API Quota exceeded. Please type your text manually or link a paid API plan.";
        console.warn(quotaMsg);
        // Instead of disruptive window.alert inside iframe we log and warn nicely in state
        setText(language === 'om' ? "[Dadhabaan sagalee kee beekuuf rakkatte: Maaloo barreessi]" : language === 'am' ? "[የድምፅ ቀረፃውን ለመተርጎም አልተቻለም፡ እባክዎ ይፃፉ]" : "[API Quota Limit - Please type manually]");
      } else {
        console.warn("Error transcribing audio:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem('multisphere_app_selected', 'true');
    localStorage.setItem('multisphere_model', preferredModel);
    localStorage.setItem('multisphere_dialect', selectedDialect);
    alert(t.configSaved);
  };

  const handleTTS = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setAudioUrl(null);

    try {
      const resGen = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Speak this ${language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English'} text clearly with a ${selectedDialect} dialect: ${text}` }] }],
          config: {
            responseModalalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        })
      });

      if (!resGen.ok) {
        if (resGen.status === 429) setQuotaExceededError(true);
        throw new Error("Failed to generate speech");
      }
      const response = await resGen.json();
      setQuotaExceededError(false);
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBytes = decode(base64Audio);
        const wavBlob = createWavBlob(audioBytes, 24000);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        onAddHistory('TTS', `Generated speech for: ${text.slice(0, 50)}...`, url);
        alert("Speech is ready");
      }
    } catch (error) {
       console.error("TTS Error:", error);
       
       let fallbackMsg = "Gemini Voice API credits are currently depleted. Automatically calling your device's built-in vocal engine to play this text.";
       if (language === 'om') {
         fallbackMsg = "Iddoon qusannaa sagalee AI dhumateera. Sagalee bilbila/kompiutara keessanii fayyadamnee yaada keessan dubbisna.";
       } else if (language === 'am') {
         fallbackMsg = "የ Gemini ድምጽ አገልግሎት ክሬዲት አልቋል። ይህንን ጽሑፍ ለማድመጥ የመሣሪያዎትን አብሮ የተሰራ የድምጽ ማቀናበሪያ በራስ-ሰር እንጠቀማለን።";
       }
       
       alert(fallbackMsg);
 
       if (typeof window !== 'undefined' && window.speechSynthesis) {
         window.speechSynthesis.cancel();
         const utterance = new SpeechSynthesisUtterance(text);
         if (language === 'om') utterance.lang = 'om-ET';
         else if (language === 'am') utterance.lang = 'am-ET';
         else utterance.lang = 'en-US';
         
         window.speechSynthesis.speak(utterance);
         onAddHistory('TTS', `Synthesized voice offline for: ${text.slice(0, 50)}...`);
         alert("Speech is ready");
       } else {
        alert("Your browser does not support Speech Synthesis.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!audioUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MULTI_SPHERE AI Voice',
          text: 'Listen to this Afaan Oromo AI voice generation.',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4">
      {/* AI ENGINE CONFIGURATION FRAME */}
      <div className="bg-black text-white p-5 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-2 md:border-4 border-red-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
        
        {statusMessage && (
          <div className={`p-4 rounded-2xl border mb-4 text-[10px] font-black uppercase flex justify-between items-center animate-slide-up relative z-50 ${
              statusMessage.type === 'success' ? 'bg-green-600 text-white border-green-700' :
              statusMessage.type === 'error' ? 'bg-red-600 text-white border-red-700' :
              'bg-zinc-800 text-white border-white/10'
          }`}>
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)}>✕</button>
          </div>
        )}

        {/* Quota Exceeded Mini Banner */}
        {quotaExceededError && (
          <div className="bg-red-500/20 backdrop-blur-md p-4 rounded-2xl border border-red-500/50 mb-4 animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-[10px] font-black uppercase text-red-400">Quota Exceeded</p>
                <p className="text-[9px] font-bold text-gray-300">The shared key is exhausted. Enter your personal key below to resume immediately.</p>
              </div>
            </div>
            <div className="flex gap-2">
               <input 
                  type="password" 
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder="Paste AIzaS Key..." 
                  className="flex-1 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-[10px] font-mono outline-none"
               />
               <button 
                  onClick={() => {
                    localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                    setQuotaExceededError(false);
                    setKeySavedConfirmation(true);
                    setTimeout(() => setKeySavedConfirmation(false), 2000);
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase"
               >
                  {keySavedConfirmation ? "ACTIVED" : "ACTIVATE"}
               </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4 relative z-20">
           <div>
             <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-red-500">{t.textSelect}</h3>
             <p className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase mt-1">Configure your speech generation</p>
           </div>
           
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowConfig(!showConfig)}
               className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex flex-col items-center justify-center gap-1 hover:bg-red-600 transition-all active:scale-95"
             >
               <div className="w-1 h-1 bg-white rounded-full"></div>
               <div className="w-1 h-1 bg-white rounded-full"></div>
               <div className="w-1 h-1 bg-white rounded-full"></div>
             </button>
             
             <button 
               onClick={savePreferences} 
               className="text-[10px] md:text-xs font-black bg-white text-black px-4 py-2 md:px-6 md:py-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl border-b-4 border-gray-300"
             >
               ⭐ {t.selectApp}
             </button>
           </div>
        </div>

        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-2 relative z-10 animate-slide-up">
              {/* Model Selection Dropdown */}
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400 block ml-1">{t.modelSelect}</label>
                <div className="relative group">
                  <select 
                    value={preferredModel} 
                    onChange={(e) => setPreferredModel(e.target.value as ModelType)}
                    className="w-full p-4 bg-zinc-900 border-2 border-white/10 rounded-2xl font-black text-[10px] md:text-xs text-white appearance-none outline-none focus:border-red-600 transition-all cursor-pointer shadow-inner pr-10"
                  >
                    <option value="whisper">OPENAI WHISPER V3</option>
                    <option value="wav2vec2">META WAV2VEC 2.0</option>
                    <option value="vosk">VOSK OFFLINE</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-500 font-black text-xs">▼</div>
                </div>
              </div>

              {/* Dialect Selection Dropdown */}
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400 block ml-1">{t.dialectSelect}</label>
                <div className="relative group">
                  <select 
                    value={selectedDialect} 
                    onChange={(e) => setSelectedDialect(e.target.value as DialectType)}
                    className="w-full p-4 bg-zinc-900 border-2 border-white/10 rounded-2xl font-black text-[10px] md:text-xs text-white appearance-none outline-none focus:border-red-600 transition-all cursor-pointer shadow-inner pr-10"
                  >
                    <option value="standard">STANDARD OROMO</option>
                    <option value="harar">HARAR DIALECT</option>
                    <option value="arsi">ARSI DIALECT</option>
                    <option value="borana">BORANA DIALECT</option>
                    <option value="wollo">WOLLO DIALECT</option>
                    <option value="wallagga">WALLAGGA DIALECT</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-500 font-black text-xs">▼</div>
                </div>
              </div>

              {/* Personal Key Config in expanded settings */}
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400 block ml-1">Personal Gemini API Key:</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="AIzaSy..." 
                    className="flex-1 p-3 md:p-4 bg-zinc-900 border-2 border-white/10 rounded-2xl font-mono text-[10px] text-white outline-none focus:border-red-600"
                  />
                   {customKeyInput && (
                      <button 
                         onClick={() => { setCustomKeyInput(''); localStorage.removeItem('multisphere_gemini_apikey'); }} 
                         className="text-[8px] text-red-600 font-black uppercase hover:underline"
                      >
                         Clear
                      </button>
                   )}
                </div>
              </div>
          </div>
        )}
      </div>

      {/* INPUT SECTION */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-2 border-gray-100 relative">
        <h2 className="text-lg md:text-xl font-black flex items-center gap-2 text-black mb-4 uppercase">
            <span className="p-1.5 md:p-2 bg-red-600 text-white rounded-xl">🗣️</span> {t.title}
        </h2>
        
        <div className="relative mb-4 md:mb-6">
          <textarea
            className="w-full h-32 md:h-40 p-4 md:p-6 bg-gray-50 border-2 border-gray-100 rounded-2xl md:rounded-3xl focus:border-red-600 focus:outline-none resize-none text-base md:text-lg font-medium shadow-inner transition-colors placeholder:text-gray-300 pr-16"
            placeholder={t.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button 
            onClick={isRecordingSTT ? stopRecording : startRecording}
            className={`absolute right-4 bottom-4 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecordingSTT ? 'bg-red-600 animate-pulse text-white' : 'bg-black text-red-500 hover:scale-110'}`}
          >
            {isRecordingSTT ? (
              <span className="text-xl md:text-2xl">⏹️</span>
            ) : (
              <span className="text-xl md:text-2xl">🎙️</span>
            )}
          </button>
        </div>

        {isRecordingSTT && (
          <div className="flex items-center gap-2 mb-4 animate-slide-up bg-red-50 p-3 rounded-xl border border-red-100">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase text-red-600 tracking-wider font-mono">
              Recording Voice... speak now
            </span>
          </div>
        )}
        
        <button 
          onClick={handleTTS} 
          disabled={loading || !text} 
          className={`aura-btn w-full h-14 md:h-16 group ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
            <div className="aura-effect"></div>
            <div className="aura-content text-base md:text-lg font-black uppercase tracking-widest flex items-center gap-2 md:gap-3">
              {loading ? (
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 md:border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : '✨'}
              {loading ? (isRecordingSTT ? t.transcribing : t.converting) : t.convert}
            </div>
        </button>

        {/* OUTPUT SECTION */}
        {audioUrl && (
          <div className="bg-black p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 md:border-4 border-red-600 mt-6 md:mt-8 animate-slide-up shadow-2xl">
            <audio controls src={audioUrl} className="w-full mb-6 md:mb-8 filter invert" />
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <a 
                href={audioUrl} 
                download="multisphere-oro-voice.wav" 
                className="bg-white text-black flex flex-col items-center justify-center gap-1 md:gap-2 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-gray-300"
              >
                <span className="text-xl md:text-2xl">⬇️</span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest">{t.download}</span>
              </a>
              
              <button 
                onClick={handleShare}
                className="bg-red-600 text-white flex flex-col items-center justify-center gap-1 md:gap-2 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-red-800"
              >
                <span className="text-xl md:text-2xl">🔗</span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest">{t.share}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TTSSection;
