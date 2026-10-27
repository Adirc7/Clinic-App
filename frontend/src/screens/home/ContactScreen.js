import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Linking, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ContactScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.mobile.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert('Required Fields', 'Please fill in all fields before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      // Simulate submission (replace with real API call if backend endpoint exists)
      await new Promise(r => setTimeout(r, 1200));
      Alert.alert('Enquiry Sent ✓', 'Thank you! Our team will get back to you shortly.', [{ text: 'OK', onPress: () => setForm({ name: '', mobile: '', email: '', message: '' }) }]);
    } catch (_) {
      Alert.alert('Error', 'Failed to send enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const highlights = [
    { icon: 'time-outline', color: '#0DB591', title: '24/7 Availability', desc: '24/7 support for hospital enquiries and patient assistance.' },
    { icon: 'shield-checkmark-outline', color: '#007AFF', title: 'Trusted Healthcare Legacy', desc: 'A long-standing reputation for dependable private healthcare in Sri Lanka.' },
    { icon: 'people-outline', color: '#FF9800', title: 'Professional Support', desc: 'Friendly assistance for enquiries, appointments, and patient guidance.' },
    { icon: 'flash-outline', color: '#9C27B0', title: 'Prompt Response', desc: 'Designed to help patients and families connect with the right team quickly.' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0A6B5B" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Contact Us</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero Banner */}
        <View style={s.heroBanner}>
          <Text style={s.heroTag}>Patient Assistance & Contact Experience</Text>
          <Text style={s.heroTitle}>Reach the right team quickly for general enquiries, appointments, channeling support, and hospital-related assistance.</Text>
        </View>

        {/* Section Title */}
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>Contact Information</Text>
          <Text style={s.sectionTitle}>We{'\u2019'}re Here to Support{'\n'}You</Text>
        </View>

        {/* Intro card */}
        <View style={s.introCard}>
          <MaterialCommunityIcons name="hospital-building" size={30} color="#0DB591" style={{ marginBottom: 10 }} />
          <Text style={s.introTitle}>Patient & Visitor Enquiries</Text>
          <Text style={s.introText}>Contact Nawaloka Hospitals PLC for general enquiries, appointments, channeling support, and healthcare assistance. Our team is ready to guide patients, visitors, and families with professionalism and care.</Text>
        </View>

        {/* Contact Info Cards */}
        <View style={s.infoGrid}>
          {/* Address */}
          <View style={s.infoCard}>
            <View style={[s.infoIcon, { backgroundColor: '#E8F5F1' }]}>
              <Ionicons name="location-outline" size={20} color="#0DB591" />
            </View>
            <Text style={s.infoCardTitle}>Hospital Address</Text>
            <Text style={s.infoCardText}>Nawaloka Hospitals PLC,{'\n'}23, Deshamanya H. K.{'\n'}Dharmadasa Mawatha,{'\n'}Colombo 02, Sri Lanka.</Text>
          </View>

          {/* Phone */}
          <View style={s.infoCard}>
            <View style={[s.infoIcon, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="call-outline" size={20} color="#FF9800" />
            </View>
            <Text style={s.infoCardTitle}>Call Us</Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:0115577111')}>
              <Text style={s.infoLabel}>General Line</Text>
              <Text style={s.infoPhone}>0115 577 111</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:0115777888')} style={{ marginTop: 10 }}>
              <Text style={s.infoLabel}>Channeling Hotline</Text>
              <Text style={s.infoPhone}>0115 777 888</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={s.infoCard}>
            <View style={[s.infoIcon, { backgroundColor: '#F4F0FF' }]}>
              <Ionicons name="mail-outline" size={20} color="#9C27B0" />
            </View>
            <Text style={s.infoCardTitle}>Email Address</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:nawaloka@slt.lk')}>
              <Text style={s.infoPhone}>nawaloka@slt.lk</Text>
            </TouchableOpacity>
          </View>

          {/* Availability */}
          <View style={[s.infoCard, { backgroundColor: '#0DB591' }]}>
            <View style={[s.infoIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons name="time-outline" size={20} color="#fff" />
            </View>
            <Text style={[s.infoCardTitle, { color: '#fff' }]}>Availability</Text>
            <Text style={[s.infoCardText, { color: 'rgba(255,255,255,0.9)' }]}>24/7 support for hospital enquiries and patient assistance.</Text>
          </View>
        </View>

        {/* Feature Highlights */}
        <Text style={[s.sectionLabel, { marginHorizontal: 18, marginTop: 24, marginBottom: 4 }]}>Why Choose Us</Text>
        {highlights.map((h, i) => (
          <View key={i} style={s.highlightRow}>
            <View style={[s.highlightIcon, { backgroundColor: h.color + '18' }]}>
              <Ionicons name={h.icon} size={22} color={h.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.highlightTitle}>{h.title}</Text>
              <Text style={s.highlightDesc}>{h.desc}</Text>
            </View>
          </View>
        ))}

        {/* Enquiry Form */}
        <View style={s.formCard}>
          <View style={s.formBadge}>
            <Ionicons name="lock-closed-outline" size={12} color="#0DB591" />
            <Text style={s.formBadgeText}>Secure & Easy</Text>
          </View>
          <Text style={s.formTitle}>Online Enquiry Form</Text>
          <Text style={s.formSubtitle}>Send Us a Message</Text>

          {[
            { label: 'Full Name *', key: 'name', placeholder: 'Enter your full name', keyboard: 'default' },
            { label: 'Mobile Number *', key: 'mobile', placeholder: '+94 XX XXX XXXX', keyboard: 'phone-pad' },
            { label: 'Email Address *', key: 'email', placeholder: 'you@example.com', keyboard: 'email-address' },
          ].map(field => (
            <View key={field.key} style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{field.label}</Text>
              <TextInput
                style={s.input}
                placeholder={field.placeholder}
                placeholderTextColor="#bbb"
                keyboardType={field.keyboard}
                autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                value={form[field.key]}
                onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
              />
            </View>
          ))}

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Message *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="How can we help you?"
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={form.message}
              onChangeText={v => setForm(prev => ({ ...prev, message: v }))}
            />
          </View>

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.submitText}>Submit Enquiry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { paddingBottom: 30 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0FAF7', alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#0A2E2A' },

  heroBanner: { backgroundColor: '#0A2E2A', padding: 24, paddingTop: 28 },
  heroTag: { fontSize: 11, color: '#0DB591', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  heroTitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 23 },

  sectionHead: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 6 },
  sectionLabel: { fontSize: 11, color: '#0DB591', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0A2E2A', lineHeight: 30 },

  introCard: { margin: 16, backgroundColor: '#fff', borderRadius: 18, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  introTitle: { fontSize: 15, fontWeight: '800', color: '#1A2E2A', marginBottom: 8 },
  introText: { fontSize: 13, color: '#555', lineHeight: 21 },

  infoGrid: { paddingHorizontal: 16, gap: 12 },
  infoCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  infoCardTitle: { fontSize: 13, fontWeight: '800', color: '#1A2E2A', marginBottom: 8 },
  infoCardText: { fontSize: 13, color: '#666', lineHeight: 20 },
  infoLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  infoPhone: { fontSize: 15, fontWeight: '800', color: '#0DB591' },

  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 12, gap: 14 },
  highlightIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  highlightTitle: { fontSize: 14, fontWeight: '800', color: '#1A2E2A', marginBottom: 3 },
  highlightDesc: { fontSize: 12.5, color: '#666', lineHeight: 19 },

  formCard: { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10 },
  formBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 14 },
  formBadgeText: { fontSize: 11, color: '#0DB591', fontWeight: '700' },
  formTitle: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  formSubtitle: { fontSize: 20, fontWeight: '900', color: '#0A2E2A', marginBottom: 20, marginTop: 2 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#F7F9FC', borderWidth: 1, borderColor: '#E5EAF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#222' },
  textArea: { height: 110, paddingTop: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0DB591', borderRadius: 14, paddingVertical: 15, marginTop: 6, elevation: 3, shadowColor: '#0DB591', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
