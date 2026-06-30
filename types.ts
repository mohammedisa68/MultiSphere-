
export type ResetState = true;

// Language type definition
export type Language = 'om' | 'en' | 'am' | 'ar' | 'tr' | 'ti' | 'so';

export interface UsageStats {
  ttsCount: number;
  sttCount: number;
  imagesCount: number;
  videosCount: number;
  audioRecordedCount: number;
  liveMinutes: number;
  sharesCount: number;
  giftsSent: number;
  giftsReceived: number;
  giftsBought: number;
  giftsSold: number;
  quranAyahsCount: number;
}

export interface User {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  photoURL?: string;
  bio?: string;
  walletBalance: number;
  stats: UsageStats;
  history: ServiceHistoryItem[];
  socials?: {
    tiktok?: string;
    facebook?: string;
    telegram?: string;
    whatsapp?: string;
    imo?: string;
  };
}

export interface ServiceHistoryItem {
  id: string;
  type: 'TTS' | 'STT' | 'IMAGE' | 'VIDEO' | 'LIVE' | 'GIFT' | 'SHARE' | 'QURAN' | 'MULTIMODAL';
  timestamp: string;
  detail: string;
  mediaUrl?: string;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
}

export interface Ayah {
  number: number;
  text: string;
  translation: string;
  audio: string;
  numberInSurah: number;
}

export type QuranMode = 'learning' | 'practice';

export interface Transaction {
  id: string;
  type: 'deposit' | 'gift_received' | 'gift_sent';
  amount: number;
  method: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}
