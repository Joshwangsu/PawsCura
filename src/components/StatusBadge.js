import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

const STATUS_CONFIG = {
  Resolved: {
    bg: Colors.successBg,
    text: Colors.success,
    dot: Colors.success,
    label: 'Resolved',
  },
  Ongoing: {
    bg: Colors.warningBg,
    text: Colors.warning,
    dot: Colors.warning,
    label: 'Ongoing',
  },
  Scheduled: {
    bg: Colors.infoBg,
    text: Colors.info,
    dot: Colors.info,
    label: 'Scheduled',
  },
  Open: {
    bg: Colors.successBg,
    text: Colors.success,
    dot: Colors.success,
    label: 'Open',
  },
  Closed: {
    bg: Colors.dangerBg,
    text: Colors.danger,
    dot: Colors.danger,
    label: 'Closed',
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Resolved;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text, fontSize: isSmall ? 10 : 12 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
