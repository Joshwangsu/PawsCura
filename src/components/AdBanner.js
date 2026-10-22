import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { isDismissed, dismiss } from '../services/ads';

export const openAd = (ad) => {
  if (ad?.targetUrl) Linking.openURL(ad.targetUrl).catch(() => {});
};

export default function AdBanner({ ads = [], dismissKey }) {
  const [, force] = useState(0);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (ads.length < 2) return undefined;
    const t = setInterval(() => setIdx((i) => i + 1), 5000);
    return () => clearInterval(t);
  }, [ads.length]);
  const ad = ads.length ? ads[idx % ads.length] : null;
  if (!ad || (dismissKey && isDismissed(dismissKey))) return null;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openAd(ad)} style={styles.card}>
      {!!ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.image} />}
      <View style={styles.body}>
        <Text style={styles.sponsored}>SPONSORED</Text>
        <Text style={styles.title} numberOfLines={1}>{ad.title}</Text>
        {!!ad.description && <Text style={styles.desc} numberOfLines={2}>{ad.description}</Text>}
      </View>
      <TouchableOpacity
        style={styles.close}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => { dismiss(dismissKey || ad.id); force((n) => n + 1); }}
      >
        <Ionicons name="close" size={16} color={Colors.textMuted || '#999'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: Spacing.md || 16,
    marginVertical: 8,
    borderRadius: BorderRadius.md || 12,
    padding: 10,
    ...(Shadows?.small || {}),
  },
  image: { width: 56, height: 56, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' },
  body: { flex: 1, paddingRight: 20 },
  sponsored: { fontSize: 9, fontWeight: '700', color: '#999', letterSpacing: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#222' },
  desc: { fontSize: 12, color: '#666', marginTop: 2 },
  close: { position: 'absolute', top: 6, right: 6 },
});
