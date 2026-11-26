import AsyncStorage from '@react-native-async-storage/async-storage';
import { isClinicOpenNow } from '../utils/clinicHours';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const CACHE_KEY = '@paws_cura_clinics_cache';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24;

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function refreshCachedClinicStatuses(clinics, userLat, userLon) {
  const now = new Date();
  return (clinics || [])
    .map((c) => {
      const cLat = Number(c.coordinates?.latitude || 0);
      const cLon = Number(c.coordinates?.longitude || 0);
      const distanceKm = calculateDistance(userLat, userLon, cLat, cLon);
      const liveIsOpen = isClinicOpenNow(c, now);
      return {
        ...c,
        isOpen: liveIsOpen,
        distanceKm,
        distance: `${distanceKm.toFixed(1)} km away`,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getNearbyVeterinarians(latitude, longitude) {
  if (!API_KEY) {
    console.warn('Google Maps API key is missing. Using fallback data.');
    return getFallbackClinics(latitude, longitude);
  }

  try {
    const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedDataStr) {
      const cached = JSON.parse(cachedDataStr);
      const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
      const distanceSinceLast = calculateDistance(latitude, longitude, cached.lat, cached.lon);

      if (!isExpired && distanceSinceLast < 5 && Array.isArray(cached.data)) {
        return refreshCachedClinicStatuses(cached.data, latitude, longitude);
      }
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&rankby=distance&type=veterinary_care&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || ''}`);
    }

    const formattedData = formatGoogleResponse(data.results || [], latitude, longitude);

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        lat: latitude,
        lon: longitude,
        data: formattedData,
      })
    );

    return formattedData;
  } catch (error) {
    console.error('Error fetching clinics from Google Maps:', error);
    return getFallbackClinics(latitude, longitude);
  }
}

function formatGoogleResponse(results, userLat, userLon) {
  const now = new Date();
  const defaultSchedule = [
    { days: 'Monday - Friday', hours: '8:00 AM - 7:00 PM' },
    { days: 'Saturday', hours: '9:00 AM - 5:00 PM' },
    { days: 'Sunday', hours: '10:00 AM - 3:00 PM' },
  ];

  const sampleReviews = [
    {
      id: 'r1',
      author: 'Maria Santos',
      rating: 5,
      time: '2 days ago',
      text: "The vets here are so compassionate and attentive! They diagnosed my dog's skin allergy right away.",
    },
    {
      id: 'r2',
      author: 'Mark Ramos',
      rating: 5,
      time: '1 week ago',
      text: 'Clean clinic, gentle handling during vaccinations, and clear instructions for home care.',
    },
    {
      id: 'r3',
      author: 'Jennie Kim',
      rating: 4,
      time: '2 weeks ago',
      text: 'Friendly staff and prompt emergency care. Very reliable neighborhood vet clinic.',
    },
  ];

  return results.map((place) => {
    const clinicLat = place.geometry?.location?.lat || 0;
    const clinicLon = place.geometry?.location?.lng || 0;
    const distanceKm = calculateDistance(userLat, userLon, clinicLat, clinicLon);

    const isOpen =
      typeof place.opening_hours?.open_now === 'boolean'
        ? place.opening_hours.open_now
        : isClinicOpenNow({ schedule: defaultSchedule }, now);

    return {
      id: place.place_id,
      name: place.name || 'Veterinary Clinic',
      emoji: '🏥',
      address: place.vicinity || 'Address unavailable',
      distance: `${distanceKm.toFixed(1)} km away`,
      distanceKm,
      rating: place.rating || 4.7,
      reviewCount: place.user_ratings_total || 48,
      isOpen,
      hours: 'Mon - Fri (8:00 AM - 7:00 PM), Sat (9:00 AM - 5:00 PM)',
      openDays: 'Mon - Sun',
      phone: '+63 2 8920 1234',
      schedule: defaultSchedule,
      specialties: ['General Practice', 'Skin Diagnostics', 'Surgery', 'Vaccinations'],
      reviews: sampleReviews,
      coordinates: { latitude: clinicLat, longitude: clinicLon },
    };
  });
}

function getFallbackClinics(userLat, userLon) {
  return formatGoogleResponse(
    [
      {
        place_id: 'mock_1',
        name: 'Local Veterinary Care',
        vicinity: 'Local District',
        geometry: { location: { lat: userLat + 0.005, lng: userLon + 0.005 } },
        rating: 4.8,
        user_ratings_total: 124,
      },
      {
        place_id: 'mock_2',
        name: 'Paws & Claws Animal Clinic',
        vicinity: 'Local District',
        geometry: { location: { lat: userLat - 0.008, lng: userLon + 0.010 } },
        rating: 4.6,
        user_ratings_total: 89,
      },
    ],
    userLat,
    userLon
  );
}
