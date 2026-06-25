import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme/colors';

export default function SignupScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSignup = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }, 1200);
  };

  const FIELDS = [
    {
      key: 'name',
      label: 'Full Name',
      icon: 'person-outline',
      placeholder: 'Alex Johnson',
      keyboard: 'default',
      secure: false,
    },
    {
      key: 'email',
      label: 'Email Address',
      icon: 'mail-outline',
      placeholder: 'you@example.com',
      keyboard: 'email-address',
      secure: false,
    },
    {
      key: 'password',
      label: 'Password',
      icon: 'lock-closed-outline',
      placeholder: '••••••••',
      keyboard: 'default',
      secure: true,
      toggleKey: 'showPassword',
    },
    {
      key: 'confirmPassword',
      label: 'Confirm Password',
      icon: 'shield-checkmark-outline',
      placeholder: '••••••••',
      keyboard: 'default',
      secure: true,
      toggleKey: 'showConfirm',
    },
  ];

  return (
    <LinearGradient
      colors={['#EBF2FB', '#F8F9FA', '#FFFFFF']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.heroSection}>
            <Image
              source={require('../../../assets/Mascot.jpg')}
              style={styles.mascot}
              resizeMode="contain"
            />
            <Text style={styles.appName}>PawsCura</Text>
            <Text style={styles.tagline}>Join the Pet Health Community</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account 🐾</Text>
            <Text style={styles.cardSubtitle}>Get started with your pet's health journey</Text>

            {/* Fields */}
            {FIELDS.map((field) => {
              const isSecure = field.secure
                ? field.toggleKey === 'showPassword'
                  ? !showPassword
                  : !showConfirm
                : false;
              const toggle =
                field.toggleKey === 'showPassword'
                  ? () => setShowPassword((v) => !v)
                  : () => setShowConfirm((v) => !v);
              const showEye =
                field.toggleKey === 'showPassword' ? showPassword : showConfirm;

              return (
                <View style={styles.fieldGroup} key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      errors[field.key] && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name={field.icon}
                      size={20}
                      color={Colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textMuted}
                      value={form[field.key]}
                      onChangeText={(v) => updateForm(field.key, v)}
                      keyboardType={field.keyboard}
                      autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                      autoCorrect={false}
                      secureTextEntry={isSecure}
                    />
                    {field.secure && (
                      <TouchableOpacity onPress={toggle} style={styles.eyeBtn}>
                        <Ionicons
                          name={showEye ? 'eye-outline' : 'eye-off-outline'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {errors[field.key] && (
                    <Text style={styles.errorText}>{errors[field.key]}</Text>
                  )}
                </View>
              );
            })}

            {/* Terms note */}
            <View style={styles.termsRow}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.termsText}>
                By creating an account you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={styles.signupBtn}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signupBtnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="paw" size={18} color={Colors.textInverse} />
                    <Text style={styles.signupBtnText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    width: 40,
    height: 40,
    justifyContent: 'center',
    zIndex: 10,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: 20,
  },
  mascot: {
    width: 90,
    height: 90,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 2,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  signupBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  signupBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signupBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
});
