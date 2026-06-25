import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const STATUS_BORDER_COLOR = {
  Resolved: Colors.success,
  Ongoing: Colors.warning,
  Scheduled: Colors.info,
};

export default function HealthLogCard({ log }) {
  const borderColor = STATUS_BORDER_COLOR[log.status] || Colors.primary;

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      {/* Top row: date + status */}
      <View style={styles.topRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.date}>{log.date}</Text>
        </View>
        <StatusBadge status={log.status} size="sm" />
      </View>

      {/* Pet row */}
      <View style={styles.petRow}>
        <Text style={styles.petEmoji}>{log.petEmoji}</Text>
        <View>
          <Text style={styles.petName}>{log.petName}</Text>
          <Text style={styles.breed}>{log.breed}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Issue */}
      <Text style={styles.issue}>{log.issue}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {log.description}
      </Text>

      {/* Footer: clinic + vet */}
      <View style={styles.footerRow}>
        <View style={styles.metaItem}>
          <Ionicons name="business-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {log.clinic}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{log.vet}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    ...Shadows.sm,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  petEmoji: {
    fontSize: 28,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  petName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  breed: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  issue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
});
