import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { isDismissed, dismiss } from '../services/ads';
import { openAd } from './AdBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Large inline rich-media card with image + CTA */
export function AdRichCard({ ad, style, imageHeight }) {
  if (!ad) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => openAd(ad)}
      style={[styles.card, style]}
    >
      {!!ad.imageUrl && (
        <Image
          source={{ uri: ad.imageUrl }}
          style={[styles.cardImage, imageHeight ? { height: imageHeight } : null]}
        />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.sponsored}>SPONSORED</Text>
        <Text style={styles.title}>{ad.title}</Text>
        {!!ad.description && <Text style={styles.desc}>{ad.description}</Text>}
        {!!ad.targetUrl && (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Learn more</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Cycles through rich ads at intervals with smooth animated swipe transitions.
 * Supports both automatic timed swiping and interactive horizontal gesture swiping.
 */
export function AdRichRotator({ ads = [], interval = 5000 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    if (ads.length <= 1) return undefined;

    const timer = setInterval(() => {
      if (isUserInteractingRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % ads.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
        } catch (e) {
          // Ignore index errors if layout hasn't completed
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [ads.length, interval]);

  if (!ads || ads.length === 0) return null;

  if (ads.length === 1) {
    return <AdRichCard ad={ads[0]} />;
  }

  const handleScrollBeginDrag = () => {
    isUserInteractingRef.current = true;
  };

  const handleMomentumScrollEnd = (e) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    if (index >= 0 && index < ads.length) {
      setActiveIndex(index);
    }
    isUserInteractingRef.current = false;
  };

  return (
    <View style={styles.rotatorContainer}>
      <FlatList
        ref={flatListRef}
        data={ads}
        keyExtractor={(item, index) => item.id || `ad_${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        bounces={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <AdRichCard ad={item} />
          </View>
        )}
      />

      {/* Pagination indicators */}
      {ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Full-screen popup shown once per app session */
export function AdPopup({ ad }) {
  const [visible, setVisible] = useState(false);
  const key = ad ? `popup:${ad.id}` : null;

  useEffect(() => {
    if (!ad || isDismissed(key)) return undefined;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [ad, key]);

  if (!ad) return null;
  const close = () => { dismiss(key); setVisible(false); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.popup}>
          <View style={styles.popupCardWrapper}>
            <AdRichCard ad={ad} style={styles.popupCard} />
            <TouchableOpacity
              style={styles.popupInsideClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={close}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rotatorContainer: {
    marginVertical: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: { width: '100%', height: 170, backgroundColor: '#eee' },
  cardBody: { padding: 14 },
  sponsored: { fontSize: 9, fontWeight: '700', color: '#999', letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '800', color: '#222', marginTop: 2 },
  desc: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors?.primary || '#3B82F6',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  popup: { marginHorizontal: 16 },
  popupCardWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  popupCard: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  popupInsideClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});
