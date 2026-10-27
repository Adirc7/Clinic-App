import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import BrandLogo from '../../components/BrandLogo';
import { Button, GradientHeader } from '../../components/ui';
import { colors, radius, shadow } from '../../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthField({ label, icon, error, valid, right, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        <Ionicons name={icon} size={18} color={error ? colors.danger : focused ? colors.primary : colors.muted} />
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.muted}
          {...inputProps}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
        />
        {right}
        {!right && valid ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const errors = useMemo(() => {
    const e = {};
    if (touched.email) {
      if (!email.trim()) e.email = 'Email is required.';
      else if (!EMAIL_REGEX.test(email.trim())) e.email = 'Please enter a valid email address.';
    }
    if (touched.password) {
      if (!password) e.password = 'Password is required.';
      else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    }
    return e;
  }, [email, password, touched]);

  const isFormValid = EMAIL_REGEX.test(email.trim()) && password.length >= 6;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) return;
    try {
      setLoading(true);
      const response = await axiosInstance.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { accessToken, refreshToken, user } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      onLogin({ user, token: accessToken });
    } catch (error) {
      Alert.alert('Login Failed', getErrorMessage(error, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <GradientHeader style={styles.hero}>
            {navigation.canGoBack() && (
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
            )}
            <View style={styles.brand}>
              <BrandLogo size={72} style={styles.logo} />
              <Text style={styles.brandName}>MediCare Clinic</Text>
              <Text style={styles.brandSub}>Trusted doctors, one tap away</Text>
            </View>
          </GradientHeader>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Sign in to manage your appointments</Text>

            <AuthField
              label="Email address"
              icon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={errors.email}
              valid={touched.email && !errors.email}
            />

            <AuthField
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter your password"
              autoCapitalize="none"
              secureTextEntry={secureText}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              onSubmitEditing={handleLogin}
              error={errors.password}
              right={
                <Pressable onPress={() => setSecureText((v) => !v)} hitSlop={10}>
                  <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
                </Pressable>
              }
            />

            <Button title="Sign In" icon="log-in-outline" onPress={handleLogin} loading={loading} disabled={!isFormValid} style={{ marginTop: 8 }} />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>New to MediCare?</Text>
              <View style={styles.line} />
            </View>

            <Button title="Create a patient account" variant="secondary" onPress={() => navigation.navigate('Register')} />
          </View>

          <View style={styles.trustRow}>
            {[
              ['shield-checkmark-outline', 'Secure'],
              ['time-outline', '24/7 booking'],
              ['medkit-outline', 'Verified doctors'],
            ].map(([icon, label]) => (
              <View key={label} style={styles.trustItem}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { paddingBottom: 70 },
  back: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  brand: { alignItems: 'center', paddingTop: 8 },
  logo: { borderRadius: 22, ...shadow.card },
  brandName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 14, letterSpacing: -0.3 },
  brandSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -48,
    borderRadius: radius.xl, padding: 22, ...shadow.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.body, marginTop: 4, marginBottom: 22 },

  label: { fontSize: 12, fontWeight: '700', color: colors.body, marginBottom: 6, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, backgroundColor: colors.surfaceAlt,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: '#fff' },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFF7F7' },
  input: { flex: 1, fontSize: 15, color: colors.ink, height: '100%', outlineWidth: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errorText: { color: colors.danger, fontSize: 12, flexShrink: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22, marginBottom: 32 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { color: colors.body, fontSize: 12, fontWeight: '600' },
});
