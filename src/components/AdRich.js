import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDismissed, dismiss } from '../services/ads';
import { openAd } from './AdBanner';

/** Large inline rich-media card with image + CTA */
export function AdRichCard({ ad }) {
  if (!ad) return null;
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={() => openAd(ad)} style={styles.card}>
      {!!ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.cardImage} />}
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

/** Cycles through several rich ads on a timer */
export function AdRichRotator({ ads = [], interval = 6000 }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (ads.length < 2) return undefined;
    const t = setInterval(() => setIdx((i) => i + 1), interval);
    return () => clearInterval(t);
  }, [ads.length, interval]);
  if (!ads.length) return null;
  return <AdRichCard ad={ads[idx % ads.length]} />;
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
          <TouchableOpacity style={styles.popupClose} onPress={close}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <AdRichCard ad={ad} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 12,
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  popup: { marginHorizontal: 8 },
  popupClose: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: -4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 6,
    zIndex: 2,
  },
});
