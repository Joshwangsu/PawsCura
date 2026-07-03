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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
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

export default function ScanScreen() {
  const { pets, addHealthLog } = useHealth();
  const { isPremium, scanUsage, incrementScanCount } = useSubscription();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (result && !loading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
      }, 300);
    }
  }, [result, loading]);

  const handlePickImage = async (useCamera = false) => {
    try {
      if (!isPremium && scanUsage.count >= 2) {
        navigation.navigate('Paywall');
        return;
      }

      let permissionResult;
      
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.granted === false) {
        alert("Permission to access camera/gallery is required!");
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
        
        // Convert to proper mime type and analyze
        const mimeType = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        setLoading(true);
        try {
          const analysisResult = await analyzePetCondition(asset.base64, mimeType);
          setResult(analysisResult);
          incrementScanCount();
        } catch (error) {
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

  const handleSaveToRecords = (pet) => {
    if (!result) return;
    
    // Create new health log object matching the mock schema
    const newLog = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      petName: pet.name,
      petEmoji: pet.emoji,
      breed: pet.breed,
      issue: result.suspectedCondition,
      description: result.analysis,
      status: result.urgencyLevel,
      clinic: 'AI Assessment',
      vet: 'Virtual Vet Assistant'
    };
    
    addHealthLog(newLog);
    setShowPetModal(false);
    setShowSuccessModal(true);
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
            Scan visible skin conditions, wounds or abnormalities
          </Text>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* Preview Area */}
        <View style={styles.viewfinderWrapper}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>AI Veterinarian Analyzing...</Text>
                </View>
              )}
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
            
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(result.urgencyLevel) }]}>
              <Text style={styles.urgencyText}>{result.urgencyLevel}</Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Suspected Condition</Text>
              <Text style={styles.resultValuePrimary}>{result.suspectedCondition}</Text>
            </View>

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

            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md }}>
              <TouchableOpacity 
                style={[styles.chatbotLinkBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => navigation.navigate('Chatbot', { initialContext: result })}
              >
                <Ionicons name="chatbubbles" size={18} color="#fff" />
                <Text style={styles.chatbotLinkText}>Ask Virtual Vet</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.chatbotLinkBtn, { flex: 1, marginTop: 0, backgroundColor: Colors.success }]}
                onPress={() => setShowPetModal(true)}
              >
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.chatbotLinkText}>Save to Record</Text>
              </TouchableOpacity>
            </View>

            {result.urgencyLevel !== 'No Concerns Detected' && (
              <TouchableOpacity 
                style={[styles.chatbotLinkBtn, { marginTop: Spacing.sm, backgroundColor: Colors.danger }]}
                onPress={() => navigation.navigate('Clinics')}
              >
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.chatbotLinkText}>Find Nearby Clinics</Text>
              </TouchableOpacity>
            )}
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
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: 8,
    ...Shadows.sm,
  },
  chatbotLinkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
    overflow: 'hidden',
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
});
