import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

const STATUS_CONFIG = {
  Safe: {
    bg: '#DCFCE7', // emerald-100
    border: '#A7F3D0',
    text: '#059669',
    icon: 'shield-checkmark-outline',
    label: 'Safe — No Action',
  },
  Mild: {
    bg: '#E0F2FE', // sky-100
    border: '#BAE6FD',
    text: '#0284C7',
    icon: 'information-circle-outline',
    label: 'Mild — Low Concern',
  },
  Moderate: {
    bg: '#FEF3C7', // amber-100
    border: '#FDE68A',
    text: '#D97706',
    icon: 'warning-outline',
    label: 'Moderate — Monitor',
  },
  Urgent: {
    bg: '#FEE2E2', // red-100
    border: '#FECACA',
    text: '#DC2626',
    icon: 'alert-circle-outline',
    label: 'Urgent — See Vet',
  },
  'No Concerns Detected': {
    bg: '#DCFCE7',
    border: '#A7F3D0',
    text: '#059669',
    icon: 'shield-checkmark-outline',
    label: 'Safe — No Action',
  },
  'Needs Evaluation': {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#D97706',
    icon: 'warning-outline',
    label: 'Moderate — Monitor',
  },
  'Immediate Care': {
    bg: '#FEE2E2',
    border: '#FECACA',
    text: '#DC2626',
    icon: 'alert-circle-outline',
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
  const normalizedKey = status
    ? Object.keys(STATUS_CONFIG).find(
        (k) => k.toLowerCase() === String(status).trim().toLowerCase()
      )
    : null;
  const config = (normalizedKey && STATUS_CONFIG[normalizedKey]) || STATUS_CONFIG.Safe;
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
