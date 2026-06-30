
import React from 'react';
import { Language } from '../types';

interface ShareAwardButtonProps {
  language: Language;
}

const ShareAwardButton: React.FC<ShareAwardButtonProps> = ({ language }) => {
  const handleShare = async () => {
    const text = language === 'om' 
      ? 'MULTI_SPHERE: Barreeffama gara sagaleetti, suuraa fi video AI Afaan Oromootiin! Fayyadamiitii Badhaafami!'
      : language === 'am'
      ? 'MULTI_SPHERE: ጽሑፍን ወደ ድምጽ፣ ምስል እና ቪዲዮ በ AI! ይጠቀሙ እና ይሸለሙ!'
      : 'MULTI_SPHERE: Text-to-Speech, Image & Video AI! Use and Get Awards!';

    try {
      if (navigator.share) {
        await navigator.share({ title: 'MULTI_SPHERE', text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${text} - ${window.location.origin}`);
        alert(language === 'om' ? "Liinkiin koppii ta'eera!" : language === 'am' ? "ሊንኩ ተገልብጧል!" : "Link Copied!");
      }
    } catch (e) { console.warn(e); }
  };

  const label = language === 'om' ? "Share & Get Award" : language === 'am' ? "ያጋሩ እና ይሸለሙ" : "Share & Award";

  return (
    <button
      onClick={handleShare}
      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 md:px-6 h-12 rounded-full font-black text-[10px] md:text-xs transition-all shadow-xl flex items-center gap-2 border-2 border-white/50 hover:scale-105 active:scale-95 whitespace-nowrap"
    >
      <span className="text-lg">🎁</span>
      <span className="tracking-tighter uppercase">{label}</span>
    </button>
  );
};

export default ShareAwardButton;
