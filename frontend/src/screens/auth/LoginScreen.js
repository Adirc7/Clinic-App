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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import BrandLogo from '../../components/BrandLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [touched, setTouched]   = useState({ email: false, password: false });

  // ── Field-level errors ────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e = {};
    if (touched.email) {
      if (!email.trim()) {
        e.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(email.trim())) {
        e.email = 'Please enter a valid email address.';
      }
    }
    if (touched.password) {
      if (!password) {
        e.password = 'Password is required.';
      } else if (password.length < 6) {
        e.password = 'Password must be at least 6 characters.';
      }
    }
    return e;
  }, [email, password, touched]);

  const isFormValid = EMAIL_REGEX.test(email.trim()) && password.length >= 6;

  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const handleLogin = async () => {
    // Mark all fields touched to reveal any hidden errors
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
      const message = getErrorMessage(error, 'Login failed. Please try again.');
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back to the public home screen */}
          {navigation.canGoBack() && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color="#1A4B44" />
            </TouchableOpacity>
          )}

          {/* Brand */}
          <View style={styles.brandWrap}>
            <BrandLogo size={76} style={styles.logoBubble} />
            <Text style={styles.brandName}>MediCare Clinic</Text>
            <Text style={styles.brandSub}>Consult only with trusted doctors</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to manage your appointments</Text>

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color={errors.email ? '#E53935' : '#87A2A0'} />
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
              {touched.email && !errors.email && (
                <Ionicons name="checkmark-circle" size={18} color="#0DB591" />
              )}
            </View>
            {errors.email && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#E53935' : '#87A2A0'} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                autoCapitalize="none"
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                placeholderTextColor="#A3B5B3"
              />
              <TouchableOpacity onPress={() => setSecureText((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color="#87A2A0" />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#E53935" />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.loginBtn, (!isFormValid || loading) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Login</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Sign Up</Text>
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

  brandWrap: { alignItems: 'center', marginBottom: 28 },
  logoBubble: {
    shadowColor: '#0A6B5B', shadowOpacity: 0.1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  brandName: { marginTop: 10, fontSize: 28, fontWeight: '800', color: '#114E45' },
  brandSub:  { marginTop: 4, fontSize: 13, color: '#5F7A77' },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#0A6B5B', shadowOpacity: 0.08, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A4B44' },
  subtitle: { fontSize: 13, color: '#5F7A77', marginTop: 4, marginBottom: 22 },
  backBtn: {
    position: 'absolute', top: 12, left: 16, zIndex: 2,
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A6B5B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  label: { fontSize: 12, fontWeight: '700', color: '#4E6B68', marginBottom: 6, marginLeft: 2 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#DCEBE8', borderRadius: 14,
    paddingHorizontal: 14, height: 52, backgroundColor: '#FBFEFD',
    marginBottom: 4,
  },
  inputError: { borderColor: '#E53935', backgroundColor: '#FFF5F5' },
  input: { flex: 1, color: '#123F39', fontSize: 14 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, marginLeft: 2 },
  errorText: { fontSize: 12, color: '#E53935', flexShrink: 1 },

  loginBtn: {
    backgroundColor: '#0DB591', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    height: 52, marginTop: 16, elevation: 4,
    shadowColor: '#0DB591', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  btnDisabled: { opacity: 0.5, elevation: 0 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '800' },

  footerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 6 },
  footerText: { color: '#58716E', fontSize: 13 },
  linkText:   { color: '#0DB591', fontWeight: '700', fontSize: 13 },
  
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D1EAE5',
  },
  instructionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1A4B44',
    lineHeight: 18,
  },
});
