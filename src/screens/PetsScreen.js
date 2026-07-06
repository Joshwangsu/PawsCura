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
import HealthLogCard from '../components/HealthLogCard';

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

// PetDetailModal removed. Profile and diagnostic history details are now displayed inline using dropdown selectors.

function AddPetModal({ onClose, onAdd }) {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullscreenOverlay}
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
  );
}

function EditPetModal({ pet, onClose, onEdit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [step, setStep] = useState(1);

  React.useEffect(() => {
    if (pet) {
      setForm({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        age: pet.age !== undefined ? pet.age.toString() : '',
        weight: pet.weight !== undefined ? pet.weight.toString() : '',
        gender: pet.gender || '',
        birthday: pet.birthday || '',
        notes: pet.notes || '',
      });
      const sp = SPECIES_OPTIONS.find(o => o.value === pet.species) || SPECIES_OPTIONS[0];
      setSelectedSpecies(sp);
      const colorIndex = PET_ACCENT_COLORS.findIndex(o => o.bg === pet.color || o.accent === pet.accentColor);
      setSelectedColor(colorIndex >= 0 ? colorIndex : 0);
      setStep(1);
    }
  }, [pet]);

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
    onEdit(pet.id, {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || `${selectedSpecies.label}`,
      age: form.age || '0',
      weight: form.weight || '0',
      gender: form.gender || 'Unknown',
      birthday: form.birthday || '',
      notes: form.notes || '',
      emoji: selectedSpecies.emoji,
      color: colorPair.bg,
      accentColor: colorPair.accent,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullscreenOverlay}
    >
      <View style={styles.addModal}>
          {/* Modal header */}
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>
              {step === 1 ? 'Edit Pet Profile' : 'More Details'}
            </Text>
            <TouchableOpacity onPress={onClose}>
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
                  {PET_ACCENT_COLORS.map((color, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color.accent },
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

                {/* Age & Weight Row */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Age (years)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 3"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      value={form.age}
                      onChangeText={(v) => updateField('age', v)}
                    />
                  </View>
                  <View style={{ width: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 12.5"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
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
                      style={[
                        styles.genderBtn,
                        form.gender === g && styles.genderBtnActive,
                      ]}
                      onPress={() => updateField('gender', g)}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          form.gender === g && styles.genderTextActive,
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
                  placeholder="e.g. 12 Oct 2020"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.birthday}
                  onChangeText={(v) => updateField('birthday', v)}
                />

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes / Conditions</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="e.g. Allergies to chicken, very active..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={(v) => updateField('notes', v)}
                />

              </>
            )}
          </ScrollView>

          {/* Action footer */}
          <View style={styles.addModalFooter}>
            {step === 2 && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(1)}
                activeOpacity={0.8}
              >
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
                  {step === 1 ? 'Next →' : 'Save Details'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
  );
}

export default function PetsScreen() {
  const { pets, addPet, deletePet, updatePet, healthLogs } = useHealth();
  const { isPremium } = useSubscription();
  const navigation = useNavigation();
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [petToEdit, setPetToEdit] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const activePet = selectedPet || (pets.length > 0 ? pets[0] : null);

  const handleEditPet = async (id, updatedFields) => {
    try {
      await updatePet(id, updatedFields);
    } catch (err) {
      console.error(err);
    }
  };

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

      {/* Pet Dashboard Content */}
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
            {/* Custom Dropdown Selector */}
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowDropdown(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <View style={[styles.dropdownEmojiCircle, { backgroundColor: activePet?.color || Colors.primaryLight }]}>
                  <Text style={styles.dropdownEmoji}>{activePet?.emoji || '🐾'}</Text>
                </View>
                <View>
                  <Text style={styles.dropdownLabel}>Active Pet Profile</Text>
                  <Text style={styles.dropdownValue}>{activePet?.name} ({activePet?.breed})</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.primary} />
            </TouchableOpacity>

            {/* Pet Profile Details Dashboard Card */}
            <View style={styles.dashboardCard}>
              <LinearGradient
                colors={[activePet?.accentColor || Colors.primary, activePet?.color || Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dashboardHeader}
              >
                <View style={styles.dashboardHeaderInner}>
                  <Text style={styles.dashboardEmoji}>{activePet?.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dashboardName}>{activePet?.name}</Text>
                    <Text style={styles.dashboardBreed}>{activePet?.breed}</Text>
                  </View>
                  
                  {/* Action buttons (Edit & Delete) */}
                  <View style={styles.dashboardHeaderActions}>
                    <TouchableOpacity
                      style={styles.headerActionBtn}
                      onPress={() => {
                        setPetToEdit(activePet);
                        setShowEditModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.headerActionBtn}
                      onPress={() => handleDeletePet(activePet?.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.dashboardBody}>
                {/* Details grid */}
                <View style={styles.detailGrid}>
                  {[
                    { label: 'Species', value: activePet?.species, icon: 'paw' },
                    { label: 'Age', value: activePet?.age !== undefined ? `${activePet.age} yrs` : 'Unknown', icon: 'calendar' },
                    { label: 'Weight', value: activePet?.weight !== undefined ? `${activePet.weight} kg` : 'Unknown', icon: 'barbell' },
                    { label: 'Gender', value: activePet?.gender || '—', icon: 'male-female' },
                    { label: 'Birthday', value: activePet?.birthday || '—', icon: 'gift' },
                  ].map((info) => (
                    <View key={info.label} style={styles.detailInfoCard}>
                      <Ionicons name={info.icon} size={16} color={activePet?.accentColor || Colors.primary} />
                      <Text style={styles.detailInfoLabel}>{info.label}</Text>
                      <Text style={styles.detailInfoValue}>{info.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Notes */}
                {activePet?.notes ? (
                  <View style={styles.detailNotesCard}>
                    <Text style={styles.detailNotesLabel}>Notes & Conditions</Text>
                    <Text style={styles.detailNotesText}>{activePet.notes}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Health Records Section (Directly below pet card) */}
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Ionicons name="medical-outline" size={20} color={Colors.primary} />
                <Text style={styles.historySectionLabel}>Medical Scan History</Text>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>
                    {healthLogs.filter(log => log.petId === activePet?.id || log.petName?.toLowerCase() === activePet?.name?.toLowerCase()).length} records
                  </Text>
                </View>
              </View>

              {healthLogs.filter(log => log.petId === activePet?.id || log.petName?.toLowerCase() === activePet?.name?.toLowerCase()).length === 0 ? (
                <View style={styles.emptyLogsCard}>
                  <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyLogsText}>No diagnostics records on file for {activePet?.name}.</Text>
                  <TouchableOpacity
                    style={styles.emptyLogsScanBtn}
                    onPress={() => navigation.navigate('Scan')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyLogsScanBtnText}>Run AI Diagnostic Scan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                healthLogs
                  .filter(log => log.petId === activePet?.id || log.petName?.toLowerCase() === activePet?.name?.toLowerCase())
                  .map((log) => (
                    <View key={log.id} style={{ marginBottom: Spacing.sm }}>
                      <HealthLogCard log={log} />
                    </View>
                  ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Dropdown Modal List */}
      <Modal visible={showDropdown} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Pet Profile</Text>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {pets.map((pet) => {
                const isActive = pet.id === activePet?.id;
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedPet(pet);
                      setShowDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <View style={[styles.itemEmojiCircle, { backgroundColor: pet.color }]}>
                        <Text style={styles.itemEmoji}>{pet.emoji}</Text>
                      </View>
                      <View>
                        <Text style={[styles.itemName, isActive && styles.itemNameActive]}>{pet.name}</Text>
                        <Text style={styles.itemBreed}>{pet.breed}</Text>
                      </View>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.dropdownAddBtn}
                onPress={() => {
                  setShowDropdown(false);
                  if (!isPremium && pets.length >= 1) {
                    navigation.navigate('Paywall');
                  } else {
                    setShowAddModal(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                <Text style={styles.dropdownAddBtnText}>Add Another Pet Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add pet inline overlay */}
      {showAddModal && (
        <AddPetModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPet}
        />
      )}

      {/* Edit pet inline overlay */}
      {showEditModal && (
        <EditPetModal
          pet={petToEdit}
          onClose={() => {
            setShowEditModal(false);
            setPetToEdit(null);
          }}
          onEdit={(id, fields) => {
            handleEditPet(id, fields);
            setSelectedPet(prev => prev ? { ...prev, ...fields } : (pets.find(p => p.id === id) ? { ...pets.find(p => p.id === id), ...fields } : null));
          }}
        />
      )}
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

  // Custom Dropdown Selector styles
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownEmojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  dropdownEmoji: {
    fontSize: 20,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: '70%',
    ...Shadows.lg,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dropdownScroll: {
    padding: Spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dropdownItemActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF2FB',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemEmojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemNameActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  itemBreed: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dropdownAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    marginTop: Spacing.xs,
    marginBottom: 20,
  },
  dropdownAddBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // Dashboard Card layout styles
  dashboardCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  dashboardHeader: {
    padding: Spacing.md,
  },
  dashboardHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashboardEmoji: {
    fontSize: 36,
  },
  dashboardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  dashboardBreed: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  dashboardHeaderActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBody: {
    padding: Spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailInfoCard: {
    width: '31%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailInfoLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  detailInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  detailNotesCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailNotesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailNotesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Add Modal
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.card,
    zIndex: 1000,
  },
  addModal: {
    backgroundColor: Colors.card,
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 30,
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
  addFormScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
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
  historySection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  historySectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  historyBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyLogsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyLogsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyLogsScanBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  emptyLogsScanBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
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
});
