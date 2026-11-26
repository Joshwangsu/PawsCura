import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Platform,
  AppState,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import InteractiveClinicMap from '../components/InteractiveClinicMap';
import ClinicCard from '../components/ClinicCard';
import { getClinicsFromFirestore } from '../services/firestoreClinics';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useAds } from '../services/ads';
import AdBanner from '../components/AdBanner';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ClinicScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);
  const { topBanners } = useAds('clinics');
  const { isPremium } = useSubscription();
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading' | 'granted' | 'services_disabled' | 'permission_denied'
  const [errorMsg, setErrorMsg] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [detailClinic, setDetailClinic] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const isFetchingLocRef = useRef(false);
  const hasRealLocationRef = useRef(false);

  const loadLocation = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingLocRef.current) return;
    isFetchingLocRef.current = true;

    if (!silent) {
      setLoading(true);
    }
    setErrorMsg(null);
    let lat = 14.5995; // Default: Manila fallback
    let lng = 120.9842;

    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && !silent) {
        perm = await Location.requestForegroundPermissionsAsync();
      }

      if (perm.status !== 'granted') {
        setLocationStatus('permission_denied');
        if (!hasRealLocationRef.current) {
          setLocation({ coords: { latitude: lat, longitude: lng } });
        }
      } else {
        const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!servicesEnabled) {
          setLocationStatus('services_disabled');
          if (!hasRealLocationRef.current) {
            setLocation({ coords: { latitude: lat, longitude: lng } });
          }
        } else {
          // Services are enabled & permission granted — fetch fresh GPS location
          setLocationStatus('granted');
          let loc = await Location.getLastKnownPositionAsync().catch(() => null);
          if (loc?.coords) {
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
            hasRealLocationRef.current = true;
            setLocation(loc);
          }

          try {
            const fresh = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (fresh?.coords) {
              lat = fresh.coords.latitude;
              lng = fresh.coords.longitude;
              hasRealLocationRef.current = true;
              setLocation(fresh);
            }
          } catch (posErr) {
            console.log('Current position warning:', posErr?.message);
            if (!hasRealLocationRef.current) {
              setLocation({ coords: { latitude: lat, longitude: lng } });
            }
          }
        }
      }
    } catch (err) {
      console.log('Location error — using fallback:', err.message);
      if (!hasRealLocationRef.current) {
        setLocation({ coords: { latitude: lat, longitude: lng } });
      }
    }

    try {
      const data = await getClinicsFromFirestore(lat, lng);
      setClinics(data);
    } catch (err) {
      console.error('Failed to load clinics from Firestore:', err);
      setErrorMsg('Could not load clinic directory. Please try again.');
    } finally {
      setLoading(false);
      isFetchingLocRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadLocation({ silent: false });
  }, [loadLocation]);

  // Refresh location automatically when app returns to foreground (e.g., after toggling GPS in Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadLocation({ silent: true });
      }
    });
    return () => subscription?.remove?.();
  }, [loadLocation]);

  // Refresh when user navigates back to the Clinics tab
  useFocusEffect(
    useCallback(() => {
      loadLocation({ silent: true });
    }, [loadLocation])
  );

  // While GPS is disabled or permission is denied, watch for status change without requiring app restart
  useEffect(() => {
    if (locationStatus !== 'services_disabled' && locationStatus !== 'permission_denied') {
      return undefined;
    }
    const poll = setInterval(async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const enabled = await Location.hasServicesEnabledAsync();
        if (enabled) {
          loadLocation({ silent: false });
        }
      } catch (_) {}
    }, 2500);
    return () => clearInterval(poll);
  }, [locationStatus, loadLocation]);

  const filtered = isPremium ? clinics : clinics.slice(0, 3);

  const fetchRoutePath = async (origin, destination) => {
    const oLat = Number(origin.latitude);
    const oLng = Number(origin.longitude);
    const dLat = Number(destination.latitude);
    const dLng = Number(destination.longitude);

    const endpoints = [
      `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`,
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
            latitude: Number(lat),
            longitude: Number(lng),
          }));
          setRouteCoords(coords);
          return;
        }
      } catch (err) {
        console.log('Route endpoint fallback:', err.message);
      }
    }

    // Only if all road routing servers are unreachable, fall back to direct line
    setRouteCoords([
      { latitude: oLat, longitude: oLng },
      { latitude: dLat, longitude: dLng },
    ]);
  };

  const handleNavigate = (clinic) => {
    if (!clinic?.coordinates) return;
    setRouteCoords([]);
    setSelectedClinic(clinic);
    if (location?.coords) {
      fetchRoutePath(location.coords, clinic.coordinates);
    }
  };

  const clearRoute = () => {
    setSelectedClinic(null);
    setRouteCoords([]);
  };

  return (
    <View style={styles.safe}>
      {/* ── Top Header ── */}
      <View style={[styles.topHeader, { paddingTop: topInset + Spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Find Clinics</Text>
          <Text style={styles.screenSubtitle}>
            {filtered.length} veterinary clinics nearby
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => loadLocation({ silent: false })}
          style={styles.refreshLocBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="refresh" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Location disabled / permission banner */}
      {(locationStatus === 'services_disabled' || locationStatus === 'permission_denied') && (
        <View style={styles.locationWarningBanner}>
          <Ionicons name="location-outline" size={16} color="#92400E" />
          <Text style={styles.locationWarningText} numberOfLines={2}>
            {locationStatus === 'services_disabled'
              ? 'Location services are off. Enable GPS to center on your location.'
              : 'Location permission denied. Enable access in settings for nearby clinics.'}
          </Text>
          <TouchableOpacity
            style={styles.locationRetryBtn}
            onPress={() =>
              locationStatus === 'permission_denied'
                ? Linking.openSettings?.().catch(() => {})
                : loadLocation({ silent: false })
            }
          >
            <Text style={styles.locationRetryText}>
              {locationStatus === 'permission_denied' ? 'Settings' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Route Banner */}
      {selectedClinic && (
        <View style={styles.routeActiveBanner}>
          <Text style={styles.routeActiveText} numberOfLines={1}>
            Routing to: {selectedClinic.name}
          </Text>
          <TouchableOpacity onPress={clearRoute} style={styles.clearRouteBtn}>
            <Ionicons name="close-circle" size={24} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Map View ── */}
      <View style={styles.mapContainer}>
        {location?.coords ? (
          <InteractiveClinicMap
            userCoords={location.coords}
            clinics={filtered}
            routeCoords={selectedClinic ? routeCoords : []}
            selectedClinic={selectedClinic}
            onPressClinic={(clinic) => setDetailClinic(clinic)}
            onRefreshLocation={() => loadLocation({ silent: false })}
          />
        ) : (
          <View style={styles.mapBg}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>

      {/* Premium banner */}
      {!isPremium && (
        <View style={styles.premiumBannerWrapper}>
          <TouchableOpacity
            style={styles.premiumBanner}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Paywall')}
          >
            <View style={styles.premiumBannerLeft}>
              <Ionicons name="lock-closed" size={16} color={Colors.warning} />
              <Text style={styles.premiumBannerText}>Showing 3 nearest clinics.</Text>
            </View>
            <Text style={styles.premiumBannerLink}>Unlock All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Clinic List ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding clinics near you...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={40} color={Colors.warning} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorSub}>Please enable location services to see nearby vets.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <AdBanner ads={topBanners} dismissKey="clinics:top" />
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Nearby Clinics</Text>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <ClinicCard
              clinic={item}
              onNavigate={handleNavigate}
              onPressDetails={(c) => setDetailClinic(c)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No clinics found</Text>
              <Text style={styles.emptySubtitle}>No veterinary clinics found in this area</Text>
            </View>
          }
        />
      )}

      {/* ── Clinic Detail Modal ── */}
      {detailClinic && (
        <Modal
          visible={!!detailClinic}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setDetailClinic(null)}
        >
          <View style={[styles.detailModalContainer, { paddingTop: topInset }]}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity style={styles.detailBackBtn} onPress={() => setDetailClinic(null)} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>{detailClinic.name}</Text>
              <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailClinic(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              {/* Banner */}
              <View style={styles.detailBanner}>
                <View style={styles.detailEmojiCircle}>
                  <Text style={styles.detailEmojiText}>{detailClinic.emoji || '🏥'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailClinicTitle}>{detailClinic.name}</Text>
                  <Text style={styles.detailAddressText} numberOfLines={2}>
                    <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                    {'  '}{detailClinic.address || 'Address not available'}
                  </Text>
                </View>
              </View>

              {/* Description */}
              {!!detailClinic.description && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{detailClinic.description}</Text>
                </View>
              )}

              {/* Badges */}
              <View style={styles.detailBadgesRow}>
                <View style={styles.detailBadgeChip}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.detailBadgeText}>
                    {detailClinic.rating ?? 'N/A'}
                    {detailClinic.reviewCount > 0 ? ` (${detailClinic.reviewCount})` : ''}
                  </Text>
                </View>
                <View style={[styles.detailBadgeChip, { backgroundColor: detailClinic.isOpen ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons
                    name={detailClinic.isOpen ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={detailClinic.isOpen ? Colors.success : Colors.danger}
                  />
                  <Text style={[styles.detailBadgeText, { color: detailClinic.isOpen ? Colors.success : Colors.danger }]}>
                    {detailClinic.isOpen ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
                {!!detailClinic.distance && (
                  <View style={styles.detailBadgeChip}>
                    <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                    <Text style={styles.detailBadgeText}>{detailClinic.distance}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSectionDivider} />

              {/* Operating Hours */}
              {(detailClinic.hours || detailClinic.openDays) && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="time" size={18} color={Colors.primary} />
                    <Text style={styles.detailSectionTitle}>Operating Hours</Text>
                  </View>
                  <View style={styles.scheduleCard}>
                    {/* Show as one block — admin stores this as a combined string */}
                    <View style={styles.hoursBlock}>
                      <Ionicons name="time-outline" size={15} color={Colors.primary} />
                      <Text style={styles.hoursText}>
                        {detailClinic.hours || detailClinic.openDays}
                      </Text>
                    </View>
                    {/* If separate openDays AND hours both exist, show both */}
                    {!!detailClinic.openDays && !!detailClinic.hours && detailClinic.openDays !== detailClinic.hours && (
                      <View style={[styles.hoursBlock, { marginTop: 8 }]}>
                        <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
                        <Text style={styles.hoursText}>{detailClinic.openDays}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Services */}
              {((detailClinic.services && detailClinic.services.length > 0) ||
                (detailClinic.specialties && detailClinic.specialties.length > 0)) && (
                <>
                  <View style={styles.detailSectionDivider} />
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="medkit" size={18} color={Colors.primary} />
                      <Text style={styles.detailSectionTitle}>Services</Text>
                    </View>
                    <View style={styles.servicesWrap}>
                      {(detailClinic.services?.length > 0 ? detailClinic.services : detailClinic.specialties).map((s, i) => (
                        <View key={i} style={styles.serviceChip}>
                          <Text style={styles.serviceChipText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <View style={styles.detailSectionDivider} />

              {/* Contact */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="call" size={18} color={Colors.primary} />
                  <Text style={styles.detailSectionTitle}>Contact & Location</Text>
                </View>
                <View style={styles.contactCard}>
                  {!!detailClinic.phone ? (
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${detailClinic.phone}`)} activeOpacity={0.7}>
                      <Ionicons name="call-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.contactText, { color: Colors.primary }]}>{detailClinic.phone}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
                      <Text style={[styles.contactText, { color: Colors.textMuted }]}>No phone number listed</Text>
                    </View>
                  )}
                  {!!detailClinic.email && (
                    <TouchableOpacity style={[styles.contactRow, { marginTop: 10 }]} onPress={() => Linking.openURL(`mailto:${detailClinic.email}`)} activeOpacity={0.7}>
                      <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.contactText, { color: Colors.primary, flex: 1 }]}>{detailClinic.email}</Text>
                    </TouchableOpacity>
                  )}
                  {!!detailClinic.website && (
                    <TouchableOpacity style={[styles.contactRow, { marginTop: 10 }]} onPress={() => Linking.openURL(detailClinic.website)} activeOpacity={0.7}>
                      <Ionicons name="globe-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.contactText, { color: Colors.primary, flex: 1 }]} numberOfLines={1}>{detailClinic.website}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.contactRow, { marginTop: 10 }]}>
                    <Ionicons name="location-outline" size={16} color={Colors.primary} />
                    <Text style={[styles.contactText, { flex: 1 }]}>{detailClinic.address || 'Address not available'}</Text>
                  </View>
                </View>
              </View>


            </ScrollView>

            {/* Footer */}
            <View style={[styles.detailFooterActions, { paddingBottom: Math.max(insets.bottom + 8, Spacing.md) }]}>
              <TouchableOpacity
                style={styles.detailRouteBtn}
                onPress={() => { handleNavigate(detailClinic); setDetailClinic(null); }}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.detailRouteBtnText}>Route Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.sm,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  screenSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  refreshLocBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  locationWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  locationWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  locationRetryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  locationRetryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBtn: { padding: Spacing.sm, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md },

  routeActiveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.md,
  },
  routeActiveText: { color: Colors.textInverse, fontSize: 15, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
  clearRouteBtn: { padding: 2 },

  mapContainer: {
    height: SCREEN_HEIGHT * 0.28,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    // iOS needs overflow:'hidden' to clip the border radius on the map container.
    // Android breaks (blank map) with overflow:'hidden' on native views.
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
    ...Shadows.md,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
  },
  mapBg: { flex: 1, backgroundColor: '#E8F0F8', justifyContent: 'center', alignItems: 'center' },
  markerPin: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF', ...Shadows.md,
  },

  premiumBannerWrapper: { paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  premiumBanner: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md,
    paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.warning, ...Shadows.sm,
  },
  premiumBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBannerText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  premiumBannerLink: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  listTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: 130 },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted },

  loadingContainer: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },

  errorContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: Spacing.xl, gap: 8 },
  errorText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  errorSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Detail Modal
  detailModalContainer: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 44 : 20 },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  detailHeaderTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 12 },
  detailCloseBtn: { padding: 4 },
  detailBackBtn: { padding: 4 },
  detailScrollContent: { padding: Spacing.lg, paddingBottom: 110 },

  detailBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  detailEmojiCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  detailEmojiText: { fontSize: 28 },
  detailClinicTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  detailAddressText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },

  descriptionBox: { backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  descriptionText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  detailBadgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  detailBadgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  detailBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  detailSectionDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  detailSection: { marginBottom: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  detailSectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },

  scheduleCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  hoursBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hoursText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', flex: 1, lineHeight: 20 },
  scheduleRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  scheduleDaysLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  scheduleDaysValue: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  scheduleDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  weeklyScheduleTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  scheduleItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  scheduleItemDays: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  scheduleItemHours: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700' },

  servicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  serviceChip: { backgroundColor: Colors.primaryBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  serviceChipText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  contactCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },

  overallRatingCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md,
    alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  ratingNumber: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 4, marginVertical: 4 },
  ratingCountText: { fontSize: 12, color: Colors.textSecondary },

  reviewCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  authorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { color: '#fff', fontSize: 14, fontWeight: '800' },
  authorName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  reviewTime: { fontSize: 11, color: Colors.textMuted },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  reviewRatingText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  reviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  noReviewsBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noReviewsText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },

  detailFooterActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1, borderColor: Colors.border, gap: 12,
  },
  detailRouteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.full,
    gap: 6, ...Shadows.sm,
  },
  detailRouteBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
