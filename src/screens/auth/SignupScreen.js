import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme/colors';

export default function SignupScreen({ navigation }) {
  const { reloadUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the error for this field as the user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Update password strength live
    if (field === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#e0e0e0', '#EF4444', '#F97316', '#EAB308', '#22C55E'];

  const validate = () => {
    const errs = {};
    // First name: required + letters only
    if (!form.firstName.trim()) {
      errs.firstName = 'First name is required';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(form.firstName.trim())) {
      errs.firstName = 'First name must contain letters only';
    } else if (form.firstName.trim().length < 2) {
      errs.firstName = 'First name must be at least 2 characters';
    }
    // Last name: required + letters only
    if (!form.lastName.trim()) {
      errs.lastName = 'Last name is required';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(form.lastName.trim())) {
      errs.lastName = 'Last name must contain letters only';
    } else if (form.lastName.trim().length < 2) {
      errs.lastName = 'Last name must be at least 2 characters';
    }
    // Email
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    // Password: required + strong rules
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(form.password)) {
      errs.password = 'Must include at least one uppercase letter';
    } else if (!/[a-z]/.test(form.password)) {
      errs.password = 'Must include at least one lowercase letter';
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = 'Must include at least one number';
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      errs.password = 'Must include at least one special character (!@#$...)';
    }
    // Confirm password
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSignup = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      
      // Update the user's display name with first + last name
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      await updateProfile(userCredential.user, {
        displayName: fullName
      });

      // Immediately sign them out so they aren't auto-logged in
      await signOut(auth);

      Alert.alert(
        "Registration Successful",
        "Your account has been created successfully! Please log in with your credentials.",
        [
          { text: "OK", onPress: () => navigation.navigate("Login") }
        ]
      );
    } catch (error) {
      let errorMsg = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      }
      setErrors({ form: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const NAME_FIELDS = [
    {
      key: 'firstName',
      label: 'First Name',
      icon: 'person-outline',
      placeholder: 'Alex',
    },
    {
      key: 'lastName',
      label: 'Last Name',
      icon: 'person-outline',
      placeholder: 'Johnson',
    },
  ];

  const FIELDS = [
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
      colors={['#FFFFFF', '#1E3F66']}
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

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Text style={styles.appName}>PawsCura</Text>
            <Text style={styles.tagline}>Join the Pet Health Community</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSubtitle}>Get started with your pet's health journey</Text>
            
            {errors.form && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.formErrorText}>{errors.form}</Text>
              </View>
            )}

            {/* First Name & Last Name side by side */}
            <View style={styles.nameRow}>
              {NAME_FIELDS.map((field) => (
                <View style={[styles.fieldGroup, styles.nameField]} key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      errors[field.key] && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name={field.icon}
                      size={18}
                      color={Colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textMuted}
                      value={form[field.key]}
                      onChangeText={(v) => updateForm(field.key, v)}
                      keyboardType="default"
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                  {errors[field.key] && (
                    <Text style={styles.errorText}>{errors[field.key]}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Other Fields */}
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
                      autoCapitalize="none"
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
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={13} color={Colors.danger} />
                      <Text style={styles.errorText}>{errors[field.key]}</Text>
                    </View>
                  )}
                  {/* Password strength meter */}
                  {field.key === 'password' && form.password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3, 4].map((bar) => (
                          <View
                            key={bar}
                            style={[
                              styles.strengthBar,
                              {
                                backgroundColor:
                                  passwordStrength >= bar
                                    ? strengthColors[passwordStrength]
                                    : '#E5E7EB',
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.strengthLabel,
                          { color: strengthColors[passwordStrength] },
                        ]}
                      >
                        {strengthLabel[passwordStrength]}
                      </Text>
                    </View>
                  )}
                  {/* Password requirement hints */}
                  {field.key === 'password' && form.password.length > 0 && (
                    <View style={styles.hintBox}>
                      {[
                        { rule: form.password.length >= 8, text: 'At least 8 characters' },
                        { rule: /[A-Z]/.test(form.password), text: 'One uppercase letter' },
                        { rule: /[a-z]/.test(form.password), text: 'One lowercase letter' },
                        { rule: /[0-9]/.test(form.password), text: 'One number' },
                        { rule: /[^A-Za-z0-9]/.test(form.password), text: 'One special character' },
                      ].map((item, i) => (
                        <View key={i} style={styles.hintRow}>
                          <Ionicons
                            name={item.rule ? 'checkmark-circle' : 'ellipse-outline'}
                            size={13}
                            color={item.rule ? '#22C55E' : Colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.hintText,
                              { color: item.rule ? '#22C55E' : Colors.textMuted },
                            ]}
                          >
                            {item.text}
                          </Text>
                        </View>
                      ))}
                    </View>
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
            {/* Spacer before login */}
            <View style={{ height: Spacing.md }} />

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 50,
    paddingBottom: 40,
  },

  brandContainer: {
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 16,
    zIndex: 1,
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
    marginTop: 0,
    zIndex: 1,
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
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: 6,
  },
  formErrorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  nameField: {
    flex: 1,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginLeft: 2,
    flex: 1,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  hintBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    gap: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '500',
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
