
import React, { useState, useEffect, useRef } from 'react';
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { User, Language } from '../types';
import { dbService } from '../services/dbService';

interface ProfileSectionProps {
  user: User;
  language: Language;
  onUpdate: (updatedUser: User) => void;
}

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"
];

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, language, onUpdate }) => {
  const [view, setView] = useState<'edit' | 'stats' | 'history'>('edit');
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    username: user.username,
    bio: user.bio || '',
    photoURL: user.photoURL || AVATARS[0]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dbService.getGlobalStats().then(setGlobalStats);
  }, []);

  const getT = (lang: Language) => {
    const base = {
      om: {
        title: "Eenyummaa Kee",
        tabs: { edit: "Goolabi", stats: "Lakkoofsa", history: "Seenaa" },
        nameLabel: "Maqaa Guutuu",
        userLabel: "Username",
        bioLabel: "Ibsa (Bio)",
        bioHint: "Qubee 100 qofa",
        saveBtn: "Ol-kaayi",
        success: "Milkaa'inaan jijjiirameera!",
        statsTitle: "Tajaajila Argatte",
        globalTitle: "Hawaasa Multi_Sphere AI",
        historyTitle: "Seenaa Tajaajilaa",
        emptyHistory: "Seenaan hin jiru.",
        uploadBtn: "Suuraa Galmee Keessaa",
        avatarSelect: "Suuraa Filadhu"
      },
      en: {
        title: "Your Profile",
        tabs: { edit: "Edit", stats: "Stats", history: "History" },
        nameLabel: "Full Name",
        userLabel: "Username",
        bioLabel: "Bio",
        bioHint: "Max 100 characters",
        saveBtn: "Save Changes",
        success: "Profile updated!",
        statsTitle: "Your Usage Stats",
        globalTitle: "Global Community Stats",
        historyTitle: "Service History",
        emptyHistory: "No history found.",
        uploadBtn: "Upload From Gallery",
        avatarSelect: "Select Avatar",
        delete: "Delete",
        regUsers: "Registered Users",
        aiCreations: "AI Creations",
        giftsDist: "Gifts Distributed",
        linksShared: "Links Shared"
      },
      am: {
        title: "የእርስዎ መለያ",
        tabs: { edit: "አስተካክል", stats: "መረጃ", history: "ታሪክ" },
        nameLabel: "ሙሉ ስም",
        userLabel: "የተጠቃሚ ስም",
        bioLabel: "ስለ እርሶ",
        bioHint: "ቢበዛ 100 ፊደላት",
        saveBtn: "ለውጦችን አስቀምጥ",
        success: "መለያዎ በትክክል ተስተካክሏል!",
        statsTitle: "የእርስዎ የአጠቃቀም መረጃ",
        globalTitle: "የማህበረሰቡ መረጃ",
        historyTitle: "የአገልግሎት ታሪክ",
        emptyHistory: "ምንም የታሪክ መረጃ አልተገኘም::",
        uploadBtn: "ከጋለሪ ጫን",
        avatarSelect: "ምስል ይምረጡ",
        delete: "ሰርዝ",
        regUsers: "የተመዘገቡ ተጠቃሚዎች",
        aiCreations: "AI ስራዎች",
        giftsDist: "የተሰጡ ስጦታዎች",
        linksShared: "የተጋሩ ሊንኮች"
      }
    };
    return (base as any)[lang] || base.en;
  };
  const t = getT(language);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.fullName,
          photoURL: formData.photoURL
        });
      }
      await dbService.updateProfile(user.username, formData);
      // This updates the global user state in App.tsx instantly
      onUpdate({ ...user, ...formData });
      alert(t.success);
      setView('stats');
    } catch (e) {
      alert("Error saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-2xl mx-auto">
      {/* Sub-Navigation */}
      <div className="flex bg-gray-100/50 p-1 rounded-xl md:rounded-2xl mb-6 md:mb-8 border border-gray-200/50">
        {Object.entries(t.tabs).map(([k, label]) => (
          <button 
            key={k} 
            onClick={() => setView(k as any)}
            className={`flex-1 py-2.5 md:py-3 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg md:rounded-xl transition-all ${view === k ? 'bg-black text-white shadow-xl' : 'text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'edit' && (
        <div className="space-y-4 md:space-y-6 animate-slide-up">
           <div className="flex flex-col items-center mb-6 md:mb-8">
              <div 
                className="relative group mb-3 md:mb-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute -inset-1 md:-inset-1.5 rounded-full overflow-hidden">
                   <div className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] animate-[rotate-aura_4s_linear_infinite]" 
                        style={{ background: 'conic-gradient(#00f5d4, #ff006e, #00f5d4)' }}></div>
                </div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white overflow-hidden z-10 group">
                    <img src={formData.photoURL} className="w-full h-full object-cover" alt="Profile" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xl md:text-2xl">📸</span>
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[8px] md:text-[10px] font-black uppercase bg-gray-100 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-gray-600 hover:bg-gray-200 transition-colors mb-2"
              >
                {t.uploadBtn}
              </button>
              <p className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest text-center break-all px-4">{user.email}</p>
           </div>

           <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="space-y-1">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 ml-2">{t.nameLabel}</label>
                <input 
                  type="text" 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full p-3 md:p-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-bold focus:border-pink-500 outline-none transition-all text-sm md:text-base" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 ml-2">{t.userLabel}</label>
                <input 
                  type="text" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full p-3 md:p-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-bold focus:border-cyan-500 outline-none transition-all text-sm md:text-base" 
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-end ml-2 mr-2">
                   <label className="text-[8px] md:text-[10px] font-black uppercase text-gray-400">{t.bioLabel}</label>
                   <span className={`text-[8px] md:text-[10px] font-bold ${formData.bio.length > 90 ? 'text-red-500' : 'text-gray-400'}`}>{formData.bio.length}/100</span>
                </div>
                <textarea 
                  value={formData.bio} 
                  maxLength={100}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  placeholder={t.bioHint}
                  className="w-full p-3 md:p-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-medium focus:border-purple-500 outline-none h-20 md:h-24 resize-none transition-all text-sm md:text-base" 
                />
              </div>
           </div>

           <div className="pt-4">
              <p className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 text-center mb-3 md:mb-4">{t.avatarSelect}</p>
              <div className="grid grid-cols-6 gap-1.5 md:gap-2 mb-6 md:mb-8">
                {AVATARS.map(url => (
                  <button key={url} onClick={() => setFormData({...formData, photoURL: url})} className={`rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${formData.photoURL === url ? 'border-pink-500 scale-110 shadow-lg' : 'border-transparent'}`}>
                    <img src={url} className="w-full h-full object-cover aspect-square" alt="Avatar" />
                  </button>
                ))}
              </div>

              <button onClick={handleSave} disabled={isSaving} className="aura-btn w-full h-14 md:h-16">
                 <div className="aura-effect"></div>
                 <div className="aura-content text-base md:text-lg uppercase tracking-widest">{isSaving ? '...' : t.saveBtn}</div>
              </button>
           </div>
        </div>
      )}

      {view === 'stats' && (
        <div className="space-y-6 md:space-y-8 animate-slide-up">
           <div>
              <h3 className="text-[10px] md:text-xs font-black uppercase text-pink-600 tracking-widest mb-3 md:mb-4">{t.statsTitle}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                 {[
                   { label: 'TTS', val: user.stats.ttsCount, icon: '🗣️' },
                   { label: 'STT', val: user.stats.sttCount, icon: '🎙️' },
                   { label: 'Images', val: user.stats.imagesCount, icon: '🎨' },
                   { label: 'Videos', val: user.stats.videosCount, icon: '📹' },
                   { label: 'Live (Min)', val: user.stats.liveMinutes, icon: '📡' },
                   { label: 'Shares', val: user.stats.sharesCount, icon: '🎁' }
                 ].map(s => (
                   <div key={s.label} className="bg-white border-2 border-gray-100 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-lg md:text-xl mb-1">{s.icon}</div>
                      <div className="text-base md:text-lg font-black">{s.val}</div>
                      <div className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.label}</div>
                   </div>
                 ))}
              </div>
           </div>

           {globalStats && (
             <div className="bg-black text-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>
                <h3 className="text-[10px] md:text-xs font-black uppercase text-cyan-400 tracking-widest mb-4 md:mb-6 relative z-10">{t.globalTitle}</h3>
                <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
                   <div>
                      <p className="text-xl md:text-2xl font-black">{globalStats.totalUsers.toLocaleString()}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase">{t.regUsers}</p>
                   </div>
                   <div>
                      <p className="text-xl md:text-2xl font-black">{globalStats.totalAiGenerations.toLocaleString()}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase">{t.aiCreations}</p>
                   </div>
                   <div>
                      <p className="text-xl md:text-2xl font-black">{globalStats.totalGifts.toLocaleString()}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase">{t.giftsDist}</p>
                   </div>
                   <div>
                      <p className="text-xl md:text-2xl font-black">{globalStats.totalShares.toLocaleString()}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase">{t.linksShared}</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
      {view === 'history' && (
        <div className="space-y-3 md:space-y-4 animate-slide-up">
           <div className="flex justify-between items-center mb-3 md:mb-4">
              <h3 className="text-[10px] md:text-xs font-black uppercase text-purple-600 tracking-widest">{t.historyTitle}</h3>
              {user.history?.length > 0 && (
                <button 
                  onClick={() => {
                     localStorage.removeItem(`multisphere_history_${user.username || 'user'}`);
                     onUpdate({ ...user, history: [] });
                  }}
                  className="text-[8px] md:text-[10px] font-black uppercase text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all"
                >
                  {t.delete} {t.historyTitle}
                </button>
              )}
           </div>
           
           {(!user.history || user.history.length === 0) ? (
             <div className="text-center py-16 md:py-20 bg-gray-50 rounded-2xl md:rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-xs md:text-sm text-gray-400 font-bold">{t.emptyHistory}</p>
             </div>
           ) : (
             <div className="space-y-2 md:space-y-3">
                {user.history?.map(item => (
                  <div key={item.id} className="bg-white border-2 border-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl flex flex-col gap-2 md:gap-3 hover:border-purple-200 transition-colors shadow-sm group">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 md:gap-3">
                           <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gray-100 flex items-center justify-center text-base md:text-lg">
                              {item.type === 'TTS' && '🗣️'}
                              {item.type === 'STT' && '🎙️'}
                              {item.type === 'IMAGE' && '🎨'}
                              {item.type === 'LIVE' && '📡'}
                              {item.type === 'GIFT' && '🎁'}
                              {item.type === 'SHARE' && '🔗'}
                              {item.type === 'VIDEO' && '📹'}
                              {item.type === 'QURAN' && '📖'}
                           </div>
                           <div>
                              <p className="text-[10px] md:text-xs font-black text-gray-800 line-clamp-1">{item.detail}</p>
                              <p className="text-[8px] md:text-[9px] font-bold text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                           </div>
                        </div>
                        <div className="text-[8px] md:text-[10px] font-black text-purple-600 uppercase ml-2">{item.type}</div>
                     </div>
                     {item.mediaUrl && (
                        <div className="mt-1">
                           {item.type === 'IMAGE' && (
                              <img src={item.mediaUrl} className="w-full h-32 md:h-40 object-cover rounded-xl" alt="Historic Art" />
                           )}
                           {(item.type === 'TTS' || item.type === 'LIVE') && (
                              <audio src={item.mediaUrl} controls className="w-full h-8 md:h-10 scale-90 origin-left" />
                           )}
                           {item.type === 'VIDEO' && (
                              <video 
                                src={item.mediaUrl} 
                                playsInline
                                controls
                                className="w-full h-32 md:h-40 object-cover rounded-xl bg-black" 
                                onError={() => console.error("Profile history video error")}
                              />
                           )}
                        </div>
                     )}
                  </div>
                ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
