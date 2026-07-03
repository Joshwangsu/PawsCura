import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const FEATURES = [
  { icon: 'scan-outline', title: 'Unlimited AI Scans', desc: 'Scan and assess unlimited photos of your pets.' },
  { icon: 'chatbubbles-outline', title: 'Unlimited Vet Chat', desc: 'Get unlimited conversational guidance with full history retention.' },
  { icon: 'paw-outline', title: 'Unlimited Pet Profiles', desc: 'Add profiles for all your furry, feathered, or scaly friends.' },
  { icon: 'map-outline', title: 'Advanced Clinic Map', desc: 'View all nearby clinics with advanced 24/7 and specialty filters.' },
];

export default function PaywallScreen({ navigation }) {
  const { upgradeToPremium } = useSubscription();
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    await upgradeToPremium();
    setLoading(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, '#0f2b4d']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.iconWrapper}>
              <Ionicons name="diamond" size={48} color={Colors.warning} />
            </View>
            <Text style={styles.title}>Upgrade to Premium</Text>
            <Text style={styles.subtitle}>Unlock the full power of your personal AI Veterinarian Assistant.</Text>
          </View>

          <View style={styles.featuresList}>
            {FEATURES.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={feat.icon} size={22} color={Colors.primary} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.pricingCard}>
            <Text style={styles.price}>$9.99<Text style={styles.priceInterval}>/month</Text></Text>
            <Text style={styles.priceSub}>Cancel anytime. Billed monthly.</Text>
            
            <TouchableOpacity 
              style={styles.upgradeBtn} 
              activeOpacity={0.8}
              onPress={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.termsText}>
              By upgrading, you agree to our Terms of Service and Privacy Policy. This is a simulated purchase for testing.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'flex-end',
  },
  closeBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pricingCard: {
    alignItems: 'center',
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  priceInterval: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  priceSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.xl,
  },
  upgradeBtn: {
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  upgradeBtnText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },
});
