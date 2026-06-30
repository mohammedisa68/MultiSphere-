
import React, { useState } from 'react';
import { Eye, EyeOff, Github, MessageCircle, Layout, Globe, MoreHorizontal, Copy, Check, Info, ExternalLink } from 'lucide-react';
import { User, Language } from '../types';
import { auth, googleProvider, facebookProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface LoginOverlayProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLogin, language, setLanguage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtherLogins, setShowOtherLogins] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getT = (lang: Language) => {
    const base = {
      om: {
        loginTitle: "Seeni",
        signupTitle: "Galmaa'i",
        email: "Gmail / Imeeyilii",
        password: "Jecha Darbi",
        fullName: "Maqaa Guutuu",
        submitLogin: "Seeni",
        submitSignup: "Galmaa'i",
        switchSignup: "Akkaawuntii hin qabduu? Galmaa'i",
        switchLogin: "Akkaawuntii qabdaa? Seeni",
        welcome: "WELCOME TO MULTI_SPHERE",
        orContinue: "Yookiin kanaan seeni:",
        verificationSent: "Xalayaan mirkaneessaa gmail keetti ergantee jirti! Maaloo gmail kee ilaali.",
        errorTitle: "Dogoggora:",
        processing: "Hojjechaa jira...",
        freeLogin: "Get started Free",
        authErrorMsg: "email or password is wrong",
        somethingWrong: "something is wrong",
        phoneAuth: "Bilbilaan Seeni",
        sendCode: "Koodii Ergi",
        verifyCode: "Koodii Mirkaneessi",
        phonePlaceholder: "+2519...",
        codePlaceholder: "Koodii 6...",
        backToEmail: "Gmail-itti deebi'i"
      },
      en: {
        loginTitle: "Login",
        signupTitle: "Sign Up",
        email: "Gmail / Email",
        password: "Password",
        fullName: "Full Name",
        submitLogin: "Login",
        submitSignup: "Sign Up",
        switchSignup: "Don't have an account? Sign Up",
        switchLogin: "Already have an account? Login",
        welcome: "WELCOME TO MULTI_SPHERE",
        orContinue: "Or continue with:",
        verificationSent: "A verification link has been sent to your email! Please check your inbox.",
        errorTitle: "Error:",
        processing: "Processing...",
        freeLogin: "Get started Free",
        authErrorMsg: "email or password is wrong",
        somethingWrong: "something is wrong",
        phoneAuth: "Login with Phone",
        sendCode: "Send Code",
        verifyCode: "Verify Code",
        phonePlaceholder: "+1...",
        codePlaceholder: "6-digit code",
        backToEmail: "Back to Email Login"
      },
      am: {
        loginTitle: "ይግቡ",
        signupTitle: "ይመዝገቡ",
        email: "ኢሜይል",
        password: "የይለፍ ቃል",
        fullName: "ሙሉ ስም",
        submitLogin: "ይግቡ",
        submitSignup: "ይመዝገቡ",
        switchSignup: "አካውንት የለዎትም? ይመዝገቡ",
        switchLogin: "አካውንት አለዎት? ይግቡ",
        welcome: "እንኳን ወደ MULTI_SPHERE በሰላም መጡ",
        orContinue: "ወይም በዚህ ይቀጥሉ:",
        verificationSent: "የማረጋገጫ ሊንክ ወደ ኢሜይልዎ ተልኳል! እባክዎ ኢሜይልዎን ያረጋግጡ።",
        errorTitle: "ስህተት:",
        processing: "በመከናወን ላይ...",
        freeLogin: "በነጻ ይጀምሩ",
        authErrorMsg: "ኢሜይል ወይም የይለፍ ቃል የተሳሳተ ነው",
        somethingWrong: "ችግር ተከስቷል",
        phoneAuth: "በስልክ ይግቡ",
        sendCode: "ኮድ ላክ",
        verifyCode: "ኮድ አረጋግጥ",
        phonePlaceholder: "+2519...",
        codePlaceholder: "6 አሀዝ ኮድ",
        backToEmail: "ወደ ኢሜይል ይመለሱ"
      }
    };
    return (base as any)[lang] || base.en;
  };
  
  const t = getT(language);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.somethingWrong);
        
        if (data.user) {
           const user: User = {
              fullName: data.user.name || data.user.fullName || 'User',
              username: data.user.email?.split('@')[0] || 'user',
              email: data.user.email || '',
              phone: data.user.phone || '',
              photoURL: `https://ui-avatars.com/api/?name=${data.user.email}&background=random`,
              walletBalance: data.user.balance || 0,
              stats: data.user.stats || { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 },
              history: data.user.history || []
           };
           onLogin(user);
        }
      } else {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.somethingWrong);
        
        if (data.user) {
           const newUser: User = {
              fullName: data.user.name || data.user.fullName || formData.fullName,
              username: data.user.email?.split('@')[0] || 'user',
              email: data.user.email,
              phone: data.user.phone || '',
              photoURL: `https://ui-avatars.com/api/?name=${data.user.email}&background=random`,
              walletBalance: data.user.balance || 0,
              stats: { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 },
              history: []
           };
           onLogin(newUser);
        }
      }
    } catch (err: any) {
      if (isLogin) {
        setError(t.somethingWrong);
        alert(t.somethingWrong);
      } else {
        setError(t.somethingWrong);
        alert(t.somethingWrong);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      if (!firebaseUser.email) {
        throw new Error("Imeeyilii argachuu hin dandeenye (Could not retrieve email from Google).");
      }

      const response = await fetch('/api/auth/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email}&background=random`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.somethingWrong);

      if (data.user) {
         const user: User = {
            fullName: data.user.name || data.user.fullName || firebaseUser.displayName || 'User',
            username: data.user.email?.split('@')[0] || 'user',
            email: data.user.email || firebaseUser.email,
            phone: data.user.phone || '',
            photoURL: firebaseUser.photoURL || data.user.photoURL || `https://ui-avatars.com/api/?name=${data.user.email}&background=random`,
            walletBalance: data.user.balance || 0,
            stats: data.user.stats || { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 },
            history: data.user.history || []
         };
         onLogin(user);
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const errStr = String(err.message || err.code || "").toLowerCase();
      if (errStr.includes("unauthorized-domain") || errStr.includes("auth/unauthorized-domain") || err.code === "auth/unauthorized-domain") {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setError(err.message || t.somethingWrong);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const firebaseUser = result.user;
      if (!firebaseUser.email) {
        throw new Error("Imeeyilii argachuu hin dandeenye (Could not retrieve email from Facebook).");
      }

      const response = await fetch('/api/auth/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email}&background=random`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.somethingWrong);

      if (data.user) {
         const user: User = {
            fullName: data.user.name || data.user.fullName || firebaseUser.displayName || 'User',
            username: data.user.email?.split('@')[0] || 'user',
            email: data.user.email || firebaseUser.email,
            phone: data.user.phone || '',
            photoURL: firebaseUser.photoURL || data.user.photoURL || `https://ui-avatars.com/api/?name=${data.user.email}&background=random`,
            walletBalance: data.user.balance || 0,
            stats: data.user.stats || { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 },
            history: data.user.history || []
         };
         onLogin(user);
      }
    } catch (err: any) {
      console.error("Facebook Sign-In Error:", err);
      const errStr = String(err.message || err.code || "").toLowerCase();
      if (errStr.includes("unauthorized-domain") || errStr.includes("auth/unauthorized-domain") || err.code === "auth/unauthorized-domain") {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setError(err.message || t.somethingWrong);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeLogin = () => {
    const guestUser: User = {
      fullName: language === 'om' ? 'Fayyadamaa Bilisaa' : 'Guest User',
      username: 'guest',
      email: 'guest@multisphere.ai',
      phone: '',
      photoURL: 'https://ui-avatars.com/api/?name=Guest&background=00f5d4&color=fff',
      walletBalance: 0,
      stats: {
        ttsCount: 0,
        sttCount: 0,
        imagesCount: 0,
        videosCount: 0,
        audioRecordedCount: 0,
        liveMinutes: 0,
        sharesCount: 0,
        giftsSent: 0,
        giftsReceived: 0,
        giftsBought: 0,
        giftsSold: 0,
        quranAyahsCount: 0
      },
      history: []
    };
    onLogin(guestUser);
  };

  return (
    <div className="fixed inset-0 multisphere-diagonal-bg flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden border border-white/50 ring-8 ring-white/10">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-white to-black"></div>
        
        <div className="relative z-10">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight animate-bounce">{t.welcome}</h1>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Professional Afaan Oromo AI</p>
            </div>
            <div className="absolute top-8 right-8">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-gray-100 text-gray-900 text-[10px] rounded-lg px-2 py-1 border border-gray-200 font-black outline-none uppercase cursor-pointer"
              >
                <option value="om">Oromoo</option>
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </select>
            </div>

          <h2 className="text-2xl font-black text-gray-800 mb-6">{isLogin ? t.loginTitle : t.signupTitle}</h2>

          {unauthorizedDomain && (
            <div className="mb-6 p-5 bg-gradient-to-br from-amber-50/90 to-yellow-50/90 border-2 border-amber-300 rounded-[2.5rem] text-gray-800 text-[11px] font-medium shadow-md space-y-3 relative overflow-hidden animate-slide-up">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                  <Info size={16} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-[12px] uppercase tracking-tight">
                    {language === 'om' ? "Eenyummeessuu Domain (Firebase Domain Setup)" : 
                     language === 'am' ? "የዶሜይን ዲያግኖስቲክስ (Firebase Domain Setup)" : 
                     "Authorized Domain Required"}
                  </h4>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    {language === 'om' 
                      ? "Imeeyilii Googlen seenuuf maatila koodii keetti domain kana galmeessuu qabda. Firebase Console keessatti dabaladhu:" 
                      : language === 'am'
                      ? "በGoogle ለመግባት ይህንን ዶሜይን በFirebase መለያዎ ውስጥ ማረጋገጥ አለብዎት:: በFirebase Console ውስጥ እንደሚከተለው ያክሉ:"
                      : "To sign in with Google/Facebook, you need to authorize this domain in your Firebase project console first:"}
                  </p>
                </div>
              </div>

              {/* Copy box */}
              <div className="bg-white border border-amber-200 rounded-xl p-2 flex items-center justify-between gap-2 shadow-inner">
                <span className="font-mono text-[9px] text-amber-800 break-all select-all font-extrabold">{unauthorizedDomain}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-2.5 py-1.5 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider shrink-0 transition-colors"
                >
                  {copied ? <Check size={10} className="text-white" /> : <Copy size={10} />}
                  <span>{copied ? "Copied!" : "Copy Domain"}</span>
                </button>
              </div>

              {/* Step instructions */}
              <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1 leading-relaxed font-bold">
                <li>
                  {language === 'om' ? "Firebase Console banadhu" : language === 'am' ? "Firebase Console ይክፈቱ" : "Open Firebase Console"}
                </li>
                <li>
                  {language === 'om' ? "Authentication > Settings > Authorized Domains deemi" : 
                   language === 'am' ? "ወደ Authentication > Settings > Authorized Domains ይሂዱ" : 
                   "Go to Authentication > Settings > Authorized Domains"}
                </li>
                <li>
                  {language === 'om' ? "Domain olitti copy goote Add godhi" : 
                   language === 'am' ? "ዶሜይኑን Add በማድረግ ያስቀምጡ" : 
                   "Add the copied domain list & save!"}
                </li>
              </ol>

              <div className="flex items-center gap-3 pt-1 font-black text-[10px] uppercase tracking-wider">
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5"
                >
                  Firebase Console <ExternalLink size={10} />
                </a>
                <span className="text-amber-300">|</span>
                <button 
                  onClick={() => setUnauthorizedDomain(null)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  {language === 'om' ? "Dhiisi" : language === 'am' ? "ተወው" : "Dismiss"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-5 bg-red-600 text-white rounded-2xl text-[12px] font-bold shadow-lg animate-pulse border-2 border-white">
              <span className="font-black uppercase block mb-1 text-[10px] opacity-80">{t.errorTitle}</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="animate-slide-up">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t.fullName}</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-bold"
                  required
                />
              </div>
            )}

            <div className="animate-slide-up">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t.email}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-black/10 focus:border-black outline-none transition-all font-bold"
                required
              />
            </div>

            <div className="animate-slide-up">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-black/10 focus:border-black outline-none transition-all font-bold pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="aura-btn w-full mt-6 shadow-2xl h-16 transform hover:scale-[1.02] transition-all">
              <div className="aura-effect"></div>
              <div className="aura-content py-5 text-base w-full h-full bg-black text-white flex items-center justify-center gap-2 font-black">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t.processing}</span>
                    </div>
                ) : (
                  <span>{isLogin ? t.submitLogin : t.submitSignup}</span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-4">
            <button 
              onClick={handleFreeLogin}
              className="aura-btn w-full h-16 shadow-2xl group"
            >
              <div className="aura-effect" style={{ background: 'conic-gradient(#00f5d4, #00ff00, #a855f7, #ff006e, #00f5d4)' }}></div>
              <div className="aura-content py-5 text-base w-full h-full bg-black text-white flex items-center justify-center gap-3">
                <span className="text-xl group-hover:scale-125 transition-transform">🔓</span>
                <span className="text-[11px] font-black uppercase tracking-widest">{t.freeLogin}</span>
              </div>
            </button>
          </div>

          <div className="mt-8">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t-2 border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                {t.orContinue}
              </span>
              <div className="flex-grow border-t-2 border-gray-100"></div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button 
                  onClick={handleFacebookSignIn}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase bg-[#1877F2] text-white border-[#1877F2] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>

              <button 
                onClick={() => setShowOtherLogins(!showOtherLogins)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-gray-400 hover:text-black transition-all"
              >
                <MoreHorizontal size={16} />
                {language === 'om' ? 'Kaan Biroo' : 'Other Options'}
              </button>

              {showOtherLogins && (
                <div className="grid grid-cols-3 gap-2 animate-slide-up">
                  <button className="flex flex-col items-center justify-center gap-1 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                    <Github size={18} />
                    <span className="text-[8px] font-black uppercase">GitHub</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-1 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all text-green-600">
                    <MessageCircle size={18} />
                    <span className="text-[8px] font-black uppercase">WhatsApp</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-1 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all text-blue-500">
                    <Layout size={18} />
                    <span className="text-[8px] font-black uppercase">Microsoft</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-[11px] text-gray-500 hover:text-red-600 font-black uppercase tracking-wider transition-all border-b-2 border-transparent hover:border-red-600">
              {isLogin ? t.switchSignup : t.switchLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;
