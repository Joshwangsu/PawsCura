import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen({ onFinish }) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoTranslateY = useRef(new Animated.Value(12)).current;
  const waveRotate = useRef(new Animated.Value(0)).current;
  const waveHop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Smooth entrance
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Subtle, natural welcoming wave on the Login puppy without distorting the PNG
    const oneWave = Animated.parallel([
      Animated.sequence([
        Animated.timing(waveRotate, { toValue: -1, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveRotate, { toValue: 1, duration: 150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveRotate, { toValue: -0.8, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveRotate, { toValue: 0, duration: 120, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(waveHop, { toValue: -5, duration: 130, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveHop, { toValue: 0, duration: 150, easing: Easing.in(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveHop, { toValue: -3, duration: 130, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveHop, { toValue: 0, duration: 120, easing: Easing.in(Easing.sin), useNativeDriver: true }),
      ]),
    ]);

    const waveAnim = Animated.sequence([
      Animated.delay(180),
      oneWave,
      oneWave,
    ]);
    waveAnim.start();

    // 3. Smooth fade-out transition into Login / Main screen
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 1350);

    return () => {
      clearTimeout(timer);
      waveAnim.stop();
    };
  }, []);

  const rotateInterpolate = waveRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '4.5deg'],
  });

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
          <Animated.View
            style={[
              styles.mascotFrame,
              {
                transform: [
                  { translateY: waveHop },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/Login.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Image
            source={require('../../assets/logo-horizontal.png')}
            style={styles.brandWordmark}
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
  mascotFrame: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: 'rgba(255, 253, 249, 0.72)',
    borderWidth: 2,
    borderColor: 'rgba(216, 141, 89, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  mascotImage: {
    width: 168,
    height: 168,
  },
  brandWordmark: {
    width: 175,
    height: 44,
    marginBottom: 4,
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
