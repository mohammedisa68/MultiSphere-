
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  Trash2, 
  Send, 
  Image as ImageIcon, 
  Plus, 
  X, 
  MessageCircle,
  Brain,
  Zap,
  Ear,
  Key,
  Check,
  Info
} from 'lucide-react';

interface MultimodalSectionProps {
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    images?: string[];
    audio?: string;
}

const MultimodalSection: React.FC<MultimodalSectionProps> = ({ language, onAddHistory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

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
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const getT = (lang: Language) => {
    const base = {
        om: {
            title: "MultiSphere Multimodal",
            subtitle: "AI Mara-Qabaa",
            placeholder: "Waallee gaafadhu, suuraa agarsiisi ykn sagaleen dubbadhu...",
            uploadImg: "Suuraa Dabali",
            uploadAudio: "Sagalee Dabali",
            send: "Ergi",
            clear: "Haqi",
            thinking: "Yaadaa jira...",
            voiceError: "Maayikiin hin hojjetu.",
            description: "AI inputoota garaa garaa (Barreeffama, Suuraa fi Sagalee) hubatu."
        },
        en: {
            title: "MultiSphere Multimodal",
            subtitle: "Process Text, Image & Audio",
            placeholder: "Ask anything, upload images, or speak to me...",
            uploadImg: "Add Images",
            uploadAudio: "Add Audio",
            send: "Send",
            clear: "Clear",
            thinking: "Thinking...",
            voiceError: "Voice input not supported.",
            description: "The AI that understands everything - Text, Images, and Audio."
        },
        am: {
            title: "ሁለገብ አርቲፊሻል ኢንተለጀንስ",
            subtitle: "ጽሑፍ፣ ምስል እና ድምጽ",
            placeholder: "ማንኛውንም ነገር ይጠይቁ፣ ምስል ይጫኑ ወይም በድምፅ ያናግሩኝ...",
            uploadImg: "ምስል ጨምር",
            uploadAudio: "ድምጽ ጨምር",
            send: "ላክ",
            clear: "አጽዳ",
            thinking: "በማሰብ ላይ...",
            voiceError: "የድምጽ ግብዓት አልተደገፈም።",
            description: "ሁሉንም ነገር የሚረዳ AI - ጽሑፍ፣ ምስል እና ድምጽ።"
        }
    };
    return (base as any)[lang] || base.en;
  };

  const t = getT(language);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
    });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file as Blob);
          setAudioUrl(url);
      }
  };

  const startVoiceInput = () => {
      if ('webkitSpeechRecognition' in window) {
          setIsListening(true);
          // @ts-ignore
          const recognition = new window.webkitSpeechRecognition();
          recognition.lang = language === 'om' ? 'om-ET' : 'en-US';
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setInputText(prev => prev + transcript);
          };
          recognition.onend = () => setIsListening(false);
          recognition.start();
      } else {
          alert(t.voiceError);
      }
  };

  const handleSend = async () => {
      if (!inputText && selectedImages.length === 0 && !audioUrl) return;
      
      const newUserMsg: ChatMessage = {
          role: 'user',
          text: inputText,
          images: selectedImages.length > 0 ? [...selectedImages] : undefined,
          audio: audioUrl || undefined
      };

      setMessages(prev => [...prev, newUserMsg]);
      setLoading(true);
      
      // Clear inputs
      setInputText('');
      setSelectedImages([]);
      setAudioUrl(null);

      try {
          const newUserMsgParts: any[] = [];
          
          newUserMsgParts.push({ text: `
            You are "MultiSphere Multimodal AI". 
            You can understand and process multiple types of input including text, images, and audio.
            Instructions:
            - Analyze and respond to text input clearly and intelligently
            - Interpret images and describe or extract useful information
            - Process speech/audio by responding appropriately
            - Generate helpful, accurate, and user-friendly responses
            - Be clear, concise, and helpful
            - Adapt responses to user intent
            - Provide accurate and relevant information
            - Maintain a friendly and professional tone
            - Current user language: ${language}
            - Respond in ${language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English'}.

            IMPORTANT DISPLAY RULE: 
            Format your response as a list of key points. Use bullet points or numbered lists where appropriate. 
            Keep sentences relatively short.
          `});

          if (newUserMsg.text) newUserMsgParts.push({ text: newUserMsg.text });
          
          for (const imgBase64 of (newUserMsg.images || [])) {
              newUserMsgParts.push({ 
                  inlineData: { 
                      mimeType: 'image/jpeg', 
                      data: imgBase64.split(',')[1] 
                  } 
              });
          }

          if (newUserMsg.audio) {
              const response = await fetch(newUserMsg.audio);
              const blob = await response.blob() as Blob;
              const reader = new FileReader();
              const audioBase64 = await new Promise<string>((resolve) => {
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                  reader.readAsDataURL(blob);
              });
              
              newUserMsgParts.push({
                  inlineData: {
                      mimeType: blob.type || 'audio/wav',
                      data: audioBase64
                  }
              });
          }

          const res = await fetch("/api/gemini/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  model: "gemini-3.5-flash",
                  contents: { parts: newUserMsgParts }
              })
          });

          if (!res.ok) {
              const errJson = await res.json().catch(() => ({}));
              if (res.status === 429 || (errJson.error || "").toLowerCase().includes("quota")) {
                  setQuotaExceededError(true);
              }
              throw new Error(errJson.error || "Failed to generate content");
          }
          const response = await res.json();
          setQuotaExceededError(false);
          
          const responseText = response.text || "I processed your input but couldn't generate a text response.";
          
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
          onAddHistory('MULTIMODAL', `Interaction with MultiSphere AI: ${newUserMsg.text?.substring(0, 30) || 'Multimodal input'}`, newUserMsg.images?.[0]);

      } catch (error: any) {
          console.error("Multimodal error encountered:", error);
          const errStr = (error.message || "").toLowerCase();
          const isQuota = errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("429");
          if (isQuota) setQuotaExceededError(true);
          
          let quotaMsg = "AI Engine is offline (Quota limit exceeded). Please select a paid API key in settings or try again shortly.";
          if (language === 'om') {
              quotaMsg = "Mootorri AI dabalataa hojii ala ta'eera (Quota xumurame). Maaloo sa'aatii muraasa booda yaali yookaan kaffaltii qindeessi.";
          } else if (language === 'am') {
              quotaMsg = "የ AI ሞተር ከመስመር ውጭ ነው (የኮታ ገደብ):: እባክዎን በቅንብሮች ውስጥ የክፍያ መለያ ያገናኙ ወይም ከጥቂት ደቂቃዎች በኋላ እንደገና ይሞክሩ::";
          }
          setMessages(prev => [...prev, { role: 'model', text: isQuota ? quotaMsg : `I encountered an unexpected issue processing your input: ${error.message || 'unknown error'}` }]);
      } finally {
          setLoading(false);
      }
  };

  // Helper to render AI responses with structured blocks in a single frame
  const renderFormattedText = (text: string) => {
    const blocks = text.split(/\n+|\. /).filter(s => s.trim().length > 5);
    const icons = ['✨', '🚀', '💡', '✅', '🔥', '💎', '🎯'];

    return (
      <div className="bg-purple-50/50 p-6 md:p-8 rounded-[2rem] border-2 border-purple-100 shadow-sm space-y-5">
        {blocks.map((block, idx) => {
          const cleanBlock = block.trim().replace(/^[-*•]\s+/, '');
          return (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="flex gap-4 items-start"
            >
              <span className="text-xl md:text-2xl shrink-0">{icons[idx % icons.length]}</span>
              <p className="text-sm md:text-base font-bold text-gray-800 leading-relaxed border-b border-purple-100 pb-2 w-full">
                {cleanBlock.split(' ').map((word, wIdx) => {
                   const isProminent = word.length > 7 || /^[A-Z]/.test(word);
                   return <span key={wIdx} className={isProminent ? "text-purple-700 font-black" : ""}>{word} </span>
                })}
              </p>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/80 backdrop-blur-2xl p-4 md:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 h-[600px] md:h-[700px] flex flex-col relative overflow-hidden"
    >
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-200/20 rounded-full blur-3xl -z-10" />

        <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg">
                    <Brain size={24} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{t.title}</h2>
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{t.subtitle}</p>
                </div>
            </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                        className={`p-2 rounded-xl transition-all ${showApiKeySettings || customKeyInput ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-purple-500'}`}
                        title="Configure API Key"
                    >
                        <Key size={18} />
                    </button>
                    <button 
                        onClick={() => setMessages([])}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
        </div>

        <AnimatePresence>
            {statusMessage && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-3xl flex items-center justify-between text-xs font-black uppercase tracking-wider shadow-sm border mb-4 shrink-0 ${
                        statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
                        statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-blue-50/80 text-blue-700 border-blue-100'
                    }`}
                >
                    <span>{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} className="ml-2 font-black text-gray-400 hover:text-black">×</button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* API Key Configuration Panel */}
        <AnimatePresence>
            {showApiKeySettings && (
                 <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-3 text-xs overflow-hidden mb-4 shrink-0"
                 >
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-wider text-[10px]">
                             <Key size={14} className="text-purple-600" />
                             <span>Personal Gemini API Key</span>
                         </div>
                         <button onClick={() => setShowApiKeySettings(false)} className="text-gray-400 hover:text-black">
                             <X size={14} />
                         </button>
                     </div>
                     <p className="text-gray-500 text-[10px] leading-relaxed">
                         {language === 'om' 
                           ? "Daangaa 'quota' hambisuuf kii Gemini API bilisaa Google AI Studio irraa argattan galchaa."
                           : "To avoid shared quota limits, enter your personal free Gemini API Key from Google AI Studio."}
                     </p>
                     <div className="flex gap-2">
                         <input 
                             type="password" 
                             value={customKeyInput}
                             onChange={(e) => setCustomKeyInput(e.target.value)}
                             placeholder="AIzaSy..." 
                             className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
                         />
                         <button 
                             onClick={() => {
                                 localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                                 setKeySavedConfirmation(true);
                                 setTimeout(() => setKeySavedConfirmation(false), 2000);
                             }}
                             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all"
                         >
                             {keySavedConfirmation ? <Check size={14} className="text-green-400" /> : <Check size={14} />}
                             <span>{keySavedConfirmation ? "Saved" : "Save"}</span>
                         </button>
                     </div>
                     <div className="flex items-center justify-between text-[10px] text-gray-400">
                         <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-purple-500 hover:underline">
                             Get Free Key ↗
                         </a>
                         {customKeyInput && (
                             <button onClick={() => { setCustomKeyInput(''); localStorage.removeItem('multisphere_gemini_apikey'); }} className="text-red-500 hover:underline">Clear</button>
                         )}
                     </div>
                 </motion.div>
            )}
        </AnimatePresence>

        {/* Quota Exceeded Warning Banner */}
        <AnimatePresence>
            {quotaExceededError && (
                 <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-red-50 p-5 rounded-3xl border border-red-100 flex flex-col gap-3 text-xs mb-4 shrink-0 shadow-sm"
                 >
                     <div className="flex items-start gap-3">
                         <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
                             <Info size={16} />
                         </div>
                         <div className="space-y-1">
                             <h4 className="font-extrabold text-red-900 text-[11px] uppercase tracking-widest">
                                 {language === 'om' ? "Daangaan Kuusaa Dhumateera" : "Shared Daily Quota Exceeded"}
                             </h4>
                             <p className="text-red-600 text-[10px] leading-relaxed opacity-80">
                                 {language === 'om' 
                                   ? "Kii shared bilisaa daangaa bira ga'eera. Kii kee galchuun itti fufuu dandeessa."
                                   : "The shared daily API limit is reached. Bypass this by entering your personal key below."}
                             </p>
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <input 
                             type="password" 
                             value={customKeyInput}
                             onChange={(e) => setCustomKeyInput(e.target.value)}
                             placeholder="Enter personal API Key here..." 
                             className="flex-1 bg-white border border-red-100 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                         />
                         <button 
                             onClick={() => {
                                 localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                                 setQuotaExceededError(false);
                                 setKeySavedConfirmation(true);
                                 setTimeout(() => setKeySavedConfirmation(false), 2000);
                             }}
                             className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition-all text-[10px] uppercase"
                         >
                             Activate
                         </button>
                     </div>
                 </motion.div>
            )}
        </AnimatePresence>

        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar scroll-smooth mb-6">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle size={40} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 max-w-xs">{t.placeholder}</p>
                </div>
            )}
            
            {messages.map((msg, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`max-w-[95%] rounded-[2rem] md:rounded-[3rem] ${
                        msg.role === 'user' 
                        ? 'bg-black text-white p-6 md:p-8 rounded-tr-none shadow-xl' 
                        : 'w-full'
                    }`}>
                        {msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {msg.images.map((img, idx) => (
                                    <img key={idx} src={img} className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border-2 border-white shadow-md" alt="input" />
                                ))}
                            </div>
                        )}
                        {msg.audio && (
                            <div className="mb-4 bg-gray-100 p-3 rounded-2xl border">
                                <audio src={msg.audio} controls className="w-full h-8" />
                            </div>
                        )}
                        
                        {msg.role === 'model' ? (
                           renderFormattedText(msg.text)
                        ) : (
                           <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-bold">{msg.text}</p>
                        )}
                    </div>
                </motion.div>
            ))}

            {loading && (
                <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
                        <div className="flex gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span className="text-xs font-black uppercase text-purple-600 tracking-[0.2em]">{t.thinking}</span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Input Controls Area */}
        <div className="shrink-0 space-y-4">
            {/* Selected Assets Bar */}
            <AnimatePresence>
                {(selectedImages.length > 0 || audioUrl) && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-wrap gap-2 p-3 bg-purple-50 rounded-2xl border border-purple-100"
                    >
                        {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative w-14 h-14">
                                <img src={img} className="w-full h-full object-cover rounded-xl border-2 border-white shadow-sm" alt="selected" />
                                <button 
                                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        {audioUrl && (
                            <div className="relative bg-white px-4 py-2 rounded-xl border border-purple-100 flex items-center gap-2 shadow-sm">
                                <Ear size={14} className="text-purple-600" />
                                <span className="text-[10px] font-black uppercase text-gray-500">Audio Ready</span>
                                <button 
                                    onClick={() => setAudioUrl(null)}
                                    className="bg-red-500 text-white rounded-full p-1 shadow-lg ml-2"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-3">
                <div className="relative flex-1 group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-purple-600 text-white p-2 md:p-3 rounded-2xl shadow-xl hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center border-b-2 border-purple-900 group"
                        >
                            <Plus size={20} strokeWidth={4} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t.placeholder}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] p-4 pl-14 md:pl-16 pr-24 text-sm font-bold focus:border-purple-500 focus:bg-white focus:outline-none transition-all resize-none max-h-[100px] no-scrollbar shadow-inner"
                        rows={1}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button 
                            onClick={startVoiceInput}
                            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'}`}
                        >
                            <Mic size={18} />
                        </button>
                        <button 
                            onClick={() => audioInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                        >
                            <Ear size={18} />
                        </button>
                    </div>
                </div>

                <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                
                <button 
                    onClick={handleSend}
                    disabled={loading || (!inputText && selectedImages.length === 0 && !audioUrl)}
                    className="bg-black text-white p-4 px-6 rounded-[1.5rem] shadow-xl hover:bg-gray-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 border-b-4 border-gray-600"
                >
                    <Send size={24} />
                </button>
            </div>
        </div>
    </motion.div>
  );
};

export default MultimodalSection;
