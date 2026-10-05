import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSigningUpRef = useRef(false);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isSigningUpRef.current) {
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      // Force state update by creating a new object reference
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
