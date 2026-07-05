import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      const petsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
        return { ...data, id: doc.id, date: formattedDate, _timestamp: data.date };
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
      const docRef = await addDoc(collection(db, 'healthRecords'), {
        ...newLog,
        userId: user.uid,
        date: serverTimestamp() // Overwrite with server time for accuracy
      });
      return docRef;
    } catch (error) {
      console.error("Error adding health record: ", error);
      throw error;
    }
  };

  const addPet = async (newPet) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'pets'), {
        ...newPet,
        age: parseInt(newPet.age) || 0,
        weight: parseFloat(newPet.weight) || 0,
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

  const updatePet = async (petId, updatedFields) => {
    if (!user || !petId) return;
    try {
      const payload = {};
      
      // Copy only defined values
      Object.keys(updatedFields).forEach((key) => {
        if (updatedFields[key] !== undefined) {
          payload[key] = updatedFields[key];
        }
      });

      // Safely parse number values if present
      if (updatedFields.age !== undefined) {
        payload.age = parseInt(updatedFields.age) || 0;
      }
      if (updatedFields.weight !== undefined) {
        payload.weight = parseFloat(updatedFields.weight) || 0;
      }

      // Prevent crashing Firestore on empty updates
      if (Object.keys(payload).length === 0) {
        console.warn("updatePet called with no actual modifications.");
        return;
      }

      await updateDoc(doc(db, 'pets', petId), payload);
    } catch (error) {
      console.error("Error updating pet: ", error);
      throw error;
    }
  };

  return (
    <HealthContext.Provider value={{ pets, healthLogs, addHealthLog, addPet, deletePet, updatePet }}>
      {children}
    </HealthContext.Provider>
  );
};
