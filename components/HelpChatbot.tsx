
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { decode } from '../utils/audioUtils';

interface HelpChatbotProps {
  language: Language;
}

const HelpChatbot: React.FC<HelpChatbotProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "GARGAARSA",
        placeholder: "Maal si gargaaru?",
        send: "Ergi",
        welcome: "MULTI_SPHERE Gargaarsatti nagaan dhuftan! Sagalee kootti fayyadamuu dandeessu.",
      },
      en: {
        title: "SUPPORT",
        placeholder: "Ask anything...",
        send: "Send",
        welcome: "Welcome to MULTI_SPHERE Support! I can speak to you.",
      },
      am: {
        title: "እርዳታ",
        placeholder: "ምን ልርዳዎት?",
        send: "ላክ",
        welcome: "ወደ MULTI_SPHERE እርዳታ በሰላም መጡ! በድምፅ ማገዝ እችላለሁ።",
      }
    };
    return (base as any)[lang] || base.en;
  };
  const t = getT(language);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const speakText = async (text: string) => {
    try {
      const resGen = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          }
        })
      });
      
      if (!resGen.ok) throw new Error("Failed to generate audio");
      const response = await resGen.json();
      const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decode(b64);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (e) { 
      console.error("TTS Error", e);
      // Clean fallback to native Web Speech Synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          if (language === 'om') utterance.lang = 'om-ET';
          else if (language === 'am') utterance.lang = 'am-ET';
          else utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        } catch (synthErr) {
          console.error("Native synthesis failed:", synthErr);
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const langName = language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English';
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          prompt: `You are a helpful support bot for the MULTI_SPHERE app. Answer briefly in ${langName}. The user says: "${userMsg}"`
        })
      });
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(errJson.error || "Failed to generate reply");
      }
      const response = await res.json();
      setQuotaExceeded(false);
      const reply = response.text || "Error.";
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      speakText(reply);
    } catch (error: any) {
      console.warn("HelpChatbot got error, loading graceful guidance support fallback:", error);
      if (error.message?.includes("quota") || error.message?.includes("429")) setQuotaExceeded(true);
      
      let fallbackText = "AI Connection Offline. Multi_Sphere has loaded quick-support: You can use our secure Wallet section (registered by National ID), utilize Voice translation services, practice religious recitation, or locate local service points on the map.";
      if (language === 'om') {
        fallbackText = "Quunnamtii AI addaan citeera (Quota limit). Garuu, Wallet keessatti lakkoofsa ID keetiin herrega uumi, Voice TTS fayyadami ykn amantaa kee qara'i.";
      } else if (language === 'am') {
        fallbackText = "የ AI ግንኙነት ለጊዜው ተቋርጧል (የኮታ ገደብ):: ነገር ግን በዋሌት መፍጠሪያ፣ በድምጽ ትርጉም ወይም በሃይማኖታዊ ልምምድ ክፍሎች ውስጥ መገልገል ይችላሉ::";
      }
      setMessages(prev => [...prev, { role: 'model', text: fallbackText }]);
      speakText(fallbackText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      {isOpen && (
        <div className="absolute bottom-20 left-0 w-72 md:w-80 h-96 bg-white rounded-[2.5rem] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up z-[200]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex justify-between items-center text-white">
            <h3 className="font-black text-xs tracking-widest uppercase">🤖 {t.title}</h3>
            <button onClick={() => setIsOpen(false)} className="hover:scale-125 transition-transform font-bold">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 text-[11px]">
            {messages.length === 0 && <p className="text-gray-400 italic text-center mt-10 font-medium">{t.welcome}</p>}
            
            {quotaExceeded && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-[9px] text-red-600 mb-2">
                <p className="font-black uppercase mb-1">Quota Limit reached!</p>
                <div className="flex gap-1">
                  <input 
                    type="password" 
                    value={keyInput} 
                    onChange={(e) => setKeyInput(e.target.value)} 
                    placeholder="API Key..." 
                    className="flex-1 px-2 py-1 bg-white border border-red-200 rounded outline-none"
                  />
                  <button 
                    onClick={() => { localStorage.setItem('multisphere_gemini_apikey', keyInput); setQuotaExceeded(false); }} 
                    className="bg-red-600 text-white px-2 rounded font-bold"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm relative ${msg.role === 'user' ? 'bg-indigo-600 text-white font-bold' : 'bg-white border border-gray-200 text-gray-800 font-medium'}`}>
                  {msg.text}
                  {msg.role === 'model' && (
                    <button onClick={() => speakText(msg.text)} className="absolute -right-7 top-1 p-1 bg-white rounded-full shadow-md text-blue-600 hover:scale-110 active:scale-90 border border-blue-50">🔊</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder={t.placeholder} 
              className="flex-1 bg-gray-100 rounded-full px-5 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 transition-all" 
            />
            <button 
              onClick={handleSend} 
              disabled={!input || isLoading} 
              className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-90"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-12 h-12 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all ring-2 ring-white/20 active:scale-90"
      >
        {isOpen ? <span className="text-lg">✕</span> : <span className="text-xl">💬</span>}
      </button>
    </div>
  );
};

export default HelpChatbot;
