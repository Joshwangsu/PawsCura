import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';
import { showAlert } from '../components/CustomAlert';

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

    const qPets = query(collection(db, 'pets'), where('userId', '==', user.uid));
    const unsubPets = onSnapshot(qPets, (snapshot) => {
      const petsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Sort client-side to avoid needing a Firestore composite index immediately
      petsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setPets(petsData);
    }, (err) => {
      console.warn('Pets snapshot error:', err?.message);
    });

    const qLogs = query(collection(db, 'healthRecords'), where('userId', '==', user.uid));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate = data.date;
        if (data.date && data.date.toDate) {
          formattedDate = data.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return {
          ...data,
          id: doc.id,
          assessmentRecordId: doc.id,
          status: data.status || data.severity || 'Moderate',
          severity: data.severity || data.status || 'Moderate',
          date: formattedDate,
          _timestamp: data.date,
        };
      });
      logsData.sort((a, b) => {
        const timeA = a._timestamp?.toMillis ? a._timestamp.toMillis() : 0;
        const timeB = b._timestamp?.toMillis ? b._timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      setHealthLogs(logsData);
    }, (err) => {
      console.warn('HealthLogs snapshot error:', err?.message);
    });

    return () => {
      unsubPets();
      unsubLogs();
    };
  }, [user]);

  const sanitizeForFirestore = (obj) => {
    const clean = {};
    Object.keys(obj || {}).forEach((key) => {
      if (obj[key] !== undefined) {
        clean[key] = obj[key];
      }
    });
    return clean;
  };

  const addHealthLog = async (newLog) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'healthRecords'), {
        ...sanitizeForFirestore(newLog),
        userId: user.uid,
        date: serverTimestamp()
      });
      return docRef;
    } catch (error) {
      console.error("Error adding health record: ", error);
      throw error;
    }
  };

  const updateHealthLog = async (logId, updatedFields) => {
    if (!user || !logId) return;
    try {
      await updateDoc(doc(db, 'healthRecords', logId), updatedFields);
    } catch (error) {
      console.error("Error updating health record: ", error);
    }
  };

  const parseNumericField = (val) => {
    if (val === undefined || val === null || val === '' || val === 'Unknown') {
      return '';
    }
    const num = parseFloat(val);
    return Number.isFinite(num) && num >= 0 ? num : '';
  };

  // Sanitize reference photos so Firestore document size remains safely under the 1MB limit.
  const sanitizeReferencePhotos = (photos) => {
    if (!Array.isArray(photos)) return [];
    return photos.map((p, idx) => {
      const isPrimary = p.angle === 'front' || idx === 0;
      const keepBase64 = isPrimary && p.base64 && typeof p.base64 === 'string' && p.base64.length <= 450000;
      return {
        angle: p.angle || 'front',
        uri: p.uri || '',
        mimeType: p.mimeType || 'image/jpeg',
        ...(keepBase64 ? { base64: p.base64 } : {})
      };
    });
  };

  const addPet = async (newPet) => {
    if (!user) return;
    try {
      const sanitizedPhotos = newPet.referencePhotos ? sanitizeReferencePhotos(newPet.referencePhotos) : [];
      await addDoc(collection(db, 'pets'), {
        ...sanitizeForFirestore(newPet),
        referencePhotos: sanitizedPhotos,
        age: parseNumericField(newPet.age),
        weight: parseNumericField(newPet.weight),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding pet: ", error);
      showAlert({ title: 'Save Error', message: 'Failed to save pet profile. Please try again.', type: 'error' });
      throw error;
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
      
      Object.keys(updatedFields).forEach((key) => {
        if (updatedFields[key] !== undefined) {
          payload[key] = updatedFields[key];
        }
      });

      if (updatedFields.age !== undefined) {
        payload.age = parseNumericField(updatedFields.age);
      }
      if (updatedFields.weight !== undefined) {
        payload.weight = parseNumericField(updatedFields.weight);
      }

      if (updatedFields.referencePhotos !== undefined) {
        payload.referencePhotos = sanitizeReferencePhotos(updatedFields.referencePhotos);
      }

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
    <HealthContext.Provider value={{ pets, healthLogs, addHealthLog, updateHealthLog, addPet, deletePet, updatePet }}>
      {children}
    </HealthContext.Provider>
  );
};
