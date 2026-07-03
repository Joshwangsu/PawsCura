import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';

const HealthContext = createContext();

export const useHealth = () => useContext(HealthContext);

export const HealthProvider = ({ children }) => {
  const [pets, setPets] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setPets([]);
      setHealthLogs([]);
      return;
    }

    // Subscribe to Pets for the current user
    const qPets = query(collection(db, 'pets'), where('userId', '==', user.uid));
    const unsubPets = onSnapshot(qPets, (snapshot) => {
      const petsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing a Firestore composite index immediately
      petsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA; // Descending
      });
      setPets(petsData);
    });

    // Subscribe to Health Records for the current user
    const qLogs = query(collection(db, 'healthRecords'), where('userId', '==', user.uid));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate = data.date;
        if (data.date && data.date.toDate) {
          formattedDate = data.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return { id: doc.id, ...data, date: formattedDate, _timestamp: data.date };
      });
      // Sort client-side by date descending
      logsData.sort((a, b) => {
        const timeA = a._timestamp?.toMillis ? a._timestamp.toMillis() : 0;
        const timeB = b._timestamp?.toMillis ? b._timestamp.toMillis() : 0;
        return timeB - timeA; // Descending
      });
      setHealthLogs(logsData);
    });

    return () => {
      unsubPets();
      unsubLogs();
    };
  }, [user]);

  const addHealthLog = async (newLog) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'healthRecords'), {
        ...newLog,
        userId: user.uid,
        date: serverTimestamp() // Overwrite with server time for accuracy
      });
    } catch (error) {
      console.error("Error adding health record: ", error);
    }
  };

  const addPet = async (newPet) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'pets'), {
        ...newPet,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding pet: ", error);
    }
  };

  const deletePet = async (petId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'pets', petId));
    } catch (error) {
      console.error("Error deleting pet: ", error);
    }
  };

  return (
    <HealthContext.Provider value={{ pets, healthLogs, addHealthLog, addPet, deletePet }}>
      {children}
    </HealthContext.Provider>
  );
};
