import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Fast, crisp entrance animation
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Quickly fade out the entire splash overlay once ready
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 650);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity: containerOpacity }]}
    >
      <LinearGradient
        colors={['#FFF8F1', '#F7E6D2', '#EDD3B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.brandBox,
            {
              opacity: contentOpacity,
              transform: [
                { scale: scaleAnim },
                { translateY: logoTranslateY },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/splash-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <View style={styles.taglineBadge}>
            <Ionicons name="sparkles" size={12} color="#D97706" />
            <Text style={styles.taglineText}>AI-Powered Pet Diagnostics</Text>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
          <Text style={styles.footerText}>Smart Care For Your Furry Friends</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBox: {
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 220,
    marginBottom: 8,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(121, 75, 53, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(121, 75, 53, 0.2)',
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#794B35',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C624C',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
