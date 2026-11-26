import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';
import { showAlert } from '../components/CustomAlert';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

function toJsDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [scanUsage, setScanUsage] = useState({ count: 0, date: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setSubscriptionStatus('free');
      setSubscriptionEndDate(null);
      setScanUsage({ count: 0, date: '' });
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();

          if (data.isSuspended) {
            signOut(auth).catch((err) => console.log(err));
            showAlert({
              title: 'Account Suspended',
              message: 'Your account has been suspended by an administrator.',
              type: 'error',
            });
            return;
          }

          if (data.role && data.role !== 'user') {
            signOut(auth).catch((err) => console.log(err));
            return;
          }

          const endDate = toJsDate(data.subscriptionEndDate);
          const nowMs = Date.now();
          const isExpired = Boolean(endDate && endDate.getTime() <= nowMs);
          const persistedStatus = data.subscriptionStatus;

          if (isExpired && (data.isPremium || persistedStatus === 'active' || persistedStatus === 'cancelled')) {
            setIsPremium(false);
            setSubscriptionStatus('expired');
            setSubscriptionEndDate(endDate);
            setDoc(
              userDocRef,
              {
                isPremium: false,
                subscriptionStatus: 'expired',
                autoRenew: false,
              },
              { merge: true }
            ).catch((err) => console.warn('Subscription expiration sync warning:', err?.message));
          } else if (persistedStatus === 'cancelled') {
            const hasRemainingPeriod = Boolean(endDate && endDate.getTime() > nowMs);
            setIsPremium(hasRemainingPeriod);
            setSubscriptionStatus(hasRemainingPeriod ? 'cancelled' : 'expired');
            setSubscriptionEndDate(endDate);
          } else if (persistedStatus === 'expired') {
            setIsPremium(false);
            setSubscriptionStatus('expired');
            setSubscriptionEndDate(endDate);
          } else {
            const activeFlag = !!data.isPremium;
            setIsPremium(activeFlag);
            setSubscriptionStatus(persistedStatus || (activeFlag ? 'active' : 'free'));
            setSubscriptionEndDate(endDate);
          }

          const fallbackFullName = data.username || user.displayName || (user.email ? user.email.split('@')[0] : 'User');
          const nameParts = fallbackFullName.trim().split(/\s+/);
          const derivedFirst = data.firstName || nameParts[0] || 'User';
          const derivedLast = data.lastName !== undefined ? data.lastName : nameParts.slice(1).join(' ');
          if (!data.username || !data.email || !data.firstName || !data.role) {
            updateDoc(userDocRef, {
              userId: user.uid,
              firstName: derivedFirst,
              lastName: derivedLast,
              username: fallbackFullName,
              email: data.email || user.email || '',
              role: data.role || 'user',
            }).catch((err) => console.log(`Error updating user details: ${err}`));
          }

          const todayStr = new Date().toISOString().split('T')[0];
          if (data.scanUsageDate !== todayStr) {
            setDoc(
              userDocRef,
              {
                scanUsageCount: 0,
                scanUsageDate: todayStr,
              },
              { merge: true }
            ).catch((err) => console.warn('Reset scan count warning:', err?.message));
            setScanUsage({ count: 0, date: todayStr });
          } else {
            setScanUsage({
              count: data.scanUsageCount || 0,
              date: data.scanUsageDate,
            });
          }
        } else {
          const todayStr = new Date().toISOString().split('T')[0];
          const fallbackFullName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
          const nameParts = fallbackFullName.trim().split(/\s+/);
          setDoc(userDocRef, {
            userId: user.uid,
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' '),
            username: fallbackFullName,
            email: user.email || '',
            role: 'user',
            isPremium: false,
            subscriptionStatus: 'free',
            autoRenew: false,
            scanUsageCount: 0,
            scanUsageDate: todayStr,
          }).catch((err) => console.warn('Init user profile warning:', err?.message));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('User subscription snapshot error:', err?.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const incrementScanCount = async () => {
    if (!user || isPremium) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const newCount = scanUsage.count + 1;
      const todayStr = new Date().toISOString().split('T')[0];
      await setDoc(
        userDocRef,
        {
          scanUsageCount: newCount,
          scanUsageDate: todayStr,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to increment scan count (likely offline):', err?.message);
    }
  };

  const activatePremiumSubscription = async ({ cardholderName = '', cardBrand = 'Card', cardLast4 = '' } = {}) => {
    if (!user?.uid) {
      throw new Error('You must be signed in to activate a subscription.');
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const subDocRef = await addDoc(collection(db, 'subscriptions'), {
      userId: user.uid,
      planType: 'premium',
      status: 'active',
      autoRenew: true,
      startDate: serverTimestamp(),
      endDate,
    });

    await addDoc(collection(db, 'payments'), {
      userId: user.uid,
      subscriptionId: subDocRef.id,
      amount: 9.99,
      status: 'Success',
      method: cardBrand || 'Card',
      cardLast4: cardLast4 || '',
      planName: 'Premium',
      userEmail: user.email || '',
      cardholderName: cardholderName || '',
      date: serverTimestamp(),
    });

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        isPremium: true,
        subscriptionStatus: 'active',
        autoRenew: true,
        subscriptionEndDate: endDate,
      },
      { merge: true }
    );

    setIsPremium(true);
    setSubscriptionStatus('active');
    setSubscriptionEndDate(endDate);

    return {
      subscriptionId: subDocRef.id,
      endDate,
    };
  };

  const cancelSubscription = async () => {
    if (!user?.uid) {
      throw new Error('You must be signed in to cancel your subscription.');
    }

    const qSub = query(
      collection(db, 'subscriptions'),
      where('userId', '==', user.uid)
    );
    const subSnapshot = await getDocs(qSub);

    let activeSubId = 'local_subscription';
    let preservedEnd = subscriptionEndDate || null;
    let cancelledCount = 0;

    for (const subDoc of subSnapshot.docs) {
      const subData = subDoc.data();
      if (subData.status === 'active') {
        activeSubId = subDoc.id;
        const docEnd = toJsDate(subData.endDate);
        if (docEnd && (!preservedEnd || docEnd.getTime() > preservedEnd.getTime())) {
          preservedEnd = docEnd;
        }
        await updateDoc(subDoc.ref, {
          status: 'cancelled',
          autoRenew: false,
          cancelledAt: serverTimestamp(),
        });
        cancelledCount += 1;
      }
    }

    const hasRemainingPeriod = Boolean(preservedEnd && preservedEnd.getTime() > Date.now());
    const nextStatus = hasRemainingPeriod ? 'cancelled' : 'expired';

    await addDoc(collection(db, 'payments'), {
      userId: user.uid,
      subscriptionId: activeSubId,
      amount: 0,
      status: 'Cancelled',
      method: 'Card',
      planName: 'Free',
      userEmail: user.email || '',
      date: serverTimestamp(),
    });

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        isPremium: hasRemainingPeriod,
        subscriptionStatus: nextStatus,
        autoRenew: false,
        ...(preservedEnd ? { subscriptionEndDate: preservedEnd } : {}),
      },
      { merge: true }
    );

    setIsPremium(hasRemainingPeriod);
    setSubscriptionStatus(nextStatus);
    setSubscriptionEndDate(preservedEnd);

    return {
      cancelledCount,
      subscriptionId: activeSubId,
      retainsAccessUntil: hasRemainingPeriod ? preservedEnd : null,
    };
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        subscriptionStatus,
        subscriptionEndDate,
        scanUsage,
        incrementScanCount,
        activatePremiumSubscription,
        cancelSubscription,
        loading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
