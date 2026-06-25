import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function PetCard({ pet, onPress, isSelected = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.selectedCard,
        { borderTopColor: pet.accentColor },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Emoji Avatar */}
      <View style={[styles.emojiContainer, { backgroundColor: pet.color }]}>
        <Text style={styles.emoji}>{pet.emoji}</Text>
      </View>

      {/* Selected indicator dot */}
      {isSelected && (
        <View style={[styles.selectedDot, { backgroundColor: pet.accentColor }]} />
      )}

      {/* Pet Info */}
      <Text style={styles.name} numberOfLines={1}>
        {pet.name}
      </Text>
      <Text style={styles.breed} numberOfLines={1}>
        {pet.breed}
      </Text>

      {/* Species chip */}
      <View style={[styles.chip, { backgroundColor: pet.color }]}>
        <Text style={[styles.chipText, { color: pet.accentColor }]}>
          {pet.species === 'dog' ? '🐶 Dog' : '🐱 Cat'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 130,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: 4,
    ...Shadows.md,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderTopWidth: 4,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 32,
  },
  selectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  breed: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
