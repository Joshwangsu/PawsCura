import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [settingsName, setSettingsName] = useState(user?.displayName || '');
  const [settingsEmail, setSettingsEmail] = useState(user?.email || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const displayName = user?.displayName || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const handleSaveSettings = async () => {
    if (!settingsName.trim()) {
      Alert.alert('Error', 'Display Name cannot be empty.');
      return;
    }
    setIsSavingSettings(true);
    try {
      // 1. Update Auth profile cache
      await updateProfile(auth.currentUser, {
        displayName: settingsName.trim()
      });

      // 2. Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        username: settingsName.trim().split('@')[0],
        email: settingsEmail.trim()
      });

      Alert.alert('Success', 'Your profile settings have been updated!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of PawsCura?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Logout Error:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.safe}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="settings-sharp" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>App Settings</Text>
            <Text style={styles.headerSub}>Manage your account, profile, and plans</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarContainer}>
            <LinearGradient
              colors={[Colors.primary, '#F59E0B']}
              style={styles.avatarGradientBorder}
            >
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </LinearGradient>
            <View style={styles.badgeContainer}>
              <Text style={[styles.badgeText, isPremium ? styles.badgePremium : styles.badgeFree]}>
                {isPremium ? 'PREMIUM PRO' : 'FREE ACCOUNT'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {/* Section: Personal Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter display name"
                placeholderTextColor={Colors.textMuted}
                value={settingsName}
                onChangeText={setSettingsName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Registered Email</Text>
            <View style={[styles.inputWrapper, styles.inputWrapperDisabled]}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: Colors.textSecondary }]}
                placeholder="Email Address"
                placeholderTextColor={Colors.textMuted}
                value={settingsEmail}
                onChangeText={setSettingsEmail}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Section: Subscription Panel */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
          </View>

          {isPremium ? (
            <LinearGradient
              colors={['#1E3F66', Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.membershipCardActive}
            >
              <View style={styles.membershipInner}>
                <Ionicons name="sparkles" size={24} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.membershipTitleActive}>PawsCura Premium Active</Text>
                  <Text style={styles.membershipSubActive}>Enjoy unlimited scans, diagnostics, and chats.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.membershipBtnCancel}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.8}
              >
                <Text style={styles.membershipBtnCancelText}>Cancel Subscription / Downgrade</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.membershipCardFree}
            >
              <View style={styles.membershipInner}>
                <Ionicons name="star" size={24} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.membershipTitleFree}>Upgrade to Premium</Text>
                  <Text style={styles.membershipSubFree}>Unlock multiple pets, saving diagnostics, and history.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.membershipBtnUpgrade}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.8}
              >
                <Text style={styles.membershipBtnUpgradeText}>Subscribe ($9.99/mo)</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>

        {/* Section: Account Management Actions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Account Options</Text>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveSettings}
              activeOpacity={0.8}
              disabled={isSavingSettings}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isSavingSettings ? 'Saving Settings...' : 'Save Settings Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
              <Text style={styles.logoutBtnText}>Log Out Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Shadows.md,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  scrollBody: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  avatarGradientBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  avatarLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.primary,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    ...Shadows.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  badgePremium: {
    backgroundColor: '#F59E0B',
  },
  badgeFree: {
    backgroundColor: Colors.textSecondary,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
  },
  inputWrapperDisabled: {
    backgroundColor: Colors.inputBg,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    height: '100%',
  },
  membershipCardActive: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  membershipCardFree: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  membershipInner: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  membershipTitleActive: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  membershipSubActive: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 15,
  },
  membershipTitleFree: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  membershipSubFree: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    lineHeight: 15,
  },
  membershipBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  membershipBtnCancelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  membershipBtnUpgrade: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  membershipBtnUpgradeText: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 13,
  },
  actionButtonsContainer: {
    gap: Spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  logoutBtnText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
