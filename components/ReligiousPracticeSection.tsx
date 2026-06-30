
import React, { useState, useEffect, useRef } from 'react';
import { Language, Surah, Ayah, QuranMode, User } from '../types';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface ReligiousPracticeSectionProps {
  language: Language;
  user: User;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

const ROBOT_AVATAR = "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=200&h=200&fit=crop";

const ReligiousPracticeSection: React.FC<ReligiousPracticeSectionProps> = ({ language, user, onAddHistory }) => {
  const [religion, setReligion] = useState<'Islamic' | 'Protestant' | 'Catholic' | 'Orthodox'>('Islamic');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(7);
  const [mode, setMode] = useState<QuranMode>('learning');
  
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [turn, setTurn] = useState<'user' | 'ai'>('user');
  const [isLoading, setIsLoading] = useState(false);

  // Christian Section State
  const [dailyGuidance, setDailyGuidance] = useState<string | null>(null);
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);

  // Faith Bridge AI State
  const [faithQuery, setFaithQuery] = useState('');
  const [faithResponse, setFaithResponse] = useState<string | null>(null);
  const [isAskingFaith, setIsAskingFaith] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "KALAQA AMANTAA",
        islamicTitle: "MULTI_SPHERE QURAN",
        learningMode: "Barachuu (AI Dura)",
        practiceMode: "Mudaarasaa (User Dura)",
        startBtn: "Qiraatii Jalqabi",
        stopBtn: "Dhaabi",
        recite: "Qara'aa jira...",
        reciteNow: "Amma Dubbisi",
        aiReciting: "Multi_Sphere AI dubbisaa jira...",
        download: "Download",
        save: "Store",
        delete: "Delete",
        finish: "Jazakumullah! Xumurameera.",
        recordingLabel: "Waraabbii Kee:",
        reciterLabel: "Qari'ii Filadhu",
        getGuidance: "Gorsa Guyyaa Argadhu",
        guidanceLoading: "AI Xiinxalaa jira...",
        audioBible: "Kitaaba Qulqulluu Sagalee",
        bibleResources: "Madda Kitaaba Qulqulluu Sagalee (Faith Comes By Hearing)",
        dailyVerse: "Luqisii Guyyaa (AI)"
      },
      en: {
        title: "RELIGIOUS PRACTICE",
        islamicTitle: "MULTI_SPHERE QURAN",
        learningMode: "Learning (AI First)",
        practiceMode: "Practice (User First)",
        startBtn: "Start Recitation",
        stopBtn: "Stop",
        recite: "Reciting...",
        reciteNow: "Recite Now",
        aiReciting: "Multi_Sphere AI Reciting...",
        download: "Download",
        save: "Store",
        delete: "Delete",
        finish: "Jazakumullah! Finished.",
        recordingLabel: "Your Recording:",
        reciterLabel: "Select Reciter",
        getGuidance: "Get Daily AI Guidance",
        guidanceLoading: "AI Thinking...",
        audioBible: "Audio Bible Resources",
        bibleResources: "Faith Comes By Hearing Audio resources",
        dailyVerse: "Daily AI Verse/Guidance"
      },
      am: {
        title: "የኃይማኖት ተግባራት",
        islamicTitle: "MULTI_SPHERE ቁርአን",
        learningMode: "መማሪያ (በAI)",
        practiceMode: "ልምምድ (በተጠቃሚ)",
        startBtn: "መቅራት ጀምር",
        stopBtn: "አቁም",
        recite: "በመቅራት ላይ...",
        reciteNow: "አሁን ቅራ",
        aiReciting: "AI በመቅራት ላይ...",
        download: "አውርድ",
        save: "አስቀምጥ",
        delete: "ሰርዝ",
        finish: "ጀዛኩሙላህ! ተጠናቋል::",
        recordingLabel: "የእርስዎ ቅጂ:",
        reciterLabel: "ቃሪእ ይምረጡ",
        getGuidance: "ዕለታዊ ምክር አግኝ",
        guidanceLoading: "በማሰብ ላይ...",
        audioBible: "የመጽሐፍ ቅዱስ ድምፅ",
        bibleResources: "የመጽሐፍ ቅዱስ ድምፅ ምንጮች",
        dailyVerse: "የዕለቱ ጥቅስ (AI)"
      }
    };
    return (base as any)[lang] || base.en;
  };
  const t = getT(language);

  useEffect(() => {
    fetch('/api/quran/surahs')
      .then(r => {
        if (!r.ok) throw new Error("Failed to load surahs proxy");
        return r.json();
      })
      .then(d => setSurahs(d.data))
      .catch(err => console.error("Quran surahs fetch failed:", err));
  }, []);

  const getDailyGuidance = async () => {
    setIsGeneratingGuidance(true);
    try {
      const prompt = `Provide a short, uplifting daily guidance or bible verse relevant to a ${religion} believer. 
      Help them stay positive and faithful. 
      Language: ${language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English'}.`;
      
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          prompt
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate guidance");
      }
      const response = await res.json();
      setDailyGuidance(response.text || "Grace be with you.");
      onAddHistory('RELIGIOUS', `Received Daily ${religion} Guidance`);
    } catch (e: any) {
      console.warn("Guidance generation fell back with error:", e);
      // Beautiful supportive fallback
      let fallbackText = "";
      if (religion === "Islamic") {
        fallbackText = language === 'om' ? "Inni nama danda'aadha. Silaa Inni hundaa beekaadha. Guyyaa barakaa fi nagaa qabu siif haa ta'u. (Alhamdulillah!) [Offline Mode]" :
                       language === 'am' ? "የአላህ እዝነትና ሰላም በእርስዎ ላይ ይሁን:: ሁሌም በአላህ እመኑ; እርሱ ሁሉንም ሰሚና አዋቂ ነው:: [የመስመር ውጭ]" :
                       "Indeed, with hardship comes ease. Trust in Allah, for He is the best of planners. May your day be blessed with peace and harmony. [Offline Mode]";
      } else {
        fallbackText = language === 'om' ? "Hojiin Gooftaa hundi yeroo qaba. Abdiin kee hin badin; jaalallii fi eebbi Waaqayyoo sii wajjin haa ta'u. [Offline Mode]" :
                       language === 'am' ? "የእግዚአብሔር ሥራ ሁሉ የራሱ ጊዜ አለው:: ተስፋህ አይቁረጥ; የእግዚአብሔር ሰላም እና ፍቅር ከእርስዎ ጋር ይሁን:: [የመስመር ውጭ]" :
                       "Trust in the Lord with all your heart, and lean not on your own understanding; in all your ways acknowledge Him, and He will make your paths straight. [Offline Mode]";
      }
      setDailyGuidance(fallbackText);
      onAddHistory('RELIGIOUS', `Received Daily ${religion} Guidance (Offline)`);
    } finally {
      setIsGeneratingGuidance(false);
    }
  };

  const handleAskFaith = async () => {
    if (!faithQuery.trim()) return;
    setIsAskingFaith(true);
    setFaithResponse(null);
    try {
      const langName = language === 'om' ? 'Afaan Oromo' : language === 'am' ? 'Amharic' : 'English';
      const prompt = `You are an expert AI on ${religion} teachings. 
      Answer the following question in ${langName}: "${faithQuery}"
      Keep the answer respectful, accurate, and faithful to ${religion} traditions.`;

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          prompt
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get answer");
      }
      const data = await res.json();
      setFaithResponse(data.text);
      onAddHistory('RELIGIOUS', `Asked Faith AI: ${faithQuery.substring(0, 30)}...`);
    } catch (e: any) {
      console.warn("Faith question fell back with error:", e);
      // Smart culturally relevant offline answers for frequent questions
      let fallbackText = "";
      const queryLower = faithQuery.toLowerCase();
      if (religion === "Islamic") {
        if (queryLower.includes("salah") || queryLower.includes("prayer") || queryLower.includes("salaata")) {
          fallbackText = language === 'om' ? "Salaanni utubaa amantiiti. Guyyaatti yeroo shan salaatuun dhiphina irraa nama fageessa, qalbii nama haara'oomsa." :
                         language === 'am' ? "ሰላት የኢስላም ምሰሶ ነው:: በቀን አምስት ጊዜ መስገድ የአዕምሮ እረፍት እና የአላህን ቅርበት ያስገኛል::" :
                         "Salah (prayer) is the second pillar of Islam and a direct connection between you and Allah. Keeping up with the five daily prayers cleanses the soul.";
        } else {
          fallbackText = language === 'om' ? "Gaffii keetiif: Amantiin Islaamaa nagaa, obsaa fi jaalala jireenyaa barsiisa. Nyaata, dhugaatii fi amala gaarii garsiisuun barbaachisaadha. [Offline/Local Guidance]" :
                         language === 'am' ? "ለጥያቄዎ: የኢስላማዊ አስተምህሮቶች ሁልጊዜም እውነትን፣ ሰላምን፣ መልካም ባህሪን እና ትዕግስትን ያበረታታሉ:: [መስመር ውጭ አስተያየት]" :
                         "Regarding your question: Islamic traditions emphasize peace, ethical conduct, seeking knowledge, and compassion toward all creations. [Offline/Local Guidance]";
        }
      } else {
        if (queryLower.includes("love") || queryLower.includes("jaalala") || queryLower.includes("peace")) {
          fallbackText = language === 'om' ? "Jaalalli hunda caala. 'Hundumaa caalaa wal jaaladhaa, jaalalli cubbuu baay'ee sababa haguuguuf.'" :
                         language === 'am' ? "ፍቅር ከሁሉ ይበልጣል:: 'ከሁሉ በፊት እርስ በርሳችሁ አጥብቃችሁ ተዋደዱ፥ ፍቅር የኃጢአትን ብዛት ይሸፍናልና::'" :
                         "Above all, keep loving one another earnestly, since love covers a multitude of sins. Peace can be found in trusting His grace.";
        } else {
          fallbackText = language === 'om' ? "Gaaffii keetiif: Kitaabni Qulqulluun obsa, amantii fi abdii nu barsiisa. Kadhannaadhaan gara Waaqayyootti dhiyaadhu. [Offline/Local Guidance]" :
                         language === 'am' ? "ለጥያቄዎ: ቅዱስ መጽሐፍ ሁልጊዜም እምነትን፣ ትዕግስትን፣ ተስፋን እና ይቅርታን ያስተምረናል:: በጸሎት ወደ ፈጣሪዎ ይቅረቡ:: [መስመር ውጭ አስተያየት]" :
                         "Regarding your question: The scriptures emphasize faith, perseverance, patience, and love. Bringing things forward in prayer offers divine comfort. [Offline/Local Guidance]";
        }
      }
      setFaithResponse(fallbackText);
      onAddHistory('RELIGIOUS', `Asked Faith AI: ${faithQuery.substring(0, 30)}... (Offline)`);
    } finally {
      setIsAskingFaith(false);
    }
  };

  const startSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quran/surah/${selectedSurah}`);
      if (!res.ok) throw new Error("Failed to load surah content from proxy");
      const data = await res.json();
      const filtered = data.data[0].ayahs
        .filter((a: any) => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah)
        .map((a: any) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          translation: data.data[1].ayahs.find((tr: any) => tr.numberInSurah === a.numberInSurah).text,
          audio: `https://cdn.islamic.network/quran/audio/128/${selectedReciter}/${a.number}.mp3`
        }));

      setAyahs(filtered);
      setCurrentIdx(0);
      setTurn(mode === 'learning' ? 'ai' : 'user');
      setIsSessionActive(true);
    } catch (e) { alert("Error loading data."); }
    finally { setIsLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setRecordingBlob(blob);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (e) { console.error(e); }
  };

  const stopRecordingAndNext = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setTimeout(moveToNext, 1000);
    }
  };

  const moveToNext = () => {
    if (currentIdx === null) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= ayahs.length) {
      alert(t.finish);
      setIsSessionActive(false);
      const surahName = surahs.find(s => s.number === selectedSurah)?.englishName || selectedSurah;
      onAddHistory('QURAN', `Finished reciting Surah ${surahName} (${ayahs.length} ayahs)`);
      return;
    }
    setCurrentIdx(nextIdx);
    setTurn(turn === 'user' ? 'ai' : 'user');
  };

  useEffect(() => {
    if (isSessionActive && turn === 'ai' && currentIdx !== null) playAi();
  }, [turn, currentIdx, isSessionActive]);

  const playAi = async () => {
    const ay = ayahs[currentIdx!];
    setIsLoading(true);
    const audio = new Audio(ay.audio);
    audio.onended = () => { setIsLoading(false); moveToNext(); };
    audio.play().catch(async () => {
        try {
            const resGen = await fetch("/api/gemini/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-3.1-flash-tts-preview",
                    contents: [{ parts: [{ text: `Recite in Arabic: ${ay.text}` }] }],
                    config: { 
                        responseModalities: ["AUDIO"], 
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } 
                    }
                })
            });
            
            if (!resGen.ok) throw new Error("Failed to generate audio");
            const res = await resGen.json();
            const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (b64) {
                const ctx = new AudioContext({ sampleRate: 24000 });
                const buff = await decodeAudioData(decode(b64), ctx, 24000, 1);
                const src = ctx.createBufferSource();
                src.buffer = buff; src.connect(ctx.destination);
                src.onended = () => { setIsLoading(false); moveToNext(); };
                src.start();
            } else {
                throw new Error("No inline audio data");
            }
        } catch (err) {
            console.error("Quran recitation streaming failed:", err);
            // Dynamic offline voice synthesizer fallback (ar-SA for Quran text)
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(ay.text);
                    utterance.lang = 'ar-SA';
                    utterance.onend = () => {
                        setIsLoading(false);
                        moveToNext();
                    };
                    utterance.onerror = () => {
                        setIsLoading(false);
                        moveToNext();
                    };
                    window.speechSynthesis.speak(utterance);
                } catch (sErr) {
                    console.error("Local synth collapsed:", sErr);
                    setIsLoading(false);
                    moveToNext();
                }
            } else {
                setIsLoading(false);
                moveToNext();
            }
        }
    });
  };

  return (
    <div className="p-4 space-y-6 md:space-y-8 max-w-4xl mx-auto relative group">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h2 className="text-4xl font-black text-purple-600 tracking-tighter uppercase">
            {religion === 'Islamic' ? 'ISLAMIC' : religion === 'Protestant' ? 'PROTESTANT' : religion === 'Catholic' ? 'CATHOLIC' : 'ORTHODOX'}
          </h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
            {language === 'om' ? 'Hojiilee Amantaa Diijitaalaa' : 'Digital Religious Services'}
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto border border-gray-200">
          {(['Islamic', 'Protestant', 'Catholic', 'Orthodox'] as const).map(r => (
            <button 
              key={r} 
              onClick={() => { setReligion(r); setIsSessionActive(false); }}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase transition-all whitespace-nowrap ${religion === r ? 'bg-white shadow-md text-purple-600' : 'text-gray-400'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {religion === 'Islamic' ? (
        <div className="space-y-6">
          <div className="text-center mb-4">
             <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">{t.islamicTitle}</h3>
          </div>
          {!isSessionActive ? (
            <div className="bg-white/90 p-10 rounded-[3rem] shadow-2xl space-y-6 animate-slide-up border border-green-50">
               <div className="flex bg-gray-100 p-1 rounded-2xl w-full border border-gray-200 mb-2">
                  <button onClick={() => setMode('learning')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'learning' ? 'bg-white shadow-md' : 'text-gray-400'}`}>{t.learningMode}</button>
                  <button onClick={() => setMode('practice')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'practice' ? 'bg-white shadow-md' : 'text-gray-400'}`}>{t.practiceMode}</button>
               </div>
               
               <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">{t.reciterLabel}</label>
                    <select value={selectedReciter} onChange={e => setSelectedReciter(e.target.value)} className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold appearance-none outline-none focus:border-green-500">
                       <option value="ar.alafasy">Mishary Rashid Alafasy</option>
                       <option value="ar.husary">Mahmoud Khalil Al-Husary</option>
                       <option value="ar.abdulbasitmurattal">Abdul Basit (Murattal)</option>
                       <option value="ar.minshawi">Mohamed Siddiq al-Minshawi</option>
                       <option value="ar.abdulsamad">Abdul Basit (Mujawwad)</option>
                       <option value="ar.shaatree">Abu Bakr al-Shatri</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Suuraa Filadhu</label>
                    <select value={selectedSurah} onChange={e => setSelectedSurah(Number(e.target.value))} className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold appearance-none outline-none focus:border-green-500">
                       {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} ({s.englishName})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Jalqaba</label>
                        <input type="number" value={startAyah} onChange={e => setStartAyah(Number(e.target.value))} className="w-full p-4 bg-gray-50 border-2 rounded-2xl outline-none focus:border-green-500" placeholder="Start" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Dhuma</label>
                        <input type="number" value={endAyah} onChange={e => setEndAyah(Number(e.target.value))} className="w-full p-4 bg-gray-50 border-2 rounded-2xl outline-none focus:border-green-500" placeholder="End" />
                     </div>
                  </div>
               </div>
               <button onClick={startSession} className="aura-btn w-full h-16 shadow-green-500/20">
                  <div className="aura-effect" style={{background: 'linear-gradient(to right, #10b981, #34d399)'}}></div>
                  <div className="aura-content bg-green-600 text-white text-lg">{t.startBtn}</div>
               </button>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col items-center w-full h-[500px] md:h-[600px] space-y-4 md:space-y-6">
               <div className="flex items-center justify-between w-full max-w-2xl px-2 md:px-4 flex-shrink-0">
                  <div className={`flex flex-col items-center gap-2 md:gap-3 transition-all duration-500 ${turn === 'user' ? 'scale-110 opacity-100' : 'opacity-40 grayscale scale-90'}`}>
                     <img src={user.photoURL} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-green-500 shadow-2xl object-cover bg-white" alt="User" />
                     <span className="text-[8px] md:text-[10px] font-black uppercase text-green-600">You</span>
                  </div>
                  <div className="flex-1 h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                    {turn === 'ai' || isRecording ? (
                      <div className="flex items-center gap-1 md:gap-1.5">
                        {[1,2,3,4,5,6,7,8,9,10].map(i => (
                          <div key={i} className={`w-1 md:w-1.5 rounded-full animate-bounce ${turn === 'ai' ? 'bg-blue-500' : 'bg-red-500'}`} 
                            style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.08}s`, animationDuration: '0.5s' }}></div>
                        ))}
                      </div>
                    ) : ( <div className="w-full h-[1px] md:h-[2px] bg-gray-100 rounded-full relative"></div> )}
                  </div>
                  <div className={`flex flex-col items-center gap-2 md:gap-3 transition-all duration-500 ${turn === 'ai' ? 'scale-110 opacity-100' : 'opacity-40 grayscale scale-90'}`}>
                     <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-blue-500 shadow-2xl flex items-center justify-center bg-gray-900 overflow-hidden">
                        <img src={ROBOT_AVATAR} className="w-full h-full object-cover" alt="Robot" />
                     </div>
                     <span className="text-[8px] md:text-[10px] font-black uppercase text-blue-600">Multi_Sphere AI</span>
                  </div>
               </div>
               <div className="flex-1 w-full max-w-2xl bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 shadow-2xl text-center relative group overflow-y-auto no-scrollbar scroll-smooth">
                  <div className="sticky top-0 z-10 w-full mb-4">
                    <div className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Ayah {ayahs[currentIdx!]?.numberInSurah}</div>
                  </div>
                  <div className="py-2 md:py-4">
                    <p className="text-2xl md:text-4xl font-arabic mb-4 md:mb-6 leading-relaxed text-gray-900">{ayahs[currentIdx!]?.text}</p>
                    <p className="text-[11px] md:text-sm text-gray-500 italic font-medium leading-relaxed px-2 md:px-4">"{ayahs[currentIdx!]?.translation}"</p>
                  </div>
               </div>
               <div className="flex flex-col items-center space-y-2 md:space-y-4 flex-shrink-0 pb-2 md:pb-4">
                  {turn === 'user' && (
                    <button onMouseDown={startRecording} onMouseUp={stopRecordingAndNext} onTouchStart={startRecording} onTouchEnd={stopRecordingAndNext}
                      className={`w-16 h-16 md:w-24 md:h-24 rounded-full shadow-2xl flex items-center justify-center text-2xl md:text-3xl transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-green-600 text-white hover:scale-105 active:scale-95'}`}
                    > {isRecording ? "⏺️" : "🎙️"} </button>
                  )}
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">{turn === 'user' ? (isRecording ? t.recite : t.reciteNow) : t.aiReciting}</p>
                  <button onClick={() => setIsSessionActive(false)} className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-[0.3em] hover:underline">{t.stopBtn}</button>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
           {/* Christian Section Content */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Daily Guidance Panel */}
              <div className="bg-white/90 p-8 md:p-10 rounded-[3rem] shadow-2xl space-y-6 border border-purple-50">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center text-xl">🕊️</div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{t.dailyVerse}</h3>
                 </div>
                 
                 <div className="min-h-[120px] bg-gray-50 rounded-2xl p-6 border border-gray-100 relative">
                    {isGeneratingGuidance ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.guidanceLoading}</p>
                      </div>
                    ) : dailyGuidance ? (
                       <p className="text-sm md:text-base font-medium text-gray-700 italic leading-relaxed">"{dailyGuidance}"</p>
                    ) : (
                       <p className="text-sm text-gray-400 text-center py-4 italic">Generate your daily guidance with AI</p>
                    )}
                 </div>

                 <button onClick={getDailyGuidance} disabled={isGeneratingGuidance} className="aura-btn w-full h-14 md:h-16">
                    <div className="aura-effect" style={{background: 'linear-gradient(to right, #8b5cf6, #d946ef)'}}></div>
                    <div className="aura-content bg-purple-600 text-white text-xs md:text-sm uppercase tracking-widest font-black">
                       {isGeneratingGuidance ? "..." : t.getGuidance}
                    </div>
                 </button>
              </div>

              {/* Audio Bible Integration Panel */}
              <div className="bg-white/90 p-8 md:p-10 rounded-[3rem] shadow-2xl space-y-6 border border-blue-50">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-xl">📖</div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{t.audioBible}</h3>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-widest">
                       {t.bibleResources}
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                       <a 
                         href="https://www.faithcomesbyhearing.com/audio-bible-resources/mp3-downloads" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all group"
                       >
                          <div className="flex items-center gap-3">
                             <span className="text-xl">📻</span>
                             <div>
                                <p className="text-[10px] md:text-xs font-black text-gray-800 uppercase">Listen & Download</p>
                                <p className="text-[8px] md:text-[9px] font-bold text-gray-400 tracking-tight">MP3 Audio Bibles Online</p>
                             </div>
                          </div>
                          <span className="text-blue-500 group-hover:translate-x-1 transition-transform">→</span>
                       </a>

                       <div className="p-4 bg-blue-100/50 rounded-2xl border border-blue-200">
                          <p className="text-[9px] font-black text-blue-600 uppercase mb-2">💡 AI Faith Tip</p>
                          <p className="text-[10px] md:text-xs font-medium text-blue-800 leading-relaxed">
                             Use the link above to access a global library of audio bibles in hundreds of languages including Afaan Oromo.
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Generic AI Faith Assistant */}
           <div className="bg-gray-900 text-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden border-4 border-white/10 mt-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full"></div>
              <div className="relative z-10 text-center space-y-6">
                 <h3 className="text-2xl font-black uppercase tracking-widest text-purple-400">FAITH BRIDGE AI</h3>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest max-w-lg mx-auto">
                    Ask questions, seek prayers, or learn about your faith history through our custom {religion} AI system.
                 </p>
                 <div className="flex flex-col gap-4 max-w-lg mx-auto">
                    <div className="flex gap-3 bg-white/5 p-2 rounded-3xl border border-white/10 backdrop-blur-md">
                        <input 
                            type="text" 
                            value={faithQuery}
                            onChange={(e) => setFaithQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskFaith()}
                            placeholder={language === 'om' ? `Waa'ee ${religion} gaafadhu...` : `Ask about ${religion} teachings...`} 
                            className="bg-transparent border-none outline-none flex-1 px-4 text-xs font-medium text-white" 
                        />
                        <button 
                            onClick={handleAskFaith}
                            disabled={isAskingFaith || !faithQuery.trim()}
                            className="bg-purple-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-purple-500 transition-all active:scale-95 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                        >
                            {isAskingFaith ? "..." : (language === 'om' ? "Gaafadhu" : "Ask")}
                        </button>
                    </div>
                    {faithResponse && (
                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-left animate-slide-up">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">AI Response</p>
                            <p className="text-sm font-medium leading-relaxed">{faithResponse}</p>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {recordingBlob && (
        <div className="bg-gray-900 text-white p-8 rounded-[3rem] border-4 border-green-600 animate-slide-up shadow-2xl">
           <h3 className="text-xs font-black uppercase tracking-widest text-green-400 mb-4">{t.recordingLabel}</h3>
           <audio src={URL.createObjectURL(recordingBlob)} controls className="w-full filter invert mb-6" />
           <div className="grid grid-cols-3 gap-3">
              <a href={URL.createObjectURL(recordingBlob)} download="recitation.wav" className="flex flex-col items-center p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                 <span className="text-xl">📥</span>
                 <span className="text-[9px] font-black uppercase mt-1">{t.download}</span>
              </a>
              <button onClick={() => { alert("Stored to Multi_Sphere Store!"); setRecordingBlob(null); }} className="flex flex-col items-center p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                 <span className="text-xl">☁️</span>
                 <span className="text-[9px] font-black uppercase mt-1">{t.save}</span>
              </button>
              <button onClick={() => setRecordingBlob(null)} className="flex flex-col items-center p-4 bg-red-600/20 text-red-400 rounded-2xl hover:bg-red-600/30 transition-all">
                 <span className="text-xl">🗑️</span>
                 <span className="text-[9px] font-black uppercase mt-1">{t.delete}</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReligiousPracticeSection;
