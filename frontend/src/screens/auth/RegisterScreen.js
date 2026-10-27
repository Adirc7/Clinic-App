import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import { AuthField } from './LoginScreen';
import { Button, GradientHeader } from '../../components/ui';
import { colors, radius, shadow } from '../../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Password rules (must match the backend validator) ─────────────────────────
const checks = [
  { key: 'length', label: '8+ characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'Number', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Symbol (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
];

const getStrength = (password) => {
  const passed = checks.filter((c) => c.test(password)).length;
  if (passed <= 1) return { label: 'Weak', color: colors.danger, pct: 20 };
  if (passed <= 3) return { label: 'Medium', color: colors.warning, pct: 55 };
  if (passed === 4) return { label: 'Good', color: '#22C55E', pct: 80 };
  return { label: 'Strong', color: colors.success, pct: 100 };
};

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirmPassword: false });

  const strength = useMemo(() => (password ? getStrength(password) : null), [password]);

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
      else if (!checks.every((c) => c.test(password))) e.password = 'Password does not meet all requirements.';
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

  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleRegister = async () => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    if (!isFormValid) return;
    try {
      setLoading(true);
      await axiosInstance.post('/auth/register', {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'patient',
      });
      Alert.alert('✅ Account Created', 'Your MediCare account has been created. Please sign in.', [
        { text: 'Sign In', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', getErrorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const eye = (shown, toggle) => (
    <Pressable onPress={toggle} hitSlop={10}>
      <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <GradientHeader style={{ paddingBottom: 64 }}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.heroTitle}>Create your account</Text>
            <Text style={styles.heroSub}>Book doctors, track bills and keep your records in one place.</Text>
          </GradientHeader>

          <View style={styles.card}>
            <AuthField
              label="Full name"
              icon="person-outline"
              placeholder="e.g. Kamal Silva"
              value={fullName}
              onChangeText={setFullName}
              onBlur={blur('fullName')}
              error={errors.fullName}
              valid={touched.fullName && !errors.fullName}
            />
            <AuthField
              label="Email address"
              icon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onBlur={blur('email')}
              error={errors.email}
              valid={touched.email && !errors.email}
            />
            <AuthField
              label="Password"
              icon="lock-closed-outline"
              placeholder="Create a password"
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onBlur={blur('password')}
              error={errors.password}
              right={eye(showPassword, () => setShowPassword((v) => !v))}
            />

            {password.length > 0 && strength && (
              <View style={styles.strengthBox}>
                <View style={styles.strengthTop}>
                  <View style={styles.strengthTrack}>
                    <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
                <View style={styles.chips}>
                  {checks.map((c) => {
                    const ok = c.test(password);
                    return (
                      <View key={c.key} style={[styles.chip, ok && styles.chipOk]}>
                        <Ionicons name={ok ? 'checkmark' : 'ellipse-outline'} size={11} color={ok ? colors.success : colors.muted} />
                        <Text style={[styles.chipText, ok && { color: colors.success }]}>{c.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <AuthField
              label="Confirm password"
              icon="shield-checkmark-outline"
              placeholder="Re-enter your password"
              autoCapitalize="none"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={blur('confirmPassword')}
              error={errors.confirmPassword}
              right={eye(showConfirm, () => setShowConfirm((v) => !v))}
            />

            <Button title="Create Account" icon="person-add-outline" onPress={handleRegister} loading={loading} disabled={!isFormValid} style={{ marginTop: 6 }} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6, lineHeight: 20, maxWidth: 300 },

  card: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -40, borderRadius: radius.xl, padding: 22, ...shadow.card },

  strengthBox: { marginTop: -4, marginBottom: 14 },
  strengthTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 999 },
  strengthLabel: { fontSize: 12, fontWeight: '800', minWidth: 52, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOk: { backgroundColor: colors.successSoft, borderColor: '#BFEBD8' },
  chipText: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 },
  footerText: { color: colors.body, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '800', fontSize: 13 },
});
