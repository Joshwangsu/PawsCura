import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

const STATUS_CONFIG = {
  Safe: {
    bg: Colors.successBg,
    border: '#A7F3D0', // light emerald border
    text: '#059669', // darker emerald text
    icon: 'shield-checkmark-outline',
    label: 'Safe — No Action',
  },
  Urgent: {
    bg: Colors.dangerBg,
    border: '#FECACA', // light red border
    text: '#DC2626', // darker red text
    icon: 'time-outline',
    label: 'Urgent — See Vet',
  },
  Moderate: {
    bg: Colors.warningBg,
    border: '#FDE68A', // light amber border
    text: '#D97706', // darker amber text
    icon: 'warning-outline',
    label: 'Moderate — Monitor',
  },
  'No Concerns Detected': {
    bg: Colors.successBg,
    border: '#A7F3D0',
    text: '#059669',
    icon: 'shield-checkmark-outline',
    label: 'Safe — No Action',
  },
  'Needs Evaluation': {
    bg: Colors.warningBg,
    border: '#FDE68A',
    text: '#D97706',
    icon: 'warning-outline',
    label: 'Moderate — Monitor',
  },
  'Immediate Care': {
    bg: Colors.dangerBg,
    border: '#FECACA',
    text: '#DC2626',
    icon: 'time-outline',
    label: 'Urgent — See Vet',
  },
  Open: {
    bg: Colors.successBg,
    border: '#A7F3D0',
    text: '#059669',
    icon: 'folder-open-outline',
    label: 'Open',
  },
  Closed: {
    bg: Colors.dangerBg,
    border: '#FECACA',
    text: '#DC2626',
    icon: 'folder-outline',
    label: 'Closed',
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Safe;
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge, 
      { 
        backgroundColor: config.bg,
        borderColor: config.border,
        paddingVertical: isSmall ? 3 : 5,
        paddingHorizontal: isSmall ? 8 : 10,
      }
    ]}>
      <Ionicons name={config.icon} size={isSmall ? 12 : 14} color={config.text} />
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
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    gap: 4,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
