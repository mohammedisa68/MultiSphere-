
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';

interface ScreenRecorderProps {
  language: Language;
  isRecording: boolean;
  isInitializing?: boolean;
  recordingMode: 'screen' | 'camera';
  facingMode: 'user' | 'environment';
  setFacingMode: (mode: 'user' | 'environment') => void;
  videoUrl: string | null;
  recordingTime: number;
  liveStream: MediaStream | null;
  onStart: (mode?: 'screen' | 'camera', filter?: string) => void;
  onStop: () => void;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

type FilterMode = 'none' | 'beauty' | 'lowlight' | 'portrait' | 'cyberpunk' | 'vhs' | 'hologram' | 'cinematic' | 'lightning' | 'particles' | 'neon' | 'glitch';

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ 
  language, 
  isRecording, 
  isInitializing,
  recordingMode, 
  facingMode, 
  setFacingMode,
  videoUrl, 
  recordingTime, 
  liveStream,
  onStart, 
  onStop,
  onAddHistory
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('none');
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let internalStream: MediaStream | null = null;
    const startPreview = async () => {
      // Don't start a new preview if we already have a liveStream, if we're recording, or if we're initializing
      if (recordingMode === 'camera' && !isRecording && !liveStream && !isInitializing) {
        try {
          internalStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 } 
            }
          });
          if (previewRef.current) {
            previewRef.current.srcObject = internalStream;
          }
        } catch (e) {
          console.warn("Preview failed (camera may be in use)", e);
        }
      }
    };

    if (liveStream) {
        if (previewRef.current) previewRef.current.srcObject = liveStream;
    } else if (isInitializing) {
        if (previewRef.current) previewRef.current.srcObject = null;
    } else {
        startPreview();
    }

    return () => {
      if (internalStream) internalStream.getTracks().forEach(t => t.stop());
    };
  }, [recordingMode, facingMode, isRecording, liveStream, isInitializing]);

  const t = {
    om: {
      title: "Waraabbii (Video)",
      desc: "Appii kana ykn kaameraa kee fayyadamuun waraabi.",
      start: "Waraabbii Jalqabi",
      stop: "Dhaabi",
      download: "Video Buufadhu",
      error: "Dogoggorri uumameera. Maaloo irra deebi'ii yaali.",
      recording: "Waraabaa jira...",
      time: "Yeroo:",
      modeScreen: "Screen",
      modeCamera: "Kaameraa",
      beauty: "Miidhagdu",
      night: "Halkan",
      portrait: "Portrait",
      cyber: "Cyberpunk",
      vhs: "Kalaala",
      holo: "Hologram",
      cinematic: "Cinematic",
      lightning: "Electric",
      particles: "Snow",
      neon: "Neon",
      glitch: "Glitch",
      switch: "Kaameraa Jijjiiri"
    },
    en: {
      title: "Recorder (Video)",
      desc: "Record this app or your camera.",
      start: "Start Recording",
      stop: "Stop Recording",
      download: "Download Video",
      error: "An error occurred. Please try again.",
      recording: "Recording...",
      time: "Time:",
      modeScreen: "Screen",
      modeCamera: "Camera",
      beauty: "Beauty+",
      night: "Low Light",
      portrait: "Portrait",
      cyber: "Cyberpunk",
      vhs: "Retro VHS",
      holo: "Hologram",
      cinematic: "Cinematic",
      lightning: "VFX Lightning",
      particles: "Particles",
      neon: "Neon Glow",
      glitch: "Glitch Art",
      switch: "Switch Camera"
    },
    am: {
      title: "መቅጃ (ቪዲዮ)",
      desc: "ይህንን መተግበሪያ ወይም ካሜራዎን ይቅረጹ።",
      start: "መቅዳት ጀምር",
      stop: "መቅዳት አቁም",
      download: "ቪዲዮውን አውርድ",
      error: "ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።",
      recording: "በመቅዳት ላይ...",
      time: "ጊዜ:",
      modeScreen: "ስክሪን",
      modeCamera: "ካሜራ",
      beauty: "ውበት+",
      night: "ምሽት",
      portrait: "ፖርትሬት",
      cyber: "ሳይበርፓንክ",
      vhs: "ቪኤችኤስ",
      holo: "ሆሎግራም",
      cinematic: "ሲኒማቲክ",
      lightning: "ኤሌክትሪክ",
      particles: "ቅንጣቶች",
      neon: "ኒዮን",
      glitch: "ግሊች",
      switch: "ካሜራ ቀይር"
    }
  }[language] || {
    title: "Recorder (Video)",
    desc: "Record your screen or camera.",
    start: "Start Recording",
    stop: "Stop Recording",
    download: "Download Video",
    error: "Error",
    recording: "Recording...",
    time: "Time:",
    modeScreen: "Screen",
    modeCamera: "Camera",
    beauty: "Beauty Mode",
    switch: "Switch Camera"
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const effects = [
    { id: 'none', label: 'OFF', icon: '🚫' },
    { id: 'beauty', label: t.beauty, icon: '✨' },
    { id: 'cinematic', label: t.cinematic, icon: '🎬' },
    { id: 'lightning', label: t.lightning, icon: '⚡' },
    { id: 'particles', label: t.particles, icon: '❄️' },
    { id: 'neon', label: t.neon, icon: '🌈' },
    { id: 'glitch', label: t.glitch, icon: '👾' },
    { id: 'cyberpunk', label: t.cyber, icon: '🏙️' },
    { id: 'hologram', label: t.holo, icon: '📡' },
    { id: 'vhs', label: t.vhs, icon: '📼' },
    { id: 'lowlight', label: t.night, icon: '🌙' },
    { id: 'portrait', label: t.portrait, icon: '👤' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-12 rounded-[2.5rem] md:rounded-[4.5rem] border border-white shadow-2xl space-y-6 md:space-y-10">
        <div className="text-center space-y-3">
          <div className="w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden mb-4 relative shadow-2xl overflow-hidden group">
            {recordingMode === 'camera' ? (
                <video 
                    ref={previewRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-all duration-700 ${
                        activeFilter === 'beauty' ? 'brightness-110 contrast-105 saturate-[1.1] blur-[0.4px]' : 
                        activeFilter === 'lowlight' ? 'brightness-140 contrast-125 saturate-[1.3]' :
                        activeFilter === 'portrait' ? 'contrast-115 saturate-[1.1]' : 
                        activeFilter === 'cyberpunk' ? 'hue-rotate-90 contrast-125 saturate-200 brightness-110' :
                        activeFilter === 'vhs' || activeFilter === 'glitch' ? 'sepia-[0.3] contrast-90 brightness-105 saturate-[1.2]' :
                        activeFilter === 'hologram' ? 'grayscale opacity-80 brightness-150 contrast-150' : 
                        activeFilter === 'cinematic' ? 'contrast-125 brightness-95 saturate-[0.8] sepia-[0.1]' :
                        activeFilter === 'neon' ? 'brightness-110 contrast-150 saturate-[2]' : ''
                    }`}
                    style={{ 
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        filter: activeFilter === 'hologram' ? 'url(#holo-glitch)' : undefined 
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                    <span className={`text-5xl md:text-7xl ${isRecording ? 'animate-pulse' : ''}`}>🖥️</span>
                </div>
            )}

            {/* SVG Filters */}
            <svg width="0" height="0" className="absolute">
                <filter id="holo-glitch">
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
                    <feMorphology operator="dilate" radius="1" />
                </filter>
            </svg>

            {isRecording && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/20">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE REC</span>
                <span className="text-[10px] font-mono text-red-400 ml-2">{formatTime(recordingTime)}</span>
              </div>
            )}

            {/* AR Elements (Simulated in Preview) */}
            {recordingMode === 'camera' && (
                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                    {/* VHS Static Effect */}
                    {(activeFilter === 'vhs' || activeFilter === 'glitch') && (
                        <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uWUicS3Ze/giphy.gif')] opacity-10 mix-blend-screen pointer-events-none"></div>
                    )}
                    
                    {activeFilter === 'glitch' && (
                        <div className="absolute inset-0 animate-pulse opacity-20 bg-cyan-400 mix-blend-overlay"></div>
                    )}

                    {/* Cyberpunk Grid */}
                    {activeFilter === 'cyberpunk' && (
                        <div className="absolute inset-0 opacity-20">
                           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                        </div>
                    )}

                    {/* Hologram Scanlines */}
                    {activeFilter === 'hologram' && (
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none opacity-50"></div>
                    )}

                    {activeFilter === 'lightning' && (
                         <div className="absolute inset-0 overflow-hidden">
                             <motion.div 
                                animate={{ opacity: [0, 1, 0], scaleY: [1, 1.2, 1] }}
                                transition={{ duration: 0.1, repeat: Infinity, repeatDelay: Math.random() * 2 }}
                                className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-400 blur-md shadow-[0_0_20px_#60a5fa]" 
                             />
                         </div>
                    )}

                    {activeFilter === 'particles' && (
                        <div className="absolute inset-0">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -50, x: Math.random() * 500 }}
                                    animate={{ y: 800, x: (Math.random() * 500) + (Math.random() * 50 - 25) }}
                                    transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute w-1 h-1 bg-white rounded-full opacity-40"
                                />
                            ))}
                        </div>
                    )}

                    {/* Corner Markers */}
                    <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-white/60 rounded-tl-2xl"></div>
                    <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-white/60 rounded-tr-2xl"></div>
                    <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-white/60 rounded-bl-2xl"></div>
                    <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-white/60 rounded-br-2xl"></div>

                    {/* Standard Rectangular Tracking Frame */}
                    <motion.div 
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-[20%] border-2 border-white/30 rounded-lg pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    />
                </div>
            )}

            {activeFilter !== 'none' && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/20 ring-2 ring-white/10">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">{activeFilter} FX ACTIVE</span>
                </div>
            )}
          </div>

          <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">{t.title}</h3>
          
          <div className="flex justify-center gap-2">
            <button 
                onClick={() => onStart('screen')}
                disabled={isRecording}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${recordingMode === 'screen' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
            >
                {t.modeScreen}
            </button>
            <button 
                onClick={() => onStart('camera', activeFilter)}
                disabled={isRecording}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${recordingMode === 'camera' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
            >
                {t.modeCamera}
            </button>
          </div>
        </div>

        {recordingMode === 'camera' && (
            <div className={`space-y-4 transition-all ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Visual Effects</span>
                    <button 
                        onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                        className="text-[10px] font-black text-pink-600 uppercase tracking-widest flex items-center gap-2"
                    >
                        🔄 {t.switch}
                    </button>
                </div>
                
                <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 snap-x">
                    {effects.map(f => (
                        <button 
                            key={f.id}
                            onClick={() => setActiveFilter(f.id as FilterMode)}
                            className={`flex-none w-20 h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 snap-center ${
                                activeFilter === f.id 
                                ? 'bg-black text-white border-black scale-105 shadow-xl z-10' 
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span className="text-2xl">{f.icon}</span>
                            <span className="text-[8px] font-black uppercase text-center px-1 leading-tight">{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex gap-4">
          {!isRecording ? (
            <button 
              onClick={() => onStart(recordingMode, activeFilter)}
              disabled={isInitializing}
              className="flex-1 aura-btn h-14 md:h-20 shadow-xl group rounded-3xl disabled:opacity-50"
            >
              <div className="aura-effect" style={{background: 'linear-gradient(to right, #ef4444, #f87171)'}}></div>
              <div className="aura-content text-white font-black text-xs md:text-lg uppercase tracking-widest flex items-center justify-center gap-2">
                <span className={`group-hover:scale-125 transition-transform text-xl ${isInitializing ? 'animate-pulse' : ''}`}>{isInitializing ? '...' : 'REC'}</span> {isInitializing ? (language === 'om' ? 'Qophaa\'aa Jira...' : 'Initializing...') : t.start}
              </div>
            </button>
          ) : (
            <button 
              onClick={onStop}
              className="flex-1 py-4 md:py-6 bg-red-600 text-white rounded-[2rem] font-black text-xs md:text-lg uppercase tracking-widest hover:bg-red-700 shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              {t.stop}
            </button>
          )}
        </div>

        {videoUrl && (
          <div className="pt-6 md:pt-10 border-t-2 border-gray-100 animate-slide-up space-y-4 md:space-y-6">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 md:border-8 border-white bg-black aspect-video flex items-center justify-center">
              <video 
                src={videoUrl} 
                controls 
                playsInline
                className="w-full h-full object-contain" 
              />
            </div>
            <a 
              href={videoUrl} 
              download={`multisphere-${recordingMode}-record.webm`}
              onClick={() => onAddHistory('VIDEO', `Recorded ${recordingMode} video (${recordingTime}s)`, videoUrl)}
              className="aura-btn w-full h-12 md:h-16"
            >
              <div className="aura-effect" style={{background: 'linear-gradient(to right, #3b82f6, #60a5fa)'}}></div>
              <div className="aura-content text-white font-black text-[10px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                <span>📥</span> {t.download}
              </div>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenRecorder;
