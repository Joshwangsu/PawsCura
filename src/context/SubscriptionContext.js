import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [scanUsage, setScanUsage] = useState({ count: 0, date: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setScanUsage({ count: 0, date: '' });
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const isTestEmail = user.email && user.email.toLowerCase() === 'test@gmail.com';

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        
        // Log out immediately if suspended
        if (data.isSuspended) {
          signOut(auth).catch(err => console.log(err));
          Alert.alert('Account Suspended', 'Your account has been suspended by an administrator.');
          return;
        }

        // Auto-upgrade test@gmail.com in Firestore if not already premium
        if (isTestEmail && !data.isPremium) {
          updateDoc(userDocRef, { isPremium: true }).catch(err => 
            console.log(`Error upgrading test account: ${err}`)
          );
        }

        setIsPremium(!!data.isPremium || isTestEmail);
        
        // Sync username/email/firstName/lastName/role to firestore for ERD schema fields if missing
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
          }).catch(err => console.log(`Error updating user details: ${err}`));
        }

        // Check if daily scan count needs reset
        const todayStr = new Date().toISOString().split('T')[0];
        if (data.scanUsageDate !== todayStr) {
          // Reset count in Firestore for the new day
          setDoc(userDocRef, { 
            scanUsageCount: 0, 
            scanUsageDate: todayStr 
          }, { merge: true });
          setScanUsage({ count: 0, date: todayStr });
        } else {
          setScanUsage({ 
            count: data.scanUsageCount || 0, 
            date: data.scanUsageDate 
          });
        }
      } else {
        // Initialize user document for first time matching USERS ERD schema
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
          isPremium: isTestEmail ? true : false,
          scanUsageCount: 0,
          scanUsageDate: todayStr
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const incrementScanCount = async () => {
    if (!user || isPremium) return;
    const userDocRef = doc(db, 'users', user.uid);
    const newCount = scanUsage.count + 1;
    const todayStr = new Date().toISOString().split('T')[0];
    await setDoc(userDocRef, { 
      scanUsageCount: newCount,
      scanUsageDate: todayStr 
    }, { merge: true });
  };

  const upgradeToPremium = async () => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { isPremium: true }, { merge: true });
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, scanUsage, incrementScanCount, upgradeToPremium, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
