import React, { createContext, useState, useEffect, useContext } from 'react';
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
          alert("Your account has been suspended by an administrator.");
          return;
        }

        // Auto-upgrade test@gmail.com in Firestore if not already premium
        if (isTestEmail && !data.isPremium) {
          updateDoc(userDocRef, { isPremium: true }).catch(err => 
            console.log(`Error upgrading test account: ${err}`)
          );
        }

        setIsPremium(!!data.isPremium || isTestEmail);
        
        // Sync username/email to firestore for new NoSQL schema fields if missing
        if (!data.username || !data.email) {
          updateDoc(userDocRef, {
            username: data.username || user.displayName || user.email.split('@')[0],
            email: data.email || user.email
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
        // Initialize user document for first time
        const todayStr = new Date().toISOString().split('T')[0];
        setDoc(userDocRef, {
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
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
    await updateDoc(userDocRef, { scanUsageCount: newCount });
  };

  const upgradeToPremium = async () => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { isPremium: true });
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, scanUsage, incrementScanCount, upgradeToPremium, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
