import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export function getPetPhotoUri(pet) {
  if (!pet) return null;
  const photos = Array.isArray(pet.referencePhotos) ? pet.referencePhotos : [];
  const primaryRef = photos.find((p) => p.angle === 'front') || photos[0];
  if (primaryRef?.base64) {
    const mime = primaryRef.mimeType || 'image/jpeg';
    return `data:${mime};base64,${primaryRef.base64}`;
  }
  if (pet.primaryPhotoUri) return pet.primaryPhotoUri;
  if (primaryRef?.uri) return primaryRef.uri;
  if (pet.imageUrl) return pet.imageUrl;
  if (pet.photoUrl) return pet.photoUrl;
  return null;
}

export default function PetCard({ pet, onPress, isSelected = false, fullWidth = false }) {
  const photoUri = getPetPhotoUri(pet);
  const accentColor = pet.accentColor || Colors.primary;
  const bgColor = pet.color || Colors.primaryBg;
  const speciesLabel = pet.species === 'dog' ? 'Dog' : 'Cat';
  const ageVal = pet.age !== undefined && pet.age !== '' && pet.age !== 'Unknown' ? `${pet.age} yrs` : '—';
  const weightVal = pet.weight !== undefined && pet.weight !== '' && pet.weight !== 'Unknown' ? `${pet.weight} kg` : '—';
  const genderVal = pet.gender && pet.gender !== 'Unknown' ? pet.gender : '—';

  // ── iOS Medium Widget Layout (when only 1 pet is added) ──────────────
  if (fullWidth) {
    return (
      <TouchableOpacity
        style={[
          styles.widgetCard,
          isSelected && styles.widgetCardSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Subtle decorative background paw watermark */}
        <View style={styles.watermarkWrap} pointerEvents="none">
          <Ionicons name="paw" size={115} color={accentColor} style={styles.watermarkIcon} />
        </View>

        {/* Main Upper Row: Photo + Identity */}
        <View style={styles.widgetTopRow}>
          <View style={[styles.widgetAvatarWrap, { backgroundColor: bgColor, borderColor: Colors.border }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.petPhoto} resizeMode="cover" />
            ) : pet.emoji ? (
              <Text style={styles.emoji}>{pet.emoji}</Text>
            ) : (
              <Ionicons name={pet.icon || 'paw'} size={34} color={accentColor} />
            )}
          </View>

          <View style={styles.widgetIdentity}>
            <View style={styles.widgetTitleRow}>
              <Text style={styles.widgetName} numberOfLines={1}>
                {pet.name}
              </Text>
              <View style={[styles.widgetSpeciesChip, { backgroundColor: bgColor }]}>
                <Ionicons name="paw" size={10} color={accentColor} />
                <Text style={[styles.widgetSpeciesText, { color: accentColor }]}>
                  {speciesLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.widgetBreed} numberOfLines={1}>
              {pet.breed || speciesLabel}
            </Text>

            {pet.notes ? (
              <Text style={styles.widgetNotes} numberOfLines={1}>
                {pet.notes}
              </Text>
            ) : (
              <View style={styles.widgetMatchRow}>
                <Ionicons name="sparkles" size={11} color={Colors.primaryLight} />
                <Text style={styles.widgetMatchText}>
                  {pet.accuracyScore ? `${pet.accuracyScore}% AI ID Ready` : 'Active Pet Profile'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom 3-Column Proportioned Stat Tiles */}
        <View style={styles.widgetStatsRow}>
          <View style={styles.widgetStatPill}>
            <View style={styles.widgetStatHeader}>
              <Ionicons name="calendar-outline" size={13} color={accentColor} />
              <Text style={styles.widgetStatLabel}>Age</Text>
            </View>
            <Text style={styles.widgetStatValue} numberOfLines={1}>
              {ageVal}
            </Text>
          </View>

          <View style={styles.widgetStatPill}>
            <View style={styles.widgetStatHeader}>
              <Ionicons name="barbell-outline" size={13} color={accentColor} />
              <Text style={styles.widgetStatLabel}>Weight</Text>
            </View>
            <Text style={styles.widgetStatValue} numberOfLines={1}>
              {weightVal}
            </Text>
          </View>

          <View style={styles.widgetStatPill}>
            <View style={styles.widgetStatHeader}>
              <Ionicons
                name={genderVal === 'Female' ? 'female-outline' : 'male-outline'}
                size={13}
                color={accentColor}
              />
              <Text style={styles.widgetStatLabel}>Gender</Text>
            </View>
            <Text style={styles.widgetStatValue} numberOfLines={1}>
              {genderVal}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Compact Horizontal List Card (when 2 or more pets are added) ────
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.selectedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Pet Photo / Fallback Icon Avatar */}
      <View style={[styles.emojiContainer, { backgroundColor: bgColor }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.petPhoto} resizeMode="cover" />
        ) : pet.emoji ? (
          <Text style={styles.emoji}>{pet.emoji}</Text>
        ) : (
          <Ionicons name={pet.icon || 'paw'} size={28} color={accentColor} />
        )}
      </View>

      {/* Selected indicator dot */}
      {isSelected && (
        <View style={[styles.selectedDot, { backgroundColor: accentColor }]} />
      )}

      {/* Pet Info */}
      <Text style={styles.name} numberOfLines={1}>
        {pet.name}
      </Text>
      <Text style={styles.breed} numberOfLines={1}>
        {pet.breed}
      </Text>

      {/* Species chip */}
      <View style={[styles.chip, { backgroundColor: bgColor }]}>
        <Text style={[styles.chipText, { color: accentColor }]}>
          {speciesLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── iOS Medium Widget Styles (Single Pet) ───────────────────────────
  widgetCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  widgetCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  watermarkWrap: {
    position: 'absolute',
    right: -14,
    bottom: -18,
    transform: [{ rotate: '-18deg' }],
  },
  watermarkIcon: {
    opacity: 0.07,
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  widgetAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  widgetIdentity: {
    flex: 1,
    justifyContent: 'center',
  },
  widgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  widgetName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  widgetSpeciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  widgetSpeciesText: {
    fontSize: 11,
    fontWeight: '700',
  },
  widgetBreed: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  widgetNotes: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  widgetMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  widgetMatchText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  widgetStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  widgetStatPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  widgetStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 3,
  },
  widgetStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  widgetStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // ── Compact Multi-Pet Card Styles (2+ Pets) ─────────────────────────
  card: {
    width: 130,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  petPhoto: {
    width: '100%',
    height: '100%',
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
