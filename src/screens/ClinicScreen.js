import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicCard from '../components/ClinicCard';
import { MOCK_CLINICS } from '../data/mockData';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ClinicScreen() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_CLINICS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleNavigate = (clinic) => {
    Alert.alert(
      'Navigate to Clinic',
      `Opening directions to ${clinic.name}...\n\n(Maps integration coming soon)`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
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

      {/* ── Map Placeholder ─────────────────────────────── */}
      <View style={styles.mapContainer}>
        {/* Background grid lines for map feel */}
        <View style={styles.mapBg}>
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((pos) => (
            <View
              key={`h-${pos}`}
              style={[styles.gridLineH, { top: `${pos * 100}%` }]}
            />
          ))}
          {/* Vertical grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pos) => (
            <View
              key={`v-${pos}`}
              style={[styles.gridLineV, { left: `${pos * 100}%` }]}
            />
          ))}

          {/* Mock roads */}
          <View style={styles.mockRoadH} />
          <View style={styles.mockRoadV} />

          {/* Center content */}
          <View style={styles.mapContent}>
            <View style={styles.mapPinOuter}>
              <View style={styles.mapPinInner}>
                <Ionicons name="location" size={28} color={Colors.textInverse} />
              </View>
              <View style={styles.mapPinShadow} />
            </View>
            <Text style={styles.mapTitle}>Map View</Text>
            <Text style={styles.mapSubtitle}>Google Maps integration coming soon</Text>

            {/* Mock clinic pins */}
            {[
              { top: '20%', left: '25%', open: true },
              { top: '65%', left: '70%', open: false },
              { top: '40%', left: '80%', open: true },
            ].map((pin, i) => (
              <View
                key={i}
                style={[
                  styles.mockPin,
                  { top: pin.top, left: pin.left },
                ]}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={pin.open ? Colors.success : Colors.danger}
                />
              </View>
            ))}
          </View>

          {/* Map controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlBtn}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.mapControlDivider} />
            <TouchableOpacity style={styles.mapControlBtn}>
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* My location button */}
          <TouchableOpacity style={styles.myLocationBtn}>
            <Ionicons name="locate" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Clinic List ─────────────────────────────────── */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Nearby Clinics</Text>
        <View style={styles.sortRow}>
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.primary} />
          <Text style={styles.sortText}>Sort by distance</Text>
        </View>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
    width: 42,
    height: 42,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  mapBg: {
    flex: 1,
    backgroundColor: '#C8DCF0',
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(43,90,143,0.1)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(43,90,143,0.1)',
  },
  mockRoadH: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mockRoadV: {
    position: 'absolute',
    left: '45%',
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPinOuter: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mapPinInner: {
    width: 52,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.card,
    ...Shadows.md,
  },
  mapPinShadow: {
    width: 16,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginTop: 2,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  mapSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  mockPin: {
    position: 'absolute',
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.sm,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  myLocationBtn: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 40,
    height: 40,
    backgroundColor: Colors.card,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
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
});
