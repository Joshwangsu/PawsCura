import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme/colors';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#EBF2FB', '#1E3F66']}
      locations={[0, 0.4, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header/Brand Section */}
          <View style={styles.brandContainer}>
            <View style={styles.logoRow}>
              <Ionicons name="paw" size={32} color={Colors.primary} style={styles.logoIcon} />
              <Text style={styles.appName}>PawsCura</Text>
            </View>
            <Text style={styles.tagline}>Your Pet's Health, Our Priority</Text>
          </View>

          {/* Hero Illustration Section */}
          <View style={styles.heroContainer}>
            <Image
              source={require('../../../assets/Landing.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Features Highlight */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="scan-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>AI Health Assessment Scan</Text>
                <Text style={styles.featureDesc}>Identify potential health concerns in seconds</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>24/7 Smart Chatbot</Text>
                <Text style={styles.featureDesc}>Get instant veterinary guidance anytime</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="clipboard-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Health Profiles</Text>
                <Text style={styles.featureDesc}>Track checkups, records, and histories</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Get Started / Signup */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Log In */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIcon: {
    marginTop: 2,
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    marginTop: Spacing.xs,
    marginBottom: -55,
    zIndex: 1,
  },
  heroImage: {
    width: width * 0.98,
    height: 250,
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    zIndex: 5,
    elevation: 8,
    ...Shadows.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  primaryBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
