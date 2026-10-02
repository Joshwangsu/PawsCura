import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { analyzePetCondition } from '../services/gemini';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useHealth } from '../context/HealthContext';
import { useSubscription } from '../context/SubscriptionContext';

const SCAN_TIPS = [
  { icon: 'sunny-outline', text: 'Good lighting helps get a clear scan' },
  { icon: 'scan-circle-outline', text: 'Center the affected area in the frame' },
  { icon: 'camera-outline', text: 'Hold steady · avoid blur for best results' },
  { icon: 'leaf-outline', text: 'Clean the area gently before scanning' },
];

// Step definitions — Ionicons only, no emoji (Rule 3)
const ANALYSIS_STEPS = [
  { icon: 'cloud-upload-outline',    label: 'Uploading image' },
  { icon: 'hardware-chip-outline',   label: 'Running AI analysis' },
  { icon: 'paw-outline',             label: 'Matching your pet' },
  { icon: 'document-text-outline',   label: 'Generating report' },
];

// Brand accent used in the loading modal (10% accent rule)
const MODAL_ACCENT = '#63B3ED'; // blue-300 — visible against dark overlay
const MODAL_ACCENT_DIM = 'rgba(99,179,237,0.18)'; // tinted surface, not same as border

function ScanLoadingModal({ visible }) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;

    // Fade in the whole modal
    fadeAnim.setValue(0);
    setStepIndex(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Scan line: top → bottom sweep, reset, loop — 1.8 s period
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    scanLoop.start();

    // Subtle breathe pulse on the icon ring — scale 1 → 1.12, not exaggerated
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 950,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 950,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Advance step label every 1.4 s
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1400);

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      clearInterval(interval);
    };
  }, [visible]);

  // Scan line translates 0 → 200 px (height of the scan box)
  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const step = ANALYSIS_STEPS[stepIndex];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[scanModal.overlay, { opacity: fadeAnim }]}>

        {/* ── Pulsing icon ring ─────────────────────────────────────── */}
        {/* Rule 2: ring border (#63B3ED at 55% opacity) is visibly darker than
            the tinted bg (rgba 18% same hue) — clear edge contrast */}
        <Animated.View style={[scanModal.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="paw" size={40} color={MODAL_ACCENT} />
        </Animated.View>

        {/* ── Scan frame with sweep line ────────────────────────────── */}
        {/* Not a nested card — it is a scan viewfinder frame (fundamentally
            different content type: animated instrument, not a card) */}
        <View style={scanModal.scanBox}>
          {/* Corner brackets only — no solid border, no surface fill */}
          <View style={[scanModal.corner, scanModal.cornerTL]} />
          <View style={[scanModal.corner, scanModal.cornerTR]} />
          <View style={[scanModal.corner, scanModal.cornerBL]} />
          <View style={[scanModal.corner, scanModal.cornerBR]} />

          {/* Sweep line — accent color only element on neutral surface */}
          <Animated.View
            style={[scanModal.scanLine, { transform: [{ translateY }] }]}
          />

          {/* Overline label — not em-dash, not emoji, just letterSpaced caps */}
          <Text style={scanModal.scanBoxLabel}>SCANNING</Text>
        </View>

        {/* ── Step indicator ────────────────────────────────────────── */}
        {/* Rule 3: Ionicons icon, not emoji. Rule 1: single-surface row,
            tinted bg vs transparent overlay — distinct surface types */}
        <View style={scanModal.stepRow}>
          <View style={scanModal.stepIconBadge}>
            <Ionicons name={step.icon} size={18} color={MODAL_ACCENT} />
          </View>
          <Text style={scanModal.stepLabel}>{step.label}</Text>
        </View>

        {/* ── Progress dots ─────────────────────────────────────────── */}
        <View style={scanModal.dots}>
          {ANALYSIS_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                scanModal.dot,
                i === stepIndex && scanModal.dotActive,
              ]}
            />
          ))}
        </View>

        <Text style={scanModal.disclaimer}>AI-powered assessment in progress</Text>
      </Animated.View>
    </Modal>
  );
}


export default function ScanScreen() {
  const { pets, healthLogs, addHealthLog, updateHealthLog } = useHealth();
  const { isPremium, scanUsage, incrementScanCount } = useSubscription();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Track auto-save progress: null | 'saving' | 'saved' | 'error'
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [autoSavedPetName, setAutoSavedPetName] = useState(null);
  // ID of the Firestore health record created for this scan — used for chatbot session linking
  const [autoSavedRecordId, setAutoSavedRecordId] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (result && !loading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
      }, 300);
    }
  }, [result, loading]);

  const uploadToCloudinary = async (uri) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary config missing. Check EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
      return null;
    }

    try {
      // Read the local file as base64 using expo-file-system.
      // This is the ONLY reliable upload path in Expo — the FormData object
      // approach throws "Unsupported FormDataPart implementation" on iOS/Android.
      const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Cloudinary accepts a base64 data URI in the `file` field
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const body = new FormData();
      body.append('file', dataUri);
      body.append('upload_preset', uploadPreset);
      body.append('cloud_name', cloudName);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body,
          // Do NOT set Content-Type — let fetch set it with the correct boundary
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary rejected the upload: ${errText}`);
      }

      const json = await response.json();
      return json.secure_url ?? null;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      if (!isPremium && scanUsage.count >= 1) {
        navigation.navigate('Paywall');
        return;
      }

      const options = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true, // We need this for Gemini
      };

      let pickerResult;
      if (useCamera) {
        pickerResult = await ImagePicker.launchCameraAsync(options);
      } else {
        pickerResult = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        setImageUri(asset.uri);
        setResult(null); // Clear old results
        setAutoSaveStatus(null);
        setAutoSavedPetName(null);
        setAutoSavedRecordId(null); // Reset scan record link
        
        // Convert to proper mime type and analyze
        const mimeType = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        setLoading(true);
        try {
          const analysisResult = await analyzePetCondition(asset.base64, mimeType, pets);
          setResult(analysisResult);
          incrementScanCount();

          // Auto-record to pet's medical history immediately after scan
          // Priority: AI-matched pet ID > first pet in list
          const targetPet = (analysisResult.matchedPetId && pets.find((p) => p.id === analysisResult.matchedPetId))
            || (pets.length > 0 ? pets[0] : null);

          if (targetPet) {
            autoSaveToPetRecord(analysisResult, targetPet, asset.uri);
          } else if (pets.length === 0) {
            // No pets registered yet — prompt user
            setAutoSaveStatus('no_pets');
          }
        } catch (error) {
          console.error('Scan error:', error);
          alert("Failed to analyze image. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const autoSaveToPetRecord = async (analysis, pet, localUri) => {
    setAutoSaveStatus('saving');
    setAutoSavedPetName(pet.name);
    try {
      // Step 1: Save the record to Firestore immediately (no image yet)
      const logPayload = {
        petId: pet.id,
        petName: pet.name,
        petIcon: pet.icon || 'paw',
        breed: pet.breed || '',
        issue: analysis.suspectedCondition || 'Unspecified Condition',
        description: analysis.analysis || '',
        status: analysis.urgencyLevel || 'Needs Evaluation',
        recommendedAction: analysis.recommendedAction || '',
        clinic: 'AI Assessment',
        vet: 'Virtual Vet Assistant',
        imageUrl: null, // will be updated after upload
        autoRecorded: true,
        confidence: analysis.confidence || null,
        alternatives: analysis.alternatives || [],
      };

      const docRef = await addHealthLog(logPayload);
      setAutoSaveStatus('saved');
      // Store the health record ID so chatbot can link to this specific scan
      if (docRef?.id) setAutoSavedRecordId(docRef.id);

      // Step 2: Asynchronously upload image and update the record
      if (localUri && docRef?.id) {
        try {
          const cloudUrl = await uploadToCloudinary(localUri);
          if (cloudUrl) {
            await updateHealthLog(docRef.id, { imageUrl: cloudUrl });
          }
        } catch (imgErr) {
          // Image upload failed but record is already saved — not critical
          console.warn('Image upload failed after auto-save (record still saved):', imgErr);
        }
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
    }
  };


  const handleSaveToRecords = async (targetPet) => {
    const petToSave = targetPet || (pets.length > 0 ? pets[0] : null);
    if (!result || !petToSave) {
      setShowPetModal(true);
      return;
    }
    
    setSaving(true);
    try {
      // Save immediately without waiting for image upload
      const logPayload = {
        petId: petToSave.id,
        petName: petToSave.name,
        petIcon: petToSave.icon || 'paw',
        breed: petToSave.breed || '',
        issue: result.suspectedCondition || 'Unspecified Condition',
        description: result.analysis || '',
        status: result.urgencyLevel || 'Needs Evaluation',
        recommendedAction: result.recommendedAction || '',
        clinic: 'AI Assessment',
        vet: 'Virtual Vet Assistant',
        imageUrl: null,
        autoRecorded: false,
        confidence: result.confidence || null,
        alternatives: result.alternatives || [],
      };
      
      const docRef = await addHealthLog(logPayload);
      setAutoSavedPetName(petToSave.name);
      setAutoSaveStatus('saved');
      setShowPetModal(false);
      setShowSuccessModal(true);

      // Async image upload after save
      if (imageUri && docRef?.id) {
        try {
          const cloudUrl = await uploadToCloudinary(imageUri);
          if (cloudUrl) {
            await updateHealthLog(docRef.id, { imageUrl: cloudUrl });
          }
        } catch (imgErr) {
          console.warn('Image upload failed (record still saved):', imgErr);
        }
      }
    } catch (error) {
      console.error('Save to records error:', error);
      Alert.alert('Save Failed', 'Could not save the record. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };


  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'no concerns detected': return Colors.success;
      case 'immediate care': return Colors.danger;
      default: return Colors.warning;
    }
  };

  return (
    <View style={styles.safe}>
      {/* Full-screen AI scan animation */}
      <ScanLoadingModal visible={loading} />
      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="scan" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Pet Scan</Text>
          </View>
          <Text style={styles.headerSub}>
            Scan visible skin conditions, wounds or abnormalities with AI pet matching
          </Text>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* Preview Area */}
        <View style={styles.viewfinderWrapper}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.viewfinder} 
              activeOpacity={0.8} 
              onPress={() => handlePickImage(true)}
              disabled={loading}
            >
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <View style={styles.viewfinderCenter}>
                <View style={styles.cameraIconWrap}>
                  <Ionicons name="scan-outline" size={48} color="rgba(255,255,255,0.6)" />
                </View>
                <Text style={styles.viewfinderLabel}>No Image Selected</Text>
                <Text style={styles.viewfinderSub}>Tap here to take a photo</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Result Card */}
        {result && !loading && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="medical" size={20} color={Colors.primary} />
              <Text style={styles.resultTitle}>AI Assessment Complete</Text>
            </View>

            {/* Auto-Save Status Banner — driven by real Firestore save state */}
            {autoSaveStatus === 'saving' && (
              <View style={styles.autoSavingBanner}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchedLabel}>Saving to Medical History…</Text>
                  <Text style={styles.matchedPetName} numberOfLines={1}>
                    Recording for {autoSavedPetName || 'your pet'}
                  </Text>
                </View>
              </View>
            )}

            {autoSaveStatus === 'saved' && (
              <View style={styles.autoMatchedBanner}>
                <View style={styles.matchedLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchedLabel}>✓ Auto-Recorded to Medical History</Text>
                    <Text style={styles.matchedPetName} numberOfLines={1}>
                      Saved under {autoSavedPetName || 'your pet'} • Tap to view
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Pets')}
                  style={styles.changePetBtn}
                  activeOpacity={0.75}
                >
                  <Text style={styles.changePetText}>View</Text>
                </TouchableOpacity>
              </View>
            )}

            {autoSaveStatus === 'error' && (
              <TouchableOpacity
                onPress={() => setShowPetModal(true)}
                style={styles.unmatchedBanner}
              >
                <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                <Text style={styles.unmatchedText}>Auto-save failed — tap to assign pet manually</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            {autoSaveStatus === 'no_pets' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Pets')}
                style={styles.unmatchedBanner}
              >
                <Ionicons name="paw-outline" size={16} color={Colors.warning} />
                <Text style={styles.unmatchedText}>No pets registered — tap to add a pet first</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}


            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(result.urgencyLevel) }]}>
              <Text style={styles.urgencyText}>{result.urgencyLevel}</Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Suspected Condition</Text>
              <Text style={styles.resultValuePrimary}>
                {result.suspectedCondition}
                {result.confidence !== undefined && ` (${result.confidence}%)`}
              </Text>
            </View>

            {result.alternatives && result.alternatives.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Other Possibilities</Text>
                {result.alternatives.map((alt, idx) => (
                  <Text key={idx} style={styles.alternativeText}>
                    • {alt.condition} ({alt.confidence}%)
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Observations</Text>
              <Text style={styles.resultValue}>{result.analysis}</Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Recommended Action</Text>
              <Text style={styles.resultValue}>{result.recommendedAction}</Text>
            </View>

            <Text style={styles.disclaimerText}>
              Disclaimer: This is an AI assessment and not a substitute for professional veterinary care.
            </Text>

            <View style={{ gap: 10, marginTop: Spacing.md }}>
              {/* Urgent Case Warning */}
              {result.urgencyLevel && result.urgencyLevel.toLowerCase().includes('urgent') && (
                <TouchableOpacity
                  style={styles.urgentWarningBanner}
                  activeOpacity={0.85}
                  onPress={() => Alert.alert(
                    'Urgent Veterinary Attention Required',
                    'Your pet may need immediate professional care. We strongly recommend visiting a nearby vet clinic as soon as possible.',
                    [
                      { text: 'Find Nearby Clinics', onPress: () => navigation.navigate('Clinics') },
                      { text: 'Dismiss', style: 'cancel' },
                    ]
                  )}
                >
                  <Ionicons name="warning" size={18} color="#92400E" />
                  <Text style={styles.urgentWarningText}>
                    Urgent case detected. Tap to see options.
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#92400E" />
                </TouchableOpacity>
              )}

              {/* Primary Action: Ask Virtual Vet */}
              <TouchableOpacity
                style={styles.chatbotLinkBtn}
                onPress={() => navigation.navigate('Chatbot', {
                  initialContext: {
                    ...result,
                    petName: autoSavedPetName || result.matchedPetName || 'Pet',
                    matchedPetName: autoSavedPetName || result.matchedPetName || 'Pet',
                  },
                  // Pass the health record ID so the chatbot can link/resume the right session
                  scanRecordId: autoSavedRecordId || null,
                })}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.chatbotLinkText}>Ask Virtual Vet Chatbot</Text>
              </TouchableOpacity>

              {/* Secondary Action: Find Nearby Clinics */}
              <TouchableOpacity
                style={styles.resultClinicsBtn}
                onPress={() => navigation.navigate('Clinics')}
                activeOpacity={0.85}
              >
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
                <Text style={styles.resultClinicsBtnText}>Find Nearby Vet Clinics</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionBtnWrapper}
            activeOpacity={0.85}
            onPress={() => handlePickImage(true)}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1E3F66', Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanBtn}
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.scanBtnText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnWrapper, styles.galleryBtnWrapper]}
            activeOpacity={0.85}
            onPress={() => handlePickImage(false)}
            disabled={loading}
          >
            <View style={styles.galleryBtn}>
              <Ionicons name="images" size={22} color={Colors.primary} />
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Find Nearby Clinics Banner */}
        <TouchableOpacity
          style={styles.findClinicsBanner}
          onPress={() => navigation.navigate('Clinics')}
          activeOpacity={0.85}
        >
          <View style={styles.findClinicsBannerLeft}>
            <View style={styles.findClinicsIconCircle}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.findClinicsBannerTitle}>Need a Professional Vet?</Text>
              <Text style={styles.findClinicsBannerSub}>Find nearby veterinary clinics & directions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
            <Text style={styles.tipsTitle}>Scanning Tips</Text>
          </View>
          {SCAN_TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipIconWrap}>
                <Ionicons name={tip.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* Supported conditions */}
        <View style={styles.conditionsCard}>
          <Text style={styles.conditionsTitle}>Detectable Conditions</Text>
          <View style={styles.conditionsTags}>
            {[
              'Skin Rash', 'Hotspots', 'Mange', 'Ringworm',
              'Wounds', 'Lumps', 'Ear Issues', 'Eye Discharge',
            ].map((tag) => (
              <View key={tag} style={styles.conditionTag}>
                <Text style={styles.conditionTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Select Pet Modal */}
      <Modal visible={showPetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.petModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Pet</Text>
              <TouchableOpacity onPress={() => setShowPetModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Which pet does this scan belong to?</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg }}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={styles.petSelectCard}
                  activeOpacity={0.7}
                  onPress={() => handleSaveToRecords(pet)}
                >
                  <View style={[styles.petSelectLeft, { backgroundColor: pet.color }]}>
                    <Text style={{ fontSize: 24 }}>{pet.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.petSelectName}>{pet.name}</Text>
                    <Text style={styles.petSelectBreed}>{pet.breed}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Assessment Saved!</Text>
            <Text style={styles.successSub}>
              This scan has been successfully added to your pet's medical records.
            </Text>
            <TouchableOpacity
              style={styles.successPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('History');
              }}
            >
              <Text style={styles.successPrimaryBtnText}>View Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondaryBtn}
              activeOpacity={0.8}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successSecondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Saving Overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.savingText}>Saving assessment and uploading image...</Text>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },

  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 20,
  },

  // Viewfinder
  viewfinderWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  viewfinder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0D1B2A',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Shadows.lg,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primaryLight,
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  viewfinderCenter: {
    alignItems: 'center',
    gap: 8,
  },
  cameraIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  viewfinderLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  viewfinderSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginTop: -14,
    ...Shadows.sm,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Results
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(43,90,143,0.1)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  autoSavingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF2FB',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  autoMatchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    gap: 8,
  },
  matchedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  matchedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  matchedPetName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  changePetBtn: {
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  changePetText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  unmatchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unmatchedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  urgentWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  urgentWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  urgencyText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  resultSection: {
    marginBottom: Spacing.md,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  resultValuePrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  alternativeText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  chatbotLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    gap: 8,
    ...Shadows.sm,
  },
  chatbotLinkText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  viewRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  viewRecordText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  optionalClinicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginTop: 4,
  },
  optionalClinicText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBtnWrapper: {
    flex: 1,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  galleryBtnWrapper: {
    ...Shadows.sm,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  galleryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },

  // Tips
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Conditions
  conditionsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  conditionsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  conditionsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(43,90,143,0.2)',
  },
  conditionTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  petModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSub: {
    paddingHorizontal: Spacing.lg,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  petSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  petSelectLeft: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  petSelectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  petSelectBreed: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: Colors.card,
    width: '85%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  successIconWrap: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  successPrimaryBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  successPrimaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successSecondaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  successSecondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  savingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  resultClinicsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    gap: 8,
    marginTop: 4,
  },
  resultClinicsBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  findClinicsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    ...Shadows.sm,
  },
  findClinicsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  findClinicsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findClinicsBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  findClinicsBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

// ─── Scan Loading Modal Styles ──────────────────────────────────────────────
// Follows Anti-Generic UI policy v2.0:
//   Rule 1: No nested same-surface cards
//   Rule 2: All borders are visibly darker than their backgrounds
//   Rule 3: No emoji — Ionicons throughout
//   Rule 5: 60-30-10 — dark overlay (60%), tinted badge surface (30%), accent blue (10%)
const SCAN_CORNER = 20; // corner bracket px
const SCAN_THICK  = 3;  // corner bracket stroke

const scanModal = StyleSheet.create({
  // 60% — dark translucent canvas
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 28, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },

  // 30% — tinted ring surface.
  // bg: rgba(99,179,237,0.12)  →  border: rgba(99,179,237,0.55)
  // Delta ~43% — clearly visible edge (Rule 2 satisfied)
  iconRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(99,179,237,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(99,179,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scan viewfinder frame — NOT a card, no background fill
  // Pure corner-bracket instrument (Rule 1: fundamentally different content type)
  scanBox: {
    width: 200,
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: SCAN_CORNER,
    height: SCAN_CORNER,
    borderColor: '#63B3ED',  // 10% accent — only element at full saturation
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: SCAN_THICK,
    borderLeftWidth: SCAN_THICK,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: SCAN_THICK,
    borderRightWidth: SCAN_THICK,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: SCAN_THICK,
    borderLeftWidth: SCAN_THICK,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: SCAN_THICK,
    borderRightWidth: SCAN_THICK,
    borderBottomRightRadius: 4,
  },

  // 10% accent — the sweep line is the single high-saturation element
  scanLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: '#63B3ED',
    // Soft glow — kept subtle (Rule 8: not rgba(0,0,0,0.4) style heavy)
    shadowColor: '#63B3ED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },

  // Overline label inside scan frame — letterSpaced caps, muted accent tint
  scanBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(99,179,237,0.55)',
    letterSpacing: 5,
  },

  // Step row: icon badge + label side by side — single-surface, not nested cards
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Rule 1: stepIconBadge is a pill, not a card — its content type (icon badge)
  // is distinct from the overlay surface (fullscreen dark canvas)
  // Rule 2: bg rgba(99,179,237,0.15) vs border rgba(99,179,237,0.45) — clear contrast
  stepIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99,179,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.90)',
    letterSpacing: 0.2,
  },

  // Progress dots — neutral resting, accent active (10% rule)
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    backgroundColor: '#63B3ED',  // full accent — only active dot
    width: 18,
    borderRadius: 3,
  },

  // Muted helper text — not em-dash, no ellipsis punctuation
  disclaimer: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 0.1,
  },
});

