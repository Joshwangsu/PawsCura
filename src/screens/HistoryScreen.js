import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../context/HealthContext';
import HealthLogCard from '../components/HealthLogCard';
import StatusBadge from '../components/StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const FILTER_TABS = [
  { key: 'all', label: 'All Records' },
  { key: 'dog', label: 'Dogs' },
  { key: 'cat', label: 'Cats' },
  { key: 'Safe', label: 'Safe' },
  { key: 'Moderate', label: 'Moderate' },
  { key: 'Urgent', label: 'Urgent' },
];

const STATUS_SUMMARY = [
  { label: 'Total', key: 'total', color: Colors.primary, bg: Colors.primaryBg, icon: 'documents-outline' },
  { label: 'Safe', key: 'Safe', color: Colors.success, bg: Colors.successBg, icon: 'checkmark-circle-outline' },
  { label: 'Moderate', key: 'Moderate', color: Colors.warning, bg: Colors.warningBg, icon: 'alert-circle-outline' },
  { label: 'Urgent', key: 'Urgent', color: Colors.danger, bg: Colors.dangerBg, icon: 'medical-outline' },
];

export default function HistoryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const { healthLogs, pets } = useHealth();

  const PET_SPECIES = useMemo(() => {
    const map = {};
    pets.forEach((p) => { map[p.name] = p.species; });
    return map;
  }, [pets]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return healthLogs;
    if (activeFilter === 'dog')
      return healthLogs.filter((l) => PET_SPECIES[l.petName] === 'dog');
    if (activeFilter === 'cat')
      return healthLogs.filter((l) => PET_SPECIES[l.petName] === 'cat');
    return healthLogs.filter((l) => l.status === activeFilter);
  }, [activeFilter, healthLogs, PET_SPECIES]);

  const summaryData = useMemo(() => ({
    total: healthLogs.length,
    Safe: healthLogs.filter((l) => l.status === 'Safe').length,
    Moderate: healthLogs.filter((l) => l.status === 'Moderate').length,
    Urgent: healthLogs.filter((l) => l.status === 'Urgent').length,
  }), [healthLogs]);

  return (
    <View style={styles.safe}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Pet Health Records</Text>
          <Text style={styles.screenSubtitle}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
          </Text>
        </View>

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
    </View>
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
    paddingTop: Spacing.xl + 20,
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
