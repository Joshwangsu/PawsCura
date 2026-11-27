import { useEffect, useMemo, useState } from 'react';
import { collection, doc, increment, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useSubscription } from '../context/SubscriptionContext';

const dismissed = new Set();
export const isDismissed = (key) => dismissed.has(key);
export const dismiss = (key) => dismissed.add(key);

export function getLocalIsoDate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isAdLive(ad, now = new Date()) {
  if (!ad || !ad.isActive) return false;
  const today = getLocalIsoDate(now);
  if (ad.startDate && ad.startDate > today) return false;
  if (ad.endDate && ad.endDate < today) return false;
  return true;
}

const isLive = (ad) => isAdLive(ad);

export async function trackAdClick(adId) {
  if (!adId) return;
  try {
    await updateDoc(doc(db, 'ads', adId), {
      clicksCount: increment(1),
    });
  } catch (err) {
    console.log('Ad click tracking skipped:', err?.message);
  }
}

export function useAds(placement = 'default') {
  const { isPremium } = useSubscription();
  const [ads, setAds] = useState([]);

  useEffect(() => {
    if (isPremium) {
      setAds([]);
      return undefined;
    }
    const unsub = onSnapshot(
      collection(db, 'ads'),
      (snap) => setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isLive)),
      (err) => console.log('Ads load error:', err?.message)
    );
    return unsub;
  }, [isPremium]);

  return useMemo(() => {
    const rich = ads.filter((a) => a.adType === 'rich_media');
    const effectiveRich = rich.length > 0 ? rich : ads;
    const allowPopup = placement !== 'clinics';
    return {
      topBanners: ads,
      bottomBanners: [...ads].reverse(),
      richInline: effectiveRich,
      popup: (allowPopup && effectiveRich.length) ? effectiveRich[Math.floor(Math.random() * effectiveRich.length)] : null,
      placement,
    };
  }, [ads, placement]);
}
