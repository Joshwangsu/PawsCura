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
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { analyzePetCondition } from '../services/gemini';
import {
  VALIDATION_STATUS,
  verifyRegisteredPetSpecies,
} from '../utils/petImageValidation';
import { checkInternetConnectivity, classifyException, getErrorMessage } from '../utils/network';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { showAlert } from '../components/CustomAlert';
import { useHealth } from '../context/HealthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAds } from '../services/ads';
import { AdRichCard } from '../components/AdRich';
import { getPetPhotoUri } from '../components/PetCard';

const SCAN_MIN_SECONDS = 2;

const SCAN_TIPS = [
  { icon: 'sunny-outline', text: 'Good lighting helps get a clear scan' },
  { icon: 'scan-circle-outline', text: 'Center the affected area in the frame' },
  { icon: 'camera-outline', text: 'Hold steady · avoid blur for best results' },
  { icon: 'leaf-outline', text: 'Clean the area gently before scanning' },
];

const ANALYSIS_STEPS = [
  { icon: 'cloud-upload-outline',    label: 'Uploading image' },
  { icon: 'hardware-chip-outline',   label: 'Running AI analysis' },
  { icon: 'paw-outline',             label: 'Matching your pet' },
  { icon: 'document-text-outline',   label: 'Generating report' },
];

const MODAL_ACCENT = '#D88D59';
const MODAL_ACCENT_DIM = 'rgba(216,141,89,0.18)';

function ScanLoadingModal({ visible, ads = [] }) {
  const insets = useSafeAreaInsets();
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SCAN_MIN_SECONDS);
  const [shownAd, setShownAd] = useState(null);

  useEffect(() => {
    if (!visible) return;

    fadeAnim.setValue(0);
    setStepIndex(0);
    setSecondsLeft(SCAN_MIN_SECONDS);
    setShownAd(ads.length ? ads[Math.floor(Math.random() * ads.length)] : null);
    const countdown = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

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

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1400);

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [visible]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const step = ANALYSIS_STEPS[stepIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" translucent />
      <Animated.View
        style={[
          scanModal.overlay,
          {
            opacity: fadeAnim,
            paddingTop: Math.max(insets.top + 28, 70),
            paddingBottom: Math.max(insets.bottom + 20, 32),
          },
        ]}
      >
        <View style={scanModal.iconRingOuter}>
          <Animated.View style={[scanModal.iconRing, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="paw" size={38} color={MODAL_ACCENT} />
          </Animated.View>
        </View>

        <View style={scanModal.scanBox}>
          <View style={[scanModal.corner, scanModal.cornerTL]} />
          <View style={[scanModal.corner, scanModal.cornerTR]} />
          <View style={[scanModal.corner, scanModal.cornerBL]} />
          <View style={[scanModal.corner, scanModal.cornerBR]} />

          <Animated.View
            style={[scanModal.scanLine, { transform: [{ translateY }] }]}
          />

          <Text style={scanModal.scanBoxLabel}>SCANNING</Text>
        </View>

        <View style={scanModal.stepRow}>
          <View style={scanModal.stepIconBadge}>
            <Ionicons name={step.icon} size={15} color={MODAL_ACCENT} />
          </View>
          <Text style={scanModal.stepLabel}>{step.label}</Text>
        </View>

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

        <Text style={scanModal.disclaimer}>
          {secondsLeft > 0 ? `Your results will be ready in ${secondsLeft}s` : 'Almost done...'}
        </Text>

        {shownAd && (
          <View style={scanModal.adWrapper}>
            <AdRichCard ad={shownAd} imageHeight={130} style={{ marginVertical: 4 }} />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);
  const { pets, healthLogs, addHealthLog, updateHealthLog } = useHealth();
  const { isPremium, scanUsage, incrementScanCount } = useSubscription();
  const navigation = useNavigation();
  const { topBanners, bottomBanners, richInline } = useAds('scan');
  const scanAds = [...richInline, ...topBanners, ...bottomBanners];
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [uploadedCloudUrl, setUploadedCloudUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [autoSavedPetName, setAutoSavedPetName] = useState(null);
  const [autoSavedRecordId, setAutoSavedRecordId] = useState(null);
  const scrollViewRef = useRef(null);
  const isPickingRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: (loading || saving) ? 'none' : 'flex' },
    });
  }, [loading, saving, navigation]);

  useEffect(() => {
    if (result && !loading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
      }, 300);
    }
  }, [result, loading]);

  const uploadToCloudinary = async (uri, base64Override = null) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary config missing. Check EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
      return null;
    }

    try {
      const mimeType = uri && uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64Data =
        base64Override ||
        imageBase64 ||
        (await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        }));

      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const body = new FormData();
      body.append('file', dataUri);
      body.append('upload_preset', uploadPreset);
      body.append('cloud_name', cloudName);

      const controller = new AbortController();
      const uploadTimer = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body,
            // Do NOT set Content-Type — let fetch set it with the correct boundary
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(uploadTimer);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary rejected the upload: ${errText}`);
      }

      const json = await response.json();
      const secureUrl = json.secure_url ?? null;
      if (secureUrl) setUploadedCloudUrl(secureUrl);
      return secureUrl;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const getRejectionTitle = (validationStatus) => {
    switch (validationStatus) {
      case VALIDATION_STATUS.SPECIES_MISMATCH:
        return 'Pet Species Mismatch';
      case VALIDATION_STATUS.MULTIPLE_ANIMALS:
        return 'Multiple Animals Detected';
      case VALIDATION_STATUS.UNCLEAR_OR_OBSTRUCTED:
        return 'Unclear or Obstructed Photo';
      case VALIDATION_STATUS.NO_ANIMAL:
        return 'No Dog or Cat Detected';
      case VALIDATION_STATUS.VALIDATION_FAILED:
        return 'Image Validation Unavailable';
      case VALIDATION_STATUS.INVALID_IMAGE:
      default:
        return 'Invalid Image';
    }
  };

  const runAssessmentForImage = async (
    uri,
    base64Input,
    mimeType,
    { forceRevalidate = false } = {}
  ) => {
    setUploadedCloudUrl(null);
    setResult(null);
    setAutoSaveStatus(null);
    setAutoSavedPetName(null);
    setAutoSavedRecordId(null);
    setLoading(true);
    const startedAt = Date.now();

    try {
      const resolvedBase64 =
        base64Input ||
        (uri
          ? await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }).catch(() => null)
          : null);

      const analysisResult = await analyzePetCondition(
        resolvedBase64,
        mimeType,
        pets,
        uri,
        { forceRevalidate }
      );

      if (
        analysisResult?.isValidPet === false ||
        analysisResult?.status === 'invalid_image' ||
        analysisResult?.status === 'species_mismatch' ||
        analysisResult?.status === 'validation_failed'
      ) {
        if (analysisResult.canRetry && resolvedBase64) {
          setImageBase64(resolvedBase64);
        } else {
          setImageBase64(null);
        }
        setUploadedCloudUrl(null);
        setAutoSaveStatus(null);
        setAutoSavedPetName(null);
        setAutoSavedRecordId(null);
        setResult({
          ...analysisResult,
          isInvalidPetImage: true,
          suspectedCondition: getRejectionTitle(analysisResult.validationStatus),
          urgencyLevel: analysisResult.validationStatus || 'Invalid Image',
          analysis:
            analysisResult.validationReason ||
            'Please upload a clear photo showing a single dog or cat matching your registered pets.',
        });
        setLoading(false);
        return;
      }

      const uploadPromise = uploadToCloudinary(uri, resolvedBase64).catch((err) => {
        console.warn('Cloudinary upload warning:', err);
        return null;
      });

      const remaining = SCAN_MIN_SECONDS * 1000 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      setResult(analysisResult);
      Promise.resolve(incrementScanCount()).catch((e) => console.warn('Scan count update skipped:', e?.message));

      const matchedPet =
        (analysisResult.matchedPetId && pets.find((p) => p.id === analysisResult.matchedPetId)) ||
        (pets.length > 0 ? pets[0] : null);

      if (matchedPet) {
        autoSaveToPetRecord(analysisResult, matchedPet, uri, resolvedBase64, uploadPromise);
      } else if (pets.length === 0) {
        setAutoSaveStatus('no_pets');
      }
    } catch (error) {
      console.error('Scan error:', error);
      const isOnline = await checkInternetConnectivity(2000).catch(() => null);
      const classified = classifyException(error, { isOnline });
      showAlert({
        title: 'Analysis Failed',
        message: getErrorMessage(classified.code, 'action'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    // Re-entrancy guard against rapid double-taps
    if (loading || isPickingRef.current) return;
    isPickingRef.current = true;

    try {
      if (!isPremium && scanUsage.count >= 1) {
        navigation.navigate('Paywall');
        return;
      }

      const options = {
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.9,
        base64: true,
      };

      let pickerResult;
      if (useCamera) {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (camPerm.status !== 'granted') {
          showAlert({
            title: 'Permission Required',
            message: 'Please enable camera access in your device settings to scan your pet.',
            type: 'warning',
          });
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync(options);
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libPerm.status !== 'granted') {
          showAlert({
            title: 'Permission Required',
            message: 'Please enable photo library access in your device settings to upload a photo.',
            type: 'warning',
          });
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        const mimeType = asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        setImageUri(asset.uri);
        setImageMimeType(mimeType);
        setImageBase64(asset.base64 || null);

        await runAssessmentForImage(asset.uri, asset.base64 || null, mimeType, {
          forceRevalidate: false,
        });
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    } finally {
      isPickingRef.current = false;
    }
  };

  const buildDetectedAnomaliesList = (scanResult, normalizedAlternatives) => {
    if (!scanResult || String(scanResult.urgencyLevel || '').toLowerCase() === 'safe') {
      return [];
    }
    const items = [];
    const seen = new Set();
    const pushItem = (name, confidence = null) => {
      const cleanName = String(name || '').trim();
      if (!cleanName || cleanName === 'No Visible Anomaly Detected') return;
      const key = cleanName.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        id: `da_${Date.now()}_${items.length}`,
        name: cleanName,
        condition: cleanName,
        confidence,
      });
    };

    if (scanResult.suspectedCondition) {
      pushItem(scanResult.suspectedCondition, scanResult.confidence ?? null);
    }
    (normalizedAlternatives || []).forEach((alt) => {
      pushItem(alt.name || alt.condition, alt.confidence ?? null);
    });
    (scanResult.detectedSymptoms || []).forEach((sym) => {
      const label = typeof sym === 'string' ? sym : sym?.class_name;
      if (label) pushItem(label, null);
    });
    return items;
  };

  const autoSaveToPetRecord = async (analysis, pet, localUri, base64Data = null, existingUploadPromise = null) => {
    setAutoSaveStatus('saving');
    setAutoSavedPetName(pet.name);
    try {
      const normalizedAlternatives = (analysis.alternatives || []).map((alt, idx) => ({
        id: `da_${Date.now()}_${idx}`,
        name: alt.condition || alt.name || 'Unspecified Anomaly',
        condition: alt.condition || alt.name || 'Unspecified Anomaly',
        confidence: alt.confidence ?? null,
      }));
      const detectedAnomaliesList = buildDetectedAnomaliesList(analysis, normalizedAlternatives);
      const logPayload = {
        petId: pet.id,
        petName: pet.name,
        petIcon: pet.icon || 'paw',
        breed: pet.breed || '',
        issue: analysis.suspectedCondition || 'Unspecified Condition',
        description: analysis.analysis || '',
        status: analysis.urgencyLevel || 'Moderate',
        severity: analysis.urgencyLevel || 'Moderate',
        recommendedAction: analysis.recommendedAction || '',
        clinic: 'AI Assessment',
        vet: 'Virtual Vet Assistant',
        imageUrl: uploadedCloudUrl || null,
        autoRecorded: true,
        confidence: analysis.confidence || null,
        alternatives: normalizedAlternatives,
        detectedAnomalies: detectedAnomaliesList,
      };

      const docRef = await addHealthLog(logPayload);
      setAutoSaveStatus('saved');
      if (docRef?.id) setAutoSavedRecordId(docRef.id);

      if (localUri && docRef?.id) {
        try {
          const cloudUrl =
            (existingUploadPromise ? await existingUploadPromise : null) ||
            (await uploadToCloudinary(localUri, base64Data));
          if (cloudUrl) {
            await updateHealthLog(docRef.id, { imageUrl: cloudUrl });
          }
        } catch (imgErr) {
          console.warn('Image upload failed after auto-save (record still saved):', imgErr);
        }
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
    } finally {
      setImageBase64(null);
    }
  };

  const handleSaveToRecords = async (targetPet) => {
    const petToSave =
      targetPet ||
      (result?.matchedPetId && pets.find((p) => p.id === result.matchedPetId)) ||
      (pets.length > 0 ? pets[0] : null);
    if (!result || result.isInvalidPetImage || !petToSave) {
      setShowPetModal(true);
      return;
    }

    if (result.validation) {
      const speciesCheck = verifyRegisteredPetSpecies(result.validation, petToSave);
      if (!speciesCheck.matched) {
        showAlert({
          title: 'Pet Species Mismatch',
          message: speciesCheck.reason,
          type: 'warning',
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      const normalizedAlternatives = (result.alternatives || []).map((alt, idx) => ({
        id: `da_${Date.now()}_${idx}`,
        name: alt.condition || alt.name || 'Unspecified Anomaly',
        condition: alt.condition || alt.name || 'Unspecified Anomaly',
        confidence: alt.confidence ?? null,
      }));
      const detectedAnomaliesList = buildDetectedAnomaliesList(result, normalizedAlternatives);
      const logPayload = {
        petId: petToSave.id,
        petName: petToSave.name,
        petIcon: petToSave.icon || 'paw',
        breed: petToSave.breed || '',
        issue: result.suspectedCondition || 'Unspecified Condition',
        description: result.analysis || '',
        status: result.urgencyLevel || 'Moderate',
        severity: result.urgencyLevel || 'Moderate',
        recommendedAction: result.recommendedAction || '',
        clinic: 'AI Assessment',
        vet: 'Virtual Vet Assistant',
        imageUrl: uploadedCloudUrl || null,
        autoRecorded: false,
        confidence: result.confidence || null,
        alternatives: normalizedAlternatives,
        detectedAnomalies: detectedAnomaliesList,
      };
      
      const docRef = await addHealthLog(logPayload);
      setAutoSavedPetName(petToSave.name);
      setAutoSaveStatus('saved');
      setShowPetModal(false);
      setShowSuccessModal(true);

      if (!uploadedCloudUrl && imageUri && docRef?.id) {
        try {
          const cloudUrl = await uploadToCloudinary(imageUri, imageBase64);
          if (cloudUrl) {
            await updateHealthLog(docRef.id, { imageUrl: cloudUrl });
          }
        } catch (imgErr) {
          console.warn('Image upload failed (record still saved):', imgErr);
        }
      }
    } catch (error) {
      console.error('Save to records error:', error);
      const isOnline = await checkInternetConnectivity(2000).catch(() => null);
      const classified = classifyException(error, { isOnline });
      showAlert({
        title: 'Save Failed',
        message: getErrorMessage(classified.code, 'action'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()?.trim()) {
      case 'safe':
      case 'no concerns detected':
        return Colors.success;
      case 'mild':
        return '#0EA5E9';
      case 'moderate':
      case 'needs evaluation':
        return '#F59E0B';
      case 'urgent':
      case 'immediate care':
        return Colors.danger;
      default:
        return Colors.warning;
    }
  };

  return (
    <View style={styles.safe}>
      <ScanLoadingModal visible={loading} ads={scanAds} />
      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topInset + Spacing.md }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="scan" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Pet Scan</Text>
          </View>
          <Text style={styles.headerSub}>
            Scan visible skin, eye, or oral anomalies for your registered pet
          </Text>
        </LinearGradient>

        <View style={styles.bodyContent}>
        <View style={styles.viewfinderWrapper}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: (result && result.annotatedImage) ? result.annotatedImage : imageUri }} style={styles.imagePreview} />
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

        {result && !loading && result.isInvalidPetImage && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={
                  result.validationStatus === VALIDATION_STATUS.VALIDATION_FAILED
                    ? 'cloud-offline-outline'
                    : 'alert-circle'
                }
                size={20}
                color={
                  result.validationStatus === VALIDATION_STATUS.SPECIES_MISMATCH
                    ? Colors.danger
                    : Colors.warning
                }
              />
              <Text style={styles.resultTitle}>
                {result.suspectedCondition || getRejectionTitle(result.validationStatus)}
              </Text>
            </View>
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Reason</Text>
              <Text style={styles.resultValue}>{result.analysis}</Text>
            </View>

            {result.canRetry && imageUri && (
              <TouchableOpacity
                style={styles.retryValidationBtn}
                activeOpacity={0.85}
                onPress={() =>
                  runAssessmentForImage(imageUri, imageBase64, imageMimeType, {
                    forceRevalidate: true,
                  })
                }
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.retryValidationBtnText}>Retry Validation</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.disclaimerText}>
              This image did not pass validation, was not sent to local AI disease analysis, was not saved to assessment history, and did not use your daily scan limit.
            </Text>
          </View>
        )}

        {result && !loading && !result.isInvalidPetImage && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="medical" size={20} color={Colors.primary} />
              <Text style={styles.resultTitle}>AI Assessment Complete</Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Suspected Anomaly</Text>
              <Text style={styles.resultValuePrimary}>
                {result.suspectedCondition}
                {result.confidence !== undefined && ` (${result.confidence}%)`}
              </Text>
            </View>

            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(result.urgencyLevel) }]}>
              <Text style={styles.urgencyText}>
                {result.urgencyLevel}
                {result.severityLevel && result.severityScore ? ` • Severity: ${result.severityLevel} (${result.severityScore}%)` : ''}
              </Text>
            </View>

            {result.urgencyLevel && result.urgencyLevel.toLowerCase().includes('urgent') && (
              <View style={styles.urgentWarningBanner}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <Text style={styles.urgentWarningText}>Urgent Case Detected</Text>
              </View>
            )}

            {Array.isArray(result.detectedSymptoms) && result.detectedSymptoms.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Symptoms</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {result.detectedSymptoms.map((sym, idx) => (
                    <View key={idx} style={styles.conditionTag}>
                      <Text style={styles.conditionTagText}>{typeof sym === 'string' ? sym : sym.class_name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {result.alternatives && result.alternatives.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Other Possible Anomalies</Text>
                {result.alternatives.map((alt, idx) => (
                  <Text key={idx} style={styles.alternativeText}>
                    • {alt.condition} ({alt.confidence}%)
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Description</Text>
              <Text style={styles.resultValue}>{result.analysis}</Text>
            </View>

            <Text style={styles.disclaimerText}>
              Disclaimer: This is an AI assessment and not a substitute for professional veterinary care.
            </Text>

            <View style={{ gap: 10, marginTop: Spacing.md }}>
              <TouchableOpacity
                style={styles.chatbotLinkBtn}
                onPress={() => navigation.navigate('Chatbot', {
                  initialContext: {
                    ...result,
                    petName: autoSavedPetName || result.matchedPetName || 'Pet',
                    matchedPetName: autoSavedPetName || result.matchedPetName || 'Pet',
                  },
                  scanRecordId: autoSavedRecordId || null,
                })}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.chatbotLinkText}>Ask Virtual Vet Chatbot</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resultClinicsBtn}
                onPress={() => navigation.navigate('Clinics')}
                activeOpacity={0.85}
              >
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
                <Text style={styles.resultClinicsBtnText}>Find Nearby Vet Clinics</Text>
              </TouchableOpacity>
            </View>

            {autoSaveStatus === 'saving' && (
              <View style={[styles.autoSavingBanner, { marginTop: 14, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1, marginBottom: 0 }]}>
                <ActivityIndicator size="small" color="#64748B" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.matchedLabel, { color: '#64748B' }]}>Saving to Medical History…</Text>
                  <Text style={[styles.matchedPetName, { color: '#475569' }]} numberOfLines={1}>
                    Recording for {autoSavedPetName || 'your pet'}
                  </Text>
                </View>
              </View>
            )}

            {autoSaveStatus === 'saved' && (
              <View style={[styles.autoMatchedBanner, { marginTop: 14, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1, marginBottom: 0 }]}>
                <View style={styles.matchedLeft}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.matchedLabel, { color: '#475569', fontWeight: '700' }]}>Auto-Recorded to Medical History</Text>
                    <Text style={[styles.matchedPetName, { color: '#64748B' }]} numberOfLines={1}>
                      Saved under {autoSavedPetName || 'your pet'}
                      {result?.speciesVerified ? ` (${result.validatedSpecies} verified)` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Pets')}
                  style={[styles.changePetBtn, { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.changePetText, { color: '#334155' }]}>View</Text>
                </TouchableOpacity>
              </View>
            )}

            {autoSaveStatus === 'error' && (
              <TouchableOpacity
                onPress={() => setShowPetModal(true)}
                style={[styles.unmatchedBanner, { marginTop: 14, marginBottom: 0 }]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                <Text style={styles.unmatchedText}>Auto-save failed — tap to assign pet manually</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            {autoSaveStatus === 'no_pets' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Pets')}
                style={[styles.unmatchedBanner, { marginTop: 14, marginBottom: 0 }]}
              >
                <Ionicons name="paw-outline" size={16} color={Colors.warning} />
                <Text style={styles.unmatchedText}>No pets registered — tap to add a pet first</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionBtnWrapper}
            activeOpacity={0.85}
            onPress={() => handlePickImage(true)}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.primaryDark, Colors.primary]}
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
        </View>
      </ScrollView>

      <Modal visible={showPetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.petModal, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
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
                  <View style={[styles.petSelectLeft, { backgroundColor: pet.color || Colors.primaryBg, overflow: 'hidden' }]}>
                    {getPetPhotoUri(pet) ? (
                      <Image source={{ uri: getPetPhotoUri(pet) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : pet.emoji ? (
                      <Text style={{ fontSize: 24 }}>{pet.emoji}</Text>
                    ) : (
                      <Ionicons name={pet.icon || 'paw'} size={22} color={pet.accentColor || Colors.primary} />
                    )}
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
                navigation.navigate('Records');
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
    paddingBottom: 130,
  },
  retryValidationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  retryValidationBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

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
    backgroundColor: '#F3D9BF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#D88D59',
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
    backgroundColor: '#F3D9BF',
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

const SCAN_CORNER = 16;
const SCAN_THICK  = 2.5;

const scanModal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(48, 43, 41, 0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 10,
  },

  iconRingOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(216, 141, 89, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(216, 141, 89, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(216, 141, 89, 0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D88D59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  scanBox: {
    width: 140,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: SCAN_CORNER,
    height: SCAN_CORNER,
    borderColor: '#D88D59',
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

  scanLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: '#D88D59',
    shadowColor: '#D88D59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },

  scanBoxLabel: {
    position: 'absolute',
    bottom: 4,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(243,217,191,0.75)',
    letterSpacing: 3,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  stepIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(216,141,89,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(216,141,89,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF8F1',
    letterSpacing: 0.2,
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(243,217,191,0.22)',
  },
  dotActive: {
    backgroundColor: '#D88D59',
    width: 16,
    borderRadius: 3,
  },

  disclaimer: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.1,
  },

  adWrapper: {
    width: '100%',
    marginTop: 2,
  },
});

