import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

export default function AdminSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowAnytime, setAllowAnytime] = useState(false);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, holidayRes] = await Promise.all([
        axiosInstance.get('/settings'),
        axiosInstance.get('/holidays')
      ]);
      setAllowAnytime(settingsRes.data.allowAnytimeBooking);
      setHolidays(holidayRes.data || []);
    } catch (_error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosInstance.put('/settings', {
        allowAnytimeBooking: allowAnytime,
        minBookingDays: allowAnytime ? 0 : 3
      });
      Alert.alert('Success', 'Settings updated successfully');
    } catch (_error) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0DB591" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinic Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Configuration</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#0DB591" />
                <View style={styles.settingTextContent}>
                  <Text style={styles.settingLabel}>Anytime Booking</Text>
                  <Text style={styles.settingDesc}>Allow patients to book appointments for today or anytime before treatment.</Text>
                </View>
              </View>
              <Switch
                value={allowAnytime}
                onValueChange={setAllowAnytime}
                trackColor={{ false: '#D1D1D1', true: '#0DB591' }}
              />
            </View>
            
            {!allowAnytime && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#666" />
                <Text style={styles.infoText}>Currently set to standard 3-day advance booking requirement.</Text>
              </View>
            )}
            
            {allowAnytime && (
              <View style={[styles.infoBox, { backgroundColor: '#E8F5F1' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#0DB591" />
                <Text style={[styles.infoText, { color: '#0DB591' }]}>Same-day and immediate booking enabled for patients.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Booking Rule:</Text>
              <Text style={styles.statusValue}>{allowAnytime ? 'Immediate (0 days)' : 'Standard (3 days)'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Holidays</Text>
            <TouchableOpacity onPress={() => Alert.alert('Add Holiday', 'Feature to add holidays coming soon in the next update!')}>
              <Ionicons name="add-circle-outline" size={20} color="#0DB591" />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {holidays.length === 0 ? (
              <Text style={styles.emptyText}>No holidays configured.</Text>
            ) : (
              holidays.map((h, i) => (
                <View key={h._id || i} style={[styles.holidayRow, i !== 0 && styles.rowBorder]}>
                  <View>
                    <Text style={styles.holidayName}>{h.name}</Text>
                    <Text style={styles.holidayDate}>{new Date(h.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.holidayBadge}>
                    <Text style={styles.holidayBadgeText}>{h.type}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.disabledBtn]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2B4A' },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  settingTextContent: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '700', color: '#1A2B4A', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: '#F0F4F8', borderRadius: 10 },
  infoText: { fontSize: 12, color: '#666', flex: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 14, color: '#666' },
  statusValue: { fontSize: 14, fontWeight: '700', color: '#0DB591' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  holidayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F4F8' },
  holidayName: { fontSize: 14, fontWeight: '700', color: '#1A2B4A' },
  holidayDate: { fontSize: 12, color: '#666', marginTop: 2 },
  holidayBadge: { backgroundColor: '#E8F5F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  holidayBadgeText: { fontSize: 10, fontWeight: '700', color: '#0DB591', textTransform: 'uppercase' },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 20 },
  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EFF3F6' },
  saveBtn: { backgroundColor: '#0DB591', height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 }
});
