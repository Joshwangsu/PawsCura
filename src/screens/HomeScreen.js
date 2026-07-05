import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import PetCard from '../components/PetCard';
import HealthLogCard from '../components/HealthLogCard';
import { useHealth } from '../context/HealthContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';


export default function HomeScreen({ navigation }) {
  const { pets, healthLogs } = useHealth();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  
  const [selectedPet, setSelectedPet] = useState(pets.length > 0 ? pets[0].id : null);
  const recentLogs = healthLogs.slice(0, 2);
  
  const displayName = user?.displayName || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 18) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  return (
    <View style={styles.safe}>
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
            <View style={styles.headerLeft}>
              <Text style={styles.greetingLabel}>{getGreeting()}</Text>
              <Text style={styles.greetingName} numberOfLines={1}>Hello, {displayName}</Text>
              <Text style={styles.greetingSubtext} numberOfLines={1}>How are your pets today?</Text>
            </View>

            <View style={styles.headerRight}>
              {/* Avatar / Settings tab shortcut */}
              <TouchableOpacity 
                style={styles.avatar} 
                onPress={() => navigation.navigate('Settings')} 
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>
                  {initial}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </LinearGradient>

        {/* ── Premium Subscription Banner ───────────────── */}
        <View style={styles.premiumBannerContainer}>
          {isPremium ? (
            <LinearGradient
              colors={['#1E3F66', Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBanner}
            >
              <View style={styles.premiumBannerLeft}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.premiumTitle}>PawsCura Premium Active</Text>
                  <Text style={styles.premiumSubtitle}>You have unlimited scans, logs, and pets.</Text>
                </View>
              </View>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Paywall')}
              style={[styles.premiumBanner, styles.premiumBannerFree]}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumBannerLeft}>
                  <Ionicons name="star" size={22} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                    <Text style={styles.premiumSubtitle}>Get unlimited scans, save multiple pets & logs!</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
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

          {pets.length === 0 ? (
            <TouchableOpacity 
              style={[styles.emptyCard, { marginHorizontal: Spacing.md }]} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Pets')}
            >
              <View style={styles.emptyIconBox}>
                <Ionicons name="paw-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Pets Added</Text>
              <Text style={styles.emptySubtext}>Tap here to register your first furry friend!</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={pets}
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
          )}
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

          {recentLogs.length === 0 ? (
            <TouchableOpacity 
              style={[styles.emptyCard, { marginHorizontal: Spacing.md }]} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Scan')}
            >
              <View style={styles.emptyIconBox}>
                <Ionicons name="scan-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Health Records</Text>
              <Text style={styles.emptySubtext}>Use the AI Assessment tool to generate a health report.</Text>
            </TouchableOpacity>
          ) : (
            recentLogs.map((log) => (
              <HealthLogCard key={log.id} log={log} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Logout Custom Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconBox}>
              <Ionicons name="log-out-outline" size={32} color={Colors.danger} />
            </View>
            <Text style={styles.logoutTitle}>Log Out</Text>
            <Text style={styles.logoutSubtext}>Are you sure you want to log out of your account?</Text>
            
            <View style={styles.logoutActions}>
              <TouchableOpacity 
                style={styles.logoutCancelBtn} 
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.logoutConfirmBtn} 
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { 
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: { paddingBottom: 30 },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.md,
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

  // Empty States
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  logoutModal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...Shadows.lg,
  },
  logoutIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  logoutSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  logoutCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  logoutConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  premiumBannerContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  premiumBanner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumBannerFree: {
    padding: 0, // Since the gradient handles padding
  },
  premiumGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 16,
  },

});
