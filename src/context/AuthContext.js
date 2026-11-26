import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSigningUpRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (isSigningUpRef.current) {
        return;
      }

      if (currentUser) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDocSnap.exists()) {
            const role = userDocSnap.data()?.role;
            if (role && role !== 'user') {
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('AuthContext role verification warning:', e);
        }
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(Object.assign({}, auth.currentUser));
    }
  };

  const setIsSigningUp = (value) => {
    isSigningUpRef.current = value;
  };

  return (
    <AuthContext.Provider value={{ user, loading, reloadUser, setIsSigningUp }}>
      {children}
    </AuthContext.Provider>
  );
};
