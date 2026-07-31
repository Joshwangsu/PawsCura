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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useHealth } from '../context/HealthContext';
import { useSubscription } from '../context/SubscriptionContext';
import HealthLogCard from '../components/HealthLogCard';

const SPECIES_OPTIONS = [
  { label: 'Dog', icon: 'paw-outline', value: 'dog' },
  { label: 'Cat', icon: 'paw-outline', value: 'cat' },
];

const PHOTO_ANGLES = [
  { id: 'front', title: 'Front Face', desc: 'Required • Primary avatar & face matching', icon: 'person-circle-outline', required: true, scoreBonus: 70 },
  { id: 'side', title: 'Side Profile', desc: 'Recommended • Body shape & side coat', icon: 'body-outline', required: false, scoreBonus: 15 },
  { id: 'back', title: 'Back / Top View', desc: 'Recommended • Dorsal coat pattern', icon: 'eye-outline', required: false, scoreBonus: 9 },
  { id: 'chest', title: 'Chest & Markings', desc: 'Optional • Underbody & unique spots', icon: 'shield-outline', required: false, scoreBonus: 4 },
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

function calculateAccuracyScore(photos = []) {
  if (!photos || photos.length === 0) return 0;
  let score = 0;
  PHOTO_ANGLES.forEach((angle) => {
    if (photos.some((p) => p.angle === angle.id)) {
      score += angle.scoreBonus;
    }
  });
  return Math.min(score, 98);
}

function AddPetModal({ onClose, onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [photos, setPhotos] = useState([]); // [{ angle: 'front', uri, base64, mimeType }]
  const [step, setStep] = useState(1); // 1 = Basic, 2 = Guided Photos, 3 = Details

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSpeciesSelect = (sp) => {
    setSelectedSpecies(sp);
    updateField('species', sp.value);
  };

  const handleCaptureAngle = async (angleId) => {
    Alert.alert(
      'Capture Pet Angle',
      'Select camera or gallery to capture photo for AI matching:',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const asset = res.assets[0];
              const mime = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
              setPhotos((prev) => [
                ...prev.filter((p) => p.angle !== angleId),
                { angle: angleId, uri: asset.uri, base64: asset.base64, mimeType: mime },
              ]);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const asset = res.assets[0];
              const mime = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
              setPhotos((prev) => [
                ...prev.filter((p) => p.angle !== angleId),
                { angle: angleId, uri: asset.uri, base64: asset.base64, mimeType: mime },
              ]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !selectedSpecies) {
      Alert.alert('Missing Required Info', 'Please enter your pet\'s name and select a species.');
      return;
    }
    const colorPair = PET_ACCENT_COLORS[selectedColor];
    const frontPhoto = photos.find((p) => p.angle === 'front');

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
      icon: selectedSpecies.icon,
      color: colorPair.bg,
      accentColor: colorPair.accent,
      referencePhotos: photos,
      primaryPhotoUri: frontPhoto ? frontPhoto.uri : null,
      accuracyScore: calculateAccuracyScore(photos),
    });

    setForm(EMPTY_FORM);
    setSelectedSpecies(null);
    setSelectedColor(0);
    setPhotos([]);
    setStep(1);
    onClose();
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setSelectedSpecies(null);
    setSelectedColor(0);
    setPhotos([]);
    setStep(1);
    onClose();
  };

  const currentScore = calculateAccuracyScore(photos);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fullscreenOverlay}
    >
      <View style={styles.addModal}>
        {/* Modal Header */}
        <View style={styles.addModalHeader}>
          <View>
            <Text style={styles.addModalTitle}>
              {step === 1 ? 'Add New Pet' : step === 2 ? 'Guided Visual Registration' : 'Additional Details'}
            </Text>
            <Text style={styles.addModalSub}>
              {step === 1 ? 'Basic profile info' : step === 2 ? 'Photos for AI Auto-Identification' : 'Notes & health background'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.addFormScroll}>
          {step === 1 && (
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
                    <Ionicons
                      name={sp.icon}
                      size={20}
                      color={selectedSpecies?.value === sp.value ? Colors.primary : Colors.textSecondary}
                    />
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

              {/* Breed */}
              <Text style={styles.fieldLabel}>Breed</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Golden Retriever"
                placeholderTextColor={Colors.textSecondary}
                value={form.breed}
                onChangeText={(v) => updateField('breed', v)}
              />

              {/* Theme Color */}
              <Text style={styles.fieldLabel}>Card Accent</Text>
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
          )}

          {step === 2 && (
            <>
              {/* Accuracy Meter Card */}
              <View style={styles.accuracyCard}>
                <View style={styles.accuracyHeader}>
                  <Ionicons name="sparkles" size={18} color={Colors.primary} />
                  <Text style={styles.accuracyTitle}>AI Scan Accuracy</Text>
                  <Text style={styles.accuracyPercent}>{currentScore}%</Text>
                </View>
                <View style={styles.accuracyBarTrack}>
                  <View style={[styles.accuracyBarFill, { width: `${currentScore}%` }]} />
                </View>
                <Text style={styles.accuracySub}>
                  {currentScore === 0
                    ? 'Take at least 1 photo for AI auto-identification during scans.'
                    : currentScore >= 90
                    ? 'Excellent! High confidence pet detection enabled.'
                    : 'Add more angles to boost recognition accuracy.'}
                </Text>
              </View>

              {/* Guided Photo Angle Slots */}
              {PHOTO_ANGLES.map((angle) => {
                const existingPhoto = photos.find((p) => p.angle === angle.id);
                return (
                  <View key={angle.id} style={styles.photoSlotCard}>
                    <View style={styles.photoSlotHeader}>
                      <View style={styles.photoSlotIconWrap}>
                        <Ionicons name={angle.icon} size={20} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.photoSlotTitle}>{angle.title}</Text>
                          {angle.required && <Text style={styles.requiredTag}>Required</Text>}
                        </View>
                        <Text style={styles.photoSlotDesc}>{angle.desc}</Text>
                      </View>
                    </View>

                    {existingPhoto ? (
                      <View style={styles.photoPreviewWrapper}>
                        <Image source={{ uri: existingPhoto.uri }} style={styles.photoSlotPreview} />
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={() => handleCaptureAngle(angle.id)}
                        >
                          <Ionicons name="camera-reverse" size={16} color="#fff" />
                          <Text style={styles.retakeBtnText}>Retake</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addPhotoSlotBtn}
                        onPress={() => handleCaptureAngle(angle.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                        <Text style={styles.addPhotoSlotText}>Capture {angle.title}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {step === 3 && (
            <>
              {/* Age + Weight */}
              <View style={styles.rowInputs}>
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
                    placeholder="e.g. 8.5"
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
              <Text style={styles.fieldLabel}>Medical Notes / Allergies</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Any special info, allergies or chronic conditions..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
                value={form.notes}
                onChangeText={(v) => updateField('notes', v)}
              />
            </>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.addModalFooter}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              if (step === 1) {
                if (!form.name.trim() || !selectedSpecies) {
                  Alert.alert('Missing Info', 'Please enter your pet\'s name and species.');
                  return;
                }
                setStep(2);
              } else if (step === 2) {
                setStep(3);
              } else {
                handleSubmit();
              }
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, '#1E3F66']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>
                {step === 3 ? 'Save Profile' : 'Continue'}
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
  const [photos, setPhotos] = useState([]);
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
      const sp = SPECIES_OPTIONS.find((o) => o.value === pet.species) || SPECIES_OPTIONS[0];
      setSelectedSpecies(sp);
      const colorIndex = PET_ACCENT_COLORS.findIndex((o) => o.bg === pet.color || o.accent === pet.accentColor);
      setSelectedColor(colorIndex >= 0 ? colorIndex : 0);
      setPhotos(Array.isArray(pet.referencePhotos) ? pet.referencePhotos : []);
      setStep(1);
    }
  }, [pet]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSpeciesSelect = (sp) => {
    setSelectedSpecies(sp);
    updateField('species', sp.value);
  };

  const handleCaptureAngle = async (angleId) => {
    Alert.alert(
      'Capture Pet Angle',
      'Select camera or gallery to capture photo for AI matching:',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const asset = res.assets[0];
              const mime = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
              setPhotos((prev) => [
                ...prev.filter((p) => p.angle !== angleId),
                { angle: angleId, uri: asset.uri, base64: asset.base64, mimeType: mime },
              ]);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const asset = res.assets[0];
              const mime = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
              setPhotos((prev) => [
                ...prev.filter((p) => p.angle !== angleId),
                { angle: angleId, uri: asset.uri, base64: asset.base64, mimeType: mime },
              ]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !selectedSpecies) {
      Alert.alert('Missing Info', 'Please enter your pet\'s name and select a species.');
      return;
    }
    const colorPair = PET_ACCENT_COLORS[selectedColor];
    const frontPhoto = photos.find((p) => p.angle === 'front');

    onEdit(pet.id, {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || `${selectedSpecies.label}`,
      age: form.age || '0',
      weight: form.weight || '0',
      gender: form.gender || 'Unknown',
      birthday: form.birthday || '',
      notes: form.notes || '',
      icon: selectedSpecies.icon,
      color: colorPair.bg,
      accentColor: colorPair.accent,
      referencePhotos: photos,
      primaryPhotoUri: frontPhoto ? frontPhoto.uri : pet.primaryPhotoUri || null,
      accuracyScore: calculateAccuracyScore(photos),
    });
    onClose();
  };

  const currentScore = calculateAccuracyScore(photos);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fullscreenOverlay}
    >
      <View style={styles.addModal}>
        <View style={styles.addModalHeader}>
          <Text style={styles.addModalTitle}>Edit Pet Profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.addFormScroll}>
          {step === 1 ? (
            <>
              <Text style={styles.fieldLabel}>Pet Name *</Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={(v) => updateField('name', v)}
              />

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
                    <Ionicons name={sp.icon} size={20} color={selectedSpecies?.value === sp.value ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.speciesLabel, selectedSpecies?.value === sp.value && styles.speciesLabelActive]}>
                      {sp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Breed</Text>
              <TextInput
                style={styles.textInput}
                value={form.breed}
                onChangeText={(v) => updateField('breed', v)}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Age (yrs)</Text>
                  <TextInput
                    style={styles.textInput}
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
                    keyboardType="numeric"
                    value={form.weight}
                    onChangeText={(v) => updateField('weight', v)}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                multiline
                numberOfLines={3}
                value={form.notes}
                onChangeText={(v) => updateField('notes', v)}
              />
            </>
          ) : (
            <>
              <View style={styles.accuracyCard}>
                <View style={styles.accuracyHeader}>
                  <Ionicons name="sparkles" size={18} color={Colors.primary} />
                  <Text style={styles.accuracyTitle}>AI Scan Accuracy</Text>
                  <Text style={styles.accuracyPercent}>{currentScore}%</Text>
                </View>
                <View style={styles.accuracyBarTrack}>
                  <View style={[styles.accuracyBarFill, { width: `${currentScore}%` }]} />
                </View>
              </View>

              {PHOTO_ANGLES.map((angle) => {
                const existingPhoto = photos.find((p) => p.angle === angle.id);
                return (
                  <View key={angle.id} style={styles.photoSlotCard}>
                    <View style={styles.photoSlotHeader}>
                      <View style={styles.photoSlotIconWrap}>
                        <Ionicons name={angle.icon} size={20} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.photoSlotTitle}>{angle.title}</Text>
                        <Text style={styles.photoSlotDesc}>{angle.desc}</Text>
                      </View>
                    </View>

                    {existingPhoto ? (
                      <View style={styles.photoPreviewWrapper}>
                        <Image source={{ uri: existingPhoto.uri }} style={styles.photoSlotPreview} />
                        <TouchableOpacity style={styles.retakeBtn} onPress={() => handleCaptureAngle(angle.id)}>
                          <Ionicons name="camera-reverse" size={16} color="#fff" />
                          <Text style={styles.retakeBtnText}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addPhotoSlotBtn} onPress={() => handleCaptureAngle(angle.id)}>
                        <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                        <Text style={styles.addPhotoSlotText}>Add Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

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
                {step === 1 ? 'Photos →' : 'Save Details'}
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
                <View style={[styles.dropdownEmojiCircle, { backgroundColor: activePet?.accentColor || Colors.primary }]}>
                  {activePet?.primaryPhotoUri ? (
                    <Image source={{ uri: activePet.primaryPhotoUri }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name={activePet?.icon || 'paw'} size={20} color="#fff" />
                  )}
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
                  <View style={styles.avatarCircle}>
                    {activePet?.primaryPhotoUri ? (
                      <Image source={{ uri: activePet.primaryPhotoUri }} style={styles.avatarImgLarge} />
                    ) : (
                      <Ionicons name={activePet?.icon || 'paw'} size={28} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dashboardName}>{activePet?.name}</Text>
                    <View style={styles.accuracyTagBadge}>
                      <Ionicons name="sparkles" size={10} color="#fff" />
                      <Text style={styles.accuracyTagText}>
                        {calculateAccuracyScore(activePet?.referencePhotos)}% Match Score
                      </Text>
                    </View>
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
                    { label: 'Age', value: activePet?.age !== undefined ? `${activePet.age} yrs` : 'Not specified', icon: 'calendar' },
                    { label: 'Weight', value: activePet?.weight !== undefined ? `${activePet.weight} kg` : 'Not specified', icon: 'barbell' },
                    { label: 'Gender', value: activePet?.gender || 'Not specified', icon: 'male-female' },
                    { label: 'Birthday', value: activePet?.birthday || 'Not specified', icon: 'gift' },
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
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImgLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  accuracyTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  accuracyTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
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
  addModalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  accuracyCard: {
    backgroundColor: '#EBF2FB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accuracyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    flex: 1,
    marginLeft: 6,
  },
  accuracyPercent: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  accuracyBarTrack: {
    height: 8,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  accuracyBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  accuracySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  photoSlotCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  photoSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  photoSlotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  requiredTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.danger,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoSlotDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  addPhotoSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
  },
  addPhotoSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  photoPreviewWrapper: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 140,
  },
  photoSlotPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  retakeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    width: '48%',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
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
