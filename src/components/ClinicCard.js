import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function ClinicCard({ clinic, onNavigate }) {
  const stars = Math.round(clinic.rating);

  return (
    <View style={styles.card}>

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Text style={styles.clinicEmoji}>{clinic.emoji}</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.clinicName} numberOfLines={1}>
              {clinic.name}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
              {'  '}{clinic.address}
            </Text>
          </View>

          {/* Distance badge */}
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{clinic.distance}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={Colors.warning} />
            <Text style={styles.ratingText}>
              {clinic.rating} ({clinic.reviewCount})
            </Text>
          </View>

          {/* Status badge */}
          <StatusBadge status={clinic.isOpen ? 'Open' : 'Closed'} size="sm" />
        </View>

        {/* Hours */}
        <Text style={styles.hours}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          {'  '}{clinic.hours}
        </Text>

        {/* Footer: specialties + navigate button */}
        <View style={styles.footerRow}>
          <View style={styles.specialties}>
            {clinic.specialties.slice(0, 2).map((s) => (
              <View key={s} style={styles.specialtyChip}>
                <Text style={styles.specialtyText}>{s}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => onNavigate && onNavigate(clinic)}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={14} color={Colors.textInverse} />
            <Text style={styles.navigateText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },

  content: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicEmoji: {
    fontSize: 22,
  },
  titleBlock: {
    flex: 1,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  distanceBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  hours: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specialties: {
    flexDirection: 'row',
    gap: 6,
  },
  specialtyChip: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  specialtyText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  navigateText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
});
