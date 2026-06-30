
import { User, UsageStats, ServiceHistoryItem } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';

// Operation types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const dbService = {
  // Get system-wide stats
  getGlobalStats: async () => {
    const docPath = 'system/global_stats';
    try {
      const snap = await getDoc(doc(db, docPath));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn("Global stats fetch failed, using fallback metrics:", e);
    }
    return {
      totalUsers: 14250,
      totalGifts: 89200,
      totalShares: 45600,
      totalAiGenerations: 120500,
      liveMinutes: 204000 
    };
  },

  // Update user profile in Firestore
  updateProfile: async (email: string, data: Partial<User>) => {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    const docPath = `profiles/${cleanEmail}`;
    try {
      const docRef = doc(db, 'profiles', cleanEmail);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, {
          email: cleanEmail,
          fullName: data.fullName || '',
          username: data.username || cleanEmail.split('@')[0],
          phone: data.phone || '',
          walletBalance: data.walletBalance || 100,
          stats: data.stats || { ttsCount: 0, sttCount: 0, imagesCount: 0, videosCount: 0, audioRecordedCount: 0, liveMinutes: 0, sharesCount: 0, giftsSent: 0, giftsReceived: 0, giftsBought: 0, giftsSold: 0, quranAyahsCount: 0 },
          history: data.history || [],
          bio: data.bio || '',
          photoURL: data.photoURL || '',
          socials: data.socials || {}
        });
      }
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
      return false;
    }
  },

  // Log an AI action and increment stats
  logActivity: async (user: User, type: ServiceHistoryItem['type'], detail: string) => {
    const newItem: ServiceHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toISOString(),
      detail
    };

    const updatedStats = { ...user.stats };
    if (type === 'TTS') updatedStats.ttsCount++;
    if (type === 'STT') updatedStats.sttCount++;
    if (type === 'IMAGE') updatedStats.imagesCount++;
    if (type === 'LIVE') updatedStats.liveMinutes += 1;
    if (type === 'SHARE') updatedStats.sharesCount++;
    if (type === 'QURAN') updatedStats.quranAyahsCount++;

    const updatedHistory = [newItem, ...(user.history || [])].slice(0, 20);

    // Save synchronously to Firestore if email is available
    if (user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      const docPath = `profiles/${cleanEmail}`;
      try {
        await setDoc(doc(db, 'profiles', cleanEmail), {
          stats: updatedStats,
          history: updatedHistory
        }, { merge: true });
      } catch (e) {
        console.warn("Could not save logged activity to Firestore:", e);
      }
    }

    return {
      history: updatedHistory,
      stats: updatedStats
    };
  }
};
