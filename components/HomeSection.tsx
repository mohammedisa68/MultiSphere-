// Meeshaalee barbaachisoo (libraries) galchu
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Languages, 
  Mic, 
  Wallet, 
  MessageSquare, 
  ArrowRight, 
  Zap,
  MoreVertical,
  X
} from 'lucide-react';
import { User, Language } from '../types';

// Odeeffannoo fuula duraa (props) adda baasuu
interface HomeSectionProps {
  t: any;
  user: User;
  setActiveTab: (tab: any) => void;
  language: Language;
}

const HomeSection: React.FC<HomeSectionProps> = ({ t, user, setActiveTab, language }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const content = {
    om: {
      badge: "MultiSphere Multimodal AI Yaali",
      subtitle: "\"Tajaajila baay'ee Sphere tokko keessatti\"",
      heroTitle: "Waan si barbaachisu hundi, ",
      heroTitleHighlight: "asuma jira.",
      heroDesc: "Appii garaa garaa gidduu deemuu dhiisi. MultiSphere waan hunduma bakka tokkotti walitti qaba.",
      features: [
        "AI dhaan suuraa babbareedoo uumi",
        "Afaanota adda addatti kallaattiin hiiki",
        "Dubbii gara barreeffamaatti jijjiiri",
        "Wallet kee haala amansiisaan bulchi",
        "Haala salphaan ergaa waliif ergaa"
      ],
      explore: "MultiSphere Sakatta'i",
      labels: {
        ai: "MultiSphere AI",
        religion: "Amantii",
        speech: "Speech AI",
        image: "Image AI",
        translate: "Hiikkaa",
        wallet: "Wallet"
      }
    },
    en: {
      badge: "Try MultiSphere Multimodal AI",
      subtitle: "\"Many services one Sphere\"",
      heroTitle: "Everything you need, ",
      heroTitleHighlight: "already here.",
      heroDesc: "No more switching between apps. MultiSphere brings everything together in one simple, powerful place.",
      features: [
        "Generate stunning images with AI",
        "Translate speech instantly across languages",
        "Convert text to speech & speech to text",
        "Manage secure digital wallet services",
        "Stay connected through seamless chats"
      ],
      explore: "Explore MultiSphere",
      labels: {
        ai: "MultiSphere AI",
        religion: "Religious",
        speech: "Speech AI",
        image: "Image AI",
        translate: "Translate",
        wallet: "Wallet"
      }
    },
    am: {
      badge: "ሁለገብ AIን ይሞክሩ",
      subtitle: "\"ብዙ አገልግሎቶች በአንድ ቦታ\"",
      heroTitle: "የሚያስፈልግዎት ነገር ሁሉ ",
      heroTitleHighlight: "እዚሁ አለ።",
      heroDesc: "በመተግበሪያዎች መካከል መቀያየር ይቁም:: MultiSphere ሁሉንም ነገር በአንድ ቀላል እና ኃይለኛ ቦታ ያመጣል።",
      features: [
        "በAI አስደናቂ ምስሎችን ይፍጠሩ",
        "ንግግርን ወዲያውኑ ወደ ተለያዩ ቋንቋዎች ይተርጉሙ",
        "ጽሑፍን ወደ ድምጽ እና ድምጽን ወደ ጽሑፍ ይቀይሩ",
        "ደህንነቱ የተጠበቀ የዲጂታል ዋሌት አገልግሎቶችን ያስዳድሩ",
        "በቀላል መልእክቶች ግንኙነትዎን ይቀጥሉ"
      ],
      explore: "MultiSphereን ያስሱ",
      labels: {
        ai: "MultiSphere AI",
        religion: "ኃይማኖታዊ",
        speech: "Speech AI",
        image: "Image AI",
        translate: "ትርጉም",
        wallet: "ዋሌት"
      }
    }
  };

  const localT = content[language] || content.en;

  return (
    <div className="min-w-full snap-start overflow-y-auto overflow-x-hidden relative">
       {/* Menu Tolee (Navigation Dropdown) */}
       <div className="absolute top-4 left-4 z-[100]">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg flex items-center justify-center border border-white/50 hover:bg-white transition-all active:scale-95"
          >
            {showMenu ? <X size={20} className="text-red-500" /> : <MoreVertical size={20} className="text-gray-900" />}
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute top-12 left-0 w-64 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white p-4 space-y-1 overflow-hidden"
              >
                <div className="px-3 py-2 mb-2 border-b border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.homeTitle} SECTIONS</span>
                </div>
                <div className="max-h-[60vh] overflow-y-auto no-scrollbar py-2">
                  {Object.entries(t.tabs).map(([key, label]) => (
                    <button 
                      key={key}
                      onClick={() => {
                        setActiveTab(key);
                        setShowMenu(false);
                      }}
                      className="w-full text-left p-0.5 rounded-2xl mb-2 aura-btn h-12 shadow-md group transition-all"
                    >
                      <div className="aura-effect opacity-30" style={{ background: 'linear-gradient(to right, #00d2ff, #3a7bd5)' }}></div>
                      <div className="aura-content w-full h-full bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-between px-4 group-hover:bg-white/80 transition-colors">
                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{String(label)}</span>
                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>

       {/* Qophii fuula jalqabaa (Main Page Layout) */}
       <div className="p-4 md:p-8 flex flex-col items-center space-y-8 h-full bg-white/30 backdrop-blur-sm">
          
          {/* Beeksisa AI (Hero Badge) */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-black/10 rounded-full border border-black/5 cursor-pointer"
            onClick={() => setActiveTab('multimodal')}
          >
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60">{localT.badge}</span>
          </motion.div>

          {/* Mata-duree fuula duraa (Headline) */}
          <div className="text-center">
            <motion.h2 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-pink-600 to-red-500 tracking-tighter mb-4 uppercase"
            >
              MULTI_SPHERE
            </motion.h2>
            <p className="text-lg md:text-xl font-bold text-gray-800 max-w-2xl mx-auto italic">
              {localT.subtitle}
            </p>
          </div>

          {/* Sanduqa socho'u (Main Animated Container) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative w-full max-w-3xl p-[2px] rounded-[3rem] overflow-hidden"
          >
            {/* Halluu naannoo (Gradient Border) */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-[rotate-aura_4s_linear_infinite]" />
            
            <div className="relative bg-white/95 rounded-[2.95rem] p-8 md:p-12 shadow-2xl space-y-8">
               <div className="space-y-6 text-left">
                 <h3 className="text-2xl md:text-3xl font-black text-black leading-tight">
                   {localT.heroTitle}<span className="text-purple-600">{localT.heroTitleHighlight}</span>
                 </h3>
                 <p className="text-sm md:text-base text-gray-600 font-medium leading-relaxed">
                   {localT.heroDesc}
                 </p>
               </div>

               {/* Tarree tajaajilootaa (Features List) */}
               <div className="grid gap-4">
                 {[
                   { icon: <Sparkles className="text-pink-500" />, text: localT.features[0] },
                   { icon: <Languages className="text-blue-500" />, text: localT.features[1] },
                   { icon: <Mic className="text-purple-500" />, text: localT.features[2] },
                   { icon: <Wallet className="text-green-500" />, text: localT.features[3] },
                   { icon: <MessageSquare className="text-orange-500" />, text: localT.features[4] }
                 ].map((item, i) => (
                   <motion.div 
                     key={i}
                     initial={{ x: -20, opacity: 0 }}
                     whileInView={{ x: 0, opacity: 1 }}
                     transition={{ delay: i * 0.1 }}
                     className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all group"
                   >
                      <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="text-sm md:text-base font-bold text-gray-800">{item.text}</span>
                   </motion.div>
                 ))}
               </div>

               {/* Yaada xumuraa (Call to Action) */}
               <motion.button 
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => setActiveTab('religious-practice')}
                 className="w-full bg-black text-white p-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-gray-900 transition-all uppercase tracking-tighter"
               >
                 {t.startBtn}
                 <ArrowRight size={24} />
               </motion.button>
            </div>
          </motion.div>

          {/* Tarree tajaajiloota biroo (Explore Grid) */}
          <div className="w-full max-w-4xl pt-12">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-8">{localT.explore}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {[
                { icon: "🧠", label: localT.labels.ai, tab: 'multimodal' },
                { icon: "📖", label: localT.labels.religion, tab: 'religious-practice' },
                { icon: "🗣️", label: localT.labels.speech, tab: 'tts' },
                { icon: "🎨", label: localT.labels.image, tab: 'image' },
                { icon: "🌍", label: localT.labels.translate, tab: 'live' },
                { icon: "💳", label: localT.labels.wallet, tab: 'wallet' }
              ].map((f, i) => (
                <motion.button 
                  key={i} 
                  whileHover={{ y: -5 }}
                  onClick={() => setActiveTab(f.tab as any)}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-3 transition-all"
                >
                  <div className="text-3xl">{f.icon}</div>
                  <span className="text-[10px] font-black uppercase text-gray-700">{f.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
       </div>
    </div>
  );
};

export default HomeSection;
