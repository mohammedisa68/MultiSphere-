
/**
 * MULTI_SPHERE App - Fuula guddaa fi bu'uura appichaa
 * Appiin kun tajaajiloota AI mara walitti qaba.
 */

import React, { useState, useEffect, useRef } from 'react';
import LoginOverlay from './components/LoginOverlay';
import TTSSection from './components/TTSSection';
import ImageSection from './components/ImageSection';
import VideoSection from './components/VideoSection';
import LiveSection from './components/LiveSection';
import WalletSection from './components/WalletSection';
import ShareAwardButton from './components/ShareAwardButton';
import HelpChatbot from './components/HelpChatbot';
import ProfileSection from './components/ProfileSection';
import SocialLocationSection from './components/SocialLocationSection';
import ReligiousPracticeSection from './components/ReligiousPracticeSection';
import ScreenRecorder from './components/ScreenRecorder';
import VoiceCallSection from './components/VoiceCallSection';
import MultimodalSection from './components/MultimodalSection';
import HomeSection from './components/HomeSection';
import { Language, User } from './types';

import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  // Haala namni itti galmaa'u (User State)
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('multisphere_language');
    return (saved === 'om' || saved === 'en' || saved === 'am') ? saved as Language : 'om';
  });
  const [activeTab, setActiveTab] = useState<'home' | 'tts' | 'image' | 'video' | 'live' | 'wallet' | 'profile' | 'social' | 'religious-practice' | 'recorder' | 'voice' | 'multimodal'>('home');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Seenaa fayyadamaa (History) kuusuu
  useEffect(() => {
    localStorage.setItem('multisphere_language', language);
  }, [language]);

  const addToHistory = (type: User['history'][0]['type'], detail: string, mediaUrl?: string) => {
    if (!user) return;
    const newItem: User['history'][0] = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      detail: typeof detail === 'string' ? detail : String(detail),
      timestamp: new Date().toISOString(),
      mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : undefined
    };
    
    // Tarree seenaa haara'omsuu
    const historyLimit = isGuest ? 20 : 35;
    const updatedHistory = [newItem, ...(user.history || [])].slice(0, historyLimit);
    const updatedUser = { ...user, history: updatedHistory };
    if (!updatedUser.stats) {
      updatedUser.stats = { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 };
    }
    
    // Akkaataa tajaajilaatiin lakkoofsa (stats) dabaluu
    if (type === 'TTS') updatedUser.stats.ttsCount++;
    if (type === 'IMAGE') updatedUser.stats.imagesCount++;
    if (type === 'VIDEO') updatedUser.stats.videosCount++;
    if (type === 'QURAN') updatedUser.stats.quranAyahsCount++;

    setUser(updatedUser);
    
    // Mana kuusaa keessa galchuu (Local Storage)
    try {
      const storageKey = `multisphere_history_${user.username || 'guest'}`;
      const statsKey = `multisphere_stats_${user.username || 'guest'}`;
      
      const historyToSave = updatedHistory.map(item => {
        if (item.mediaUrl && item.mediaUrl.length > 50000) {
          return { ...item, mediaUrl: undefined }; 
        }
        return item;
      });

      localStorage.setItem(storageKey, JSON.stringify(historyToSave));
      localStorage.setItem(statsKey, JSON.stringify(updatedUser.stats));
    } catch (e) {
      console.error("Kuusuu irratti dogoggorri uumame:", e);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);

  // Waraabbii fuula (Screen Recorder) - Mallattoo tajaajilaa
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingInitializing, setIsRecordingInitializing] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [recordingMode, setRecordingMode] = useState<'screen' | 'camera'>('screen');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async (preferredMode?: 'screen' | 'camera', filter: string = 'none') => {
    setIsRecordingInitializing(true);
    // Explicitly stop any existing streams to free the hardware
    if (liveStream) {
       liveStream.getTracks().forEach(track => track.stop());
       setLiveStream(null);
    }
    
    // Give a small moment for OS to release the hardware
    await new Promise(r => setTimeout(r, 100));

    try {
      const getDisplayMedia = 
        navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices) || 
        (navigator as any).getDisplayMedia?.bind(navigator);

      let rawStream: MediaStream | null = null;
      let micStream: MediaStream | null = null;
      let combinedStream: MediaStream;
      let mode: 'screen' | 'camera' = 'screen';

      if (preferredMode === 'camera') {
        rawStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }, 
          audio: true
        });
        mode = 'camera';
      } else if (getDisplayMedia) {
        try {
          rawStream = await getDisplayMedia({ 
            video: { 
              cursor: "always",
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } as any, 
            audio: true
          });
          mode = 'screen';
          
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e) {
            console.warn("Microphone access denied.");
          }
        } catch (e) {
          rawStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: facingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }, 
            audio: true 
          });
          mode = 'camera';
        }
      } else {
        rawStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }, 
          audio: true 
        });
        mode = 'camera';
      }

      if (!rawStream) throw new Error("Could not acquire media stream.");

      let isActive = true;
      let filterVideo: HTMLVideoElement | null = null;

      // Filter Processing if camera and filter active
      let finalStream = rawStream;
      if (mode === 'camera' && filter !== 'none') {
        const video = document.createElement('video');
        filterVideo = video;
        video.srcObject = rawStream;
        video.muted = true;
        await video.play();
        
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        
        let animationId: number;
        let particles: {x: number, y: number, r: number, vy: number}[] = [];
        for(let i=0; i<50; i++) particles.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*2+1, vy: Math.random()*2+1});

        const process = () => {
          if (!isActive) return;
          if (ctx && video.readyState >= 2) {
            ctx.save();
            
            // Base Filters
            if (filter === 'beauty') {
              ctx.filter = 'brightness(1.1) contrast(1.05) saturate(1.1) blur(0.4px)';
            } else if (filter === 'lowlight') {
              ctx.filter = 'brightness(1.4) contrast(1.2) saturate(1.3)';
            } else if (filter === 'portrait') {
              ctx.filter = 'contrast(1.15) saturate(1.1)';
            } else if (filter === 'cyberpunk') {
              ctx.filter = 'hue-rotate(90deg) contrast(1.25) saturate(2) brightness(1.1)';
            } else if (filter === 'vhs' || filter === 'glitch') {
              ctx.filter = 'sepia(0.3) contrast(0.9) brightness(1.05) saturate(1.2)';
            } else if (filter === 'hologram') {
              ctx.filter = 'grayscale(1) brightness(1.5) contrast(1.5) opacity(0.8)';
            } else if (filter === 'cinematic') {
              ctx.filter = 'contrast(1.25) brightness(0.9) saturate(0.8) sepia(0.1)';
            } else if (filter === 'neon') {
              ctx.filter = 'brightness(1.1) contrast(1.5) saturate(2)';
            }

            // Drawing the video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Overlay Effects
            if (filter === 'cinematic') {
                // Vignette
                const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/1.2);
                grad.addColorStop(0.5, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Grain
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                for(let i=0; i<1000; i++) ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1, 1);
            }

            if (filter === 'lightning' && Math.random() > 0.9) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#60a5fa';
                ctx.beginPath();
                let lx = Math.random() * canvas.width;
                ctx.moveTo(lx, 0);
                for(let i=0; i<10; i++) {
                    lx += (Math.random() - 0.5) * 50;
                    ctx.lineTo(lx, i * (canvas.height/10));
                }
                ctx.stroke();
            }

            if (filter === 'particles') {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                    ctx.fill();
                    p.y += p.vy;
                    if(p.y > canvas.height) p.y = -10;
                });
            }

            if (filter === 'neon') {
                ctx.strokeStyle = 'cyan';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'cyan';
                ctx.strokeRect(20, 20, canvas.width-40, canvas.height-40);
                // Scanline
                ctx.fillStyle = 'rgba(255,0,255,0.05)';
                for(let i=0; i<canvas.height; i+=10) ctx.fillRect(0, i, canvas.width, 2);
            }

            if (filter === 'glitch' && Math.random() > 0.9) {
                const sliceY = Math.random() * canvas.height;
                const sliceH = Math.random() * 50 + 20;
                const offset = Math.random() * 40 - 20;
                ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, offset, sliceY, canvas.width, sliceH);
                ctx.fillStyle = 'rgba(255,0,0,0.1)';
                ctx.fillRect(0, sliceY, canvas.width, sliceH);
            }

            if (filter === 'portrait') {
                // Subtle rectangular border instead of circular mask
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 100;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }
            
            if (filter === 'vhs') {
               ctx.fillStyle = 'rgba(255,255,255,0.05)';
               for(let i=0; i<canvas.height; i+=4) ctx.fillRect(0, i, canvas.width, 1);
            }
            
            if (filter === 'hologram') {
               ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
               for(let i=0; i<canvas.height; i+=4) ctx.fillRect(0, i, canvas.width, 1);
               if (Math.random() > 0.95) {
                   ctx.drawImage(canvas, Math.random() * 10 - 5, 0);
               }
            }

            ctx.restore();
            animationId = requestAnimationFrame(process);
          }
        };
        animationId = requestAnimationFrame(process);
        
        const captureStream = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
        if (!captureStream) throw new Error("CaptureStream not supported by this browser.");
        
        const canvasStream = captureStream.call(canvas, 30);
        finalStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...rawStream.getAudioTracks()
        ]);

        // Cleanup function for when recording stops
        const originalOnStop = mediaRecorderRef.current?.onstop;
        const onStopWrapper = () => {
             cancelAnimationFrame(animationId);
             video.pause();
             video.srcObject = null;
             if (originalOnStop) (originalOnStop as any)();
        };
        // This is a bit tricky because mediaRecorder hasn't been initialized yet.
        // I'll handle it in the mediaRecorder initialization.
      }

      if (mode === 'screen' && micStream) {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const destination = audioCtx.createMediaStreamDestination();
          
          if (rawStream.getAudioTracks().length > 0) {
            const systemSource = audioCtx.createMediaStreamSource(rawStream);
            systemSource.connect(destination);
          }
          
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(destination);
          
          combinedStream = new MediaStream([
            ...rawStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
          ]);
      } else {
          combinedStream = finalStream;
      }

      setRecordingMode(mode);
      setLiveStream(combinedStream);
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      
      const onStopBase = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        if (rawStream) rawStream.getTracks().forEach(track => track.stop());
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        setLiveStream(null);
        setIsRecording(false);
      };

      mediaRecorder.onstop = () => {
        isActive = false;
        if (filterVideo) {
           filterVideo.pause();
           filterVideo.srcObject = null;
        }
        onStopBase();
      };
      mediaRecorder.start(1000); // 1s timeslices
      setIsRecording(true);
      setIsRecordingInitializing(false);
      setVideoUrl(null);
    } catch (err) {
      console.error("Recording Error:", err);
      setIsRecordingInitializing(false);
      alert(`Recording Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) mediaRecorderRef.current.stop(); };

  const tabs = ['home', 'multimodal', 'voice', 'religious-practice', 'recorder', 'tts', 'image', 'video', 'live', 'social', 'wallet', 'profile'] as const;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const index = tabs.indexOf(activeTab as any);
      if (index !== -1) {
        const targetScrollLeft = index * container.offsetWidth;
        // Only scroll if we are not already close to the target
        if (Math.abs(container.scrollLeft - targetScrollLeft) > 5) {
          isProgrammaticScrollRef.current = true;
          container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
          
          // Use a slightly longer timeout to ensure smooth scroll finishes before re-enabling scroll handler
          if ((window as any)._scrollTimer) clearTimeout((window as any)._scrollTimer);
          (window as any)._scrollTimer = setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 800);
        }
      }
    }
  }, [activeTab]);

  const handleScroll = () => {
    if (scrollContainerRef.current && !isProgrammaticScrollRef.current) {
      const container = scrollContainerRef.current;
      // Use a more relaxed index calculation to avoid jitter
      const index = Math.round(container.scrollLeft / container.offsetWidth);
      const newTab = tabs[index];
      
      if (newTab && newTab !== activeTab) {
        setActiveTab(newTab as any);
      }
    }
  };

  useEffect(() => {
    // Session persistent check from local storage (Backend auth manages session in LoginOverlay)
    const saved = localStorage.getItem('multisphere_wallet_session');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        if (!userData.history) Object.assign(userData, { history: [] });
        if (!userData.stats) Object.assign(userData, { stats: { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 } });
        setUser(userData);
      } catch (e) {}
    }
    setIsInitializing(false);
  }, []);

  const handleLogout = async () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('multisphere_wallet_session');
    setActiveTab('home');
  };

  const handleFreeLogin = (guestUser: User) => {
    setUser({ ...guestUser, bio: guestUser.bio || "Guest Explorer 🌍", walletBalance: guestUser.walletBalance || 100, history: guestUser.history || [], stats: guestUser.stats || { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 } });
    setIsGuest(true);
    setIsInitializing(false);
  };

  const getT = (lang: Language) => {
    const content = {
      om: {
        welcome: "Baga Nagaan Dhuftan",
        logout: "Ba'i",
        tabs: {
          home: "Fuula Duraa", multimodal: "MultiSphere AI", 'religious-practice': "Religious",
          voice: "Voice Call", recorder: "Waraabbii", tts: "Sagalee & Barreessi", image: "Suuraa", video: "Uumi Fiidiyoo",
          live: "Live", social: "Social & GPS", wallet: "Wallet", profile: "Profile"
        },
        footer: "MULTI_SPHERE - Many services one Sphere @ 2026",
        marquee: "MULTI_SPHERE - Tajaajila baay'ee Sphere tokko keessatti 《Appii Mo'atama Hin Qabne》",
        homeTitle: "MULTI_SPHERE",
        startBtn: "Jalqabi"
      },
      en: {
        welcome: "Welcome",
        logout: "Logout",
        tabs: {
          home: "Home", multimodal: "MultiSphere AI", 'religious-practice': "Religious",
          voice: "Voice Call", recorder: "Recorder", tts: "TTS & STT", image: "Image", video: "Video Gen",
          live: "Live", social: "Social & GPS", wallet: "Wallet", profile: "Profile"
        },
        footer: "MULTI_SPHERE - Many services one Sphere @ 2026",
        marquee: "MULTI_SPHERE - Many services one Sphere 《Invincible App》",
        homeTitle: "MULTI_SPHERE",
        startBtn: "Get Started"
      },
      am: {
        welcome: "እንኳን ደህና መጡ",
        logout: "ውጣ",
        tabs: {
          home: "መጀመሪያ", multimodal: "MultiSphere AI", 'religious-practice': "ኃይማኖታዊ",
          voice: "የድምጽ ጥሪ", recorder: "መቅጃ", tts: "ጽሑፍ ወደ ድምጽ", image: "ምስል", video: "ቪዲዮ ፈጠራ",
          live: "ቀጥታ", social: "ማህበራዊ", wallet: "ዋሌት", profile: "መገለጫ"
        },
        footer: "MULTI_SPHERE - ብዙ አገልግሎቶች በአንድ ቦታ @ 2026",
        marquee: "MULTI_SPHERE - ብዙ አገልግሎቶች በአንድ ቦታ 《የማይበገር መተግበሪያ》",
        homeTitle: "MULTI_SPHERE",
        startBtn: "ጀምር"
      }
    };
    return (content as any)[lang] || content.en;
  };

  const t = getT(language);

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center multisphere-diagonal-bg"><div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginOverlay language={language} setLanguage={setLanguage} onLogin={handleFreeLogin} />;

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 multisphere-diagonal-bg relative overflow-x-hidden overflow-y-auto selection:bg-pink-200">
      <header className="bg-black/90 backdrop-blur-2xl text-white p-3 md:p-4 shadow-2xl sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-2 md:px-0">
          <div className="flex items-center space-x-2 md:space-x-3">
            <button onClick={handleLogout} className="text-[10px] bg-red-600 px-3 py-1.5 rounded-xl font-black uppercase tracking-widest">{t.logout}</button>
            <h1 className="text-lg md:text-xl font-black tracking-tighter">MULTI_SPHERE</h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {isRecording && <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/50 animate-pulse"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-[8px] font-black text-red-500 uppercase tracking-widest">REC</span></div>}
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="bg-black/50 text-white text-[10px] rounded-lg px-2 py-1 outline-none">
              <option value="om">OM</option>
              <option value="en">EN</option>
              <option value="am">AM</option>
            </select>
            <button onClick={() => setActiveTab('profile')} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50"><img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /></button>
          </div>
        </div>
      </header>

      <nav className="bg-white/80 backdrop-blur-2xl sticky top-[56px] md:top-[68px] z-40 border-b border-gray-200/30">
        <div className="max-w-6xl mx-auto flex overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((key) => (
            <button key={key} onClick={() => setActiveTab(key as any)} className={`flex-none py-3 px-5 text-[10px] font-black uppercase tracking-wider border-b-4 ${activeTab === key ? 'border-pink-600 text-pink-700' : 'border-transparent text-gray-500'}`}>{t.tabs[key] || key}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-2 md:p-6 mb-20">
        <div className="max-w-6xl mx-auto relative group">
          <div 
            ref={scrollContainerRef} 
            onScroll={handleScroll} 
            className="relative glass-panel rounded-[2rem] md:rounded-[3rem] p-1 md:p-2 shadow-2xl min-h-[500px] z-10 overflow-x-auto flex snap-x snap-mandatory no-scrollbar"
            style={{ scrollBehavior: isProgrammaticScrollRef.current ? 'smooth' : 'auto' }}
          >
            <HomeSection t={t} user={user} setActiveTab={setActiveTab} language={language} />
            <div className="min-w-full snap-start overflow-y-auto"><div className="p-4 md:p-8"><MultimodalSection language={language} onAddHistory={addToHistory} /></div></div>
            <div className="min-w-full snap-start overflow-y-auto"><VoiceCallSection user={user} language={language} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><ReligiousPracticeSection language={language} user={user} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><ScreenRecorder language={language} isRecording={isRecording} isInitializing={isRecordingInitializing} recordingMode={recordingMode} facingMode={facingMode} setFacingMode={setFacingMode} videoUrl={videoUrl} recordingTime={recordingTime} liveStream={liveStream} onStart={startRecording} onStop={stopRecording} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><TTSSection language={language} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><ImageSection language={language} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><VideoSection language={language} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><LiveSection language={language} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><SocialLocationSection user={user} language={language} onUpdate={(u) => setUser(u)} onAddHistory={addToHistory} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><WalletSection language={language} /></div>
            <div className="min-w-full snap-start overflow-y-auto"><ProfileSection user={user} language={language} onUpdate={(u) => setUser(u)} /></div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-sky-400 to-blue-500 backdrop-blur-3xl z-[100] border-t border-white/30 flex items-center px-4 overflow-hidden">
        <HelpChatbot language={language} />
        <div className="flex-1 mx-4 overflow-hidden relative h-full flex items-center pointer-events-none">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
              className="whitespace-nowrap flex items-center"
            >
              <span className="text-[12px] md:text-sm font-black text-white uppercase tracking-[0.6em] px-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] italic select-none opacity-40">
                {t.marquee}
              </span>
              <span className="text-[12px] md:text-sm font-black text-white uppercase tracking-[0.6em] px-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] italic select-none opacity-40">
                {t.marquee}
              </span>
            </motion.div>
        </div>
        <ShareAwardButton language={language} />
      </footer>

      <style>{`
        @keyframes rotate-aura { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
