import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function HealthLogCard({ log, onPress }) {
  const [showModal, setShowModal] = useState(false);
  const navigation = useNavigation();
  
  const handlePress = () => {
    if (onPress) onPress();
    else setShowModal(true);
  };

  return (
    <>
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress}>
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
    </TouchableOpacity>

    {/* Record Details Modal */}
    <Modal visible={showModal} animationType="slide" transparent={false} onRequestClose={() => setShowModal(false)}>
      <View style={styles.modalFullContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Record Details</Text>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Ionicons name="close" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScroll}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{log.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <StatusBadge status={log.status} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pet</Text>
            <Text style={styles.detailValue}>{log.petEmoji} {log.petName}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.detailLabel}>Condition</Text>
          <Text style={styles.detailValuePrimary}>{log.issue}</Text>
          
          <Text style={[styles.detailLabel, { marginTop: Spacing.md }]}>Observations & Analysis</Text>
          <Text style={styles.detailText}>{log.description}</Text>

          {log.imageUrl && (
            <View style={styles.scannedImageContainer}>
              <Text style={[styles.detailLabel, { marginTop: Spacing.md, marginBottom: Spacing.xs }]}>Scanned Symptom Photo</Text>
              <Image
                source={{ uri: log.imageUrl }}
                style={styles.scannedImage}
                resizeMode="cover"
              />
            </View>
          )}

          <TouchableOpacity 
            style={styles.chatbotLinkBtn}
            onPress={() => {
              const ctx = {
                suspectedCondition: log.issue,
                analysis: log.description
              };
              setShowModal(false);
              navigation.navigate('Chatbot', { initialContext: ctx });
            }}
          >
            <Ionicons name="chatbubbles" size={18} color="#fff" />
            <Text style={styles.chatbotLinkText}>Chat with Vet about this</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
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
  
  // Modal Styles
  modalFullContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  detailsScroll: {
    paddingBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailValuePrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  detailText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginTop: 6,
  },
  chatbotLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    gap: 8,
    ...Shadows.sm,
  },
  chatbotLinkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  scannedImageContainer: {
    marginTop: Spacing.md,
  },
  scannedImage: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
});
