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
