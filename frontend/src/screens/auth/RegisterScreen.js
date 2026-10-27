import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Password strength helpers ─────────────────────────────────────────────────
const checks = [
  { key: 'length',    label: 'At least 8 characters',             test: (p) => p.length >= 8 },
  { key: 'upper',     label: 'At least one uppercase letter',      test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',     label: 'At least one lowercase letter',      test: (p) => /[a-z]/.test(p) },
  { key: 'number',    label: 'At least one number',               test: (p) => /\d/.test(p) },
  { key: 'special',   label: 'At least one special character',     test: (p) => /[@$!%*?&]/.test(p) },
];

const getStrength = (password) => {
  const passed = checks.filter((c) => c.test(password)).length;
  if (passed <= 1) return { label: 'Weak',   color: '#E53935', width: '20%' };
  if (passed <= 3) return { label: 'Medium', color: '#FF9800', width: '55%' };
  if (passed === 4) return { label: 'Good',  color: '#43A047', width: '80%' };
  return              { label: 'Strong', color: '#0DB591', width: '100%' };
};

export default function RegisterScreen({ navigation }) {
  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [touched, setTouched] = useState({
    fullName: false, email: false, password: false, confirmPassword: false,
  });

  const strength = useMemo(() => (password ? getStrength(password) : null), [password]);

  // ── Field-level errors ────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e = {};
    if (touched.fullName) {
      if (!fullName.trim()) e.fullName = 'Full name is required.';
      else if (fullName.trim().length < 3) e.fullName = 'Name must be at least 3 characters.';
    }
    if (touched.email) {
      if (!email.trim()) e.email = 'Email is required.';
      else if (!EMAIL_REGEX.test(email.trim())) e.email = 'Please enter a valid email address.';
    }
    if (touched.password) {
      if (!password) e.password = 'Password is required.';
      else if (!checks.every((c) => c.test(password)))
        e.password = 'Password does not meet all requirements.';
    }
    if (touched.confirmPassword) {
      if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
      else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
    }
    return e;
  }, [fullName, email, password, confirmPassword, touched]);

  const isFormValid =
    fullName.trim().length >= 3 &&
    EMAIL_REGEX.test(email.trim()) &&
    checks.every((c) => c.test(password)) &&
    confirmPassword === password &&
    confirmPassword.length > 0;

  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const handleRegister = async () => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    if (!isFormValid) return;

    try {
      setLoading(true);
      await axiosInstance.post('/auth/register', {
        name:  fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role:  'patient',
      });
      Alert.alert(
        '✅ Account Created',
        'Your MediCare account has been created. Please login.',
        [{ text: 'Login', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      const message = getErrorMessage(error, 'Registration failed. Please try again.');
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const borderColor = (field) => {
    if (!touched[field]) return '#DCEBE8';
    return errors[field] ? '#E53935' : '#0DB591';
  };
  const bgColor = (field) => {
    if (!touched[field]) return '#FBFEFD';
    return errors[field] ? '#FFF5F5' : '#F3FCF9';
  };
  const iconColor = (field) => {
    if (!touched[field]) return '#87A2A0';
    return errors[field] ? '#E53935' : '#0DB591';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>

            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color="#1A4B44" />
            </TouchableOpacity>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join MediCare — Your health partner</Text>

            {/* ── Full Name ── */}
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrap, { borderColor: borderColor('fullName'), backgroundColor: bgColor('fullName') }]}>
              <Ionicons name="person-outline" size={18} color={iconColor('fullName')} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                onBlur={() => handleBlur('fullName')}
                placeholderTextColor="#A3B5B3"
              />
              {touched.fullName && !errors.fullName && <Ionicons name="checkmark-circle" size={18} color="#0DB591" />}
            </View>
            {errors.fullName && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.fullName}</Text>
              </View>
            )}

            {/* ── Email ── */}
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, { borderColor: borderColor('email'), backgroundColor: bgColor('email') }]}>
              <Ionicons name="mail-outline" size={18} color={iconColor('email')} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onBlur={() => handleBlur('email')}
                placeholderTextColor="#A3B5B3"
              />
              {touched.email && !errors.email && <Ionicons name="checkmark-circle" size={18} color="#0DB591" />}
            </View>
            {errors.email && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}

            {/* ── Password ── */}
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, { borderColor: borderColor('password'), backgroundColor: bgColor('password') }]}>
              <Ionicons name="lock-closed-outline" size={18} color={iconColor('password')} />
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                placeholderTextColor="#A3B5B3"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#87A2A0" />
              </TouchableOpacity>
            </View>

            {/* Strength Bar */}
            {password.length > 0 && strength && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBarBg}>
                  <View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            {/* Requirements checklist */}
            {touched.password && (
              <View style={styles.checklistWrap}>
                {checks.map((c) => (
                  <View key={c.key} style={styles.checklistRow}>
                    <Ionicons
                      name={c.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={c.test(password) ? '#0DB591' : '#A3B5B3'}
                    />
                    <Text style={[styles.checklistText, c.test(password) && { color: '#0DB591' }]}>
                      {c.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {errors.password && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}

            {/* ── Confirm Password ── */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, { borderColor: borderColor('confirmPassword'), backgroundColor: bgColor('confirmPassword') }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={iconColor('confirmPassword')} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                autoCapitalize="none"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => handleBlur('confirmPassword')}
                placeholderTextColor="#A3B5B3"
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color="#87A2A0" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.registerBtn, (!isFormValid || loading) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.linkText}>Login</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF6F4' },
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#0A6B5B', shadowOpacity: 0.08, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF9F7', marginBottom: 14,
  },
  title:    { fontSize: 26, fontWeight: '800', color: '#1A4B44' },
  subtitle: { marginTop: 4, marginBottom: 20, color: '#5F7A77', fontSize: 13 },

  label: { fontSize: 12, fontWeight: '700', color: '#4E6B68', marginBottom: 6, marginLeft: 2 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, height: 52, marginBottom: 4,
  },
  input: { flex: 1, color: '#123F39', fontSize: 14 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, marginLeft: 2 },
  errorText: { fontSize: 11, color: '#E53935', flexShrink: 1 },

  // Strength
  strengthWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 },
  strengthBarBg:   { flex: 1, height: 5, backgroundColor: '#E5F0EE', borderRadius: 999, overflow: 'hidden' },
  strengthBarFill: { height: '100%', borderRadius: 999 },
  strengthLabel:   { fontSize: 11, fontWeight: '700', minWidth: 46 },

  // Checklist
  checklistWrap: { marginBottom: 8, gap: 4 },
  checklistRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checklistText: { fontSize: 11, color: '#A3B5B3' },

  registerBtn: {
    backgroundColor: '#0DB591', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    height: 52, marginTop: 18, elevation: 4,
    shadowColor: '#0DB591', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  btnDisabled: { opacity: 0.5, elevation: 0 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },

  footerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 6 },
  footerText: { color: '#58716E', fontSize: 13 },
  linkText:   { color: '#0DB591', fontWeight: '700', fontSize: 13 },
});
