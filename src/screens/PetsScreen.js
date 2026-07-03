import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useHealth } from '../context/HealthContext';
import { useSubscription } from '../context/SubscriptionContext';

const SPECIES_OPTIONS = [
  { label: 'Dog', emoji: '🐶', value: 'dog' },
  { label: 'Cat', emoji: '🐱', value: 'cat' },
];

const PET_ACCENT_COLORS = [
  { bg: '#FDE68A', accent: '#F59E0B' },
  { bg: '#DDD6FE', accent: '#8B5CF6' },
  { bg: '#BBF7D0', accent: '#22C55E' },
  { bg: '#FECDD3', accent: '#EF4444' },
  { bg: '#BAE6FD', accent: '#0EA5E9' },
  { bg: '#FED7AA', accent: '#F97316' },
];


const EMPTY_FORM = {
  name: '',
  species: '',
  breed: '',
  age: '',
  weight: '',
  gender: '',
  birthday: '',
  notes: '',
};

function PetDetailModal({ pet, onClose, onDelete }) {
  return (
    <Modal visible={!!pet} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          {/* Header */}
          <LinearGradient
            colors={[pet?.accentColor || Colors.primary, pet?.color || Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.detailHeader}
          >
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.detailEmoji}>{pet?.emoji}</Text>
            <Text style={styles.detailName}>{pet?.name}</Text>
            <Text style={styles.detailBreed}>{pet?.breed}</Text>
          </LinearGradient>

          <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
            {/* Info grid */}
            <View style={styles.detailGrid}>
              {[
                { label: 'Species', value: pet?.species, icon: 'paw' },
                { label: 'Age', value: pet?.age, icon: 'calendar' },
                { label: 'Weight', value: pet?.weight, icon: 'barbell' },
                { label: 'Gender', value: pet?.gender || '—', icon: 'male-female' },
                { label: 'Birthday', value: pet?.birthday || '—', icon: 'gift' },
              ].map((info) => (
                <View key={info.label} style={styles.detailInfoCard}>
                  <Ionicons name={info.icon} size={18} color={pet?.accentColor || Colors.primary} />
                  <Text style={styles.detailInfoLabel}>{info.label}</Text>
                  <Text style={styles.detailInfoValue}>{info.value}</Text>
                </View>
              ))}
            </View>

            {/* Notes */}
            {pet?.notes ? (
              <View style={styles.detailNotesCard}>
                <Text style={styles.detailNotesLabel}>Notes</Text>
                <Text style={styles.detailNotesText}>{pet.notes}</Text>
              </View>
            ) : null}

            {/* Delete button */}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(pet?.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Remove Pet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AddPetModal({ visible, onClose, onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [step, setStep] = useState(1); // 1 = basic, 2 = details

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSpeciesSelect = (sp) => {
    setSelectedSpecies(sp);
    updateField('species', sp.value);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !selectedSpecies) {
      Alert.alert('Missing Info', 'Please enter your pet\'s name and select a species.');
      return;
    }
    const colorPair = PET_ACCENT_COLORS[selectedColor];
    onAdd({
      id: `p_${Date.now()}`,
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || `${selectedSpecies.label}`,
      age: form.age || 'Unknown',
      weight: form.weight || 'Unknown',
      gender: form.gender || 'Unknown',
      birthday: form.birthday || '',
      notes: form.notes || '',
      emoji: selectedSpecies.emoji,
      color: colorPair.bg,
      accentColor: colorPair.accent,
    });
    setForm(EMPTY_FORM);
    setSelectedSpecies(null);
    setSelectedColor(0);
    setStep(1);
    onClose();
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setSelectedSpecies(null);
    setSelectedColor(0);
    setStep(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.addModal}>
          {/* Modal header */}
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>
              {step === 1 ? 'Add New Pet' : 'More Details'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.addFormScroll}>
            {step === 1 ? (
              <>
                {/* Pet Name */}
                <Text style={styles.fieldLabel}>Pet Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Buddy"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.name}
                  onChangeText={(v) => updateField('name', v)}
                />

                {/* Species */}
                <Text style={styles.fieldLabel}>Species *</Text>
                <View style={styles.speciesGrid}>
                  {SPECIES_OPTIONS.map((sp) => (
                    <TouchableOpacity
                      key={sp.value}
                      style={[
                        styles.speciesBtn,
                        selectedSpecies?.value === sp.value && styles.speciesBtnActive,
                      ]}
                      onPress={() => handleSpeciesSelect(sp)}
                    >
                      <Text style={styles.speciesEmoji}>{sp.emoji}</Text>
                      <Text
                        style={[
                          styles.speciesLabel,
                          selectedSpecies?.value === sp.value && styles.speciesLabelActive,
                        ]}
                      >
                        {sp.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Color theme */}
                <Text style={styles.fieldLabel}>Card Color</Text>
                <View style={styles.colorRow}>
                  {PET_ACCENT_COLORS.map((c, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c.accent },
                        selectedColor === idx && styles.colorDotSelected,
                      ]}
                      onPress={() => setSelectedColor(idx)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <>
                {/* Breed */}
                <Text style={styles.fieldLabel}>Breed</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Golden Retriever"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.breed}
                  onChangeText={(v) => updateField('breed', v)}
                />

                {/* Age + Weight */}
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 3 years"
                      placeholderTextColor={Colors.textSecondary}
                      value={form.age}
                      onChangeText={(v) => updateField('age', v)}
                    />
                  </View>
                  <View style={{ width: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Weight</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 8 kg"
                      placeholderTextColor={Colors.textSecondary}
                      value={form.weight}
                      onChangeText={(v) => updateField('weight', v)}
                    />
                  </View>
                </View>

                {/* Gender */}
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                      onPress={() => updateField('gender', g)}
                    >
                      <Ionicons
                        name={g === 'Male' ? 'male' : 'female'}
                        size={16}
                        color={form.gender === g ? '#fff' : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.genderLabel,
                          form.gender === g && styles.genderLabelActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Birthday */}
                <Text style={styles.fieldLabel}>Birthday</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Jan 15, 2022"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.birthday}
                  onChangeText={(v) => updateField('birthday', v)}
                />

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Any special info about your pet..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={(v) => updateField('notes', v)}
                />
              </>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.addModalFooter}>
            {step === 2 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={step === 1 ? () => setStep(2) : handleSubmit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primary, '#1E3F66']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>
                  {step === 1 ? 'Next →' : 'Add Pet'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PetsScreen() {
  const { pets, addPet, deletePet } = useHealth();
  const { isPremium } = useSubscription();
  const navigation = useNavigation();
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddPet = (newPet) => {
    addPet(newPet);
  };

  const handleDeletePet = (id) => {
    Alert.alert(
      'Remove Pet',
      'Are you sure you want to remove this pet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deletePet(id);
            setSelectedPet(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Ionicons name="paw" size={24} color="#fff" />
              <Text style={styles.headerTitle}>My Pets</Text>
            </View>
            <Text style={styles.headerSub}>
              {pets.length} {pets.length === 1 ? 'pet' : 'pets'} registered
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (!isPremium && pets.length >= 1) {
                navigation.navigate('Paywall');
              } else {
                setShowAddModal(true);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Pet list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {pets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="paw" size={48} color={Colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Pets Yet</Text>
            <Text style={styles.emptySub}>
              Tap the + button to add your first furry friend!
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>+ Add Your First Pet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={styles.petCard}
                onPress={() => setSelectedPet(pet)}
                activeOpacity={0.85}
              >
                <View style={[styles.petCardLeft, { backgroundColor: pet.color }]}>
                  <Text style={styles.petCardEmoji}>{pet.emoji}</Text>
                </View>
                <View style={styles.petCardInfo}>
                  <Text style={styles.petCardName}>{pet.name}</Text>
                  <Text style={styles.petCardBreed}>{pet.breed}</Text>
                  <View style={styles.petCardTags}>
                    <View style={[styles.petTag, { backgroundColor: pet.color }]}>
                      <Text style={[styles.petTagText, { color: pet.accentColor }]}>
                        {pet.age}
                      </Text>
                    </View>
                    <View style={[styles.petTag, { backgroundColor: pet.color }]}>
                      <Text style={[styles.petTagText, { color: pet.accentColor }]}>
                        {pet.weight}
                      </Text>
                    </View>
                    {pet.gender && pet.gender !== 'Unknown' && (
                      <View style={[styles.petTag, { backgroundColor: pet.color }]}>
                        <Text style={[styles.petTagText, { color: pet.accentColor }]}>
                          {pet.gender}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}

            {/* Add another */}
            <TouchableOpacity
              style={styles.addAnotherBtn}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.addAnotherText}>Add Another Pet</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Detail modal */}
      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          onClose={() => setSelectedPet(null)}
          onDelete={handleDeletePet}
        />
      )}

      {/* Add pet modal */}
      <AddPetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.md, paddingBottom: 40 },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  // Pet card
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  petCardLeft: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  petCardEmoji: { fontSize: 32 },
  petCardInfo: { flex: 1 },
  petCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  petCardBreed: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  petCardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  petTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  petTagText: { fontSize: 11, fontWeight: '600' },

  // Add another
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addAnotherText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  emptyAddBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // --- Modals ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  // Detail Modal
  detailModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  detailHeader: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    position: 'relative',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailEmoji: { fontSize: 56, marginBottom: 8 },
  detailName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  detailBreed: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  detailBody: { padding: Spacing.lg },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailInfoCard: {
    width: '47%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  detailInfoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  detailNotesCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  detailNotesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  detailNotesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    marginBottom: 40,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Add Modal
  addModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 6,
  },
  stepLineActive: { backgroundColor: Colors.primary },
  addFormScroll: { paddingHorizontal: Spacing.lg },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  speciesBtn: {
    width: '30%',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  speciesBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF2FB',
  },
  speciesEmoji: { fontSize: 24 },
  speciesLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  speciesLabelActive: { color: Colors.primary },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  genderLabelActive: { color: '#fff' },

  // Footer
  addModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  nextBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.md,
  },
  nextBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});
