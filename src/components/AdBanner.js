import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { isDismissed, dismiss } from '../services/ads';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const openAd = (ad) => {
  if (ad?.targetUrl) Linking.openURL(ad.targetUrl).catch(() => {});
};

export default function AdBanner({ ads = [], dismissKey, interval = 4500 }) {
  const [, forceUpdate] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Filter out any dismissed ads
  const visibleAds = (ads || []).filter(
    (a) => a && !isDismissed(a.id) && !(dismissKey && isDismissed(dismissKey))
  );

  useEffect(() => {
    if (visibleAds.length <= 1) return undefined;

    const timer = setInterval(() => {
      if (isDraggingRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % visibleAds.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
        } catch (e) {
          // ignore layout timing errors
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [visibleAds.length, interval]);

  if (!visibleAds || visibleAds.length === 0) return null;

  const handleDismiss = (adId) => {
    dismiss(dismissKey || adId);
    dismiss(adId);
    forceUpdate((n) => n + 1);
  };

  // Single ad fallback
  if (visibleAds.length === 1) {
    const single = visibleAds[0];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openAd(single)}
        style={styles.card}
      >
        {!!single.imageUrl && (
          <Image source={{ uri: single.imageUrl }} style={styles.image} />
        )}
        <View style={styles.body}>
          <Text style={styles.sponsored}>SPONSORED</Text>
          <Text style={styles.title} numberOfLines={1}>{single.title}</Text>
          {!!single.description && (
            <Text style={styles.desc} numberOfLines={2}>{single.description}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.close}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation?.();
            handleDismiss(single.id);
          }}
        >
          <Ionicons name="close" size={16} color={Colors.textMuted || '#999'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // Multi-ad swiping carousel
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={visibleAds}
        keyExtractor={(item, index) => item.id || `banner_${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        bounces={false}
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          const offset = e.nativeEvent.contentOffset.x;
          const index = Math.round(offset / SCREEN_WIDTH);
          if (index >= 0 && index < visibleAds.length) {
            setActiveIndex(index);
          }
          isDraggingRef.current = false;
        }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openAd(item)}
              style={styles.card}
            >
              {!!item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              )}
              <View style={styles.body}>
                <Text style={styles.sponsored}>SPONSORED</Text>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                {!!item.description && (
                  <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.close}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleDismiss(item.id);
                }}
              >
                <Ionicons name="close" size={16} color={Colors.textMuted || '#999'} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Subtle indicator dots */}
      <View style={styles.dotsRow}>
        {visibleAds.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: Spacing.md || 16,
    marginVertical: 6,
    borderRadius: BorderRadius.md || 12,
    padding: 10,
    ...(Shadows?.small || {}),
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  body: {
    flex: 1,
    paddingRight: 20,
  },
  sponsored: {
    fontSize: 9,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  desc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  close: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
    marginBottom: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  dotActive: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors?.primary || '#3B82F6',
  },
});
