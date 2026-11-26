import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { showAlert } from '../components/CustomAlert';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  formatCvv,
  validateCardForm,
} from '../utils/cardValidation';

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
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);
  const { user } = useAuth();
  const {
    isPremium,
    subscriptionStatus,
    subscriptionEndDate,
    activatePremiumSubscription,
    cancelSubscription,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState('upgrade');
  const [retainsUntilDate, setRetainsUntilDate] = useState(null);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});

  const detectedBrand = detectCardBrand(cardNumber);

  const isCancelledWithAccess = Boolean(
    isPremium && subscriptionStatus === 'cancelled' && subscriptionEndDate
  );

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    try {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCardNameChange = (text) => {
    setCardName(text);
    clearFieldError('cardName');
  };

  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
    clearFieldError('cardNumber');
    const brand = detectCardBrand(formatted);
    const maxCvvLen = brand?.cvvLength || 3;
    if (cvv.length > maxCvvLen) {
      setCvv(cvv.slice(0, maxCvvLen));
    }
  };

  const handleExpiryChange = (text) => {
    setExpiry(formatExpiry(text));
    clearFieldError('expiry');
  };

  const handleCvvChange = (text) => {
    setCvv(formatCvv(text, detectedBrand));
    clearFieldError('cvv');
  };

  const confirmCancelSubscription = () => {
    if (!isPremium) {
      showAlert({
        title: 'Active Plan',
        message: 'You are already on the Free Plan.',
        type: 'info',
      });
      return;
    }
    if (isCancelledWithAccess) {
      showAlert({
        title: 'Already Cancelled',
        message: `Auto-renewal is already turned off. Your Premium access remains active until ${formatDate(subscriptionEndDate)}.`,
        type: 'info',
      });
      return;
    }
    const periodNote =
      subscriptionEndDate && subscriptionEndDate.getTime() > Date.now()
        ? `Auto-renewal will be turned off and you will retain Premium features through ${formatDate(subscriptionEndDate)}.`
        : 'Your subscription will be cancelled and your account will revert to the Free plan.';
    showAlert({
      title: 'Cancel Subscription?',
      message: `Are you sure you want to cancel? ${periodNote}`,
      type: 'confirm',
      buttons: [
        { text: 'Keep Premium', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleSelectPlan('free') },
      ],
    });
  };

  const handleSelectPlan = async (plan) => {
    if (plan === 'premium') {
      if (isPremium && !isCancelledWithAccess) {
        showAlert({
          title: 'Active Plan',
          message: 'You are already subscribed to the Premium Plan!',
          type: 'info',
        });
        return;
      }
      if (!user) {
        showAlert({
          title: 'Sign In Required',
          message: 'Please sign in before upgrading your subscription.',
          type: 'warning',
        });
        return;
      }

      setSelectedPlan('premium');
      setErrors({});
      setShowCheckout(true);
    } else {
      if (!isPremium) {
        showAlert({
          title: 'Active Plan',
          message: 'You are already on the Free Plan.',
          type: 'info',
        });
        return;
      }
      if (isCancelledWithAccess) {
        showAlert({
          title: 'Already Cancelled',
          message: `Auto-renewal is already disabled. Your Premium features remain available until ${formatDate(subscriptionEndDate)}.`,
          type: 'info',
        });
        return;
      }
      setSelectedPlan('free');
      setLoading(true);
      try {
        const res = await cancelSubscription();
        setRetainsUntilDate(res?.retainsAccessUntil || null);
        setSuccessType('downgrade');
        setShowSuccess(true);
      } catch (err) {
        console.error('Downgrade error:', err);
        showAlert({
          title: 'Cancellation Failed',
          message: err?.message || 'Failed to cancel your subscription. Please check your connection and try again.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProcessPayment = async () => {
    const result = validateCardForm({ cardName, cardNumber, expiry, cvv });
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await activatePremiumSubscription({
        cardholderName: result.normalizedName,
        cardBrand: result.brand?.name || 'Card',
        cardLast4: result.last4,
      });

      setCardName('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setShowCheckout(false);
      setSuccessType('upgrade');
      setShowSuccess(true);
    } catch (err) {
      console.error('Payment activation error:', err);
      showAlert({
        title: 'Payment Error',
        message: err?.message || 'Transaction failed. Please check card info and retry.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#794B35', '#302B29']}
      style={styles.container}
    >
      <View style={styles.safe}>
        <View style={[styles.header, { paddingTop: topInset + Spacing.sm }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.iconWrapper}>
              <Ionicons name="diamond" size={44} color={Colors.warning} />
            </View>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>Unlock advanced diagnostics and full clinical search tools.</Text>
          </View>

          <View style={styles.plansContainer}>
            <TouchableOpacity
              style={[
                styles.planCard,
                !isPremium && styles.activePlanBorder,
              ]}
              activeOpacity={0.8}
              onPress={confirmCancelSubscription}
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
                style={[styles.selectBtn, (!isPremium || isCancelledWithAccess) && styles.selectBtnDisabled]}
                onPress={confirmCancelSubscription}
                disabled={!isPremium || isCancelledWithAccess || loading}
              >
                {loading && selectedPlan === 'free' ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={[styles.selectBtnText, (!isPremium || isCancelledWithAccess) && styles.selectBtnTextDisabled]}>
                    {!isPremium
                      ? 'Active Plan'
                      : isCancelledWithAccess
                      ? `Ends ${formatDate(subscriptionEndDate)}`
                      : 'Cancel Subscription'}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.planCard,
                styles.premiumCard,
                isPremium && styles.activePlanBorder,
              ]}
              activeOpacity={0.8}
              onPress={() => handleSelectPlan('premium')}
            >
              <View style={[styles.planBadge, styles.premiumBadge]}>
                <Text style={[styles.planBadgeText, styles.premiumBadgeText]}>
                  {isCancelledWithAccess ? 'CANCELLED' : isPremium ? 'ACTIVE' : 'BEST VALUE'}
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
                style={[
                  styles.selectBtn,
                  styles.premiumSelectBtn,
                  isPremium && !isCancelledWithAccess && styles.selectBtnDisabled,
                ]}
                onPress={() => handleSelectPlan('premium')}
                disabled={(isPremium && !isCancelledWithAccess) || loading}
              >
                {loading && selectedPlan === 'premium' ? (
                  <ActivityIndicator color={Colors.primaryDark} />
                ) : (
                  <Text
                    style={[
                      styles.selectBtnText,
                      styles.premiumSelectBtnText,
                      isPremium && !isCancelledWithAccess && styles.selectBtnTextDisabled,
                    ]}
                  >
                    {isCancelledWithAccess
                      ? 'Resubscribe'
                      : isPremium
                      ? 'Active Plan'
                      : 'Subscribe Now'}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal visible={showCheckout} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.checkoutSheet, { paddingBottom: Math.max(insets.bottom + 12, Spacing.lg) }]}>
            <View style={styles.checkoutHeader}>
              <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={20} color={Colors.success} />
                <Text style={styles.checkoutTitle}>Secure Checkout</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCheckout(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.checkoutForm}>
              <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Subscription Plan:</Text>
                <Text style={styles.summaryValue}>Premium Membership</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.summaryLabel}>Amount Due:</Text>
                  <Text style={styles.summaryPrice}>$9.99/mo</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={[styles.inputField, errors.cardName && styles.inputFieldError]}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textMuted}
                  value={cardName}
                  onChangeText={handleCardNameChange}
                  autoCapitalize="words"
                />
                {errors.cardName && <Text style={styles.errorLabel}>{errors.cardName}</Text>}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Card Number</Text>
                  {detectedBrand && (
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>{detectedBrand.name}</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.inputField, errors.cardNumber && styles.inputFieldError]}
                  placeholder={detectedBrand?.id === 'amex' ? '3782-822463-10005' : '4111-2222-3333-4444'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  maxLength={detectedBrand?.id === 'amex' ? 17 : 23}
                />
                {errors.cardNumber && <Text style={styles.errorLabel}>{errors.cardNumber}</Text>}
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={[styles.inputField, errors.expiry && styles.inputFieldError]}
                    placeholder="MM/YY"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    maxLength={5}
                  />
                  {errors.expiry && <Text style={styles.errorLabel}>{errors.expiry}</Text>}
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    {detectedBrand?.id === 'amex' ? 'CVV (4 digits)' : 'CVV'}
                  </Text>
                  <TextInput
                    style={[styles.inputField, errors.cvv && styles.inputFieldError]}
                    placeholder={detectedBrand?.id === 'amex' ? '1234' : '123'}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={detectedBrand?.cvvLength || 3}
                    value={cvv}
                    onChangeText={handleCvvChange}
                  />
                  {errors.cvv && <Text style={styles.errorLabel}>{errors.cvv}</Text>}
                </View>
              </View>

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
                Card details are validated against standard payment network rules and are not stored in full.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={[styles.successIconCircle, successType === 'downgrade' && styles.successIconCircleDanger]}>
              <Ionicons
                name={successType === 'upgrade' ? 'checkmark-circle' : 'alert-circle'}
                size={54}
                color={successType === 'upgrade' ? Colors.success : Colors.danger}
              />
            </View>

            <Text style={styles.successTitle}>
              {successType === 'upgrade' ? 'Upgrade Successful!' : 'Subscription Cancelled'}
            </Text>
            <Text style={styles.successMessage}>
              {successType === 'upgrade'
                ? 'Welcome to Premium! You now have unlimited clinical diagnostics, full maps routing, and support histories.'
                : retainsUntilDate
                ? `Auto-renewal has been cancelled. You will keep full Premium access until ${formatDate(retainsUntilDate)}, after which your account moves to the Free plan.`
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#302B29',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

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

  formGroup: {
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  brandBadge: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
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
