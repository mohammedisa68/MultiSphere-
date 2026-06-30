import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Language } from '../types';
import { decodeAudioData, encode, createWavBlob, SHOTGUN_MIC_CONSTRAINTS, applyVoiceFocusFilter } from '../utils/audioUtils';

interface LiveSectionProps {
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

type LiveVoice = 'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Zephyr';

const LiveSection: React.FC<LiveSectionProps> = ({ language, onAddHistory }) => {
  const [mode, setMode] = useState<'chat' | 'interpret'>('chat');
  const [isConnected, setIsConnected] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'model', text: string, timestamp: number }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Lang Config
  const [user1Lang, setUser1Lang] = useState<Language>(language);
  const [user2Lang, setUser2Lang] = useState<Language>('en');
  const [aiVoice, setAiVoice] = useState<LiveVoice>('Kore'); 
  
  // Recording
  const [recordedChunks, setRecordedChunks] = useState<Uint8Array[]>([]);
  const userPcmChunks = useRef<Uint8Array[]>([]);

  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcmProcessorNode = useRef<ScriptProcessorNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioOutputGainNode = useRef<GainNode | null>(null);

  // Fallback engine refs
  const recognitionRef = useRef<any>(null);
  const isFallbackListeningRef = useRef<boolean>(false);

  const langNames: Record<Language, string> = {
    om: "Afaan Oromoo",
    en: "English",
    am: "Amharic",
    ar: "Arabic",
    tr: "Turkish",
    ti: "Tigrinya",
    so: "Somali"
  };

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "LIVE CONVERSATION",
        modeChat: "Chat AI",
        modeInterpret: "Hiikkaa Nama Lamaa",
        start: "Woliin Dubbachuu Jalqabi",
        stop: "Dhaabi",
        user1: "Dubbataa 1:",
        user2: "Dubbataa 2:",
        voice: "Gosa Sagalee AI:",
        female: "Dubartii",
        male: "Dhiira",
        recording: "Dubbii hunda waraabaa jira...",
        download: "Waraabbii Session Buufadhu",
        connected: "Hidhameera",
        disconnected: "Addaan Citeera",
        descInterpret: "Nama lama afaan adda addaa dubbataniif hiikkaa kallattii raawwata.",
        ready: "Woliin dubbachuuf qophiidha"
      },
      en: {
        title: "LIVE CONVERSATION",
        modeChat: "Chat with AI",
        modeInterpret: "Dual Speaker Interpreter",
        start: "Start Talking",
        stop: "Stop",
        user1: "Speaker 1 Lang:",
        user2: "Speaker 2 Lang:",
        voice: "AI Voice Gender:",
        female: "Female",
        male: "Male",
        recording: "Recording all communications...",
        download: "Download Full Session",
        connected: "Connected",
        disconnected: "Disconnected",
        descInterpret: "Acts as a bridge between two people speaking different languages.",
        ready: "Ready for live chat"
      },
      am: {
        title: "ቀጥታ ውይይት",
        modeChat: "ከ AI ጋር ማውራት",
        modeInterpret: "የሁለት ሰው አስተርጓሚ",
        start: "መናገር ጀምር",
        stop: "አቁም",
        user1: "ተናጋሪ 1 ቋንቋ:",
        user2: "ተናጋሪ 2 ቋንቋ:",
        voice: "የ AI ድምጽ ዓይነት:",
        female: "ሴት",
        male: "ወንድ",
        recording: "ሁሉንም ንግግሮች እየቀረጸ ነው...",
        download: "ሙሉውን ውይይት አውርድ",
        connected: "ተገናኝቷል",
        disconnected: "አልተገናኘም",
        descInterpret: "የተለያየ ቋንቋ በሚናገሩ ሁለት ሰዎች መካከል እንደ አስተርጓሚ ሆኖ ያገለግላል።",
        ready: "ለቀጥታ ውይይት ዝግጁ ነው"
      }
    };
    return (base as any)[lang] || base.en;
  };

  const t = getT(language);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      stopAllStreamsAndSockets();
    };
  }, []);

  const stopAllStreamsAndSockets = () => {
    // Stop recording processes
    if (pcmProcessorNode.current) {
        pcmProcessorNode.current.disconnect();
        pcmProcessorNode.current = null;
    }
    if (micStream.current) {
        try {
          const rawS = (micStream.current as any)._rawStream;
          if (rawS) rawS.getTracks().forEach((track: any) => track.stop());
          const actx = (micStream.current as any)._audioCtx;
          if (actx) actx.close();
        } catch (e) {}
        micStream.current.getTracks().forEach(track => track.stop());
        micStream.current = null;
    }
    if (inputAudioContext.current) {
        inputAudioContext.current.close().catch(() => {});
        inputAudioContext.current = null;
    }
    if (outputAudioContext.current) {
        outputAudioContext.current.close().catch(() => {});
        outputAudioContext.current = null;
    }
    
    // Stop Fallback recognition
    if (recognitionRef.current) {
        try {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
    }
    isFallbackListeningRef.current = false;

    // Stop socket
    if (socketRef.current) {
        socketRef.current.emit("gemini-live-stop");
        socketRef.current.disconnect();
        socketRef.current = null;
    }

    setIsConnected(false);
  };

  const startSession = async () => {
    stopAllStreamsAndSockets();
    setRecordedChunks([]); 
    userPcmChunks.current = [];
    setTranscripts([]);
    setIsFallbackActive(false);

    // Initialize clean Output Context for playing synthesized audio chunks
    inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    nextStartTimeRef.current = 0;
    
    audioOutputGainNode.current = outputAudioContext.current.createGain();
    audioOutputGainNode.current.connect(outputAudioContext.current.destination);

    try {
        const rawStream = await navigator.mediaDevices.getUserMedia(SHOTGUN_MIC_CONSTRAINTS);
        const stream = applyVoiceFocusFilter(rawStream);
        micStream.current = stream;

        // Initialize standard App Socket connection (pointing to origin server natively)
        const socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to local Socket.IO server. Launching Gemini Live session...");
            // Spin up Live API session on server securely
            const storedKey = localStorage.getItem('multisphere_gemini_apikey') || '';
            socket.emit("gemini-live-start", {
                voice: aiVoice,
                mode,
                user1Lang,
                user2Lang,
                apiKey: storedKey
            });
        });

        socket.on("gemini-live-connected", () => {
            console.log("Gemini Live Engine online!");
            setIsConnected(true);
            alert("Live is Started ");
            
            // Build script processor to capture and pipe mic audio chunks as PCM-16k
            const source = inputAudioContext.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
            pcmProcessorNode.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16[i] = inputData[i] * 32768;
                }
                const bytes = new Uint8Array(int16.buffer);
                userPcmChunks.current.push(bytes);
                
                // Stream PCM Base64 chunk to backend gateway via Socket
                socket.emit("gemini-live-audio-chunk", encode(bytes));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.current!.destination);
        });

        socket.on("gemini-live-audio", async (base64Audio) => {
            if (!outputAudioContext.current || !audioOutputGainNode.current) return;
            try {
                const binary = atob(base64Audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                setRecordedChunks(prev => [...prev, bytes]);

                const audioBuffer = await decodeAudioData(bytes, outputAudioContext.current, 24000, 1);
                const source = outputAudioContext.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioOutputGainNode.current);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.current.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
            } catch (err) {
                console.error("Audio block playback failed:", err);
            }
        });

        socket.on("gemini-live-text", (data: { role: 'user' | 'model', text: string }) => {
            setTranscripts(prev => [...prev, { role: data.role, text: data.text, timestamp: Date.now() }]);
        });

        socket.on("gemini-live-fallback-required", (reason) => {
            console.warn("Live API session rejected. Launching Hybrid Web Speech mode fallback. Reason:", reason);
            bootHybridFallback();
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

    } catch (err) {
        console.warn("Media stream or connection blocked. Resorting to safe Hybrid Web Speech local engine...");
        bootHybridFallback();
    }
  };

  // Launch browser-side smart speech fallback if the live stream requires it / fails
  const bootHybridFallback = () => {
    setIsFallbackActive(true);
    setIsConnected(true);
    setTranscripts([]);
    alert("Live is Started ");

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // @ts-ignore
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SpeechRecognitionClass();
        recog.continuous = true;
        recog.interimResults = false;
        // set active language
        recog.lang = user1Lang === 'om' ? 'om-ET' : (user1Lang === 'am' ? 'am-ET' : 'en-US');
        recognitionRef.current = recog;

        recog.onresult = async (event: any) => {
            const lastIdx = event.results.length - 1;
            const transcriptText = event.results[lastIdx][0].transcript;
            
            if (transcriptText && transcriptText.trim() !== '') {
                // Log user transcript
                setTranscripts(prev => [...prev, { role: 'user', text: transcriptText, timestamp: Date.now() }]);

                // Hand-off the text to our robust upgrade server generator
                try {
                    let prompt = "";
                    if (mode === 'interpret') {
                        prompt = `Act as an expert real-time interpreter translating from ${langNames[user1Lang]} to ${langNames[user2Lang]}. Translate this message accurately, keeping only the translation: "${transcriptText}"`;
                    } else {
                        prompt = `The user says "${transcriptText}". Provide a warm, concise response in ${langNames[user1Lang]}.`;
                    }

                    const res = await fetch("/api/gemini/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt })
                    });
                    
                    if (res.ok) {
                        const responseData = await res.json();
                        let aiResponse = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (aiResponse) {
                            aiResponse = aiResponse.replace(/\*+/g, '').trim();
                            // Log model response
                            setTranscripts(prev => [...prev, { role: 'model', text: aiResponse, timestamp: Date.now() }]);
                            // Speak out using browser text-to-speech synthesis
                            speakTextBrowser(aiResponse);
                        }
                    }
                } catch (e) {
                    console.error("Fallback translation fetch failed:", e);
                }
            }
        };

        recog.onerror = (e: any) => {
            console.warn("Recognition warning:", e);
        };

        recog.onend = () => {
            // Recur if session is still active
            if (isFallbackListeningRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) {}
            }
        };

        isFallbackListeningRef.current = true;
        recog.start();
    } else {
        const errorMsg = "WebSpeech API is not available in this browser tab. Subtitles will display in real-time.";
        setTranscripts([{ role: 'model', text: errorMsg, timestamp: Date.now() }]);
    }
  };

  const speakTextBrowser = (text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop playing previous frames
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Match chosen voice gender preference to best browser voice
        const voices = window.speechSynthesis.getVoices();
        const preferredLang = user2Lang === 'en' ? 'en' : user1Lang;
        
        const candidateVoice = voices.find(v => 
            v.lang.startsWith(preferredLang) && 
            (aiVoice === 'Kore' ? (v.name.includes("Google") || v.name.includes("female") || v.name.includes("Zira")) : (v.name.includes("Male") || v.name.includes("David")))
        ) || voices.find(v => v.lang.startsWith(preferredLang)) || voices[0];

        if (candidateVoice) {
            utterance.voice = candidateVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
  };

  const downloadSession = () => {
    if (recordedChunks.length === 0) return;
    const totalLength = recordedChunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of recordedChunks) { 
        merged.set(chunk, offset); 
        offset += chunk.length; 
    }
    const blob = createWavBlob(merged, 24000);
    const url = URL.createObjectURL(blob);
    onAddHistory('LIVE', `Finished Live ${mode === 'chat' ? 'Chat' : 'Interpretation'}`, url);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multisphere_translation_session_${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-lg md:text-xl font-black text-gray-800 uppercase">📡 {t.title}</h2>
                {isFallbackActive && (
                    <span className="text-[9px] font-black text-pink-600 tracking-wider uppercase block">
                        🛡️ Fallback Active
                    </span>
                )}
            </div>
            <div className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest ${isConnected ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                {isConnected ? t.connected : t.disconnected}
            </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button onClick={() => { setMode('chat'); stopAllStreamsAndSockets(); }} className={`flex-1 py-2.5 md:py-3 text-[10px] md:text-xs font-black rounded-xl transition-all ${mode === 'chat' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>{t.modeChat}</button>
            <button onClick={() => { setMode('interpret'); stopAllStreamsAndSockets(); }} className={`flex-1 py-2.5 md:py-3 text-[10px] md:text-xs font-black rounded-xl transition-all ${mode === 'interpret' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>{t.modeInterpret}</button>
        </div>

        {/* Configuration */}
        {!isConnected && (
            <div className="bg-gray-50 p-4 md:p-5 rounded-2xl md:rounded-3xl space-y-3 md:space-y-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                        <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400">{t.user1}</label>
                        <select value={user1Lang} onChange={(e) => setUser1Lang(e.target.value as any)} className="w-full p-2.5 md:p-3 rounded-xl border text-[10px] md:text-xs font-bold bg-white">
                            {Object.entries(langNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    {mode === 'interpret' && (
                        <div className="space-y-1">
                            <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400">{t.user2}</label>
                            <select value={user2Lang} onChange={(e) => setUser2Lang(e.target.value as any)} className="w-full p-2.5 md:p-3 rounded-xl border text-[10px] md:text-xs font-bold bg-white">
                                {Object.entries(langNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400">{t.voice}</label>
                    <div className="flex gap-2">
                        <button onClick={() => setAiVoice('Kore')} className={`flex-1 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-bold border transition-all ${aiVoice === 'Kore' ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>👩 {t.female}</button>
                        <button onClick={() => setAiVoice('Fenrir')} className={`flex-1 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-bold border transition-all ${aiVoice === 'Fenrir' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>👨 {t.male}</button>
                    </div>
                </div>
            </div>
        )}

        <div className="h-40 md:h-48 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden border-2 md:border-4 border-white shadow-2xl">
            {isConnected ? (
                <div className="flex gap-1 md:gap-1.5 items-end h-12 md:h-16">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="w-1.5 md:w-2 bg-gradient-to-t from-cyan-400 to-blue-500 rounded-full animate-bounce" 
                            style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }}></div>
                    ))}
                </div>
            ) : (
                <div className="text-5xl md:text-6xl filter grayscale opacity-20">🗣️</div>
            )}
            <p className="absolute bottom-3 md:bottom-4 text-[8px] md:text-[10px] text-white/50 font-black tracking-[0.15em] md:tracking-[0.2em] uppercase text-center px-4">
                {isConnected ? t.recording : (mode === 'interpret' ? t.descInterpret : t.ready)}
            </p>
        </div>

        {/* Transcriptions Pane */}
        {(isConnected || transcripts.length > 0) && (
            <div className="bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden flex flex-col h-64 shadow-inner">
                <div className="bg-white/50 border-b border-gray-100 px-4 py-2 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        Live Transcript
                    </span>
                    <button onClick={() => setTranscripts([])} className="text-[8px] font-black text-gray-300 uppercase hover:text-red-500 transition-colors">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar scroll-smooth">
                    {transcripts.map((entry, i) => (
                        <div key={i} className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs font-medium shadow-sm ${
                                entry.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }`}>
                                <span className="block text-[8px] opacity-60 font-black uppercase mb-1">
                                    {entry.role === 'user' ? 'You' : 'Gemini'}
                                </span>
                                {entry.text}
                            </div>
                        </div>
                    ))}
                    {transcripts.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic animate-pulse">
                            Waiting for speech...
                        </div>
                    )}
                    <div ref={transcriptEndRef} />
                </div>
            </div>
        )}

        <div className="flex flex-col gap-2 md:gap-3">
            {!isConnected ? (
                <button onClick={startSession} className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-base md:text-lg hover:bg-gray-800 transition-all shadow-xl uppercase tracking-widest active:scale-95">
                    {t.start}
                </button>
            ) : (
                <button onClick={stopAllStreamsAndSockets} className="w-full bg-red-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-base md:text-lg animate-pulse shadow-xl uppercase tracking-widest">
                    {t.stop}
                </button>
            )}

            {recordedChunks.length > 0 && !isConnected && (
                <button onClick={downloadSession} className="w-full bg-blue-50 text-blue-700 py-3 md:py-4 rounded-xl md:rounded-2xl font-black border-2 border-blue-100 flex items-center justify-center gap-2 transition-all hover:bg-blue-100 text-xs md:text-sm">
                    💾 {t.download}
                </button>
            )}
        </div>
    </div>
  );
};

export default LiveSection;
