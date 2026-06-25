import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HealthLogCard from '../components/HealthLogCard';
import { MOCK_HEALTH_LOGS, MOCK_PETS } from '../data/mockData';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const FILTER_TABS = [
  { key: 'all', label: 'All Records' },
  { key: 'dog', label: '🐶 Dogs' },
  { key: 'cat', label: '🐱 Cats' },
  { key: 'Resolved', label: '✓ Resolved' },
  { key: 'Ongoing', label: '⚡ Ongoing' },
  { key: 'Scheduled', label: '📅 Scheduled' },
];

const STATUS_SUMMARY = [
  { label: 'Total', key: 'total', color: Colors.primary, bg: Colors.primaryBg, icon: 'documents-outline' },
  { label: 'Resolved', key: 'Resolved', color: Colors.success, bg: Colors.successBg, icon: 'checkmark-circle-outline' },
  { label: 'Ongoing', key: 'Ongoing', color: Colors.warning, bg: Colors.warningBg, icon: 'alert-circle-outline' },
  { label: 'Scheduled', key: 'Scheduled', color: Colors.info, bg: Colors.infoBg, icon: 'calendar-outline' },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('all');

  const PET_SPECIES = useMemo(() => {
    const map = {};
    MOCK_PETS.forEach((p) => { map[p.name] = p.species; });
    return map;
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return MOCK_HEALTH_LOGS;
    if (activeFilter === 'dog')
      return MOCK_HEALTH_LOGS.filter((l) => PET_SPECIES[l.petName] === 'dog');
    if (activeFilter === 'cat')
      return MOCK_HEALTH_LOGS.filter((l) => PET_SPECIES[l.petName] === 'cat');
    return MOCK_HEALTH_LOGS.filter((l) => l.status === activeFilter);
  }, [activeFilter, PET_SPECIES]);

  const summaryData = useMemo(() => ({
    total: MOCK_HEALTH_LOGS.length,
    Resolved: MOCK_HEALTH_LOGS.filter((l) => l.status === 'Resolved').length,
    Ongoing: MOCK_HEALTH_LOGS.filter((l) => l.status === 'Ongoing').length,
    Scheduled: MOCK_HEALTH_LOGS.filter((l) => l.status === 'Scheduled').length,
  }), []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Pet Health Records</Text>
          <Text style={styles.screenSubtitle}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ── Summary Cards ───────────────────────────────── */}
      <View style={styles.summaryRow}>
        {STATUS_SUMMARY.map((item) => (
          <View key={item.key} style={[styles.summaryCard, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
            <Text style={[styles.summaryValue, { color: item.color }]}>
              {summaryData[item.key]}
            </Text>
            <Text style={[styles.summaryLabel, { color: item.color }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Filter Tabs ─────────────────────────────────── */}
      <FlatList
        data={FILTER_TABS}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsList}
        style={styles.tabsScroll}
        renderItem={({ item }) => {
          const isActive = activeFilter === item.key;
          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveFilter(item.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Records List ────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HealthLogCard log={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptySubtitle}>
              No health records match the selected filter
            </Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={styles.resetBtnText}>Show All Records</Text>
            </TouchableOpacity>
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
  header: {
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
  addBtn: {
    width: 42,
    height: 42,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    gap: 3,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Filter tabs
  tabsScroll: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  tabsList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
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

  // List
  listContent: {
    paddingTop: 4,
    paddingBottom: 30,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 8,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 8,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  resetBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
