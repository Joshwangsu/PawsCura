import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import ClinicCard from '../components/ClinicCard';
import { getNearbyVeterinarians } from '../services/googleMaps';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ClinicScreen() {
  const { isPremium } = useSubscription();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [detailClinic, setDetailClinic] = useState(null);

  const loadLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    let lat = 14.5995;
    let lng = 120.9842;

    try {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc && loc.coords) {
        setLocation(loc);
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch (err) {
      console.log("Using default location coordinates fallback:", err);
      setLocation({
        coords: { latitude: lat, longitude: lng }
      });
    }

    try {
      const data = await getNearbyVeterinarians(lat, lng);
      setClinics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocation();
  }, []);

  let filtered = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );
  
  if (!isPremium) {
    filtered = filtered.slice(0, 3);
  }

  const handleNavigate = (clinic) => {
    if (!clinic.coordinates) return;
    setSelectedClinic(clinic);
  };

  return (
    <View style={styles.safe}>
      {/* ── Top Header ──────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Find Clinics</Text>
          <Text style={styles.screenSubtitle}>
            {filtered.length} veterinary clinics nearby
          </Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Active Route Banner */}
      {selectedClinic && (
        <View style={styles.routeActiveBanner}>
          <Text style={styles.routeActiveText} numberOfLines={1}>
            Routing to: {selectedClinic.name}
          </Text>
          <TouchableOpacity onPress={() => setSelectedClinic(null)} style={styles.clearRouteBtn}>
            <Ionicons name="close-circle" size={24} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Search Bar ──────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics or location..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Map View ─────────────────────────────── */}
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.08, // Zoomed out enough to see 5km radius
              longitudeDelta: 0.08,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false} // We have a custom button if needed
          >
            {filtered.map((clinic) => {
              if (!clinic.coordinates) return null;
              
              return (
                <Marker
                  key={clinic.id}
                  coordinate={clinic.coordinates}
                  title={clinic.name}
                  description={clinic.isOpen ? 'Open Now' : 'Closed'}
                  onPress={() => setDetailClinic(clinic)}
                >
                  <View style={[styles.markerPin, { backgroundColor: clinic.isOpen ? Colors.success : Colors.danger }]}>
                    <Ionicons name="medical" size={14} color={Colors.textInverse} />
                  </View>
                </Marker>
              );
            })}
            
            {/* Draw Route Line if a clinic is selected */}
            {selectedClinic && location && (
              <MapViewDirections
                origin={location.coords}
                destination={selectedClinic.coordinates}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
                strokeWidth={5}
                strokeColor={Colors.primaryDark}
              />
            )}
          </MapView>
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="location-outline" size={48} color={Colors.danger} />
            <Text style={styles.errorText}>Location Permission Denied</Text>
            <Text style={styles.errorSub}>
              We need location access to find clinics near you. Please grant permission in your system settings.
            </Text>
            <View style={styles.errorBtnRow}>
              <TouchableOpacity style={styles.errorBtn} onPress={loadLocation}>
                <Text style={styles.errorBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.errorBtn, styles.errorBtnSecondary]} onPress={() => Linking.openSettings()}>
                <Text style={[styles.errorBtnText, styles.errorBtnTextSecondary]}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.mapBg}>
             {/* Fallback while location is loading */}
             <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
      
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

      {/* ── Clinic List ─────────────────────────────────── */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Nearby Clinics</Text>
        <View style={styles.sortRow}>
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.primary} />
          <Text style={styles.sortText}>Sort by distance</Text>
        </View>
      </View>

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
              <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No clinics found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search query</Text>
            </View>
          }
        />
      )}

      {/* ── Clinic Detail Modal ───────────────────────── */}
      {detailClinic && (
        <Modal
          visible={!!detailClinic}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setDetailClinic(null)}
        >
          <View style={styles.detailModalContainer}>
            {/* Modal Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackBtn}
                onPress={() => setDetailClinic(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                {detailClinic.name}
              </Text>
              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setDetailClinic(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailScrollContent}
            >
              {/* Banner / Avatar card */}
              <View style={styles.detailBanner}>
                <View style={styles.detailEmojiCircle}>
                  <Text style={styles.detailEmojiText}>{detailClinic.emoji || '🏥'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailClinicTitle}>{detailClinic.name}</Text>
                  <Text style={styles.detailAddressText}>
                    <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                    {'  '}{detailClinic.address}
                  </Text>
                </View>
              </View>

              {/* Quick Badges Row */}
              <View style={styles.detailBadgesRow}>
                <View style={styles.detailBadgeChip}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.detailBadgeText}>
                    {detailClinic.rating} ({detailClinic.reviewCount} reviews)
                  </Text>
                </View>
                <View style={[styles.detailBadgeChip, { backgroundColor: detailClinic.isOpen ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons
                    name={detailClinic.isOpen ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={detailClinic.isOpen ? Colors.success : Colors.danger}
                  />
                  <Text style={[styles.detailBadgeText, { color: detailClinic.isOpen ? Colors.success : Colors.danger }]}>
                    {detailClinic.isOpen ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
                <View style={styles.detailBadgeChip}>
                  <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                  <Text style={styles.detailBadgeText}>{detailClinic.distance}</Text>
                </View>
              </View>

              <View style={styles.detailSectionDivider} />

              {/* ── Operating Hours & Days ──────────────────── */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="time" size={18} color={Colors.primary} />
                  <Text style={styles.detailSectionTitle}>Operating Hours & Schedule</Text>
                </View>

                <View style={styles.scheduleCard}>
                  <View style={styles.scheduleRowTop}>
                    <Text style={styles.scheduleDaysLabel}>Open Days</Text>
                    <Text style={styles.scheduleDaysValue}>{detailClinic.openDays || 'Monday - Saturday'}</Text>
                  </View>
                  <View style={styles.scheduleRowTop}>
                    <Text style={styles.scheduleDaysLabel}>Operating Hours</Text>
                    <Text style={styles.scheduleDaysValue}>{detailClinic.hours || '8:00 AM - 7:00 PM'}</Text>
                  </View>

                  <View style={styles.scheduleDivider} />

                  <Text style={styles.weeklyScheduleTitle}>Weekly Schedule Breakdown:</Text>
                  {(detailClinic.schedule || [
                    { days: 'Monday - Friday', hours: '8:00 AM - 7:00 PM' },
                    { days: 'Saturday', hours: '9:00 AM - 5:00 PM' },
                    { days: 'Sunday', hours: '10:00 AM - 3:00 PM (Emergency Care)' },
                  ]).map((item, idx) => (
                    <View key={idx} style={styles.scheduleItemRow}>
                      <Text style={styles.scheduleItemDays}>{item.days}</Text>
                      <Text style={styles.scheduleItemHours}>{item.hours}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.detailSectionDivider} />

              {/* ── Contact & Location ─────────────────────── */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="call" size={18} color={Colors.primary} />
                  <Text style={styles.detailSectionTitle}>Contact & Location</Text>
                </View>

                <View style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={16} color={Colors.primary} />
                    <Text style={styles.contactText}>{detailClinic.phone || '+63 2 8920 1234'}</Text>
                  </View>

                  <View style={[styles.contactRow, { marginTop: 10 }]}>
                    <Ionicons name="location-outline" size={16} color={Colors.primary} />
                    <Text style={[styles.contactText, { flex: 1 }]}>{detailClinic.address}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSectionDivider} />

              {/* ── Patient Reviews ────────────────────────── */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="star" size={18} color={Colors.warning} />
                  <Text style={styles.detailSectionTitle}>Pet Owner Reviews ({detailClinic.reviewCount || 48})</Text>
                </View>

                <View style={styles.overallRatingCard}>
                  <Text style={styles.ratingNumber}>{detailClinic.rating || 4.7}</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= Math.round(detailClinic.rating || 5) ? "star" : "star-outline"}
                        size={16}
                        color={Colors.warning}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingCountText}>
                    Based on {detailClinic.reviewCount || 48} verified pet owner reviews
                  </Text>
                </View>

                {/* Individual Reviews */}
                {(detailClinic.reviews || [
                  { id: 'r1', author: 'Maria Santos', rating: 5, time: '2 days ago', text: 'The vets here are so compassionate and attentive! They diagnosed my dog’s skin allergy right away.' },
                  { id: 'r2', author: 'Mark Ramos', rating: 5, time: '1 week ago', text: 'Clean clinic, gentle handling during vaccinations, and clear instructions for home care.' },
                  { id: 'r3', author: 'Jennie Kim', rating: 4, time: '2 weeks ago', text: 'Friendly staff and prompt emergency care. Very reliable neighborhood vet clinic.' },
                ]).map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.authorAvatar}>
                        <Text style={styles.authorInitial}>{rev.author.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.authorName}>{rev.author}</Text>
                        <Text style={styles.reviewTime}>{rev.time}</Text>
                      </View>
                      <View style={styles.reviewRatingRow}>
                        <Ionicons name="star" size={12} color={Colors.warning} />
                        <Text style={styles.reviewRatingText}>{rev.rating}.0</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{rev.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer Actions: Route Directions */}
            <View style={styles.detailFooterActions}>
              <TouchableOpacity
                style={styles.detailRouteBtn}
                onPress={() => {
                  handleNavigate(detailClinic);
                  setDetailClinic(null);
                }}
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
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20, // push down for status bar since no SafeAreaView
    paddingBottom: Spacing.sm,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  routeActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  routeActiveText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.sm,
  },
  clearRouteBtn: {
    padding: 2,
  },

  // Search
  searchWrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  // Map
  mapContainer: {
    height: SCREEN_HEIGHT * 0.28,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBg: {
    flex: 1,
    backgroundColor: '#E8F0F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.md,
  },

  // List
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  premiumBannerWrapper: {
    position: 'absolute',
    top: 140, // Below the search bar
    left: 20,
    right: 20,
    zIndex: 10,
  },
  premiumBanner: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning,
    ...Shadows.sm,
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  premiumBannerLink: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  errorBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  errorBtnSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  errorBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  errorBtnTextSecondary: {
    color: Colors.primary,
  },

  // Clinic Details Modal Styles
  detailModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  detailCloseBtn: {
    padding: 4,
  },
  detailBackBtn: {
    padding: 4,
  },
  detailScrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  detailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  detailEmojiCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEmojiText: {
    fontSize: 28,
  },
  detailClinicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailAddressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  detailBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailSectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  detailSection: {
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scheduleCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scheduleRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleDaysLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  scheduleDaysValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  weeklyScheduleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scheduleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scheduleItemDays: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  scheduleItemHours: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  contactCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  callSmallBtn: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginLeft: 'auto',
  },
  callSmallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailSpecialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  detailSpecialtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  overallRatingCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  ratingCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reviewTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  reviewRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  detailFooterActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  detailCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  detailCallBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  detailRouteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    gap: 6,
    ...Shadows.sm,
  },
  detailRouteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
