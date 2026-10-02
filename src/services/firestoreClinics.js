import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { calculateDistance } from './googleMaps';

/**
 * Fetches all active veterinary clinics from Firestore (managed by the admin web)
 * and enriches each record with the distance from the user's current location.
 *
 * @param {number} userLat  - User's current latitude
 * @param {number} userLon  - User's current longitude
 * @returns {Promise<Array>} - Array of clinic objects sorted by distance
 */
export async function getClinicsFromFirestore(userLat, userLon) {
  try {
    const clinicsRef = collection(db, 'vetClinics');
    const snapshot = await getDocs(clinicsRef);

    if (snapshot.empty) {
      console.log('No clinics found in Firestore.');
      return [];
    }

    const clinics = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Support both flat fields and nested coordinate objects
      const clinicLat =
        data.latitude ?? data.coordinates?.latitude ?? data.lat ?? 0;
      const clinicLon =
        data.longitude ?? data.coordinates?.longitude ?? data.lng ?? data.lon ?? 0;

      const distanceKm = calculateDistance(userLat, userLon, clinicLat, clinicLon);

      // Determine if clinic is currently open based on isOpen field or opening_hours
      const isOpen =
        data.isOpen ??
        data.open ??
        data.isOpenNow ??
        false;

      // Normalise schedule — accept array or build a default
      const schedule = Array.isArray(data.schedule) ? data.schedule : [];

      return {
        id: doc.id,
        name: data.name || data.clinicName || 'Veterinary Clinic',
        emoji: data.emoji || '🏥',
        address: data.address || data.location || 'Address not available',
        phone: data.phone || data.contactNumber || data.contact || '',
        email: data.email || '',
        website: data.website || '',
        rating: data.rating ?? 4.5,
        reviewCount: data.reviewCount ?? data.totalReviews ?? 0,
        isOpen,
        hours: data.hours || data.openingHours || data.operatingHours || '',
        openDays: data.openDays || data.days || '',
        schedule,
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        services: Array.isArray(data.services) ? data.services : [],
        description: data.description || data.about || '',
        image: data.image || data.imageUrl || data.logo || null,
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        distance: `${distanceKm.toFixed(1)} km away`,
        distanceKm,               // raw number for sorting
        coordinates: {
          latitude: clinicLat,
          longitude: clinicLon,
        },
      };
    });

    // Sort by distance ascending
    return clinics.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    console.error('Error fetching clinics from Firestore:', error);
    return [];
  }
}
