import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useHealth } from '../context/HealthContext';
import HealthLogCard from '../components/HealthLogCard';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function HistoryScreen({ navigation }) {
  const [selectedPet, setSelectedPet] = useState(null);
  const [activeDiseaseFilter, setActiveDiseaseFilter] = useState('All');
  const { healthLogs, pets } = useHealth();

  // Reset filter when changing pets
  const handleSelectPet = (pet) => {
    setActiveDiseaseFilter('All');
    setSelectedPet(pet);
  };

  // Handle hardware / system swipe back gesture to return to pet list instead of closing tab
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedPet) {
          setSelectedPet(null);
          return true; // Prevents default React Navigation back to previous tab
        }
        return false; // Standard navigation
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [selectedPet])
  );

  // Filter logs for the selected pet
  const petLogs = useMemo(() => {
    if (!selectedPet) return [];
    return healthLogs.filter((log) => log.petName.toLowerCase() === selectedPet.name.toLowerCase());
  }, [healthLogs, selectedPet]);

  // Extract unique disease list from pet's logs to populate filter tabs dynamically
  const uniqueDiseases = useMemo(() => {
    const list = ['All'];
    petLogs.forEach((log) => {
      if (log.issue && !list.includes(log.issue)) {
        list.push(log.issue);
      }
    });
    return list;
  }, [petLogs]);

  // Filter logs based on the selected disease tab
  const filteredLogs = useMemo(() => {
    if (activeDiseaseFilter === 'All') return petLogs;
    return petLogs.filter((log) => log.issue === activeDiseaseFilter);
  }, [petLogs, activeDiseaseFilter]);

  // View 1: Select a Pet
  if (!selectedPet) {
    return (
      <View style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Pet Health Records</Text>
          <Text style={styles.screenSubtitle}>Select a pet to view their diagnostic history</Text>
        </View>

        {/* Pets List */}
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const logCount = healthLogs.filter(
              (log) => log.petName.toLowerCase() === item.name.toLowerCase()
            ).length;

            return (
              <TouchableOpacity
                style={styles.petSelectCard}
                activeOpacity={0.7}
                onPress={() => handleSelectPet(item)}
              >
                <Text style={styles.petSelectEmoji}>{item.emoji || '🐾'}</Text>
                <View style={styles.petSelectInfo}>
                  <Text style={styles.petSelectName}>{item.name}</Text>
                  <Text style={styles.petSelectBreed}>
                    {item.species.charAt(0).toUpperCase() + item.species.slice(1)} • {item.breed}
                  </Text>
                  <Text style={styles.petSelectRecordsCount}>
                    📋 {logCount} record{logCount !== 1 ? 's' : ''} on file
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color={Colors.textMuted}
                  style={styles.petSelectChevron}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="paw-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Pets Registered</Text>
              <Text style={styles.emptySubtitle}>
                Add your pet in the Pets tab first to view their health records
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Pets')}
              >
                <Text style={styles.actionBtnText}>Go to My Pets</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    );
  }

  // View 2: Chronological Scan History with Disease Filters
  return (
    <View style={styles.safe}>
      {/* Header with Back Button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity
          onPress={() => setSelectedPet(null)}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.detailScreenTitle}>{selectedPet.name}'s History</Text>
          <Text style={styles.detailScreenSubtitle}>
            {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      </View>

      {/* Disease Filter Tabs (Only shown if pet has records) */}
      {petLogs.length > 0 && (
        <View style={styles.filterWrapper}>
          <Text style={styles.filterLabel}>Filter by Disease Type:</Text>
          <FlatList
            data={uniqueDiseases}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsList}
            style={styles.tabsScroll}
            renderItem={({ item }) => {
              const isActive = activeDiseaseFilter === item;
              return (
                <TouchableOpacity
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setActiveDiseaseFilter(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* History Cards List (Chronological order) */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <HealthLogCard log={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>
              No diagnostics logs match the selected disease filter
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setActiveDiseaseFilter('All')}
            >
              <Text style={styles.actionBtnText}>Show All Records</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Detail Header
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  detailScreenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  detailScreenSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Pet selection card
  petSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  petSelectEmoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  petSelectInfo: {
    flex: 1,
  },
  petSelectName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  petSelectBreed: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  petSelectRecordsCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },
  petSelectChevron: {
    marginLeft: Spacing.sm,
  },

  // Disease Filter Tabs
  filterWrapper: {
    paddingTop: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
    minHeight: 46,
  },
  tabsList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textInverse,
  },

  // List layout
  listContent: {
    paddingVertical: Spacing.md,
    paddingBottom: 40,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  actionBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
