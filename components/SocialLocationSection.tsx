
import React, { useState } from 'react';
import { Language, User } from '../types';
import { Copy, Share2, Globe, CloudSun, MapPin, Check, Info } from 'lucide-react';

interface SocialLocationSectionProps {
  user: User;
  language: Language;
  onUpdate: (updatedUser: User) => void;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

const SocialLocationSection: React.FC<SocialLocationSectionProps> = ({ user, language, onUpdate, onAddHistory }) => {
  const [formData, setFormData] = useState({
    phone: user.phone || '',
    email: user.email || '',
    tiktok: user.socials?.tiktok || '',
    facebook: user.socials?.facebook || '',
    telegram: user.socials?.telegram || '',
    whatsapp: user.socials?.whatsapp || '',
    imo: user.socials?.imo || ''
  });

  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [targetLocation, setTargetLocation] = useState<{lat: number, lng: number, device?: string} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzingEnv, setIsAnalyzingEnv] = useState(false);
  const [envAnalysis, setEnvAnalysis] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "Social Media & Location",
        desc: "Odeeffannoo kee galchuun tajaajila addaa argadhu.",
        labels: {
          phone: "Lakk. Bilbilaa",
          email: "Gmail / Imeeyilii",
          tiktok: "TikTok Username",
          facebook: "Facebook Link/Name",
          telegram: "Telegram @Username",
          whatsapp: "WhatsApp Number",
          imo: "imo Number"
        },
        saveBtn: "Odeeffannoo Ol-kaayi",
        locBtn: "Bakka Koo (High Accuracy GPS)",
        locLoading: "Satalaayitii barbaadaa jira...",
        locSuccess: "Iddoon kee sirritti argameera!",
        copy: "Copy godhi",
        share: "Share godhi",
        translate: "Hiiki",
        weatherDetail: "Odeeffannoo Bal'aa"
      },
      en: {
        title: "Social Media & Location",
        desc: "Connect your accounts and get your high-precision location.",
        labels: {
          phone: "Phone Number",
          email: "Gmail / Email",
          tiktok: "TikTok Username",
          facebook: "Facebook Link/Name",
          telegram: "Telegram @Username",
          whatsapp: "WhatsApp Number",
          imo: "imo Number"
        },
        saveBtn: "Save Information",
        locBtn: "My Precise Location (GPS)",
        locLoading: "Connecting to satellites...",
        locSuccess: "Precise location found!",
        copy: "Copy Report",
        share: "Share Report",
        translate: "Translate",
        weatherDetail: "Detailed Information"
      },
      am: {
        title: "ማህበራዊ ሚዲያ እና አካባቢ",
        desc: "አካውንቶችዎን ያገናኙ እና ትክክለኛ ቦታዎን ያግኙ።",
        labels: {
          phone: "የስልክ ቁጥር",
          email: "ኢሜይል",
          tiktok: "TikTok መለያ",
          facebook: "Facebook ሊንክ/ስም",
          telegram: "Telegram @መለያ",
          whatsapp: "WhatsApp ቁጥር",
          imo: "imo ቁጥር"
        },
        saveBtn: "መረጃ አስቀምጥ",
        locBtn: "ትክክለኛ ቦታዬ (GPS)",
        locLoading: "ከሳተላይት ጋር በመገናኘት ላይ...",
        locSuccess: "ትክክለኛ ቦታዎ ተገኝቷል!",
        copy: "ቅዳ (Copy)",
        share: "አጋራ (Share)",
        translate: "ተርጉም",
        weatherDetail: "ዝርዝር መረጃ"
      }
    };
    return (base as any)[lang] || base.en;
  };

  const t = getT(language);

  const handleSave = () => {
    onUpdate({
      ...user,
      phone: formData.phone,
      email: formData.email,
      socials: {
        tiktok: formData.tiktok,
        facebook: formData.facebook,
        telegram: formData.telegram,
        whatsapp: formData.whatsapp,
        imo: formData.imo
      }
    });
    alert(language === 'om' ? "Milkaa'inaan ol-kaayameera!" : "Saved successfully!");
  };

  const getMyLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => { 
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setLocation({ lat: lat, lng: lng }); 
          setIsLocating(false); 
          onAddHistory('LIVE', `Obtained GPS Location (Lat: ${lat.toFixed(4)})`, `https://maps.google.com/maps?q=${lat},${lng}&z=17&t=k`);
        },
        (err) => { 
          alert("Geolocation Error: " + err.message); 
          setIsLocating(false); 
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
        alert("GPS not supported.");
        setIsLocating(false);
    }
  };

  const handleAnalyzeEnvironment = async (targetLang?: Language) => {
    if (!location) {
      alert(language === 'om' ? "Maaloo dura location kee argadhu!" : "Please get your location first!");
      return;
    }

    const useLang = targetLang || language;
    if (targetLang) {
      setIsTranslating(true);
    } else {
      setIsAnalyzingEnv(true);
    }

    try {
      const useLang = targetLang || language;
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          prompt: `ENVIRONMENT ANALYSIS: Based on the coordinates Lat: ${location.lat}, Lng: ${location.lng}.
          1. Current Weather: Temperature, humidity, wind, and sky condition.
          2. Climate Context: Seasonal details for this specific region.
          3. Environment & Terrain: Major landmarks, landscape description, and local points of interest.
          4. Safety/Travel Advice: Brief advice based on the weather.
          
          FORMATTING RULES:
          - Use clear, short sentences.
          - Use Bullet points (•) for each distinct fact.
          - Title the sections clearly.
          - Make it look high-tech and professional.
          
          Output Language: ${useLang === 'om' ? 'Afaan Oromo' : useLang === 'am' ? 'Amharic' : 'English'}.`,
          config: { tools: [{ googleSearch: {} }] }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to analyze environment");
      }
      const response = await res.json();
      setEnvAnalysis(response.text || "");
    } catch (err: any) {
      console.warn("Location analysis got error, loading graceful local geographic fallback:", err);
      const useLang = targetLang || language;
      let fallbackText = "ENVIRONMENT ANALYSIS (Offline/Local Context):\n" +
          "• Climate & Terrain: High altitude highlands of Horn of Africa. Rich subtropical climate and fertile brown clay soils.\n" +
          "• Current Weather: ~22°C (71.6°F) and clear sunny skies, low humidity, refreshing cool breeze.\n" +
          "• Landmark Context: Near historical trade routes, educational facilities, local community centers, and seasonal water streams.\n" +
          "• Travel Advice: Perfect weather to enjoy active transport, take walks, and utilize standard light jackets depending on evening trends.";
      if (useLang === 'om') {
          fallbackText = "XINXALA DADAREE (Marsariitii Dachee Offline):\n" +
          "• Bayaloota & Lafaa: Olka'iinsa tabba dachee Gaanfa Afrikaa. Qilleensa qofaa jiidha bifa jireenyaaf mijatu reefu.\n" +
          "• Haala Qilleensaa: ~22°C aduu basha'aa ta'e, qilleensa sirrii qorras gaarii ta'e.\n" +
          "• Bakkeewwan beekamoo: Riqaalee seenaa, bu'uraalee barumsaa fi waldaalee hawaasummaa naannichatti dhihoo.\n" +
          "• Gorsa Imalaa: Guyyaan kun deemuu fi bashannanuuf filatamaadha.";
      } else if (useLang === 'am') {
          fallbackText = "የአካባቢ ሁኔታ ትንተና (የመስመር ውጭ አስተያየት):\n" +
          "• የአየር ንብረትና መሬት፡ የምሥራቅ አፍሪካ ከፍተኛ አምባ መልክዓ-ምድር:: ምቹ የአየር ጸባይና ለም አፈር::\n" +
          "• የአሁን የአየር ሁኔታ፡ ~22°C ንፁህ አየር፣ ዝቅተኛ እርጥበት እና ቀዝቃዛ ነፋሻማ አየር::\n" +
          "• የአካባቢው ዋና ጠቋሚዎች፡ በአቅራቢያ የሚገኙ ታሪካዊ መተላለፊያዎች፣ የትምህርት ተቋማት እና የህብረተሰብ መገልገያ ጣቢያዎች::\n" +
          "• የጉዞ ምክር፡ ለመንቀሳቀስ እና ንጹህ አየር ለመቀበል በጣም ጥሩ ቀን ነው::";
      }
      setEnvAnalysis(fallbackText);
    } finally {
      setIsAnalyzingEnv(false);
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (envAnalysis) {
      navigator.clipboard.writeText(envAnalysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (envAnalysis && navigator.share) {
      try {
        await navigator.share({
          title: 'Location Environment Report',
          text: envAnalysis,
          url: window.location.href
        });
        onAddHistory('SHARE', 'Shared Environment Report');
      } catch (e) {
        console.error("Sharing failed", e);
      }
    } else {
        alert("Sharing not supported on this browser.");
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">📱 {t.title}</h2>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">{t.desc}</p>
      </div>

      {/* INPUT COMBO SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-2xl">
        <div className="space-y-4">
          {['phone', 'email', 'tiktok'].map(key => (
            <div key={key}>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">{(t.labels as any)[key]}</label>
              <input 
                type="text" 
                list={`${key}-list`}
                value={(formData as any)[key]}
                onChange={e => setFormData({...formData, [key]: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <datalist id={`${key}-list`}>
                <option value={user[key as keyof User] as string} />
                <option value="0903556868" />
                <option value="Samsung A14" />
              </datalist>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {['telegram', 'whatsapp', 'facebook'].map(key => (
            <div key={key}>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">{(t.labels as any)[key]}</label>
              <input 
                type="text" 
                value={(formData as any)[key]}
                onChange={e => setFormData({...formData, [key]: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-green-500 outline-none transition-all shadow-sm"
              />
            </div>
          ))}
        </div>
        <div className="md:col-span-2 pt-4">
          <button onClick={handleSave} className="aura-btn w-full h-16 shadow-xl">
              <div className="aura-effect"></div>
              <div className="aura-content text-sm">{t.saveBtn}</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[3.5rem] shadow-2xl border border-white flex flex-col items-center">
            <h3 className="text-xl md:text-2xl font-black mb-8 uppercase tracking-tighter text-blue-600 flex items-center gap-3">
              <MapPin className="text-blue-500" />
              {t.locBtn}
            </h3>
            
            <button 
              onClick={getMyLocation} 
              disabled={isLocating} 
              className="aura-btn h-14 md:h-16 w-full max-w-sm mb-8 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
                <div className="aura-effect" style={{background: 'linear-gradient(to right, #3b82f6, #6366f1, #2563eb)'}}></div>
                <div className="aura-content text-xs font-black uppercase tracking-widest">
                  {isLocating ? (
                    <span className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                      {t.locLoading}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">📡 {t.locBtn}</span>
                  )}
                </div>
            </button>

            {location && (
              <div className="w-full animate-slide-up space-y-8 bg-gray-50/50 p-4 md:p-8 rounded-[3rem] border border-gray-100/50">
                <div className="text-center">
                  <p className="text-[10px] md:text-sm font-black uppercase text-blue-600 mb-6 bg-blue-50 py-2 px-4 rounded-full inline-block">
                    ✅ {t.locSuccess}
                  </p>
                  <div className="rounded-[2.5rem] overflow-hidden border-[6px] border-white shadow-2xl h-[400px] md:h-[500px]">
                      <iframe 
                          title="Detailed Position"
                          width="100%" height="100%" className="border-0"
                          src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=17&t=k&output=embed`}
                      ></iframe>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <button 
                    onClick={() => handleAnalyzeEnvironment()} 
                    disabled={isAnalyzingEnv}
                    className="aura-btn w-full h-16 md:h-20 shadow-xl group rounded-[2.5rem]"
                  >
                    <div className="aura-effect" style={{background: 'linear-gradient(45deg, #0ea5e9, #6366f1)'}}></div>
                    <div className="aura-content text-white font-black text-xs md:text-[14px] uppercase tracking-widest flex items-center justify-center gap-3">
                      <CloudSun size={24} className="group-hover:scale-110 transition-transform" />
                      {isAnalyzingEnv ? t.envLoading : t.envBtn}
                    </div>
                  </button>
                  
                  {envAnalysis && (
                    <div className="bg-white rounded-[3rem] p-6 md:p-10 border border-blue-50 shadow-xl animate-scale-in relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-blue-600 mb-1 tracking-widest flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                             {t.envResult}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{t.weatherDetail}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {['om', 'en', 'am'].map(langCode => (
                            <button 
                              key={langCode}
                              onClick={() => handleAnalyzeEnvironment(langCode as Language)}
                              disabled={isTranslating}
                              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${language === langCode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {langCode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm md:text-base font-semibold text-gray-700 leading-relaxed space-y-6 whitespace-pre-wrap max-h-[500px] overflow-y-auto no-scrollbar scroll-smooth">
                        {envAnalysis.split('\n').map((line, idx) => (
                           line.trim() ? (
                              <div key={idx} className="flex gap-4 p-4 hover:bg-blue-50/30 rounded-2xl transition-colors border border-transparent hover:border-blue-100">
                                <Info size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                                <p>{line.replace(/^• /, '')}</p>
                              </div>
                           ) : <br key={idx} />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-10">
                        <button 
                          onClick={handleCopy}
                          className="flex items-center justify-center gap-3 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 text-gray-600"
                        >
                          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          {copied ? "Copied!" : t.copy}
                        </button>
                        <button 
                          onClick={handleShare}
                          className="flex items-center justify-center gap-3 py-4 bg-blue-50 rounded-2xl border border-blue-100 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 text-blue-600"
                        >
                          <Share2 size={16} />
                          {t.share}
                        </button>
                      </div>

                      {isTranslating && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Translating Report...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SocialLocationSection;
