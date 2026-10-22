import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useSubscription } from '../context/SubscriptionContext';

// Session-level dismissal state (resets on app restart)
const dismissed = new Set();
export const isDismissed = (key) => dismissed.has(key);
export const dismiss = (key) => dismissed.add(key);

const isLive = (ad) => {
  if (!ad.isActive) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (ad.startDate && ad.startDate > today) return false;
  if (ad.endDate && ad.endDate < today) return false;
  return true;
};

/**
 * Subscribes to the `ads` collection (managed in the Admin portal) and
 * returns ads split by type. Premium users never see ads.
 */
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
    const banners = ads.filter((a) => a.adType !== 'rich_media');
    const rich = ads.filter((a) => a.adType === 'rich_media');
    return {
      topBanners: banners,
      bottomBanners: [...banners].reverse(),
      richInline: rich,
      popup: rich.length ? rich[Math.floor(Math.random() * rich.length)] : null,
      placement,
    };
  }, [ads, placement]);
}
