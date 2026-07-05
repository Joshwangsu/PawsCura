import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc, collection, addDoc, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const FEATURES_PREMIUM = [
  'Unlimited AI Diagnostic Scans',
  'Unlimited Vet Assistant Chat History',
  'Advanced Clinic Maps Routing',
];

const FEATURES_FREE = [
  '1 Daily AI Diagnostic Scan',
  'Standard Chat (No History Saved)',
  'Basic Map Location View',
];

export default function PaywallScreen({ navigation }) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState('upgrade'); // 'upgrade' | 'downgrade'

  // Payment Form States
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});

  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += cleaned[i];
    }
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 4; i++) {
      if (i === 2) formatted += '/';
      formatted += cleaned[i];
    }
    setExpiry(formatted);
  };

  const handleSelectPlan = async (plan) => {
    if (plan === 'premium') {
      if (isPremium) {
        alert('You are already subscribed to the Premium Plan!');
        return;
      }
      setSelectedPlan('premium');
      setShowCheckout(true);
    } else {
      // Free plan selected
      if (!isPremium) {
        alert('You are already on the Free Plan.');
        return;
      }
      // Trigger Downgrade
      setLoading(true);
      try {
        // 1. Cancel the active subscription in subscriptions collection
        const qSub = query(
          collection(db, 'subscriptions'),
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
          limit(1)
        );
        const subSnapshot = await getDocs(qSub);
        let activeSubId = 'unknown_subscription';

        if (!subSnapshot.empty) {
          const activeSubDoc = subSnapshot.docs[0];
          activeSubId = activeSubDoc.id;
          await updateDoc(activeSubDoc.ref, {
            status: 'cancelled',
            endDate: serverTimestamp() // Expire immediately
          });
        }

        // 2. Create a Payment cancellation log
        await addDoc(collection(db, 'payments'), {
          userId: user.uid,
          subscriptionId: activeSubId,
          amount: 0,
          status: 'Cancelled',
          method: 'Card',
          date: serverTimestamp(),
          // Compatibility with existing Admin panel analytics
          userEmail: user.email || 'unknown@gmail.com',
          planName: 'Free',
          cardholderName: 'N/A'
        });

        // 3. Update User Document Cache
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { isPremium: false });
        
        setSuccessType('downgrade');
        setShowSuccess(true);
      } catch (err) {
        console.error('Downgrade error:', err);
        alert('Failed to change subscription plan. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!cardName.trim()) errs.cardName = 'Name is required';
    if (cardNumber.replace(/-/g, '').length < 16) errs.cardNumber = 'Enter a valid 16-digit card number';
    if (expiry.length < 5) errs.expiry = 'Enter expiry date (MM/YY)';
    if (cvv.length < 3) errs.cvv = 'Enter 3-digit CVV';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessPayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Simulate bank verification delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 1. Create a Subscription
      const subStartDate = new Date();
      const subEndDate = new Date();
      subEndDate.setDate(subStartDate.getDate() + 30); // 30-day billing cycle

      const subDocRef = await addDoc(collection(db, 'subscriptions'), {
        userId: user.uid,
        status: 'active',
        planType: 'premium',
        startDate: serverTimestamp(),
        endDate: subEndDate
      });

      // 2. Create a Payment (equivalent to transaction log)
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        subscriptionId: subDocRef.id,
        amount: 9.99,
        status: 'Success',
        method: 'Card',
        date: serverTimestamp(),
        // Keep these fields for backward compatibility with existing Admin panel analytics
        userEmail: user.email || 'unknown@gmail.com',
        planName: 'Premium',
        cardholderName: cardName
      });

      // 3. Update User Document Cache
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { isPremium: true });

      setSuccessType('upgrade');
      setShowCheckout(false);
      setShowSuccess(true);

      // Clear inputs
      setCardName('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setErrors({});
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Transaction failed. Please check card info and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, '#0f2b4d']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.iconWrapper}>
              <Ionicons name="diamond" size={44} color={Colors.warning} />
            </View>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>Unlock advanced diagnostics and full clinical search tools.</Text>
          </View>

          {/* Plan Options Grid */}
          <View style={styles.plansContainer}>
            {/* Free Card */}
            <TouchableOpacity 
              style={[
                styles.planCard, 
                !isPremium && styles.activePlanBorder
              ]}
              activeOpacity={0.8}
              onPress={() => handleSelectPlan('free')}
            >
              {!isPremium && <View style={styles.planBadge}><Text style={styles.planBadgeText}>CURRENT</Text></View>}
              <Text style={styles.planTitle}>Free Plan</Text>
              <Text style={styles.planPrice}>$0<Text style={styles.planInterval}>/mo</Text></Text>
              
              <View style={styles.divider} />
              
              <View style={styles.featList}>
                {FEATURES_FREE.map((f, i) => (
                  <View key={i} style={styles.featRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.textSecondary} />
                    <Text style={styles.featText}>{f}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={[styles.selectBtn, !isPremium && styles.selectBtnDisabled]}
                onPress={() => handleSelectPlan('free')}
                disabled={!isPremium || loading}
              >
                {loading && selectedPlan === 'free' ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={[styles.selectBtnText, !isPremium && styles.selectBtnTextDisabled]}>
                    {!isPremium ? 'Active Plan' : 'Downgrade to Free'}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Premium Card */}
            <TouchableOpacity 
              style={[
                styles.planCard, 
                styles.premiumCard,
                isPremium && styles.activePlanBorder
              ]}
              activeOpacity={0.8}
              onPress={() => handleSelectPlan('premium')}
            >
              <View style={[styles.planBadge, styles.premiumBadge]}>
                <Text style={[styles.planBadgeText, styles.premiumBadgeText]}>
                  {isPremium ? 'ACTIVE' : 'BEST VALUE'}
                </Text>
              </View>
              
              <Text style={[styles.planTitle, styles.whiteText]}>Premium Plan</Text>
              <Text style={[styles.planPrice, styles.whiteText]}>$9.99<Text style={styles.planIntervalWhite}>/mo</Text></Text>
              
              <View style={styles.dividerWhite} />
              
              <View style={styles.featList}>
                {FEATURES_PREMIUM.map((f, i) => (
                  <View key={i} style={styles.featRow}>
                    <Ionicons name="sparkles" size={15} color={Colors.warning} />
                    <Text style={[styles.featText, styles.whiteText]}>{f}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={[styles.selectBtn, styles.premiumSelectBtn, isPremium && styles.selectBtnDisabled]}
                onPress={() => handleSelectPlan('premium')}
                disabled={isPremium || loading}
              >
                <Text style={[styles.selectBtnText, styles.premiumSelectBtnText, isPremium && styles.selectBtnTextDisabled]}>
                  {isPremium ? 'Active Plan' : 'Upgrade Now'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 💳 SIMULATED CHECKOUT MODAL */}
      <Modal visible={showCheckout} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.checkoutSheet}>
            <View style={styles.checkoutHeader}>
              <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={20} color={Colors.success} />
                <Text style={styles.checkoutTitle}>Secure Checkout</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCheckout(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.checkoutForm}>
              {/* Order Summary */}
              <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Subscription Plan:</Text>
                <Text style={styles.summaryValue}>Premium Membership</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.summaryLabel}>Amount Due:</Text>
                  <Text style={styles.summaryPrice}>$9.99/mo</Text>
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={[styles.inputField, errors.cardName && styles.inputFieldError]}
                  placeholder="John Doe"
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                />
                {errors.cardName && <Text style={styles.errorLabel}>{errors.cardName}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={[styles.inputField, errors.cardNumber && styles.inputFieldError]}
                  placeholder="4111-2222-3333-4444"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                />
                {errors.cardNumber && <Text style={styles.errorLabel}>{errors.cardNumber}</Text>}
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={[styles.inputField, errors.expiry && styles.inputFieldError]}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                  />
                  {errors.expiry && <Text style={styles.errorLabel}>{errors.expiry}</Text>}
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={[styles.inputField, errors.cvv && styles.inputFieldError]}
                    placeholder="123"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={cvv}
                    onChangeText={setCvv}
                  />
                  {errors.cvv && <Text style={styles.errorLabel}>{errors.cvv}</Text>}
                </View>
              </View>

              {/* Confirm Pay Button */}
              <TouchableOpacity 
                style={styles.payBtn} 
                activeOpacity={0.8}
                onPress={handleProcessPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color="#fff" />
                    <Text style={styles.payBtnText}>Pay & Activate Premium</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.securitySub}>
                🔒 256-bit SSL simulated encryption. No actual funds will be charged.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🎉 SUCCESS MODAL */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={[styles.successIconCircle, successType === 'downgrade' && styles.successIconCircleDanger]}>
              <Ionicons 
                name={successType === 'upgrade' ? "checkmark-circle" : "alert-circle"} 
                size={54} 
                color={successType === 'upgrade' ? Colors.success : Colors.danger} 
              />
            </View>
            
            <Text style={styles.successTitle}>
              {successType === 'upgrade' ? 'Upgrade Successful!' : 'Subscription Downgraded'}
            </Text>
            <Text style={styles.successMessage}>
              {successType === 'upgrade' 
                ? 'Welcome to Premium! You now have unlimited clinical diagnostics, full maps routing, and support histories.'
                : 'Your premium features have been cancelled. Your account has been reverted to the Free plan.'}
            </Text>

            <TouchableOpacity 
              style={[styles.successCloseBtn, successType === 'downgrade' && styles.successCloseBtnDanger]} 
              onPress={() => {
                setShowSuccess(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successCloseText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'flex-end',
  },
  closeBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Plans Container
  plansContainer: {
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.md,
    position: 'relative',
  },
  activePlanBorder: {
    borderColor: Colors.success,
  },
  premiumCard: {
    backgroundColor: Colors.primaryDark,
  },
  planBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  premiumBadge: {
    backgroundColor: Colors.warning,
  },
  premiumBadgeText: {
    color: Colors.textPrimary,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  planInterval: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  planIntervalWhite: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  whiteText: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  dividerWhite: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.md,
  },
  featList: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  selectBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    ...Shadows.sm,
  },
  premiumSelectBtn: {
    backgroundColor: '#fff',
  },
  selectBtnDisabled: {
    backgroundColor: Colors.border,
  },
  selectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  premiumSelectBtnText: {
    color: Colors.primaryDark,
  },
  selectBtnTextDisabled: {
    color: Colors.textMuted,
  },

  // 💳 Checkout Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  checkoutForm: {
    paddingBottom: Spacing.xl,
  },
  orderSummary: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  pricingRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },

  // Form Fields
  formGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFieldError: {
    borderColor: Colors.danger,
  },
  errorLabel: {
    fontSize: 11,
    color: Colors.danger,
    marginTop: 2,
    fontWeight: '600',
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  payBtn: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  securitySub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // 🎉 Success Overlay
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: '80%',
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.lg,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successIconCircleDanger: {
    backgroundColor: Colors.dangerBg,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  successCloseBtn: {
    backgroundColor: Colors.success,
    width: '100%',
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  successCloseBtnDanger: {
    backgroundColor: Colors.danger,
  },
  successCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
