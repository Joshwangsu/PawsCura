import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { calculateDistance, getNearbyVeterinarians } from './googleMaps';
import { isClinicOpenNow } from '../utils/clinicHours';

/**
 * Fetches all active veterinary clinics from Firestore (managed by the admin web)
 * and enriches each record with distance and local-time open/closed status.
 * Falls back to Google Maps / local directory if Firestore is empty or unreachable.
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
      console.log('No clinics found in Firestore, using nearby directory fallback.');
      return await getNearbyVeterinarians(userLat, userLon);
    }

    const now = new Date();
    const clinics = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Support both flat fields and nested coordinate objects
      const clinicLat = Number(
        data.latitude ?? data.coordinates?.latitude ?? data.lat ?? 0
      );
      const clinicLon = Number(
        data.longitude ?? data.coordinates?.longitude ?? data.lng ?? data.lon ?? 0
      );

      const distanceKm = calculateDistance(userLat, userLon, clinicLat, clinicLon);

      const hoursStr = data.hours || data.openingHours || data.operatingHours || '';
      const openDaysStr = data.openDays || data.days || '';
      const schedule = Array.isArray(data.schedule) ? data.schedule : [];

      // Always evaluate open status in the phone's local timezone
      const isOpen = isClinicOpenNow(
        {
          ...data,
          hours: hoursStr,
          openDays: openDaysStr,
          schedule,
        },
        now
      );

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
        hours: hoursStr,
        openDays: openDaysStr,
        startDay: data.startDay || '',
        endDay: data.endDay || '',
        openTime: data.openTime || '',
        closeTime: data.closeTime || '',
        closedDaysList: Array.isArray(data.closedDaysList) ? data.closedDaysList : [],
        hasSecondarySchedule: Boolean(data.hasSecondarySchedule),
        secondaryStartDay: data.secondaryStartDay || '',
        secondaryEndDay: data.secondaryEndDay || '',
        secondaryOpenTime: data.secondaryOpenTime || '',
        secondaryCloseTime: data.secondaryCloseTime || '',
        schedule,
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        services: Array.isArray(data.services) ? data.services : [],
        description: data.description || data.about || '',
        image: data.image || data.imageUrl || data.logo || null,
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        distance: `${distanceKm.toFixed(1)} km away`,
        distanceKm, // raw number for sorting
        coordinates: {
          latitude: clinicLat,
          longitude: clinicLon,
        },
      };
    });

    return clinics.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    console.error('Error fetching clinics from Firestore:', error);
    return await getNearbyVeterinarians(userLat, userLon);
  }
}
