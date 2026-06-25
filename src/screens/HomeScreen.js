import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PetCard from '../components/PetCard';
import HealthLogCard from '../components/HealthLogCard';
import { MOCK_PETS, MOCK_HEALTH_LOGS, MOCK_USER } from '../data/mockData';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const QUICK_ACTIONS = [
  { id: 'qa1', icon: 'heart-outline', label: 'Health Check', color: '#EF4444', bg: '#FEE2E2' },
  { id: 'qa2', icon: 'calendar-outline', label: 'Book Appointment', color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'qa3', icon: 'document-text-outline', label: 'View Records', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'qa4', icon: 'nutrition-outline', label: 'Diet Tracker', color: '#22C55E', bg: '#DCFCE7' },
];

export default function HomeScreen({ navigation }) {
  const [selectedPet, setSelectedPet] = useState(MOCK_PETS[0].id);
  const recentLogs = MOCK_HEALTH_LOGS.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ── Header ────────────────────────────────────── */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.greetingLabel}>Good Morning! 🌤</Text>
              <Text style={styles.greetingName}>Hello, {MOCK_USER.name} 👋</Text>
              <Text style={styles.greetingSubtext}>How are your pets today?</Text>
            </View>

            <View style={styles.headerRight}>
              {/* Notification bell */}
              <TouchableOpacity style={styles.notifBtn}>
                <Ionicons name="notifications-outline" size={22} color={Colors.textInverse} />
                <View style={styles.notifDot} />
              </TouchableOpacity>

              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {MOCK_USER.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'My Pets', value: MOCK_PETS.length, icon: 'paw' },
              { label: 'This Month', value: '3', icon: 'calendar' },
              { label: 'Next Visit', value: 'Jun 30', icon: 'medical' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Ionicons name={stat.icon} size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Health Assessment CTA ─────────────────────── */}
        <View style={styles.ctaWrapper}>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.7}
            disabled
          >
            <LinearGradient
              colors={['#1E3F66', Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaLeft}>
                <View style={styles.ctaIconBox}>
                  <Ionicons name="pulse" size={26} color={Colors.textInverse} />
                </View>
                <View>
                  <Text style={styles.ctaTitle}>Start Health Assessment</Text>
                  <Text style={styles.ctaSubtitle}>Quick 5-min wellness check for your pet</Text>
                </View>
              </View>
              <View style={styles.ctaArrow}>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>Coming Soon</Text>
          </View>
        </View>

        {/* ── My Pets ───────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={MOCK_PETS}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petsList}
            renderItem={({ item }) => (
              <PetCard
                pet={item}
                isSelected={selectedPet === item.id}
                onPress={() => setSelectedPet(item.id)}
              />
            )}
          />
        </View>

        {/* ── Quick Actions ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ───────────────────────────── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.seeAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {recentLogs.map((log) => (
            <HealthLogCard key={log.id} log={log} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 30 },

  // Header
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greetingLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textInverse,
    letterSpacing: -0.3,
  },
  greetingSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notifBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

  // CTA
  ctaWrapper: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    position: 'relative',
  },
  ctaBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  ctaIconBox: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
    marginBottom: 3,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  ctaArrow: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  ctaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textInverse,
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  lastSection: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  petsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 64,
  },
});
