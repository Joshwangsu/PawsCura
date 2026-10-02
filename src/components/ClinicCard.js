import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function ClinicCard({ clinic, onNavigate, onPressDetails }) {
  const stars = Math.round(clinic.rating);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onPressDetails && onPressDetails(clinic)}
    >
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Text style={styles.clinicEmoji}>{clinic.emoji || '🏥'}</Text>
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

        {/* Hours & Action Buttons */}
        <View style={styles.footerRow}>
          <Text style={styles.hours} numberOfLines={1}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            {'  '}{clinic.hours || 'Hours not listed'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => onPressDetails && onPressDetails(clinic)}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>

          {clinic.coordinates &&
            clinic.coordinates.latitude !== 0 &&
            clinic.coordinates.longitude !== 0 && (
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => onNavigate && onNavigate(clinic)}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={14} color="#fff" />
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </TouchableOpacity>
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
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    flex: 1,
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  navigateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
