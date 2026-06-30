import React, { useState, useEffect } from 'react';
import { Language, Transaction } from '../types';

interface WalletSectionProps {
  language: Language;
}

type Currency = 'ETB' | 'USD' | 'EUR';

const WalletSection: React.FC<WalletSectionProps> = ({ language }) => {
  // --- WALLET USER SESSION CONTROLS ---
  const [walletUser, setWalletUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('multisphere_wallet_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth toggle
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPasscode, setAuthPasscode] = useState('');
  const [authNationalId, setAuthNationalId] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // States for dynamic free AI keys configuration
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('multisphere_gemini_apikey') || '');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Madaallii waliigalaa (ETB dhaan inside local and database)
  const [balance, setBalance] = useState(0.00); 
  const [activeTab, setActiveTab] = useState<'deposit' | 'send' | 'gift' | 'history'>('deposit');
  const [selectedMethod, setSelectedMethod] = useState<'telebirr' | 'mastercard' | 'paypal' | 'coin' | null>(null);
  
  // Gosa maallaqaa filatame kuusa yeroo (localStorage) irraa fiduu
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('multisphere_currency');
    return (saved === 'USD' || saved === 'EUR' || saved === 'ETB') ? saved : 'ETB';
  });

  // Recipient list & transfer states
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendOtpCode, setSendOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [receivedSimulatedOtp, setReceivedSimulatedOtp] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Gosa maallaqaa jijjiirame kuusuu
  useEffect(() => {
    localStorage.setItem('multisphere_currency', currency);
  }, [currency]);

  // Gatiin jijjiirraa maallaqaa (Base: ETB) - Akka kallaattiin gabaa global irraa dhufuuf
  const [rates, setRates] = useState<Record<Currency, number>>({
    ETB: 1,
    USD: 0.0083, // Gatii tilmaamaa (default)
    EUR: 0.0076
  });

  // Gabaa Addunyaa (Global Market) irraa gatii maallaqaa fiduu
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/wallet/rates');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data && data.rates) {
          setRates({
            ETB: 1,
            USD: data.rates.USD || 0.0083,
            EUR: data.rates.EUR || 0.0076
          });
          console.log("Rates updated from public registry");
        }
      } catch (error: any) {
        console.warn("Currency conversion service partially offline, utilizing high-fidelity local fallbacks:", error);
      }
    };
    fetchRates();
  }, []);

  // Sync session & data loads
  const fetchHistory = async (email: string) => {
    try {
      const response = await fetch(`/api/wallet/history?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (err) {
      console.warn("Wallet history sync delayed, checking local cache...");
    }
  };

  const fetchRegisteredUsers = async (myEmail: string) => {
    try {
      const response = await fetch(`/api/wallet/users?email=${encodeURIComponent(myEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data);
      }
    } catch (err) {
      console.warn("Social wallet directory temporarily disconnected.");
    }
  };

  const refreshUserData = async (email: string) => {
    try {
      const response = await fetch('/api/wallet/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && resJson.account) {
          setWalletUser(resJson.account);
          setBalance(resJson.account.balance);
          localStorage.setItem('multisphere_wallet_session', JSON.stringify(resJson.account));
        }
      }
    } catch (err) {
      console.warn("Primary wallet sync offline, maintaining transient state balance.");
    }
  };

  useEffect(() => {
    if (walletUser) {
      setBalance(walletUser.balance || 0);
      fetchHistory(walletUser.email);
      fetchRegisteredUsers(walletUser.email);
      // Poll dynamically
      refreshUserData(walletUser.email);
    }
  }, [walletUser]);

  // Maallaqa filatameetti jijjiiruu
  const convert = (val: number) => (val * rates[currency]).toFixed(2);
  const convertToBase = (val: number) => val / rates[currency];

  // Forms deposit
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [giftCode, setGiftCode] = useState('');

  const saveGeminiKey = (key: string) => {
    localStorage.setItem('multisphere_gemini_apikey', key.trim());
    setCustomGeminiKey(key.trim());
    setIsApiKeySaved(true);
    setTimeout(() => setIsApiKeySaved(false), 2000);
  };

  // --- REGISTRATION / LOGIN BACKEND HANDLERS ---
  const handleWalletRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await fetch('/api/wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          phone: authPhone,
          name: authName,
          passcode: authPasscode,
          nationalId: authNationalId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Register failed.");
      }
      setWalletUser(data.account);
      localStorage.setItem('multisphere_wallet_session', JSON.stringify(data.account));
      setAuthEmail('');
      setAuthPhone('');
      setAuthName('');
      setAuthPasscode('');
      setAuthNationalId('');
    } catch (err: any) {
      setAuthError(err.message || 'Error occurred during registration');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWalletLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await fetch('/api/wallet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          passcode: authPasscode
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Email ykn Passcode dogoggora.");
      }
      setWalletUser(data.account);
      localStorage.setItem('multisphere_wallet_session', JSON.stringify(data.account));
      setAuthEmail('');
      setAuthPasscode('');
    } catch (err: any) {
      setAuthError(err.message || 'Login details invalid');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWalletLogout = () => {
    setWalletUser(null);
    localStorage.removeItem('multisphere_wallet_session');
    setTransactions([]);
  };

  // --- BALANCE TRANSFER (2-STEP VERIFICATION OTP) BACKEND HANDLERS ---
  const handleSendOtp = async () => {
    setSendError('');
    setSendSuccess('');
    setIsSending(true);
    try {
      const numericAmount = parseFloat(sendAmount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error(language === 'om' ? 'Hangi maallaqaa sirrii miti.' : language === 'am' ? 'ባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ::' : 'Please enter a valid amount.');
      }
      if (!sendRecipient) {
        throw new Error(language === 'om' ? 'Herrega fudhataa galchi.' : language === 'am' ? 'እባክዎ ተቀባይ መለያ ያስገቡ::' : 'Please select or enter the recipient account.');
      }

      // Convert amount to Base ETB
      const baseAmount = convertToBase(numericAmount);

      const response = await fetch('/api/wallet/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: walletUser.email,
          recipientEmailOrPhone: sendRecipient,
          amount: baseAmount
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error preparing transfer.");
      }

      setIsOtpSent(true);
      setReceivedSimulatedOtp(data.otpCode);
    } catch (err: any) {
      setSendError(err.message || 'Could not request confirmation code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmTransfer = async () => {
    setSendError('');
    setSendSuccess('');
    setIsSending(true);
    try {
      const baseAmount = convertToBase(parseFloat(sendAmount));
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: walletUser.email,
          recipientEmailOrPhone: sendRecipient,
          amount: baseAmount,
          otpCode: sendOtpCode
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Confirmation verification failed.");
      }

      setWalletUser(data.updatedAccount);
      localStorage.setItem('multisphere_wallet_session', JSON.stringify(data.updatedAccount));
      setBalance(data.updatedAccount.balance);
      
      setSendSuccess(language === 'om' ? 'Kaffaltiin daddabarsaa milkiin xumurameera!' : language === 'am' ? 'የገንዘብ ዝውውሩ በተሳካ ሁኔታ ተጠናቋል!' : 'Funds transferred effectively!');
      
      setSendRecipient('');
      setSendAmount('');
      setSendOtpCode('');
      setIsOtpSent(false);
      setReceivedSimulatedOtp('');
      
      fetchHistory(walletUser.email);
      alert("Transaction successfully");
    } catch (err: any) {
      setSendError(err.message || "OTP check failed.");
      alert("something is wrong");
    } finally {
      setIsSending(false);
    }
  };

  // --- DEPOSIT BACKEND HANDLER ---
  const handleProcess = async () => {
    if (!amount) return;
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount)) return;

    // Convert input amount to base ETB for storage
    const baseAmount = convertToBase(inputAmount);

    if (!walletUser) {
      alert(language === 'om' ? 'Mee dura herrega wallet keetti seeni.' : language === 'am' ? 'እባክዎ መጀመሪያ ወደ ዋሌት አካውንት ይግቡ::' : 'Please authenticate into your wallet first.');
      return;
    }

    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: walletUser.email,
          amount: baseAmount,
          method: selectedMethod || 'system'
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || "Deposit failed on gateway server.");
      }

      setWalletUser(resJson.updatedAccount);
      localStorage.setItem('multisphere_wallet_session', JSON.stringify(resJson.updatedAccount));
      setBalance(resJson.updatedAccount.balance);
      setTransactions(prev => [resJson.newTx, ...prev]);

      alert("Transaction successfully");
      setAmount('');
      setSelectedMethod(null);
    } catch (err: any) {
      alert("something is wrong");
    }
  };

  // Local static list backup
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Localization dict
  const getT = (lang: Language) => {
    const base = {
      om: {
        balance: "Madaallii Multi_Sphere Wallet",
        deposit: "Maallaqa Galchuu",
        send: "Maallaqa Erguu",
        gift: "Kennaa / Gift",
        history: "Seenaa (History)",
        methodSelect: "Karaa kaffaltii filadhu:",
        payWith: "Kaffali karaa",
        enterAmount: `Hanga Maallaqaa (${currency})`,
        enterPhone: "Lakkoofsa Bilbilaa",
        process: "Raawwadhu",
        connectSocial: "Social Media Wal-qabsiisi",
        receiveGifts: "Kennaa Fudhachuuf",
        sendGift: "Kennaa Erguuf",
        socialDesc: "TikTok, Facebook ykn YouTube kee wal-qabsiisuun kennaa kallattiin 'Multi_Sphere Wallet' keessatti fudhadhu.",
        connectBtn: "Wal-qabsiisi (Connect)",
        redeem: "Gift Code Galchi",
        redeemBtn: "Fudhadhu",
        successMsg: "Milkaa'inaan raawwatameera!",
        mockNote: "Kuni simuleeshinii kaffaltii qabatamaa fi tajaajila server ti.",
        currencyLabel: "Gosa Maallaqaa",
        fabricTitle: "Ulaagaa Fabric / HuluPay",
        fabricTokenBtn: "Token Fabric Fidi (Apply Token)",
        fabricConnecting: "Token uumaa jira...",
        apiKeyTitle: "Qundeessaa Gemini API Key Bilisaa",
        apiKeyDesc: "Madaalliin yoo dhumate yookan tajaajilli yoo dhaabbate key kee kan bilisaa galchii tajaajila kallaattiin jalqabsiisi.",
        apiKeySaved: "Jiijjiirraan teessoo AI milkiin ol-ka'eera!",
        saveKey: "API Key Ol-Kaayi",
        appIdPlaceholder: "Fabric App ID (X-APP-Key) galchi",
        appSecretPlaceholder: "Fabric App Secret galchi",
        baseUrlPlaceholder: "Fkn: https://payment.hulusoftech.com",
        signIn: "Seeni (Sign In)",
        signUp: "Galmaa'i (Register)",
        walletAuth: "Wal-qabsiisi Herrega Wallet",
        email: "Email Herregaa",
        fullName: "Maqaa Guutuu",
        nationalId: "Lakkoofsa Eenyummaa Biyyoolessaa (National ID)",
        passcode: "Koodii Iccitii (Passcode)",
        noAccount: "Herrega hin qabduu? Galmee uumi.",
        haveAccount: "Duraan herrega qabda? Seeni herregaan.",
        logout: "Ba'i (Logout)",
        recipient: "Email ykn Bilbila Fudhataa",
        recipientSelect: "Uummata Galmaa'e Filadhu",
        amountToTransfer: `Hanga Maallaqaa Ergamuu (${currency})`,
        requestOTP: "Koodii Mirkaneessaa (OTP) Gaafadhu",
        enterOTP: "Koodii Mirkaneessaa Galchi",
        confirmTransfer: "Daddabarsi Maallaqaa Mirkaneessi",
        otpSimulated: "Koodiin Mirkaneessaa Bilbila kee fi Email irratti kantiin ergamuu tilmaame: "
      },
      en: {
        balance: "Multi_Sphere Wallet Balance",
        deposit: "Deposit Funds",
        send: "Send Money",
        gift: "Gifts & Rewards",
        history: "History",
        methodSelect: "Select Payment Method:",
        payWith: "Pay with",
        enterAmount: `Amount (${currency})`,
        enterPhone: "Phone Number",
        process: "Process Payment",
        connectSocial: "Connect Social Media",
        receiveGifts: "To Receive Gifts",
        sendGift: "To Send Gifts",
        socialDesc: "Connect your TikTok, Facebook or YouTube to receive gifts directly into Multi_Sphere Wallet.",
        connectBtn: "Connect Now",
        redeem: "Enter Gift Code",
        redeemBtn: "Redeem",
        successMsg: "Transaction Successful!",
        mockNote: "This supports real API token lookups and db simulations.",
        currencyLabel: "Currency",
        fabricTitle: "Fabric / HuluPay Credentials",
        fabricTokenBtn: "Request Fabric Token",
        fabricConnecting: "Requesting Token...",
        apiKeyTitle: "Free Gemini API Key Setup",
        apiKeyDesc: "If standard pre-configured AI quota runs out, paste your own free Gemini API key to restore perfect AI translation & speech synthesis.",
        apiKeySaved: "API Key saved successfully!",
        saveKey: "Save API Key",
        appIdPlaceholder: "Enter Fabric App ID (X-APP-Key)",
        appSecretPlaceholder: "Enter Fabric App Secret",
        baseUrlPlaceholder: "E.g. https://payment.hulusoftech.com",
        signIn: "Sign In",
        signUp: "Create Account",
        walletAuth: "Secure Wallet Account Login",
        email: "Email Address",
        fullName: "Full Name",
        nationalId: "National ID Number",
        passcode: "Secure Passcode",
        noAccount: "No wallet account yet? Create one",
        haveAccount: "Already registered? Login here",
        logout: "Logout from Wallet",
        recipient: "Recipient (Email or Phone)",
        recipientSelect: "Select Registered User",
        amountToTransfer: `Amount to Transfer (${currency})`,
        requestOTP: "Request Verification OTP Code",
        enterOTP: "Verify 6-Digit OTP Code",
        confirmTransfer: "Confirm and Transfer Funds",
        otpSimulated: "Simulated Verification code dispatched: "
      },
      am: {
        balance: "የዋሌት ቀሪ ሂሳብ",
        deposit: "ገንዘብ ማስገቢያ",
        send: "ገንዘብ ማስተላለፊያ",
        gift: "ስጦታ እና ሽልማት",
        history: "ታሪክ (History)",
        methodSelect: "የክፍያ ዘዴ ይምረጡ:",
        payWith: "በዚህ ይክፈሉ",
        enterAmount: `የገንዘብ መጠን (${currency})`,
        enterPhone: "የስልክ ቁጥር",
        process: "ክፍያውን ፈጽም",
        connectSocial: "ማህበራዊ ሚዲያ ያገናኙ",
        receiveGifts: "ስጦታዎችን ለመቀበል",
        sendGift: "ስጦታዎችን ለመላክ",
        socialDesc: "የTikTok፣ Facebook ወይም YouTube አካውንትዎን በማገናኘት ስጦታዎችን በቀጥታ ወደ ዋሌትዎ ይቀበሉ።",
        connectBtn: "አሁን ያገናኙ",
        redeem: "የስጦታ ኮድ ያስገቡ",
        redeemBtn: "ተቀበል",
        successMsg: "ክፍያው በተሳካ ሁኔታ ተጠናቋል!",
        mockNote: "ይህ የቀጥታ ኤፒአይ ቶክኖችን እና ማስመሰያዎችን ይደግፋል::",
        currencyLabel: "የገንዘብ አይነት",
        fabricTitle: "የFabric / HuluPay መለያዎች",
        fabricTokenBtn: "የFabric ቶክን ጠይቅ",
        fabricConnecting: "ቶክን በመጠየቅ ላይ...",
        apiKeyTitle: "ነፃ የGemini API Key ማዋቀሪያ",
        apiKeyDesc: "ቀድሞ የተዋቀረው የ AI ሒሳብ ካለቀ፡ ሁሉንም የትርጉም እና የንግግር አገልግሎቶች ለመቀጠል የራስዎን ነፃ የGemini ኤፒአይ ቁልፍ እዚህ ያስገቡ።",
        apiKeySaved: "የኤፒአይ ቁልፍ በትክክል ተቀምጧል!",
        saveKey: "አስቀምጥ",
        appIdPlaceholder: "Fabric App ID (X-APP-Key) ያስገቡ",
        appSecretPlaceholder: "Fabric App Secret ያስገቡ",
        baseUrlPlaceholder: "ቅጽ: https://payment.hulusoftech.com",
        signIn: "ይግቡ",
        signUp: "አካውንት ይክፈቱ",
        walletAuth: "የዋሌት ደህንነቱ የተጠበቀ መግቢያ",
        email: "ኢሜይል አድራሻ",
        fullName: "ሙሉ ስም",
        nationalId: "የብሔራዊ መታወቂያ ቁጥር (National ID)",
        passcode: "የይለፍ ኮድ",
        noAccount: "አካውንት የለዎትም? ይመዝገቡ",
        haveAccount: "አካውንት አሎት? ይግቡ",
        logout: "ይውጡ (Logout)",
        recipient: "ተቀባይ (ኢሜይል ወይም ስልክ)",
        recipientSelect: "የተመዘገበ ተቀባይ መርጥ",
        amountToTransfer: `የሚላከው ማዕቀፍ መጠን (${currency})`,
        requestOTP: "የማረጋገጫ ኮድ (OTP) ጠይቅ",
        enterOTP: "የማረጋገጫ ኮድ አስገባ",
        confirmTransfer: "አረጋግጥና ገንዘቡን አስተላልፍ",
        otpSimulated: "የማስመሰያ ማረጋገጫ ኮድ ተልኳል: "
      }
    };
    return (base as any)[lang] || base.en;
  };

  const t = getT(language);

  const localContent = {
    om: { active: "Ira jira (Active)", idLabel: "Akk herregaa", noTx: "Seenaan kaffaltii hin jiru ykn hin kuusamne (No transactions)." },
    en: { active: "Connected Active", idLabel: "Wallet Account", noTx: "No stored transactions found in Database storage." },
    am: { active: "ንቁ (Active)", idLabel: "የዋሌት መለያ", noTx: "ምንም የክፍያ ታሪክ አገልግሎት የለም።" }
  }[language] || { active: "Active", idLabel: "Account", noTx: "No transactions yet." };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-fade-in text-left">
      {/* AUTHENTICATION OVERLAY / SCREEN FOR WALLET */}
      {!walletUser ? (
        <div className="max-w-md mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              💳
            </div>
            <h2 className="text-2xl font-black text-gray-900">{t.walletAuth}</h2>
            <p className="text-xs text-gray-500 mt-1">MultiSphere Backend Cloud Database Storage Sync</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => { setAuthTab('signin'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authTab === 'signin' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            >
              {t.signIn}
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authTab === 'register' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            >
              {t.signUp}
            </button>
          </div>

          <form onSubmit={authTab === 'signin' ? handleWalletLogin : handleWalletRegister} className="space-y-4">
            {authTab === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.fullName}</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Mohammed Abdu"
                  required
                  className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {authTab === 'signin' ? (language === 'om' ? 'Email yookan Lakkoofsa ID' : language === 'am' ? 'ኢሜይል ወይም ብሔራዊ መታወቂያ' : 'Email Address or National ID') : t.email}
              </label>
              <input 
                type="text" 
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder={authTab === 'signin' ? (language === 'om' ? 'you@domain.com ykn NID-987654' : language === 'am' ? 'you@domain.com ወይም NID-987654' : 'you@domain.com or NID-987654') : "you@domain.com"}
                required
                className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
              />
            </div>

            {authTab === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.phone}</label>
                  <input 
                    type="text" 
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="0912345678"
                    required
                    className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.nationalId}</label>
                  <input 
                    type="text" 
                    value={authNationalId}
                    onChange={(e) => setAuthNationalId(e.target.value)}
                    placeholder="e.g. NID-987654"
                    required
                    className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-mono font-medium"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.passcode}</label>
              <input 
                type="password" 
                maxLength={8}
                value={authPasscode}
                onChange={(e) => setAuthPasscode(e.target.value)}
                placeholder="Enter numbers/passcode"
                required
                className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-mono tracking-widest font-semibold"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ Dogoggora: {authError}
              </div>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors text-xs font-bold leading-none shadow-lg shadow-indigo-500/20"
            >
              {authLoading ? "Sassaabaa jira..." : (authTab === 'signin' ? t.signIn : t.signUp)}
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-500 mt-6 font-semibold hover:underline cursor-pointer" onClick={() => setAuthTab(authTab === 'signin' ? 'register' : 'signin')}>
            {authTab === 'signin' ? t.noAccount : t.haveAccount}
          </p>
        </div>
      ) : (
        <div>
          {/* LOGGED IN WALLET HEADER */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl text-white mb-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase hidden sm:block">{t.currencyLabel}</span>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer hover:bg-white/20 focus:ring-2 focus:ring-yellow-500 appearance-none pl-3 pr-8"
                style={{backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto'}}
              >
                <option value="ETB" className="text-black bg-white">🇪🇹 ETB</option>
                <option value="USD" className="text-black bg-white">🇺🇸 USD</option>
                <option value="EUR" className="text-black bg-white">🇪🇺 EUR</option>
              </select>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-yellow-400 font-bold text-xs">⭐ Akkam, {walletUser.name}!</p>
                  <p className="text-gray-400 text-[10px] font-mono mb-2">{walletUser.email}</p>
                </div>
                <button 
                  onClick={handleWalletLogout}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                >
                  {t.logout}
                </button>
              </div>

              <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1 mt-3">{t.balance}</p>
              <h2 className="text-3xl font-black flex items-baseline gap-2">
                {convert(balance)} <span className="text-lg text-yellow-400">{currency}</span>
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono">{localContent.idLabel}: {walletUser.phone}</span>
                {walletUser.nationalId && (
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-indigo-200 font-semibold border border-white/5">ID: {walletUser.nationalId}</span>
                )}
                <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold">{localContent.active}</span>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-xl">
            {['deposit', 'send', 'gift', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all capitalize ${
                  activeTab === tab ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {(t as any)[tab] || tab}
              </button>
            ))}
          </div>

          {/* DEPOSIT TAB */}
          {activeTab === 'deposit' && (
            <div className="animate-slide-up">
              <h3 className="font-bold text-gray-700 mb-4">{t.methodSelect}</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { id: 'telebirr', name: 'Telebirr', color: 'bg-blue-500' },
                  { id: 'mastercard', name: 'MasterCard', color: 'bg-red-500' },
                  { id: 'paypal', name: 'PayPal', color: 'bg-blue-700' },
                  { id: 'coin', name: 'Coin Gift', color: 'bg-yellow-500' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (m.id === 'paypal') {
                        window.open('https://www.paypal.com', '_blank');
                        setSelectedMethod(m.id as any);
                      } else if (m.id === 'mastercard') {
                        window.open('https://www.mastercard.com', '_blank');
                        setSelectedMethod(m.id as any);
                      } else if (m.id === 'telebirr') {
                        window.location.href = 'tel:*127#';
                        setSelectedMethod(m.id as any);
                      } else {
                        setSelectedMethod(m.id as any);
                      }
                    }}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                      selectedMethod === m.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${m.color}`}></div>
                    <span className="text-xs font-bold">{m.name}</span>
                  </button>
                ))}
              </div>

              {selectedMethod && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h4 className="font-bold mb-4">{t.payWith} {selectedMethod.toUpperCase()}</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">{t.enterAmount}</label>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`0.00 ${currency}`}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" 
                      />
                    </div>
                    {selectedMethod === 'telebirr' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.enterPhone}</label>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="09..."
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" 
                        />
                      </div>
                    )}
                    <button 
                      onClick={handleProcess}
                      className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      {t.process}
                    </button>
                    <p className="text-center text-xs text-gray-400">{t.mockNote}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEND TAB - TWO STEP OTP VERIFICATION TRANSFER */}
          {activeTab === 'send' && (
            <div className="animate-slide-up space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="font-extrabold text-base text-gray-800 mb-4 flex items-center gap-2">
                  <span>↗</span> {t.sendMoney}
                </h3>

                <div className="space-y-4">
                  {/* Option helper users dropdown */}
                  {availableUsers.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.recipientSelect}</label>
                      <select 
                        onChange={(e) => setSendRecipient(e.target.value)}
                        value={sendRecipient}
                        className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium cursor-pointer"
                      >
                        <option value="">-- {t.recipientSelect} --</option>
                        {availableUsers.map(user => (
                          <option key={user.email} value={user.email}>{user.name} ({user.email})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.recipient}</label>
                    <input 
                      type="text" 
                      value={sendRecipient}
                      onChange={(e) => setSendRecipient(e.target.value)}
                      placeholder="Enter recipient's email or phone number"
                      className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.amountToTransfer}</label>
                    <input 
                      type="number" 
                      value={sendAmount}
                      disabled={isOtpSent}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder={`0.00 ${currency}`}
                      className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                    />
                  </div>

                  {isOtpSent && (
                    <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl space-y-3">
                      <div className="text-[11px] font-bold text-teal-850">
                        {t.otpSimulated}
                      </div>
                      <div className="inline-block bg-teal-600 text-white font-mono font-black text-lg px-4 py-1 rounded-lg">
                        {receivedSimulatedOtp}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.enterOTP}</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          value={sendOtpCode}
                          onChange={(e) => setSendOtpCode(e.target.value)}
                          placeholder="XXXXXX"
                          className="w-full p-3 border border-teal-300 bg-white rounded-xl text-sm font-mono tracking-widest text-center font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {sendError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
                      ⚠️ Dogoggora: {sendError}
                    </div>
                  )}

                  {sendSuccess && (
                    <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs font-semibold">
                      ✅ {sendSuccess}
                    </div>
                  )}

                  {!isOtpSent ? (
                    <button 
                      onClick={handleSendOtp}
                      disabled={isSending || !sendRecipient || !sendAmount}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-xs shadow-md"
                    >
                      {isSending ? "Processing..." : t.requestOTP}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setIsOtpSent(false); setSendOtpCode(''); setReceivedSimulatedOtp(''); }}
                        className="p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={handleConfirmTransfer}
                        disabled={isSending || sendOtpCode.length < 5}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-xs shadow-md"
                      >
                        {isSending ? "Sending..." : t.confirmTransfer}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GIFT TAB */}
          {activeTab === 'gift' && (
            <div className="animate-slide-up space-y-6">
              <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-[2px] rounded-2xl">
                <div className="bg-white p-5 rounded-2xl h-full">
                  <h3 className="font-bold text-lg mb-2">🎁 {t.connectSocial}</h3>
                  <p className="text-gray-600 text-sm mb-4">{t.socialDesc}</p>
                  <div className="flex gap-2 justify-center mb-4">
                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold">Tk</div>
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">Fb</div>
                    <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">Yt</div>
                  </div>
                  <button className="w-full bg-gray-900 text-white font-bold py-2 rounded-lg text-sm hover:scale-[1.02] transition-transform">
                    {t.connectBtn}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-sm mb-3">{t.redeem}</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="MULTI_SPHERE-GIFT-XXXX"
                    className="flex-1 p-3 border rounded-lg uppercase tracking-widest text-sm focus:outline-none focus:border-purple-500 bg-white"
                  />
                  <button 
                    onClick={() => { if(giftCode) alert("Code Redeemed!"); setGiftCode(''); }}
                    className="bg-purple-600 text-white px-6 rounded-lg font-bold text-sm"
                  >
                    {t.redeemBtn}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-xs text-indigo-900 uppercase tracking-widest">
                  Database History Sync Tracker
                </h4>
                <button 
                  onClick={() => fetchHistory(walletUser.email)}
                  className="text-[10px] text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors font-bold px-3 py-1 rounded-md"
                >
                  Force refresh
                </button>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-xs">{localContent.noTx}</p>
                ) : transactions.map((tx: any) => (
                  <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        tx.type === 'deposit' || tx.type === 'transfer_received' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.type === 'deposit' ? '↓' : tx.type === 'transfer_received' ? '🎁' : '↗'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-800">{tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.date} • {tx.method}</p>
                      </div>
                    </div>
                    <div className={`font-black ${
                      tx.type === 'deposit' || tx.type === 'transfer_received' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'transfer_received' ? '+' : '-'}{convert(tx.amount)} {currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default WalletSection;
