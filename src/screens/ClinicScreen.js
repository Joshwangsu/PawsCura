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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);

        // Fetch live clinics from our API wrapper
        const data = await getNearbyVeterinarians(loc.coords.latitude, loc.coords.longitude);
        setClinics(data);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to fetch nearby clinics');
      } finally {
        setLoading(false);
      }
    })();
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
            <ClinicCard clinic={item} onNavigate={handleNavigate} />
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
});
