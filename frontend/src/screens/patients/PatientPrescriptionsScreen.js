import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../api/axiosInstance';

export default function PatientPrescriptionsScreen({ navigation }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchPrescriptions(true);
    }, [])
  );

  const fetchPrescriptions = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const res = await axiosInstance.get('/prescriptions/my-prescriptions');
      setPrescriptions(res.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) =>
    (p.diagnosis && p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.doctorId?.name && p.doctorId.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.medications && p.medications.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by diagnosis, doctor or medicine..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrescriptions(true); }} />}
        >
          {filteredPrescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
              <Text style={styles.emptySubtitle}>You don&apos;t have any digital prescriptions yet.</Text>
            </View>
          ) : (
            filteredPrescriptions.map((p) => (
              <TouchableOpacity 
                key={p._id} 
                style={styles.card}
                onPress={() => navigation.navigate('PrescriptionDetail', { appointmentId: p.appointmentId?._id || p.appointmentId })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <View style={styles.rxIcon}>
                      <Text style={styles.rxIconText}>Rx</Text>
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>{p.diagnosis || 'General Checkup'}</Text>
                      <Text style={styles.cardSubtitle}>Dr. {p.doctorId?.name}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.metaInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.metaText}>{new Date(p.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaInfo}>
                    <Ionicons name="medkit-outline" size={14} color="#666" />
                    <Text style={styles.metaText}>{p.medications?.length || 0} Medications</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{height: 80}} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EFF3F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B4A' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E0E8F0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rxIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F8F5', justifyContent: 'center', alignItems: 'center' },
  rxIconText: { color: '#0DB591', fontWeight: 'bold', fontSize: 18, fontStyle: 'italic' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2B4A' },
  cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  cardFooter: { flexDirection: 'row', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
});
